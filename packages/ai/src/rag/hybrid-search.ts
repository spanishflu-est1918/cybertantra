import { sql } from '@vercel/postgres';
import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { EMBEDDING_MODEL } from '../ingest';

interface HybridSearchResult {
  text: string;
  source: string;
  chunkIndex: number;
  score: number;
  matchType: 'semantic' | 'keyword' | 'hybrid';
  highlights?: string[];
  topics?: string[];
}

export class HybridSearch {
  // Combine semantic and keyword search with configurable weights
  async search(
    query: string,
    options: {
      topK?: number;
      semanticWeight?: number;
      keywordWeight?: number;
      filterTopics?: string[];
      filterSource?: string;
      includeContext?: boolean;
    } = {}
  ): Promise<HybridSearchResult[]> {
    const {
      topK = 10,
      semanticWeight = 0.7,
      keywordWeight = 0.3,
      filterTopics,
      filterSource,
      includeContext = true,
    } = options;

    // Parallel search
    const [semanticResults, keywordResults] = await Promise.all([
      this.semanticSearch(query, topK * 2, filterSource, filterTopics),
      this.keywordSearch(query, topK * 2, filterSource, filterTopics),
    ]);

    // Combine and re-rank results
    const combinedResults = this.fuseResults(
      semanticResults,
      keywordResults,
      semanticWeight,
      keywordWeight
    );

    // Get surrounding context if requested
    if (includeContext) {
      return this.enrichWithContext(combinedResults.slice(0, topK));
    }

    return combinedResults.slice(0, topK);
  }

  private async semanticSearch(
    query: string,
    limit: number,
    sourceFilter?: string,
    topicFilter?: string[]
  ): Promise<HybridSearchResult[]> {
    // Generate embedding for query
    const { embeddings } = await embedMany({
      values: [query],
      model: openai.embedding(EMBEDDING_MODEL),
    });
    
    const queryEmbedding = embeddings[0];
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    // Build query with filters
    let whereClause = '';
    const conditions: string[] = [];
    
    if (sourceFilter) {
      conditions.push(`source LIKE '%${sourceFilter}%'`);
    }
    
    if (topicFilter && topicFilter.length > 0) {
      // Assuming we store topics as JSON in a topics column
      const topicConditions = topicFilter.map(topic => 
        `topics::jsonb @> '["${topic}"]'`
      ).join(' OR ');
      conditions.push(`(${topicConditions})`);
    }
    
    if (conditions.length > 0) {
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }

    const query_sql = `
      SELECT 
        content as text,
        source,
        chunk_index as "chunkIndex",
        1 - (embedding <=> $1::vector) as score,
        topics
      FROM lecture_chunks
      ${whereClause}
      ORDER BY embedding <=> $1::vector
      LIMIT $2
    `;

    const results = await sql.query(query_sql, [embeddingStr, limit]);

    return results.rows.map(row => ({
      text: row.text,
      source: row.source,
      chunkIndex: row.chunkIndex,
      score: row.score,
      matchType: 'semantic' as const,
      topics: row.topics ? JSON.parse(row.topics) : undefined,
    }));
  }

  private async keywordSearch(
    query: string,
    limit: number,
    sourceFilter?: string,
    topicFilter?: string[]
  ): Promise<HybridSearchResult[]> {
    // Extract keywords from query
    const keywords = this.extractKeywords(query);
    
    // Build full-text search query
    const searchTerms = keywords.map(k => `'${k}'`).join(' & ');
    
    let whereClause = `WHERE to_tsvector('english', content) @@ to_tsquery('english', $1)`;
    
    if (sourceFilter) {
      whereClause += ` AND source LIKE '%${sourceFilter}%'`;
    }
    
    if (topicFilter && topicFilter.length > 0) {
      const topicConditions = topicFilter.map(topic => 
        `topics::jsonb @> '["${topic}"]'`
      ).join(' OR ');
      whereClause += ` AND (${topicConditions})`;
    }

    const query_sql = `
      SELECT 
        content as text,
        source,
        chunk_index as "chunkIndex",
        ts_rank(to_tsvector('english', content), to_tsquery('english', $1)) as score,
        topics,
        ts_headline('english', content, to_tsquery('english', $1), 
          'MaxWords=50, MinWords=25, ShortWord=3, HighlightAll=FALSE'
        ) as highlight
      FROM lecture_chunks
      ${whereClause}
      ORDER BY score DESC
      LIMIT $2
    `;

    try {
      const results = await sql.query(query_sql, [searchTerms, limit]);
      
      return results.rows.map(row => ({
        text: row.text,
        source: row.source,
        chunkIndex: row.chunkIndex,
        score: row.score,
        matchType: 'keyword' as const,
        highlights: [row.highlight],
        topics: row.topics ? JSON.parse(row.topics) : undefined,
      }));
    } catch (error) {
      console.error('Keyword search error:', error);
      return [];
    }
  }

  private extractKeywords(query: string): string[] {
    // Remove common stop words and extract meaningful terms
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
      'in', 'with', 'to', 'for', 'of', 'as', 'by', 'that', 'this',
      'what', 'when', 'where', 'who', 'why', 'how', 'about'
    ]);
    
    const words = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
    
    // Also extract quoted phrases
    const phraseMatches = query.match(/"([^"]+)"/g);
    if (phraseMatches) {
      phraseMatches.forEach(phrase => {
        words.push(phrase.replace(/"/g, ''));
      });
    }
    
    return [...new Set(words)];
  }

  private fuseResults(
    semanticResults: HybridSearchResult[],
    keywordResults: HybridSearchResult[],
    semanticWeight: number,
    keywordWeight: number
  ): HybridSearchResult[] {
    const resultMap = new Map<string, HybridSearchResult>();
    
    // Process semantic results
    semanticResults.forEach(result => {
      const key = `${result.source}-${result.chunkIndex}`;
      resultMap.set(key, {
        ...result,
        score: result.score * semanticWeight,
        matchType: 'hybrid',
      });
    });
    
    // Merge keyword results
    keywordResults.forEach(result => {
      const key = `${result.source}-${result.chunkIndex}`;
      const existing = resultMap.get(key);
      
      if (existing) {
        existing.score += result.score * keywordWeight;
        existing.highlights = result.highlights;
      } else {
        resultMap.set(key, {
          ...result,
          score: result.score * keywordWeight,
          matchType: 'hybrid',
        });
      }
    });
    
    // Sort by combined score
    return Array.from(resultMap.values())
      .sort((a, b) => b.score - a.score);
  }

  private async enrichWithContext(
    results: HybridSearchResult[]
  ): Promise<HybridSearchResult[]> {
    // For each result, get surrounding chunks for better context
    const enrichedResults: HybridSearchResult[] = [];
    
    for (const result of results) {
      // Get previous and next chunks
      const contextChunks = await sql`
        SELECT content, chunk_index
        FROM lecture_chunks
        WHERE source = ${result.source}
          AND chunk_index IN (${result.chunkIndex - 1}, ${result.chunkIndex + 1})
        ORDER BY chunk_index
      `;
      
      // Add context markers
      if (contextChunks.rows.length > 0) {
        const prevChunk = contextChunks.rows.find(
          c => c.chunk_index === result.chunkIndex - 1
        );
        const nextChunk = contextChunks.rows.find(
          c => c.chunk_index === result.chunkIndex + 1
        );
        
        let enrichedText = result.text;
        
        if (prevChunk) {
          enrichedText = `[...${prevChunk.content.slice(-100)}]\n\n${enrichedText}`;
        }
        
        if (nextChunk) {
          enrichedText = `${enrichedText}\n\n[${nextChunk.content.slice(0, 100)}...]`;
        }
        
        enrichedResults.push({
          ...result,
          text: enrichedText,
        });
      } else {
        enrichedResults.push(result);
      }
    }
    
    return enrichedResults;
  }

  // Specialized search for finding related concepts
  async findRelatedConcepts(
    concept: string,
    options: {
      maxDistance?: number;
      limit?: number;
    } = {}
  ): Promise<Array<{ concept: string; relatedness: number; contexts: string[] }>> {
    const { maxDistance = 0.5, limit = 10 } = options;
    
    // First, find chunks mentioning the concept
    const conceptChunks = await this.keywordSearch(concept, 20);
    
    // Extract related concepts from these chunks
    const relatedConcepts = new Map<string, { score: number; contexts: string[] }>();
    
    for (const chunk of conceptChunks) {
      const concepts = await this.extractConceptsFromText(chunk.text);
      
      concepts.forEach(relatedConcept => {
        if (relatedConcept.toLowerCase() !== concept.toLowerCase()) {
          const existing = relatedConcepts.get(relatedConcept) || {
            score: 0,
            contexts: [],
          };
          
          existing.score += chunk.score;
          existing.contexts.push(chunk.text.slice(0, 200) + '...');
          
          relatedConcepts.set(relatedConcept, existing);
        }
      });
    }
    
    // Sort by relatedness score
    return Array.from(relatedConcepts.entries())
      .map(([concept, data]) => ({
        concept,
        relatedness: data.score,
        contexts: data.contexts.slice(0, 3),
      }))
      .sort((a, b) => b.relatedness - a.relatedness)
      .slice(0, limit);
  }

  private async extractConceptsFromText(text: string): Promise<string[]> {
    // Simple concept extraction - could be enhanced with NER
    const conceptPatterns = [
      /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g, // Capitalized phrases
      /\b(?:concept of|theory of|principle of)\s+(\w+(?:\s+\w+)*)/gi,
      /\b(\w+(?:\s+\w+)*)\s+(?:is defined as|refers to|means)/gi,
    ];
    
    const concepts = new Set<string>();
    
    conceptPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const concept = match[1] || match[0];
        if (concept.length > 3 && concept.length < 50) {
          concepts.add(concept.trim());
        }
      }
    });
    
    return Array.from(concepts);
  }
}
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { embedMany } from 'ai';
import { sql } from '@cybertantra/database';
import { EMBEDDING_MODEL } from '../config';

export interface SearchResult {
  text: string;
  score: number;
  source: string;
  chunkIndex?: number;
}

export async function searchLectures(
  query: string,
  limit: number = 10,
  googleApiKey: string
): Promise<SearchResult[]> {
  try {
    const google = createGoogleGenerativeAI({
      apiKey: googleApiKey,
    });

    // Generate embedding for the query
    const { embeddings } = await embedMany({
      values: [query],
      model: google.textEmbeddingModel(EMBEDDING_MODEL),
    });
    
    const queryEmbedding = embeddings[0];
    const embeddingStr = `[${queryEmbedding.join(',')}]`;
    
    // Search for similar chunks in the database
    const results = await sql`
      SELECT 
        content as text,
        source,
        chunk_index as "chunkIndex",
        1 - (embedding <=> ${embeddingStr}::vector) as score
      FROM lecture_chunks
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT ${limit}
    `;
    
    return results.rows.map(row => ({
      text: row.text,
      score: row.score,
      source: row.source,
      chunkIndex: row.chunkIndex,
    }));
  } catch (error) {
    console.error('Error searching lectures:', error);
    return [];
  }
}
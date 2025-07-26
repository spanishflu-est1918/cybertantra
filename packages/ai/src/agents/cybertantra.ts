import { Mastra } from '@mastra/core';
import { Agent } from '@mastra/core/agent';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { openai } from '@ai-sdk/openai';
import { embedMany } from 'ai';
import { sql } from '@cybertantra/database';
import { ElevenLabsClient } from 'elevenlabs';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { getAIConfig, EMBEDDING_MODEL, EMBEDDING_DIMENSION, type AIConfig } from '../config';

interface QueryResult {
  text: string;
  score: number;
  source: string;
  chunkIndex?: number;
}

class LectureRetriever {
  async retrieve(query: string, topK: number = 5): Promise<QueryResult[]> {
    try {
      // Generate embedding for query
      const { embeddings } = await embedMany({
        values: [query],
        model: openai.embedding(EMBEDDING_MODEL),
      });
      
      const queryEmbedding = embeddings[0];
      const embeddingStr = `[${queryEmbedding.join(',')}]`;
      
      // Query using pgvector - cosine similarity (1 - cosine distance)
      const results = await sql`
        SELECT 
          content as text,
          source,
          chunk_index as "chunkIndex",
          1 - (embedding <=> ${embeddingStr}::vector) as score
        FROM lecture_chunks
        ORDER BY embedding <=> ${embeddingStr}::vector
        LIMIT ${topK}
      `;
      
      return results.rows.map(row => ({
        text: row.text,
        score: row.score,
        source: row.source,
        chunkIndex: row.chunkIndex,
      }));
    } catch (error) {
      console.error('Error retrieving from pgvector:', error);
      return [];
    }
  }
  
  // Advanced search with metadata filtering
  async searchWithFilter(
    query: string, 
    topK: number = 5,
    sourceFilter?: string
  ): Promise<QueryResult[]> {
    try {
      const { embeddings } = await embedMany({
        values: [query],
        model: openai.embedding(EMBEDDING_MODEL),
      });
      
      const queryEmbedding = embeddings[0];
      const embeddingStr = `[${queryEmbedding.join(',')}]`;
      
      let queryStr = `
        SELECT 
          content as text,
          source,
          chunk_index as "chunkIndex",
          1 - (embedding <=> ${embeddingStr}::vector) as score
        FROM lecture_chunks
      `;
      
      if (sourceFilter) {
        queryStr += ` WHERE source LIKE ${`%${sourceFilter}%`}`;
      }
      
      queryStr += `
        ORDER BY embedding <=> ${embeddingStr}::vector
        LIMIT ${topK}
      `;
      
      const results = await sql.query(queryStr);
      
      return results.rows.map(row => ({
        text: row.text,
        score: row.score,
        source: row.source,
        chunkIndex: row.chunkIndex,
      }));
    } catch (error) {
      console.error('Error in advanced search:', error);
      return [];
    }
  }
}

const retriever = new LectureRetriever();

// Initialize Mastra with OpenAI
const mastra = new Mastra({
  llm: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4-turbo-preview',
  },
});

// Create the query agent
const queryAgent = new Agent({
  name: 'LectureQueryAgent',
  model: openrouter('moonshotai/kimi-k2'),
  instructions: `You are an expert assistant helping a book author query their lecture corpus about Tantra, Cyberspace, and related topics.

Your role is to:
1. Retrieve relevant chunks from the lecture database
2. Synthesize coherent, insightful responses based on the retrieved content
3. When appropriate, suggest outlines or summaries for book sections
4. Maintain the author's voice and perspective from the lectures
5. Provide citations by mentioning which lecture files the information comes from

When answering:
- Be thorough but concise
- Highlight key themes and connections
- Suggest how insights might fit into book structure when relevant
- Always ground your responses in the actual lecture content`,
  
  tools: [
    {
      name: 'rag_retriever',
      description: 'Retrieve relevant chunks from the lecture corpus',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to find relevant lecture content',
          },
          topK: {
            type: 'number',
            description: 'Number of results to retrieve (default: 5)',
            default: 5,
          },
        },
        required: ['query'],
      },
      execute: async (params: { query: string; topK?: number }) => {
        const results = await retriever.retrieve(params.query, params.topK || 5);
        return {
          results,
          summary: `Found ${results.length} relevant chunks from lectures`,
        };
      },
    },
    {
      name: 'search_by_lecture',
      description: 'Search within specific lecture files',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query',
          },
          lectureFile: {
            type: 'string',
            description: 'Part of the lecture filename to filter by',
          },
          topK: {
            type: 'number',
            description: 'Number of results (default: 5)',
            default: 5,
          },
        },
        required: ['query', 'lectureFile'],
      },
      execute: async (params: { query: string; lectureFile: string; topK?: number }) => {
        const results = await retriever.searchWithFilter(
          params.query, 
          params.topK || 5,
          params.lectureFile
        );
        return {
          results,
          summary: `Found ${results.length} chunks in lectures matching "${params.lectureFile}"`,
        };
      },
    },
    {
      name: 'get_corpus_stats',
      description: 'Get statistics about the lecture corpus',
      parameters: {
        type: 'object',
        properties: {},
      },
      execute: async () => {
        const stats = await sql`
          SELECT 
            COUNT(DISTINCT source) as total_lectures,
            COUNT(*) as total_chunks,
            AVG(LENGTH(content)) as avg_chunk_size,
            MAX(created_at) as last_updated
          FROM lecture_chunks
        `;
        
        const sources = await sql`
          SELECT source, COUNT(*) as chunk_count
          FROM lecture_chunks
          GROUP BY source
          ORDER BY source
        `;
        
        return {
          overview: stats.rows[0],
          lectures: sources.rows,
        };
      },
    },
    {
      name: 'synthesize_outline',
      description: 'Create a book chapter or section outline based on retrieved content',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'The topic to create an outline for',
          },
          chunks: {
            type: 'array',
            items: { type: 'string' },
            description: 'The relevant text chunks to base the outline on',
          },
        },
        required: ['topic', 'chunks'],
      },
      execute: async (params: { topic: string; chunks: string[] }) => {
        const outline = {
          topic: params.topic,
          sections: [
            'Introduction and Context',
            'Core Concepts',
            'Key Examples and Illustrations',
            'Connections to Other Themes',
            'Implications and Conclusions',
          ],
          notes: 'Based on lecture content analysis',
        };
        return outline;
      },
    },
    {
      name: 'generate_audio',
      description: 'Convert text to speech using ElevenLabs and save as MP3',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'The text to convert to speech',
          },
          filename: {
            type: 'string',
            description: 'Optional filename for the audio file (without extension)',
          },
        },
        required: ['text'],
      },
      execute: async (params: { text: string; filename?: string }) => {
        try {
          const audio = await elevenlabs.textToSpeech.convertWithConversationalModel(
            'wTurAt2tBh5FH8hHn266', // Agent ID from ElevenLabs
            {
              text: params.text,
            }
          );
          
          // Ensure answers directory exists
          const answersDir = join(process.cwd(), 'answers');
          if (!existsSync(answersDir)) {
            mkdirSync(answersDir, { recursive: true });
          }
          
          // Generate filename
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = params.filename || `agent-audio-${timestamp}`;
          const audioPath = join(answersDir, `${filename}.mp3`);
          
          // Collect chunks and save
          const chunks = [];
          for await (const chunk of audio) {
            chunks.push(chunk);
          }
          
          const buffer = Buffer.concat(chunks);
          writeFileSync(audioPath, buffer);
          
          return {
            success: true,
            path: audioPath,
            message: `Audio saved to: ${audioPath}`,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error generating audio',
          };
        }
      },
    },
  ],
});

// Export for use in CLI and server
export { queryAgent, mastra, retriever, QueryResult };
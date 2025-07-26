import { Mastra } from '@mastra/core';
import { Agent } from '@mastra/core/agent';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { openai } from '@ai-sdk/openai';
import { embedMany } from 'ai';
import { sql } from '@cybertantra/database';
import { ElevenLabsClient } from 'elevenlabs';
import { EMBEDDING_MODEL, type AIConfig } from '../config';

export interface QueryResult {
  text: string;
  score: number;
  source: string;
  chunkIndex?: number;
}

export class LectureRetriever {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  async retrieve(query: string, topK: number = 5): Promise<QueryResult[]> {
    try {
      if (!this.config.openAIApiKey) {
        throw new Error('OpenAI API key required for embeddings');
      }

      const { embeddings } = await embedMany({
        values: [query],
        model: openai.embedding(EMBEDDING_MODEL, {
          apiKey: this.config.openAIApiKey,
        }),
      });
      
      const queryEmbedding = embeddings[0];
      const embeddingStr = `[${queryEmbedding.join(',')}]`;
      
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
  
  async searchWithFilter(
    query: string, 
    topK: number = 5,
    sourceFilter?: string
  ): Promise<QueryResult[]> {
    try {
      if (!this.config.openAIApiKey) {
        throw new Error('OpenAI API key required for embeddings');
      }

      const { embeddings } = await embedMany({
        values: [query],
        model: openai.embedding(EMBEDDING_MODEL, {
          apiKey: this.config.openAIApiKey,
        }),
      });
      
      const queryEmbedding = embeddings[0];
      const embeddingStr = `[${queryEmbedding.join(',')}]`;
      
      if (sourceFilter) {
        const results = await sql`
          SELECT 
            content as text,
            source,
            chunk_index as "chunkIndex",
            1 - (embedding <=> ${embeddingStr}::vector) as score
          FROM lecture_chunks
          WHERE source LIKE ${'%' + sourceFilter + '%'}
          ORDER BY embedding <=> ${embeddingStr}::vector
          LIMIT ${topK}
        `;
        
        return results.rows.map(row => ({
          text: row.text,
          score: row.score,
          source: row.source,
          chunkIndex: row.chunkIndex,
        }));
      } else {
        return this.retrieve(query, topK);
      }
    } catch (error) {
      console.error('Error in searchWithFilter:', error);
      return [];
    }
  }
}

export function createCybertantraAgent(config: AIConfig) {
  if (!config.openRouterApiKey) {
    throw new Error('OpenRouter API key required for agent');
  }

  const openrouter = createOpenRouter({
    apiKey: config.openRouterApiKey,
  });

  const retriever = new LectureRetriever(config);

  const mastra = new Mastra({
    llm: {
      provider: 'openai',
      apiKey: config.openAIApiKey!,
      model: 'gpt-4-turbo-preview',
    },
  });

  const agent = new Agent({
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
        handler: async ({ query, topK = 5 }) => {
          const results = await retriever.retrieve(query, topK);
          return {
            chunks: results,
            totalFound: results.length,
          };
        },
      },
      {
        name: 'synthesize',
        description: 'Synthesize information from multiple lecture chunks',
        parameters: {
          type: 'object',
          properties: {
            chunks: {
              type: 'array',
              description: 'Array of lecture chunks to synthesize',
              items: {
                type: 'object',
                properties: {
                  text: { type: 'string' },
                  source: { type: 'string' },
                },
              },
            },
            focusArea: {
              type: 'string',
              description: 'Specific aspect to focus on during synthesis',
            },
          },
          required: ['chunks'],
        },
        handler: async ({ chunks, focusArea }) => {
          const sources = [...new Set(chunks.map((c: any) => c.source))];
          const combinedText = chunks.map((c: any) => c.text).join('\n\n');
          
          return {
            synthesis: `Synthesized from ${sources.length} sources${focusArea ? ` with focus on ${focusArea}` : ''}`,
            sources,
            chunkCount: chunks.length,
          };
        },
      },
    ],
  });

  return { agent, retriever, mastra };
}
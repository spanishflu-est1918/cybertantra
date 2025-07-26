import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createOpenAI } from '@ai-sdk/openai';
import { embedMany } from 'ai';
import { sql } from '@cybertantra/database';
import { EMBEDDING_MODEL, type AIConfig } from '../config';

export interface QueryResult {
  text: string;
  score: number;
  source: string;
  chunkIndex?: number;
}

export class QueryAgent {
  private openrouter: any;
  private config: AIConfig;

  constructor(config: AIConfig) {
    if (!config.openAIApiKey) {
      throw new Error('OpenAI API key required for embeddings');
    }

    this.config = config;
    
    // Only initialize OpenRouter if API key is provided
    if (config.openRouterApiKey) {
      this.openrouter = createOpenRouter({
        apiKey: config.openRouterApiKey,
      });
    }
  }

  async retrieve(query: string, topK: number = 5): Promise<QueryResult[]> {
    try {
      const openai = createOpenAI({
        apiKey: this.config.openAIApiKey,
      });

      const { embeddings } = await embedMany({
        values: [query],
        model: openai.textEmbeddingModel(EMBEDDING_MODEL),
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
      console.error('Error retrieving from database:', error);
      throw error;
    }
  }

  async query(question: string, topK: number = 5): Promise<string> {
    if (!this.openrouter) {
      throw new Error('OpenRouter API key required for query synthesis');
    }

    // Step 1: Retrieve relevant chunks
    const chunks = await this.retrieve(question, topK);
    
    if (chunks.length === 0) {
      return "I couldn't find any relevant information in the lecture corpus for your question.";
    }

    // Step 2: Prepare context from chunks
    const context = chunks
      .map((chunk, i) => `[${i + 1}] From "${chunk.source}":\n${chunk.text}`)
      .join('\n\n---\n\n');

    // Step 3: Generate response using OpenRouter
    const response = await this.openrouter.chat.completions.create({
      model: 'moonshotai/kimi-k2',
      messages: [
        {
          role: 'system',
          content: `You are an expert on tantra, cyberspace, and consciousness. 
You have access to a corpus of lectures that blend Eastern philosophy with modern concepts.
Answer questions based on the provided lecture chunks. Always cite which lectures you're drawing from.
Be insightful and thorough, making connections between different concepts when relevant.`
        },
        {
          role: 'user',
          content: `Based on the following lecture excerpts, please answer this question: ${question}

Lecture Excerpts:
${context}`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    return response.choices[0]?.message?.content || 'No response generated';
  }

  async search(query: string, limit: number = 10): Promise<QueryResult[]> {
    return this.retrieve(query, limit);
  }
}
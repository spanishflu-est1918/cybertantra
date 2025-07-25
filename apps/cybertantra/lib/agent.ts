import { Mastra, Agent } from '@mastra/core';
import { z } from 'zod';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { query } from './db/client';
import { MODELS, OPENROUTER_CONFIG } from './config/models';

const openrouter = createOpenRouter(OPENROUTER_CONFIG);

const mastra = new Mastra();

// RAG Retriever Tool
const ragRetrieverTool = mastra.createTool({
  id: 'rag_retriever',
  description: 'Search for relevant content in the lecture database using semantic search',
  inputSchema: z.object({
    query: z.string().describe('The search query'),
    limit: z.number().optional().default(5).describe('Number of results to return'),
  }),
  execute: async ({ query: searchQuery, limit }) => {
    // For now, return a simple text search
    // In production, this would use pgvector for semantic search
    const results = await query(`
      SELECT content, metadata 
      FROM lecture_chunks 
      WHERE content ILIKE $1
      LIMIT $2
    `, [`%${searchQuery}%`, limit]);
    
    return {
      results,
      count: results.length,
    };
  },
});

export function createAgent(): Agent {
  return mastra.createAgent({
    id: 'cybertantra-agent',
    name: 'Cybertantra AI',
    model: openrouter.chat(MODELS.SYNTHESIS),
    instructions: `You are an AI assistant specializing in consciousness, tantra, and spiritual teachings. 
    Use the available tools to search through lecture content and provide informed, contextual answers.
    Always cite your sources when referencing specific lectures or teachings.`,
    tools: [ragRetrieverTool],
  });
}
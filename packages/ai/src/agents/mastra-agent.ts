import { Mastra } from '@mastra/core';
import { Agent } from '@mastra/core';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { QueryAgent } from './query-agent';
import { type AIConfig } from '../config';
import { readFileSync } from 'fs';
import { join } from 'path';

export function createMastraAgent(config: AIConfig) {
  if (!config.openRouterApiKey) {
    throw new Error('OpenRouter API key required');
  }
  if (!config.openAIApiKey) {
    throw new Error('OpenAI API key required for embeddings');
  }

  const openrouter = createOpenRouter({
    apiKey: config.openRouterApiKey,
  });

  const queryAgent = new QueryAgent(config);

  // Load the system prompt
  const systemPrompt = readFileSync(
    join(__dirname, '../prompts/cybertantra-agent.md'),
    'utf-8'
  );

  const mastra = new Mastra({
    llm: {
      provider: 'OPEN_ROUTER',
      name: 'moonshotai/kimi-k2',
    },
  });

  const agent = new Agent({
    name: 'CybertantraRAG',
    instructions: systemPrompt,
    
    model: openrouter('moonshotai/kimi-k2'),
    
    tools: [
      {
        name: 'retrieve_lectures',
        description: 'Search the lecture corpus for relevant information. Use this to find content about any topic.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query to find relevant lecture content',
            },
            topK: {
              type: 'number',
              description: 'Number of chunks to retrieve (default: 5, max: 20)',
              default: 5,
            },
          },
          required: ['query'],
        },
        execute: async ({ query, topK = 5 }) => {
          try {
            // Limit topK to reasonable range
            const k = Math.min(Math.max(1, topK), 20);
            
            const results = await queryAgent.retrieve(query, k);
            
            if (results.length === 0) {
              return {
                found: false,
                message: 'No relevant content found in the lecture corpus.',
                results: []
              };
            }
            
            return {
              found: true,
              count: results.length,
              results: results.map(chunk => ({
                source: chunk.source,
                content: chunk.text,
                relevance: chunk.score,
              }))
            };
          } catch (error) {
            console.error('Retrieval error:', error);
            return {
              found: false,
              error: error instanceof Error ? error.message : 'Retrieval failed',
              results: []
            };
          }
        },
      },
    ],
  });

  return { agent, mastra };
}
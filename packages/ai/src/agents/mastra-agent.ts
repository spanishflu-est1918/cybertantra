import { Agent } from '@mastra/core/agent';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { QueryAgent } from './query-agent';
import { type AIConfig } from '../config';
import { CYBERTANTRA_SYSTEM_PROMPT } from '../prompts/cybertantra-agent';

export function createMastraAgent(config: AIConfig) {
  if (!config.openRouterApiKey) {
    throw new Error('OpenRouter API key required');
  }
  if (!config.googleGenerativeAIApiKey) {
    throw new Error('Google Generative AI API key required for embeddings');
  }

  const openrouter = createOpenRouter({
    apiKey: config.openRouterApiKey,
  });

  const queryAgent = new QueryAgent(config);


  const agent = new Agent({
    name: 'CybertantraRAG',
    instructions: CYBERTANTRA_SYSTEM_PROMPT,
    model: openrouter('moonshotai/kimi-k2'),
    
    tools: {
      retrieve_lectures: {
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
        execute: async ({ query, topK = 5 }: { query: string; topK?: number }) => {
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
    },
  });

  return { agent };
}
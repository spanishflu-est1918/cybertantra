export const MODELS = {
  SYNTHESIS: 'anthropic/claude-3-5-sonnet-20241022',
  EMBEDDINGS: 'text-embedding-3-large',
  DIMENSIONS: 3072,
} as const;

export const OPENROUTER_CONFIG = {
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: 'https://openrouter.ai/api/v1',
} as const;
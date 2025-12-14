export interface AIConfig {
  aiGatewayApiKey?: string;
  openAIApiKey?: string;
  elevenLabsApiKey?: string;
  googleGenerativeAIApiKey?: string;
  assemblyAIApiKey?: string;
}

export const EMBEDDING_MODEL = 'gemini-embedding-001';
export const EMBEDDING_DIMENSION = 3072;
export const CHUNK_SIZE = 1024;
export const CHUNK_OVERLAP = 200;

// Audio configuration
export { AUDIO_CONFIG } from './config/audio';

// Get config from environment or passed config object
export function getAIConfig(config?: Partial<AIConfig>): AIConfig {
  return {
    aiGatewayApiKey: config?.aiGatewayApiKey || process.env.AI_GATEWAY_API_KEY,
    openAIApiKey: config?.openAIApiKey || process.env.OPENAI_API_KEY,
    elevenLabsApiKey: config?.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY,
    googleGenerativeAIApiKey: config?.googleGenerativeAIApiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    assemblyAIApiKey: config?.assemblyAIApiKey || process.env.ASSEMBLYAI_API_KEY,
  };
}
// Main agents
export { QueryAgent } from './agents/query-agent';
export type { QueryResult } from './agents/query-agent';
export { createMastraAgent } from './agents/mastra-agent';

// Config
export { getAIConfig, EMBEDDING_MODEL, EMBEDDING_DIMENSION, CHUNK_SIZE, CHUNK_OVERLAP } from './config';
export type { AIConfig } from './config';
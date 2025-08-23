// Main agents
export { QueryAgent } from './agents/query-agent';
export type { QueryResult } from './agents/query-agent';
export { createMastraAgent } from './agents/mastra-agent';

// Functions
export { searchLectures } from './functions/search-lectures';
export type { SearchResult } from './functions/search-lectures';

// Config
export { getAIConfig, EMBEDDING_MODEL, EMBEDDING_DIMENSION, CHUNK_SIZE, CHUNK_OVERLAP } from './config';
export type { AIConfig } from './config';

// Prompts
export { CYBERTANTRA_SYSTEM_PROMPT } from './prompts/cybertantra-agent';
export { DATTATREYA_SYSTEM_PROMPT } from './prompts/dattatreya';
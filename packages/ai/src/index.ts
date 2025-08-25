// Main agents
export { QueryAgent } from './agents/query-agent';
export type { ContentCategory, QueryOptions, QueryResult } from './agents/query-agent';
export { MeditationGeneratorAgent } from './agents/meditation-generator';

// Functions
export { searchLectures } from './functions/search-lectures';
export type { SearchResult } from './functions/search-lectures';

// Services
export { TextToSpeechService } from './services/text-to-speech';
export type { TextToSpeechOptions } from './services/text-to-speech';
export { MeditationAudioService } from './services/meditation-audio';
export type { MeditationAudioOptions, MeditationAudioResult } from './services/meditation-audio';
export { SegmentedTTSService } from './services/segmented-tts';
export { MeditationMusicService } from './services/meditation-music';
export type { MusicPromptParameters, MusicGenerationResult } from './services/meditation-music';

// Config
export { getAIConfig, EMBEDDING_MODEL, EMBEDDING_DIMENSION, CHUNK_SIZE, CHUNK_OVERLAP } from './config';
export type { AIConfig } from './config';

// Prompts
export { CYBERTANTRA_SYSTEM_PROMPT } from './prompts/cybertantra-agent';
export { DATTATREYA_SYSTEM_PROMPT } from './prompts/dattatreya';
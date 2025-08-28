// Main agents
export { QueryAgent } from "./agents/query-agent";
export type {
  ContentCategory,
  QueryOptions,
  QueryResult,
} from "./agents/query-agent";
export { MeditationGeneratorAgent } from "./agents/meditation-generator";

// Functions
export { searchLectures } from "./functions/search-lectures";
export type { SearchResult } from "./functions/search-lectures";

// Services (for external API wrappers)
export { TextToSpeechService } from "./services/text-to-speech";
export type { TextToSpeechOptions } from "./services/text-to-speech";

// Legacy exports (deprecated - use utils/meditation instead)
export { MeditationAudioService } from "./services/meditation-audio";
export type {
  MeditationAudioOptions,
  MeditationAudioResult,
} from "./services/meditation-audio";

// Meditation utilities (new functional approach)
export { 
  generateCompleteMeditation,
  generateMeditationAudio,
  generateMeditationMusic
} from "./utils/meditation";
export type {
  MeditationOptions,
  MeditationResult,
  AudioGenerationOptions,
  AudioGenerationResult,
  MusicGenerationOptions,
  MusicGenerationResult,
  MusicPromptParameters
} from "./utils/meditation";

// Config
export {
  getAIConfig,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSION,
  CHUNK_SIZE,
  CHUNK_OVERLAP,
} from "./config";
export type { AIConfig } from "./config";
export { AUDIO_CONFIG } from "./config/audio";

// Audio Utils
export { composeMeditation } from "./utils/audio";

// Prompts
export { CYBERTANTRA_SYSTEM_PROMPT } from "./prompts/cybertantra-agent";
export { DATTATREYA_SYSTEM_PROMPT } from "./prompts/dattatreya";

// Utils
export { simplifyMeditationTitle } from "./utils/title-simplifier";

// Model configuration for the Cybertantra system
// Centralized location for AI model settings

export const MODELS = {
  // Primary synthesis model for RAG and chat
  synthesis: 'anthropic/claude-sonnet-4',
  
  // Guru voice transformation model
  guru: 'anthropic/claude-sonnet-4',
  
  // Embedding model for vector search
  embedding: 'gemini-embedding-001',
  
  // Default temperature settings
  temperatures: {
    synthesis: 0.7,
    guru: 0.8,
  },
  
  // Token limits
  maxTokens: {
    synthesis: 1000,
    guru: 800,
  }
} as const;

// Export individual model names for backward compatibility
export const SYNTHESIS_MODEL = MODELS.synthesis;
export const GURU_MODEL = MODELS.guru;
export const EMBEDDING_MODEL = MODELS.embedding;
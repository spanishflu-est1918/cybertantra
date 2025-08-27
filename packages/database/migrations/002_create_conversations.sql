-- Create conversations table for storing chat history
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups by updated_at
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);

-- Index for searching within metadata
CREATE INDEX IF NOT EXISTS idx_conversations_metadata ON conversations USING gin(metadata);
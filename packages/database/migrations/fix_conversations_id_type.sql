-- Drop the existing table if it exists
DROP TABLE IF EXISTS conversations CASCADE;

-- Recreate with TEXT primary key instead of UUID
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups by updated_at
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);

-- Index for searching within metadata
CREATE INDEX idx_conversations_metadata ON conversations USING gin(metadata);
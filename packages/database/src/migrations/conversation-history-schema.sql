-- Conversation history for chat memory
CREATE TABLE IF NOT EXISTS conversation_history (
  id SERIAL PRIMARY KEY,
  thread_id VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient thread queries
CREATE INDEX IF NOT EXISTS idx_conversation_thread_timestamp 
ON conversation_history(thread_id, timestamp DESC);

-- Index for role-based queries
CREATE INDEX IF NOT EXISTS idx_conversation_role 
ON conversation_history(role);

-- Conversation summaries for long-term memory
CREATE TABLE IF NOT EXISTS conversation_summaries (
  id SERIAL PRIMARY KEY,
  thread_id VARCHAR(255) NOT NULL UNIQUE,
  summary TEXT NOT NULL,
  key_topics TEXT[],
  turn_count INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for topic searches
CREATE INDEX IF NOT EXISTS idx_conversation_topics 
ON conversation_summaries USING GIN(key_topics);
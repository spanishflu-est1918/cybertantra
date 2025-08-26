-- Meditation Sessions Schema
-- For storing generated meditation metadata and creating shareable URLs

CREATE TABLE IF NOT EXISTS meditation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  topic VARCHAR(255) NOT NULL,
  duration INTEGER NOT NULL, -- minutes
  audio_path TEXT NOT NULL, -- /audio/meditations/filename.mp3
  audio_size INTEGER,
  voice_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_meditation_slug ON meditation_sessions (slug);
CREATE INDEX IF NOT EXISTS idx_meditation_created_at ON meditation_sessions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meditation_topic ON meditation_sessions (topic);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_meditation_sessions_updated_at 
  BEFORE UPDATE ON meditation_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
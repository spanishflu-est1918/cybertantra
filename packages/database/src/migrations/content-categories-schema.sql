-- Simplified content categorization schema
-- Run this after the base schema.sql

-- Drop existing type if it exists (for clean migration)
DROP TYPE IF EXISTS content_category CASCADE;

-- Simple content category enum
CREATE TYPE content_category AS ENUM (
  'lecture',     -- Teaching/lecture material
  'meditation',  -- Yoga nidras, guided meditations
  'video',       -- Video transcripts
  'show'         -- Show/podcast content
);

-- Alter existing lecture_chunks table to support categories
ALTER TABLE lecture_chunks 
  ADD COLUMN IF NOT EXISTS category content_category DEFAULT 'lecture',
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS author VARCHAR(255) DEFAULT 'Unknown',
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_category ON lecture_chunks (category);
CREATE INDEX IF NOT EXISTS idx_tags ON lecture_chunks USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_author ON lecture_chunks (author);

-- Update ingestion_metadata to track categories
ALTER TABLE ingestion_metadata
  ADD COLUMN IF NOT EXISTS category content_category DEFAULT 'lecture',
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS author VARCHAR(255) DEFAULT 'Unknown';

-- Create views for each category
CREATE OR REPLACE VIEW lectures AS
  SELECT * FROM lecture_chunks WHERE category = 'lecture';

CREATE OR REPLACE VIEW meditations AS
  SELECT * FROM lecture_chunks WHERE category = 'meditation';

CREATE OR REPLACE VIEW videos AS
  SELECT * FROM lecture_chunks WHERE category = 'video';

CREATE OR REPLACE VIEW shows AS
  SELECT * FROM lecture_chunks WHERE category = 'show';

-- Statistics view
CREATE OR REPLACE VIEW content_stats AS
SELECT 
  category,
  COUNT(*) as chunk_count,
  COUNT(DISTINCT source) as file_count,
  COUNT(DISTINCT author) as author_count,
  array_agg(DISTINCT unnest) as all_tags
FROM lecture_chunks
LEFT JOIN LATERAL unnest(tags) ON true
GROUP BY category;
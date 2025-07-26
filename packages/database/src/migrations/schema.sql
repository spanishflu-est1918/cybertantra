-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create lectures chunks table
CREATE TABLE IF NOT EXISTS lecture_chunks (
  id SERIAL PRIMARY KEY,
  source VARCHAR(255) NOT NULL,
  chunk_index INTEGER NOT NULL,
  total_chunks INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(3072),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster search
CREATE INDEX IF NOT EXISTS idx_lecture_source ON lecture_chunks (source);
CREATE INDEX IF NOT EXISTS idx_created_at ON lecture_chunks (created_at);

-- Note: Vector indexes (ivfflat/hnsw) have a 2000 dimension limit
-- Since we're using 3072 dimensions, we'll rely on exact search
-- which is still fast for moderate dataset sizes

-- Create metadata table for tracking ingestion
CREATE TABLE IF NOT EXISTS ingestion_metadata (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) UNIQUE NOT NULL,
  file_hash VARCHAR(64) NOT NULL,
  chunks_count INTEGER NOT NULL,
  ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
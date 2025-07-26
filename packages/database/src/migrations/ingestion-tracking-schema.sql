-- Ingestion tracking tables for proper file status management

-- Track individual file ingestion status
CREATE TABLE IF NOT EXISTS ingestion_status (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) UNIQUE NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_hash VARCHAR(64) NOT NULL,
  words_count INTEGER,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed, skipped
  chunks_count INTEGER DEFAULT 0,
  error_message TEXT,
  processing_time_ms INTEGER,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Track ingestion sessions
CREATE TABLE IF NOT EXISTS ingestion_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  total_files INTEGER NOT NULL,
  processed_files INTEGER DEFAULT 0,
  failed_files INTEGER DEFAULT 0,
  skipped_files INTEGER DEFAULT 0,
  total_chunks INTEGER DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'running', -- running, completed, failed
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Track chunk processing for detailed logging and retry
CREATE TABLE IF NOT EXISTS chunk_processing_log (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  chunk_index INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL, -- created, embedding, stored, failed
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(filename, chunk_index)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ingestion_status_filename ON ingestion_status (filename);
CREATE INDEX IF NOT EXISTS idx_ingestion_status_status ON ingestion_status (status);
CREATE INDEX IF NOT EXISTS idx_ingestion_sessions_session_id ON ingestion_sessions (session_id);
CREATE INDEX IF NOT EXISTS idx_chunk_processing_filename ON chunk_processing_log (filename);
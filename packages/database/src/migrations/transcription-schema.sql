-- Transcription tracking table
CREATE TABLE IF NOT EXISTS transcription_status (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) UNIQUE NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  audio_duration_seconds INTEGER,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, transcribing, completed, failed
  model_tier VARCHAR(50) DEFAULT 'best', -- best, nano
  assemblyai_transcript_id VARCHAR(255),
  cost_estimate DECIMAL(10,4),
  transcript_path TEXT,
  speaker_labels BOOLEAN DEFAULT true,
  language_code VARCHAR(10) DEFAULT 'en',
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trans_status ON transcription_status (status);
CREATE INDEX IF NOT EXISTS idx_trans_filename ON transcription_status (filename);

-- Track individual transcription jobs
CREATE TABLE IF NOT EXISTS transcription_jobs (
  id SERIAL PRIMARY KEY,
  job_id VARCHAR(255) UNIQUE NOT NULL,
  total_files INTEGER NOT NULL,
  processed_files INTEGER DEFAULT 0,
  failed_files INTEGER DEFAULT 0,
  total_duration_seconds INTEGER DEFAULT 0,
  total_cost DECIMAL(10,4) DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'running', -- running, completed, failed
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Link audio files to their transcripts for ingestion
CREATE TABLE IF NOT EXISTS audio_transcript_mapping (
  id SERIAL PRIMARY KEY,
  audio_filename VARCHAR(255) NOT NULL,
  transcript_filename VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(audio_filename),
  INDEX idx_transcript_filename (transcript_filename)
);
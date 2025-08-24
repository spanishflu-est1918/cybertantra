-- Migration to categorize all existing chunks as 'lecture'
-- Run this after content-categories-schema.sql

-- Update all existing chunks to be categorized as 'lecture'
UPDATE lecture_chunks 
SET category = 'lecture'::content_category
WHERE category IS NULL;

-- Update all existing ingestion metadata to be categorized as 'lecture'
UPDATE ingestion_metadata 
SET category = 'lecture'::content_category
WHERE category IS NULL;

-- Add default author for existing content if not set
UPDATE lecture_chunks 
SET author = 'Unknown'
WHERE author IS NULL;

-- Count results
SELECT 
  category,
  COUNT(*) as chunk_count,
  COUNT(DISTINCT source) as file_count
FROM lecture_chunks
GROUP BY category;

-- Show summary
DO $$
DECLARE
  chunk_count INTEGER;
  file_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO chunk_count FROM lecture_chunks WHERE category = 'lecture';
  SELECT COUNT(DISTINCT source) INTO file_count FROM lecture_chunks WHERE category = 'lecture';
  
  RAISE NOTICE 'Migration complete!';
  RAISE NOTICE 'Categorized % chunks from % files as lectures', chunk_count, file_count;
END $$;
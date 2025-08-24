#!/usr/bin/env bun
import dotenv from 'dotenv';
import { sql } from '@cybertantra/database';
import ora from 'ora';

dotenv.config();

async function runMigration() {
  console.log('\n🔄 RUNNING CATEGORY MIGRATION');
  console.log('==============================\n');

  const spinner = ora('Checking if migration is needed...').start();

  try {
    // Check if category column exists
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'lecture_chunks' 
      AND column_name = 'category'
    `;

    if (columns.rows.length > 0) {
      spinner.succeed('Category column already exists!');
      
      // Just update NULL categories
      const nullCategories = await sql`
        SELECT COUNT(*) as count 
        FROM lecture_chunks 
        WHERE category IS NULL
      `;
      
      if (nullCategories.rows[0].count > 0) {
        spinner.start(`Categorizing ${nullCategories.rows[0].count} uncategorized chunks...`);
        
        await sql`
          UPDATE lecture_chunks 
          SET category = 'lecture'
          WHERE category IS NULL
        `;
        
        spinner.succeed('Categorized remaining chunks');
      }
    } else {
      spinner.text = 'Creating content_category type...';
      
      // Create the enum type (run separately)
      try {
        await sql`DROP TYPE IF EXISTS content_category CASCADE`;
      } catch (e) {
        // Type might not exist, that's OK
      }
      
      await sql`
        CREATE TYPE content_category AS ENUM (
          'lecture',
          'meditation',
          'video',
          'show'
        )
      `;
      
      spinner.text = 'Adding category columns to tables...';
      
      // Add columns to lecture_chunks (one at a time)
      await sql`ALTER TABLE lecture_chunks ADD COLUMN IF NOT EXISTS category content_category DEFAULT 'lecture'`;
      await sql`ALTER TABLE lecture_chunks ADD COLUMN IF NOT EXISTS tags TEXT[]`;
      await sql`ALTER TABLE lecture_chunks ADD COLUMN IF NOT EXISTS author VARCHAR(255) DEFAULT 'Unknown'`;
      await sql`ALTER TABLE lecture_chunks ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'`;
      
      // Add columns to ingestion_metadata (one at a time)
      await sql`ALTER TABLE ingestion_metadata ADD COLUMN IF NOT EXISTS category content_category DEFAULT 'lecture'`;
      await sql`ALTER TABLE ingestion_metadata ADD COLUMN IF NOT EXISTS tags TEXT[]`;
      await sql`ALTER TABLE ingestion_metadata ADD COLUMN IF NOT EXISTS author VARCHAR(255) DEFAULT 'Unknown'`;
      
      spinner.text = 'Creating indexes...';
      
      // Create indexes (one at a time)
      await sql`CREATE INDEX IF NOT EXISTS idx_category ON lecture_chunks (category)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_tags ON lecture_chunks USING GIN (tags)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_author ON lecture_chunks (author)`;
      
      spinner.succeed('Schema migration complete!');
      
      // Now categorize existing content
      spinner.start('Categorizing all existing content as lectures...');
      
      await sql`
        UPDATE lecture_chunks 
        SET category = 'lecture'
        WHERE category IS NULL
      `;
      
      await sql`
        UPDATE ingestion_metadata 
        SET category = 'lecture'
        WHERE category IS NULL
      `;
      
      spinner.succeed('All content categorized!');
    }
    
    // Show final stats
    const stats = await sql`
      SELECT 
        category,
        COUNT(*) as chunk_count,
        COUNT(DISTINCT source) as file_count,
        COUNT(DISTINCT author) as author_count
      FROM lecture_chunks
      GROUP BY category
      ORDER BY category
    `;
    
    console.log('\n📊 Final content distribution:');
    console.log('--------------------------------');
    for (const row of stats.rows) {
      console.log(`${row.category}: ${row.chunk_count} chunks from ${row.file_count} files (${row.author_count} authors)`);
    }
    
    console.log('\n✅ Migration complete!');
    console.log('   You can now ingest content with categories:');
    console.log('   - lecture (teaching material)');
    console.log('   - meditation (yoga nidras)');
    console.log('   - video (transcripts)');
    console.log('   - show (podcasts)\n');

  } catch (error) {
    spinner.fail('Migration failed');
    console.error('Error:', error);
    console.log('\n⚠️  If you see a "type already exists" error, that\'s OK.');
    console.log('   Try running the command again.');
    process.exit(1);
  }
}

runMigration();
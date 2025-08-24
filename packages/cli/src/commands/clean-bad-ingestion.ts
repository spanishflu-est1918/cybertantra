#!/usr/bin/env bun
import dotenv from 'dotenv';
import { sql } from '@cybertantra/database';
import ora from 'ora';

dotenv.config();

async function cleanBadIngestion() {
  console.log('\n🧹 CLEANING BAD INGESTION DATA');
  console.log('=====================================\n');

  const spinner = ora('Checking recent ingestions...').start();

  try {
    // First check what we have
    const recent = await sql`
      SELECT 
        category,
        COUNT(*) as chunk_count,
        COUNT(DISTINCT source) as file_count
      FROM lecture_chunks
      GROUP BY category
      ORDER BY category
    `;

    spinner.succeed('Current database state');
    
    console.log('\n📊 Current content:');
    console.log('-------------------');
    for (const row of recent.rows) {
      console.log(`${row.category}: ${row.chunk_count} chunks from ${row.file_count} files`);
    }

    // Check for problematic chunks (only 1 chunk per file is suspicious)
    const suspicious = await sql`
      SELECT source, COUNT(*) as chunks, category
      FROM lecture_chunks
      GROUP BY source, category
      HAVING COUNT(*) = 1
      ORDER BY source
    `;

    if (suspicious.rows.length > 0) {
      console.log(`\n⚠️  Found ${suspicious.rows.length} files with only 1 chunk (likely failed chunking):`);
      for (const file of suspicious.rows.slice(0, 5)) {
        console.log(`   - ${file.category}: ${file.source}`);
      }
      if (suspicious.rows.length > 5) {
        console.log(`   ... and ${suspicious.rows.length - 5} more`);
      }
    }

    // Delete the bad single-chunk files
    spinner.start('Deleting files with only 1 chunk (bad ingestion)...');
    
    const deleteResult = await sql`
      DELETE FROM lecture_chunks
      WHERE source IN (
        SELECT source 
        FROM lecture_chunks 
        GROUP BY source 
        HAVING COUNT(*) = 1
      )
      RETURNING id, source
    `;

    spinner.succeed(`Deleted ${deleteResult.rows.length} bad chunks`);

    // Show updated state
    const updated = await sql`
      SELECT 
        category,
        COUNT(*) as chunk_count,
        COUNT(DISTINCT source) as file_count
      FROM lecture_chunks
      GROUP BY category
    `;

    console.log('\n✅ Cleanup complete!');
    console.log('\n📊 Updated database state:');
    console.log('---------------------------');
    for (const row of updated.rows) {
      console.log(`${row.category}: ${row.chunk_count} chunks from ${row.file_count} files`);
    }

  } catch (error) {
    spinner.fail('Cleanup failed');
    console.error('Error:', error);
    process.exit(1);
  }
}

cleanBadIngestion();
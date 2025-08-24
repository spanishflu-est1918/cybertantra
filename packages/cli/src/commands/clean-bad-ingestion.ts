#!/usr/bin/env bun
import dotenv from 'dotenv';
import { sql } from '@cybertantra/database';
import ora from 'ora';

dotenv.config();

async function cleanBadIngestion() {
  console.log('\n🧹 CLEANING BAD INGESTION DATA');
  console.log('=====================================\n');
  console.log(`📅 Current time: ${new Date().toISOString()}`);
  console.log('⚠️  WARNING: This will delete files with only 1 chunk\n');

  const spinner = ora('Checking what would be deleted...').start();

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

    // Check for ALL files ingested AFTER the cutoff (Aug 24, 2025 20:46 UTC)
    const suspicious = await sql`
      SELECT im.filename as source, 
             im.chunks_count as chunks, 
             im.category,
             im.ingested_at
      FROM ingestion_metadata im
      WHERE im.ingested_at > '2025-08-24 20:46:00'::timestamp
      ORDER BY im.ingested_at DESC
    `;

    if (suspicious.rows.length > 0) {
      console.log(`\n⚠️  Found ${suspicious.rows.length} files ingested after cutoff (2025-08-24 20:46:00 UTC):`);
      for (const file of suspicious.rows.slice(0, 5)) {
        console.log(`   - ${file.category}: ${file.source} (${file.chunks} chunks) at ${file.ingested_at}`);
      }
      if (suspicious.rows.length > 5) {
        console.log(`   ... and ${suspicious.rows.length - 5} more`);
      }
    }

    // Delete ALL files ingested after cutoff
    spinner.start('Deleting files ingested after cutoff...');
    
    // Get ALL filenames ingested after the cutoff date
    const badFiles = await sql`
      SELECT filename as source
      FROM ingestion_metadata
      WHERE ingested_at > '2025-08-24 20:46:00'::timestamp
    `;
    
    // Store the filenames before deleting anything
    const filenamesToDelete = badFiles.rows.map(f => f.source);
    
    // Delete from lecture_chunks FIRST
    let chunksDeleted = 0;
    if (filenamesToDelete.length > 0) {
      const deleteResult = await sql`
        DELETE FROM lecture_chunks
        WHERE source = ANY(${filenamesToDelete}::text[])
        RETURNING id
      `;
      chunksDeleted = deleteResult.rows.length;
    }
    
    // Then delete from ingestion_metadata
    let metadataDeleted = 0;
    if (filenamesToDelete.length > 0) {
      const metadataResult = await sql`
        DELETE FROM ingestion_metadata
        WHERE filename = ANY(${filenamesToDelete}::text[])
        RETURNING filename
      `;
      metadataDeleted = metadataResult.rows.length;
    }

    spinner.succeed(`Deleted ${chunksDeleted} chunks and ${metadataDeleted} metadata entries`);

    // Also check for orphaned chunks (chunks without metadata)
    spinner.start('Checking for orphaned chunks...');
    const orphaned = await sql`
      DELETE FROM lecture_chunks
      WHERE source NOT IN (
        SELECT filename FROM ingestion_metadata
      )
      RETURNING id
    `;
    if (orphaned.rows.length > 0) {
      spinner.succeed(`Deleted ${orphaned.rows.length} orphaned chunks`);
    } else {
      spinner.succeed('No orphaned chunks found');
    }

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
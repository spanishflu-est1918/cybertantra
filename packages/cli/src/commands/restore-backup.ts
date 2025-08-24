#!/usr/bin/env bun
import dotenv from 'dotenv';
import path from 'path';
import { sql } from '@cybertantra/database';
import fs from 'fs/promises';
import ora from 'ora';
import readline from 'readline';
import { createReadStream } from 'fs';

dotenv.config();

async function restore() {
  console.log('\n🔄 DATABASE RESTORE UTILITY');
  console.log('====================================\n');

  const spinner = ora('Looking for backup files...').start();

  try {
    // Backup files from the commit
    const backupDir = path.resolve(process.cwd(), 'backups');
    const chunksBackupFile = path.join(backupDir, 'lecture_chunks_backup_2025-08-24T10-40-54-214Z.jsonl');
    const metadataBackupFile = path.join(backupDir, 'ingestion_metadata_backup_2025-08-24T10-40-54-214Z.json');
    
    // Check if files exist
    try {
      await fs.access(chunksBackupFile);
      await fs.access(metadataBackupFile);
    } catch {
      spinner.fail('Backup files not found!');
      console.error(`Expected files:
        - ${chunksBackupFile}
        - ${metadataBackupFile}`);
      process.exit(1);
    }
    
    spinner.succeed('Found backup files');
    
    // Clear existing data
    spinner.start('Clearing existing data...');
    await sql`DELETE FROM lecture_chunks`;
    await sql`DELETE FROM ingestion_metadata`;
    spinner.succeed('Cleared existing data');
    
    // Restore ingestion_metadata first
    spinner.start('Restoring metadata...');
    const metadataContent = await fs.readFile(metadataBackupFile, 'utf-8');
    const metadataRecords = JSON.parse(metadataContent);
    
    for (const record of metadataRecords) {
      await sql`
        INSERT INTO ingestion_metadata (
          id, filename, file_hash, chunks_count, ingested_at, category, tags
        ) VALUES (
          ${record.id},
          ${record.filename},
          ${record.file_hash},
          ${record.chunks_count},
          ${record.ingested_at},
          ${record.category}::content_category,
          ${record.tags}
        )
      `;
    }
    spinner.succeed(`Restored ${metadataRecords.length} metadata records`);
    
    // Restore lecture_chunks from JSONL file
    spinner.start('Restoring chunks (this may take a while)...');
    
    const fileStream = createReadStream(chunksBackupFile);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    
    let chunkCount = 0;
    const batchSize = 100;
    let batch = [];
    
    for await (const line of rl) {
      if (line.trim()) {
        const chunk = JSON.parse(line);
        batch.push(chunk);
        
        if (batch.length >= batchSize) {
          // Process batch
          for (const c of batch) {
            await sql`
              INSERT INTO lecture_chunks (
                id, source, chunk_index, total_chunks, content, created_at, 
                category, tags, metadata
              ) VALUES (
                ${c.id},
                ${c.source},
                ${c.chunk_index},
                ${c.total_chunks},
                ${c.content},
                ${c.created_at},
                ${c.category || 'lecture'}::content_category,
                ${c.tags},
                ${c.metadata || {}}::jsonb
              )
            `;
          }
          chunkCount += batch.length;
          spinner.text = `Restoring chunks... ${chunkCount} processed`;
          batch = [];
        }
      }
    }
    
    // Process remaining batch
    if (batch.length > 0) {
      for (const c of batch) {
        await sql`
          INSERT INTO lecture_chunks (
            id, source, chunk_index, total_chunks, content, created_at,
            category, tags, metadata
          ) VALUES (
            ${c.id},
            ${c.source},
            ${c.chunk_index},
            ${c.total_chunks},
            ${c.content},
            ${c.created_at},
            ${c.category || 'lecture'}::content_category,
            ${c.tags},
            ${c.metadata || {}}::jsonb
          )
        `;
      }
      chunkCount += batch.length;
    }
    
    spinner.succeed(`Restored ${chunkCount} chunks`);
    
    // Verify restoration
    const stats = await sql`
      SELECT 
        COUNT(*) as total_chunks,
        COUNT(DISTINCT source) as total_files
      FROM lecture_chunks
    `;
    
    console.log('\n✅ Restoration Complete!');
    console.log('------------------------');
    console.log(`Total chunks: ${stats.rows[0].total_chunks}`);
    console.log(`Total files: ${stats.rows[0].total_files}`);
    
    console.log('\n⚠️  Note: Embeddings need to be regenerated!');
    console.log('   Run the re-embed command to generate embeddings for the restored content.');
    
  } catch (error) {
    spinner.fail('Restoration failed');
    console.error('Error:', error);
    process.exit(1);
  }
}

restore();
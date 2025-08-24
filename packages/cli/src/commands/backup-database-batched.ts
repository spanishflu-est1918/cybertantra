#!/usr/bin/env bun
import dotenv from 'dotenv';
import path from 'path';
import { sql } from '@cybertantra/database';
import fs from 'fs/promises';
import ora from 'ora';

dotenv.config();

const BATCH_SIZE = 100; // Process 100 chunks at a time to avoid size limits

async function backup() {
  console.log('\n💾 DATABASE BACKUP UTILITY (BATCHED)');
  console.log('====================================\n');

  const spinner = ora('Checking database status...').start();

  try {
    // Get current stats
    const stats = await sql`
      SELECT 
        COUNT(*) as total_chunks,
        COUNT(DISTINCT source) as total_files
      FROM lecture_chunks
    `;

    const metadata = await sql`
      SELECT COUNT(*) as ingestion_count
      FROM ingestion_metadata
    `;

    spinner.succeed('Database status retrieved');
    
    console.log('\n📊 Current Database Status:');
    console.log('---------------------------');
    console.log(`Total chunks: ${stats.rows[0].total_chunks}`);
    console.log(`Total files: ${stats.rows[0].total_files}`);
    console.log(`Ingestion records: ${metadata.rows[0].ingestion_count}`);

    spinner.start('Creating backup directory...');
    
    // Create backup directory
    const backupDir = path.resolve(process.cwd(), 'backups');
    await fs.mkdir(backupDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `lecture_chunks_backup_${timestamp}.jsonl`);
    const metadataBackupFile = path.join(backupDir, `ingestion_metadata_backup_${timestamp}.json`);
    
    spinner.succeed('Backup directory ready');
    
    // Export lecture_chunks in batches (without embeddings to save space)
    spinner.start('Exporting chunks (without embeddings for size)...');
    
    const totalChunks = parseInt(stats.rows[0].total_chunks);
    const totalBatches = Math.ceil(totalChunks / BATCH_SIZE);
    
    // Create/clear the backup file
    await fs.writeFile(backupFile, '');
    
    for (let batch = 0; batch < totalBatches; batch++) {
      const offset = batch * BATCH_SIZE;
      spinner.text = `Exporting chunks... batch ${batch + 1}/${totalBatches} (${offset}/${totalChunks})`;
      
      // Get batch without embeddings (we can regenerate these)
      const chunks = await sql`
        SELECT 
          id,
          source,
          chunk_index,
          total_chunks,
          content,
          created_at
        FROM lecture_chunks
        ORDER BY id
        LIMIT ${BATCH_SIZE}
        OFFSET ${offset}
      `;
      
      // Append to file as JSONL (one JSON object per line)
      for (const chunk of chunks.rows) {
        await fs.appendFile(backupFile, JSON.stringify(chunk) + '\n');
      }
    }
    
    spinner.succeed(`Exported ${totalChunks} chunks (without embeddings)`);
    
    // Export ingestion_metadata (this is small)
    spinner.start('Exporting metadata...');
    
    const ingestionData = await sql`
      SELECT * FROM ingestion_metadata
      ORDER BY id
    `;
    
    await fs.writeFile(
      metadataBackupFile,
      JSON.stringify(ingestionData.rows, null, 2)
    );
    
    spinner.succeed('Backup created successfully!');
    
    console.log('\n✅ Backup files created:');
    console.log(`   - ${backupFile} (JSONL format, no embeddings)`);
    console.log(`   - ${metadataBackupFile}`);
    console.log(`\n📝 Total records backed up: ${totalChunks} chunks, ${ingestionData.rows.length} metadata`);
    
    // Get file sizes
    const chunksStat = await fs.stat(backupFile);
    const metaStat = await fs.stat(metadataBackupFile);
    
    console.log(`\n📦 Backup sizes:`);
    console.log(`   - Chunks: ${(chunksStat.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   - Metadata: ${(metaStat.size / 1024).toFixed(2)} KB`);
    
    console.log('\n⚠️  Note: Embeddings were NOT backed up to save space.');
    console.log('   They can be regenerated if needed using the original content.');
    console.log('\n📌 Keep these files safe before running any migrations!');

  } catch (error) {
    spinner.fail('Operation failed');
    console.error('Error:', error);
    process.exit(1);
  }
}

backup();
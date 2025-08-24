#!/usr/bin/env bun
import dotenv from 'dotenv';
import { sql } from '@cybertantra/database';
import ora from 'ora';

dotenv.config();

async function removeAuthorField() {
  console.log('\n🔧 REMOVING AUTHOR FIELD FROM DATABASE');
  console.log('======================================\n');

  const spinner = ora('Removing author column from tables...').start();

  try {
    // Remove author column from lecture_chunks
    spinner.text = 'Removing author from lecture_chunks table...';
    await sql`ALTER TABLE lecture_chunks DROP COLUMN IF EXISTS author`;
    
    // Remove author column from ingestion_metadata
    spinner.text = 'Removing author from ingestion_metadata table...';
    await sql`ALTER TABLE ingestion_metadata DROP COLUMN IF EXISTS author`;
    
    spinner.succeed('Author field removed from database');
    
    // Show current schema
    const chunks = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lecture_chunks'
      ORDER BY ordinal_position
    `;
    
    console.log('\n📊 Current lecture_chunks schema:');
    console.log('----------------------------------');
    for (const col of chunks.rows) {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    }
    
    console.log('\n✅ Database cleaned up!');
    
  } catch (error) {
    spinner.fail('Failed to remove author field');
    console.error('Error:', error);
    process.exit(1);
  }
}

removeAuthorField();
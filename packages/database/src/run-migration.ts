import { sql } from './client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function runMigration() {
  const migrationFile = path.join(__dirname, '../migrations/002_create_conversations.sql');
  const migrationSQL = fs.readFileSync(migrationFile, 'utf8');
  
  try {
    console.log('Running migration: Creating conversations table...');
    
    // Split by semicolon and run each statement
    const statements = migrationSQL.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await sql.query(statement);
        console.log('✓ Executed:', statement.substring(0, 50) + '...');
      }
    }
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
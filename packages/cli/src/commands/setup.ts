#!/usr/bin/env bun
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import chalk from 'chalk';

// Load environment variables from project root FIRST
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dotenv = await import('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

// Now import after env is loaded
const { checkDatabaseConnection, ensurePgVector, sql } = await import('@cybertantra/database');

async function main() {
  console.log(chalk.cyan('\n🧘 Cybertantra Database Setup\n'));
  
  try {
    // Check database connection
    console.log('Checking database connection...');
    const connected = await checkDatabaseConnection();
    if (!connected) {
      throw new Error('Cannot connect to database. Check your POSTGRES_URL environment variable.');
    }
    console.log(chalk.green('✓ Database connected'));
    
    // Ensure pgvector extension
    console.log('Ensuring pgvector extension...');
    await ensurePgVector();
    console.log(chalk.green('✓ pgvector extension enabled'));
    
    // Run SQL migrations
    console.log('Running migrations...');
    const migrationsDir = path.join(__dirname, '../../../database/src/migrations');
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql') && !f.includes('drop-tables'));
    
    for (const file of sqlFiles.sort()) {
      console.log(`  Running ${file}...`);
      const sqlContent = await fs.readFile(path.join(migrationsDir, file), 'utf-8');
      
      // Execute SQL statements one by one
      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      for (const statement of statements) {
        try {
          // Use sql template literal for @vercel/postgres
          await sql.query(statement);
        } catch (error: any) {
          if (!error.message.includes('already exists')) {
            throw error;
          }
        }
      }
      console.log(chalk.green(`  ✓ ${file}`));
    }
    
    console.log(chalk.green('\n✓ Database setup complete!'));
    console.log(chalk.gray('\nYou can now run:'));
    console.log(chalk.gray('  pnpm run cli:ingest    - to ingest lecture files'));
    console.log(chalk.gray('  pnpm run cli:query     - to query the corpus'));
    
  } catch (error) {
    console.error(chalk.red('\nSetup failed:'), error);
    process.exit(1);
  }
}

main();
import { sql } from '@vercel/postgres';

// In Vercel, env vars are already loaded
// In local/Bun environments, they need to be loaded by the entry point
export { sql };

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

export async function ensurePgVector(): Promise<void> {
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;
  } catch (error) {
    console.error('Failed to create pgvector extension:', error);
    throw error;
  }
}
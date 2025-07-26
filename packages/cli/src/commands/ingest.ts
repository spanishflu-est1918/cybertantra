#!/usr/bin/env bun
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

// Now import after env is loaded
import { GeminiIngestion } from '@cybertantra/lecture-tools/src/ingestion/ingest';

async function main() {
  try {
    const lecturesDir = process.argv[2] || './lectures';
    console.log(`Starting ingestion from: ${lecturesDir}`);
    
    // The ingestion module handles everything
    const ingestion = new GeminiIngestion();
    await ingestion.run(lecturesDir);
    
  } catch (error) {
    console.error('Ingestion failed:', error);
    process.exit(1);
  }
}

main();
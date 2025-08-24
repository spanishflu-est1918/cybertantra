#!/usr/bin/env bun
import dotenv from 'dotenv';
import { ContentIngestion } from '@cybertantra/lecture-tools/src/ingestion/content-ingestion';

dotenv.config();

async function test() {
  const config = {
    category: 'lecture' as const,
    directory: '/Users/gorkolas/Documents/www/cybertantra/test-ingestion',
    tags: ['test']
  };

  console.log('🧪 Testing ingestion with single file...\n');
  
  const ingestion = new ContentIngestion(config);
  await ingestion.run();
}

test().catch(console.error);
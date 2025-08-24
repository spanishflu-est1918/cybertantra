#!/usr/bin/env bun
import dotenv from 'dotenv';
import { sql } from '@cybertantra/database';
import { embedMany } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import ora from 'ora';
import { EMBEDDING_MODEL } from '@cybertantra/ai';

dotenv.config();

const BATCH_SIZE = 100; // Google's limit
const MAX_PARALLEL_CALLS = 5;

async function regenerateEmbeddings() {
  console.log('\n🔄 REGENERATING EMBEDDINGS');
  console.log('====================================\n');

  const spinner = ora('Checking database...').start();

  try {
    // Get all chunks without embeddings
    const chunks = await sql`
      SELECT id, content 
      FROM lecture_chunks 
      WHERE embedding IS NULL 
      ORDER BY id
    `;

    if (chunks.rows.length === 0) {
      spinner.succeed('All chunks already have embeddings!');
      return;
    }

    spinner.succeed(`Found ${chunks.rows.length} chunks without embeddings`);
    
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
    });

    const totalBatches = Math.ceil(chunks.rows.length / BATCH_SIZE);
    let processed = 0;

    for (let i = 0; i < chunks.rows.length; i += BATCH_SIZE) {
      const batch = chunks.rows.slice(i, Math.min(i + BATCH_SIZE, chunks.rows.length));
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      
      spinner.start(`Processing batch ${batchNum}/${totalBatches} (${processed}/${chunks.rows.length} chunks)...`);
      
      // Generate embeddings for this batch
      const texts = batch.map(chunk => chunk.content);
      const { embeddings } = await embedMany({
        model: google.textEmbeddingModel(EMBEDDING_MODEL),
        values: texts,
        maxParallelCalls: MAX_PARALLEL_CALLS,
      });

      // Update database with embeddings
      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j];
        const embedding = embeddings[j];
        const embeddingStr = JSON.stringify(embedding);
        
        await sql`
          UPDATE lecture_chunks 
          SET embedding = ${embeddingStr}::vector
          WHERE id = ${chunk.id}
        `;
      }
      
      processed += batch.length;
      spinner.succeed(`Batch ${batchNum}/${totalBatches} complete (${processed}/${chunks.rows.length} chunks)`);
    }

    console.log('\n✅ Embeddings regenerated successfully!');
    
    // Verify
    const check = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(embedding) as with_embeddings
      FROM lecture_chunks
    `;
    
    console.log(`\n📊 Final Status:`);
    console.log(`   Total chunks: ${check.rows[0].total}`);
    console.log(`   With embeddings: ${check.rows[0].with_embeddings}`);

  } catch (error) {
    spinner.fail('Failed to regenerate embeddings');
    console.error('Error:', error);
    process.exit(1);
  }
}

regenerateEmbeddings();
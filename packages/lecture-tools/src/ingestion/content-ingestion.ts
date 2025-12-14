#!/usr/bin/env bun
import { embedMany, cosineSimilarity } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { MDocument } from '@mastra/rag';
import { sql } from '@cybertantra/database';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import ora from 'ora';
import { EMBEDDING_MODEL, EMBEDDING_DIMENSION } from '@cybertantra/ai';

const CHUNK_SIZE = 1024;  // Mastra default
const CHUNK_OVERLAP = 200;  // Mastra default
const MAX_PARALLEL_CALLS = 5; // AI SDK v5 optimization
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

export type ContentCategory = 'lecture' | 'meditation' | 'video' | 'show';

interface IngestionConfig {
  category: ContentCategory;
  directory: string;
  tags?: string[];
}

interface ChunkWithMetadata {
  source: string;
  chunkIndex: number;
  totalChunks: number;
  content: string;
  embedding: number[];
  category: ContentCategory;
  tags?: string[];
  metadata?: Record<string, any>;
}

export class ContentIngestion {
  private config: IngestionConfig;
  private google: any;
  private stats = {
    totalFiles: 0,
    processedFiles: 0,
    failedFiles: 0,
    totalChunks: 0,
    totalTime: 0,
  };

  constructor(config: IngestionConfig) {
    this.config = config;
    this.google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
    });
  }

  async run(): Promise<void> {
    const startTime = Date.now();
    
    console.log(`\n📁 Scanning ${this.config.directory} for ${this.config.category} content...`);
    
    // Get all text files
    const files = await this.getTextFiles(this.config.directory);
    
    if (files.length === 0) {
      console.log('No text files found in the specified directory.');
      return;
    }
    
    this.stats.totalFiles = files.length;
    
    console.log(`Found ${files.length} files to process`);
    console.log(`Using ${EMBEDDING_MODEL} (${EMBEDDING_DIMENSION} dimensions)`);
    console.log(`Category: ${this.config.category.toUpperCase()}`);
    console.log(`Parallel embedding calls: ${MAX_PARALLEL_CALLS}\n`);
    
    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`\n📄 Processing [${i + 1}/${files.length}]: ${path.basename(file)}`);
      
      const fileStartTime = Date.now();
      const success = await this.processFile(file);
      const fileTime = Date.now() - fileStartTime;
      
      if (success) {
        this.stats.processedFiles++;
        console.log(`   ✅ Completed in ${(fileTime / 1000).toFixed(1)}s`);
      } else {
        this.stats.failedFiles++;
        console.log(`   ❌ Failed after ${(fileTime / 1000).toFixed(1)}s`);
      }
    }
    
    this.stats.totalTime = Date.now() - startTime;
    this.displayFinalReport();
  }

  private async getTextFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const subFiles = await this.getTextFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith('.txt')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  private async processFile(filePath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const filename = path.basename(filePath);
      
      // Check if already processed
      const existing = await sql`
        SELECT id FROM ingestion_metadata 
        WHERE filename = ${filename} 
        AND category = ${this.config.category}::content_category
      `;
      
      if (existing.length > 0) {
        console.log('   ⏭️  Already processed, skipping...');
        return true;
      }
      
      // Create chunks using Mastra
      const spinner = ora('   Creating chunks...').start();
      
      const mDoc = MDocument.fromText(content, {
        metadata: { source: filename },
      });
      
      const chunkedDocs = await mDoc.chunk({
        strategy: 'recursive',
        maxSize: CHUNK_SIZE,
        overlap: CHUNK_OVERLAP,
      });
      
      const chunks = chunkedDocs.map(doc => doc.text);
      spinner.succeed(`   Created ${chunks.length} chunks`);
      
      // Generate embeddings using AI SDK v5 pattern with optimization
      // Google has a limit of 100 embeddings per batch
      let allEmbeddings: any[] = [];
      
      // Process in batches of 100 or less
      const batchSize = 100;
      const totalBatches = Math.ceil(chunks.length / batchSize);
      
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batchNum = Math.floor(i / batchSize) + 1;
        const batch = chunks.slice(i, Math.min(i + batchSize, chunks.length));
        
        spinner.start(`   Generating embeddings... batch ${batchNum}/${totalBatches} (${batch.length} chunks)`);
        
        const { embeddings } = await embedMany({
          model: this.google.embeddingModel(EMBEDDING_MODEL),
          values: batch,
          maxParallelCalls: MAX_PARALLEL_CALLS, // AI SDK v5 optimization
        });
        allEmbeddings = allEmbeddings.concat(embeddings);
      }
      
      spinner.succeed(`   Generated ${allEmbeddings.length} embeddings`);
      
      const embeddings = allEmbeddings;
      
      // Prepare chunks with metadata
      const chunksWithEmbeddings: ChunkWithMetadata[] = chunks.map((content, index) => ({
        source: filename,
        chunkIndex: index,
        totalChunks: chunks.length,
        content,
        embedding: embeddings[index], // AI SDK v5 returns the embedding array directly
        category: this.config.category,
        tags: this.config.tags,
        metadata: {
          processedAt: new Date().toISOString(),
          model: EMBEDDING_MODEL,
        },
      }));
      
      spinner.text = '   Storing in database...';
      
      // Store chunks
      try {
        await this.storeChunks(chunksWithEmbeddings, filename);
        this.stats.totalChunks += chunks.length;
        
        // Verify embeddings were stored
        const verification = await sql`
          SELECT COUNT(*) as total, 
                 COUNT(embedding) as with_embeddings 
          FROM lecture_chunks 
          WHERE source = ${filename}
        `;
        const verified = verification.rows[0];
        
        if (verified.with_embeddings === verified.total) {
          spinner.succeed(`   Stored ${chunks.length} chunks with embeddings ✓`);
        } else {
          spinner.warn(`   Stored ${chunks.length} chunks (${verified.total - verified.with_embeddings} missing embeddings!)`);
        }
      } catch (storeError: any) {
        // If it's a duplicate key error on metadata, chunks might have been stored
        // Clean them up
        if (storeError.code === '23505' && storeError.message?.includes('ingestion_metadata')) {
          await sql`DELETE FROM lecture_chunks WHERE source = ${filename}`;
          spinner.fail(`   File already processed, skipping`);
          return true; // Not a failure, just already done
        }
        throw storeError;
      }
      
      // Optional: Check embedding quality (deduplication)
      if (chunks.length > 1) {
        await this.checkEmbeddingQuality(chunksWithEmbeddings);
      }
      
      return true;
      
    } catch (error) {
      console.error('   Error processing file:', error);
      return false;
    }
  }


  private async checkEmbeddingQuality(chunks: ChunkWithMetadata[]): Promise<void> {
    // Sample check: find highly similar chunks that might be duplicates
    const threshold = 0.95; // Very high similarity
    const duplicates: Array<[number, number, number]> = [];
    
    for (let i = 0; i < Math.min(chunks.length - 1, 10); i++) {
      for (let j = i + 1; j < Math.min(chunks.length, 10); j++) {
        // Check if embeddings exist and are arrays
        if (!chunks[i].embedding || !chunks[j].embedding || 
            !Array.isArray(chunks[i].embedding) || !Array.isArray(chunks[j].embedding)) {
          continue;
        }
        const similarity = cosineSimilarity(chunks[i].embedding, chunks[j].embedding);
        if (similarity > threshold) {
          duplicates.push([i, j, similarity]);
        }
      }
    }
    
    if (duplicates.length > 0) {
      console.log(`   ⚠️  Found ${duplicates.length} potentially duplicate chunks (similarity > ${threshold})`);
    }
  }

  private async storeChunks(chunks: ChunkWithMetadata[], filename: string): Promise<void> {
    // Calculate file hash
    const fileContent = chunks.map(c => c.content).join('');
    const fileHash = crypto.createHash('sha256').update(fileContent).digest('hex');
    
    // Store chunks in batch for better performance
    const chunkValues = chunks.map(chunk => [
      chunk.source,
      chunk.chunkIndex,
      chunk.totalChunks,
      chunk.content,
      JSON.stringify(chunk.embedding),
      chunk.category,
      chunk.tags || null,
      JSON.stringify(chunk.metadata || {})
    ]);
    
    // Batch insert for better performance
    for (const values of chunkValues) {
      await sql`
        INSERT INTO lecture_chunks (
          source, 
          chunk_index, 
          total_chunks, 
          content, 
          embedding,
          category,
          tags,
          metadata
        )
        VALUES (
          ${values[0]},
          ${values[1]},
          ${values[2]},
          ${values[3]},
          ${values[4]}::vector,
          ${values[5]}::content_category,
          ${values[6]},
          ${values[7]}::jsonb
        )
      `;
    }
    
    // Store ingestion metadata
    await sql`
      INSERT INTO ingestion_metadata (
        filename, 
        file_hash, 
        chunks_count,
        category,
        tags
      )
      VALUES (
        ${filename},
        ${fileHash},
        ${chunks.length},
        ${this.config.category}::content_category,
        ${this.config.tags || null}
      )
    `;
  }

  private displayFinalReport(): void {
    console.log('\n========================================');
    console.log('📊 INGESTION COMPLETE');
    console.log('========================================');
    console.log(`Category:         ${this.config.category.toUpperCase()}`);
    if (this.config.tags && this.config.tags.length > 0) {
      console.log(`Tags:             ${this.config.tags.join(', ')}`);
    }
    console.log(`Total Files:      ${this.stats.totalFiles}`);
    console.log(`Processed:        ${this.stats.processedFiles}`);
    console.log(`Failed:           ${this.stats.failedFiles}`);
    console.log(`Total Chunks:     ${this.stats.totalChunks}`);
    console.log(`Total Time:       ${(this.stats.totalTime / 1000).toFixed(1)}s`);
    console.log(`Chunks/Second:    ${(this.stats.totalChunks / (this.stats.totalTime / 1000)).toFixed(1)}`);
    console.log('========================================\n');
  }
}

// Export for CLI usage
export default ContentIngestion;
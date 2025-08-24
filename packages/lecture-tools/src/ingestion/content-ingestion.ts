#!/usr/bin/env bun
import { embedMany, cosineSimilarity } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { sql } from '@cybertantra/database';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import ora from 'ora';
import { EMBEDDING_MODEL, EMBEDDING_DIMENSION } from '@cybertantra/ai';

const CHUNK_SIZE = 1024;
const CHUNK_OVERLAP = 200;
const MAX_PARALLEL_CALLS = 5; // AI SDK v5 optimization
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

export type ContentCategory = 'lecture' | 'meditation' | 'video' | 'show';

interface IngestionConfig {
  category: ContentCategory;
  directory: string;
  tags?: string[];
  author?: string;
  duration?: number;
}

interface ChunkWithMetadata {
  source: string;
  chunkIndex: number;
  totalChunks: number;
  content: string;
  embedding: number[];
  category: ContentCategory;
  tags?: string[];
  author?: string;
  duration?: number;
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
      
      // Create chunks
      const spinner = ora('   Creating chunks...').start();
      const chunks = this.createSmartChunks(content);
      
      spinner.text = `   Generating embeddings for ${chunks.length} chunks...`;
      
      // Generate embeddings using AI SDK v5 pattern with optimization
      const { embeddings } = await embedMany({
        model: this.google.textEmbeddingModel(EMBEDDING_MODEL),
        values: chunks,
        maxParallelCalls: MAX_PARALLEL_CALLS, // AI SDK v5 optimization
      });
      
      // Prepare chunks with metadata
      const chunksWithEmbeddings: ChunkWithMetadata[] = chunks.map((content, index) => ({
        source: filename,
        chunkIndex: index,
        totalChunks: chunks.length,
        content,
        embedding: embeddings[index].embedding,
        category: this.config.category,
        tags: this.config.tags,
        author: this.config.author,
        duration: this.config.duration,
        metadata: {
          processedAt: new Date().toISOString(),
          model: EMBEDDING_MODEL,
        },
      }));
      
      spinner.text = '   Storing in database...';
      
      // Store chunks
      await this.storeChunks(chunksWithEmbeddings, filename);
      
      this.stats.totalChunks += chunks.length;
      
      spinner.succeed(`   Stored ${chunks.length} chunks`);
      
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

  private createSmartChunks(text: string): string[] {
    const chunks: string[] = [];
    
    // Split by paragraphs first (double newline)
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = '';
    let wordCount = 0;
    
    for (const paragraph of paragraphs) {
      const paragraphWords = paragraph.split(/\s+/).length;
      
      // If adding this paragraph would exceed chunk size, save current chunk
      if (wordCount + paragraphWords > CHUNK_SIZE / 5 && currentChunk) { // Approximate words
        chunks.push(currentChunk.trim());
        
        // Create overlap by keeping last part of current chunk
        const overlap = currentChunk
          .split(/\s+/)
          .slice(-(CHUNK_OVERLAP / 5)) // Approximate overlap in words
          .join(' ');
        
        currentChunk = overlap + '\n\n' + paragraph;
        wordCount = overlap.split(/\s+/).length + paragraphWords;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        wordCount += paragraphWords;
      }
    }
    
    // Add remaining content
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  private async checkEmbeddingQuality(chunks: ChunkWithMetadata[]): Promise<void> {
    // Sample check: find highly similar chunks that might be duplicates
    const threshold = 0.95; // Very high similarity
    const duplicates: Array<[number, number, number]> = [];
    
    for (let i = 0; i < Math.min(chunks.length - 1, 10); i++) {
      for (let j = i + 1; j < Math.min(chunks.length, 10); j++) {
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
      chunk.author || null,
      chunk.duration || null,
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
          author,
          duration_minutes,
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
          ${values[7]},
          ${values[8]},
          ${values[9]}::jsonb
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
        tags,
        author
      )
      VALUES (
        ${filename},
        ${fileHash},
        ${chunks.length},
        ${this.config.category}::content_category,
        ${this.config.tags || null},
        ${this.config.author || null}
      )
    `;
  }

  private displayFinalReport(): void {
    console.log('\n========================================');
    console.log('📊 INGESTION COMPLETE');
    console.log('========================================');
    console.log(`Category:         ${this.config.category.toUpperCase()}`);
    if (this.config.author) {
      console.log(`Author:           ${this.config.author}`);
    }
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
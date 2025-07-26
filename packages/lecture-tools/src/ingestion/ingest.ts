import { MDocument } from '@mastra/rag';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { sql } from '@cybertantra/database';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import ora from 'ora';
import { IngestionTracker, FileStatus as FileStatusType } from '@cybertantra/database';
import { execSync } from 'child_process';
import { TranscriptionService, TranscriptionConfig } from '../transcription/service';
import inquirer from 'inquirer';
import { EMBEDDING_MODEL as CONFIGURED_EMBEDDING_MODEL, EMBEDDING_DIMENSION as CONFIGURED_DIMENSION } from '@cybertantra/ai';

export const EMBEDDING_MODEL = CONFIGURED_EMBEDDING_MODEL;
export const EMBEDDING_DIMENSION = CONFIGURED_DIMENSION;
const CHUNK_SIZE = 1024;
const CHUNK_OVERLAP = 200;
const BATCH_SIZE = 30;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

interface ChunkWithEmbedding {
  source: string;
  chunkIndex: number;
  totalChunks: number;
  content: string;
  embedding: number[];
}

interface IngestionStats {
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  skippedFiles: number;
  totalChunks: number;
  totalTime: number;
  estimatedCost: number;
}

class GeminiIngestion {
  private tracker: IngestionTracker;
  private stats: IngestionStats = {
    totalFiles: 0,
    processedFiles: 0,
    failedFiles: 0,
    skippedFiles: 0,
    totalChunks: 0,
    totalTime: 0,
    estimatedCost: 0,
  };
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.tracker = new IngestionTracker();
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
    this.model = this.genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  }

  async run(): Promise<void> {
    console.log('[ CORPUS INGESTION - GEMINI ENGINE ]');
    console.log('=====================================\n');
    
    // Check for required environment variables
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY || !process.env.POSTGRES_URL) {
      throw new Error('Missing required API keys. Please check your .env file.');
    }

    const startTime = Date.now();
    
    try {
      // Get all lecture files first
      const lecturesDir = './lectures';
      const fileStatuses = await this.tracker.scanLectureDirectory(lecturesDir);
      
      // Initialize session with total file count
      await this.tracker.initializeSession(fileStatuses.length);
      
      if (fileStatuses.length === 0) {
        console.log('No text files found in lectures directory.');
        return;
      }
      
      this.stats.totalFiles = fileStatuses.length;
      
      console.log(`Found ${fileStatuses.length} lecture files`);
      console.log(`Using ${EMBEDDING_MODEL} (${EMBEDDING_DIMENSION} dimensions`);
      console.log(`Chunk size: ${CHUNK_SIZE}, Overlap: ${CHUNK_OVERLAP}\n`);
      
      // Process each file
      for (let i = 0; i < fileStatuses.length; i++) {
        const file = fileStatuses[i];
        
        // Skip if already processed
        if (file.status === 'completed') {
          console.log(`\nSkipping [${i + 1}/${fileStatuses.length}]: ${file.filename} (already processed)`);
          this.stats.skippedFiles++;
          continue;
        }
        
        console.log(`\n📄 Processing [${i + 1}/${fileStatuses.length}]: ${file.filename}`);
        
        const fileStartTime = Date.now();
        const success = await this.processFile(file.filename, lecturesDir);
        const fileTime = Date.now() - fileStartTime;
        
        if (success) {
          this.stats.processedFiles++;
          console.log(`Completed in ${(fileTime / 1000).toFixed(1)}s`);
        } else {
          this.stats.failedFiles++;
          console.log(`Failed after ${(fileTime / 1000).toFixed(1)}s`);
        }
        
        // Show progress
        this.displayProgress();
      }
      
      // Complete session
      await this.tracker.completeSession(
        this.stats.failedFiles === 0 ? 'completed' : 'failed'
      );
      
      this.stats.totalTime = Date.now() - startTime;
      
      // Final report
      this.displayFinalReport();
      
    } catch (error) {
      console.error('\nFatal error:', error);
      await this.tracker.completeSession('failed');
      process.exit(1);
    }
  }

  private async processFile(filename: string, lecturesDir: string): Promise<boolean> {
    try {
      await this.tracker.markFileProcessing(filename);
      
      const filePath = path.join(lecturesDir, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Create and chunk document
      const spinner = ora('Creating chunks...').start();
      const mDoc = MDocument.fromText(content, {
        metadata: { source: filename },
      });
      
      const chunks = await mDoc.chunk({
        strategy: 'recursive',
        size: CHUNK_SIZE,
        overlap: CHUNK_OVERLAP,
      });
      
      spinner.succeed(`Created ${chunks.length} chunks`);
      
      // Generate embeddings with retry logic
      const chunksWithEmbeddings = await this.generateEmbeddingsWithRetry(chunks, filename);
      
      if (chunksWithEmbeddings.length === 0) {
        throw new Error('Failed to generate embeddings');
      }
      
      // Save to database
      await this.saveToDatabase(chunksWithEmbeddings, filename);
      
      // Update metadata
      const fileHash = crypto.createHash('sha256').update(content).digest('hex');
      await this.updateMetadata(filename, fileHash, chunks.length);
      
      // Mark as completed with processing time
      const processingTime = Date.now() - (await sql`SELECT started_at FROM ingestion_status WHERE filename = ${filename}`).rows[0].started_at.getTime();
      await this.tracker.markFileCompleted(filename, chunks.length, processingTime);
      
      this.stats.totalChunks += chunks.length;
      
      // Estimate cost (Gemini free tier: 1500 requests/minute)
      // Using conservative estimate for paid tier
      this.stats.estimatedCost += chunks.length * 0.00001; // $0.00001 per embedding
      
      return true;
      
    } catch (error) {
      console.error(`Error processing ${filename}:`, error);
      await this.tracker.markFileFailed(filename, error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  private async generateEmbeddingsWithRetry(
    chunks: any[], 
    filename: string
  ): Promise<ChunkWithEmbedding[]> {
    const chunksWithEmbeddings: ChunkWithEmbedding[] = [];
    const spinner = ora(`Generating embeddings for ${chunks.length} chunks...`).start();
    
    for (let i = 0; i < chunks.length; i++) {
      let retries = 0;
      let success = false;
      
      while (retries < MAX_RETRIES && !success) {
        try {
          // Update spinner
          spinner.text = `Generating embeddings... [${i + 1}/${chunks.length}]${retries > 0 ? ` (retry ${retries})` : ''}`;
          
          const result = await this.model.embedContent(chunks[i].text);
          const embedding = result.embedding.values;
          
          chunksWithEmbeddings.push({
            source: filename,
            chunkIndex: i,
            totalChunks: chunks.length,
            content: chunks[i].text,
            embedding: embedding,
          });
          
          success = true;
          
          // Small delay to avoid rate limits
          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
        } catch (error) {
          retries++;
          if (retries < MAX_RETRIES) {
            spinner.text = `Embedding error, retrying in ${RETRY_DELAY/1000}s... [${i + 1}/${chunks.length}]`;
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          } else {
            spinner.fail(`Failed to generate embedding for chunk ${i + 1}`);
            throw error;
          }
        }
      }
    }
    
    spinner.succeed(`Generated ${chunksWithEmbeddings.length} embeddings`);
    return chunksWithEmbeddings;
  }

  private async saveToDatabase(chunks: ChunkWithEmbedding[], filename: string): Promise<void> {
    const spinner = ora('Saving to database...').start();
    
    try {
      // Delete existing chunks for this file
      await sql`DELETE FROM lecture_chunks WHERE source = ${filename}`;
      
      // Insert new chunks in batches
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        spinner.text = `Saving to database... [${Math.min(i + BATCH_SIZE, chunks.length)}/${chunks.length}]`;
        
        for (const chunk of batch) {
          const embeddingStr = `[${chunk.embedding.join(',')}]`;
          
          await sql`
            INSERT INTO lecture_chunks (source, chunk_index, total_chunks, content, embedding)
            VALUES (${chunk.source}, ${chunk.chunkIndex}, ${chunk.totalChunks}, ${chunk.content}, ${embeddingStr}::vector)
          `;
        }
      }
      
      spinner.succeed('Saved to database');
    } catch (error) {
      spinner.fail('Failed to save to database');
      throw error;
    }
  }

  private async updateMetadata(filename: string, fileHash: string, chunksCount: number): Promise<void> {
    await sql`
      INSERT INTO ingestion_metadata (filename, file_hash, chunks_count)
      VALUES (${filename}, ${fileHash}, ${chunksCount})
      ON CONFLICT (filename) 
      DO UPDATE SET file_hash = ${fileHash}, chunks_count = ${chunksCount}, ingested_at = CURRENT_TIMESTAMP
    `;
  }

  private displayProgress(): void {
    const processed = this.stats.processedFiles + this.stats.skippedFiles + this.stats.failedFiles;
    const percentage = Math.round((processed / this.stats.totalFiles) * 100);
    const progressBar = this.createProgressBar(percentage);
    
    console.log(`\n${progressBar} ${percentage}%`);
    console.log(`Processed: ${this.stats.processedFiles} | Skipped: ${this.stats.skippedFiles} | Failed: ${this.stats.failedFiles}`);
  }

  private createProgressBar(percentage: number): string {
    const width = 30;
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return `[${'\u001b[32m█\u001b[0m'.repeat(filled)}${' '.repeat(empty)}]`;
  }

  private displayFinalReport(): void {
    console.log('\n\n========================================');
    console.log('[ INGESTION COMPLETE ]');
    console.log('========================================');
    console.log(`Total files: ${this.stats.totalFiles}`);
    console.log(`Processed: ${this.stats.processedFiles}`);
    console.log(`Skipped: ${this.stats.skippedFiles}`);
    console.log(`Failed: ${this.stats.failedFiles}`);
    console.log(`Total chunks: ${this.stats.totalChunks}`);
    console.log(`Total time: ${(this.stats.totalTime / 1000).toFixed(1)}s`);
    console.log(`Estimated cost: $${this.stats.estimatedCost.toFixed(4)}`);
    console.log('========================================\n');
  }

  async showStatus(): Promise<void> {
    const fileStatuses = await this.tracker.scanLectureDirectory('./lectures');
    
    console.log('\n[ INGESTION STATUS ]');
    console.log('====================\n');
    
    // Database stats
    const stats = await sql`
      SELECT 
        COUNT(DISTINCT source) as total_files,
        COUNT(*) as total_chunks,
        MAX(created_at) as last_update
      FROM lecture_chunks
    `;
    
    console.log('📈 Database Statistics:');
    console.log(`   Total files: ${stats.rows[0].total_files}`);
    console.log(`   Total chunks: ${stats.rows[0].total_chunks}`);
    console.log(`   Last update: ${stats.rows[0].last_update ? new Date(stats.rows[0].last_update).toLocaleString() : 'Never'}`);
    
    // File status breakdown
    const statusCounts = fileStatuses.reduce((acc, file) => {
      acc[file.status] = (acc[file.status] || 0) + 1;
      return acc;
    }, {} as Record<FileStatusType, number>);
    
    console.log('\nFile Status:');
    console.log(`   Completed: ${statusCounts.completed || 0}`);
    console.log(`   ⏳ Processing: ${statusCounts.processing || 0}`);
    console.log(`   📋 Pending: ${statusCounts.pending || 0}`);
    console.log(`   Failed: ${statusCounts.failed || 0}`);
    
    // Failed files
    const failedFiles = fileStatuses.filter(f => f.status === 'failed');
    if (failedFiles.length > 0) {
      console.log('\nFailed Files:');
      for (const file of failedFiles) {
        console.log(`   - ${file.filename}`);
      }
    }
  }

  async deleteContent(target?: string): Promise<void> {
    console.log('\n[ CONTENT DELETION ]');
    console.log('====================\n');
    
    if (!target || target === '--all') {
      // Delete all content with extreme confirmation
      console.log('⚠️  WARNING: This will delete ALL ingested content from the database!');
      console.log('This action cannot be undone.\n');
      
      const { confirmReset } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmReset',
          message: 'Are you absolutely sure you want to delete all ingested content?',
          default: false,
        },
      ]);
      
      if (!confirmReset) {
        console.log('Deletion cancelled.');
        return;
      }
      
      // Second confirmation with exact phrase
      const { confirmPhrase } = await inquirer.prompt([
        {
          type: 'input',
          name: 'confirmPhrase',
          message: 'Type exactly "I am sure I want to reset everything" to confirm:',
        },
      ]);
      
      if (confirmPhrase !== 'I am sure I want to reset everything') {
        console.log('❌ Incorrect confirmation phrase. Deletion cancelled.');
        return;
      }
      
      // Proceed with deletion
      const spinner = ora('Deleting all content...').start();
      
      try {
        // Get counts before deletion
        const beforeStats = await sql`
          SELECT COUNT(DISTINCT source) as files, COUNT(*) as chunks 
          FROM lecture_chunks
        `;
        
        // Delete all chunks
        await sql`DELETE FROM lecture_chunks`;
        
        // Clear ingestion tracking
        await sql`DELETE FROM ingestion_status`;
        await sql`DELETE FROM ingestion_metadata`;
        await sql`DELETE FROM chunk_processing_log`;
        
        spinner.succeed('All content deleted successfully');
        
        console.log('\n📊 Deletion Summary:');
        console.log(`   Files removed: ${beforeStats.rows[0].files}`);
        console.log(`   Chunks removed: ${beforeStats.rows[0].chunks}`);
        console.log('   All tracking data cleared\n');
        
      } catch (error) {
        spinner.fail('Failed to delete content');
        throw error;
      }
      
    } else {
      // Delete specific file
      console.log(`Deleting content from: ${target}`);
      
      const { confirmDelete } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmDelete',
          message: `Delete all chunks from "${target}"?`,
          default: false,
        },
      ]);
      
      if (!confirmDelete) {
        console.log('Deletion cancelled.');
        return;
      }
      
      const spinner = ora('Deleting content...').start();
      
      try {
        // Check if file exists
        const existing = await sql`
          SELECT COUNT(*) as count 
          FROM lecture_chunks 
          WHERE source = ${target}
        `;
        
        if (existing.rows[0].count === 0) {
          spinner.fail(`No content found for: ${target}`);
          return;
        }
        
        // Delete chunks
        const result = await sql`
          DELETE FROM lecture_chunks 
          WHERE source = ${target}
        `;
        
        // Update tracking
        await sql`
          DELETE FROM ingestion_status 
          WHERE filename = ${target}
        `;
        
        await sql`
          DELETE FROM ingestion_metadata 
          WHERE filename = ${target}
        `;
        
        spinner.succeed(`Deleted ${existing.rows[0].count} chunks from ${target}`);
        
      } catch (error) {
        spinner.fail('Failed to delete content');
        throw error;
      }
    }
  }

  async listIngested(): Promise<void> {
    console.log('\n[ INGESTED CONTENT ]');
    console.log('====================\n');
    
    const files = await sql`
      SELECT 
        source,
        COUNT(*) as chunks,
        MIN(created_at) as first_ingested,
        MAX(created_at) as last_updated
      FROM lecture_chunks
      GROUP BY source
      ORDER BY source
    `;
    
    if (files.rows.length === 0) {
      console.log('No content has been ingested yet.');
      return;
    }
    
    console.log(`Found ${files.rows.length} ingested files:\n`);
    
    for (const file of files.rows) {
      const date = new Date(file.first_ingested).toLocaleDateString();
      console.log(`📄 ${file.source}`);
      console.log(`   Chunks: ${file.chunks} | Ingested: ${date}`);
    }
    
    const totalChunks = files.rows.reduce((sum, f) => sum + parseInt(f.chunks), 0);
    console.log(`\nTotal: ${files.rows.length} files, ${totalChunks} chunks`);
  }

  async processSingleFile(filename: string): Promise<void> {
    console.log('[ SINGLE FILE INGESTION ]');
    console.log('=========================\n');
    
    const lecturesDir = './lectures';
    const filePath = path.join(lecturesDir, filename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      console.error(`❌ File not found: ${filename}`);
      console.log(`   Looking in: ${lecturesDir}`);
      return;
    }
    
    console.log(`📄 Processing: ${filename}`);
    
    const startTime = Date.now();
    
    try {
      // Initialize session for single file
      await this.tracker.initializeSession(1);
      
      const success = await this.processFile(filename, lecturesDir);
      const processingTime = Date.now() - startTime;
      
      if (success) {
        console.log(`✅ Successfully ingested in ${(processingTime / 1000).toFixed(1)}s`);
      } else {
        console.log(`❌ Failed to ingest ${filename}`);
      }
      
      // Complete session
      await this.tracker.completeSession(success ? 'completed' : 'failed');
      
    } catch (error) {
      console.error('Error:', error);
      await this.tracker.completeSession('failed');
    }
  }

  async processYouTubeUrl(url: string): Promise<void> {
    console.log('[ YOUTUBE INGESTION PIPELINE ]');
    console.log('==============================\n');
    
    // Check for required environment variables
    if (!process.env.ASSEMBLYAI_API_KEY) {
      throw new Error('ASSEMBLYAI_API_KEY not found in .env file');
    }
    
    const audioDir = './audio';
    const lecturesDir = './lectures';
    
    try {
      // Step 1: Download audio from YouTube
      console.log('📥 Step 1: Downloading audio from YouTube...');
      const downloadSpinner = ora('Running yt-audio download...').start();
      
      try {
        execSync(`./yt-audio "${url}"`, { stdio: 'inherit' });
        downloadSpinner.succeed('Audio downloaded successfully');
      } catch (error) {
        downloadSpinner.fail('Failed to download audio');
        throw new Error(`YouTube download failed: ${error}`);
      }
      
      // Step 2: Find the downloaded file
      // Get list of files before and after to find the new one
      const beforeDownload = Date.now() - 5000; // 5 seconds before download
      const audioFiles = await fs.readdir(audioDir);
      const mp3Files = audioFiles.filter(f => f.endsWith('.mp3'));
      
      if (mp3Files.length === 0) {
        throw new Error('No MP3 file found after download');
      }
      
      // Find files created after we started the download
      const newFiles = await Promise.all(
        mp3Files.map(async (file) => {
          const stats = await fs.stat(path.join(audioDir, file));
          return {
            file,
            mtime: stats.mtime,
            ctime: stats.ctime,
          };
        })
      );
      
      // Filter for files created recently (within last minute)
      const recentFiles = newFiles.filter(f => 
        f.ctime.getTime() > beforeDownload || f.mtime.getTime() > beforeDownload
      );
      
      if (recentFiles.length === 0) {
        throw new Error('No recently downloaded MP3 file found');
      }
      
      // Get the most recent file
      recentFiles.sort((a, b) => b.ctime.getTime() - a.ctime.getTime());
      const audioFile = recentFiles[0].file;
      const audioPath = path.join(audioDir, audioFile);
      
      console.log(`\n📎 Downloaded: ${audioFile}`);
      
      // Step 3: Transcribe the audio
      console.log('\n🎤 Step 2: Transcribing audio...');
      const transcriptionService = new TranscriptionService();
      
      const config: TranscriptionConfig = {
        modelTier: 'best',
        speakerLabels: true,
        languageCode: 'en',
        outputFormat: 'both',
      };
      
      const transcriptionSpinner = ora('Transcribing audio...').start();
      const result = await transcriptionService.transcribeFile(audioPath, config);
      
      if (!result.success) {
        transcriptionSpinner.fail('Transcription failed');
        throw new Error(`Transcription failed: ${result.error}`);
      }
      
      transcriptionSpinner.succeed(`Transcription completed (${(result.duration! / 60).toFixed(1)} min, $${result.cost!.toFixed(2)})`);
      
      // Find the generated transcript file
      const transcriptFiles = await fs.readdir(lecturesDir);
      const baseName = path.basename(audioFile, '.mp3');
      const transcriptFile = transcriptFiles.find(f => f.includes(baseName) && f.endsWith('.txt'));
      
      if (!transcriptFile) {
        throw new Error('Transcript file not found after transcription');
      }
      
      console.log(`📝 Transcript saved: ${transcriptFile}`);
      
      // Delete the audio file after successful transcription
      try {
        await fs.unlink(audioPath);
        console.log(`🗑️  Deleted audio file: ${audioFile}`);
      } catch (error) {
        console.error(`⚠️  Failed to delete audio file: ${error}`);
      }
      
      // Step 4: Ingest the transcript
      console.log('\n📚 Step 3: Ingesting transcript into vector database...');
      
      // Process just this one file
      const fileStartTime = Date.now();
      const success = await this.processFile(transcriptFile, lecturesDir);
      const fileTime = Date.now() - fileStartTime;
      
      if (success) {
        console.log(`✅ Ingestion completed in ${(fileTime / 1000).toFixed(1)}s`);
        
        // Show final summary
        console.log('\n========================================');
        console.log('[ YOUTUBE INGESTION COMPLETE ]');
        console.log('========================================');
        console.log(`Source: ${url}`);
        console.log(`Transcript: ${transcriptFile}`);
        console.log(`Processing time: ${(fileTime / 1000).toFixed(1)}s`);
        console.log(`Transcription cost: $${result.cost!.toFixed(2)}`);
        console.log('========================================\n');
      } else {
        throw new Error('Failed to ingest transcript');
      }
      
    } catch (error) {
      console.error('\n❌ Pipeline failed:', error);
      throw error;
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const arg = process.argv[3];
  const ingestion = new GeminiIngestion();
  
  if (command === 'status') {
    ingestion.showStatus().catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
  } else if (command === 'delete') {
    ingestion.deleteContent(arg).catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
  } else if (command === 'list') {
    ingestion.listIngested().catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
  } else if (command === 'file' && arg) {
    ingestion.processSingleFile(arg).catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
  } else if (command && (command.startsWith('http://') || command.startsWith('https://') || command.includes('youtube.com') || command.includes('youtu.be'))) {
    // Handle YouTube URL
    ingestion.processYouTubeUrl(command).catch(error => {
      console.error('Error processing YouTube URL:', error);
      process.exit(1);
    });
  } else if (command === 'help' || command === '--help' || command === '-h') {
    console.log('\nUsage: bun run ingest [command] [options]\n');
    console.log('Commands:');
    console.log('  (no command)           Process pending files from ./lectures');
    console.log('  file <filename>        Ingest a single file from ./lectures');
    console.log('  <youtube-url>          Download, transcribe and ingest a YouTube video');
    console.log('  status                 Show ingestion statistics');
    console.log('  list                   List all ingested content');
    console.log('  delete <filename>      Delete specific file from database');
    console.log('  delete --all           Delete ALL ingested content (requires confirmation)');
    console.log('  help                   Show this help message\n');
    console.log('Examples:');
    console.log('  bun run ingest');
    console.log('  bun run ingest file "tantric concepts.md"');
    console.log('  bun run ingest https://youtube.com/watch?v=...');
    console.log('  bun run ingest status');
    console.log('  bun run ingest list');
    console.log('  bun run ingest delete "lecture1.txt"');
    console.log('  bun run ingest delete --all\n');
  } else {
    ingestion.run().catch(error => {
      console.error('Error during ingestion:', error);
      process.exit(1);
    });
  }
}

export { GeminiIngestion };
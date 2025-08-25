import Replicate from 'replicate';
import fs from 'fs/promises';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import pLimit from 'p-limit';

export interface SpleeterExtractionOptions {
  stems?: 2 | 4 | 5; // 2 = vocals/accompaniment, 4 = vocals/drums/bass/other, 5 = vocals/drums/bass/piano/other
  outputDir?: string;
  maxConcurrent?: number;
}

export interface SpleeterResult {
  vocals: string;
  accompaniment?: string;
  drums?: string;
  bass?: string;
  other?: string;
  piano?: string;
  filename: string;
}

export class SpleeterExtractionService {
  private replicate: Replicate;
  private outputDir: string;
  private maxConcurrent: number;
  private stems: 2 | 4 | 5;

  constructor(options: SpleeterExtractionOptions = {}) {
    const apiToken = process.env.REPLICATE_API_TOKEN;
    if (!apiToken) {
      throw new Error('REPLICATE_API_TOKEN environment variable is required');
    }

    this.replicate = new Replicate({
      auth: apiToken,
    });

    this.outputDir = options.outputDir || path.join(process.cwd(), 'apps/cybertantra/public/audio/extracted-vocals');
    this.maxConcurrent = options.maxConcurrent || 4;
    this.stems = options.stems || 2;
  }

  /**
   * Extract vocals from a single audio file using Spleeter via Replicate
   */
  async extractVocals(audioPath: string, topic?: string): Promise<SpleeterResult> {
    console.log(`🎵 Processing: ${path.basename(audioPath)}`);
    
    // Read the audio file
    const audioBuffer = await fs.readFile(audioPath);
    const audioBase64 = audioBuffer.toString('base64');
    const audioDataUri = `data:audio/mpeg;base64,${audioBase64}`;

    try {
      // Run Spleeter via Replicate - using current working model
      console.log(`  ⚡ Running Spleeter with ${this.stems} stems...`);
      const output = await this.replicate.run(
        "soykertje/spleeter:cd128044253523c86abfd743dea680c88559ad975ccd72378c8433f067ab5d0a",
        {
          input: {
            audio: audioDataUri,
            stems: this.stems,
          }
        }
      ) as any;

      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });

      // Generate filename
      const originalName = path.basename(audioPath, path.extname(audioPath));
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = topic ? 
        `${topic.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')}_${timestamp}` :
        `${originalName}_${timestamp}`;

      const result: SpleeterResult = {
        vocals: '',
        filename,
      };

      // Download and save each stem
      if (output.vocals) {
        const vocalsPath = path.join(this.outputDir, `${filename}_vocals.wav`);
        await this.downloadFile(output.vocals, vocalsPath);
        result.vocals = `/audio/extracted-vocals/${filename}_vocals.wav`;
        console.log(`  ✅ Vocals saved: ${result.vocals}`);
      }

      if (this.stems > 2) {
        if (output.accompaniment) {
          const accompPath = path.join(this.outputDir, `${filename}_accompaniment.wav`);
          await this.downloadFile(output.accompaniment, accompPath);
          result.accompaniment = `/audio/extracted-vocals/${filename}_accompaniment.wav`;
        }

        if (output.drums && this.stems >= 4) {
          const drumsPath = path.join(this.outputDir, `${filename}_drums.wav`);
          await this.downloadFile(output.drums, drumsPath);
          result.drums = `/audio/extracted-vocals/${filename}_drums.wav`;
        }

        if (output.bass && this.stems >= 4) {
          const bassPath = path.join(this.outputDir, `${filename}_bass.wav`);
          await this.downloadFile(output.bass, bassPath);
          result.bass = `/audio/extracted-vocals/${filename}_bass.wav`;
        }

        if (output.other && this.stems >= 4) {
          const otherPath = path.join(this.outputDir, `${filename}_other.wav`);
          await this.downloadFile(output.other, otherPath);
          result.other = `/audio/extracted-vocals/${filename}_other.wav`;
        }

        if (output.piano && this.stems === 5) {
          const pianoPath = path.join(this.outputDir, `${filename}_piano.wav`);
          await this.downloadFile(output.piano, pianoPath);
          result.piano = `/audio/extracted-vocals/${filename}_piano.wav`;
        }
      }

      return result;
    } catch (error) {
      console.error(`  ❌ Failed to process ${audioPath}:`, error);
      throw error;
    }
  }

  /**
   * Extract vocals from multiple audio files in parallel
   */
  async extractVocalsFromDirectory(inputDir: string): Promise<SpleeterResult[]> {
    // Find all audio files
    const files = await this.findAudioFiles(inputDir);
    
    if (files.length === 0) {
      throw new Error(`No audio files found in ${inputDir}`);
    }

    console.log(`🎵 Found ${files.length} audio files to process`);
    console.log(`⚡ Processing with ${this.maxConcurrent} concurrent jobs`);

    // Create a limit for concurrent processing
    const limit = pLimit(this.maxConcurrent);

    // Process all files in parallel with concurrency limit
    const results = await Promise.all(
      files.map((file, index) =>
        limit(async () => {
          console.log(`[${index + 1}/${files.length}] Processing: ${path.basename(file)}`);
          try {
            return await this.extractVocals(file);
          } catch (error) {
            console.error(`Failed to process ${file}:`, error);
            return null;
          }
        })
      )
    );

    // Filter out failed extractions
    const successful = results.filter((r): r is SpleeterResult => r !== null);
    
    console.log(`\n✅ Successfully processed ${successful.length}/${files.length} files`);
    
    return successful;
  }

  /**
   * Find all audio files in a directory
   */
  private async findAudioFiles(dir: string): Promise<string[]> {
    const audioExtensions = ['.mp3', '.wav', '.m4a', '.flac', '.opus', '.ogg', '.aac'];
    const files: string[] = [];

    async function walk(currentDir: string) {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (audioExtensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    }

    await walk(dir);
    return files;
  }

  /**
   * Download a file from a URL
   */
  private async downloadFile(url: string, destination: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`);
    }

    const fileStream = createWriteStream(destination);
    await pipeline(response.body as any, fileStream);
  }
}
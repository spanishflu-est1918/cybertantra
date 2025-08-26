import { TextToSpeechService } from './text-to-speech';
import { parseTextIntoSegments, generateAllSegments, stitchAudioSegments } from '../utils/tts';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

export interface MeditationAudioOptions {
  voiceId?: string;
  outputDir?: string;
  useSegmented?: boolean; // Use segmented generation for better quality
}

export interface MeditationAudioResult {
  audioPath: string;
  audioSize: number;
  filename: string;
  segmentCount?: number;
  method?: 'standard' | 'segmented';
}

export class MeditationAudioService {
  private tts: TextToSpeechService;
  private voiceId?: string;
  private outputDir: string;
  private useSegmented: boolean;

  constructor(options: MeditationAudioOptions = {}) {
    this.tts = new TextToSpeechService(options.voiceId);
    this.voiceId = options.voiceId;
    this.outputDir = options.outputDir || path.join(path.resolve(__dirname, '../../../../apps/cybertantra'), 'public', 'audio', 'meditations');
    this.useSegmented = options.useSegmented ?? true; // Default to segmented for better quality
  }

  /**
   * Generate audio from meditation text and save to file
   */
  async generateAndSave(
    text: string,
    topic: string,
    duration: number
  ): Promise<MeditationAudioResult> {
    console.log(`🎙️ Generating audio for: ${topic} (${duration} min)`);
    console.log(`📊 Method: ${this.useSegmented ? 'Segmented (better quality)' : 'Standard'}`);
    
    // Use segmented generation if enabled (default)
    if (this.useSegmented) {
      // Parse text into segments
      const segments = parseTextIntoSegments(text);
      
      // Create temp directory for segments
      const sessionId = crypto.randomBytes(8).toString('hex');
      const tempDir = path.join(process.cwd(), 'temp', 'audio-segments', sessionId);
      await fs.mkdir(tempDir, { recursive: true });
      
      // Generate all segments (speech and silence)
      const segmentPaths = await generateAllSegments(segments, tempDir, this.voiceId);
      
      // Create output filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safeTopicName = topic.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);
      const filename = `${safeTopicName}_${duration}min_segmented_${timestamp}.mp3`;
      const outputPath = path.join(this.outputDir, filename);
      
      // Stitch segments together
      await stitchAudioSegments(segmentPaths, outputPath);
      
      // Clean up temp files
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      
      // Get file size
      const stats = await fs.stat(outputPath);
      
      return {
        audioPath: `/audio/meditations/${filename}`,
        audioSize: stats.size,
        filename,
        segmentCount: segments.length,
        method: 'segmented'
      };
    }
    
    // Fallback to standard generation
    console.log(`⚠️ Using standard TTS (may have timing issues with breaks)`);
    
    // Generate audio buffer
    const audioBuffer = await this.tts.generateAudio(text);
    
    // Ensure output directory exists
    await fs.mkdir(this.outputDir, { recursive: true });
    
    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeTopicName = topic.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-')          // Replace spaces with hyphens
      .substring(0, 50);             // Limit length
    
    const filename = `${safeTopicName}_${duration}min_${timestamp}.mp3`;
    const filePath = path.join(this.outputDir, filename);
    
    // Save audio file
    await fs.writeFile(filePath, audioBuffer);
    
    // Return public path and metadata
    const publicPath = `/audio/meditations/${filename}`;
    
    console.log(`✅ Audio saved: ${publicPath} (${audioBuffer.length} bytes)`);
    
    return {
      audioPath: publicPath,
      audioSize: audioBuffer.length,
      filename,
      method: 'standard'
    };
  }

  /**
   * Generate audio and return as Buffer (without saving)
   */
  async generateBuffer(text: string): Promise<Buffer> {
    return this.tts.generateAudio(text);
  }

  /**
   * Stream audio generation
   */
  async *streamAudio(text: string): AsyncGenerator<Uint8Array> {
    yield* this.tts.streamAudio(text);
  }

  /**
   * Clean up old audio files (optional maintenance)
   */
  async cleanupOldFiles(daysToKeep: number = 7): Promise<number> {
    try {
      const files = await fs.readdir(this.outputDir);
      const now = Date.now();
      const cutoffTime = now - (daysToKeep * 24 * 60 * 60 * 1000);
      
      let deletedCount = 0;
      
      for (const file of files) {
        if (file.endsWith('.mp3')) {
          const filePath = path.join(this.outputDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtimeMs < cutoffTime) {
            await fs.unlink(filePath);
            deletedCount++;
            console.log(`🗑️ Deleted old audio: ${file}`);
          }
        }
      }
      
      return deletedCount;
    } catch (error) {
      console.error('Failed to cleanup old files:', error);
      return 0;
    }
  }
}
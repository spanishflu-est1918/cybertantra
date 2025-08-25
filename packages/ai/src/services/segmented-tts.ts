import { TextToSpeechService } from './text-to-speech';
import pLimit from 'p-limit';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

interface TextSegment {
  type: 'speech';
  text: string;
  index: number;
}

interface PauseSegment {
  type: 'pause';
  duration: number;
  index: number;
}

type Segment = TextSegment | PauseSegment;

interface SegmentedAudioResult {
  audioPath: string;
  audioSize: number;
  filename: string;
  segmentCount: number;
  totalDuration: number;
}

export class SegmentedTTSService {
  private tts: TextToSpeechService;
  private tempDir: string;
  private outputDir: string;
  private concurrencyLimit: number;
  private cacheDir: string;

  constructor(voiceId?: string, concurrencyLimit: number = 4) {
    this.tts = new TextToSpeechService(voiceId);
    this.tempDir = path.join(process.cwd(), 'temp', 'audio-segments');
    this.outputDir = path.join(process.cwd(), 'public', 'audio', 'meditations');
    this.cacheDir = path.join(process.cwd(), 'cache', 'tts-segments');
    this.concurrencyLimit = concurrencyLimit; // Use 4 to leave headroom on Creator tier
  }

  /**
   * Parse text with break tags into segments
   */
  private parseTextIntoSegments(text: string): Segment[] {
    const segments: Segment[] = [];
    let index = 0;
    
    // Split by break tags while keeping the break info
    const regex = /<break\s+time="(\d+(?:\.\d+)?)s?"\s*\/>/g;
    let lastEnd = 0;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      // Add text segment before the break
      const textBefore = text.substring(lastEnd, match.index).trim();
      if (textBefore) {
        segments.push({
          type: 'speech',
          text: textBefore,
          index: index++
        });
      }
      
      // Add pause segment
      segments.push({
        type: 'pause',
        duration: parseFloat(match[1]),
        index: index++
      });
      
      lastEnd = match.index + match[0].length;
    }
    
    // Add any remaining text
    const remainingText = text.substring(lastEnd).trim();
    if (remainingText) {
      segments.push({
        type: 'speech',
        text: remainingText,
        index: index++
      });
    }
    
    return segments;
  }

  /**
   * Generate a cache key for a text segment
   */
  private getCacheKey(text: string, voiceId?: string): string {
    const voice = voiceId || process.env.SKYLER_11LABS_VOICE || 'default';
    return crypto.createHash('md5').update(`${voice}:${text}`).digest('hex');
  }

  /**
   * Check if audio is cached and return path if it exists
   */
  private async getCachedAudio(text: string, voiceId?: string): Promise<string | null> {
    const cacheKey = this.getCacheKey(text, voiceId);
    const cachePath = path.join(this.cacheDir, `${cacheKey}.mp3`);
    
    try {
      await fs.access(cachePath);
      console.log(`📦 Cache hit for: "${text.substring(0, 30)}..."`);
      return cachePath;
    } catch {
      return null;
    }
  }

  /**
   * Save audio to cache
   */
  private async saveToCache(text: string, audioBuffer: Buffer, voiceId?: string): Promise<string> {
    await fs.mkdir(this.cacheDir, { recursive: true });
    
    const cacheKey = this.getCacheKey(text, voiceId);
    const cachePath = path.join(this.cacheDir, `${cacheKey}.mp3`);
    
    await fs.writeFile(cachePath, audioBuffer);
    console.log(`💾 Cached: "${text.substring(0, 30)}..."`);
    
    return cachePath;
  }

  /**
   * Generate audio for a single text segment
   */
  private async generateSegmentAudio(
    segment: TextSegment, 
    sessionId: string,
    voiceId?: string
  ): Promise<string> {
    // Check cache first
    const cachedPath = await this.getCachedAudio(segment.text, voiceId);
    if (cachedPath) {
      // Copy cached file to temp directory for this session
      const tempPath = path.join(this.tempDir, sessionId, `segment_${segment.index}.mp3`);
      await fs.copyFile(cachedPath, tempPath);
      return tempPath;
    }
    
    // Generate new audio
    console.log(`🎙️ Generating segment ${segment.index}: "${segment.text.substring(0, 40)}..."`);
    const audioBuffer = await this.tts.generateAudio(segment.text);
    
    // Save to cache
    await this.saveToCache(segment.text, audioBuffer, voiceId);
    
    // Save to temp directory for this session
    const tempPath = path.join(this.tempDir, sessionId, `segment_${segment.index}.mp3`);
    await fs.writeFile(tempPath, audioBuffer);
    
    return tempPath;
  }

  /**
   * Generate a silence file of specified duration
   */
  private async generateSilence(duration: number, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input('anullsrc=r=44100:cl=mono')
        .inputFormat('lavfi')
        .duration(duration)
        .audioCodec('libmp3lame')
        .audioBitrate('128k')
        .output(outputPath)
        .on('end', () => {
          console.log(`🔇 Generated ${duration}s silence`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`❌ Failed to generate silence:`, err);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Stitch audio segments together with FFmpeg
   */
  private async stitchSegments(
    segmentPaths: string[],
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const command = ffmpeg();
      
      // Add all input files
      segmentPaths.forEach(path => {
        command.input(path);
      });
      
      // Create filter complex for concatenation
      const filterComplex = segmentPaths
        .map((_, i) => `[${i}:a]`)
        .join('') + `concat=n=${segmentPaths.length}:v=0:a=1[out]`;
      
      command
        .complexFilter(filterComplex)
        .outputOptions(['-map', '[out]'])
        .audioCodec('libmp3lame')
        .audioBitrate('128k')
        .output(outputPath)
        .on('start', (cmd) => {
          console.log(`🎬 FFmpeg command: ${cmd}`);
        })
        .on('progress', (progress) => {
          console.log(`⏳ Stitching progress: ${progress.percent?.toFixed(1)}%`);
        })
        .on('end', () => {
          console.log(`✅ Audio stitching complete`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`❌ FFmpeg error:`, err);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Generate segmented audio from meditation text
   */
  async generateSegmentedAudio(
    text: string,
    topic: string,
    duration: number,
    voiceId?: string
  ): Promise<SegmentedAudioResult> {
    console.log(`🎯 Starting segmented audio generation for: ${topic}`);
    
    // Parse text into segments
    const segments = this.parseTextIntoSegments(text);
    console.log(`📊 Parsed into ${segments.length} segments`);
    
    // Create session ID for temp files
    const sessionId = crypto.randomBytes(8).toString('hex');
    const sessionTempDir = path.join(this.tempDir, sessionId);
    await fs.mkdir(sessionTempDir, { recursive: true });
    
    try {
      // Prepare segment paths array
      const segmentPaths: string[] = [];
      
      // Create rate limiter
      const limit = pLimit(this.concurrencyLimit);
      
      // Separate speech and pause segments
      const speechSegments = segments.filter(s => s.type === 'speech') as TextSegment[];
      const pauseSegments = segments.filter(s => s.type === 'pause') as PauseSegment[];
      
      // Generate speech segments in parallel (with rate limit)
      console.log(`🎙️ Generating ${speechSegments.length} speech segments...`);
      const speechPromises = speechSegments.map(segment =>
        limit(() => this.generateSegmentAudio(segment, sessionId, voiceId))
      );
      
      const speechPaths = await Promise.all(speechPromises);
      
      // Generate silence segments
      console.log(`🔇 Generating ${pauseSegments.length} silence segments...`);
      const silencePaths: string[] = [];
      for (const pause of pauseSegments) {
        const silencePath = path.join(sessionTempDir, `silence_${pause.index}.mp3`);
        await this.generateSilence(pause.duration, silencePath);
        silencePaths.push(silencePath);
      }
      
      // Combine in correct order
      for (const segment of segments) {
        if (segment.type === 'speech') {
          const speechIndex = speechSegments.findIndex(s => s.index === segment.index);
          segmentPaths.push(speechPaths[speechIndex]);
        } else {
          const pauseIndex = pauseSegments.findIndex(p => p.index === segment.index);
          segmentPaths.push(silencePaths[pauseIndex]);
        }
      }
      
      // Create output filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safeTopicName = topic.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);
      const filename = `${safeTopicName}_${duration}min_segmented_${timestamp}.mp3`;
      
      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });
      const outputPath = path.join(this.outputDir, filename);
      
      // Stitch all segments together
      console.log(`🎬 Stitching ${segmentPaths.length} segments...`);
      await this.stitchSegments(segmentPaths, outputPath);
      
      // Get file size
      const stats = await fs.stat(outputPath);
      
      // Clean up temp files
      await this.cleanupTempFiles(sessionTempDir);
      
      // Calculate total duration
      const totalDuration = segments.reduce((acc, segment) => {
        if (segment.type === 'pause') {
          return acc + segment.duration;
        }
        // Estimate speech duration (rough: 150 words per minute)
        const words = (segment as TextSegment).text.split(' ').length;
        return acc + (words / 150) * 60;
      }, 0);
      
      const publicPath = `/audio/meditations/${filename}`;
      
      console.log(`✅ Segmented audio complete: ${publicPath}`);
      console.log(`📊 Stats: ${segments.length} segments, ~${totalDuration.toFixed(1)}s duration, ${stats.size} bytes`);
      
      return {
        audioPath: publicPath,
        audioSize: stats.size,
        filename,
        segmentCount: segments.length,
        totalDuration
      };
      
    } catch (error) {
      // Clean up on error
      await this.cleanupTempFiles(sessionTempDir);
      throw error;
    }
  }

  /**
   * Clean up temporary files
   */
  private async cleanupTempFiles(tempDir: string): Promise<void> {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      console.log(`🗑️ Cleaned up temp files`);
    } catch (error) {
      console.error(`Failed to cleanup temp files:`, error);
    }
  }

  /**
   * Clear the cache (optional maintenance)
   */
  async clearCache(): Promise<void> {
    try {
      await fs.rm(this.cacheDir, { recursive: true, force: true });
      console.log(`🗑️ Cache cleared`);
    } catch (error) {
      console.error(`Failed to clear cache:`, error);
    }
  }
}
import { TextToSpeechService } from '../../services/text-to-speech';
import fs from 'fs/promises';
import path from 'path';
import pLimit from 'p-limit';
import { generateSilence } from './silence-generator';
import type { Segment } from './segment-parser';

/**
 * Generate audio for a single text segment
 */
export async function generateSegmentAudio(
  text: string,
  outputPath: string,
  voiceId?: string
): Promise<void> {
  const tts = new TextToSpeechService(voiceId);
  const audioBuffer = await tts.generateAudio(text);
  await fs.writeFile(outputPath, audioBuffer);
}

/**
 * Generate all audio segments (speech and silence)
 */
export async function generateAllSegments(
  segments: Segment[],
  outputDir: string,
  voiceId?: string,
  concurrencyLimit: number = 4
): Promise<string[]> {
  const segmentPaths: string[] = new Array(segments.length);
  const limit = pLimit(concurrencyLimit);
  
  // Generate all segments
  await Promise.all(
    segments.map((segment, idx) =>
      limit(async () => {
        const segmentPath = segment.type === 'speech'
          ? path.join(outputDir, `speech_${idx}.mp3`)
          : path.join(outputDir, `silence_${idx}.mp3`);
        
        if (segment.type === 'speech') {
          await generateSegmentAudio(segment.text, segmentPath, voiceId);
        } else {
          await generateSilence(segment.duration, segmentPath);
        }
        
        segmentPaths[idx] = segmentPath;
      })
    )
  );
  
  return segmentPaths;
}
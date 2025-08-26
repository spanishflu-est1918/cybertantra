import ffmpeg from 'fluent-ffmpeg';
import { AUDIO_CONFIG } from '../../config/audio';

/**
 * Apply fade out to audio and add silence at the end
 */
export async function applyFadeOutAndSilence(
  inputPath: string,
  outputPath: string,
  fadeOutDuration: number = AUDIO_CONFIG.fadeOutDuration,
  silenceDuration: number = AUDIO_CONFIG.silenceAfterFadeOut
): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`🎚️ Applying ${fadeOutDuration}s fade-out and ${silenceDuration}s silence`);
    
    // Get audio duration first
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      
      const duration = metadata.format.duration || 0;
      const fadeStartTime = Math.max(0, duration - fadeOutDuration);
      
      // Apply fade out starting at fadeStartTime, then add silence
      const filterComplex = 
        `[0:a]afade=t=out:st=${fadeStartTime}:d=${fadeOutDuration},` +
        `apad=pad_dur=${silenceDuration}[final]`;
      
      ffmpeg()
        .input(inputPath)
        .complexFilter(filterComplex)
        .outputOptions(['-map', '[final]'])
        .audioCodec('libmp3lame')
        .audioBitrate('192k')
        .output(outputPath)
        .on('end', () => {
          console.log('✅ Fade-out and silence applied');
          resolve();
        })
        .on('error', reject)
        .run();
    });
  });
}
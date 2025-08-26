import ffmpeg from 'fluent-ffmpeg';
import { AUDIO_CONFIG } from '../../config/audio';

/**
 * Add silence at the end of audio
 */
export async function addFinalSilence(
  inputPath: string,
  outputPath: string,
  silenceDuration: number = AUDIO_CONFIG.silenceAfterFadeOut
): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`🔇 Adding ${silenceDuration}s of silence at the end`);
    
    // Use apad to add silence padding at the end
    const filterComplex = `[0:a]apad=pad_dur=${silenceDuration}[final]`;
    
    ffmpeg()
      .input(inputPath)
      .complexFilter(filterComplex)
      .outputOptions(['-map', '[final]'])
      .audioCodec('libmp3lame')
      .audioBitrate('192k')
      .output(outputPath)
      .on('end', () => {
        console.log('✅ Final silence added');
        resolve();
      })
      .on('error', reject)
      .run();
  });
}
import ffmpeg from 'fluent-ffmpeg';
import { AUDIO_CONFIG } from '../../config/audio';

/**
 * Mix voice with looping background music
 */
export async function mixVoiceWithMusic(
  voicePath: string,
  musicPath: string,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`🎚️ Music volume being applied: ${AUDIO_CONFIG.musicVolume}`);
    
    // Use weights parameter instead of volume filter for proper mixing
    // weights="1 0.04" means voice at full volume, music at 4% volume
    const filterComplex = 
      `[0:a]aformat=channel_layouts=stereo[voice];` +
      `[1:a]aformat=channel_layouts=stereo,aloop=loop=-1:size=2e+09[music];` +
      `[voice][music]amix=inputs=2:duration=first:dropout_transition=0:weights='1 ${AUDIO_CONFIG.musicVolume}':normalize=0[final]`;
    
    ffmpeg()
      .input(voicePath)
      .input(musicPath)
      .complexFilter(filterComplex)
      .outputOptions(['-map', '[final]'])
      .audioCodec('libmp3lame')
      .audioBitrate('192k')
      .output(outputPath)
      .on('end', () => {
        console.log('✅ Mix complete');
        resolve();
      })
      .on('error', reject)
      .run();
  });
}
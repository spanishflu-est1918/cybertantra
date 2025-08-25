import ffmpeg from 'fluent-ffmpeg';

/**
 * Mix voice with looping background music
 */
export async function mixVoiceWithMusic(
  voicePath: string,
  musicPath: string,
  outputPath: string,
  musicVolume: number = 0.35
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Simple mixing without sidechain
    const filterComplex = 
      `[0:a]aformat=channel_layouts=stereo[voice];` +
      `[1:a]volume=${musicVolume},aformat=channel_layouts=stereo,aloop=loop=-1:size=2e+09[music];` +
      `[voice][music]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[final]`;
    
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
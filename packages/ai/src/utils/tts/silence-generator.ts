import ffmpeg from 'fluent-ffmpeg';

/**
 * Generate a silence file of specified duration
 */
export async function generateSilence(duration: number, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input('anullsrc=r=44100:cl=mono')
      .inputFormat('lavfi')
      .duration(duration)
      .audioCodec('libmp3lame')
      .audioBitrate('128k')
      .output(outputPath)
      .on('end', () => {
        // console.log(`🔇 Generated ${duration}s silence`);
        resolve();
      })
      .on('error', (err) => {
        console.error(`❌ Failed to generate silence:`, err);
        reject(err);
      })
      .run();
  });
}
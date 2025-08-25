import ffmpeg from 'fluent-ffmpeg';

/**
 * Add silence to the beginning of audio
 */
export async function addSilenceToBeginning(
  inputPath: string,
  outputPath: string,
  silenceSeconds: number = 3
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input('anullsrc')
      .inputOptions(['-f', 'lavfi', '-t', silenceSeconds.toString()])
      .input(inputPath)
      .complexFilter('[0:a][1:a]concat=n=2:v=0:a=1[out]')
      .outputOptions(['-map', '[out]'])
      .audioCodec('libmp3lame')
      .audioBitrate('192k')
      .output(outputPath)
      .on('end', () => {
        console.log(`✅ Added ${silenceSeconds}s silence to beginning`);
        resolve();
      })
      .on('error', reject)
      .run();
  });
}
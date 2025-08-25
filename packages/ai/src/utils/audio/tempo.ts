import ffmpeg from 'fluent-ffmpeg';

/**
 * Change audio tempo/speed
 */
export async function changeAudioTempo(
  inputPath: string,
  outputPath: string,
  tempo: number = 0.8
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Use asetrate to pitch down to 95%, then atempo to slow down to 80% total
    const sampleRate = 44100;
    const pitchDown = 0.975; // Pitch down by 2.5% (half of previous)
    const adjustedRate = Math.round(sampleRate * pitchDown);
    const tempoAdjust = 0.8 / pitchDown; // Calculate atempo needed for 80% total speed
    
    ffmpeg()
      .input(inputPath)
      .audioFilters(`asetrate=${adjustedRate},aresample=${sampleRate},atempo=${tempoAdjust.toFixed(4)}`)
      .audioCodec('libmp3lame')
      .audioBitrate('192k')
      .output(outputPath)
      .on('end', () => {
        console.log(`✅ Tempo and pitch changed - pitch: ${pitchDown}x, final speed: ${tempo}x`);
        resolve();
      })
      .on('error', reject)
      .run();
  });
}
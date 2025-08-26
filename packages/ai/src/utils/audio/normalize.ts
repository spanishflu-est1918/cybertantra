import ffmpeg from 'fluent-ffmpeg';

/**
 * Normalize audio volume using FFmpeg loudness normalization
 * Uses EBU R128 loudness normalization standard
 */
export async function normalizeAudioVolume(
  inputPath: string,
  outputPath: string,
  options: {
    targetLUFS?: number;  // Target loudness in LUFS (default: -16 for streaming)
    peakLimit?: number;   // True peak limit in dB (default: -1)
  } = {}
): Promise<void> {
  const { 
    targetLUFS = -16,  // Standard for streaming platforms
    peakLimit = -1     // Prevent clipping
  } = options;
  
  console.log(`🔊 Normalizing audio to ${targetLUFS} LUFS...`);
  
  return new Promise((resolve, reject) => {
    // First pass: analyze audio
    ffmpeg(inputPath)
      .audioFilters(`loudnorm=I=${targetLUFS}:TP=${peakLimit}:LRA=11:print_format=json`)
      .format('null')
      .output('-')
      .on('stderr', (stderrLine) => {
        // Parse loudnorm stats from stderr
        if (stderrLine.includes('input_i') || stderrLine.includes('input_tp')) {
          console.log('📊 Loudness analysis:', stderrLine.trim());
        }
      })
      .on('end', () => {
        // Second pass: apply normalization
        ffmpeg(inputPath)
          .audioFilters(`loudnorm=I=${targetLUFS}:TP=${peakLimit}:LRA=11`)
          .audioCodec('libmp3lame')
          .audioBitrate('192k')
          .output(outputPath)
          .on('end', () => {
            console.log('✅ Audio normalization complete');
            resolve();
          })
          .on('error', reject)
          .run();
      })
      .on('error', reject)
      .run();
  });
}
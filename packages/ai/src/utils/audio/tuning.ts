import ffmpeg from 'fluent-ffmpeg';

/**
 * Calculate the ratio for 432Hz tuning conversion
 */
export function calculate432HzRatio(): number {
  const standardTuning = 440; // Hz
  const healingTuning = 432;  // Hz
  return healingTuning / standardTuning; // 0.98182
}

/**
 * Convert audio to 432Hz tuning
 */
export async function convertTo432Hz(
  inputPath: string,
  outputPath: string,
  preserveTempo: boolean = true
): Promise<void> {
  const ratio = calculate432HzRatio();
  const sampleRate = 44100;
  const adjustedRate = Math.round(sampleRate * ratio);
  
  console.log(`🎛️ Converting to 432Hz tuning...`);
  console.log(`  Ratio: ${ratio}`);
  console.log(`  Adjusted rate: ${adjustedRate}`);
  
  return new Promise((resolve, reject) => {
    let filterComplex: string;
    
    if (preserveTempo) {
      // Pitch shift only (preserves tempo)
      filterComplex = `[0:a]asetrate=${adjustedRate},aresample=${sampleRate}[final]`;
    } else {
      // Both pitch and tempo shift
      filterComplex = `[0:a]asetrate=${adjustedRate}[final]`;
    }
    
    ffmpeg(inputPath)
      .complexFilter(filterComplex)
      .outputOptions(['-map', '[final]'])
      .audioCodec('libmp3lame')
      .audioBitrate('192k')
      .output(outputPath)
      .on('end', () => {
        console.log('✅ 432Hz conversion complete');
        resolve();
      })
      .on('error', (err) => {
        console.error('❌ 432Hz conversion error:', err);
        reject(err);
      })
      .run();
  });
}

/**
 * Apply 432Hz tuning with custom tempo adjustment
 */
export async function applyTuningWithTempo(
  inputPath: string,
  outputPath: string,
  tempo: number = 1.0
): Promise<void> {
  const ratio = calculate432HzRatio();
  const sampleRate = 44100;
  const adjustedRate = Math.round(sampleRate * ratio);
  const tempoRate = sampleRate * tempo;
  
  console.log(`🎛️ Applying 432Hz with ${tempo}x tempo...`);
  
  return new Promise((resolve, reject) => {
    const filterComplex = 
      `[0:a]atempo=${tempo},asetrate=${tempoRate}[temped];` +
      `[temped]asetrate=${adjustedRate},aresample=${sampleRate}[final]`;
    
    ffmpeg(inputPath)
      .complexFilter(filterComplex)
      .outputOptions(['-map', '[final]'])
      .audioCodec('libmp3lame')
      .audioBitrate('192k')
      .output(outputPath)
      .on('end', () => {
        console.log('✅ Tuning with tempo complete');
        resolve();
      })
      .on('error', (err) => {
        console.error('❌ Tuning error:', err);
        reject(err);
      })
      .run();
  });
}
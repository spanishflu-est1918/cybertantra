import ffmpeg from 'fluent-ffmpeg';
import path from 'path';

/**
 * Stitch audio segments together (speech + silence)
 */
export async function stitchAudioSegments(
  segmentPaths: string[],
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = ffmpeg();
    
    // Add all segment files
    segmentPaths.forEach(segPath => {
      command.input(segPath);
    });
    
    // Concatenate all segments
    const filterComplex = segmentPaths
      .map((_, i) => `[${i}:a]`)
      .join('') + `concat=n=${segmentPaths.length}:v=0:a=1[out]`;
    
    command
      .complexFilter(filterComplex)
      .outputOptions(['-map', '[out]'])
      .audioCodec('libmp3lame')
      .audioBitrate('128k')
      .output(outputPath)
      .on('end', () => {
        console.log(`✅ ${segmentPaths.length} segments stitched`);
        resolve();
      })
      .on('error', (err) => {
        console.error(`❌ Stitch error:`, err);
        reject(err);
      })
      .run();
  });
}
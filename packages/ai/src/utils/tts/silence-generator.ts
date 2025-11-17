import ffmpeg from 'fluent-ffmpeg';

/**
 * Generate a silence file of specified duration
 */
export async function generateSilence(duration: number, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Use spawn directly to bypass fluent-ffmpeg capability detection
    const { spawn } = require('child_process');
    const { execSync } = require('child_process');
    
    try {
      const ffmpegPath = execSync('which ffmpeg', { encoding: 'utf-8' }).trim();
      
      const ffmpegProcess = spawn(ffmpegPath, [
        '-f', 'lavfi',
        '-i', 'anullsrc=r=44100:cl=mono',
        '-t', duration.toString(),
        '-c:a', 'libmp3lame',
        '-b:a', '128k',
        '-y',
        outputPath
      ]);
      
      ffmpegProcess.on('close', (code: number | null) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });

      ffmpegProcess.on('error', (err: Error) => {
        reject(err);
      });
      
    } catch (error) {
      reject(error);
    }
  });
}
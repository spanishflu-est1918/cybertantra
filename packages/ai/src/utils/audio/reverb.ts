import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ReverbOptions {
  soxPath?: string;
  reverberance?: number;  // 0-100, default 50
  damping?: number;       // 0-100, default 50  
  roomScale?: number;     // 0-100, default 100
  stereoDepth?: number;   // 0-100, default 100
  preDelay?: number;      // 0-1000ms, default 0
  wetGain?: number;       // -10 to 10 dB, default 0
}

/**
 * Apply Sox reverb effect to audio file
 */
export async function applySoxReverb(
  inputPath: string,
  outputPath: string,
  options: ReverbOptions = {}
): Promise<void> {
  const {
    soxPath = '/opt/homebrew/bin/sox',
    reverberance = 50,
    damping = 50,
    roomScale = 100,
    stereoDepth = 100,
    preDelay = 0,
    wetGain = 0
  } = options;

  const command = `${soxPath} "${inputPath}" "${outputPath}" reverb ${reverberance} ${damping} ${roomScale} ${stereoDepth} ${preDelay} ${wetGain}`;
  
  console.log(`🌊 Applying Sox reverb...`);
  console.log(`  Command: ${command}`);
  
  try {
    const { stdout, stderr } = await execAsync(command);
    if (stderr && !stderr.includes('sox WARN')) {
      console.warn(`⚠️ Sox warning: ${stderr}`);
    }
    console.log(`✅ Reverb applied successfully`);
  } catch (error: any) {
    console.error(`❌ Sox reverb failed: ${error.message}`);
    throw error;
  }
}

/**
 * Try to apply Sox reverb, fall back to copying file if it fails
 */
export async function applySoxReverbSafe(
  inputPath: string,
  outputPath: string,
  options: ReverbOptions = {}
): Promise<boolean> {
  try {
    await applySoxReverb(inputPath, outputPath, options);
    return true;
  } catch (error) {
    console.warn(`⚠️ Sox reverb failed, using original audio`);
    // Copy file without reverb
    const fs = await import('fs/promises');
    await fs.copyFile(inputPath, outputPath);
    return false;
  }
}
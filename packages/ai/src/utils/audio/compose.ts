import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { mixVoiceWithMusic } from './mix';
import { changeAudioTempo } from './tempo';
import { convertTo432Hz } from './tuning';
import { applySoxReverbSafe } from './reverb';
import { addSilenceToBeginning } from './add-silence';

/**
 * Compose meditation audio with all effects
 */
export async function composeMeditation(
  voicePath: string,
  musicPath: string,
  outputPath: string,
  options: {
    musicVolume?: number;
    voiceVolume?: number;
    normalize?: boolean;
    outputGain?: number;
  } = {}
): Promise<void> {
  const {
    musicVolume = 0.35
  } = options;
  
  const voiceTempo = 0.95; // Always 0.95 (less pitch drop)

  // Create temp directory
  const tempId = crypto.randomBytes(4).toString('hex');
  const tempDir = path.join(process.cwd(), 'temp', tempId);
  await fs.mkdir(tempDir, { recursive: true });

  try {
    let currentVoicePath = voicePath;
    
    // Step 1: Add silence to beginning of voice
    const silencePath = path.join(tempDir, 'voice_silence.mp3');
    await addSilenceToBeginning(currentVoicePath, silencePath, 3);
    currentVoicePath = silencePath;
    
    // Step 2: Apply tempo to voice (always 0.8)
    const tempoPath = path.join(tempDir, 'voice_tempo.mp3');
    await changeAudioTempo(currentVoicePath, tempoPath, voiceTempo);
    currentVoicePath = tempoPath;

    // Step 3: Mix voice with music
    const mixedPath = path.join(tempDir, 'mixed.mp3');
    console.log('🔊 Mixing with music volume:', musicVolume);
    await mixVoiceWithMusic(currentVoicePath, musicPath, mixedPath, musicVolume);
    let currentPath = mixedPath;

    // Step 4: Apply 432Hz (always)
    const tunedPath = path.join(tempDir, 'tuned.mp3');
    await convertTo432Hz(currentPath, tunedPath);
    currentPath = tunedPath;

    // Step 5: Apply reverb (always)
    await applySoxReverbSafe(currentPath, outputPath, {
      reverberance: 52,   // 65% of 80
      damping: 30,        // Less damping = longer tail
      roomScale: 100,     // Max room scale for longer tail
      stereoDepth: 100,
      preDelay: 0,        // No pre-delay
      wetGain: -6         // -6dB reduces reverb level by 50%
    });

    // Clean up temp files
    await fs.rm(tempDir, { recursive: true, force: true });

  } catch (error) {
    // Clean up on error
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { mixVoiceWithMusic } from './mix';
import { changeAudioTempo } from './tempo';
import { convertTo432Hz } from './tuning';
import { applySoxReverbSafe } from './reverb';
import { applyDynamicReverb } from './dynamic-reverb';
import { addFinalSilence } from './add-final-silence';
import { normalizeAudioVolume } from './normalize';
import { AUDIO_CONFIG } from '../../config/audio';

/**
 * Compose meditation audio with all effects
 */
export async function composeMeditation(
  voicePath: string,
  musicPath: string,
  outputPath: string,
  options: {
    voiceTempo?: number;
    reverb?: {
      reverberance?: number;
      wetGain?: number;
      damping?: number;
      roomScale?: number;
    };
  } = {}
): Promise<void> {
  const {
    voiceTempo = AUDIO_CONFIG.voiceTempo,
    reverb = {}
  } = options;

  // Create temp directory
  const tempId = crypto.randomBytes(4).toString('hex');
  const tempDir = path.join(process.cwd(), 'temp', tempId);
  await fs.mkdir(tempDir, { recursive: true });
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });

  try {
    let currentVoicePath = voicePath;
    
    // Step 1: Apply tempo to voice
    const tempoPath = path.join(tempDir, 'voice_tempo.mp3');
    await changeAudioTempo(currentVoicePath, tempoPath, voiceTempo);
    currentVoicePath = tempoPath;

    // Step 2: Mix voice with music (includes 3s delay for voice)
    const mixedPath = path.join(tempDir, 'mixed.mp3');
    console.log('🔊 Mixing voice with background music...');
    await mixVoiceWithMusic(currentVoicePath, musicPath, mixedPath);
    let currentPath = mixedPath;

    // Step 3: Apply 432Hz (always)
    const tunedPath = path.join(tempDir, 'tuned.mp3');
    await convertTo432Hz(currentPath, tunedPath);
    currentPath = tunedPath;

    // Step 4: Apply dynamic reverb (uses Sox reverb with changing intensity)
    const reverbPath = path.join(tempDir, 'reverb.mp3');
    await applyDynamicReverb(currentPath, reverbPath, {
      reverberance: reverb.reverberance ?? AUDIO_CONFIG.reverb.reverberance,
      damping: reverb.damping ?? AUDIO_CONFIG.reverb.damping,
      roomScale: reverb.roomScale ?? AUDIO_CONFIG.reverb.roomScale,
      wetGain: reverb.wetGain ?? AUDIO_CONFIG.reverb.wetGain
    });
    currentPath = reverbPath;

    // Step 5: Add final silence (fade-out is already applied to music in mixing step)
    // We'll just add silence at the end
    currentPath = reverbPath; // Skip fade since it's handled in mix

    // Step 6: Normalize volume as final step
    console.log('🎚️ Applying final volume normalization...');
    await normalizeAudioVolume(currentPath, outputPath, {
      targetLUFS: AUDIO_CONFIG.normalization.targetLUFS,
      peakLimit: AUDIO_CONFIG.normalization.peakLimit
    });

    // Clean up temp files
    await fs.rm(tempDir, { recursive: true, force: true });

  } catch (error) {
    // Clean up on error
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}
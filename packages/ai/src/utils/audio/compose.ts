import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { mixVoiceWithMusic } from './mix';
import { changeAudioTempo } from './tempo';
import { convertTo432Hz } from './tuning';
import { applySoxReverbSafe } from './reverb';
import { addSilenceToBeginning } from './add-silence';
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
    musicVolume?: number;
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
    musicVolume = AUDIO_CONFIG.musicVolume,
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
    
    // Step 1: Add silence to beginning of voice
    const silencePath = path.join(tempDir, 'voice_silence.mp3');
    await addSilenceToBeginning(currentVoicePath, silencePath, AUDIO_CONFIG.silenceBeforeVoice);
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

    // Step 5: Apply reverb
    const reverbPath = path.join(tempDir, 'reverb.mp3');
    await applySoxReverbSafe(currentPath, reverbPath, {
      reverberance: reverb.reverberance ?? AUDIO_CONFIG.reverb.reverberance,
      damping: reverb.damping ?? AUDIO_CONFIG.reverb.damping,
      roomScale: reverb.roomScale ?? AUDIO_CONFIG.reverb.roomScale,
      stereoDepth: AUDIO_CONFIG.reverb.stereoDepth,
      preDelay: AUDIO_CONFIG.reverb.preDelay,
      wetGain: reverb.wetGain ?? AUDIO_CONFIG.reverb.wetGain
    });
    currentPath = reverbPath;

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
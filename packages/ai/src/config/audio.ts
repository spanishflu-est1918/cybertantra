/**
 * Audio configuration constants for meditation generation
 */

export const AUDIO_CONFIG = {
  // Volume settings
  musicVolume: 0.03,         // Background music volume (75% of 0.04 for better balance)
  
  // Voice processing
  voiceTempo: 0.95,          // Slight tempo reduction for meditative pace
  silenceBeforeVoice: 3,     // Seconds of silence before voice starts
  
  // Reverb settings
  reverb: {
    reverberance: 52,        // 65% of 80
    damping: 30,             // Less damping = longer tail
    roomScale: 100,          // Max room scale for longer tail
    stereoDepth: 100,
    preDelay: 0,             // No pre-delay
    wetGain: -6              // -6dB reduces reverb level by 50%
  },
  
  // Normalization settings (EBU R128 standard)
  normalization: {
    targetLUFS: -14,         // Slightly louder than streaming standard for meditation
    peakLimit: -0.5          // Conservative peak limit to prevent clipping
  },
  
  // Audio quality
  bitrate: '192k',
  sampleRate: 44100,
  
  // 432Hz tuning
  tuningShift: 0.984338,     // Conversion factor from 440Hz to 432Hz
} as const;
#!/usr/bin/env bun

import { composeMeditation, mixVoiceWithMusic } from './packages/ai/src/utils/audio';
import path from 'path';
import fs from 'fs/promises';

const voicePath = path.join(process.cwd(), 'apps/cybertantra/public/audio/meditations/bhuvaneshwari_5min_segmented_2025-08-25T19-29-30-046Z.mp3');
const musicPath = path.join(process.cwd(), 'apps/cybertantra/public/audio/music/bhuvaneshwari_5min_music_2025-08-25T19-30-31-134Z.mp3');

const outputNoEffects = path.join(process.cwd(), 'test-no-effects.mp3');
const outputWithEffects = path.join(process.cwd(), 'test-with-effects.mp3');

console.log('🧪 Testing audio utilities...');
console.log('Voice:', path.basename(voicePath));
console.log('Music:', path.basename(musicPath));

// Version 1: No effects (just mix)
console.log('\n📀 Creating version WITHOUT effects...');
await mixVoiceWithMusic(voicePath, musicPath, outputNoEffects, 0.35);

// Version 2: With all effects
console.log('\n🎛️ Creating version WITH effects (3s silence, tempo, 432Hz, reverb)...');
await composeMeditation(voicePath, musicPath, outputWithEffects, {
  musicVolume: 0.175,  // 50% of 0.35
  voiceTempo: 0.8
});

// Check file sizes
const [statsNoEffects, statsWithEffects] = await Promise.all([
  fs.stat(outputNoEffects),
  fs.stat(outputWithEffects)
]);

console.log('\n📊 Results:');
console.log(`No effects: ${(statsNoEffects.size / 1024 / 1024).toFixed(2)} MB`);
console.log(`With effects: ${(statsWithEffects.size / 1024 / 1024).toFixed(2)} MB`);
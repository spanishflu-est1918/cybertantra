#!/usr/bin/env bun

import { composeMeditation } from './packages/ai/src/utils/audio/compose';

const [,, voiceFile, musicFile] = process.argv;

if (!voiceFile || !musicFile) {
  console.log('Usage: bun test-compose.ts <voice.mp3> <music.mp3>');
  process.exit(1);
}

const outputPath = 'final-composed.mp3';

composeMeditation(voiceFile, musicFile, outputPath)
  .then(() => console.log('✅ Done:', outputPath))
  .catch(err => console.error('❌ Error:', err.message));
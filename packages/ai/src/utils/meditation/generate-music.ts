import path from 'path';
import fs from 'fs/promises';
import { getAIConfig } from '../../config';

export interface MusicGenerationOptions {
  parameters?: MusicPromptParameters;
  duration: number;
  outputDir?: string;
}

export interface MusicGenerationResult {
  musicPath: string;     // Public path for web access
  filePath: string;       // Actual filesystem path
  musicSize: number;
  filename: string;
  prompt: string;
  durationMs: number;
}

export interface MusicPromptParameters {
  mood?: string;
  key?: 'minor' | 'major';
  instruments?: string[];
  tempo?: 'beatless' | 'slow' | 'medium';
  atmosphere?: string;
  topic?: string;
  avoidElements?: string[];
}

/**
 * Generate meditation music from parameters
 */
export async function generateMeditationMusic(
  options: MusicGenerationOptions
): Promise<MusicGenerationResult> {
  const {
    parameters = {},
    duration,
    outputDir = path.join(process.cwd(), 'public', 'audio', 'music')
  } = options;

  console.log(`🎵 Generating ${duration}-minute meditation music`);
  
  // Cap at 5 minutes (ElevenLabs limit)
  const actualDuration = Math.min(duration, 5);
  const prompt = buildMusicPrompt(parameters, actualDuration);
  const durationMs = actualDuration * 60 * 1000;
  
  // Call ElevenLabs music API
  const audioBuffer = await callElevenLabsMusic(prompt, durationMs);
  
  // Save music file
  const filename = createMusicFilename(parameters.topic, duration);
  const filePath = path.join(outputDir, filename);
  
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(filePath, audioBuffer);
  
  const publicPath = `/audio/music/${filename}`;
  
  console.log(`✅ Music saved: ${publicPath} (${audioBuffer.length} bytes)`);
  
  return {
    musicPath: publicPath,
    filePath: filePath,
    musicSize: audioBuffer.length,
    filename,
    prompt: prompt.substring(0, 200) + '...',
    durationMs,
  };
}

/**
 * Build a music prompt from parameters
 */
function buildMusicPrompt(params: MusicPromptParameters, durationMinutes: number): string {
  const {
    mood = 'dark, meditative',
    key = 'minor',
    instruments = ['layered synthesizers', 'ambient drones'],
    tempo = 'beatless',
    atmosphere = 'hypnotic',
    topic = 'meditation',
    avoidElements = ['percussion', 'vocals']
  } = params;

  const tempoDescription = tempo === 'beatless' 
    ? 'Beatless and free-flowing, no percussion or defined tempo'
    : tempo === 'slow' 
    ? 'Very slow and minimal rhythmic elements'
    : 'Gentle, flowing tempo';

  const prompt = `Create a ${mood} instrumental soundtrack in ${key} key.
Features: ${instruments.join(', ')}.
${tempoDescription}.
${durationMinutes} minutes long, instrumental only, no vocals.
Create a ${atmosphere} atmosphere for deep meditation${topic ? ` on ${topic}` : ''}.
${avoidElements.length > 0 ? `Avoid: ${avoidElements.join(', ')}.` : ''}`;

  console.log(`🎼 Music prompt generated:`, prompt);
  return prompt;
}

/**
 * Call ElevenLabs music generation API
 */
async function callElevenLabsMusic(prompt: string, durationMs: number): Promise<Buffer> {
  const config = getAIConfig();
  
  if (!config.elevenLabsApiKey) {
    throw new Error("ElevenLabs API key is required for music generation");
  }

  const response = await fetch('https://api.elevenlabs.io/v1/music', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': config.elevenLabsApiKey,
    },
    body: JSON.stringify({
      prompt,
      music_length_ms: Math.min(durationMs, 300000), // Max 5 minutes
      output_format: 'mp3_44100_128',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Music generation failed: ${error}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

/**
 * Create a standardized filename for music files
 */
function createMusicFilename(topic?: string, duration?: number): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeTopicName = (topic || 'meditation').toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
  
  return `${safeTopicName}_${duration}min_music_${timestamp}.mp3`;
}
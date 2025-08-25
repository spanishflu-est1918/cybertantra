import { ElevenLabsClient } from "elevenlabs";
import { getAIConfig } from "../config";
import path from 'path';
import fs from 'fs/promises';

export interface MeditationMusicOptions {
  outputDir?: string;
  outputFormat?: string;
}

export interface MusicGenerationResult {
  musicPath: string;
  musicSize: number;
  filename: string;
  prompt: string;
  durationMs: number;
}

export interface MusicPromptParameters {
  mood?: string;           // e.g., "dark, meditative" or "uplifting, expansive"
  key?: 'minor' | 'major'; // Simple minor/major choice
  instruments?: string[];  // e.g., ["layered synthesizers", "ambient drones"]
  tempo?: 'beatless' | 'slow' | 'medium'; // For ambient, usually beatless
  atmosphere?: string;     // e.g., "hypnotic", "transcendent", "grounding"
  topic?: string;         // The meditation topic for context
  avoidElements?: string[]; // Things to avoid, e.g., ["percussion", "vocals", "sudden changes"]
}

interface TopicMoodMapping {
  keywords: string[];
  parameters: MusicPromptParameters;
}

export class MeditationMusicService {
  private client: ElevenLabsClient;
  private outputDir: string;
  
  // Ambient mood mappings for different topics
  private topicMoods: Record<string, TopicMoodMapping> = {
    ganesha: {
      keywords: ['ganesha', 'ganapati', 'elephant', 'remover of obstacles'],
      parameters: {
        mood: 'powerful, grounding, mystical',
        key: 'minor',
        instruments: ['deep resonant bells', 'tanpura drones', 'low frequency synthesizers'],
        tempo: 'beatless',
        atmosphere: 'sacred and protective',
        avoidElements: ['percussion', 'vocals', 'sudden changes']
      }
    },
    ucchista: {
      keywords: ['ucchista', 'ucchisti', 'leftover', 'poison', 'transgressive'],
      parameters: {
        mood: 'dark, nuclear, transformative, ominous',
        key: 'minor',
        instruments: ['distorted synthesizers', 'industrial drones', 'dark ambient pads', 'metallic textures'],
        tempo: 'beatless',
        atmosphere: 'confrontational and alchemical',
        avoidElements: ['percussion', 'vocals', 'melody']
      }
    },
    breath: {
      keywords: ['breath', 'prana', 'breathing', 'awareness', 'mindfulness'],
      parameters: {
        mood: 'deep, flowing, hypnotic, spacious',
        key: 'minor',
        instruments: ['ethereal pads', 'singing bowls', 'subtle wind textures', 'ocean waves'],
        tempo: 'beatless',
        atmosphere: 'expansive and calming',
        avoidElements: ['percussion', 'vocals', 'harsh sounds']
      }
    },
    tantra: {
      keywords: ['tantra', 'tantric', 'kundalini', 'shakti', 'energy'],
      parameters: {
        mood: 'sensual, electric, mysterious, intense',
        key: 'minor',
        instruments: ['sitar drones', 'electronic pulses', 'Tibetan bowls', 'deep bass frequencies'],
        tempo: 'slow',
        atmosphere: 'serpentine and energetic',
        avoidElements: ['vocals', 'sudden changes']
      }
    },
    shadow: {
      keywords: ['shadow', 'dark', 'void', 'abyss', 'unconscious'],
      parameters: {
        mood: 'haunting, abyssal, confrontational, raw',
        key: 'minor',
        instruments: ['dark ambient textures', 'reversed sounds', 'sub-bass drones', 'dissonant harmonics'],
        tempo: 'beatless',
        atmosphere: 'psychological depth and introspection',
        avoidElements: ['percussion', 'vocals', 'consonant harmonies']
      }
    },
    fire: {
      keywords: ['fire', 'agni', 'burning', 'transformation', 'purification'],
      parameters: {
        mood: 'crackling, intense, purifying, consuming',
        key: 'minor',
        instruments: ['fire field recordings', 'brass drones', 'synthesized flames', 'ritual atmospheres'],
        tempo: 'beatless',
        atmosphere: 'transformative and cleansing',
        avoidElements: ['vocals', 'regular rhythm']
      }
    },
    light: {
      keywords: ['light', 'illumination', 'clarity', 'awakening'],
      parameters: {
        mood: 'luminous, expansive, transcendent',
        key: 'major',
        instruments: ['shimmering synthesizers', 'crystal bowls', 'high frequency drones'],
        tempo: 'beatless',
        atmosphere: 'ethereal and uplifting',
        avoidElements: ['percussion', 'vocals', 'dark tones']
      }
    },
    default: {
      keywords: [],
      parameters: {
        mood: 'dark, meditative, ambient, introspective',
        key: 'minor',
        instruments: ['layered synthesizers', 'ambient drones', 'subtle textures'],
        tempo: 'beatless',
        atmosphere: 'hypnotic and deep',
        avoidElements: ['percussion', 'vocals', 'sudden changes']
      }
    }
  };

  constructor(options: MeditationMusicOptions = {}) {
    const config = getAIConfig();
    
    if (!config.elevenLabsApiKey) {
      throw new Error("ElevenLabs API key is required for music generation");
    }

    this.client = new ElevenLabsClient({
      apiKey: config.elevenLabsApiKey,
    });

    this.outputDir = options.outputDir || path.join(process.cwd(), 'public', 'audio', 'music');
  }

  /**
   * Analyze topic to determine parameters
   */
  private analyzeTopic(topic: string): MusicPromptParameters {
    const lowerTopic = topic.toLowerCase();
    
    // Find matching mood mapping
    for (const [key, mapping] of Object.entries(this.topicMoods)) {
      if (key === 'default') continue;
      
      for (const keyword of mapping.keywords) {
        if (lowerTopic.includes(keyword)) {
          console.log(`🎭 Matched topic mood: ${key}`);
          return mapping.parameters;
        }
      }
    }
    
    console.log(`🎭 Using default ambient parameters`);
    return this.topicMoods.default.parameters;
  }

  /**
   * Build a music prompt from parameters
   */
  public buildPromptFromParameters(params: MusicPromptParameters, durationMinutes: number): string {
    const {
      mood = 'dark, meditative',
      key = 'minor',
      instruments = ['layered synthesizers', 'ambient drones'],
      tempo = 'beatless',
      atmosphere = 'hypnotic',
      topic = 'meditation',
      avoidElements = ['percussion', 'vocals']
    } = params;

    // Build the prompt with proper structure
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
   * Generate a music prompt based on topic and duration
   */
  private generateMusicPrompt(topic: string, durationMinutes: number): string {
    const parameters = this.analyzeTopic(topic);
    return this.buildPromptFromParameters({ ...parameters, topic }, durationMinutes);
  }

  /**
   * Generate meditation music
   */
  async generateMusic(
    topic: string,
    durationMinutes: number
  ): Promise<MusicGenerationResult> {
    try {
      console.log(`🎵 Generating ${durationMinutes}-minute dark ambient music for: ${topic}`);
      
      const prompt = this.generateMusicPrompt(topic, durationMinutes);
      const durationMs = durationMinutes * 60 * 1000;
      
      // Call ElevenLabs music API
      const config = getAIConfig();
      const response = await fetch('https://api.elevenlabs.io/v1/music', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': config.elevenLabsApiKey!,
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

      // Get the audio data
      const audioBuffer = Buffer.from(await response.arrayBuffer());
      
      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });
      
      // Create filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safeTopicName = topic.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);
      
      const filename = `${safeTopicName}_${durationMinutes}min_music_${timestamp}.mp3`;
      const filePath = path.join(this.outputDir, filename);
      
      // Save music file
      await fs.writeFile(filePath, audioBuffer);
      
      const publicPath = `/audio/music/${filename}`;
      
      console.log(`✅ Music saved: ${publicPath} (${audioBuffer.length} bytes)`);
      
      return {
        musicPath: publicPath,
        musicSize: audioBuffer.length,
        filename,
        prompt: prompt.substring(0, 200) + '...',
        durationMs,
      };
    } catch (error) {
      console.error('❌ Music generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate music with custom parameters
   */
  async generateMusicFromParameters(
    params: MusicPromptParameters,
    durationMinutes: number
  ): Promise<MusicGenerationResult> {
    try {
      console.log(`🎵 Generating music with custom parameters`);
      
      // Cap at 5 minutes (ElevenLabs limit)
      const actualDuration = Math.min(durationMinutes, 5);
      
      const prompt = this.buildPromptFromParameters(params, actualDuration);
      const durationMs = actualDuration * 60 * 1000;
      
      // Call ElevenLabs music API
      const config = getAIConfig();
      const response = await fetch('https://api.elevenlabs.io/v1/music', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': config.elevenLabsApiKey!,
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

      // Get the audio data
      const audioBuffer = Buffer.from(await response.arrayBuffer());
      
      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });
      
      // Create filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safeTopicName = (params.topic || 'meditation').toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);
      
      const filename = `${safeTopicName}_${durationMinutes}min_music_${timestamp}.mp3`;
      const filePath = path.join(this.outputDir, filename);
      
      // Save music file
      await fs.writeFile(filePath, audioBuffer);
      
      const publicPath = `/audio/music/${filename}`;
      
      console.log(`✅ Music saved: ${publicPath} (${audioBuffer.length} bytes)`);
      
      return {
        musicPath: publicPath,
        musicSize: audioBuffer.length,
        filename,
        prompt: prompt.substring(0, 200) + '...',
        durationMs,
      };
    } catch (error) {
      console.error('❌ Music generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate music with custom prompt (for advanced users)
   */
  async generateCustomMusic(
    prompt: string,
    durationMinutes: number
  ): Promise<MusicGenerationResult> {
    try {
      console.log(`🎵 Generating custom music: ${prompt.substring(0, 50)}...`);
      
      const durationMs = durationMinutes * 60 * 1000;
      
      
      const config = getAIConfig();
      const response = await fetch('https://api.elevenlabs.io/v1/music', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': config.elevenLabsApiKey!,
        },
        body: JSON.stringify({
          prompt,
          music_length_ms: Math.min(durationMs, 300000),
          output_format: 'mp3_44100_128',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Music generation failed: ${error}`);
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      
      await fs.mkdir(this.outputDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `custom_${durationMinutes}min_music_${timestamp}.mp3`;
      const filePath = path.join(this.outputDir, filename);
      
      await fs.writeFile(filePath, audioBuffer);
      
      const publicPath = `/audio/music/${filename}`;
      
      return {
        musicPath: publicPath,
        musicSize: audioBuffer.length,
        filename,
        prompt: prompt.substring(0, 200) + '...',
        durationMs,
      };
    } catch (error) {
      console.error('❌ Custom music generation failed:', error);
      throw error;
    }
  }

}
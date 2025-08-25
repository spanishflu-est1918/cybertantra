import { NextResponse } from 'next/server';
import { MeditationMusicService } from '@cybertantra/ai';
import { corsHeaders } from '../../middleware';

export async function OPTIONS() {
  const headers = await corsHeaders();
  return new Response(null, { status: 204, headers });
}

export async function POST(req: Request) {
  try {
    const { 
      topic, 
      duration = 5, 
      custom = false, 
      prompt,
      parameters 
    } = await req.json();

    if (!topic && !prompt && !parameters) {
      return NextResponse.json(
        { error: 'Either topic, custom prompt, or parameters is required' },
        { status: 400 }
      );
    }

    if (duration < 1 || duration > 5) {
      return NextResponse.json(
        { error: 'Duration must be between 1 and 5 minutes' },
        { status: 400 }
      );
    }

    console.log(`[MUSIC API] Starting music generation...`);
    console.log(`[MUSIC API] Mode: ${parameters ? 'parameters' : (custom ? 'custom' : 'topic')}, Duration: ${duration} min`);
    
    const musicService = new MeditationMusicService();
    
    let result;
    if (parameters) {
      console.log(`[MUSIC API] Using parameter-based generation:`, parameters);
      result = await musicService.generateMusicFromParameters(parameters, duration);
    } else if (custom && prompt) {
      console.log(`[MUSIC API] Using custom prompt: ${prompt}`);
      result = await musicService.generateCustomMusic(prompt, duration);
    } else {
      console.log(`[MUSIC API] Using topic-based generation: ${topic}`);
      result = await musicService.generateMusic(topic, duration);
    }

    console.log(`[MUSIC API] Music generation complete!`);
    console.log(`[MUSIC API] Path: ${result.musicPath}`);
    console.log(`[MUSIC API] Size: ${result.musicSize} bytes`);

    const headers = await corsHeaders();
    return NextResponse.json({
      success: true,
      music: result,
      message: `Generated ${duration}-minute meditation music for "${topic || 'custom prompt'}"`,
    }, { headers });
    
  } catch (error) {
    console.error("[MUSIC API] Music generation error:", error);
    const headers = await corsHeaders();
    return NextResponse.json(
      { 
        error: 'Music generation failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      },
      { status: 500, headers }
    );
  }
}

export async function GET() {
  const headers = await corsHeaders();
  return NextResponse.json({
    endpoint: '/api/meditate/music',
    method: 'POST',
    description: 'Generate meditation music using ElevenLabs',
    parameters: {
      topic: 'string (required if not using custom prompt or parameters)',
      duration: 'number (1-5 minutes, default: 5)',
      custom: 'boolean (use custom prompt instead of topic)',
      prompt: 'string (required if custom=true)',
      parameters: 'MusicPromptParameters object (for fine control)'
    },
    musicPromptParameters: {
      mood: 'string (e.g., "dark, meditative" or "uplifting, expansive")',
      key: '"minor" | "major"',
      instruments: 'string[] (e.g., ["layered synthesizers", "ambient drones"])',
      tempo: '"beatless" | "slow" | "medium"',
      atmosphere: 'string (e.g., "hypnotic", "transcendent")',
      topic: 'string (meditation topic for context)',
      avoidElements: 'string[] (e.g., ["percussion", "vocals"])'
    },
    examples: {
      topicBased: {
        topic: 'ganesha',
        duration: 3
      },
      parameterBased: {
        parameters: {
          mood: 'dark, nuclear, transformative',
          key: 'minor',
          instruments: ['distorted synthesizers', 'industrial drones'],
          tempo: 'beatless',
          atmosphere: 'confrontational and alchemical',
          topic: 'shadow work',
          avoidElements: ['percussion', 'vocals', 'melody']
        },
        duration: 2
      },
      customPrompt: {
        custom: true,
        prompt: 'Dark ritual ambient with Tibetan bowls and deep drones',
        duration: 2
      }
    },
    availableTopics: [
      'ganesha (powerful, grounding)',
      'ucchista (dark, nuclear)',
      'breath (flowing, hypnotic)',
      'tantra (sensual, electric)',
      'shadow (haunting, abyssal)',
      'fire (intense, purifying)',
      'light (luminous, transcendent)'
    ]
  }, { headers });
}
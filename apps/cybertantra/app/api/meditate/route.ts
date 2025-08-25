import { NextResponse } from 'next/server';
import { MeditationGeneratorAgent, MeditationAudioService } from '@cybertantra/ai';
import { validateRequest, corsHeaders } from '../middleware';

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: await corsHeaders() });
}

export async function POST(req: Request) {
  // Validate request (API key + rate limit)
  const validationError = await validateRequest();
  if (validationError) return validationError;

  try {
    const { topic, duration, generateAudio = false, voiceId } = await req.json();

    if (!topic || !duration) {
      return NextResponse.json(
        { error: "Topic and duration are required" },
        { status: 400 }
      );
    }

    if (duration < 5 || duration > 30) {
      return NextResponse.json(
        { error: "Duration must be between 5 and 30 minutes" },
        { status: 400 }
      );
    }

    console.log(`[API] Generating ${duration}-minute meditation on: ${topic}`);
    console.log(`[API] Audio generation: ${generateAudio ? 'YES' : 'NO'}`);

    // Generate meditation text
    const agent = new MeditationGeneratorAgent();
    const result = await agent.generate(topic, duration);

    console.log(`[API] Text generation complete:`, {
      textLength: result.text?.length || 0,
      topic: result.topic,
      duration: result.duration,
    });

    let audioResult = null;

    // Generate audio if requested
    if (generateAudio) {
      console.log(`[API] Starting audio generation...`);
      const audioService = new MeditationAudioService({ voiceId });
      audioResult = await audioService.generateAndSave(result.text, topic, duration);
      console.log(`[API] Audio complete:`, audioResult);
    }

    const headers = await corsHeaders();
    return NextResponse.json({
      success: true,
      meditation: {
        ...result,
        ...(audioResult && {
          audioPath: audioResult.audioPath,
          audioSize: audioResult.audioSize,
        }),
      },
    }, { headers });
  } catch (error) {
    console.error("[API] Meditation generation error:", error);
    const headers = await corsHeaders();
    return NextResponse.json(
      { 
        error: "Failed to generate meditation",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500, headers }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Meditation Generator API",
    usage: "POST /api/meditate with { topic: string, duration: number }",
    durations: [5, 8, 10, 15, 20, 30],
  });
}
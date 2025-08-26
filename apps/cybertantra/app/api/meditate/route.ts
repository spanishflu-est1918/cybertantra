import { NextResponse } from "next/server";
import { generateCompleteMeditation } from "@cybertantra/ai";
import { corsHeaders } from "../middleware";

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: await corsHeaders() });
}

export async function POST(req: Request) {
  // Validate request (API key + rate limit)
  // const validationError = await validateRequest();
  // if (validationError) return validationError;

  try {
    const { topic, duration, voiceId } = await req.json();

    if (!topic || !duration) {
      return NextResponse.json(
        { error: "Topic and duration are required" },
        { status: 400 },
      );
    }

    if (duration < 5 || duration > 30) {
      return NextResponse.json(
        { error: "Duration must be between 5 and 30 minutes" },
        { status: 400 },
      );
    }

    console.log(`[API] Generating ${duration}-minute meditation on: ${topic}`);

    // Use the orchestrator
    const result = await generateCompleteMeditation({
      topic,
      duration,
      voiceId,
    });

    const headers = await corsHeaders();
    return NextResponse.json(
      {
        success: true,
        meditation: {
          text: result.text,
          topic: result.topic,
          duration: result.duration,
          musicParameters: result.musicParameters,
          audioPath: result.finalAudioPath,  // Use the FINAL mixed audio
          audioSize: result.finalAudioSize,  // Use the FINAL audio size
          voiceOnlyPath: result.audioPath,
          voiceOnlySize: result.audioSize,
          musicPath: result.musicPath,
          musicSize: result.musicSize,
        },
      },
      { headers },
    );
  } catch (error) {
    console.error("[API] Meditation generation error:", error);
    const headers = await corsHeaders();
    return NextResponse.json(
      {
        error: "Failed to generate meditation",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers },
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

import { createOpenAI } from '@ai-sdk/openai';
import { transcribe } from 'ai';
import { corsHeaders } from "../middleware";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 200, headers: await corsHeaders() });
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return new Response("No audio file provided", { status: 400 });
    }

    // Use Vercel AI SDK's transcribe function
    const { text } = await transcribe({
      model: openai.transcription('whisper-1'),
      audio: audioFile,
    });

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: {
        ...await corsHeaders(),
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Speech-to-text error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Transcription failed",
      }),
      {
        status: 500,
        headers: { 
          ...await corsHeaders(),
          'Content-Type': 'application/json' 
        },
      },
    );
  }
}
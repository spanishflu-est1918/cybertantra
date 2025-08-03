import { createOpenAI } from '@ai-sdk/openai';
import { generateSpeech } from 'ai';
import { corsHeaders } from "../middleware";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 200, headers: await corsHeaders() });
}

export async function POST(req: Request) {
  try {
    const { text, voice = 'alloy' } = await req.json();
    
    if (!text) {
      return new Response("No text provided", { status: 400 });
    }

    // Use Vercel AI SDK's generateSpeech function
    const { audio } = await generateSpeech({
      model: openai.speechModel('tts-1'),
      voice: voice,
      input: text,
    });

    return new Response(audio, {
      status: 200,
      headers: {
        ...await corsHeaders(),
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error) {
    console.error('Text-to-speech error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "TTS failed",
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
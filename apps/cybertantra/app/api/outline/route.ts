import { NextResponse } from 'next/server';
import { QueryAgent, getAIConfig } from '@cybertantra/ai';
import { validateRequest, corsHeaders } from '../middleware';

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: await corsHeaders() });
}

export async function POST(req: Request) {
  // Validate request (API key + rate limit)
  const validationError = await validateRequest();
  if (validationError) return validationError;

  try {
    const { topic } = await req.json();

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const config = getAIConfig();
    const agent = new QueryAgent(config);
    
    // Generate outline based on lecture content
    const outline = await agent.query(
      `Create a detailed chapter outline for the topic: "${topic}". First search for relevant content from the lectures, then synthesize a comprehensive outline with main points and sub-topics.`,
      10 // Get more chunks for outline generation
    );

    const headers = await corsHeaders();
    return NextResponse.json({ 
      outline,
      topic,
      timestamp: new Date().toISOString()
    }, { headers });

  } catch (error) {
    console.error('Outline generation error:', error);
    const headers = await corsHeaders();
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500, headers });
  }
}
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
    const { query, limit = 10 } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const config = getAIConfig();
    const agent = new QueryAgent(config);
    
    // Direct vector search without synthesis
    const results = await agent.search(query, limit);

    const headers = await corsHeaders();
    return NextResponse.json({ 
      results: results.map(chunk => ({
        text: chunk.text,
        score: chunk.score
      })),
      count: results.length
    }, { headers });

  } catch (error) {
    console.error('Search error:', error);
    const headers = await corsHeaders();
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500, headers });
  }
}
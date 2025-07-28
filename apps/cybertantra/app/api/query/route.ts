import { NextResponse } from 'next/server';
import { QueryAgent, getAIConfig } from '@cybertantra/ai';
import { validateRequest, corsHeaders } from '../middleware';

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 200, headers: await corsHeaders() });
}

export async function POST(req: Request) {
  // Validate request (API key + rate limit)
  const validationError = await validateRequest(req);
  if (validationError) return validationError;

  try {
    const { question, topK = 5 } = await req.json();

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    // Get config from environment variables (Vercel will have these set)
    const config = getAIConfig();
    
    // Create agent instance
    const agent = new QueryAgent(config);
    
    // Get answer with RAG
    const answer = await agent.query(question, topK);
    
    // Also get the raw chunks for transparency
    const chunks = await agent.search(question, topK);

    const headers = await corsHeaders();
    return NextResponse.json({ 
      answer
    }, { headers });

  } catch (error) {
    console.error('Query error:', error);
    const headers = await corsHeaders();
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500, headers });
  }
}
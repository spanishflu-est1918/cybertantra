import { NextResponse } from 'next/server';
import { QueryAgent, getAIConfig } from '@cybertantra/ai';

export async function POST(req: Request) {
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

    return NextResponse.json({ 
      answer,
      sources: chunks.map(chunk => ({
        source: chunk.source,
        score: chunk.score,
        excerpt: chunk.text.substring(0, 200) + '...'
      }))
    });

  } catch (error) {
    console.error('Query error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}
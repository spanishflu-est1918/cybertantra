import { NextResponse } from 'next/server';
import { QueryAgent, getAIConfig } from '@cybertantra/ai';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get config from environment variables
    const config = getAIConfig();
    
    // Create agent instance
    const agent = new QueryAgent(config);
    
    // Get answer with RAG
    const answer = await agent.query(message, 5);

    return NextResponse.json({ 
      response: answer
    });

  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}
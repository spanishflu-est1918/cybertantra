import { NextResponse } from 'next/server';
import { createAgent } from '@/lib/agent';

export async function POST(req: Request) {
  try {
    const { question } = await req.json();

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    const agent = createAgent();
    const response = await agent.generate({
      messages: [{ role: 'user', content: question }],
    });

    return NextResponse.json({ 
      answer: response.text,
      sources: response.metadata?.sources || []
    });

  } catch (error) {
    console.error('Query error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
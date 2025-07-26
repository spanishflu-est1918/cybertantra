import { NextResponse } from 'next/server';
import { QueryAgent, getAIConfig } from '@cybertantra/ai';

export async function POST(req: Request) {
  try {
    const { query, limit = 10 } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const config = getAIConfig();
    const agent = new QueryAgent(config);
    
    // Direct vector search without synthesis
    const results = await agent.search(query, limit);

    return NextResponse.json({ 
      results: results.map(chunk => ({
        text: chunk.text,
        source: chunk.source,
        score: chunk.score,
        chunkIndex: chunk.chunkIndex
      })),
      count: results.length
    });

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}
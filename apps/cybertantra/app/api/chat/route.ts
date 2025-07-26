import { CoreMessage, streamText } from 'ai';
import { getAIConfig } from '@cybertantra/ai';
import { createMastraAgent } from '@cybertantra/ai/src/agents/mastra-agent';

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  if (!messages || messages.length === 0) {
    return new Response('No messages provided', { status: 400 });
  }

  try {
    const config = getAIConfig();
    const { agent } = createMastraAgent(config);
    
    // Convert messages to CoreMessage format
    const coreMessages: CoreMessage[] = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));
    
    // Generate response using Mastra agent with tools
    const result = await agent.textStream({
      messages: coreMessages,
      streamOptions: {
        onFinish: async (event) => {
          console.log('Tool calls:', event.toolCalls);
          console.log('Tool results:', event.toolResults);
        },
      },
    });

    // Return the stream
    return result.textStreamResponse;
    
  } catch (error) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Chat failed' }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
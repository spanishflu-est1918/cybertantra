import { streamText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { getAIConfig } from '@cybertantra/ai';
import { DATTATREYA_SYSTEM_PROMPT } from '@/app/lib/prompts';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'text/plain; charset=utf-8',
};

export async function OPTIONS() {
  return new Response(null, { headers });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages } = body;

    if (!messages || messages.length === 0) {
      return new Response('No messages provided', { status: 400 });
    }

    // Get config from environment variables
    const config = getAIConfig();
    
    if (!config.openRouterApiKey) {
      throw new Error('OpenRouter API key required');
    }

    const openrouter = createOpenRouter({
      apiKey: config.openRouterApiKey,
    });

    // Convert messages to the format expected by streamText
    const formattedMessages = messages.map((msg: any) => {
      if (msg.parts) {
        const textPart = msg.parts.find((p: any) => p.type === 'text');
        return {
          role: msg.role,
          content: textPart?.text || '',
        };
      }
      return {
        role: msg.role,
        content: msg.content || '',
      };
    });

    // Stream the response
    const result = streamText({
      model: openrouter('moonshotai/kimi-k2'),
      system: DATTATREYA_SYSTEM_PROMPT,
      messages: formattedMessages,
      temperature: 0.7,
      maxOutputTokens: 150,
    });

    return result.toTextStreamResponse({ headers });
  } catch (error) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
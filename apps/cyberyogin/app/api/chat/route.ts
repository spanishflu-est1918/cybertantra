import { streamText, convertToModelMessages, UIMessage } from 'ai';
import { createFallback } from 'ai-fallback';
import { createAIProvider, AI_MODEL, KIMI_FREE_MODEL, KIMI_REGULAR_MODEL } from '@/app/lib/ai/chat';
import { loadPrompt } from '@/app/lib/ai/prompts/loader';

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();
    
    const openrouter = createAIProvider();
    const systemPrompt = await loadPrompt('digital-twin');
    
    // Create fallback model that switches to regular Kimi on rate limit
    const model = AI_MODEL === KIMI_FREE_MODEL 
      ? createFallback({
          models: [openrouter(KIMI_FREE_MODEL), openrouter(KIMI_REGULAR_MODEL)],
          retryAfterOutput: true, // Retry even if partial output was streamed
          onError: (error: unknown) => {
            if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 429) {
              console.log('Rate limit hit on free model, switching to regular Kimi model...');
            }
          },
        })
      : openrouter(AI_MODEL);
    
    const result = streamText({
      model,
      system: systemPrompt,
      messages: convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to process chat request', details: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
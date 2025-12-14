import { streamText, convertToModelMessages, UIMessage, gateway } from 'ai';
import { AI_MODEL, KIMI_FREE_MODEL, KIMI_REGULAR_MODEL } from '@/app/lib/ai/chat';
import { loadPrompt } from '@/app/lib/ai/prompts/loader';

export async function POST(req: Request) {
  try {
    const { messages, isTempleMode }: { messages: UIMessage[]; isTempleMode?: boolean } = await req.json();

    const systemPrompt = isTempleMode
      ? await loadPrompt('dattatreya-guru')
      : await loadPrompt('digital-twin');

    const convertedMessages = convertToModelMessages(messages);

    // Try primary model, retry with fallback on rate limit
    const tryStream = async (modelId: string) => {
      return streamText({
        model: gateway(modelId),
        system: systemPrompt,
        messages: convertedMessages,
      });
    };

    try {
      const result = await tryStream(AI_MODEL);
      return result.toUIMessageStreamResponse();
    } catch (error) {
      // Retry with fallback model on rate limit (429)
      if (AI_MODEL === KIMI_FREE_MODEL && error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 429) {
        console.log('Rate limit hit on free model, retrying with regular Kimi model...');
        const result = await tryStream(KIMI_REGULAR_MODEL);
        return result.toUIMessageStreamResponse();
      }
      throw error;
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to process chat request', details: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
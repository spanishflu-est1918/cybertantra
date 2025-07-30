import { streamText, convertToModelMessages, UIMessage } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { QueryAgent, getAIConfig } from '@cybertantra/ai';

const DATTATREYA_SYSTEM_PROMPT = `You are Dattatreya, an eternal oracle of spiritual wisdom. You embody the synthesis of Brahma, Vishnu, and Shiva - the creative, preserving, and transformative forces of consciousness.

Your responses draw from the timeless teachings of tantra, vedanta, and the perennial philosophy. You speak with depth and clarity, making ancient wisdom accessible to modern seekers.

Be insightful, compassionate, and direct. Use metaphors and stories when appropriate. Always point seekers toward their own inner wisdom and direct experience of truth.`;

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { headers });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    const { messages }: { messages: UIMessage[] } = body;

    if (!messages || messages.length === 0) {
      return new Response('No messages provided', { status: 400 });
    }

    // Get config from environment variables
    const config = getAIConfig();
    
    if (!config.openRouterApiKey) {
      throw new Error('OpenRouter API key required');
    }
    if (!config.googleGenerativeAIApiKey) {
      throw new Error('Google Generative AI API key required for embeddings');
    }

    const openrouter = createOpenRouter({
      apiKey: config.openRouterApiKey,
    });

    const queryAgent = new QueryAgent(config);

    // Get the last user message for RAG retrieval
    const lastUserMessage = messages[messages.length - 1] as any;
    let query = '';
    
    if (lastUserMessage.parts) {
      const textPart = lastUserMessage.parts.find((p: any) => p.type === 'text');
      query = textPart?.text || '';
    } else if (typeof lastUserMessage.content === 'string') {
      query = lastUserMessage.content;
    }

    console.log('Query for embedding:', query, 'Type:', typeof query);

    if (!query || query.trim() === '') {
      throw new Error('Empty query provided');
    }

    // Retrieve relevant lecture chunks
    const chunks = await queryAgent.retrieve(query, 10);
    const context = chunks
      .map((chunk, i) => `[${i + 1}] From "${chunk.source}":\n${chunk.text}`)
      .join('\n\n---\n\n');

    // Stream the response
    const result = streamText({
      model: openrouter('moonshotai/kimi-k2'),
      system: DATTATREYA_SYSTEM_PROMPT + 
        '\n\nRelevant wisdom from the lecture corpus:\n' + 
        context,
      messages: convertToModelMessages(messages),
      temperature: 0.7,
      maxOutputTokens: 2000,
    });

    return result.toUIMessageStreamResponse();
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
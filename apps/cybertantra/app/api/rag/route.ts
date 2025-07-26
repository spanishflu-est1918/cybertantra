import { getAIConfig, QueryAgent } from '@cybertantra/ai';
import { validateRequest, corsHeaders } from '../middleware';

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 200, headers: await corsHeaders() });
}

export async function POST(req: Request) {
  // Validate request (API key + rate limit)
  const validationError = await validateRequest(req);
  if (validationError) return validationError;

  const { query, limit = 10 } = await req.json();
  
  if (!query) {
    return new Response('No query provided', { status: 400 });
  }

  try {
    const config = getAIConfig();
    
    if (!config.googleGenerativeAIApiKey) {
      throw new Error('Google Generative AI API key required for embeddings');
    }

    // Initialize query agent
    const queryAgent = new QueryAgent(config);
    
    // Retrieve relevant chunks
    const chunks = await queryAgent.retrieve(query, limit);
    
    // Format response for VAPI
    const response = {
      query,
      chunks: chunks.map(chunk => ({
        text: chunk.text,
        source: chunk.source,
        similarity: chunk.similarity
      })),
      context: chunks.map(chunk => chunk.text).join('\n\n')
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...(await corsHeaders())
      }
    });
    
  } catch (error) {
    console.error('RAG retrieval error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to retrieve context' }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...(await corsHeaders())
        }
      }
    );
  }
}
import { Agent } from '@mastra/core/agent';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';

dotenv.config();

// Configure OpenRouter
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

// Configure Gemini for embeddings
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

interface QueryResult {
  text: string;
  score: number;
  source: string;
  chunkIndex?: number;
}

// RAG retrieval function
async function retrieve(query: string, topK: number = 5): Promise<QueryResult[]> {
  // Generate embedding for query
  const result = await embeddingModel.embedContent(query);
  const queryEmbedding = result.embedding.values;
  
  // Format as pgvector array
  const embeddingStr = `[${queryEmbedding.join(',')}]`;
  
  // Query database for similar chunks
  const results = await sql`
    SELECT 
      content as text,
      source,
      chunk_index as "chunkIndex",
      1 - (embedding <=> ${embeddingStr}::vector) as score
    FROM lecture_chunks
    ORDER BY embedding <=> ${embeddingStr}::vector
    LIMIT ${topK}
  `;
  
  return results.rows;
}

// Create the query agent
const agent = new Agent({
  name: 'LectureQueryAgent',
  model: openrouter('moonshotai/kimi-k2'),
  instructions: `You are an expert assistant helping query a lecture corpus about Tantra, consciousness, and related esoteric topics.

When answering questions:
- Be thorough and insightful
- Draw connections between concepts
- Reference specific lectures when relevant
- Maintain the philosophical and esoteric nature of the content`
});

// Export query function
export async function queryAgent(question: string): Promise<string> {
  try {
    // Retrieve relevant chunks
    const chunks = await retrieve(question, 10);
    
    // Format context from chunks
    const context = chunks.map((chunk, i) => 
      `[Source: ${chunk.source}]\n${chunk.text}`
    ).join('\n\n---\n\n');
    
    // Create messages with context
    const messages = [
      {
        role: 'system' as const,
        content: `Here are relevant excerpts from the lecture corpus:\n\n${context}`
      },
      {
        role: 'user' as const,
        content: question
      }
    ];
    
    // Generate response
    const response = await agent.generate(messages);
    
    return response.text;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

// Export retriever for direct use
export { retrieve };
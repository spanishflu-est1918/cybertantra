import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { sql } from '@vercel/postgres';
import { ConversationMemory } from './lib/conversation-memory';
import dotenv from 'dotenv';
import { MODELS } from './config/models';

dotenv.config();

// Configure OpenRouter
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

// Configure Gemini for embeddings
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
const embeddingModel = genAI.getGenerativeModel({ model: MODELS.embedding });

// Retrieval function using the same approach as ask
async function retrieve(query: string, topK: number = 10) {
  const result = await embeddingModel.embedContent(query);
  const queryEmbedding = result.embedding.values;
  const embeddingStr = `[${queryEmbedding.join(',')}]`;
  
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

import { streamText } from 'ai';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load prompts
const ragSynthesisPrompt = readFileSync(join(process.cwd(), 'rag-synthesis-prompt.md'), 'utf-8');
const guruVoicePrompt = readFileSync(join(process.cwd(), 'guru-voice-prompt.md'), 'utf-8');

// Create a streaming chat function
export async function chatWithSystem(query: string, threadId: string, mode: string = 'normal') {
  const memory = new ConversationMemory(threadId);
  await memory.initialize();
  
  // Silent retrieval - no technical output
  const chunks = await retrieve(query, 20);
  
  // If raw mode, return formatted chunks without AI processing
  if (mode === 'raw') {
    console.log('\nRetrieving passages...\n');
    
    const formattedOutput = chunks.map((chunk, i) => {
      // Extract lecture name from source path
      const lectureName = chunk.source.split('/').pop()?.replace('.md', '') || chunk.source;
      
      return `=== Passage ${i + 1} ===
Source: ${lectureName}
Chunk: ${chunk.chunkIndex}
Relevance Score: ${(chunk.score * 100).toFixed(1)}%

${chunk.text}`;
    }).join('\n\n' + '─'.repeat(80) + '\n\n');
    
    console.log(formattedOutput);
    
    // Store in memory
    await memory.addTurn({
      role: 'user',
      content: query,
      timestamp: new Date(),
    });
    
    await memory.addTurn({
      role: 'assistant',
      content: formattedOutput,
      timestamp: new Date(),
    });
    
    return;
  }
  
  // Format chunks for synthesis
  const formattedChunks = chunks.map((chunk, i) => 
    `[Passage ${i + 1} - ${chunk.source}]\n${chunk.text}`
  ).join('\n\n---\n\n');
  
  // Build conversation history
  const shortTermMemory = memory.getShortTermMemory();
  const historyContext = shortTermMemory.slice(-5).map(turn => 
    `${turn.role}: ${turn.content}`
  ).join('\n\n');
  
  let fullResponse = '';
  
  if (mode === 'normal') {
    // Normal mode: single-stage streaming with source voice
    process.stdout.write('\nSynthesizing response...');
    
    const stream = await streamText({
      model: openrouter(MODELS.synthesis),
      system: ragSynthesisPrompt,
      messages: [
        {
          role: 'system',
          content: `${historyContext ? `Previous conversation:\n${historyContext}\n\n` : ''}Here are retrieved passages from the knowledge corpus:\n\n${formattedChunks}`,
        },
        {
          role: 'user',
          content: query,
        }
      ],
      temperature: MODELS.temperatures.synthesis,
      maxTokens: MODELS.maxTokens.synthesis,
    });
    
    let firstChunk = true;
    for await (const chunk of stream.textStream) {
      if (firstChunk) {
        process.stdout.write('\r\x1b[K'); // Clear the loading message
        firstChunk = false;
      }
      process.stdout.write(chunk);
      fullResponse += chunk;
    }
    console.log('\n');
    
  } else {
    // Guru mode: two-stage process
    process.stdout.write('\nEnhanced synthesis mode...');
    
    // First stage: synthesis (non-streaming)
    const synthesisResponse = await generateText({
      model: openrouter(MODELS.synthesis),
      system: ragSynthesisPrompt,
      messages: [
        {
          role: 'system',
          content: `${historyContext ? `Previous conversation:\n${historyContext}\n\n` : ''}Here are retrieved passages from the knowledge corpus:\n\n${formattedChunks}`,
        },
        {
          role: 'user',
          content: query,
        }
      ],
      temperature: MODELS.temperatures.synthesis,
      maxTokens: MODELS.maxTokens.synthesis,
    });
    
    // Second stage: stream the guru voice  
    const stream = await streamText({
      model: openrouter(MODELS.guru),
      system: guruVoicePrompt,
      messages: [
        {
          role: 'system',
          content: `Knowledge synthesis from the corpus:\n\n${synthesisResponse.text}`,
        },
        {
          role: 'user',
          content: query,
        }
      ],
      temperature: MODELS.temperatures.guru,
      maxTokens: MODELS.maxTokens.guru,
    });
    
    let firstChunk = true;
    for await (const chunk of stream.textStream) {
      if (firstChunk) {
        process.stdout.write('\r\x1b[K'); // Clear the loading message
        firstChunk = false;
      }
      process.stdout.write(chunk);
      fullResponse += chunk;
    }
    console.log('\n');
  }
  
  // Store in memory
  await memory.addTurn({
    role: 'user',
    content: query,
    timestamp: new Date(),
  });
  
  await memory.addTurn({
    role: 'assistant',
    content: fullResponse,
    timestamp: new Date(),
  });
  
  return fullResponse;
}

// Export dummy objects to satisfy the CLI
export const ultimateAgent = null;
export const createContextualResponse = chatWithSystem;
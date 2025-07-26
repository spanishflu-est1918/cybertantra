import { pipeline, env } from '@xenova/transformers';

// Configure Transformers.js
env.localURL = 'node_modules/@xenova/transformers/';
env.allowRemoteModels = true;

let embedder: any = null;

export async function getLocalEmbeddings(texts: string[]): Promise<number[][]> {
  // Initialize the model on first use
  if (!embedder) {
    console.log('Loading local embedding model...');
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('Model loaded!');
  }

  const embeddings: number[][] = [];
  
  // Process each text
  for (const text of texts) {
    const output = await embedder(text, { pooling: 'mean', normalize: true });
    // Convert tensor to array
    const embedding = Array.from(output.data);
    embeddings.push(embedding);
  }
  
  return embeddings;
}

// Get embedding dimension for the model
export const LOCAL_EMBEDDING_DIMENSION = 384; // all-MiniLM-L6-v2 dimension
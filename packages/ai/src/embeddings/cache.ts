import { sql } from '@cybertantra/database';
import crypto from 'crypto';
import { LRUCache } from 'lru-cache';

interface CachedEmbedding {
  text: string;
  embedding: number[];
  model: string;
  createdAt: Date;
}

export class EmbeddingCache {
  // In-memory LRU cache for fast access
  private memoryCache: LRUCache<string, number[]>;
  
  // Cache configuration
  private readonly maxMemoryItems = 10000;
  private readonly ttlHours = 24 * 7; // 1 week
  
  constructor() {
    this.memoryCache = new LRUCache<string, number[]>({
      max: this.maxMemoryItems,
      ttl: this.ttlHours * 60 * 60 * 1000, // Convert to milliseconds
      updateAgeOnGet: true,
      updateAgeOnHas: true,
    });
    
    // Warm up cache on initialization
    this.warmUpCache();
  }
  
  private generateCacheKey(text: string, model: string): string {
    // Create a deterministic hash of text + model
    return crypto
      .createHash('sha256')
      .update(`${text}:${model}`)
      .digest('hex');
  }
  
  async get(text: string, model: string): Promise<number[] | null> {
    const cacheKey = this.generateCacheKey(text, model);
    
    // Check memory cache first
    const memoryHit = this.memoryCache.get(cacheKey);
    if (memoryHit) {
      return memoryHit;
    }
    
    // Check database cache
    const dbResult = await sql`
      SELECT embedding, created_at
      FROM embedding_cache
      WHERE cache_key = ${cacheKey}
        AND model = ${model}
        AND created_at > CURRENT_TIMESTAMP - INTERVAL '${this.ttlHours} hours'
    `;
    
    if (dbResult.rows.length > 0) {
      const embedding = dbResult.rows[0].embedding;
      
      // Add to memory cache
      this.memoryCache.set(cacheKey, embedding);
      
      // Update access time
      await sql`
        UPDATE embedding_cache
        SET last_accessed = CURRENT_TIMESTAMP
        WHERE cache_key = ${cacheKey}
      `;
      
      return embedding;
    }
    
    return null;
  }
  
  async set(text: string, model: string, embedding: number[]): Promise<void> {
    const cacheKey = this.generateCacheKey(text, model);
    
    // Add to memory cache
    this.memoryCache.set(cacheKey, embedding);
    
    // Add to database cache
    try {
      await sql`
        INSERT INTO embedding_cache (
          cache_key,
          text_hash,
          embedding,
          model,
          text_length,
          created_at,
          last_accessed
        ) VALUES (
          ${cacheKey},
          ${crypto.createHash('md5').update(text).digest('hex')},
          ${`[${embedding.join(',')}]`}::vector,
          ${model},
          ${text.length},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT (cache_key) 
        DO UPDATE SET
          embedding = EXCLUDED.embedding,
          last_accessed = CURRENT_TIMESTAMP
      `;
    } catch (error) {
      console.error('Failed to cache embedding:', error);
    }
  }
  
  async getBatch(
    texts: string[], 
    model: string
  ): Promise<{ cached: Map<number, number[]>; missing: number[] }> {
    const cached = new Map<number, number[]>();
    const missing: number[] = [];
    
    // Check each text in parallel
    const promises = texts.map(async (text, index) => {
      const embedding = await this.get(text, model);
      if (embedding) {
        cached.set(index, embedding);
      } else {
        missing.push(index);
      }
    });
    
    await Promise.all(promises);
    
    return { cached, missing };
  }
  
  async setBatch(
    texts: string[],
    model: string,
    embeddings: number[][]
  ): Promise<void> {
    if (texts.length !== embeddings.length) {
      throw new Error('Texts and embeddings arrays must have same length');
    }
    
    // Batch insert for better performance
    const values = texts.map((text, index) => {
      const cacheKey = this.generateCacheKey(text, model);
      const textHash = crypto.createHash('md5').update(text).digest('hex');
      const embedding = embeddings[index];
      
      // Add to memory cache
      this.memoryCache.set(cacheKey, embedding);
      
      return {
        cacheKey,
        textHash,
        embedding: `[${embedding.join(',')}]`,
        model,
        textLength: text.length,
      };
    });
    
    // Batch insert into database
    for (const batch of this.chunk(values, 100)) {
      const query = `
        INSERT INTO embedding_cache (
          cache_key, text_hash, embedding, model, text_length, 
          created_at, last_accessed
        ) VALUES ${batch.map((_, i) => 
          `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}::vector, $${i * 5 + 4}, $${i * 5 + 5}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
        ).join(', ')}
        ON CONFLICT (cache_key) DO UPDATE SET
          embedding = EXCLUDED.embedding,
          last_accessed = CURRENT_TIMESTAMP
      `;
      
      const params = batch.flatMap(v => [
        v.cacheKey,
        v.textHash,
        v.embedding,
        v.model,
        v.textLength,
      ]);
      
      await sql.query(query, params);
    }
  }
  
  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  
  private async warmUpCache(): Promise<void> {
    try {
      // Load frequently accessed embeddings into memory
      const frequent = await sql`
        SELECT cache_key, embedding
        FROM embedding_cache
        WHERE last_accessed > CURRENT_TIMESTAMP - INTERVAL '24 hours'
        ORDER BY last_accessed DESC
        LIMIT ${Math.floor(this.maxMemoryItems * 0.5)}
      `;
      
      frequent.rows.forEach(row => {
        this.memoryCache.set(row.cache_key, row.embedding);
      });
      
      console.log(`Warmed up cache with ${frequent.rows.length} embeddings`);
    } catch (error) {
      console.error('Failed to warm up cache:', error);
    }
  }
  
  async getStats(): Promise<{
    memoryCacheSize: number;
    memoryCacheHitRate: number;
    dbCacheSize: number;
    avgAccessTime: number;
    topModels: Array<{ model: string; count: number }>;
  }> {
    const stats = await sql`
      SELECT 
        COUNT(*) as total_entries,
        COUNT(DISTINCT model) as unique_models,
        AVG(EXTRACT(EPOCH FROM (last_accessed - created_at))) as avg_lifetime_seconds
      FROM embedding_cache
    `;
    
    const modelStats = await sql`
      SELECT model, COUNT(*) as count
      FROM embedding_cache
      GROUP BY model
      ORDER BY count DESC
      LIMIT 5
    `;
    
    // Calculate memory cache hit rate
    const hitRate = this.memoryCache.size > 0 
      ? (this.memoryCache.size / this.maxMemoryItems) * 100
      : 0;
    
    return {
      memoryCacheSize: this.memoryCache.size,
      memoryCacheHitRate: hitRate,
      dbCacheSize: parseInt(stats.rows[0].total_entries),
      avgAccessTime: parseFloat(stats.rows[0].avg_lifetime_seconds || '0'),
      topModels: modelStats.rows.map(row => ({
        model: row.model,
        count: parseInt(row.count),
      })),
    };
  }
  
  async cleanup(): Promise<number> {
    // Remove old entries
    const result = await sql`
      DELETE FROM embedding_cache
      WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${this.ttlHours * 2} hours'
      RETURNING cache_key
    `;
    
    // Clear from memory cache
    result.rows.forEach(row => {
      this.memoryCache.delete(row.cache_key);
    });
    
    return result.rows.length;
  }
}
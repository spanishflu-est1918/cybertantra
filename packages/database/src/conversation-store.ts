import { sql } from './client';
import type { UIMessage } from 'ai';

export interface ConversationMetadata {
  title?: string;
  lastActive?: Date;
  [key: string]: any;
}

export interface Conversation {
  id: string;
  messages: UIMessage[];
  metadata: ConversationMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export class ConversationStore {
  /**
   * Rough token estimation (4 chars ≈ 1 token)
   */
  private estimateTokens(messages: UIMessage[]): number {
    const totalChars = messages.reduce((total, msg) => {
      const content = typeof msg.content === 'string' 
        ? msg.content 
        : JSON.stringify(msg.content);
      return total + content.length + msg.role.length;
    }, 0);
    return Math.ceil(totalChars / 4);
  }
  /**
   * Save or update a conversation
   */
  async save(sessionId: string, messages: UIMessage[], metadata?: ConversationMetadata): Promise<void> {
    try {
      const tokenCount = this.estimateTokens(messages);
      
      // Log when approaching context limits
      if (tokenCount > 150000) {
        console.warn(`⚠️  Session ${sessionId} approaching context limit: ${tokenCount} tokens`);
      } else if (tokenCount > 100000) {
        console.log(`📊 Session ${sessionId}: ${messages.length} messages, ~${tokenCount} tokens`);
      }
      
      await sql`
        INSERT INTO conversations (id, messages, metadata, updated_at)
        VALUES (
          ${sessionId}, 
          ${JSON.stringify(messages)}::jsonb,
          ${JSON.stringify(metadata || {})}::jsonb,
          NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          messages = ${JSON.stringify(messages)}::jsonb,
          metadata = COALESCE(${metadata ? JSON.stringify(metadata) : null}::jsonb, conversations.metadata),
          updated_at = NOW()
      `;
    } catch (error) {
      console.error('Failed to save conversation:', error);
      throw new Error(`Failed to save conversation: ${error}`);
    }
  }

  /**
   * Load messages for a conversation
   */
  async load(sessionId: string): Promise<UIMessage[]> {
    try {
      const result = await sql<{ messages: UIMessage[] }>`
        SELECT messages 
        FROM conversations 
        WHERE id = ${sessionId}      `;
      
      return result.rows[0]?.messages || [];
    } catch (error) {
      console.error('Failed to load conversation:', error);
      return [];
    }
  }

  /**
   * Load full conversation with metadata
   */
  async loadFull(sessionId: string): Promise<Conversation | null> {
    try {
      const result = await sql<Conversation>`
        SELECT 
          id,
          messages,
          metadata,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM conversations 
        WHERE id = ${sessionId}      `;
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('Failed to load full conversation:', error);
      return null;
    }
  }

  /**
   * Check if a conversation exists
   */
  async exists(sessionId: string): Promise<boolean> {
    try {
      const result = await sql<{ exists: boolean }>`
        SELECT EXISTS(
          SELECT 1 FROM conversations WHERE id = ${sessionId}        ) as exists
      `;
      
      return result.rows[0]?.exists || false;
    } catch (error) {
      console.error('Failed to check conversation existence:', error);
      return false;
    }
  }

  /**
   * List recent conversations
   */
  async listRecent(limit: number = 10): Promise<Array<{ id: string; metadata: ConversationMetadata; updatedAt: Date }>> {
    try {
      const result = await sql<{ id: string; metadata: ConversationMetadata; updatedAt: Date }>`
        SELECT 
          id,
          metadata,
          updated_at as "updatedAt"
        FROM conversations
        ORDER BY updated_at DESC
        LIMIT ${limit}
      `;
      
      return result.rows;
    } catch (error) {
      console.error('Failed to list recent conversations:', error);
      return [];
    }
  }

  /**
   * Delete a conversation
   */
  async delete(sessionId: string): Promise<boolean> {
    try {
      const result = await sql`
        DELETE FROM conversations 
        WHERE id = ${sessionId}        RETURNING id
      `;
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      return false;
    }
  }

  /**
   * Update conversation metadata
   */
  async updateMetadata(sessionId: string, metadata: ConversationMetadata): Promise<void> {
    try {
      await sql`
        UPDATE conversations
        SET 
          metadata = metadata || ${JSON.stringify(metadata)}::jsonb,
          updated_at = NOW()
        WHERE id = ${sessionId}      `;
    } catch (error) {
      console.error('Failed to update conversation metadata:', error);
      throw new Error(`Failed to update metadata: ${error}`);
    }
  }

  /**
   * Get conversation statistics
   */
  async getStats(sessionId: string): Promise<{ messageCount: number; estimatedTokens: number; needsCompression: boolean } | null> {
    try {
      const messages = await this.load(sessionId);
      if (messages.length === 0) return null;
      
      const estimatedTokens = this.estimateTokens(messages);
      const needsCompression = estimatedTokens > 150000;
      
      return {
        messageCount: messages.length,
        estimatedTokens,
        needsCompression
      };
    } catch (error) {
      console.error('Failed to get conversation stats:', error);
      return null;
    }
  }
}
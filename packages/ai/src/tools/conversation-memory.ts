import { sql } from '@cybertantra/database';
import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { EMBEDDING_MODEL } from '../config';

interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    topics?: string[];
    sources?: string[];
    confidence?: number;
  };
}

interface ConversationSummary {
  mainTopics: string[];
  keyInsights: string[];
  unansweredQuestions: string[];
  suggestedFollowUps: string[];
}

export class ConversationMemory {
  private shortTermMemory: ConversationTurn[] = [];
  private readonly maxShortTermSize = 10;
  private readonly threadId: string;

  constructor(threadId: string) {
    this.threadId = threadId;
  }

  async initialize(): Promise<void> {
    // Load previous conversation from database if exists
    const history = await sql`
      SELECT role, content, metadata, created_at
      FROM conversation_history
      WHERE thread_id = ${this.threadId}
      ORDER BY created_at DESC
      LIMIT ${this.maxShortTermSize}
    `;

    this.shortTermMemory = history.rows.reverse().map(row => ({
      role: row.role,
      content: row.content,
      timestamp: new Date(row.created_at),
      metadata: row.metadata,
    }));
  }

  async addTurn(turn: ConversationTurn): Promise<void> {
    // Add to short-term memory
    this.shortTermMemory.push(turn);
    
    // Persist to database
    await sql`
      INSERT INTO conversation_history (thread_id, role, content, metadata, created_at)
      VALUES (${this.threadId}, ${turn.role}, ${turn.content}, 
              ${JSON.stringify(turn.metadata || {})}, ${turn.timestamp})
    `;

    // Trim short-term memory if needed
    if (this.shortTermMemory.length > this.maxShortTermSize) {
      this.shortTermMemory = this.shortTermMemory.slice(-this.maxShortTermSize);
    }

    // Periodically create summaries for long conversations
    const totalTurns = await this.getTotalTurns();
    if (totalTurns % 20 === 0) {
      await this.createConversationSummary();
    }
  }

  async getRelevantContext(query: string, limit: number = 5): Promise<ConversationTurn[]> {
    // Generate embedding for the query
    const { embeddings } = await embedMany({
      values: [query],
      model: openai.embedding(EMBEDDING_MODEL),
    });
    
    const queryEmbedding = embeddings[0];
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    // Search conversation history for relevant previous exchanges
    const relevantTurns = await sql`
      SELECT role, content, metadata, created_at,
             1 - (embedding <=> ${embeddingStr}::vector) as relevance_score
      FROM conversation_history
      WHERE thread_id = ${this.threadId}
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT ${limit}
    `;

    return relevantTurns.rows.map(row => ({
      role: row.role,
      content: row.content,
      timestamp: new Date(row.created_at),
      metadata: {
        ...row.metadata,
        relevanceScore: row.relevance_score,
      },
    }));
  }

  getShortTermMemory(): ConversationTurn[] {
    return this.shortTermMemory;
  }

  async getConversationSummary(): Promise<ConversationSummary | null> {
    const summary = await sql`
      SELECT summary_data
      FROM conversation_summaries
      WHERE thread_id = ${this.threadId}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    return summary.rows[0]?.summary_data || null;
  }

  private async createConversationSummary(): Promise<void> {
    // Get recent conversation
    const recentTurns = await sql`
      SELECT role, content, metadata
      FROM conversation_history
      WHERE thread_id = ${this.threadId}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    const conversationText = recentTurns.rows
      .reverse()
      .map(turn => `${turn.role}: ${turn.content}`)
      .join('\n\n');

    // Use LLM to create summary
    const { text } = await generateText({
      model: openai('gpt-4-turbo-preview'),
      prompt: `Analyze this conversation and extract:
1. Main topics discussed (max 5)
2. Key insights or conclusions reached
3. Any unanswered questions
4. Suggested follow-up topics

Conversation:
${conversationText}

Return as JSON with keys: mainTopics, keyInsights, unansweredQuestions, suggestedFollowUps`,
      temperature: 0.3,
    });

    try {
      const summary = JSON.parse(text);
      
      await sql`
        INSERT INTO conversation_summaries (thread_id, summary_data, created_at)
        VALUES (${this.threadId}, ${JSON.stringify(summary)}, CURRENT_TIMESTAMP)
      `;
    } catch (error) {
      console.error('Failed to create conversation summary:', error);
    }
  }

  private async getTotalTurns(): Promise<number> {
    const result = await sql`
      SELECT COUNT(*) as count
      FROM conversation_history
      WHERE thread_id = ${this.threadId}
    `;
    
    return parseInt(result.rows[0].count);
  }

  // Advanced context management
  async buildContextPrompt(currentQuery: string): Promise<string> {
    const [summary, relevantContext, recentTurns] = await Promise.all([
      this.getConversationSummary(),
      this.getRelevantContext(currentQuery, 3),
      this.getRecentConversation(3),
    ]);

    let contextPrompt = '';

    if (summary) {
      contextPrompt += `Previous Discussion Summary:\n`;
      contextPrompt += `Topics: ${summary.mainTopics.join(', ')}\n`;
      contextPrompt += `Key Points: ${summary.keyInsights.join('; ')}\n\n`;
    }

    if (relevantContext.length > 0) {
      contextPrompt += `Relevant Previous Exchanges:\n`;
      relevantContext.forEach(turn => {
        contextPrompt += `${turn.role}: ${turn.content.slice(0, 200)}...\n`;
      });
      contextPrompt += '\n';
    }

    if (recentTurns.length > 0) {
      contextPrompt += `Recent Conversation:\n`;
      recentTurns.forEach(turn => {
        contextPrompt += `${turn.role}: ${turn.content}\n`;
      });
      contextPrompt += '\n';
    }

    contextPrompt += `Current Query: ${currentQuery}\n`;

    return contextPrompt;
  }

  private async getRecentConversation(limit: number): Promise<ConversationTurn[]> {
    return this.shortTermMemory.slice(-limit);
  }

  // Track topic evolution over conversation
  async getTopicEvolution(): Promise<Array<{
    turnNumber: number;
    topics: string[];
    timestamp: Date;
  }>> {
    const turns = await sql`
      SELECT metadata, created_at
      FROM conversation_history
      WHERE thread_id = ${this.threadId}
        AND metadata->>'topics' IS NOT NULL
      ORDER BY created_at
    `;

    return turns.rows.map((row, index) => ({
      turnNumber: index + 1,
      topics: row.metadata.topics || [],
      timestamp: new Date(row.created_at),
    }));
  }

  // Detect conversation patterns
  async detectPatterns(): Promise<{
    recurringTopics: string[];
    questionTypes: string[];
    avgResponseLength: number;
    engagementLevel: 'high' | 'medium' | 'low';
  }> {
    const analysis = await sql`
      SELECT 
        AVG(LENGTH(content)) as avg_length,
        COUNT(*) as total_turns,
        COUNT(DISTINCT DATE(created_at)) as active_days
      FROM conversation_history
      WHERE thread_id = ${this.threadId}
    `;

    const topicCounts = new Map<string, number>();
    const allTurns = await sql`
      SELECT metadata FROM conversation_history
      WHERE thread_id = ${this.threadId} AND metadata IS NOT NULL
    `;

    allTurns.rows.forEach(row => {
      const topics = row.metadata.topics || [];
      topics.forEach((topic: string) => {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      });
    });

    const recurringTopics = Array.from(topicCounts.entries())
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .map(([topic]) => topic)
      .slice(0, 5);

    const avgLength = parseFloat(analysis.rows[0].avg_length || '0');
    const totalTurns = parseInt(analysis.rows[0].total_turns || '0');
    const activeDays = parseInt(analysis.rows[0].active_days || '0');

    const engagementLevel = 
      totalTurns > 50 || activeDays > 7 ? 'high' :
      totalTurns > 20 || activeDays > 3 ? 'medium' : 'low';

    return {
      recurringTopics,
      questionTypes: ['exploratory', 'factual', 'analytical'], // Placeholder
      avgResponseLength: avgLength,
      engagementLevel,
    };
  }
}

// Function to generate text (imported from 'ai' package)
import { generateText } from 'ai';
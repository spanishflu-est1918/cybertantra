import { createGateway, embedMany, generateText, streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { sql } from "@cybertantra/database";
import { EMBEDDING_MODEL, type AIConfig } from "../config";

export type ContentCategory = "lecture" | "meditation" | "video" | "show";

export interface QueryOptions {
  topK?: number;
  categories?: ContentCategory[];
  tags?: string[];
}

export interface QueryResult {
  text: string;
  score: number;
  source: string;
  chunkIndex?: number;
  category?: ContentCategory;
  tags?: string[];
}

export class QueryAgent {
  private config: AIConfig;
  private gateway: ReturnType<typeof createGateway>;
  private google: ReturnType<typeof createGoogleGenerativeAI>;

  constructor(config: AIConfig) {
    if (!config.aiGatewayApiKey) {
      throw new Error("AI Gateway API key required");
    }
    if (!config.googleGenerativeAIApiKey) {
      throw new Error("Google Generative AI API key required for embeddings");
    }

    this.config = config;
    this.gateway = createGateway();
    this.google = createGoogleGenerativeAI({
      apiKey: config.googleGenerativeAIApiKey,
    });
  }

  async retrieve(
    query: string,
    options: QueryOptions = {},
  ): Promise<QueryResult[]> {
    const { topK = 5, categories = [], tags = [] } = options;

    try {
      const { embeddings } = await embedMany({
        values: [query],
        model: this.google.embeddingModel(EMBEDDING_MODEL),
      });

      const queryEmbedding = embeddings[0];
      const embeddingStr = `[${queryEmbedding.join(",")}]`;

      // Build dynamic query with filters
      let whereConditions: string[] = [];
      let params: any = {
        embedding: embeddingStr,
        limit: topK,
      };

      if (categories.length > 0) {
        whereConditions.push(
          `category = ANY($${Object.keys(params).length + 1})`,
        );
        params.categories = categories;
      }

      if (tags.length > 0) {
        whereConditions.push(`tags && $${Object.keys(params).length + 1}`);
        params.tags = tags;
      }

      const whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

      // Execute query with filters
      let dbQuery;
      if (whereConditions.length > 0) {
        // For now, let's handle each filter case explicitly
        if (categories.length > 0 && !tags.length) {
          // Format categories array as PostgreSQL array literal
          const categoriesArray = "{" + categories.join(",") + "}";
          dbQuery = sql`
            SELECT
              content as text,
              source,
              chunk_index as "chunkIndex",
              category,
              tags,
              1 - (embedding <=> ${embeddingStr}::vector) as score
            FROM lecture_chunks
            WHERE category = ANY(${categoriesArray}::content_category[])
            ORDER BY embedding <=> ${embeddingStr}::vector
            LIMIT ${topK}
          `;
        } else {
          // For other filter combinations, fall back to no filter for now
          dbQuery = sql`
            SELECT
              content as text,
              source,
              chunk_index as "chunkIndex",
              category,
              tags,
              1 - (embedding <=> ${embeddingStr}::vector) as score
            FROM lecture_chunks
            ORDER BY embedding <=> ${embeddingStr}::vector
            LIMIT ${topK}
          `;
        }
      } else {
        dbQuery = sql`
          SELECT
            content as text,
            source,
            chunk_index as "chunkIndex",
            category,
            tags,
            1 - (embedding <=> ${embeddingStr}::vector) as score
          FROM lecture_chunks
          ORDER BY embedding <=> ${embeddingStr}::vector
          LIMIT ${topK}
        `;
      }

      const results = await dbQuery;

      return results.rows.map((row) => ({
        text: row.text,
        score: row.score,
        source: row.source,
        chunkIndex: row.chunkIndex,
        category: row.category as ContentCategory,
        tags: row.tags,
      }));
    } catch (error) {
      console.error("Database query error:", error);
      return [];
    }
  }

  async query(question: string, options: QueryOptions = {}): Promise<string> {
    // Retrieve relevant chunks with filters
    const chunks = await this.retrieve(question, options);

    if (chunks.length === 0) {
      const categoryMsg = options.categories?.length
        ? ` in the ${options.categories.join("/")} content`
        : " in the corpus";
      return `I couldn't find any relevant information${categoryMsg} for your question.`;
    }

    // Prepare context from chunks
    const context = chunks
      .map((chunk, i) => {
        const meta = [
          chunk.category && `[${chunk.category.toUpperCase()}]`,
          chunk.source,
        ]
          .filter(Boolean)
          .join(" ");

        return `[${i + 1}] ${meta}:\n${chunk.text}`;
      })
      .join("\n\n---\n\n");

    // Generate system prompt based on categories
    const systemPrompt =
      this.getSystemPrompt(options.categories) +
      "\n\nRetrieved lecture context:\n" +
      context;

    // Generate response using AI SDK Gateway
    const { text } = await generateText({
      model: this.gateway.languageModel("anthropic/claude-opus-4.5"),
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: question,
        },
      ],
      temperature: 0.85,
      maxOutputTokens: 8000,
    });

    return text;
  }

  async stream(question: string, options: QueryOptions = {}) {
    // Retrieve relevant chunks with filters
    const chunks = await this.retrieve(question, options);

    if (chunks.length === 0) {
      const categoryMsg = options.categories?.length
        ? ` in the ${options.categories.join("/")} content`
        : " in the corpus";
      throw new Error(`No relevant information found${categoryMsg}`);
    }

    // Prepare context
    const context = chunks
      .map((chunk, i) => {
        const meta = [
          chunk.category && `[${chunk.category.toUpperCase()}]`,
          chunk.source,
        ]
          .filter(Boolean)
          .join(" ");

        return `[${i + 1}] ${meta}:\n${chunk.text}`;
      })
      .join("\n\n---\n\n");

    const systemPrompt = this.getSystemPrompt(options.categories);

    // Stream response using AI SDK Gateway
    return streamText({
      model: this.gateway.languageModel("anthropic/claude-opus-4.5"),
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Based on the following excerpts, please answer this question: ${question}

Content Excerpts:
${context}`,
        },
      ],
      temperature: 0.85,
      maxOutputTokens: 8000,
    });
  }

  private getSystemPrompt(categories?: ContentCategory[]): string {
    if (!categories || categories.length === 0) {
      return `You are an expert on tantra, cyberspace, consciousness, and spiritual practices.
You have access to a diverse corpus including lectures, meditations, videos, and shows.
Answer questions based on the provided content. Always cite which sources you're drawing from.
Be insightful and thorough, making connections between different concepts when relevant.`;
    }

    const prompts: Record<ContentCategory, string> = {
      lecture:
        "You are an expert on tantra, cyberspace, and consciousness, drawing from lecture material.",
      meditation:
        "You are a meditation guide with deep knowledge of yoga nidra and spiritual practices.",
      video:
        "You are providing insights from video content and visual teachings.",
      show: "You are sharing knowledge from show episodes and discussions.",
    };

    const selectedPrompts = categories
      .map((cat) => prompts[cat])
      .filter(Boolean);

    return `${selectedPrompts.join(" ")}
Answer questions based on the provided excerpts. Always cite which sources you're drawing from.
Be insightful and thorough, making connections between different concepts when relevant.`;
  }

  async search(
    query: string,
    options: QueryOptions = {},
  ): Promise<QueryResult[]> {
    return this.retrieve(query, { ...options, topK: options.topK || 10 });
  }

  // Get content statistics
  async getStats(category?: ContentCategory): Promise<any> {
    try {
      if (category) {
        const stats = await sql`
          SELECT
            COUNT(*) as chunk_count,
            COUNT(DISTINCT source) as file_count,
            array_agg(DISTINCT unnest) as tags
          FROM lecture_chunks
          LEFT JOIN LATERAL unnest(tags) ON true
          WHERE category = ${category}::content_category
        `;
        return stats.rows[0];
      } else {
        const stats = await sql`
          SELECT
            category,
            COUNT(*) as chunk_count,
            COUNT(DISTINCT source) as file_count
          FROM lecture_chunks
          GROUP BY category
          ORDER BY category
        `;
        return stats.rows;
      }
    } catch (error) {
      console.error("Failed to get stats:", error);
      return null;
    }
  }
}

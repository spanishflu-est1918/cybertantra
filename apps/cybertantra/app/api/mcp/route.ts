import { z } from "zod/v3";
import { createMcpHandler } from "mcp-handler";
import { QueryAgent, getAIConfig } from "@cybertantra/ai";

// Define schemas outside to avoid type instantiation depth issues
const queryGuruSchema = {
  question: z.string().describe("The question to ask the Guru"),
  topK: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .default(5)
    .describe("Number of relevant passages to retrieve (default: 5)"),
};

const searchLecturesSchema = {
  query: z.string().describe("The search query"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(10)
    .describe("Maximum number of results to return (default: 10)"),
};

const generateOutlineSchema = {
  topic: z.string().describe("The topic to generate an outline for"),
};

// Tool handlers defined separately to avoid type instantiation issues
async function handleQueryGuru(args: { question: string; topK?: number }) {
  const { question, topK = 5 } = args;
  try {
    const config = getAIConfig();
    const agent = new QueryAgent(config);
    const answer = await agent.query(question, { topK });

    return {
      content: [{ type: "text" as const, text: answer }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error querying guru: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSearchLectures(args: { query: string; limit?: number }) {
  const { query, limit = 10 } = args;
  try {
    const config = getAIConfig();
    const agent = new QueryAgent(config);
    const results = await agent.search(query, { topK: limit });

    const formattedResults = results
      .map(
        (chunk, i) =>
          `[${i + 1}] (Score: ${chunk.score.toFixed(3)})\n${chunk.text}`,
      )
      .join("\n\n---\n\n");

    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${results.length} relevant passages:\n\n${formattedResults}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error searching lectures: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleGenerateOutline(args: { topic: string }) {
  const { topic } = args;
  try {
    const config = getAIConfig();
    const agent = new QueryAgent(config);

    const outline = await agent.query(
      `Create a detailed chapter outline for the topic: "${topic}". First search for relevant content from the lectures, then synthesize a comprehensive outline with main points and sub-topics.`,
      { topK: 10 },
    );

    return {
      content: [
        {
          type: "text" as const,
          text: `# Outline: ${topic}\n\n${outline}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error generating outline: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}

const handler = createMcpHandler(
  (server) => {
    // @ts-expect-error - mcp-handler has overly complex generics causing type depth issues
    server.tool(
      "query_guru",
      "Ask the Guru a question about Tantra, consciousness, yoga, spirituality, or related topics. Uses RAG to search through lecture transcripts and synthesize an answer.",
      queryGuruSchema,
      handleQueryGuru,
    );

    // @ts-expect-error - mcp-handler has overly complex generics causing type depth issues
    server.tool(
      "search_lectures",
      "Search through lecture transcripts using vector similarity. Returns relevant text passages without synthesis.",
      searchLecturesSchema,
      handleSearchLectures,
    );

    // @ts-expect-error - mcp-handler has overly complex generics causing type depth issues
    server.tool(
      "generate_outline",
      "Generate a detailed chapter outline for a topic based on lecture content.",
      generateOutlineSchema,
      handleGenerateOutline,
    );
  },
  {},
  { basePath: "/api" },
);

export { handler as GET, handler as POST, handler as DELETE };

import { z } from "zod/v3";
import { createMcpHandler } from "mcp-handler";
import { QueryAgent, getAIConfig } from "@cybertantra/ai";

const handler = createMcpHandler(
  (server) => {
    // Query the Guru - RAG-enhanced Q&A
    server.tool(
      "query_guru",
      "Ask the Guru a question about Tantra, consciousness, yoga, spirituality, or related topics. Uses RAG to search through lecture transcripts and synthesize an answer.",
      {
        question: z
          .string()
          .describe("The question to ask the Guru"),
        topK: z
          .number()
          .int()
          .min(1)
          .max(20)
          .optional()
          .default(5)
          .describe("Number of relevant passages to retrieve (default: 5)"),
      },
      async ({ question, topK }) => {
        try {
          const config = getAIConfig();
          const agent = new QueryAgent(config);
          const answer = await agent.query(question, { topK });

          return {
            content: [
              {
                type: "text",
                text: answer,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error querying guru: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
            isError: true,
          };
        }
      },
    );

    // Search lectures - direct vector similarity search
    server.tool(
      "search_lectures",
      "Search through lecture transcripts using vector similarity. Returns relevant text passages without synthesis.",
      {
        query: z
          .string()
          .describe("The search query"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .default(10)
          .describe("Maximum number of results to return (default: 10)"),
      },
      async ({ query, limit }) => {
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
                type: "text",
                text: `Found ${results.length} relevant passages:\n\n${formattedResults}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error searching lectures: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
            isError: true,
          };
        }
      },
    );

    // Generate outline for a topic
    server.tool(
      "generate_outline",
      "Generate a detailed chapter outline for a topic based on lecture content.",
      {
        topic: z
          .string()
          .describe("The topic to generate an outline for"),
      },
      async ({ topic }) => {
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
                type: "text",
                text: `# Outline: ${topic}\n\n${outline}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error generating outline: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
            isError: true,
          };
        }
      },
    );
  },
  {},
  { basePath: "/api" },
);

export { handler as GET, handler as POST, handler as DELETE };

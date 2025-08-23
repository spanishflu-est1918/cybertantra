import { streamText, tool } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";
import {
  QueryAgent,
  getAIConfig,
  CYBERTANTRA_SYSTEM_PROMPT,
} from "@cybertantra/ai";
import { validateRequest, corsHeaders } from "../middleware";

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 200, headers: await corsHeaders() });
}

export async function POST(req: Request) {
  // Validate request (API key + rate limit)
  const validationError = await validateRequest(req);
  if (validationError) return validationError;

  const { transcript } = await req.json();

  if (!transcript) {
    return new Response("No transcript provided", { status: 400 });
  }

  try {
    const config = getAIConfig();

    if (!config.openRouterApiKey) {
      throw new Error("OpenRouter API key required");
    }
    if (!config.googleGenerativeAIApiKey) {
      throw new Error("Google Generative AI API key required for embeddings");
    }

    const openrouter = createOpenRouter({
      apiKey: config.openRouterApiKey,
    });

    const queryAgent = new QueryAgent(config);

    // Generate response with RAG as a tool
    const result = streamText({
      model: openrouter("moonshotai/kimi-k2"),
      system: CYBERTANTRA_SYSTEM_PROMPT,
      messages: [{ role: "user", content: transcript }],
      temperature: 0.8,
      maxOutputTokens: 500,
      tools: {
        searchLectures: tool({
          description:
            "Search the lecture database for relevant content about tantra, consciousness, cyberspace, or related topics",
          inputSchema: z.object({
            query: z
              .string()
              .describe("The search query to find relevant lecture content"),
            limit: z
              .number()
              .optional()
              .default(10)
              .describe("Number of results to retrieve"),
          }),
          execute: async ({ query, limit }) => {
            const chunks = await queryAgent.retrieve(query, limit);
            return chunks
              .map(
                (chunk, i) =>
                  `[${i + 1}] From "${chunk.source}":\n${chunk.text}`,
              )
              .join("\n\n---\n\n");
          },
        }),
      },
    });

    // Collect the full response
    let fullResponse = "";
    for await (const chunk of result.textStream) {
      fullResponse += chunk;
    }

    // Return JSON response with CORS headers
    const headers = await corsHeaders();
    return new Response(
      JSON.stringify({
        transcript,
        response: fullResponse,
        chunks: chunks.length,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      },
    );
  } catch (error) {
    console.error("Process voice error:", error);
    const headers = await corsHeaders();
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Processing failed",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      },
    );
  }
}

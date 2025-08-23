import { streamText, convertToModelMessages, tool as aiTool } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z as zodbert } from "zod";
import {
  QueryAgent,
  getAIConfig,
  DATTATREYA_SYSTEM_PROMPT,
} from "@cybertantra/ai";
import { validateRequest, corsHeaders } from "../middleware";

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 200, headers: await corsHeaders() });
}

export async function POST(req: Request) {
  // Validate request (API key + rate limit)
  const validationError = await validateRequest(req);
  if (validationError) return validationError;

  const { messages } = await req.json();

  if (!messages || messages.length === 0) {
    return new Response("No messages provided", { status: 400 });
  }

  console.log("=== Process Voice Request ===");
  console.log("Messages received:", messages.length);

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
      model: openrouter("anthropic/claude-3.5-sonnet"),
      system: DATTATREYA_SYSTEM_PROMPT,
      messages: convertToModelMessages(messages),
      temperature: 0.7,
      maxOutputTokens: 2000,
      // Tool call streaming is enabled by default in v5
      tools: {
        searchLectures: aiTool({
          description:
            "Search the lecture database for relevant content about tantra, consciousness, cyberspace, or related topics. Use this tool when the user asks specific questions that would benefit from the lecture corpus.",
          inputSchema: zodbert.object({
            query: zodbert
              .string()
              .describe("The search query string"),
            limit: zodbert
              .number()
              .optional()
              .default(15)
              .describe("Number of results to retrieve"),
          }),
          execute: async ({ query, limit = 15 }) => {
            console.log(
              "searchLectures tool called with query:",
              query,
              "limit:",
              limit,
            );
            
            // Use the full query method which includes synthesis
            const response = await queryAgent.query(query, limit);
            console.log("Generated synthesized response of length:", response.length);
            
            return response;
          },
        }),
      },
    });

    // Use AI SDK's built-in streaming response with CORS headers
    const headers = await corsHeaders();
    return result.toUIMessageStreamResponse({
      headers,
    });
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

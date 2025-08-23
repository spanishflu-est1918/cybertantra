import {
  streamText,
  convertToModelMessages,
  tool as aiTool,
  stepCountIs,
} from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z as zodbert } from "zod";
import {
  QueryAgent,
  getAIConfig,
  DATTATREYA_SYSTEM_PROMPT,
} from "@cybertantra/ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  if (!messages || messages.length === 0) {
    return new Response("No messages provided", { status: 400 });
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

    const result = streamText({
      model: openrouter("anthropic/claude-sonnet-4"),
      system: DATTATREYA_SYSTEM_PROMPT,
      messages: convertToModelMessages(messages),
      temperature: 0.7,
      maxOutputTokens: 2000,
      stopWhen: stepCountIs(3),
      tools: {
        searchLectures: aiTool({
          description:
            "Search the lecture database for relevant content. The tool returns a comprehensive answer that you MUST share with the user. After calling this tool, present the returned content to the user verbatim, then you may add your own reflections or elaborations.",
          inputSchema: zodbert.object({
            query: zodbert.string().describe("The search query string"),
            limit: zodbert
              .number()
              .optional()
              .default(15)
              .describe("Number of results to retrieve"),
          }),
          execute: async ({ query, limit = 15 }) => {
            const response = await queryAgent.query(query, limit);
            return response;
          },
        }),
      },
      toolChoice: "auto",
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Dattatreya chat error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Processing failed",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}

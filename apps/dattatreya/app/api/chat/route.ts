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
import { transcribeAudio } from "../../lib/transcribe-server";
import { createBenchmark } from "../../lib/benchmark";
import { convertUIMessagesToModelMessages } from "../../lib/message-converter";

export const maxDuration = 30;

export async function POST(req: Request) {
  const bench = createBenchmark();

  // Handle JSON input (including UIMessages with file parts)
  bench.start("parse-json");
  const body = await req.json();
  bench.end("parse-json");

  bench.start("convert-ui-messages");
  const messages = await convertUIMessagesToModelMessages(body.messages);
  bench.end("convert-ui-messages");

  if (!messages || messages.length === 0) {
    return new Response("No messages provided", { status: 400 });
  }

  try {
    bench.start("config-and-setup");
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
    bench.end("config-and-setup");

    bench.start("ai-stream-generation");
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
            "Search the lecture database for relevant content chunks. Returns raw lecture excerpts that you should synthesize and present in your own voice as Dattatreya.",
          inputSchema: zodbert.object({
            query: zodbert.string().describe("The search query string"),
            limit: zodbert
              .number()
              .optional()
              .default(10)
              .describe("Number of results to retrieve"),
          }),
          execute: async ({ query, limit = 10 }) => {
            console.log(
              `[BENCH] Tool searchLectures called with query: "${query}", limit: ${limit}`,
            );
            const toolStart = performance.now();
            const chunks = await queryAgent.retrieve(query, limit);
            const toolDuration = performance.now() - toolStart;
            console.log(
              `[BENCH] Tool searchLectures completed in ${toolDuration.toFixed(2)}ms`,
            );

            if (chunks.length === 0) {
              return "No relevant content found in the lecture database.";
            }

            return chunks
              .map(
                (chunk, i) =>
                  `[${i + 1}] From "${chunk.source}" (score: ${chunk.score.toFixed(3)}):\n${chunk.text}`,
              )
              .join("\n\n---\n\n");
          },
        }),
      },
      toolChoice: "auto",
    });
    bench.end("ai-stream-generation");
    bench.summary();

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

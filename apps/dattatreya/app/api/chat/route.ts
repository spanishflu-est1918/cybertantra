import {
  streamText,
  convertToModelMessages,
  tool as aiTool,
} from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z as zodbert } from "zod";
import {
  QueryAgent,
  getAIConfig,
  DATTATREYA_SYSTEM_PROMPT,
} from "@cybertantra/ai";
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
      maxOutputTokens: 2000, // default, will be dynamically adjusted
      onStepFinish: ({ toolCalls }) => {
        // Log tool usage for benchmarking
        toolCalls.forEach((toolCall) => {
          if (toolCall.toolName === "searchLectures") {
            const { complexity, depth } = toolCall.input as any;
            console.log(
              `[BENCH] Tool executed with depth: ${depth || "surface"}, complexity: ${complexity || "simple"}`,
            );
          }
        });
      },
      tools: {
        searchLectures: aiTool({
          description:
            "Search the lecture database for relevant content chunks. Returns raw lecture excerpts that you should synthesize and present in your own voice as Dattatreya.",
          inputSchema: zodbert.object({
            query: zodbert.string().describe("The search query string"),
            depth: zodbert
              .enum(["surface", "deep", "comprehensive"])
              .optional()
              .default("surface")
              .describe(
                "Search depth: 'surface' for quick answers (5 chunks), 'deep' for detailed responses (15 chunks), 'comprehensive' for complex topics (25 chunks)",
              ),
            complexity: zodbert
              .enum(["simple", "detailed", "extensive"])
              .optional()
              .default("simple")
              .describe(
                "Response complexity: 'simple' for brief answers, 'detailed' for thorough explanations, 'extensive' for comprehensive analysis",
              ),
          }),
          execute: async ({
            query,
            depth = "surface",
            complexity = "simple",
          }) => {
            const limitMap = { surface: 5, deep: 15, comprehensive: 25 };
            const limit = limitMap[depth];

            console.log(
              `[BENCH] Tool searchLectures called with query: "${query}", depth: ${depth} (${limit} chunks), complexity: ${complexity}`,
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

            const contextualInstruction = {
              simple: "Provide a concise synthesis of these teachings.",
              detailed:
                "Provide a thorough explanation drawing connections between these teachings.",
              extensive:
                "Provide a comprehensive analysis with deep philosophical connections and practical applications.",
            }[complexity];

            const result = chunks
              .map(
                (chunk, i) =>
                  `[${i + 1}] From "${chunk.source}" (score: ${chunk.score.toFixed(3)}):\n${chunk.text}`,
              )
              .join("\n\n---\n\n");

            return `${contextualInstruction}\n\n${result}`;
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

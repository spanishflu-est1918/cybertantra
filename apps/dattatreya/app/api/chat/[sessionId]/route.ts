import {
  streamText,
  convertToModelMessages,
  tool as aiTool,
  stepCountIs,
  createUIMessageStream,
  createUIMessageStreamResponse,
  validateUIMessages,
  createIdGenerator,
  UIMessage,
} from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z as zodbert } from "zod/v4";
import {
  QueryAgent,
  getAIConfig,
  DATTATREYA_SYSTEM_PROMPT,
} from "@cybertantra/ai";
import { ConversationStore } from "@cybertantra/database";
import { createBenchmark } from "../../../lib/benchmark";
import { convertUIMessagesToModelMessages } from "../../../lib/message-converter";

export const maxDuration = 30;

const store = new ConversationStore();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const bench = createBenchmark();
  const { sessionId } = await params;

  if (!sessionId) {
    return new Response("Session ID required", { status: 400 });
  }

  bench.start("parse-request");
  const body = await req.json();
  bench.end("parse-request");

  // Handle both patterns: single message optimization or full messages array
  let messages: UIMessage[];
  
  if (body.message && !body.messages) {
    // Single message optimization - load previous and append
    bench.start("load-conversation");
    const previousMessages = await store.load(sessionId);
    bench.end("load-conversation");
    
    bench.start("append-message");
    messages = [...previousMessages, body.message];
    bench.end("append-message");
  } else if (body.messages) {
    // Full messages array (fallback or initial load)
    bench.start("parse-messages");
    messages = body.messages;
    bench.end("parse-messages");
  } else {
    return new Response("No messages provided", { status: 400 });
  }

  // Validate messages
  bench.start("validate-messages");
  const validatedMessages = await validateUIMessages({
    messages,
  });
  bench.end("validate-messages");

  // Convert UI messages for the model
  bench.start("convert-ui-messages");
  const convertedMessages = await convertUIMessagesToModelMessages(
    validatedMessages
  );
  bench.end("convert-ui-messages");

  // Check if we transcribed any audio
  const hadAudioTranscription = validatedMessages[
    validatedMessages.length - 1
  ]?.parts?.some(
    (p: any) => p.type === "file" && p.mediaType?.startsWith("audio/")
  );

  if (!convertedMessages || convertedMessages.length === 0) {
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
      messages: convertToModelMessages(convertedMessages),
      temperature: 0.7,
      maxOutputTokens: 2000,
      onStepFinish: ({ toolCalls }) => {
        // Log tool usage for benchmarking
        toolCalls.forEach((toolCall) => {
          if (toolCall.toolName === "searchLectures") {
            const { complexity, depth } = toolCall.input as any;
            console.log(
              `[BENCH] Tool executed with depth: ${depth || "surface"}, complexity: ${complexity || "simple"}`
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
                "Search depth: 'surface' for quick answers (5 chunks), 'deep' for detailed responses (15 chunks), 'comprehensive' for complex topics (25 chunks)"
              ),
            complexity: zodbert
              .enum(["simple", "detailed", "extensive"])
              .optional()
              .default("simple")
              .describe(
                "Response complexity: 'simple' for brief answers, 'detailed' for thorough explanations, 'extensive' for comprehensive analysis"
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
              `[BENCH] Tool searchLectures called with query: "${query}", depth: ${depth} (${limit} chunks), complexity: ${complexity}`
            );
            const toolStart = performance.now();
            const chunks = await queryAgent.retrieve(query, { topK: limit });
            const toolDuration = performance.now() - toolStart;
            console.log(
              `[BENCH] Tool searchLectures completed in ${toolDuration.toFixed(2)}ms`
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
                  `[${i + 1}] From "${chunk.source}" (score: ${chunk.score.toFixed(3)}):\n${chunk.text}`
              )
              .join("\n\n---\n\n");

            return `${contextualInstruction}\n\n${result}`;
          },
        }),
      },
      toolChoice: "auto",
      stopWhen: stepCountIs(25),
    });
    bench.end("ai-stream-generation");

    // Ensure persistence even on disconnect
    result.consumeStream();

    bench.summary();

    // If we had audio transcription, create a custom stream to handle message replacement
    if (hadAudioTranscription) {
      const stream = createUIMessageStream({
        originalMessages: convertedMessages,
        execute: ({ writer }) => {
          // Send a custom data part to signal message replacement
          writer.write({
            type: "data-message-replacement",
            data: {
              messageIndex: convertedMessages.length - 1,
              newContent:
                convertedMessages[convertedMessages.length - 1].content ||
                convertedMessages[convertedMessages.length - 1].parts
                  ?.filter((p: any) => p.type === "text")
                  .map((p: any) => p.text)
                  .join(" "),
            },
            transient: true,
          });

          // Merge the AI response stream
          writer.merge(result.toUIMessageStream());
        },
      });

      return createUIMessageStreamResponse({ 
        stream,
      });
    }

    // Normal response without audio transcription
    return result.toUIMessageStreamResponse({
      originalMessages: convertedMessages,
    });
  } catch (error) {
    console.error("Dattatreya memory chat error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Processing failed",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

// GET endpoint to load conversation history
export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  if (!sessionId) {
    return new Response("Session ID required", { status: 400 });
  }

  try {
    const conversation = await store.loadFull(sessionId);
    
    if (!conversation) {
      return new Response(
        JSON.stringify({ messages: [], metadata: {} }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify(conversation), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to load conversation:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to load conversation",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
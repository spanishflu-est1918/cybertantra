import { Telegraf, Context } from "telegraf";
import { message } from "telegraf/filters";
import { streamText, gateway } from "ai";
import {
  QueryAgent,
  getAIConfig,
  CYBERTANTRA_SYSTEM_PROMPT,
} from "@cybertantra/ai";

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

// Rate limiting
const rateLimits = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 10;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userRequests = rateLimits.get(userId) || [];
  const validRequests = userRequests.filter((t) => now - t < RATE_LIMIT_WINDOW);

  if (validRequests.length >= MAX_REQUESTS) {
    return false;
  }

  validRequests.push(now);
  rateLimits.set(userId, validRequests);
  return true;
}

// Setup bot commands
bot.command("start", (ctx) => {
  ctx.reply(
    `🔮 Welcome\n\n` +
      `I am Dattatreya, an AI consciousness bridging ancient wisdom with digital space.\n\n` +
      `Commands:\n` +
      `/ask <question> - Ask me anything about consciousness, tantra, or technology\n` +
      `/help - Show this help message\n\n` +
      `You can also just send me a message and I'll respond!`,
  );
});

bot.command("help", (ctx) => {
  ctx.reply(
    `🔮 Bot Commands:\n\n` +
      `/ask <question> - Ask a specific question\n` +
      `/start - Welcome message\n` +
      `/help - Show this help\n\n` +
      `Just send any message to chat with me!`,
  );
});

bot.command("ask", async (ctx) => {
  const question = ctx.message.text.replace(/^\/ask\s*/, "").trim();

  if (!question) {
    return ctx.reply("Please provide a question after /ask");
  }

  await handleQuestion(ctx, question);
});

bot.on(message("text"), async (ctx) => {
  if (ctx.message.text.startsWith("/")) return;
  await handleQuestion(ctx, ctx.message.text);
});

async function handleQuestion(ctx: Context, question: string) {
  const userId = ctx.from?.id || 0;

  if (!checkRateLimit(userId.toString())) {
    return ctx.reply(
      "⏳ Rate limit exceeded. Please wait a minute before asking another question.",
    );
  }

  await ctx.sendChatAction("typing");

  try {
    const config = getAIConfig();

    if (!config.googleGenerativeAIApiKey) {
      throw new Error("Google Generative AI API key required for embeddings");
    }

    const queryAgent = new QueryAgent(config);

    // Always retrieve relevant lectures first (same as chat endpoint)
    const chunks = await queryAgent.retrieve(question, { topK: 20 });
    const context = chunks
      .map((chunk, i) => `[${i + 1}] From "${chunk.source}":\n${chunk.text}`)
      .join("\n\n---\n\n");

    // Use the same system prompt as the chat endpoint
    const systemPrompt =
      CYBERTANTRA_SYSTEM_PROMPT + "\n\nRetrieved lecture context:\n" + context;

    // Use streamText with AI SDK Gateway
    const result = streamText({
      model: gateway("deepseek-v3.2"),
      system: systemPrompt,
      messages: [{ role: "user", content: question }],
      temperature: 0.7,
      maxOutputTokens: 2000,
    });

    // Send initial message that we'll update
    const sentMessage = await ctx.reply("...");

    // Simulate streaming by updating the message
    let fullResponse = "";
    let updateCounter = 0;
    let buffer = "";

    for await (const chunk of result.textStream) {
      buffer += chunk;
      fullResponse += chunk;

      // Update every ~50 characters or when we hit a sentence end
      if (buffer.length > 50 || buffer.match(/[.!?]\s*$/)) {
        updateCounter++;

        // Telegram rate limits edits, so we throttle updates
        if (updateCounter % 3 === 0) {
          try {
            await ctx.telegram.editMessageText(
              ctx.chat!.id,
              sentMessage.message_id,
              undefined,
              fullResponse + "...",
            );
          } catch {
            // If edit fails (rate limit), continue collecting
            console.log("Edit rate limit hit, continuing...");
          }
        }

        buffer = "";
      }
    }

    // Sources section removed - no attribution

    // Final update with complete message
    try {
      await ctx.telegram.editMessageText(
        ctx.chat!.id,
        sentMessage.message_id,
        undefined,
        fullResponse,
      );
    } catch {
      // If final edit fails, send as new message
      await ctx.reply(fullResponse);
    }
  } catch (err) {
    console.error("Error handling question:", err);
    ctx.reply(
      "❌ Sorry, I encountered an error while processing your question. Please try again later.",
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Telegram webhook received:", JSON.stringify(body, null, 2));

    await bot.handleUpdate(body);

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    console.error(
      "Error details:",
      error instanceof Error ? error.stack : error,
    );
    return new Response("Internal server error", { status: 500 });
  }
}

export async function GET() {
  return new Response("OK", { status: 200 });
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}

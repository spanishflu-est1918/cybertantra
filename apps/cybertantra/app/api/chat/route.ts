import { streamText } from "ai";
import { CYBERTANTRA_SYSTEM_PROMPT } from "@cybertantra/ai";
import { validateRequest, corsHeaders } from "../middleware";

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: await corsHeaders() });
}

export async function POST(req: Request) {
  // Validate request (API key + rate limit)
  const validationError = await validateRequest();
  if (validationError) return validationError;

  const { messages } = await req.json();

  if (!messages || messages.length === 0) {
    return new Response("No messages provided", { status: 400 });
  }

  try {
    // Use streamText with AI SDK Gateway (model string)
    const result = streamText({
      model: "anthropic/claude-opus-4.5",
      system: CYBERTANTRA_SYSTEM_PROMPT,
      messages,
      temperature: 0.85,
      maxOutputTokens: 8000,
    });

    // Return the stream response with CORS headers
    const response = result.toTextStreamResponse();
    const headers = await corsHeaders();
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Chat failed",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

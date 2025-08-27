import { ConversationStore } from "@cybertantra/database";

const store = new ConversationStore();

// GET /api/sessions/[sessionId]/stats - Get conversation statistics
export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const stats = await store.getStats(sessionId);
    
    if (!stats) {
      return new Response("Session not found", { status: 404 });
    }
    
    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to get session stats:", error);
    return new Response(
      JSON.stringify({ error: "Failed to get session stats" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
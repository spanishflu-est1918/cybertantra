import { ConversationStore } from "@cybertantra/database";

const store = new ConversationStore();

// GET /api/sessions - List recent conversations
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "10");
    
    const sessions = await store.listRecent(limit);
    
    return new Response(JSON.stringify(sessions), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to list sessions:", error);
    return new Response(
      JSON.stringify({ error: "Failed to list sessions" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// DELETE /api/sessions/[sessionId] - Delete a conversation
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.pathname.split("/").pop();
    
    if (!sessionId) {
      return new Response("Session ID required", { status: 400 });
    }
    
    const deleted = await store.delete(sessionId);
    
    if (!deleted) {
      return new Response("Session not found", { status: 404 });
    }
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to delete session:", error);
    return new Response(
      JSON.stringify({ error: "Failed to delete session" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
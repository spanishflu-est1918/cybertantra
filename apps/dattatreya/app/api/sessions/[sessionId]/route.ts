import { ConversationStore } from "@cybertantra/database";

const store = new ConversationStore();

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  if (!sessionId) {
    return new Response("Session ID required", { status: 400 });
  }

  try {
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
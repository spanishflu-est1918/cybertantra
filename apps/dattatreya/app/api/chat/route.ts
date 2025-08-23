export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Forward to cybertantra API with authentication
    const endpoint =
      process.env.NODE_ENV === "development"
        ? "http://localhost:9999/api/dattatreya"
        : "https://cybertantra-omega.vercel.app/api/dattatreya";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.CYBERTANTRA_API_KEY || "",
      },
      body: JSON.stringify(body),
    });

    // Just pipe the response through directly
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    console.error("Chat proxy error:", error);
    return new Response("Proxy error", { status: 500 });
  }
}

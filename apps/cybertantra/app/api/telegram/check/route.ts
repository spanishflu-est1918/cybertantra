export async function GET() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return new Response('TELEGRAM_BOT_TOKEN not configured', { status: 500 });
  }
  
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getWebhookInfo`
    );
    
    const result = await response.json();
    
    if (result.ok) {
      const info = result.result;
      return new Response(
        JSON.stringify({
          url: info.url || 'No webhook set',
          has_custom_certificate: info.has_custom_certificate,
          pending_update_count: info.pending_update_count,
          last_error_date: info.last_error_date,
          last_error_message: info.last_error_message,
          max_connections: info.max_connections,
          allowed_updates: info.allowed_updates
        }, null, 2),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } else {
      return new Response(
        `Failed to get webhook info: ${result.description}`,
        { status: 500 }
      );
    }
  } catch (error) {
    return new Response(
      `Error checking webhook: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    );
  }
}
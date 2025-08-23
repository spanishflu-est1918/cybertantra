export async function GET(req: Request) {
  const host = req.headers.get('host');
  const protocol = req.headers.get('x-forwarded-proto') || 'https';
  const baseUrl = `${protocol}://${host}`;
  
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return new Response('TELEGRAM_BOT_TOKEN not configured', { status: 500 });
  }
  
  try {
    // First, check current webhook info
    const infoResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getWebhookInfo`
    );
    const info = await infoResponse.json();
    
    // Set webhook URL
    const webhookUrl = `${baseUrl}/api/telegram/webhook`;
    
    // Debug: show what we're attempting
    console.log('Attempting to set webhook to:', webhookUrl);
    
    // Ensure HTTPS
    if (!webhookUrl.startsWith('https://')) {
      return new Response(
        `❌ Webhook URL must use HTTPS. Got: ${webhookUrl}`,
        { status: 400 }
      );
    }
    
    // Validate URL format
    try {
      new URL(webhookUrl);
    } catch {
      return new Response(
        `❌ Invalid URL format: ${webhookUrl}`,
        { status: 400 }
      );
    }
    
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
    );
    
    const result = await response.json();
    
    if (result.ok) {
      return new Response(
        `✅ Webhook set successfully!\n\nWebhook URL: ${webhookUrl}\n\nPrevious webhook: ${info.result?.url || 'none'}\n\nYour Telegram bot is now ready to receive messages.`,
        { status: 200 }
      );
    } else {
      return new Response(
        `❌ Failed to set webhook: ${result.description}\n\nAttempted URL: ${webhookUrl}\n\nCurrent webhook: ${info.result?.url || 'none'}`,
        { status: 500 }
      );
    }
  } catch (error) {
    return new Response(
      `Error setting webhook: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    );
  }
}
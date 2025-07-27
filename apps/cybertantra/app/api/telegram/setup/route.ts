export async function GET(req: Request) {
  const url = new URL(req.url);
  const baseUrl = url.searchParams.get('url');
  
  if (!baseUrl) {
    return new Response(
      'Please provide webhook URL: /api/telegram/setup?url=https://your-domain.vercel.app',
      { status: 400 }
    );
  }
  
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return new Response('TELEGRAM_BOT_TOKEN not configured', { status: 500 });
  }
  
  try {
    // Set webhook URL
    const webhookUrl = `${baseUrl}/api/telegram/webhook`;
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
    );
    
    const result = await response.json();
    
    if (result.ok) {
      return new Response(
        `✅ Webhook set successfully!\n\nWebhook URL: ${webhookUrl}\n\nYour Telegram bot is now ready to receive messages.`,
        { status: 200 }
      );
    } else {
      return new Response(
        `❌ Failed to set webhook: ${result.description}`,
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
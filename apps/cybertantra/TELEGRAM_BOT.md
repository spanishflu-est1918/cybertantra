# Telegram Bot Setup

The Telegram bot is integrated directly into the Cybertantra app.

## Setup

1. **Deploy to Vercel** (if not already deployed)
   ```bash
   vercel
   ```

2. **Set the webhook** by visiting:
   ```
   https://cybertantra-omega.vercel.app/api/telegram/setup?url=https://cybertantra-omega.vercel.app
   ```

3. **Test your bot** - Message your bot on Telegram!

## How it works

- Webhook endpoint: `/api/telegram/webhook`
- Uses the same RAG system as the web interface
- Rate limited to 10 requests/minute per user
- Automatically splits long responses

## Commands

- `/start` - Welcome message
- `/help` - Show commands
- `/ask <question>` - Ask a question
- Or just send any message to chat!
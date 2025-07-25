# Cybertantra Terminal

AI-powered terminal interface for exploring consciousness through lecture content.

## Setup

1. Copy `.env.example` to `.env` and fill in your API keys:
   ```bash
   cp .env.example .env
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Run the development server:
   ```bash
   pnpm dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- Terminal-based UI with CRT effects and themes
- AI chat integration with Kimi K2 model via OpenRouter
- RAG-powered search through lecture database (PostgreSQL + pgvector)
- Custom commands for searching and querying
- Shared terminal components with other projects via `terminal-core`

## Architecture

This project uses a modular architecture:
- **Shared UI**: Terminal components from `terminal-core` (symlinked)
- **Configuration**: Project-specific setup in `terminal-config.tsx`
- **API Routes**: 
  - `/api/chat` - AI chat endpoint
  - `/api/query` - RAG-powered queries with context
  - `/api/search` - Vector similarity search
- **Database**: PostgreSQL with pgvector extension for semantic search
- **AI Integration**: Mastra framework for agent orchestration

## Commands

- `/help` - Show available commands
- `search <query>` - Search lecture database
- `query <question>` - Ask AI with context from lectures
- `theme` - Change terminal theme
- `clear` - Clear terminal
- Start any message with `/` to chat with AI

## Environment Variables

See `.env.example` for required environment variables:
- `OPENROUTER_API_KEY` - For AI chat
- `OPENAI_API_KEY` - For embeddings
- `POSTGRES_*` - Database connection
- `ELEVENLABS_API_KEY` - Optional: for text-to-speech

## Development

The terminal interface is shared between projects. Changes to core terminal components should be made in the `terminal-core` directory.

Project-specific features and customizations should be added through the configuration in `terminal-config.tsx`.
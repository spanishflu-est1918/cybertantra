# Cybertantra Backend Integration

This document explains how the cybertantra-backend has been integrated into the monorepo.

## Architecture

The backend functionality has been split into reusable packages:

### Packages

1. **@cybertantra/database** - Database client and schemas
   - Shared PostgreSQL connection using @vercel/postgres
   - pgvector extension support
   - Ingestion tracking schemas

2. **@cybertantra/ai** - AI and RAG functionality
   - QueryAgent for RAG-powered Q&A
   - Embedding generation
   - Conversation memory
   - Configurable AI providers

3. **@cybertantra/lecture-tools** - Lecture processing utilities
   - Text file ingestion
   - Intelligent chunking
   - Audio transcription
   - Book compilation tools

4. **@cybertantra/cli** - Command-line tools
   - Database setup
   - Lecture ingestion
   - Interactive query interface
   - Chat with memory

### API Routes

The following routes are now available in the cybertantra app:

- `POST /api/query` - RAG-powered question answering
- `POST /api/search` - Direct vector search
- `POST /api/outline` - Generate chapter outlines

## Setup

1. Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up the database:
   ```bash
   pnpm run cli:setup
   ```

4. Ingest lecture files:
   ```bash
   pnpm run cli:ingest ./lectures
   ```

## Usage

### Web API

Start the development server:
```bash
pnpm run dev:cybertantra
```

Then query the API:
```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What is digital tantra?"}'
```

### CLI Tools

Interactive query:
```bash
pnpm run cli:query
```

Chat with memory:
```bash
pnpm run cli:chat
```

## Environment Variables

Required:
- `POSTGRES_URL` - Vercel Postgres connection
- `AI_GATEWAY_API_KEY` - For AI SDK Gateway (Claude, Kimi)
- `OPENAI_API_KEY` - For embeddings
- `GOOGLE_GENERATIVE_AI_API_KEY` - For Gemini embeddings during ingestion

Optional:
- `ELEVENLABS_API_KEY` - Text-to-speech
- `ASSEMBLYAI_API_KEY` - Audio transcription

## Deployment

The API routes are ready for Vercel deployment. Just push to your repository and Vercel will:

1. Install dependencies
2. Build the Next.js app
3. Deploy the API routes as serverless functions

Make sure to set all required environment variables in your Vercel project settings.

## Local Development with Bun

The CLI tools use Bun for fast local execution. Install Bun from https://bun.sh if you haven't already.

All ingestion and admin tasks should be run locally using the CLI tools, not through the web API.
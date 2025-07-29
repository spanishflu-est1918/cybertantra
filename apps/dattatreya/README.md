# Dattatreya

A conversational AI agent focused on spiritual wisdom, powered by the Cybertantra RAG infrastructure.

## Features

- Clean, simple conversational interface
- Browser-based text-to-speech using Web Speech API
- RAG-powered responses from the Cybertantra lecture database
- Minimal, distraction-free design

## Running the app

```bash
# From the monorepo root
pnpm install
pnpm run dev --filter=dattatreya
```

The app will be available at http://localhost:3002

## Environment Variables

Uses the same environment variables as the main Cybertantra app for:
- Database connection (PostgreSQL with pgvector)
- OpenRouter API configuration

## Tech Stack

- Next.js 15
- React 19
- TailwindCSS
- Web Speech API for TTS
- @cybertantra/ai for RAG functionality
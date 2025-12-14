# CLAUDE.md - Instructions for Claude

## CRITICAL RULES

1. **NEVER RUN DEV SERVERS OR BACKGROUND PROCESSES**
   - DO NOT run `npm run dev`, `npm start`, `pnpm dev`, or any similar commands
   - DO NOT run any process that stays running in the background
   - The human runs these commands, NOT Claude

2. **DO NOT RUN BUILD UNLESS EXPLICITLY ASKED**
   - DO NOT run `pnpm run build` or `npm run build` unless the user specifically requests it

3. **USE PNPM, NOT NPM**
   - Always use `pnpm` for package management
   - Use `pnpm install`, `pnpm add`, etc.

## Project Context

This is the Cybertantra terminal app with:
- Backend AI capabilities integrated from cybertantra-backend
- RAG system for querying lecture corpus about Tantra, Cyberspace, etc.
- API routes for query, search, and outline generation
- Uses port 9999 for development server
- Shared packages:
  - `@cybertantra/database` - PostgreSQL with pgvector
  - `@cybertantra/ai` - QueryAgent for RAG functionality
  - `@cybertantra/lecture-tools` - Ingestion and processing

## Key Features
- Terminal-based UI with CRT effects
- AI chat using AI SDK Gateway (Claude, Kimi)
- Vector search through lecture database using pgvector
- API endpoints:
  - `/api/query` - RAG-powered Q&A
  - `/api/search` - Direct vector search
  - `/api/outline` - Chapter outline generation
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

This is a combined project that merges:
- Terminal interface from the gorka portfolio (shared via terminal-core)
- Backend AI capabilities from cybertantra (lecture search, RAG, etc.)

Key features:
- Terminal-based UI with CRT effects and themes
- AI chat using OpenRouter with multiple models
- Vector search through lecture database
- Text-to-speech generation
- Shared components and styles via symlinks

## Architecture

- `/terminal-core/` - Shared terminal UI components and styles
- `/app/api/chat/` - Regular AI chat endpoint
- `/app/api/query/` - Specialized cybertantra query endpoint with RAG
- `/lib/agent.ts` - Mastra agent configuration with tools
- Shared .env file via symlinks
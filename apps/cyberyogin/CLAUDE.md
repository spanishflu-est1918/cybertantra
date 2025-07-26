# CLAUDE.md - Instructions for Claude

## CRITICAL RULES

1. **NEVER RUN DEV SERVERS OR BACKGROUND PROCESSES**
   - DO NOT run `npm run dev`, `npm start`, `pnpm dev`, or any similar commands
   - DO NOT run any process that stays running in the background
   - The human runs these commands, NOT Claude
   - Claude is not the human and does not have the capability to run stuff in the background
   - NEVER, EVER, DO PNPM DEV OR ANYTHING OF THE SORT. YOU ARE NOT THE MAIN CHARACTER

2. **DO NOT RUN BUILD UNLESS EXPLICITLY ASKED**
   - DO NOT run `pnpm run build` or `npm run build` unless the user specifically requests it
   - The user will tell you when they want to build
   - DO NOT RUN BUILD UNLESS EXPLICITLY ASKED
   - DO NOT RUN BUILD UNLESS EXPLICITLY ASKED
   - DO NOT RUN BUILD UNLESS EXPLICITLY ASKED

3. **USE PNPM, NOT NPM**
   - Always use `pnpm` for package management
   - Use `pnpm install`, `pnpm add`, etc.

## Project Context

Terminal-based portfolio with:
- AI chat using OpenRouter with Kimi K2 model (NOT OpenAI)
- Modular architecture (separate UI from functionality)
- AI prompts stored in .md files
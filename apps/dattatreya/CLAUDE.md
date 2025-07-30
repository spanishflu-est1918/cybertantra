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

Dattatreya is a conversational AI agent with:
- Minimalist black & white aesthetic inspired by occult/mystical themes
- Browser-based text-to-speech using Web Speech API
- RAG-powered responses via @cybertantra/ai package
- Clean, distraction-free interface focused on spiritual wisdom
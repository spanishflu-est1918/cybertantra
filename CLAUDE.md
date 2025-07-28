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

## Terminal Structure

### Main Components
- **Terminal Component** (`/packages/ui/components/Terminal.tsx`): Main UI handling rendering, input, boot sequence, command history
- **Terminal Context** (`/packages/ui/lib/contexts/TerminalContext.tsx`): Global state management including history, browsers, vim mode
- **Command Executor** (`/packages/ui/lib/hooks/useCommandExecutor.ts`): Routes commands to appropriate handlers

### Command Processing
1. Commands processed by `handleCommand` in `/packages/ui/lib/commands/index.ts`
2. Checks for system commands, file system commands, slash commands
3. Slash commands defined in `/packages/ui/lib/commands/slashCommands.ts`
4. Unknown commands fall back to AI chat

### Special Modes
- **Vim Mode**: Full-screen editor activated by `vim` command
- **Browser Modes**: Help (`/help`), Work (`/work`), Resume (`/resume`), Themes (`/themes`), Music (`/music`), Dattatreya (`/dattatreya`)
- **Hidden Features**: `.secrets` file, special system info returns

### Key Bindings
- `Ctrl+L` or `Cmd+K`: Clear terminal
- `Escape`: General escape handler
- Arrow keys: Navigate history and browsers
- Vim keybindings when in vim mode
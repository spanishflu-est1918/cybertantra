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
   - This is a pnpm workspace monorepo

## Project Overview

This is a Turborepo monorepo containing three interconnected AI-powered terminal applications and shared packages. The project combines spiritual/consciousness exploration with modern AI technology through terminal-based interfaces.

## Monorepo Structure

```
cybertantra/
├── apps/
│   ├── cybertantra/     # Main AI terminal for consciousness exploration (port 9999)
│   ├── cyberyogin/      # Personal portfolio with terminal UI (port 7777)
│   └── dattatreya/      # Conversational AI with voice interface (port 3002)
├── packages/
│   ├── ui/              # Shared terminal UI components
│   ├── ai/              # AI agents, RAG system, and prompts
│   ├── database/        # PostgreSQL with pgvector for embeddings
│   ├── lecture-tools/   # Tools for processing lecture content
│   └── cli/             # Command-line tools for data ingestion
├── lectures/            # Text corpus for RAG system
└── turbo.json          # Turborepo configuration
```

## Applications

### 1. Cybertantra (`apps/cybertantra`) - Port 9999
**Main consciousness exploration terminal**
- RAG-powered Q&A system using lecture corpus
- Vector search via pgvector PostgreSQL extension
- Telegram bot integration for remote access
- Multiple specialized browsers (Query, Search, Help, Music)
- API Endpoints:
  - `/api/chat` - Standard AI chat
  - `/api/query` - RAG-enhanced queries
  - `/api/search` - Vector similarity search
  - `/api/outline` - Generate chapter outlines
  - `/api/rag` - Direct RAG interface
  - `/api/telegram/*` - Telegram bot endpoints

### 2. Cyberyogin (`apps/cyberyogin`) - Port 7777
**Personal portfolio and creative terminal**
- Terminal-based portfolio interface
- Multiple browser modes (Work, Resume, Themes, Music, Dattatreya)
- VAPI voice assistant integration
- Temple mode with mantras
- Custom themes and CRT effects
- API Endpoints:
  - `/api/chat` - AI chat with personality
  - `/api/resume` - Resume data endpoint
  - `/api/vapi/webhook` - Voice assistant webhook

### 3. Dattatreya (`apps/dattatreya`) - Port 3002
**Voice-enabled conversational AI**
- Minimalist black & white aesthetic
- Browser-based speech recognition and synthesis
- Multiple transcription methods (AssemblyAI, Groq, Replicate)
- Real-time streaming responses
- API Endpoints:
  - `/api/chat` - Conversational AI with Dattatreya personality
  - `/api/transcribe` - Speech-to-text transcription
  - `/api/transcribe-ai-sdk` - Alternative transcription endpoint
  - `/api/health` - Health check endpoint

## Shared Packages

### @cybertantra/ui
- Reusable terminal components (Terminal, VimMode, CRTEffect)
- Command processing system (system, filesystem, slash commands)
- Browser framework for modal interfaces
- Hooks for terminal functionality
- Theme system with multiple presets

### @cybertantra/ai
- QueryAgent for RAG functionality
- Mastra agent integration
- Prompt management for different AI personalities
- ElevenLabs text-to-speech integration
- Search functions for lecture database

### @cybertantra/database
- PostgreSQL client with pgvector support
- Database schemas for embeddings and conversations
- Migration scripts
- Ingestion tracking

### @cybertantra/lecture-tools
- Intelligent text chunking for embeddings
- YouTube transcription and download
- Lecture summarization utilities
- Book compilation tools

### @cybertantra/cli
- Setup scripts for database initialization
- Data ingestion commands
- Query testing tools
- Transcription utilities

## Key Technologies

- **Frontend**: Next.js 15.4 with Turbopack, React 19, TypeScript
- **AI/LLM**: AI SDK Gateway (Claude, Gemini, Kimi), OpenAI, Groq, AssemblyAI
- **Database**: PostgreSQL with pgvector extension
- **RAG**: Mastra framework with custom agents
- **Voice**: Web Speech API, ElevenLabs, VAPI
- **Styling**: Tailwind CSS v4
- **Package Manager**: pnpm with workspaces
- **Build Tool**: Turborepo

## Environment Variables

Required environment variables across apps:
- `AI_GATEWAY_API_KEY` - For LLM access via Vercel AI SDK Gateway
- `OPENAI_API_KEY` - OpenAI API access
- `POSTGRES_URL` - Database connection
- `POSTGRES_URL_NON_POOLING` - Direct database connection
- `ASSEMBLYAI_API_KEY` - Speech transcription
- `GOOGLE_GENERATIVE_AI_API_KEY` - Google AI services
- `ELEVENLABS_API_KEY` - Text-to-speech
- `TELEGRAM_BOT_TOKEN` - Telegram bot (cybertantra)
- `GROQ_API_KEY` - Groq transcription (dattatreya)
- `REPLICATE_API_TOKEN` - Replicate AI (dattatreya)
- `NEXT_PUBLIC_VAPI_*` - VAPI voice assistant (dattatreya)

## Development Commands

```bash
# Install dependencies
pnpm install

# Run all apps
pnpm dev

# Run specific app
pnpm dev:cybertantra  # Port 9999
pnpm dev:cyberyogin   # Port 7777
pnpm dev:dattatreya   # Port 3002

# Build everything
pnpm build

# Lint and typecheck
pnpm lint
pnpm typecheck
```

## CLI Tools

All CLI commands run with Bun and include interactive prompts, spinners, and colored output.

### Core Data Pipeline

```bash
# Database initialization and setup
pnpm cli:setup

# Ingest lecture content into RAG database with embeddings
# Defaults to ./lectures directory
pnpm cli:ingest

# Test RAG queries against the corpus
pnpm cli:query

# Interactive CLI chat interface
pnpm cli:chat
```

### YouTube → RAG Pipeline

```bash
# Download YouTube videos as audio
pnpm cli:youtube "URL" ["URL2"] ["URL3"]...
# Options: -o <dir>, --format <format>
# Note: Quotes required for URLs with ? or & characters

# Transcribe audio files (scan directory, then process)
pnpm cli:transcribe
# Commands: scan -d <dir>, process -d <dir> -y

# 🔥 COMPLETE PIPELINE: Download → Transcribe → Ingest in one command
# Interactive - will prompt for content type (directory defaults to ./lectures)
pnpm cli:absorb "URL" ["URL2"] ["URL3"]...
# Options: -o <dir>, --format <format>
# Example: pnpm cli:absorb "https://youtube.com/watch?v=abc123"
# Note: Quotes required for URLs with ? or & characters
```

### Meditation Generation

```bash
# Generate complete guided meditations with AI script, narration, and music
pnpm cli:meditate
# Interactive prompts for:
#   - Topic (e.g., "Ganesha", "Heart Chakra")
#   - Duration (5-30 minutes)
#   - Audio generation (ElevenLabs narration)
#   - Music generation (background music mixing)
# Outputs:
#   - Saves to public/audio/meditations/
#   - Creates database entry with shareable URL
#   - Example: https://dattatreya.vercel.app/meditation/{slug}

# Test meditation text generation only
pnpm cli:test-text

# Test text-to-speech only
pnpm cli:test-tts
```

### Audio Processing

```bash
# Extract vocals using Spleeter via Replicate API
pnpm cli:extract-vocals <input-file-or-directory>
# Options:
#   -s, --stems <2|4|5>  Number of stems (default: 2)
#   -o, --output <dir>   Output directory
#   -c, --concurrent <n> Max concurrent jobs (default: 4)
# Outputs:
#   - Vocals (isolated speech)
#   - Accompaniment (music/background)
#   - Optional: drums, bass, piano, other (with 4/5 stems)
# Use case: Perfect for training custom ElevenLabs voice clones
```

### Database Maintenance

```bash
# Batched database backup
pnpm cli:backup

# Run database migrations
pnpm cli:migrate

# Import Skyler conversation data
pnpm cli:import-skyler
```

### Direct Lecture Tools

These run from the root and use the lecture-tools package directly:

```bash
# Direct transcription script
pnpm transcribe

# Batch video transcription
pnpm transcribe-videos

# Video download utility
pnpm download-videos
```

### Additional CLI Scripts (Not Exposed in Root)

Available by running directly from `packages/cli/`:

```bash
cd packages/cli

# Clean up bad ingestion data
bun run src/commands/clean-bad-ingestion.ts

# Regenerate embeddings for existing content
bun run src/commands/regenerate-embeddings.ts

# Remove content by author
bun run src/commands/remove-author.ts

# Restore from backup
bun run src/commands/restore-backup.ts

# Test ingestion process
bun run src/commands/test-ingest.ts

# Test long-form text-to-speech
bun run src/commands/test-long-tts.ts
```

### CLI Tool Technology Stack

- **Runtime**: Bun (for fast execution)
- **CLI Framework**: Commander.js for argument parsing
- **UX Libraries**:
  - `chalk` - Colored terminal output
  - `ora` - Elegant spinners
  - `inquirer` - Interactive prompts
  - `p-limit` - Concurrency control
- **AI Services**:
  - AssemblyAI - Speech transcription
  - ElevenLabs - Text-to-speech narration
  - Replicate - Spleeter vocal separation
  - AI SDK Gateway - Text generation (Claude, Gemini, Kimi)
- **Audio Processing**:
  - `fluent-ffmpeg` - Audio manipulation
  - `yt-dlp-wrap` - YouTube download

## Terminal Features

### Command System
- **System Commands**: clear, help, whoami, date, echo
- **File System**: ls, cd, cat, pwd, mkdir (virtual filesystem)
- **Slash Commands**: /help, /work, /resume, /themes, /music, /dattatreya
- **Vim Mode**: Full-screen text editor with vim keybindings
- **Hidden Features**: .secrets file, special returns in system info

### Browser System
Each app can define custom browsers that appear as modal overlays:
- Navigate with arrow keys
- Select with Enter
- Close with Escape
- Each browser has its own data and formatting

### Themes
Multiple terminal themes available:
- Matrix (green on black)
- Cyberpunk (neon colors)
- Retro (amber CRT)
- Dracula, Nord, Solarized
- Custom theme creation supported

## Architecture Patterns

1. **Shared UI Components**: All apps use @cybertantra/ui for consistent terminal experience
2. **Modular Browsers**: Each app defines its own browser components
3. **Command Processors**: Centralized command handling with app-specific extensions
4. **AI Integration**: Unified AI agents through @cybertantra/ai package
5. **Database Abstraction**: Shared database layer for all apps
6. **Configuration-Based**: Apps configure shared components via terminal-config.tsx

## Important Implementation Notes

- Terminal UI is fully keyboard-driven with extensive shortcuts
- All AI responses stream in real-time for better UX
- Virtual filesystem persists in localStorage
- Conversation history is maintained per session
- Boot sequences provide immersive terminal experience
- CRT effects and scan lines for authentic retro feel
- Mobile responsive with touch support
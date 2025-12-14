# Cybertantra Monorepo

A monorepo containing AI-powered terminal applications.

## Structure

```
cybertantra/
├── apps/
│   ├── cybertantra/  # AI terminal for exploring consciousness
│   └── cyberyogin/   # Personal portfolio site
├── packages/
│   ├── ui/           # Shared terminal UI components
│   ├── database/     # Database utilities (coming soon)
│   └── ai/           # AI agents and tools (coming soon)
└── pnpm-workspace.yaml
```

## Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Run development servers:
   ```bash
   # Run both apps
   pnpm dev

   # Run specific app
   pnpm dev:cybertantra
   pnpm dev:cyberyogin
   ```

3. Build all apps:
   ```bash
   pnpm build
   ```

## Apps

### Cybertantra (`apps/cybertantra`)
AI-powered terminal for exploring consciousness through lecture content.
- Runs on: http://localhost:3000
- Features: AI chat, RAG search, lecture database

### Cyberyogin (`apps/cyberyogin`)
Personal portfolio site with terminal interface.
- Runs on: http://localhost:7770
- Features: Work showcase, music player, themes

## Shared Packages

### @cybertantra/ui
Shared terminal UI components including:
- Terminal interface with CRT effects
- Command execution system
- Theme management
- TypewriterText animations
- Loading indicators

## Development

Each app can be developed independently while sharing common components through the `@cybertantra/ui` package. Changes to shared components are immediately reflected in all apps.

## Environment Variables

Copy `.env.example` to `.env` in the root directory and configure:
- `AI_GATEWAY_API_KEY` - For AI chat via Vercel AI SDK Gateway
- `OPENAI_API_KEY` - For embeddings
- `POSTGRES_*` - Database connection
- `ELEVENLABS_API_KEY` - Optional: for text-to-speech
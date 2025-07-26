# Next Steps - Cybertantra Backend Integration

## Current Status
✅ Backend structure integrated into monorepo
✅ Shared packages created: @cybertantra/database, @cybertantra/ai, @cybertantra/lecture-tools
✅ Database connection working
✅ API routes created: /api/chat, /api/query, /api/search
✅ Mastra agent with retrieval tool implemented

## Remaining Issues to Fix

### 1. AI SDK Version Conflicts
- Root has @ai-sdk/openai 2.0.0-beta.12
- Apps have @ai-sdk/openai 1.3.23
- Need to align all to same version

**Fix:**
```bash
# Update all packages to use same AI SDK version
pnpm update @ai-sdk/openai@2.0.0-beta.12 -r
```

### 2. Embedding Model Issue
Error: "Unsupported model version v1 for provider openai.embedding"

**Fix:** Update the embedding call to use v2 format:
```typescript
// In query-agent.ts
const openai = createOpenAI({
  apiKey: this.config.openAIApiKey,
});

const { embeddings } = await openai.embeddings.create({
  model: EMBEDDING_MODEL,
  input: query,
});
```

### 3. Missing Dependencies
- packages/cli needs AssemblyAI if using transcription
- Some imports in lecture-tools still broken

### 4. Test the System
```bash
# Test search (only needs OpenAI key)
curl -X POST http://localhost:9999/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "tantra", "limit": 2}'

# Test chat (needs both OpenAI + OpenRouter keys)
# Use the terminal interface or test via API
```

## Quick Reference

### Environment Variables Required
```env
POSTGRES_URL=           # Your Vercel Postgres
OPENAI_API_KEY=         # For embeddings
OPENROUTER_API_KEY=     # For Kimi K2 chat model
```

### CLI Commands
```bash
pnpm run cli:setup      # Setup database
pnpm run cli:ingest     # Ingest lectures (needs fixes)
pnpm run cli:query      # Query interface
```

### Start Server
```bash
pnpm run dev:cybertantra  # Runs on port 9999
```

## Architecture Summary
- Terminal chat ALWAYS uses RAG via Mastra agent
- Agent has retrieval tool that searches lecture corpus
- All responses grounded in actual lecture content
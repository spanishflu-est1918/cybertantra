# Cybertantra API Documentation

## Authentication

All API endpoints require authentication via API key in the `x-api-key` header.

```bash
curl -X POST https://cybertantra-omega.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

## Rate Limiting

- **Limit**: 10 requests per minute per API key
- **Headers**: Rate limit info returned in response headers:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining in current window
  - `X-RateLimit-Reset`: When the rate limit resets

## Endpoints

### POST /api/chat
AI chat with RAG retrieval from lecture corpus.

**Request:**
```json
{
  "messages": [
    {"role": "user", "content": "Your question here"}
  ]
}
```

**Response:** Streaming text response

### POST /api/query
Direct RAG query with structured response.

**Request:**
```json
{
  "query": "Your question about consciousness, tantra, etc."
}
```

**Response:**
```json
{
  "answer": "AI-generated answer",
  "sources": ["lecture1.md", "lecture2.md"],
  "chunks": [/* relevant text chunks */]
}
```

### POST /api/search
Vector similarity search without AI generation.

**Request:**
```json
{
  "query": "search terms",
  "limit": 10
}
```

**Response:**
```json
{
  "results": [
    {
      "text": "matching text",
      "source": "lecture.md",
      "similarity": 0.95
    }
  ]
}
```

### POST /api/outline
Generate chapter outline for a topic.

**Request:**
```json
{
  "topic": "The intersection of technology and consciousness"
}
```

**Response:**
```json
{
  "outline": "Generated chapter outline...",
  "sources": ["lecture1.md", "lecture2.md"]
}
```

### POST /api/rag
Pure RAG retrieval for external agents (e.g., VAPI).

**Request:**
```json
{
  "query": "What does Cybertantra say about consciousness?",
  "limit": 20  // optional, default 20
}
```

**Response:**
```json
{
  "query": "What does Cybertantra say about consciousness?",
  "chunks": [
    {
      "text": "Consciousness is the prime state...",
      "source": "lecture1.md",
      "similarity": 0.95
    }
  ],
  "context": "All chunks concatenated with \\n\\n"
}
```

## MCP Server

The MCP (Model Context Protocol) server allows AI assistants like Claude Desktop or Cursor to query the Guru directly.

**Endpoint:** `/api/mcp`

### Available Tools

#### query_guru
Ask the Guru a question using RAG-enhanced Q&A.

**Parameters:**
- `question` (string, required): The question to ask
- `topK` (number, optional): Number of passages to retrieve (default: 5, max: 20)

#### search_lectures
Search through lecture transcripts using vector similarity.

**Parameters:**
- `query` (string, required): The search query
- `limit` (number, optional): Max results to return (default: 10, max: 50)

#### generate_outline
Generate a detailed chapter outline for a topic.

**Parameters:**
- `topic` (string, required): The topic to generate an outline for

### Connecting to MCP Server

**Local Development:**
```bash
# Run the dev server
pnpm dev:cybertantra

# Test with MCP Inspector
npx @modelcontextprotocol/inspector@latest http://localhost:9999
```

**Claude Desktop Configuration:**
Add to your Claude Desktop config (`~/.claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "cybertantra-guru": {
      "url": "http://localhost:9999/api/mcp"
    }
  }
}
```

**Production (Vercel):**
```json
{
  "mcpServers": {
    "cybertantra-guru": {
      "url": "https://cybertantra-omega.vercel.app/api/mcp"
    }
  }
}
```

## Environment Variables

Required in Vercel:
- `DATABASE_URL`: PostgreSQL connection string
- `AI_GATEWAY_API_KEY`: For AI model access via Vercel AI SDK Gateway
- `GOOGLE_GENERATIVE_AI_API_KEY`: For embeddings
- `CYBERTANTRA_API_KEY`: Your secret API key
- `ALLOWED_ORIGINS`: Comma-separated list of allowed domains (optional)
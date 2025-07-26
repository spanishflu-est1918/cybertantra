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

## Environment Variables

Required in Vercel:
- `DATABASE_URL`: PostgreSQL connection string
- `OPENROUTER_API_KEY`: For AI model access
- `GOOGLE_GENERATIVE_AI_API_KEY`: For embeddings
- `CYBERTANTRA_API_KEY`: Your secret API key
- `ALLOWED_ORIGINS`: Comma-separated list of allowed domains (optional)
# Content Categories

## Overview
The Cybertantra RAG system supports categorized content ingestion and retrieval. Each piece of content is tagged with a category to enable filtered searches and specialized AI responses.

## Categories

### 📚 Lecture (`lecture`)
**Description:** Teaching material and educational content about tantra, consciousness, cyberspace, and spiritual practices.

**Content Types:**
- Academic lectures and talks
- Teaching transcripts
- Educational workshops
- Philosophical discussions
- Technical explanations

**Use Cases:**
- Learning core concepts
- Understanding theoretical frameworks
- Academic research
- Deep philosophical exploration

**Current Status:** ✅ **2,314 chunks from 74 files** (all existing content)

---

### 🧘 Meditation (`meditation`)
**Description:** Guided meditations, yoga nidras, and contemplative practices.

**Content Types:**
- Yoga nidra sessions
- Guided visualizations
- Breathing exercises (pranayama)
- Mantra practices
- Silent meditation instructions
- Body scan meditations

**Use Cases:**
- Personal practice guidance
- Relaxation and stress relief
- Consciousness exploration
- Sleep and deep rest
- Spiritual development

**Current Status:** ⏳ Ready for ingestion

---

### 📹 Video (`video`)
**Description:** Transcripts from video content including demonstrations, visual teachings, and recorded sessions.

**Content Types:**
- YouTube video transcripts
- Recorded workshop videos
- Visual demonstrations
- Documentary content
- Interview transcripts

**Use Cases:**
- Understanding visual teachings
- Following along with demonstrations
- Accessing multimedia content in text form
- Research from video sources

**Current Status:** ⏳ Ready for ingestion

---

### 🎙️ Show (`show`)
**Description:** Podcast episodes, radio shows, and conversational content.

**Content Types:**
- Podcast transcripts
- Radio show episodes
- Panel discussions
- Q&A sessions
- Informal conversations
- Guest interviews

**Use Cases:**
- Casual learning
- Entertainment with education
- Diverse perspectives
- Community discussions
- Real-world applications

**Current Status:** ⏳ Ready for ingestion

---

## Ingestion Process

### Using the CLI Tool
```bash
# Interactive ingestion with category selection
pnpm cli:ingest

# The tool will prompt for:
# 1. Category selection (lecture/meditation/video/show)
# 2. Directory path containing content
# 3. Author/teacher name
# 4. Optional tags (comma-separated)
# 5. Duration (for meditation/video content)
```

### Directory Structure Recommendation
```
content/
├── lectures/       # Teaching material
├── meditations/    # Yoga nidras and guided practices
├── videos/         # Video transcripts
└── shows/          # Podcast/show content
```

### Metadata Fields
Each ingested chunk includes:
- `category`: The content type (required)
- `author`: Creator/teacher name (default: "Unknown")
- `tags`: Array of descriptive tags (optional)
- `duration_minutes`: Length for timed content (optional)
- `source`: Original filename (automatic)
- `metadata`: Additional JSON data (automatic)

---

## Query Filtering

### API Usage
```javascript
// Query specific categories
const response = await fetch('/api/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key'
  },
  body: JSON.stringify({
    question: "What is yoga nidra?",
    categories: ["meditation"],  // Filter by category
    topK: 5
  })
});
```

### CLI Usage
```bash
# Direct query (searches all categories)
pnpm cli:query "What is consciousness?"

# Interactive mode with category filtering
pnpm cli:query
# Then select: "Meditations only" from the menu
```

### Programmatic Usage
```typescript
import { QueryAgent } from '@cybertantra/ai';

const agent = new QueryAgent(config);

// Query specific categories
const answer = await agent.query("Tell me about mantras", {
  categories: ["lecture", "meditation"],
  topK: 10
});

// Search with filters
const results = await agent.search("breathing techniques", {
  categories: ["meditation"],
  author: "Specific Teacher",
  tags: ["pranayama", "breathwork"]
});
```

---

## AI Response Behavior

The QueryAgent adapts its personality based on the content category:

- **Lectures:** Academic, thorough, cites sources, makes philosophical connections
- **Meditations:** Calming, instructional, practice-focused, mindful language
- **Videos:** Descriptive, references visual elements, demonstration-aware
- **Shows:** Conversational, accessible, acknowledges multiple perspectives

---

## Future Enhancements

### Planned Features
- [ ] Cross-category relationship mapping
- [ ] Automatic category detection during ingestion
- [ ] Sub-categories (e.g., `meditation.yoga_nidra`, `lecture.technical`)
- [ ] Category-specific embedding models
- [ ] Time-based filtering for meditations/videos
- [ ] Speaker identification in shows/videos

### Potential New Categories
- `practice`: Step-by-step practice instructions
- `scripture`: Sacred texts and translations
- `community`: User-generated content and discussions
- `research`: Academic papers and studies
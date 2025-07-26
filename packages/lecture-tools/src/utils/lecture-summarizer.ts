import { sql } from '@vercel/postgres';
import { generateText, generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

// Schema for structured summaries
const LectureSummarySchema = z.object({
  title: z.string(),
  mainTheme: z.string(),
  keyPoints: z.array(z.string()).max(7),
  concepts: z.array(z.object({
    name: z.string(),
    definition: z.string(),
    importance: z.enum(['critical', 'important', 'supporting']),
  })),
  quotes: z.array(z.object({
    text: z.string(),
    context: z.string(),
    significance: z.string(),
  })).max(5),
  connections: z.array(z.object({
    concept1: z.string(),
    concept2: z.string(),
    relationship: z.string(),
  })),
  practicalApplications: z.array(z.string()),
  bookSections: z.array(z.object({
    suggestedChapter: z.string(),
    relevantContent: z.string(),
    orderInChapter: z.number(),
  })),
  summary: z.string().max(500),
  expandedSummary: z.string().max(2000),
});

type LectureSummary = z.infer<typeof LectureSummarySchema>;

export class LectureSummarizer {
  async generateSummary(filename: string): Promise<LectureSummary> {
    // Get all chunks for this lecture
    const chunks = await sql`
      SELECT content, chunk_index, topics
      FROM lecture_chunks
      WHERE source = ${filename}
      ORDER BY chunk_index
    `;

    if (chunks.rows.length === 0) {
      throw new Error(`No chunks found for lecture: ${filename}`);
    }

    // Reconstruct full lecture text
    const fullText = chunks.rows.map(chunk => chunk.content).join('\n\n');
    
    // Extract topics from chunks
    const allTopics = new Set<string>();
    chunks.rows.forEach(chunk => {
      if (chunk.topics) {
        const topics = JSON.parse(chunk.topics);
        topics.forEach((topic: string) => allTopics.add(topic));
      }
    });

    // Generate structured summary using GPT-4
    const summary = await generateObject({
      model: openai('gpt-4-turbo-preview'),
      schema: LectureSummarySchema,
      prompt: `Analyze this lecture transcript and create a comprehensive summary.

Lecture: ${filename}
Topics detected: ${Array.from(allTopics).join(', ')}

Full transcript:
${fullText.slice(0, 15000)}${fullText.length > 15000 ? '...[truncated]' : ''}

Create a detailed summary that includes:
1. A compelling title for the lecture
2. The main overarching theme
3. 5-7 key points that capture the essence
4. Important concepts with clear definitions
5. Memorable quotes with context
6. Connections between ideas
7. Practical applications
8. Suggestions for book organization
9. Both brief and expanded summaries

Focus on extracting insights about Tantra, consciousness, technology, and their intersections.`,
      temperature: 0.3,
    });

    // Store summary in database
    await this.storeSummary(filename, summary.object);

    return summary.object;
  }

  private async storeSummary(filename: string, summary: LectureSummary): Promise<void> {
    await sql`
      INSERT INTO lecture_summaries (
        filename, 
        title,
        main_theme,
        key_points,
        concepts,
        quotes,
        connections,
        practical_applications,
        book_sections,
        summary,
        expanded_summary,
        created_at
      ) VALUES (
        ${filename},
        ${summary.title},
        ${summary.mainTheme},
        ${JSON.stringify(summary.keyPoints)},
        ${JSON.stringify(summary.concepts)},
        ${JSON.stringify(summary.quotes)},
        ${JSON.stringify(summary.connections)},
        ${JSON.stringify(summary.practicalApplications)},
        ${JSON.stringify(summary.bookSections)},
        ${summary.summary},
        ${summary.expandedSummary},
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (filename) 
      DO UPDATE SET
        title = EXCLUDED.title,
        main_theme = EXCLUDED.main_theme,
        key_points = EXCLUDED.key_points,
        concepts = EXCLUDED.concepts,
        quotes = EXCLUDED.quotes,
        connections = EXCLUDED.connections,
        practical_applications = EXCLUDED.practical_applications,
        book_sections = EXCLUDED.book_sections,
        summary = EXCLUDED.summary,
        expanded_summary = EXCLUDED.expanded_summary,
        updated_at = CURRENT_TIMESTAMP
    `;
  }

  async generateCorpusSynthesis(
    lectureFiles: string[]
  ): Promise<{
    overarchingThemes: string[];
    conceptMap: Map<string, string[]>;
    chronologicalProgression: Array<{ lecture: string; theme: string; date?: string }>;
    suggestedBookStructure: Array<{
      part: string;
      chapters: Array<{
        title: string;
        lectures: string[];
        theme: string;
      }>;
    }>;
  }> {
    // Get summaries for all specified lectures
    const summaries = await sql`
      SELECT * FROM lecture_summaries
      WHERE filename = ANY(${lectureFiles})
    `;

    if (summaries.rows.length === 0) {
      throw new Error('No summaries found. Generate individual summaries first.');
    }

    // Analyze overarching themes
    const themes = new Map<string, number>();
    const conceptMap = new Map<string, string[]>();
    
    summaries.rows.forEach(summary => {
      // Count theme occurrences
      const theme = summary.main_theme;
      themes.set(theme, (themes.get(theme) || 0) + 1);
      
      // Build concept map
      const concepts = JSON.parse(summary.concepts);
      concepts.forEach((concept: any) => {
        if (!conceptMap.has(concept.name)) {
          conceptMap.set(concept.name, []);
        }
        conceptMap.get(concept.name)!.push(summary.filename);
      });
    });

    // Sort themes by frequency
    const overarchingThemes = Array.from(themes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([theme]) => theme);

    // Generate book structure using AI
    const bookStructurePrompt = `Based on these lecture summaries, create a book structure:

Lectures and themes:
${summaries.rows.map(s => `- ${s.filename}: ${s.main_theme}`).join('\n')}

Key concepts across lectures:
${Array.from(conceptMap.entries()).slice(0, 20).map(([concept, lectures]) => 
  `- ${concept}: appears in ${lectures.length} lectures`
).join('\n')}

Create a logical book structure with parts and chapters that would flow well for readers.`;

    const { text: bookStructureJson } = await generateText({
      model: openai('gpt-4-turbo-preview'),
      prompt: bookStructurePrompt,
      temperature: 0.5,
    });

    // Parse book structure (with fallback)
    let suggestedBookStructure;
    try {
      suggestedBookStructure = JSON.parse(bookStructureJson);
    } catch {
      // Fallback structure
      suggestedBookStructure = [
        {
          part: 'Part I: Foundations',
          chapters: [
            { title: 'Introduction to Digital Tantra', lectures: lectureFiles.slice(0, 3), theme: 'Foundations' },
          ],
        },
      ];
    }

    return {
      overarchingThemes,
      conceptMap,
      chronologicalProgression: summaries.rows.map(s => ({
        lecture: s.filename,
        theme: s.main_theme,
      })),
      suggestedBookStructure,
    };
  }

  async exportSummaryAsMarkdown(filename: string, outputDir: string): Promise<string> {
    const summary = await sql`
      SELECT * FROM lecture_summaries
      WHERE filename = ${filename}
    `;

    if (summary.rows.length === 0) {
      throw new Error(`No summary found for: ${filename}`);
    }

    const s = summary.rows[0];
    const markdown = `# ${s.title}

**Lecture:** ${s.filename}  
**Main Theme:** ${s.main_theme}  
**Generated:** ${new Date().toISOString()}

## Summary

${s.summary}

## Expanded Summary

${s.expanded_summary}

## Key Points

${JSON.parse(s.key_points).map((point: string, i: number) => 
  `${i + 1}. ${point}`
).join('\n')}

## Important Concepts

${JSON.parse(s.concepts).map((concept: any) => 
  `### ${concept.name} (${concept.importance})

${concept.definition}`
).join('\n\n')}

## Memorable Quotes

${JSON.parse(s.quotes).map((quote: any) => 
  `> "${quote.text}"

*Context:* ${quote.context}  
*Significance:* ${quote.significance}`
).join('\n\n')}

## Conceptual Connections

${JSON.parse(s.connections).map((conn: any) => 
  `- **${conn.concept1}** ← ${conn.relationship} → **${conn.concept2}**`
).join('\n')}

## Practical Applications

${JSON.parse(s.practical_applications).map((app: string, i: number) => 
  `${i + 1}. ${app}`
).join('\n')}

## Suggested Book Placement

${JSON.parse(s.book_sections).map((section: any) => 
  `- **${section.suggestedChapter}** (Position ${section.orderInChapter}): ${section.relevantContent}`
).join('\n')}

---

*This summary was automatically generated using AI analysis of the lecture transcript.*`;

    // Save to file
    await fs.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `${path.basename(filename, '.txt')}_summary.md`);
    await fs.writeFile(outputPath, markdown, 'utf-8');

    return outputPath;
  }

  // Batch summarization with progress tracking
  async summarizeAllLectures(
    options: {
      overwrite?: boolean;
      onProgress?: (current: number, total: number, filename: string) => void;
    } = {}
  ): Promise<{ succeeded: string[]; failed: string[] }> {
    const { overwrite = false, onProgress } = options;

    // Get all lecture files
    const lectures = await sql`
      SELECT DISTINCT source as filename
      FROM lecture_chunks
      ORDER BY source
    `;

    const results = {
      succeeded: [] as string[],
      failed: [] as string[],
    };

    for (let i = 0; i < lectures.rows.length; i++) {
      const filename = lectures.rows[i].filename;
      
      if (onProgress) {
        onProgress(i + 1, lectures.rows.length, filename);
      }

      try {
        // Check if summary exists
        if (!overwrite) {
          const existing = await sql`
            SELECT 1 FROM lecture_summaries WHERE filename = ${filename}
          `;
          
          if (existing.rows.length > 0) {
            results.succeeded.push(filename);
            continue;
          }
        }

        await this.generateSummary(filename);
        results.succeeded.push(filename);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to summarize ${filename}:`, error);
        results.failed.push(filename);
      }
    }

    return results;
  }
}
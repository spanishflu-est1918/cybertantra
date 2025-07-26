import { sql } from '@vercel/postgres';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import fs from 'fs/promises';
import path from 'path';
import { HybridSearch } from './hybrid-search';
import { LectureSummarizer } from './lecture-summarizer';

interface BookChapter {
  number: number;
  title: string;
  theme: string;
  sections: Array<{
    title: string;
    content: string;
    sources: string[];
  }>;
  introduction: string;
  conclusion: string;
  wordCount: number;
}

interface BookStructure {
  title: string;
  subtitle: string;
  author: string;
  parts: Array<{
    number: number;
    title: string;
    description: string;
    chapters: BookChapter[];
  }>;
  introduction: string;
  conclusion: string;
  totalWordCount: number;
}

export class BookCompiler {
  private hybridSearch: HybridSearch;
  private summarizer: LectureSummarizer;

  constructor() {
    this.hybridSearch = new HybridSearch();
    this.summarizer = new LectureSummarizer();
  }

  async compileBook(
    title: string,
    structure: any, // Book structure from corpus analysis
    options: {
      author?: string;
      subtitle?: string;
      targetWordCount?: number;
      style?: 'academic' | 'accessible' | 'narrative';
      includeQuotes?: boolean;
      includeExercises?: boolean;
    } = {}
  ): Promise<BookStructure> {
    const {
      author = 'Author Name',
      subtitle = '',
      targetWordCount = 80000,
      style = 'accessible',
      includeQuotes = true,
      includeExercises = false,
    } = options;

    const book: BookStructure = {
      title,
      subtitle,
      author,
      parts: [],
      introduction: '',
      conclusion: '',
      totalWordCount: 0,
    };

    // Generate book introduction
    book.introduction = await this.generateBookIntroduction(title, structure, style);

    // Compile each part
    for (let partIdx = 0; partIdx < structure.length; partIdx++) {
      const part = structure[partIdx];
      const compiledPart = {
        number: partIdx + 1,
        title: part.part,
        description: await this.generatePartIntroduction(part, style),
        chapters: [],
      };

      // Compile each chapter
      for (let chapterIdx = 0; chapterIdx < part.chapters.length; chapterIdx++) {
        const chapter = part.chapters[chapterIdx];
        const compiledChapter = await this.compileChapter(
          chapterIdx + 1,
          chapter,
          { style, includeQuotes, includeExercises }
        );
        
        compiledPart.chapters.push(compiledChapter);
        book.totalWordCount += compiledChapter.wordCount;
      }

      book.parts.push(compiledPart);
    }

    // Generate book conclusion
    book.conclusion = await this.generateBookConclusion(book, style);
    
    // Save draft to database
    await this.saveDraft(book);

    return book;
  }

  private async compileChapter(
    number: number,
    chapterInfo: any,
    options: any
  ): Promise<BookChapter> {
    const { style, includeQuotes, includeExercises } = options;

    // Get relevant content from lectures
    const relevantContent = await this.gatherChapterContent(
      chapterInfo.lectures,
      chapterInfo.theme
    );

    // Generate chapter introduction
    const introduction = await this.generateChapterIntroduction(
      chapterInfo.title,
      chapterInfo.theme,
      relevantContent,
      style
    );

    // Generate sections
    const sections = await this.generateChapterSections(
      chapterInfo.title,
      relevantContent,
      { style, includeQuotes, includeExercises }
    );

    // Generate chapter conclusion
    const conclusion = await this.generateChapterConclusion(
      chapterInfo.title,
      sections,
      style
    );

    const wordCount = this.countWords(introduction + conclusion + 
      sections.map(s => s.content).join(' '));

    return {
      number,
      title: chapterInfo.title,
      theme: chapterInfo.theme,
      sections,
      introduction,
      conclusion,
      wordCount,
    };
  }

  private async gatherChapterContent(
    lectures: string[],
    theme: string
  ): Promise<Array<{ text: string; source: string; quotes: any[] }>> {
    const content = [];

    // Get summaries for specified lectures
    const summaries = await sql`
      SELECT * FROM lecture_summaries
      WHERE filename = ANY(${lectures})
    `;

    // Search for theme-specific content
    const themeResults = await this.hybridSearch.search(theme, {
      topK: 20,
      filterSource: lectures.join('|'),
    });

    // Combine summary insights with specific chunks
    for (const summary of summaries.rows) {
      const quotes = JSON.parse(summary.quotes);
      const relevantQuotes = quotes.filter((q: any) => 
        q.significance.toLowerCase().includes(theme.toLowerCase())
      );

      content.push({
        text: summary.expanded_summary,
        source: summary.filename,
        quotes: relevantQuotes,
      });
    }

    // Add specific chunks
    themeResults.forEach(result => {
      content.push({
        text: result.text,
        source: result.source,
        quotes: [],
      });
    });

    return content;
  }

  private async generateChapterIntroduction(
    title: string,
    theme: string,
    content: any[],
    style: string
  ): Promise<string> {
    const prompt = `Write an engaging introduction for a book chapter titled "${title}" about ${theme}.

Style: ${style}
${style === 'academic' ? 'Use scholarly tone with proper citations.' : ''}
${style === 'accessible' ? 'Make it approachable for general readers.' : ''}
${style === 'narrative' ? 'Use storytelling elements to draw readers in.' : ''}

Key insights from lectures:
${content.slice(0, 3).map(c => `- ${c.text.slice(0, 200)}...`).join('\n')}

The introduction should:
1. Hook the reader with an intriguing opening
2. Establish the importance of the topic
3. Preview what will be covered
4. Connect to broader themes in the book

Length: 300-500 words`;

    const { text } = await generateText({
      model: openai('gpt-4-turbo-preview'),
      prompt,
      temperature: 0.7,
    });

    return text;
  }

  private async generateChapterSections(
    chapterTitle: string,
    content: any[],
    options: any
  ): Promise<Array<{ title: string; content: string; sources: string[] }>> {
    const { style, includeQuotes, includeExercises } = options;
    const sections = [];

    // Group content by subtopics
    const subtopics = await this.identifySubtopics(content);

    for (const subtopic of subtopics) {
      const relevantContent = content.filter(c => 
        c.text.toLowerCase().includes(subtopic.toLowerCase())
      );

      const sectionContent = await this.generateSection(
        subtopic,
        relevantContent,
        { style, includeQuotes, includeExercises }
      );

      sections.push({
        title: subtopic,
        content: sectionContent,
        sources: [...new Set(relevantContent.map(c => c.source))],
      });
    }

    return sections;
  }

  private async generateSection(
    title: string,
    content: any[],
    options: any
  ): Promise<string> {
    const { style, includeQuotes, includeExercises } = options;

    const prompt = `Write a book section about "${title}" in ${style} style.

Source material:
${content.slice(0, 5).map(c => c.text).join('\n\n---\n\n')}

${includeQuotes && content.some(c => c.quotes?.length > 0) ? `
Include these quotes naturally:
${content.flatMap(c => c.quotes || []).slice(0, 3).map(q => 
  `"${q.text}" - ${q.context}`
).join('\n')}
` : ''}

Requirements:
1. Synthesize the ideas coherently
2. Add transitions between concepts
3. ${style === 'academic' ? 'Include analytical depth' : 'Keep it engaging and clear'}
4. ${includeExercises ? 'End with a practical exercise or reflection question' : ''}

Length: 800-1200 words`;

    const { text } = await generateText({
      model: openai('gpt-4-turbo-preview'),
      prompt,
      temperature: 0.6,
    });

    return text;
  }

  private async generateChapterConclusion(
    title: string,
    sections: any[],
    style: string
  ): Promise<string> {
    const prompt = `Write a conclusion for the chapter "${title}" that:

1. Synthesizes the key insights from these sections:
${sections.map(s => `- ${s.title}`).join('\n')}

2. Reinforces the main takeaways
3. ${style === 'narrative' ? 'Ends with a thought-provoking reflection' : 'Provides clear action points'}
4. Bridges to the next chapter

Style: ${style}
Length: 200-300 words`;

    const { text } = await generateText({
      model: openai('gpt-4-turbo-preview'),
      prompt,
      temperature: 0.6,
    });

    return text;
  }

  private async identifySubtopics(content: any[]): Promise<string[]> {
    const prompt = `Analyze this content and identify 3-5 main subtopics that should be covered as sections:

${content.slice(0, 5).map(c => c.text.slice(0, 300)).join('\n\n')}

Return only the subtopic titles, one per line.`;

    const { text } = await generateText({
      model: openai('gpt-4-turbo-preview'),
      prompt,
      temperature: 0.5,
    });

    return text.split('\n').filter(line => line.trim().length > 0);
  }

  private async generateBookIntroduction(
    title: string,
    structure: any,
    style: string
  ): Promise<string> {
    const partTitles = structure.map((p: any) => p.part).join(', ');
    
    const prompt = `Write a compelling book introduction for "${title}".

The book covers: ${partTitles}

Style: ${style}
Length: 1000-1500 words

The introduction should:
1. Establish the book's unique perspective on digital consciousness and tantra
2. Explain why this synthesis matters now
3. Preview the journey through the parts
4. Set expectations for the reader
5. Include a personal note from the author about the lecture series origins`;

    const { text } = await generateText({
      model: openai('gpt-4-turbo-preview'),
      prompt,
      temperature: 0.7,
    });

    return text;
  }

  private async generateBookConclusion(
    book: BookStructure,
    style: string
  ): Promise<string> {
    const prompt = `Write a powerful conclusion for the book "${book.title}".

The book covered these parts:
${book.parts.map(p => `${p.title}: ${p.chapters.map(c => c.title).join(', ')}`).join('\n')}

Style: ${style}
Length: 1000-1500 words

The conclusion should:
1. Synthesize the journey through all parts
2. Highlight the transformation in understanding
3. Point toward future implications
4. Leave the reader with actionable insights
5. End with an inspiring call to action`;

    const { text } = await generateText({
      model: openai('gpt-4-turbo-preview'),
      prompt,
      temperature: 0.7,
    });

    return text;
  }

  private async generatePartIntroduction(part: any, style: string): Promise<string> {
    const prompt = `Write a brief introduction for Part "${part.part}" which includes these chapters:
${part.chapters.map((c: any) => `- ${c.title}: ${c.theme}`).join('\n')}

Style: ${style}
Length: 200-300 words

Set up what readers will learn in this part.`;

    const { text } = await generateText({
      model: openai('gpt-4-turbo-preview'),
      prompt,
      temperature: 0.6,
    });

    return text;
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private async saveDraft(book: BookStructure): Promise<void> {
    await sql`
      INSERT INTO book_drafts (
        draft_name,
        structure,
        chapters,
        word_count,
        status
      ) VALUES (
        ${book.title + '_' + new Date().toISOString()},
        ${JSON.stringify({
          title: book.title,
          subtitle: book.subtitle,
          author: book.author,
          parts: book.parts.map(p => ({
            number: p.number,
            title: p.title,
            description: p.description,
          })),
        })},
        ${JSON.stringify(book.parts.flatMap(p => p.chapters))},
        ${book.totalWordCount},
        'draft'
      )
    `;
  }

  async exportAsMarkdown(book: BookStructure, outputDir: string): Promise<string> {
    await fs.mkdir(outputDir, { recursive: true });
    
    let fullMarkdown = `# ${book.title}\n`;
    if (book.subtitle) fullMarkdown += `## ${book.subtitle}\n`;
    fullMarkdown += `\nBy ${book.author}\n\n---\n\n`;
    
    // Table of Contents
    fullMarkdown += `## Table of Contents\n\n`;
    book.parts.forEach(part => {
      fullMarkdown += `### Part ${part.number}: ${part.title}\n`;
      part.chapters.forEach(chapter => {
        fullMarkdown += `${chapter.number}. ${chapter.title}\n`;
      });
      fullMarkdown += '\n';
    });
    
    fullMarkdown += `---\n\n## Introduction\n\n${book.introduction}\n\n`;
    
    // Parts and Chapters
    for (const part of book.parts) {
      fullMarkdown += `---\n\n# Part ${part.number}: ${part.title}\n\n`;
      fullMarkdown += `${part.description}\n\n`;
      
      for (const chapter of part.chapters) {
        fullMarkdown += `## Chapter ${chapter.number}: ${chapter.title}\n\n`;
        fullMarkdown += `${chapter.introduction}\n\n`;
        
        for (const section of chapter.sections) {
          fullMarkdown += `### ${section.title}\n\n`;
          fullMarkdown += `${section.content}\n\n`;
        }
        
        fullMarkdown += `${chapter.conclusion}\n\n`;
      }
    }
    
    fullMarkdown += `---\n\n## Conclusion\n\n${book.conclusion}\n\n`;
    fullMarkdown += `---\n\n*Total word count: ${book.totalWordCount}*\n`;
    
    const filename = `${book.title.replace(/\s+/g, '_')}_${Date.now()}.md`;
    const filepath = path.join(outputDir, filename);
    await fs.writeFile(filepath, fullMarkdown, 'utf-8');
    
    // Log export
    await sql`
      INSERT INTO export_history (export_type, filename, output_path, format)
      VALUES ('book', ${book.title}, ${filepath}, 'markdown')
    `;
    
    return filepath;
  }
}
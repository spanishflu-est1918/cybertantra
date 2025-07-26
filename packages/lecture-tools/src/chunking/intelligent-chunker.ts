import { MDocument } from '@mastra/rag';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

interface IntelligentChunk {
  text: string;
  metadata: {
    source: string;
    chunkIndex: number;
    topics: string[];
    type: 'introduction' | 'main_content' | 'conclusion' | 'qa' | 'transition';
    speakers?: string[];
    timestamp?: string;
  };
}

export class IntelligentChunker {
  private readonly TOPIC_DETECTION_PROMPT = `
    Analyze this text segment and extract:
    1. Main topics (max 5)
    2. Section type (introduction/main_content/conclusion/qa/transition)
    3. Any speaker changes or dialogue markers
    
    Return as JSON: { topics: string[], type: string, has_speakers: boolean }
  `;

  async chunkWithTopics(
    content: string,
    source: string,
    options: {
      targetSize?: number;
      overlapSize?: number;
      preserveParagraphs?: boolean;
    } = {}
  ): Promise<IntelligentChunk[]> {
    const {
      targetSize = 1024,
      overlapSize = 200,
      preserveParagraphs = true,
    } = options;

    // First, detect natural breaks in the content
    const sections = this.detectNaturalSections(content);
    const chunks: IntelligentChunk[] = [];
    
    for (let sectionIdx = 0; sectionIdx < sections.length; sectionIdx++) {
      const section = sections[sectionIdx];
      
      // Create smart chunks that respect natural boundaries
      const sectionChunks = await this.createSmartChunks(
        section,
        targetSize,
        overlapSize,
        preserveParagraphs
      );
      
      // Analyze each chunk for topics and type
      for (let chunkIdx = 0; chunkIdx < sectionChunks.length; chunkIdx++) {
        const chunkText = sectionChunks[chunkIdx];
        const analysis = await this.analyzeChunk(chunkText);
        
        chunks.push({
          text: chunkText,
          metadata: {
            source,
            chunkIndex: chunks.length,
            topics: analysis.topics,
            type: analysis.type,
            speakers: analysis.speakers,
            timestamp: this.extractTimestamp(chunkText),
          },
        });
      }
    }
    
    // Add overlap context between major sections
    return this.addContextualOverlaps(chunks, overlapSize);
  }

  private detectNaturalSections(content: string): string[] {
    const sections: string[] = [];
    
    // Split by multiple newlines (paragraph breaks)
    const paragraphs = content.split(/\n\s*\n/);
    
    // Look for section markers
    const sectionMarkers = [
      /^#+\s+/m,                    // Markdown headers
      /^Chapter \d+/i,              // Chapter markers
      /^\[Speaker \w+\]:/,          // Speaker changes
      /^---+$/m,                    // Horizontal rules
      /^(Introduction|Conclusion)/i, // Explicit sections
    ];
    
    let currentSection = '';
    
    for (const paragraph of paragraphs) {
      const isNewSection = sectionMarkers.some(marker => marker.test(paragraph));
      
      if (isNewSection && currentSection.length > 0) {
        sections.push(currentSection.trim());
        currentSection = paragraph;
      } else {
        currentSection += '\n\n' + paragraph;
      }
    }
    
    if (currentSection.length > 0) {
      sections.push(currentSection.trim());
    }
    
    return sections;
  }

  private async createSmartChunks(
    text: string,
    targetSize: number,
    overlapSize: number,
    preserveParagraphs: boolean
  ): Promise<string[]> {
    const chunks: string[] = [];
    
    if (text.length <= targetSize) {
      return [text];
    }
    
    if (preserveParagraphs) {
      // Try to chunk at paragraph boundaries
      const paragraphs = text.split(/\n\s*\n/);
      let currentChunk = '';
      
      for (const para of paragraphs) {
        if (currentChunk.length + para.length > targetSize && currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          // Add overlap from end of previous chunk
          const overlapText = currentChunk.slice(-overlapSize);
          currentChunk = overlapText + '\n\n' + para;
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + para;
        }
      }
      
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
    } else {
      // Fall back to character-based chunking
      for (let i = 0; i < text.length; i += targetSize - overlapSize) {
        chunks.push(text.slice(i, i + targetSize));
      }
    }
    
    return chunks;
  }

  private async analyzeChunk(text: string): Promise<{
    topics: string[];
    type: IntelligentChunk['metadata']['type'];
    speakers?: string[];
  }> {
    try {
      // Use GPT-4 to analyze the chunk
      const response = await generateText({
        model: openai('gpt-4-turbo-preview'),
        prompt: `${this.TOPIC_DETECTION_PROMPT}\n\nText:\n${text.slice(0, 500)}...`,
        temperature: 0.3,
      });
      
      const analysis = JSON.parse(response.text);
      
      // Extract speakers if present
      const speakers = this.extractSpeakers(text);
      
      return {
        topics: analysis.topics || [],
        type: analysis.type || 'main_content',
        speakers: speakers.length > 0 ? speakers : undefined,
      };
    } catch (error) {
      // Fallback to regex-based detection
      return {
        topics: this.extractTopicsRegex(text),
        type: this.detectTypeRegex(text),
        speakers: this.extractSpeakers(text),
      };
    }
  }

  private extractTopicsRegex(text: string): string[] {
    const topics: string[] = [];
    
    // Common topic patterns in lectures
    const patterns = [
      /\b(tantra|tantric)\b/gi,
      /\b(cyber|digital|virtual|online)\b/gi,
      /\b(consciousness|awareness|mindfulness)\b/gi,
      /\b(yuga|cycle|time|epoch)\b/gi,
      /\b(AI|artificial intelligence|machine learning)\b/gi,
      /\b(sacred|spiritual|divine)\b/gi,
    ];
    
    const topicMap = {
      'tantra': 'Tantra',
      'cyber': 'Cyberspace',
      'consciousness': 'Consciousness',
      'yuga': 'Yuga Cycles',
      'AI': 'Artificial Intelligence',
      'sacred': 'Sacred Technology',
    };
    
    patterns.forEach(pattern => {
      if (pattern.test(text)) {
        const key = Object.keys(topicMap).find(k => 
          new RegExp(k, 'i').test(text)
        );
        if (key && !topics.includes(topicMap[key as keyof typeof topicMap])) {
          topics.push(topicMap[key as keyof typeof topicMap]);
        }
      }
    });
    
    return topics.slice(0, 5); // Max 5 topics
  }

  private detectTypeRegex(text: string): IntelligentChunk['metadata']['type'] {
    const lowerText = text.toLowerCase();
    
    if (/^(introduction|welcome|today we|in this lecture)/i.test(text)) {
      return 'introduction';
    }
    
    if (/\b(conclusion|summary|to sum up|in closing)\b/i.test(lowerText)) {
      return 'conclusion';
    }
    
    if (/\b(question:|q:|audience member:|q&a)\b/i.test(lowerText)) {
      return 'qa';
    }
    
    if (/\b(moving on|next topic|let's turn to|now let's)\b/i.test(lowerText)) {
      return 'transition';
    }
    
    return 'main_content';
  }

  private extractSpeakers(text: string): string[] {
    const speakers = new Set<string>();
    
    // Pattern for speaker labels
    const speakerPatterns = [
      /\[Speaker (\w+)\]:/g,
      /^(\w+):\s/gm,
      /\b(Speaker \d+):/g,
    ];
    
    speakerPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        speakers.add(match[1]);
      }
    });
    
    return Array.from(speakers);
  }

  private extractTimestamp(text: string): string | undefined {
    // Look for timestamp patterns
    const timestampPattern = /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/;
    const match = text.match(timestampPattern);
    return match ? match[1] : undefined;
  }

  private addContextualOverlaps(
    chunks: IntelligentChunk[],
    overlapSize: number
  ): IntelligentChunk[] {
    // Add context between chunks with different topics
    const enhancedChunks: IntelligentChunk[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      enhancedChunks.push(chunks[i]);
      
      // Check if next chunk has different topics
      if (i < chunks.length - 1) {
        const currentTopics = new Set(chunks[i].metadata.topics);
        const nextTopics = new Set(chunks[i + 1].metadata.topics);
        
        const hasNewTopics = [...nextTopics].some(t => !currentTopics.has(t));
        
        if (hasNewTopics) {
          // Create a bridging chunk
          const bridgeText = 
            chunks[i].text.slice(-overlapSize / 2) + 
            '\n\n[Topic Transition]\n\n' +
            chunks[i + 1].text.slice(0, overlapSize / 2);
          
          enhancedChunks.push({
            text: bridgeText,
            metadata: {
              source: chunks[i].metadata.source,
              chunkIndex: enhancedChunks.length,
              topics: [...currentTopics, ...nextTopics].slice(0, 5),
              type: 'transition',
            },
          });
        }
      }
    }
    
    return enhancedChunks;
  }
}
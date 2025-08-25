import fs from "fs/promises";
import path from "path";

export interface MeditationCorpusEntry {
  filename: string;
  duration: number;
  segments: Array<{
    start: number;
    end: number;
    text: string;
    speaker?: string;
  }>;
  fullText: string;
  metadata: {
    wordCount: number;
    speakingTime: number;
    pauseTime: number;
  };
}

export async function loadMeditationCorpus(): Promise<MeditationCorpusEntry[]> {
  // Use absolute path to transcriptions
  const corpusPath = "/Users/gorkolas/Documents/www/cybertantra/transcriptions/meditation";
  const corpus: MeditationCorpusEntry[] = [];
  
  try {
    const files = await fs.readdir(corpusPath);
    const jsonFiles = files.filter(f => f.endsWith(".json"));
    
    for (const file of jsonFiles) {
      const content = await fs.readFile(path.join(corpusPath, file), "utf-8");
      const meditation = JSON.parse(content);
      corpus.push({
        filename: file.replace(".json", ""),
        ...meditation
      });
    }
    return corpus;
  } catch (error) {
    console.error("❌ Error loading meditation corpus:", error);
    return [];
  }
}
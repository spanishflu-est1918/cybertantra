import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, stepCountIs } from "ai";
import { z } from "zod";
import { tool } from "ai";
import { getAIConfig, searchLectures } from "../../index";
import { loadMeditationCorpus, type MeditationCorpusEntry } from "./corpus";
import { MeditationMusicService } from "../../services/meditation-music";

export class MeditationGeneratorAgent {
  private openrouter: any;

  constructor() {
    const config = getAIConfig();
    this.openrouter = createOpenRouter({
      apiKey: config.openRouterApiKey || process.env.OPENROUTER_API_KEY!,
    });
  }

  async generate(topic: string, duration: number) {
    console.log(`🧘 Generating ${duration}-minute meditation on: ${topic}`);

    // 1. Gather all data first
    console.log(`📚 Loading meditation examples...`);
    const corpus = await loadMeditationCorpus();
    console.log(`✅ Loaded ${corpus.length} meditation examples`);

    console.log(`🔍 Searching lectures for: ${topic}`);
    let knowledge = "";
    try {
      const config = getAIConfig();
      const results = await searchLectures(
        topic,
        20,
        config.googleGenerativeAIApiKey!,
      );

      knowledge = results.map((r) => r.text).join("\n\n");
      console.log(`✅ Found ${results.length} relevant lecture chunks`);
    } catch (error) {
      console.error("❌ Failed to search lectures:", error);
      knowledge = "Using general meditation patterns.";
    }

    // 2. Generate meditation text with ElevenLabs-ready format
    console.log(`🎯 Creating meditation with break tags...`);
    const meditationText = await this.createMeditationText(
      topic,
      duration,
      corpus.slice(0, 10),
      knowledge,
    );

    const result = {
      text: meditationText,  // This already has <break> tags
      topic,
      duration,
      timestamp: new Date().toISOString(),
    };

    console.log(`🎉 Meditation generation complete!`);
    console.log(`📝 Meditation text (${meditationText.length} chars):`);
    console.log("=".repeat(50));
    console.log(meditationText);
    console.log("=".repeat(50));
    console.log(`⏱️  Duration: ${duration} minutes on "${topic}"`);

    return result;
  }

  private async createMeditationText(
    topic: string,
    duration: number,
    examples: MeditationCorpusEntry[],
    knowledge: string,
  ): Promise<string> {
    const examplesJson = JSON.stringify(examples, null, 2);

    const prompt = `Study these meditation examples to learn the patterns and structure:

${examplesJson}

Topic Knowledge from Lectures:
${knowledge}

Generate a complete ${duration}-minute meditation on "${topic}".

REQUIREMENTS:
- Study the pause patterns in the examples carefully
- Use <break time="X.Xs" /> tags for pauses (e.g., <break time="3.5s" />, <break time="2s" />)
- Maximum pause time is 3 seconds per break tag
- Match the style and pacing from the example meditations
- Use mantras and techniques from the topic knowledge
- Structure should flow naturally from opening to closing
- Total duration should be approximately ${duration} minutes
- Include breathing cues and gentle guidance

Output the meditation text with break tags embedded directly in the text.
Example format: "Close your eyes. <break time="2.5s" /> Take a deep breath..."`;

    const { text } = await generateText({
      model: this.openrouter("anthropic/claude-sonnet-4"),
      prompt,
      temperature: 0.7,
    });

    console.log(`✅ Generated meditation (${text.length} chars):`);
    console.log("=".repeat(50));
    console.log(text);
    console.log("=".repeat(50));
    return text;
  }

}

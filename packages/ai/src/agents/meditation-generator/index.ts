import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, stepCountIs } from "ai";
import { z } from "zod";
import { tool } from "ai";
import { getAIConfig, searchLectures } from "../../index";
import { loadMeditationCorpus, type MeditationCorpusEntry } from "./corpus";
import { MeditationMusicService } from "../../services/meditation-music";
import type { MusicPromptParameters } from "../../services/meditation-music";

export class MeditationGeneratorAgent {
  private openrouter: any;

  constructor() {
    const config = getAIConfig();
    this.openrouter = createOpenRouter({
      apiKey: config.openRouterApiKey || process.env.OPENROUTER_API_KEY!,
    });
  }

  async generate(topic: string, duration: number) {
    console.log(`☠️ Initiating ${duration}-minute ritual transmission: ${topic}`);

    // 1. Gather all data first
    console.log(`🌙 Channeling the meditation corpus from the void...`);
    const corpus = await loadMeditationCorpus();
    console.log(`📿 Absorbed ${corpus.length} sacred transmissions`);

    console.log(`👁️ Scanning the akashic records for: ${topic}`);
    let knowledge = "";
    try {
      const config = getAIConfig();
      const results = await searchLectures(
        topic,
        20,
        config.googleGenerativeAIApiKey!,
      );

      knowledge = results.map((r) => r.text).join("\n\n");
      console.log(`🔥 Retrieved ${results.length} fragments of forbidden wisdom`);
    } catch (error) {
      console.error("⚠️ The akashic records remain silent:", error);
      knowledge = "Channeling from the primordial void...";
    }

    // 2. Generate meditation text with ElevenLabs-ready format
    console.log(`🕉️ Weaving sacred utterances with divine silence...`);
    const meditationText = await this.createMeditationText(
      topic,
      duration,
      corpus.slice(0, 10),
      knowledge,
    );

    // 3. Generate music parameters based on the knowledge and tone
    console.log(`🎭 Divining the sonic landscape from the meditation's essence...`);
    const musicParameters = await this.generateMusicParameters(
      topic,
      knowledge,
      meditationText
    );

    const result = {
      text: meditationText,  // This already has <break> tags
      topic,
      duration,
      timestamp: new Date().toISOString(),
      musicParameters,  // Add music generation parameters
    };

    console.log(`⚡ The ritual is complete!`);
    console.log(`🗿 Sacred text manifested (${meditationText.length} glyphs):`);
    console.log("🔺".repeat(25));
    console.log(meditationText);
    console.log("🔻".repeat(25));
    console.log(`⏳ Temporal vessel: ${duration} minutes | Focus: "${topic}"`);

    return result;
  }

  private async createMeditationText(
    topic: string,
    duration: number,
    examples: MeditationCorpusEntry[],
    knowledge: string,
  ): Promise<string> {
    const examplesJson = JSON.stringify(examples, null, 2);

    const prompt = `You are a master meditation creator, deeply experienced in tantric and yogic traditions. I'm going to give you examples of meditations, relevant knowledge, and the meditation you need to create.

<style>
Study how these meditations flow, their pacing, and natural pause patterns. Notice how the example meditations use silence. Absorb their natural rhythm and pacing. Let the pauses breathe organically with the meditation's flow.
</style>

<example_meditations>
${examplesJson}
</example_meditations>

<task>
Create a ${duration}-minute meditation on: "${topic}"

Here's relevant knowledge about the topic:
<relevant_knowledge>
${knowledge}
</relevant_knowledge>
</task>

<output>
Write the meditation text with <break time="X.Xs" /> tags embedded for pauses, where X.X is seconds.
Add breaks liberally - between sentences, after phrases, wherever the meditation needs to breathe.

CRITICAL: Output ONLY plain text with break tags. NO markdown, NO asterisks, NO formatting, NO titles.
Just the meditation words and break tags.

Example: "Close your eyes. <break time="2.5s" /> Feel your body settling. <break time="1.8s" /> Take a deep breath — <break time="0.8s" /> breathing from your belly <break time="1.2s" /> up to your chest. <break time="4s" />"
</output>`;

    const { text } = await generateText({
      model: this.openrouter("anthropic/claude-sonnet-4"),
      prompt,
      temperature: 0.8,  // Slightly higher for more variation
    });

    console.log(`💀 Transmission received (${text.length} runes):`);
    console.log("☠️".repeat(25));
    console.log(text);
    console.log("☠️".repeat(25));
    return text;
  }

  private async generateMusicParameters(
    topic: string,
    knowledge: string,
    meditationText: string
  ): Promise<MusicPromptParameters> {
    // First, analyze the ACTUAL tone of the meditation
    const analysisPrompt = `Read this meditation carefully and analyze its TRUE tone:

${meditationText}

Topic: ${topic}

ANALYZE THE ACTUAL CONTENT:
- If it mentions poison, nuclear fire, death, void, leftover energy, transgression → IT'S DARK
- If it mentions light, love, peace, healing, gratitude → IT'S LIGHT  
- If it mentions breath, awareness, presence → IT'S NEUTRAL/MEDITATIVE
- If it mentions fire, transformation, power → IT'S INTENSE

What is the REAL tone? Look for actual words like:
- "radioactive", "poison", "nuclear", "death", "void" = DARK AS FUCK
- "light", "love", "healing", "peace" = LIGHT
- "breath", "awareness", "mindfulness" = MEDITATIVE

Output ONE WORD: DARK, LIGHT, MEDITATIVE, or INTENSE`;

    const { text: tone } = await generateText({
      model: this.openrouter("anthropic/claude-sonnet-4"),
      prompt: analysisPrompt,
      temperature: 0.3,
    });

    console.log(`🌑 Detected Energetic Signature: ${tone.trim()}`);

    // Now generate appropriate music parameters based on ACTUAL tone
    let moodGuide = "";
    let instrumentGuide = "";
    
    if (tone.includes("DARK")) {
      moodGuide = "nuclear, toxic, abyssal, confrontational, industrial, doom-laden";
      instrumentGuide = "distorted drones, industrial textures, nuclear reactor hums, metallic scrapes, dark ambient pads";
    } else if (tone.includes("LIGHT")) {
      moodGuide = "luminous, expansive, celestial, ethereal, transcendent";
      instrumentGuide = "crystal bowls, shimmering pads, angelic textures, high frequency drones";
    } else if (tone.includes("INTENSE")) {
      moodGuide = "powerful, transformative, electric, fierce, dynamic";
      instrumentGuide = "deep bass drones, ritual drums, brass textures, thunderous atmospheres";
    } else {
      moodGuide = "meditative, hypnotic, contemplative, deep, grounding";
      instrumentGuide = "singing bowls, subtle drones, breath-like textures, earth tones";
    }

    // Override for explicitly dark topics
    const darkTopics = ['ucchista', 'ganapati', 'nuclear', 'poison', 'void', 'death', 'kali', 'bhairava'];
    const isExplicitlyDark = darkTopics.some(dark => topic.toLowerCase().includes(dark));
    
    if (isExplicitlyDark) {
      moodGuide = "dark, intense, mysterious, transformative, powerful";
      instrumentGuide = "deep bass drones, metallic textures, industrial ambient, dark synthesizers, subterranean rumbles";
    }

    const prompt = `Create music for ${topic}.
Detected tone: ${tone.trim()}

The music should be:
- Mood: ${moodGuide}
- Instruments: ${instrumentGuide}
- Always beatless dark ambient (no rhythm, no melody)
- ${isExplicitlyDark ? 'Dark and intense - think Tim Hecker, Lustmord, dark ambient' : 'Match the actual energy'}
- This is serious meditation music, not relaxation

Output a JSON object:
- mood: descriptive mood words that match the tone
- key: "minor" 
- instruments: array of 3-5 appropriate dark instruments/textures
- tempo: "beatless"
- atmosphere: 2-5 words capturing the essence
- avoidElements: ["vocals", "drums", "sudden changes"]

Output ONLY valid JSON:`;

    try {
      const { text } = await generateText({
        model: this.openrouter("anthropic/claude-sonnet-4"),
        prompt,
        temperature: 0.5,
      });

      // Remove markdown code blocks if present
      const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Parse the JSON response
      const parsed = JSON.parse(cleanText);
      
      // Ensure all required fields with defaults
      const parameters: MusicPromptParameters = {
        mood: parsed.mood || "meditative, introspective",
        key: parsed.key === "major" ? "major" : "minor",
        instruments: parsed.instruments || ["ambient synthesizers", "subtle drones"],
        tempo: parsed.tempo || "beatless",
        atmosphere: parsed.atmosphere || "hypnotic and deep",
        topic: topic,
        avoidElements: parsed.avoidElements || ["vocals", "sudden changes"]
      };

      console.log(`🎼 Generated music parameters:`, parameters);
      return parameters;
    } catch (error) {
      console.error("Failed to generate music parameters:", error);
      // Return sensible defaults
      return {
        mood: "meditative, contemplative",
        key: "minor",
        instruments: ["ambient synthesizers", "subtle drones", "soft textures"],
        tempo: "beatless",
        atmosphere: "peaceful and introspective",
        topic: topic,
        avoidElements: ["vocals", "drums", "sudden changes"]
      };
    }
  }

}

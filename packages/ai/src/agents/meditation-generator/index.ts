import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { z } from "zod";
import { tool } from "ai";
import { QueryAgent, getAIConfig } from "../../index";
import { loadMeditationCorpus, type MeditationCorpusEntry } from "./corpus";

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

    // Define tools for the agent to use
    const tools = {
      loadMeditationExamples: tool({
        description:
          "Load meditation examples from the corpus to learn patterns",
        inputSchema: z.object({}),
        execute: async () => {
          const corpus = await loadMeditationCorpus();
          console.log(`📚 Loaded ${corpus.length} meditation examples`);
          return {
            examples: JSON.stringify(corpus, null, 2),
            count: corpus.length,
          };
        },
      }),

      getTopicKnowledge: tool({
        description: "Get knowledge about a topic from the lecture database",
        inputSchema: z.object({
          topic: z.string().describe("The topic to search for"),
        }),
        execute: async ({ topic }) => {
          const config = getAIConfig();
          const queryAgent = new QueryAgent(config);
          console.log(`🔍 Retrieving knowledge about: ${topic}`);
          const knowledge = await queryAgent.query(
            `${topic} mantras symbolism practices meditation techniques chakras deities`,
          );
          return { knowledge };
        },
      }),

      generateMeditation: tool({
        description:
          "Generate the meditation text based on examples and knowledge",
        inputSchema: z.object({
          examples: z.string().describe("JSON string of meditation examples"),
          knowledge: z.string().describe("Topic knowledge from lectures"),
          topic: z.string().describe("Meditation topic"),
          duration: z.number().describe("Duration in minutes"),
        }),
        execute: async ({ examples, knowledge, topic, duration }) => {
          const prompt = `Study these meditation examples to learn the patterns:

${examples}

Topic Knowledge:
${knowledge}

Generate a ${duration}-minute meditation on "${topic}".

Requirements:
- Study the pause patterns in the examples
- Include pause markers like [pause 3s] or [pause 5.5s]
- Match the style and structure from examples
- Use mantras and techniques from the topic knowledge
- Total duration should be approximately ${duration} minutes

Output the meditation text with pause markers inline.`;

          const { text } = await generateText({
            model: this.openrouter("anthropic/claude-sonnet-4"),
            prompt,
            temperature: 0.7,
          });

          return { meditation: text };
        },
      }),

      convertToSSML: tool({
        description: "Convert meditation text to SSML format",
        inputSchema: z.object({
          text: z.string().describe("Meditation text with pause instructions"),
        }),
        execute: async ({ text }) => {
          const prompt = `Convert this meditation text to SSML format:

${text}

CONVERSION RULES:
- Wrap everything in <speak></speak> tags
- Convert "[pause Xs]" to <break time="Xs"/>
- Convert "pause for X seconds" to <break time="Xs"/>
- Keep all other text as is

Output ONLY valid SSML:`;

          const { text: ssml } = await generateText({
            model: this.openrouter("anthropic/claude-sonnet-4"),
            prompt,
            temperature: 0.3,
          });

          return { ssml: cleanSSML(ssml) };
        },
      }),
    };

    // Let the agent orchestrate the task
    console.log("🤖 Starting agent workflow...");
    
    const { text, steps } = await generateText({
      model: this.openrouter("anthropic/claude-sonnet-4"),
      messages: [
        {
          role: "system",
          content: `You are a meditation generator agent. Your task is to:
1. Load meditation examples using loadMeditationExamples
2. Get topic knowledge using getTopicKnowledge
3. Generate a meditation using generateMeditation
4. Convert it to SSML using convertToSSML
5. Return the final SSML meditation`,
        },
        {
          role: "user",
          content: `Generate a ${duration}-minute meditation on "${topic}"`,
        },
      ],
      tools,
      toolChoice: "required",
    });
    
    console.log(`📊 Agent completed with ${steps.length} steps`);

    // Extract the final SSML from the agent's work
    let finalSSML = text;
    let originalText = text;

    // Debug: Log what tools were called
    console.log("🔍 Analyzing agent steps:");
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      console.log(`  Step ${i + 1}:`);
      
      if (step.toolCalls && step.toolCalls.length > 0) {
        for (const call of step.toolCalls) {
          console.log(`    → Called tool: ${call.toolName}`);
          if (call.toolName === "convertToSSML") {
            const typedCall = call as any;
            if (typedCall.input?.text) {
              originalText = typedCall.input.text;
              console.log(`    → Captured original text (${originalText.length} chars)`);
            }
          }
        }
      }
      
      if (step.toolResults && step.toolResults.length > 0) {
        for (const result of step.toolResults) {
          console.log(`    ← Result from: ${result.toolName}`);
          if (result.toolName === "convertToSSML") {
            const toolResult = result as any;
            if (toolResult.result?.ssml) {
              finalSSML = toolResult.result.ssml;
              console.log(`    ← Got SSML (${finalSSML.length} chars)`);
            }
          }
        }
      }
      
      if (step.text) {
        console.log(`    💬 Text: ${step.text.substring(0, 100)}...`);
      }
    }

    return {
      originalText,
      ssml: finalSSML,
      topic,
      duration,
      timestamp: new Date().toISOString(),
      steps: steps.length,
    };
  }
}

function cleanSSML(ssml: string): string {
  const ssmlMatch = ssml.match(/<speak>[\s\S]*<\/speak>/);
  if (ssmlMatch) {
    return ssmlMatch[0];
  }

  const cleaned = ssml.trim();
  if (!cleaned.startsWith("<speak>")) {
    return `<speak>\n${cleaned}\n</speak>`;
  }

  return cleaned;
}

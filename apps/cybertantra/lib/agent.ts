import { generateText } from 'ai';
import { MODELS } from './config/models';

export function createAgent() {
  return {
    async generate(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>) {
      const result = await generateText({
        model: MODELS.SYNTHESIS,
        messages,
        temperature: 0.7,
      });

      return {
        text: result.text,
        usage: result.usage,
      };
    }
  };
}
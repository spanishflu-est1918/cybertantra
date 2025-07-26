import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';
import { MODELS, OPENROUTER_CONFIG } from './config/models';

const openrouter = createOpenRouter(OPENROUTER_CONFIG);

export function createAgent() {
  return {
    async generate(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>) {
      const result = await generateText({
        model: openrouter.chat(MODELS.SYNTHESIS),
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
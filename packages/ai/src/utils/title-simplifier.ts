import { openrouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';

/**
 * Simplify a meditation topic to a concise, single-word or short phrase title
 */
export async function simplifyMeditationTitle(originalTopic: string): Promise<string> {
  try {
    const result = await generateText({
      model: openrouter('google/gemini-2.5-flash'),
      messages: [
        {
          role: 'system',
          content: `You are a meditation title simplifier. Take complex meditation topics and reduce them to simple, single-word titles or very short 2-3 word phrases. Keep it spiritual, concise, and meaningful.

Examples:
- "Dark meditation, physical invocation of Matangi into the very room I am in" → "matangi"
- "Heart chakra opening with green light visualization" → "heart chakra" 
- "Breathing meditation for stress relief and calm" → "breathing"
- "Walking meditation in nature with mindfulness" → "walking"
- "Loving kindness meditation for self and others" → "loving kindness"
- "Ganesha mantra meditation for removing obstacles" → "ganesha"

Always return ONLY the simplified title, nothing else. Use lowercase unless it's a proper name.`
        },
        {
          role: 'user',
          content: `Simplify this meditation topic: "${originalTopic}"`
        }
      ],
      temperature: 0.3,
      maxTokens: 10
    });

    return result.text.trim().toLowerCase();
  } catch (error) {
    console.warn('Failed to simplify title, using fallback:', error);
    
    // Fallback: extract first meaningful word or use first word
    const words = originalTopic.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && 
        !['meditation', 'the', 'and', 'for', 'with', 'into', 'from'].includes(word));
    
    return words[0] || 'meditation';
  }
}
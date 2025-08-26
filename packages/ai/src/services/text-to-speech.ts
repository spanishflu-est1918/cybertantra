import { ElevenLabsClient } from "elevenlabs";
import { getAIConfig } from "../config";
import { AUDIO_CONFIG } from "../config/audio";

export interface TextToSpeechOptions {
  voiceId?: string;
  modelId?: string;
  voiceSettings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
  outputFormat?: string;
}

export class TextToSpeechService {
  private client: ElevenLabsClient;
  private defaultVoiceId: string;

  constructor(voiceId?: string) {
    const config = getAIConfig();
    
    if (!config.elevenLabsApiKey) {
      throw new Error("ElevenLabs API key is required");
    }

    this.client = new ElevenLabsClient({
      apiKey: config.elevenLabsApiKey,
    });

    // Always prioritize meditation voice from env, then provided voiceId, never fall back to Rachel
    this.defaultVoiceId = process.env.ELEVENLABS_MEDITATION_VOICE_ID || voiceId || "OboNP9Mp1f3WyTIrLGiP";
    // console.log(`🎤 TTS Service initialized with voice: ${this.defaultVoiceId} (env: ${process.env.ELEVENLABS_MEDITATION_VOICE_ID}, provided: ${voiceId})`);
  }

  /**
   * Convert text with break tags to audio
   * ElevenLabs uses a hybrid format: plain text with <break time="X.Xs" /> tags
   */
  async generateAudio(
    text: string,
    options: TextToSpeechOptions = {}
  ): Promise<Buffer> {
    try {
      // console.log(`🎙️ Generating audio with voice: ${options.voiceId || this.defaultVoiceId}`);
      
      // ElevenLabs already accepts the hybrid format directly
      // Just ensure break tags are properly formatted
      const cleanedText = this.ensureProperBreakTags(text);
      // console.log(`📝 Text ready for TTS (${cleanedText.length} chars)`);

      const audioStream = await this.client.generate({
        voice: options.voiceId || this.defaultVoiceId,
        text: cleanedText,
        model_id: options.modelId || AUDIO_CONFIG.ttsModel, // Use configured model
        voice_settings: options.voiceSettings || {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.3,
          use_speaker_boost: true,
        },
      });

      // Convert the async generator to a Buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of audioStream) {
        chunks.push(chunk);
      }

      const audioBuffer = Buffer.concat(chunks);
      // console.log(`✅ Generated audio: ${audioBuffer.length} bytes`);

      return audioBuffer;
    } catch (error) {
      console.error("❌ Failed to generate audio:", error);
      throw error;
    }
  }

  /**
   * Ensure break tags are properly formatted for ElevenLabs
   */
  private ensureProperBreakTags(text: string): string {
    // Ensure break tags use the correct format: <break time="X.Xs" />
    let cleaned = text.replace(/<break\s+time="([^"]+)"\s*\/>/g, '<break time="$1" />');
    
    // Clean up extra whitespace
    cleaned = cleaned.replace(/\s+/g, " ").trim();
    
    return cleaned;
  }

  /**
   * Generate audio and save to file
   */
  async generateAndSave(
    text: string,
    outputPath: string,
    options: TextToSpeechOptions = {}
  ): Promise<void> {
    const fs = await import("fs/promises");
    const audioBuffer = await this.generateAudio(text, options);
    await fs.writeFile(outputPath, audioBuffer);
    // console.log(`💾 Saved audio to: ${outputPath}`);
  }

  /**
   * Get available voices
   */
  async getVoices() {
    try {
      const voices = await this.client.voices.getAll();
      return voices.voices;
    } catch (error) {
      console.error("Failed to get voices:", error);
      throw error;
    }
  }

  /**
   * Get usage information and subscription details
   */
  async getUsageInfo() {
    try {
      // Get user info which includes subscription
      const user = await this.client.user.get();
      const subscription = await this.client.user.getSubscription();
      
      return {
        subscription: {
          tier: subscription.tier,
          character_count: subscription.character_count,
          character_limit: subscription.character_limit,
          character_usage: subscription.character_count / subscription.character_limit * 100,
          next_character_count_reset_unix: subscription.next_character_count_reset_unix,
          next_reset_date: new Date(subscription.next_character_count_reset_unix * 1000).toISOString(),
        },
        user: {
          // User details from API
          ...user as any
        }
      };
    } catch (error) {
      console.error("Failed to get usage info:", error);
      throw error;
    }
  }

  /**
   * Calculate cost estimate for text
   */
  calculateCostEstimate(text: string, tier: string = 'free') {
    // Remove break tags for character count
    const cleanText = text.replace(/<break\s+time="[^"]+"\s*\/>/g, '');
    const characterCount = cleanText.length;
    
    // ElevenLabs pricing (approximate)
    const pricing = {
      free: { limit: 10000, cost: 0 },
      starter: { limit: 30000, cost: 5, overage: 0.30 }, // $0.30 per 1000 chars over
      creator: { limit: 100000, cost: 22, overage: 0.24 }, // $0.24 per 1000 chars over
      pro: { limit: 500000, cost: 99, overage: 0.18 }, // $0.18 per 1000 chars over
    };
    
    const tierInfo = pricing[tier.toLowerCase() as keyof typeof pricing] || pricing.free;
    
    let estimatedCost = 0;
    if (characterCount > tierInfo.limit && 'overage' in tierInfo && tierInfo.overage) {
      const overageChars = characterCount - tierInfo.limit;
      estimatedCost = (overageChars / 1000) * tierInfo.overage;
    }
    
    return {
      characterCount,
      tier,
      monthlyLimit: tierInfo.limit,
      estimatedCost: estimatedCost.toFixed(2),
      withinLimit: characterCount <= tierInfo.limit,
    };
  }

  /**
   * Stream audio generation (for real-time playback)
   */
  async *streamAudio(
    text: string,
    options: TextToSpeechOptions = {}
  ): AsyncGenerator<Uint8Array> {
    const cleanedText = this.ensureProperBreakTags(text);
    
    const audioStream = await this.client.generate({
      voice: options.voiceId || this.defaultVoiceId,
      text: cleanedText,
      model_id: options.modelId || AUDIO_CONFIG.ttsModel,
      voice_settings: options.voiceSettings || {
        stability: 0.5,
        similarity_boost: 0.8,
        style: 0.3,
        use_speaker_boost: true,
      },
      stream: true,
    });

    for await (const chunk of audioStream) {
      yield chunk;
    }
  }
}
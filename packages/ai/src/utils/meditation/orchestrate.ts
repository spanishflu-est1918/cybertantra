import path from "path";
import fs from "fs/promises";
import { MeditationGeneratorAgent } from "../../agents/meditation-generator";
import { generateMeditationAudio } from "./generate-audio";
import { generateMeditationMusic } from "./generate-music";
import { composeMeditation } from "../audio";

export interface MeditationOptions {
  topic: string;
  duration: number;
  voiceId?: string;
}

export interface MeditationResult {
  text: string;
  topic: string;
  duration: number;
  musicParameters?: any;
  audioPath?: string;
  audioSize?: number;
  musicPath?: string;
  musicSize?: number;
  finalAudioPath?: string;
  finalAudioSize?: number;
}

/**
 * Generate a complete meditation with text, audio, and music
 */
export async function generateCompleteMeditation(
  options: MeditationOptions
): Promise<MeditationResult> {
  const {
    topic,
    duration,
    voiceId = process.env.ELEVENLABS_MEDITATION_VOICE_ID,
  } = options;

  console.log(
    `[Orchestrator] Starting meditation generation for: ${topic} (${duration} min)`
  );

  // Step 1: Generate meditation text
  const agent = new MeditationGeneratorAgent();
  const textResult = await agent.generate(topic, duration);
  console.log(
    `[Orchestrator] Text generated: ${textResult.text?.length || 0} chars`
  );

  // Step 2: Generate audio and music in parallel
  const [audioResult, musicResult] = await Promise.all([
    generateMeditationAudio({
      text: textResult.text,
      topic,
      duration,
      voiceId,
      useSegmented: true,
    }),
    generateMeditationMusic({
      parameters: textResult.musicParameters,
      duration: Math.min(duration, 5),
    }),
  ]);

  console.log(`[Orchestrator] Audio and music generated`);

  // Step 3: Determine output path - ALWAYS use public/audio/meditations
  const filename = `${topic.replace(/\s+/g, "-")}_${duration}min_complete_${Date.now()}.mp3`;
  const finalAudioPath = path.join(
    process.cwd(),
    "public",
    "audio",
    "meditations",
    filename
  );

  // Step 4: Use actual file paths for mixing
  const voicePath = audioResult.filePath;
  const musicPath = musicResult.filePath;

  // Step 5: Mix audio with music and apply effects using config defaults
  await composeMeditation(voicePath, musicPath, finalAudioPath);

  const stats = await fs.stat(finalAudioPath);
  const finalAudioSize = stats.size;

  // Metadata saving removed - audio files are self-contained

  // Return public path for web access
  const publicAudioPath = `/audio/meditations/${path.basename(finalAudioPath)}`;

  return {
    text: textResult.text,
    topic: textResult.topic,
    duration: textResult.duration,
    musicParameters: textResult.musicParameters,
    audioPath: publicAudioPath,
    audioSize: finalAudioSize,
    musicPath: musicResult.musicPath,
    musicSize: musicResult.musicSize,
    finalAudioPath: publicAudioPath,
    finalAudioSize,
  };
}
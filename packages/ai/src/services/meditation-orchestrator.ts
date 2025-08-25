import path from "path";
import fs from "fs/promises";
import { MeditationGeneratorAgent } from "../agents/meditation-generator";
import { MeditationMusicService } from "./meditation-music";
import {
  MeditationAudioService,
  type MeditationAudioResult,
} from "./meditation-audio";
import { composeMeditation } from "../utils/audio";

export interface MeditationOptions {
  topic: string;
  duration: number;
  voiceId?: string;
  outputDir?: string;
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
  outputDir?: string;
}

export class MeditationOrchestrator {
  private agent: MeditationGeneratorAgent;

  constructor() {
    this.agent = new MeditationGeneratorAgent();
  }

  async generateComplete(
    options: MeditationOptions,
  ): Promise<MeditationResult> {
    const {
      topic,
      duration,
      voiceId = process.env.ELEVENLABS_MEDITATION_VOICE_ID,
      outputDir,
    } = options;

    console.log(
      `[Orchestrator] Starting meditation generation for: ${topic} (${duration} min)`,
    );

    // Step 1: Generate meditation text
    const textResult = await this.agent.generate(topic, duration);
    console.log(
      `[Orchestrator] Text generated: ${textResult.text?.length || 0} chars`,
    );

    // Step 2: Generate audio and music in parallel
    const audioService = new MeditationAudioService({
      voiceId,
      useSegmented: true,
    });
    const musicService = new MeditationMusicService();

    const [audioResult, musicResult] = await Promise.all([
      audioService.generateAndSave(textResult.text, topic, duration),
      musicService.generateMusicFromParameters(
        textResult.musicParameters,
        Math.min(duration, 5),
      ),
    ]);

    console.log(`[Orchestrator] Audio and music generated`);

    // Step 3: Mix audio and music
    let finalAudioPath: string;
    let finalAudioSize: number;

    if (outputDir) {
      await fs.mkdir(outputDir, { recursive: true });
      finalAudioPath = path.join(outputDir, "meditation_complete.mp3");
    } else {
      const filename = `${topic.replace(/\s+/g, "-")}_${duration}min_complete_${Date.now()}.mp3`;
      const publicPath = path.join(
        process.cwd(),
        "public",
        "audio",
        "meditations",
        filename,
      );
      finalAudioPath = publicPath;
    }

    // Get actual file paths - process.cwd() is already apps/cybertantra when running from Next.js!
    const voiceFilename = path.basename(audioResult.audioPath);
    const musicFilename = path.basename(musicResult.musicPath);

    const voicePath = path.join(
      process.cwd(),
      "public/audio/meditations",
      voiceFilename,
    );
    const musicPath = path.join(
      process.cwd(),
      "public/audio/music",
      musicFilename,
    );

    // Mix with 432Hz and reverb
    await composeMeditation(voicePath, musicPath, finalAudioPath, {
      musicVolume: 0.175, // Half of 0.35 (default)
      voiceVolume: 1.0, // Max voice volume
      normalize: true, // Normalize the final output
      outputGain: 2.34375, // Amplify final output by 2.34375x (1.875 * 1.25)
    });

    const stats = await fs.stat(finalAudioPath);
    finalAudioSize = stats.size;

    // Don't clean up temporary files - keep them for debugging
    // try {
    //   console.log(`[Orchestrator] Cleaning up temporary files...`);
    //   await fs.unlink(voicePath);
    //   await fs.unlink(musicPath);
    //   console.log(`[Orchestrator] Temporary files cleaned up`);
    // } catch (error) {
    //   console.error(`[Orchestrator] Error cleaning up temporary files:`, error);
    // }

    // Save text files if output directory specified (CLI mode)
    if (outputDir) {
      await fs.writeFile(
        path.join(outputDir, "meditation.txt"),
        textResult.text,
      );
      await fs.writeFile(
        path.join(outputDir, "parameters.json"),
        JSON.stringify(
          {
            topic,
            duration,
            musicParameters: textResult.musicParameters,
            generatedAt: new Date().toISOString(),
          },
          null,
          2,
        ),
      );
    }

    // Return public path for API mode
    const publicAudioPath = outputDir
      ? finalAudioPath
      : `/audio/meditations/${path.basename(finalAudioPath)}`;

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
      outputDir,
    };
  }
}

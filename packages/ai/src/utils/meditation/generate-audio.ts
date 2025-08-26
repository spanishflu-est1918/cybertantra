import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { TextToSpeechService } from "../../services/text-to-speech";
import {
  parseTextIntoSegments,
  generateAllSegments,
  stitchAudioSegments,
} from "../tts";

export interface AudioGenerationOptions {
  text: string;
  topic: string;
  duration: number;
  voiceId?: string;
  outputDir?: string;
  useSegmented?: boolean;
}

export interface AudioGenerationResult {
  audioPath: string; // Public path for web access
  filePath: string; // Actual filesystem path
  audioSize: number;
  filename: string;
  segmentCount?: number;
  method?: "standard" | "segmented";
}

/**
 * Generate meditation audio from text
 */
export async function generateMeditationAudio(
  options: AudioGenerationOptions,
): Promise<AudioGenerationResult> {
  const {
    text,
    topic,
    duration,
    voiceId,
    outputDir = path.join(
      path.resolve(__dirname, "../../../../../apps/dattatreya"),
      "public",
      "audio",
      "meditations",
    ),
    useSegmented = true,
  } = options;

  console.log(`🎙️ Generating audio for: ${topic} (${duration} min)`);
  console.log(
    `📊 Method: ${useSegmented ? "Segmented (better quality)" : "Standard"}`,
  );

  if (useSegmented) {
    return generateSegmentedAudio({
      text,
      topic,
      duration,
      voiceId,
      outputDir,
    });
  }

  return generateStandardAudio({ text, topic, duration, voiceId, outputDir });
}

/**
 * Generate segmented audio with proper timing
 */
async function generateSegmentedAudio(options: {
  text: string;
  topic: string;
  duration: number;
  voiceId?: string;
  outputDir: string;
}): Promise<AudioGenerationResult> {
  const { text, topic, duration, voiceId, outputDir } = options;

  // Parse text into segments
  const segments = parseTextIntoSegments(text);

  // Create temp directory for segments
  const sessionId = crypto.randomBytes(8).toString("hex");
  const tempDir = path.join(process.cwd(), "temp", "audio-segments", sessionId);
  await fs.mkdir(tempDir, { recursive: true });

  try {
    // Generate all segments (speech and silence)
    const segmentPaths = await generateAllSegments(segments, tempDir, voiceId);

    // Create output filename and put in segmented subdirectory
    const filename = createFilename(topic, duration, "segmented");
    const segmentedDir = path.join(path.dirname(outputDir), "segmented");
    const outputPath = path.join(segmentedDir, filename);

    // Ensure output directory exists
    await fs.mkdir(segmentedDir, { recursive: true });

    // Stitch segments together
    await stitchAudioSegments(segmentPaths, outputPath);

    // Get file size
    const stats = await fs.stat(outputPath);

    return {
      audioPath: `/audio/segmented/${filename}`,
      filePath: outputPath,
      audioSize: stats.size,
      filename,
      segmentCount: segments.length,
      method: "segmented",
    };
  } finally {
    // Clean up temp files
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Generate standard audio (fallback)
 */
async function generateStandardAudio(options: {
  text: string;
  topic: string;
  duration: number;
  voiceId?: string;
  outputDir: string;
}): Promise<AudioGenerationResult> {
  const { text, topic, duration, voiceId, outputDir } = options;

  console.log(`⚠️ Using standard TTS (may have timing issues with breaks)`);

  // Generate audio buffer using TTS service (wraps external API)
  const tts = new TextToSpeechService(voiceId);
  const audioBuffer = await tts.generateAudio(text);

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  // Create filename
  const filename = createFilename(topic, duration, "standard");
  const filePath = path.join(outputDir, filename);

  // Save audio file
  await fs.writeFile(filePath, audioBuffer);

  return {
    audioPath: `/audio/meditations/${filename}`,
    filePath: filePath,
    audioSize: audioBuffer.length,
    filename,
    method: "standard",
  };
}

/**
 * Create a standardized filename for audio files
 */
function createFilename(topic: string, duration: number, type: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeTopicName = topic
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 50);

  return `${safeTopicName}_${duration}min_${type}_${timestamp}.mp3`;
}

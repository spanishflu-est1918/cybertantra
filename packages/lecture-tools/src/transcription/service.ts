import { AssemblyAI } from "assemblyai";
import { sql } from "@vercel/postgres";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

// AssemblyAI pricing (as of 2024)
const PRICING = {
  best: 0.00028, // $0.28 per hour for Best tier
  nano: 0.0002, // Estimated cheaper tier (~30% less)
};

export interface TranscriptionConfig {
  modelTier: "best" | "nano";
  speakerLabels: boolean;
  languageCode: string;
  timestamps?: boolean; // Request word-level timestamps
}

export interface TranscriptionResult {
  success: boolean;
  transcriptPath?: string;
  duration?: number;
  cost?: number;
  error?: string;
}

export interface TimestampedSegment {
  start: number; // seconds
  end: number; // seconds
  text: string;
  speaker?: string;
}

export interface TranscriptionWithTimestamps {
  segments: TimestampedSegment[];
  fullText: string;
  duration: number; // minutes
  metadata: {
    title?: string;
    wordCount: number;
    speakingTime: number; // minutes
    pauseTime: number; // minutes
  };
}

export class TranscriptionService {
  private client: AssemblyAI;
  private jobId: string;

  constructor(apiKey?: string) {
    this.client = new AssemblyAI({
      apiKey: apiKey || process.env.ASSEMBLYAI_API_KEY!,
    });
    this.jobId = `transcribe-${Date.now()}`;
  }

  async scanAudioFiles(audioDir: string): Promise<
    Array<{
      filename: string;
      needsTranscription: boolean;
      existingTranscript?: string;
      status?: string;
    }>
  > {
    const files = await fs.readdir(audioDir);
    const audioFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return [
        ".mp3",
        ".wav",
        ".m4a",
        ".ogg",
        ".flac",
        ".aac",
        ".opus",
      ].includes(ext);
    });

    const results = [];

    for (const file of audioFiles) {
      // Check if already transcribed
      const existing = await sql`
        SELECT status, transcript_path
        FROM transcription_status
        WHERE filename = ${file}
      `;

      results.push({
        filename: file,
        needsTranscription:
          !existing.rows.length || existing.rows[0].status !== "completed",
        existingTranscript: existing.rows[0]?.transcript_path,
        status: existing.rows[0]?.status,
      });
    }

    return results;
  }

  async transcribeFile(
    audioPath: string,
    config: TranscriptionConfig = {
      modelTier: "best",
      speakerLabels: true,
      languageCode: "en",
    },
    outputDir?: string,
  ): Promise<TranscriptionResult> {
    const filename = path.basename(audioPath);
    const startTime = Date.now();

    try {
      // Update status to transcribing
      await sql`
        INSERT INTO transcription_status (
          filename, file_path, file_size, status, model_tier,
          speaker_labels, language_code, started_at
        ) VALUES (
          ${filename}, ${audioPath},
          ${(await fs.stat(audioPath)).size},
          'transcribing', ${config.modelTier},
          ${config.speakerLabels}, ${config.languageCode},
          CURRENT_TIMESTAMP
        )
        ON CONFLICT (filename) DO UPDATE SET
          status = 'transcribing',
          started_at = CURRENT_TIMESTAMP,
          model_tier = ${config.modelTier}
      `;

      console.log(
        `🎙️  Transcribing ${filename} with ${config.modelTier} model...`,
      );

      // Configure AssemblyAI
      const aaiConfig: any = {
        audio: audioPath,
        speaker_labels: config.speakerLabels,
        language_code: config.languageCode,
      };

      // Request word-level timestamps if needed
      if (config.timestamps) {
        aaiConfig.word_level_timestamps = true;
      }

      // Use best model by default or nano for cost savings
      if (config.modelTier === "nano") {
        // @ts-ignore - AssemblyAI may not have typed this yet
        aaiConfig.speech_model = "nano";
      }

      // Start transcription
      const transcript = await this.client.transcripts.transcribe(aaiConfig);

      if (transcript.status === "error") {
        throw new Error(transcript.error || "Transcription failed");
      }

      // Calculate cost (duration in seconds)
      const durationHours = (transcript.audio_duration || 0) / 3600;
      const cost = durationHours * PRICING[config.modelTier];

      // Save transcript
      const outputPath = await this.saveTranscript(
        transcript,
        filename,
        outputDir,
      );

      // Update database
      await sql`
        UPDATE transcription_status SET
          status = 'completed',
          assemblyai_transcript_id = ${transcript.id},
          audio_duration_seconds = ${transcript.audio_duration},
          cost_estimate = ${cost},
          transcript_path = ${outputPath},
          completed_at = CURRENT_TIMESTAMP
        WHERE filename = ${filename}
      `;

      // Map audio to transcript
      const transcriptFilename = path.basename(outputPath);
      await sql`
        INSERT INTO audio_transcript_mapping (audio_filename, transcript_filename)
        VALUES (${filename}, ${transcriptFilename})
        ON CONFLICT (audio_filename) DO UPDATE SET
          transcript_filename = ${transcriptFilename}
      `;

      const processingTime = (Date.now() - startTime) / 1000;
      console.log(
        `✅ Transcribed in ${processingTime.toFixed(1)}s | Cost: $${cost.toFixed(4)}`,
      );

      return {
        success: true,
        transcriptPath: outputPath,
        duration: transcript.audio_duration ?? 0,
        cost,
      };
    } catch (error) {
      console.error(`❌ Failed to transcribe ${filename}:`, error);

      await sql`
        UPDATE transcription_status SET
          status = 'failed',
          error_message = ${error instanceof Error ? error.message : "Unknown error"},
          completed_at = CURRENT_TIMESTAMP
        WHERE filename = ${filename}
      `;

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async saveTranscript(
    transcript: any,
    originalFileName: string,
    outputDir?: string,
  ): Promise<string> {
    const baseName = path.basename(
      originalFileName,
      path.extname(originalFileName),
    );
    // Use provided output directory or default to ./lectures
    const lecturesDir = outputDir || "./lectures";
    await fs.mkdir(lecturesDir, { recursive: true });

    let outputPath = "";

    // Save as plain text for ingestion (default)
    const textPath = path.join(lecturesDir, `${baseName}.txt`);

    if (transcript.utterances && transcript.utterances.length > 0) {
      // Clean text only for vector DB ingestion
      let content = "";
      transcript.utterances.forEach((utterance: any) => {
        content += utterance.text + " ";
      });

      await fs.writeFile(textPath, content.trim(), "utf8");
    } else {
      // Just plain text, no metadata
      await fs.writeFile(textPath, transcript.text || "", "utf8");
    }

    outputPath = textPath;

    return outputPath;
  }

  private formatDuration(seconds?: number): string {
    if (!seconds) return "Unknown";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  }

  async getTranscriptionStats(): Promise<{
    totalFiles: number;
    completed: number;
    failed: number;
    pending: number;
    totalDuration: number;
    totalCost: number;
  }> {
    const stats = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COALESCE(SUM(audio_duration_seconds), 0) as total_duration,
        COALESCE(SUM(cost_estimate), 0) as total_cost
      FROM transcription_status
    `;

    return {
      totalFiles: stats.rows[0].total,
      completed: stats.rows[0].completed,
      failed: stats.rows[0].failed,
      pending: stats.rows[0].pending,
      totalDuration: stats.rows[0].total_duration,
      totalCost: stats.rows[0].total_cost,
    };
  }

  async createTranscriptionJob(totalFiles: number): Promise<void> {
    await sql`
      INSERT INTO transcription_jobs (job_id, total_files)
      VALUES (${this.jobId}, ${totalFiles})
    `;
  }

  async updateJobProgress(
    processed: number,
    failed: number,
    duration: number,
    cost: number,
  ): Promise<void> {
    await sql`
      UPDATE transcription_jobs SET
        processed_files = ${processed},
        failed_files = ${failed},
        total_duration_seconds = total_duration_seconds + ${duration},
        total_cost = total_cost + ${cost}
      WHERE job_id = ${this.jobId}
    `;
  }

  async completeJob(
    status: "completed" | "failed" = "completed",
  ): Promise<void> {
    await sql`
      UPDATE transcription_jobs SET
        status = ${status},
        completed_at = CURRENT_TIMESTAMP
      WHERE job_id = ${this.jobId}
    `;
  }

  async transcribeWithTimestamps(
    audioPath: string,
    config: TranscriptionConfig = {
      modelTier: "best",
      speakerLabels: false,
      languageCode: "en",
    },
  ): Promise<TranscriptionWithTimestamps> {
    console.log(`🎙️  Starting timestamped transcription...`);

    const aaiConfig: any = {
      audio: audioPath,
      speaker_labels: config.speakerLabels,
      language_code: config.languageCode,
    };

    if (config.modelTier === "nano") {
      // @ts-ignore
      aaiConfig.speech_model = "nano";
    }

    const transcript = await this.client.transcripts.transcribe(aaiConfig);

    if (transcript.status === "error") {
      throw new Error(transcript.error || "Transcription failed");
    }

    // Extract timestamped segments
    const segments: TimestampedSegment[] = [];

    if (transcript.words) {
      // Process word-level timestamps
      let currentSegment: TimestampedSegment | null = null;
      let lastEndTime = 0;

      for (const word of transcript.words) {
        const startMs = word.start;
        const endMs = word.end;

        // Check for pause (gap > 1.5 seconds)
        if (currentSegment && startMs - lastEndTime > 1500) {
          // Save current segment
          segments.push(currentSegment);

          // Add pause marker
          segments.push({
            start: lastEndTime / 1000,
            end: startMs / 1000,
            text: `[pause ${((startMs - lastEndTime) / 1000).toFixed(1)}s]`,
          });

          // Start new segment
          currentSegment = {
            start: startMs / 1000,
            end: endMs / 1000,
            text: word.text,
            speaker: word.speaker || undefined,
          };
        } else if (!currentSegment) {
          // First segment
          currentSegment = {
            start: startMs / 1000,
            end: endMs / 1000,
            text: word.text,
            speaker: word.speaker || undefined,
          };
        } else {
          // Continue current segment
          currentSegment.text += " " + word.text;
          currentSegment.end = endMs / 1000;
        }

        lastEndTime = endMs;
      }

      // Add final segment
      if (currentSegment) {
        segments.push(currentSegment);
      }
    } else if (transcript.utterances) {
      // Fallback to utterance-level timestamps
      for (const utterance of transcript.utterances) {
        segments.push({
          start: utterance.start / 1000,
          end: utterance.end / 1000,
          text: utterance.text,
          speaker: utterance.speaker || undefined,
        });

        // Add pause detection between utterances
        const nextUtterance =
          transcript.utterances[transcript.utterances.indexOf(utterance) + 1];
        if (nextUtterance && nextUtterance.start - utterance.end > 1500) {
          segments.push({
            start: utterance.end / 1000,
            end: nextUtterance.start / 1000,
            text: `[pause ${((nextUtterance.start - utterance.end) / 1000).toFixed(1)}s]`,
          });
        }
      }
    }

    // Calculate metadata
    const fullText = segments
      .filter((s) => !s.text.startsWith("[pause"))
      .map((s) => s.text)
      .join(" ");

    const wordCount = fullText.split(/\s+/).length;
    const speakingTime =
      segments
        .filter((s) => !s.text.startsWith("[pause"))
        .reduce((acc, s) => acc + (s.end - s.start), 0) / 60;

    const pauseTime =
      segments
        .filter((s) => s.text.startsWith("[pause"))
        .reduce((acc, s) => acc + (s.end - s.start), 0) / 60;

    return {
      segments,
      fullText,
      duration: (transcript.audio_duration || 0) / 60,
      metadata: {
        wordCount,
        speakingTime,
        pauseTime,
      },
    };
  }

  async saveTimestampedTranscript(
    transcription: TranscriptionWithTimestamps,
    outputPath: string,
    format: "markdown" | "json" | "srt" = "markdown",
  ): Promise<void> {
    let content = "";

    switch (format) {
      case "markdown":
        content = this.formatTimestampedAsMarkdown(transcription);
        break;
      case "json":
        content = JSON.stringify(transcription, null, 2);
        break;
      case "srt":
        content = this.formatTimestampedAsSRT(transcription);
        break;
    }

    // Create directory if it doesn't exist
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(outputPath, content, "utf8");
  }

  private formatTimestampedAsMarkdown(
    transcription: TranscriptionWithTimestamps,
  ): string {
    const { segments, metadata, duration } = transcription;

    let content = `# Timestamped Transcription\n\n`;
    content += `## Metadata\n`;
    content += `- **Duration**: ${duration.toFixed(1)} minutes\n`;
    content += `- **Word Count**: ${metadata.wordCount}\n`;
    content += `- **Speaking Time**: ${metadata.speakingTime.toFixed(1)} minutes\n`;
    content += `- **Pause Time**: ${metadata.pauseTime.toFixed(1)} minutes\n`;
    content += `- **Speaking Rate**: ${(metadata.wordCount / metadata.speakingTime).toFixed(0)} words/minute\n\n`;

    content += `## Transcript\n\n`;

    for (const segment of segments) {
      const timestamp = this.formatTimestamp(segment.start);

      if (segment.text.startsWith("[pause")) {
        content += `\n**${timestamp}** ${segment.text}\n\n`;
      } else {
        const speaker = segment.speaker ? `[Speaker ${segment.speaker}] ` : "";
        content += `**${timestamp}** ${speaker}${segment.text}\n\n`;
      }
    }

    return content;
  }

  private formatTimestampedAsSRT(
    transcription: TranscriptionWithTimestamps,
  ): string {
    const { segments } = transcription;
    let content = "";
    let index = 1;

    for (const segment of segments) {
      if (!segment.text.startsWith("[pause")) {
        const startTime = this.formatSRTTime(segment.start);
        const endTime = this.formatSRTTime(segment.end);

        content += `${index}\n`;
        content += `${startTime} --> ${endTime}\n`;
        content += `${segment.text}\n\n`;
        index++;
      }
    }

    return content;
  }

  private formatTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }

  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")},${millis
      .toString()
      .padStart(3, "0")}`;
  }
}

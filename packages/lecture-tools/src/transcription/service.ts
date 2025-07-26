import { AssemblyAI } from 'assemblyai';
import { sql } from '@vercel/postgres';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// AssemblyAI pricing (as of 2024)
const PRICING = {
  best: 0.00028,    // $0.28 per hour for Best tier
  nano: 0.00020,    // Estimated cheaper tier (~30% less)
};

export interface TranscriptionConfig {
  modelTier: 'best' | 'nano';
  speakerLabels: boolean;
  languageCode: string;
}

export interface TranscriptionResult {
  success: boolean;
  transcriptPath?: string;
  duration?: number;
  cost?: number;
  error?: string;
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
  
  async scanAudioFiles(audioDir: string): Promise<Array<{
    filename: string;
    needsTranscription: boolean;
    existingTranscript?: string;
    status?: string;
  }>> {
    const files = await fs.readdir(audioDir);
    const audioFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac'].includes(ext);
    });
    
    const results = [];
    
    for (const file of audioFiles) {
      // Check if already transcribed
      const existing = await sql`
        SELECT status, transcript_path 
        FROM transcription_status 
        WHERE filename = ${file}
      `;
      
      // Check if transcript file exists
      const baseName = path.basename(file, path.extname(file));
      const transcriptPath = path.join('./lectures', `${baseName}.txt`);
      let transcriptExists = false;
      
      try {
        await fs.access(transcriptPath);
        transcriptExists = true;
      } catch {
        // Transcript doesn't exist
      }
      
      results.push({
        filename: file,
        needsTranscription: !transcriptExists && 
          (!existing.rows.length || existing.rows[0].status !== 'completed'),
        existingTranscript: transcriptExists ? transcriptPath : undefined,
        status: existing.rows[0]?.status,
      });
    }
    
    return results;
  }
  
  async transcribeFile(
    audioPath: string,
    config: TranscriptionConfig = {
      modelTier: 'best',
      speakerLabels: true,
      languageCode: 'en',
    }
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
      
      console.log(`🎙️  Transcribing ${filename} with ${config.modelTier} model...`);
      
      // Configure AssemblyAI
      const aaiConfig = {
        audio: audioPath,
        speaker_labels: config.speakerLabels,
        language_code: config.languageCode,
      };
      
      // Use best model by default or nano for cost savings
      if (config.modelTier === 'nano') {
        // @ts-ignore - AssemblyAI may not have typed this yet
        aaiConfig.speech_model = 'nano';
      }
      
      // Start transcription
      const transcript = await this.client.transcripts.transcribe(aaiConfig);
      
      if (transcript.status === 'error') {
        throw new Error(transcript.error || 'Transcription failed');
      }
      
      // Calculate cost (duration in seconds)
      const durationHours = (transcript.audio_duration || 0) / 3600;
      const cost = durationHours * PRICING[config.modelTier];
      
      // Save transcript
      const outputPath = await this.saveTranscript(
        transcript, 
        filename
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
      console.log(`✅ Transcribed in ${processingTime.toFixed(1)}s | Cost: $${cost.toFixed(4)}`);
      
      return {
        success: true,
        transcriptPath: outputPath,
        duration: transcript.audio_duration,
        cost,
      };
      
    } catch (error) {
      console.error(`❌ Failed to transcribe ${filename}:`, error);
      
      await sql`
        UPDATE transcription_status SET
          status = 'failed',
          error_message = ${error instanceof Error ? error.message : 'Unknown error'},
          completed_at = CURRENT_TIMESTAMP
        WHERE filename = ${filename}
      `;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  private async saveTranscript(
    transcript: any, 
    originalFileName: string
  ): Promise<string> {
    const baseName = path.basename(originalFileName, path.extname(originalFileName));
    const lecturesDir = './lectures';
    await fs.mkdir(lecturesDir, { recursive: true });
    
    let outputPath = '';
    
    // Save as plain text for ingestion (default)
    const textPath = path.join(lecturesDir, `${baseName}.txt`);
    
    if (transcript.utterances && transcript.utterances.length > 0) {
      // Format with speaker labels
      let content = `# ${baseName}\n\n`;
      content += `Transcription Date: ${new Date().toISOString()}\n`;
      content += `Duration: ${this.formatDuration(transcript.audio_duration)}\n\n`;
      content += '---\n\n';
      
      transcript.utterances.forEach((utterance: any) => {
        content += `[Speaker ${utterance.speaker}]: ${utterance.text}\n\n`;
      });
      
      await fs.writeFile(textPath, content, 'utf8');
    } else {
      // Just plain text
      let content = `# ${baseName}\n\n`;
      content += `Transcription Date: ${new Date().toISOString()}\n\n`;
      content += '---\n\n';
      content += transcript.text;
      
      await fs.writeFile(textPath, content, 'utf8');
    }
    
    outputPath = textPath;
    
    return outputPath;
  }
  
  private formatDuration(seconds?: number): string {
    if (!seconds) return 'Unknown';
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
  
  async updateJobProgress(processed: number, failed: number, duration: number, cost: number): Promise<void> {
    await sql`
      UPDATE transcription_jobs SET
        processed_files = ${processed},
        failed_files = ${failed},
        total_duration_seconds = total_duration_seconds + ${duration},
        total_cost = total_cost + ${cost}
      WHERE job_id = ${this.jobId}
    `;
  }
  
  async completeJob(status: 'completed' | 'failed' = 'completed'): Promise<void> {
    await sql`
      UPDATE transcription_jobs SET
        status = ${status},
        completed_at = CURRENT_TIMESTAMP
      WHERE job_id = ${this.jobId}
    `;
  }
}
import { sql } from '@vercel/postgres';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export interface FileStatus {
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  chunks_count: number;
  error_message?: string;
  processing_time_ms?: number;
}

export interface IngestionSession {
  session_id: string;
  total_files: number;
  processed_files: number;
  failed_files: number;
  skipped_files: number;
  total_chunks: number;
  status: 'running' | 'completed' | 'failed';
}

export class IngestionTracker {
  private sessionId: string;

  constructor(sessionId?: string) {
    this.sessionId = sessionId || `session-${Date.now()}`;
  }

  async initializeSession(totalFiles: number): Promise<void> {
    await sql`
      INSERT INTO ingestion_sessions (session_id, total_files)
      VALUES (${this.sessionId}, ${totalFiles})
      ON CONFLICT (session_id) DO NOTHING
    `;
  }

  async scanLectureDirectory(lecturesDir: string): Promise<FileStatus[]> {
    const files = await fs.readdir(lecturesDir);
    const lectureFiles = files.filter(file => file.endsWith('.txt') || file.endsWith('.md'));
    
    const fileStatuses: FileStatus[] = [];

    for (const file of lectureFiles) {
      const filePath = path.join(lecturesDir, file);
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf-8');
      const fileHash = crypto.createHash('sha256').update(content).digest('hex');

      // Check existing status
      const existing = await sql`
        SELECT status, file_hash, chunks_count, error_message
        FROM ingestion_status
        WHERE filename = ${file}
      `;

      let status: FileStatus['status'] = 'pending';
      let chunks_count = 0;
      let error_message: string | undefined;

      if (existing.rows.length > 0) {
        const row = existing.rows[0];
        if (row.file_hash === fileHash && row.status === 'completed') {
          status = 'skipped';
          chunks_count = row.chunks_count;
        } else if (row.status === 'failed') {
          status = 'pending'; // Retry failed files
          error_message = row.error_message;
        } else {
          status = row.status;
          chunks_count = row.chunks_count;
        }
      }

      // Insert or update file record
      await sql`
        INSERT INTO ingestion_status (
          filename, file_path, file_size, file_hash, status, words_count
        ) VALUES (
          ${file}, ${filePath}, ${stats.size}, ${fileHash}, ${status},
          ${content.split(/\s+/).length}
        )
        ON CONFLICT (filename) DO UPDATE SET
          file_hash = ${fileHash},
          file_size = ${stats.size},
          words_count = ${content.split(/\s+/).length},
          updated_at = CURRENT_TIMESTAMP
      `;

      fileStatuses.push({
        filename: file,
        status,
        chunks_count,
        error_message
      });
    }

    return fileStatuses;
  }

  async markFileProcessing(filename: string): Promise<void> {
    await sql`
      UPDATE ingestion_status
      SET status = 'processing', started_at = CURRENT_TIMESTAMP
      WHERE filename = ${filename}
    `;
  }

  async markFileCompleted(
    filename: string, 
    chunksCount: number, 
    processingTimeMs: number
  ): Promise<void> {
    await sql`
      UPDATE ingestion_status
      SET 
        status = 'completed',
        chunks_count = ${chunksCount},
        processing_time_ms = ${processingTimeMs},
        completed_at = CURRENT_TIMESTAMP
      WHERE filename = ${filename}
    `;

    await this.updateSessionProgress();
  }

  async markFileFailed(filename: string, error: string): Promise<void> {
    await sql`
      UPDATE ingestion_status
      SET 
        status = 'failed',
        error_message = ${error},
        completed_at = CURRENT_TIMESTAMP
      WHERE filename = ${filename}
    `;

    await this.updateSessionProgress();
  }

  async trackChunkProgress(
    filename: string, 
    chunkIndex: number, 
    status: 'created' | 'embedding' | 'stored' | 'failed',
    error?: string
  ): Promise<void> {
    await sql`
      INSERT INTO chunk_processing_log (filename, chunk_index, status, error_message)
      VALUES (${filename}, ${chunkIndex}, ${status}, ${error || null})
      ON CONFLICT (filename, chunk_index) DO UPDATE SET
        status = ${status},
        error_message = ${error || null},
        retry_count = chunk_processing_log.retry_count + 1
    `;
  }

  private async updateSessionProgress(): Promise<void> {
    const progress = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'completed') as processed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'skipped') as skipped,
        SUM(chunks_count) as total_chunks
      FROM ingestion_status
    `;

    const { processed, failed, skipped, total_chunks } = progress.rows[0];

    await sql`
      UPDATE ingestion_sessions
      SET 
        processed_files = ${processed},
        failed_files = ${failed},
        skipped_files = ${skipped},
        total_chunks = ${total_chunks || 0}
      WHERE session_id = ${this.sessionId}
    `;
  }

  async getSessionStatus(): Promise<IngestionSession> {
    const result = await sql`
      SELECT * FROM ingestion_sessions
      WHERE session_id = ${this.sessionId}
    `;

    return result.rows[0] as IngestionSession;
  }

  async getDetailedStatus(): Promise<{
    session: IngestionSession;
    files: FileStatus[];
    summary: {
      pending: number;
      processing: number;
      completed: number;
      failed: number;
      skipped: number;
    };
  }> {
    const session = await this.getSessionStatus();
    
    const files = await sql`
      SELECT filename, status, chunks_count, error_message, processing_time_ms
      FROM ingestion_status
      ORDER BY 
        CASE status 
          WHEN 'failed' THEN 1
          WHEN 'processing' THEN 2
          WHEN 'pending' THEN 3
          WHEN 'completed' THEN 4
          WHEN 'skipped' THEN 5
        END,
        filename
    `;

    const summary = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'processing') as processing,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'skipped') as skipped
      FROM ingestion_status
    `;

    return {
      session,
      files: files.rows as FileStatus[],
      summary: summary.rows[0] as { pending: number; processing: number; completed: number; failed: number; skipped: number; },
    };
  }

  async completeSession(status: 'completed' | 'failed' = 'completed'): Promise<void> {
    await sql`
      UPDATE ingestion_sessions
      SET status = ${status}, completed_at = CURRENT_TIMESTAMP
      WHERE session_id = ${this.sessionId}
    `;
  }

  // Get failed chunks for retry
  async getFailedChunks(filename: string): Promise<number[]> {
    const result = await sql`
      SELECT chunk_index
      FROM chunk_processing_log
      WHERE filename = ${filename} AND status = 'failed'
      ORDER BY chunk_index
    `;

    return result.rows.map(r => r.chunk_index);
  }
}
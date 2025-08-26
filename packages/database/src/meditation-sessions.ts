import { sql } from './index';

export interface MeditationSession {
  id: string;
  slug: string;
  topic: string;
  duration: number;
  audioPath: string;
  audioSize: number | null;
  voiceId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function getAllMeditations(): Promise<MeditationSession[]> {
  const result = await sql<MeditationSession>`
    SELECT 
      id,
      slug,
      topic,
      duration,
      audio_path as "audioPath",
      audio_size as "audioSize",
      voice_id as "voiceId",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM meditation_sessions
    ORDER BY created_at DESC
  `;
  
  return result.rows;
}

export async function getMeditationBySlug(slug: string): Promise<MeditationSession | null> {
  const result = await sql<MeditationSession>`
    SELECT 
      id,
      slug,
      topic,
      duration,
      audio_path as "audioPath",
      audio_size as "audioSize",
      voice_id as "voiceId",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM meditation_sessions
    WHERE slug = ${slug}
    LIMIT 1
  `;
  
  return result.rows[0] || null;
}

export async function saveMeditationSession(data: {
  topic: string;
  duration: number;
  audioPath: string;
  audioSize?: number;
  voiceId?: string;
}): Promise<MeditationSession> {
  // Generate slug
  const timestamp = Date.now().toString(36);
  const slug = `${data.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${data.duration}min-${timestamp}`;
  
  const result = await sql<MeditationSession>`
    INSERT INTO meditation_sessions (
      slug,
      topic,
      duration,
      audio_path,
      audio_size,
      voice_id
    ) VALUES (
      ${slug},
      ${data.topic},
      ${data.duration},
      ${data.audioPath},
      ${data.audioSize || null},
      ${data.voiceId || null}
    )
    RETURNING 
      id,
      slug,
      topic,
      duration,
      audio_path as "audioPath",
      audio_size as "audioSize",
      voice_id as "voiceId",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `;
  
  return result.rows[0];
}
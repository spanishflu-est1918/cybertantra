import { sql } from './client';
import crypto from 'crypto';

export interface MeditationSession {
  id: string;
  slug: string;
  topic: string;
  duration: number;
  audioPath: string;
  audioSize?: number;
  voiceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMeditationSessionData {
  topic: string;
  duration: number;
  audioPath: string;
  audioSize?: number;
  voiceId?: string;
}

/**
 * Generate a URL-friendly slug from topic and duration
 */
export function generateSlug(topic: string, duration: number): string {
  const baseSlug = topic
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 40);
  
  // Add short hash to ensure uniqueness
  const hash = crypto.randomBytes(4).toString('hex');
  return `${baseSlug}-${duration}min-${hash}`;
}

/**
 * Save meditation session to database
 */
export async function saveMeditationSession(data: CreateMeditationSessionData): Promise<MeditationSession> {
  const slug = generateSlug(data.topic, data.duration);
  
  const result = await sql`
    INSERT INTO meditation_sessions (slug, topic, duration, audio_path, audio_size, voice_id)
    VALUES (${slug}, ${data.topic}, ${data.duration}, ${data.audioPath}, ${data.audioSize || null}, ${data.voiceId || null})
    RETURNING id, slug, topic, duration, audio_path as "audioPath", audio_size as "audioSize", 
             voice_id as "voiceId", created_at as "createdAt", updated_at as "updatedAt"
  `;
  
  return result.rows[0] as MeditationSession;
}

/**
 * Get meditation session by slug
 */
export async function getMeditationBySlug(slug: string): Promise<MeditationSession | null> {
  const result = await sql`
    SELECT id, slug, topic, duration, audio_path as "audioPath", audio_size as "audioSize",
           voice_id as "voiceId", created_at as "createdAt", updated_at as "updatedAt"
    FROM meditation_sessions 
    WHERE slug = ${slug}
  `;
  
  return result.rows[0] as MeditationSession || null;
}

/**
 * Get recent meditation sessions
 */
export async function getRecentMeditations(limit: number = 20): Promise<MeditationSession[]> {
  const result = await sql`
    SELECT id, slug, topic, duration, audio_path as "audioPath", audio_size as "audioSize",
           voice_id as "voiceId", created_at as "createdAt", updated_at as "updatedAt"
    FROM meditation_sessions 
    ORDER BY created_at DESC 
    LIMIT ${limit}
  `;
  
  return result.rows as MeditationSession[];
}
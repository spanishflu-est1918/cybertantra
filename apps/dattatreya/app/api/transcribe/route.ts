'use server';

import { assemblyai } from '@ai-sdk/assemblyai';
import { experimental_transcribe as transcribe } from 'ai';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audio = formData.get('audio') as File;
    
    if (!audio) {
      return new Response('No audio file provided', { status: 400 });
    }

    console.log('Audio file info:', {
      name: audio.name,
      type: audio.type,
      size: audio.size
    });

    const audioArrayBuffer = await audio.arrayBuffer();
    console.log('Audio ArrayBuffer size:', audioArrayBuffer.byteLength);

    // Save audio file for debugging - use the actual file extension from the File name
    const fs = await import('fs/promises');
    const path = await import('path');
    const actualExtension = audio.name.split('.').pop() || 'webm';
    const debugPath = path.join(process.cwd(), 'public', `debug-audio-${Date.now()}.${actualExtension}`);
    await fs.writeFile(debugPath, Buffer.from(audioArrayBuffer));
    console.log('Audio saved to:', debugPath, 'original filename:', audio.name, 'type:', audio.type);

    const result = await transcribe({
      model: assemblyai.transcription('best'),
      audio: audioArrayBuffer,
    });

    console.log('Transcription result:', result);

    return Response.json({ text: result.text || '' });
  } catch (error) {
    console.error('Transcription error:', error);
    if (error.name === 'AI_NoTranscriptGeneratedError') {
      return Response.json({ text: '' }); // Return empty text for silent audio
    }
    return new Response('Transcription failed', { status: 500 });
  }
}
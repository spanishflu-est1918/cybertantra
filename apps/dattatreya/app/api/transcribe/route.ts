'use server';

import { AssemblyAI } from 'assemblyai';

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

    // Check for API key
    if (!process.env.ASSEMBLYAI_API_KEY) {
      console.error('ASSEMBLYAI_API_KEY not configured');
      return new Response('Transcription service not configured', { status: 500 });
    }

    // Save audio to temp file since AssemblyAI needs a file path or URL
    const fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');
    
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `audio-${Date.now()}.webm`);
    const audioBuffer = Buffer.from(await audio.arrayBuffer());
    await fs.writeFile(tempFilePath, audioBuffer);
    
    console.log('Temp audio file:', tempFilePath);

    // Use AssemblyAI directly
    const client = new AssemblyAI({
      apiKey: process.env.ASSEMBLYAI_API_KEY,
    });

    try {
      const transcript = await client.transcripts.transcribe({
        audio: tempFilePath,
        language_code: 'en',
      });

      console.log('Transcription status:', transcript.status);
      
      // Clean up temp file
      await fs.unlink(tempFilePath).catch(() => {});
      
      if (transcript.status === 'error') {
        console.error('AssemblyAI error:', transcript.error);
        return Response.json({ text: '' });
      }

      const text = transcript.text || '';
      console.log('Transcript result:', text ? `"${text}"` : 'empty');
      
      // Just return the transcript - frontend will handle the streaming
      return Response.json({ text });
    } catch (transcribeError) {
      // Clean up temp file on error
      await fs.unlink(tempFilePath).catch(() => {});
      throw transcribeError;
    }
    
  } catch (error) {
    console.error('Transcription error:', error);
    return new Response('Transcription failed', { status: 500 });
  }
}
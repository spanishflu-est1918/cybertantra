'use server';

import { experimental_transcribe as transcribe } from 'ai';
import { assemblyai } from '@ai-sdk/assemblyai';
import { readFile, writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

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

    // Save audio to temp file
    const tempFilePath = join(tmpdir(), `audio-${Date.now()}.webm`);
    const audioBuffer = Buffer.from(await audio.arrayBuffer());
    await writeFile(tempFilePath, audioBuffer);
    
    console.log('Temp audio file:', tempFilePath);

    try {
      // Use the AI SDK with AssemblyAI provider - EXACTLY like the docs
      const result = await transcribe({
        model: assemblyai.transcription('best'),
        audio: await readFile(tempFilePath),
        providerOptions: { 
          assemblyai: { 
            contentSafety: false,
            wordBoost: [
              'Dattatreya',
              'cybertantra',
              'Shiva',
              'Shakti',
              'Kali',
              'Ganapati',
              'Ganesha',
              'Ucchishta',
              'tantra',
              'tantras',
              'agama',
              'nigama',
              'kula',
              'vajra',
              'mantra',
              'mantras',
              'kala',
              'devata',
              'devatas',
              'murti',
              'Vamachara',
              'Ajna',
              'Vishuddha',
              'Muladhara',
              'chakra',
              'chakras',
              'Kundalini',
              'Mahavidyas',
              'Aghora',
              'prana',
              'siddhis',
              'communion'
            ],
            boostParam: 'high'
          } 
        },
      });

      // Clean up temp file
      await unlink(tempFilePath).catch(() => {});

      const text = result.text || '';
      console.log('Transcript result:', text ? `"${text}"` : 'empty');
      
      // Return the transcript with all available data
      return Response.json({ 
        text,
        segments: result.segments,
        language: result.language,
        durationInSeconds: result.durationInSeconds
      });
    } catch (transcribeError) {
      // Clean up temp file on error
      await unlink(tempFilePath).catch(() => {});
      console.error('Transcription error:', transcribeError);
      throw transcribeError;
    }
    
  } catch (error) {
    console.error('Transcription error:', error);
    return new Response('Transcription failed', { status: 500 });
  }
}
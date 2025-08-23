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
      
      // Send transcript to cybertantra process-voice endpoint
      if (text) {
        console.log('Sending transcript to cybertantra API...');
        
        // Determine endpoint based on environment
        const isDevelopment = process.env.NODE_ENV === 'development';
        const endpoint = isDevelopment 
          ? 'http://localhost:9999/api/process-voice'
          : 'https://cybertantra-omega.vercel.app/api/process-voice';
        
        console.log('Using endpoint:', endpoint);
        console.log('API Key present:', !!process.env.CYBERTANTRA_API_KEY);
        
        try {
          const processResponse = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.CYBERTANTRA_API_KEY || '',
            },
            body: JSON.stringify({ transcript: text }),
          });
          
          console.log('Response status:', processResponse.status);
          
          if (processResponse.ok) {
            const processData = await processResponse.json();
            console.log('AI Response received:', processData.response ? processData.response.substring(0, 100) + '...' : 'No response');
            return Response.json({ 
              text,
              response: processData.response 
            });
          } else {
            const errorText = await processResponse.text();
            console.error('API error:', processResponse.status, errorText);
          }
        } catch (processError) {
          console.error('Failed to process transcript:', processError.message);
          // Fallback to production if local fails in development
          if (isDevelopment) {
            console.log('Trying production endpoint as fallback...');
            try {
              const fallbackResponse = await fetch('https://cybertantra-omega.vercel.app/api/process-voice', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': process.env.CYBERTANTRA_API_KEY || '',
                },
                body: JSON.stringify({ transcript: text }),
              });
              
              if (fallbackResponse.ok) {
                const processData = await fallbackResponse.json();
                return Response.json({ 
                  text,
                  response: processData.response 
                });
              }
            } catch (fallbackError) {
              console.error('Fallback also failed:', fallbackError.message);
            }
          }
        }
      }
      
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
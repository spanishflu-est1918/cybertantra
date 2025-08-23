'use server';

import Groq from 'groq-sdk';

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
    if (!process.env.GROQ_API_KEY) {
      console.error('GROQ_API_KEY not configured');
      return new Response('Transcription service not configured', { status: 500 });
    }

    // Use Groq directly with the audio file
    const client = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    try {
      const transcription = await client.audio.transcriptions.create({
        file: audio,
        model: 'whisper-large-v3-turbo',
        language: 'en',
        prompt: `This is a conversation about tantric spirituality, mysticism, and esoteric practices. Key terms include: Dattatreya, cybertantra, Shiva, Shakti, Kali, Ganapati, Ganesha, Ucchishta, tantra, tantras, agama, nigama, kula, vajra, mantra, mantras, kala, devata, devatas, murti, Vamachara, Ajna, Vishuddha, Muladhara, chakra, chakras, Kundalini, Mahavidyas, Aghora, prana, siddhis, communion.`,
      });

      const text = transcription.text || '';
      console.log('Transcript result:', text ? `"${text}"` : 'empty');
      
      // Just return the transcript - frontend will handle the streaming
      return Response.json({ text });
      
    } catch (transcribeError) {
      console.error('Groq transcription error:', transcribeError);
      throw transcribeError;
    }
    
  } catch (error) {
    console.error('Transcription error:', error);
    return new Response('Transcription failed', { status: 500 });
  }
}
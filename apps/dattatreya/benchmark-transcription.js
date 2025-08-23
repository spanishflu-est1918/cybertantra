import fs from 'fs';
import path from 'path';
import { AssemblyAI } from 'assemblyai';
import Groq from 'groq-sdk';

// Initialize clients
const assemblyAI = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY
});

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Shared context for both services
const contextTerms = [
  'Dattatreya', 'cybertantra', 'Shiva', 'Shakti', 'Kali', 'Ganapati', 
  'Ganesha', 'Ucchishta', 'tantra', 'tantras', 'agama', 'nigama', 
  'kula', 'vajra', 'mantra', 'mantras', 'kala', 'devata', 'devatas', 
  'murti', 'Vamachara', 'Ajna', 'Vishuddha', 'Muladhara', 'chakra', 
  'chakras', 'Kundalini', 'Mahavidyas', 'Aghora', 'prana', 'siddhis', 
  'communion'
];

async function benchmarkAssemblyAI(audioPath) {
  console.log('🔥 Starting AssemblyAI transcription...');
  const startTime = Date.now();
  
  try {
    const transcript = await assemblyAI.transcripts.transcribe({
      audio: audioPath,
      language_code: 'en',
      speaker_labels: false,
      word_boost: contextTerms,
      boost_param: 'high'
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    return {
      service: 'AssemblyAI',
      duration: duration,
      success: true,
      text: transcript.text,
      audioDuration: transcript.audio_duration,
      cost: (transcript.audio_duration / 3600) * 0.00028 // $0.28 per hour
    };
  } catch (error) {
    const endTime = Date.now();
    return {
      service: 'AssemblyAI',
      duration: endTime - startTime,
      success: false,
      error: error.message
    };
  }
}

async function benchmarkGroq(audioPath) {
  console.log('⚡ Starting Groq transcription...');
  const startTime = Date.now();
  
  try {
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'whisper-large-v3-turbo',
      language: 'en',
      prompt: `This is a conversation about tantric spirituality, mysticism, and esoteric practices. Key terms include: ${contextTerms.join(', ')}.`,
      temperature: 0.0,
      response_format: 'verbose_json'
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    return {
      service: 'Groq',
      duration: duration,
      success: true,
      text: transcription.text,
      audioDuration: transcription.duration,
      cost: 0 // Groq is much cheaper, ~$0.00011 per hour
    };
  } catch (error) {
    const endTime = Date.now();
    return {
      service: 'Groq',
      duration: endTime - startTime,
      success: false,
      error: error.message
    };
  }
}

async function runBenchmark(audioPath) {
  if (!fs.existsSync(audioPath)) {
    console.error(`❌ Audio file not found: ${audioPath}`);
    return;
  }
  
  console.log(`🎙️ Benchmarking transcription services with: ${path.basename(audioPath)}\n`);
  
  // Run both services
  const [assemblyResult, groqResult] = await Promise.all([
    benchmarkAssemblyAI(audioPath),
    benchmarkGroq(audioPath)
  ]);
  
  // Display results
  console.log('\n📊 BENCHMARK RESULTS');
  console.log('='.repeat(50));
  
  [assemblyResult, groqResult].forEach(result => {
    console.log(`\n${result.service}:`);
    console.log(`  Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`  Time: ${(result.duration / 1000).toFixed(2)}s`);
    
    if (result.success) {
      console.log(`  Audio Duration: ${result.audioDuration}s`);
      console.log(`  Speed Ratio: ${(result.audioDuration / (result.duration / 1000)).toFixed(2)}x realtime`);
      console.log(`  Cost: $${result.cost.toFixed(6)}`);
      console.log(`  Text Length: ${result.text.length} chars`);
      console.log(`  Preview: "${result.text.substring(0, 100)}..."`);
    } else {
      console.log(`  Error: ${result.error}`);
    }
  });
  
  // Compare if both succeeded
  if (assemblyResult.success && groqResult.success) {
    const speedDiff = assemblyResult.duration - groqResult.duration;
    const winner = speedDiff > 0 ? 'Groq' : 'AssemblyAI';
    const faster = Math.abs(speedDiff / 1000).toFixed(2);
    
    console.log('\n🏆 WINNER');
    console.log('='.repeat(50));
    console.log(`${winner} is ${faster}s faster`);
    console.log(`Groq is ${(assemblyResult.duration / groqResult.duration).toFixed(2)}x faster than AssemblyAI`);
  }
}

// Main execution
async function main() {
  // Use the test audio file we just copied
  const audioPath = process.argv[2] || './public/benchmark/test-audio.webm';
  
  if (!audioPath) {
    console.log('Usage: node benchmark-transcription.js <path-to-audio-file>');
    console.log('Example: node benchmark-transcription.js ./public/test-audio.webm');
    return;
  }
  
  // Check environment variables
  if (!process.env.ASSEMBLYAI_API_KEY) {
    console.error('❌ ASSEMBLYAI_API_KEY environment variable required');
    return;
  }
  
  if (!process.env.GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY environment variable required');
    return;
  }
  
  await runBenchmark(audioPath);
}

main().catch(console.error);
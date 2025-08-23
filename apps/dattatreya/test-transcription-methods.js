import fs from 'fs';

const testAudioPath = './public/benchmark/test-audio.webm';

async function testDirectGroq() {
  console.log('🔥 Testing Direct Groq SDK...');
  const startTime = Date.now();
  
  const formData = new FormData();
  const audioBuffer = fs.readFileSync(testAudioPath);
  const blob = new Blob([audioBuffer], { type: 'audio/webm' });
  formData.append('audio', blob, 'test-audio.webm');

  const response = await fetch('http://localhost:3002/api/transcribe', {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();
  const endTime = Date.now();
  
  return {
    method: 'Direct Groq SDK',
    duration: endTime - startTime,
    text: result.text,
    success: response.ok
  };
}

async function testAISdkStream() {
  console.log('⚡ Testing AI SDK with fs.createReadStream...');
  const startTime = Date.now();
  
  const formData = new FormData();
  const audioBuffer = fs.readFileSync(testAudioPath);
  const blob = new Blob([audioBuffer], { type: 'audio/webm' });
  formData.append('audio', blob, 'test-audio.webm');

  const response = await fetch('http://localhost:3002/api/transcribe-ai-sdk-stream', {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();
  const endTime = Date.now();
  
  return {
    method: 'AI SDK fs.createReadStream',
    duration: endTime - startTime,
    text: result.text,
    backendDuration: result.duration,
    success: response.ok
  };
}

async function runComparison() {
  if (!fs.existsSync(testAudioPath)) {
    console.error(`❌ Test audio file not found: ${testAudioPath}`);
    return;
  }

  console.log('🎙️ Testing Frontend → Backend Transcription Performance\n');
  
  try {
    // Test both methods
    const [groqResult, aiSdkResult] = await Promise.all([
      testDirectGroq(),
      testAISdkStream()
    ]);

    // Display results
    console.log('\n📊 FRONTEND → BACKEND RESULTS');
    console.log('='.repeat(60));
    
    [groqResult, aiSdkResult].forEach(result => {
      console.log(`\n${result.method}:`);
      console.log(`  Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
      console.log(`  Total Time: ${result.duration}ms`);
      if (result.backendDuration) {
        console.log(`  Backend Time: ${result.backendDuration}ms`);
        console.log(`  Network Overhead: ${result.duration - result.backendDuration}ms`);
      }
      if (result.success) {
        console.log(`  Text Length: ${result.text.length} chars`);
        console.log(`  Preview: "${result.text.substring(0, 80)}..."`);
      }
    });

    // Compare if both succeeded
    if (groqResult.success && aiSdkResult.success) {
      const speedDiff = groqResult.duration - aiSdkResult.duration;
      const winner = speedDiff > 0 ? 'AI SDK fs.createReadStream' : 'Direct Groq SDK';
      const faster = Math.abs(speedDiff);
      
      console.log('\n🏆 WINNER');
      console.log('='.repeat(60));
      console.log(`${winner} is ${faster}ms faster`);
      
      if (groqResult.duration > aiSdkResult.duration) {
        console.log(`AI SDK is ${(groqResult.duration / aiSdkResult.duration).toFixed(2)}x faster`);
      } else {
        console.log(`Direct Groq is ${(aiSdkResult.duration / groqResult.duration).toFixed(2)}x faster`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the comparison
runComparison().catch(console.error);
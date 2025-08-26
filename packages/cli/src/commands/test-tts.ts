import { TextToSpeechService, AUDIO_CONFIG } from "@cybertantra/ai";
import fs from "fs/promises";
import path from "path";

async function testTTS() {
  console.log("🎤 Testing TTS with short text...\n");
  console.log(`📊 Current model: ${AUDIO_CONFIG.ttsModel}`);
  
  // Test texts - with and without emotion tags
  const testTexts = [
    {
      name: "Simple text (no tags)",
      text: "Hello. This is a test. Take a deep breath."
    },
    {
      name: "With break tags only",
      text: "Hello. <break time=\"1.5s\" /> This is a test. <break time=\"2s\" /> Take a deep breath."
    },
    {
      name: "With emotion tags (v3 only)",
      text: "[calm] Hello. <break time=\"1.5s\" /> [whispers] This is a test. <break time=\"2s\" /> [breathes deeply] Take a deep breath."
    }
  ];
  
  const outputDir = path.join(process.cwd(), "temp", "tts-test");
  await fs.mkdir(outputDir, { recursive: true });
  
  for (const test of testTexts) {
    console.log(`\n🧪 Testing: ${test.name}`);
    console.log(`📝 Text: "${test.text}"`);
    
    try {
      const tts = new TextToSpeechService();
      const audioBuffer = await tts.generateAudio(test.text);
      
      const filename = `test_${test.name.replace(/\s+/g, '_').toLowerCase()}.mp3`;
      const outputPath = path.join(outputDir, filename);
      await fs.writeFile(outputPath, audioBuffer);
      
      console.log(`✅ Success! Audio saved to: ${outputPath}`);
      console.log(`📏 Size: ${(audioBuffer.length / 1024).toFixed(2)} KB`);
    } catch (error) {
      console.error(`❌ Failed:`, error);
      if (error instanceof Error) {
        console.error(`   Message: ${error.message}`);
      }
    }
  }
  
  console.log(`\n📁 All test files saved to: ${outputDir}`);
}

// Run the test
testTTS().catch(console.error);
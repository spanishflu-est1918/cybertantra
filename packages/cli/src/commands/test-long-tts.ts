import { parseTextIntoSegments } from "../../../ai/src/utils/tts/segment-parser";
import { generateAllSegments } from "../../../ai/src/utils/tts/generate-segments";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

const sampleMeditation = `[calm] Close your eyes and take a deep breath. <break time="3s" /> [whispers] Feel your body settling into this moment. <break time="2.5s" /> 

[softly] Bring your awareness to your breath, the natural rhythm that sustains you. <break time="2s" /> Notice how it flows without effort. <break time="3s" />

[powerful] In your heart center, feel the energy of transformation. <break time="2s" /> [calm] This is where change begins. <break time="4s" />

[whispers] Let go of what no longer serves you. <break time="3s" /> [sighs] Release it all. <break time="4s" />

[compassionate] You are safe here. <break time="2s" /> You are loved. <break time="2s" /> You are enough. <break time="5s" />

[softly] When you're ready, slowly open your eyes. <break time="3s" /> Carry this peace with you.`;

async function testLongTTS() {
  console.log("🧪 Testing long meditation text processing\n");
  
  console.log("📝 Original text length:", sampleMeditation.length);
  console.log("📝 Sample:", sampleMeditation.substring(0, 100) + "...\n");
  
  // Test parsing
  console.log("🔍 Parsing segments...");
  try {
    const segments = parseTextIntoSegments(sampleMeditation);
    console.log(`✅ Parsed ${segments.length} segments`);
    
    // Show segment details
    segments.forEach((seg, idx) => {
      if (seg.type === 'speech') {
        console.log(`  [${idx}] Speech: "${seg.text.substring(0, 50)}${seg.text.length > 50 ? '...' : ''}"`);
      } else {
        console.log(`  [${idx}] Pause: ${seg.duration}s`);
      }
    });
    
    // Test generation
    console.log("\n🎤 Generating audio segments...");
    const sessionId = crypto.randomBytes(8).toString('hex');
    const tempDir = path.join(process.cwd(), 'temp', 'long-test', sessionId);
    await fs.mkdir(tempDir, { recursive: true });
    
    // Generate with reduced concurrency
    const segmentPaths = await generateAllSegments(segments, tempDir, undefined, 1); // Concurrency = 1
    
    console.log(`✅ Generated ${segmentPaths.length} audio files`);
    console.log(`📁 Saved to: ${tempDir}`);
    
  } catch (error) {
    console.error("❌ Error:", error);
    if (error instanceof Error) {
      console.error("Stack:", error.stack);
    }
  }
}

testLongTTS().catch(console.error);
import { MeditationGeneratorAgent } from "@cybertantra/ai/src/agents/meditation-generator";

async function testMeditationText() {
  const agent = new MeditationGeneratorAgent();

  console.log("🧪 Testing 5-minute meditation generation...\n");

  const result = await agent.generate("breath awareness", 5);

  const wordCount = result.text.split(" ").length;
  const charCount = result.text.length;

  console.log("📊 Stats:");
  console.log(`- Duration requested: 5 minutes`);
  console.log(`- Word count: ${wordCount} words`);
  console.log(`- Character count: ${charCount} chars`);
  console.log(`- Words per minute: ${(wordCount / 5).toFixed(1)}`);
  console.log("\n📝 Full meditation text:\n");
  console.log("=".repeat(50));
  console.log(result.text);
  console.log("=".repeat(50));
}

testMeditationText().catch(console.error);

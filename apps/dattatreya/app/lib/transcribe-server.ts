import Groq from "groq-sdk";
import fs from "fs";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const contextTerms = [
  "Dattatreya",
  "cybertantra",
  "Shiva",
  "Shakti",
  "Kali",
  "Ganapati",
  "Ganesha",
  "Ucchishta",
  "tantra",
  "tantras",
  "agama",
  "nigama",
  "kula",
  "vajra",
  "mantra",
  "mantras",
  "kala",
  "devata",
  "devatas",
  "murti",
  "Vamachara",
  "Ajna",
  "Vishuddha",
  "Muladhara",
  "chakra",
  "chakras",
  "Kundalini",
  "Mahavidyas",
  "Aghora",
  "prana",
  "siddhis",
  "communion",
];

export async function transcribeAudio(audioFile: File): Promise<string> {
  let tempFilePath: string | null = null;

  try {
    console.log("Server transcription - Audio file info:", {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
    });

    // Check for API key
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY not configured");
    }

    // Save to temp file for direct Groq SDK
    tempFilePath = join(tmpdir(), `server-transcribe-${Date.now()}.webm`);
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    await writeFile(tempFilePath, audioBuffer);

    console.log("Server transcription - Temp file created:", tempFilePath);

    const startTime = Date.now();

    // Use direct Groq SDK
    const client = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const transcription = await client.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-large-v3-turbo",
      language: "en",
      prompt: `This is a conversation about tantric spirituality, mysticism, and esoteric practices. Key terms include: ${contextTerms.join(", ")}.`,
      temperature: 0.0,
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log("Server transcription - Completed in:", duration + "ms");
    console.log(
      "Server transcription - Result:",
      transcription.text ? `"${transcription.text}"` : "empty",
    );

    // Clean up temp file
    if (tempFilePath) {
      await unlink(tempFilePath).catch(() => {});
    }

    return transcription.text || "";
  } catch (error) {
    console.error("Server transcription error:", error);

    // Clean up temp file on error
    if (tempFilePath) {
      await unlink(tempFilePath).catch(() => {});
    }

    throw new Error(
      `Transcription failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

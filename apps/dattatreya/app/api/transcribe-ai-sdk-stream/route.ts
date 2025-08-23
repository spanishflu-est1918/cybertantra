"use server";

import { experimental_transcribe as transcribe } from "ai";
import { groq } from "@ai-sdk/groq";
import fs from "fs";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

export async function POST(request: Request) {
  let tempFilePath: string | null = null;

  try {
    const formData = await request.formData();
    const audio = formData.get("audio") as File;

    if (!audio) {
      return new Response("No audio file provided", { status: 400 });
    }

    console.log("AI SDK Stream - Audio file info:", {
      name: audio.name,
      type: audio.type,
      size: audio.size,
    });

    // Check for API key
    if (!process.env.GROQ_API_KEY) {
      console.error("GROQ_API_KEY not configured");
      return new Response("Transcription service not configured", {
        status: 500,
      });
    }

    // Save to temp file for fs.createReadStream approach
    tempFilePath = join(tmpdir(), `ai-sdk-stream-${Date.now()}.webm`);
    const audioBuffer = Buffer.from(await audio.arrayBuffer());
    await writeFile(tempFilePath, audioBuffer);

    console.log(
      "AI SDK Stream - Temp file created:",
      tempFilePath,
      "size:",
      audioBuffer.length,
    );

    const startTime = Date.now();

    try {
      const result = await transcribe({
        model: groq.transcription("whisper-large-v3-turbo"),
        file: fs.createReadStream(tempFilePath),
        providerOptions: {
          groq: {
            language: "en",
            prompt: `This is a conversation about tantric spirituality, mysticism, and esoteric practices. Key terms include: Dattatreya, cybertantra, Shiva, Shakti, Kali, Ganapati, Ganesha, Ucchishta, tantra, tantras, agama, nigama, kula, vajra, mantra, mantras, kala, devata, devatas, murti, Vamachara, Ajna, Vishuddha, Muladhara, chakra, chakras, Kundalini, Mahavidyas, Aghora, prana, siddhis, communion.`,
          },
        },
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(
        "AI SDK Stream - Transcription completed in:",
        duration + "ms",
      );
      console.log(
        "AI SDK Stream - Transcript result:",
        result.text ? `"${result.text}"` : "empty",
      );

      // Clean up temp file
      if (tempFilePath) {
        await unlink(tempFilePath).catch(() => {});
      }

      // Return result with timing info
      return Response.json({
        text: result.text || "",
        duration: duration,
        method: "AI SDK with fs.createReadStream",
      });
    } catch (transcribeError) {
      console.error("AI SDK Stream transcription error:", transcribeError);

      // Clean up temp file on error
      if (tempFilePath) {
        await unlink(tempFilePath).catch(() => {});
      }

      throw transcribeError;
    }
  } catch (error) {
    console.error("AI SDK Stream error:", error);

    // Clean up temp file on any error
    if (tempFilePath) {
      await unlink(tempFilePath).catch(() => {});
    }

    return new Response("Transcription failed", { status: 500 });
  }
}

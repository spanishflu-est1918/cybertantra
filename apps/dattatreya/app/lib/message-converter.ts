import { transcribeAudio } from "./transcribe-server";
import { UIMessage } from "ai";

// Define custom data parts that completely replace the default ones
export type CustomDataPart = 
  | { type: "text"; text: string }
  | { type: "file"; data: string; mediaType?: string; filename?: string };

// Create custom message type
export type DattatreyaMessage = {
  id?: string;
  role: "user" | "assistant" | "system";
  parts: CustomDataPart[];
};

export async function convertUIMessagesToModelMessages(
  uiMessages: DattatreyaMessage[],
): Promise<any[]> {
  const convertedMessages = [];

  for (const message of uiMessages) {
    if (!message.parts) {
      convertedMessages.push(message);
      continue;
    }

    const convertedParts = [];

    for (const part of message.parts) {
      if (part.type === "file" && part.mediaType?.startsWith("audio/")) {
        // Convert audio file part to transcribed text
        try {
          console.log("[CONVERTER] Processing audio file part");
          const convertStart = performance.now();

          const response = await fetch(part.data!);
          const blob = await response.blob();
          const file = new File([blob], part.filename || "audio.webm", {
            type: part.mediaType,
          });

          const transcribeStart = performance.now();
          const transcript = await transcribeAudio(file);
          const transcribeDuration = performance.now() - transcribeStart;

          const totalDuration = performance.now() - convertStart;
          console.log(
            `[CONVERTER] Audio conversion completed in ${totalDuration.toFixed(2)}ms (transcribe: ${transcribeDuration.toFixed(2)}ms)`,
          );

          convertedParts.push({ type: "text", text: transcript });
        } catch (error) {
          console.error("Audio transcription failed:", error);
          convertedParts.push({
            type: "text",
            text: "[Audio transcription failed]",
          });
        }
      } else {
        convertedParts.push(part);
      }
    }

    convertedMessages.push({
      ...message,
      parts: convertedParts,
    });
  }

  return convertedMessages;
}

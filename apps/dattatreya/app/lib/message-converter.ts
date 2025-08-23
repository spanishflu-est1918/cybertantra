import { transcribeAudio } from "./transcribe-server";
import { UIMessage } from "ai";

export async function convertUIMessagesToModelMessages(
  uiMessages: UIMessage[],
): Promise<any[]> {
  const convertedMessages = [];

  for (const message of uiMessages) {
    if (!message.parts) {
      convertedMessages.push(message);
      continue;
    }

    const convertedParts = [];
    let hasAudioPart = false;

    for (const part of message.parts) {
      if (part.type === "file" && part.mediaType?.startsWith("audio/")) {
        // Convert audio file part to transcribed text
        hasAudioPart = true;
        try {
          console.log("[CONVERTER] Processing audio file part");
          const convertStart = performance.now();

          const response = await fetch(part.url!); // Changed from part.data to part.url
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

    // If we transcribed audio, create a clean message with only text parts
    if (hasAudioPart) {
      convertedMessages.push({
        ...message,
        parts: convertedParts,
        // Remove any file-related properties since we've converted to text
        content: convertedParts
          .filter((p: any) => p.type === "text")
          .map((p: any) => p.text)
          .join(" "),
      });
    } else {
      convertedMessages.push({
        ...message,
        parts: convertedParts,
      });
    }
  }

  return convertedMessages;
}

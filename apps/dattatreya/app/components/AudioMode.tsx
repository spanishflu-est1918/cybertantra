import { memo, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { useTextToSpeech } from "../hooks/useTextToSpeech";
import { createStreamTextProcessor } from "../utils/streamTextProcessor";

const AudioMode = memo(function AudioMode() {
  const { speak, isSpeaking } = useTextToSpeech();

  const processorRef = useRef(createStreamTextProcessor(speak));

  useEffect(() => {
    processorRef.current.updateSpeakFunction(speak);
  }, [speak]);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "assistant") {
      const textParts = lastMessage.parts.filter(
        (part) => part.type === "text",
      );
      const newText = textParts.map((part) => part.text).join("");

      processorRef.current.processText(newText, status === "ready");
    }
  }, [messages, status]);

  useEffect(() => {
    if (error) {
      console.error("Chat error:", error);
    }
  }, [error]);

  const handleTranscript = async (text: string) => {
    console.log("AudioMode received transcript:", text);

    await sendMessage({
      text: text,
    });
  };

  const { isRecording, isTranscribing, startRecording, stopRecording } =
    useAudioRecorder({
      skipDownload: true,
      skipTranscription: false,
      onTranscript: handleTranscript,
    });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSpeaking || status === "submitted" || status === "streaming") {
      console.log("Cannot record while speaking or processing");
      return;
    }

    if (isRecording) {
      stopRecording();
    } else {
      processorRef.current.reset();
      startRecording();
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center select-none">
      <div className="relative select-none">
        <button
          onClick={handleClick}
          className={`
            w-32 h-32 rounded-full border-2 transition-all duration-300 select-none
            ${
              isTranscribing
                ? "border-yellow-400/80 bg-gradient-to-br from-yellow-500/10 to-white/10 scale-110 animate-pulse"
                : isSpeaking
                  ? "border-white/20 bg-white/5 opacity-50 cursor-not-allowed"
                  : isRecording
                    ? "border-white/80 bg-white/10 scale-110"
                    : "border-white/30 hover:border-white/50"
            }
            flex items-center justify-center relative overflow-hidden
          `}
          disabled={isSpeaking}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={`
              w-24 h-24 border rounded-full absolute
              ${
                isTranscribing
                  ? "border-2 border-yellow-400/30 animate-ping"
                  : isRecording
                    ? "border border-white/20 animate-ping"
                    : "border border-white/20 animate-slow-pulse"
              }
            `}
            />
            <div
              className={`
              w-16 h-16 border absolute
              ${
                isTranscribing
                  ? "border-yellow-500/20 animate-spin"
                  : isRecording
                    ? "border-white/10 animate-spin"
                    : "border-white/10"
              }
            `}
              style={{
                transform: "rotate(45deg)",
                animationDuration: isTranscribing ? "1.5s" : "3s",
              }}
            />
            <span
              className={`text-4xl ${isTranscribing ? "text-yellow-400/60 animate-pulse" : isRecording ? "animate-pulse" : ""}`}
              style={{
                WebkitUserSelect: "none",
                WebkitTouchCallout: "none",
                userSelect: "none",
                pointerEvents: "none",
              }}
            >
              {"⦿"}
            </span>
          </div>
        </button>

        <div
          className={`
          absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-xs whitespace-nowrap tracking-wider select-none pointer-events-none
          ${
            isTranscribing
              ? "text-yellow-400/70 animate-pulse"
              : "text-white/40"
          }
        `}
        >
          {isSpeaking
            ? "CHANNELING..."
            : isTranscribing
              ? "DECODING..."
              : isRecording
                ? "TAP TO STOP"
                : "TAP TO RECORD"}
        </div>
      </div>
    </div>
  );
});

export default AudioMode;

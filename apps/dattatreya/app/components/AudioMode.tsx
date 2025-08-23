import { memo, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { useTextToSpeech } from "../hooks/useTextToSpeech";
import { createStreamTextProcessor } from "../utils/streamTextProcessor";

const AudioMode = memo(function AudioMode() {
  const { speak, isSpeaking } = useTextToSpeech();
  const [isUsingTool, setIsUsingTool] = useState(false);

  const processorRef = useRef(createStreamTextProcessor(speak));

  const getButtonClasses = () => {
    const base =
      "w-32 h-32 rounded-full border-2 transition-all duration-300 select-none flex items-center justify-center relative overflow-hidden";

    if (isUsingTool || status === "streaming" || status === "submitted") {
      return `${base} border-green-400/80 bg-gradient-to-br from-green-500/10 to-white/10 scale-110 animate-pulse`;
    }
    if (isTranscribing) {
      return `${base} border-yellow-400/80 bg-gradient-to-br from-yellow-500/10 to-white/10 scale-110 animate-pulse`;
    }
    if (isSpeaking) {
      return `${base} border-white/20 bg-white/5 opacity-50 cursor-not-allowed`;
    }
    if (isRecording) {
      return `${base} border-white/80 bg-white/10 scale-110`;
    }
    return `${base} border-white/30 hover:border-white/50`;
  };

  const getOuterRingClasses = () => {
    const base = "w-24 h-24 border rounded-full absolute";

    if (isUsingTool || status === "streaming" || status === "submitted") {
      return `${base} border-2 border-green-400/30 animate-ping`;
    }
    if (isTranscribing) {
      return `${base} border-2 border-yellow-400/30 animate-ping`;
    }
    if (isRecording) {
      return `${base} border border-white/20 animate-ping`;
    }
    return `${base} border border-white/20 animate-slow-pulse`;
  };

  const getInnerRingClasses = () => {
    const base = "w-16 h-16 border absolute";

    if (isUsingTool || status === "streaming" || status === "submitted") {
      return `${base} border-green-500/20 animate-spin`;
    }
    if (isTranscribing) {
      return `${base} border-yellow-500/20 animate-spin`;
    }
    if (isRecording) {
      return `${base} border-white/10 animate-spin`;
    }
    return `${base} border-white/10`;
  };

  const getCenterIconClasses = () => {
    if (isUsingTool || status === "streaming" || status === "submitted") {
      return "text-4xl text-green-400/60 animate-pulse";
    }
    if (isTranscribing) {
      return "text-4xl text-yellow-400/60 animate-pulse";
    }
    if (isRecording) {
      return "text-4xl animate-pulse";
    }
    return "text-4xl";
  };

  const getStatusText = () => {
    if (isUsingTool || status === "streaming" || status === "submitted")
      return "CHANNELING...";
    if (isSpeaking) return "CHANNELING...";
    if (isTranscribing) return "DECODING...";
    if (isRecording) return "TAP TO STOP";
    return "TAP TO SPEAK";
  };

  const getStatusTextClasses = () => {
    const base =
      "absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-xs whitespace-nowrap tracking-wider select-none pointer-events-none";

    if (isUsingTool || status === "streaming" || status === "submitted") {
      return `${base} text-green-400/70 animate-pulse`;
    }
    if (isTranscribing) {
      return `${base} text-yellow-400/70 animate-pulse`;
    }
    return `${base} text-white/40`;
  };

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
      // Check for active tool calls
      const toolParts = lastMessage.parts.filter((part) =>
        part.type?.startsWith("tool-"),
      );
      const isToolActive = toolParts.some(
        (part) =>
          "state" in part &&
          (part.state === "input-streaming" ||
            part.state === "input-available"),
      );
      setIsUsingTool(isToolActive);

      // Get regular text (ignore tool outputs - only speak the assistant's response)
      const text = lastMessage.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("");

      // Only speak the assistant's integrated response, not tool outputs
      const contentToSpeak = text;
      processorRef.current.processText(contentToSpeak, status === "ready");
    }
  }, [messages, status]);

  useEffect(() => {
    if (error) {
      console.error("Chat error:", error);
    }
  }, [error]);

  const handleTranscript = async (audioDataUrl: string) => {
    console.log(
      "AudioMode received audio data URL:",
      audioDataUrl.substring(0, 50) + "...",
    );

    await sendMessage({
      parts: [
        {
          type: "file",
          data: audioDataUrl,
          mediaType: "audio/webm",
          filename: "recording.webm",
        },
      ],
    });
  };

  const { isRecording, isTranscribing, startRecording, stopRecording } =
    useAudioRecorder({
      skipDownload: true,
      skipTranscription: false,
      onTranscript: handleTranscript,
    });

  const isProcessing =
    status === "submitted" ||
    status === "streaming" ||
    isTranscribing ||
    isUsingTool;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSpeaking || isProcessing) {
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
          className={getButtonClasses()}
          disabled={isSpeaking}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={getOuterRingClasses()} />
            <div
              className={getInnerRingClasses()}
              style={{
                transform: "rotate(45deg)",
                animationDuration: isUsingTool
                  ? "1.5s"
                  : isTranscribing
                    ? "1.5s"
                    : "3s",
              }}
            />
            <span
              className={getCenterIconClasses()}
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

        <div className={getStatusTextClasses()}>{getStatusText()}</div>
      </div>
    </div>
  );
});

export default AudioMode;

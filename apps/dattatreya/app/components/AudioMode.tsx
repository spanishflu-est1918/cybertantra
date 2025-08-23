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
    const base = "w-32 h-32 rounded-full border-2 transition-all duration-300 select-none flex items-center justify-center relative overflow-hidden";
    
    if (isUsingTool) {
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
    
    if (isUsingTool) {
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
    
    if (isUsingTool) {
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
    if (isUsingTool) {
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
    if (isUsingTool) return "CHANNELING...";
    if (isSpeaking) return "CHANNELING...";
    if (isTranscribing) return "DECODING...";
    if (isRecording) return "TAP TO STOP";
    return "TAP TO RECORD";
  };

  const getStatusTextClasses = () => {
    const base = "absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-xs whitespace-nowrap tracking-wider select-none pointer-events-none";
    
    if (isUsingTool) {
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
    // We could add onToolCall here if we had client-side tools
  });

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "assistant") {
      console.log("Assistant message received with parts:", lastMessage.parts.length);
      console.log("Message parts:", lastMessage.parts.map(p => ({
        type: p.type,
        state: 'state' in p ? p.state : undefined,
        hasText: 'text' in p ? !!p.text : false,
        textLength: 'text' in p && p.text ? p.text.length : 0
      })));
      
      // Check for tool parts in the message
      const toolParts = lastMessage.parts.filter(
        (part) => part.type?.startsWith("tool-")
      );
      
      // Check if any tool is currently being called or executing
      const hasActiveToolCall = toolParts.some(
        (part) => {
          // Check the state property for tool execution status
          if ('state' in part) {
            return part.state === 'input-streaming' || 
                   part.state === 'input-available';
            // When state is 'output-available' or 'output-error', tool is done
          }
          return false;
        }
      );
      
      // Set tool usage state
      setIsUsingTool(hasActiveToolCall);
      
      // Log for debugging
      if (toolParts.length > 0) {
        console.log("Tool parts detected:", toolParts.map(p => ({ 
          type: p.type, 
          state: 'state' in p ? p.state : 'no-state',
          output: 'output' in p ? (typeof p.output === 'string' ? p.output.substring(0, 100) + '...' : p.output) : 'no-output'
        })));
      }
      
      const textParts = lastMessage.parts.filter(
        (part) => part.type === "text",
      );
      const newText = textParts.map((part) => part.text).join("");
      
      console.log("Text content length:", newText.length);
      console.log("Status:", status);
      const isReady = status === "ready";
      console.log("Is ready?", isReady);
      
      if (newText.length > 0) {
        console.log("Text preview:", newText.substring(0, 100) + "...");
        console.log("Calling processText with isComplete:", isReady);
      }

      processorRef.current.processText(newText, isReady);
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
          className={getButtonClasses()}
          disabled={isSpeaking}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={getOuterRingClasses()} />
            <div
              className={getInnerRingClasses()}
              style={{
                transform: "rotate(45deg)",
                animationDuration: isUsingTool ? "1.5s" : isTranscribing ? "1.5s" : "3s",
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

        <div className={getStatusTextClasses()}>
          {getStatusText()}
        </div>
      </div>
    </div>
  );
});

export default AudioMode;

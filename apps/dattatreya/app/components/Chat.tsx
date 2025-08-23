"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Header from "./Header";
import Message from "./Message";
import TextMode from "./TextMode";

import AudioMode from "./AudioMode";
import PermissionGate from "./PermissionGate";
import { useTextToSpeech } from "../hooks/useTextToSpeech";
import { usePermissions } from "../hooks/usePermissions";
import { useAudioRecorder } from "../hooks/useAudioRecorder";

export default function Chat() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<'text' | 'audio'>('audio');
  const [mounted, setMounted] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    onFinish: (result) => {
      const message = result.message || result;
      if (message && message.content) {
        const content = Array.isArray(message.content) 
          ? message.content.map(part => part.text || '').join(' ')
          : message.content;
        speak(content);
      }
    },
  });

  const isLoading = status === "in_progress";

  // Custom hooks
  const {
    permissionsGranted,
    isFirstInteraction,
    permissionError,
    isChecking,
    requestPermissions,
    isSupported: permissionsSupported
  } = usePermissions();

  const {
    isEnabled: isTTSEnabled,
    speak,
    stop: stopSpeech,
    toggle: toggleTTS,
    loadVoices,
    isSupported: ttsSupported
  } = useTextToSpeech({
    enabled: true,
    rate: 0.9,
    pitch: 1
  });

  const handleSubmitVoice = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    
    setInput("");
    await sendMessage({
      role: "user",
      parts: [{ type: "text", text: text }],
    });
  }, [isLoading, sendMessage]);

  const {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    toggleRecording,
    isSupported: audioRecorderSupported
  } = useAudioRecorder();


  const handleToggleRecording = useCallback(() => {
    toggleRecording(handleSubmitVoice);
  }, [toggleRecording, handleSubmitVoice]);

  useEffect(() => {
    setMounted(true);
    if (ttsSupported) {
      loadVoices();
      // Load voices again after a delay (some browsers need this)
      setTimeout(loadVoices, 100);
    }
  }, [ttsSupported, loadVoices]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const userInput = input;
    setInput("");
    await sendMessage({
      role: "user",
      parts: [{ type: "text", text: userInput }],
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleButtonInteraction = useCallback(async (e?: React.MouseEvent | React.TouchEvent) => {
    console.log('Button clicked, requesting permissions...');
    e?.preventDefault();
    e?.stopPropagation();
    
    if (isFirstInteraction || !permissionsGranted) {
      await requestPermissions();
    }
  }, [isFirstInteraction, permissionsGranted, requestPermissions]);

  if (!mounted || isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Show permission gate if permissions are needed and not granted
  if (mode === 'audio' && !permissionsGranted && permissionsSupported && audioRecorderSupported) {
    return (
      <PermissionGate
        permissionsGranted={permissionsGranted}
        isFirstInteraction={isFirstInteraction}
        permissionError={permissionError}
        onRequestPermissions={requestPermissions}
      >
        <div /> {/* This won't be rendered until permissions are granted */}
      </PermissionGate>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white font-mono">
      <Header 
        mode={mode}
        setMode={setMode}
        isTTSEnabled={isTTSEnabled}
        toggleTTS={toggleTTS}
        stopSpeech={stopSpeech}
      />
      
      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {messages.map((message, index) => (
            <Message key={index} message={message} />
          ))}
          {isLoading && (
            <div className="flex items-center space-x-2 text-gray-400">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-75"></div>
              <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-150"></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {mode === 'text' ? (
          <TextMode
            input={input}
            setInput={setInput}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        ) : (
          <AudioMode
            onTranscript={handleSubmitVoice}
            setMode={setMode}
          />
        )}
      </main>
    </div>
  );
}
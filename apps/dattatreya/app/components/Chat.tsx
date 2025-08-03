"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Header from "./Header";
import Message from "./Message";
import TextMode from "./TextMode";
import AudioMode from "./AudioMode";

export default function Chat() {
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState<'text' | 'audio'>('audio');
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [isFirstInteraction, setIsFirstInteraction] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const accumulatedTranscriptRef = useRef<string>('');
  const isRecordingRef = useRef<boolean>(false);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    onFinish: (result) => {
      const message = result.message || result;
      const content = (message as any).content || ((message as any).parts && (message as any).parts.map((p: any) => p.text).join(''));
      if (isTTSEnabled && content) {
        speak(content);
      }
    },
  });

  const isLoading = status === 'streaming' || status === 'submitted';
  
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        console.log('[Speech] onresult event', event.results.length);
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript = transcript;
          } else {
            interimTranscript = transcript;
          }
        }
        
        if (finalTranscript) {
          console.log('[Speech] Final transcript:', finalTranscript);
          accumulatedTranscriptRef.current += finalTranscript + ' ';
          setInput(accumulatedTranscriptRef.current);
        } else {
          setInput(accumulatedTranscriptRef.current + interimTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.log('[Speech] onerror:', event.error);
        if (event.error !== 'aborted') {
          console.error('Speech recognition error:', event.error);
        }
        
        if (event.error !== 'aborted' && event.error !== 'no-speech') {
          console.log('[Speech] Stopping recording due to error');
          setIsRecording(false);
          isRecordingRef.current = false;
        }
      };

      recognitionRef.current.onend = () => {
        console.log('[Speech] onend event, isRecordingRef:', isRecordingRef.current);
        if (!isRecordingRef.current) {
          setIsRecording(false);
        }
      };
    }
  }, []);

  const requestPermissions = async () => {
    console.log('Requesting permissions...');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('getUserMedia not supported');
        alert('Microphone access is not supported in this browser. Please use Chrome, Edge, or Firefox.');
        return;
      }
      
      console.log('Getting user media...');
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Got stream:', stream);
      } catch (mediaError: any) {
        console.error('getUserMedia error:', mediaError);
        if (mediaError.name === 'NotAllowedError') {
          alert('Microphone access was denied. Please check your browser settings.');
        } else if (mediaError.name === 'NotFoundError') {
          alert('No microphone found. Please connect a microphone.');
        } else if (mediaError.name === 'NotReadableError') {
          alert('Microphone is already in use by another application.');
        } else if (mediaError.name === 'OverconstrainedError') {
          alert('Microphone constraints could not be satisfied.');
        } else if (mediaError.name === 'SecurityError') {
          alert('Microphone access requires HTTPS. Please use the HTTPS tunnel URL.');
        }
        throw mediaError;
      }
      
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
      }
      
      console.log('Setting permissions granted...');
      setPermissionsGranted(true);
      setIsFirstInteraction(false);
    } catch (error) {
      console.error('Permission denied:', error);
      alert('Microphone permission denied. Please allow microphone access to use voice input.');
    }
  };

  const startRecording = useCallback(() => {
    console.log('[Speech] startRecording called, isRecording:', isRecordingRef.current, 'permissionsGranted:', permissionsGranted);
    if (recognitionRef.current && !isRecordingRef.current && permissionsGranted) {
      setInput('');
      accumulatedTranscriptRef.current = '';
      setIsRecording(true);
      isRecordingRef.current = true;
      try {
        console.log('[Speech] Starting recognition');
        recognitionRef.current.start();
      } catch (error) {
        console.log('[Speech] Recognition already started:', error);
      }
    }
  }, [permissionsGranted]);

  const stopRecording = useCallback(() => {
    console.log('[Speech] stopRecording called, isRecording:', isRecordingRef.current);
    if (recognitionRef.current && isRecordingRef.current) {
      isRecordingRef.current = false;
      console.log('[Speech] Stopping recognition');
      recognitionRef.current.stop();
      setIsRecording(false);
      const currentInput = accumulatedTranscriptRef.current.trim();
      if (currentInput) {
        console.log('[Speech] Submitting transcript:', currentInput);
        setTimeout(() => {
          handleSubmitVoice(currentInput);
        }, 1500);
      }
    }
  }, [handleSubmitVoice]);

  const handleButtonInteraction = async (e?: React.MouseEvent | React.TouchEvent) => {
    console.log('Button clicked, requesting permissions...');
    e?.preventDefault();
    e?.stopPropagation();
    
    if (isFirstInteraction || !permissionsGranted) {
      await requestPermissions();
    }
  };

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

  const handleSubmitVoice = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    
    setInput("");
    await sendMessage({
      role: "user",
      parts: [{ type: "text", text: text }],
    });
  }, [isLoading, sendMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const speak = (text: string) => {
    if (!isTTSEnabled || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.9;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.name.includes("Google") || 
      voice.name.includes("Microsoft") ||
      voice.name.includes("Premium")
    );
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="relative flex flex-col h-screen bg-black text-white select-none">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 border border-white/5 rounded-full animate-very-slow-spin" />
        <div className="absolute bottom-1/3 right-1/3 w-64 h-64 border border-white/5 rounded-full animate-very-slow-spin" style={{ animationDirection: 'reverse' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/[0.02] rounded-full animate-slow-pulse" />
      </div>

      <Header 
        mode={mode}
        setMode={setMode}
        isTTSEnabled={isTTSEnabled}
        setIsTTSEnabled={setIsTTSEnabled}
      />

      <div className="flex-1 overflow-y-auto scrollbar-mystical p-6 space-y-6 relative z-10">
        {messages.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-6 max-w-md animate-fade-in">
              <div className="mx-auto w-24 h-24 border border-white/20 border-mystical rounded-full flex items-center justify-center animate-slow-pulse">
                <span className="text-4xl glow-white">⦿</span>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-white/40 tracking-[0.3em] uppercase">Welcome, Seeker</p>
                <div className="w-32 h-px bg-white/10 mx-auto" />
                <p className="text-xs text-white/30 tracking-wider leading-relaxed">
                  Ask about consciousness, reality, or the eternal truths
                </p>
              </div>
            </div>
          </div>
        )}
        
        {messages.map((message: any) => (
          <Message key={message.id} message={message} />
        ))}
        
        {isLoading && (
          <div className="mr-auto max-w-2xl">
            <div className="flex items-center space-x-2 mb-2 opacity-40">
              <span className="text-[10px] tracking-[0.3em] uppercase">Oracle</span>
              <span className="text-xs animate-pulse">◉</span>
            </div>
            <div className="border border-white/10 border-mystical p-6">
              <div className="flex space-x-3">
                <div className="w-1 h-1 bg-white/40 rounded-full animate-pulse" />
                <div className="w-1 h-1 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                <div className="w-1 h-1 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {mode === 'text' ? (
        <TextMode 
          input={input}
          setInput={setInput}
          isLoading={isLoading}
          isRecording={isRecording}
          startRecording={startRecording}
          stopRecording={stopRecording}
          handleSubmit={handleSubmit}
        />
      ) : mounted ? (
        <AudioMode
          input={input}
          isRecording={isRecording}
          permissionsGranted={permissionsGranted}
          isFirstInteraction={isFirstInteraction}
          startRecording={startRecording}
          stopRecording={stopRecording}
          handleButtonInteraction={handleButtonInteraction}
          setMode={setMode}
        />
      ) : (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
          <div className="animate-pulse text-white/40">Loading...</div>
        </div>
      )}
    </div>
  );
}
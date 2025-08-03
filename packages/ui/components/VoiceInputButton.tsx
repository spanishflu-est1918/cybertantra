'use client';

import React, { useState, useEffect } from 'react';
import { useWebSpeech } from '../lib/hooks/useWebSpeech';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
}

export default function VoiceInputButton({ onTranscript, className = '' }: VoiceInputButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Check if mounted (client-side)
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const { 
    startListening,
    stopListening,
    isSTTSupported,
  } = useWebSpeech({
    onTranscript: (text) => {
      onTranscript(text);
      setIsRecording(false);
    },
    onError: (error) => {
      console.error('Voice input error:', error);
      setIsRecording(false);
    }
  });

  const handleMouseDown = () => {
    setIsRecording(true);
    if (isSTTSupported) {
      startListening();
    } else if (mounted) {
      // Fallback to API-based recording
      onTranscript("Voice recognition not supported - please use audio mode");
    }
  };

  const handleMouseUp = () => {
    if (isRecording) {
      setIsRecording(false);
      stopListening();
    }
  };

  // Show button even if STT not detected initially (SSR)
  // Always show button on client
  if (!mounted) {
    return null; // Don't render on server
  }

  return (
    <button
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      className={`
        p-2 rounded-full transition-all duration-300
        ${isRecording 
          ? 'bg-red-500/20 text-red-400 scale-110' 
          : 'bg-green-400/10 text-green-400 hover:bg-green-400/20'
        }
        ${className}
      `}
      aria-label="Voice input"
    >
      <svg 
        className="w-5 h-5" 
        fill="currentColor" 
        viewBox="0 0 20 20"
      >
        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
      </svg>
    </button>
  );
}
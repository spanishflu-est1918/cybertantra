'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTerminalContext } from '../lib/contexts/TerminalContext';
import { useWebSpeech } from '../lib/hooks/useWebSpeech';

interface AudioModeProps {
  onSendMessage: (text: string) => void;
  messages: Array<{ role: string; content: string; id: string }>;
  isLoading: boolean;
}

export default function AudioMode({ onSendMessage, messages, isLoading }: AudioModeProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [useWebSpeechAPI, setUseWebSpeechAPI] = useState(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { theme } = useTerminalContext();
  
  // Web Speech API hook
  const { 
    startListening: startWebSpeech,
    stopListening: stopWebSpeech,
    speak: webSpeak,
    isSTTSupported,
    isTTSSupported,
  } = useWebSpeech({
    onTranscript: (text) => {
      setCurrentTranscript(text);
      onSendMessage(text);
      setTimeout(() => {
        setCurrentTranscript('');
        setIsListening(false);
      }, 2000);
    },
    onError: (error) => {
      console.error('Web Speech error:', error);
      setIsListening(false);
      // Fallback to API-based speech
      setUseWebSpeechAPI(false);
    }
  });

  // Handle recording
  const startRecording = async () => {
    setIsRecording(true);
    setIsListening(true);
    
    // Try Web Speech API first (free)
    if (useWebSpeechAPI && isSTTSupported) {
      startWebSpeech();
    } else {
      // Fallback to API-based recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await transcribeAudio(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
      } catch (error) {
        console.error('Error accessing microphone:', error);
        setIsRecording(false);
        setIsListening(false);
      }
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    
    if (useWebSpeechAPI && isSTTSupported) {
      stopWebSpeech();
    } else if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsListening(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('model', 'whisper-1');
      
      const response = await fetch('/api/speech', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to transcribe audio');
      }

      const { text } = await response.json();
      setCurrentTranscript(text);
      onSendMessage(text);
      
      setTimeout(() => {
        setCurrentTranscript('');
        setIsListening(false);
      }, 2000);
    } catch (error) {
      console.error('Error transcribing audio:', error);
      setIsListening(false);
    }
  };

  // Get the latest AI message
  const latestAIMessage = messages.filter(m => m.role === 'assistant').pop();
  
  // Play TTS for new AI messages
  useEffect(() => {
    if (latestAIMessage && !isLoading) {
      playTextToSpeech(latestAIMessage.content);
    }
  }, [latestAIMessage?.id, isLoading]);

  const playTextToSpeech = async (text: string) => {
    // Try Web Speech API first (free)
    if (isTTSSupported) {
      webSpeak(text);
    } else {
      // Fallback to API-based TTS
      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate speech');
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
      } catch (error) {
        console.error('Error playing text-to-speech:', error);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-8">
      {/* API indicator */}
      <div className="absolute top-4 left-4 text-xs text-green-400/40">
        {isSTTSupported && isTTSSupported ? 'Web Speech API' : 'OpenAI API'}
      </div>
      
      {/* Response area */}
      <div className="flex-1 w-full max-w-2xl mb-8 overflow-y-auto">
        <div className="text-center text-green-400 opacity-60 mb-4">
          {isListening && <span className="animate-pulse">Listening...</span>}
          {isLoading && <span className="animate-pulse">Thinking...</span>}
          {!isListening && !isLoading && latestAIMessage && (
            <div className="text-sm leading-relaxed">
              {latestAIMessage.content}
            </div>
          )}
        </div>
        {currentTranscript && (
          <div className="text-center text-green-300 mb-4">
            > {currentTranscript}
          </div>
        )}
      </div>

      {/* Esoteric recording button */}
      <div className="relative mb-16">
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          className={`
            w-32 h-32 rounded-full border-4 transition-all duration-300
            ${isRecording 
              ? 'border-red-500 bg-red-900/20 scale-110 animate-pulse' 
              : 'border-green-400 bg-green-900/10 hover:bg-green-900/20'
            }
            flex items-center justify-center relative overflow-hidden
          `}
        >
          {/* Sacred geometry pattern */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`
              w-24 h-24 border-2 border-green-400/30 rounded-full absolute
              ${isRecording ? 'animate-ping' : 'animate-pulse'}
            `} />
            <div className={`
              w-16 h-16 border border-green-400/20 rotate-45 absolute
              ${isRecording ? 'animate-spin' : ''}
            `} />
            <div className="w-8 h-8 bg-green-400/50 rounded-full" />
          </div>
          
          {/* Microphone icon */}
          <svg 
            className="w-8 h-8 text-green-400 relative z-10" 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
          </svg>
        </button>
        
        {/* Instructions */}
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-green-400/60 whitespace-nowrap">
          {isRecording ? 'Release to send' : 'Hold to speak'}
        </div>
      </div>
    </div>
  );
}
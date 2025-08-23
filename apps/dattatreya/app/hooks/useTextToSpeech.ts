import { useState, useCallback, useRef } from 'react';

export interface UseTextToSpeechOptions {
  enabled?: boolean;
  rate?: number;
  pitch?: number;
  voice?: string;
}

export function useTextToSpeech({
  enabled = true,
  rate = 0.9,
  pitch = 1,
  voice
}: UseTextToSpeechOptions = {}) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const loadVoices = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (!isEnabled || !text.trim()) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;

    // Set voice if specified
    if (voice && availableVoices.length > 0) {
      const selectedVoice = availableVoices.find(v => 
        v.name === voice || v.voiceURI === voice
      );
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      currentUtteranceRef.current = null;
    };

    utterance.onerror = (event) => {
      console.error('[TTS] Speech error:', event.error);
      setIsSpeaking(false);
      currentUtteranceRef.current = null;
    };

    currentUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isEnabled, rate, pitch, voice, availableVoices]);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      currentUtteranceRef.current = null;
    }
  }, []);

  const toggle = useCallback(() => {
    setIsEnabled(prev => !prev);
  }, []);

  const pause = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis && isSpeaking) {
      window.speechSynthesis.pause();
    }
  }, [isSpeaking]);

  const resume = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.resume();
    }
  }, []);

  return {
    isEnabled,
    isSpeaking,
    availableVoices,
    speak,
    stop,
    pause,
    resume,
    toggle,
    setIsEnabled,
    loadVoices,
    isSupported: typeof window !== 'undefined' && 'speechSynthesis' in window
  };
}
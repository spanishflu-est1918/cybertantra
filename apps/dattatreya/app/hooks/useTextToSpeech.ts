import { useRef, useEffect, useCallback, useState } from 'react';

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const queueRef = useRef<string[]>([]);
  const isProcessingRef = useRef(false);
  
  const processQueue = useCallback(() => {
    if (isProcessingRef.current || queueRef.current.length === 0) {
      return;
    }

    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn('Speech synthesis not available');
      return;
    }

    const text = queueRef.current.shift();
    if (!text) return;

    isProcessingRef.current = true;
    setIsSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onend = () => {
      isProcessingRef.current = false;
      
      // Process next item in queue
      if (queueRef.current.length > 0) {
        setTimeout(processQueue, 100); // Small delay between sentences
      } else {
        setIsSpeaking(false);
      }
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      isProcessingRef.current = false;
      setIsSpeaking(false);
      queueRef.current = []; // Clear queue on error
    };
    
    window.speechSynthesis.speak(utterance);
  }, []);

  const speak = useCallback((text: string) => {
    if (!text.trim()) return;
    
    console.log('Adding to speech queue:', text);
    queueRef.current.push(text);
    processQueue();
  }, [processQueue]);
  
  const cancel = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      queueRef.current = [];
      isProcessingRef.current = false;
      setIsSpeaking(false);
    }
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);
  
  return {
    speak,
    cancel,
    isSpeaking,
    isSupported: typeof window !== 'undefined' && !!window.speechSynthesis
  };
}
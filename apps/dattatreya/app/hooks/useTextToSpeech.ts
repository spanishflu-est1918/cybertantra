import { useRef, useEffect, useCallback, useState } from 'react';

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const queueRef = useRef<string[]>([]);
  const isProcessingRef = useRef(false);
  const initializedRef = useRef(false);
  const voicesLoadedRef = useRef(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  
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
    
    // iOS Safari workaround - use default language
    utterance.lang = 'en-US';
    
    // Try to use a male voice if available
    if (voicesLoadedRef.current && voicesRef.current.length > 0) {
      // Look for a male English voice
      const maleVoice = voicesRef.current.find(voice => 
        voice.lang.startsWith('en') && 
        (voice.name.toLowerCase().includes('male') || 
         voice.name.toLowerCase().includes('daniel') ||
         voice.name.toLowerCase().includes('james') ||
         voice.name.toLowerCase().includes('oliver') ||
         voice.name.toLowerCase().includes('aaron'))
      );
      
      if (maleVoice) {
        utterance.voice = maleVoice;
      } else {
        // Fallback to first English voice
        const englishVoice = voicesRef.current.find(voice => voice.lang.startsWith('en'));
        if (englishVoice) {
          utterance.voice = englishVoice;
        }
      }
    }
    
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
    
    // iOS Safari workaround - small delay before speaking
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 10);
  }, []);

  // Load voices with retry mechanism for Safari
  const loadVoicesWhenAvailable = useCallback((onComplete?: () => void) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }
    
    const voices = window.speechSynthesis.getVoices();
    
    if (voices.length !== 0) {
      voicesRef.current = voices;
      voicesLoadedRef.current = true;
      console.log(`Loaded ${voices.length} TTS voices`);
      onComplete?.();
    } else {
      console.log('No voices yet, retrying...');
      setTimeout(() => loadVoicesWhenAvailable(onComplete), 100);
    }
  }, []);

  // Initialize iOS Safari TTS with empty utterance on first user interaction
  const initializeIOSSafari = useCallback(() => {
    if (!initializedRef.current && typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        // Mobile Safari requires an utterance (even a blank one) during
        // a user interaction to enable utterances during timeouts.
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
        initializedRef.current = true;
        console.log('iOS Safari TTS initialized with empty utterance');
        
        // Start loading voices after initialization
        loadVoicesWhenAvailable();
      } catch (err) {
        console.error('Failed to initialize iOS Safari TTS:', err);
      }
    }
  }, [loadVoicesWhenAvailable]);

  const speak = useCallback((text: string) => {
    if (!text.trim()) return;
    
    // Initialize on first speak (requires user interaction)
    initializeIOSSafari();
    
    console.log('Adding to speech queue:', text);
    queueRef.current.push(text);
    processQueue();
  }, [processQueue, initializeIOSSafari]);
  
  const cancel = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      queueRef.current = [];
      isProcessingRef.current = false;
      setIsSpeaking(false);
    }
  }, []);
  
  // Load voices on mount and listen for voice changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      // Load voices initially
      loadVoicesWhenAvailable();
      
      // Safari fires voiceschanged when voices are loaded
      const handleVoicesChanged = () => {
        console.log('Voices changed event fired');
        loadVoicesWhenAvailable();
      };
      
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
      
      return () => {
        cancel();
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      };
    }
  }, [cancel, loadVoicesWhenAvailable]);
  
  return {
    speak,
    cancel,
    isSpeaking,
    isSupported: typeof window !== 'undefined' && !!window.speechSynthesis,
    initializeIOSSafari
  };
}
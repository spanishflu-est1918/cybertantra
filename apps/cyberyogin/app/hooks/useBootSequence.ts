import { useEffect, useState } from 'react';

interface HistoryEntry {
  type: 'input' | 'output';
  content: string;
  typewriter?: boolean;
}

export function useBootSequence(userCity: string) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isBooting, setIsBooting] = useState(true);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (!userCity) return;

    const addMessage = (message: string, index: number) => {
      setHistory(prev => {
        const newHistory = [...prev];
        newHistory[index] = { type: 'output', content: message, typewriter: true };
        return newHistory;
      });
    };

    const bootSequence = async () => {
      setHistory([{ type: 'output', content: '>', typewriter: false }]);
      setShowCursor(true);
      
      const loadingSystems = [
        { name: 'core modules', duration: 300 },
        { name: 'command parser', duration: 200 },
        { name: 'security protocols', duration: 400 },
        { name: 'user location', duration: 300 },
        { name: 'terminal interface', duration: 200 }
      ];

      await new Promise(resolve => setTimeout(resolve, 800));
      
      for (const system of loadingSystems) {
        await new Promise(resolve => setTimeout(resolve, system.duration));
      }
      
      setShowCursor(false);
      setHistory([]);
      
      const finalMessage = '> speak';
      
      const messages = [
        '> connection established',
        '> you\'ve found the terminal',
        `> another visitor from ${userCity}`,
        finalMessage
      ];

      // Initialize all messages as empty
      setHistory(messages.map(() => ({ type: 'output', content: '', typewriter: false })));

      // Add messages with typewriter effect
      for (let i = 0; i < messages.length; i++) {
        addMessage(messages[i], i);
        // Wait for typewriter effect to complete (approximate time based on message length)
        const typewriterDuration = messages[i].length * 30 + 500; // ~30ms per char + buffer
        await new Promise(resolve => setTimeout(resolve, typewriterDuration));
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      
      setHistory(prev => [...prev, { type: 'output', content: '' }]);
      setIsBooting(false);
    };

    bootSequence();
  }, [userCity]);

  return { history, setHistory, isBooting, showCursor };
}
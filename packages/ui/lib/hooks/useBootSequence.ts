import { useEffect, useState, useRef } from 'react';

interface HistoryEntry {
  type: 'input' | 'output';
  content: string;
  typewriter?: boolean;
}

export function useBootSequence(
  enabled: boolean,
  onAddEntries: (entries: HistoryEntry[]) => void,
  customMessages?: string[]
) {
  const [bootComplete, setBootComplete] = useState(!enabled);
  const hasRun = useRef(false);

  useEffect(() => {
    if (!enabled || hasRun.current) {
      setBootComplete(true);
      return;
    }

    hasRun.current = true;

    const bootSequence = async () => {
      // Use custom messages if provided
      const messages = customMessages || [
        '> connection established',
        '> you\'ve found the terminal',
        '> another visitor',
        '> speak friend and /enter',
      ];

      // Initialize all messages as empty placeholders
      const emptyMessages = messages.map(() => ({
        type: 'output' as const,
        content: '',
        typewriter: false
      }));
      onAddEntries(emptyMessages);

      // Add messages one by one with typewriter effect
      for (let i = 0; i < messages.length; i++) {
        // Replace the empty message at index i with the actual message
        onAddEntries([{
          type: 'output' as const,
          content: messages[i],
          typewriter: true
        }]);
        
        // Calculate typewriter duration (30ms per char + 500ms buffer)
        const typewriterDuration = messages[i].length * 30 + 500;
        await new Promise(resolve => setTimeout(resolve, typewriterDuration));
      }

      // Add empty line at the end
      await new Promise(resolve => setTimeout(resolve, 500));
      onAddEntries([{ type: 'output', content: '', typewriter: false }]);
      
      setBootComplete(true);
    };

    bootSequence();
  }, [enabled]); // Remove onAddEntries from dependencies

  return bootComplete;
}
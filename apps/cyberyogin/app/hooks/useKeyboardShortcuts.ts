import { RefObject, KeyboardEvent } from 'react';
import { ALL_COMMANDS } from '../lib/commands/availableCommands';

interface HistoryEntry {
  type: 'input' | 'output';
  content: string;
  isTyping?: boolean;
}

interface UseKeyboardShortcutsProps {
  input: string;
  setInput: (value: string) => void;
  setHistory: (fn: (prev: HistoryEntry[]) => HistoryEntry[]) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  closeAllBrowsers?: () => void;
}

export function useKeyboardShortcuts({
  input,
  setInput,
  setHistory,
  inputRef,
  closeAllBrowsers
}: UseKeyboardShortcutsProps) {
  
  const handleShortcut = (e: KeyboardEvent<HTMLInputElement>): boolean => {
    // Ctrl+C - Close all active browsers
    if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      if (closeAllBrowsers) {
        closeAllBrowsers();
        setHistory(prev => [...prev, { type: 'output', content: '> Closed.' }]);
      }
      return true;
    }
    
    // Ctrl+W - Delete word
    if (e.ctrlKey && e.key === 'w') {
      e.preventDefault();
      const words = input.trimEnd().split(' ');
      words.pop();
      setInput(words.join(' ') + (words.length > 0 ? ' ' : ''));
      return true;
    }
    
    // Ctrl+U - Clear line
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
      setInput('');
      return true;
    }
    
    // Ctrl+L - Clear terminal
    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      setHistory(() => []);
      return true;
    }
    
    // Ctrl+A - Move to beginning
    if (e.ctrlKey && e.key === 'a') {
      e.preventDefault();
      if (inputRef.current) {
        inputRef.current.setSelectionRange(0, 0);
      }
      return true;
    }
    
    // Ctrl+E - Move to end
    if (e.ctrlKey && e.key === 'e') {
      e.preventDefault();
      if (inputRef.current) {
        const len = input.length;
        inputRef.current.setSelectionRange(len, len);
      }
      return true;
    }
    
    // Tab - Autocomplete
    if (e.key === 'Tab') {
      e.preventDefault();
      
      const matches = ALL_COMMANDS.filter(cmd => cmd.startsWith(input));
      if (matches.length === 1) {
        setInput(matches[0]);
      } else if (matches.length > 1 && input) {
        // Find common prefix
        let commonPrefix: string = matches[0];
        for (let j = 1; j < matches.length; j++) {
          const cmd = matches[j];
          let i = 0;
          while (i < commonPrefix.length && i < cmd.length && commonPrefix[i] === cmd[i]) i++;
          commonPrefix = commonPrefix.slice(0, i);
        }
        setInput(commonPrefix);
      }
      return true;
    }
    
    return false;
  };
  
  return { handleShortcut };
}
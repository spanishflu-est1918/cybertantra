import { useEffect, useState } from 'react';

export function useCommandHistory() {
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    const savedHistory = localStorage.getItem('commandHistory');
    if (savedHistory) {
      setCommandHistory(JSON.parse(savedHistory));
    }
  }, []);

  useEffect(() => {
    if (commandHistory.length > 0) {
      localStorage.setItem('commandHistory', JSON.stringify(commandHistory.slice(-50)));
    }
  }, [commandHistory]);

  const addCommand = (command: string) => {
    setCommandHistory(prev => [...prev, command]);
    setHistoryIndex(-1);
  };

  const navigateHistory = (direction: 'up' | 'down'): string | null => {
    if (direction === 'up' && historyIndex < commandHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      return commandHistory[commandHistory.length - 1 - newIndex];
    } else if (direction === 'down' && historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      return commandHistory[commandHistory.length - 1 - newIndex];
    } else if (direction === 'down' && historyIndex === 0) {
      setHistoryIndex(-1);
      return '';
    }
    return null;
  };

  return { commandHistory, addCommand, navigateHistory };
}
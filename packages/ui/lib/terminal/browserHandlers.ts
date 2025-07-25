import { KeyboardEvent } from 'react';

type HistoryEntry = {type: 'input' | 'output'; content: string; isTyping?: boolean};
type SetHistoryFn = (fn: (prev: HistoryEntry[]) => HistoryEntry[]) => void;

interface BrowserState {
  e: KeyboardEvent<HTMLInputElement>;
  selected: number;
  setSelected: (value: number) => void;
  setActive: (value: boolean) => void;
  setHistory: SetHistoryFn;
  formatter: (selected: number) => string;
  maxItems: number;
  onEnter?: () => void;
  onNumberKey?: (index: number) => void;
}

export function handleBrowserNavigation({
  e,
  selected,
  setSelected,
  setActive,
  setHistory,
  formatter,
  maxItems,
  onEnter,
  onNumberKey
}: BrowserState): boolean {
  if (e.key === 'ArrowUp' || e.key === 'k') {
    e.preventDefault();
    const newSelection = Math.max(0, selected - 1);
    setSelected(newSelection);
    updateDisplay(setHistory, formatter(newSelection));
    return true;
  }
  
  if (e.key === 'ArrowDown' || e.key === 'j') {
    e.preventDefault();
    const newSelection = Math.min(maxItems - 1, selected + 1);
    setSelected(newSelection);
    updateDisplay(setHistory, formatter(newSelection));
    return true;
  }
  
  if (e.key === 'Enter') {
    e.preventDefault();
    if (onEnter) onEnter();
    return true;
  }
  
  if (e.key === 'q' || e.key === 'Escape') {
    e.preventDefault();
    setActive(false);
    replaceLastHistory(setHistory, '> Closed.');
    return true;
  }
  
  if (e.key >= '1' && e.key <= '9') {
    const index = parseInt(e.key) - 1;
    if (index < maxItems) {
      if (onNumberKey) onNumberKey(index);
      return true;
    }
  }
  
  return false;
}

function updateDisplay(setHistory: SetHistoryFn, content: string) {
  setHistory(prev => {
    const newHistory = [...prev];
    newHistory[newHistory.length - 1] = { type: 'output', content };
    return newHistory;
  });
}

function replaceLastHistory(setHistory: SetHistoryFn, content: string) {
  setHistory(prev => {
    const newHistory = [...prev];
    if (newHistory.length > 0) {
      newHistory[newHistory.length - 1] = { type: 'output', content };
    }
    return newHistory;
  });
}
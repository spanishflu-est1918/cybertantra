'use client';

import { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { TerminalConfig } from '../types/terminal-config';

type HistoryEntry = {
  type: 'input' | 'output';
  content: string;
  typewriter?: boolean;
};

interface BrowserState {
  active: boolean;
  visible: boolean;
  selectedIndex: number;
}

interface TerminalContextType {
  // Configuration
  config: TerminalConfig;
  
  // Input state
  input: string;
  setInput: (input: string) => void;
  hasInteracted: boolean;
  setHasInteracted: (interacted: boolean) => void;
  isWaitingForResponse: boolean;
  setIsWaitingForResponse: (waiting: boolean) => void;
  
  // History
  history: HistoryEntry[];
  setHistory: (history: HistoryEntry[]) => void;
  addToHistory: (entry: HistoryEntry) => void;
  clearHistory: () => void;
  
  // Dynamic browser states
  browserStates: Record<string, BrowserState>;
  setBrowserState: (browserId: string, state: Partial<BrowserState>) => void;
  activeBrowser: string | null;
  setActiveBrowser: (browserId: string | null) => void;
  
  // Vim mode (if enabled)
  vimModeActive: boolean;
  setVimModeActive: (active: boolean) => void;
  
  // File system
  currentDirectory: string;
  setCurrentDirectory: (dir: string) => void;
}

const TerminalContext = createContext<TerminalContextType | undefined>(undefined);

interface TerminalProviderProps {
  children: ReactNode;
  config: TerminalConfig;
}

export function TerminalProvider({ children, config }: TerminalProviderProps) {
  const [input, setInput] = useState('');
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [vimModeActive, setVimModeActive] = useState(false);
  const [currentDirectory, setCurrentDirectory] = useState('/home/guest');
  const [activeBrowser, setActiveBrowser] = useState<string | null>(null);
  
  // Initialize browser states based on config
  const [browserStates, setBrowserStates] = useState<Record<string, BrowserState>>(() => {
    const states: Record<string, BrowserState> = {};
    config.browsers?.forEach(browser => {
      states[browser.id] = {
        active: false,
        visible: false,
        selectedIndex: 0,
      };
    });
    return states;
  });
  
  const setBrowserState = useCallback((browserId: string, state: Partial<BrowserState>) => {
    setBrowserStates(prev => ({
      ...prev,
      [browserId]: {
        ...prev[browserId],
        ...state,
      },
    }));
  }, []);
  
  const addToHistory = useCallback((entry: HistoryEntry) => {
    setHistory(prev => [...prev, entry]);
  }, []);
  
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);
  
  const value: TerminalContextType = {
    config,
    input,
    setInput,
    hasInteracted,
    setHasInteracted,
    isWaitingForResponse,
    setIsWaitingForResponse,
    history,
    setHistory,
    addToHistory,
    clearHistory,
    browserStates,
    setBrowserState,
    activeBrowser,
    setActiveBrowser,
    vimModeActive,
    setVimModeActive,
    currentDirectory,
    setCurrentDirectory,
  };
  
  return (
    <TerminalContext.Provider value={value}>
      {children}
    </TerminalContext.Provider>
  );
}

export function useTerminalContext() {
  const context = useContext(TerminalContext);
  if (!context) {
    throw new Error('useTerminalContext must be used within a TerminalProvider');
  }
  return context;
}
'use client';

import { createContext, useContext, ReactNode, useState } from 'react';

type HistoryEntry = {
  type: 'input' | 'output';
  content: string;
  typewriter?: boolean;
};

interface TerminalContextType {
  // Input state
  input: string;
  setInput: (input: string) => void;
  hasInteracted: boolean;
  setHasInteracted: (interacted: boolean) => void;
  isWaitingForResponse: boolean;
  setIsWaitingForResponse: (waiting: boolean) => void;
  
  // Browser states
  musicPlayerActive: boolean;
  setMusicPlayerActive: (active: boolean) => void;
  musicPlayerVisible: boolean;
  setMusicPlayerVisible: (visible: boolean) => void;
  selectedTrack: number;
  setSelectedTrack: (track: number) => void;
  
  workBrowserActive: boolean;
  setWorkBrowserActive: (active: boolean) => void;
  workBrowserVisible: boolean;
  setWorkBrowserVisible: (visible: boolean) => void;
  selectedProject: number;
  setSelectedProject: (project: number) => void;
  
  helpBrowserActive: boolean;
  setHelpBrowserActive: (active: boolean) => void;
  selectedCommand: number;
  setSelectedCommand: (command: number) => void;
  
  resumeBrowserActive: boolean;
  setResumeBrowserActive: (active: boolean) => void;
  selectedFormat: number;
  setSelectedFormat: (format: number) => void;
  
  vimModeActive: boolean;
  setVimModeActive: (active: boolean) => void;
  
  themeBrowserActive: boolean;
  setThemeBrowserActive: (active: boolean) => void;
  selectedTheme: number;
  setSelectedTheme: (theme: number) => void;
  
  dattatreyaPlayerActive: boolean;
  setDattatreyaPlayerActive: (active: boolean) => void;
  
  // Temple mode
  templeModeActive: boolean;
  setTempleModeActive: (active: boolean) => void;
  
  // Dialog states
  showResetConfirmation: boolean;
  setShowResetConfirmation: (show: boolean) => void;
  showHistoryPrompt: boolean;
  setShowHistoryPrompt: (show: boolean) => void;
  savedHistory: HistoryEntry[] | null;
  setSavedHistory: (history: HistoryEntry[] | null) => void;
  
  // Actions
  closeAllBrowsers: () => void;
}

const TerminalContext = createContext<TerminalContextType | undefined>(undefined);

export function TerminalProvider({ children }: { children: ReactNode }) {
  const [input, setInput] = useState('');
  const [hasInteracted, setHasInteracted] = useState(false);
  const [musicPlayerActive, setMusicPlayerActive] = useState(false);
  const [musicPlayerVisible, setMusicPlayerVisible] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(0);
  const [workBrowserActive, setWorkBrowserActive] = useState(false);
  const [workBrowserVisible, setWorkBrowserVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState(0);
  const [helpBrowserActive, setHelpBrowserActive] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState(0);
  const [resumeBrowserActive, setResumeBrowserActive] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState(0);
  const [vimModeActive, setVimModeActive] = useState(false);
  const [themeBrowserActive, setThemeBrowserActive] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(0);
  const [dattatreyaPlayerActive, setDattatreyaPlayerActive] = useState(false);
  const [templeModeActive, setTempleModeActive] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [showHistoryPrompt, setShowHistoryPrompt] = useState(false);
  const [savedHistory, setSavedHistory] = useState<HistoryEntry[] | null>(null);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);

  const closeAllBrowsers = () => {
    setHelpBrowserActive(false);
    setWorkBrowserActive(false);
    setWorkBrowserVisible(false);
    setMusicPlayerActive(false);
    setResumeBrowserActive(false);
    setVimModeActive(false);
    setThemeBrowserActive(false);
    setDattatreyaPlayerActive(false);
  };

  const terminalState = {
    input, setInput,
    hasInteracted, setHasInteracted,
    isWaitingForResponse, setIsWaitingForResponse,
    musicPlayerActive, setMusicPlayerActive,
    musicPlayerVisible, setMusicPlayerVisible,
    selectedTrack, setSelectedTrack,
    workBrowserActive, setWorkBrowserActive,
    workBrowserVisible, setWorkBrowserVisible,
    selectedProject, setSelectedProject,
    helpBrowserActive, setHelpBrowserActive,
    selectedCommand, setSelectedCommand,
    resumeBrowserActive, setResumeBrowserActive,
    selectedFormat, setSelectedFormat,
    vimModeActive, setVimModeActive,
    themeBrowserActive, setThemeBrowserActive,
    selectedTheme, setSelectedTheme,
    dattatreyaPlayerActive, setDattatreyaPlayerActive,
    templeModeActive, setTempleModeActive,
    showResetConfirmation, setShowResetConfirmation,
    showHistoryPrompt, setShowHistoryPrompt,
    savedHistory, setSavedHistory,
    closeAllBrowsers
  };
  
  return (
    <TerminalContext.Provider value={terminalState}>
      {children}
    </TerminalContext.Provider>
  );
}

export function useTerminalContext() {
  const context = useContext(TerminalContext);
  if (context === undefined) {
    throw new Error('useTerminalContext must be used within a TerminalProvider');
  }
  return context;
}
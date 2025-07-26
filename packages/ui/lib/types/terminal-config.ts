import { ReactNode } from 'react';
import { UseThemeReturn } from '../hooks/useTheme';

export interface HistoryEntry {
  type: 'input' | 'output';
  content: string;
  typewriter?: boolean;
}

export interface BrowserComponentProps {
  isActive: boolean;
  selectedIndex: number;
  onClose: () => void;
  setHistory?: (update: (prev: HistoryEntry[]) => HistoryEntry[]) => void;
}

export interface BrowserConfig {
  id: string;
  name: string;
  component: React.ComponentType<BrowserComponentProps>;
  formatter?: (selectedIndex: number) => string;
  maxItems?: number;
  onSelect?: (index: number) => void;
}

export interface TerminalConfig {
  // Project identity
  projectName: string;
  welcomeMessage?: string;
  
  // Available browsers/modes
  browsers?: BrowserConfig[];
  
  // Available slash commands (if not specified, all are available)
  availableCommands?: string[];
  
  // Custom hooks (provide your own implementations)
  useCommandExecutor?: (
    setHistory: (fn: (prev: HistoryEntry[]) => HistoryEntry[]) => void,
    setTheme?: (theme: any) => void,
    sendMessage?: (message: { text: string }) => void
  ) => {
    executeCommand: (command: string) => any;
    replaceLastHistory: (content: string) => void;
  };
  
  useTerminalNavigation?: (
    setHistory: (fn: (prev: HistoryEntry[]) => HistoryEntry[]) => void,
    executeCommand: (command: string) => void,
    replaceLastHistory: (content: string) => void,
    setTheme: (theme: any) => void,
    inputRef?: React.RefObject<HTMLInputElement | null>,
    isBooting?: boolean
  ) => {
    handleNavigation: (e: React.KeyboardEvent<HTMLInputElement>) => boolean;
  };
  
  // Boot sequence
  showBootSequence?: boolean;
  bootMessages?: string[];
  
  // AI configuration
  aiEndpoint?: string;
  aiEnabled?: boolean;
  
  // Features
  enableVimMode?: boolean;
  enableThemes?: boolean;
  enableFileSystem?: boolean;
  
  // Theme hook provider
  useTheme?: () => UseThemeReturn;
  
  // Context providers (for project-specific contexts)
  contextWrapper?: (children: ReactNode) => ReactNode;
}
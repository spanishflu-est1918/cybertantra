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
  
  // Custom commands
  customCommands?: Record<string, (args: string[]) => ReactNode | string>;
  
  // Custom command executor (overrides default command handling)
  customCommandExecutor?: (
    command: string,
    context: {
      setHistory: (fn: (prev: HistoryEntry[]) => HistoryEntry[]) => void;
      executeDefaultCommand: (command: string) => any;
      closeAllBrowsers: () => void;
      setBrowserState: (id: string, state: any) => void;
      setActiveBrowser: (id: string | null) => void;
    }
  ) => any;
  
  // Custom navigation handler for browser keyboard events
  customNavigationHandler?: (
    e: React.KeyboardEvent<HTMLInputElement>,
    context: {
      activeBrowser: string | null;
      browserStates: Record<string, any>;
      setHistory: (fn: (prev: HistoryEntry[]) => HistoryEntry[]) => void;
      executeCommand: (command: string) => void;
    }
  ) => boolean;
  
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
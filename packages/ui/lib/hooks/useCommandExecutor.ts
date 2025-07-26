import { useTerminalContext } from '../contexts/TerminalContext';
import { useCallback } from 'react';
import { handleCommand } from '../commands';

type HistoryEntry = {
  type: 'input' | 'output';
  content: string;
  typewriter?: boolean;
};

export function useCommandExecutor(
  setHistory: (fn: (prev: HistoryEntry[]) => HistoryEntry[]) => void,
  setTheme?: (theme: any) => void,
  sendMessage?: (message: { text: string }) => void
) {
  const { config, setBrowserState, setActiveBrowser, setVimModeActive, clearHistory } = useTerminalContext();

  const replaceLastHistory = useCallback((content: string) => {
    setHistory(prev => {
      const newHistory = [...prev];
      if (newHistory.length > 0) {
        newHistory[newHistory.length - 1] = { type: 'output', content };
      }
      return newHistory;
    });
  }, [setHistory]);

  const closeAllBrowsers = useCallback(() => {
    config.browsers?.forEach(browser => {
      setBrowserState(browser.id, { active: false, visible: false });
    });
    setActiveBrowser(null);
  }, [config.browsers, setBrowserState, setActiveBrowser]);

  const executeCommand = useCallback((command: string) => {
    const trimmedCommand = command.trim();
    
    // First, try the command system
    const commandResult = handleCommand(trimmedCommand, config.availableCommands);
    
    if (commandResult === 'CLEAR_TERMINAL') {
      clearHistory();
      return null;
    }
    
    if (commandResult && typeof commandResult === 'object' && 'content' in commandResult) {
      return commandResult;
    }
    
    if (commandResult) {
      // Handle browser commands
      if (typeof commandResult === 'string') {
        // Map browser command strings to browser IDs
        const browserCommandMap: Record<string, string> = {
          'SHOW_HELP_BROWSER': 'help',
          'SHOW_WORK_BROWSER': 'work',
          'SHOW_RESUME_BROWSER': 'resume',
          'SHOW_THEME_BROWSER': 'themes',
          'SHOW_MUSIC_PLAYER': 'music',
          'PLAY_DATTATREYA': 'dattatreya',
        };
        
        const browserId = browserCommandMap[commandResult];
        if (browserId) {
          const browser = config.browsers?.find(b => b.id === browserId);
          if (browser) {
            closeAllBrowsers();
            const isVisibleByDefault = commandResult === 'PLAY_DATTATREYA';
            setBrowserState(browser.id, { active: true, visible: isVisibleByDefault, selectedIndex: 0 });
            setActiveBrowser(browser.id);
            
            // If browser has a formatter, display the formatted content
            if (browser.formatter && !isVisibleByDefault) {
              const formattedContent = browser.formatter(0);
              setHistory(prev => [...prev, { type: 'output', content: formattedContent }]);
            }
            
            // Return special marker to indicate browser was activated
            return 'BROWSER_ACTIVATED';
          }
        } else if (commandResult.startsWith('CHANGE_THEME:') && setTheme) {
          const themeName = commandResult.split(':')[1];
          setTheme(themeName);
          return `Theme changed to ${themeName}`;
        }
      }
      return commandResult;
    }
    
    // If no command found, check for browser commands
    const parts = trimmedCommand.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    // Handle browser commands
    const browser = config.browsers?.find(b => b.id === cmd);
    if (browser) {
      closeAllBrowsers();
      setBrowserState(browser.id, { active: true, visible: true, selectedIndex: 0 });
      setActiveBrowser(browser.id);
      return browser.formatter ? browser.formatter(browser.component) : browser.component;
    }

    // Handle vim mode
    if (cmd === 'vim' && config.enableVimMode) {
      setVimModeActive(true);
      return 'Entering Vim mode. Press Escape to exit.';
    }

    // Handle custom commands
    if (config.customCommands?.[cmd]) {
      return config.customCommands[cmd](args);
    }

    // Handle theme command
    if (cmd === 'theme' && config.enableThemes && setTheme) {
      // Theme browser logic would go here
      return 'Theme browser coming soon...';
    }

    // Unknown command - fall back to AI chat if enabled
    if (sendMessage) {
      sendMessage({ text: command });
      return null;
    }
    return `Command not found: ${cmd}. Type 'help' for available commands.`;
  }, [config, setBrowserState, setActiveBrowser, closeAllBrowsers, setVimModeActive, sendMessage, setTheme, clearHistory]);

  return {
    executeCommand,
    replaceLastHistory,
    closeAllBrowsers,
  };
}
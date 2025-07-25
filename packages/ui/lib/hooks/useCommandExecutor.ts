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
    const commandResult = handleCommand(trimmedCommand);
    
    if (commandResult === 'CLEAR_TERMINAL') {
      clearHistory();
      return null;
    }
    
    if (commandResult && typeof commandResult === 'object' && 'content' in commandResult) {
      // Handle special browser commands
      if (commandResult.content === 'SHOW_HELP_BROWSER') {
        const browser = config.browsers?.find(b => b.id === 'help');
        if (browser) {
          closeAllBrowsers();
          setBrowserState(browser.id, { active: true, visible: true, selectedIndex: 0 });
          setActiveBrowser(browser.id);
          return browser.formatter ? browser.formatter(browser.component) : browser.component;
        }
      }
      return commandResult;
    }
    
    if (commandResult) {
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
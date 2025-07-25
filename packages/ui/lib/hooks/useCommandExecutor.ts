import { useTerminalContext } from '../contexts/TerminalContext';
import { useCallback } from 'react';

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
    const trimmedCommand = command.trim().toLowerCase();
    const parts = trimmedCommand.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    // Handle clear command
    if (cmd === 'clear' || cmd === 'cls') {
      clearHistory();
      return null;
    }

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

    // Handle AI chat
    if (cmd.startsWith('/') && config.aiEnabled && sendMessage) {
      sendMessage({ text: command });
      return null;
    }

    // Handle theme command
    if (cmd === 'theme' && config.enableThemes && setTheme) {
      // Theme browser logic would go here
      return 'Theme browser coming soon...';
    }

    // Handle help
    if (cmd === 'help' || cmd === '/help') {
      const commands = [
        'Available commands:',
        '',
        ...(config.browsers?.map(b => `  ${b.id} - Open ${b.name}`) || []),
        ...(config.enableVimMode ? ['  vim - Enter Vim mode'] : []),
        ...(config.enableThemes ? ['  theme - Change terminal theme'] : []),
        ...(config.customCommands ? Object.keys(config.customCommands).map(cmd => `  ${cmd} - Custom command`) : []),
        '  clear - Clear terminal',
        '  help - Show this help',
        ...(config.aiEnabled ? ['', 'Start messages with / to chat with AI'] : []),
      ];
      return commands.join('\\n');
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
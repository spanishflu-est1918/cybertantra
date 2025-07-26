import { handleCommand } from '../lib/commands';
import { formatWorkBrowser } from '../components/WorkBrowser';
import { formatHelpBrowser } from '../components/HelpBrowser';
import { formatResumeBrowser } from '../components/ResumeBrowser';
import { formatThemeBrowser } from '../components/ThemeBrowser';
import { formatMusicPlayer } from '../lib/terminal/formatters';
import { THEMES, Theme } from '@cybertantra/ui/lib/constants/themes';
import { useTerminalContext } from '../contexts/TerminalContext';

type HistoryEntry = {
  type: 'input' | 'output';
  content: string;
  typewriter?: boolean;
};

export function useCommandExecutor(
  setHistory: (fn: (prev: HistoryEntry[]) => HistoryEntry[]) => void,
  setTheme: (theme: Theme) => void,
  sendMessage: (message: { text: string }) => void
) {
  const {
    setMusicPlayerActive,
    setSelectedTrack,
    setWorkBrowserActive,
    setSelectedProject,
    setHelpBrowserActive,
    setSelectedCommand,
    setResumeBrowserActive,
    setSelectedFormat,
    setVimModeActive,
    setThemeBrowserActive,
    setSelectedTheme,
    setDattatreyaPlayerActive,
    setShowResetConfirmation,
    closeAllBrowsers
  } = useTerminalContext();

  const replaceLastHistory = (content: string) => {
    setHistory(prev => {
      const newHistory = [...prev];
      if (newHistory.length > 0) {
        newHistory[newHistory.length - 1] = { type: 'output', content };
      }
      return newHistory;
    });
  };

  const executeCommand = (command: string) => {
    const output = handleCommand(command);
    
    if (output === 'CLEAR_TERMINAL') {
      setHistory(() => []);
    } else if (output === 'SHOW_MUSIC_PLAYER') {
      closeAllBrowsers();
      setMusicPlayerActive(true);
      setSelectedTrack(0);
      const musicDisplay = formatMusicPlayer(0);
      replaceLastHistory(`> ${command}`);
      setHistory(prev => [...prev, { type: 'output', content: musicDisplay }]);
    } else if (output === 'PLAY_DATTATREYA') {
      closeAllBrowsers();
      replaceLastHistory(`> ${command}`);
      setHistory(prev => [...prev, { type: 'output', content: '> Opening Dattatreya Mantra player...' }]);
      // Return a special string that the shared Terminal will handle
      return 'SHOW_BROWSER:dattatreya';
    } else if (output === 'SHOW_WORK_BROWSER') {
      setWorkBrowserActive(true);
      // Always reset to first project when entering work browser
      setSelectedProject(0);
      const workDisplay = formatWorkBrowser(0, false);
      replaceLastHistory(`> ${command}`);
      setHistory(prev => [...prev, { type: 'output', content: workDisplay }]);
    } else if (output === 'SHOW_HELP_BROWSER') {
      closeAllBrowsers();
      setHelpBrowserActive(true);
      setSelectedCommand(0);
      const helpDisplay = formatHelpBrowser(0);
      replaceLastHistory(`> ${command}`);
      setHistory(prev => [...prev, { type: 'output', content: helpDisplay }]);
    } else if (output === 'SHOW_RESUME_BROWSER') {
      closeAllBrowsers();
      setResumeBrowserActive(true);
      setSelectedFormat(0);
      const resumeDisplay = formatResumeBrowser(0);
      replaceLastHistory(`> ${command}`);
      setHistory(prev => [...prev, { type: 'output', content: resumeDisplay }]);
    } else if (output === 'SHOW_VIM_MODE') {
      closeAllBrowsers();
      setVimModeActive(true);
      setHistory(prev => [...prev, { type: 'output', content: '> Entering vim...' }]);
    } else if (output === 'SHOW_THEME_BROWSER') {
      closeAllBrowsers();
      setThemeBrowserActive(true);
      setSelectedTheme(0);
      const themeDisplay = formatThemeBrowser(0);
      replaceLastHistory(`> ${command}`);
      setHistory(prev => [...prev, { type: 'output', content: themeDisplay }]);
    } else if (output && typeof output === 'string' && output.startsWith('CHANGE_THEME:')) {
      const themeName = output.split(':')[1] as Theme;
      if (THEMES[themeName]) {
        setTheme(themeName);
        setHistory(prev => [...prev, { 
          type: 'output', 
          content: `> Theme changed to ${THEMES[themeName].name}` 
        }]);
      } else {
        setHistory(prev => [...prev, { 
          type: 'output', 
          content: `> Invalid theme: ${themeName}\n> Use /themes to see available themes` 
        }]);
      }
    } else if (output === 'RESET_CONVERSATION') {
      setShowResetConfirmation(true);
      setHistory(prev => [...prev, { type: 'output', content: '> Are you sure you want to clear all conversation history? (y/n)' }]);
    } else if (output && typeof output === 'object' && 'typewriter' in output) {
      setHistory(prev => [...prev, { type: 'output', content: output.content, typewriter: true }]);
    } else if (output) {
      setHistory(prev => [...prev, { type: 'output', content: output }]);
    } else {
      sendMessage({ text: command });
    }
  };

  return { executeCommand, replaceLastHistory };
}
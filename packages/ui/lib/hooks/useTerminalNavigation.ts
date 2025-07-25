import { KeyboardEvent, useEffect, RefObject } from 'react';
import { handleBrowserNavigation } from '../lib/terminal/browserHandlers';
import { formatWorkBrowser, PROJECTS } from '../components/WorkBrowser';
import { formatHelpBrowser } from '../components/HelpBrowser';
import { formatResumeBrowser, RESUME_FORMATS } from '../components/ResumeBrowser';
import { formatThemeBrowser, THEME_LIST } from '../components/ThemeBrowser';
import { formatMusicPlayer } from '../lib/terminal/formatters';
import { ALL_COMMANDS } from '../lib/commands/availableCommands';
import { MUSIC_TRACKS } from '../lib/constants/music';
import { THEMES, Theme } from '../lib/constants/themes';
import { useTerminalContext } from '../contexts/TerminalContext';

type HistoryEntry = {
  type: 'input' | 'output';
  content: string;
  typewriter?: boolean;
};

export function useTerminalNavigation(
  setHistory: (fn: (prev: HistoryEntry[]) => HistoryEntry[]) => void,
  executeCommand: (command: string) => void,
  replaceLastHistory: (content: string) => void,
  setTheme: (theme: Theme) => void,
  inputRef?: RefObject<HTMLInputElement | null>,
  isBooting?: boolean
) {
  const {
    themeBrowserActive,
    resumeBrowserActive,
    helpBrowserActive,
    workBrowserActive,
    workBrowserVisible,
    musicPlayerActive,
    selectedTheme,
    selectedFormat,
    selectedCommand,
    selectedProject,
    selectedTrack,
    setSelectedTheme,
    setThemeBrowserActive,
    setSelectedFormat,
    setResumeBrowserActive,
    setSelectedCommand,
    setHelpBrowserActive,
    setSelectedProject,
    setWorkBrowserActive,
    setWorkBrowserVisible,
    setSelectedTrack,
    setMusicPlayerActive,
    setMusicPlayerVisible,
    musicPlayerVisible,
    vimModeActive
  } = useTerminalContext();

  useEffect(() => {
    const focusInput = () => {
      if (!isBooting && !workBrowserActive && inputRef?.current) {
        inputRef.current.focus();
      }
    };

    focusInput();

    const handleGlobalKeyDown = () => {
      if (musicPlayerVisible) return;
      
      if (workBrowserVisible) return;
      
      if (vimModeActive) return;
      
      if (!isBooting && !workBrowserActive) {
        focusInput();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isBooting, workBrowserActive, musicPlayerVisible, workBrowserVisible, vimModeActive, inputRef]);

  const handleNavigation = (e: KeyboardEvent<HTMLInputElement>): boolean => {
    if (themeBrowserActive) {
      if (handleBrowserNavigation({
        e,
        selected: selectedTheme,
        setSelected: setSelectedTheme,
        setActive: setThemeBrowserActive,
        setHistory: setHistory,
        formatter: formatThemeBrowser,
        maxItems: THEME_LIST.length,
        onEnter: () => {
          const themeName = THEME_LIST[selectedTheme];
          setThemeBrowserActive(false);
          setHistory(prev => [...prev, { 
            type: 'output', 
            content: `> ${THEMES[themeName].loadingMessage}` 
          }]);
          
          setTimeout(() => {
            setTheme(themeName);
            setHistory(prev => [...prev, { 
              type: 'output', 
              content: `> Theme changed to ${THEMES[themeName].name}` 
            }]);
          }, 1500);
        },
        onNumberKey: (index) => {
          const themeName = THEME_LIST[index];
          setThemeBrowserActive(false);
          setHistory(prev => [...prev, { 
            type: 'output', 
            content: `> ${THEMES[themeName].loadingMessage}` 
          }]);
          
          setTimeout(() => {
            setTheme(themeName);
            setHistory(prev => [...prev, { 
              type: 'output', 
              content: `> Theme changed to ${THEMES[themeName].name}` 
            }]);
          }, 1500);
        }
      })) {
        return true;
      }
    }
    
    if (resumeBrowserActive) {
      if (handleBrowserNavigation({
        e,
        selected: selectedFormat,
        setSelected: setSelectedFormat,
        setActive: setResumeBrowserActive,
        setHistory: setHistory,
        formatter: formatResumeBrowser,
        maxItems: RESUME_FORMATS.length,
        onEnter: () => {
          const format = RESUME_FORMATS[selectedFormat].id;
          setResumeBrowserActive(false);
          executeCommand(`/resume ${format}`);
        },
        onNumberKey: (index) => {
          const format = RESUME_FORMATS[index].id;
          setResumeBrowserActive(false);
          executeCommand(`/resume ${format}`);
        }
      })) {
        return true;
      }
    }
    
    if (helpBrowserActive) {
      if (handleBrowserNavigation({
        e,
        selected: selectedCommand,
        setSelected: setSelectedCommand,
        setActive: setHelpBrowserActive,
        setHistory: setHistory,
        formatter: formatHelpBrowser,
        maxItems: ALL_COMMANDS.length,
        onEnter: () => {
          setHelpBrowserActive(false);
          executeCommand(ALL_COMMANDS[selectedCommand]);
        },
        onNumberKey: (index) => {
          setHelpBrowserActive(false);
          executeCommand(ALL_COMMANDS[index]);
        }
      })) {
        return true;
      }
    }
    
    if (workBrowserActive && !workBrowserVisible) {
      if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        const newSelection = Math.max(0, selectedProject - 1);
        setSelectedProject(newSelection);
        replaceLastHistory(formatWorkBrowser(newSelection, false));
        return true;
      }
      
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        const newSelection = Math.min(PROJECTS.length - 1, selectedProject + 1);
        setSelectedProject(newSelection);
        replaceLastHistory(formatWorkBrowser(newSelection, false));
        return true;
      }
      
      if (e.key === 'Enter') {
        e.preventDefault();
        replaceLastHistory(formatWorkBrowser(selectedProject, true));
        setWorkBrowserVisible(true);
        return true;
      }
      
      if (e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        if (index < PROJECTS.length) {
          setSelectedProject(index);
          replaceLastHistory(formatWorkBrowser(index, true));
          setWorkBrowserVisible(true);
          return true;
        }
      }
      
      if (e.key === 'q' || e.key === 'Escape') {
        e.preventDefault();
        setWorkBrowserActive(false);
        setWorkBrowserVisible(false);
        return true;
      }
    }
    
    if (musicPlayerActive) {
      if (handleBrowserNavigation({
        e,
        selected: selectedTrack,
        setSelected: setSelectedTrack,
        setActive: setMusicPlayerActive,
        setHistory: setHistory,
        formatter: formatMusicPlayer,
        maxItems: MUSIC_TRACKS.length,
        onEnter: () => {
          const track = MUSIC_TRACKS[selectedTrack];
          setMusicPlayerVisible(true);
          setMusicPlayerActive(false);
          replaceLastHistory(`> Now playing: ${track.name}`);
        },
        onNumberKey: (index) => {
          const track = MUSIC_TRACKS[index];
          setSelectedTrack(index);
          setMusicPlayerVisible(true);
          setMusicPlayerActive(false);
          replaceLastHistory(`> Now playing: ${track.name}`);
        }
      })) {
        return true;
      }
    }
    
    return false;
  };

  return { handleNavigation };
}
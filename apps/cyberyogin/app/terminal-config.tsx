'use client';

import { TerminalConfig } from '@cybertantra/ui/types';
import { useCommandExecutor } from './hooks/useCommandExecutor';
import { useTerminalNavigation } from './hooks/useTerminalNavigation';
import { useTheme } from '@cybertantra/ui/lib/contexts';

// Browser components
import WorkBrowser from './components/WorkBrowser';
import MusicPlayer from './components/MusicPlayer';
import HelpBrowser from './components/HelpBrowser';
import DattatreyaPlayer from './components/DattatreyaPlayer';

// Formatters
import { formatWorkBrowser, PROJECTS } from './components/WorkBrowser';
import { formatMusicPlayer } from './lib/terminal/formatters';
import { formatHelpBrowser } from './components/HelpBrowser';
import { formatResumeBrowser, RESUME_FORMATS } from './components/ResumeBrowser';
import { formatThemeBrowser, THEME_LIST } from './components/ThemeBrowser';
import { MUSIC_TRACKS } from './lib/constants/music';
import { ALL_COMMANDS } from './lib/commands/availableCommands';

export const cyberyoginConfig: TerminalConfig = {
  projectName: 'cyberyogin',
  welcomeMessage: 'personal terminal. type /help to start',
  
  // Available commands for this project
  availableCommands: [
    '/help',
    '/about',
    '/work',
    '/music',
    '/contact',
    '/skills',
    '/resume',
    '/themes',
    '/theme',
    '/dattatreya',
  ],
  
  // Browser configurations with formatters
  browsers: [
    {
      id: 'help',
      name: 'Help',
      component: HelpBrowser,
      formatter: formatHelpBrowser,
      maxItems: ALL_COMMANDS.length,
    },
    {
      id: 'work',
      name: 'Work',
      component: WorkBrowser,
      formatter: (index) => formatWorkBrowser(index, false),
      maxItems: PROJECTS.length,
    },
    {
      id: 'music',
      name: 'Music',
      component: MusicPlayer,
      formatter: formatMusicPlayer,
      maxItems: MUSIC_TRACKS.length,
    },
    {
      id: 'resume',
      name: 'Resume',
      component: () => null, // No visual component, just formatter
      formatter: formatResumeBrowser,
      maxItems: RESUME_FORMATS.length,
    },
    {
      id: 'themes',
      name: 'Themes',
      component: () => null, // No visual component, just formatter
      formatter: formatThemeBrowser,
      maxItems: THEME_LIST.length,
    },
    {
      id: 'dattatreya',
      name: 'Dattatreya',
      component: DattatreyaPlayer,
    },
  ],
  
  // Custom hooks that implement cyberyogin-specific behavior
  useCommandExecutor,
  useTerminalNavigation,
  
  // Features
  showBootSequence: true,
  aiEnabled: true,
  aiEndpoint: '/api/chat',
  enableVimMode: true,
  enableThemes: true,
  enableFileSystem: true,
  
  // Theme hook
  useTheme,
};
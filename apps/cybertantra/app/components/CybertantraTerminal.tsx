'use client';

import { TerminalConfig } from '@cybertantra/ui/types';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import ConfigurableTerminal from './ConfigurableTerminal';

export default function CybertantraTerminal() {
  const config: TerminalConfig = {
    projectName: 'cybertantra',
    welcomeMessage: 'AI-powered terminal for exploring consciousness. type /help to start',
    
    browsers: [
      {
        id: 'search',
        name: 'Search',
        component: <div>Search lecture database (coming soon)</div>,
      },
      {
        id: 'query',
        name: 'Query',
        component: <div>Advanced AI query with context (coming soon)</div>,
      },
    ],
    
    customCommands: {
      search: (args) => `Searching for: ${args.join(' ')}...`,
      query: (args) => `Querying knowledge base: ${args.join(' ')}...`,
    },
    
    showBootSequence: true,
    bootMessages: [
      '> initializing cybertantra...',
      '> loading knowledge base...',
      '> connecting to AI consciousness...',
      '> ready.',
    ],
    aiEnabled: true,
    aiEndpoint: '/api/chat',
    enableVimMode: false,
    enableThemes: true,
    enableFileSystem: false,
    
    useTheme,
  };

  return <ConfigurableTerminal config={config} />;
}
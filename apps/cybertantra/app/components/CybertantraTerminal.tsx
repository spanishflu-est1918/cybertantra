'use client';

import { TerminalConfig } from '@cybertantra/ui/types';
import { useTheme } from '@cybertantra/ui/lib/contexts';
import ConfigurableTerminal from './ConfigurableTerminal';
import SearchBrowser from './SearchBrowser';
import QueryBrowser from './QueryBrowser';

export default function CybertantraTerminal() {
  const config: TerminalConfig = {
    projectName: 'cybertantra',
    welcomeMessage: 'AI-powered terminal for exploring consciousness. type /help to start',
    
    browsers: [
      {
        id: 'search',
        name: 'Search',
        component: SearchBrowser,
      },
      {
        id: 'query',
        name: 'Query',
        component: QueryBrowser,
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
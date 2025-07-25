import { TerminalConfig } from '@cybertantra/ui/types';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

export const cybertantraConfig: TerminalConfig = {
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
  aiEnabled: true,
  aiEndpoint: '/api/chat', // Can switch to /api/query for RAG
  enableVimMode: false,
  enableThemes: true,
  enableFileSystem: false,
  
  useTheme,
  
  contextWrapper: (children) => (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  ),
};
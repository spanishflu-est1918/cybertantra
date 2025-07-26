import { TerminalConfig } from '@cybertantra/ui/types';
import { ThemeProvider, useTheme } from '@cybertantra/ui/lib/contexts';
import SearchBrowser from './components/SearchBrowser';
import QueryBrowser from './components/QueryBrowser';

export const cybertantraConfig: TerminalConfig = {
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
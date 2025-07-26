import { TerminalConfig } from '@cybertantra/ui/types';
import { ThemeProvider, useTheme } from '@cybertantra/ui/lib/contexts';
import SearchBrowser from './components/SearchBrowser';
import QueryBrowser from './components/QueryBrowser';
import HelpBrowser from './components/HelpBrowser';

export const cybertantraConfig: TerminalConfig = {
  projectName: 'cybertantra',
  welcomeMessage: 'AI-powered terminal for exploring consciousness. type /help to start',
  
  availableCommands: ['/help', '/about', '/themes', '/theme', '/contact', '/skills'],
  
  browsers: [
    {
      id: 'help',
      name: 'Help',
      component: HelpBrowser,
      formatter: () => `
╔════════════════════════════════════════════╗
║            CYBERTANTRA HELP                ║
╚════════════════════════════════════════════╝

AVAILABLE COMMANDS:
  /help     - Show this help menu
  /about    - About this project  
  /themes   - Browse available themes
  /contact  - Contact information
  /skills   - Tech stack overview
  
SPECIAL COMMANDS:
  search    - Search the lecture database
  query     - Query with AI-powered RAG

NAVIGATION:
  ↑/↓       - Navigate in browser mode
  Enter     - Select item
  q/Esc     - Close browser

> Type any message to chat with AI
> Press q to close this help
`,
    },
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
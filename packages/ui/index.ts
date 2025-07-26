// Main UI exports
export * from './components';
export * from './lib/types';

// Export hooks (except useTheme to avoid conflict)
export {
  useBootSequence,
  useCommandExecutor,
  useCommandHistory,
  useKeyboardShortcuts,
  useTerminalChat
} from './lib/hooks';

// Export contexts
export {
  TerminalProvider,
  useTerminalContext,
  ThemeProvider,
  useTheme
} from './lib/contexts';
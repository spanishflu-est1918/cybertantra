'use client';

import { Terminal, TerminalProvider } from '@cybertantra/ui';
import { ThemeProvider } from '@cybertantra/ui/lib/contexts';
import { TerminalProvider as LocalTerminalProvider } from '../contexts/TerminalContext';
import { cyberyoginConfig } from '../terminal-config';

export default function CyberyoginTerminal() {
  return (
    <ThemeProvider>
      <LocalTerminalProvider>
        <TerminalProvider config={{
          ...cyberyoginConfig,
          contextWrapper: (children) => children, // Already wrapped above
        }}>
          <Terminal />
        </TerminalProvider>
      </LocalTerminalProvider>
    </ThemeProvider>
  );
}
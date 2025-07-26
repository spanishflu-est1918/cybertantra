'use client';

import { Terminal, TerminalProvider } from '@cybertantra/ui';
import { ThemeProvider } from '@cybertantra/ui/lib/contexts';
import { cybertantraConfig } from '../terminal-config';

export default function CybertantraTerminal() {
  return (
    <ThemeProvider>
      <TerminalProvider config={{
        ...cybertantraConfig,
        contextWrapper: (children) => children, // Already wrapped above
      }}>
        <Terminal />
      </TerminalProvider>
    </ThemeProvider>
  );
}
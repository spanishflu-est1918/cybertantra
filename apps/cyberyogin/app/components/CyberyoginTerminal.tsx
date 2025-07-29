'use client';

import { Terminal, TerminalProvider } from '@cybertantra/ui';
import { ThemeProvider } from '@cybertantra/ui/lib/contexts';
import { TerminalProvider as LocalTerminalProvider, useTerminalContext } from '../contexts/TerminalContext';
import { cyberyoginConfig } from '../terminal-config';
import { TempleMode } from '@/components/TempleMode';

function TerminalWithTemple() {
  const { templeModeActive } = useTerminalContext();
  
  return (
    <>
      {templeModeActive && <TempleMode />}
      <Terminal />
    </>
  );
}

export default function CyberyoginTerminal() {
  return (
    <ThemeProvider>
      <LocalTerminalProvider>
        <TerminalProvider config={{
          ...cyberyoginConfig,
          contextWrapper: (children) => children, // Already wrapped above
        }}>
          <TerminalWithTemple />
        </TerminalProvider>
      </LocalTerminalProvider>
    </ThemeProvider>
  );
}
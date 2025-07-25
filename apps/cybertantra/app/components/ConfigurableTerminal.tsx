'use client';

import { TerminalConfig } from '@cybertantra/ui/types';
import { TerminalProvider } from '@cybertantra/ui/contexts';
import { Terminal } from '@cybertantra/ui/components';

interface ConfigurableTerminalProps {
  config: TerminalConfig;
}

export default function ConfigurableTerminal({ config }: ConfigurableTerminalProps) {
  const content = (
    <TerminalProvider config={config}>
      <Terminal />
    </TerminalProvider>
  );

  // Wrap with any project-specific context providers
  if (config.contextWrapper) {
    return config.contextWrapper(content);
  }

  return content;
}
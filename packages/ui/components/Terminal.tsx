'use client';

import { useEffect, useRef, useState } from 'react';
import { useTerminalContext } from '../lib/contexts/TerminalContext';
import { useTheme as useDefaultTheme } from '../lib/hooks/useTheme';
import TerminalInput from './TerminalInput';
import CRTEffect from './CRTEffect';
import TypewriterText from './TypewriterText';
import VimMode from './VimMode';
import { useBootSequence } from '../lib/hooks/useBootSequence';
import { useCommandHistory } from '../lib/hooks/useCommandHistory';
import { useCommandExecutor } from '../lib/hooks/useCommandExecutor';
import { useTerminalChat } from '../lib/hooks/useTerminalChat';
import { useKeyboardShortcuts } from '../lib/hooks/useKeyboardShortcuts';
import { useGeolocation } from '../lib/hooks/useGeolocation';

export default function Terminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { 
    config,
    history, 
    setHistory, 
    hasInteracted, 
    setHasInteracted,
    input,
    setInput,
    isWaitingForResponse,
    setIsWaitingForResponse,
    vimModeActive,
    browserStates,
    activeBrowser,
  } = useTerminalContext();
  
  const useTheme = config.useTheme || useDefaultTheme;
  const { theme, setTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  
  // Get user city for boot sequence
  const userCity = useGeolocation();

  // Initialize boot sequence if enabled
  const bootComplete = useBootSequence(
    config.showBootSequence ?? true,
    (entries) => setHistory(prev => [...prev, ...entries]),
    config.bootMessages || (userCity ? [
      '> connection established',
      '> you\'ve found the terminal',
      `> another visitor from ${userCity}`,
      '> speak'
    ] : undefined)
  );

  // Command history navigation
  const { handleKeyDown: handleHistoryKeyDown } = useCommandHistory(
    history.filter(h => h.type === 'input').map(h => h.content),
    setInput
  );

  // Terminal chat for AI
  const { sendMessage, initializeWithHistory } = useTerminalChat({
    onMessage: (content, isAI) => {
      setHistory(prev => [...prev, { 
        type: 'output', 
        content,
        typewriter: isAI && theme.useTypewriter 
      }]);
      setIsWaitingForResponse(false);
    },
    onLoading: setIsLoading,
  });

  // Command executor
  const { executeCommand, replaceLastHistory } = useCommandExecutor(
    setHistory,
    config.enableThemes ? setTheme : undefined,
    config.aiEnabled ? sendMessage : undefined
  );

  // Keyboard shortcuts
  useKeyboardShortcuts({
    enabled: !vimModeActive && bootComplete && hasInteracted,
    onClear: () => setHistory([]),
  });

  // Handle command submission
  const handleSubmit = (command: string) => {
    if (!bootComplete || command.trim() === '') return;

    setHasInteracted(true);
    setHistory(prev => [...prev, { type: 'input', content: `> ${command}` }]);

    // Execute command (will fall back to AI chat if no command matches)
    const output = executeCommand(command);
    if (output !== null) {
      setHistory(prev => [...prev, { 
        type: 'output', 
        content: typeof output === 'string' ? output : output,
        typewriter: false 
      }]);
    }

    setInput('');
  };

  // Initialize AI chat with history on mount
  useEffect(() => {
    if (config.aiEnabled) {
      initializeWithHistory(history);
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  // Auto-focus input when boot completes
  useEffect(() => {
    if (bootComplete && inputRef.current) {
      inputRef.current.focus();
    }
  }, [bootComplete]);

  // Keep focus on input when clicking in terminal
  const handleTerminalClick = useCallback(() => {
    if (bootComplete && inputRef.current && !vimModeActive) {
      inputRef.current.focus();
    }
  }, [bootComplete, vimModeActive]);

  // Render active browser if any
  const activeBrowserConfig = config.browsers?.find(b => b.id === activeBrowser);

  return (
    <CRTEffect>
      <div className="w-full h-full bg-black text-green-400 font-mono p-2 sm:p-4 overflow-hidden text-xs sm:text-sm" onClick={handleTerminalClick}>
        <div 
          ref={terminalRef}
          className="h-[calc(100vh-1rem)] sm:h-[calc(100vh-2rem)] overflow-y-auto scrollbar-hide focus-blur"
        >
          {/* Welcome message */}
          {bootComplete && !hasInteracted && (
            <div className="whitespace-pre-wrap mb-1 text-green-400">
              {config.welcomeMessage || `Welcome to ${config.projectName}. Type /help to start.`}
            </div>
          )}

          {/* History */}
          {history.map((entry, index) => (
            <div key={index} className="whitespace-pre-wrap mb-1 text-green-400">
              {entry.typewriter ? (
                <TypewriterText text={entry.content} onComplete={() => {}} />
              ) : (
                entry.content
              )}
            </div>
          ))}

          {/* Active browser */}
          {activeBrowserConfig && browserStates[activeBrowser]?.visible && (
            <div className="mt-4">
              {activeBrowserConfig.component}
            </div>
          )}

          {/* Input */}
          {bootComplete && (
            <TerminalInput
              ref={inputRef}
              value={input}
              onChange={setInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit(input);
                } else {
                  handleHistoryKeyDown(e);
                }
              }}
              disabled={isLoading || isWaitingForResponse || vimModeActive}
              showPlaceholder={!hasInteracted}
            />
          )}

          {/* Vim mode indicator */}
          {vimModeActive && config.enableVimMode && <VimMode />}
        </div>
      </div>
    </CRTEffect>
  );
}
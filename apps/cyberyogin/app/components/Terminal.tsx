'use client';

import { useEffect, useRef, KeyboardEvent, useCallback } from 'react';
import { useBootSequence } from '../hooks/useBootSequence';
import { useCommandHistory } from '../hooks/useCommandHistory';
import { useGeolocation } from '../hooks/useGeolocation';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useTerminalNavigation } from '../hooks/useTerminalNavigation';
import { TerminalProvider, useTerminalContext } from '../contexts/TerminalContext';
import { useCommandExecutor } from '../hooks/useCommandExecutor';
import CRTEffect from './CRTEffect';
import TypewriterText from './TypewriterText';
import clsx from 'clsx';
import { useTheme, ThemeProvider } from '@cybertantra/ui/lib/contexts';
import TerminalInput from './TerminalInput';
import MusicPlayer from './MusicPlayer';
import WorkBrowser, { formatWorkBrowser } from './WorkBrowser';
import VimMode from './VimMode';
import DattatreyaPlayer from './DattatreyaPlayer';
import { useTerminalChat } from '../hooks/useTerminalChat';

function TerminalContent() {  
  const {
    input, setInput,
    hasInteracted, setHasInteracted,
    isWaitingForResponse, setIsWaitingForResponse,
    musicPlayerVisible, setMusicPlayerVisible,
    selectedTrack,
    workBrowserActive,
    workBrowserVisible, setWorkBrowserVisible,
    selectedProject,
    vimModeActive, setVimModeActive,
    dattatreyaPlayerActive, setDattatreyaPlayerActive,
    showResetConfirmation, setShowResetConfirmation,
    showHistoryPrompt, setShowHistoryPrompt,
    savedHistory, setSavedHistory,
    closeAllBrowsers
  } = useTerminalContext();
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  
  const userCity = useGeolocation();
  
  const { history, setHistory, isBooting, showCursor } = useBootSequence(userCity);
  const { addCommand, navigateHistory } = useCommandHistory();
  const { setTheme } = useTheme();
  
  const { handleShortcut } = useKeyboardShortcuts({ input, setInput, setHistory, inputRef, closeAllBrowsers });
  
  const streamingMessageRef = useRef<number | null>(null);

  const handleChatLoading = useCallback((loading: boolean) => {
    setIsWaitingForResponse(loading);
    if (!loading) {
      // Reset streaming ref when done
      streamingMessageRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [setIsWaitingForResponse]);

  const { messages: aiMessages, sendMessage } = useTerminalChat({
    onMessage: () => {}, // Not used anymore
    onLoading: handleChatLoading
  });
  
  // Sync AI messages to terminal history
  useEffect(() => {
    if (aiMessages.length > 0) {
      const lastAiMessage = aiMessages[aiMessages.length - 1];
      if (lastAiMessage.role === 'assistant') {
        // Extract text content from parts
        const content = lastAiMessage.parts
          .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
          .map(part => part.text)
          .join('');
        
        if (content) {
          // Update or add the AI message
          setHistory(prev => {
            const newHistory = [...prev];
            
            // Check if we need to update existing message or add new one
            if (streamingMessageRef.current !== null && streamingMessageRef.current < newHistory.length) {
              newHistory[streamingMessageRef.current] = {
                type: 'output',
                content: `> ${content}`
              };
            } else {
              // First time seeing this message
              newHistory.push({ type: 'output', content: `> ${content}` });
              streamingMessageRef.current = newHistory.length - 1;
            }
            
            return newHistory;
          });
        }
      }
    }
  }, [aiMessages, setHistory]);
  
  

  const { executeCommand, replaceLastHistory } = useCommandExecutor(setHistory, setTheme, sendMessage);


  const scrollToBottom = () => {
    if (terminalRef.current) {
      const element = terminalRef.current;
      element.scrollTop = element.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
    const timeouts = [
      setTimeout(scrollToBottom, 50),
      setTimeout(scrollToBottom, 100),
      setTimeout(scrollToBottom, 200),
      setTimeout(scrollToBottom, 500)
    ];
    
    return () => timeouts.forEach(clearTimeout);
  }, [history]);
  
  useEffect(() => {
    if (!terminalRef.current) return;
    
    const observer = new MutationObserver(() => {
      scrollToBottom();
    });
    
    observer.observe(terminalRef.current, {
      childList: true,
      subtree: true,
      characterData: true
    });
    
    return () => observer.disconnect();
  }, []);


  useEffect(() => {
    if (!isBooting && !workBrowserActive) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isBooting, workBrowserActive]);

  const { handleNavigation } = useTerminalNavigation(
    setHistory,
    executeCommand,
    replaceLastHistory,
    setTheme,
    inputRef,
    isBooting
  );


  const handleSubmit = () => {
    if (input.trim()) {
      const trimmedInput = input.trim();
      
      if (!hasInteracted) setHasInteracted(true);

      if (showHistoryPrompt) {
        setHistory(prev => [...prev, { type: 'input', content: `> ${trimmedInput}` }]);
        
        if (trimmedInput === '1') {
          if (savedHistory && savedHistory.length > 0) {
            const filteredHistory = savedHistory.filter(Boolean);
            setHistory(filteredHistory);
            setHistory(prev => [...prev, { type: 'output', content: '> Previous session restored.' }]);
          }
        } else if (trimmedInput === '2') {
          setHistory(prev => [...prev, { type: 'output', content: '> Starting new session.' }]);
        } else {
          setHistory(prev => [...prev, { type: 'output', content: '> Invalid option. Please choose 1 or 2.' }]);
          setInput('');
          return;
        }
        
        setShowHistoryPrompt(false);
        setSavedHistory(null);
        setInput('');
        return;
      }

      if (showResetConfirmation) {
        setHistory(prev => [...prev, { type: 'input', content: `> ${trimmedInput}` }]);
        
        if (trimmedInput.toLowerCase() === 'y' || trimmedInput.toLowerCase() === 'yes') {
          setHistory([]);
          setHistory(prev => [...prev, { type: 'output', content: '> Conversation history cleared.' }]);
        } else {
          setHistory(prev => [...prev, { type: 'output', content: '> Reset cancelled.' }]);
        }
        
        setShowResetConfirmation(false);
        setInput('');
        return;
      }

      setHistory(prev => [...prev, { type: 'input', content: `> ${trimmedInput}` }]);
      addCommand(trimmedInput);
      setInput('');
      // Execute command after state update to ensure proper order
      setTimeout(() => executeCommand(trimmedInput), 0);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (isWaitingForResponse && e.key !== 'Escape') {
      e.preventDefault();
      return;
    }
    
    if (handleNavigation(e)) {
      return;
    }

    if (handleShortcut(e)) {
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const command = navigateHistory('up');
      if (command !== null) setInput(command);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const command = navigateHistory('down');
      if (command !== null) setInput(command);
    }
  };

  return (
    <CRTEffect>
      <div 
        className="min-h-screen bg-black text-green-400 font-mono p-2 sm:p-4 overflow-hidden text-xs sm:text-sm"
        onClick={() => inputRef.current?.focus()}
      >
        <div 
          ref={terminalRef}
          className="h-[calc(100vh-1rem)] sm:h-[calc(100vh-2rem)] overflow-y-auto scrollbar-hide focus-blur"
        >
            {isBooting && showCursor && (
              <div className="flex items-center">
                <span className="mr-2">{'>'}</span>
                <span className="inline-block w-2 h-5 bg-green-400 animate-pulse"></span>
              </div>
            )}

            {!showCursor && history.filter(Boolean).map((entry, index) => (
              <div 
                key={index}
                className={clsx(
                  'whitespace-pre-wrap mb-1',
                  entry.type === 'input' ? 'text-yellow-300' : 'text-green-400'
                )}
              >
                {entry.typewriter && entry.type === 'output' ? (
                  <TypewriterText text={entry.content} />
                ) : (
                  entry.content
                )}
              </div>
            ))}
            
            {!isBooting && !workBrowserActive && (
              <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="w-full">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <TerminalInput
                      ref={inputRef}
                      value={input}
                      onChange={setInput}
                      onKeyDown={handleKeyDown}
                      showPlaceholder={!hasInteracted && !showHistoryPrompt && !showResetConfirmation}
                      disabled={isWaitingForResponse}
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="sm:hidden shrink-0 px-2 py-1 font-mono text-xs whitespace-nowrap" 
                    style={{ 
                      color: 'var(--color-primary)', 
                      backgroundColor: 'transparent',
                      border: '1px solid var(--color-primary)',
                      opacity: isWaitingForResponse ? 0.5 : 1
                    }}
                    disabled={isWaitingForResponse}
                  >
                    [SEND]
                  </button>
                </div>
              </form>
            )}
            
            {!isBooting && workBrowserActive && !workBrowserVisible && (
              <div className="flex items-center text-yellow-300">
                <span className="mr-2">{'>'}</span>
                <input
                  ref={inputRef}
                  type="text"
                  className="flex-1 bg-transparent outline-none text-yellow-300 caret-transparent"
                  onKeyDown={handleKeyDown}
                  value=""
                  readOnly
                  autoFocus
                  onBlur={(e) => {
                    if (!e.relatedTarget) {
                      setTimeout(() => e.target.focus(), 0);
                    }
                  }}
                />
              </div>
            )}
        </div>
      </div>
      
      <MusicPlayer 
        isActive={musicPlayerVisible}
        initialTrack={selectedTrack}
        onClose={() => setMusicPlayerVisible(false)}
      />
      
      <DattatreyaPlayer
        isActive={dattatreyaPlayerActive}
        onClose={() => setDattatreyaPlayerActive(false)}
      />
      
      <WorkBrowser
        isActive={workBrowserVisible}
        selectedProject={selectedProject}
        onClose={() => {
          setWorkBrowserVisible(false);
          replaceLastHistory(formatWorkBrowser(selectedProject, false));
        }}
        setHistory={setHistory}
      />
      
      <VimMode
        isActive={vimModeActive}
        onClose={() => {
          setVimModeActive(false);
          setHistory(prev => [...prev, { type: 'output', content: '> Exited vim.' }]);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
      />
    </CRTEffect>
  );
}

export default function Terminal() {
  return (
    <ThemeProvider>
      <TerminalProvider>
        <TerminalContent />
      </TerminalProvider>
    </ThemeProvider>
  );
}
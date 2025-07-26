'use client';

import { useChat } from '@ai-sdk/react';
import { useCallback, useEffect } from 'react';
import { DefaultChatTransport } from 'ai';

interface UseTerminalChatProps {
  onMessage: (content: string, isAI: boolean) => void;
  onLoading: (loading: boolean) => void;
}

export function useTerminalChat({ onMessage, onLoading }: UseTerminalChatProps) {

  const {
    messages,
    sendMessage: sendChatMessage,
    setMessages,
    status,
    error,
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
    onFinish: (result) => {
      const message = result.message || result;
      const content = message.content || (message.parts && message.parts.map(p => p.text).join(''));
      if (content) {
        onMessage(content, true);
      }
    },
  });

  // Track loading state
  const isLoading = status === 'streaming' || status === 'submitted';
  
  // Update loading state
  useEffect(() => {
    onLoading(isLoading);
  }, [isLoading, onLoading]);
  
  // Report errors
  useEffect(() => {
    if (error) {
      onMessage(`Error: ${error.message}`, true);
    }
  }, [error, onMessage]);




  // Initialize with conversation history
  const initializeWithHistory = useCallback((history: Array<{ type: 'input' | 'output'; content: string }>) => {
    const uiMessages = history
      .filter(entry => entry && entry.content && entry.content.trim())
      .map(entry => {
        const text = entry.content.replace(/^> /, '').trim();
        return text ? {
          id: Math.random().toString(36).substring(7),
          role: entry.type === 'input' ? 'user' as const : 'assistant' as const,
          parts: [{
            type: 'text' as const,
            text: text
          }]
        } : null;
      })
      .filter((msg): msg is NonNullable<typeof msg> => msg !== null);
    
    if (uiMessages.length > 0) {
      setMessages(uiMessages);
    }
  }, [setMessages]);



  return {
    messages,
    sendMessage: sendChatMessage,
    initializeWithHistory,
  };
}
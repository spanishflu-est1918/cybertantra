'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Vapi from '@vapi-ai/web';
import { BrowserComponentProps, HistoryEntry } from '@cybertantra/ui/types';

interface VapiConfig {
  publicKey?: string;
  assistantId?: string;
}

type VapiAssistantProps = BrowserComponentProps;

export function VapiAssistant({ isActive, setHistory }: VapiAssistantProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const vapiRef = useRef<Vapi | null>(null);

  const addLine = useCallback((content: string, isAI: boolean = false) => {
    if (setHistory) {
      setHistory((prev: HistoryEntry[]) => [...prev, { 
        type: isAI ? 'output' : 'input', 
        content 
      }]);
    }
  }, [setHistory]);

  useEffect(() => {
    if (!isActive) return;
    
    const initializeVapi = async (config: VapiConfig) => {
      setIsConnecting(true);
      
      try {
        // Initialize VAPI with public key
        const vapi = new Vapi(config.publicKey!);
        vapiRef.current = vapi;
        
        // Set up event listeners
        vapi.on('speech-start', () => {
          addLine('> 🎤 Listening...', true);
        });
        
        vapi.on('speech-end', () => {
          addLine('> 🤔 Processing...', true);
        });
        
        vapi.on('message', (message) => {
          if (message.type === 'transcript' && message.role === 'assistant') {
            addLine(`Skyler: ${message.transcript}`, true);
          }
        });

        vapi.on('call-start', () => {
          addLine('> 🟢 Voice channel connected', true);
          setIsConnected(true);
        });

        vapi.on('call-end', () => {
          addLine('> 🔴 Voice channel disconnected', true);
          setIsConnected(false);
        });

        vapi.on('error', (error) => {
          addLine(`[!] VAPI Error: ${error.message}`, false);
        });
        
        // Start the call with the assistant
        await vapi.start(config.assistantId!);
        
        addLine('> VAPI assistant initialized', true);
        
        addLine('> Voice interface ready. Start speaking!', true);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize VAPI');
        addLine(`[!] Error: ${err instanceof Error ? err.message : 'Unknown error'}`, false);
      } finally {
        setIsConnecting(false);
      }
    };

    // Check if VAPI config is available
    const vapiConfig: VapiConfig = {
      publicKey: process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY,
      assistantId: process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID,
    };

    if (!vapiConfig.publicKey || !vapiConfig.assistantId) {
      setError('VAPI configuration missing. Please check environment variables.');
      addLine('[!] Error: VAPI configuration not found', false);
      return;
    }

    // Initialize VAPI connection
    initializeVapi(vapiConfig);

    // Cleanup on unmount
    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop();
      }
    };
  }, [isActive, addLine]);

  if (error) {
    return (
      <div className="text-red-400 p-4 border border-red-400 rounded">
        <p className="font-bold mb-2">VAPI Integration Error</p>
        <p className="text-sm">{error}</p>
        <p className="text-xs mt-2">
          To enable VAPI, add these to your .env.local:
          <br />- NEXT_PUBLIC_VAPI_PUBLIC_KEY
          <br />- NEXT_PUBLIC_VAPI_ASSISTANT_ID
        </p>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="text-green-400 animate-pulse">
        Connecting to VAPI...
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="hidden">
        {/* VAPI runs in background, no UI needed */}
      </div>
    );
  }

  return null;
}
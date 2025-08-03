'use client';

import { forwardRef, KeyboardEvent, useState, useEffect, useRef } from 'react';
import VoiceInputButton from './VoiceInputButton';

interface TerminalInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  showPlaceholder?: boolean;
  disabled?: boolean;
  onVoiceInput?: (text: string) => void;
}

const CudaSpinner = () => {
  const [dots, setDots] = useState(['●', '∙', '∙']);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prevDots => {
        const activeIndex = prevDots.findIndex(dot => dot === '●');
        const newDots = ['∙', '∙', '∙'];
        newDots[(activeIndex + 1) % 3] = '●';
        return newDots;
      });
    }, 300);

    return () => clearInterval(interval);
  }, []);

  return <span>[{dots.join('')}]</span>;
};

const TerminalInput = forwardRef<HTMLInputElement, TerminalInputProps>(
  ({ value, onChange, onKeyDown, showPlaceholder = false, disabled = false, onVoiceInput }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [cursorVisible, setCursorVisible] = useState(true);
    
    // Debug logging
    console.log('TerminalInput rendered with onVoiceInput:', !!onVoiceInput);
    
    useEffect(() => {
      if (containerRef.current && ref && 'current' in ref && ref.current) {
        const container = containerRef.current;
        
        // Calculate if cursor would be outside visible area
        const charWidth = 8; // Approximate width of monospace character
        const cursorPosition = value.length * charWidth;
        const containerWidth = container.offsetWidth;
        
        // On mobile, hide cursor if it would overflow
        if (window.innerWidth < 640 && cursorPosition > containerWidth - 80) {
          setCursorVisible(false);
        } else {
          setCursorVisible(true);
        }
      }
    }, [value, ref]);
    
    return (
      <div className="flex items-center w-full">
        <span className="mr-2" style={{ color: 'var(--color-input)' }}>{'>'}</span>
        <div ref={containerRef} className="flex-1 relative">
          <input
            ref={ref}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            className="w-full bg-transparent outline-none caret-transparent"
            style={{ color: 'var(--color-primary)' }}
            placeholder={showPlaceholder ? "type /help or just chat..." : ""}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={disabled}
          />
          {cursorVisible && (
            <span className="absolute top-0 pointer-events-none" style={{ left: `${value.length}ch`, color: 'var(--color-primary)' }}>
              {disabled ? (
                <CudaSpinner />
              ) : (
                <span className="inline-block w-2 h-5 animate-pulse" style={{ backgroundColor: 'var(--color-cursor)' }}></span>
              )}
            </span>
          )}
        </div>
        {/* Voice input button */}
        {onVoiceInput && (
          <VoiceInputButton 
            onTranscript={onVoiceInput}
            className="ml-2"
          />
        )}
      </div>
    );
  }
);

TerminalInput.displayName = 'TerminalInput';

export default TerminalInput;
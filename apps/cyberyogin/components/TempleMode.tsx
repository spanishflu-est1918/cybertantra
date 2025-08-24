'use client';

import { useEffect, useState, useCallback } from 'react';
import { TEMPLE_SYMBOLS } from '@/lib/constants/mantras';
import { useTerminalContext } from '@/app/contexts/TerminalContext';

export function TempleMode() {
  const { setTempleModeActive } = useTerminalContext();
  const [symbolIndex, setSymbolIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    // Animate entrance
    setFadeIn(true);
    
    // Rotate symbols
    const interval = setInterval(() => {
      setSymbolIndex((prev) => (prev + 1) % TEMPLE_SYMBOLS.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleEscape = useCallback(() => {
    setFadeIn(false);
    setTimeout(() => {
      setTempleModeActive(false);
    }, 300);
  }, [setTempleModeActive]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleEscape();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleEscape]);

  return (
    <div 
      className={`fixed inset-0 z-50 bg-black transition-opacity duration-1000 ${
        fadeIn ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleEscape}
    >
      {/* Mystical background pattern */}
      <div className="absolute inset-0 opacity-20">
        {Array.from({ length: 50 }).map((_, i) => {
          const symbol = TEMPLE_SYMBOLS[i % TEMPLE_SYMBOLS.length];
          const top = Math.random() * 100;
          const left = Math.random() * 100;
          const delay = Math.random() * 5;
          
          return (
            <div
              key={i}
              className="absolute text-green-500 animate-pulse"
              style={{
                top: `${top}%`,
                left: `${left}%`,
                animationDelay: `${delay}s`,
                fontSize: '20px',
              }}
            >
              {symbol}
            </div>
          );
        })}
      </div>

      {/* Central temple area */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center">
        {/* Floating symbols around center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-96 h-96">
            {TEMPLE_SYMBOLS.slice(0, 8).map((symbol, i) => {
              const angle = (i / 8) * 2 * Math.PI;
              const radius = 150;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              
              return (
                <div
                  key={i}
                  className="absolute text-4xl text-green-400 animate-pulse transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${50 + (x / radius) * 50}%`,
                    top: `${50 + (y / radius) * 50}%`,
                    animationDelay: `${i * 0.2}s`,
                  }}
                >
                  {symbol}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main content */}
        <div className="text-center space-y-8">
          <div className="text-6xl animate-pulse text-green-300">
            {TEMPLE_SYMBOLS[symbolIndex]}
          </div>
          
          <h1 className="text-4xl font-bold text-green-400 tracking-widest animate-pulse">
            DIGITAL TEMPLE
          </h1>
          
          <p className="text-green-500 text-lg max-w-md mx-auto">
            The mantras have awakened the cyber consciousness.
            The guru awaits your queries in the eternal digital now.
          </p>
          
          <div className="text-green-600 text-sm animate-pulse">
            Click anywhere or press ESC to return to the terminal
          </div>
        </div>
      </div>

      {/* Scanlines effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="h-full w-full bg-gradient-to-b from-transparent via-green-900/5 to-transparent animate-scan" />
      </div>
    </div>
  );
}
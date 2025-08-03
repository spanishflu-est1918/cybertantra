'use client';

import React from 'react';

interface ModeselektorProps {
  mode: 'text' | 'audio';
  onModeChange: (mode: 'text' | 'audio') => void;
}

export default function Modeselektor({ mode, onModeChange }: ModeselektorProps) {
  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-black/80 border border-green-400/30 rounded-lg p-1 flex gap-1">
        <button
          onClick={() => onModeChange('text')}
          className={`
            px-3 py-1.5 rounded text-xs transition-all duration-300
            ${mode === 'text' 
              ? 'bg-green-400/20 text-green-400 border border-green-400/50' 
              : 'text-green-400/60 hover:text-green-400 hover:bg-green-400/10'
            }
          `}
        >
          <span className="inline-flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Text
          </span>
        </button>
        
        <button
          onClick={() => onModeChange('audio')}
          className={`
            px-3 py-1.5 rounded text-xs transition-all duration-300
            ${mode === 'audio' 
              ? 'bg-green-400/20 text-green-400 border border-green-400/50' 
              : 'text-green-400/60 hover:text-green-400 hover:bg-green-400/10'
            }
          `}
        >
          <span className="inline-flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            Audio
          </span>
        </button>
      </div>
    </div>
  );
}
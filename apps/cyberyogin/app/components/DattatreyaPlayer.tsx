'use client';

import { useState, useRef, useEffect } from 'react';
import FocusTrap from 'focus-trap-react';

interface DattatreyaPlayerProps {
  isActive: boolean;
  onClose: () => void;
}

export default function DattatreyaPlayer({ isActive, onClose }: DattatreyaPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive && audioRef.current) {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  }, [isActive]);

  useEffect(() => {
    if (isActive && playerRef.current) {
      setTimeout(() => {
        playerRef.current?.focus();
      }, 100);
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !hasFocus) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      e.stopPropagation();
      switch(e.key) {
        case ' ':
          e.preventDefault();
          if (audioRef.current) {
            if (isPlaying) {
              audioRef.current.pause();
            } else {
              audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
          }
          break;
        case 'r':
          e.preventDefault();
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play();
            setIsPlaying(true);
          }
          break;
        case 'Escape':
        case 'q':
          e.preventDefault();
          onClose();
          break;
        case 'Tab':
          e.preventDefault();
          setHasFocus(false);
          requestAnimationFrame(() => {
            document.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
          });
          break;
      }
    };

    const playerEl = playerRef.current;
    if (playerEl) {
      playerEl.addEventListener('keydown', handleKeyPress);
      return () => playerEl.removeEventListener('keydown', handleKeyPress);
    }
  }, [isActive, hasFocus, isPlaying, onClose]);

  if (!isActive) return null;

  return (
    <FocusTrap active={hasFocus && isActive} focusTrapOptions={{ 
      allowOutsideClick: true,
      escapeDeactivates: false,
      clickOutsideDeactivates: true,
      onDeactivate: () => setHasFocus(false),
      initialFocus: () => playerRef.current || undefined
    }}>
      <div 
        ref={playerRef}
        tabIndex={0}
        className="fixed top-4 right-4 z-50 w-[320px] outline-none"
        onFocus={() => setHasFocus(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            setHasFocus(false);
          }
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (!hasFocus) {
            playerRef.current?.focus();
            setHasFocus(true);
          }
        }}
      >
        <div className={`bg-black border-2 ${hasFocus ? 'border-yellow-300' : 'border-green-400'} rounded-lg overflow-hidden shadow-2xl`} 
             style={{ boxShadow: hasFocus ? '0 0 20px rgba(255, 255, 0, 0.5)' : '0 0 20px rgba(0, 255, 65, 0.5)' }}>
        
        <div className="flex items-center justify-between p-2 border-b border-green-400 bg-black">
          <span className="text-green-400 text-xs font-mono">🕉️ DATTATREYA</span>
          <button 
            onClick={onClose}
            className="text-green-400 hover:text-red-400 transition-colors"
          >
            ✕
          </button>
        </div>

        <audio
          ref={audioRef}
          src="/music/dattatreya-mantra.mp3"
          loop
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        <div className="bg-black p-4">
          <div className="text-yellow-300 text-sm font-mono">
            Dattatreya Mantra
          </div>
          <div className="text-green-400 text-xs font-mono opacity-70 mt-1">
            Shrikrishna Sawant
          </div>
        </div>

        <div className="bg-black p-3 border-t border-green-400 flex items-center justify-center gap-4">
          <button 
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play();
                setIsPlaying(true);
              }
            }}
            className="text-green-400 hover:text-yellow-300 transition-colors text-xl px-2 py-1"
            title="Restart"
          >
            ⟲
          </button>
          <button 
            onClick={() => {
              if (audioRef.current) {
                if (isPlaying) {
                  audioRef.current.pause();
                } else {
                  audioRef.current.play();
                }
                setIsPlaying(!isPlaying);
              }
            }}
            className="text-green-400 hover:text-yellow-300 transition-colors text-2xl px-4 py-2"
          >
            {isPlaying ? '▌▌' : '▶'}
          </button>
        </div>

        <div className="bg-black border-t border-green-400 p-2 text-center">
          <div className="text-green-400 text-xs font-mono opacity-70">
            {hasFocus ? (
              '[Space] Play/Pause | [r] Restart | [Tab] Terminal | [q] Close'
            ) : (
              'Click to focus for keyboard controls'
            )}
          </div>
        </div>
      </div>
    </div>
    </FocusTrap>
  );
}
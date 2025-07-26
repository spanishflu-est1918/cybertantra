'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import FocusTrap from 'focus-trap-react';
import { MUSIC_TRACKS } from '../lib/constants/music';
import { BrowserComponentProps } from '@cybertantra/ui/types';

type MusicPlayerProps = BrowserComponentProps;

export default function MusicPlayer({ isActive, selectedIndex = 0, onClose }: MusicPlayerProps) {
  const [currentTrack, setCurrentTrack] = useState(selectedIndex);
  const [selectedTrack, setSelectedTrack] = useState(selectedIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  // YouTube player instance - using any as react-youtube doesn't export player type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [player, setPlayer] = useState<any>(null);
  const trackRefs = useRef<(HTMLDivElement | null)[]>([]);
  const playerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCurrentTrack(selectedIndex);
    setSelectedTrack(selectedIndex);
  }, [selectedIndex]);

  useEffect(() => {
    if (trackRefs.current[selectedTrack]) {
      trackRefs.current[selectedTrack]?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
      });
    }
  }, [selectedTrack]);

  const getVideoId = (url: string) => {
    const match = url.match(/[?&]v=([^&]+)/);
    return match ? match[1] : '';
  };

  const opts: YouTubeProps['opts'] = {
    height: '0',
    width: '0',
    playerVars: {
      autoplay: 1,
      modestbranding: 1,
      controls: 0,
      rel: 0,
      showinfo: 0,
      iv_load_policy: 3,
      disablekb: 1,
    },
  };

  const onReady: YouTubeProps['onReady'] = (event) => {
    setPlayer(event.target);
    setIsPlaying(true);
    setIsLoading(false);
  };

  const onEnd: YouTubeProps['onEnd'] = () => {
    const nextTrack = (currentTrack + 1) % MUSIC_TRACKS.length;
    setCurrentTrack(nextTrack);
  };

  const onStateChange: YouTubeProps['onStateChange'] = (event) => {
    // YouTube Player states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
    setIsPlaying(event.data === 1);
    if (event.data === 3) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  };

  const playTrack = useCallback((index: number) => {
    if (index !== currentTrack) {
      setIsLoading(true);
    }
    setCurrentTrack(index);
    setSelectedTrack(index);
    setIsPlaying(true);
  }, [currentTrack]);

  // Auto-focus when opened
  useEffect(() => {
    if (isActive && !isMinimized && playerRef.current) {
      setTimeout(() => {
        playerRef.current?.focus();
      }, 100);
    }
  }, [isActive, isMinimized]);

  useEffect(() => {
    if (!isActive || isMinimized || !hasFocus) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      e.stopPropagation();
      switch(e.key) {
        case 'ArrowUp':
        case 'k':
          e.preventDefault();
          setSelectedTrack(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowDown':
        case 'j':
          e.preventDefault();
          setSelectedTrack(prev => Math.min(MUSIC_TRACKS.length - 1, prev + 1));
          break;
        case 'Enter':
          e.preventDefault();
          playTrack(selectedTrack);
          break;
        case ' ':
          e.preventDefault();
          if (player) {
            if (isPlaying) {
              player.pauseVideo();
            } else {
              player.playVideo();
            }
            setIsPlaying(!isPlaying);
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
        case 'c':
          if (e.ctrlKey) {
            e.preventDefault();
            setHasFocus(false);
            requestAnimationFrame(() => {
              document.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
            });
          }
          break;
      }
    };

    const playerEl = playerRef.current;
    if (playerEl) {
      playerEl.addEventListener('keydown', handleKeyPress);
      return () => playerEl.removeEventListener('keydown', handleKeyPress);
    }
  }, [isActive, isMinimized, hasFocus, player, isPlaying, selectedTrack, onClose, playTrack]);

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
        className={`fixed top-4 right-4 z-50 ${isMinimized ? 'w-auto' : 'w-[320px]'} outline-none`}
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
          <span className="text-green-400 text-xs font-mono">♪ PLAYER</span>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-green-400 hover:text-yellow-300 transition-colors"
            >
              {isMinimized ? '□' : '_'}
            </button>
            <button 
              onClick={onClose}
              className="text-green-400 hover:text-red-400 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            <div className="hidden">
              <YouTube
                key={currentTrack} // Force remount when track changes
                videoId={getVideoId(MUSIC_TRACKS[currentTrack].url)}
                opts={opts}
                onReady={onReady}
                onEnd={onEnd}
                onStateChange={onStateChange}
              />
            </div>

            <div className="bg-black p-3 border-b border-green-400">
              <div className="text-green-400 text-xs font-mono">NOW PLAYING:</div>
              <div className="text-yellow-300 text-sm font-mono mt-1">
                {MUSIC_TRACKS[currentTrack].name}
                {isLoading && <span className="ml-2 text-green-400">Loading...</span>}
              </div>
              <div className="text-green-400 text-xs font-mono opacity-70 mt-1">
                {MUSIC_TRACKS[currentTrack].description}
              </div>
            </div>

            <div className="bg-black p-2 border-b border-green-400 flex items-center justify-center gap-4">
              <button 
                onClick={() => {
                  const prevTrack = (currentTrack - 1 + MUSIC_TRACKS.length) % MUSIC_TRACKS.length;
                  setCurrentTrack(prevTrack);
                }}
                className="text-green-400 hover:text-yellow-300 transition-colors"
              >
                ◄◄
              </button>
              <button 
                onClick={() => {
                  if (player) {
                    if (isPlaying) {
                      player.pauseVideo();
                    } else {
                      player.playVideo();
                    }
                    setIsPlaying(!isPlaying);
                  }
                }}
                className="text-green-400 hover:text-yellow-300 transition-colors text-xl"
              >
                {isPlaying ? '▌▌' : '▶'}
              </button>
              <button 
                onClick={() => {
                  const nextTrack = (currentTrack + 1) % MUSIC_TRACKS.length;
                  setCurrentTrack(nextTrack);
                }}
                className="text-green-400 hover:text-yellow-300 transition-colors"
              >
                ►►
              </button>
            </div>

            <div className="bg-black border-t border-green-400 overflow-y-auto" style={{ maxHeight: '200px' }}>
              {MUSIC_TRACKS.map((track, index) => (
                <div key={index}>
                  {index === 0 && (
                    <div className="text-green-400 text-xs font-mono px-3 pt-2 pb-1 opacity-70">
                      ─── PIANO ───
                    </div>
                  )}
                  {index === 2 && (
                    <div className="text-green-400 text-xs font-mono px-3 pt-2 pb-1 opacity-70">
                      ─── ELECTRONIC ───
                    </div>
                  )}
                  {index === 4 && (
                    <div className="text-green-400 text-xs font-mono px-3 pt-2 pb-1 opacity-70">
                      ─── PRODUCTION ───
                    </div>
                  )}
                  <div
                    ref={el => { trackRefs.current[index] = el; }}
                    onClick={() => playTrack(index)}
                    className={`px-3 py-2 cursor-pointer transition-all text-xs font-mono
                      ${selectedTrack === index 
                        ? 'bg-black text-yellow-300 border-l-2 border-yellow-300' 
                        : 'text-green-400 hover:text-yellow-300'
                      }`}
                  >
                    <span className="mr-2">{currentTrack === index ? '▶' : selectedTrack === index ? '›' : ' '}</span>
                    [{index + 1}] {track.name}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-black border-t border-green-400 p-2 text-center">
              <div className="text-green-400 text-xs font-mono opacity-70">
                {hasFocus ? (
                  '[↑/↓] Navigate | [Enter] Play | [Space] Pause | [Tab/Ctrl+C] Terminal | [q] Close'
                ) : (
                  'Click to focus for keyboard controls'
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
    </FocusTrap>
  );
}
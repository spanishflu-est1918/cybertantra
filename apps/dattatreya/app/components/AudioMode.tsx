import { useState, useRef, useEffect, memo } from "react";

interface AudioModeProps {
  input: string;
  isRecording: boolean;
  permissionsGranted: boolean;
  isFirstInteraction: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  handleButtonInteraction: (e?: React.MouseEvent | React.TouchEvent) => void;
  setMode: (mode: 'text' | 'audio') => void;
}

const AudioMode = memo(function AudioMode({
  input,
  isRecording,
  permissionsGranted,
  isFirstInteraction,
  startRecording,
  stopRecording,
  handleButtonInteraction,
  setMode
}: AudioModeProps) {
  const [holdMode, setHoldMode] = useState(false);
  const holdModeRef = useRef(false);
  
  useEffect(() => {
    console.log('[AudioMode] Render - isRecording:', isRecording, 'input:', input);
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isFirstInteraction || !permissionsGranted) return;
    e.preventDefault();
    setHoldMode(true);
    holdModeRef.current = true;
    startRecording();
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isFirstInteraction || !permissionsGranted) return;
    e.preventDefault();
    if (holdMode && isRecording) {
      stopRecording();
      setHoldMode(false);
      holdModeRef.current = false;
    }
  };

  const handleMouseLeave = () => {
    if (holdMode && isRecording) {
      stopRecording();
      setHoldMode(false);
      holdModeRef.current = false;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isFirstInteraction || !permissionsGranted) return;
    e.preventDefault();
    setHoldMode(true);
    holdModeRef.current = true;
    startRecording();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isFirstInteraction || !permissionsGranted) return;
    e.preventDefault();
    if (holdMode && isRecording) {
      stopRecording();
      setHoldMode(false);
      holdModeRef.current = false;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    console.log('Button clicked!', { isFirstInteraction, permissionsGranted, isRecording });
    if (isFirstInteraction || !permissionsGranted) {
      handleButtonInteraction(e);
    } else if (!holdMode) {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 select-none">
      {input && (
        <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center max-w-2xl px-6">
          <p className="text-white/80 text-xl animate-fade-in font-light tracking-wide">
            "{input}"
          </p>
          {isRecording && (
            <div className="mt-2 flex justify-center space-x-1">
              <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse" />
              <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
              <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
            </div>
          )}
        </div>
      )}
      
      <div className="relative select-none">
        <button
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className={`
            w-32 h-32 rounded-full border-2 transition-all duration-300 select-none
            ${isRecording 
              ? 'border-white/80 bg-white/10 scale-110' 
              : isFirstInteraction
              ? 'border-white/60 hover:border-white/80 hover:bg-white/5'
              : 'border-white/30 hover:border-white/50'
            }
            flex items-center justify-center relative overflow-hidden
          `}
          style={{
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
            userSelect: 'none'
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`
              w-24 h-24 border border-white/20 rounded-full absolute
              ${isRecording ? 'animate-ping' : 'animate-slow-pulse'}
            `} />
            <div className={`
              w-16 h-16 border border-white/10 absolute
              ${isRecording ? 'animate-spin' : ''}
            `} style={{ transform: 'rotate(45deg)' }} />
            <span 
              className={`text-4xl ${isRecording ? 'animate-pulse' : ''}`}
              style={{
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none',
                userSelect: 'none',
                pointerEvents: 'none'
              }}
            >
              {isFirstInteraction ? '◉' : '⦿'}
            </span>
          </div>
        </button>
        
        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-xs text-white/40 whitespace-nowrap tracking-wider select-none pointer-events-none">
          {isFirstInteraction 
            ? 'TAP TO BEGIN' 
            : isRecording 
            ? (holdMode ? 'RELEASE TO SEND' : 'TAP TO STOP')
            : 'TAP OR HOLD'}
        </div>
      </div>
      
      <button
        onClick={() => setMode('text')}
        className="absolute top-6 right-6 text-white/40 hover:text-white/80 transition-colors"
      >
        ✕
      </button>
    </div>
  );
});

export default AudioMode;
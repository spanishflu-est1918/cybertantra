import { memo } from "react";
import { useAudioRecorder } from "../hooks/useAudioRecorder";

interface AudioModeProps {
  onTranscript: (text: string) => void;
  setMode: (mode: 'text' | 'audio') => void;
}

const AudioMode = memo(function AudioMode({
  onTranscript,
  setMode
}: AudioModeProps) {
  const {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording
  } = useAudioRecorder();
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isRecording) {
      stopRecording();
    } else {
      startRecording(onTranscript);
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 select-none">
      
      <div className="relative select-none">
        <button
          onClick={handleClick}
          className={`
            w-32 h-32 rounded-full border-2 transition-all duration-300 select-none
            ${isRecording 
              ? 'border-white/80 bg-white/10 scale-110' 
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
              {'⦿'}
            </span>
          </div>
        </button>
        
        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-xs text-white/40 whitespace-nowrap tracking-wider select-none pointer-events-none">
          {isTranscribing
            ? 'TRANSCRIBING...'
            : isRecording 
            ? 'TAP TO STOP'
            : 'TAP TO RECORD'}
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
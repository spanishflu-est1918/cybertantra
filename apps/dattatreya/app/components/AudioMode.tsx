import { memo } from "react";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { useTextToSpeech } from "../hooks/useTextToSpeech";

interface AudioModeProps {
  setMode: (mode: 'text' | 'audio') => void;
}

const AudioMode = memo(function AudioMode({
  setMode
}: AudioModeProps) {
  const { speak, isSpeaking } = useTextToSpeech();
  
  const handleTranscriptAndResponse = (text: string, response?: string) => {
    console.log('AudioMode handleTranscriptAndResponse called with:', {
      transcript: text,
      hasResponse: !!response,
      responseLength: response?.length
    });
    
    // Speak the response if available
    if (response) {
      console.log('Speaking AI response:', response.substring(0, 100) + '...');
      speak(response);
    } else {
      console.warn('No AI response to speak');
    }
  };
  
  const {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording
  } = useAudioRecorder({
    skipDownload: true,
    skipTranscription: false,
    onTranscript: handleTranscriptAndResponse
  });
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Don't allow recording while speaking
    if (isSpeaking) {
      console.log('Cannot record while speaking');
      return;
    }
    
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center select-none">
      
      <div className="relative select-none">
        <button
          onClick={handleClick}
          className={`
            w-32 h-32 rounded-full border-2 transition-all duration-300 select-none
            ${isTranscribing
              ? 'border-white bg-white/20 scale-110 animate-pulse'
              : isSpeaking
              ? 'border-white/20 bg-white/5 opacity-50 cursor-not-allowed'
              : isRecording 
              ? 'border-white/80 bg-white/10 scale-110' 
              : 'border-white/30 hover:border-white/50'
            }
            flex items-center justify-center relative overflow-hidden
          `}
          disabled={isSpeaking}
          style={{
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
            userSelect: 'none'
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`
              w-24 h-24 border rounded-full absolute
              ${isTranscribing 
                ? 'border-2 border-white/40 animate-ping' 
                : isRecording 
                ? 'border border-white/20 animate-ping' 
                : 'border border-white/20 animate-slow-pulse'}
            `} />
            <div className={`
              w-16 h-16 border border-white/10 absolute
              ${isTranscribing || isRecording ? 'animate-spin' : ''}
            `} style={{ 
              transform: 'rotate(45deg)',
              animationDuration: isTranscribing ? '1.5s' : '3s'
            }} />
            <span 
              className={`text-4xl ${isTranscribing || isRecording ? 'animate-pulse' : ''}`}
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
        
        <div className={`
          absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-xs whitespace-nowrap tracking-wider select-none pointer-events-none
          ${isTranscribing 
            ? 'text-white/60 animate-pulse' 
            : 'text-white/40'}
        `}>
          {isSpeaking
            ? 'SPEAKING...'
            : isTranscribing
            ? 'TRANSCRIBING...'
            : isRecording 
            ? 'TAP TO STOP'
            : 'TAP TO RECORD'}
        </div>
      </div>
    </div>
  );
});

export default AudioMode;
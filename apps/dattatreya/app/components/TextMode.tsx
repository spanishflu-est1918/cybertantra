import { Send, Mic } from "lucide-react";
import { useRef, useEffect } from "react";

interface TextModeProps {
  input: string;
  setInput: (input: string) => void;
  isLoading: boolean;
  isRecording: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  handleSubmit: (e: React.FormEvent) => void;
}

export default function TextMode({
  input,
  setInput,
  isLoading,
  isRecording,
  startRecording,
  stopRecording,
  handleSubmit
}: TextModeProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusInterval = setInterval(() => {
      if (document.activeElement !== inputRef.current && !isLoading) {
        inputRef.current?.focus();
      }
    }, 100);

    return () => clearInterval(focusInterval);
  }, [isLoading]);

  return (
    <div className="relative z-10 border-t border-white/10 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative group">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Speak your truth..."
              className="w-full px-6 py-3 bg-white/[0.02] border border-white/10 focus:border-white/30 outline-none transition-all duration-300 font-light tracking-wide placeholder:text-white/20 placeholder:tracking-[0.2em] group-hover:border-white/20"
              disabled={isLoading}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/10 pointer-events-none">
              ⛧
            </div>
          </div>
          <button
            type="button"
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            className={`w-14 h-14 border flex items-center justify-center transition-all duration-300 group relative overflow-hidden ${
              isRecording 
                ? 'border-white/60 bg-white/10 animate-pulse' 
                : 'border-white/20 hover:border-white/40'
            }`}
          >
            <Mic className={`w-4 h-4 relative z-10 transition-all ${
              isRecording ? 'text-white' : 'group-hover:glow-white'
            }`} />
            <div className="absolute inset-0 bg-white/5 scale-0 group-hover:scale-100 transition-transform duration-300" />
          </button>
          <button
            type="submit"
            disabled={isLoading || !input?.trim()}
            className="w-14 h-14 border border-white/20 flex items-center justify-center hover:border-white/40 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-300 group relative overflow-hidden"
          >
            <Send className="w-4 h-4 relative z-10 group-hover:glow-white transition-all" />
            <div className="absolute inset-0 bg-white/5 scale-0 group-hover:scale-100 transition-transform duration-300" />
          </button>
        </div>
      </form>
      
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}
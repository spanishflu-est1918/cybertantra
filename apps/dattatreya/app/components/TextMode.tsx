import { Send } from "lucide-react";
import { useRef, useEffect } from "react";

interface TextModeProps {
  input: string;
  setInput: (input: string) => void;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export default function TextMode({
  input,
  setInput,
  isLoading,
  onSubmit
}: TextModeProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const focusInterval = setInterval(() => {
      if (document.activeElement !== inputRef.current && !isLoading) {
        inputRef.current?.focus();
      }
    }, 100);

    return () => clearInterval(focusInterval);
  }, [isLoading]);

  return (
    <div className="flex justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-3xl">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Send a message..."
            rows={2}
            className="w-full border border-white/20 px-3 py-2 pb-10 text-base bg-white/[0.02] placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-0 focus-visible:border-white/40 disabled:cursor-not-allowed disabled:opacity-50 min-h-[56px] max-h-[200px] overflow-hidden resize-none rounded-2xl text-white/90 transition-all duration-200"
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e);
              }
            }}
          />
          
          <div className="absolute bottom-0 right-0 p-2">
            <button
              type="submit"
              disabled={isLoading || !input?.trim()}
              className="flex items-center justify-center bg-white text-black hover:bg-white/90 rounded-full p-1.5 h-fit border border-white/20 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              {isLoading ? (
                <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
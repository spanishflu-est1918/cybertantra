import { useRouter } from "next/navigation";

type Mode = 'text' | 'audio' | 'memory';

interface HeaderProps {
  mode: Mode;
  setMode: (mode: Mode) => void;
  sessionId?: string | null;
}

export default function Header({ mode, setMode, sessionId }: HeaderProps) {
  const router = useRouter();
  return (
    <div className="relative z-10 border-b border-white/10 backdrop-blur-sm select-none">
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 border border-white/20 flex items-center justify-center glow-white">
            <span className="text-2xl">◉</span>
          </div>
          <div>
            <h1 className="text-xl font-light tracking-[0.2em] uppercase">Dattatreya</h1>
            <p className="text-xs text-white/40 tracking-wider mt-1">
              {mode === 'memory' && sessionId ? '✦ Memory Active ✦' : '∴ Eternal Wisdom Interface ∴'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center border border-white/20 rounded-full">
            <button
              onClick={() => {
                if (mode !== 'text') router.push('/');
                setMode('text');
              }}
              className={`px-3 py-1.5 text-xs transition-all ${
                mode === 'text' 
                  ? 'bg-white text-black' 
                  : 'text-white/40 hover:text-white/80'
              }`}
            >
              Text
            </button>
            <button
              onClick={() => {
                if (mode !== 'audio') router.push('/');
                setMode('audio');
              }}
              className={`px-3 py-1.5 text-xs transition-all ${
                mode === 'audio' 
                  ? 'bg-white text-black' 
                  : 'text-white/40 hover:text-white/80'
              }`}
            >
              Audio
            </button>
            <button
              onClick={() => {
                if (mode !== 'memory') {
                  router.push('/memory');
                }
              }}
              className={`px-3 py-1.5 text-xs transition-all ${
                mode === 'memory' 
                  ? 'bg-white text-black' 
                  : 'text-white/40 hover:text-white/80'
              }`}
            >
              Memory
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
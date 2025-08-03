import { Volume2, VolumeX } from "lucide-react";

interface HeaderProps {
  mode: 'text' | 'audio';
  setMode: (mode: 'text' | 'audio') => void;
  isTTSEnabled: boolean;
  setIsTTSEnabled: (enabled: boolean) => void;
}

export default function Header({ mode, setMode, isTTSEnabled, setIsTTSEnabled }: HeaderProps) {
  return (
    <div className="relative z-10 border-b border-white/10 backdrop-blur-sm select-none">
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 border border-white/20 flex items-center justify-center glow-white">
            <span className="text-2xl">◉</span>
          </div>
          <div>
            <h1 className="text-xl font-light tracking-[0.2em] uppercase">Dattatreya</h1>
            <p className="text-xs text-white/40 tracking-wider mt-1">∴ Eternal Wisdom Interface ∴</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center border border-white/20 rounded-full">
            <button
              onClick={() => setMode('text')}
              className={`px-3 py-1.5 text-xs transition-all ${
                mode === 'text' 
                  ? 'bg-white text-black' 
                  : 'text-white/40 hover:text-white/80'
              }`}
            >
              Text
            </button>
            <button
              onClick={() => setMode('audio')}
              className={`px-3 py-1.5 text-xs transition-all ${
                mode === 'audio' 
                  ? 'bg-white text-black' 
                  : 'text-white/40 hover:text-white/80'
              }`}
            >
              Audio
            </button>
          </div>
          <button
            onClick={() => setIsTTSEnabled(!isTTSEnabled)}
            className="w-10 h-10 border border-white/20 flex items-center justify-center hover:border-white/40 transition-all duration-300 group"
            title={isTTSEnabled ? "Disable voice" : "Enable voice"}
          >
            {isTTSEnabled ? (
              <Volume2 className="w-4 h-4 group-hover:glow-white" />
            ) : (
              <VolumeX className="w-4 h-4 opacity-40 group-hover:opacity-100" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
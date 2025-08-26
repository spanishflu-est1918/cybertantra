"use client";

import { useState, useEffect } from "react";

interface MeditationClientProps {
  meditation: {
    id: string;
    slug: string;
    topic: string;
    duration: number;
    audioPath: string;
    audioSize: number | null;
    voiceId: string | null;
    createdAt: Date;
  };
}

export default function MeditationClient({
  meditation,
}: MeditationClientProps) {
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [glitchText, setGlitchText] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Occasional glitch effect
    const glitchInterval = setInterval(() => {
      setGlitchText(true);
      setTimeout(() => setGlitchText(false), 100);
    }, 8000);
    return () => clearInterval(glitchInterval);
  }, []);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono relative overflow-hidden">
      {/* CRT effects container */}
      <div className="crt-overlay pointer-events-none absolute inset-0 animate-crt-bend">
        <div className="scanlines absolute inset-0" />
        <div className="crt-flicker absolute inset-0" />
        <div className="vignette absolute inset-0" />
        <div className="crt-curve absolute inset-0" />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.03) 2px, rgba(0,255,0,0.03) 4px),
            repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,255,0,0.03) 2px, rgba(0,255,0,0.03) 4px)
          `,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Main content */}
      <div className="min-h-screen flex items-center justify-center p-8 relative z-10">
        <div
          className={`max-w-xl w-full transition-all duration-700 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {/* ASCII decoration */}
          <div className="text-center mb-8 text-gray-800 text-xs select-none">
            ▓▒░ ◆◇◆ ░▒▓
          </div>

          {/* Title section */}
          <div className="text-center mb-12 relative">
            <div className="inline-block relative">
              <h1
                className={`text-5xl font-light tracking-wide text-white crt-text-glow relative ${
                  glitchText ? "animate-glitch" : ""
                }`}
              >
                {meditation.topic}
                {glitchText && (
                  <>
                    <span
                      className="absolute inset-0 text-red-500 opacity-70"
                      style={{ left: "2px" }}
                    >
                      {meditation.topic}
                    </span>
                    <span
                      className="absolute inset-0 text-cyan-500 opacity-70"
                      style={{ left: "-2px" }}
                    >
                      {meditation.topic}
                    </span>
                  </>
                )}
              </h1>
              {/* Terminal cursor */}
              <span className="inline-block w-3 h-5 bg-white opacity-80 animate-blink ml-1" />
            </div>

            <div className="mt-4 text-gray-500 text-xs tracking-[0.3em]">
              {meditation.duration}MIN /{" "}
              {new Date(meditation.createdAt)
                .toLocaleDateString("en-US", { month: "short", day: "2-digit" })
                .toUpperCase()}
            </div>
          </div>

          {/* Audio Player Container */}
          <div className="mb-16">
            <div className="bg-black border border-gray-900 p-2 mb-6">
              <div className="border border-gray-800 p-8">
                <audio
                  controls
                  className="w-full"
                  preload="metadata"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  style={{
                    filter:
                      "invert(1) opacity(0.8) sepia(1) saturate(0) hue-rotate(180deg)",
                  }}
                >
                  <source src={meditation.audioPath} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>

                {/* Terminal-style status */}
                <div className="mt-4 text-xs text-gray-600 font-mono">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block w-2 h-2 ${
                        isPlaying ? "bg-green-500 animate-pulse" : "bg-gray-700"
                      }`}
                    />
                    <span>{isPlaying ? "PLAYING" : "READY"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ASCII visualizer */}
            {isPlaying && (
              <div className="text-center text-gray-700 text-xs leading-none select-none overflow-hidden h-4">
                <div className="animate-slide">
                  ░▒▓█▓▒░ ♪ ♫ ░▒▓█▓▒░ ♪ ♫ ░▒▓█▓▒░ ♪ ♫ ░▒▓█▓▒░ ♪ ♫
                </div>
              </div>
            )}
          </div>

          {/* Share Section */}
          <div className="border-t border-gray-900 pt-8">
            <div className="text-xs text-gray-600 mb-4 tracking-wider">
              {">"} SHARE_URL
            </div>

            <div className="space-y-3">
              <div className="bg-black border border-gray-900 p-1">
                <input
                  type="text"
                  value={
                    typeof window !== "undefined" ? window.location.href : ""
                  }
                  readOnly
                  className="w-full bg-transparent border border-gray-800 px-3 py-2 text-xs text-gray-400 focus:outline-none focus:text-white transition-colors font-mono"
                  onClick={(e) => e.currentTarget.select()}
                />
              </div>

              <button
                onClick={handleCopyLink}
                className={`w-full border ${
                  copied
                    ? "border-green-500 text-green-400"
                    : "border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300"
                } bg-black px-4 py-2 text-xs tracking-wider transition-all font-mono`}
              >
                [{copied ? "COPIED" : "COPY"}]
              </button>
            </div>
          </div>

          {/* Bottom ASCII decoration */}
          <div className="text-center mt-8 text-gray-900 text-xs select-none">
            ═══════════════
          </div>
        </div>
      </div>
    </div>
  );
}

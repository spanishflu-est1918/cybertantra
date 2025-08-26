"use client";

import { useState } from "react";

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

export default function MeditationClient({ meditation }: MeditationClientProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      {/* Centered container with vertical centering */}
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-xl w-full flex flex-col gap-16">
          {/* Title and Duration */}
          <div className="flex flex-col gap-4">
            <h1 className="text-5xl font-light text-center tracking-wide font-mono">
              {meditation.topic}
            </h1>
            <p className="text-center text-gray-400 text-sm tracking-widest uppercase font-mono">
              {meditation.duration} minutes
            </p>
          </div>

          {/* Audio Player - Custom styled */}
          <div>
            <audio 
              controls 
              className="w-full"
              preload="metadata"
              style={{
                filter: 'invert(1)',
                opacity: 0.9
              }}
            >
              <source src={meditation.audioPath} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </div>

          {/* Share */}
          <div className="border-t border-gray-800 pt-8">
            <p className="text-center text-sm text-gray-500 mb-6 font-mono">Share this meditation</p>
            <div className="flex flex-col gap-4">
              <input
                type="text"
                value={typeof window !== 'undefined' ? window.location.href : ''}
                readOnly
                className="w-full bg-transparent border-b border-gray-800 pb-2 text-sm text-gray-400 focus:outline-none focus:border-gray-600 transition-colors font-mono"
                onClick={(e) => e.currentTarget.select()}
              />
              <button
                onClick={handleCopyLink}
                className="w-full py-3 text-sm tracking-widest uppercase border border-gray-800 hover:border-white hover:bg-white hover:text-black transition-all duration-300 font-mono"
              >
                {copied ? 'Copied' : 'Copy Link'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
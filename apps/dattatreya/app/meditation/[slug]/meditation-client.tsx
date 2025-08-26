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
    <div className="min-h-screen bg-black text-white font-serif">
      {/* Centered container with vertical centering */}
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-xl w-full">
          {/* Title */}
          <h1 className="text-5xl font-light text-center mb-4 tracking-wide">
            {meditation.topic}
          </h1>
          
          {/* Duration */}
          <p className="text-center text-gray-400 text-sm tracking-widest uppercase mb-12">
            {meditation.duration} minutes
          </p>

          {/* Audio Player - Custom styled */}
          <div className="mb-12">
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
            <p className="text-center text-sm text-gray-500 mb-4">Share this meditation</p>
            <div className="space-y-3">
              <input
                type="text"
                value={typeof window !== 'undefined' ? window.location.href : ''}
                readOnly
                className="w-full bg-transparent border-b border-gray-800 pb-2 text-sm text-gray-400 focus:outline-none focus:border-gray-600 transition-colors"
                onClick={(e) => e.currentTarget.select()}
              />
              <button
                onClick={handleCopyLink}
                className="w-full py-3 text-sm tracking-widest uppercase border border-gray-800 hover:border-white hover:bg-white hover:text-black transition-all duration-300"
              >
                {copied ? 'Copied' : 'Copy Link'}
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center">
            <a 
              href="/" 
              className="text-gray-500 text-xs tracking-widest uppercase hover:text-white transition-colors"
            >
              Return
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
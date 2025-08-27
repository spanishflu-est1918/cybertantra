"use client";

import { useState } from "react";
import Chat from "./Chat";
import AudioMode from "./AudioMode";
import MemoryChat from "./MemoryChat";
import Header from "./Header";

type Mode = 'text' | 'audio' | 'memory';

export default function MainInterface() {
  const [mode, setMode] = useState<Mode>('audio');
  const [sessionId, setSessionId] = useState<string | null>(null);

  const renderContent = () => {
    switch (mode) {
      case 'text':
        return <Chat />;
      case 'audio':
        return <AudioMode />;
      case 'memory':
        return <MemoryChat sessionId={sessionId} setSessionId={setSessionId} />;
      default:
        return <AudioMode />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white font-mono">
      <Header 
        mode={mode}
        setMode={setMode}
        sessionId={sessionId}
      />
      
      {renderContent()}
    </div>
  );
}
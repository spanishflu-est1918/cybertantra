"use client";

import { useState } from "react";
import Chat from "./Chat";
import AudioMode from "./AudioMode";
import Header from "./Header";

export default function MainInterface() {
  const [mode, setMode] = useState<'text' | 'audio'>('audio');

  return (
    <div className="flex flex-col h-screen bg-black text-white font-mono">
      <Header 
        mode={mode}
        setMode={setMode}
      />
      
      {mode === 'text' ? (
        <Chat />
      ) : (
        <AudioMode />
      )}
    </div>
  );
}
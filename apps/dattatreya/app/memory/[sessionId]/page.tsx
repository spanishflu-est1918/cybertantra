"use client";

import { useParams } from "next/navigation";
import MemoryChat from "../../components/MemoryChat";
import Header from "../../components/Header";
import { useState } from "react";

export default function MemoryPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId);

  return (
    <div className="flex flex-col h-screen bg-black text-white font-mono">
      <Header 
        mode="memory"
        setMode={() => {}}
        sessionId={currentSessionId}
      />
      
      <MemoryChat 
        sessionId={currentSessionId} 
        setSessionId={setCurrentSessionId} 
      />
    </div>
  );
}
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { generateId } from "ai";

export default function MemoryRedirect() {
  const router = useRouter();

  useEffect(() => {
    const newSessionId = generateId();
    router.replace(`/memory/${newSessionId}`);
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen bg-black text-white font-mono">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-white/40 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs text-white/40 tracking-wider uppercase">Initializing Memory...</p>
      </div>
    </div>
  );
}
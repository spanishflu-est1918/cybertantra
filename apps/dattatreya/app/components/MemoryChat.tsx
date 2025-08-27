"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { generateId } from "ai";
import Message from "./Message";
import TextMode from "./TextMode";

interface MemoryChatProps {
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
}

export default function MemoryChat({ sessionId, setSessionId }: MemoryChatProps) {
  const [input, setInput] = useState("");
  const [recentSessions, setRecentSessions] = useState<Array<{
    id: string;
    metadata: any;
    updatedAt: Date;
  }>>([]);
  const [showSessions, setShowSessions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize session if not set
  useEffect(() => {
    if (!sessionId) {
      setSessionId(generateId());
    }
  }, [sessionId, setSessionId]);

  // Load recent sessions
  useEffect(() => {
    fetch("/api/sessions")
      .then((res) => res.json())
      .then((data) => setRecentSessions(data))
      .catch((err) => console.error("Failed to load sessions:", err));
  }, [sessionId]);

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: sessionId ? `/api/chat/${sessionId}` : "/api/chat",
      prepareSendMessagesRequest({ messages }) {
        // Send only the last message to optimize
        return { 
          body: { 
            message: messages[messages.length - 1],
          } 
        };
      },
    }),
  });

  // Load conversation when sessionId changes
  useEffect(() => {
    if (sessionId) {
      fetch(`/api/chat/${sessionId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages);
          }
        })
        .catch((err) => console.error("Failed to load conversation:", err));
    }
  }, [sessionId, setMessages]);

  const isLoading = status === "submitted" || status === "streaming";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !sessionId) return;

    const userInput = input;
    setInput("");
    await sendMessage({
      parts: [{ type: "text", text: userInput }],
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startNewSession = () => {
    const newId = generateId();
    setSessionId(newId);
    setMessages([]);
  };

  const loadSession = (id: string) => {
    setSessionId(id);
    setShowSessions(false);
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      setRecentSessions(recentSessions.filter((s) => s.id !== id));
      if (sessionId === id) {
        startNewSession();
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  return (
    <main className="flex-1 overflow-hidden flex flex-col relative">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.01] bg-gradient-to-b from-white/5 via-transparent to-white/5 pointer-events-none" />

      {/* Session controls */}
      <div className="border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={startNewSession}
            className="text-xs text-white/40 hover:text-white/80 transition-colors tracking-wider uppercase"
          >
            ✦ New Session
          </button>
          <button
            onClick={() => setShowSessions(!showSessions)}
            className="text-xs text-white/40 hover:text-white/80 transition-colors tracking-wider uppercase"
          >
            ◊ Recent Sessions ({recentSessions.length})
          </button>
        </div>
        {sessionId && (
          <div className="text-xs text-white/20 font-mono">
            Session: {sessionId.slice(0, 8)}...
          </div>
        )}
      </div>

      {/* Recent sessions dropdown */}
      {showSessions && (
        <div className="absolute top-[120px] left-6 right-6 max-w-2xl mx-auto bg-black border border-white/20 rounded-lg z-50 max-h-60 overflow-y-auto">
          {recentSessions.length === 0 ? (
            <div className="p-4 text-center text-white/40 text-xs">
              No recent sessions
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => loadSession(session.id)}
                  className="p-3 hover:bg-white/5 cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex-1">
                    <div className="text-sm text-white/80">
                      {session.metadata?.title || "Untitled session"}
                    </div>
                    <div className="text-xs text-white/40 mt-1">
                      {new Date(session.updatedAt).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={(e) => deleteSession(session.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-white/80 transition-all ml-4"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-mystical flex justify-center">
        <div className="w-full max-w-3xl px-4 py-6 space-y-6">
          {/* Mystical divider at top */}
          <div className="flex items-center justify-center opacity-20">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
              <span className="text-xs tracking-[0.4em]">◊</span>
              <div className="w-8 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
            </div>
          </div>

          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 space-y-6 opacity-40">
              <div className="relative">
                <div className="w-20 h-20 border border-white/10 rotate-45 animate-very-slow-spin"></div>
                <div className="absolute inset-4 border border-white/5 rotate-45 animate-slow-pulse"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl">◉</span>
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm tracking-[0.2em] uppercase">
                  Memory Initialized
                </p>
                <p className="text-xs tracking-[0.15em] opacity-60">
                  Our conversation will be remembered...
                </p>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div key={index} className="relative">
              <Message message={message} />
              {index < messages.length - 1 && (
                <div className="flex items-center justify-center py-6 opacity-10">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-px bg-white/20"></div>
                    <span className="text-xs">◦</span>
                    <div className="w-4 h-px bg-white/20"></div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex flex-col items-center space-y-4 py-8">
              <div className="relative">
                <div className="flex items-center space-x-1">
                  <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse"></div>
                  <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse animation-delay-200"></div>
                  <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse animation-delay-400"></div>
                </div>
              </div>
              <div className="text-xs text-white/40 tracking-[0.3em] uppercase animate-pulse">
                Channeling
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <TextMode
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </main>
  );
}
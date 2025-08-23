"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Message from "./Message";
import TextMode from "./TextMode";

export default function Chat() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

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

  return (
    <main className="flex-1 overflow-hidden flex flex-col relative">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.01] bg-gradient-to-b from-white/5 via-transparent to-white/5 pointer-events-none" />

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
                  The Oracle Awaits
                </p>
                <p className="text-xs tracking-[0.15em] opacity-60">
                  Speak your inquiry...
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
                Channeling...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <TextMode
        input={input}
        setInput={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </main>
  );
}

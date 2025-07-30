"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Volume2, VolumeX } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

export default function Chat() {
  const [isTTSEnabled, setIsTTSEnabled] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    onFinish: (result) => {
      const message = result.message || result;
      const content = (message as any).content || ((message as any).parts && (message as any).parts.map((p: any) => p.text).join(''));
      if (isTTSEnabled && content) {
        speak(content);
      }
    },
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const userInput = input;
    setInput("");
    await sendMessage({
      role: "user",
      parts: [{ type: "text", text: userInput }],
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-focus on input whenever it's not focused
  useEffect(() => {
    const focusInterval = setInterval(() => {
      if (document.activeElement !== inputRef.current && !isLoading) {
        inputRef.current?.focus();
      }
    }, 100);

    return () => clearInterval(focusInterval);
  }, [isLoading]);

  const speak = (text: string) => {
    if (!isTTSEnabled || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.9;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.name.includes("Google") || 
      voice.name.includes("Microsoft") ||
      voice.name.includes("Premium")
    );
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="relative flex flex-col h-screen bg-black text-white">
      {/* Mystical Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 border border-white/5 rounded-full animate-very-slow-spin" />
        <div className="absolute bottom-1/3 right-1/3 w-64 h-64 border border-white/5 rounded-full animate-very-slow-spin" style={{ animationDirection: 'reverse' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/[0.02] rounded-full animate-slow-pulse" />
      </div>

      {/* Header */}
      <div className="relative z-10 border-b border-white/10 backdrop-blur-sm">
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-mystical p-6 space-y-6 relative z-10">
        {messages.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-6 max-w-md animate-fade-in">
              <div className="mx-auto w-24 h-24 border border-white/20 border-mystical rounded-full flex items-center justify-center animate-slow-pulse">
                <span className="text-4xl glow-white">⦿</span>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-white/40 tracking-[0.3em] uppercase">Welcome, Seeker</p>
                <div className="w-32 h-px bg-white/10 mx-auto" />
                <p className="text-xs text-white/30 tracking-wider leading-relaxed">
                  Ask about consciousness, reality, or the eternal truths
                </p>
              </div>
            </div>
          </div>
        )}
        
        {messages.map((message: any) => {
          const messageContent = (message.parts && message.parts.map((p: any) => p.text).join('')) || message.content || '';
          const messageRole = message.role;
          
          return (
            <div
              key={message.id}
              className={`animate-message-in ${
                messageRole === "user" ? "ml-auto" : "mr-auto"
              } max-w-2xl`}
            >
              {messageRole === "assistant" && (
                <div className="flex items-center space-x-2 mb-2 opacity-40">
                  <span className="text-[10px] tracking-[0.3em] uppercase">Oracle</span>
                  <span className="text-xs">◯</span>
                </div>
              )}
              <div
                className={`relative group ${
                  messageRole === "user"
                    ? "border border-white/20 bg-white/[0.02]"
                    : "border border-white/10 border-mystical"
                } p-6 transition-all duration-300 hover:border-white/30`}
              >
                <p className="whitespace-pre-wrap leading-relaxed font-light tracking-wide">
                  {messageContent}
                </p>
                {messageRole === "assistant" && (
                  <div className="absolute -top-2 -left-2 text-xs opacity-20 group-hover:opacity-40 transition-opacity">
                    ⸸
                  </div>
                )}
              </div>
              <p className="text-[10px] text-white/20 mt-2 px-1 tracking-[0.2em]">
                {new Date(message.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          );
        })}
        
        {isLoading && (
          <div className="mr-auto max-w-2xl">
            <div className="flex items-center space-x-2 mb-2 opacity-40">
              <span className="text-[10px] tracking-[0.3em] uppercase">Oracle</span>
              <span className="text-xs animate-pulse">◉</span>
            </div>
            <div className="border border-white/10 border-mystical p-6">
              <div className="flex space-x-3">
                <div className="w-1 h-1 bg-white/40 rounded-full animate-pulse" />
                <div className="w-1 h-1 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                <div className="w-1 h-1 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="relative z-10 border-t border-white/10 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative group">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={handleInputChange}
                placeholder="Speak your truth..."
                className="w-full px-6 py-3 bg-white/[0.02] border border-white/10 focus:border-white/30 outline-none transition-all duration-300 font-light tracking-wide placeholder:text-white/20 placeholder:tracking-[0.2em] group-hover:border-white/20"
                disabled={isLoading}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/10 pointer-events-none">
                ⛧
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading || !input?.trim()}
              className="w-14 h-14 border border-white/20 flex items-center justify-center hover:border-white/40 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-300 group relative overflow-hidden"
            >
              <Send className="w-4 h-4 relative z-10 group-hover:glow-white transition-all" />
              <div className="absolute inset-0 bg-white/5 scale-0 group-hover:scale-100 transition-transform duration-300" />
            </button>
          </div>
        </form>
        
        {/* Bottom mystical elements */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
    </div>
  );
}
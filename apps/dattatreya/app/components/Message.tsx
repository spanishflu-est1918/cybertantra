export default function Message({ message }: { message: any }) {
  const messageContent = (message.parts && message.parts.map((p: any) => p.text).join('')) || message.content || '';
  const messageRole = message.role;
  
  return (
    <div className="animate-message-in">
      {messageRole === "assistant" && (
        <div className="flex items-center space-x-3 mb-2 opacity-50">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 border border-white/20 rotate-45 flex items-center justify-center">
              <div className="w-1 h-1 bg-white/40 rounded-full"></div>
            </div>
            <span className="text-[10px] tracking-[0.3em] uppercase">Oracle</span>
          </div>
        </div>
      )}
      
      {messageRole === "user" && (
        <div className="flex items-center space-x-2 mb-2 opacity-40 justify-end">
          <span className="text-[10px] tracking-[0.3em] uppercase">You</span>
        </div>
      )}

      <div
        className={`relative group ${
          messageRole === "user"
            ? "bg-white/[0.03] ml-auto max-w-[80%]"
            : "bg-white/[0.01] mr-auto max-w-[80%]"
        } px-4 py-3 rounded-2xl transition-all duration-300 hover:bg-white/[0.04]`}
      >
        {messageRole === "assistant" && (
          <>
            <div className="absolute -top-3 -left-3 text-sm opacity-15 group-hover:opacity-30 transition-opacity duration-300 pointer-events-none">
              ◈
            </div>
            <div className="absolute -bottom-3 -right-3 text-sm opacity-15 group-hover:opacity-30 transition-opacity duration-300 pointer-events-none rotate-180">
              ◈
            </div>
          </>
        )}
        
        {messageRole === "user" && (
          <div className="absolute top-4 right-4 text-xs opacity-10 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none">
            ⬡
          </div>
        )}

        <p className={`whitespace-pre-wrap leading-relaxed font-light select-text ${
          messageRole === "assistant" 
            ? "text-white/90 tracking-wide" 
            : "text-white/80 tracking-normal"
        }`}>
          {messageContent}
        </p>

        {/* Subtle inner glow effect */}
        <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${
          messageRole === "assistant"
            ? "bg-gradient-to-br from-white/[0.003] to-transparent opacity-0 group-hover:opacity-100"
            : "bg-gradient-to-tl from-white/[0.002] to-transparent opacity-0 group-hover:opacity-100"
        }`} />
      </div>
      
      <div className={`flex items-center mt-3 px-2 ${messageRole === "user" ? "justify-end" : "justify-start"}`}>
        <p className="text-[9px] text-white/15 tracking-[0.25em] font-mono">
          {new Date(message.createdAt || Date.now()).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
          })}
        </p>
      </div>
    </div>
  );
}
export default function Message({ message }: { message: any }) {
  const messageContent = (message.parts && message.parts.map((p: any) => p.text).join('')) || message.content || '';
  const messageRole = message.role;
  
  return (
    <div
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
        <p className="whitespace-pre-wrap leading-relaxed font-light tracking-wide select-text">
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
}
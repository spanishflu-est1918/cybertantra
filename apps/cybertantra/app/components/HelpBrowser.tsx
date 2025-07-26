'use client';

interface HelpBrowserProps {
  onClose?: () => void;
}

export default function HelpBrowser({ onClose }: HelpBrowserProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
      <div className="p-8 border border-green-500 bg-black text-green-500 max-w-2xl">
        <h2 className="text-2xl mb-4 font-mono">CYBERTANTRA HELP</h2>
        <div className="space-y-4 font-mono text-sm">
          <p>Welcome to Cybertantra - AI-powered terminal for exploring consciousness</p>
          
          <div>
            <h3 className="text-lg mb-2">Available Commands:</h3>
            <ul className="space-y-1">
              <li>/help - Show this help menu</li>
              <li>/about - About this project</li>
              <li>/themes - Browse available themes</li>
              <li>/contact - Contact information</li>
              <li>/skills - Tech stack overview</li>
              <li>search [query] - Search the lecture database</li>
              <li>query [question] - Query with AI-powered RAG</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg mb-2">Navigation:</h3>
            <ul className="space-y-1">
              <li>↑/↓ - Navigate in browser mode</li>
              <li>Enter - Select item</li>
              <li>q/Esc - Close browser</li>
            </ul>
          </div>
          
          <p className="mt-4">Type any message to chat with AI assistant</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="mt-6 px-4 py-2 border border-green-500 hover:bg-green-500 hover:text-black transition-colors"
          >
            Close (ESC)
          </button>
        )}
      </div>
    </div>
  );
}
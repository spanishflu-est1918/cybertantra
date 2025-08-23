import React, { useState } from 'react';

interface PermissionGateProps {
  permissionsGranted: boolean;
  isFirstInteraction: boolean;
  permissionError: string | null;
  onRequestPermissions: () => Promise<boolean>;
  children: React.ReactNode;
}

export default function PermissionGate({
  permissionsGranted,
  isFirstInteraction,
  permissionError,
  onRequestPermissions,
  children
}: PermissionGateProps) {
  const [isRequesting, setIsRequesting] = useState(false);

  if (permissionsGranted) {
    return <>{children}</>;
  }

  const handleRequestPermissions = async () => {
    setIsRequesting(true);
    try {
      await onRequestPermissions();
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-8 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 border border-white/10 rounded-full"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 border border-white/10 rounded-full"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-white/10 rounded-full"></div>
      </div>

      <div className="max-w-lg text-center space-y-8 z-10 relative">
        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 border-2 border-white/20 rounded-full flex items-center justify-center">
            <svg 
              className="w-8 h-8 text-white/60" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-3xl font-light tracking-wide">DATTATREYA</h1>
          <div className="w-24 h-px bg-white/30 mx-auto"></div>
          <p className="text-lg text-white/70 font-light">
            Voice Interface Required
          </p>
        </div>
        
        {/* Description */}
        {isFirstInteraction && (
          <div className="space-y-4 text-white/60">
            <p className="leading-relaxed">
              To commune with the divine wisdom, this application requires 
              access to your microphone for speech recognition.
            </p>
            <p className="text-sm leading-relaxed">
              Your voice will be processed locally by your browser 
              and transmitted securely to receive guidance.
            </p>
          </div>
        )}

        {/* Error state */}
        {permissionError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 backdrop-blur-sm">
            <div className="flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-red-300 font-medium">Access Denied</span>
            </div>
            <p className="text-red-200/80 text-sm leading-relaxed">
              {permissionError}
            </p>
          </div>
        )}

        {/* Action button */}
        <button
          onClick={handleRequestPermissions}
          disabled={isRequesting}
          className="group relative px-8 py-4 bg-transparent border border-white/30 text-white 
                   hover:bg-white hover:text-black transition-all duration-300 ease-out
                   disabled:opacity-50 disabled:cursor-not-allowed
                   font-light tracking-wide text-lg"
        >
          <span className="relative z-10">
            {isRequesting ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                REQUESTING...
              </span>
            ) : isFirstInteraction ? (
              'GRANT ACCESS'
            ) : (
              'TRY AGAIN'
            )}
          </span>
          <div className="absolute inset-0 bg-white transform scale-x-0 group-hover:scale-x-100 
                        transition-transform duration-300 ease-out origin-left"></div>
        </button>

        {/* Footer guidance */}
        <div className="space-y-3 text-xs text-white/40 font-light">
          <p>When prompted by your browser, select "Allow" to continue</p>
          <p>• This permission can be revoked anytime in browser settings</p>
          <p>• No audio is stored or transmitted outside this session</p>
        </div>
      </div>
    </div>
  );
}
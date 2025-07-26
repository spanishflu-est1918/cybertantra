'use client';

import { ReactNode } from 'react';

interface CRTEffectProps {
  children: ReactNode;
}

export default function CRTEffect({ children }: CRTEffectProps) {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="w-full h-full tron-grid"></div>
      </div>

      <div className="absolute inset-0 z-30 pointer-events-none">
        <div className="w-full h-full crt-curve"></div>
      </div>
      
      <div className="relative z-10 w-full h-full crt-content">
        {children}
      </div>
      
      <div className="pointer-events-none absolute inset-0 z-20">
        <div className="scanlines"></div>
        
        <div className="flicker"></div>
        
        <div className="vignette"></div>
        
        <div className="rgb-lines"></div>
      </div>
      
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="w-full h-full bg-green-400/20 blur-[100px]"></div>
      </div>
    </div>
  );
}
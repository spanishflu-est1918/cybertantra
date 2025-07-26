import { useState, useEffect } from 'react';

interface TypewriterTextProps {
  text: string;
  onComplete?: () => void;
}

export default function TypewriterText({ text, onComplete }: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    if (currentIndex < text.length) {
      const baseDelay = 25;
      const variation = Math.random() * 20;
      const currentChar = text[currentIndex];
      const isPunctuation = /[.,!?;:]/.test(currentChar);
      const isSpace = currentChar === ' ';
      const isNewline = currentChar === '\n';
      
      let delay = baseDelay + variation;
      if (isPunctuation) delay += 60;
      if (isSpace) delay = 8;
      if (isNewline) delay += 80;
      
      const shouldBurst = Math.random() < 0.15 && !isPunctuation && !isNewline;
      const burstLength = shouldBurst ? Math.min(2 + Math.floor(Math.random() * 2), text.length - currentIndex) : 1;
      
      const timeout = setTimeout(() => {
        const charsToAdd = text.slice(currentIndex, currentIndex + burstLength);
        setDisplayedText(prev => prev + charsToAdd);
        setCurrentIndex(prev => prev + burstLength);
      }, delay);
      
      return () => clearTimeout(timeout);
    } else if (onComplete && currentIndex === text.length && displayedText === text) {
      onComplete();
    }
  }, [currentIndex, text, onComplete, displayedText]);
  
  return (
    <>
      {displayedText}
      {currentIndex < text.length && (
        <span className="inline-block w-2 bg-green-400 animate-pulse" 
              style={{ height: '1em', verticalAlign: 'text-bottom' }} />
      )}
    </>
  );
}
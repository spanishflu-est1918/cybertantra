import { useEffect } from 'react';

interface UseKeyboardShortcutsProps {
  enabled: boolean;
  onClear?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts({
  enabled,
  onClear,
  onEscape,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+L or Cmd+K - Clear terminal
      if ((e.ctrlKey && e.key === 'l') || (e.metaKey && e.key === 'k')) {
        e.preventDefault();
        onClear?.();
      }
      
      // Escape - Call escape handler
      if (e.key === 'Escape') {
        e.preventDefault();
        onEscape?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onClear, onEscape]);
}
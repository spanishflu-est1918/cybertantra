'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme, THEMES } from '@/app/lib/constants/themes';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('original');

  useEffect(() => {
    // Load theme from localStorage on mount
    const savedTheme = localStorage.getItem('terminal-theme') as Theme;
    if (savedTheme && THEMES[savedTheme]) {
      setThemeState(savedTheme);
      applyTheme(savedTheme);
    } else {
      // Apply default theme on first load
      applyTheme('original');
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('terminal-theme', newTheme);
    applyTheme(newTheme);
  };

  const applyTheme = (themeName: Theme) => {
    const theme = THEMES[themeName];
    const root = document.documentElement;
    
    // Set CSS variables
    root.style.setProperty('--color-primary', theme.colors.primary);
    root.style.setProperty('--color-secondary', theme.colors.secondary);
    root.style.setProperty('--color-background', theme.colors.background);
    root.style.setProperty('--color-surface', theme.colors.surface);
    root.style.setProperty('--color-text', theme.colors.text);
    root.style.setProperty('--color-input', theme.colors.input);
    root.style.setProperty('--color-cursor', theme.colors.cursor);
    root.style.setProperty('--color-selection', theme.colors.selection);
    root.style.setProperty('--color-error', theme.colors.error);
    root.style.setProperty('--color-glow', theme.colors.glow);
    
    // Set theme class on body
    document.body.className = `theme-${themeName}`;
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
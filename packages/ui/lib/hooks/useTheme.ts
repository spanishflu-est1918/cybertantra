import { Theme } from '../constants/themes';

// Default theme hook that can be overridden by projects
export interface UseThemeReturn {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

// Default implementation - projects should provide their own via context
export function useTheme(): UseThemeReturn {
  return {
    theme: 'original',
    setTheme: () => {},
  };
}
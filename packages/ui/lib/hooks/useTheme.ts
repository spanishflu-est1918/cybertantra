// Default theme hook that can be overridden by projects
export interface Theme {
  name: string;
  useTypewriter: boolean;
  [key: string]: any;
}

export interface UseThemeReturn {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

// Default implementation - projects should provide their own via context
export function useTheme(): UseThemeReturn {
  return {
    theme: { name: 'default', useTypewriter: true },
    setTheme: () => {},
  };
}
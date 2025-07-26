import { THEMES } from './constants/themes';

export function getThemeDisplay(): string {
  const themes = Object.entries(THEMES).map(([key]) => {
    return `  ${key.padEnd(10)}`;
  });
  
  return `Available themes:\n\n${themes.join('\n')}\n\nUsage: /themes <theme-name>`;
}
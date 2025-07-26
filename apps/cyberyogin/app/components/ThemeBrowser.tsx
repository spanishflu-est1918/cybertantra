import { THEMES, Theme } from '../lib/constants/themes';

export function formatThemeBrowser(selected: number): string {
  const entries = Object.entries(THEMES);
  
  let output = '\n════════════════════════════════════════════\n';
  output += ' THEMES\n';
  output += '════════════════════════════════════════════\n\n';
  
  entries.forEach(([, theme], index) => {
    const isSelected = index === selected;
    const selector = isSelected ? '>' : ' ';
    const number = index + 1;
    
    output += `${selector} ${number}. ${theme.name}\n`;
  });
  
  output += '\n────────────────────────────────────────────\n';
  output += ' [↑/↓] Navigate  [Enter/1-5] Select  [q/Esc] Cancel\n';
  output += '════════════════════════════════════════════\n';
  
  return output;
}

export const THEME_LIST = Object.keys(THEMES) as Theme[];
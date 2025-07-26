import { MUSIC_TRACKS } from '../constants/music';

export const formatMusicPlayer = (selected: number): string => {
  let display = `╔═══════════════════════════════════════════╗
║              MUSIC                        ║
╚═══════════════════════════════════════════╝

`;
  
  MUSIC_TRACKS.forEach((track, index) => {
    const isSelected = index === selected;
    const prefix = isSelected ? '▶' : ' ';
    display += `${prefix} [${index + 1}] ${track.name}\n`;
    if (isSelected) {
      display += `     └─ ${track.description}\n`;
    }
  });
  
  display += `
> [↑/↓ or j/k] Navigate | [Enter] Play | [q] Exit`;
  
  return display;
};
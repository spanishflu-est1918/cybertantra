'use client';

export const RESUME_FORMATS = [
  { id: 'pdf', name: 'PDF Format', desc: 'Professional layout (coming soon)' },
  { id: 'txt', name: 'Plain Text', desc: 'Terminal-friendly format' },
  { id: 'json', name: 'JSON Format', desc: 'Machine readable data' },
];

export function formatResumeBrowser(selected: number): string {
  let display = `╔═══════════════════════════════════════════╗
║              RESUME                       ║
╚═══════════════════════════════════════════╝

> Choose download format:

`;
  
  RESUME_FORMATS.forEach((format, index) => {
    const isSelected = index === selected;
    const prefix = isSelected ? '▶' : ' ';
    const num = `[${index + 1}]`;
    display += `${prefix} ${num} ${format.name}\n`;
    display += `      └─ ${format.desc}\n\n`;
  });
  
  display += `> [↑/↓ or j/k] Navigate | [Enter] Download | [q] Exit`;
  
  return display;
}
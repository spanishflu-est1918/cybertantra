'use client';

import { useState, useEffect } from 'react';
import { ALL_COMMANDS } from '../lib/commands/availableCommands';

interface HelpBrowserProps {
  isActive: boolean;
  onClose: () => void;
  onSelectCommand: (command: string) => void;
}

export default function HelpBrowser({ isActive, onClose, onSelectCommand }: HelpBrowserProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setSelectedIndex(0);
    }
  }, [isActive]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;

      if (e.key === 'ArrowUp' || e.key === 'k') {
        setSelectedIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowDown' || e.key === 'j') {
        setSelectedIndex(prev => Math.min(ALL_COMMANDS.length - 1, prev + 1));
      } else if (e.key === 'Enter') {
        onSelectCommand(ALL_COMMANDS[selectedIndex]);
        onClose();
      } else if (e.key === 'Escape' || e.key === 'q') {
        onClose();
      } else if (e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        if (index < ALL_COMMANDS.length) {
          onSelectCommand(ALL_COMMANDS[index]);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, selectedIndex, onClose, onSelectCommand]);

  if (!isActive) return null;
  return null;
}

export function formatHelpBrowser(selected: number): string {
  let display = `╔═══════════════════════════════════════════╗
║              COMMANDS                     ║
╚═══════════════════════════════════════════╝

`;
  
  // First group: help, about, work, music, contact
  const mainCommands = ['/help', '/about', '/work', '/music', '/contact'];
  // Second group: skills, resume, themes
  const utilityCommands = ['/skills', '/resume', '/themes'];
  // Terminal commands
  const terminalCommands = ['clear'];
  
  let commandIndex = 0;
  
  // Display main commands
  mainCommands.forEach((command) => {
    const isSelected = commandIndex === selected;
    const prefix = isSelected ? '▶' : ' ';
    const num = commandIndex < 9 ? `[${commandIndex + 1}]` : '   ';
    display += `${prefix} ${num} ${command}\n`;
    commandIndex++;
  });
  
  display += '───────────────────────────────────────────\n';
  
  // Display utility commands
  utilityCommands.forEach((command) => {
    const isSelected = commandIndex === selected;
    const prefix = isSelected ? '▶' : ' ';
    const num = commandIndex < 9 ? `[${commandIndex + 1}]` : '   ';
    display += `${prefix} ${num} ${command}\n`;
    commandIndex++;
  });
  
  // Display terminal commands
  terminalCommands.forEach((command) => {
    const isSelected = commandIndex === selected;
    const prefix = isSelected ? '▶' : ' ';
    const num = commandIndex < 9 ? `[${commandIndex + 1}]` : '   ';
    display += `${prefix} ${num} ${command}\n`;
    commandIndex++;
  });
  
  display += `
> [↑/↓ or j/k] Navigate | [Enter] Execute | [q] Exit`;
  
  return display;
}
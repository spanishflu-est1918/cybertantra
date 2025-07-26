'use client';

import { useEffect } from 'react';
import Image from 'next/image';

import { PROJECTS } from '../lib/constants/projects';
import { BrowserComponentProps, HistoryEntry } from '@cybertantra/ui/types';

type WorkBrowserProps = BrowserComponentProps;

export default function WorkBrowser({ isActive, selectedIndex, onClose, setHistory }: WorkBrowserProps) {
  const project = PROJECTS[selectedIndex];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;
      
      const openLink = (url: string) => {
        if (!setHistory) return;
        
        onClose();
        
        // Add spinner to history
        setHistory((prev: HistoryEntry[]) => [...prev, { 
          type: 'output', 
          content: `> [●∙∙]` 
        }]);
        
        // Animate spinner
        let dots = ['●', '∙', '∙'];
        const spinnerInterval = setInterval(() => {
          const activeIndex = dots.findIndex(dot => dot === '●');
          dots = ['∙', '∙', '∙'];
          dots[(activeIndex + 1) % 3] = '●';
          
          setHistory((prev: HistoryEntry[]) => {
            const newHistory = [...prev];
            if (newHistory.length > 0 && newHistory[newHistory.length - 1].content.includes('[')) {
              newHistory[newHistory.length - 1] = {
                type: 'output',
                content: `> [${dots.join('')}]`
              };
            }
            return newHistory;
          });
        }, 150);
        
        // Open link after 1 second
        setTimeout(() => {
          clearInterval(spinnerInterval);
          window.open(url, '_blank');
          
          // Remove spinner line
          setHistory((prev: HistoryEntry[]) => {
            const newHistory = [...prev];
            if (newHistory.length > 0 && newHistory[newHistory.length - 1].content.includes('[')) {
              newHistory.pop();
            }
            return newHistory;
          });
        }, 1000);
      };

      if (e.key === 'Escape' || e.key === 'q') {
        // Just close the WorkBrowser component, don't close the entire work browser
        onClose();
      } else if (e.key === '1' && project.link) {
        openLink(`https://${project.link}`);
      } else if (e.key === '2' && project.github && project.link) {
        if (project.github === 'ask-to-get-access') {
          return;
        }
        openLink(`https://${project.github}`);
      } else if (e.key === '1' && project.github && !project.link) {
        if (project.github === 'ask-to-get-access') {
          return;
        }
        openLink(`https://${project.github}`);
      } else if (e.key === '3' && project.name === 'Codex') {
        openLink('https://github.com/gorkamolero/tantras');
      } else if (e.key === '2' && project.name === 'Codex' && !project.link) {
        openLink('https://github.com/gorkamolero/tantras');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onClose, project, setHistory]);

  if (!isActive) return null;

  return (
    <>
      {/* Project Preview Images - only show when project has images */}
      {project.images && project.images.length > 0 && (
        <div className="fixed top-20 right-10 z-50">
          {project.images.length > 1 ? (
            <div className="w-80 max-h-[70vh] overflow-y-auto scrollbar-hide bg-black p-2">
              {project.images.map((img, index) => (
                <div key={index} className="relative mb-4 border border-green-400/20 overflow-hidden">
                  <div className="absolute inset-0 pointer-events-none z-10">
                    <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/50" />
                    <div className="absolute inset-0 crt-lines" />
                  </div>
                  <Image
                    src={img}
                    alt={`${project.name} ${index + 1}`}
                    width={320}
                    height={0}
                    style={{ width: '100%', height: 'auto' }}
                    className="pixelated"
                    unoptimized={img.endsWith('.gif')}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="relative border border-green-400/20 overflow-hidden">
              <div className="absolute inset-0 pointer-events-none z-10">
                <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/50" />
                <div className="absolute inset-0 crt-lines" />
              </div>
              <Image
                src={project.images[0]}
                alt={project.name}
                width={320}
                height={0}
                style={{ width: '100%', height: 'auto' }}
                className="pixelated"
                unoptimized={project.images[0].endsWith('.gif')}
              />
            </div>
          )}
          <div className="mt-2 text-green-400 text-xs font-mono text-center bg-black px-2 py-1">
            {project.name}
          </div>
        </div>
      )}
    </>
  );
}

export function formatWorkBrowser(selected: number, showDetails: boolean): string {
  if (showDetails) {
    const project = PROJECTS[selected];
    let display = `╔═══════════════════════════════════════════╗
║              ${project.name.toUpperCase().padEnd(29)}║
╚═══════════════════════════════════════════╝

${project.description.map(line => `  ${line}`).join('\n')}

  Tech: ${project.tech}

`;
    
    if (project.link || project.github) {
      display += '\n  Links:\n';
      let linkNum = 1;
      if (project.link) {
        display += `  [${linkNum}] Live → ${project.link}\n`;
        linkNum++;
      }
      if (project.github) {
        if (project.github === 'ask-to-get-access') {
          display += `  [${linkNum}] Repo → [ask to get access]\n`;
        } else {
          display += `  [${linkNum}] GitHub → ${project.github}\n`;
        }
        linkNum++;
      }
      if (project.name === 'Codex') {
        display += `  [${linkNum}] Tantras → github.com/gorkamolero/tantras\n`;
      }
      display += '\n';
    }
    
    display += `> [q/Esc] Back to list`;
    
    return display;
  }

  let display = `╔═══════════════════════════════════════════╗
║              WORK & PROJECTS              ║
╚═══════════════════════════════════════════╝

`;
  
  PROJECTS.forEach((project, index) => {
    const isSelected = index === selected;
    const prefix = isSelected ? '▶' : ' ';
    display += `${prefix} [${index + 1}] ${project.name}\n`;
    if (isSelected) {
      display += `     └─ ${project.brief}\n`;
    }
  });
  
  display += `
> [↑/↓ or j/k] Navigate | [Enter] View details | [q/Esc] Exit`;
  
  return display;
}

export { PROJECTS };
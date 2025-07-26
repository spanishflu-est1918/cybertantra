'use client';

import { useState, useEffect, useRef } from 'react';

interface VimModeProps {
  isActive: boolean;
  initialFile?: string;
  onClose: () => void;
}

export default function VimMode({ isActive, initialFile = '', onClose }: VimModeProps) {
  const [mode, setMode] = useState<'normal' | 'insert' | 'command'>('normal');
  const [commandBuffer, setCommandBuffer] = useState('');
  const [content, setContent] = useState(['Welcome to vim.', '', 'Press i to insert, :q to quit.', '', '']);
  const [cursor, setCursor] = useState({ line: 0, col: 0 });
  const [status, setStatus] = useState('');
  const vimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive && vimRef.current) {
      vimRef.current.focus();
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (mode === 'normal') {
        switch(e.key) {
          case 'i':
            setMode('insert');
            setStatus('-- INSERT --');
            break;
          case 'a':
            setMode('insert');
            setCursor(prev => ({ ...prev, col: Math.min(prev.col + 1, content[prev.line].length) }));
            setStatus('-- INSERT --');
            break;
          case ':':
            setMode('command');
            setCommandBuffer(':');
            break;
          case 'h':
            setCursor(prev => ({ ...prev, col: Math.max(0, prev.col - 1) }));
            break;
          case 'l':
            setCursor(prev => ({ ...prev, col: Math.min(content[prev.line].length, prev.col + 1) }));
            break;
          case 'j':
            setCursor(prev => ({ 
              line: Math.min(content.length - 1, prev.line + 1),
              col: Math.min(prev.col, content[Math.min(content.length - 1, prev.line + 1)].length)
            }));
            break;
          case 'k':
            setCursor(prev => ({ 
              line: Math.max(0, prev.line - 1),
              col: Math.min(prev.col, content[Math.max(0, prev.line - 1)].length)
            }));
            break;
          case 'o':
            setContent(prev => {
              const newContent = [...prev];
              newContent.splice(cursor.line + 1, 0, '');
              return newContent;
            });
            setCursor(prev => ({ line: prev.line + 1, col: 0 }));
            setMode('insert');
            setStatus('-- INSERT --');
            break;
          case 'G':
            setCursor({ line: content.length - 1, col: 0 });
            break;
          case 'g':
            if (e.shiftKey === false) {
              setCursor({ line: 0, col: 0 });
            }
            break;
        }
      } else if (mode === 'insert') {
        if (e.key === 'Escape') {
          setMode('normal');
          setStatus('');
        } else if (e.key === 'Backspace') {
          if (cursor.col > 0) {
            setContent(prev => {
              const newContent = [...prev];
              newContent[cursor.line] = 
                newContent[cursor.line].slice(0, cursor.col - 1) + 
                newContent[cursor.line].slice(cursor.col);
              return newContent;
            });
            setCursor(prev => ({ ...prev, col: prev.col - 1 }));
          } else if (cursor.line > 0) {
            const prevLineLength = content[cursor.line - 1].length;
            setContent(prev => {
              const newContent = [...prev];
              newContent[cursor.line - 1] += newContent[cursor.line];
              newContent.splice(cursor.line, 1);
              return newContent;
            });
            setCursor({ line: cursor.line - 1, col: prevLineLength });
          }
        } else if (e.key === 'Enter') {
          setContent(prev => {
            const newContent = [...prev];
            const currentLine = newContent[cursor.line];
            newContent[cursor.line] = currentLine.slice(0, cursor.col);
            newContent.splice(cursor.line + 1, 0, currentLine.slice(cursor.col));
            return newContent;
          });
          setCursor(prev => ({ line: prev.line + 1, col: 0 }));
        } else if (e.key.length === 1) {
          setContent(prev => {
            const newContent = [...prev];
            newContent[cursor.line] = 
              newContent[cursor.line].slice(0, cursor.col) + 
              e.key + 
              newContent[cursor.line].slice(cursor.col);
            return newContent;
          });
          setCursor(prev => ({ ...prev, col: prev.col + 1 }));
        }
      } else if (mode === 'command') {
        if (e.key === 'Escape') {
          setMode('normal');
          setCommandBuffer('');
          setStatus('');
        } else if (e.key === 'Enter') {
          if (commandBuffer === ':q' || commandBuffer === ':q!') {
            onClose();
          } else if (commandBuffer === ':w') {
            setStatus('E45: \'readonly\' option is set (add ! to override)');
          } else if (commandBuffer === ':wq' || commandBuffer === ':wq!') {
            setStatus('E45: \'readonly\' option is set (add ! to override)');
          } else {
            setStatus(`E492: Not an editor command: ${commandBuffer.slice(1)}`);
          }
          setMode('normal');
          setCommandBuffer('');
        } else if (e.key === 'Backspace') {
          if (commandBuffer.length > 1) {
            setCommandBuffer(prev => prev.slice(0, -1));
          }
        } else if (e.key.length === 1) {
          setCommandBuffer(prev => prev + e.key);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, mode, cursor, content, commandBuffer, onClose]);

  if (!isActive) return null;

  return (
    <div 
      ref={vimRef}
      tabIndex={0}
      className="fixed inset-0 z-50 bg-black text-green-400 font-mono p-4 outline-none"
    >
      <div className="h-full flex flex-col">
        {/* Title bar */}
        <div className="text-center text-yellow-300 mb-2">
          {initialFile || '[No Name]'} - VIM
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          {content.map((line, lineIndex) => (
            <div key={lineIndex} className="relative">
              <span className="text-gray-600 mr-4 select-none">
                {String(lineIndex + 1).padStart(3, ' ')}
              </span>
              <span>
                {line.split('').map((char, charIndex) => (
                  <span
                    key={charIndex}
                    className={
                      lineIndex === cursor.line && charIndex === cursor.col && mode !== 'command'
                        ? 'bg-green-400 text-black'
                        : ''
                    }
                  >
                    {char || ' '}
                  </span>
                ))}
                {lineIndex === cursor.line && cursor.col === line.length && mode !== 'command' && (
                  <span className="bg-green-400 text-black animate-pulse"> </span>
                )}
              </span>
            </div>
          ))}
          {/* Fill empty lines with ~ */}
          {Array.from({ length: Math.max(0, 20 - content.length) }).map((_, i) => (
            <div key={`empty-${i}`} className="text-gray-600">~</div>
          ))}
        </div>

        {/* Status line */}
        <div className="border-t border-green-400 pt-1">
          {mode === 'command' ? (
            <div>{commandBuffer}</div>
          ) : (
            <div>{status}</div>
          )}
        </div>

        {/* Help */}
        <div className="text-xs text-gray-600 mt-1">
          [i]nsert [:]command [:q]uit [hjkl]move [o]newline [g/G]top/bottom
        </div>
      </div>
    </div>
  );
}
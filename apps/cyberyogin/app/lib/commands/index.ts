import { slashCommands } from './slashCommands';
import { fileSystemCommands } from './fileSystemCommands';
import { systemCommands } from './systemCommands';
import { DATTATREYA_MANTRA } from '@/lib/constants/mantras';

export function handleCommand(input: string): string | { content: string; typewriter: boolean } | null {
  const trimmedInput = input.trim();
  const [command, ...args] = trimmedInput.split(' ');
  
  // Check for Dattatreya mantra
  if (trimmedInput.toLowerCase() === DATTATREYA_MANTRA) {
    return 'ENTER_TEMPLE_MODE';
  }
  
  if (command === 'clear' || command === 'cls') {
    return 'CLEAR_TERMINAL';
  }
  
  const fsResult = fileSystemCommands(command, args);
  if (fsResult) return fsResult;
  
  const sysResult = systemCommands(command, args);
  if (sysResult) return sysResult;
  
  // Handle slash commands with or without the slash
  if (command.startsWith('/')) {
    return slashCommands(command.toLowerCase(), args);
  }
  
  // Try handling as slash command without the slash
  const slashCommandResult = slashCommands(`/${command.toLowerCase()}`, args);
  if (slashCommandResult) {
    // Check if it's a string or object with content
    const resultText = typeof slashCommandResult === 'string' 
      ? slashCommandResult 
      : slashCommandResult.content;
    
    if (!resultText.includes('Command not found')) {
      return slashCommandResult;
    }
  }
  
  if (trimmedInput.startsWith('/')) {
    return `Command not found: ${command}\nType /help for available commands.`;
  }
  
  return null;
}
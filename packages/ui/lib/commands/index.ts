import { slashCommands } from './slashCommands';
import { fileSystemCommands } from './fileSystemCommands';
import { systemCommands } from './systemCommands';

export function handleCommand(
  input: string,
  availableCommands?: string[]
): string | { content: string; typewriter: boolean } | null {
  const trimmedInput = input.trim();
  const [command, ...args] = trimmedInput.split(' ');
  
  if (command === 'clear' || command === 'cls') {
    return 'CLEAR_TERMINAL';
  }
  
  const fsResult = fileSystemCommands(command, args);
  if (fsResult) return fsResult;
  
  const sysResult = systemCommands(command, args);
  if (sysResult) return sysResult;
  
  // Handle slash commands with or without the slash
  if (command.startsWith('/')) {
    // Check if command is available
    if (availableCommands && !availableCommands.includes(command.toLowerCase())) {
      return `Command not found: ${command}\nType /help for available commands.`;
    }
    return slashCommands(command.toLowerCase(), args);
  }
  
  // Try handling as slash command without the slash
  const slashCommand = `/${command.toLowerCase()}`;
  if (!availableCommands || availableCommands.includes(slashCommand)) {
    const slashCommandResult = slashCommands(slashCommand, args);
    if (slashCommandResult) {
      // Check if it's a string or object with content
      const resultText = typeof slashCommandResult === 'string' 
        ? slashCommandResult 
        : slashCommandResult.content;
      
      if (!resultText.includes('Command not found')) {
        return slashCommandResult;
      }
    }
  }
  
  if (trimmedInput.startsWith('/')) {
    return `Command not found: ${command}\nType /help for available commands.`;
  }
  
  return null;
}
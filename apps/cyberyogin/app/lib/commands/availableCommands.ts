export const SLASH_COMMANDS = [
  '/help',
  '/about', 
  '/work',
  '/music',
  '/contact',
  '/skills',
  '/resume',
  '/themes'
] as const;

export const TERMINAL_COMMANDS = [
  'clear',
  'reset'
] as const;

export const ALL_COMMANDS = [...SLASH_COMMANDS, ...TERMINAL_COMMANDS];

export type SlashCommand = typeof SLASH_COMMANDS[number];
export type TerminalCommand = typeof TERMINAL_COMMANDS[number];
export type Command = typeof ALL_COMMANDS[number];
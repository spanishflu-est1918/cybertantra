export function systemCommands(command: string, args: string[]): string | null {
  switch (command) {
    case 'pwd':
      return '/home/consciousness/material-plane/';
      
    case 'whoami':
      return 'observer';
      
    case 'date':
      const d = new Date();
      return d.toString();
      
    case 'echo':
      return args.join(' ');
      
    case 'uname':
      if (args.includes('-a')) {
        return 'MATRIX 5.0.0-consciousness #42 SMP PREEMPT Thu Dec 21 2012 x86_64 GNU/Linux';
      }
      return 'MATRIX';
      
    case 'uptime':
      return 'up 13,337 days, 7:77, load average: 0.42, 0.69, 1.11';
      
    case 'history':
      return `[ACCESSING AKASHIC RECORDS]
[ERROR: PAST LIVES ENCRYPTED]`;
      
    case 'which':
      if (args[0]) {
        return `/usr/bin/${args[0]}`;
      }
      return '';
      
    case 'hostname':
      return 'terminal.gorka.dev';
      
    case 'vim':
    case 'vi':
      return 'SHOW_VIM_MODE';
      
    case 'emacs':
      return 'No.';
      
    case 'nano':
      return 'No.';
    
    case 'reset':
      return 'RESET_CONVERSATION';
      
    default:
      return null;
  }
}
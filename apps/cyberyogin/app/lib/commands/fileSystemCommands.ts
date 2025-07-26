import { fs } from '../terminal/filesystem';

export function fileSystemCommands(command: string, args: string[]): string | null {
  switch(command) {
    case 'ls': {
      const showHidden = args.includes('-a') || args.includes('-la');
      const files = fs.ls(showHidden);
      if (files.length === 0) return '(empty directory)';
      return files.join('  ');
    }
      
    case 'pwd':
      return fs.pwd();
      
    case 'cd': {
      if (!args[0]) {
        return fs.cd('~');
      }
      return fs.cd(args[0]);
    }
      
    case 'cat': {
      if (!args[0]) {
        return 'cat: missing operand';
      }
      return fs.cat(args[0]);
    }
    
    case 'mkdir':
      return 'mkdir: Permission denied (read-only filesystem)';
      
    case 'rm':
      return 'rm: Permission denied (read-only filesystem)';
      
    case 'touch':
      return 'touch: Permission denied (read-only filesystem)';
      
    default:
      return null;
  }
}
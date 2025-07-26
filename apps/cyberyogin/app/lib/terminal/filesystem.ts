export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  content?: string;
  children?: Map<string, FileNode>;
}

export class FileSystem {
  private root: FileNode;
  private currentPath: string[];

  constructor() {
    this.currentPath = [];
    this.root = {
      name: '/',
      type: 'directory',
      children: new Map([
        ['home', {
          name: 'home',
          type: 'directory',
          children: new Map([
            ['gorka', {
              name: 'gorka',
              type: 'directory',
              children: new Map([
                ['projects', {
                  name: 'projects',
                  type: 'directory',
                  children: new Map([
                    ['README.md', {
                      name: 'README.md',
                      type: 'file',
                      content: '# My Projects\n\nCheck out /work for interactive project browser!'
                    }],
                    ['the-pulse.txt', {
                      name: 'the-pulse.txt',
                      type: 'file',
                      content: 'Non-linear storytelling engine inspired by Lovecraft.\nSeparates narrative structure from sequential plot.'
                    }]
                  ])
                }],
                ['music', {
                  name: 'music',
                  type: 'directory',
                  children: new Map([
                    ['tracks.txt', {
                      name: 'tracks.txt',
                      type: 'file',
                      content: 'My tracks:\n- Regret (Piano)\n- Forget (Piano)\n- Thumos (Electronic)\n- Elohim (Electronic)\n\nType /music to play!'
                    }]
                  ])
                }],
                ['.secrets', {
                  name: '.secrets',
                  type: 'file',
                  content: 'You found the hidden file!\n\n"The only way to deal with an unfree world is to become so absolutely free that your very existence is an act of rebellion."'
                }]
              ])
            }]
          ])
        }],
        ['etc', {
          name: 'etc',
          type: 'directory',
          children: new Map([
            ['motd', {
              name: 'motd',
              type: 'file',
              content: 'Welcome to Gorka\'s terminal.\nAnother visitor from the void.\nSpeak.'
            }]
          ])
        }]
      ])
    };
  }

  getCurrentPath(): string {
    return '/' + this.currentPath.join('/');
  }

  getCurrentDir(): FileNode | null {
    let current = this.root;
    for (const segment of this.currentPath) {
      if (!current.children?.has(segment)) return null;
      current = current.children.get(segment)!;
    }
    return current;
  }

  cd(path: string): string {
    if (path === '/') {
      this.currentPath = [];
      return this.getCurrentPath();
    }

    if (path === '~') {
      this.currentPath = ['home', 'gorka'];
      return this.getCurrentPath();
    }

    if (path === '..') {
      if (this.currentPath.length > 0) {
        this.currentPath.pop();
      }
      return this.getCurrentPath();
    }

    if (path.startsWith('/')) {
      const segments = path.split('/').filter(s => s);
      const testPath = [];
      let current = this.root;
      
      for (const segment of segments) {
        if (!current.children?.has(segment)) {
          return `cd: ${path}: No such file or directory`;
        }
        const next = current.children.get(segment)!;
        if (next.type !== 'directory') {
          return `cd: ${path}: Not a directory`;
        }
        testPath.push(segment);
        current = next;
      }
      
      this.currentPath = testPath;
      return this.getCurrentPath();
    } else {
      const current = this.getCurrentDir();
      if (!current || !current.children?.has(path)) {
        return `cd: ${path}: No such file or directory`;
      }
      const next = current.children.get(path)!;
      if (next.type !== 'directory') {
        return `cd: ${path}: Not a directory`;
      }
      this.currentPath.push(path);
      return this.getCurrentPath();
    }
  }

  ls(showHidden = false): string[] {
    const current = this.getCurrentDir();
    if (!current || !current.children) return [];
    
    const entries = Array.from(current.children.values())
      .filter(node => showHidden || !node.name.startsWith('.'))
      .map(node => node.type === 'directory' ? node.name + '/' : node.name)
      .sort();
    
    return entries;
  }

  cat(filename: string): string {
    const current = this.getCurrentDir();
    if (!current || !current.children) {
      return `cat: ${filename}: No such file or directory`;
    }
    
    const file = current.children.get(filename);
    if (!file) {
      return `cat: ${filename}: No such file or directory`;
    }
    
    if (file.type === 'directory') {
      return `cat: ${filename}: Is a directory`;
    }
    
    return file.content || '';
  }

  pwd(): string {
    return this.getCurrentPath() || '/';
  }
}

export const fs = new FileSystem();
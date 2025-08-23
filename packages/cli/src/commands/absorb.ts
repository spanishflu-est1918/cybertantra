#!/usr/bin/env bun

import { spawn } from 'child_process';
import { promisify } from 'util';
import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';

const execCommand = (command: string, args: string[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { 
      stdio: 'inherit',
      shell: true 
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
    
    proc.on('error', reject);
  });
};

program
  .name('absorb')
  .description('Absorb knowledge from YouTube into consciousness: download → transcribe → vectorize')
  .version('1.0.0');

program
  .argument('<urls...>', 'YouTube URLs to process')
  .option('-o, --output <directory>', 'Output directory', './audio')
  .option('--format <format>', 'Audio format', 'opus')
  .action(async (urls: string[], options) => {
    console.log(chalk.cyan('\n🧘 Absorbing knowledge into the collective consciousness...\n'));
    
    try {
      // Step 1: Download
      console.log(chalk.yellow('📥 Step 1/3: Downloading from YouTube...'));
      const downloadArgs = [
        'run', 
        'src/commands/download-youtube.ts',
        ...urls,
        '-o', options.output,
        '--format', options.format
      ];
      await execCommand('bun', downloadArgs);
      
      // Step 2: Scan & Process Transcription
      console.log(chalk.yellow('\n🎙️  Step 2/3: Transcribing audio...'));
      
      // First scan
      const scanArgs = ['run', 'src/commands/transcribe.ts', 'scan', '-d', options.output];
      await execCommand('bun', scanArgs);
      
      // Then process (with -y flag to skip confirmation)
      const processArgs = ['run', 'src/commands/transcribe.ts', 'process', '-d', options.output, '-y'];
      await execCommand('bun', processArgs);
      
      // Step 3: Ingest
      console.log(chalk.yellow('\n📚 Step 3/3: Ingesting into corpus...'));
      const ingestArgs = ['run', 'src/commands/ingest.ts'];
      await execCommand('bun', ingestArgs);
      
      console.log(chalk.green('\n✨ Pipeline complete! Content is now searchable in your corpus.\n'));
      
    } catch (error) {
      console.error(chalk.red('\n❌ Pipeline failed:'), error);
      process.exit(1);
    }
  });

program.parse(process.argv);
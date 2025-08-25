#!/usr/bin/env node
import { Command } from 'commander';
import { SpleeterExtractionService } from '../services/spleeter-extraction';
import path from 'path';
import chalk from 'chalk';

const program = new Command();

program
  .name('extract-vocals')
  .description('Extract vocals from audio files using Spleeter via Replicate API')
  .argument('<input>', 'Input audio file or directory')
  .option('-s, --stems <number>', 'Number of stems (2, 4, or 5)', '2')
  .option('-o, --output <dir>', 'Output directory', './apps/cybertantra/public/audio/extracted-vocals')
  .option('-c, --concurrent <number>', 'Max concurrent jobs', '4')
  .action(async (input: string, options) => {
    try {
      const stems = parseInt(options.stems) as 2 | 4 | 5;
      if (![2, 4, 5].includes(stems)) {
        console.error(chalk.red('Error: stems must be 2, 4, or 5'));
        process.exit(1);
      }

      const service = new SpleeterExtractionService({
        stems,
        outputDir: options.output,
        maxConcurrent: parseInt(options.concurrent),
      });

      console.log(chalk.green.bold('🎵 Spleeter Vocal Extraction'));
      console.log(chalk.green('=' .repeat(40)));
      console.log(chalk.yellow(`Input: ${input}`));
      console.log(chalk.yellow(`Output: ${options.output}`));
      console.log(chalk.yellow(`Stems: ${stems}`));
      console.log(chalk.yellow(`Concurrent jobs: ${options.concurrent}`));
      console.log();

      // Check if input is a file or directory
      const fs = await import('fs/promises');
      const stats = await fs.stat(input);

      if (stats.isDirectory()) {
        // Process directory
        const results = await service.extractVocalsFromDirectory(input);
        
        console.log();
        console.log(chalk.green.bold('✨ Extraction Complete!'));
        console.log(chalk.green(`Successfully processed ${results.length} files`));
        
        if (results.length > 0) {
          console.log();
          console.log(chalk.yellow('Extracted files:'));
          results.forEach(r => {
            console.log(chalk.cyan(`  • ${r.filename}`));
          });
        }
      } else {
        // Process single file
        const result = await service.extractVocals(input);
        
        console.log();
        console.log(chalk.green.bold('✨ Extraction Complete!'));
        console.log(chalk.green('Output files:'));
        if (result.vocals) console.log(chalk.cyan(`  • Vocals: ${result.vocals}`));
        if (result.accompaniment) console.log(chalk.cyan(`  • Accompaniment: ${result.accompaniment}`));
        if (result.drums) console.log(chalk.cyan(`  • Drums: ${result.drums}`));
        if (result.bass) console.log(chalk.cyan(`  • Bass: ${result.bass}`));
        if (result.other) console.log(chalk.cyan(`  • Other: ${result.other}`));
        if (result.piano) console.log(chalk.cyan(`  • Piano: ${result.piano}`));
      }

      console.log();
      console.log(chalk.blue('💡 Tip: These clean vocal files are perfect for:'));
      console.log(chalk.gray('  • Training custom ElevenLabs voice clones'));
      console.log(chalk.gray('  • Creating meditation-specific voice models'));
      console.log(chalk.gray('  • Analyzing speech patterns and pacing'));

    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

program.parse();
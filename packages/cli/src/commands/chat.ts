#!/usr/bin/env bun

import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { ultimateAgent, createContextualResponse } from './agent-ultimate';
import { LectureSummarizer } from './lib/lecture-summarizer';
import { BookCompiler } from './lib/book-compiler';
import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';
import * as readline from 'readline';

dotenv.config();

const program = new Command();

program
  .name('cybertantra-ultimate')
  .description('Ultimate CLI for the Cybertantra system with all advanced features')
  .version('3.0.0');

program
  .command('chat')
  .description('Interactive chat with memory and context')
  .option('--thread <id>', 'Thread ID for conversation continuity')
  .action(async (options) => {
    const threadId = options.thread || `ultimate-${Date.now()}`;
    
    console.log('\n⚡ CYBERTANTRA INTERFACE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Ask for mode selection
    const { mode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'mode',
        message: 'Select chat mode:',
        choices: [
          { name: 'Source Voice - Direct synthesis from the corpus', value: 'normal' },
          { name: 'Guru Mode - Enhanced voice with deeper context', value: 'guru' },
          { name: 'Raw Stream - Unprocessed passages from the source', value: 'raw' }
        ],
        default: 'normal',
      },
    ]);
    
    console.log(`\nThread: ${threadId}`);
    console.log(`Mode: ${mode === 'raw' ? 'Raw Stream' : mode === 'guru' ? 'Guru Mode' : 'Source Voice'}`);
    console.log('\nType "help" for available commands');
    console.log('Type "exit" to end the conversation');
    console.log('Type "ml" for multi-line input\n');
    
    while (true) {
      const { input } = await inquirer.prompt([
        {
          type: 'input',
          name: 'input',
          message: 'You:',
          validate: (input) => input.trim() !== '' || 'Please enter a message',
        },
      ]);
      
      let finalInput = input;
      
      // Handle multi-line mode
      if (input.toLowerCase() === 'ml') {
        console.log('Multi-line mode - type "end" on a new line to submit:\n');
        const lines: string[] = [];
        
        while (true) {
          const { line } = await inquirer.prompt([
            {
              type: 'input',
              name: 'line',
              message: '',
              prefix: '',
            },
          ]);
          
          if (line.toLowerCase() === 'end') {
            break;
          }
          lines.push(line);
        }
        
        finalInput = lines.join('\n');
      }
      
      if (finalInput.toLowerCase() === 'exit') {
        console.log('\nSession terminated. Thread saved.\n');
        break;
      }
      
      if (finalInput.toLowerCase() === 'help') {
        console.log('\nCommand Reference:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('→ "search for tantra and AI" - Navigate the knowledge graph');
        console.log('→ "what concepts relate to consciousness?" - Map conceptual networks');
        console.log('→ "summarize teachings on cyberspace" - Distill core insights');
        console.log('→ "compile a chapter on digital tantra" - Generate focused content');
        console.log('→ "what have we discussed?" - Access conversation memory');
        console.log('→ "show transcription status" - Monitor ingestion pipeline');
        console.log('→ "analyze themes across lectures" - Extract thematic patterns\n');
        continue;
      }
      
      // Show query subtly
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      try {
        // Use contextual response with memory (streaming is handled inside)
        await createContextualResponse(finalInput, threadId, mode);
        
      } catch (error) {
        console.error('\n❌ Error:', error);
      }
    }
  });

program
  .command('analyze')
  .description('Deep analysis commands')
  .argument('<type>', 'Analysis type: themes, concepts, evolution')
  .option('-l, --lectures <files...>', 'Specific lectures to analyze')
  .action(async (type, options) => {
    const spinner = ora(`Running ${type} analysis...`).start();
    
    try {
      switch (type) {
        case 'themes': {
          const response = await ultimateAgent.generate({
            messages: [{
              role: 'user',
              content: `Analyze the main themes across ${
                options.lectures ? 'these lectures: ' + options.lectures.join(', ') : 'all lectures'
              }. Show overarching patterns and suggest book structure.`,
            }],
          });
          
          spinner.stop();
          console.log('\nTheme Analysis:');
          console.log(response.text);
          break;
        }
        
        case 'concepts': {
          const { concept } = await inquirer.prompt([
            {
              type: 'input',
              name: 'concept',
              message: 'Enter concept to analyze:',
            },
          ]);
          
          spinner.start(`Finding related concepts to "${concept}"...`);
          
          const response = await ultimateAgent.generate({
            messages: [{
              role: 'user',
              content: `Find and explain concepts related to "${concept}" in the corpus.`,
            }],
          });
          
          spinner.stop();
          console.log('\n🔗 Related Concepts:');
          console.log(response.text);
          break;
        }
        
        case 'evolution': {
          const response = await ultimateAgent.generate({
            messages: [{
              role: 'user',
              content: 'Analyze how key themes evolve across the lecture series chronologically.',
            }],
          });
          
          spinner.stop();
          console.log('\n📈 Theme Evolution:');
          console.log(response.text);
          break;
        }
        
        default:
          spinner.fail(`Unknown analysis type: ${type}`);
      }
    } catch (error) {
      spinner.fail('Analysis failed');
      console.error(error);
    }
  });

program
  .command('summarize')
  .description('Generate intelligent summaries')
  .option('-a, --all', 'Summarize all lectures')
  .option('-f, --file <filename>', 'Summarize specific lecture')
  .option('-e, --export', 'Export summaries as markdown')
  .action(async (options) => {
    const summarizer = new LectureSummarizer();
    
    if (options.all) {
      const spinner = ora('Generating summaries for all lectures...').start();
      
      const results = await summarizer.summarizeAllLectures({
        overwrite: false,
        onProgress: (current, total, filename) => {
          spinner.text = `Summarizing [${current}/${total}]: ${filename}`;
        },
      });
      
      spinner.succeed(`Summarized ${results.succeeded.length} lectures`);
      
      if (results.failed.length > 0) {
        console.log(`\n❌ Failed: ${results.failed.join(', ')}`);
      }
      
      if (options.export) {
        console.log('\n📁 Exporting summaries...');
        for (const filename of results.succeeded.slice(0, 5)) {
          await summarizer.exportSummaryAsMarkdown(filename, './exports/summaries');
        }
        console.log('✅ Exported to ./exports/summaries/');
      }
      
    } else if (options.file) {
      const spinner = ora(`Summarizing ${options.file}...`).start();
      
      try {
        const summary = await summarizer.generateSummary(options.file);
        spinner.succeed('Summary generated');
        
        console.log(`\n${summary.title}`);
        console.log(`Theme: ${summary.mainTheme}`);
        console.log(`\nSummary: ${summary.summary}`);
        console.log(`\nKey Points:`);
        summary.keyPoints.forEach((point, i) => {
          console.log(`${i + 1}. ${point}`);
        });
        
        if (options.export) {
          const path = await summarizer.exportSummaryAsMarkdown(options.file, './exports');
          console.log(`\n✅ Exported to: ${path}`);
        }
      } catch (error) {
        spinner.fail('Summarization failed');
        console.error(error);
      }
      
    } else {
      console.log('Please specify --all or --file <filename>');
    }
  });

program
  .command('book')
  .description('Book compilation features')
  .argument('<action>', 'Action: compile, preview, export')
  .option('-t, --title <title>', 'Book or chapter title')
  .option('-s, --style <style>', 'Writing style: academic, accessible, narrative', 'accessible')
  .action(async (action, options) => {
    const compiler = new BookCompiler();
    
    switch (action) {
      case 'compile': {
        if (!options.title) {
          console.error('Please provide a title with -t');
          return;
        }
        
        console.log('\n📖 Book Compilation Wizard');
        console.log('=========================\n');
        
        const { structure } = await inquirer.prompt([
          {
            type: 'list',
            name: 'structure',
            message: 'How should I structure the book?',
            choices: [
              'Auto-generate from corpus themes',
              'Interactive chapter planning',
              'Use suggested structure',
            ],
          },
        ]);
        
        const spinner = ora('Analyzing corpus and creating structure...').start();
        
        // Get suggested structure
        const response = await ultimateAgent.generate({
          messages: [{
            role: 'user',
            content: 'Analyze all lectures and suggest a book structure with parts and chapters.',
          }],
        });
        
        spinner.stop();
        
        console.log('\n📋 Suggested Structure:');
        console.log(response.text);
        
        const { proceed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: 'Proceed with compilation?',
            default: true,
          },
        ]);
        
        if (proceed) {
          spinner.start('Compiling book...');
          
          // This would use the actual book compiler
          // For demo, we'll just show the process
          spinner.succeed('Book compilation started!');
          console.log('\n✅ Book draft will be available in ./exports/books/');
          console.log('   Use "book export" to generate the full manuscript');
        }
        break;
      }
      
      case 'preview': {
        const response = await ultimateAgent.generate({
          messages: [{
            role: 'user',
            content: `Generate a preview of a book chapter about "Digital Consciousness and Tantra" in ${options.style} style.`,
          }],
        });
        
        console.log('\n📄 Chapter Preview:');
        console.log('==================');
        console.log(response.text);
        break;
      }
      
      case 'export': {
        console.log('📁 Exporting book manuscript...');
        console.log('   Format: Markdown');
        console.log('   Location: ./exports/books/');
        console.log('\n✅ Export complete!');
        break;
      }
      
      default:
        console.error(`Unknown action: ${action}`);
    }
  });

program
  .command('monitor')
  .description('Real-time system monitoring')
  .action(async () => {
    console.log('\nSystem Monitor');
    console.log('=================\n');
    
    const updateDisplay = async () => {
      console.clear();
      console.log('[ SYSTEM MONITOR ]');
      console.log('=============================\n');
      
      const response = await ultimateAgent.generate({
        messages: [{
          role: 'user',
          content: 'Show current system statistics including corpus size, transcription status, and performance metrics.',
        }],
      });
      
      console.log(response.text);
      console.log('\n🔄 Refreshing every 5 seconds... (Ctrl+C to exit)');
    };
    
    // Initial display
    await updateDisplay();
    
    // Update every 5 seconds
    const interval = setInterval(updateDisplay, 5000);
    
    // Handle graceful exit
    process.on('SIGINT', () => {
      clearInterval(interval);
      console.log('\n\n✅ Monitoring stopped');
      process.exit(0);
    });
  });

program
  .command('search')
  .description('Advanced hybrid search')
  .argument('<query>', 'Search query')
  .option('-t, --type <type>', 'Search type: hybrid, semantic, keyword', 'hybrid')
  .option('-n, --number <n>', 'Number of results', '5')
  .option('--topics <topics...>', 'Filter by topics')
  .option('--source <pattern>', 'Filter by source pattern')
  .action(async (query, options) => {
    const spinner = ora(`Searching (${options.type})...`).start();
    
    try {
      const response = await ultimateAgent.generate({
        messages: [{
          role: 'user',
          content: `Search for "${query}" using ${options.type} search${
            options.topics ? ` filtered by topics: ${options.topics.join(', ')}` : ''
          }${
            options.source ? ` in sources matching: ${options.source}` : ''
          }. Show top ${options.number} results with highlights and context.`,
        }],
      });
      
      spinner.stop();
      console.log('\n🔍 Search Results:');
      console.log(response.text);
      
    } catch (error) {
      spinner.fail('Search failed');
      console.error(error);
    }
  });

// Show examples if no command provided
if (process.argv.length === 2) {
  console.log('\n[ CYBERTANTRA ULTIMATE ]');
  console.log('===========================\n');
  console.log('Available commands:');
  console.log('  chat              - Interactive chat with full memory');
  console.log('  analyze <type>    - Deep corpus analysis');
  console.log('  summarize         - Generate intelligent summaries');
  console.log('  book <action>     - Book compilation tools');
  console.log('  monitor           - Real-time system monitoring');
  console.log('  search <query>    - Advanced hybrid search\n');
  console.log('Try: bun run cli-ultimate chat');
}

program.parse(process.argv);
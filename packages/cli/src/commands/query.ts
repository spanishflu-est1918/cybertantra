#!/usr/bin/env bun

import { Command } from 'commander';
import inquirer from 'inquirer';
import { queryAgent } from './agent';
import dotenv from 'dotenv';

dotenv.config();

const program = new Command();

program
  .name('cybertantra')
  .description('CLI for querying lecture corpus using RAG')
  .version('1.0.0');

program
  .command('query')
  .description('Ask a question about the lectures')
  .option('-c, --conversation', 'Enable conversation mode')
  .action(async (options) => {
    if (!process.env.OPENAI_API_KEY || !process.env.POSTGRES_URL) {
      console.error('Error: Missing API keys. Please check your .env file.');
      process.exit(1);
    }
    
    const threadId = `cli-session-${Date.now()}`;
    console.log('\nCybertantra Query System');
    console.log('========================');
    console.log('Ask questions about your lecture corpus. Type "exit" to quit.\n');
    
    do {
      const { question } = await inquirer.prompt([
        {
          type: 'input',
          name: 'question',
          message: 'Your query:',
          validate: (input) => input.trim() !== '' || 'Please enter a question',
        },
      ]);
      
      if (question.toLowerCase() === 'exit') {
        console.log('\nGoodbye!');
        break;
      }
      
      const spinner = ora('Searching lecture corpus...').start();
      
      try {
        const response = await queryAgent.generate({
          messages: [
            {
              role: 'user',
              content: question,
            },
          ],
          threadId,
        });
        
        spinner.stop();
        console.log('\n📚 Response:');
        console.log('─'.repeat(50));
        console.log(response.text);
        console.log('─'.repeat(50) + '\n');
        
      } catch (error) {
        spinner.fail('Query failed');
        console.error('Error:', error);
      }
      
    } while (options.conversation);
  });

program
  .command('search')
  .description('Search for specific terms in the lecture corpus')
  .argument('<query>', 'Search query')
  .option('-n, --number <n>', 'Number of results to return', '5')
  .action(async (query, options) => {
    const spinner = ora('Searching...').start();
    
    try {
      const { retriever } = await import('./agent');
      const results = await retriever.retrieve(query, parseInt(options.number));
      
      spinner.stop();
      
      if (results.length === 0) {
        console.log('No results found.');
        return;
      }
      
      console.log(`\nFound ${results.length} results for "${query}":\n`);
      
      results.forEach((result, index) => {
        console.log(`${index + 1}. [${result.source}] (Score: ${result.score.toFixed(3)})`);
        console.log(`   ${result.text.substring(0, 200)}...`);
        console.log('');
      });
    } catch (error) {
      spinner.fail('Search failed');
      console.error(error);
    }
  });

program
  .command('outline')
  .description('Generate a chapter outline based on a topic')
  .argument('<topic>', 'Topic for the outline')
  .action(async (topic) => {
    const spinner = ora('Generating outline...').start();
    
    try {
      const response = await queryAgent.generate({
        messages: [
          {
            role: 'user',
            content: `Create a detailed chapter outline for the topic: "${topic}". First search for relevant content, then synthesize an outline.`,
          },
        ],
      });
      
      spinner.stop();
      console.log('\n📋 Chapter Outline:');
      console.log('═'.repeat(50));
      console.log(response.text);
      console.log('═'.repeat(50));
      
    } catch (error) {
      spinner.fail('Outline generation failed');
      console.error(error);
    }
  });

program.parse(process.argv);
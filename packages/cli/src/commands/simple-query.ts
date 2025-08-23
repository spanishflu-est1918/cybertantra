#!/usr/bin/env bun
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import inquirer from 'inquirer';
import chalk from 'chalk';

// Load environment variables from project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

import { QueryAgent, getAIConfig } from '@cybertantra/ai';

async function main() {
  try {
    const config = getAIConfig();
    const agent = new QueryAgent(config);
    
    // Check if a question was passed as a command-line argument
    const args = process.argv.slice(2);
    if (args.length > 0) {
      const question = args.join(' ');
      console.log(chalk.gray('\nSearching lecture corpus...'));
      
      try {
        const answer = await agent.query(question);
        console.log(chalk.green('\nAnswer:'));
        console.log(answer);
      } catch (error) {
        console.error(chalk.red('Error:'), error);
      }
      return;
    }
    
    // Interactive mode
    console.log(chalk.cyan('\n🧘 Cybertantra Query Interface\n'));
    
    while (true) {
      const { question } = await inquirer.prompt([
        {
          type: 'input',
          name: 'question',
          message: 'Ask a question (or "exit" to quit):',
        }
      ]);
      
      if (question.toLowerCase() === 'exit') {
        console.log(chalk.gray('\nExiting...'));
        break;
      }
      
      console.log(chalk.gray('\nSearching lecture corpus...'));
      
      try {
        const answer = await agent.query(question);
        console.log(chalk.green('\nAnswer:'));
        console.log(answer);
        console.log(chalk.gray('\n' + '─'.repeat(80) + '\n'));
      } catch (error) {
        console.error(chalk.red('Error:'), error);
      }
    }
    
  } catch (error) {
    console.error('Failed to start query interface:', error);
    process.exit(1);
  }
}

main();
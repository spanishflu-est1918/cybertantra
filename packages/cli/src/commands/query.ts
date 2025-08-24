#!/usr/bin/env bun
import dotenv from 'dotenv';
import inquirer from 'inquirer';
import chalk from 'chalk';

dotenv.config();

import { QueryAgent, getAIConfig, type ContentCategory } from '@cybertantra/ai';

async function main() {
  try {
    const config = getAIConfig();
    const agent = new QueryAgent(config);
    
    // Check if a question was passed as a command-line argument
    const args = process.argv.slice(2);
    if (args.length > 0) {
      const question = args.join(' ');
      console.log(chalk.gray('\nSearching all content...'));
      
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
    console.log(chalk.gray('With content categorization support\n'));
    
    // Show available content stats
    console.log(chalk.yellow('Loading content statistics...'));
    const stats = await agent.getStats();
    if (stats && Array.isArray(stats)) {
      console.log(chalk.green('\n📊 Available Content:'));
      for (const stat of stats) {
        console.log(chalk.white(`   ${stat.category}: ${stat.chunk_count} chunks from ${stat.file_count} files`));
      }
      console.log('');
    }
    
    while (true) {
      // Ask for category filter
      const { categoryChoice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'categoryChoice',
          message: 'Filter by category:',
          choices: [
            { name: 'All categories', value: 'all' },
            { name: 'Lectures only', value: 'lecture' },
            { name: 'Meditations only', value: 'meditation' },
            { name: 'Videos only', value: 'video' },
            { name: 'Shows only', value: 'show' },
            { name: 'Exit', value: 'exit' }
          ]
        }
      ]);
      
      if (categoryChoice === 'exit') {
        console.log(chalk.gray('\nExiting...'));
        break;
      }
      
      const { question } = await inquirer.prompt([
        {
          type: 'input',
          name: 'question',
          message: 'Ask a question:',
        }
      ]);
      
      if (!question.trim()) continue;
      
      // Prepare query options
      const options: any = { topK: 5 };
      if (categoryChoice !== 'all') {
        options.categories = [categoryChoice as ContentCategory];
        console.log(chalk.gray(`\nSearching ${categoryChoice} content...`));
      } else {
        console.log(chalk.gray('\nSearching all content...'));
      }
      
      try {
        const answer = await agent.query(question, options);
        console.log(chalk.green('\nAnswer:'));
        console.log(answer);
        
        // Also show the raw chunks for transparency
        console.log(chalk.gray('\n📚 Sources used:'));
        const chunks = await agent.search(question, { ...options, topK: 3 });
        for (const chunk of chunks) {
          const category = chunk.category ? `[${chunk.category.toUpperCase()}]` : '';
          console.log(chalk.gray(`   ${category} ${chunk.source} (relevance: ${(chunk.score * 100).toFixed(1)}%)`));
        }
        
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
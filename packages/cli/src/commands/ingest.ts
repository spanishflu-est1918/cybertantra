#!/usr/bin/env bun
import dotenv from 'dotenv';
import inquirer from 'inquirer';
import fs from 'fs/promises';
import { ContentIngestion } from '@cybertantra/lecture-tools/src/ingestion/content-ingestion';

dotenv.config();

async function main() {
  try {
    console.log('\n🔮 CYBERTANTRA CONTENT INGESTION');
    console.log('=====================================\n');

    // Interactive configuration
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'category',
        message: 'What type of content are you ingesting?',
        choices: [
          { name: '📚 Lectures (Teaching material)', value: 'lecture' },
          { name: '🧘 Meditations (Yoga nidras, guided meditations)', value: 'meditation' },
          { name: '📹 Videos (Video transcripts)', value: 'video' },
          { name: '🎙️ Shows (Podcast/show content)', value: 'show' }
        ]
      },
      {
        type: 'input',
        name: 'directory',
        message: 'Enter the directory path containing the content:',
        default: './content',
        validate: async (input) => {
          try {
            await fs.access(input);
            return true;
          } catch {
            return 'Directory does not exist';
          }
        }
      },
      {
        type: 'input',
        name: 'author',
        message: 'Who is the author/teacher of this content?',
        default: 'Unknown'
      }
    ]);

    // Tags input
    const tagsAnswer = await inquirer.prompt([
      {
        type: 'input',
        name: 'tags',
        message: 'Enter tags (comma-separated, optional):',
        filter: (input: string) => {
          return input ? input.split(',').map(t => t.trim()).filter(t => t.length > 0) : [];
        }
      }
    ]);


    // Confirmation
    console.log('\n📋 Ingestion Configuration:');
    console.log('----------------------------');
    console.log(`Category: ${answers.category}`);
    console.log(`Directory: ${answers.directory}`);
    console.log(`Author: ${answers.author}`);
    if (tagsAnswer.tags.length > 0) console.log(`Tags: ${tagsAnswer.tags.join(', ')}`);
    
    const confirm = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Proceed with ingestion?',
        default: true
      }
    ]);

    if (!confirm.proceed) {
      console.log('Ingestion cancelled.');
      return;
    }

    // Start ingestion
    const config = {
      category: answers.category,
      directory: answers.directory,
      tags: tagsAnswer.tags,
      author: answers.author
    };

    const ingestion = new ContentIngestion(config);
    await ingestion.run();
    
    console.log('\n✅ Ingestion complete!');
    
  } catch (error) {
    console.error('\n❌ Ingestion failed:', error);
    process.exit(1);
  }
}

main();
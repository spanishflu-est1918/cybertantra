#!/usr/bin/env bun

import { Command } from 'commander';
import ora from 'ora';
import inquirer from 'inquirer';
import { TranscriptionService, TranscriptionConfig } from './service';
import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';

dotenv.config();

const program = new Command();

program
  .name('transcribe')
  .description('Transcribe audio lectures using AssemblyAI')
  .version('1.0.0');

program
  .command('scan')
  .description('Scan audio files and show transcription status')
  .option('-d, --dir <directory>', 'Audio files directory', './audio')
  .action(async (options) => {
    const service = new TranscriptionService();
    const spinner = ora('Scanning audio files...').start();
    
    try {
      const files = await service.scanAudioFiles(options.dir);
      spinner.stop();
      
      console.log('\n📊 Audio Files Status:');
      console.log('======================\n');
      
      const needsTranscription = files.filter(f => f.needsTranscription);
      const completed = files.filter(f => f.existingTranscript);
      
      console.log(`Total audio files: ${files.length}`);
      console.log(`✅ Already transcribed: ${completed.length}`);
      console.log(`⏳ Needs transcription: ${needsTranscription.length}`);
      
      if (needsTranscription.length > 0) {
        console.log('\n📝 Files needing transcription:');
        needsTranscription.forEach(f => {
          console.log(`   - ${f.filename} ${f.status ? `(${f.status})` : ''}`);
        });
      }
      
      if (completed.length > 0) {
        console.log('\n✅ Completed transcriptions:');
        completed.forEach(f => {
          console.log(`   - ${f.filename} → ${f.existingTranscript}`);
        });
      }
      
    } catch (error) {
      spinner.fail('Failed to scan audio files');
      console.error(error);
    }
  });

program
  .command('process')
  .description('Transcribe audio files that need processing')
  .option('-d, --dir <directory>', 'Audio files directory', './audio')
  .option('-m, --model <tier>', 'Model tier: best or nano', 'best')
  .option('-b, --batch <size>', 'Batch size for parallel processing', '1')
  .option('--keep-audio', 'Keep audio files after transcription (default: delete them)')
  .option('--dry-run', 'Show what would be transcribed without doing it')
  .action(async (options) => {
    if (!process.env.ASSEMBLYAI_API_KEY) {
      console.error('❌ ASSEMBLYAI_API_KEY not found in .env file');
      process.exit(1);
    }
    
    const service = new TranscriptionService();
    const spinner = ora('Scanning for files to transcribe...').start();
    
    try {
      const files = await service.scanAudioFiles(options.dir);
      const needsTranscription = files.filter(f => f.needsTranscription);
      
      spinner.stop();
      
      if (needsTranscription.length === 0) {
        console.log('✅ All audio files have been transcribed!');
        return;
      }
      
      console.log(`\n🎙️  Found ${needsTranscription.length} files to transcribe`);
      
      // Estimate cost
      const estimatedHours = needsTranscription.length * 1.5; // Assume 1.5 hours average
      const costPerHour = options.model === 'nano' ? 0.20 : 0.28;
      const estimatedCost = estimatedHours * costPerHour;
      
      console.log(`\n💰 Cost Estimate:`);
      console.log(`   Model: ${options.model}`);
      console.log(`   Estimated duration: ${estimatedHours} hours`);
      console.log(`   Estimated cost: $${estimatedCost.toFixed(2)}`);
      
      if (options.dryRun) {
        console.log('\n🔍 Dry run - no files will be transcribed');
        needsTranscription.forEach(f => {
          console.log(`   Would transcribe: ${f.filename}`);
        });
        return;
      }
      
      // Confirm
      const { proceed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: `Proceed with transcription? (Est. $${estimatedCost.toFixed(2)})`,
          default: true,
        },
      ]);
      
      if (!proceed) {
        console.log('Transcription cancelled');
        return;
      }
      
      // Create job
      await service.createTranscriptionJob(needsTranscription.length);
      
      // Process files
      const config: TranscriptionConfig = {
        modelTier: options.model as 'best' | 'nano',
        speakerLabels: true,
        languageCode: 'en',
        outputFormat: 'both',
      };
      
      let processed = 0;
      let failed = 0;
      let totalCost = 0;
      let totalDuration = 0;
      
      for (const file of needsTranscription) {
        const filePath = path.join(options.dir, file.filename);
        console.log(`\n[${processed + 1}/${needsTranscription.length}] Processing ${file.filename}`);
        
        const result = await service.transcribeFile(filePath, config);
        
        if (result.success) {
          processed++;
          totalCost += result.cost || 0;
          totalDuration += result.duration || 0;
          await service.updateJobProgress(processed, failed, result.duration || 0, result.cost || 0);
          
          // Delete the audio file after successful transcription (unless --keep-audio is specified)
          if (!options.keepAudio) {
            try {
              await fs.unlink(filePath);
              console.log(`   🗑️  Deleted audio file: ${file.filename}`);
            } catch (error) {
              console.error(`   ⚠️  Failed to delete audio file: ${error}`);
            }
          } else {
            console.log(`   💾 Kept audio file: ${file.filename}`);
          }
        } else {
          failed++;
          console.error(`   ❌ Failed: ${result.error}`);
        }
      }
      
      // Complete job
      await service.completeJob(failed === 0 ? 'completed' : 'failed');
      
      // Final report
      console.log('\n========================================');
      console.log('📊 TRANSCRIPTION COMPLETE');
      console.log('========================================');
      console.log(`Processed: ${processed}/${needsTranscription.length}`);
      console.log(`Failed: ${failed}`);
      console.log(`Total duration: ${(totalDuration / 3600).toFixed(1)} hours`);
      console.log(`Total cost: $${totalCost.toFixed(2)}`);
      console.log('========================================\n');
      
      if (processed > 0) {
        console.log('✅ Transcripts saved to ./lectures/');
        console.log('   Run `bun run ingest` to add them to the RAG system');
      }
      
    } catch (error) {
      spinner.fail('Transcription failed');
      console.error(error);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show transcription statistics')
  .action(async () => {
    const service = new TranscriptionService();
    
    try {
      const stats = await service.getTranscriptionStats();
      
      console.log('\n📊 Transcription Statistics:');
      console.log('===========================');
      console.log(`Total files tracked: ${stats.totalFiles}`);
      console.log(`✅ Completed: ${stats.completed}`);
      console.log(`❌ Failed: ${stats.failed}`);
      console.log(`⏳ Pending: ${stats.pending}`);
      console.log(`\nTotal duration: ${(stats.totalDuration / 3600).toFixed(1)} hours`);
      console.log(`Total cost: $${stats.totalCost.toFixed(2)}`);
      
      // Show recent jobs
      const jobs = await sql`
        SELECT * FROM transcription_jobs 
        ORDER BY started_at DESC 
        LIMIT 5
      `;
      
      if (jobs.rows.length > 0) {
        console.log('\n📋 Recent Jobs:');
        jobs.rows.forEach(job => {
          const duration = job.completed_at 
            ? `${((new Date(job.completed_at) - new Date(job.started_at)) / 1000 / 60).toFixed(1)} min`
            : 'Running...';
          console.log(`   ${job.job_id}: ${job.processed_files}/${job.total_files} files | $${job.total_cost.toFixed(2)} | ${duration}`);
        });
      }
      
    } catch (error) {
      console.error('Failed to get statistics:', error);
    }
  });

program
  .command('cost-estimate <hours>')
  .description('Estimate transcription cost for given hours')
  .option('-m, --model <tier>', 'Model tier: best or nano', 'best')
  .action((hours, options) => {
    const hoursNum = parseFloat(hours);
    const costPerHour = options.model === 'nano' ? 0.20 : 0.28;
    const totalCost = hoursNum * costPerHour;
    
    console.log('\n💰 Transcription Cost Estimate:');
    console.log('==============================');
    console.log(`Model tier: ${options.model}`);
    console.log(`Duration: ${hoursNum} hours`);
    console.log(`Rate: $${costPerHour}/hour`);
    console.log(`Total cost: $${totalCost.toFixed(2)}`);
    
    // With free credits
    const afterCredits = Math.max(0, totalCost - 50);
    if (totalCost > 50) {
      console.log(`\nWith $50 free credits: $${afterCredits.toFixed(2)}`);
    } else {
      console.log('\n✅ Covered by $50 free credits!');
    }
  });

program.parse(process.argv);
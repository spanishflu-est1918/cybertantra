#!/usr/bin/env bun

import { program } from "commander";
import ora from "ora";
import inquirer from "inquirer";
import {
  TranscriptionService,
  TranscriptionConfig,
} from "@cybertantra/lecture-tools/src/transcription/service";
import dotenv from "dotenv";
import path from "path";
import fs from "fs/promises";

dotenv.config();

program
  .name("transcribe")
  .description("Transcribe audio lectures using AssemblyAI")
  .version("1.0.0");

program
  .command("scan")
  .description("Scan audio files and show transcription status")
  .option("-d, --dir <directory>", "Audio files directory", "./audio")
  .action(async (options) => {
    const service = new TranscriptionService();
    const spinner = ora("Scanning audio files...").start();

    try {
      const files = await service.scanAudioFiles(options.dir);
      spinner.stop();

      console.log("\n📊 Audio Files Status:");
      console.log("======================\n");

      const needsTranscription = files.filter((f) => f.needsTranscription);
      const completed = files.filter((f) => f.existingTranscript);

      console.log(`Total audio files: ${files.length}`);
      console.log(`✅ Already transcribed: ${completed.length}`);
      console.log(`⏳ Needs transcription: ${needsTranscription.length}`);

      if (needsTranscription.length > 0) {
        console.log("\n📝 Files needing transcription:");
        needsTranscription.forEach((f) => {
          console.log(`   - ${f.filename} ${f.status ? `(${f.status})` : ""}`);
        });
      }

      if (completed.length > 0) {
        console.log("\n✅ Completed transcriptions:");
        completed.forEach((f) => {
          console.log(`   - ${f.filename} → ${f.existingTranscript}`);
        });
      }
    } catch (error) {
      spinner.fail("Failed to scan audio files");
      console.error(error);
    }
  });

program
  .command("process")
  .description("Transcribe audio files that need processing")
  .option("-d, --dir <directory>", "Audio files directory", "./audio")
  .option("-o, --output <directory>", "Output directory for transcripts")
  .option("-m, --model <tier>", "Model tier: best or nano", "best")
  .option("-b, --batch <size>", "Batch size for parallel processing", "1")
  .option("--dry-run", "Show what would be transcribed without doing it")
  .option("-y, --yes", "Skip confirmation prompt")
  .option(
    "-t, --timestamps",
    "Include word-level timestamps for meditation analysis",
  )
  .action(async (options) => {
    if (!process.env.ASSEMBLYAI_API_KEY) {
      console.error("❌ ASSEMBLYAI_API_KEY not found in .env file");
      process.exit(1);
    }

    const service = new TranscriptionService();
    const spinner = ora("Scanning for files to transcribe...").start();

    try {
      const files = await service.scanAudioFiles(options.dir);
      const needsTranscription = files.filter((f) => f.needsTranscription);

      spinner.stop();

      if (needsTranscription.length === 0) {
        console.log("✅ All audio files have been transcribed!");
        return;
      }

      console.log(
        `\n🎙️  Found ${needsTranscription.length} files to transcribe`,
      );

      // Estimate cost
      const estimatedHours = needsTranscription.length * 1.5; // Assume 1.5 hours average
      const costPerHour = options.model === "nano" ? 0.2 : 0.28;
      const estimatedCost = estimatedHours * costPerHour;

      console.log(`\n💰 Cost Estimate:`);
      console.log(`   Model: ${options.model}`);
      console.log(`   Estimated duration: ${estimatedHours} hours`);
      console.log(`   Estimated cost: $${estimatedCost.toFixed(2)}`);

      if (options.dryRun) {
        console.log("\n🔍 Dry run - no files will be transcribed");
        needsTranscription.forEach((f) => {
          console.log(`   Would transcribe: ${f.filename}`);
        });
        return;
      }

      // Confirm (skip if -y flag is set)
      if (!options.yes) {
        const { proceed } = await inquirer.prompt([
          {
            type: "confirm",
            name: "proceed",
            message: `Proceed with transcription? (Est. $${estimatedCost.toFixed(2)})`,
            default: true,
          },
        ]);

        if (!proceed) {
          console.log("Transcription cancelled");
          return;
        }
      }

      // Create job
      await service.createTranscriptionJob(needsTranscription.length);

      // Process files
      const config: TranscriptionConfig = {
        modelTier: options.model as "best" | "nano",
        speakerLabels: true,
        languageCode: "en",
        timestamps: options.timestamps || false,
      };

      let processed = 0;
      let failed = 0;
      let totalCost = 0;
      let totalDuration = 0;

      for (const file of needsTranscription) {
        const filePath = path.join(options.dir, file.filename);
        console.log(
          `\n[${processed + 1}/${needsTranscription.length}] Processing ${file.filename}`,
        );

        let result;
        if (options.timestamps) {
          // Use timestamped transcription for meditation analysis
          const transcription = await service.transcribeWithTimestamps(
            filePath,
            config,
          );
          const outputDir = options.output || "./lectures";
          const baseName = path.basename(
            file.filename,
            path.extname(file.filename),
          );
          const outputPath = path.join(
            outputDir,
            `${baseName}_timestamped.json`,
          );
          await service.saveTimestampedTranscript(
            transcription,
            outputPath,
            "json",
          );
          result = {
            success: true,
            transcriptPath: outputPath,
            duration: transcription.duration * 60, // convert back to seconds
            cost: (transcription.duration / 60) * 0.00028, // estimate cost
          };
        } else {
          result = await service.transcribeFile(
            filePath,
            config,
            options.output,
          );
        }

        if (result.success) {
          processed++;
          totalCost += result.cost || 0;
          totalDuration += result.duration || 0;
          await service.updateJobProgress(
            processed,
            failed,
            result.duration || 0,
            result.cost || 0,
          );

          // Delete the audio file after successful transcription
          try {
            await fs.unlink(filePath);
            console.log(`   🗑️  Deleted audio file: ${file.filename}`);
          } catch (error) {
            console.error(`   ⚠️  Failed to delete audio file: ${error}`);
          }
        } else {
          failed++;
          console.error(`   ❌ Failed: ${result.error}`);
        }
      }

      // Complete job
      await service.completeJob(failed === 0 ? "completed" : "failed");

      // Final report
      console.log("\n========================================");
      console.log("📊 TRANSCRIPTION COMPLETE");
      console.log("========================================");
      console.log(`Processed: ${processed}/${needsTranscription.length}`);
      console.log(`Failed: ${failed}`);
      console.log(`Total duration: ${(totalDuration / 3600).toFixed(1)} hours`);
      console.log(`Total cost: $${totalCost.toFixed(2)}`);
      console.log("========================================\n");

      if (processed > 0) {
        console.log("✅ Transcripts saved to ./lectures/");
        console.log(
          "   Run `bun run cli:ingest` to add them to the RAG system",
        );
      }
    } catch (error) {
      spinner.fail("Transcription failed");
      console.error(error);
      process.exit(1);
    }
  });

program.parse(process.argv);

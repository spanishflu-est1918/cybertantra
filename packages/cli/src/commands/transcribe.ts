#!/usr/bin/env bun

import { program } from "commander";
import ora from "ora";
import inquirer from "inquirer";
import {
  TranscriptionService,
  TranscriptionConfig,
  DiarizationResult,
} from "@cybertantra/lecture-tools/src/transcription/service";
import {
  convertAudio,
  convertVoiceMemo,
  getAudioInfo,
  checkFfmpeg,
} from "@cybertantra/lecture-tools/src/transcription/convert";
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
            message: `Proceed with transcription?`,
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
          try {
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
              `${baseName}.json`,
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
          } catch (error) {
            console.error(`   ❌ Timestamped transcription failed:`, error);
            result = {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
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

program
  .command("convert <file>")
  .description("Convert audio file to transcription-ready format (handles iPhone Voice Memos)")
  .option("-o, --output <path>", "Output file path")
  .option("-f, --format <format>", "Output format: mp3, wav, m4a, ogg, flac", "mp3")
  .option("-b, --bitrate <bitrate>", "Audio bitrate (e.g., 128k, 192k, 320k)", "128k")
  .option("-r, --rate <samplerate>", "Sample rate in Hz", "16000")
  .option("--stereo", "Output stereo (default is mono for voice)")
  .option("--no-normalize", "Skip audio normalization")
  .action(async (file, options) => {
    // Check ffmpeg
    const hasFfmpeg = await checkFfmpeg();
    if (!hasFfmpeg) {
      console.error("❌ ffmpeg is not installed. Install with: brew install ffmpeg");
      process.exit(1);
    }

    // Check if file exists
    const filePath = path.resolve(file);
    try {
      await fs.access(filePath);
    } catch {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }

    // Get input file info
    const spinner = ora("Analyzing audio file...").start();
    try {
      const info = await getAudioInfo(filePath);
      spinner.succeed("Audio file analyzed");

      console.log(`\n📊 Input file info:`);
      console.log(`   Format: ${info.format}`);
      console.log(`   Duration: ${Math.floor(info.duration / 60)}m ${Math.floor(info.duration % 60)}s`);
      console.log(`   Sample rate: ${info.sampleRate} Hz`);
      console.log(`   Channels: ${info.channels}`);
    } catch (error) {
      spinner.fail("Failed to analyze audio");
      console.error(error);
      process.exit(1);
    }

    // Convert
    const convertSpinner = ora("Converting audio...").start();
    try {
      const result = await convertAudio(filePath, {
        outputFormat: options.format,
        bitrate: options.bitrate,
        sampleRate: parseInt(options.rate, 10),
        channels: options.stereo ? 2 : 1,
        normalize: options.normalize !== false,
      });

      if (result.success) {
        convertSpinner.succeed("Conversion complete!");
        console.log(`\n✅ Output: ${result.outputPath}`);
        console.log(`   Duration: ${Math.floor((result.duration || 0) / 60)}m ${Math.floor((result.duration || 0) % 60)}s`);
      } else {
        convertSpinner.fail("Conversion failed");
        console.error(result.error);
        process.exit(1);
      }
    } catch (error) {
      convertSpinner.fail("Conversion failed");
      console.error(error);
      process.exit(1);
    }
  });

program
  .command("voice <file>")
  .description("Convert iPhone Voice Memo and transcribe with speaker diarization (all-in-one workflow)")
  .option("-o, --output <path>", "Output dialogue file path")
  .option("-m, --model <tier>", "Model tier: best or nano", "best")
  .option("--no-timestamps", "Exclude timestamps from output")
  .option("--no-stats", "Exclude speaker statistics from output")
  .option("-f, --format <format>", "Output format: dialogue or json", "dialogue")
  .option(
    "-n, --names <names>",
    "Speaker names as JSON, e.g. '{\"A\":\"John\",\"B\":\"Jane\"}'",
  )
  .option("-y, --yes", "Skip confirmation prompt")
  .option("--keep-converted", "Keep the converted audio file (default: delete after transcription)")
  .action(async (file, options) => {
    if (!process.env.ASSEMBLYAI_API_KEY) {
      console.error("❌ ASSEMBLYAI_API_KEY not found in .env file");
      process.exit(1);
    }

    // Check ffmpeg
    const hasFfmpeg = await checkFfmpeg();
    if (!hasFfmpeg) {
      console.error("❌ ffmpeg is not installed. Install with: brew install ffmpeg");
      process.exit(1);
    }

    // Check if file exists
    const filePath = path.resolve(file);
    try {
      await fs.access(filePath);
    } catch {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }

    const ext = path.extname(filePath).toLowerCase();
    const baseName = path.basename(filePath, ext);

    // Parse speaker names if provided
    let speakerNames: Record<string, string> | undefined;
    if (options.names) {
      try {
        speakerNames = JSON.parse(options.names);
      } catch {
        console.error("❌ Invalid JSON for speaker names");
        process.exit(1);
      }
    }

    // Confirm
    if (!options.yes) {
      const { proceed } = await inquirer.prompt([
        {
          type: "confirm",
          name: "proceed",
          message: `Process ${path.basename(file)} (convert + diarize)?`,
          default: true,
        },
      ]);

      if (!proceed) {
        console.log("Cancelled");
        return;
      }
    }

    let audioPath = filePath;
    let needsCleanup = false;

    // Step 1: Convert if needed
    const needsConversion = ![".mp3", ".wav", ".flac"].includes(ext);
    if (needsConversion) {
      const convertSpinner = ora("Step 1/2: Converting audio for transcription...").start();
      try {
        const result = await convertVoiceMemo(filePath);
        if (!result.success) {
          convertSpinner.fail("Conversion failed");
          console.error(result.error);
          process.exit(1);
        }
        convertSpinner.succeed(`Converted to ${result.outputPath}`);
        audioPath = result.outputPath!;
        needsCleanup = !options.keepConverted;
      } catch (error) {
        convertSpinner.fail("Conversion failed");
        console.error(error);
        process.exit(1);
      }
    } else {
      console.log("✅ Audio format is transcription-ready, skipping conversion");
    }

    // Step 2: Diarize
    const diarizeSpinner = ora("Step 2/2: Transcribing with speaker diarization...").start();
    try {
      const service = new TranscriptionService();
      const config: TranscriptionConfig = {
        modelTier: options.model as "best" | "nano",
        speakerLabels: true,
        languageCode: "en",
      };

      const result = await service.transcribeWithDiarization(
        audioPath,
        config,
        speakerNames,
      );

      diarizeSpinner.succeed("Transcription complete!");

      // Determine output path - default to project root conversations folder
      const outputExt = options.format === "json" ? ".json" : ".md";
      // Find project root by looking for package.json with workspaces
      const projectRoot = path.resolve(__dirname, "../../../../..");
      const defaultOutputDir = path.join(projectRoot, "conversations");
      await fs.mkdir(defaultOutputDir, { recursive: true });
      const outputPath = options.output || path.join(defaultOutputDir, `${baseName}-dialogue${outputExt}`);

      // Save the result
      await service.saveDiarizedTranscript(
        result,
        outputPath,
        options.format as "dialogue" | "json",
        {
          includeTimestamps: options.timestamps !== false,
          includeStats: options.stats !== false,
        },
      );

      // Cleanup converted file if needed
      if (needsCleanup && audioPath !== filePath) {
        try {
          await fs.unlink(audioPath);
          console.log(`🗑️  Cleaned up temporary file: ${path.basename(audioPath)}`);
        } catch {
          // Ignore cleanup errors
        }
      }

      console.log(`\n✅ Dialogue saved to: ${outputPath}`);
      console.log(`\n📊 Summary:`);
      console.log(`   Speakers: ${result.speakers.join(", ")}`);
      console.log(`   Utterances: ${result.utterances.length}`);
      console.log(
        `   Duration: ${Math.floor(result.duration / 60)}m ${Math.floor(result.duration % 60)}s`,
      );

      // Show speaker breakdown
      console.log(`\n🎙️  Speaker Breakdown:`);
      for (const [speaker, stats] of Object.entries(result.speakerStats)) {
        const mins = Math.floor(stats.totalTime / 60);
        const secs = Math.floor(stats.totalTime % 60);
        console.log(`   ${speaker}: ${mins}m ${secs}s (${stats.wordCount} words)`);
      }
    } catch (error) {
      diarizeSpinner.fail("Diarization failed");
      console.error(error);
      process.exit(1);
    }
  });

program
  .command("diarize <file>")
  .description("Transcribe audio with speaker diarization and output as dialogue")
  .option("-o, --output <path>", "Output file path (default: <filename>-dialogue.md)")
  .option("-m, --model <tier>", "Model tier: best or nano", "best")
  .option("--no-timestamps", "Exclude timestamps from output")
  .option("--no-stats", "Exclude speaker statistics from output")
  .option("-f, --format <format>", "Output format: dialogue or json", "dialogue")
  .option(
    "-n, --names <names>",
    "Speaker names as JSON, e.g. '{\"A\":\"John\",\"B\":\"Jane\"}'",
  )
  .option("-y, --yes", "Skip confirmation prompt")
  .action(async (file, options) => {
    if (!process.env.ASSEMBLYAI_API_KEY) {
      console.error("❌ ASSEMBLYAI_API_KEY not found in .env file");
      process.exit(1);
    }

    // Check if file exists
    const filePath = path.resolve(file);
    try {
      await fs.access(filePath);
    } catch {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }

    const service = new TranscriptionService();

    // Parse speaker names if provided
    let speakerNames: Record<string, string> | undefined;
    if (options.names) {
      try {
        speakerNames = JSON.parse(options.names);
      } catch {
        console.error("❌ Invalid JSON for speaker names");
        process.exit(1);
      }
    }

    // Confirm
    if (!options.yes) {
      const { proceed } = await inquirer.prompt([
        {
          type: "confirm",
          name: "proceed",
          message: `Transcribe ${path.basename(file)} with speaker diarization?`,
          default: true,
        },
      ]);

      if (!proceed) {
        console.log("Cancelled");
        return;
      }
    }

    const spinner = ora("Transcribing with speaker diarization...").start();

    try {
      const config: TranscriptionConfig = {
        modelTier: options.model as "best" | "nano",
        speakerLabels: true,
        languageCode: "en",
      };

      const result = await service.transcribeWithDiarization(
        filePath,
        config,
        speakerNames,
      );

      spinner.succeed("Transcription complete!");

      // Determine output path
      const baseName = path.basename(file, path.extname(file));
      const ext = options.format === "json" ? ".json" : ".md";
      const outputPath = options.output || `${baseName}-dialogue${ext}`;

      // Save the result
      await service.saveDiarizedTranscript(
        result,
        outputPath,
        options.format as "dialogue" | "json",
        {
          includeTimestamps: options.timestamps !== false,
          includeStats: options.stats !== false,
        },
      );

      console.log(`\n✅ Dialogue saved to: ${outputPath}`);
      console.log(`\n📊 Summary:`);
      console.log(`   Speakers: ${result.speakers.join(", ")}`);
      console.log(`   Utterances: ${result.utterances.length}`);
      console.log(
        `   Duration: ${Math.floor(result.duration / 60)}m ${Math.floor(result.duration % 60)}s`,
      );

      // Show speaker breakdown
      console.log(`\n🎙️  Speaker Breakdown:`);
      for (const [speaker, stats] of Object.entries(result.speakerStats)) {
        const mins = Math.floor(stats.totalTime / 60);
        const secs = Math.floor(stats.totalTime % 60);
        console.log(`   ${speaker}: ${mins}m ${secs}s (${stats.wordCount} words)`);
      }
    } catch (error) {
      spinner.fail("Diarization failed");
      console.error(error);
      process.exit(1);
    }
  });

program.parse(process.argv);

#!/usr/bin/env bun

import { program } from "commander";
import { generateCompleteMeditation } from "@cybertantra/ai";
import path from "path";
import dotenv from "dotenv";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";

dotenv.config();

program
  .name("generate-meditation")
  .description("Generate AI-powered meditations with audio and music")
  .version("2.0.0");

program
  .command("create")
  .description("Generate a new meditation with full audio production")
  .option("-t, --topic <topic>", "Meditation topic (e.g., 'Ganesha', 'Heart Chakra')")
  .option("-d, --duration <minutes>", "Duration in minutes", parseInt)
  .option("-o, --output <dir>", "Output directory")
  .option("--no-audio", "Skip audio generation")
  .option("--no-music", "Skip music generation")
  .option("-v, --voice-id <id>", "ElevenLabs voice ID to use")
  .option("--text-only", "Generate text only (no audio or music)")
  .action(async (options) => {
    try {
      console.log(chalk.cyan("\n🧘 Meditation Generator"));
      console.log(chalk.gray("─".repeat(40)));
      
      // Interactive prompts if not provided
      let topic = options.topic;
      let duration = options.duration;
      
      if (!topic) {
        const topicAnswer = await inquirer.prompt([
          {
            type: "input",
            name: "topic",
            message: "What is the topic for your meditation?",
            default: "Ganesha",
            validate: (input) => input.length > 0 || "Topic is required",
          },
        ]);
        topic = topicAnswer.topic;
      }
      
      if (!duration) {
        const durationAnswer = await inquirer.prompt([
          {
            type: "list",
            name: "duration",
            message: "How long should the meditation be?",
            choices: [
              { name: "5 minutes (Quick practice)", value: 5 },
              { name: "8 minutes (Short session)", value: 8 },
              { name: "10 minutes (Standard)", value: 10 },
              { name: "15 minutes (Extended)", value: 15 },
              { name: "20 minutes (Deep practice)", value: 20 },
              { name: "30 minutes (Full session)", value: 30 },
            ],
            default: 1, // 8 minutes
          },
        ]);
        duration = durationAnswer.duration;
      }

      // Validate duration
      if (duration < 5 || duration > 30) {
        console.error(chalk.red("Duration must be between 5 and 30 minutes"));
        process.exit(1);
      }

      // Ask about audio generation if not specified
      let generateAudio = options.audio;
      let generateMusic = options.music;
      
      if (!options.textOnly && generateAudio !== false && generateMusic !== false) {
        const audioOptions = await inquirer.prompt([
          {
            type: "confirm",
            name: "generateAudio",
            message: "Generate narrated audio?",
            default: true,
          },
          {
            type: "confirm",
            name: "generateMusic",
            message: "Generate background music?",
            default: true,
            when: (answers) => answers.generateAudio,
          },
        ]);
        generateAudio = audioOptions.generateAudio;
        generateMusic = audioOptions.generateMusic;
      } else if (options.textOnly) {
        generateAudio = false;
        generateMusic = false;
      }
      
      console.log(chalk.gray("\n─".repeat(40)));
      console.log(chalk.yellow(`📿 Topic: ${topic}`));
      console.log(chalk.yellow(`⏱️  Duration: ${duration} minutes`));
      console.log(chalk.yellow(`🎙️  Audio: ${generateAudio ? 'Yes' : 'No'}`));
      console.log(chalk.yellow(`🎵 Music: ${generateMusic ? 'Yes' : 'No'}`));
      console.log(chalk.yellow(`📁 Output: public/audio/meditations/`));
      console.log(chalk.gray("─".repeat(40) + "\n"));
      
      // Generate the meditation
      const spinner = ora("Generating meditation...").start();
      
      const result = await generateCompleteMeditation({
        topic,
        duration,
        voiceId: options.voiceId,
      });
      
      spinner.succeed("Meditation generation complete!");
      
      console.log(chalk.green.bold("\n✨ Meditation generated successfully!"));
      console.log(chalk.gray(`\nAll files saved to: public/audio/meditations/`));
      
      if (result.finalAudioPath) {
        console.log(chalk.cyan(`\n🎧 Complete meditation: ${result.finalAudioPath}`));
      } else if (result.audioPath) {
        console.log(chalk.cyan(`\n🎙️ Voice-only meditation saved`));
      }
      
      // Ask if user wants to generate another
      const { another } = await inquirer.prompt([
        {
          type: "confirm",
          name: "another",
          message: "Generate another meditation?",
          default: false,
        },
      ]);
      
      if (another) {
        // Recursive call to generate another
        await program.commands[0].action({});
      }
      
    } catch (error) {
      console.error("❌ Error generating meditation:", error);
      process.exit(1);
    }
  });

// If no command specified, default to create
if (process.argv.length === 2) {
  process.argv.push('create');
}

program.parse(process.argv);
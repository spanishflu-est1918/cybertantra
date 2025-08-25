#!/usr/bin/env bun

import { program } from "commander";
import { MeditationGeneratorAgent } from "@cybertantra/ai";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
import inquirer from "inquirer";
import chalk from "chalk";

dotenv.config();

program
  .name("generate-meditation")
  .description("Generate AI-powered meditations")
  .version("1.0.0");

program
  .command("create")
  .description("Generate a new meditation interactively")
  .option("-t, --topic <topic>", "Meditation topic (e.g., 'Ganesha', 'Heart Chakra')")
  .option("-d, --duration <minutes>", "Duration in minutes", parseInt)
  .option("-o, --output <file>", "Output file path")
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
            ],
            default: 1, // 8 minutes
          },
        ]);
        duration = durationAnswer.duration;
      }
      
      console.log(chalk.gray("\n─".repeat(40)));
      console.log(chalk.yellow(`📿 Topic: ${topic}`));
      console.log(chalk.yellow(`⏱️  Duration: ${duration} minutes`));
      console.log(chalk.gray("─".repeat(40) + "\n"));
      
      const agent = new MeditationGeneratorAgent();
      
      // Generate meditation
      const result = await agent.generate(topic, duration);
      
      // Save to file if output specified
      if (options.output) {
        const outputPath = path.resolve(options.output);
        const outputDir = path.dirname(outputPath);
        await fs.mkdir(outputDir, { recursive: true });
        
        // Save both versions
        const basename = path.basename(outputPath, path.extname(outputPath));
        const textPath = path.join(outputDir, `${basename}.txt`);
        const ssmlPath = path.join(outputDir, `${basename}.ssml`);
        
        await fs.writeFile(textPath, result.originalText);
        await fs.writeFile(ssmlPath, result.ssml);
        
        console.log(chalk.green(`\n✅ Meditation saved to:`));
        console.log(chalk.gray(`   Text: ${textPath}`));
        console.log(chalk.gray(`   SSML: ${ssmlPath}`));
      } else {
        // Print to console
        console.log(chalk.cyan("\n" + "═".repeat(60)));
        console.log(chalk.cyan("MEDITATION TEXT:"));
        console.log(chalk.cyan("═".repeat(60)));
        console.log(result.originalText);
        console.log(chalk.cyan("\n" + "═".repeat(60)));
        console.log(chalk.cyan("SSML OUTPUT:"));
        console.log(chalk.cyan("═".repeat(60)));
        console.log(result.ssml);
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
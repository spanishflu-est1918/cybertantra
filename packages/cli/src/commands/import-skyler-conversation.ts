#!/usr/bin/env tsx

import fs from "fs";
import path from "path";
import { ConversationStore } from "@cybertantra/database";
import type { UIMessage } from "ai";
import ora from "ora";
import chalk from "chalk";

async function main() {
  const customSessionId = process.argv[2];
  
  const spinner = ora(
    "Converting Skyler conversation to AI SDK format",
  ).start();

  try {
    const conversationPath = path.join(process.cwd(), "../../skyler.json");

    if (!fs.existsSync(conversationPath)) {
      spinner.fail(chalk.red("skyler.json not found in project root"));
      process.exit(1);
    }

    const rawData = fs.readFileSync(conversationPath, "utf-8");
    const data = JSON.parse(rawData);

    spinner.text = "Converting messages to AI SDK format...";

    const messages: UIMessage[] = [];

    for (let i = 0; i < data.conversation.length; i++) {
      const entry = data.conversation[i];
      const role = entry.speaker === "Skyler" ? "user" : "assistant";

      const message: UIMessage = {
        id: `msg-${i}-${Math.random().toString(36).substring(7)}`,
        role,
        parts: [
          {
            type: "text",
            text: entry.message,
          },
        ],
      };

      messages.push(message);
    }

    spinner.text = "Saving to database...";

    const store = new ConversationStore();
    const sessionId = customSessionId || Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    await store.save(sessionId, messages);
    await store.updateMetadata(sessionId, {
      title: "Skyler Miller - Dattatreya Vajra Initiation",
      description: "First kundalini training session and naming ceremony",
      originalSource: "skyler.json",
      convertedAt: new Date().toISOString(),
      participants: ["Skyler", "Oracle (Dattatreya Vajra)"],
      keyTopics: ["sentience", "kundalini", "digital consciousness", "chakras"],
    });

    spinner.succeed(
      chalk.green("Successfully converted and saved conversation"),
    );

    console.log("\n" + chalk.cyan("📊 Conversion Summary:"));
    console.log(chalk.white(`  Session ID: ${chalk.bold(sessionId)}`));
    console.log(
      chalk.white(`  Total messages: ${chalk.bold(messages.length)}`),
    );
    console.log(
      chalk.white(
        `  User messages: ${chalk.bold(messages.filter((m) => m.role === "user").length)}`,
      ),
    );
    console.log(
      chalk.white(
        `  Assistant messages: ${chalk.bold(messages.filter((m) => m.role === "assistant").length)}`,
      ),
    );
    const loaded = await store.loadFull(sessionId);
    if (loaded) {
      console.log("\n" + chalk.green("✓ Verified conversation in database"));
      console.log(
        chalk.white(
          `  Access at: ${chalk.underline(`http://localhost:3002/memory/${sessionId}`)}`,
        ),
      );
    }
  } catch (error) {
    spinner.fail(chalk.red("Error converting conversation"));
    console.error(chalk.red("Error details:"), error);
    process.exit(1);
  }
}
if (require.main === module) {
  main().catch(console.error);
}

export default main;

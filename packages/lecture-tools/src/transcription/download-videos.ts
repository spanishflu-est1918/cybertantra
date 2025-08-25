#!/usr/bin/env bun
/* eslint-disable */

import { $ } from "bun";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

type Category = "lecture" | "meditation" | "video" | "show";

interface CategorizedVideo {
  title: string;
  link: string;
  thumbnail: string;
  duration?: string;
  category: Category;
}

// Sanitize filename for filesystem
function sanitizeFilename(title: string): string {
  return title
    .replace(/[<>:"/\\|?*]/g, "") // Remove invalid characters
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .substring(0, 200); // Limit length
}

// Create directory structure
async function setupDirectories(baseDir: string) {
  const categories: Category[] = ["lecture", "meditation", "video", "show"];

  for (const category of categories) {
    const categoryDir = path.join(baseDir, category);
    await mkdir(categoryDir, { recursive: true });
    console.log(`📁 Created directory: ${categoryDir}`);
  }
}

// Main download function
async function main() {
  // Check if input is from file or stdin
  const args = process.argv.slice(2);
  let inputFile: string | null = null;
  let input: string;

  if (args.length > 0 && existsSync(args[0])) {
    // Input is a file path
    inputFile = args[0];
    input = await Bun.file(inputFile).text();
    console.log(`📂 Reading from file: ${inputFile}`);
  } else if (args.length === 0 && !process.stdin.isTTY) {
    // Input is from stdin
    input = await Bun.stdin.text();
  } else {
    // Show usage
    console.log(`
Usage: pnpm download-videos < selected-videos.json
   or: pnpm download-videos selected-videos.json

Example:
  pnpm download-videos meditations.json
    `);
    process.exit(1);
  }

  let videos: CategorizedVideo[];
  try {
    videos = JSON.parse(input);
  } catch (error) {
    console.error("❌ Invalid JSON input. Please provide a valid JSON array.");
    console.error("Usage: pnpm download-videos < selected-videos.json");
    console.error("   or: pnpm download-videos selected-videos.json");
    process.exit(1);
  }

  if (!Array.isArray(videos) || videos.length === 0) {
    console.error("❌ No videos provided");
    process.exit(1);
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`📥 YOUTUBE VIDEO DOWNLOADER`);
  console.log(`${"═".repeat(60)}`);
  console.log(`\n📊 Found ${videos.length} videos to download`);
  console.log("");

  // Group by category for summary
  const categoryCounts = videos.reduce(
    (acc, video) => {
      acc[video.category] = (acc[video.category] || 0) + 1;
      return acc;
    },
    {} as Record<Category, number>,
  );

  console.log("📂 Videos by category:");
  const categoryEmojis = {
    lecture: "🎓",
    meditation: "🧘",
    video: "📺",
    show: "🎭",
  };
  Object.entries(categoryCounts).forEach(([category, count]) => {
    const emoji = categoryEmojis[category as Category] || "📁";
    console.log(`   ${emoji} ${category.toUpperCase()}: ${count} videos`);
  });
  console.log(`${"─".repeat(60)}\n`);

  // Setup directories
  const baseDir = path.join(process.cwd(), "downloads");
  await setupDirectories(baseDir);

  console.log(`\n${"═".repeat(60)}`);
  console.log(`📥 DOWNLOADING VIDEOS ONE BY ONE`);
  console.log(`${"═".repeat(60)}\n`);

  const startTime = Date.now();
  let successful = 0;
  let failed = 0;
  const failedVideos: CategorizedVideo[] = [];

  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    const sanitizedTitle = sanitizeFilename(video.title);
    const audioDir = path.join(baseDir, video.category, sanitizedTitle);

    // Skip if already downloaded
    if (existsSync(audioDir)) {
      console.log(
        `\n[${i + 1}/${videos.length}] Skipping (already exists): ${video.title}`,
      );
      successful++;
      continue;
    }

    console.log(`\n[${i + 1}/${videos.length}] Downloading: ${video.title}`);
    
    // Download
    console.log(`   📥 Downloading audio...`);
    try {
      await mkdir(audioDir, { recursive: true });
      await $`pnpm cli:youtube ${video.link} -o ${audioDir}`;
      console.log(`   ✅ Downloaded to: ${audioDir}`);
      successful++;
    } catch (error) {
      console.log(`   ❌ Download failed`);
      failed++;
      failedVideos.push(video);
      continue; // Skip to next video
    }

    // Progress update
    const progress = (((i + 1) / videos.length) * 100).toFixed(1);
    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log(`   Progress: ${progress}% | Elapsed: ${elapsed} min`);
    
    // Brief delay to avoid rate limiting
    if (i < videos.length - 1) {
      await Bun.sleep(2000);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  // Summary
  console.log(`\n${"═".repeat(60)}`);
  console.log(`📥 DOWNLOAD COMPLETE`);
  console.log(`${"═".repeat(60)}`);
  console.log(`\n📊 Final Results:`);
  console.log(
    `   ✅ Successful: ${successful}/${videos.length} (${((successful / videos.length) * 100).toFixed(1)}%)`,
  );
  console.log(
    `   ❌ Failed: ${failed}/${videos.length} (${((failed / videos.length) * 100).toFixed(1)}%)`,
  );
  console.log(`   ⏱️  Total time: ${totalTime} minutes`);

  if (failedVideos.length > 0) {
    console.log(`\n${"─".repeat(60)}`);
    console.log("❌ Failed videos:");
    failedVideos.forEach((video) => {
      console.log(`   • ${video.title}`);
      console.log(
        `     Category: ${video.category} | Duration: ${video.duration || "Unknown"}`,
      );
    });

    // Save failed videos for retry
    const failedFile = path.join(baseDir, "failed_downloads.json");
    await Bun.write(failedFile, JSON.stringify(failedVideos, null, 2));
    console.log(`\n💾 Failed videos saved to: ${failedFile}`);
    console.log(`   Run again with this file to retry failed downloads`);
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`✨ All done! Downloads saved to:`);
  console.log(`📁 ${baseDir}`);
  console.log(`${"═".repeat(60)}\n`);
}

// Run the script
if (import.meta.main) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
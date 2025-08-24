#!/usr/bin/env bun
/* eslint-disable */

import { $ } from "bun";
import { mkdir, exists, writeFile } from "fs/promises";
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

// Transcribe a single video
async function transcribeVideo(
  video: CategorizedVideo,
  baseDir: string,
  index: number,
  total: number,
): Promise<boolean> {
  const sanitizedTitle = sanitizeFilename(video.title);
  const outputDir = path.join(baseDir, video.category);
  const outputFile = path.join(outputDir, `${sanitizedTitle}.txt`);

  // Skip if already transcribed
  if (await exists(outputFile)) {
    console.log(
      `\n⏭️  [${index}/${total}] Skipping (already exists): ${video.title}`,
    );
    return true;
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`📝 [${index}/${total}] Starting transcription...`);
  console.log(`   📹 Title: ${video.title}`);
  console.log(`   🏷️  Category: ${video.category.toUpperCase()}`);
  console.log(`   ⏱️  Duration: ${video.duration || "Unknown"}`);
  console.log(`   🔗 URL: ${video.link}`);
  console.log(`${"─".repeat(60)}`);

  const startTime = Date.now();
  process.stdout.write(`   ⏳ Transcribing...`);

  try {
    // Step 1: Download audio using youtube command (single video only, not playlist)
    const audioDir = path.join(baseDir, "audio_temp", `video_${index}`);
    await mkdir(audioDir, { recursive: true });

    console.log(`   📥 Downloading audio...`);
    // The youtube command already has --no-playlist flag in download-youtube.ts
    await $`pnpm cli:youtube ${video.link} -o ${audioDir}`;

    // Step 2: Transcribe the downloaded audio
    console.log(`   🎙️  Transcribing audio...`);
    await $`pnpm cli:transcribe process -d ${audioDir} -y`;

    // Step 3: Find and move the transcript to the right category folder
    const files = await Bun.$`ls ${audioDir}/*.txt`.text();
    const transcriptFile = files.trim().split("\n")[0]; // Get first .txt file

    if (transcriptFile) {
      const content = await Bun.file(transcriptFile).text();
      await writeFile(outputFile, content);

      // Clean up temp files
      await $`rm -rf ${audioDir}`;
    } else {
      throw new Error("No transcript file generated");
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    process.stdout.write(`\r   ✅ Success! (${elapsed}s)\n`);
    console.log(`   💾 Saved to: ${outputFile}`);
    return true;
  } catch (error: any) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    process.stdout.write(`\r   ❌ Failed! (${elapsed}s)\n`);

    // Show more detailed error information
    if (error.stderr) {
      console.error(`   Error output: ${error.stderr}`);
    }
    if (error.stdout) {
      console.error(`   Output: ${error.stdout}`);
    }
    console.error(`   Error: ${error.message || error}`);

    // Try alternative: direct youtube-dl command
    console.log(`   🔄 Trying alternative method with yt-dlp...`);
    try {
      const altResult =
        await $`yt-dlp --write-auto-sub --sub-lang en --skip-download --sub-format txt "${video.link}" -o "${outputDir}/%(title)s.%(ext)s"`;
      console.log(`   ✅ Alternative method succeeded`);
      return true;
    } catch (altError: any) {
      console.error(
        `   ❌ Alternative method also failed: ${altError.message || altError}`,
      );
    }

    return false;
  }
}

// Main transcription function
async function main() {
  // Check if input is from file or stdin
  const args = process.argv.slice(2);
  let inputFile: string | null = null;
  let input: string;

  if (args.length > 0 && (await exists(args[0]))) {
    // Input is a file path
    inputFile = args[0];
    input = await Bun.file(inputFile).text();
    console.log(`📂 Reading from file: ${inputFile}`);
  } else {
    // Input is from stdin
    input = await Bun.stdin.text();
  }

  let videos: CategorizedVideo[];
  try {
    videos = JSON.parse(input);
  } catch (error) {
    console.error("❌ Invalid JSON input. Please provide a valid JSON array.");
    console.error("Usage: pnpm transcribe-videos < selected-videos.json");
    console.error("   or: pnpm transcribe-videos selected-videos.json");
    process.exit(1);
  }

  if (!Array.isArray(videos) || videos.length === 0) {
    console.error("❌ No videos provided");
    process.exit(1);
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`🎬 YOUTUBE VIDEO TRANSCRIPTION TOOL`);
  console.log(`${"═".repeat(60)}`);
  console.log(`\n📊 Found ${videos.length} videos to process\n`);

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
  const baseDir = path.join(process.cwd(), "transcriptions");
  await setupDirectories(baseDir);

  // Transcribe videos with progress tracking
  let successful = 0;
  let failed = 0;
  const failedVideos: CategorizedVideo[] = [];

  const startTime = Date.now();
  let remainingVideos = [...videos];

  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];

    console.log(`\n🎯 Currently processing: "${video.title}"`);

    const success = await transcribeVideo(video, baseDir, i + 1, videos.length);
    if (success) {
      successful++;

      // Remove completed video from remaining list
      remainingVideos = remainingVideos.filter((v) => v.link !== video.link);

      // Update the input file if it exists
      if (inputFile) {
        await writeFile(inputFile, JSON.stringify(remainingVideos, null, 2));
        console.log(
          `   📝 Updated ${inputFile} - ${remainingVideos.length} videos remaining`,
        );
      }
    } else {
      failed++;
      failedVideos.push(video);
    }

    // Progress update
    const progress = (((i + 1) / videos.length) * 100).toFixed(1);
    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log(
      `\n⏱️  Progress: ${progress}% (${i + 1}/${videos.length}) - Elapsed: ${elapsed} minutes`,
    );
    console.log(
      `   ✅ ${successful} successful | ❌ ${failed} failed | 📋 ${remainingVideos.length} remaining`,
    );

    // Add delay to avoid rate limiting
    if (i < videos.length - 1) {
      console.log(`   ⏸️  Waiting 2 seconds before next video...`);
      await Bun.sleep(2000);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  // Summary
  console.log(`\n${"═".repeat(60)}`);
  console.log(`📈 TRANSCRIPTION COMPLETE`);
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
    const failedFile = path.join(baseDir, "failed_videos.json");
    await writeFile(failedFile, JSON.stringify(failedVideos, null, 2));
    console.log(`\n💾 Failed videos saved to: ${failedFile}`);
    console.log(`   Run again with this file to retry failed videos`);
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`✨ All done! Transcriptions saved to:`);
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

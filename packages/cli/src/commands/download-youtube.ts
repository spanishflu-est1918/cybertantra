#!/usr/bin/env bun

import YTDlpWrap from 'yt-dlp-wrap';
import path from 'path';
import fs from 'fs/promises';
import { program } from 'commander';

const ytdlp = new YTDlpWrap();

program
  .name('download-youtube')
  .description('Download audio from YouTube URLs')
  .version('1.0.0');

program
  .argument('<urls...>', 'YouTube URLs to download')
  .option('-o, --output <directory>', 'Output directory', './audio')
  .option('--format <format>', 'Audio format', 'opus')
  .action(async (urls: string[], options) => {
    console.log(`📥 Downloading ${urls.length} YouTube videos as audio...`);
    
    // Ensure output directory exists
    await fs.mkdir(options.output, { recursive: true });
    
    for (const [index, url] of urls.entries()) {
      console.log(`\n[${index + 1}/${urls.length}] Processing: ${url}`);
      
      try {
        // Get video info first to get title for filename
        // Use yt-dlp's own title extraction - no pre-fetch
        const outputTemplate = path.join(options.output, `%(title)s.%(ext)s`);
        
        console.log(`   📥 Downloading from: ${url}`);
        
        // Download audio only with better format selection
        await ytdlp.exec([
          url,
          '-x', // Extract audio
          '--audio-format', options.format,
          '--audio-quality', '0', // Best quality
          '-f', 'bestaudio/best', // Better format selection
          '-o', outputTemplate,
          '--no-playlist', // Don't download entire playlist
          '--ignore-errors', // Continue on errors
          '--restrict-filenames', // Sanitize filename
          '--quiet',
          '--progress'
        ]);
        
        console.log(`   ✅ Downloaded successfully`);
        
      } catch (error) {
        console.error(`   ❌ Failed to download ${url}:`, error);
      }
    }
    
    console.log(`\n🎉 Download complete! Audio files saved to: ${options.output}`);
    console.log(`\n🎙️  Next steps:`);
    console.log(`   1. Run: bun run transcribe scan -d ${options.output}`);
    console.log(`   2. Run: bun run transcribe process -d ${options.output}`);
    console.log(`   3. Run: bun run cli:ingest`);
  });

// Parse arguments
program.parse(process.argv);
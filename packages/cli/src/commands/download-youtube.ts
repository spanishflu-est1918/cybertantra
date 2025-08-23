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
        const info = await ytdlp.getVideoInfo(url);
        const sanitizedTitle = info.title
          .replace(/[^\w\s-]/g, '') // Remove special chars
          .replace(/\s+/g, '_')     // Replace spaces with underscores
          .toLowerCase();
        
        const filename = `${sanitizedTitle}.${options.format}`;
        const outputPath = path.join(options.output, filename);
        
        console.log(`   📝 Title: ${info.title}`);
        console.log(`   💾 Saving as: ${filename}`);
        
        // Download audio only with better format selection
        await ytdlp.exec([
          url,
          '-x', // Extract audio
          '--audio-format', options.format,
          '--audio-quality', '0', // Best quality
          '-f', 'bestaudio/best', // Better format selection
          '-o', outputPath,
          '--no-playlist', // Don't download entire playlist
          '--ignore-errors', // Continue on errors
          '--extract-flat', false, // Don't extract flat playlist
        ]);
        
        console.log(`   ✅ Downloaded: ${filename}`);
        
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

// Also support direct execution without commander for simple use
if (process.argv.length === 3 && process.argv[2].startsWith('http')) {
  const url = process.argv[2];
  console.log(`📥 Quick download: ${url}`);
  
  (async () => {
    try {
      await fs.mkdir('./audio', { recursive: true });
      
      const info = await ytdlp.getVideoInfo(url);
      const filename = info.title
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '_')
        .toLowerCase() + '.opus';
      
      console.log(`📝 ${info.title}`);
      console.log(`💾 ${filename}`);
      
      await ytdlp.exec([
        url,
        '-x',
        '--audio-format', 'opus',
        '--audio-quality', '0',
        '-f', 'bestaudio/best',
        '-o', `./audio/${filename}`,
        '--no-playlist',
        '--ignore-errors',
      ]);
      
      console.log(`✅ Downloaded to ./audio/${filename}`);
    } catch (error) {
      console.error('❌ Download failed:', error);
    }
  })();
} else {
  program.parse(process.argv);
}
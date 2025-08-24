#!/usr/bin/env bun

import { $ } from 'bun'
import { mkdir, exists, writeFile } from 'fs/promises'
import path from 'path'

type Category = 'lecture' | 'meditation' | 'video' | 'show'

interface CategorizedVideo {
  title: string
  link: string
  thumbnail: string
  duration?: string
  category: Category
}

// Extract video ID from YouTube URL
function getVideoId(url: string): string | null {
  const match = url.match(/[?&]v=([^&]+)/)
  if (match) return match[1]
  
  const shortMatch = url.match(/youtu\.be\/([^?]+)/)
  if (shortMatch) return shortMatch[1]
  
  return null
}

// Sanitize filename for filesystem
function sanitizeFilename(title: string): string {
  return title
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 200) // Limit length
}

// Create directory structure
async function setupDirectories(baseDir: string) {
  const categories: Category[] = ['lecture', 'meditation', 'video', 'show']
  
  for (const category of categories) {
    const categoryDir = path.join(baseDir, category)
    await mkdir(categoryDir, { recursive: true })
    console.log(`📁 Created directory: ${categoryDir}`)
  }
}

// Transcribe a single video
async function transcribeVideo(video: CategorizedVideo, baseDir: string): Promise<boolean> {
  const videoId = getVideoId(video.link)
  if (!videoId) {
    console.error(`❌ Could not extract video ID from: ${video.link}`)
    return false
  }
  
  const sanitizedTitle = sanitizeFilename(video.title)
  const outputDir = path.join(baseDir, video.category)
  const outputFile = path.join(outputDir, `${sanitizedTitle}.txt`)
  
  // Skip if already transcribed
  if (await exists(outputFile)) {
    console.log(`⏭️  Already transcribed: ${video.title}`)
    return true
  }
  
  console.log(`📝 Transcribing: ${video.title}`)
  console.log(`   Category: ${video.category}`)
  console.log(`   Video ID: ${videoId}`)
  
  try {
    // Use the CLI transcribe command
    const result = await $`pnpm cli:transcribe --url https://www.youtube.com/watch?v=${videoId}`.quiet()
    
    // Save the transcription to the appropriate folder
    await writeFile(outputFile, result.stdout)
    
    console.log(`   ✅ Saved to: ${outputFile}`)
    return true
    
  } catch (error) {
    console.error(`   ❌ Failed to transcribe: ${error}`)
    return false
  }
}

// Main transcription function
async function main() {
  // Get videos array from stdin or argument
  const input = await Bun.stdin.text()
  
  let videos: CategorizedVideo[]
  try {
    videos = JSON.parse(input)
  } catch (error) {
    console.error('❌ Invalid JSON input. Please pipe the selected videos array to this script.')
    console.error('Example: echo \'[{"title":"...", "link":"...", "category":"..."}]\' | bun run transcribe-videos.ts')
    process.exit(1)
  }
  
  if (!Array.isArray(videos) || videos.length === 0) {
    console.error('❌ No videos provided')
    process.exit(1)
  }
  
  console.log(`\n🎬 Found ${videos.length} videos to transcribe\n`)
  
  // Group by category for summary
  const categoryCounts = videos.reduce((acc, video) => {
    acc[video.category] = (acc[video.category] || 0) + 1
    return acc
  }, {} as Record<Category, number>)
  
  console.log('📊 Videos by category:')
  Object.entries(categoryCounts).forEach(([category, count]) => {
    console.log(`   ${category}: ${count}`)
  })
  console.log()
  
  // Setup directories
  const baseDir = path.join(process.cwd(), 'transcriptions')
  await setupDirectories(baseDir)
  
  // Transcribe videos with progress tracking
  let successful = 0
  let failed = 0
  const failedVideos: CategorizedVideo[] = []
  
  for (let i = 0; i < videos.length; i++) {
    const video = videos[i]
    console.log(`\n[${i + 1}/${videos.length}] Processing...`)
    
    const success = await transcribeVideo(video, baseDir)
    if (success) {
      successful++
    } else {
      failed++
      failedVideos.push(video)
    }
    
    // Add delay to avoid rate limiting
    if (i < videos.length - 1) {
      await Bun.sleep(2000)
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📈 Transcription Summary:')
  console.log(`   ✅ Successful: ${successful}`)
  console.log(`   ❌ Failed: ${failed}`)
  
  if (failedVideos.length > 0) {
    console.log('\n❌ Failed videos:')
    failedVideos.forEach(video => {
      console.log(`   - ${video.title} (${video.category})`)
    })
    
    // Save failed videos for retry
    const failedFile = path.join(baseDir, 'failed_videos.json')
    await writeFile(failedFile, JSON.stringify(failedVideos, null, 2))
    console.log(`\n💾 Failed videos saved to: ${failedFile}`)
  }
  
  console.log('\n✨ Transcription complete!')
  console.log(`📁 Output directory: ${baseDir}`)
}

// Run the script
if (import.meta.main) {
  main().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}
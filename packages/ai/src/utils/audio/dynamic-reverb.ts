import ffmpeg from 'fluent-ffmpeg';
import { exec } from 'child_process';
import { promisify } from 'util';
import { AUDIO_CONFIG } from '../../config/audio';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

/**
 * Apply dynamic reverb using Sox that changes over time
 * - Starts at 50% for first minute
 * - Gradually increases to 100% 
 * - Fades back down in last 30 seconds
 */
export async function applyDynamicReverb(
  inputPath: string,
  outputPath: string,
  options: {
    reverberance?: number;
    wetGain?: number;
    damping?: number;
    roomScale?: number;
  } = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('🌊 Applying dynamic reverb effect...');
    
    // Get audio duration first
    ffmpeg.ffprobe(inputPath, async (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      
      const duration = metadata.format.duration || 0;
      console.log(`  Audio duration: ${duration.toFixed(1)}s`);
      
      const reverberance = options.reverberance ?? AUDIO_CONFIG.reverb.reverberance;
      const wetGain = options.wetGain ?? AUDIO_CONFIG.reverb.wetGain;
      const damping = options.damping ?? AUDIO_CONFIG.reverb.damping;
      const roomScale = options.roomScale ?? AUDIO_CONFIG.reverb.roomScale;
      
      try {
        // Create temp directory for processing
        const tempDir = path.join(path.dirname(outputPath), `temp_reverb_${Date.now()}`);
        await fs.mkdir(tempDir, { recursive: true });
        
        // Create three versions with different reverb intensities
        const halfReverbPath = path.join(tempDir, 'half_reverb.mp3');
        const fullReverbPath = path.join(tempDir, 'full_reverb.mp3');
        const fadeReverbPath = path.join(tempDir, 'fade_reverb.mp3');
        
        const soxPath = '/opt/homebrew/bin/sox';
        const stereoDepth = AUDIO_CONFIG.reverb.stereoDepth;
        const preDelay = AUDIO_CONFIG.reverb.preDelay;
        
        // Create 50% reverb (wetGain - 3dB for reduced volume, clamped to -10 minimum)
        const halfWetGain = Math.max(-10, wetGain - 3);
        const halfCommand = `${soxPath} "${inputPath}" "${halfReverbPath}" reverb ${reverberance} ${damping} ${roomScale} ${stereoDepth} ${preDelay} ${halfWetGain}`;
        
        // Create 100% reverb (normal wetGain)
        const fullCommand = `${soxPath} "${inputPath}" "${fullReverbPath}" reverb ${reverberance} ${damping} ${roomScale} ${stereoDepth} ${preDelay} ${wetGain}`;
        
        // Create fade version (same as half for ending)
        const fadeCommand = `${soxPath} "${inputPath}" "${fadeReverbPath}" reverb ${reverberance} ${damping} ${roomScale} ${stereoDepth} ${preDelay} ${halfWetGain}`;
        
        console.log(`  Creating three reverb versions with Sox...`);
        console.log(`  Half reverb: wetGain=${halfWetGain}dB`);
        console.log(`  Full reverb: wetGain=${wetGain}dB`);
        console.log(`  Fade reverb: wetGain=${halfWetGain}dB`);
        
        await execAsync(halfCommand);
        await execAsync(fullCommand);
        await execAsync(fadeCommand);
        
        // Now crossfade between the three reverb versions
        // For first 60s: use half reverb
        // 60-90s: crossfade from half to full
        // 90s-(end-30s): use full reverb
        // last 30s: crossfade from full to half
        
        if (duration <= 60) {
          // Short meditation: just use half reverb throughout
          await fs.copyFile(halfReverbPath, outputPath);
          console.log('✅ Applied constant 50% reverb for short meditation');
        } else {
          // Longer meditation: crossfade between versions
          const fadeUpStart = 60;
          const fadeUpDuration = 30;
          const fadeDownStart = Math.max(90, duration - 30);
          const fadeDownDuration = Math.min(30, duration - fadeDownStart);
          
          console.log(`  Crossfade timeline:`);
          console.log(`    0-${fadeUpStart}s: 50% reverb`);
          console.log(`    ${fadeUpStart}-${fadeUpStart + fadeUpDuration}s: fade to 100%`);
          console.log(`    ${fadeUpStart + fadeUpDuration}-${fadeDownStart}s: 100% reverb`);
          console.log(`    ${fadeDownStart}-${duration}s: fade back to 50%`);
          
          // Create segments and crossfade between them
          const segment1Path = path.join(tempDir, 'seg1.mp3');
          const segment2Path = path.join(tempDir, 'seg2.mp3');
          const segment3Path = path.join(tempDir, 'seg3.mp3');
          const segment4Path = path.join(tempDir, 'seg4.mp3');
          
          // Extract segments from each reverb version
          // Segment 1: 0-60s from half reverb
          await new Promise<void>((res, rej) => {
            ffmpeg()
              .input(halfReverbPath)
              .outputOptions(['-t', `${fadeUpStart}`])
              .audioCodec('copy')
              .output(segment1Path)
              .on('end', res)
              .on('error', rej)
              .run();
          });
          
          // Segment 2: 60-90s crossfade from half to full
          await new Promise<void>((res, rej) => {
            ffmpeg()
              .input(halfReverbPath)
              .input(fullReverbPath)
              .complexFilter(
                `[0:a]atrim=${fadeUpStart}:${fadeUpStart + fadeUpDuration},afade=t=out:st=0:d=${fadeUpDuration}[half_fade];` +
                `[1:a]atrim=${fadeUpStart}:${fadeUpStart + fadeUpDuration},afade=t=in:st=0:d=${fadeUpDuration}[full_fade];` +
                `[half_fade][full_fade]amix=inputs=2[crossfade]`
              )
              .outputOptions(['-map', '[crossfade]'])
              .audioCodec('libmp3lame')
              .audioBitrate('192k')
              .output(segment2Path)
              .on('end', res)
              .on('error', rej)
              .run();
          });
          
          // Segment 3: 90s-(end-30s) from full reverb
          if (fadeDownStart > fadeUpStart + fadeUpDuration) {
            await new Promise<void>((res, rej) => {
              ffmpeg()
                .input(fullReverbPath)
                .outputOptions([
                  '-ss', `${fadeUpStart + fadeUpDuration}`,
                  '-t', `${fadeDownStart - (fadeUpStart + fadeUpDuration)}`
                ])
                .audioCodec('copy')
                .output(segment3Path)
                .on('end', res)
                .on('error', rej)
                .run();
            });
          }
          
          // Segment 4: last 30s crossfade from full to half
          await new Promise<void>((res, rej) => {
            ffmpeg()
              .input(fullReverbPath)
              .input(fadeReverbPath)
              .complexFilter(
                `[0:a]atrim=${fadeDownStart}:${duration},afade=t=out:st=0:d=${fadeDownDuration}[full_fade];` +
                `[1:a]atrim=${fadeDownStart}:${duration},afade=t=in:st=0:d=${fadeDownDuration}[half_fade];` +
                `[full_fade][half_fade]amix=inputs=2[crossfade]`
              )
              .outputOptions(['-map', '[crossfade]'])
              .audioCodec('libmp3lame')
              .audioBitrate('192k')
              .output(segment4Path)
              .on('end', res)
              .on('error', rej)
              .run();
          });
          
          // Concatenate all segments
          const concatList = path.join(tempDir, 'concat.txt');
          const segments = [segment1Path, segment2Path];
          if (fadeDownStart > fadeUpStart + fadeUpDuration) {
            segments.push(segment3Path);
          }
          segments.push(segment4Path);
          
          await fs.writeFile(concatList, segments.map(s => `file '${s}'`).join('\n'));
          
          await new Promise<void>((res, rej) => {
            ffmpeg()
              .input(concatList)
              .inputOptions(['-f', 'concat', '-safe', '0'])
              .audioCodec('copy')
              .output(outputPath)
              .on('end', () => {
                console.log('✅ Dynamic reverb with crossfading applied successfully');
                res();
              })
              .on('error', rej)
              .run();
          });
        }
        
        // Clean up temp directory
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
        
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}
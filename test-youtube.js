import YTDlpWrap from 'yt-dlp-wrap';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Test 1: Direct exec
console.log('Test 1: Direct exec command');
try {
  const result = await execAsync('yt-dlp --version');
  console.log('Direct exec works:', result.stdout);
} catch (e) {
  console.error('Direct exec failed:', e);
}

// Test 2: yt-dlp-wrap
console.log('\nTest 2: yt-dlp-wrap');
try {
  const ytdlp = new YTDlpWrap();
  const version = await ytdlp.getVersion();
  console.log('yt-dlp-wrap works, version:', version);
} catch (e) {
  console.error('yt-dlp-wrap failed:', e);
}

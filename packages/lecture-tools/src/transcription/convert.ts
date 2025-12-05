import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

export interface ConversionOptions {
  outputFormat?: "mp3" | "wav" | "m4a" | "ogg" | "flac";
  bitrate?: string; // e.g., "192k", "320k"
  sampleRate?: number; // e.g., 44100, 48000
  channels?: 1 | 2; // mono or stereo
  normalize?: boolean; // normalize audio levels
}

export interface ConversionResult {
  success: boolean;
  outputPath?: string;
  inputFormat?: string;
  outputFormat?: string;
  duration?: number; // seconds
  error?: string;
}

/**
 * Get audio file metadata using ffprobe
 */
export async function getAudioInfo(
  filePath: string,
): Promise<{
  format: string;
  duration: number;
  bitrate: number;
  sampleRate: number;
  channels: number;
}> {
  const cmd = `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`;

  try {
    const { stdout } = await execAsync(cmd);
    const info = JSON.parse(stdout);
    const audioStream = info.streams?.find(
      (s: any) => s.codec_type === "audio",
    );

    return {
      format: info.format?.format_name || "unknown",
      duration: parseFloat(info.format?.duration || "0"),
      bitrate: parseInt(info.format?.bit_rate || "0", 10),
      sampleRate: parseInt(audioStream?.sample_rate || "0", 10),
      channels: parseInt(audioStream?.channels || "0", 10),
    };
  } catch (error) {
    throw new Error(
      `Failed to get audio info: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Check if ffmpeg is available
 */
export async function checkFfmpeg(): Promise<boolean> {
  try {
    await execAsync("ffmpeg -version");
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert audio file to a different format
 * Handles iPhone Voice Memos (.m4a) and other common formats
 */
export async function convertAudio(
  inputPath: string,
  options: ConversionOptions = {},
): Promise<ConversionResult> {
  const {
    outputFormat = "mp3",
    bitrate = "192k",
    sampleRate = 44100,
    channels = 1, // mono is fine for voice
    normalize = true,
  } = options;

  // Check ffmpeg availability
  const hasFfmpeg = await checkFfmpeg();
  if (!hasFfmpeg) {
    return {
      success: false,
      error: "ffmpeg is not installed. Please install it with: brew install ffmpeg",
    };
  }

  // Check input file exists
  try {
    await fs.access(inputPath);
  } catch {
    return {
      success: false,
      error: `Input file not found: ${inputPath}`,
    };
  }

  // Get input file info
  let inputInfo;
  try {
    inputInfo = await getAudioInfo(inputPath);
  } catch (error) {
    return {
      success: false,
      error: `Failed to read input file: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }

  // Determine output path
  const inputDir = path.dirname(inputPath);
  const inputBase = path.basename(inputPath, path.extname(inputPath));
  const outputPath = path.join(inputDir, `${inputBase}.${outputFormat}`);

  // Build ffmpeg command
  const filters: string[] = [];

  // Add normalization filter if requested
  if (normalize) {
    filters.push("loudnorm=I=-16:TP=-1:LRA=11");
  }

  const filterArg = filters.length > 0 ? `-af "${filters.join(",")}"` : "";

  // Codec selection based on output format
  const codecMap: Record<string, string> = {
    mp3: "libmp3lame",
    wav: "pcm_s16le",
    m4a: "aac",
    ogg: "libvorbis",
    flac: "flac",
  };

  const codec = codecMap[outputFormat] || "libmp3lame";

  // Build command
  let cmd = `ffmpeg -y -i "${inputPath}" -vn`; // -vn removes video stream
  cmd += ` -acodec ${codec}`;
  cmd += ` -ar ${sampleRate}`;
  cmd += ` -ac ${channels}`;

  if (outputFormat !== "wav" && outputFormat !== "flac") {
    cmd += ` -b:a ${bitrate}`;
  }

  if (filterArg) {
    cmd += ` ${filterArg}`;
  }

  cmd += ` "${outputPath}"`;

  console.log(`🔄 Converting ${path.basename(inputPath)} to ${outputFormat}...`);

  try {
    await execAsync(cmd);

    // Get output file info
    const outputInfo = await getAudioInfo(outputPath);

    console.log(`✅ Converted successfully: ${path.basename(outputPath)}`);

    return {
      success: true,
      outputPath,
      inputFormat: inputInfo.format,
      outputFormat,
      duration: outputInfo.duration,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: `Conversion failed: ${errorMsg}`,
    };
  }
}

/**
 * Convert iPhone Voice Memo to transcription-ready format
 * iPhone Voice Memos are typically .m4a files
 */
export async function convertVoiceMemo(
  inputPath: string,
  outputDir?: string,
): Promise<ConversionResult> {
  const ext = path.extname(inputPath).toLowerCase();

  // Check if already in a supported format that doesn't need conversion
  const supportedFormats = [".mp3", ".wav", ".flac"];
  if (supportedFormats.includes(ext)) {
    console.log(`✅ File is already in ${ext} format, no conversion needed`);
    return {
      success: true,
      outputPath: inputPath,
      inputFormat: ext.slice(1),
      outputFormat: ext.slice(1),
    };
  }

  // Determine output path
  let outputPath: string;
  if (outputDir) {
    await fs.mkdir(outputDir, { recursive: true });
    const baseName = path.basename(inputPath, ext);
    outputPath = path.join(outputDir, `${baseName}.mp3`);
  } else {
    const inputDir = path.dirname(inputPath);
    const baseName = path.basename(inputPath, ext);
    outputPath = path.join(inputDir, `${baseName}.mp3`);
  }

  // Convert with optimized settings for voice transcription
  return convertAudio(inputPath, {
    outputFormat: "mp3",
    bitrate: "128k", // Good enough for voice
    sampleRate: 16000, // 16kHz is standard for speech recognition
    channels: 1, // Mono for voice
    normalize: true,
  });
}

/**
 * Batch convert multiple audio files
 */
export async function batchConvert(
  inputPaths: string[],
  options: ConversionOptions = {},
): Promise<ConversionResult[]> {
  const results: ConversionResult[] = [];

  for (let i = 0; i < inputPaths.length; i++) {
    const inputPath = inputPaths[i];
    console.log(`\n[${i + 1}/${inputPaths.length}] Processing ${path.basename(inputPath)}`);

    const result = await convertAudio(inputPath, options);
    results.push(result);
  }

  return results;
}

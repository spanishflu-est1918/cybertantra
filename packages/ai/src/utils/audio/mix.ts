import ffmpeg from "fluent-ffmpeg";
import { AUDIO_CONFIG } from "../../config/audio";

/**
 * Mix voice with looping background music
 */
export async function mixVoiceWithMusic(
  voicePath: string,
  musicPath: string,
  outputPath: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`🎚️ Music volume being applied: ${AUDIO_CONFIG.musicVolume}`);
    console.log(`🎛️ Applying sidechain compression to duck music under voice`);

    // Apply sidechain compression to duck music when voice is present
    // Split voice into two streams: one for sidechain control, one for mixing
    const filterComplex =
      `[0:a]aformat=channel_layouts=stereo,asplit=2[voice_sc][voice_mix];` +
      `[1:a]aformat=channel_layouts=stereo,aloop=loop=-1:size=2e+09[music_loop];` +
      `[music_loop][voice_sc]sidechaincompress=threshold=${AUDIO_CONFIG.sidechain.threshold}:ratio=${AUDIO_CONFIG.sidechain.ratio}:attack=${AUDIO_CONFIG.sidechain.attack}:release=${AUDIO_CONFIG.sidechain.release}[music_ducked];` +
      `[voice_mix][music_ducked]amix=inputs=2:duration=first:dropout_transition=0:weights='1 ${AUDIO_CONFIG.musicVolume}'[final]`;

    ffmpeg()
      .input(voicePath)
      .input(musicPath)
      .complexFilter(filterComplex)
      .outputOptions(["-map", "[final]"])
      .audioCodec("libmp3lame")
      .audioBitrate("192k")
      .output(outputPath)
      .on("end", () => {
        console.log("✅ Mix complete with sidechain compression");
        resolve();
      })
      .on("error", reject)
      .run();
  });
}

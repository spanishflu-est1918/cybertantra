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
    console.log(
      `⏱️ Delaying voice by ${AUDIO_CONFIG.silenceBeforeVoice} seconds`,
    );
    console.log(
      `🎵 Music will fade out over last ${AUDIO_CONFIG.fadeOutDuration} seconds`,
    );

    // Get voice duration to calculate fade timing
    ffmpeg.ffprobe(voicePath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      
      const voiceDuration = metadata.format.duration || 0;
      // Music continues for a few seconds after voice ends, THEN fades
      const musicExtension = 3; // Continue music for 3 seconds after voice ends
      const totalDuration = voiceDuration + AUDIO_CONFIG.silenceBeforeVoice + musicExtension;
      const fadeStartTime = voiceDuration + AUDIO_CONFIG.silenceBeforeVoice - 5; // Start fade 5 seconds before voice ends
      
      // Apply sidechain compression to duck music when voice is present
      // Delay voice by 3 seconds using adelay filter
      // Apply fade-out to music that extends beyond voice
      const delayMs = AUDIO_CONFIG.silenceBeforeVoice * 1000;
      const filterComplex =
        `[0:a]aformat=channel_layouts=stereo,adelay=${delayMs}|${delayMs},apad=whole_dur=${totalDuration},asplit=2[voice_sc][voice_mix];` +
        `[1:a]aformat=channel_layouts=stereo,aloop=loop=-1:size=2e+09,afade=t=out:st=${fadeStartTime}:d=${AUDIO_CONFIG.fadeOutDuration}[music_loop];` +
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
          console.log("✅ Mix complete with sidechain compression and music fade-out");
          resolve();
        })
        .on("error", reject)
        .run();
    });
  });
}

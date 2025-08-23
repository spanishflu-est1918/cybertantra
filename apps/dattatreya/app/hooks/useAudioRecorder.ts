import { useState, useRef, useCallback } from "react";

interface RecordingOptions {
  onTranscript?: (audioDataUrl: string) => void;
  skipTranscription?: boolean;
  skipDownload?: boolean;
}

export function useAudioRecorder(options: RecordingOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    setIsRecording(true);
    audioChunksRef.current = [];

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("getUserMedia not supported");
      }

      const stream = await navigator.mediaDevices
        .getUserMedia({ audio: true })
        .catch((err) => {
          console.error("getUserMedia error:", err);
          throw err;
        });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm;codecs=opus",
        });

        // Download audio file if not skipped
        if (!options.skipDownload) {
          const url = URL.createObjectURL(audioBlob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `audio-${Date.now()}.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }

        // Pass audio blob directly to callback for integration with chat system
        if (!options.skipTranscription && options.onTranscript) {
          setIsTranscribing(true);
          try {
            // Convert Blob to base64 data URL for FilePart
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              options.onTranscript!(dataUrl);
              setIsTranscribing(false);
            };
            reader.onerror = () => {
              console.error("Error reading audio blob");
              setIsTranscribing(false);
            };
            reader.readAsDataURL(audioBlob);
          } catch (error) {
            console.error("Audio processing error:", error);
            setIsTranscribing(false);
          }
        }

        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(1000); // Request data every 1000ms
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setIsRecording(false);
    }
  }, [options]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    } else {
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    toggleRecording,
    isSupported:
      typeof navigator !== "undefined" &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia,
  };
}

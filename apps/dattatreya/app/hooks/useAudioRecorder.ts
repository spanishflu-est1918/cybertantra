import { useState, useRef, useCallback } from 'react';

interface RecordingOptions {
  onTranscript?: (text: string) => void;
  skipTranscription?: boolean;
  skipDownload?: boolean;
}

export function useAudioRecorder(options: RecordingOptions = {}) {
  console.log('🎨 useAudioRecorder initialized with options:', options);
  const [isRecording, setIsRecording] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    console.log('🎤 Starting recording with options:', options);
    setIsRecording(true);
    audioChunksRef.current = [];
    
    try {
      console.log('📱 Requesting microphone access...');
      console.log('Navigator:', typeof navigator !== 'undefined');
      console.log('MediaDevices:', navigator?.mediaDevices);
      console.log('getUserMedia:', navigator?.mediaDevices?.getUserMedia);
      console.log('isSecureContext:', window.isSecureContext);
      console.log('Location:', window.location.protocol, window.location.hostname);
      
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia not supported');
      }
      
      console.log('🎯 Calling getUserMedia NOW...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(err => {
        console.error('getUserMedia error:', err);
        throw err;
      });
      console.log('✅ Got stream:', stream.getAudioTracks());
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      console.log('📹 MediaRecorder created, state:', mediaRecorder.state);

      mediaRecorder.ondataavailable = (event) => {
        console.log('📦 Data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('📊 Total chunks:', audioChunksRef.current.length);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('🛑 Recording stopped, chunks:', audioChunksRef.current.length);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('💾 Created blob, size:', audioBlob.size, 'bytes');
        
        // Download audio file if not skipped
        if (!options.skipDownload) {
          console.log('⬇️ Downloading audio file...');
          const url = URL.createObjectURL(audioBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `audio-${Date.now()}.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          console.log('✅ Download triggered');
        }
        
        // Transcribe if not skipped and callback provided
        console.log('📝 Transcription check:', { 
          skipTranscription: options.skipTranscription, 
          hasCallback: !!options.onTranscript,
          fullOptions: options
        });
        
        if (!options.skipTranscription && options.onTranscript) {
          try {
            console.log('🎯 Starting transcription...');
            setIsTranscribing(true);
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');
            
            console.log('📤 Sending to /api/transcribe...');
            const response = await fetch('/api/transcribe', {
              method: 'POST',
              body: formData,
            });

            console.log('📥 Response status:', response.status);
            if (response.ok) {
              const { text } = await response.json();
              console.log('📝 Transcript received:', text);
              if (text?.trim()) {
                options.onTranscript(text.trim());
              } else {
                console.warn('⚠️ Empty transcript received');
              }
            } else {
              const error = await response.text();
              console.error('❌ Transcription failed:', error);
            }
          } catch (error) {
            console.error('❌ Transcription error:', error);
          } finally {
            setIsTranscribing(false);
            console.log('✅ Transcription complete');
          }
        } else {
          console.log('⏭️ Skipping transcription');
        }
        
        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      console.log('▶️ Starting MediaRecorder...');
      mediaRecorder.start(1000); // Request data every 1000ms
      console.log('✅ MediaRecorder started, state:', mediaRecorder.state);
    } catch (error) {
      console.error('❌ Error accessing microphone:', error);
      setIsRecording(false);
    }
  }, [options]);

  const stopRecording = useCallback(() => {
    console.log('🔴 Stop recording called');
    console.log('📹 MediaRecorder state:', mediaRecorderRef.current?.state);
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.log('⏹️ Stopping MediaRecorder...');
      mediaRecorderRef.current.stop();
    } else {
      console.log('⚠️ MediaRecorder already inactive or null');
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
    isSupported: typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia,
  };
}
'use client';

import { useRef, useState } from 'react';

export default function TestRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = async () => {
    console.log('Starting recording...');
    setIsRecording(true);
    audioChunksRef.current = [];
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      
      streamRef.current = stream;
      console.log('Stream obtained:', stream.getAudioTracks());
      
      // Test audio levels to see if microphone is actually working
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const checkAudio = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        if (average > 0) {
          console.log('🎤 AUDIO DETECTED - Level:', Math.round(average));
        }
        if (isRecording) {
          setTimeout(checkAudio, 100);
        }
      };
      
      checkAudio();
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      console.log('MediaRecorder created, supported types:', {
        webm: MediaRecorder.isTypeSupported('audio/webm'),
        mp4: MediaRecorder.isTypeSupported('audio/mp4'),
        wav: MediaRecorder.isTypeSupported('audio/wav')
      });

      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available:', event.data.size, 'bytes, type:', event.data.type);
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('Recording stopped, total chunks:', audioChunksRef.current.length);
        
        // Log each chunk
        audioChunksRef.current.forEach((chunk, i) => {
          console.log(`Chunk ${i}: ${chunk.size} bytes, type: ${chunk.type}`);
        });
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('Final blob size:', audioBlob.size, 'bytes');
        
        // Create multiple download links to test
        const url = URL.createObjectURL(audioBlob);
        
        // Download as WebM (original)
        const a1 = document.createElement('a');
        a1.href = url;
        a1.download = `test-webm-${Date.now()}.webm`;
        a1.textContent = 'Download WebM';
        document.body.appendChild(a1);
        
        // Try different blob type
        const audioBlob2 = new Blob(audioChunksRef.current);
        const url2 = URL.createObjectURL(audioBlob2);
        const a2 = document.createElement('a');
        a2.href = url2;
        a2.download = `test-raw-${Date.now()}.webm`;
        a2.textContent = 'Download Raw';
        document.body.appendChild(a2);
        
        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            console.log('Stopping track:', track.label, track.readyState);
            track.stop();
          });
          streamRef.current = null;
        }
      };

      console.log('Starting MediaRecorder...');
      mediaRecorder.start(1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    console.log('Stopping recording...');
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Raw MediaRecorder Test</h1>
      
      <button 
        onClick={isRecording ? stopRecording : startRecording}
        style={{
          padding: '20px',
          fontSize: '18px',
          backgroundColor: isRecording ? 'red' : 'green',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>
      
      <div style={{ marginTop: '20px', color: '#666' }}>
        Status: {isRecording ? 'Recording...' : 'Idle'}
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h3>Instructions:</h3>
        <p>1. Click "Start Recording"</p>
        <p>2. Speak clearly for 3-5 seconds</p>
        <p>3. Click "Stop Recording"</p>
        <p>4. Check console for logs</p>
        <p>5. Download links will appear below</p>
      </div>
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';

export default function TestRecording() {
  const [mounted, setMounted] = useState(false);
  const { 
    isRecording, 
    startRecording, 
    stopRecording, 
    isSupported 
  } = useAudioRecorder();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleStartRecording = () => {
    startRecording({
      skipTranscription: true,
      skipDownload: false
    });
  };

  // Avoid hydration mismatch by only rendering after mount
  if (!mounted) {
    return (
      <div className="p-5 font-mono">
        <h1 className="text-2xl font-bold">Audio Recorder Test</h1>
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div className="p-5 font-mono">
        <h1 className="text-2xl font-bold">Audio Recording Not Supported</h1>
        <p>Your browser doesn't support audio recording.</p>
      </div>
    );
  }

  return (
    <div className="p-5 font-mono max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Audio Recorder Test</h1>
      
      {/* Recording Button */}
      <button 
        onClick={isRecording ? stopRecording : handleStartRecording}
        className={`px-10 py-5 text-lg font-bold text-white rounded-lg cursor-pointer transition-all ${
          isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-green-500 hover:bg-green-600'
        }`}
      >
        {isRecording ? '⏹ Stop Recording' : '⏺ Start Recording'}
      </button>
      
      {/* Status */}
      <div className={`mt-5 p-2.5 rounded-md ${
        isRecording ? 'bg-red-50 text-red-900' : 'bg-gray-100 text-gray-600'
      }`}>
        <strong>Status:</strong> {isRecording ? 'Recording...' : 'Ready'}
      </div>
      
      {/* Instructions */}
      <div className="mt-8 text-gray-600 text-sm">
        <h4 className="font-bold">How to use:</h4>
        <ol className="list-decimal list-inside leading-7">
          <li>Click "Start Recording"</li>
          <li>Allow microphone access when prompted</li>
          <li>Speak clearly into your microphone</li>
          <li>Click "Stop Recording" when done</li>
          <li>File automatically downloads as .webm</li>
        </ol>
      </div>
      
      {/* Info */}
      <div className="mt-5 p-4 bg-blue-50 rounded-lg border border-blue-300">
        <p className="m-0 text-blue-700 text-sm">
          💡 Recording will be saved as audio-[timestamp].webm in your Downloads folder
        </p>
      </div>
    </div>
  );
}
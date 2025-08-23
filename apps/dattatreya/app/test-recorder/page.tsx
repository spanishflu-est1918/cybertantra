'use client';

import { useState } from 'react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';

export default function TestRecorder() {
  const [downloadCount, setDownloadCount] = useState(0);

  const { 
    isRecording, 
    startRecording, 
    stopRecording, 
    isSupported 
  } = useAudioRecorder({
    skipDownload: false, // Enable download
    skipTranscription: true, // Skip transcription - just record
    onTranscript: () => {
      // Increment download count when recording stops
      setDownloadCount(prev => prev + 1);
    }
  });

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <h1 className="text-2xl font-bold mb-4">Audio Recorder Test</h1>
        <p className="text-red-400">
          Audio recording is not supported in your browser.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Audio File Recorder</h1>
        
        {/* Recording Controls */}
        <div className="text-center mb-8">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`px-8 py-4 text-xl font-bold rounded-lg transition-all ${
              isRecording
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-green-600 hover:bg-green-500 text-white'
            }`}
          >
            {isRecording ? '🔴 STOP RECORDING' : '🎙️ START RECORDING'}
          </button>
        </div>

        {/* Status */}
        <div className="mb-8 p-6 bg-gray-900 border border-gray-700 rounded-lg">
          <div className="grid grid-cols-2 gap-6 text-lg">
            <div className="text-center">
              <div className="text-gray-400">Status</div>
              <div className={isRecording ? 'text-red-400' : 'text-green-400'}>
                {isRecording ? '🔴 RECORDING' : '⭕ READY'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-400">Files Downloaded</div>
              <div className="text-white font-bold text-2xl">{downloadCount}</div>
            </div>
          </div>
        </div>

        {/* Recording Indicator */}
        {isRecording && (
          <div className="text-center mb-8">
            <div className="text-red-400 text-lg animate-pulse">
              🎙️ Recording in progress...
            </div>
            <div className="text-gray-400 text-sm mt-2">
              File will auto-download when you stop recording
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="p-6 bg-gray-900 border border-gray-700 rounded-lg">
          <h3 className="text-xl font-bold mb-4 text-green-400">Instructions:</h3>
          <ul className="space-y-2 text-gray-300">
            <li>• Click START RECORDING to begin audio capture</li>
            <li>• Speak or make sounds for your test</li>
            <li>• Click STOP RECORDING to finish</li>
            <li>• Audio file downloads automatically as .webm</li>
            <li>• No transcription - just pure file creation</li>
            <li>• Perfect for benchmarking transcription services</li>
          </ul>
        </div>

        {/* Debug Info */}
        <details className="mt-8">
          <summary className="cursor-pointer text-gray-400 hover:text-white">
            Debug Information
          </summary>
          <pre className="mt-4 p-4 bg-gray-900 border border-gray-700 rounded text-green-400 text-sm overflow-x-auto">
            {JSON.stringify({
              isRecording,
              isSupported,
              downloadCount,
              transcriptionDisabled: true
            }, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
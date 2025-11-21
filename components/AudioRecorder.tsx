import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, X, Loader2 } from 'lucide-react';

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  onCancel: () => void;
  isProcessing: boolean;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, onCancel, isProcessing }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const mimeTypeRef = useRef<string>('');

  useEffect(() => {
    startRecording();
    return () => {
      stopRecordingCleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Check for iOS supported MIME types
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/aac',
        'audio/ogg'
      ];
      
      let selectedMimeType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          break;
        }
      }
      
      // If no specific type is supported, leave undefined to let browser choose default
      const options = selectedMimeType ? { mimeType: selectedMimeType } : undefined;
      
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      mimeTypeRef.current = mediaRecorderRef.current.mimeType || selectedMimeType || '';
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        // Use the determined mime type for the blob
        const type = mimeTypeRef.current || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        onRecordingComplete(blob);
        stopRecordingCleanup();
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      timerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      onCancel();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const stopRecordingCleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (mediaRecorderRef.current?.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 z-50 animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] border-t border-gray-100">
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.8); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 20px rgba(239, 68, 68, 0); }
          100% { transform: scale(0.8); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>

      <div className="flex flex-col items-center justify-center space-y-8 pb-4">
        <div className="flex justify-between w-full items-center">
             <h3 className="font-semibold text-gray-900">
                {isProcessing ? 'Transcribing...' : 'New Audio Entry'}
             </h3>
             <button onClick={onCancel} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors" disabled={isProcessing}>
                <X size={20} className="text-gray-600" />
             </button>
        </div>

        {isProcessing ? (
           <div className="flex flex-col items-center py-4">
              <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
              <p className="text-gray-500 text-sm font-medium">Converting speech to text...</p>
           </div>
        ) : (
          <>
            <div className="relative mt-4">
              <div className="absolute inset-0 bg-red-500 rounded-full opacity-20 animate-[pulse-ring_2s_infinite]"></div>
              <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center relative z-10 shadow-lg shadow-red-200">
                <Mic size={32} className="text-white" />
              </div>
            </div>

            <div className="text-4xl font-mono font-bold text-gray-900 tabular-nums tracking-tight">
              {formatDuration(duration)}
            </div>

            <button 
              onClick={stopRecording}
              className="flex items-center justify-center space-x-2 bg-black text-white w-full py-4 rounded-2xl font-semibold active:scale-[0.98] transition-transform"
            >
              <Square fill="currentColor" size={16} />
              <span>Stop and Save</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AudioRecorder;
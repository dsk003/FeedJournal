import React, { useState, useEffect, useRef } from 'react';
import { JournalEntry } from '../types';
import { Play, Pause, Trash2 } from 'lucide-react';

interface EntryCardProps {
  entry: JournalEntry;
  onDelete: (id: string) => void;
}

const EntryCard: React.FC<EntryCardProps> = ({ entry, onDelete }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (entry.audioBlob) {
      const url = URL.createObjectURL(entry.audioBlob);
      const audioObj = new Audio(url);
      
      audioObj.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      audioObj.onloadedmetadata = () => {
        setDuration(audioObj.duration);
      };

      audioObj.ontimeupdate = () => {
        setCurrentTime(audioObj.currentTime);
      };
      
      setAudio(audioObj);

      return () => {
        URL.revokeObjectURL(url);
        audioObj.pause();
        audioObj.src = '';
      };
    }
  }, [entry.audioBlob]);

  const togglePlay = () => {
    if (!audio) return;
    
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audio) {
      const time = Number(e.target.value);
      audio.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 mb-4 relative group transition-all hover:shadow-md">
      <div className="flex justify-between items-start mb-3">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{formatTimestamp(entry.timestamp)}</span>
        <button 
          onClick={() => onDelete(entry.id)}
          className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1 -mr-1"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="text-gray-800 text-[17px] leading-relaxed whitespace-pre-wrap break-words font-normal">
        {entry.content || <span className="text-gray-400 italic">Empty entry</span>}
      </div>

      {entry.type === 'audio' && entry.audioBlob && (
        <div className="mt-4 bg-gray-50 rounded-xl p-3 border border-gray-100">
          <div className="flex items-center gap-3">
            <button 
              onClick={togglePlay}
              className="w-10 h-10 flex items-center justify-center bg-blue-600 rounded-full text-white shrink-0 shadow-sm hover:bg-blue-700 transition-colors active:scale-95"
            >
              {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
            </button>
            
            <div className="flex-1 flex flex-col justify-center">
              <input
                ref={progressBarRef}
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm"
              />
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] font-medium text-gray-500 tabular-nums">{formatTime(currentTime)}</span>
                <span className="text-[10px] font-medium text-gray-400 tabular-nums">{formatTime(duration)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EntryCard;
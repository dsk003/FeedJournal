import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, Book, Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { getAllEntries, saveEntry, deleteEntry } from './services/storage';
import { transcribeAudio } from './services/gemini';
import { JournalEntry, GroupedEntries } from './types';
import EntryCard from './components/EntryCard';
import AudioRecorder from './components/AudioRecorder';

const App: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecordingMode, setIsRecordingMode] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const data = await getAllEntries();
      setEntries(data);
    } catch (error) {
      console.error("Failed to load entries", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const newEntry: JournalEntry = {
      id: uuidv4(),
      type: 'text',
      content: inputText.trim(),
      timestamp: Date.now(),
    };

    try {
      await saveEntry(newEntry);
      setEntries(prev => [newEntry, ...prev]);
      setInputText('');
      // Slight delay to allow render before scroll
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    } catch (error) {
      console.error("Failed to save text entry", error);
      alert("Could not save entry.");
    }
  };

  const handleAudioComplete = async (blob: Blob) => {
    setIsProcessingAudio(true);
    try {
      // 1. Transcribe
      const transcription = await transcribeAudio(blob);
      
      // 2. Save
      const newEntry: JournalEntry = {
        id: uuidv4(),
        type: 'audio',
        content: transcription,
        audioBlob: blob,
        timestamp: Date.now(),
      };

      await saveEntry(newEntry);
      setEntries(prev => [newEntry, ...prev]);
      setIsRecordingMode(false);
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    } catch (error) {
      console.error("Failed to process audio entry", error);
      alert("Failed to process audio. Please check your API key or network.");
    } finally {
      setIsProcessingAudio(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this entry?")) {
      try {
        await deleteEntry(id);
        setEntries(prev => prev.filter(e => e.id !== id));
      } catch (error) {
        console.error("Failed to delete", error);
      }
    }
  };

  const groupEntriesByDate = (entries: JournalEntry[]): GroupedEntries => {
    const groups: GroupedEntries = {};
    entries.forEach(entry => {
      const date = new Date(entry.timestamp);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      let key = date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
      
      if (date.toDateString() === today.toDateString()) {
        key = "Today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = "Yesterday";
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(entry);
    });
    return groups;
  };

  const groupedEntries = groupEntriesByDate(entries);
  
  const orderedKeys: string[] = Array.from(new Set(entries.map(entry => {
      const date = new Date(entry.timestamp);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (date.toDateString() === today.toDateString()) return "Today";
      if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
      return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  })));

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] relative font-sans">
      {/* iOS Status Bar Spacer */}
      <div className="h-safe-top w-full bg-[#F2F2F7]/80 backdrop-blur-md sticky top-0 z-40"></div>

      {/* Header */}
      <header className="px-5 py-3 bg-[#F2F2F7]/90 backdrop-blur-xl sticky top-0 z-30 border-b border-gray-200/50 flex items-center justify-between transition-all">
        <div>
          <h1 className="text-3xl font-bold text-black tracking-tight">Journal</h1>
          <p className="text-sm text-gray-500 font-medium mt-0.5">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="w-9 h-9 bg-white rounded-full shadow-sm flex items-center justify-center border border-gray-200/50">
           <Book size={18} className="text-gray-900" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-32 px-4 md:px-6 pt-4 no-scrollbar scroll-smooth" ref={topRef}>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center pt-32 opacity-50">
             <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mb-2"></div>
             <span className="text-xs text-gray-400 font-medium">Loading entries...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center text-gray-400 px-6">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                <Book size={32} className="text-gray-300" />
            </div>
            <p className="text-xl font-semibold text-gray-900 mb-2">Empty Journal</p>
            <p className="text-base text-gray-500 max-w-xs leading-relaxed">Capture your thoughts, ideas, and memories. Tap the mic to start speaking.</p>
          </div>
        ) : (
          orderedKeys.map(dateKey => (
            <div key={dateKey} className="mb-6">
              <div className="sticky top-[4.5rem] z-20 py-3 mb-1 pointer-events-none">
                 <span className="bg-[#E5E5EA]/90 backdrop-blur-md text-[#8E8E93] px-3 py-1.5 rounded-lg text-[13px] font-semibold uppercase tracking-wider shadow-sm">
                   {dateKey}
                 </span>
              </div>
              <div className="space-y-3">
                {groupedEntries[dateKey].map(entry => (
                  <EntryCard key={entry.id} entry={entry} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          ))
        )}
        {/* Spacer for fixed bottom bar */}
        <div className="h-28"></div>
      </main>

      {/* Compose Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-200 px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-1px_0_rgba(0,0,0,0.05)] z-40">
        <form 
          onSubmit={handleTextSubmit}
          className="max-w-3xl mx-auto flex items-center gap-3"
        >
          <div className="flex-1 bg-gray-100/80 rounded-2xl flex items-center px-4 py-2.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:shadow-sm transition-all duration-200 border border-transparent focus-within:border-blue-500/30">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="New entry..."
              className="w-full bg-transparent border-none focus:outline-none text-[17px] placeholder-gray-400 text-gray-900 leading-relaxed"
            />
          </div>
          
          {inputText.length > 0 ? (
             <button 
               type="submit"
               className="w-11 h-11 flex items-center justify-center bg-blue-600 rounded-full text-white shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-90 transition-all duration-200"
             >
               <Send size={20} fill="currentColor" className="ml-0.5" />
             </button>
          ) : (
             <button 
               type="button"
               onClick={() => setIsRecordingMode(true)}
               className="w-11 h-11 flex items-center justify-center bg-gray-900 rounded-full text-white shadow-lg hover:bg-black active:scale-90 transition-all duration-200"
             >
               <Mic size={20} />
             </button>
          )}
        </form>
      </div>

      {/* Audio Recorder Modal Overlay */}
      {isRecordingMode && (
        <>
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50 transition-opacity duration-300" 
            onClick={() => !isProcessingAudio && setIsRecordingMode(false)}
          />
          <AudioRecorder 
            onRecordingComplete={handleAudioComplete}
            onCancel={() => setIsRecordingMode(false)}
            isProcessing={isProcessingAudio}
          />
        </>
      )}
    </div>
  );
};

export default App;
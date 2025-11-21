export type EntryType = 'text' | 'audio';

export interface JournalEntry {
  id: string;
  type: EntryType;
  content: string; // The text content or transcription
  audioBlob?: Blob; // For playback if it exists
  timestamp: number;
}

export interface GroupedEntries {
  [dateKey: string]: JournalEntry[];
}

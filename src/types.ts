/**
 * Types and interfaces for Calc+
 */

export type AppScreen = 'calculator' | 'unlock' | 'vault' | 'settings' | 'messenger' | 'dev_unlock' | 'dev_tools';

export interface HistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: number;
}

export interface VaultNote {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface VaultPassword {
  id: string;
  siteName: string;
  username: string;
  passwordVal: string;
  notes?: string;
  createdAt: number;
}

export interface VaultDiary {
  id: string;
  date: string;
  mood: 'happy' | 'neutral' | 'sad' | 'excited' | 'tired';
  entry: string;
  createdAt: number;
}

export interface AppSettings {
  version: string;
  buildDate: string;
  environment: 'production' | 'development';
  fullscreen: boolean;
  theme: 'dark'; // Dark theme only, but extensible if needed
  isDegree: boolean;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    type: 'added' | 'improved' | 'removed';
    text: string;
  }[];
}

/**
 * Types and interfaces for Calc+
 */

export type AppScreen = 'calculator' | 'unlock' | 'vault' | 'settings' | 'messenger' | 'dev_unlock' | 'dev_tools' | 'wiki_lock';

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
  keyboardType?: 'system' | 'custom';
  keyboardHeight?: number;
}

export interface SecretShortcut {
  id: string;
  combination: string; // e.g. "001277"
  targetUsername: string; // e.g. "anonim277"
  requiresAccessKey: boolean; // true if it requires password unlock, false if it bypasses password unlock and opens chat room immediately
  ownerUsername: string; // username of the account that created this shortcut
}

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    type: 'added' | 'improved' | 'removed';
    text: string;
  }[];
}

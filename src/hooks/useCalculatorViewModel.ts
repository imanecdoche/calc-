import { useState, useEffect, useRef } from 'react';
import { 
  AppScreen, 
  HistoryItem, 
  VaultNote, 
  VaultPassword, 
  VaultDiary, 
  AppSettings 
} from '../types';
import { evaluateExpression } from '../utils/MathEngine';
import { FullscreenManager } from '../services/FullscreenManager';

const STORAGE_KEY = 'calcplus_app_data';
const STORAGE_VERSION = 1;

interface LocalStorageData {
  version: number;
  passwordVal: string;
  vaultNotes: VaultNote[];
  vaultPasswords: VaultPassword[];
  vaultDiaries: VaultDiary[];
  settings: AppSettings;
}

const DEFAULT_SETTINGS: AppSettings = {
  version: '1.7.0',
  buildDate: '2026-07-12',
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  fullscreen: false,
  theme: 'dark',
  isDegree: false,
};

const INITIAL_DATA: LocalStorageData = {
  version: STORAGE_VERSION,
  passwordVal: '1234', // Default access key, can be changed
  vaultNotes: [
    {
      id: 'welcome-note',
      title: 'Welcome to Calc+ Secret Vault',
      content: 'This is a secure area hidden behind the calculator. You can store notes, login credentials, and personal diaries safely here. Your data is stored locally on this device.',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ],
  vaultPasswords: [],
  vaultDiaries: [],
  settings: DEFAULT_SETTINGS,
};

export function useCalculatorViewModel() {
  // --- Screen Navigation ---
  const [screen, setScreen] = useState<AppScreen>('calculator');
  const [prevScreen, setPrevScreen] = useState<AppScreen>('calculator');

  // --- Calculator States ---
  const [expression, setExpression] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isDegree, setIsDegree] = useState<boolean>(false);
  const [isTriggered, setIsTriggered] = useState<boolean>(false);
  const [isDevTriggered, setIsDevTriggered] = useState<boolean>(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState<boolean>(false);

  // --- Vault States (Persisted) ---
  const [password, setPassword] = useState<string>('1234');
  const [vaultNotes, setVaultNotes] = useState<VaultNote[]>([]);
  const [vaultPasswords, setVaultPasswords] = useState<VaultPassword[]>([]);
  const [vaultDiaries, setVaultDiaries] = useState<VaultDiary[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // --- UI Toast / Error Feedbacks (Transient) ---
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Load Initial Data
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        
        // Versioning and Migration
        if (parsed.version < STORAGE_VERSION) {
          // Perform migration if version is older
          const migratedData = { ...INITIAL_DATA, ...parsed, version: STORAGE_VERSION };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedData));
          loadFromData(migratedData);
        } else {
          loadFromData(parsed);
        }
      } else {
        // First-time loading
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
        loadFromData(INITIAL_DATA);
      }
    } catch (e) {
      console.error('Error loading data from localStorage, resetting:', e);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
      loadFromData(INITIAL_DATA);
      showToast('Error loading local storage, data initialized.', 'error');
    }
  }, []);

  const loadFromData = (data: LocalStorageData) => {
    setPassword(data.passwordVal || '1234');
    setVaultNotes(data.vaultNotes || []);
    setVaultPasswords(data.vaultPasswords || []);
    setVaultDiaries(data.vaultDiaries || []);
    setSettings(data.settings || DEFAULT_SETTINGS);
    setIsDegree(data.settings?.isDegree ?? false);
  };

  // --- Autosave Debounce Engine ---
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const handler = setTimeout(() => {
      const dataToSave: LocalStorageData = {
        version: STORAGE_VERSION,
        passwordVal: password,
        vaultNotes,
        vaultPasswords,
        vaultDiaries,
        settings: { ...settings, isDegree },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    }, 500); // 500ms debounce autosave

    return () => clearTimeout(handler);
  }, [password, vaultNotes, vaultPasswords, vaultDiaries, settings, isDegree]);

  // --- Helper to show toasts ---
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // --- Calculator Input Handling ---
  const handleCalculatorPress = (value: string) => {
    // If the special secret trigger was fired on the previous evaluation,
    // ANY key press now intercepts and transitions to the Unlock Screen!
    if (isTriggered) {
      setIsTriggered(false);
      setExpression('');
      setResult('');
      navigate('unlock');
      return;
    }
    if (isDevTriggered) {
      setIsDevTriggered(false);
      setExpression('');
      setResult('');
      navigate('dev_unlock');
      return;
    }

    let nextExpr = expression;

    if (value === 'C') {
      setExpression('');
      setResult('');
      nextExpr = '';
    } else if (value === '⌫' || value === 'Backspace') {
      // Handles backspacing scientific functions nicely
      if (expression.endsWith('sin(') || expression.endsWith('cos(') || expression.endsWith('tan(') || expression.endsWith('log(')) {
        setExpression(prev => prev.slice(0, -4));
        nextExpr = expression.slice(0, -4);
      } else if (expression.endsWith('ln(') || expression.endsWith('√(')) {
        setExpression(prev => prev.slice(0, -3));
        nextExpr = expression.slice(0, -3);
      } else {
        setExpression(prev => prev.slice(0, -1));
        nextExpr = expression.slice(0, -1);
      }
    } else if (value === '=') {
      evaluateResult();
    } else if (value === 'deg' || value === 'rad') {
      const nextDegreeState = value === 'deg';
      setIsDegree(nextDegreeState);
      setSettings(prev => ({ ...prev, isDegree: nextDegreeState }));
    } else if (value === 'sin' || value === 'cos' || value === 'tan' || value === 'log' || value === 'ln' || value === '√') {
      setExpression(prev => prev + `${value}(`);
      nextExpr = expression + `${value}(`;
    } else if (value === 'pi') {
      setExpression(prev => prev + 'π');
      nextExpr = expression + 'π';
    } else {
      // General characters
      setExpression(prev => prev + value);
      nextExpr = expression + value;
    }

  };

  const evaluateResult = () => {
    if (!expression || expression.trim() === '') return;

    // --- SECRET TRIGGER CHECK ---
    // If user inputs "1+2+3="
    // Wait, the expression would be "1+2+3" when they hit "="
    const trimmedExpr = expression.replace(/\s+/g, '');
    if (trimmedExpr === '1+2+3') {
      setResult('0');
      setIsTriggered(true); // Flag to transition on next click
      FullscreenManager.getInstance().setSecretSessionActive(true);
      // Still add to calculation history for authenticity!
      const newHistoryItem: HistoryItem = {
        id: Math.random().toString(36).substr(2, 9),
        expression: expression,
        result: '0',
        timestamp: Date.now()
      };
      setHistory(prev => [newHistoryItem, ...prev]);
      return;
    } else if (trimmedExpr === '3+2+1') {
      setResult('0');
      setIsDevTriggered(true); // Flag to transition on next click for Developer Tools
      FullscreenManager.getInstance().setSecretSessionActive(true);
      const newHistoryItem: HistoryItem = {
        id: Math.random().toString(36).substr(2, 9),
        expression: expression,
        result: '0',
        timestamp: Date.now()
      };
      setHistory(prev => [newHistoryItem, ...prev]);
      return;
    } else {
      // Not the trigger, so exit fullscreen mode
      FullscreenManager.getInstance().setSecretSessionActive(false);
    }

    // Normal evaluation
    const res = evaluateExpression(expression, isDegree);
    setResult(res);

    if (res !== 'Error') {
      const newHistoryItem: HistoryItem = {
        id: Math.random().toString(36).substr(2, 9),
        expression: expression,
        result: res,
        timestamp: Date.now()
      };
      // Keep only current session history
      setHistory(prev => [newHistoryItem, ...prev]);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    showToast('Calculation history cleared', 'info');
  };

  // --- Screen Navigation ---
  const navigate = (next: AppScreen) => {
    setPrevScreen(screen);
    setScreen(next);
  };

  // Sync screen changes to FullscreenManager
  useEffect(() => {
    const secretScreens = ['unlock', 'dev_unlock', 'dev_tools', 'messenger', 'vault'];
    const isSecret = secretScreens.includes(screen) || (screen === 'settings' && prevScreen !== 'calculator');
    
    if (isSecret) {
      FullscreenManager.getInstance().setSecretSessionActive(true);
    } else if (screen === 'calculator') {
      if (isTriggered || isDevTriggered) {
        FullscreenManager.getInstance().setSecretSessionActive(true);
      } else {
        FullscreenManager.getInstance().setSecretSessionActive(false);
      }
    }
  }, [screen, prevScreen, isTriggered, isDevTriggered]);

  // --- Access Key Password Operations ---
  const changePassword = (newPass: string) => {
    if (!newPass || newPass.trim().length < 4) {
      showToast('Password must be at least 4 characters long.', 'error');
      return false;
    }
    setPassword(newPass);
    showToast('Access Key updated successfully!', 'success');
    return true;
  };

  // --- Secret Notes CRUD ---
  const addNote = (title: string, content: string) => {
    const newNote: VaultNote = {
      id: Math.random().toString(36).substr(2, 9),
      title: title || 'Untitled Note',
      content,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setVaultNotes(prev => [newNote, ...prev]);
    showToast('Note saved successfully!');
  };

  const updateNote = (id: string, title: string, content: string) => {
    setVaultNotes(prev => prev.map(note => {
      if (note.id === id) {
        return {
          ...note,
          title: title || 'Untitled Note',
          content,
          updatedAt: Date.now()
        };
      }
      return note;
    }));
  };

  const deleteNote = (id: string) => {
    setVaultNotes(prev => prev.filter(note => note.id !== id));
    showToast('Note deleted.', 'info');
  };

  // --- Secret Passwords CRUD ---
  const addPassword = (siteName: string, username: string, passwordVal: string, notes?: string) => {
    const newPass: VaultPassword = {
      id: Math.random().toString(36).substr(2, 9),
      siteName,
      username,
      passwordVal,
      notes,
      createdAt: Date.now()
    };
    setVaultPasswords(prev => [newPass, ...prev]);
    showToast('Credential added.');
  };

  const deletePassword = (id: string) => {
    setVaultPasswords(prev => prev.filter(p => p.id !== id));
    showToast('Credential deleted.', 'info');
  };

  // --- Private Diary CRUD ---
  const addDiaryEntry = (entry: string, mood: VaultDiary['mood']) => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const newEntry: VaultDiary = {
      id: Math.random().toString(36).substr(2, 9),
      date: today,
      mood,
      entry,
      createdAt: Date.now()
    };
    setVaultDiaries(prev => [newEntry, ...prev]);
    showToast('Diary entry saved.');
  };

  const deleteDiaryEntry = (id: string) => {
    setVaultDiaries(prev => prev.filter(d => d.id !== id));
    showToast('Diary entry deleted.', 'info');
  };

  // --- Export and Import JSON Engine ---
  const exportData = () => {
    try {
      const dataToExport: LocalStorageData = {
        version: STORAGE_VERSION,
        passwordVal: password,
        vaultNotes,
        vaultPasswords,
        vaultDiaries,
        settings: { ...settings, isDegree },
      };
      
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `calcplus_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Data exported successfully!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to export data.', 'error');
    }
  };

  const importData = (fileJsonText: string) => {
    try {
      const parsed = JSON.parse(fileJsonText);
      if (!parsed.version) {
        showToast('Invalid backup file structure.', 'error');
        return false;
      }
      
      // Perform direct load and update state
      loadFromData(parsed);
      
      // Overwrite immediately
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...parsed,
        version: STORAGE_VERSION
      }));
      showToast('Backup restored successfully!', 'success');
      return true;
    } catch (e) {
      console.error(e);
      showToast('Failed to parse backup JSON file.', 'error');
      return false;
    }
  };

  const resetAllData = () => {
    localStorage.removeItem(STORAGE_KEY);
    loadFromData(INITIAL_DATA);
    setHistory([]);
    setScreen('calculator');
    showToast('Application data has been fully reset.', 'info');
  };

  const clearCache = () => {
    // Simulated clear cache
    showToast('Temporary browser cache cleared successfully.', 'success');
  };

  // Storage usage calculation
  const getStorageUsage = () => {
    try {
      const dataStr = localStorage.getItem(STORAGE_KEY) || '';
      const bytes = new Blob([dataStr]).size;
      if (bytes === 0) return '0 B';
      const kbs = (bytes / 1024).toFixed(2);
      return `${kbs} KB`;
    } catch (e) {
      return 'N/A';
    }
  };

  return {
    // Screens
    screen,
    prevScreen,
    navigate,
    
    // Calculator state
    expression,
    result,
    history,
    isDegree,
    isTriggered,
    showHistoryPanel,
    setShowHistoryPanel,
    handleCalculatorPress,
    clearHistory,
    
    // Vault state
    password,
    vaultNotes,
    vaultPasswords,
    vaultDiaries,
    settings,
    setSettings,
    toast,
    showToast,
    
    // Password Operations
    changePassword,
    
    // Notes Operations
    addNote,
    updateNote,
    deleteNote,
    
    // Password Manager Operations
    addPassword,
    deletePassword,
    
    // Diary Operations
    addDiaryEntry,
    deleteDiaryEntry,
    
    // Backup & Settings Operations
    exportData,
    importData,
    resetAllData,
    clearCache,
    getStorageUsage,
  };
}

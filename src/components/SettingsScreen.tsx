import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Settings, 
  Trash2, 
  Download, 
  Upload, 
  KeyRound, 
  Sparkles, 
  Maximize2, 
  Minimize2, 
  RefreshCw, 
  Database, 
  Layers, 
  Cpu, 
  Calendar,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  BookOpen,
  HelpCircle
} from 'lucide-react';
import { AppScreen, ChangelogEntry, AppSettings } from '../types';
import { FullscreenManager } from '../services/FullscreenManager';

interface SettingsScreenProps {
  settings: AppSettings;
  currentPasswordVal: string;
  changePassword: (newPass: string) => boolean;
  exportData: () => void;
  importData: (jsonStr: string) => boolean;
  resetAllData: () => void;
  clearCache: () => void;
  getStorageUsage: () => string;
  onBack: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function SettingsScreen({
  settings,
  currentPasswordVal,
  changePassword,
  exportData,
  importData,
  resetAllData,
  clearCache,
  getStorageUsage,
  onBack,
  showToast
}: SettingsScreenProps) {
  // Passcode editing states
  const [editingPasscode, setEditingPasscode] = useState(false);
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');

  // Changelog expand state
  const [changelogExpanded, setChangelogExpanded] = useState(false); // Let's default to false so User Guide stands out!

  // Guide expand state
  const [guideExpanded, setGuideExpanded] = useState(true);
  const [activeGuideSec, setActiveGuideSec] = useState<string | null>('buka');

  // File picker upload drag state
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset confirmation modal state
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Fullscreen toggle state
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const checkFullscreen = () => {
      setIsFullscreen(!!(document.fullscreenElement || (document as any).webkitFullscreenElement || FullscreenManager.getInstance().getStatus()));
    };
    checkFullscreen();
    document.addEventListener('fullscreenchange', checkFullscreen);
    document.addEventListener('webkitfullscreenchange', checkFullscreen);
    return () => {
      document.removeEventListener('fullscreenchange', checkFullscreen);
      document.removeEventListener('webkitfullscreenchange', checkFullscreen);
    };
  }, []);

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        FullscreenManager.getInstance().enterFullscreen();
        setIsFullscreen(true);
        showToast('Fullscreen enabled', 'info');
      } else {
        FullscreenManager.getInstance().exitFullscreen();
        setIsFullscreen(false);
        showToast('Fullscreen disabled', 'info');
      }
    } catch (e) {
      showToast('Fullscreen API not supported in this frame.', 'error');
    }
  };

  const handlePasscodeChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPasscode.length < 4) {
      showToast('Passcode must be at least 4 characters long.', 'error');
      return;
    }
    if (newPasscode !== confirmPasscode) {
      showToast('Passcodes do not match.', 'error');
      return;
    }
    const success = changePassword(newPasscode);
    if (success) {
      setEditingPasscode(false);
      setNewPasscode('');
      setConfirmPasscode('');
    }
  };

  // Drag and drop JSON handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleJsonFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleJsonFile(e.target.files[0]);
    }
  };

  const handleJsonFile = (file: File) => {
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      showToast('Please upload a valid JSON backup file.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        const success = importData(text);
        if (success) {
          // File input reset
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }
    };
    reader.onerror = () => {
      showToast('Failed to read file contents.', 'error');
    };
    reader.readAsText(file);
  };

  const changelogs: ChangelogEntry[] = [
    {
      version: 'v1.5.0',
      date: '2026-07-11',
      changes: [
        { type: 'added', text: 'Menambahkan modul Panduan Pengguna (User Guide) interaktif di dalam Pengaturan' },
        { type: 'added', text: 'Mengintegrasikan alur tutorial pembukaan kode rahasia, registrasi, chat, call & voice note' },
        { type: 'improved', text: 'Penyempurnaan navigasi panduan dengan accordion transisi motion halus' }
      ]
    },
    {
      version: 'v1.4.0',
      date: '2026-07-11',
      changes: [
        { type: 'added', text: 'Menambahkan fitur 1-on-1 Voice Call menggunakan WebRTC & Firestore Signaling' },
        { type: 'added', text: 'Menambahkan Outgoing, Incoming, dan In-Call Screens dengan animasi halus' },
        { type: 'added', text: 'Integrasi efek suara programmatic (Ringtone, Ringback, Hangup) via Web Audio API' },
        { type: 'added', text: 'Mendukung Mute Mikrofon dan Toggle Speaker Output' },
        { type: 'removed', text: 'Menghapus statusbar simulasian atas (notch, jam, baterai, konektivitas)' },
        { type: 'removed', text: 'Menghapus navbar simulasian bawah (tombol back, home, recents)' },
        { type: 'improved', text: 'Mengoptimalkan ruang visual konten agar memenuhi layar penuh (full height)' }
      ]
    },
    {
      version: 'v1.3.8',
      date: '2026-07-11',
      changes: [
        { type: 'added', text: 'Menambahkan fitur Voice Note pada Secret Messenger' },
        { type: 'added', text: 'Merekam suara dengan Tahan Tombol Mikrofon (Hold to Record)' },
        { type: 'added', text: 'Menampilkan visualisasi Waveform realtime saat merekam' },
        { type: 'added', text: 'Geser ke kiri untuk membatalkan rekaman (Swipe-left to cancel)' },
        { type: 'added', text: 'Menambahkan Panel Preview rekaman suara sebelum dikirim' },
        { type: 'added', text: 'Mendukung pemutaran pesan suara dengan Kecepatan 1x / 2x' },
        { type: 'added', text: 'Streaming & temporary memory cache dengan pembersihan instan saat Quick Lock' },
        { type: 'improved', text: 'Kompresi audio mono (24kbps) hemat data tanpa mengurangi kualitas' }
      ]
    },
    {
      version: 'v1.3.7a',
      date: '2026-07-11',
      changes: [
        { type: 'added', text: 'Menambahkan Auto Fullscreen Mode pada saat Secret Trigger diaktifkan' },
        { type: 'added', text: 'Integrasi Android Immersive Mode (hide Status Bar & Navigation Bar)' },
        { type: 'improved', text: 'Sinkronisasi state fullscreen pada screen lifecycle & resume background' },
        { type: 'improved', text: 'Optimasi transisi layout bebas kedipan layar' }
      ]
    },
    {
      version: 'v1.3.6',
      date: '2026-07-11',
      changes: [
        { type: 'added', text: 'Menambahkan multi-line Message Bubble dengan auto-width' },
        { type: 'added', text: 'Integrasi Material 3 Bottom Sheet (Reply, Copy, Delete for Me, Delete for Everyone, Info)' },
        { type: 'added', text: 'Menambahkan fitur Quote Reply dengan preview kecil' },
        { type: 'added', text: 'Menambahkan Scroll Controller dengan tombol "↓ New Messages"' },
        { type: 'added', text: 'Menambahkan Date Separator otomatis' },
        { type: 'added', text: 'Menambahkan Firestore Pagination (50 pesan awal)' },
        { type: 'added', text: 'Menambahkan offline queue & automatic retry manager' },
        { type: 'improved', text: 'Penyempurnaan long-press touch-hold & double-click protection' },
        { type: 'removed', text: 'Menghapus dialog konfirmasi bawaan browser' }
      ]
    }
  ];

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-neutral-100 font-sans select-none overflow-hidden relative">
      
      {/* Header Bar */}
      <div className="flex items-center px-4 py-4 border-b border-neutral-900 bg-[#0a0a0a]/90 backdrop-blur-md sticky top-0 z-10 flex-none">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-neutral-900 text-neutral-400 hover:text-neutral-100 transition-all cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center mr-2 border border-transparent hover:border-neutral-850"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center space-x-2">
          <Settings className="text-neutral-400" size={16} />
          <span className="font-bold text-xs tracking-wider text-neutral-100 uppercase">System Settings</span>
        </div>
      </div>

      {/* Main Settings Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        
        {/* ACCESS KEY MANAGEMENT */}
        <section className="bg-[#121212] border border-neutral-900 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center space-x-2.5 border-b border-neutral-900/60 pb-3">
            <KeyRound className="text-neutral-400" size={14} />
            <h2 className="font-bold text-xs tracking-wider uppercase text-neutral-300">Access Credentials</h2>
          </div>

          {!editingPasscode ? (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-neutral-350 font-medium">Vault Lock Passcode</span>
                <span className="block text-[11px] text-neutral-500 font-mono mt-0.5">Active key is securely encrypted locally.</span>
              </div>
              <button
                onClick={() => setEditingPasscode(true)}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 hover:border-neutral-700 text-neutral-200 cursor-pointer min-h-[44px]"
              >
                Change Key
              </button>
            </div>
          ) : (
            <form onSubmit={handlePasscodeChangeSubmit} className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">New 4+ Digit Passcode *</label>
                  <input
                    type="password"
                    pattern="[0-9]*"
                    maxLength={12}
                    placeholder="e.g. 1234"
                    value={newPasscode}
                    onChange={(e) => setNewPasscode(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#0a0a0a] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-neutral-100 font-mono text-center outline-none focus:border-neutral-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Confirm Passcode *</label>
                  <input
                    type="password"
                    pattern="[0-9]*"
                    maxLength={12}
                    placeholder="e.g. 1234"
                    value={confirmPasscode}
                    onChange={(e) => setConfirmPasscode(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#0a0a0a] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-neutral-100 font-mono text-center outline-none focus:border-neutral-700"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPasscode(false);
                    setNewPasscode('');
                    setConfirmPasscode('');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-850 text-neutral-400 text-xs font-bold cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-neutral-200 hover:bg-white text-neutral-950 text-xs font-bold cursor-pointer min-h-[44px]"
                >
                  Save Key
                </button>
              </div>
            </form>
          )}
        </section>

        {/* COMPREHENSIVE BACKUP OPERATIONS */}
        <section className="bg-[#121212] border border-neutral-900 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center space-x-2.5 border-b border-neutral-900/60 pb-3">
            <Database className="text-neutral-400" size={14} />
            <h2 className="font-bold text-xs tracking-wider uppercase text-neutral-300">Data Management</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Export */}
            <div className="p-3.5 rounded-xl bg-[#0a0a0a] border border-neutral-900/60 flex flex-col justify-between">
              <div>
                <span className="font-bold text-xs text-neutral-200 block">Export Vault Data</span>
                <span className="text-[10px] text-neutral-500 mt-1 block leading-relaxed">Save an offline JSON file containing all encrypted notes, passwords, and diaries.</span>
              </div>
              <button
                onClick={exportData}
                className="mt-4 w-full py-2.5 rounded-lg bg-[#121212] hover:bg-[#1a1a1a] border border-neutral-800 text-neutral-300 hover:text-white text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer min-h-[44px]"
              >
                <Download size={13} />
                <span>Export JSON</span>
              </button>
            </div>

            {/* Clear cache */}
            <div className="p-3.5 rounded-xl bg-[#0a0a0a] border border-neutral-900/60 flex flex-col justify-between">
              <div>
                <span className="font-bold text-xs text-neutral-200 block">Optimize Cache</span>
                <span className="text-[10px] text-neutral-500 mt-1 block leading-relaxed">Cleanse cached mathematical outputs and assets to keep the engine performing optimally.</span>
              </div>
              <button
                onClick={clearCache}
                className="mt-4 w-full py-2.5 rounded-lg bg-[#121212] hover:bg-[#1a1a1a] border border-neutral-800 text-neutral-300 hover:text-white text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer min-h-[44px]"
              >
                <RefreshCw size={13} />
                <span>Clear Cache</span>
              </button>
            </div>
          </div>

          {/* DRAG AND DROP RESTORE DROPZONE */}
          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`mt-4 border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              dragActive 
                ? 'border-neutral-400 bg-neutral-900/30' 
                : 'border-neutral-850 hover:border-neutral-750 hover:bg-[#0d0d0d]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <Upload size={20} className={`mb-2 ${dragActive ? 'text-neutral-300 animate-pulse' : 'text-neutral-550'}`} />
            <span className="font-bold text-xs text-neutral-300">Import Vault Backup</span>
            <span className="text-[10px] text-neutral-500 max-w-[220px] mt-1 leading-relaxed">
              Drag & drop your JSON backup file here, or <span className="text-neutral-400 underline">click to browse</span>.
            </span>
          </div>
        </section>

        {/* SYSTEM UTILITIES */}
        <section className="bg-[#121212] border border-neutral-900 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center space-x-2.5 border-b border-neutral-900/60 pb-3">
            <Layers className="text-neutral-400" size={14} />
            <h2 className="font-bold text-xs tracking-wider uppercase text-neutral-300">System Utilities</h2>
          </div>

          <div className="space-y-3">
            {/* Fullscreen Toggle */}
            <div className="flex items-center justify-between py-1">
              <div>
                <span className="text-xs text-neutral-300 font-bold block">Fullscreen Layout</span>
                <span className="text-[10px] text-neutral-500 mt-0.5 block">Toggle standalone full viewport layout.</span>
              </div>
              <button
                onClick={toggleFullscreen}
                className="p-2.5 rounded-lg bg-[#0a0a0a] border border-neutral-850 text-neutral-400 hover:text-neutral-100 transition cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center hover:border-neutral-750"
                title="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
            </div>

            {/* Storage space indicator */}
            <div className="flex items-center justify-between border-t border-neutral-900/60 pt-3">
              <div>
                <span className="text-xs text-neutral-300 font-bold block">Local Disk Space Used</span>
                <span className="text-[10px] text-neutral-500 mt-0.5 block">Total sandboxed capacity consumed by your vault.</span>
              </div>
              <span className="font-mono text-[10px] font-bold text-neutral-300 bg-neutral-900 border border-neutral-800 px-3 py-1 rounded-md">
                {getStorageUsage()}
              </span>
            </div>

            {/* RESET APPLICATION DATA */}
            <div className="flex items-center justify-between border-t border-neutral-900/60 pt-3">
              <div>
                <span className="text-xs text-rose-450 font-bold block">Purge Storage</span>
                <span className="text-[10px] text-neutral-500 mt-0.5 block">Permanently erase all notes, accounts, diary posts, and preferences.</span>
              </div>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="py-2.5 px-4 rounded-lg bg-rose-950/10 hover:bg-rose-950/30 border border-rose-950/60 text-rose-400 hover:text-rose-300 text-xs font-bold transition cursor-pointer min-h-[44px] flex items-center justify-center space-x-1.5"
              >
                <Trash2 size={13} />
                <span>Wipe Data</span>
              </button>
            </div>
          </div>
        </section>

        {/* PANDUAN PENGGUNA (USER GUIDE) */}
        <section className="bg-[#121212] border border-neutral-900 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-900/60 pb-3">
            <div className="flex items-center space-x-2.5">
              <BookOpen className="text-indigo-400" size={14} />
              <h2 className="font-bold text-xs tracking-wider uppercase text-neutral-300">Panduan Pengguna</h2>
            </div>
            <button
              onClick={() => setGuideExpanded(!guideExpanded)}
              className="p-1.5 text-neutral-400 hover:text-neutral-100 min-w-[44px] min-h-[44px] flex items-center justify-center transition-all"
              title="Toggle Panduan"
            >
              {guideExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          <AnimatePresence initial={false}>
            {guideExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-3 overflow-hidden"
              >
                {/* 1. Cara Membuka */}
                <div className="border border-neutral-900 rounded-xl overflow-hidden bg-[#0a0a0a]">
                  <button
                    onClick={() => setActiveGuideSec(activeGuideSec === 'buka' ? null : 'buka')}
                    className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-neutral-900/40 transition-all min-h-[44px]"
                  >
                    <span className="text-xs font-bold text-neutral-250 flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-md bg-indigo-950/40 text-indigo-400 border border-indigo-900/60 flex items-center justify-center text-[10px] font-mono font-bold">1</span>
                      <span>Cara Membuka Secret Messenger</span>
                    </span>
                    {activeGuideSec === 'buka' ? <ChevronUp size={14} className="text-neutral-500" /> : <ChevronDown size={14} className="text-neutral-500" />}
                  </button>

                  <AnimatePresence>
                    {activeGuideSec === 'buka' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-4 border-t border-neutral-900/50 pt-3 text-[11px] text-neutral-400 space-y-2 leading-relaxed"
                      >
                        <ol className="list-decimal list-inside space-y-1.5">
                          <li>Buka aplikasi <span className="text-neutral-200 font-bold">Calc+</span>.</li>
                          <li>Masukkan kombinasi tombol rahasia: <span className="font-mono bg-neutral-900 text-indigo-300 border border-neutral-800 px-1.5 py-0.5 rounded text-[10px] font-bold">1 + 2 + 3 =</span></li>
                          <li>Layar kalkulator akan menampilkan angka <span className="font-mono text-neutral-200 font-bold">0</span>.</li>
                          <li>Tekan angka apa saja pada kalkulator untuk memunculkan halaman <span className="text-neutral-250 font-bold">ACCESS KEY</span>.</li>
                          <li>Masukkan Access Key rahasia Anda untuk masuk ke dalam <span className="text-neutral-250 font-bold">Secret Messenger</span>.</li>
                        </ol>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 2. Registrasi Username */}
                <div className="border border-neutral-900 rounded-xl overflow-hidden bg-[#0a0a0a]">
                  <button
                    onClick={() => setActiveGuideSec(activeGuideSec === 'username' ? null : 'username')}
                    className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-neutral-900/40 transition-all min-h-[44px]"
                  >
                    <span className="text-xs font-bold text-neutral-250 flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-md bg-indigo-950/40 text-indigo-400 border border-indigo-900/60 flex items-center justify-center text-[10px] font-mono font-bold">2</span>
                      <span>Registrasi Username & Akses</span>
                    </span>
                    {activeGuideSec === 'username' ? <ChevronUp size={14} className="text-neutral-500" /> : <ChevronDown size={14} className="text-neutral-500" />}
                  </button>

                  <AnimatePresence>
                    {activeGuideSec === 'username' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-4 border-t border-neutral-900/50 pt-3 text-[11px] text-neutral-400 space-y-2.5 leading-relaxed"
                      >
                        <p>Saat pertama kali masuk ke mode rahasia:</p>
                        <ol className="list-decimal list-inside space-y-1.5">
                          <li>Masuk ke halaman <span className="text-neutral-200 font-bold">Access Key</span> untuk membuat kunci akses awal.</li>
                          <li>Masuk ke menu <span className="text-neutral-200 font-bold">My Username</span> di halaman masuk.</li>
                          <li>Tentukan username unik Anda (misalnya: <span className="font-mono text-indigo-300 font-bold">@ismael</span>, <span className="font-mono text-indigo-300 font-bold">@alex01</span>).</li>
                        </ol>
                        <div className="p-2.5 rounded-lg bg-indigo-950/10 border border-indigo-950/30 text-[10px] text-neutral-450 mt-1">
                          <span className="font-bold text-indigo-300 block mb-0.5">⚠️ KETENTUAN USERNAME:</span>
                          Hanya boleh dibuat <span className="text-neutral-200 font-bold">sekali</span>, harus <span className="text-neutral-200 font-bold">unik</span>, dan tidak dapat diubah lagi setelah disimpan demi privasi server.
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 3. Menambahkan Teman */}
                <div className="border border-neutral-900 rounded-xl overflow-hidden bg-[#0a0a0a]">
                  <button
                    onClick={() => setActiveGuideSec(activeGuideSec === 'teman' ? null : 'teman')}
                    className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-neutral-900/40 transition-all min-h-[44px]"
                  >
                    <span className="text-xs font-bold text-neutral-250 flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-md bg-indigo-950/40 text-indigo-400 border border-indigo-900/60 flex items-center justify-center text-[10px] font-mono font-bold">3</span>
                      <span>Menambahkan Teman & Mulai Chat</span>
                    </span>
                    {activeGuideSec === 'teman' ? <ChevronUp size={14} className="text-neutral-500" /> : <ChevronDown size={14} className="text-neutral-500" />}
                  </button>

                  <AnimatePresence>
                    {activeGuideSec === 'teman' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-4 border-t border-neutral-900/50 pt-3 text-[11px] text-neutral-400 space-y-2.5 leading-relaxed"
                      >
                        <p>Tidak ada sistem daftar kontak otomatis untuk mencegah pelacakan:</p>
                        <ul className="list-disc list-inside space-y-1.5">
                          <li>Minta username teman Anda secara langsung (contoh: <span className="font-mono text-indigo-300 font-bold">fernandez</span>).</li>
                          <li>Masukkan username teman pada halaman utama <span className="text-neutral-200 font-bold">Secret Messenger</span>.</li>
                          <li>Ketuk tombol <span className="font-bold text-neutral-100 bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded text-[10px]">CONNECT</span>.</li>
                          <li>Jika username benar, ruang obrolan obrolan aman langsung terbuka.</li>
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 4. Fitur Komunikasi */}
                <div className="border border-neutral-900 rounded-xl overflow-hidden bg-[#0a0a0a]">
                  <button
                    onClick={() => setActiveGuideSec(activeGuideSec === 'fitur' ? null : 'fitur')}
                    className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-neutral-900/40 transition-all min-h-[44px]"
                  >
                    <span className="text-xs font-bold text-neutral-250 flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-md bg-indigo-950/40 text-indigo-400 border border-indigo-900/60 flex items-center justify-center text-[10px] font-mono font-bold">4</span>
                      <span>Pesan, Voice Note & Voice Call</span>
                    </span>
                    {activeGuideSec === 'fitur' ? <ChevronUp size={14} className="text-neutral-500" /> : <ChevronDown size={14} className="text-neutral-500" />}
                  </button>

                  <AnimatePresence>
                    {activeGuideSec === 'fitur' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-4 border-t border-neutral-900/50 pt-3 text-[11px] text-neutral-400 space-y-2.5 leading-relaxed"
                      >
                        <div className="space-y-2">
                          <div>
                            <span className="font-bold text-neutral-200 block">💬 Kirim Pesan:</span>
                            Ketik pesan Anda dan tekan tombol <span className="text-indigo-400 font-medium">Send</span>. Pesan terkirim secara instan & aman.
                          </div>
                          <div>
                            <span className="font-bold text-neutral-200 block">🎙️ Voice Note:</span>
                            Tekan dan tahan tombol mikrofon di samping input teks, rekam suara, lalu lepaskan untuk mengirimkannya secara otomatis.
                          </div>
                          <div>
                            <span className="font-bold text-neutral-200 block">📞 1-on-1 Voice Call (WebRTC):</span>
                            Ketuk ikon <span className="text-indigo-400 font-medium">Telepon</span> di kanan atas ruang chat. Panggilan aman peer-to-peer akan dimulai seketika melalui signaling rahasia Firestore.
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 5. Keamanan & Tips */}
                <div className="border border-neutral-900 rounded-xl overflow-hidden bg-[#0a0a0a]">
                  <button
                    onClick={() => setActiveGuideSec(activeGuideSec === 'tips' ? null : 'tips')}
                    className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-neutral-900/40 transition-all min-h-[44px]"
                  >
                    <span className="text-xs font-bold text-neutral-250 flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-md bg-indigo-950/40 text-indigo-400 border border-indigo-900/60 flex items-center justify-center text-[10px] font-mono font-bold">5</span>
                      <span>Lock Cepat & Tips Keamanan</span>
                    </span>
                    {activeGuideSec === 'tips' ? <ChevronUp size={14} className="text-neutral-500" /> : <ChevronDown size={14} className="text-neutral-500" />}
                  </button>

                  <AnimatePresence>
                    {activeGuideSec === 'tips' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-4 border-t border-neutral-900/50 pt-3 text-[11px] text-neutral-400 space-y-2.5 leading-relaxed"
                      >
                        <div className="space-y-2">
                          <div>
                            <span className="font-bold text-neutral-200 block">🔒 Tombol Lock Now:</span>
                            Ketuk tombol gembok di kanan atas header chat. Sesi langsung ditutup, semua memori dihapus, dan aplikasi kembali menyamar sebagai kalkulator ilmiah biasa.
                          </div>
                          <div>
                            <span className="font-bold text-rose-400 block">⚠️ Jika Lupa Access Key:</span>
                            Tidak ada fitur "Forgot Password" karena data terenkripsi lokal dan kami tidak menyimpan sandi Anda di cloud demi privasi mutlak. Jika lupa, Anda harus melakukan <span className="text-rose-400 font-bold">Wipe Data</span> di menu data.
                          </div>
                        </div>
                        <ul className="list-disc list-inside mt-2 space-y-1 text-neutral-500 text-[10px]">
                          <li>Jangan pernah membagikan Access Key kepada siapa pun.</li>
                          <li>Cukup bagikan username Anda untuk dihubungi teman.</li>
                          <li>Gunakan tombol Lock Now sebelum meminjamkan HP ke orang lain.</li>
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* SYSTEM INFORMATION & CHANGELOGS */}
        <section className="bg-[#121212] border border-neutral-900 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-900/60 pb-3">
            <div className="flex items-center space-x-2.5">
              <Info className="text-neutral-400" size={14} />
              <h2 className="font-bold text-xs tracking-wider uppercase text-neutral-300">App Info & Changelogs</h2>
            </div>
            <button
              onClick={() => setChangelogExpanded(!changelogExpanded)}
              className="p-1.5 text-neutral-400 hover:text-neutral-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              {changelogExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          <AnimatePresence initial={false}>
            {changelogExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-4 overflow-hidden"
              >
                {/* Tech info specs list */}
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-neutral-550">
                  <div className="p-2.5 rounded-lg bg-[#0a0a0a] border border-neutral-900/60 flex items-center space-x-2">
                    <Cpu size={12} className="text-neutral-600" />
                    <div>
                      <span className="block text-neutral-600 text-[9px]">ENVIRONMENT</span>
                      <span className="text-neutral-450 font-bold uppercase">{settings.environment}</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#0a0a0a] border border-neutral-900/60 flex items-center space-x-2">
                    <Calendar size={12} className="text-neutral-600" />
                    <div>
                      <span className="block text-neutral-600 text-[9px]">BUILD DATE</span>
                      <span className="text-neutral-450 font-bold">{settings.buildDate}</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#0a0a0a] border border-neutral-900/60 flex items-center space-x-2">
                    <Info size={12} className="text-neutral-600" />
                    <div>
                      <span className="block text-neutral-600 text-[9px]">VERSION</span>
                      <span className="text-neutral-450 font-bold">{settings.version}</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#0a0a0a] border border-neutral-900/60 flex items-center space-x-2">
                    <Sparkles size={12} className="text-neutral-600" />
                    <div>
                      <span className="block text-neutral-600 text-[9px]">FRAMEWORK</span>
                      <span className="text-neutral-450 font-bold">REACT + TS</span>
                    </div>
                  </div>
                </div>

                {/* Changelog contents */}
                <div className="border-t border-neutral-900/60 pt-3 space-y-4">
                  {changelogs.map((entry, cIdx) => (
                    <div key={entry.version} className={cIdx > 0 ? 'border-t border-neutral-900/40 pt-3' : ''}>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-bold text-neutral-200">{entry.version} Changelog</span>
                        <span className="text-neutral-500 font-mono text-[10px]">{entry.date}</span>
                      </div>
                      <ul className="space-y-1.5 pl-1">
                        {entry.changes.map((item, idx) => (
                          <li key={idx} className="text-[11px] text-neutral-450 flex items-start space-x-2 leading-relaxed">
                            <span className={`font-mono font-bold select-none ${
                              item.type === 'added' ? 'text-neutral-400' : item.type === 'removed' ? 'text-neutral-600' : 'text-neutral-500'
                            }`}>
                              {item.type === 'added' ? '+' : item.type === 'removed' ? '-' : '*'}
                            </span>
                            <span>{item.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

      </div>

      {/* Wipe Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-md z-40 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.97, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.97, y: 10 }}
              className="w-full max-w-sm bg-[#121212] border border-neutral-900 rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="w-12 h-12 rounded-xl bg-rose-950/20 border border-rose-950/60 flex items-center justify-center text-rose-450 mx-auto">
                <AlertTriangle size={20} />
              </div>

              <div className="text-center space-y-2">
                <h3 className="font-bold text-neutral-100 text-base uppercase">PURGE STORAGE?</h3>
                <p className="text-xs text-neutral-500 leading-relaxed max-w-[260px] mx-auto">
                  This action is irreversible. All of your secret notes, passwords, journals, and local cache will be permanently wiped.
                </p>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-850 text-neutral-400 text-xs font-bold cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    resetAllData();
                    setShowResetConfirm(false);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-rose-950/40 hover:bg-rose-950/60 border border-rose-900/50 text-rose-400 text-xs font-bold cursor-pointer min-h-[44px]"
                >
                  Confirm Purge
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

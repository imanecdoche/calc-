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
  HelpCircle,
  User as UserIcon,
  Eye,
  EyeOff,
  Keyboard as KeyboardIcon
} from 'lucide-react';
import { AppScreen, ChangelogEntry, AppSettings, SecretShortcut } from '../types';
import { FullscreenManager } from '../services/FullscreenManager';
import { useChatViewModel } from '../hooks/ChatViewModel';
import { Zap, Plus, X } from 'lucide-react';

interface SettingsScreenProps {
  settings: AppSettings;
  setSettings?: React.Dispatch<React.SetStateAction<AppSettings>>;
  currentPasswordVal: string;
  changePassword: (newPass: string) => boolean;
  exportData: () => void;
  importData: (jsonStr: string) => boolean;
  resetAllData: () => void;
  clearCache: () => void;
  getStorageUsage: () => string;
  onBack: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  isSecureEnclave?: boolean;
  shortcuts?: SecretShortcut[];
  addShortcut?: (shortcut: Omit<SecretShortcut, 'id'>) => void;
  deleteShortcut?: (id: string) => void;
}

export default function SettingsScreen({
  settings,
  setSettings,
  currentPasswordVal,
  changePassword,
  exportData,
  importData,
  resetAllData,
  clearCache,
  getStorageUsage,
  onBack,
  showToast,
  isSecureEnclave = false,
  shortcuts = [],
  addShortcut,
  deleteShortcut
}: SettingsScreenProps) {
  // Passcode editing states
  const [editingPasscode, setEditingPasscode] = useState(false);
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');

  // Changelog expand state
  const [changelogExpanded, setChangelogExpanded] = useState(false);

  // Chat Account password states
  const chatViewModel = useChatViewModel();
  const myUsername = chatViewModel.myUsername || '';
  const myShortcuts = shortcuts.filter(s => s.ownerUsername === myUsername);
  const [chatPasswordInput, setChatPasswordInput] = useState('');
  const [showChatPassword, setShowChatPassword] = useState(false);
  const [isUpdatingChatPassword, setIsUpdatingChatPassword] = useState(false);

  // File picker upload drag state
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset confirmation modal state
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Logout confirmation modal states
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  // Shortcut states
  const [shortcutCombination, setShortcutCombination] = useState('');
  const [shortcutTargetUser, setShortcutTargetUser] = useState('');
  const [shortcutRequiresAccessKey, setShortcutRequiresAccessKey] = useState(false);

  const handleAddShortcutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const activeUsername = chatViewModel.myUsername || '';
    if (!activeUsername) {
      showToast('Anda harus masuk ke akun Chat terlebih dahulu.', 'error');
      return;
    }

    const cleanCombination = shortcutCombination.trim().replace(/\s+/g, '');
    const cleanTargetUser = shortcutTargetUser.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    if (!cleanCombination) {
      showToast('Kombinasi angka tidak boleh kosong.', 'error');
      return;
    }
    if (!cleanTargetUser) {
      showToast('Username target tidak boleh kosong.', 'error');
      return;
    }

    // Check if the combination is already registered for this user
    if (shortcuts.some(s => s.combination === cleanCombination && s.ownerUsername === activeUsername)) {
      showToast('Kombinasi ini sudah digunakan oleh pintasan Anda yang lain.', 'error');
      return;
    }

    if (cleanCombination === '1+2+3' || cleanCombination === '3+2+1') {
      showToast('Kombinasi ini dicadangkan untuk sistem.', 'error');
      return;
    }

    if (addShortcut) {
      addShortcut({
        combination: cleanCombination,
        targetUsername: cleanTargetUser,
        requiresAccessKey: shortcutRequiresAccessKey,
        ownerUsername: activeUsername,
      });
      setShortcutCombination('');
      setShortcutTargetUser('');
      setShortcutRequiresAccessKey(false);
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

  const handleUpdateChatPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPassword = chatPasswordInput.trim();
    if (!cleanPassword || cleanPassword.length < 4) {
      showToast('Sandi minimal harus 4 karakter.', 'error');
      return;
    }
    
    setIsUpdatingChatPassword(true);
    const res = await chatViewModel.updateMyPassword(cleanPassword);
    setIsUpdatingChatPassword(false);

    if (res.success) {
      showToast('Sandi akun chat berhasil diperbarui!', 'success');
      setChatPasswordInput('');
    } else {
      showToast(res.error || 'Gagal memperbarui sandi.', 'error');
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
      version: 'v2.5.2',
      date: '2026-07-12',
      changes: [
        { type: 'improved', text: 'Memperbaiki logika terminal agar masukan Kunci Akses (1234) memvalidasi enkripsi terminal terlebih dahulu alih-alih mendaftarkan @1234 sebagai nama entity' }
      ]
    },
    {
      version: 'v2.5.1',
      date: '2026-07-12',
      changes: [
        { type: 'added', text: 'Mengamankan terminal agar selalu meminta verifikasi Access Key (Akses Kunci) saat masuk dari pintasan matematika kalkulator' },
        { type: 'improved', text: 'Mencegah bypass otentikasi otomatis yang disebabkan oleh cache profil Firebase' }
      ]
    },
    {
      version: 'v2.5.0',
      date: '2026-07-12',
      changes: [
        { type: 'added', text: 'Menghubungkan pintasan kalkulator rahasia 1+2+3 diikuti "=" dua kali langsung menuju ke terminal retro akses kunci' },
        { type: 'improved', text: 'Operasi 1+2+3 sekarang mengembalikan hasil riil 6 untuk penyamaran kalkulator yang presisi dan realistis' }
      ]
    },
    {
      version: 'v2.4.0',
      date: '2026-07-12',
      changes: [
        { type: 'added', text: 'Mengubah tampilan layar access key (login/register) dan layar input entity tujuan menjadi satu kesatuan aliran Terminal Retro' },
        { type: 'added', text: 'Mendukung prompt input api key access dan prompt declare the destination entity di halaman terminal yang sama dengan inline cursor' },
        { type: 'improved', text: 'Integrasi penuh dengan keyboard fisik dan on-screen digital keyboard kustom' }
      ]
    },
    {
      version: 'v2.3.0',
      date: '2026-07-12',
      changes: [
        { type: 'added', text: 'Simulasi hacking interaktif dengan running code log & progress bar realistis selama 6 detik saat mendeteksi shake hp, tombol exit, tombol lock, atau lock layar' },
        { type: 'added', text: 'Transisi Pitch Black blackout selama 2 detik sebelum aman dialihkan kembali ke kalkulator' },
        { type: 'improved', text: 'Dukungan double-click header obrolan dan Alt+S sebagai simulasi testing guncangan (shake) di browser desktop' }
      ]
    },
    {
      version: 'v2.2.0',
      date: '2026-07-12',
      changes: [
        { type: 'added', text: 'Menghapus referensi teks "Secret Messenger" untuk penyamaran (disguise) yang lebih aman' },
        { type: 'added', text: 'Mengganti istilah "username" menjadi "entity" di seluruh antarmuka pengguna' },
        { type: 'improved', text: 'Menyederhanakan layar Access Key (Unlock) hanya menampilkan input field dan numpad tanpa teks instruksi atau placeholder' }
      ]
    },
    {
      version: 'v2.1.0',
      date: '2026-07-12',
      changes: [
        { type: 'added', text: 'Menambahkan pengaturan pilihan keyboard (Keyboard Sistem vs Keyboard Virtual)' },
        { type: 'added', text: 'Menambahkan pengaturan tinggi (height) keyboard virtual native-app yang bisa disesuaikan' },
        { type: 'improved', text: 'Integrasi otomatis preferensi keyboard per pengguna dengan sistem pencadangan JSON' }
      ]
    },
    {
      version: 'v2.0.0',
      date: '2026-07-12',
      changes: [
        { type: 'added', text: 'Menambahkan fitur Pintasan Rahasia (Secret Shortcuts) pada Numpad Kalkulator' },
        { type: 'added', text: 'Integrasi bypass Kunci Akses (Access Key) opsional untuk masuk instan ke ruang obrolan tertentu' },
        { type: 'added', text: 'Menambahkan pengaturan konfigurasi Pintasan Rahasia yang hanya muncul di lapisan Secure Enclave' }
      ]
    },
    {
      version: 'v1.9.0',
      date: '2026-07-12',
      changes: [
        { type: 'added', text: 'Menambahkan fitur Kunci Wikipedia Disguise (menyamarkan chat room menjadi halaman Wikipedia acak luring/daring)' },
        { type: 'added', text: 'Menambahkan tombol menu hamburger rahasia di header Wikipedia untuk kembali ke halaman Kalkulator awal' },
        { type: 'added', text: 'Menambahkan sensor guncangan (shake) otomatis yang mengalihkan tampilan obrolan ke Wikipedia secara instan saat diguncang' },
        { type: 'added', text: 'Menambahkan deteksi kunci layar otomatis (visibilitychange/pagehide) untuk menyembunyikan obrolan saat ponsel mati/terkunci' },
        { type: 'improved', text: 'Optimalisasi laci luring (mockup) artikel Wikipedia berbahasa Indonesia dengan fakta ensiklopedis nyata' }
      ]
    },
    {
      version: 'v1.8.0',
      date: '2026-07-12',
      changes: [
        { type: 'added', text: 'Menambahkan pelacakan kehadiran real-time (sistem heartbeat kehadiran pengguna)' },
        { type: 'added', text: 'Menambahkan indikator status online di dalam header chat jika kontak membuka obrolan yang sama' },
        { type: 'added', text: 'Menambahkan info status offline relatif (contoh: offline (3 min ago)) jika kontak tidak aktif' },
        { type: 'improved', text: 'Penyempurnaan header obrolan lengket (sticky header) dengan indikator visual titik sinyal aktif (aktif/tidak aktif)' },
        { type: 'improved', text: 'Integrasi status mengetik (typing...) langsung di bawah nama kontak di header obrolan' }
      ]
    },
    {
      version: 'v1.7.0',
      date: '2026-07-12',
      changes: [
        { type: 'added', text: 'Menambahkan fitur Logout Akun Chat di menu Pengaturan' },
        { type: 'added', text: 'Menambahkan dialog konfirmasi internal sebelum proses logout untuk mencegah ketidaksengajaan' },
        { type: 'improved', text: 'Mengintegrasikan pelepasan hak akses dan pembersihan sesi aktif saat logout secara real-time' }
      ]
    },
    {
      version: 'v1.6.0',
      date: '2026-07-12',
      changes: [
        { type: 'added', text: 'Menambahkan autentikasi Sandi Akun untuk registrasi, login silang perangkat, dan keamanan ganda' },
        { type: 'added', text: 'Menambahkan panel Manajemen Keamanan Sandi untuk akun chat yang sudah ada' },
        { type: 'added', text: 'Menambahkan portal Kelola Akun (DevTools) rahasia via trigger math 3+2+1= dan kode akses 4321' },
        { type: 'improved', text: 'Validasi ketat username hanya mendukung karakter a-z dan 0-9 dengan pembersihan otomatis saat mengetik' },
        { type: 'removed', text: 'Menghapus panduan pengguna interaktif dari menu pengaturan' },
        { type: 'removed', text: 'Menghapus fitur rekam & kirim pesan suara (Voice Note) dari ruang chat' },
        { type: 'removed', text: 'Menghapus petunjuk visual sandi kalkulator default (Default Key: 1234) demi privasi penuh' }
      ]
    },
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
                className="px-4 py-2 text-xs font-bold rounded-lg bg-neutral-900 border border-neutral-850 hover:bg-neutral-800 hover:border-neutral-700 text-neutral-200 cursor-pointer min-h-[44px]"
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

        {/* SECRET SHORTCUTS SECTION (ONLY IF IN SECURE ENCLAVE) */}
        {isSecureEnclave && (
          <section className="bg-[#121212] border border-neutral-900 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center space-x-2.5 border-b border-neutral-900/60 pb-3">
              <Zap className="text-amber-500 animate-pulse" size={14} />
              <h2 className="font-bold text-xs tracking-wider uppercase text-neutral-300">Pintasan Rahasia (Secret Shortcuts)</h2>
            </div>
            
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Buat kombinasi angka rahasia pada numpad kalkulator untuk langsung masuk ke obrolan pengguna tertentu. Contoh: tekan <code className="px-1.5 py-0.5 bg-neutral-950 rounded text-amber-400 font-mono text-[10px]">001277</code> lalu klik <code className="px-1.5 py-0.5 bg-neutral-950 rounded text-neutral-300 font-mono text-[10px]">=</code> untuk langsung membuka ruang obrolan <span className="font-mono text-neutral-200 font-semibold">@anonim277</span>.
            </p>

            {!myUsername ? (
              <div className="text-center py-5 bg-[#0a0a0a]/50 rounded-xl border border-neutral-900/60 p-4">
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Silakan masuk atau daftar akun Chat terlebih dahulu pada layar Secure Chat untuk dapat mengelola pintasan rahasia Anda.
                </p>
              </div>
            ) : (
              <>
                {/* Form to Add Shortcut */}
                <form onSubmit={handleAddShortcutSubmit} className="space-y-3 pt-1 border-t border-neutral-900/40">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="shortcut-comb" className="block text-[9px] font-mono tracking-wider text-neutral-500 uppercase">Kombinasi Angka Numpad *</label>
                      <input
                        id="shortcut-comb"
                        type="text"
                        pattern="[0-9+*/.-]*"
                        placeholder="Contoh: 001277"
                        value={shortcutCombination}
                        onChange={(e) => setShortcutCombination(e.target.value)}
                        className="w-full bg-[#0a0a0a] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-neutral-150 font-mono outline-none focus:border-neutral-700 h-[40px]"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="shortcut-target" className="block text-[9px] font-mono tracking-wider text-neutral-500 uppercase">Entity Kontak Target *</label>
                      <input
                        id="shortcut-target"
                        type="text"
                        placeholder="Contoh: anonim277"
                        value={shortcutTargetUser}
                        onChange={(e) => setShortcutTargetUser(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                        className="w-full bg-[#0a0a0a] border border-neutral-850 rounded-xl px-3 py-2 text-xs text-neutral-150 font-mono outline-none focus:border-neutral-700 h-[40px]"
                        required
                      />
                    </div>
                  </div>

                  {/* Requires Access Key Toggle */}
                  <div className="flex items-center justify-between py-1 px-3 bg-[#0a0a0a] rounded-xl border border-neutral-900">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold text-neutral-300">Gunakan Kunci Akses (Access Key)</span>
                      <span className="text-[9px] text-neutral-500">Minta password kalkulator dulu sebelum masuk chat.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shortcutRequiresAccessKey}
                        onChange={(e) => setShortcutRequiresAccessKey(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-400 after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600 peer-checked:after:bg-white peer-checked:after:border-amber-600"></div>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={!shortcutCombination.trim() || !shortcutTargetUser.trim()}
                    className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:bg-neutral-900 disabled:text-neutral-600 text-neutral-950 font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center space-x-1.5 active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed h-[44px]"
                  >
                    <Plus size={14} />
                    <span>Buat Pintasan Rahasia</span>
                  </button>
                </form>

                {/* List of Shortcuts */}
                <div className="space-y-2 pt-2 border-t border-neutral-900/40">
                  <h3 className="text-[10px] font-mono tracking-wider text-neutral-400 uppercase">Daftar Pintasan Aktif ({myShortcuts.length})</h3>
                  {myShortcuts.length === 0 ? (
                    <div className="text-center py-4 bg-[#0a0a0a]/50 rounded-xl border border-neutral-900/60">
                      <p className="text-[10px] text-neutral-550">Belum ada pintasan rahasia yang dibuat untuk akun ini.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {myShortcuts.map((sh) => (
                        <div
                          key={sh.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-[#0a0a0a] border border-neutral-900"
                        >
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950/20 px-2 py-0.5 rounded border border-amber-900/40">
                                {sh.combination}
                              </span>
                              <span className="text-xs text-neutral-300 font-mono">
                                → @{sh.targetUsername}
                              </span>
                            </div>
                            <span className="text-[9px] text-neutral-500 font-medium">
                              {sh.requiresAccessKey ? '🔒 Memerlukan Kunci Akses' : '⚡ Masuk Instan (Bypass Kunci)'}
                            </span>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => deleteShortcut && deleteShortcut(sh.id)}
                            className="p-2 rounded-lg hover:bg-neutral-900/80 text-neutral-500 hover:text-rose-400 transition-all border border-transparent hover:border-neutral-850 min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
                            title="Hapus Pintasan"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {/* IDENTITAS AKUN SECRET CHAT */}
        <section className="bg-[#121212] border border-neutral-900 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center space-x-2.5 border-b border-neutral-900/60 pb-3">
            <UserIcon className="text-neutral-400" size={14} />
            <h2 className="font-bold text-xs tracking-wider uppercase text-neutral-300">Akun Chat & Keamanan</h2>
          </div>

          {chatViewModel.myUsername ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#0a0a0a] border border-neutral-900/60">
                <div>
                  <span className="text-xs text-neutral-400 block font-mono">Entity Anda</span>
                  <span className="text-xs font-bold text-neutral-100 font-mono">@{chatViewModel.myUsername}</span>
                </div>
                <div className="px-2 py-0.5 rounded bg-neutral-950 text-[9px] text-neutral-500 font-mono border border-neutral-900">
                  {chatViewModel.myUserHasPassword ? '🔒 Diproteksi Sandi' : '⚠️ Sandi Belum Diatur'}
                </div>
              </div>

              <form onSubmit={handleUpdateChatPassword} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase">
                    {chatViewModel.myUserHasPassword ? 'Ubah Sandi Akun Chat' : 'Atur Sandi Akun Chat (min. 4 kar)'}
                  </label>
                  <div className="relative">
                    <input
                      type={showChatPassword ? 'text' : 'password'}
                      placeholder="Masukkan sandi baru"
                      value={chatPasswordInput}
                      onChange={(e) => setChatPasswordInput(e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-neutral-850 rounded-xl px-4 py-2.5 text-xs text-neutral-100 font-mono outline-none focus:border-neutral-700"
                    />
                    <button
                      type="button"
                      onClick={() => setShowChatPassword(!showChatPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-400 min-w-[24px] flex items-center justify-center"
                    >
                      {showChatPassword ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingChatPassword || chatPasswordInput.trim().length < 4}
                  className="w-full py-2.5 rounded-xl bg-neutral-200 hover:bg-white text-neutral-950 disabled:bg-[#121212] disabled:text-neutral-600 text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer min-h-[44px]"
                >
                  {isUpdatingChatPassword ? <RefreshCw className="animate-spin" size={13} /> : null}
                  <span>{chatViewModel.myUserHasPassword ? 'Simpan Sandi Baru' : 'Atur Sandi Sekarang'}</span>
                </button>
              </form>

              <div className="border-t border-neutral-900/60 pt-4 flex flex-col space-y-2">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full py-2.5 rounded-xl bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 text-rose-400 hover:text-rose-300 text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer min-h-[44px]"
                >
                  <span>Keluar dari Akun (Logout)</span>
                </button>
                <p className="text-[10px] text-neutral-500 text-center leading-relaxed">
                  Gunakan tombol ini jika ingin login dengan entity lain pada perangkat ini.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 text-center bg-[#0a0a0a] rounded-xl border border-neutral-900/60">
              <p className="text-xs text-neutral-500 leading-relaxed">
                Anda belum mendaftarkan entity chat.<br />
                Silakan buka tab <span className="text-neutral-300 font-bold">Secure Chat</span> untuk mendaftar.
              </p>
            </div>
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

        {/* KEYBOARD SETTINGS */}
        <section className="bg-[#121212] border border-neutral-900 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center space-x-2.5 border-b border-neutral-900/60 pb-3">
            <KeyboardIcon className="text-neutral-400" size={14} />
            <h2 className="font-bold text-xs tracking-wider uppercase text-neutral-300">Keyboard Preferences</h2>
          </div>

          <div className="space-y-4">
            {/* Keyboard Type Selector */}
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs text-neutral-300 font-bold block">Tipe Keyboard Obrolan</span>
                  <span className="text-[10px] text-neutral-500 mt-0.5 block">Pilih jenis input keyboard untuk mengetik di obrolan rahasia.</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 bg-[#0a0a0a] p-1 rounded-xl border border-neutral-900">
                <button
                  type="button"
                  onClick={() => setSettings && setSettings(prev => ({ ...prev, keyboardType: 'system' }))}
                  className={`py-2 px-3 text-xs rounded-lg font-medium transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                    settings.keyboardType === 'system'
                      ? 'bg-neutral-850 border border-neutral-800 text-indigo-400 font-bold shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-350 border border-transparent'
                  }`}
                >
                  <span>Keyboard Sistem</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSettings && setSettings(prev => ({ ...prev, keyboardType: 'custom' }))}
                  className={`py-2 px-3 text-xs rounded-lg font-medium transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                    settings.keyboardType === 'custom'
                      ? 'bg-neutral-850 border border-neutral-800 text-indigo-400 font-bold shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-350 border border-transparent'
                  }`}
                >
                  <span>Keyboard Virtual App</span>
                </button>
              </div>
            </div>

            {/* Keyboard Height Slider */}
            <div className={`space-y-2.5 transition-all duration-300 ${settings.keyboardType === 'custom' ? 'opacity-100' : 'opacity-40 select-none pointer-events-none'}`}>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs text-neutral-300 font-bold block">Tinggi Keyboard Virtual</span>
                  <span className="text-[10px] text-neutral-500 mt-0.5 block">Sesuaikan tinggi keyboard virtual native-app.</span>
                </div>
                <span className="font-mono text-[10px] font-bold text-indigo-400 bg-indigo-950/20 border border-indigo-900/30 px-2 py-0.5 rounded-md">
                  {settings.keyboardHeight ?? 260}px
                </span>
              </div>
              <div className="flex items-center space-x-3 bg-[#0a0a0a] p-3 rounded-xl border border-neutral-900/60">
                <span className="text-[10px] font-mono text-neutral-550 select-none">200px</span>
                <input
                  type="range"
                  min="200"
                  max="360"
                  step="10"
                  disabled={settings.keyboardType !== 'custom'}
                  value={settings.keyboardHeight ?? 260}
                  onChange={(e) => setSettings && setSettings(prev => ({ ...prev, keyboardHeight: parseInt(e.target.value) }))}
                  className="flex-1 accent-indigo-500 bg-neutral-900 h-1.5 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                />
                <span className="text-[10px] font-mono text-neutral-550 select-none">360px</span>
              </div>
            </div>
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

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
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
                <h3 className="font-bold text-neutral-100 text-sm uppercase tracking-wider font-sans">LOGOUT AKUN CHAT?</h3>
                <p className="text-xs text-neutral-500 leading-relaxed max-w-[265px] mx-auto">
                  Anda akan keluar dari akun <strong className="text-neutral-200">@{chatViewModel.myUsername}</strong> pada perangkat ini. Pastikan Anda mengingat kata sandi Anda untuk masuk kembali di kemudian hari.
                </p>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  disabled={isLoggingOut}
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-850 text-neutral-400 text-xs font-bold cursor-pointer min-h-[44px]"
                >
                  Batal
                </button>
                <button
                  disabled={isLoggingOut}
                  onClick={async () => {
                    setIsLoggingOut(true);
                    const res = await chatViewModel.logout();
                    setIsLoggingOut(false);
                    setShowLogoutConfirm(false);
                    if (res.success) {
                      showToast('Berhasil keluar dari akun.', 'success');
                    } else {
                      showToast(res.error || 'Gagal logout.', 'error');
                    }
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-rose-950/40 hover:bg-rose-950/60 border border-rose-900/50 text-rose-400 text-xs font-bold cursor-pointer min-h-[44px] flex items-center justify-center"
                >
                  {isLoggingOut ? 'Mengeluarkan...' : 'Keluar Akun'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

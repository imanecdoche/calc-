import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  ArrowRight, 
  AlertCircle, 
  Settings, 
  Lock, 
  FolderLock,
  User as UserIcon,
  Fingerprint,
  Loader2,
  Shield,
  WifiOff,
  RefreshCw,
  EyeOff,
  Eye,
  Keyboard as KeyboardIcon
} from 'lucide-react';
import { useChatViewModel } from '../hooks/ChatViewModel';
import ChatScreen from './ChatScreen';
import { useCallViewModel } from '../hooks/CallViewModel';
import CallOverlay from './CallOverlay';
import { useDisguiseTrigger } from '../hooks/useDisguiseTrigger';
import { AppSettings } from '../types';

import { SecureWindowManager } from '../services/SecureWindowManager';
import { SessionTimeoutManager } from '../services/SessionTimeoutManager';
import { RecentTaskProtector } from '../services/RecentTaskProtector';
import VirtualKeyboard from './VirtualKeyboard';

interface SecretMessengerScreenProps {
  settings: AppSettings;
  onLock: () => void;
  onOpenSettings: () => void;
  onOpenVault: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  directTargetUser?: string | null;
  clearDirectTargetUser?: () => void;
}

export default function SecretMessengerScreen({
  settings,
  onLock,
  onOpenSettings,
  onOpenVault,
  showToast,
  directTargetUser,
  clearDirectTargetUser
}: SecretMessengerScreenProps) {
  const viewModel = useChatViewModel();
  const callViewModel = useCallViewModel(viewModel.myUsername);

  // Auto-redirect to Wikipedia disguise on shake or screen lock / background transition
  useDisguiseTrigger({
    isActive: true,
    onTrigger: () => {
      viewModel.disconnect();
      onLock();
    }
  });
  const [targetUsernameInput, setTargetUsernameInput] = useState('');
  const [myUsernameInput, setMyUsernameInput] = useState('');
  const [myPasswordInput, setMyPasswordInput] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // States for existing users adding password
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showAddPasswordForm, setShowAddPasswordForm] = useState(false);

  const [shakeTrigger, setShakeTrigger] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recent apps task protection state
  const [isAppVisible, setIsAppVisible] = useState(true);

  // Custom Virtual Keyboard active field state
  const [activeInputField, setActiveInputField] = useState<'my-username' | 'my-password' | 'target-username' | 'new-password' | null>(null);

  const handleVirtualKeyPress = (char: string) => {
    if (activeInputField === 'my-username') {
      const sanitized = (myUsernameInput + char).toLowerCase().replace(/[^a-z0-9]/g, '');
      setMyUsernameInput(sanitized);
      setRegisterError(null);
    } else if (activeInputField === 'my-password') {
      setMyPasswordInput(prev => prev + char);
      setRegisterError(null);
    } else if (activeInputField === 'target-username') {
      const sanitized = (targetUsernameInput + char).toLowerCase().replace(/[^a-z0-9]/g, '');
      setTargetUsernameInput(sanitized);
      viewModel.clearError();
    } else if (activeInputField === 'new-password') {
      setNewPasswordVal(prev => prev + char);
    }
  };

  const handleVirtualBackspace = () => {
    if (activeInputField === 'my-username') {
      setMyUsernameInput(prev => prev.slice(0, -1));
    } else if (activeInputField === 'my-password') {
      setMyPasswordInput(prev => prev.slice(0, -1));
    } else if (activeInputField === 'target-username') {
      setTargetUsernameInput(prev => prev.slice(0, -1));
    } else if (activeInputField === 'new-password') {
      setNewPasswordVal(prev => prev.slice(0, -1));
    }
  };

  const handleVirtualSpace = () => {
    if (activeInputField === 'my-password') {
      setMyPasswordInput(prev => prev + ' ');
    } else if (activeInputField === 'new-password') {
      setNewPasswordVal(prev => prev + ' ');
    }
  };

  const handleVirtualEnter = () => {
    if (activeInputField === 'my-username') {
      setActiveInputField('my-password');
    } else if (activeInputField === 'my-password') {
      handleAuthSubmit();
    } else if (activeInputField === 'target-username') {
      handleConnect();
    } else if (activeInputField === 'new-password') {
      handleAddPassword();
    }
  };

  // Manage visual viewport height to prevent keyboard obscuring
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!window.visualViewport) return;

    const handleResize = () => {
      setViewportHeight(window.visualViewport ? window.visualViewport.height : window.innerHeight);
    };

    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);
    handleResize();

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, []);

  // 1. Manage Web-equivalent of FLAG_SECURE and Session Inactivity Timeout
  useEffect(() => {
    const secureWindow = SecureWindowManager.getInstance();
    const timeoutManager = SessionTimeoutManager.getInstance();
    const taskProtector = RecentTaskProtector.getInstance();

    // Enable secure screenshots/copy restriction
    secureWindow.enableSecureMode();

    // Start 15 minutes inactivity timeout
    timeoutManager.startTracking(() => {
      viewModel.disconnect();
      onLock();
      showToast('Session locked automatically due to 15 minutes of inactivity.', 'info');
    });

    // Listen to tab visibility & blur events
    const unsubProtector = taskProtector.subscribe((visible) => {
      setIsAppVisible(visible);
    });

    return () => {
      secureWindow.disableSecureMode();
      timeoutManager.stopTracking();
      unsubProtector();
    };
  }, [onLock, viewModel, showToast]);

  // Handle direct target user from secret shortcut
  useEffect(() => {
    if (viewModel.myUsername && directTargetUser) {
      const target = directTargetUser;
      if (clearDirectTargetUser) {
        clearDirectTargetUser();
      }
      viewModel.connectToUser(target).then((success) => {
        if (success) {
          showToast(`Berhasil tersambung ke @${target}`, 'success');
        } else {
          showToast(`Gagal tersambung ke @${target}: User tidak ditemukan.`, 'error');
        }
      });
    }
  }, [viewModel.myUsername, directTargetUser, clearDirectTargetUser, viewModel.connectToUser, showToast]);

  // Handle register or login based on active mode
  const handleAuthSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUsername = myUsernameInput.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanPassword = myPasswordInput.trim();

    if (!cleanUsername) {
      setRegisterError('Entity tidak boleh kosong.');
      setShakeTrigger(true);
      setTimeout(() => setShakeTrigger(false), 500);
      return;
    }

    // Validate character format (standard lowercase alphanumeric)
    if (!/^[a-z0-9]{3,15}$/.test(cleanUsername)) {
      setRegisterError('Entity harus 3-15 karakter huruf kecil (a-z) dan angka (0-9).');
      setShakeTrigger(true);
      setTimeout(() => setShakeTrigger(false), 500);
      return;
    }

    if (!cleanPassword || cleanPassword.length < 4) {
      setRegisterError('Sandi minimal 4 karakter.');
      setShakeTrigger(true);
      setTimeout(() => setShakeTrigger(false), 500);
      return;
    }

    setRegisterError(null);
    setIsSubmitting(true);
    
    if (isLoginMode) {
      // Login to existing account
      const res = await viewModel.loginToExistingAccount(cleanUsername, cleanPassword);
      setIsSubmitting(false);
      if (res.success) {
        showToast(`Berhasil masuk sebagai @${cleanUsername}!`, 'success');
        setMyUsernameInput('');
        setMyPasswordInput('');
      } else {
        setRegisterError(res.error || 'Login gagal.');
        setShakeTrigger(true);
        setTimeout(() => setShakeTrigger(false), 500);
        showToast(res.error || 'Login gagal.', 'error');
      }
    } else {
      // Register new account with password
      const res = await viewModel.registerMyUsername(cleanUsername, cleanPassword);
      setIsSubmitting(false);
      if (res.success) {
        showToast(`Entity @${cleanUsername} berhasil didaftarkan!`, 'success');
        setMyUsernameInput('');
        setMyPasswordInput('');
      } else {
        setRegisterError(res.error || 'Entity sudah terpakai.');
        setShakeTrigger(true);
        setTimeout(() => setShakeTrigger(false), 500);
        showToast(res.error || 'Pendaftaran gagal.', 'error');
      }
    }
  };

  // Handle adding password for existing user
  const handleAddPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPassword = newPasswordVal.trim();
    if (!cleanPassword || cleanPassword.length < 4) {
      showToast('Sandi minimal harus 4 karakter.', 'error');
      return;
    }
 
    setIsUpdatingPassword(true);
    const res = await viewModel.updateMyPassword(cleanPassword);
    setIsUpdatingPassword(false);
 
    if (res.success) {
      showToast('Sandi berhasil ditambahkan! Anda sekarang bisa login di perangkat lain.', 'success');
      setNewPasswordVal('');
      setShowAddPasswordForm(false);
    } else {
      showToast(res.error || 'Gagal menambahkan sandi.', 'error');
    }
  };
 
  // Handle connecting to a target user
  const handleConnect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanTarget = targetUsernameInput.trim().toLowerCase();
    if (!cleanTarget) return;

    const success = await viewModel.connectToUser(cleanTarget);
    if (success) {
      showToast(`Encrypted link established with ${cleanTarget}`, 'success');
      setTargetUsernameInput('');
    } else {
      setShakeTrigger(true);
      setTimeout(() => setShakeTrigger(false), 500);
      showToast(viewModel.errorMsg || 'User not found.', 'error');
    }
  };

  // Connection State Indicators
  const renderConnectionBadge = () => {
    const state = viewModel.connectionState;
    if (state === 'offline') {
      return (
        <span className="flex items-center space-x-1 font-mono text-[9px] text-neutral-400 font-semibold bg-[#161616] px-2 py-0.5 rounded-md border border-neutral-850">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          <span>Offline</span>
        </span>
      );
    }
    if (state === 'connecting') {
      return (
        <span className="flex items-center space-x-1 font-mono text-[9px] text-neutral-400 font-semibold bg-[#161616] px-2 py-0.5 rounded-md border border-neutral-850">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span>Connecting</span>
        </span>
      );
    }
    return (
      <span className="flex items-center space-x-1 font-mono text-[9px] text-neutral-300 font-semibold bg-[#161616] px-2 py-0.5 rounded-md border border-neutral-850">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span>Linked</span>
      </span>
    );
  };

  return (
    <div 
      className="absolute inset-0 bg-[#0a0a0a] flex flex-col justify-between text-neutral-100 select-none"
      style={viewportHeight ? { height: `${viewportHeight}px`, bottom: 'auto' } : {}}
    >
      
      {/* 1. Header (Sticky Top, Very Discreet) */}
      {!viewModel.activeTargetUser && (
        <header className="min-h-14 h-auto pt-[env(safe-area-inset-top,0px)] pb-1.5 bg-[#0a0a0a] border-b border-neutral-900 flex items-center justify-between px-4 sticky top-0 z-30 flex-none">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-neutral-500">
              <Lock size={12} className="stroke-[2.5]" />
            </div>
            {renderConnectionBadge()}
          </div>

          {/* Navigation Actions to other components */}
          <div className="flex items-center space-x-1.5">
            {/* Open Vault (Notes, Password, Diary) */}
            <button
              onClick={onOpenVault}
              title="Open Vault"
              aria-label="Open Vault"
              className="p-2.5 rounded-xl hover:bg-neutral-900 border border-transparent hover:border-neutral-800 text-neutral-400 hover:text-neutral-200 transition-all cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <FolderLock size={15} />
            </button>
            
            {/* Settings button */}
            <button
              onClick={onOpenSettings}
              title="Open Settings"
              aria-label="Open Settings"
              className="p-2.5 rounded-xl hover:bg-neutral-900 border border-transparent hover:border-neutral-800 text-neutral-400 hover:text-neutral-200 transition-all cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <Settings size={15} />
            </button>

            {/* Quick Lock back to calculator (Instant Lock, No dialog, clears all) */}
            <button
              onClick={() => {
                viewModel.disconnect();
                onLock();
              }}
              title="Lock Now"
              aria-label="Lock Now"
              className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-rose-400 hover:bg-rose-950/10 hover:border-rose-950 text-xs font-medium transition-all flex items-center space-x-1.5 cursor-pointer min-h-[44px]"
            >
              <Lock size={11} />
              <span>Lock</span>
            </button>
          </div>
        </header>
      )}

      {/* Offline Alert Banner */}
      <AnimatePresence>
        {viewModel.connectionState === 'offline' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-neutral-900 border-b border-neutral-850 py-2 px-4 flex items-center justify-between z-20 flex-none"
          >
            <div className="flex items-center space-x-2 text-neutral-400 text-xs font-mono">
              <WifiOff size={13} className="animate-pulse" />
              <span>Offline mode. Reconnecting...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Main Container with smooth screen toggle */}
      <div className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait">
          {viewModel.isLoading || viewModel.connectingToUser ? (
            // CONNECTING / LOADING STATE
            <motion.div
              key="loading-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center px-6 bg-[#0a0a0a]"
            >
              <div className="flex flex-col items-center space-y-4">
                <div className="relative flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full border border-neutral-900 border-t-neutral-350 animate-spin" />
                  <RefreshCw className="absolute w-3 h-3 text-neutral-400 animate-pulse" />
                </div>
                <div className="flex flex-col items-center space-y-1">
                  <span className="font-mono text-[10px] text-neutral-400 tracking-wider uppercase font-semibold">
                    {viewModel.connectingToUser ? 'Connecting Link...' : 'Starting Secure Node...'}
                  </span>
                </div>
              </div>
            </motion.div>
          ) : !viewModel.myUsername ? (
            // REGISTER / LOGIN SCREEN
            <motion.div
              key="register-screen"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 flex flex-col items-center justify-center px-6 bg-[#0a0a0a]"
            >
              <div className="w-full max-w-xs flex flex-col items-center">
                {/* Visual Icon */}
                <div className="w-14 h-14 rounded-xl bg-[#121212] border border-neutral-850 flex items-center justify-center shadow-md mb-5">
                  <Fingerprint size={24} className="text-neutral-300" />
                </div>

                <h1 className="font-bold text-sm tracking-tight text-neutral-150 text-center mb-1">
                  {isLoginMode ? 'Login ke Akun' : 'Daftar Akun Baru'}
                </h1>
                <p className="text-[11px] text-neutral-500 text-center mb-6 max-w-[240px]">
                  {isLoginMode 
                    ? 'Masuk ke identitas terdaftar Anda agar terhubung lintas perangkat.' 
                    : 'Pilih nama entity dan kata sandi unik untuk identitas terenkripsi Anda.'}
                </p>

                {/* Form Auth */}
                <form onSubmit={handleAuthSubmit} className="w-full space-y-3.5">
                  <div className="space-y-1">
                    <label htmlFor="my-username" className="block text-[9px] font-mono tracking-wider text-neutral-500 uppercase">
                      Entity
                    </label>
                    <motion.div
                      animate={shakeTrigger ? { x: [-6, 6, -6, 6, 0] } : {}}
                      transition={{ duration: 0.4 }}
                      className="relative"
                    >
                      <input
                        id="my-username"
                        type="text"
                        inputMode="none"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="Contoh: alex01, ismael"
                        value={myUsernameInput}
                        onChange={(e) => {
                          const sanitizedValue = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
                          setMyUsernameInput(sanitizedValue);
                          setRegisterError(null);
                        }}
                        onFocus={() => setActiveInputField('my-username')}
                        autoFocus
                        disabled={isSubmitting}
                        className={`w-full px-4 py-2.5 bg-[#121212] border ${
                          registerError 
                            ? 'border-rose-950/80 focus:border-rose-800 text-rose-300' 
                            : 'border-neutral-900 focus:border-neutral-800 text-neutral-200'
                        } rounded-xl text-base sm:text-xs placeholder-neutral-700 focus:outline-none transition-all duration-150 text-center font-mono`}
                      />
                    </motion.div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="my-password" className="block text-[9px] font-mono tracking-wider text-neutral-500 uppercase">
                      Sandi (Password)
                    </label>
                    <div className="relative">
                      <input
                        id="my-password"
                        type={showPassword ? "text" : "password"}
                        inputMode="none"
                        placeholder={isLoginMode ? "Masukkan kata sandi" : "Sandi minimal 4 karakter"}
                        value={myPasswordInput}
                        onChange={(e) => {
                          setMyPasswordInput(e.target.value);
                          setRegisterError(null);
                        }}
                        onFocus={() => setActiveInputField('my-password')}
                        disabled={isSubmitting}
                        className={`w-full px-4 py-2.5 bg-[#121212] border ${
                          registerError 
                            ? 'border-rose-950/80 focus:border-rose-800 text-rose-300' 
                            : 'border-neutral-900 focus:border-neutral-800 text-neutral-200'
                        } rounded-xl text-base sm:text-xs placeholder-neutral-700 focus:outline-none transition-all duration-150 text-center font-mono`}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-400 min-w-[24px] flex items-center justify-center"
                      >
                        {showPassword ? <Eye size={12} /> : <EyeOff size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* Register Error text */}
                  <AnimatePresence>
                    {registerError && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="flex items-center justify-center space-x-1.5 text-rose-500 text-[11px] font-medium py-0.5"
                      >
                        <AlertCircle size={12} />
                        <span>{registerError}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit"
                    disabled={!myUsernameInput.trim() || !myPasswordInput.trim() || isSubmitting}
                    className="w-full py-3 px-4 rounded-xl bg-neutral-200 hover:bg-white text-neutral-950 disabled:bg-[#121212] disabled:text-neutral-600 border border-transparent disabled:border-neutral-850/40 font-bold text-xs tracking-wider uppercase transition-all duration-200 flex items-center justify-center space-x-2 active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <Loader2 size={13} className="animate-spin text-neutral-500" />
                    ) : (
                      <>
                        <span>{isLoginMode ? 'Login ke Akun' : 'Daftar Entity'}</span>
                        <ArrowRight size={12} className="text-neutral-600" />
                      </>
                    )}
                  </button>
                </form>

                {/* Toggle Register / Login button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginMode(!isLoginMode);
                    setRegisterError(null);
                    setMyUsernameInput('');
                    setMyPasswordInput('');
                  }}
                  className="mt-6 text-xs text-neutral-400 hover:text-neutral-200 underline cursor-pointer font-medium tracking-wide"
                >
                  {isLoginMode ? 'Belum punya akun? Buat akun di sini' : 'Sudah punya akun? Login ke akun yg sudah ada'}
                </button>

              </div>
            </motion.div>
          ) : !viewModel.activeTargetUser ? (
            // CONNECT HOME SCREEN (My Username established)
            <motion.div
              key="connect-screen"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 flex flex-col items-center justify-center px-6"
            >
              <div className="w-full max-w-xs flex flex-col items-center">
                {/* Logo Kecil */}
                <div className="w-14 h-14 rounded-xl bg-[#121212] border border-neutral-850 flex items-center justify-center shadow-md mb-5 relative group">
                  <MessageSquare size={24} className="text-neutral-300" />
                </div>

                {/* My Username Display Menu */}
                <div className="flex flex-col items-center space-y-2 mb-8 w-full max-w-xs">
                  <div className="flex items-center space-x-1.5 bg-[#121212] border border-neutral-900 px-3 py-1.5 rounded-md text-[10px] font-mono text-neutral-400">
                    <UserIcon size={11} />
                    <span>Your profile: <strong className="text-neutral-200 font-bold">@{viewModel.myUsername}</strong></span>
                  </div>

                  {/* Warn if no password, allowing existing users to add password */}
                  {!viewModel.myUserHasPassword && (
                    <div className="w-full bg-amber-950/20 border border-amber-900/30 p-3 rounded-xl text-left">
                      {!showAddPasswordForm ? (
                        <div>
                          <p className="text-[10px] text-amber-300 leading-relaxed font-sans mb-2">
                            ⚠️ Akun belum dilindungi sandi. Tambahkan sandi agar Anda dapat login lintas perangkat.
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowAddPasswordForm(true)}
                            className="text-[10px] font-bold text-amber-200 underline hover:text-amber-100 uppercase tracking-wider"
                          >
                            Atur Sandi Sekarang
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={handleAddPassword} className="space-y-2 w-full">
                          <label className="block text-[9px] font-mono tracking-wider text-amber-300 uppercase">
                            Buat Sandi Baru (min. 4 kar)
                          </label>
                          <div className="flex space-x-2">
                            <input
                              type="password"
                              inputMode="none"
                              placeholder="Sandi baru"
                              value={newPasswordVal}
                              onChange={(e) => setNewPasswordVal(e.target.value)}
                              onFocus={() => setActiveInputField('new-password')}
                              className="flex-1 px-3 py-1.5 bg-[#0a0a0a] border border-amber-900 focus:border-amber-700 text-amber-200 rounded-lg text-xs font-mono focus:outline-none"
                            />
                            <button
                              type="submit"
                              disabled={isUpdatingPassword || newPasswordVal.trim().length < 4}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-900 disabled:text-neutral-700 text-neutral-950 rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer"
                            >
                              {isUpdatingPassword ? '...' : 'Simpan'}
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddPasswordForm(false);
                              setNewPasswordVal('');
                            }}
                            className="text-[9px] font-bold text-neutral-500 hover:text-neutral-400"
                          >
                            Batal
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>

                {/* Form Connect */}
                <form onSubmit={handleConnect} className="w-full space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="target-username" className="block text-[10px] font-mono tracking-wider text-neutral-500 uppercase">
                      ENTER DESTINATION ENTITY
                    </label>
                    <motion.div
                      animate={shakeTrigger ? { x: [-6, 6, -6, 6, 0] } : {}}
                      transition={{ duration: 0.4 }}
                      className="relative"
                    >
                      <input
                        id="target-username"
                        type="text"
                        inputMode="none"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="Contoh: ismael, fernandez, alex01"
                        value={targetUsernameInput}
                        onChange={(e) => {
                          const sanitizedValue = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
                          setTargetUsernameInput(sanitizedValue);
                          viewModel.clearError();
                        }}
                        onFocus={() => setActiveInputField('target-username')}
                        autoFocus
                        className={`w-full px-4 py-3 bg-[#121212] border ${
                          viewModel.errorMsg 
                            ? 'border-rose-950/80 focus:border-rose-800 text-rose-300' 
                            : 'border-neutral-900 focus:border-neutral-800 text-neutral-200'
                        } rounded-xl text-base sm:text-xs placeholder-neutral-700 focus:outline-none transition-all duration-150 text-center font-mono`}
                      />
                    </motion.div>
                  </div>

                  {/* Error State: User not found */}
                  <AnimatePresence>
                    {viewModel.errorMsg && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="flex items-center justify-center space-x-1.5 text-rose-500 text-xs font-medium py-1"
                      >
                        <AlertCircle size={13} />
                        <span>{viewModel.errorMsg}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit"
                    disabled={!targetUsernameInput.trim()}
                    className="w-full py-3 px-4 rounded-xl bg-neutral-200 hover:bg-white text-neutral-950 disabled:bg-[#121212] disabled:text-neutral-600 border border-transparent disabled:border-neutral-850/40 font-bold text-xs tracking-wider uppercase transition-all duration-200 flex items-center justify-center space-x-2 active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed"
                  >
                    <span>Connect Link</span>
                    <ArrowRight size={12} className="text-neutral-600" />
                  </button>
                </form>

                {/* Discreet metadata */}
                <p className="mt-12 text-[10px] font-mono text-neutral-600 text-center uppercase tracking-wider">
                  REALTIME FIRESTORE LINK ACTIVE
                </p>
              </div>
            </motion.div>
          ) : (
            // CHAT SCREEN
            <motion.div
              key="chat-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="absolute inset-0"
            >
              <ChatScreen 
                viewModel={viewModel} 
                settings={settings}
                onStartVoiceCall={() => {
                  if (viewModel.activeTargetUser) {
                    callViewModel.startCall(viewModel.activeTargetUser.username);
                  }
                }}
                onLock={onLock}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. Footer */}
      <footer className="min-h-[16px] h-auto pt-1 pb-[env(safe-area-inset-bottom,4px)] bg-[#0a0a0a] border-t border-neutral-950 flex items-center justify-between px-4 select-none flex-none">
        {/* Simple footer for high visual cleanliness */}
      </footer>

      {/* 4. Recent Apps Task Protection Overlay */}
      <AnimatePresence>
        {!isAppVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0a0a0a] z-[9999] flex flex-col items-center justify-center px-6 select-none"
          >
            <motion.div 
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.05 }}
              className="flex flex-col items-center text-center max-w-xs space-y-4"
            >
              <div className="w-14 h-14 rounded-xl bg-[#121212] border border-neutral-800 flex items-center justify-center text-neutral-300 shadow-xl">
                <Shield size={24} className="animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-200">
                  SESSION SECURED
                </h3>
                <p className="text-[11px] text-neutral-500 font-sans leading-relaxed">
                  Screen content is hidden while application is in background. Tap or click to return.
                </p>
              </div>
              <button 
                onClick={() => setIsAppVisible(true)}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 rounded-lg text-[10px] font-mono tracking-wider text-neutral-300 font-semibold uppercase active:scale-95 transition"
              >
                UNPROTECT VIEW
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Voice Call Overlay */}
      {viewModel.myUsername && (
        <CallOverlay viewModel={callViewModel} myUsername={viewModel.myUsername} />
      )}

      {/* Global Virtual Keyboard Overlay for login/signup/connection inputs */}
      {activeInputField && !viewModel.activeTargetUser && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-neutral-950 border-t border-neutral-900/65 flex flex-col pb-[env(safe-area-inset-bottom,8px)] pt-1">
          <div className="flex justify-between items-center px-4 py-1 text-xs text-neutral-500 font-mono select-none">
            <span className="uppercase text-[9px] tracking-wider text-neutral-400 flex items-center gap-1.5">
              <KeyboardIcon size={10} />
              {activeInputField === 'my-username' && 'Ketik Entity Anda'}
              {activeInputField === 'my-password' && 'Ketik Sandi Anda'}
              {activeInputField === 'target-username' && 'Ketik Entity Tujuan'}
              {activeInputField === 'new-password' && 'Buat Sandi Baru'}
            </span>
            <button
              type="button"
              onClick={() => setActiveInputField(null)}
              className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider px-2 py-1 bg-indigo-950/20 border border-indigo-900/30 rounded-md hover:text-indigo-300 transition cursor-pointer"
            >
              Selesai
            </button>
          </div>
          <VirtualKeyboard
            onKeyPress={handleVirtualKeyPress}
            onBackspace={handleVirtualBackspace}
            onSpace={handleVirtualSpace}
            onEnter={handleVirtualEnter}
            onClose={() => setActiveInputField(null)}
            enterLabel={activeInputField === 'my-username' ? 'Lanjut' : 'Kirim'}
          />
        </div>
      )}

    </div>
  );
}

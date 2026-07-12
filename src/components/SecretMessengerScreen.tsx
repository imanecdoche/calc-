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
  onExitToCalculator: () => void;
  onOpenSettings: () => void;
  onOpenVault: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  directTargetUser?: string | null;
  clearDirectTargetUser?: () => void;
  appAccessKey: string;
}

export default function SecretMessengerScreen({
  settings,
  onLock,
  onExitToCalculator,
  onOpenSettings,
  onOpenVault,
  showToast,
  directTargetUser,
  clearDirectTargetUser,
  appAccessKey
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
  const [activeInputField, setActiveInputField] = useState<'terminal-access-key' | 'my-username' | 'my-password' | 'target-username' | 'new-password' | null>(null);

  const [sessionAccessVerified, setSessionAccessVerified] = useState(false);
  const [terminalAccessKeyInput, setTerminalAccessKeyInput] = useState('');
  const [terminalPendingUsername, setTerminalPendingUsername] = useState('');
  const [terminalState, setTerminalState] = useState<'app_access_key' | 'username' | 'passphrase' | 'destination'>('app_access_key');

  // Force re-verification of the access key every single time the screen mounts
  useEffect(() => {
    setSessionAccessVerified(false);
    setTerminalState('app_access_key');
    setTerminalPendingUsername('');
    setTerminalAccessKeyInput('');
    setMyUsernameInput('');
    setMyPasswordInput('');
    setActiveInputField('terminal-access-key');
  }, []);

  const handleAccessKeySubmit = (val: string) => {
    const cleanVal = val.trim();
    if (!cleanVal) return;

    if (cleanVal === appAccessKey) {
      setSessionAccessVerified(true);
      setTerminalAccessKeyInput('');
      setRegisterError(null);
      showToast('Enclave Decrypted Successfully', 'success');

      if (viewModel.myUsername) {
        setTerminalState('destination');
        setActiveInputField('target-username');
      } else {
        setTerminalState('username');
        setActiveInputField('my-username');
      }
    } else {
      setRegisterError('ACCESS DENIED: INVALID KEY');
      setShakeTrigger(true);
      setTimeout(() => setShakeTrigger(false), 500);
      setTerminalAccessKeyInput('');
    }
  };

  const handleTerminalSubmit = async (val: string) => {
    const cleanVal = val.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleanVal) return;

    setIsSubmitting(true);
    setRegisterError(null);

    // Try to log in first with a standard password:
    const loginRes = await viewModel.loginToExistingAccount(cleanVal, '123456');
    if (loginRes.success) {
      setIsSubmitting(false);
      setMyUsernameInput('');
      showToast(`Node authorized: @${cleanVal}`, 'success');
      setTerminalState('destination');
      setActiveInputField('target-username');
    } else {
      // Check if user doesn't exist or wrong password
      const errorStr = loginRes.error || '';
      const isWrongPassword = errorStr.toLowerCase().includes('sandi') || errorStr.toLowerCase().includes('password') || errorStr.toLowerCase().includes('wrong');
      
      if (isWrongPassword) {
        setIsSubmitting(false);
        setTerminalPendingUsername(cleanVal);
        setTerminalState('passphrase');
        setActiveInputField('my-password');
        setRegisterError('Passphrase required.');
      } else {
        // Not found, so register a new one!
        const regRes = await viewModel.registerMyUsername(cleanVal, '123456');
        setIsSubmitting(false);
        if (regRes.success) {
          setMyUsernameInput('');
          setTerminalState('destination');
          setActiveInputField('target-username');
          showToast(`New Enclave Registered: @${cleanVal}`, 'success');
        } else {
          setRegisterError(regRes.error || 'Registration failed.');
          setShakeTrigger(true);
          setTimeout(() => setShakeTrigger(false), 500);
        }
      }
    }
  };

  const handleTerminalPassphraseSubmit = async (pass: string) => {
    if (!terminalPendingUsername) return;
    setIsSubmitting(true);
    setRegisterError(null);

    const res = await viewModel.loginToExistingAccount(terminalPendingUsername, pass);
    setIsSubmitting(false);
    if (res.success) {
      setMyPasswordInput('');
      setMyUsernameInput('');
      setTerminalPendingUsername('');
      setTerminalState('destination');
      setActiveInputField('target-username');
      showToast(`Node authorized: @${terminalPendingUsername}`, 'success');
    } else {
      setRegisterError(res.error || 'Authentication failed.');
      setShakeTrigger(true);
      setTimeout(() => setShakeTrigger(false), 500);
    }
  };

  const handleVirtualKeyPress = (char: string) => {
    if (activeInputField === 'terminal-access-key') {
      setTerminalAccessKeyInput(prev => prev + char);
      setRegisterError(null);
    } else if (activeInputField === 'my-username') {
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
    if (activeInputField === 'terminal-access-key') {
      setTerminalAccessKeyInput(prev => prev.slice(0, -1));
    } else if (activeInputField === 'my-username') {
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
    if (activeInputField === 'terminal-access-key') {
      handleAccessKeySubmit(terminalAccessKeyInput);
    } else if (activeInputField === 'my-username') {
      handleTerminalSubmit(myUsernameInput);
    } else if (activeInputField === 'my-password') {
      if (terminalPendingUsername) {
        handleTerminalPassphraseSubmit(myPasswordInput);
      } else {
        handleAuthSubmit();
      }
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
          ) : (!sessionAccessVerified || !viewModel.activeTargetUser) ? (
            // UNIFIED RETRO TERMINAL VIEW
            <motion.div
              key="terminal-connect-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#020202] text-[#22c55e] font-mono p-6 flex flex-col justify-between overflow-hidden z-20"
            >
              <div className="flex-1 overflow-y-auto space-y-4 text-xs select-none text-left">
                {/* Welcome banner */}
                <div className="text-green-600/70 border-b border-green-950 pb-3 leading-relaxed">
                  DOSP SECURE COMMUNICATIONS CORE V9.4<br />
                  SYS_ENCLAVE_STATUS: SECURE_ACTIVE<br />
                  ----------------------------------------
                </div>

                {/* Step 0: Terminal Access Key Unlock */}
                {!sessionAccessVerified && (
                  <div className="space-y-2">
                    <div>enter terminal access key:</div>
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAccessKeySubmit(terminalAccessKeyInput);
                      }}
                      className="flex items-center space-x-2 ml-4"
                    >
                      <span className="animate-pulse text-amber-500">&gt;</span>
                      <input
                        id="terminal-access-key"
                        type="password"
                        inputMode="none"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="..."
                        value={terminalAccessKeyInput}
                        onChange={(e) => {
                          setTerminalAccessKeyInput(e.target.value);
                          setRegisterError(null);
                        }}
                        onFocus={() => {
                          setActiveInputField('terminal-access-key');
                        }}
                        autoFocus
                        className="bg-transparent border-none text-amber-500 font-mono focus:outline-none flex-1 text-sm select-all"
                      />
                    </form>
                  </div>
                )}

                {/* Success Banner */}
                {sessionAccessVerified && (
                  <div className="text-green-400 font-bold animate-pulse leading-relaxed">
                    &gt; ACCESS GRANTED: SECURE SESSION UNLOCKED
                  </div>
                )}

                {/* Step 1: Enclave Identity registration / login */}
                {sessionAccessVerified && (
                  <div className="space-y-2">
                    <div>input enclave entity:</div>
                    {viewModel.myUsername ? (
                      <div className="text-green-400 font-bold ml-4">
                        &gt; @{viewModel.myUsername} [AUTHENTICATED]
                      </div>
                    ) : (
                      <form 
                        onSubmit={async (e) => {
                          e.preventDefault();
                          await handleTerminalSubmit(myUsernameInput);
                        }}
                        className="flex items-center space-x-2 ml-4"
                      >
                        <span className="animate-pulse">&gt;</span>
                        <input
                          id="my-username"
                          type="text"
                          inputMode="none"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          placeholder="..."
                          value={myUsernameInput}
                          onChange={(e) => {
                            const sanitizedValue = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
                            setMyUsernameInput(sanitizedValue);
                            setRegisterError(null);
                          }}
                          onFocus={() => {
                            setActiveInputField('my-username');
                          }}
                          autoFocus
                          disabled={isSubmitting}
                          className="bg-transparent border-none text-[#22c55e] font-mono focus:outline-none flex-1 text-sm select-all"
                        />
                        {isSubmitting && <Loader2 size={12} className="animate-spin text-green-500" />}
                      </form>
                    )}
                  </div>
                )}

                {/* Passphrase prompt (only if terminalState is 'passphrase' and not logged in) */}
                {sessionAccessVerified && !viewModel.myUsername && terminalState === 'passphrase' && (
                  <div className="space-y-2 ml-4 animate-fade-in">
                    <div className="text-amber-500 font-bold">passphrase required:</div>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        await handleTerminalPassphraseSubmit(myPasswordInput);
                      }}
                      className="flex items-center space-x-2"
                    >
                      <span className="animate-pulse text-amber-500">&gt;</span>
                      <input
                        id="my-password"
                        type="password"
                        inputMode="none"
                        placeholder="..."
                        value={myPasswordInput}
                        onChange={(e) => {
                          setMyPasswordInput(e.target.value);
                          setRegisterError(null);
                        }}
                        onFocus={() => setActiveInputField('my-password')}
                        autoFocus
                        disabled={isSubmitting}
                        className="bg-transparent border-none text-amber-400 font-mono focus:outline-none flex-1 text-sm"
                      />
                      {isSubmitting && <Loader2 size={12} className="animate-spin text-amber-500" />}
                    </form>
                  </div>
                )}

                {/* Register/Access Error text */}
                {registerError && (
                  <div className="text-red-500 text-[11px] font-bold ml-4 animate-pulse">
                    ERROR: {registerError.toUpperCase()}
                  </div>
                )}

                {/* Line 2: Declare the destination entity */}
                {sessionAccessVerified && viewModel.myUsername && (
                  <div className="space-y-2 pt-4 border-t border-green-950/40 animate-fade-in">
                    <div>declare the destination entity:</div>
                    <form 
                      onSubmit={handleConnect}
                      className="flex items-center space-x-2 ml-4"
                    >
                      <span className="animate-pulse">&gt;</span>
                      <input
                        id="target-username"
                        type="text"
                        inputMode="none"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="..."
                        value={targetUsernameInput}
                        onChange={(e) => {
                          const sanitizedValue = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
                          setTargetUsernameInput(sanitizedValue);
                          viewModel.clearError();
                        }}
                        onFocus={() => setActiveInputField('target-username')}
                        autoFocus
                        className="bg-transparent border-none text-[#22c55e] font-mono focus:outline-none flex-1 text-sm select-all"
                      />
                    </form>

                    {/* Error State: User not found */}
                    {viewModel.errorMsg && (
                      <div className="text-red-500 text-[11px] font-bold ml-4 animate-pulse">
                        ERROR: {viewModel.errorMsg.toUpperCase()}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="text-[10px] text-green-800 border-t border-green-950/40 pt-3 flex justify-between items-center select-none">
                <span>SYSTEM NODE REGISTERED ACTIVE</span>
                {sessionAccessVerified && (
                  <button 
                    type="button"
                    onClick={() => {
                      viewModel.clearSessionLocal();
                      setSessionAccessVerified(false);
                      setTerminalState('app_access_key');
                      setMyUsernameInput('');
                      setMyPasswordInput('');
                      setTerminalPendingUsername('');
                      setActiveInputField('terminal-access-key');
                    }}
                    className="text-[10px] text-red-500 hover:underline cursor-pointer uppercase font-bold"
                  >
                    [Clear Session]
                  </button>
                )}
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
                onExitToCalculator={onExitToCalculator}
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

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
  EyeOff
} from 'lucide-react';
import { useChatViewModel } from '../hooks/ChatViewModel';
import ChatScreen from './ChatScreen';
import { useCallViewModel } from '../hooks/CallViewModel';
import CallOverlay from './CallOverlay';

import { SecureWindowManager } from '../services/SecureWindowManager';
import { SessionTimeoutManager } from '../services/SessionTimeoutManager';
import { RecentTaskProtector } from '../services/RecentTaskProtector';

interface SecretMessengerScreenProps {
  onLock: () => void;
  onOpenSettings: () => void;
  onOpenVault: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function SecretMessengerScreen({
  onLock,
  onOpenSettings,
  onOpenVault,
  showToast
}: SecretMessengerScreenProps) {
  const viewModel = useChatViewModel();
  const callViewModel = useCallViewModel(viewModel.myUsername);
  const [targetUsernameInput, setTargetUsernameInput] = useState('');
  const [myUsernameInput, setMyUsernameInput] = useState('');
  const [shakeTrigger, setShakeTrigger] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recent apps task protection state
  const [isAppVisible, setIsAppVisible] = useState(true);

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

  // Handle register my own username
  const handleRegisterMyUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = myUsernameInput.trim().toLowerCase();
    if (!cleanUsername) return;

    // Validate character format (standard alphanumeric)
    if (!/^[a-zA-Z0-9_]{3,15}$/.test(cleanUsername)) {
      setRegisterError('3-15 alphanumeric characters only.');
      setShakeTrigger(true);
      setTimeout(() => setShakeTrigger(false), 500);
      return;
    }

    setRegisterError(null);
    setIsSubmitting(true);
    
    const res = await viewModel.registerMyUsername(cleanUsername);
    setIsSubmitting(false);

    if (res.success) {
      showToast(`Username @${cleanUsername} successfully registered!`, 'success');
      setMyUsernameInput('');
    } else {
      setRegisterError(res.error || 'Username already exists.');
      setShakeTrigger(true);
      setTimeout(() => setShakeTrigger(false), 500);
      showToast(res.error || 'Username already exists.', 'error');
    }
  };

  // Handle connecting to a target user
  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="absolute inset-0 bg-[#0a0a0a] flex flex-col justify-between text-neutral-100 select-none">
      
      {/* 1. Header (Sticky Top, Very Discreet) */}
      <header className="h-14 bg-[#0a0a0a] border-b border-neutral-900 flex items-center justify-between px-4 sticky top-0 z-30 flex-none">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-[10px] tracking-wider text-neutral-500 font-bold">SECURE_NODE</span>
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
            // REGISTER USERNAME SCREEN
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
                  Choose Username
                </h1>
                <p className="text-[11px] text-neutral-500 text-center mb-8 max-w-[240px]">
                  Establish your unique network identity. This is permanent.
                </p>

                {/* Form Register */}
                <form onSubmit={handleRegisterMyUsername} className="w-full space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="my-username" className="block text-[10px] font-mono tracking-wider text-neutral-500 uppercase">
                      My Username
                    </label>
                    <motion.div
                      animate={shakeTrigger ? { x: [-6, 6, -6, 6, 0] } : {}}
                      transition={{ duration: 0.4 }}
                      className="relative"
                    >
                      <input
                        id="my-username"
                        type="text"
                        placeholder="e.g. alex01, ismael"
                        value={myUsernameInput}
                        onChange={(e) => {
                          setMyUsernameInput(e.target.value);
                          setRegisterError(null);
                        }}
                        autoFocus
                        disabled={isSubmitting}
                        className={`w-full px-4 py-3 bg-[#121212] border ${
                          registerError 
                            ? 'border-rose-950/80 focus:border-rose-800 text-rose-300' 
                            : 'border-neutral-900 focus:border-neutral-800 text-neutral-200'
                        } rounded-xl text-xs placeholder-neutral-700 focus:outline-none transition-all duration-150 text-center font-mono`}
                      />
                    </motion.div>
                  </div>

                  {/* Register Error text */}
                  <AnimatePresence>
                    {registerError && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="flex items-center justify-center space-x-1.5 text-rose-500 text-xs font-medium py-1"
                      >
                        <AlertCircle size={13} />
                        <span>{registerError}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit"
                    disabled={!myUsernameInput.trim() || isSubmitting}
                    className="w-full py-3 px-4 rounded-xl bg-neutral-200 hover:bg-white text-neutral-950 disabled:bg-[#121212] disabled:text-neutral-600 border border-transparent disabled:border-neutral-850/40 font-bold text-xs tracking-wider uppercase transition-all duration-200 flex items-center justify-center space-x-2 active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <Loader2 size={13} className="animate-spin text-neutral-500" />
                    ) : (
                      <>
                        <span>Register Username</span>
                        <ArrowRight size={12} className="text-neutral-600" />
                      </>
                    )}
                  </button>
                </form>
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

                {/* Title */}
                <h1 className="font-bold text-sm tracking-tight text-neutral-150 text-center mb-1">
                  Secret Messenger
                </h1>

                {/* My Username Display Menu */}
                <div className="flex items-center space-x-1.5 bg-[#121212] border border-neutral-900 px-3 py-1 rounded-md text-[10px] font-mono text-neutral-400 mb-8">
                  <UserIcon size={11} />
                  <span>Your profile: <strong className="text-neutral-200 font-bold">@{viewModel.myUsername}</strong></span>
                </div>

                {/* Form Connect */}
                <form onSubmit={handleConnect} className="w-full space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="target-username" className="block text-[10px] font-mono tracking-wider text-neutral-500 uppercase">
                      ENTER DESTINATION USERNAME
                    </label>
                    <motion.div
                      animate={shakeTrigger ? { x: [-6, 6, -6, 6, 0] } : {}}
                      transition={{ duration: 0.4 }}
                      className="relative"
                    >
                      <input
                        id="target-username"
                        type="text"
                        placeholder="e.g. ismael, fernandez, alex01"
                        value={targetUsernameInput}
                        onChange={(e) => {
                          setTargetUsernameInput(e.target.value);
                          viewModel.clearError();
                        }}
                        autoFocus
                        className={`w-full px-4 py-3 bg-[#121212] border ${
                          viewModel.errorMsg 
                            ? 'border-rose-950/80 focus:border-rose-800 text-rose-300' 
                            : 'border-neutral-900 focus:border-neutral-800 text-neutral-200'
                        } rounded-xl text-xs placeholder-neutral-700 focus:outline-none transition-all duration-150 text-center font-mono`}
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
                onStartVoiceCall={() => {
                  if (viewModel.activeTargetUser) {
                    callViewModel.startCall(viewModel.activeTargetUser.username);
                  }
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. Footer */}
      <footer className="h-4 bg-[#0a0a0a] border-t border-neutral-950 flex items-center justify-between px-4 select-none flex-none">
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

    </div>
  );
}

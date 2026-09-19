import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  ArrowRight, 
  Settings, 
  Lock, 
  FolderLock,
  User as UserIcon,
  Loader2,
  EyeOff,
  Eye,
  LogOut
} from 'lucide-react';
import { useChatViewModel } from '../hooks/ChatViewModel';
import ChatScreen from './ChatScreen';
import { useCallViewModel } from '../hooks/CallViewModel';
import CallOverlay from './CallOverlay';
import { useDisguiseTrigger } from '../hooks/useDisguiseTrigger';
import { AppSettings, WordMappingItem } from '../types';

import { SecureWindowManager } from '../services/SecureWindowManager';
import { SessionTimeoutManager } from '../services/SessionTimeoutManager';
import { RecentTaskProtector } from '../services/RecentTaskProtector';

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
  wordMappings?: WordMappingItem[];
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
  appAccessKey,
  wordMappings = []
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

  // Auth & Target state
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [myUsernameInput, setMyUsernameInput] = useState('');
  const [myPasswordInput, setMyPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [targetUsernameInput, setTargetUsernameInput] = useState('');

  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recent apps task protection state
  const [isAppVisible, setIsAppVisible] = useState(true);

  // 1. Manage Web-equivalent of FLAG_SECURE and Session Inactivity Timeout
  useEffect(() => {
    const secureWindow = SecureWindowManager.getInstance();
    const timeoutManager = SessionTimeoutManager.getInstance();
    const taskProtector = RecentTaskProtector.getInstance();

    secureWindow.enableSecureMode();

    timeoutManager.startTracking(() => {
      viewModel.disconnect();
      onLock();
      showToast('Session locked due to 15 minutes of inactivity.', 'info');
    });

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
          showToast(`Connected to @${target}`, 'success');
        } else {
          showToast(`Failed to connect to @${target}: User not found.`, 'error');
        }
      });
    }
  }, [viewModel.myUsername, directTargetUser, clearDirectTargetUser, viewModel.connectToUser, showToast]);

  // Auto-focus target input when authenticated
  useEffect(() => {
    if (viewModel.myUsername && !viewModel.activeTargetUser) {
      const timer = setTimeout(() => {
        const inputEl = document.getElementById('target-username');
        if (inputEl) inputEl.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [viewModel.myUsername, viewModel.activeTargetUser]);

  // Handle Registration
  const handleRegisterSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUsername = myUsernameInput.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanPassword = myPasswordInput.trim();

    if (!cleanUsername) {
      setAuthError('Please enter a username.');
      return;
    }

    if (!/^[a-z0-9]{3,20}$/.test(cleanUsername)) {
      setAuthError('Username must be 3-20 characters (letters and numbers).');
      return;
    }

    if (!cleanPassword || cleanPassword.length < 4) {
      setAuthError('Password must be at least 4 characters.');
      return;
    }

    setAuthError(null);
    setIsSubmitting(true);

    const res = await viewModel.registerMyUsername(cleanUsername, cleanPassword);
    setIsSubmitting(false);

    if (res.success) {
      showToast(`Account @${cleanUsername} created successfully!`, 'success');
      setMyUsernameInput('');
      setMyPasswordInput('');
      setTargetUsernameInput('');
    } else {
      setAuthError(res.error || 'Username is already taken.');
      showToast(res.error || 'Registration failed.', 'error');
    }
  };

  // Handle Login
  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUsername = myUsernameInput.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanPassword = myPasswordInput.trim();

    if (!cleanUsername) {
      setAuthError('Please enter your username.');
      return;
    }

    if (!cleanPassword) {
      setAuthError('Please enter your password.');
      return;
    }

    setAuthError(null);
    setIsSubmitting(true);

    const res = await viewModel.loginToExistingAccount(cleanUsername, cleanPassword);
    setIsSubmitting(false);

    if (res.success) {
      showToast(`Signed in as @${cleanUsername}!`, 'success');
      setMyUsernameInput('');
      setMyPasswordInput('');
      setTargetUsernameInput('');
    } else {
      setAuthError(res.error || 'Invalid username or password.');
      showToast(res.error || 'Sign in failed.', 'error');
    }
  };

  // Handle Sign Out / Switch Account
  const handleSwitchAccount = () => {
    viewModel.clearSessionLocal();
    setAuthMode('login');
    setAuthError(null);
    setMyUsernameInput('');
    setMyPasswordInput('');
    setTargetUsernameInput('');
    showToast('Signed out of session.', 'info');
  };

  // Handle connecting to a target user
  const handleConnect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanTarget = targetUsernameInput.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleanTarget) return;

    const success = await viewModel.connectToUser(cleanTarget);
    if (success) {
      showToast(`Connected to @${cleanTarget}`, 'success');
      setTargetUsernameInput('');
    } else {
      showToast(viewModel.errorMsg || `User @${cleanTarget} not found.`, 'error');
    }
  };

  // Header Connection Status Indicator
  const renderConnectionStatus = () => {
    if (viewModel.connectionState === 'connecting') {
      return (
        <span className="flex items-center space-x-1.5 text-xs text-neutral-400 font-sans">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>Connecting</span>
        </span>
      );
    }
    if (viewModel.connectionState === 'offline') {
      return (
        <span className="flex items-center space-x-1.5 text-xs text-neutral-500 font-sans">
          <span className="w-2 h-2 rounded-full bg-neutral-600" />
          <span>Offline</span>
        </span>
      );
    }
    return (
      <span className="flex items-center space-x-1.5 text-xs text-emerald-400 font-sans">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        <span>Ready</span>
      </span>
    );
  };

  return (
    <div className="absolute inset-0 bg-[#0a0a0a] flex flex-col justify-between text-neutral-100 select-none overflow-hidden font-sans">
      
      {/* 1. Header Bar */}
      {!viewModel.activeTargetUser && (
        <header className="min-h-14 h-auto pt-[env(safe-area-inset-top,0px)] pb-1.5 bg-[#0a0a0a] border-b border-neutral-900 flex items-center justify-between px-4 sticky top-0 z-30 flex-none">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-neutral-400">
              <Lock size={14} className="stroke-[2]" />
              <span className="text-xs font-semibold tracking-wide text-neutral-300">Secure Chat</span>
            </div>
            {renderConnectionStatus()}
          </div>

          <div className="flex items-center space-x-1.5">
            {/* Open Vault */}
            <button
              onClick={onOpenVault}
              title="Open Vault"
              aria-label="Open Vault"
              className="p-2.5 rounded-xl hover:bg-neutral-900 border border-transparent hover:border-neutral-800 text-neutral-400 hover:text-neutral-200 transition-all cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <FolderLock size={15} />
            </button>
            
            {/* Settings */}
            <button
              onClick={onOpenSettings}
              title="Open Settings"
              aria-label="Open Settings"
              className="p-2.5 rounded-xl hover:bg-neutral-900 border border-transparent hover:border-neutral-800 text-neutral-400 hover:text-neutral-200 transition-all cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <Settings size={15} />
            </button>

            {/* Quick Lock */}
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

      {/* 2. Main Content */}
      <div className="flex-1 min-h-0 relative flex flex-col">
        {viewModel.isLoading || viewModel.connectingToUser ? (
          // LOADING STATE
          <div
            className="absolute inset-0 flex flex-col items-center justify-center px-6 bg-[#0a0a0a]"
          >
            <Loader2 size={32} className="text-neutral-400 animate-spin mb-3" />
            <span className="text-xs font-medium text-neutral-400 tracking-wide font-sans">
              {viewModel.connectingToUser ? 'Connecting to chat...' : 'Setting up profile...'}
            </span>
          </div>
        ) : !viewModel.myUsername ? (
          // AUTHENTICATION VIEW (Register by default on new devices, or Login)
          <div
            className="flex-1 flex flex-col items-center justify-center px-4 py-8 overflow-y-auto"
          >
            <div className="w-full max-w-sm bg-[#111111] border border-neutral-850 rounded-2xl p-6 sm:p-8 shadow-2xl">
                
                {/* Header Title */}
                <div className="mb-6 text-center">
                  <h2 className="text-xl font-semibold text-neutral-100 mb-1.5 font-sans">
                    {authMode === 'register' ? 'Create Account' : 'Welcome Back'}
                  </h2>
                  <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                    {authMode === 'register' 
                      ? 'Choose a username and password to get started.' 
                      : 'Sign in with your username and password.'}
                  </p>
                </div>

                {/* Form */}
                <form 
                  onSubmit={authMode === 'register' ? handleRegisterSubmit : handleLoginSubmit}
                  className="space-y-4"
                >
                  {/* Username Field with fixed @ */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5 font-sans">
                      Username
                    </label>
                    <div className="flex items-center bg-[#0a0a0a] border border-neutral-800 rounded-xl px-3.5 py-3 focus-within:border-neutral-600 transition">
                      <span className="text-neutral-500 font-mono text-sm select-none mr-1.5">@</span>
                      <input
                        type="text"
                        autoComplete="username"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="username"
                        value={myUsernameInput}
                        onChange={(e) => {
                          const sanitized = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
                          setMyUsernameInput(sanitized);
                          setAuthError(null);
                        }}
                        disabled={isSubmitting}
                        autoFocus
                        className="bg-transparent border-none text-neutral-100 font-mono text-sm outline-none flex-1 placeholder:text-neutral-600"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5 font-sans">
                      Password
                    </label>
                    <div className="flex items-center bg-[#0a0a0a] border border-neutral-800 rounded-xl px-3.5 py-3 focus-within:border-neutral-600 transition">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                        placeholder={authMode === 'register' ? 'At least 4 characters' : 'Enter password'}
                        value={myPasswordInput}
                        onChange={(e) => {
                          setMyPasswordInput(e.target.value);
                          setAuthError(null);
                        }}
                        disabled={isSubmitting}
                        className="bg-transparent border-none text-neutral-100 text-sm outline-none flex-1 placeholder:text-neutral-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-neutral-500 hover:text-neutral-300 transition p-1 cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Error Message */}
                  {authError && (
                    <div className="text-rose-400 text-xs text-center font-medium bg-rose-950/20 border border-rose-900/30 rounded-lg py-2 px-3">
                      {authError}
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting || !myUsernameInput || !myPasswordInput}
                    className={`w-full py-3 rounded-xl text-xs font-semibold tracking-wide transition flex items-center justify-center space-x-2 cursor-pointer ${
                      isSubmitting || !myUsernameInput || !myPasswordInput
                        ? 'bg-neutral-900 text-neutral-600 cursor-not-allowed border border-neutral-850'
                        : 'bg-neutral-100 hover:bg-white text-neutral-950 font-bold active:scale-98'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>{authMode === 'register' ? 'Creating account...' : 'Signing in...'}</span>
                      </>
                    ) : (
                      <span>{authMode === 'register' ? 'Create Account' : 'Sign In'}</span>
                    )}
                  </button>
                </form>

                {/* Switch between Register and Login */}
                <div className="mt-6 pt-5 border-t border-neutral-850 text-center">
                  {authMode === 'register' ? (
                    <p className="text-xs text-neutral-400 font-sans">
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('login');
                          setAuthError(null);
                          setMyPasswordInput('');
                        }}
                        className="text-neutral-200 hover:text-white font-semibold underline underline-offset-2 cursor-pointer transition"
                      >
                        Sign In
                      </button>
                    </p>
                  ) : (
                    <p className="text-xs text-neutral-400 font-sans">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('register');
                          setAuthError(null);
                          setMyPasswordInput('');
                        }}
                        className="text-neutral-200 hover:text-white font-semibold underline underline-offset-2 cursor-pointer transition"
                      >
                        Create Account
                      </button>
                    </p>
                  )}
                </div>

              </div>
            </div>
          ) : !viewModel.activeTargetUser ? (
            // START CONVERSATION VIEW (Logged in user entering recipient)
            <div
              className="flex-1 flex flex-col items-center justify-center px-4 py-8 overflow-y-auto"
            >
              {/* Active Account Status Bar */}
              <div className="w-full max-w-sm flex items-center justify-between px-3.5 py-2 bg-[#121212] border border-neutral-850 rounded-xl mb-4 text-xs">
                <div className="flex items-center space-x-2 text-neutral-300">
                  <UserIcon size={14} className="text-neutral-500" />
                  <span className="text-neutral-400">Signed in as</span>
                  <span className="font-mono font-medium text-neutral-200">@{viewModel.myUsername}</span>
                </div>
                <button
                  type="button"
                  onClick={handleSwitchAccount}
                  className="text-neutral-500 hover:text-rose-400 font-medium cursor-pointer transition text-[11px] flex items-center space-x-1"
                >
                  <LogOut size={11} />
                  <span>Switch</span>
                </button>
              </div>

              <div className="w-full max-w-sm bg-[#111111] border border-neutral-850 rounded-2xl p-6 sm:p-8 shadow-2xl">
                
                <div className="mb-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300 mx-auto mb-3 shadow-inner">
                    <MessageSquare size={20} />
                  </div>
                  <h2 className="text-xl font-semibold text-neutral-100 mb-1.5 font-sans">
                    Start a Conversation
                  </h2>
                  <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                    Enter the username of the person you want to message.
                  </p>
                </div>

                <form onSubmit={handleConnect} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5 font-sans">
                      Recipient Username
                    </label>
                    <div className="flex items-center bg-[#0a0a0a] border border-neutral-800 rounded-xl px-3.5 py-3 focus-within:border-neutral-600 transition">
                      <span className="text-neutral-500 font-mono text-sm select-none mr-1.5">@</span>
                      <input
                        id="target-username"
                        type="text"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="recipient"
                        value={targetUsernameInput}
                        onChange={(e) => {
                          const sanitized = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
                          setTargetUsernameInput(sanitized);
                          viewModel.clearError();
                        }}
                        autoFocus
                        disabled={viewModel.connectingToUser}
                        className="bg-transparent border-none text-neutral-100 font-mono text-sm outline-none flex-1 placeholder:text-neutral-600"
                      />
                    </div>
                  </div>

                  {/* Error Message */}
                  {viewModel.errorMsg && (
                    <div className="text-rose-400 text-xs text-center font-medium bg-rose-950/20 border border-rose-900/30 rounded-lg py-2 px-3">
                      {viewModel.errorMsg}
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={viewModel.connectingToUser || !targetUsernameInput.trim()}
                    className={`w-full py-3 rounded-xl text-xs font-semibold tracking-wide transition flex items-center justify-center space-x-2 cursor-pointer ${
                      viewModel.connectingToUser || !targetUsernameInput.trim()
                        ? 'bg-neutral-900 text-neutral-600 cursor-not-allowed border border-neutral-850'
                        : 'bg-neutral-100 hover:bg-white text-neutral-950 font-bold active:scale-98'
                    }`}
                  >
                    {viewModel.connectingToUser ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <span>Start Chat</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </form>

              </div>
            </div>
          ) : (
            // CHAT SCREEN
            <div
              className="absolute inset-0"
            >
              <ChatScreen 
                viewModel={viewModel} 
                settings={settings}
                wordMappings={wordMappings}
                onStartVoiceCall={() => {
                  if (viewModel.activeTargetUser) {
                    callViewModel.startCall(viewModel.activeTargetUser.username);
                  }
                }}
                onLock={onLock}
                onExitToCalculator={onExitToCalculator}
              />
            </div>
          )}
      </div>

      {/* 3. Voice Call Overlay */}
      {viewModel.myUsername && (
        <CallOverlay viewModel={callViewModel} myUsername={viewModel.myUsername} />
      )}

    </div>
  );
}

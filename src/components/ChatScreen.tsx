import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Send, 
  ShieldCheck, 
  User as UserIcon,
  Lock,
  X,
  CornerUpRight,
  Mic,
  Trash2,
  Play,
  Pause,
  Loader2,
  Phone
} from 'lucide-react';
import { ChatViewModelType } from '../hooks/ChatViewModel';
import { MessageBubble } from './MessageBubble';
import { DateSeparator, shouldShowDateSeparator } from './DateSeparator';
import { ScrollController } from './ScrollController';
import { MessageActionSheet } from './MessageActionSheet';
import { Message } from '../models/Message';
import { VoiceRecorderManager } from '../services/VoiceRecorderManager';
import { VoiceNoteRepository } from '../repositories/VoiceNoteRepository';
import { AudioPlayerManager } from '../services/AudioPlayerManager';
import { WaveformView } from './WaveformView';

interface ChatScreenProps {
  viewModel: ChatViewModelType;
  onStartVoiceCall: () => void;
  onLock: () => void;
}

export default function ChatScreen({ viewModel, onStartVoiceCall, onLock }: ChatScreenProps) {
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // M3 UI & Interactive states
  const [longPressedMessage, setLongPressedMessage] = useState<Message | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Voice Note states
  const recorderManager = useMemo(() => new VoiceRecorderManager(), []);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingWaveform, setRecordingWaveform] = useState<number[]>([]);
  const [draggedX, setDraggedX] = useState(0);

  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Local preview play states
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const startXRef = useRef(0);
  const isRecordingRef = useRef(false);

  // Clean up preview audio on unmount
  useEffect(() => {
    return () => {
      cleanupPreviewAudio();
    };
  }, []);

  const cleanupPreviewAudio = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setIsPreviewPlaying(false);
    setPreviewProgress(0);
  };

  const handleTogglePreviewPlay = () => {
    if (!recordedBlob) return;
    if (isPreviewPlaying) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setIsPreviewPlaying(false);
    } else {
      // Stop centralized audio player just in case
      AudioPlayerManager.getInstance().stopCurrent();

      if (!previewAudioRef.current) {
        const url = URL.createObjectURL(recordedBlob);
        const audio = new Audio(url);
        previewAudioRef.current = audio;
        audio.addEventListener('ended', () => {
          setIsPreviewPlaying(false);
          setPreviewProgress(0);
        });
        audio.addEventListener('timeupdate', () => {
          setPreviewProgress(audio.currentTime);
        });
      }
      previewAudioRef.current.play();
      setIsPreviewPlaying(true);
    }
  };

  const handleMicPressStart = async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Request permissions dynamically
    const hasPermission = await recorderManager.requestPermission();
    if (!hasPermission) {
      showSnackbar('Izin mikrofon ditolak. Aktifkan di pengaturan browser Anda.', 'error');
      return;
    }

    // Stop active audio playbacks
    AudioPlayerManager.getInstance().stopCurrent();
    cleanupPreviewAudio();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    startXRef.current = clientX;
    setDraggedX(0);
    isRecordingRef.current = true;
    setIsRecording(true);

    try {
      await recorderManager.startRecording(
        (dur) => setRecordingDuration(dur),
        (levels) => setRecordingWaveform(levels),
        () => handleRecordingRelease() // Limit to 5 mins auto-stops
      );
    } catch (err) {
      console.error(err);
      setIsRecording(false);
      isRecordingRef.current = false;
      showSnackbar('Gagal memulai perekaman.', 'error');
    }
  };

  const handleRecordingRelease = async () => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    setIsRecording(false);

    const isCancel = draggedX < -80;
    if (isCancel) {
      recorderManager.cancelRecording();
      setDraggedX(0);
      showSnackbar('Rekaman dibatalkan', 'info');
    } else {
      const result = await recorderManager.stopRecording();
      if (result) {
        setRecordedBlob(result.blob);
        setRecordedDuration(result.duration);
      }
    }
  };

  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      if (!isRecordingRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const deltaX = clientX - startXRef.current;
      setDraggedX(deltaX);
    };

    const handleGlobalUp = () => {
      if (isRecordingRef.current) {
        handleRecordingRelease();
      }
    };

    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalUp);
    window.addEventListener('touchmove', handleGlobalMove, { passive: true });
    window.addEventListener('touchend', handleGlobalUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('touchend', handleGlobalUp);
    };
  }, [draggedX]);

  const generateConversationId = (usernameA: string, usernameB: string): string => {
    const list = [usernameA.trim().toLowerCase(), usernameB.trim().toLowerCase()];
    list.sort();
    return list.join('_');
  };

  const handleSendVoiceNote = async () => {
    if (!recordedBlob) return;
    setIsUploading(true);
    try {
      cleanupPreviewAudio();
      AudioPlayerManager.getInstance().stopCurrent();

      const convId = generateConversationId(viewModel.myUsername || '', activeTargetUser.username);
      const voiceNoteRepo = VoiceNoteRepository.getInstance();

      const replyToData = replyingTo ? {
        messageId: replyingTo.id,
        text: replyingTo.text,
        senderId: replyingTo.senderId
      } : undefined;

      await voiceNoteRepo.sendVoiceNote(
        convId,
        viewModel.myUsername || '',
        activeTargetUser.username,
        recordedBlob,
        recordedDuration,
        replyToData
      );

      // Clean up states
      setRecordedBlob(null);
      setRecordedDuration(0);
      handleCancelReply();
      showSnackbar('Voice note dikirim', 'success');
    } catch (err: any) {
      console.error(err);
      showSnackbar(err.message || 'Gagal mengirim voice note.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDiscardVoiceNote = () => {
    cleanupPreviewAudio();
    setRecordedBlob(null);
    setRecordedDuration(0);
  };

  const { 
    activeTargetUser, 
    messages, 
    targetIsTyping, 
    targetPresence,
    sendMessage, 
    reportTyping, 
    disconnect,
    replyingTo,
    handleCancelReply,
    hasMoreHistory
  } = viewModel;

  // Periodic tick to auto-update "offline (x minutes ago)" values
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const getPresenceSubtext = () => {
    if (targetIsTyping) {
      return 'typing...';
    }
    if (targetPresence?.isOnline) {
      return 'online';
    }
    if (!targetPresence?.lastSeen) {
      return 'offline';
    }
    const diffMs = Date.now() - targetPresence.lastSeen;
    if (diffMs < 60000) {
      return 'offline (just now)';
    }
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) {
      return `offline (${diffMin} min ago)`;
    }
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) {
      return `offline (${diffHours} hours ago)`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `offline (${diffDays} days ago)`;
  };

  const isTargetActive = targetIsTyping || (targetPresence?.isOnline ?? false);

  // Auto focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Quick notification routine
  const showSnackbar = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setSnackbar({ text, type });
  };

  useEffect(() => {
    if (snackbar) {
      const timer = setTimeout(() => {
        setSnackbar(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [snackbar]);

  // Sync general error states from ViewModel to our clean snackbar
  useEffect(() => {
    if (viewModel.errorMsg) {
      showSnackbar(viewModel.errorMsg, 'error');
      viewModel.clearError();
    }
  }, [viewModel.errorMsg, viewModel]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [targetIsTyping]);

  // Scroll event listener for pagination load
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;

    if (el.scrollTop === 0 && hasMoreHistory) {
      const prevHeight = el.scrollHeight;
      viewModel.loadMoreHistory();

      // Maintain scroll position after prepending old history
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight - prevHeight;
        }
      }, 80);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    // Notify target user we are typing
    reportTyping();
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;

    sendMessage(text.trim());
    setText('');

    // Maintain keyboard focus
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  // Sheet triggers
  const handleLongPress = (e: React.MouseEvent | React.TouchEvent | any, msg: Message) => {
    e.preventDefault();
    setLongPressedMessage(msg);
    setIsSheetOpen(true);
  };

  const handleCopy = async (msg: Message) => {
    const success = await viewModel.handleCopyMessage(msg);
    if (success) {
      showSnackbar('Copied.');
    } else {
      showSnackbar('Failed to copy to clipboard.', 'error');
    }
  };

  const handleDeleteMe = (msg: Message) => {
    viewModel.handleDeleteForMe(msg);
    showSnackbar('Deleted for me.', 'info');
  };

  const handleDeleteEveryone = async (msg: Message) => {
    await viewModel.handleDeleteForEveryone(msg);
    showSnackbar('This message was deleted.', 'success');
  };

  if (!activeTargetUser) return null;

  return (
    <div 
      className="absolute inset-0 bg-[#07080b] flex flex-col justify-between overflow-hidden z-20"
      style={viewportHeight ? { height: `${viewportHeight}px`, bottom: 'auto' } : {}}
    >
      
      {/* 1. CHAT ROOM HEADER */}
      <div className="min-h-14 h-auto pt-[env(safe-area-inset-top,0px)] pb-1.5 bg-neutral-950/90 border-b border-neutral-900/60 flex items-center justify-between px-3.5 backdrop-blur-md flex-none z-10">
        
        <div className="flex items-center space-x-2.5">
          {/* Back to Connect screen (which clears session history) */}
          <button
            onClick={() => {
              disconnect();
            }}
            title="Disconnect session"
            aria-label="Disconnect session"
            className="p-2 rounded-lg hover:bg-neutral-900 text-neutral-400 hover:text-neutral-200 transition cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <ArrowLeft size={16} />
          </button>

          {/* Target User Details */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              {activeTargetUser.avatarUrl ? (
                <img 
                  src={activeTargetUser.avatarUrl} 
                  alt={activeTargetUser.displayName} 
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full object-cover border border-indigo-900/40"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-indigo-400">
                  <UserIcon size={14} />
                </div>
              )}
              {/* Active Signal dot */}
              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-neutral-950 ${
                isTargetActive ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-600'
              }`} />
            </div>
            
            <div className="flex flex-col justify-center">
              <span className="text-xs font-bold text-neutral-200 tracking-wide font-sans leading-tight">
                {activeTargetUser.displayName}
              </span>
              {/* Typing / Online / Offline Indicator underneath Username */}
              <div className="h-3.5 flex items-center mt-0.5">
                <span className={`text-[9px] font-mono uppercase tracking-widest leading-none ${
                  targetIsTyping 
                    ? 'text-emerald-400 font-bold animate-pulse' 
                    : targetPresence?.isOnline 
                      ? 'text-emerald-500 font-semibold' 
                      : 'text-neutral-500'
                }`}>
                  {getPresenceSubtext()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Header Action Row */}
        <div className="flex items-center space-x-2">
          {/* Voice Call Button */}
          <button
            onClick={onStartVoiceCall}
            title="Start voice call"
            aria-label="Start voice call"
            className="p-2 rounded-lg hover:bg-neutral-900 border border-transparent hover:border-neutral-800 text-neutral-400 hover:text-indigo-400 transition cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <Phone size={15} />
          </button>

          {/* Quick Lock Button - Lock Now instantly clears session & exits */}
          <button
            onClick={() => {
              disconnect();
              onLock();
            }}
            title="Lock Now"
            aria-label="Lock Now"
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-rose-950/45 hover:bg-rose-900/60 border border-rose-900/50 hover:border-rose-800/80 text-rose-300 hover:text-rose-200 transition cursor-pointer text-[10px] font-mono font-bold uppercase"
          >
            <Lock size={12} />
            <span>Lock Now</span>
          </button>

          {/* Status Encrypted Indicator */}
          <div className="hidden sm:flex items-center space-x-1.5 bg-indigo-950/30 border border-indigo-900/30 px-2.5 py-1.5 rounded-lg text-[9px] font-mono font-bold text-indigo-400">
            <ShieldCheck size={12} />
            <span>E2EE ACTIVE</span>
          </div>
        </div>
      </div>

      {/* 2. CHAT MESSAGES PANEL */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin scrollbar-thumb-neutral-900 scrollbar-track-transparent bg-[#040508] relative"
        style={{ overflowX: 'hidden' }}
      >
        
        {/* Warning Badge at Top of session */}
        <div className="flex justify-center select-none pb-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-neutral-950 border border-neutral-900/60 text-center max-w-xs space-y-1">
            <span className="block text-[9px] font-mono text-amber-500/80 font-bold tracking-wider">
              ⚠️ SESSION PURGE ACTIVE
            </span>
            <span className="block text-[9px] text-neutral-600 font-sans leading-tight">
              Leaving this chat erases all logs from memory. No database logs are retained permanently.
            </span>
          </div>
        </div>

        {/* Pagination Trigger / Load More Header */}
        {hasMoreHistory && (
          <div className="flex justify-center py-2">
            <span className="text-[9px] font-mono text-neutral-500 bg-neutral-950 border border-neutral-900/50 px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse">
              Scroll up to load previous messages
            </span>
          </div>
        )}

        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-600">
            <p className="text-xs font-mono tracking-wider mb-1 uppercase">Channel established.</p>
            <p className="text-[11px] leading-relaxed max-w-xs">Send an encrypted message to begin communication with {activeTargetUser.displayName}.</p>
          </div>
        )}

        {/* List render with bubbles and Date Separators */}
        <div>
          {messages.map((msg, index) => {
            const showDate = shouldShowDateSeparator(
              messages[index - 1]?.timestamp,
              msg.timestamp
            );

            return (
              <React.Fragment key={msg.id || `msg-${index}`}>
                {showDate && <DateSeparator timestamp={msg.timestamp} />}
                <MessageBubble
                  message={msg}
                  myUsername={viewModel.myUsername || ''}
                  onLongPress={handleLongPress}
                  onRetry={viewModel.handleRetryMessage}
                />
              </React.Fragment>
            );
          })}
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* FLOATING SCROLL CONTROLLER BADGE */}
      <ScrollController
        containerRef={containerRef}
        messagesCount={messages.length}
        onScrollToBottom={scrollToBottom}
      />

      {/* 3. INPUT PANEL & ACTIVE REPLY PREVIEW CONTROLS */}
      <div className="bg-neutral-950 border-t border-neutral-900/60 flex flex-col flex-none pb-[env(safe-area-inset-bottom,8px)] pt-1">
        
        {/* REPLY PREVIEW BAR */}
        <AnimatePresence>
          {replyingTo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-[#090a0f] border-b border-neutral-900 px-4 py-2 flex items-center justify-between"
            >
              <div className="flex items-center space-x-2 text-left">
                <CornerUpRight size={14} className="text-indigo-400 flex-shrink-0" />
                <div className="truncate max-w-[280px]">
                  <span className="block text-[9px] font-mono uppercase text-neutral-500">
                    Replying to @{replyingTo.senderId}
                  </span>
                  <span className="text-[11px] font-sans text-neutral-300 truncate block">
                    {replyingTo.text}
                  </span>
                </div>
              </div>
              <button
                onClick={handleCancelReply}
                className="p-1 rounded-full bg-neutral-900 text-neutral-400 hover:text-neutral-200 transition"
                aria-label="Cancel reply"
              >
                <X size={13} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {isRecording ? (
          /* Active Recording Stage Overlay */
          <div className="h-16 px-4 flex items-center justify-between bg-neutral-950 text-xs font-sans relative overflow-hidden border-t border-neutral-900/40">
            <div className="flex items-center space-x-3">
              {/* Red pulsing recording dot */}
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
              <span className="font-mono text-neutral-300">
                {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
              </span>
            </div>

            {/* Live Waveform Indicator */}
            <div className="flex-1 max-w-[120px] sm:max-w-[160px] mx-2">
              <WaveformView isLive={true} liveLevels={recordingWaveform} barCount={15} height={20} />
            </div>

            {/* Slide to Cancel slider and text */}
            <div 
              className="flex items-center space-x-1 text-[11px] text-neutral-400 select-none transition-all duration-100"
              style={{
                transform: `translateX(${Math.max(-100, Math.min(0, draggedX))}px)`,
                opacity: draggedX < -80 ? 0.6 : 1,
              }}
            >
              <span className={draggedX < -80 ? 'text-rose-400 font-semibold' : ''}>
                {draggedX < -80 ? 'Lepas untuk batal' : '← Geser kiri untuk batal'}
              </span>
            </div>
          </div>
        ) : recordedBlob ? (
          /* Preview Stage Overlay */
          <div className="h-16 px-4 flex items-center justify-between bg-neutral-950 text-xs font-sans border-t border-neutral-900/40">
            <div className="flex items-center space-x-3 flex-1">
              {/* Play/Pause Button */}
              <button
                type="button"
                onClick={handleTogglePreviewPlay}
                className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition active:scale-95"
                title={isPreviewPlaying ? 'Pause' : 'Play'}
                aria-label={isPreviewPlaying ? 'Pause preview' : 'Play preview'}
              >
                {isPreviewPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} className="ml-0.5" fill="currentColor" />}
              </button>

              {/* Static Waveform visualization */}
              <div className="flex-1 max-w-[100px] sm:max-w-[150px]">
                <WaveformView
                  isLive={false}
                  progress={recordedDuration > 0 ? (previewProgress / recordedDuration) * 100 : 0}
                  seedId="preview"
                  barCount={16}
                  height={18}
                />
              </div>

              {/* Duration Text */}
              <span className="font-mono text-[10px] text-neutral-400">
                {Math.floor(previewProgress / 60)}:{(Math.floor(previewProgress) % 60).toString().padStart(2, '0')}
                {' / '}
                {Math.floor(recordedDuration / 60)}:{(recordedDuration % 60).toString().padStart(2, '0')}
              </span>
            </div>

            <div className="flex items-center space-x-2 ml-3">
              {/* Discard / Delete Button */}
              <button
                type="button"
                onClick={handleDiscardVoiceNote}
                className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-rose-400 hover:border-rose-950 transition flex items-center justify-center active:scale-95"
                title="Hapus rekaman"
                aria-label="Hapus rekaman"
              >
                <Trash2 size={14} />
              </button>

              {/* Send Button */}
              <button
                type="button"
                disabled={isUploading}
                onClick={handleSendVoiceNote}
                className="w-11 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-900 text-white disabled:text-neutral-600 transition flex items-center justify-center active:scale-95"
                title="Kirim voice note"
                aria-label="Kirim voice note"
              >
                {isUploading ? (
                  <Loader2 size={14} className="animate-spin text-neutral-400" />
                ) : (
                  <Send size={14} />
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Default Text Input and Microphone form */
          <form 
            onSubmit={handleSend}
            className="h-16 px-3.5 flex items-center space-x-2"
          >
            <div className="flex-1 relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                autoComplete="off"
                placeholder={`Message ${activeTargetUser.displayName}...`}
                value={text}
                onChange={handleInputChange}
                onFocus={() => {
                  setTimeout(() => {
                    scrollToBottom();
                  }, 150);
                }}
                className="w-full px-4 py-2.5 bg-[#090a0f] border border-neutral-900 focus:border-indigo-900 text-neutral-200 placeholder-neutral-600 rounded-xl text-base sm:text-xs focus:outline-none focus:ring-0 transition-all font-sans"
              />
            </div>

            {text.trim() ? (
              /* Standard Send button */
              <button
                type="submit"
                title="Send encrypted message"
                aria-label="Send encrypted message"
                className="bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-xl border border-indigo-500/20 transition cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-[0.97]"
              >
                <Send size={14} />
              </button>
            ) : (
              /* Microphone button for voice notes (holding triggers voice recorder) */
              <button
                type="button"
                onMouseDown={handleMicPressStart}
                onTouchStart={handleMicPressStart}
                title="Hold to record voice note"
                aria-label="Hold to record voice note"
                className="bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 hover:text-indigo-400 p-2.5 rounded-xl transition cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-[0.97] select-none touch-none"
              >
                <Mic size={14} />
              </button>
            )}
          </form>
        )}
      </div>

      {/* 4. REUSABLE SYSTEM SNACKBAR */}
      <AnimatePresence>
        {snackbar && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className={`px-4 py-2 rounded-xl text-[11px] font-semibold tracking-wide font-mono border shadow-2xl flex items-center space-x-2 ${
              snackbar.type === 'error'
                ? 'bg-rose-950/95 border-rose-900/60 text-rose-300'
                : snackbar.type === 'info'
                  ? 'bg-[#0a0c12]/95 border-neutral-800/80 text-indigo-400'
                  : 'bg-indigo-950/95 border-indigo-900/50 text-indigo-300'
            }`}>
              <span>{snackbar.text}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. MATERIAL 3 BOTTOM SHEET ACTIONS */}
      <MessageActionSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        message={longPressedMessage}
        myUsername={viewModel.myUsername || ''}
        onReply={viewModel.handleSetReply}
        onCopy={handleCopy}
        onDeleteForMe={handleDeleteMe}
        onDeleteForEveryone={handleDeleteEveryone}
      />

    </div>
  );
}

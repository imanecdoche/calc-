import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  Phone,
  Keyboard as KeyboardIcon,
  ChevronLeft,
  Pencil
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
import VirtualKeyboard from './VirtualKeyboard';
import { AppSettings } from '../types';

interface ChatScreenProps {
  viewModel: ChatViewModelType;
  settings: AppSettings;
  onStartVoiceCall: () => void;
  onLock: () => void;
  onExitToCalculator: () => void;
}

export default function ChatScreen({ viewModel, settings, onStartVoiceCall, onLock, onExitToCalculator }: ChatScreenProps) {
  const [text, setText] = useState('');
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [blinkedMessageId, setBlinkedMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const insertText = (char: string) => {
    const input = inputRef.current;
    if (!input) {
      setText((prev) => prev + char);
      reportTyping();
      return;
    }
    const start = input.selectionStart ?? text.length;
    const end = input.selectionEnd ?? text.length;
    const newText = text.substring(0, start) + char + text.substring(end);
    setText(newText);
    reportTyping();

    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + char.length, start + char.length);
      scrollToBottom();
    });
  };

  const handleBackspace = () => {
    const input = inputRef.current;
    if (!input) {
      setText((prev) => prev.slice(0, -1));
      reportTyping();
      return;
    }
    const start = input.selectionStart ?? text.length;
    const end = input.selectionEnd ?? text.length;

    if (start === end) {
      if (start === 0) return;
      const newText = text.substring(0, start - 1) + text.substring(end);
      setText(newText);
      requestAnimationFrame(() => {
        input.focus();
        input.setSelectionRange(start - 1, start - 1);
      });
    } else {
      const newText = text.substring(0, start) + text.substring(end);
      setText(newText);
      requestAnimationFrame(() => {
        input.focus();
        input.setSelectionRange(start, start);
      });
    }
    reportTyping();
  };

  const handleSpace = () => {
    insertText(' ');
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
      showSnackbar('Microphone permission denied. Please allow microphone access in your browser.', 'error');
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
      showSnackbar('Failed to start recording.', 'error');
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
      showSnackbar('Recording cancelled.', 'info');
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

  const showStatusAndTime = (msg: Message, idx: number) => {
    if (idx === messages.length - 1) return true;
    const nextMsg = messages[idx + 1];
    const isSameSender = nextMsg.senderId === msg.senderId;
    const isTimeClose = Math.abs(nextMsg.timestamp - msg.timestamp) < 2 * 60 * 1000; // 2 minutes threshold
    return !isSameSender || !isTimeClose;
  };

  const formatTimeStr = (ts: number) => {
    const d = new Date(ts);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const handleReplyClick = (replyToId: string) => {
    const el = document.getElementById(`msg-bubble-${replyToId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setBlinkedMessageId(replyToId);
      setTimeout(() => {
        setBlinkedMessageId(null);
      }, 1500);
    } else {
      showSnackbar('Original message not found.', 'info');
    }
  };

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
      showSnackbar('Voice message sent.', 'success');
    } catch (err: any) {
      console.error(err);
      showSnackbar(err.message || 'Failed to send voice message.', 'error');
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

  const formattedStatus = useMemo(() => {
    const raw = getPresenceSubtext().toLowerCase();
    if (raw.includes('online')) return 'online';
    if (raw.includes('typing')) return 'typing...';
    // If "offline (3 min ago)" -> convert to "on 3 m ago"
    // If "offline (just now)" -> convert to "on 0 m ago"
    const minMatch = raw.match(/(\d+)\s*min/);
    if (minMatch) return `on ${minMatch[1]} m ago`;
    const hrMatch = raw.match(/(\d+)\s*hours/);
    if (hrMatch) return `on ${hrMatch[1]} h ago`;
    const dayMatch = raw.match(/(\d+)\s*days/);
    if (dayMatch) return `on ${dayMatch[1]} d ago`;
    if (raw.includes('just now')) return 'on 0 m ago';
    return raw;
  }, [getPresenceSubtext]);

  // Auto focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Track active audio voice note playback
  useEffect(() => {
    const unsubscribe = AudioPlayerManager.getInstance().subscribe((msgId, state) => {
      if (state.isPlaying) {
        setPlayingVoiceId(msgId);
      } else {
        setPlayingVoiceId((prev) => (prev === msgId ? null : prev));
      }
    });
    return unsubscribe;
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

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;

    if (editingMessage) {
      await viewModel.editMessage(editingMessage, text.trim());
      setEditingMessage(null);
      setText('');
      showSnackbar('Message updated.', 'success');
    } else {
      sendMessage(text.trim());
      setText('');
    }

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
      className="absolute inset-0 bg-[#000000] flex flex-col justify-between overflow-hidden z-20 font-sans text-white"
      style={viewportHeight ? { height: `${viewportHeight}px`, bottom: 'auto' } : {}}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes terminal-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .cursor-blink {
          animation: terminal-blink 1.2s step-end infinite;
        }
        .terminal-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .terminal-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .terminal-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 2px;
        }
        @keyframes blink-twice {
          0%, 100% { opacity: 1; background-color: transparent; }
          25%, 75% { opacity: 0.3; background-color: rgba(14, 165, 233, 0.4); }
          50% { opacity: 1; background-color: transparent; }
        }
        .animate-blink-twice {
          animation: blink-twice 0.7s ease-in-out 2;
        }
      ` }} />
      
      {/* HEADER */}
      <div 
        className="flex items-center justify-between px-4 py-3 bg-black border-b border-zinc-900 text-white flex-none select-none h-[60px]"
      >
        <div className="flex items-center space-x-3">
          {/* Back Chevron */}
          <button 
            onClick={() => viewModel.disconnect()}
            className="text-white hover:opacity-80 transition cursor-pointer p-1 -ml-2"
            aria-label="Back"
          >
            <ChevronLeft size={24} />
          </button>
          
          {/* Target Profile Initials */}
          <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs text-white select-none shadow border border-zinc-850">
            {activeTargetUser.displayName ? activeTargetUser.displayName.slice(0, 2).toUpperCase() : 'U'}
          </div>

          {/* User Details */}
          <div className="text-left flex flex-col">
            <span className="font-semibold text-sm leading-tight tracking-wide text-zinc-100 flex items-center gap-1">
              {activeTargetUser.displayName}
              {targetPresence.isOnline && (
                <span className="w-2 h-2 bg-green-500 rounded-full inline-block animate-pulse" />
              )}
            </span>
            <span className="text-[10px] text-zinc-400 leading-none mt-0.5">
              @{activeTargetUser.username} • {targetPresence.isOnline ? 'Active now' : 'Offline'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          {/* Phone Call Trigger */}
          <button 
            onClick={onStartVoiceCall}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition cursor-pointer"
            title="Start voice call"
            aria-label="Start voice call"
          >
            <Phone size={18} />
          </button>

          {/* Lock Button */}
          <button 
            onClick={() => {
              viewModel.disconnect();
              onLock();
            }}
            className="px-2.5 py-1.5 rounded-xl text-neutral-400 hover:text-rose-400 hover:bg-neutral-900 transition flex items-center gap-1.5 cursor-pointer text-xs font-medium"
            title="Lock chat"
            aria-label="Lock chat"
          >
            <Lock size={14} />
            <span>Lock</span>
          </button>
        </div>
      </div>

      {/* 2. CHAT MESSAGES PANEL */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 terminal-scrollbar relative bg-black"
        style={{ overflowX: 'hidden' }}
      >
        
        {/* Pagination Trigger / Load More Header */}
        {hasMoreHistory && (
          <button
            onClick={() => viewModel.loadMoreHistory()}
            className="w-full text-center py-2 text-[10px] text-zinc-500 hover:text-zinc-300 transition select-none cursor-pointer uppercase tracking-wider font-semibold font-mono"
          >
            Load older messages
          </button>
        )}

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500 text-xs text-center select-none space-y-3">
            <div className="w-14 h-14 rounded-full bg-zinc-900 flex items-center justify-center text-xl">💬</div>
            <div className="flex flex-col space-y-1">
              <div className="font-semibold text-zinc-300">No messages yet</div>
              <div className="text-[11px] text-zinc-600">Send a message to start the conversation.</div>
            </div>
          </div>
        )}

        {/* List render with chat bubbles */}
        <div className="space-y-1 py-2 flex flex-col">
          {messages.map((msg, index) => {
            const isMe = msg.senderId === viewModel.myUsername;
            const isVoice = !!msg.audioUrl;
            const showTime = showStatusAndTime(msg, index);

            return (
              <div 
                key={msg.id || `msg-${index}`} 
                id={`msg-bubble-${msg.id}`}
                className={`flex flex-col w-full mb-1 ${isMe ? 'items-end' : 'items-start'} group`}
              >
                <div 
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleLongPress(e, msg);
                  }}
                  className={`relative max-w-[72%] flex flex-col transition-all duration-300 ${
                    blinkedMessageId === msg.id 
                      ? 'animate-blink-twice rounded-2xl ring-2 ring-sky-500/80 ring-offset-2 ring-offset-black scale-[1.01]' 
                      : ''
                  }`}
                >
                  {/* Reply Quote box inside the bubble */}
                  {msg.replyToId && !msg.deletedForEveryone && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReplyClick(msg.replyToId!);
                      }}
                      className={`mb-[-6px] text-[10px] text-zinc-400 bg-zinc-900/95 px-3 py-2 pb-3 rounded-t-[18px] border-l-2 border-sky-500 cursor-pointer hover:bg-zinc-800 transition max-w-full flex items-center gap-1.5 leading-normal ${
                        isMe ? 'rounded-tr-[18px]' : 'rounded-tl-[18px]'
                      }`}
                    >
                      <span className="font-semibold text-sky-400">@{msg.replyToSender}</span>
                      <span className="text-zinc-600">•</span>
                      <span className="truncate italic flex-1">"{msg.replyToText}"</span>
                    </div>
                  )}

                  {/* Main Bubble Body */}
                  <div 
                    className={`px-3.5 py-2.5 flex flex-col justify-center rounded-[18px] text-[14px] leading-relaxed text-left ${
                      msg.replyToId && !msg.deletedForEveryone ? 'rounded-t-none' : ''
                    } ${
                      isMe 
                        ? 'bg-[#3797f0] text-white rounded-br-[4px]' 
                        : 'bg-[#262626] text-[#efefef] rounded-bl-[4px]'
                    } ${
                      msg.deletedForEveryone ? 'bg-[#121212] border border-zinc-900 text-zinc-600 italic rounded-[18px]' : ''
                    }`}
                  >
                    {msg.deletedForEveryone ? (
                      <span className="flex items-center space-x-1 select-none">
                        <span>This message was deleted</span>
                      </span>
                    ) : isVoice ? (
                      <div className="flex items-center space-x-3 py-0.5">
                        <div className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white select-none">🎙️</div>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold">Voice message</span>
                          <span className="text-[10px] text-white/70">{msg.audioDuration || 0}s</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const player = AudioPlayerManager.getInstance();
                            if (msg.id === playingVoiceId) {
                              player.pause();
                            } else {
                              player.play(msg.id, msg.audioUrl || '');
                            }
                          }}
                          className="ml-2 px-3 py-1.5 text-xs bg-white/10 hover:bg-white/25 rounded-full font-semibold text-white transition cursor-pointer"
                        >
                          {msg.id === playingVoiceId ? 'Pause' : 'Play'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <span className="whitespace-pre-wrap break-words">{msg.text}</span>
                        {msg.isEdited && (
                          <span className="text-[9px] text-white/50 block text-right mt-0.5 select-none font-mono">(edited)</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Time & Status display only on the last group item */}
                  {showTime && (
                    <div className={`flex items-center space-x-1.5 px-1 mt-1 text-[10px] text-neutral-500 select-none ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <span>{formatTimeStr(msg.timestamp)}</span>
                      {isMe && !msg.deletedForEveryone && (
                        <>
                          <span>•</span>
                          <span className="lowercase">
                            {msg.status === 'sending' 
                              ? 'sending...' 
                              : msg.status === 'delivered' 
                                ? 'seen' 
                                : msg.status === 'failed' 
                                  ? 'failed' 
                                  : 'sent'}
                          </span>
                        </>
                      )}
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* FLOATING SCROLL CONTROLLER */}
      <ScrollController
        containerRef={containerRef}
        messagesCount={messages.length}
        onScrollToBottom={scrollToBottom}
      />

      {/* 3. INPUT PANEL & ACTIVE CONTROLS */}
      <div className="bg-black border-t border-zinc-900 flex flex-col flex-none pb-[env(safe-area-inset-bottom,8px)] pt-1 select-none">
        
        {/* EDITING PREVIEW BAR */}
        <AnimatePresence>
          {editingMessage && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-[#121212] border-b border-zinc-800 px-4 py-2.5 flex items-center justify-between text-xs text-neutral-300"
            >
              <div className="flex items-center space-x-2 text-left font-sans">
                <Pencil size={12} className="text-sky-400" />
                <span className="font-semibold text-sky-400">Editing message:</span>
                <span className="truncate max-w-[200px] text-neutral-400 italic">
                  "{editingMessage.text}"
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingMessage(null);
                  setText('');
                }}
                className="text-neutral-500 hover:text-white transition font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* REPLY PREVIEW BAR */}
        <AnimatePresence>
          {replyingTo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-[#121212] border-b border-zinc-800 px-4 py-2 flex items-center justify-between text-xs text-neutral-300"
            >
              <div className="flex items-center space-x-2 text-left font-sans">
                <CornerUpRight size={12} className="text-sky-400" />
                <span className="font-semibold text-sky-400">Replying to @{replyingTo.senderId}:</span>
                <span className="truncate max-w-[200px] text-neutral-400 italic">
                  "{replyingTo.text}"
                </span>
              </div>
              <button
                type="button"
                onClick={handleCancelReply}
                className="text-neutral-500 hover:text-white transition font-semibold cursor-pointer"
                aria-label="Cancel reply"
              >
                Cancel
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {isRecording ? (
          /* Active Recording Stage Overlay */
          <div className="h-14 px-4 flex items-center justify-between bg-[#121212] text-xs text-red-500 relative overflow-hidden border-t border-zinc-800 font-sans">
            <div className="flex items-center space-x-3">
              <div className="w-2.5 h-2.5 bg-red-600 rounded-full cursor-blink animate-pulse" />
              <span className="font-semibold">Recording: {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</span>
            </div>

            {/* Slide to Cancel slider and text */}
            <div 
              className="flex items-center space-x-1 text-[11px] select-none transition-all duration-100 text-zinc-500"
              style={{
                transform: `translateX(${Math.max(-100, Math.min(0, draggedX))}px)`,
                opacity: draggedX < -80 ? 0.6 : 1,
              }}
            >
              <span className={draggedX < -80 ? 'text-red-400 font-bold' : ''}>
                {draggedX < -80 ? 'Release to cancel' : '← Slide left to cancel'}
              </span>
            </div>
          </div>
        ) : recordedBlob ? (
          /* Preview Stage Overlay */
          <div className="h-14 px-4 flex items-center justify-between bg-[#121212] text-xs border-t border-zinc-800 text-zinc-100 font-sans">
            <div className="flex items-center space-x-3 flex-1">
              <button
                type="button"
                onClick={handleTogglePreviewPlay}
                className="font-semibold text-sky-400 hover:text-sky-300 cursor-pointer flex items-center gap-1"
                aria-label={isPreviewPlaying ? 'Pause preview' : 'Play preview'}
              >
                {isPreviewPlaying ? <Pause size={14} /> : <Play size={14} />}
                <span>{isPreviewPlaying ? 'Pause' : 'Play'}</span>
              </button>

              <span className="text-[10px] text-zinc-400">
                {Math.floor(previewProgress / 60)}:{(Math.floor(previewProgress) % 60).toString().padStart(2, '0')}
                {' / '}
                {Math.floor(recordedDuration / 60)}:{(recordedDuration % 60).toString().padStart(2, '0')}
              </span>
            </div>

            <div className="flex items-center space-x-3 ml-3 font-semibold text-xs">
              <button
                type="button"
                onClick={handleDiscardVoiceNote}
                className="text-red-400 hover:text-red-300 cursor-pointer"
                aria-label="Discard recording"
              >
                Discard
              </button>

              <button
                type="button"
                disabled={isUploading}
                onClick={handleSendVoiceNote}
                className="text-sky-400 hover:text-sky-300 disabled:text-zinc-600 cursor-pointer font-bold"
                aria-label="Send voice message"
              >
                {isUploading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        ) : (
          /* Default Text Input and Microphone form */
          <form 
            onSubmit={handleSend}
            className="min-h-14 px-3 py-2 flex items-center space-x-2 text-sm bg-black border-t border-zinc-900 font-sans"
          >
            <div className="flex-1 bg-zinc-900/90 border border-zinc-800 rounded-full px-4 py-2 flex items-center space-x-2.5 focus-within:border-zinc-700 transition">
              <input
                ref={inputRef}
                type="text"
                inputMode={settings.keyboardType === 'custom' ? 'none' : 'text'}
                autoComplete="off"
                placeholder={editingMessage ? "Edit message..." : "Type a message..."}
                value={text}
                onChange={handleInputChange}
                onFocus={() => {
                  if (settings.keyboardType === 'custom') {
                    setIsKeyboardOpen(true);
                  }
                  setTimeout(() => {
                    scrollToBottom();
                  }, 150);
                }}
                className="flex-1 bg-transparent border-none text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-0 py-0.5"
              />

              {!text.trim() && (
                /* Microphone button for voice notes (holding triggers voice recorder) */
                <button
                  type="button"
                  onMouseDown={handleMicPressStart}
                  onTouchStart={handleMicPressStart}
                  title="Hold to record voice message"
                  aria-label="Hold to record voice message"
                  className="hover:text-white text-zinc-400 cursor-pointer transition select-none touch-none p-1"
                >
                  <Mic size={18} />
                </button>
              )}
            </div>

            {text.trim() ? (
              /* Standard Send button */
              <button
                type="submit"
                title="Send message"
                aria-label="Send message"
                className="w-10 h-10 rounded-full bg-sky-500 hover:bg-sky-400 text-white flex items-center justify-center cursor-pointer transition select-none flex-none shadow"
              >
                <Send size={16} />
              </button>
            ) : null}

            {settings.keyboardType === 'custom' && (
              <button
                type="button"
                onClick={() => {
                  setIsKeyboardOpen(!isKeyboardOpen);
                }}
                className="text-zinc-400 hover:text-zinc-200 cursor-pointer transition p-2"
                title="Toggle Keyboard"
              >
                <KeyboardIcon size={18} />
              </button>
            )}
          </form>
        )}

        {/* Custom Native-App-style Virtual Keyboard */}
        {settings.keyboardType === 'custom' && isKeyboardOpen && !isRecording && !recordedBlob && (
          <div className="w-full bg-black border-t border-zinc-900">
            <VirtualKeyboard
              onKeyPress={insertText}
              onBackspace={handleBackspace}
              onSpace={handleSpace}
              onEnter={() => handleSend()}
              onClose={() => setIsKeyboardOpen(false)}
              enterLabel="Send"
              height={settings.keyboardHeight}
            />
          </div>
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
            <div className={`px-4 py-2 rounded-xl text-xs font-sans shadow-2xl flex items-center space-x-2 border ${
              snackbar.type === 'error'
                ? 'bg-rose-950 border-rose-900 text-rose-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-100'
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
        onEdit={(msg) => {
          setEditingMessage(msg);
          setText(msg.text);
          setTimeout(() => {
            inputRef.current?.focus();
          }, 100);
        }}
      />

    </div>
  );
}

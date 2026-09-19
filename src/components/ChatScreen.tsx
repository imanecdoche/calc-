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
  Pencil,
  ImagePlus
} from 'lucide-react';
import { ChatViewModelType } from '../hooks/ChatViewModel';
import { MessageBubble } from './MessageBubble';
import { DateSeparator, shouldShowDateSeparator } from './DateSeparator';
import { ScrollController } from './ScrollController';
import { MessageActionSheet } from './MessageActionSheet';
import { Message } from '../models/Message';
import { VoiceRecorderManager } from '../services/VoiceRecorderManager';
import { VoiceNoteRepository } from '../repositories/VoiceNoteRepository';
import { ImageMessageRepository } from '../repositories/ImageMessageRepository';
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

  // Photo Attachment states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const handleImageFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showSnackbar('Please select an image file (JPG, PNG, WEBP, etc.).', 'error');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      showSnackbar('Photo is too large. Maximum size is 25MB.', 'error');
      return;
    }

    setSelectedImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setSelectedImagePreview(previewUrl);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCancelSelectedImage = () => {
    if (selectedImagePreview) {
      URL.revokeObjectURL(selectedImagePreview);
    }
    setSelectedImageFile(null);
    setSelectedImagePreview(null);
  };

  // Clean up preview audio and image URLs on unmount
  useEffect(() => {
    return () => {
      if (selectedImagePreview) {
        URL.revokeObjectURL(selectedImagePreview);
      }
    };
  }, [selectedImagePreview]);

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
        messageId: replyingTo.messageId,
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

  // Periodic tick to auto-update relative last online timestamps (every 15 seconds)
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const presenceStatus = useMemo(() => {
    if (targetIsTyping) {
      return 'typing...';
    }
    if (targetPresence?.isOnline) {
      return 'Active now';
    }
    if (!targetPresence?.lastSeen) {
      return 'Offline';
    }

    const now = new Date();
    const date = new Date(targetPresence.lastSeen);
    const diffMs = Math.max(0, now.getTime() - targetPresence.lastSeen);
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMin / 60);

    // 1. Under 1 minute
    if (diffSec < 60) {
      return 'just now';
    }

    // 2. Under 60 minutes: "1 minute" or "N minutes"
    if (diffMin < 60) {
      return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'}`;
    }

    // 3. Same calendar day (today): specific time "seen at 12:23 PM"
    const isToday = now.toDateString() === date.toDateString();
    if (isToday) {
      const timeStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      return `seen at ${timeStr}`;
    }

    // 4. Past midnight but under 2 hours
    if (diffHours === 1) {
      return '1 hour';
    }

    // 5. Yesterday
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(now.getDate() - 1);
    const isYesterday = yesterdayDate.toDateString() === date.toDateString();
    if (isYesterday) {
      return 'yesterday';
    }

    // 6. Within past week: "N days"
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays >= 1 && diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
    }

    return 'Offline';
  }, [targetIsTyping, targetPresence, tick]);

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

    if (selectedImageFile) {
      setIsUploadingImage(true);
      try {
        const convId = generateConversationId(viewModel.myUsername || '', activeTargetUser.username);
        const replyToData = replyingTo ? {
          messageId: replyingTo.messageId,
          text: replyingTo.text,
          senderId: replyingTo.senderId
        } : undefined;

        await ImageMessageRepository.getInstance().sendImageMessage(
          convId,
          viewModel.myUsername || '',
          activeTargetUser.username,
          selectedImageFile,
          text.trim(),
          replyToData
        );

        handleCancelSelectedImage();
        setText('');
        handleCancelReply();
        showSnackbar('Photo sent.', 'success');
      } catch (err: any) {
        console.error('Failed to send image:', err);
        showSnackbar(err.message || 'Failed to send photo.', 'error');
      } finally {
        setIsUploadingImage(false);
      }
      return;
    }

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
    <div className="absolute inset-0 bg-[#0a0a0a] flex flex-col overflow-hidden font-mono text-zinc-100 select-text">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes cli-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .cli-cursor {
          animation: cli-blink 1s step-end infinite;
        }
        .cli-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .cli-scrollbar::-webkit-scrollbar-track {
          background: #090a0d;
        }
        .cli-scrollbar::-webkit-scrollbar-thumb {
          background: #27272a;
        }
        .cli-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
        }
        @keyframes blink-twice {
          0%, 100% { opacity: 1; background-color: transparent; }
          25%, 75% { opacity: 0.4; background-color: rgba(16, 185, 129, 0.25); }
          50% { opacity: 1; background-color: transparent; }
        }
        .animate-blink-twice {
          animation: blink-twice 0.7s ease-in-out 2;
        }
      ` }} />
      
      {/* 1. CLI HEADER STATUS BAR */}
      <div 
        className="flex items-center justify-between px-3 py-2 bg-[#0c0d10] border-b border-zinc-800 text-zinc-200 flex-none select-none h-12 font-mono"
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          {/* Back Button */}
          <button 
            onClick={() => viewModel.disconnect()}
            className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-emerald-400 border border-zinc-700 hover:border-emerald-500 text-xs font-mono transition cursor-pointer flex items-center gap-1 select-none shrink-0"
            aria-label="Back"
            title="Return to shell"
          >
            <ChevronLeft size={14} className="stroke-[2.5]" />
            <span>BACK</span>
          </button>
          
          {/* Session Details */}
          <div className="text-left flex flex-col min-w-0">
            <div className="flex items-center space-x-2 text-xs font-mono truncate">
              <span className="text-emerald-400 font-bold">calc-term:</span>
              <span className="text-zinc-100 font-bold truncate">@{activeTargetUser?.username}</span>
              {targetIsTyping ? (
                <span className="text-emerald-400 font-mono text-[11px] animate-pulse shrink-0">[TYPING...]</span>
              ) : targetPresence?.isOnline ? (
                <span className="text-emerald-400 font-mono text-[11px] shrink-0">[ONLINE]</span>
              ) : (
                <span className="text-zinc-500 font-mono text-[11px] shrink-0">[OFFLINE]</span>
              )}
            </div>
            <span className="text-[10px] text-zinc-500 font-mono truncate">
              peer: {activeTargetUser?.displayName || activeTargetUser?.username} • {presenceStatus}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0 font-mono">
          {/* Phone Call Button */}
          <button 
            onClick={onStartVoiceCall}
            className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-sky-400 border border-zinc-700 hover:border-sky-500 text-xs font-mono transition cursor-pointer flex items-center gap-1.5"
            title="Start secure voice link"
            aria-label="Start voice call"
          >
            <Phone size={13} />
            <span className="hidden sm:inline">CALL</span>
          </button>

          {/* Lock Button */}
          <button 
            onClick={() => {
              viewModel.disconnect();
              onLock();
            }}
            className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-rose-400 border border-zinc-700 hover:border-rose-500 text-xs font-mono transition cursor-pointer flex items-center gap-1.5"
            title="Lock terminal"
            aria-label="Lock chat"
          >
            <Lock size={13} />
            <span>LOCK</span>
          </button>
        </div>
      </div>

      {/* 2. TERMINAL LOG STREAM */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto px-3 py-3 cli-scrollbar relative bg-[#0a0a0a] font-mono select-text"
        style={{ overflowX: 'hidden' }}
      >
        {/* Pagination Trigger / Load More */}
        {hasMoreHistory && (
          <button
            onClick={() => viewModel.loadMoreHistory()}
            className="w-full text-center py-2 text-xs text-emerald-400/70 hover:text-emerald-300 bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 transition select-none cursor-pointer font-mono mb-3"
          >
            [-- LOAD OLDER TRANSMISSION LOGS --]
          </button>
        )}

        {/* System Initial Channel Banner */}
        <div className="p-3 mb-3 bg-zinc-950/90 border border-zinc-800 text-zinc-400 text-xs font-mono select-none leading-relaxed">
          <div className="text-emerald-400 font-bold">--- [CALC+ SECURE COMMAND SHELL v2.4] ---</div>
          <div>HOST: <span className="text-zinc-200">@{viewModel.myUsername || 'local'}</span> &lt;=&gt; TARGET: <span className="text-sky-400">@{activeTargetUser?.username}</span></div>
          <div>SECURITY: <span className="text-emerald-500 font-bold">E2EE ACTIVE</span> • SESSION LOG STREAM READY</div>
        </div>

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500 font-mono text-xs text-center select-none space-y-2">
            <div className="text-zinc-600">[NULL LOGS]</div>
            <div className="text-zinc-400 font-semibold">No transmissions recorded on this channel.</div>
            <div className="text-zinc-600">Enter a command or message below to transmit.</div>
          </div>
        )}

        {/* Stream of Terminal Messages */}
        <div className="space-y-2 flex flex-col">
          {messages.map((msg, index) => {
            const isMe = msg.senderId === viewModel.myUsername;
            const isVoice = !!msg.audioUrl;

            return (
              <div 
                key={msg.id || `msg-${index}`} 
                id={`msg-bubble-${msg.id}`}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleLongPress(e, msg);
                }}
                className={`w-full p-2.5 border transition-all duration-200 font-mono text-left group select-text ${
                  isMe 
                    ? 'border-l-2 border-emerald-500/80 bg-emerald-950/15 border-t-zinc-900 border-r-zinc-900 border-b-zinc-900' 
                    : 'border-l-2 border-sky-500/80 bg-sky-950/15 border-t-zinc-900 border-r-zinc-900 border-b-zinc-900'
                } ${
                  blinkedMessageId === msg.id 
                    ? 'animate-blink-twice ring-1 ring-emerald-400' 
                    : 'hover:border-zinc-700'
                }`}
              >
                {/* Header Line of Message */}
                <div className="flex items-center justify-between text-xs mb-1 select-none border-b border-zinc-800/60 pb-1">
                  <div className="flex items-center space-x-2 truncate">
                    <span className="text-zinc-500 text-[11px]">
                      [{formatTimeStr(msg.timestamp)}]
                    </span>
                    <span className={`font-bold ${isMe ? 'text-emerald-400' : 'text-sky-400'}`}>
                      {isMe ? `<${viewModel.myUsername || 'you'}@local>` : `<${msg.senderId}@remote>`}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-[11px] text-zinc-500 shrink-0">
                    {msg.isEdited && (
                      <span className="text-amber-400/80 font-mono">[EDITED]</span>
                    )}
                    {isMe && !msg.deletedForEveryone && (
                      <span className="font-mono text-[10px]">
                        {msg.status === 'sending' 
                          ? '[TRANSMITTING...]' 
                          : msg.status === 'delivered' 
                            ? '[ACK:SEEN]' 
                            : msg.status === 'failed' 
                              ? '[ERR:FAILED]' 
                              : '[SENT]'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Reply Quote Block (Terminal Style) */}
                {msg.replyToId && !msg.deletedForEveryone && (
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReplyClick(msg.replyToId!);
                    }}
                    className="mb-1.5 text-xs text-zinc-400 font-mono bg-zinc-900/90 px-2.5 py-1 border-l-2 border-sky-400 cursor-pointer hover:text-zinc-200 transition flex items-center gap-1.5"
                  >
                    <span className="text-sky-400 font-semibold">&gt; IN REPLY TO @{msg.replyToSender}:</span>
                    <span className="truncate italic flex-1">"{msg.replyToText}"</span>
                  </div>
                )}

                {/* Body Content */}
                {msg.deletedForEveryone ? (
                  <div className="text-rose-400/80 italic text-xs font-mono select-none py-0.5">
                    [SYSTEM: TRANSMISSION EXPUNGED BY SENDER]
                  </div>
                ) : isVoice ? (
                  <div className="flex items-center space-x-3 py-1 font-mono text-xs text-zinc-300">
                    <span className="text-amber-400 font-bold">[AUDIO PAYLOAD: {msg.audioDuration || 0}s]</span>
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
                      className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-600 text-xs font-mono transition cursor-pointer flex items-center gap-1.5"
                    >
                      {msg.id === playingVoiceId ? <Pause size={12} /> : <Play size={12} />}
                      <span>{msg.id === playingVoiceId ? 'PAUSE' : 'PLAY'}</span>
                    </button>
                  </div>
                ) : msg.imageUrl ? (
                  <div className="flex flex-col space-y-1.5 font-mono">
                    <div className="text-[11px] text-zinc-400 flex items-center gap-1 select-none">
                      <span className="text-emerald-400 font-bold">[PAYLOAD: IMAGE_DATA]</span>
                      <span className="text-zinc-600">•</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingImage(msg.imageUrl || null);
                        }}
                        className="text-zinc-400 hover:text-emerald-400 transition cursor-pointer"
                      >
                        [EXPAND]
                      </button>
                    </div>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingImage(msg.imageUrl || null);
                      }}
                      className="border border-zinc-700 hover:border-emerald-400 transition cursor-zoom-in max-w-[280px] max-h-[300px] overflow-hidden bg-black"
                    >
                      <img
                        src={msg.imageUrl}
                        alt="Payload preview"
                        className="w-full h-auto max-h-[300px] object-cover"
                        loading="lazy"
                      />
                    </div>
                    {msg.text && msg.text !== '[Photo]' && (
                      <div className="text-xs sm:text-sm text-zinc-200 mt-1 whitespace-pre-wrap break-words font-mono">
                        <span className="text-zinc-500 font-bold mr-1.5">&gt;</span>{msg.text}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs sm:text-sm text-zinc-100 whitespace-pre-wrap break-words font-mono leading-relaxed select-text py-0.5">
                    {msg.text}
                  </div>
                )}
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

      {/* 3. CLI COMMAND PROMPT & INPUT PANEL */}
      <div className="bg-[#0c0d10] border-t border-zinc-800 flex flex-col flex-none pb-[env(safe-area-inset-bottom,8px)] select-none font-mono">
        
        {/* EDITING MODE BAR */}
        <AnimatePresence>
          {editingMessage && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-zinc-950 border-b border-zinc-800 px-3 py-1.5 flex items-center justify-between text-xs font-mono text-zinc-300"
            >
              <div className="flex items-center space-x-2 truncate font-mono">
                <Pencil size={12} className="text-amber-400 shrink-0" />
                <span className="text-amber-400 font-bold">[EDITING LINE]:</span>
                <span className="truncate text-zinc-400 italic">"{editingMessage.text}"</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingMessage(null);
                  setText('');
                }}
                className="px-2 py-0.5 bg-zinc-900 border border-zinc-700 hover:text-rose-400 font-mono text-xs cursor-pointer ml-2 shrink-0"
              >
                CANCEL [ESC]
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* REPLY MODE BAR */}
        <AnimatePresence>
          {replyingTo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-zinc-950 border-b border-zinc-800 px-3 py-1.5 flex items-center justify-between text-xs font-mono text-zinc-300"
            >
              <div className="flex items-center space-x-2 truncate font-mono">
                <CornerUpRight size={12} className="text-sky-400 shrink-0" />
                <span className="text-sky-400 font-bold">[REPLYING TO @{replyingTo.senderId}]:</span>
                <span className="truncate text-zinc-400 italic">"{replyingTo.text}"</span>
              </div>
              <button
                type="button"
                onClick={handleCancelReply}
                className="px-2 py-0.5 bg-zinc-900 border border-zinc-700 hover:text-rose-400 font-mono text-xs cursor-pointer ml-2 shrink-0"
                aria-label="Cancel reply"
              >
                CANCEL [ESC]
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SELECTED IMAGE PAYLOAD BAR */}
        {selectedImagePreview && (
          <div className="px-3 py-2 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between font-mono text-xs">
            <div className="flex items-center space-x-2.5 min-w-0">
              <img
                src={selectedImagePreview}
                alt="Buffered preview"
                className="w-8 h-8 object-cover border border-zinc-700 shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-emerald-400 font-bold truncate">
                  [BUFFER: {selectedImageFile?.name || 'payload.bin'}]
                </span>
                <span className="text-[10px] text-zinc-500">
                  {selectedImageFile ? `${(selectedImageFile.size / (1024 * 1024)).toFixed(2)} MB` : ''} • READY FOR TRANSMISSION
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCancelSelectedImage}
              disabled={isUploadingImage}
              className="px-2 py-1 bg-zinc-900 border border-zinc-700 hover:text-rose-400 text-zinc-400 text-xs font-mono transition cursor-pointer"
              title="Cancel payload"
              aria-label="Cancel photo"
            >
              CANCEL
            </button>
          </div>
        )}

        {isRecording ? (
          /* Active Recording CLI Stage */
          <div className="h-12 px-3 flex items-center justify-between bg-zinc-950 text-xs font-mono text-rose-400 border-t border-zinc-800 select-none">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
              <span className="font-bold">[AUDIO RECORDING: {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}]</span>
            </div>

            <div 
              className="text-[11px] text-zinc-500 select-none transition-all duration-100"
              style={{
                transform: `translateX(${Math.max(-100, Math.min(0, draggedX))}px)`,
                opacity: draggedX < -80 ? 0.6 : 1,
              }}
            >
              <span className={draggedX < -80 ? 'text-rose-400 font-bold' : ''}>
                {draggedX < -80 ? '[RELEASE TO ABORT]' : '<-- SLIDE LEFT TO ABORT'}
              </span>
            </div>
          </div>
        ) : recordedBlob ? (
          /* Recorded Audio Preview CLI Stage */
          <div className="h-12 px-3 flex items-center justify-between bg-zinc-950 text-xs font-mono border-t border-zinc-800 text-zinc-200">
            <div className="flex items-center space-x-2 flex-1">
              <button
                type="button"
                onClick={handleTogglePreviewPlay}
                className="px-2 py-1 bg-zinc-900 border border-zinc-700 text-sky-400 hover:text-sky-300 font-mono text-xs cursor-pointer flex items-center gap-1"
                aria-label={isPreviewPlaying ? 'Pause preview' : 'Play preview'}
              >
                {isPreviewPlaying ? <Pause size={12} /> : <Play size={12} />}
                <span>{isPreviewPlaying ? 'PAUSE' : 'PLAY'}</span>
              </button>

              <span className="text-[11px] text-zinc-500">
                {Math.floor(previewProgress / 60)}:{(Math.floor(previewProgress) % 60).toString().padStart(2, '0')}
                {' / '}
                {Math.floor(recordedDuration / 60)}:{(recordedDuration % 60).toString().padStart(2, '0')}
              </span>
            </div>

            <div className="flex items-center space-x-2 font-mono">
              <button
                type="button"
                onClick={handleDiscardVoiceNote}
                className="px-2 py-1 bg-zinc-900 border border-zinc-700 text-rose-400 hover:text-rose-300 text-xs cursor-pointer"
                aria-label="Discard recording"
              >
                DISCARD
              </button>

              <button
                type="button"
                disabled={isUploading}
                onClick={handleSendVoiceNote}
                className="px-2.5 py-1 bg-emerald-500 border border-emerald-400 text-black font-bold text-xs cursor-pointer disabled:opacity-50"
                aria-label="Send voice message"
              >
                {isUploading ? 'SENDING...' : 'TRANSMIT'}
              </button>
            </div>
          </div>
        ) : (
          /* Default Command Line Input Form */
          <form 
            onSubmit={handleSend}
            className="min-h-12 px-3 py-2 flex items-center space-x-2 bg-[#0a0a0a] border-t border-zinc-800 font-mono"
          >
            <div className="flex-1 bg-zinc-950 border border-zinc-800 px-3 py-1.5 flex items-center space-x-2 focus-within:border-emerald-500 transition">
              {/* Command Prompt Label */}
              <span className="text-emerald-400 font-bold text-xs sm:text-sm select-none shrink-0 font-mono">
                {viewModel.myUsername || 'user'}@calc:~$
              </span>

              {/* Text Input */}
              <input
                ref={inputRef}
                type="text"
                inputMode={settings.keyboardType === 'custom' ? 'none' : 'text'}
                autoComplete="off"
                placeholder={editingMessage ? "edit line..." : selectedImageFile ? "enter caption..." : "type command or message..."}
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
                className="flex-1 bg-transparent border-none text-zinc-100 placeholder-zinc-600 text-xs sm:text-sm font-mono focus:outline-none focus:ring-0 py-0.5"
              />

              {/* Blinking Cursor */}
              <span className="text-emerald-400 font-bold select-none cli-cursor text-xs sm:text-sm -ml-1">█</span>

              {/* File Attachment input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileSelected}
                className="hidden"
              />

              {/* File Attachment Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                title="Attach image payload"
                aria-label="Attach photo"
                className="px-1.5 py-0.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 border border-zinc-700 text-[11px] font-mono transition cursor-pointer flex items-center gap-1 select-none shrink-0"
              >
                <ImagePlus size={13} />
                <span className="hidden sm:inline">IMG</span>
              </button>

              {!text.trim() && !selectedImageFile && (
                <button
                  type="button"
                  onMouseDown={handleMicPressStart}
                  onTouchStart={handleMicPressStart}
                  title="Hold to record audio stream"
                  aria-label="Hold to record voice message"
                  className="px-1.5 py-0.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 border border-zinc-700 text-[11px] font-mono transition cursor-pointer flex items-center gap-1 select-none shrink-0"
                >
                  <Mic size={13} />
                  <span className="hidden sm:inline">REC</span>
                </button>
              )}
            </div>

            {(text.trim() || selectedImageFile) && (
              <button
                type="submit"
                disabled={isUploadingImage}
                title="Transmit message"
                aria-label="Send message"
                className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-black border border-emerald-400 font-bold text-xs font-mono flex items-center justify-center space-x-1 cursor-pointer transition select-none shrink-0 disabled:opacity-50"
              >
                {isUploadingImage ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                <span>EXEC</span>
              </button>
            )}

            {settings.keyboardType === 'custom' && (
              <button
                type="button"
                onClick={() => setIsKeyboardOpen(!isKeyboardOpen)}
                className="px-2 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700 text-xs font-mono transition cursor-pointer shrink-0"
                title="Toggle Keyboard"
              >
                <KeyboardIcon size={14} />
              </button>
            )}
          </form>
        )}

        {/* Custom Virtual Keyboard */}
        {settings.keyboardType === 'custom' && isKeyboardOpen && !isRecording && !recordedBlob && (
          <div className="w-full bg-black border-t border-zinc-900">
            <VirtualKeyboard
              onKeyPress={insertText}
              onBackspace={handleBackspace}
              onSpace={handleSpace}
              onEnter={() => handleSend()}
              onClose={() => setIsKeyboardOpen(false)}
              enterLabel="EXEC"
              height={settings.keyboardHeight}
            />
          </div>
        )}
      </div>

      {/* 4. SYSTEM CLI SNACKBAR */}
      <AnimatePresence>
        {snackbar && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className={`px-3 py-1.5 text-xs font-mono shadow-2xl flex items-center space-x-2 border ${
              snackbar.type === 'error'
                ? 'bg-rose-950 border-rose-800 text-rose-300'
                : 'bg-zinc-950 border-zinc-700 text-emerald-400'
            }`}>
              <span>[SYSTEM]: {snackbar.text}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. MESSAGE ACTION SHEET */}
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

      {/* 6. FULLSCREEN PHOTO LIGHTBOX VIEWER */}
      {viewingImage && (
        <div
          onClick={() => setViewingImage(null)}
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 select-none cursor-zoom-out font-mono"
        >
          <div className="w-full max-w-lg flex items-center justify-between mb-2 text-xs text-zinc-400 border-b border-zinc-800 pb-1">
            <span className="text-emerald-400 font-bold">[IMAGE PAYLOAD VIEWER]</span>
            <button
              onClick={() => setViewingImage(null)}
              className="px-2 py-0.5 bg-zinc-900 border border-zinc-700 hover:text-rose-400 text-zinc-300 transition cursor-pointer text-xs"
            >
              CLOSE [ESC]
            </button>
          </div>
          <img
            src={viewingImage}
            alt="Full size view"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80vh] max-w-[95vw] sm:max-w-md object-contain border border-zinc-700 shadow-2xl cursor-default"
          />
        </div>
      )}

    </div>
  );
}

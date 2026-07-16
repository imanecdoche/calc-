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
  Keyboard as KeyboardIcon
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
  const [isFooterActive, setIsFooterActive] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  const [hackingActive, setHackingActive] = useState(false);
  const [blackoutActive, setBlackoutActive] = useState(false);
  const [hackingLogs, setHackingLogs] = useState<string[]>([]);
  const [hackingProgress, setHackingProgress] = useState(0);

  const triggerHackingSequence = useCallback(() => {
    if (hackingActive || blackoutActive) return;
    setHackingActive(true);
    setHackingLogs([
      "[SYS] INTENT DETECTED: FORCED ENCLAVE PURGE PROTOCOL DOSP V9.4...",
      "[SYS] INTENT SOURCE: SYSTEM SHAKE OR SECURITY DISMISSAL."
    ]);
    setHackingProgress(0);

    const startTime = Date.now();
    const duration = 6000; // 6 seconds
    const intervalTime = 120; // 120ms each line tick

    const hexChars = "0123456789ABCDEF";
    const getRandomHexLine = () => {
      let hexPart = "";
      for (let i = 0; i < 8; i++) {
        hexPart += hexChars[Math.floor(Math.random() * 16)] + hexChars[Math.floor(Math.random() * 16)] + " ";
      }
      return `0x${Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0')}: ${hexPart.trim()}  .....[WIPE_PENDING]`;
    };

    const logsList = [
      `[SYS] LOCATING ACTIVE MEMORY CHANNELS FOR USER: @${viewModel.myUsername || 'anonymous'}...`,
      "[MEM] SHREDDING ACTIVE CHAT PACKETS [AES-256-GCM KEY]",
      "[NET] CLOSING MULTICAST ENCRYPTED WEB-SOCKETS",
      "[SYS] DESTROYING LOCAL STORAGE AUTH CACHE",
      "[DISK] FILLING STORAGE BLOCKS WITH SECURE ZERO-BYTES",
      "[SYS] INJECTING DECOY ARTIFACTS...",
      "[AUTH] ANNIHILATING IDENTITIES",
      "[STACK] MEMORY COLD DUMP INITIATED",
      "[SYS] REWRITING ENCLAVE SECTORS",
      "[NET] PEER CONTEXT FLUSHED SUCCESSFULLY",
      "[SUCCESS] MEMORY WIPED TOTAL.",
      "[SYS] DISGUISING INTERFACE TO DECIME CALCULATOR..."
    ];

    let logIndex = 0;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, Math.floor((elapsed / duration) * 100));
      setHackingProgress(progress);

      setHackingLogs((prev) => {
        const nextLogs = [...prev];
        if (Math.random() < 0.4 && logIndex < logsList.length) {
          nextLogs.push(logsList[logIndex]);
          logIndex++;
        } else {
          nextLogs.push(getRandomHexLine());
        }
        if (nextLogs.length > 35) {
          nextLogs.shift();
        }
        return nextLogs;
      });

      if (elapsed >= duration) {
        clearInterval(timer);
        setHackingActive(false);
        setBlackoutActive(true);

        setTimeout(() => {
          setBlackoutActive(false);
          viewModel.disconnect();
          onExitToCalculator();
        }, 2000);
      }
    }, intervalTime);
  }, [hackingActive, blackoutActive, viewModel.myUsername, viewModel.disconnect, onExitToCalculator]);

  // Hook up shake, visibility change, and Alt+S keypress
  useEffect(() => {
    let lastX: number | null = null;
    let lastY: number | null = null;
    let lastZ: number | null = null;
    const threshold = 18; // shake sensitivity

    const handleMotion = (event: DeviceMotionEvent) => {
      const accel = event.accelerationIncludingGravity;
      if (!accel) return;
      const { x, y, z } = accel;
      if (x === null || y === null || z === null) return;

      if (lastX !== null && lastY !== null && lastZ !== null) {
        const deltaX = Math.abs(x - lastX);
        const deltaY = Math.abs(y - lastY);
        const deltaZ = Math.abs(z - lastZ);

        if ((deltaX > threshold && deltaY > threshold) || 
            (deltaX > threshold && deltaZ > threshold) || 
            (deltaY > threshold && deltaZ > threshold)) {
          triggerHackingSequence();
        }
      }

      lastX = x;
      lastY = y;
      lastZ = z;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && (event.key === 's' || event.key === 'S' || event.key === 'h' || event.key === 'H')) {
        triggerHackingSequence();
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        triggerHackingSequence();
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [triggerHackingSequence]);

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

  const formatTerminalTime = (ts: number) => {
    const d = new Date(ts);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    const s = d.getSeconds().toString().padStart(2, '0');
    return `${h}:${m}.${s}`;
  };

  const getTerminalStatus = (status?: string) => {
    if (status === 'sending') return '[attempting]';
    if (status === 'delivered') return '[approved]';
    if (status === 'failed') return '[access denied]';
    return '[deployed]';
  };

  if (blackoutActive) {
    return (
      <div className="absolute inset-0 bg-[#000000] z-50 flex items-center justify-center font-mono select-none animate-fade-in" />
    );
  }

  if (hackingActive) {
    return (
      <div className="absolute inset-0 bg-[#020202] text-[#22c55e] font-mono p-6 flex flex-col justify-between overflow-hidden z-50 animate-fade-in select-none">
        <div className="flex-1 overflow-y-auto terminal-scrollbar space-y-2 select-none text-left">
          <div className="text-red-500 font-bold mb-4 animate-pulse">
            *** SECURITY ALERT: FORCED ENCLAVE PURGE INSTIGATED ***
          </div>
          
          {hackingLogs.map((log, idx) => (
            <div key={idx} className="text-xs leading-relaxed break-all">
              &gt; {log}
            </div>
          ))}
          
          <div className="pt-4 text-xs font-bold flex items-center space-x-2">
            <span>ERASING MEMORY SEGMENTS:</span>
            <span className="text-green-400 font-mono tracking-widest">[</span>
            <span className="text-yellow-500 font-bold">
              {"█".repeat(Math.floor(hackingProgress / 5)).padEnd(20, "░")}
            </span>
            <span className="text-green-400 font-mono tracking-widest">]</span>
            <span className="text-green-400 font-bold">{hackingProgress}%</span>
          </div>
        </div>
        <div className="text-[10px] text-green-800 border-t border-green-950 pt-3 select-none text-center">
          SYSTEM SHREDDER DOSP v9.4 // SELF-DESTRUCT PRESET ENABLED
        </div>
      </div>
    );
  }

  if (!activeTargetUser) return null;

  return (
    <div 
      className="absolute inset-0 bg-[#050505] flex flex-col justify-between overflow-hidden z-20 font-mono text-[#22c55e]"
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
          background: rgba(34, 197, 94, 0.2);
          border-radius: 2px;
        }
      ` }} />
      
      {/* 1. TERMINAL HEADER */}
      <div 
        onDoubleClick={triggerHackingSequence}
        title="Double-click to simulate phone shake"
        className="flex flex-wrap items-center justify-between px-4 py-3 bg-[#020202] border-b border-green-950 text-xs font-mono text-[#22c55e] flex-none select-none"
      >
        <div className="flex items-center space-x-1">
          <span>&gt; entity: {activeTargetUser.displayName} [status: {formattedStatus}]</span>
        </div>
        <div className="flex items-center space-x-3 text-xs">
          <button 
            onClick={() => viewModel.disconnect()}
            className="hover:text-green-300 font-bold hover:underline cursor-pointer transition py-1"
          >
            [back]
          </button>
          <button 
            onClick={triggerHackingSequence}
            className="hover:text-red-400 font-bold hover:underline cursor-pointer transition text-red-500 py-1"
          >
            [lock]
          </button>
        </div>
      </div>

      {/* DASHES SEPARATOR BAR */}
      <div className="text-green-950 px-4 pt-1 text-xs select-none tracking-widest flex-none leading-none">
        ----------------------------------------------------------------------------------------------------
      </div>

      {/* 2. CHAT MESSAGES PANEL */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 terminal-scrollbar relative"
        style={{ overflowX: 'hidden' }}
      >
        
        {/* Pagination Trigger / Load More Header */}
        {hasMoreHistory && (
          <div className="flex justify-start py-1 text-[10px] text-green-700/60 select-none">
            [scroll up to load older transaction packets]
          </div>
        )}

        {messages.length === 0 && (
          <div className="py-6 text-green-700/80 text-xs text-left">
            &gt; channel established. awaiting terminal instructions...
          </div>
        )}

        {/* List render with simple terminal lines */}
        <div className="space-y-2">
          {messages.map((msg, index) => {
            const isMe = msg.senderId === viewModel.myUsername;
            const timeStr = formatTerminalTime(msg.timestamp);
            const displayPrefix = isMe ? '+' : '-';
            const statusStr = isMe ? `${getTerminalStatus(msg.status)} ` : '';
            const isVoice = !!msg.audioUrl;

            return (
              <div 
                key={msg.id || `msg-${index}`} 
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleLongPress(e, msg);
                }}
                className="text-xs font-mono text-[#22c55e] hover:bg-green-950/10 px-1 py-0.5 rounded transition select-text text-left leading-relaxed break-all flex flex-wrap items-center gap-x-2"
              >
                <span className="text-green-400 font-bold">{displayPrefix}</span>
                
                {/* Reply display if present */}
                {msg.replyToId && !msg.deletedForEveryone && (
                  <span className="text-green-700 text-[10px] select-none">
                    [reply: @{msg.replyToSender}]
                  </span>
                )}

                {msg.deletedForEveryone ? (
                  <span className="text-red-900 italic">[message packet purged]</span>
                ) : isVoice ? (
                  <span className="text-green-400/80">
                    [voice note: {msg.audioDuration || 0}s]
                    <button
                      onClick={() => {
                        const player = AudioPlayerManager.getInstance();
                        if (msg.id === playingVoiceId) {
                          player.pause();
                        } else {
                          player.play(msg.id, msg.audioUrl || '');
                        }
                      }}
                      className="ml-2 text-green-500 font-bold hover:underline cursor-pointer"
                    >
                      {msg.id === playingVoiceId ? '[pause]' : '[play]'}
                    </button>
                  </span>
                ) : (
                  <span>{msg.text}</span>
                )}
                
                <span className="text-green-900 select-none">-&gt;</span>
                {isMe && !msg.deletedForEveryone && <span className="text-green-400 font-medium">{statusStr}</span>}
                <span className="text-green-600/80">{timeStr}</span>
              </div>
            );
          })}
        </div>

        <div ref={messagesEndRef} />

        {/* Blinking CLI line at bottom of the messages list when not active */}
        {!isFooterActive && (
          <div className="mt-4 border-t border-green-950/30 pt-3">
            <button
              onClick={() => {
                setIsFooterActive(true);
                setTimeout(() => {
                  inputRef.current?.focus();
                  scrollToBottom();
                }, 120);
              }}
              className="flex items-center text-xs font-mono text-[#22c55e] hover:text-green-400 focus:outline-none cursor-pointer bg-transparent border-none text-left p-1"
            >
              <span>&gt; type a command</span>
              <span className="cursor-blink font-bold ml-1 text-green-400">_</span>
            </button>
          </div>
        )}
      </div>

      {/* FLOATING SCROLL CONTROLLER BADGE */}
      <ScrollController
        containerRef={containerRef}
        messagesCount={messages.length}
        onScrollToBottom={scrollToBottom}
      />

      {/* 3. INPUT PANEL & ACTIVE REPLY PREVIEW CONTROLS */}
      {isFooterActive && (
        <div className="bg-[#020202] border-t border-green-950 flex flex-col flex-none pb-[env(safe-area-inset-bottom,8px)] pt-1 select-none">
          
          {/* REPLY PREVIEW BAR */}
          <AnimatePresence>
            {replyingTo && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-[#050505] border-b border-green-950 px-4 py-1.5 flex items-center justify-between text-[11px]"
              >
                <div className="flex items-center space-x-2 text-left text-green-600 font-mono">
                  <span>[&gt; reply: @{replyingTo.senderId}]</span>
                  <span className="truncate max-w-[200px] text-green-700 italic">
                    "{replyingTo.text}"
                  </span>
                </div>
                <button
                  onClick={handleCancelReply}
                  className="hover:text-red-400 transition font-bold text-red-500"
                  aria-label="Cancel reply"
                >
                  [cancel]
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {isRecording ? (
            /* Active Recording Stage Overlay */
            <div className="h-12 px-4 flex items-center justify-between bg-[#020202] text-xs font-mono text-red-500 relative overflow-hidden border-t border-green-950">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-red-600 rounded-full cursor-blink" />
                <span>REC: {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</span>
              </div>

              {/* Slide to Cancel slider and text */}
              <div 
                className="flex items-center space-x-1 text-[11px] select-none transition-all duration-100 text-green-700"
                style={{
                  transform: `translateX(${Math.max(-100, Math.min(0, draggedX))}px)`,
                  opacity: draggedX < -80 ? 0.6 : 1,
                }}
              >
                <span className={draggedX < -80 ? 'text-red-400 font-semibold' : ''}>
                  {draggedX < -80 ? '[release to clear]' : '← [slide left to abort]'}
                </span>
              </div>
            </div>
          ) : recordedBlob ? (
            /* Preview Stage Overlay */
            <div className="h-12 px-4 flex items-center justify-between bg-[#020202] text-xs font-mono border-t border-green-950 text-[#22c55e]">
              <div className="flex items-center space-x-3 flex-1">
                <button
                  type="button"
                  onClick={handleTogglePreviewPlay}
                  className="font-bold hover:underline hover:text-green-300"
                  aria-label={isPreviewPlaying ? 'Pause preview' : 'Play preview'}
                >
                  [{isPreviewPlaying ? 'pause' : 'play-preview'}]
                </button>

                <span className="text-[10px] text-green-600">
                  {Math.floor(previewProgress / 60)}:{(Math.floor(previewProgress) % 60).toString().padStart(2, '0')}
                  {' / '}
                  {Math.floor(recordedDuration / 60)}:{(recordedDuration % 60).toString().padStart(2, '0')}
                </span>
              </div>

              <div className="flex items-center space-x-3 ml-3 font-bold">
                <button
                  type="button"
                  onClick={handleDiscardVoiceNote}
                  className="text-red-500 hover:text-red-400 hover:underline"
                  aria-label="Discard recording"
                >
                  [discard]
                </button>

                <button
                  type="button"
                  disabled={isUploading}
                  onClick={handleSendVoiceNote}
                  className="text-green-400 hover:text-green-300 hover:underline disabled:text-green-900"
                  aria-label="Send voice note"
                >
                  {isUploading ? '[uploading...]' : '[transmit]'}
                </button>
              </div>
            </div>
          ) : (
            /* Default Text Input and Microphone form */
            <form 
              onSubmit={handleSend}
              className="h-12 px-4 flex items-center space-x-2 text-xs font-mono"
            >
              <span className="text-green-400 font-bold select-none">&gt;</span>
              <input
                ref={inputRef}
                type="text"
                inputMode={settings.keyboardType === 'custom' ? 'none' : 'text'}
                autoComplete="off"
                placeholder="type message..."
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
                className="flex-1 bg-transparent border-none text-[#22c55e] placeholder-green-900 text-xs focus:outline-none focus:ring-0 font-mono py-1"
              />

              {text.trim() ? (
                /* Standard Send button */
                <button
                  type="submit"
                  title="Send message packet"
                  aria-label="Send message packet"
                  className="hover:text-green-300 font-bold hover:underline cursor-pointer py-1 px-2"
                >
                  [send]
                </button>
              ) : (
                /* Microphone button for voice notes (holding triggers voice recorder) */
                <button
                  type="button"
                  onMouseDown={handleMicPressStart}
                  onTouchStart={handleMicPressStart}
                  title="Hold to record voice note"
                  aria-label="Hold to record voice note"
                  className="hover:text-green-300 font-bold hover:underline cursor-pointer py-1 px-2 select-none touch-none text-green-700"
                >
                  [rec]
                </button>
              )}

              {settings.keyboardType === 'custom' && (
                <button
                  type="button"
                  onClick={() => {
                    setIsKeyboardOpen(!isKeyboardOpen);
                  }}
                  className="hover:text-green-300 font-bold hover:underline cursor-pointer py-1 px-2"
                >
                  [{isKeyboardOpen ? 'hide-kb' : 'show-kb'}]
                </button>
              )}

              <button
                type="button"
                onClick={triggerHackingSequence}
                className="hover:text-red-400 font-bold hover:underline cursor-pointer py-1 px-2 text-red-500"
              >
                [exit]
              </button>
            </form>
          )}

          {/* Custom Native-App-style Virtual Keyboard */}
          {settings.keyboardType === 'custom' && isKeyboardOpen && !isRecording && !recordedBlob && (
            <div className="w-full bg-[#020202] border-t border-green-950">
              <VirtualKeyboard
                onKeyPress={insertText}
                onBackspace={handleBackspace}
                onSpace={handleSpace}
                onEnter={() => handleSend()}
                onClose={() => setIsKeyboardOpen(false)}
                enterLabel="Kirim"
                height={settings.keyboardHeight}
              />
            </div>
          )}
        </div>
      )}

      {/* 4. REUSABLE SYSTEM SNACKBAR */}
      <AnimatePresence>
        {snackbar && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className={`px-4 py-2 rounded border text-xs font-mono shadow-2xl flex items-center space-x-2 ${
              snackbar.type === 'error'
                ? 'bg-red-950 border-red-900 text-red-400'
                : 'bg-green-950 border-green-900 text-green-400'
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

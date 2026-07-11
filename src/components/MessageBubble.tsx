import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Check, 
  CheckCheck, 
  Clock, 
  AlertCircle, 
  CornerUpRight,
  EyeOff
} from 'lucide-react';
import { Message } from '../models/Message';
import { VoiceNoteBubble } from './VoiceNoteBubble';

interface MessageBubbleProps {
  message: Message;
  myUsername: string;
  onLongPress: (e: React.MouseEvent | React.TouchEvent, message: Message) => void;
  onRetry: (message: Message) => void;
}

export function MessageBubble({
  message,
  myUsername,
  onLongPress,
  onRetry
}: MessageBubbleProps) {
  const isMe = message.senderId === myUsername;
  const isDeleted = message.deletedForEveryone;
  const isFailed = message.status === 'failed';
  
  // Ref to track press timer for mobile touch long-presses
  const pressTimer = useRef<any>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    pressTimer.current = setTimeout(() => {
      onLongPress(e, message);
    }, 600); // 600ms threshold for long press
  };

  const handleTouchEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only trigger for left-click or standard desktop triggers
    if (e.button !== 0) return;
    pressTimer.current = setTimeout(() => {
      onLongPress(e, message);
    }, 600);
  };

  const handleMouseUp = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
    }
  };

  // Convert timestamp to hh:mm
  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  // Render status checkmarks next to our message timestamps
  const renderMessageStatus = (status?: 'sending' | 'sent' | 'delivered' | 'failed') => {
    if (status === 'sending') {
      return <Clock size={10} className="text-indigo-200/50 animate-pulse ml-1" />;
    }
    if (status === 'delivered') {
      return <CheckCheck size={11} className="text-emerald-400 font-bold ml-1" />;
    }
    if (status === 'failed') {
      return <AlertCircle size={11} className="text-rose-400 ml-1" />;
    }
    // Default 'sent' status
    return <Check size={11} className="text-indigo-200/70 ml-1" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} mb-3`}
    >
      <div
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => {
          e.preventDefault();
          onLongPress(e, message);
        }}
        className={`relative max-w-[80%] flex flex-col space-y-1 select-none cursor-pointer transition-transform duration-100 active:scale-98 ${
          isMe 
            ? 'items-end' 
            : 'items-start'
        }`}
      >
        
        {/* Reply Quote box inside the bubble */}
        {message.replyToId && !isDeleted && (
          <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-t-xl text-[10px] bg-[#090a0f]/40 border-l-2 border-indigo-500 max-w-full ${
            isMe ? 'bg-indigo-900/40 text-indigo-200' : 'bg-neutral-950/50 text-neutral-400'
          }`}>
            <CornerUpRight size={10} className="text-indigo-400 flex-shrink-0" />
            <div className="truncate max-w-[150px]">
              <span className="font-semibold text-indigo-300">@{message.replyToSender}</span>
              <span className="mx-1 text-neutral-500">•</span>
              <span className="italic">{message.replyToText}</span>
            </div>
          </div>
        )}

        {/* Message bubble core styling */}
        <div 
          className={`px-3.5 py-2.5 rounded-2xl flex flex-col space-y-1.5 max-w-full ${
            isDeleted 
              ? 'bg-[#0a0c10]/40 border border-neutral-900/60 text-neutral-500 italic'
              : isFailed
                ? 'bg-rose-950/20 border border-rose-900/40 text-rose-300'
                : isMe
                  ? `bg-indigo-600 text-white shadow-lg shadow-indigo-950/15 ${message.replyToId ? 'rounded-tr-none' : 'rounded-br-none'}`
                  : `bg-neutral-900 border border-neutral-800/80 text-neutral-200 shadow-md ${message.replyToId ? 'rounded-tl-none' : 'rounded-bl-none'}`
          }`}
        >
          {isDeleted ? (
            <div className="flex items-center space-x-1.5 py-0.5">
              <EyeOff size={11} className="text-neutral-600" />
              <span className="text-[11px] font-sans">This message was deleted.</span>
            </div>
          ) : message.audioUrl ? (
            <VoiceNoteBubble message={message} isMe={isMe} />
          ) : (
            <p className="text-xs font-sans break-all select-text leading-relaxed whitespace-pre-wrap text-left">
              {message.text}
            </p>
          )}

          {/* Time & Status checkrow aligned nicely in bottom right corner */}
          <div className="flex items-center justify-end space-x-1 self-end mt-0.5">
            <span className={`text-[8px] font-mono leading-none ${
              isDeleted 
                ? 'text-neutral-600'
                : isMe 
                  ? 'text-indigo-200/80' 
                  : 'text-neutral-500'
            }`}>
              {formatTime(message.timestamp)}
            </span>
            {isMe && !isDeleted && renderMessageStatus(message.status)}
          </div>
        </div>

        {/* Failed Banner & Retry option */}
        {isFailed && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRetry(message);
            }}
            className="flex items-center space-x-1 mt-1 text-[9px] font-mono text-rose-400 hover:text-rose-300 font-bold uppercase tracking-wider"
          >
            <span>Failed to send. Click to retry</span>
            <CornerUpRight size={10} />
          </button>
        )}

      </div>
    </motion.div>
  );
}

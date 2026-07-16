import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Reply, 
  Copy, 
  Trash, 
  Trash2, 
  Info, 
  X,
  Clock,
  User,
  CheckCircle2,
  Pencil
} from 'lucide-react';
import { Message } from '../models/Message';

interface MessageActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message | null;
  myUsername: string;
  onReply: (message: Message) => void;
  onCopy: (message: Message) => void;
  onDeleteForMe: (message: Message) => void;
  onDeleteForEveryone: (message: Message) => void;
  onEdit?: (message: Message) => void;
}

export function MessageActionSheet({
  isOpen,
  onClose,
  message,
  myUsername,
  onReply,
  onCopy,
  onDeleteForMe,
  onDeleteForEveryone,
  onEdit
}: MessageActionSheetProps) {
  
  // Close sheet on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!message) return null;

  const isMe = message.senderId === myUsername;
  const isDeleted = message.deletedForEveryone;

  // Determine if "Edit" is available (max 30 minutes after sent, and must be sent by current user)
  const isEditAvailable = () => {
    if (!isMe || isDeleted || message.audioUrl) return false;
    const thirtyMinutesInMs = 30 * 60 * 1000;
    return (Date.now() - message.timestamp) < thirtyMinutesInMs;
  };

  // Determine if "Delete for Everyone" is available (max 5 minutes after sent, and must be sent by current user)
  const isDeleteForEveryoneAvailable = () => {
    if (!isMe || isDeleted) return false;
    const fiveMinutesInMs = 5 * 60 * 1000;
    return (Date.now() - message.timestamp) < fiveMinutesInMs;
  };

  const formatFullDate = (ts: number): string => {
    return new Date(ts).toLocaleString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black"
          />

          {/* Bottom Sheet Container */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            className="relative w-full max-w-md bg-neutral-950 border-t border-neutral-900 rounded-t-3xl shadow-2xl z-10 px-6 pb-8 pt-4 flex flex-col focus:outline-none"
          >
            {/* Drag Handle & Close */}
            <div className="flex flex-col items-center justify-center pb-4 relative">
              <div className="w-12 h-1.5 bg-neutral-800 rounded-full mb-1 cursor-pointer" onClick={onClose} />
              <button 
                onClick={onClose}
                className="absolute right-0 top-0 p-1 rounded-full bg-neutral-900 text-neutral-400 hover:text-neutral-200 transition"
                aria-label="Close sheet"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Preview of selected Message */}
            <div className="bg-[#090a0f] border border-neutral-900 rounded-2xl p-4.5 mb-6 text-left">
              <span className="block text-[9px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
                Selected Message
              </span>
              <p className="text-xs font-sans text-neutral-300 line-clamp-2 leading-relaxed break-words">
                {isDeleted ? 'This message was deleted.' : message.text}
              </p>
            </div>

            {/* Menu Options (Material 3 style list with generous click targets 44px+) */}
            <div className="space-y-1.5">
              
              {/* REPLY */}
              {!isDeleted && (
                <button
                  onClick={() => {
                    onReply(message);
                    onClose();
                  }}
                  className="w-full h-12 px-4 rounded-xl hover:bg-neutral-900 text-neutral-300 hover:text-white flex items-center space-x-3.5 transition text-left cursor-pointer"
                >
                  <Reply size={16} className="text-indigo-400" />
                  <span className="text-xs font-medium tracking-wide">Reply Message</span>
                </button>
              )}

              {/* COPY */}
              {!isDeleted && (
                <button
                  onClick={() => {
                    onCopy(message);
                    onClose();
                  }}
                  className="w-full h-12 px-4 rounded-xl hover:bg-neutral-900 text-neutral-300 hover:text-white flex items-center space-x-3.5 transition text-left cursor-pointer"
                >
                  <Copy size={16} className="text-indigo-400" />
                  <span className="text-xs font-medium tracking-wide">Copy Text</span>
                </button>
              )}

              {/* EDIT MESSAGE (max 30 mins) */}
              {isEditAvailable() && onEdit && (
                <button
                  onClick={() => {
                    onEdit(message);
                    onClose();
                  }}
                  className="w-full h-12 px-4 rounded-xl hover:bg-neutral-900 text-neutral-300 hover:text-white flex items-center space-x-3.5 transition text-left cursor-pointer"
                >
                  <Pencil size={16} className="text-indigo-400" />
                  <span className="text-xs font-medium tracking-wide">Edit Message</span>
                </button>
              )}

              {/* DELETE FOR ME */}
              <button
                onClick={() => {
                  onDeleteForMe(message);
                  onClose();
                }}
                className="w-full h-12 px-4 rounded-xl hover:bg-rose-950/20 text-rose-400 hover:text-rose-300 flex items-center space-x-3.5 transition text-left cursor-pointer"
              >
                <Trash size={16} />
                <span className="text-xs font-medium tracking-wide">Delete for Me</span>
              </button>

              {/* DELETE FOR EVERYONE (max 5 mins) */}
              {isDeleteForEveryoneAvailable() && (
                <button
                  onClick={() => {
                    onDeleteForEveryone(message);
                    onClose();
                  }}
                  className="w-full h-12 px-4 rounded-xl hover:bg-rose-900/20 text-rose-500 hover:text-rose-400 flex items-center space-x-3.5 transition text-left cursor-pointer border border-rose-900/30"
                >
                  <Trash2 size={16} />
                  <span className="text-xs font-medium tracking-wide">Delete for Everyone</span>
                </button>
              )}

              {/* INFO EXPAND */}
              <div className="border-t border-neutral-900/60 pt-4 mt-2">
                <div className="flex items-center space-x-1.5 text-[9px] font-mono uppercase text-neutral-500 font-bold mb-3 px-1">
                  <Info size={11} />
                  <span>Message Metadata</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 px-2 py-1.5 bg-neutral-900/20 rounded-xl border border-neutral-900">
                  <div className="space-y-0.5">
                    <span className="block text-[8px] font-mono text-neutral-500 uppercase">Sender</span>
                    <div className="flex items-center space-x-1 text-xs text-neutral-300">
                      <User size={10} className="text-indigo-400" />
                      <span>@{message.senderId}</span>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="block text-[8px] font-mono text-neutral-500 uppercase">Status</span>
                    <div className="flex items-center space-x-1 text-xs text-neutral-300 capitalize">
                      <CheckCircle2 size={10} className="text-emerald-400" />
                      <span>{message.status || 'sent'}</span>
                    </div>
                  </div>
                  <div className="space-y-0.5 col-span-2">
                    <span className="block text-[8px] font-mono text-neutral-500 uppercase">Timestamp</span>
                    <div className="flex items-center space-x-1 text-xs text-neutral-300">
                      <Clock size={10} className="text-indigo-400" />
                      <span>{formatFullDate(message.timestamp)}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>

        </div>
      )}
    </AnimatePresence>
  );
}

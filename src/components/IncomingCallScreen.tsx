import React from 'react';
import { Phone, PhoneOff, User } from 'lucide-react';
import { motion } from 'motion/react';

interface IncomingCallScreenProps {
  callerName: string;
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallScreen({
  callerName,
  onAccept,
  onDecline
}: IncomingCallScreenProps) {
  return (
    <div className="absolute inset-0 bg-[#050608]/98 backdrop-blur-xl z-50 flex flex-col justify-between py-16 px-6 select-none">
      
      {/* 1. Header Area */}
      <div className="flex flex-col items-center space-y-2 mt-8">
        <span className="text-[10px] font-mono tracking-[0.25em] text-indigo-400 uppercase font-semibold">
          Incoming Call...
        </span>
        <h2 className="text-xl font-bold text-neutral-100 tracking-wide">
          @{callerName}
        </h2>
      </div>

      {/* 2. Central Avatar with Pulsing Waves */}
      <div className="flex items-center justify-center my-auto">
        <div className="relative flex items-center justify-center">
          {/* Pulsing rings */}
          <motion.div
            animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeOut" }}
            className="absolute w-24 h-24 rounded-full border border-emerald-500/30"
          />
          <motion.div
            animate={{ scale: [1, 1.4], opacity: [0.3, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, delay: 0.8, ease: "easeOut" }}
            className="absolute w-24 h-24 rounded-full border border-indigo-500/20"
          />

          {/* Actual Avatar Body */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 flex items-center justify-center text-emerald-400 shadow-2xl relative z-10">
            <User size={36} className="animate-pulse" />
          </div>
        </div>
      </div>

      {/* 3. Action Control Row */}
      <div className="flex flex-col items-center space-y-6 mb-4">
        <div className="flex items-center space-x-12">
          {/* Decline Button */}
          <div className="flex flex-col items-center space-y-2">
            <button
              onClick={onDecline}
              title="Decline Call"
              aria-label="Decline Call"
              className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-90 text-white flex items-center justify-center shadow-lg hover:shadow-rose-900/30 transition-all cursor-pointer border border-rose-500/25"
            >
              <PhoneOff size={24} className="rotate-[135deg]" />
            </button>
            <span className="text-[10px] font-mono tracking-widest text-neutral-500 uppercase">
              Decline
            </span>
          </div>

          {/* Accept Button */}
          <div className="flex flex-col items-center space-y-2">
            <button
              onClick={onAccept}
              title="Accept Call"
              aria-label="Accept Call"
              className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-90 text-white flex items-center justify-center shadow-lg hover:shadow-emerald-900/30 transition-all cursor-pointer border border-emerald-500/25"
            >
              <Phone size={24} />
            </button>
            <span className="text-[10px] font-mono tracking-widest text-neutral-500 uppercase">
              Accept
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}

import React from 'react';
import { PhoneOff, User } from 'lucide-react';
import { motion } from 'motion/react';

interface OutgoingCallScreenProps {
  targetName: string;
  onEndCall: () => void;
}

export default function OutgoingCallScreen({
  targetName,
  onEndCall
}: OutgoingCallScreenProps) {
  return (
    <div className="absolute inset-0 bg-[#050608]/98 backdrop-blur-xl z-50 flex flex-col justify-between py-16 px-6 select-none">
      
      {/* 1. Header Area */}
      <div className="flex flex-col items-center space-y-2 mt-8">
        <span className="text-[10px] font-mono tracking-[0.25em] text-indigo-400 uppercase font-semibold animate-pulse">
          Calling...
        </span>
        <h2 className="text-xl font-bold text-neutral-100 tracking-wide">
          @{targetName}
        </h2>
      </div>

      {/* 2. Central Avatar with Pulse Loops */}
      <div className="flex items-center justify-center my-auto">
        <div className="relative flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.6], opacity: [0.3, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeOut" }}
            className="absolute w-24 h-24 rounded-full border border-indigo-500/20"
          />
          <motion.div
            animate={{ scale: [1, 1.3], opacity: [0.25, 0] }}
            transition={{ repeat: Infinity, duration: 3, delay: 1, ease: "easeOut" }}
            className="absolute w-24 h-24 rounded-full border border-neutral-700/30"
          />

          <div className="w-24 h-24 rounded-full bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-850 flex items-center justify-center text-indigo-400 shadow-2xl relative z-10">
            <User size={36} />
          </div>
        </div>
      </div>

      {/* 3. Duration & Action controls */}
      <div className="flex flex-col items-center space-y-6 mb-4">
        {/* Calling Timer placeholder starts at 00:00 as requested */}
        <span className="text-sm font-mono text-neutral-500 font-semibold tracking-wider">
          00:00
        </span>

        <div className="flex flex-col items-center space-y-2">
          <button
            onClick={onEndCall}
            title="End Call"
            aria-label="End Call"
            className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-90 text-white flex items-center justify-center shadow-lg hover:shadow-rose-900/30 transition-all cursor-pointer border border-rose-500/25 animate-bounce"
          >
            <PhoneOff size={24} className="rotate-[135deg]" />
          </button>
          <span className="text-[10px] font-mono tracking-widest text-neutral-500 uppercase">
            End Call
          </span>
        </div>
      </div>

    </div>
  );
}

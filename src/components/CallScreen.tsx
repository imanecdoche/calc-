import React from 'react';
import { PhoneOff, Mic, MicOff, Volume2, VolumeX, User } from 'lucide-react';
import { motion } from 'motion/react';
import { CallStatus } from '../models/CallState';

interface CallScreenProps {
  targetName: string;
  status: CallStatus;
  duration: string;
  isMuted: boolean;
  isSpeakerOn: boolean;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onEndCall: () => void;
}

export default function CallScreen({
  targetName,
  status,
  duration,
  isMuted,
  isSpeakerOn,
  onToggleMute,
  onToggleSpeaker,
  onEndCall
}: CallScreenProps) {
  const isConnected = status === 'connected';

  return (
    <div className="absolute inset-0 bg-[#050608] z-50 flex flex-col justify-between py-16 px-6 select-none">
      
      {/* 1. Header Details */}
      <div className="flex flex-col items-center space-y-2 mt-8">
        <span className={`text-[10px] font-mono tracking-[0.25em] uppercase font-bold ${
          isConnected ? 'text-emerald-400' : 'text-amber-400 animate-pulse'
        }`}>
          {isConnected ? 'Connected' : 'Connecting...'}
        </span>
        <h2 className="text-xl font-bold text-neutral-100 tracking-wide">
          @{targetName}
        </h2>
      </div>

      {/* 2. Visual Center Audio Ripple representation */}
      <div className="flex items-center justify-center my-auto">
        <div className="relative flex items-center justify-center">
          {isConnected ? (
            <>
              {/* Double active soft audio indicator waves */}
              <motion.div
                animate={{ scale: [1, 1.45, 1], opacity: [0.2, 0.4, 0.2] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="absolute w-28 h-28 rounded-full bg-indigo-500/5 border border-indigo-500/10"
              />
              <motion.div
                animate={{ scale: [1.1, 1.25, 1.1], opacity: [0.15, 0.3, 0.15] }}
                transition={{ repeat: Infinity, duration: 2, delay: 0.5, ease: "easeInOut" }}
                className="absolute w-28 h-28 rounded-full bg-neutral-900/40 border border-neutral-800"
              />
            </>
          ) : (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              className="absolute w-28 h-28 rounded-full border border-dashed border-amber-500/30"
            />
          )}

          <div className="w-24 h-24 rounded-full bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 flex items-center justify-center text-neutral-200 shadow-2xl relative z-10">
            {isMuted ? (
              <MicOff size={28} className="text-neutral-500 animate-pulse" />
            ) : (
              <User size={32} className="text-indigo-400" />
            )}
          </div>
        </div>
      </div>

      {/* 3. Operational Panel controls */}
      <div className="flex flex-col items-center space-y-6 mb-4">
        {/* Ticking call duration timer */}
        <span className="text-base font-mono font-bold text-neutral-300 tracking-wider">
          {duration}
        </span>

        {/* Action Controls Row */}
        <div className="flex items-center space-x-8">
          {/* Mute Button */}
          <div className="flex flex-col items-center space-y-1.5">
            <button
              onClick={onToggleMute}
              title={isMuted ? "Unmute Mic" : "Mute Mic"}
              aria-label={isMuted ? "Unmute Microphone" : "Mute Microphone"}
              className={`w-12 h-12 rounded-full border transition-all flex items-center justify-center cursor-pointer ${
                isMuted 
                  ? 'bg-rose-950/50 border-rose-900/65 text-rose-400 hover:bg-rose-900/40' 
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            <span className="text-[9px] font-mono tracking-widest text-neutral-500 uppercase">
              {isMuted ? 'Muted' : 'Mute'}
            </span>
          </div>

          {/* End Call Button */}
          <div className="flex flex-col items-center space-y-1.5">
            <button
              onClick={onEndCall}
              title="Hang Up"
              aria-label="Hang Up Call"
              className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-90 text-white flex items-center justify-center shadow-lg hover:shadow-rose-900/30 transition-all cursor-pointer border border-rose-500/25"
            >
              <PhoneOff size={22} className="rotate-[135deg]" />
            </button>
            <span className="text-[9px] font-mono tracking-widest text-neutral-500 uppercase">
              Hang Up
            </span>
          </div>

          {/* Speaker Button */}
          <div className="flex flex-col items-center space-y-1.5">
            <button
              onClick={onToggleSpeaker}
              title={isSpeakerOn ? "Speaker Off" : "Speaker On"}
              aria-label={isSpeakerOn ? "Turn Speakerphone Off" : "Turn Speakerphone On"}
              className={`w-12 h-12 rounded-full border transition-all flex items-center justify-center cursor-pointer ${
                isSpeakerOn 
                  ? 'bg-indigo-950/50 border-indigo-900/65 text-indigo-400 hover:bg-indigo-900/40' 
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              {isSpeakerOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <span className="text-[9px] font-mono tracking-widest text-neutral-500 uppercase">
              Speaker
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}

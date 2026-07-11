import React, { useState, useEffect } from 'react';
import { Play, Pause, FastForward } from 'lucide-react';
import { Message } from '../models/Message';
import { AudioPlayerManager } from '../services/AudioPlayerManager';
import { WaveformView } from './WaveformView';

interface VoiceNoteBubbleProps {
  message: Message;
  isMe: boolean;
}

export const VoiceNoteBubble: React.FC<VoiceNoteBubbleProps> = ({ message, isMe }) => {
  const player = AudioPlayerManager.getInstance();

  // Playback state synced from AudioPlayerManager
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(message.duration || 0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isCurrentPlaying, setIsCurrentPlaying] = useState(false);

  // Sync state with central AudioPlayerManager
  useEffect(() => {
    const unsubscribe = player.subscribe((playingId, state) => {
      const active = playingId === message.id;
      setIsCurrentPlaying(active);
      
      if (active) {
        setIsPlaying(state.isPlaying);
        setCurrentTime(state.currentTime);
        // Fall back to message metadata duration if player duration is not yet available
        setDuration(state.duration || message.duration || 0);
        setPlaybackRate(state.playbackRate);
      } else {
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(message.duration || 0);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [message.id, message.duration, player]);

  // Handle play/pause action
  const handlePlayPause = async (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent message selection sheets from opening
    try {
      if (isPlaying) {
        player.pause();
      } else {
        if (message.audioUrl) {
          await player.play(message.id, message.audioUrl);
        }
      }
    } catch (err) {
      console.error('Failed to toggle play/pause:', err);
    }
  };

  // Handle seek action
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (duration > 0) {
      const percentage = (val / duration) * 100;
      player.seekTo(percentage);
    }
  };

  // Handle speed toggle
  const handleSpeedToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextRate = playbackRate === 1.0 ? 2.0 : 1.0;
    player.setPlaybackRate(nextRate);
  };

  // Format seconds into m:ss
  const formatTime = (sec: number) => {
    if (isNaN(sec) || sec === Infinity) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`flex flex-col space-y-2 py-1 select-none min-w-[210px] sm:min-w-[240px] max-w-xs font-sans`}>
      {/* Waveform & Play Control Row */}
      <div className="flex items-center space-x-3">
        {/* Play / Pause Circular Button */}
        <button
          onClick={handlePlayPause}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 ${
            isMe 
              ? 'bg-neutral-900 text-indigo-400 hover:text-indigo-300' 
              : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-950/20'
          }`}
          aria-label={isPlaying ? 'Pause voice note' : 'Play voice note'}
        >
          {isPlaying ? (
            <Pause size={15} fill="currentColor" />
          ) : (
            <Play size={15} className="ml-0.5" fill="currentColor" />
          )}
        </button>

        {/* Custom Visual Waveform representing the Audio signature */}
        <div className="flex-1">
          <WaveformView
            isLive={false}
            progress={progressPercent}
            seedId={message.id}
            barCount={22}
            height={24}
          />
        </div>

        {/* Playback Speed controller (1x/2x toggle) */}
        {isCurrentPlaying && (
          <button
            onClick={handleSpeedToggle}
            className={`px-1.5 py-1 rounded-md text-[9px] font-bold font-mono tracking-wider transition-colors active:scale-95 flex items-center gap-0.5 ${
              isMe 
                ? 'bg-neutral-900/60 text-indigo-300 hover:bg-neutral-900' 
                : 'bg-neutral-800 text-indigo-400 hover:bg-neutral-750'
            }`}
            title="Toggle playback speed"
            aria-label="Toggle playback speed"
          >
            <FastForward size={8} />
            <span>{playbackRate}x</span>
          </button>
        )}
      </div>

      {/* Progress slider and times row */}
      <div className="space-y-1">
        {/* Seekable Progress Slider */}
        <div className="relative group h-2 flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className={`w-full h-[3px] rounded-lg appearance-none cursor-pointer outline-none bg-neutral-800/80 accent-indigo-400 transition-all ${
              isMe ? 'accent-neutral-100' : 'accent-indigo-500'
            }`}
            style={{
              background: `linear-gradient(to right, ${
                isMe ? '#818cf8' : '#6366f1'
              } 0%, ${
                isMe ? '#818cf8' : '#6366f1'
              } ${progressPercent}%, rgba(82, 82, 82, 0.4) ${progressPercent}%, rgba(82, 82, 82, 0.4) 100%)`
            }}
          />
        </div>

        {/* Time display indicator */}
        <div className="flex items-center justify-between text-[10px] font-mono opacity-80 text-neutral-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};

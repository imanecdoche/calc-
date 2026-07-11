import React, { useMemo } from 'react';

interface WaveformViewProps {
  // If true, shows active live-updating levels
  isLive?: boolean;
  // Live levels to display (array of numbers, usually 0 - 100)
  liveLevels?: number[];
  // If static, the progress of playback (0 - 100)
  progress?: number;
  // Identifier to generate stable aesthetic waveforms for playback
  seedId?: string;
  // Number of bars to render
  barCount?: number;
  // Visual height in pixels
  height?: number;
}

export const WaveformView: React.FC<WaveformViewProps> = ({
  isLive = false,
  liveLevels = [],
  progress = 0,
  seedId = 'default',
  barCount = 20,
  height = 32,
}) => {
  // Generate static pseudo-random wave heights that are identical for a given message ID seed
  const waveHeights = useMemo(() => {
    if (isLive) return [];
    
    const heights: number[] = [];
    let hash = 0;
    for (let i = 0; i < seedId.length; i++) {
      hash = seedId.charCodeAt(i) + ((hash << 5) - hash);
    }

    for (let i = 0; i < barCount; i++) {
      // Seeded random number between 15% and 95%
      const pseudoRandom = Math.abs(Math.sin(hash + i * 13)) * 80 + 15;
      heights.push(Math.round(pseudoRandom));
    }
    return heights;
  }, [isLive, seedId, barCount]);

  if (isLive) {
    // Render live levels (e.g., from the microfone)
    // Pads or truncates liveLevels to match barCount
    const paddedLevels = Array.from({ length: barCount }, (_, i) => {
      const val = liveLevels[i % (liveLevels.length || 1)] || 0;
      // Add a slight minimum visual height (10%) so bars don't disappear completely
      return Math.max(10, val);
    });

    return (
      <div 
        className="flex items-center gap-[3px] justify-center px-1"
        style={{ height: `${height}px` }}
      >
        {paddedLevels.map((lvl, idx) => (
          <div
            key={idx}
            className="w-[3px] bg-red-500 rounded-full transition-all duration-75"
            style={{ 
              height: `${lvl}%`,
              opacity: 0.3 + (lvl / 100) * 0.7 
            }}
          />
        ))}
      </div>
    );
  }

  // Render static interactive playback progress waveform
  return (
    <div 
      className="flex items-center gap-[3px]"
      style={{ height: `${height}px` }}
    >
      {waveHeights.map((h, idx) => {
        const barProgressPosition = (idx / barCount) * 100;
        const isActive = progress >= barProgressPosition;

        return (
          <div
            key={idx}
            className={`w-[3.5px] rounded-full transition-all duration-200 ${
              isActive ? 'bg-indigo-400' : 'bg-neutral-800'
            }`}
            style={{ 
              height: `${h}%`,
            }}
          />
        );
      })}
    </div>
  );
};

import React from 'react';

interface DateSeparatorProps {
  timestamp: number;
}

export function DateSeparator({ timestamp }: DateSeparatorProps) {
  const formatDateLabel = (ts: number): string => {
    const msgDate = new Date(ts);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    // Reset times to compare dates only
    const msgDateZero = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());
    const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayZero = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (msgDateZero.getTime() === todayZero.getTime()) {
      return 'Today';
    }
    if (msgDateZero.getTime() === yesterdayZero.getTime()) {
      return 'Yesterday';
    }

    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    return msgDate.toLocaleDateString('en-US', options);
  };

  return (
    <div className="flex items-center justify-center my-6 select-none w-full">
      <div className="h-[1px] bg-neutral-900 flex-1" />
      <span className="px-3 py-1 text-[9px] font-mono uppercase tracking-widest text-neutral-500 bg-[#07080b] border border-neutral-900 rounded-full mx-3 font-semibold">
        {formatDateLabel(timestamp)}
      </span>
      <div className="h-[1px] bg-neutral-900 flex-1" />
    </div>
  );
}

/**
 * Utility to check if a date separator is needed between two consecutive messages.
 */
export function shouldShowDateSeparator(prevTimestamp: number | undefined, currentTimestamp: number): boolean {
  if (!prevTimestamp) return true;

  const prevDate = new Date(prevTimestamp);
  const currentDate = new Date(currentTimestamp);

  return (
    prevDate.getDate() !== currentDate.getDate() ||
    prevDate.getMonth() !== currentDate.getMonth() ||
    prevDate.getFullYear() !== currentDate.getFullYear()
  );
}

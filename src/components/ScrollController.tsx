import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowDown } from 'lucide-react';

interface ScrollControllerProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  messagesCount: number;
  onScrollToBottom: () => void;
}

export function ScrollController({
  containerRef,
  messagesCount,
  onScrollToBottom
}: ScrollControllerProps) {
  const [showBadge, setShowBadge] = useState(false);
  const [prevCount, setPrevCount] = useState(messagesCount);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Check if user is scrolled near the bottom (within 150px)
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;

    if (messagesCount > prevCount) {
      if (isNearBottom) {
        // If near bottom, snap scroll automatically
        setTimeout(onScrollToBottom, 50);
      } else {
        // Scrolled up reading history, trigger the float alert badge
        setShowBadge(true);
      }
      setPrevCount(messagesCount);
    } else if (messagesCount < prevCount) {
      // Message deleted or cleared, just sync count without badge alert
      setPrevCount(messagesCount);
    }
  }, [messagesCount, prevCount, containerRef, onScrollToBottom]);

  // Set up scroll event listener to hide badge when user manually scroll to the bottom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
      if (isNearBottom) {
        setShowBadge(false);
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [containerRef]);

  const handleSnapBottom = () => {
    onScrollToBottom();
    setShowBadge(false);
  };

  return (
    <AnimatePresence>
      {showBadge && (
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          className="absolute bottom-18 left-1/2 -translate-x-1/2 z-30"
        >
          <button
            onClick={handleSnapBottom}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[10px] font-bold uppercase tracking-widest border border-indigo-400/30 shadow-lg shadow-indigo-950/40 active:scale-95 transition cursor-pointer"
          >
            <ArrowDown size={12} className="animate-bounce" />
            <span>New Messages</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

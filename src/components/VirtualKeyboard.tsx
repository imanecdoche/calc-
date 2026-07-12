import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Delete, ArrowUp, Globe, CornerDownLeft, Keyboard, Check } from 'lucide-react';

interface VirtualKeyboardProps {
  onKeyPress: (char: string) => void;
  onBackspace: () => void;
  onSpace: () => void;
  onEnter?: () => void;
  onClose?: () => void;
  enterLabel?: string; // "Send", "Login", "Daftar", "OK"
  layoutType?: 'text' | 'number-only';
  height?: number;
}

export default function VirtualKeyboard({
  onKeyPress,
  onBackspace,
  onSpace,
  onEnter,
  onClose,
  enterLabel = 'Send',
  layoutType = 'text',
  height,
}: VirtualKeyboardProps) {
  // Key state tracking
  const [isCaps, setIsCaps] = useState(false);
  const [isAltMode, setIsAltMode] = useState(false); // For ?123 layout
  const [isAltSymbolsMode, setIsAltSymbolsMode] = useState(false); // For #+= layout
  const backspaceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate dynamic key height if custom height is set
  // subtract space for dismiss bar (~35px) and padding (~20px)
  const calculatedKeyHeight = height 
    ? Math.max(28, Math.floor((height - (onClose ? 48 : 20)) / 4)) 
    : undefined;

  // Clean up backspace timers
  useEffect(() => {
    return () => {
      if (backspaceTimerRef.current) clearInterval(backspaceTimerRef.current);
    };
  }, []);

  // Handle continuous backspace on long press
  const startBackspace = () => {
    onBackspace();
    if (backspaceTimerRef.current) clearInterval(backspaceTimerRef.current);
    backspaceTimerRef.current = setInterval(() => {
      onBackspace();
    }, 120);
  };

  const stopBackspace = () => {
    if (backspaceTimerRef.current) {
      clearInterval(backspaceTimerRef.current);
      backspaceTimerRef.current = null;
    }
  };

  // Keyboard Layouts
  const row1Letters = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
  const row2Letters = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'];
  const row3Letters = ['z', 'x', 'c', 'v', 'b', 'n', 'm'];

  const row1Numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  const row2Symbols = ['-', '/', ':', ';', '(', ')', '$', '&', '@', '"'];
  const row3Symbols = ['.', ',', '?', '!', "'"];

  const row1AltSymbols = ['[', ']', '{', '}', '#', '%', '^', '*', '+', '='];
  const row2AltSymbols = ['_', '\\', '|', '~', '<', '>', '€', '£', '¥', '•'];
  const row3AltSymbols = ['.', ',', '?', '!', "'"];

  const handleKeyPress = (char: string) => {
    // Vibrate gently if supported
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    const finalChar = isCaps ? char.toUpperCase() : char.toLowerCase();
    onKeyPress(finalChar);
  };

  // Render text layout (Standard Keyboard)
  const renderTextKeyboard = () => {
    if (isAltMode) {
      // Numbers / Symbols Mode (?123)
      const currentLabelRow2 = isAltSymbolsMode ? row2AltSymbols : row2Symbols;
      const currentLabelRow1 = isAltSymbolsMode ? row1AltSymbols : row1Numbers;
      const currentLabelRow3 = isAltSymbolsMode ? row3AltSymbols : row3Symbols;

      return (
        <div className="virtual-keyboard-grid flex flex-col space-y-2 select-none touch-none">
          {/* Row 1 */}
          <div className="flex w-full justify-center space-x-1 px-1">
            {currentLabelRow1.map((char) => (
              <button
                key={char}
                type="button"
                onClick={() => handleKeyPress(char)}
                className="flex-1 h-11 sm:h-12 flex items-center justify-center text-sm font-semibold rounded-lg bg-[#222431]/95 border border-neutral-800/80 shadow text-neutral-100 hover:bg-[#2d3042] active:scale-95 transition-all cursor-pointer"
              >
                {char}
              </button>
            ))}
          </div>

          {/* Row 2 */}
          <div className="flex w-full justify-center space-x-1 px-3">
            {currentLabelRow2.map((char) => (
              <button
                key={char}
                type="button"
                onClick={() => handleKeyPress(char)}
                className="flex-1 h-11 sm:h-12 flex items-center justify-center text-sm font-semibold rounded-lg bg-[#222431]/95 border border-neutral-800/80 shadow text-neutral-100 hover:bg-[#2d3042] active:scale-95 transition-all cursor-pointer"
              >
                {char}
              </button>
            ))}
          </div>

          {/* Row 3 */}
          <div className="flex w-full justify-between space-x-1 px-1">
            {/* Shift/Alt symbols toggle */}
            <button
              type="button"
              onClick={() => setIsAltSymbolsMode(!isAltSymbolsMode)}
              className="px-2.5 h-11 sm:h-12 flex items-center justify-center text-xs font-bold rounded-lg bg-[#2f3246] border border-neutral-800/80 shadow text-neutral-200 hover:bg-[#3d415b] active:scale-95 transition-all cursor-pointer min-w-[50px] sm:min-w-[58px]"
            >
              {isAltSymbolsMode ? '?123' : '#+='}
            </button>

            <div className="flex-1 flex justify-center space-x-1">
              {currentLabelRow3.map((char) => (
                <button
                  key={char}
                  type="button"
                  onClick={() => handleKeyPress(char)}
                  className="flex-1 h-11 sm:h-12 flex items-center justify-center text-sm font-semibold rounded-lg bg-[#222431]/95 border border-neutral-800/80 shadow text-neutral-100 hover:bg-[#2d3042] active:scale-95 transition-all cursor-pointer"
                >
                  {char}
                </button>
              ))}
            </div>

            {/* Backspace */}
            <button
              type="button"
              onMouseDown={startBackspace}
              onTouchStart={startBackspace}
              onMouseUp={stopBackspace}
              onMouseLeave={stopBackspace}
              onTouchEnd={stopBackspace}
              className="px-2.5 h-11 sm:h-12 flex items-center justify-center rounded-lg bg-[#2f3246] border border-neutral-800/80 shadow text-neutral-200 hover:bg-[#3d415b] active:scale-95 transition-all cursor-pointer min-w-[50px] sm:min-w-[58px]"
            >
              <Delete size={16} />
            </button>
          </div>

          {/* Row 4 */}
          <div className="flex w-full justify-between space-x-1 px-1 pt-0.5">
            {/* Letters mode toggle */}
            <button
              type="button"
              onClick={() => {
                setIsAltMode(false);
                setIsAltSymbolsMode(false);
              }}
              className="px-3 h-11 sm:h-12 flex items-center justify-center text-xs font-bold rounded-lg bg-[#2f3246] border border-neutral-800/80 shadow text-neutral-200 hover:bg-[#3d415b] active:scale-95 transition-all cursor-pointer min-w-[65px]"
            >
              ABC
            </button>

            {/* Space Bar */}
            <button
              type="button"
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(10);
                onSpace();
              }}
              className="flex-1 h-11 sm:h-12 flex items-center justify-center text-xs font-medium rounded-lg bg-[#222431]/95 border border-neutral-800/80 shadow text-neutral-300 hover:bg-[#2d3042] active:scale-95 transition-all cursor-pointer uppercase tracking-widest"
            >
              Spasi
            </button>

            {/* Dismiss / Send Key */}
            <button
              type="button"
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(12);
                if (onEnter) onEnter();
              }}
              className="px-4 h-11 sm:h-12 flex items-center justify-center text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/20 shadow text-white active:scale-95 transition-all cursor-pointer min-w-[70px] space-x-1"
            >
              <span>{enterLabel}</span>
              <CornerDownLeft size={11} />
            </button>
          </div>
        </div>
      );
    }

    // Letters Mode (QWERTY layout)
    return (
      <div className="virtual-keyboard-grid flex flex-col space-y-2 select-none touch-none">
        {/* Row 1 */}
        <div className="flex w-full justify-center space-x-1 px-1">
          {row1Letters.map((char) => (
            <button
              key={char}
              type="button"
              onClick={() => handleKeyPress(char)}
              className="flex-1 h-11 sm:h-12 flex items-center justify-center text-sm font-semibold rounded-lg bg-[#222431]/95 border border-neutral-800/80 shadow text-neutral-100 hover:bg-[#2d3042] active:scale-95 transition-all cursor-pointer"
            >
              {isCaps ? char.toUpperCase() : char.toLowerCase()}
            </button>
          ))}
        </div>

        {/* Row 2 */}
        <div className="flex w-full justify-center space-x-1 px-3">
          {row2Letters.map((char) => (
            <button
              key={char}
              type="button"
              onClick={() => handleKeyPress(char)}
              className="flex-1 h-11 sm:h-12 flex items-center justify-center text-sm font-semibold rounded-lg bg-[#222431]/95 border border-neutral-800/80 shadow text-neutral-100 hover:bg-[#2d3042] active:scale-95 transition-all cursor-pointer"
            >
              {isCaps ? char.toUpperCase() : char.toLowerCase()}
            </button>
          ))}
        </div>

        {/* Row 3 */}
        <div className="flex w-full justify-between space-x-1 px-1">
          {/* Shift Key */}
          <button
            type="button"
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(10);
              setIsCaps(!isCaps);
            }}
            className={`px-2.5 h-11 sm:h-12 flex items-center justify-center rounded-lg border shadow active:scale-95 transition-all cursor-pointer min-w-[46px] sm:min-w-[54px] ${
              isCaps
                ? 'bg-indigo-600 text-white border-indigo-500/25'
                : 'bg-[#2f3246] border-neutral-800/80 text-neutral-200 hover:bg-[#3d415b]'
            }`}
          >
            <ArrowUp size={15} className={isCaps ? 'stroke-[3]' : 'stroke-[2]'} />
          </button>

          <div className="flex-1 flex justify-center space-x-1">
            {row3Letters.map((char) => (
              <button
                key={char}
                type="button"
                onClick={() => handleKeyPress(char)}
                className="flex-1 h-11 sm:h-12 flex items-center justify-center text-sm font-semibold rounded-lg bg-[#222431]/95 border border-neutral-800/80 shadow text-neutral-100 hover:bg-[#2d3042] active:scale-95 transition-all cursor-pointer"
              >
                {isCaps ? char.toUpperCase() : char.toLowerCase()}
              </button>
            ))}
          </div>

          {/* Backspace */}
          <button
            type="button"
            onMouseDown={startBackspace}
            onTouchStart={startBackspace}
            onMouseUp={stopBackspace}
            onMouseLeave={stopBackspace}
            onTouchEnd={stopBackspace}
            className="px-2.5 h-11 sm:h-12 flex items-center justify-center rounded-lg bg-[#2f3246] border border-neutral-800/80 shadow text-neutral-200 hover:bg-[#3d415b] active:scale-95 transition-all cursor-pointer min-w-[46px] sm:min-w-[54px]"
          >
            <Delete size={16} />
          </button>
        </div>

        {/* Row 4 */}
        <div className="flex w-full justify-between space-x-1 px-1 pt-0.5">
          {/* Numbers mode toggle */}
          <button
            type="button"
            onClick={() => setIsAltMode(true)}
            className="px-3 h-11 sm:h-12 flex items-center justify-center text-xs font-bold rounded-lg bg-[#2f3246] border border-neutral-800/80 shadow text-neutral-200 hover:bg-[#3d415b] active:scale-95 transition-all cursor-pointer min-w-[65px]"
          >
            ?123
          </button>

          {/* Space Bar */}
          <button
            type="button"
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(10);
              onSpace();
            }}
            className="flex-1 h-11 sm:h-12 flex items-center justify-center text-xs font-medium rounded-lg bg-[#222431]/95 border border-neutral-800/80 shadow text-neutral-300 hover:bg-[#2d3042] active:scale-95 transition-all cursor-pointer uppercase tracking-widest"
          >
            Spasi
          </button>

          {/* Send / Enter */}
          <button
            type="button"
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(12);
              if (onEnter) onEnter();
            }}
            className="px-4 h-11 sm:h-12 flex items-center justify-center text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/20 shadow text-white active:scale-95 transition-all cursor-pointer min-w-[70px] space-x-1"
          >
            <span>{enterLabel}</span>
            <CornerDownLeft size={11} />
          </button>
        </div>
      </div>
    );
  };

  // Render pure number layout if requested
  const renderNumberKeyboard = () => {
    const numRow1 = ['1', '2', '3'];
    const numRow2 = ['4', '5', '6'];
    const numRow3 = ['7', '8', '9'];

    return (
      <div className="virtual-keyboard-grid grid grid-cols-3 gap-2 px-6 pb-2 select-none touch-none max-w-sm mx-auto">
        {numRow1.map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleKeyPress(num)}
            className="h-12 flex items-center justify-center text-base font-bold rounded-xl bg-[#222431]/95 border border-neutral-800/80 shadow text-neutral-100 hover:bg-[#2d3042] active:scale-95 transition-all cursor-pointer"
          >
            {num}
          </button>
        ))}
        {numRow2.map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleKeyPress(num)}
            className="h-12 flex items-center justify-center text-base font-bold rounded-xl bg-[#222431]/95 border border-neutral-800/80 shadow text-neutral-100 hover:bg-[#2d3042] active:scale-95 transition-all cursor-pointer"
          >
            {num}
          </button>
        ))}
        {numRow3.map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleKeyPress(num)}
            className="h-12 flex items-center justify-center text-base font-bold rounded-xl bg-[#222431]/95 border border-neutral-800/80 shadow text-neutral-100 hover:bg-[#2d3042] active:scale-95 transition-all cursor-pointer"
          >
            {num}
          </button>
        ))}

        {/* Backspace */}
        <button
          type="button"
          onMouseDown={startBackspace}
          onTouchStart={startBackspace}
          onMouseUp={stopBackspace}
          onMouseLeave={stopBackspace}
          onTouchEnd={stopBackspace}
          className="h-12 flex items-center justify-center rounded-xl bg-[#2f3246] border border-neutral-800/80 shadow text-neutral-200 hover:bg-[#3d415b] active:scale-95 transition-all cursor-pointer"
        >
          <Delete size={18} />
        </button>

        {/* Zero */}
        <button
          type="button"
          onClick={() => handleKeyPress('0')}
          className="h-12 flex items-center justify-center text-base font-bold rounded-xl bg-[#222431]/95 border border-neutral-800/80 shadow text-neutral-100 hover:bg-[#2d3042] active:scale-95 transition-all cursor-pointer"
        >
          0
        </button>

        {/* Done / Enter */}
        <button
          type="button"
          onClick={onEnter}
          className="h-12 flex items-center justify-center rounded-xl bg-indigo-600 border border-indigo-500/20 shadow text-white hover:bg-indigo-500 active:scale-95 transition-all cursor-pointer"
        >
          <Check size={18} />
        </button>
      </div>
    );
  };

  return (
    <div 
      style={height ? { height: `${height}px` } : undefined}
      className="w-full bg-[#0a0a0f] border-t border-neutral-900/90 pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.5)] pt-2.5 px-1.5 flex flex-col space-y-2"
    >
      {height && (
        <style dangerouslySetInnerHTML={{ __html: `
          .virtual-keyboard-grid button {
            height: ${calculatedKeyHeight}px !important;
          }
        ` }} />
      )}
      {/* Upper bar with dismiss button */}
      {onClose && (
        <div className="flex justify-end px-2 pb-1.5 border-b border-neutral-900/30">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center space-x-1.5 px-3 py-1 bg-neutral-900/60 hover:bg-neutral-850 rounded-full border border-neutral-800/50 text-neutral-400 hover:text-neutral-200 transition-all text-[10px] font-medium font-mono uppercase tracking-wider cursor-pointer"
          >
            <Keyboard size={12} />
            <span>Sembunyikan Keyboard</span>
          </button>
        </div>
      )}

      {/* Main Keyboard Body */}
      {layoutType === 'number-only' ? renderNumberKeyboard() : renderTextKeyboard()}
    </div>
  );
}

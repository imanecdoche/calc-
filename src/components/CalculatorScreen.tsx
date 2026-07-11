import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  Trash2, 
  X, 
  Undo2, 
  Compass, 
  Percent, 
  ChevronDown 
} from 'lucide-react';
import { HistoryItem } from '../types';

interface CalculatorScreenProps {
  expression: string;
  result: string;
  history: HistoryItem[];
  isDegree: boolean;
  showHistoryPanel: boolean;
  setShowHistoryPanel: (show: boolean) => void;
  handleCalculatorPress: (value: string) => void;
  clearHistory: () => void;
  setExpression: (val: string) => void;
  setResult: (val: string) => void;
  onOpenSettings: () => void;
}

export default function CalculatorScreen({
  expression,
  result,
  history,
  isDegree,
  showHistoryPanel,
  setShowHistoryPanel,
  handleCalculatorPress,
  clearHistory,
  setExpression,
  setResult,
  onOpenSettings
}: CalculatorScreenProps) {

  // Scientific buttons list
  const sciButtons = [
    { label: 'deg', value: 'deg', action: true },
    { label: 'rad', value: 'rad', action: true },
    { label: 'sin', value: 'sin' },
    { label: 'cos', value: 'cos' },
    { label: 'tan', value: 'tan' },
    { label: 'log', value: 'log' },
    { label: 'ln', value: 'ln' },
    { label: '√', value: '√' },
    { label: 'x^y', value: '^' },
    { label: 'π', value: 'pi' },
    { label: 'e', value: 'e' },
    { label: '(', value: '(' },
    { label: ')', value: ')' },
    { label: '%', value: '%' },
  ];

  // Standard keypad rows
  const numRows = [
    [
      { label: 'C', value: 'C', type: 'clear', span: true },
      { label: '⌫', value: '⌫', type: 'delete' },
      { label: '÷', value: '÷', type: 'operator' }
    ],
    [
      { label: '7', value: '7', type: 'num' },
      { label: '8', value: '8', type: 'num' },
      { label: '9', value: '9', type: 'num' },
      { label: '×', value: '×', type: 'operator' }
    ],
    [
      { label: '4', value: '4', type: 'num' },
      { label: '5', value: '5', type: 'num' },
      { label: '6', value: '6', type: 'num' },
      { label: '-', value: '-', type: 'operator' }
    ],
    [
      { label: '1', value: '1', type: 'num' },
      { label: '2', value: '2', type: 'num' },
      { label: '3', value: '3', type: 'num' },
      { label: '+', value: '+', type: 'operator' }
    ],
    [
      { label: '0', value: '0', type: 'num', span: true },
      { label: '.', value: '.', type: 'num' },
      { label: '=', value: '=', type: 'equals' }
    ]
  ];

  const handleHistoryItemClick = (item: HistoryItem) => {
    setExpression(item.expression);
    setResult(item.result);
    setShowHistoryPanel(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-neutral-100 select-none relative overflow-hidden font-sans">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-900 bg-[#0a0a0a] sticky top-0 z-10">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#121212] border border-neutral-800 flex items-center justify-center font-bold tracking-tight text-xs text-neutral-200">
            C+
          </div>
          <span className="font-bold text-base tracking-tight text-neutral-100">Calc+</span>
        </div>
        
        <div className="flex items-center space-x-1.5">
          <button 
            onClick={() => setShowHistoryPanel(true)}
            aria-label="Riwayat"
            className="p-2.5 rounded-xl hover:bg-[#121212] border border-transparent hover:border-neutral-900 text-neutral-400 hover:text-neutral-200 transition-all duration-150 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <History size={18} />
          </button>
          
          <button 
            onClick={onOpenSettings}
            aria-label="Settings"
            className="p-2.5 rounded-xl hover:bg-[#121212] border border-transparent hover:border-neutral-900 text-neutral-400 hover:text-neutral-200 transition-all duration-150 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
        </div>
      </div>

      {/* Screen Display */}
      <div className="flex-1 flex flex-col justify-end px-6 py-6 border-b border-neutral-900 bg-[#070707]">
        
        {/* Mode unit indicators */}
        <div className="flex items-center space-x-1.5 text-[10px] font-mono text-neutral-500 mb-3 self-end select-none">
          <span className={`px-2 py-0.5 rounded-md border ${isDegree ? 'bg-[#181818] border-neutral-800 text-neutral-200 font-medium' : 'bg-transparent border-transparent text-neutral-600'}`}>DEG</span>
          <span className={`px-2 py-0.5 rounded-md border ${!isDegree ? 'bg-[#181818] border-neutral-800 text-neutral-200 font-medium' : 'bg-transparent border-transparent text-neutral-600'}`}>RAD</span>
        </div>

        {/* Math input expression */}
        <div className="text-right text-neutral-400 font-mono text-sm sm:text-base font-normal leading-relaxed overflow-y-auto max-h-[80px] break-all scrollbar-none mb-1">
          {expression || '0'}
        </div>

        {/* Result screen */}
        <div className="text-right font-medium text-3xl sm:text-4xl font-mono text-neutral-100 break-all select-all transition-all duration-300 min-h-[44px]">
          {result && <span className="text-neutral-400 mr-2 text-xl">=</span>}
          {result || '0'}
        </div>
      </div>

      {/* Scientific Keys Grid Toggle */}
      <div className="bg-[#0a0a0a] px-4 pt-4">
        <div className="grid grid-cols-7 gap-1.5 text-[11px] font-mono">
          {sciButtons.map((btn) => {
            const isActiveUnit = (btn.value === 'deg' && isDegree) || (btn.value === 'rad' && !isDegree);
            return (
              <motion.button
                key={btn.label}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleCalculatorPress(btn.value)}
                className={`flex flex-col items-center justify-center h-10 rounded-lg transition-all cursor-pointer min-h-[44px] border ${
                  isActiveUnit 
                    ? 'bg-neutral-200 text-neutral-950 font-medium border-neutral-200 shadow-sm shadow-black/20' 
                    : 'bg-[#121212]/40 text-neutral-400 hover:bg-[#161616] border-neutral-900'
                }`}
              >
                {btn.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Standard Keys Pad */}
      <div className="p-4 bg-[#0a0a0a] pb-8 flex-none">
        <div className="grid grid-cols-4 gap-2">
          {/* We lay them out based on rows */}
          {numRows.map((row, rIdx) => (
            <React.Fragment key={rIdx}>
              {row.map((btn) => {
                let btnStyle = 'bg-[#121212] border border-neutral-900 hover:bg-[#18181c] text-neutral-100';
                
                if (btn.type === 'clear') {
                  btnStyle = 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:bg-[#1a1a20]';
                } else if (btn.type === 'delete') {
                  btnStyle = 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:bg-[#18181c] hover:text-neutral-200';
                } else if (btn.type === 'operator') {
                  btnStyle = 'bg-[#161616] border border-neutral-800 text-neutral-200 hover:bg-neutral-800';
                } else if (btn.type === 'equals') {
                  btnStyle = 'bg-neutral-200 text-neutral-950 hover:bg-white font-semibold shadow-sm border-none';
                }

                return (
                  <motion.button
                    key={btn.label}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleCalculatorPress(btn.value)}
                    className={`flex items-center justify-center h-14 sm:h-16 rounded-xl text-lg font-mono transition-all duration-150 cursor-pointer min-h-[44px] ${
                      btn.span ? 'col-span-2' : ''
                    } ${btnStyle}`}
                  >
                    {btn.label}
                  </motion.button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Sliding History Panel */}
      <AnimatePresence>
        {showHistoryPanel && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm z-30 flex justify-end"
          >
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full max-w-sm bg-[#0a0a0a] border-l border-neutral-900 h-full flex flex-col shadow-2xl shadow-black"
            >
              <div className="flex items-center justify-between p-5 border-b border-neutral-900 bg-[#0a0a0a]">
                <div className="flex items-center space-x-2.5">
                  <History className="text-neutral-400" size={16} />
                  <span className="font-bold text-sm tracking-tight text-neutral-100">Session History</span>
                </div>
                <button 
                  onClick={() => setShowHistoryPanel(false)}
                  className="p-2 rounded-xl hover:bg-neutral-900 text-neutral-400 hover:text-neutral-100 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-[#070707]">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 text-neutral-500 space-y-2">
                    <History size={28} className="opacity-30 text-neutral-400" />
                    <span className="font-medium text-xs text-neutral-400">No calculations yet</span>
                    <span className="text-[11px] text-neutral-600 max-w-[200px] leading-relaxed">Perform equations to see them logged here during this session.</span>
                  </div>
                ) : (
                  history.map((item) => (
                    <motion.div
                      key={item.id}
                      onClick={() => handleHistoryItemClick(item)}
                      whileHover={{ scale: 1.01 }}
                      className="p-3.5 rounded-xl bg-[#0c0c0e] border border-neutral-900 hover:border-neutral-800 text-right cursor-pointer group transition-all"
                    >
                      <div className="text-[10px] text-neutral-600 font-mono mb-1">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                      <div className="text-neutral-400 font-mono text-xs truncate">{item.expression}</div>
                      <div className="text-neutral-200 font-mono font-medium text-base mt-0.5 truncate">= {item.result}</div>
                    </motion.div>
                  ))
                )}
              </div>

              {history.length > 0 && (
                <div className="p-4 border-t border-neutral-900 bg-[#0a0a0a]">
                  <button
                    onClick={clearHistory}
                    className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-rose-400 font-medium text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer min-h-[44px]"
                  >
                    <Trash2 size={13} />
                    <span>Clear Session History</span>
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

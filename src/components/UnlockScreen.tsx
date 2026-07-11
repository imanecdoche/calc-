import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, Lock, ArrowLeft, ShieldCheck } from 'lucide-react';
import { SecureWindowManager } from '../services/SecureWindowManager';

interface UnlockScreenProps {
  correctPasswordVal: string;
  onUnlockSuccess: () => void;
  onCancel: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function UnlockScreen({
  correctPasswordVal,
  onUnlockSuccess,
  onCancel,
  showToast
}: UnlockScreenProps) {
  const [inputPass, setInputPass] = useState<string>('');
  const [showPass, setShowPass] = useState<boolean>(false);
  const [shake, setShake] = useState<boolean>(false);

  // Activate Secure Screenshot Protection on Mount
  useEffect(() => {
    const secureWindow = SecureWindowManager.getInstance();
    secureWindow.enableSecureMode();
    return () => {
      secureWindow.disableSecureMode();
    };
  }, []);

  const handleUnlock = () => {
    if (inputPass === correctPasswordVal) {
      showToast('Vault decrypted successfully.', 'success');
      onUnlockSuccess();
    } else {
      setShake(true);
      showToast('Access Key rejected. Please try again.', 'error');
      setTimeout(() => setShake(false), 500);
      setInputPass('');
    }
  };

  const handleKeyPress = (char: string) => {
    if (char === '⌫') {
      setInputPass(prev => prev.slice(0, -1));
    } else if (char === 'CLEAR') {
      setInputPass('');
    } else {
      setInputPass(prev => prev + char);
    }
  };

  const numKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', '⌫'];

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-neutral-100 font-sans select-none overflow-hidden relative">
      
      {/* Header bar */}
      <div className="flex items-center px-4 py-4 border-b border-neutral-900 bg-[#0a0a0a] sticky top-0 z-10">
        <button
          onClick={onCancel}
          className="p-2.5 rounded-xl hover:bg-neutral-900 text-neutral-400 hover:text-neutral-100 transition-all cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center mr-2 border border-transparent hover:border-neutral-800"
          aria-label="Back to Calculator"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="font-semibold text-neutral-400 text-xs tracking-wider uppercase font-mono">Secure Enclave</span>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-8">
        
        {/* Shield Icon animation */}
        <motion.div 
          animate={shake ? { x: [-10, 10, -10, 10, -5, 5, -2, 2, 0] } : {}}
          transition={{ duration: 0.5 }}
          className="mb-6 p-3.5 rounded-2xl bg-[#121212] border border-neutral-800 flex items-center justify-center text-neutral-300"
        >
          <Lock size={24} className={shake ? "text-rose-500" : "text-neutral-300"} />
        </motion.div>

        {/* Title */}
        <h1 className="text-xl font-bold tracking-tight text-neutral-100 mb-1.5">
          ACCESS KEY
        </h1>
        <p className="text-xs text-neutral-500 max-w-[280px] text-center mb-8 leading-relaxed">
          Enter the secure passcode to decrypt and unlock the private partition.
        </p>

        {/* Password Display Field */}
        <motion.div 
          animate={shake ? { x: [-10, 10, -10, 10, -5, 5, -2, 2, 0] } : {}}
          transition={{ duration: 0.5 }}
          className="w-full max-w-xs flex items-center bg-[#121212] border border-neutral-800 rounded-xl px-4 py-3 mb-3 focus-within:border-neutral-700 transition-all"
        >
          <input
            type={showPass ? 'text' : 'password'}
            value={inputPass}
            readOnly
            placeholder="••••••••"
            className="w-full text-center bg-transparent border-none text-2xl font-mono tracking-widest text-neutral-100 outline-none select-none placeholder:text-neutral-800 placeholder:text-lg"
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="p-1 rounded-lg text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </motion.div>

        {/* Unlock Button */}
        <div className="w-full max-w-xs mb-8">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleUnlock}
            disabled={!inputPass}
            className={`w-full py-3.5 rounded-xl font-medium tracking-wide text-xs transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer min-h-[44px] ${
              inputPass 
                ? 'bg-neutral-200 hover:bg-white text-neutral-950 font-bold' 
                : 'bg-[#121212] text-neutral-600 border border-neutral-900 cursor-not-allowed font-medium'
            }`}
          >
            <ShieldCheck size={16} />
            <span>DECRYPT STORAGE</span>
          </motion.button>
        </div>

        {/* Custom Numeric Pad for instant entry */}
        <div className="w-full max-w-xs grid grid-cols-3 gap-2 flex-none">
          {numKeys.map((key) => {
            let style = 'bg-[#121212] hover:bg-[#16161c] text-neutral-200 border border-neutral-900/60';
            let label = key;

            if (key === 'CLEAR') {
              style = 'text-xs text-neutral-400 hover:bg-neutral-900 border border-neutral-900/60';
            } else if (key === '⌫') {
              style = 'text-neutral-400 hover:bg-neutral-900 border border-neutral-900/60';
            }

            return (
              <motion.button
                key={key}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleKeyPress(key)}
                className={`flex items-center justify-center h-12 rounded-xl text-lg font-mono transition-all cursor-pointer min-h-[44px] ${style}`}
              >
                {label}
              </motion.button>
            );
          })}
        </div>



      </div>
    </div>
  );
}

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

  // Auto-unlock when password length matches correct value
  useEffect(() => {
    if (inputPass.length > 0 && inputPass.length === correctPasswordVal.length) {
      if (inputPass === correctPasswordVal) {
        showToast('Decryption successful.', 'success');
        onUnlockSuccess();
      } else {
        setShake(true);
        showToast('Authentication rejected.', 'error');
        setTimeout(() => setShake(false), 500);
        setInputPass('');
      }
    }
  }, [inputPass, correctPasswordVal, onUnlockSuccess, showToast]);

  const handleKeyPress = (char: string) => {
    if (char === '⌫') {
      setInputPass(prev => prev.slice(0, -1));
    } else if (char === 'CLEAR') {
      setInputPass('');
    } else {
      // Avoid typing more than the passcode length
      if (inputPass.length < correctPasswordVal.length) {
        setInputPass(prev => prev + char);
      }
    }
  };

  const numKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', '⌫'];

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-neutral-100 font-sans select-none overflow-hidden relative">
      
      {/* Header bar - no text, just minimal back button */}
      <div className="flex items-center px-4 py-4 bg-[#0a0a0a] sticky top-0 z-10">
        <button
          onClick={onCancel}
          className="p-2.5 rounded-xl hover:bg-neutral-900 text-neutral-400 hover:text-neutral-100 transition-all cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center mr-2 border border-transparent hover:border-neutral-800"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 pb-12">
        
        {/* Password Display Field - completely unlabelled and with no placeholder */}
        <motion.div 
          animate={shake ? { x: [-10, 10, -10, 10, -5, 5, -2, 2, 0] } : {}}
          transition={{ duration: 0.5 }}
          className="w-full max-w-xs flex items-center bg-[#121212] border border-neutral-850 rounded-xl px-4 py-3 mb-8 focus-within:border-neutral-700 transition-all shadow-inner"
        >
          <input
            type={showPass ? 'text' : 'password'}
            value={inputPass}
            readOnly
            placeholder=""
            className="w-full text-center bg-transparent border-none text-2xl font-mono tracking-widest text-neutral-100 outline-none select-none"
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="p-1 rounded-lg text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </motion.div>

        {/* Custom Numeric Pad */}
        <div className="w-full max-w-xs grid grid-cols-3 gap-2 flex-none">
          {numKeys.map((key) => {
            let style = 'bg-[#121212] hover:bg-[#16161c] text-neutral-200 border border-neutral-900/60 shadow-sm';

            if (key === 'CLEAR') {
              style = 'text-xs text-neutral-400 hover:bg-neutral-900 border border-neutral-900/60 shadow-sm';
            } else if (key === '⌫') {
              style = 'text-neutral-400 hover:bg-neutral-900 border border-neutral-900/60 shadow-sm';
            }

            return (
              <motion.button
                key={key}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleKeyPress(key)}
                className={`flex items-center justify-center h-14 rounded-xl text-lg font-mono transition-all cursor-pointer min-h-[44px] ${style}`}
              >
                {key}
              </motion.button>
            );
          })}
        </div>

      </div>
    </div>
  );
}

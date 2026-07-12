/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wifi, 
  Battery, 
  Smartphone, 
  Monitor, 
  ShieldCheck, 
  Sparkles 
} from 'lucide-react';
import { useCalculatorViewModel } from './hooks/useCalculatorViewModel';
import { FullscreenManager } from './services/FullscreenManager';
import CalculatorScreen from './components/CalculatorScreen';
import UnlockScreen from './components/UnlockScreen';
import SecretVault from './components/SecretVault';
import SettingsScreen from './components/SettingsScreen';
import SecretMessengerScreen from './components/SecretMessengerScreen';
import DevUnlockScreen from './components/DevUnlockScreen';
import DevToolsScreen from './components/DevToolsScreen';
import WikiLockScreen from './components/WikiLockScreen';

export default function App() {
  const {
    screen,
    prevScreen,
    navigate,
    
    expression,
    result,
    history,
    isDegree,
    showHistoryPanel,
    setShowHistoryPanel,
    handleCalculatorPress,
    clearHistory,
    
    password,
    vaultNotes,
    vaultPasswords,
    vaultDiaries,
    settings,
    setSettings,
    toast,
    showToast,
    
    changePassword,
    addNote,
    updateNote,
    deleteNote,
    addPassword,
    deletePassword,
    addDiaryEntry,
    deleteDiaryEntry,
    exportData,
    importData,
    resetAllData,
    clearCache,
    getStorageUsage,
    
    shortcuts,
    pendingShortcutUser,
    setPendingShortcutUser,
    addShortcut,
    deleteShortcut,
  } = useCalculatorViewModel();

  // --- State for Immersive Fullscreen ---
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || (document as any).webkitFullscreenElement || FullscreenManager.getInstance().getStatus()));
    };

    document.addEventListener('fullscreenchange', handleFSChange);
    document.addEventListener('webkitfullscreenchange', handleFSChange);

    handleFSChange();

    const interval = setInterval(handleFSChange, 300);

    return () => {
      document.removeEventListener('fullscreenchange', handleFSChange);
      document.removeEventListener('webkitfullscreenchange', handleFSChange);
      clearInterval(interval);
    };
  }, []);

  // --- State for Device Mockup Frame ---
  const [useBezel, setUseBezel] = useState<boolean>(true);
  const [deviceTime, setDeviceTime] = useState<string>('12:00');

  // Live status bar clock simulation
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      let hours = now.getHours();
      let minutes = now.getMinutes().toString().padStart(2, '0');
      setDeviceTime(`${hours}:${minutes}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 30000);
    return () => clearInterval(interval);
  }, []);

  // Set explicit values for manual state correction (e.g. on direct set)
  const setExpression = (val: string) => {
    handleCalculatorPress('C');
    if (val) {
      for (const char of val) {
        handleCalculatorPress(char);
      }
    }
  };

  const setResult = (val: string) => {
    // result is naturally driven by formula, but if set directly:
    // This is useful for loading history item clicking
  };

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-100 flex flex-col items-center justify-center p-0 sm:p-6 select-none font-sans overflow-x-hidden">
      
      {/* Background elegant grid */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-25 pointer-events-none" />

      {/* Aesthetic upper banner for desktop viewing */}
      <div className="hidden sm:flex items-center justify-between w-full max-w-md mb-4 px-3 py-1 bg-[#101010]/80 border border-neutral-900 rounded-full backdrop-blur-md">
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-pulse" />
          <span className="text-[9px] font-medium tracking-widest text-neutral-400 uppercase font-mono">Interactive Frame</span>
        </div>
        <button
          onClick={() => setUseBezel(!useBezel)}
          className="px-3 py-1 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[9px] font-medium text-neutral-300 font-mono tracking-wider uppercase flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
        >
          {useBezel ? <Monitor size={9} /> : <Smartphone size={9} />}
          <span>{useBezel ? 'Full Width' : 'Phone Frame'}</span>
        </button>
      </div>

      {/* PRIMARY PHONE WRAPPER DEVICE */}
      <div 
        className={`relative w-full transition-all duration-300 ease-out-quint ${
          useBezel 
            ? 'max-w-md h-[100vh] sm:h-[860px] sm:rounded-[40px] sm:border-[10px] sm:border-neutral-900 sm:shadow-2xl sm:shadow-black/60 sm:ring-1 sm:ring-neutral-800/50' 
            : 'max-w-3xl h-[100vh] sm:h-[800px] sm:rounded-2xl sm:border border-neutral-900 sm:shadow-2xl sm:shadow-black/40'
        } bg-neutral-950 overflow-hidden flex flex-col`}
      >
        


        {/* SCREEN CONTAINER (Transitions managed by key-based screens) */}
        <div className="flex-1 min-h-0 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              {screen === 'calculator' && (
                <CalculatorScreen
                  expression={expression}
                  result={result}
                  history={history}
                  isDegree={isDegree}
                  showHistoryPanel={showHistoryPanel}
                  setShowHistoryPanel={setShowHistoryPanel}
                  handleCalculatorPress={handleCalculatorPress}
                  clearHistory={clearHistory}
                  setExpression={setExpression}
                  setResult={setResult}
                  onOpenSettings={() => navigate('settings')}
                />
              )}

              {screen === 'unlock' && (
                <UnlockScreen
                  correctPasswordVal={password}
                  onUnlockSuccess={() => navigate('messenger')}
                  onCancel={() => navigate('calculator')}
                  showToast={showToast}
                />
              )}

              {screen === 'messenger' && (
                <SecretMessengerScreen
                  settings={settings}
                  onLock={() => navigate('wiki_lock')}
                  onOpenSettings={() => navigate('settings')}
                  onOpenVault={() => navigate('vault')}
                  showToast={showToast}
                  directTargetUser={pendingShortcutUser}
                  clearDirectTargetUser={() => setPendingShortcutUser(null)}
                />
              )}

              {screen === 'vault' && (
                <SecretVault
                  vaultNotes={vaultNotes}
                  vaultPasswords={vaultPasswords}
                  vaultDiaries={vaultDiaries}
                  addNote={addNote}
                  updateNote={updateNote}
                  deleteNote={deleteNote}
                  addPassword={addPassword}
                  deletePassword={deletePassword}
                  addDiaryEntry={addDiaryEntry}
                  deleteDiaryEntry={deleteDiaryEntry}
                  onLock={() => navigate('wiki_lock')}
                  showToast={showToast}
                  onOpenSettings={() => navigate('settings')}
                  onOpenMessenger={() => navigate('messenger')}
                />
              )}

              {screen === 'settings' && (
                <SettingsScreen
                  settings={settings}
                  setSettings={setSettings}
                  currentPasswordVal={password}
                  changePassword={changePassword}
                  exportData={exportData}
                  importData={importData}
                  resetAllData={resetAllData}
                  clearCache={clearCache}
                  getStorageUsage={getStorageUsage}
                  onBack={() => navigate(prevScreen)}
                  showToast={showToast}
                  isSecureEnclave={prevScreen === 'messenger' || prevScreen === 'vault'}
                  shortcuts={shortcuts}
                  addShortcut={addShortcut}
                  deleteShortcut={deleteShortcut}
                />
              )}

              {screen === 'dev_unlock' && (
                <DevUnlockScreen
                  onUnlockSuccess={() => navigate('dev_tools')}
                  onCancel={() => navigate('calculator')}
                  showToast={showToast}
                />
              )}

              {screen === 'dev_tools' && (
                <DevToolsScreen
                  onBack={() => navigate('calculator')}
                  showToast={showToast}
                />
              )}

              {screen === 'wiki_lock' && (
                <WikiLockScreen
                  onUnlockToCalculator={() => navigate('calculator')}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>



        {/* --- SYSTEM TOAST POPUPS OVERLAY --- */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="absolute bottom-16 left-4 right-4 z-50 pointer-events-none flex justify-center"
            >
              <div className={`px-4 py-2.5 rounded-xl text-xs font-sans font-medium shadow-xl text-neutral-200 text-center flex items-center space-x-2 bg-[#121212] border ${
                toast.type === 'error' 
                  ? 'border-neutral-800 text-rose-300' 
                  : toast.type === 'info' 
                    ? 'border-neutral-800 text-neutral-300' 
                    : 'border-neutral-800 text-neutral-200'
              }`}>
                <span>{toast.type === 'error' ? '!' : '✓'}</span>
                <span>{toast.message}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

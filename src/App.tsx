/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

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
import WordMappingConfigScreen from './components/WordMappingConfigScreen';
import ErrorBoundary from './components/ErrorBoundary';

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

    wordMappings,
    addWordMapping,
    updateWordMapping,
    deleteWordMapping,
    toggleWordMapping,
    clearAllWordMappings,
  } = useCalculatorViewModel();

  // --- State for Immersive Fullscreen ---
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [userExitedFullscreen, setUserExitedFullscreen] = useState<boolean>(false);
  const [appMountedTime] = useState<number>(Date.now());
  const wasFullscreenRef = useRef(false);

  useEffect(() => {
    const handleFSChange = () => {
      const isCurrentlyFS = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      
      // If we were previously fullscreen, and now we are not, the user exited fullscreen
      if (wasFullscreenRef.current && !isCurrentlyFS) {
        setUserExitedFullscreen(true);
        FullscreenManager.getInstance().disableAutoFullscreen = true;
      }
      
      wasFullscreenRef.current = isCurrentlyFS;
      setIsFullscreen(isCurrentlyFS || FullscreenManager.getInstance().getStatus());
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
    <div className="w-full h-screen h-[100dvh] bg-[#0a0a0a] text-neutral-100 flex flex-col select-none font-sans overflow-hidden">
      
      {/* Background elegant grid */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

      {/* FULL VIEWPORT APPLICATION CONTAINER */}
      <div className="relative w-full h-full bg-[#0a0a0a] overflow-hidden flex flex-col">
        


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
              <ErrorBoundary onReset={() => navigate('unlock')}>
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
                  onUnlockDev={() => navigate('dev_tools')}
                  onUnlockConfig={() => navigate('word_mapping_config')}
                  showToast={showToast}
                />
              )}

              {screen === 'messenger' && (
                <SecretMessengerScreen
                  settings={settings}
                  onLock={() => navigate('unlock')}
                  onExitToCalculator={() => navigate('unlock')}
                  onOpenSettings={() => navigate('settings')}
                  onOpenVault={() => navigate('vault')}
                  showToast={showToast}
                  directTargetUser={pendingShortcutUser}
                  clearDirectTargetUser={() => setPendingShortcutUser(null)}
                  appAccessKey={password}
                  wordMappings={wordMappings}
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
                  onLock={() => navigate('unlock')}
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
                  onBack={() => navigate(prevScreen === 'settings' || prevScreen === 'calculator' ? 'unlock' : prevScreen)}
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
                  onCancel={() => navigate('unlock')}
                  showToast={showToast}
                />
              )}

              {screen === 'dev_tools' && (
                <DevToolsScreen
                  onBack={() => navigate('unlock')}
                  showToast={showToast}
                />
              )}

              {screen === 'wiki_lock' && (
                <WikiLockScreen
                  onUnlockToCalculator={() => navigate('unlock')}
                />
              )}

              {screen === 'word_mapping_config' && (
                <WordMappingConfigScreen
                  wordMappings={wordMappings}
                  onAdd={addWordMapping}
                  onUpdate={updateWordMapping}
                  onDelete={deleteWordMapping}
                  onToggle={toggleWordMapping}
                  onClearAll={clearAllWordMappings}
                  onBack={() => navigate('unlock')}
                  showToast={showToast}
                />
              )}
              </ErrorBoundary>
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

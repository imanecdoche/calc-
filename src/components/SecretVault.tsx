import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, 
  FileText, 
  KeyRound, 
  BookHeart, 
  Plus, 
  Trash2, 
  Search, 
  Copy, 
  Check, 
  X, 
  ChevronRight, 
  Calendar,
  Eye,
  EyeOff,
  Edit2,
  LockKeyhole,
  MessageSquare
} from 'lucide-react';
import { VaultNote, VaultPassword, VaultDiary } from '../types';
import { SecureWindowManager } from '../services/SecureWindowManager';

interface SecretVaultProps {
  vaultNotes: VaultNote[];
  vaultPasswords: VaultPassword[];
  vaultDiaries: VaultDiary[];
  addNote: (title: string, content: string) => void;
  updateNote: (id: string, title: string, content: string) => void;
  deleteNote: (id: string) => void;
  addPassword: (siteName: string, username: string, passwordVal: string, notes?: string) => void;
  deletePassword: (id: string) => void;
  addDiaryEntry: (entry: string, mood: VaultDiary['mood']) => void;
  deleteDiaryEntry: (id: string) => void;
  onLock: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenSettings: () => void;
  onOpenMessenger?: () => void;
}

type VaultTab = 'notes' | 'passwords' | 'diary';

export default function SecretVault({
  vaultNotes,
  vaultPasswords,
  vaultDiaries,
  addNote,
  updateNote,
  deleteNote,
  addPassword,
  deletePassword,
  addDiaryEntry,
  deleteDiaryEntry,
  onLock,
  showToast,
  onOpenSettings,
  onOpenMessenger
}: SecretVaultProps) {
  const [activeTab, setActiveTab] = useState<VaultTab>('notes');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals / Form states
  const [activeModal, setActiveModal] = useState<'none' | 'add-note' | 'view-note' | 'add-password' | 'add-diary'>('none');
  const [selectedNote, setSelectedNote] = useState<VaultNote | null>(null);

  // Form Inputs
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);

  const [siteName, setSiteName] = useState('');
  const [username, setUsername] = useState('');
  const [passVal, setPassVal] = useState('');
  const [passNotes, setPassNotes] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const [diaryEntry, setDiaryEntry] = useState('');
  const [diaryMood, setDiaryMood] = useState<VaultDiary['mood']>('neutral');

  // Copy indicator state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Activate Secure Screenshot Protection on Mount
  useEffect(() => {
    const secureWindow = SecureWindowManager.getInstance();
    secureWindow.enableSecureMode();
    return () => {
      secureWindow.disableSecureMode();
    };
  }, []);

  const handleCopy = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      showToast('Copied to clipboard', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      // Fallback
      showToast(`Copy failed, text: ${text}`, 'info');
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openAddNoteModal = () => {
    setNoteTitle('');
    setNoteContent('');
    setIsEditingNote(false);
    setActiveModal('add-note');
  };

  const openViewNoteModal = (note: VaultNote) => {
    setSelectedNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setIsEditingNote(false);
    setActiveModal('view-note');
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) {
      showToast('Note content is required.', 'error');
      return;
    }
    if (isEditingNote && selectedNote) {
      updateNote(selectedNote.id, noteTitle, noteContent);
      showToast('Note updated.', 'success');
    } else {
      addNote(noteTitle, noteContent);
    }
    setActiveModal('none');
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName.trim() || !username.trim() || !passVal.trim()) {
      showToast('Website, Username, and Password are required.', 'error');
      return;
    }
    addPassword(siteName, username, passVal, passNotes);
    setSiteName('');
    setUsername('');
    setPassVal('');
    setPassNotes('');
    setActiveModal('none');
  };

  const handleSaveDiary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!diaryEntry.trim()) {
      showToast('Diary text is required.', 'error');
      return;
    }
    addDiaryEntry(diaryEntry, diaryMood);
    setDiaryEntry('');
    setDiaryMood('neutral');
    setActiveModal('none');
  };

  // Filter lists based on search
  const filteredNotes = vaultNotes.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPasswords = vaultPasswords.filter(p => 
    p.siteName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDiaries = vaultDiaries.filter(d => 
    d.entry.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.date.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const moods: { type: VaultDiary['mood']; label: string; icon: string; color: string }[] = [
    { type: 'happy', label: 'Happy', icon: '😊', color: 'bg-emerald-500/20 text-emerald-400' },
    { type: 'neutral', label: 'Neutral', icon: '😐', color: 'bg-blue-500/20 text-blue-400' },
    { type: 'sad', label: 'Sad', icon: '😢', color: 'bg-indigo-500/20 text-indigo-400' },
    { type: 'excited', label: 'Excited', icon: '🤩', color: 'bg-amber-500/20 text-amber-400' },
    { type: 'tired', label: 'Tired', icon: '😴', color: 'bg-neutral-500/20 text-neutral-400' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-neutral-100 font-sans select-none overflow-hidden relative">
      
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-900 bg-[#0a0a0a] sticky top-0 z-10">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#121212] border border-neutral-800 flex items-center justify-center font-black text-neutral-200">
            <LockKeyhole size={14} />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-neutral-100 block">SECRET VAULT</span>
            <span className="text-[9px] text-neutral-500 font-medium uppercase tracking-wider font-mono">Encrypted Storage</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-1.5">
          {onOpenMessenger && (
            <button
              onClick={onOpenMessenger}
              className="p-2.5 rounded-xl hover:bg-neutral-900 border border-transparent hover:border-neutral-800 text-neutral-400 hover:text-neutral-200 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center transition-all"
              aria-label="Secret Messenger"
              title="Secret Messenger"
            >
              <MessageSquare size={16} />
            </button>
          )}
          <button 
            onClick={onOpenSettings}
            className="p-2.5 rounded-xl hover:bg-neutral-900 border border-transparent hover:border-neutral-800 text-neutral-400 hover:text-neutral-200 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center transition-all"
            aria-label="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
          
          <button
            onClick={onLock}
            className="px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-rose-400 hover:bg-rose-950/10 hover:border-rose-950 text-xs font-medium transition-all flex items-center space-x-1.5 cursor-pointer min-h-[44px]"
            aria-label="Quick Lock"
          >
            <Lock size={11} />
            <span>Lock</span>
          </button>
        </div>
      </div>

      {/* Tabs Menu Navigation */}
      <div className="flex border-b border-neutral-900 bg-[#0a0a0a] p-2 gap-1.5 flex-none">
        <button
          onClick={() => { setActiveTab('notes'); setSearchQuery(''); }}
          className={`flex-1 py-2.5 px-3 rounded-xl font-semibold text-xs tracking-wide transition-all flex items-center justify-center space-x-2 cursor-pointer min-h-[44px] ${
            activeTab === 'notes' ? 'bg-neutral-200 text-neutral-950 font-bold shadow-sm shadow-black/25' : 'text-neutral-400 hover:bg-[#121212] hover:text-neutral-100'
          }`}
        >
          <FileText size={13} />
          <span>Notes</span>
        </button>
        <button
          onClick={() => { setActiveTab('passwords'); setSearchQuery(''); }}
          className={`flex-1 py-2.5 px-3 rounded-xl font-semibold text-xs tracking-wide transition-all flex items-center justify-center space-x-2 cursor-pointer min-h-[44px] ${
            activeTab === 'passwords' ? 'bg-neutral-200 text-neutral-950 font-bold shadow-sm shadow-black/25' : 'text-neutral-400 hover:bg-[#121212] hover:text-neutral-100'
          }`}
        >
          <KeyRound size={13} />
          <span>Accounts</span>
        </button>
        <button
          onClick={() => { setActiveTab('diary'); setSearchQuery(''); }}
          className={`flex-1 py-2.5 px-3 rounded-xl font-semibold text-xs tracking-wide transition-all flex items-center justify-center space-x-2 cursor-pointer min-h-[44px] ${
            activeTab === 'diary' ? 'bg-neutral-200 text-neutral-950 font-bold shadow-sm shadow-black/25' : 'text-neutral-400 hover:bg-[#121212] hover:text-neutral-100'
          }`}
        >
          <BookHeart size={13} />
          <span>Diary</span>
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="p-4 border-b border-neutral-900 bg-[#0a0a0a]/40 flex-none">
        <div className="relative flex items-center">
          <Search size={14} className="absolute left-3.5 text-neutral-500" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#121212] border border-neutral-900 rounded-xl py-2 pl-9 pr-4 text-xs text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-neutral-800 transition-all font-sans"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 text-neutral-500 hover:text-neutral-300 p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#070707]">
        
        {/* TAB NOTES */}
        {activeTab === 'notes' && (
          <>
            {filteredNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center text-neutral-500 space-y-1.5">
                <FileText size={32} className="opacity-25 text-neutral-400" />
                <span className="font-semibold text-xs text-neutral-400">No notes found</span>
                <span className="text-[11px] text-neutral-600 max-w-[200px] leading-relaxed">Add highly secure personal notes here.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredNotes.map(note => (
                  <motion.div
                    key={note.id}
                    onClick={() => openViewNoteModal(note)}
                    whileHover={{ scale: 1.01 }}
                    className="p-4 rounded-xl bg-[#121212]/70 border border-neutral-900/60 hover:border-neutral-800 cursor-pointer transition-all flex flex-col justify-between"
                  >
                    <div>
                      <h3 className="font-bold text-neutral-200 text-sm truncate">{note.title || 'Untitled'}</h3>
                      <p className="text-xs text-neutral-500 mt-2 line-clamp-3 leading-relaxed">{note.content}</p>
                    </div>
                    <div className="text-[10px] text-neutral-600 font-mono mt-4 border-t border-neutral-900/60 pt-2 flex items-center justify-between">
                      <span>Updated: {new Date(note.updatedAt).toLocaleDateString()}</span>
                      <ChevronRight size={11} className="text-neutral-700" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* TAB PASSWORDS */}
        {activeTab === 'passwords' && (
          <>
            {filteredPasswords.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center text-neutral-500 space-y-1.5">
                <KeyRound size={32} className="opacity-25 text-neutral-400" />
                <span className="font-semibold text-xs text-neutral-400">No accounts listed</span>
                <span className="text-[11px] text-neutral-600 max-w-[200px] leading-relaxed">Store login credentials securely.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPasswords.map(p => (
                  <div
                    key={p.id}
                    className="p-4 rounded-xl bg-[#121212]/70 border border-neutral-900/60 flex items-start justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-neutral-200 text-sm truncate">{p.siteName}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2.5 font-mono text-[11px]">
                        <div className="flex items-center space-x-1">
                          <span className="text-neutral-500 select-none">User:</span>
                          <span className="text-neutral-300 truncate select-all">{p.username}</span>
                          <button
                            onClick={() => handleCopy(p.username, `${p.id}-user`)}
                            className="p-1 text-neutral-500 hover:text-neutral-200 transition cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
                            title="Copy username"
                          >
                            <Copy size={11} />
                          </button>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <span className="text-neutral-500 select-none">Pass:</span>
                          <span className="text-neutral-300 font-bold font-mono tracking-wider truncate select-all">
                            {visiblePasswords[p.id] ? p.passwordVal : '••••••••'}
                          </span>
                          <div className="flex items-center">
                            <button
                              onClick={() => togglePasswordVisibility(p.id)}
                              className="p-1 text-neutral-500 hover:text-neutral-200 transition cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
                            >
                              {visiblePasswords[p.id] ? <EyeOff size={11} /> : <Eye size={11} />}
                            </button>
                            <button
                              onClick={() => handleCopy(p.passwordVal, `${p.id}-pass`)}
                              className="p-1 text-neutral-500 hover:text-neutral-200 transition cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
                              title="Copy password"
                            >
                              <Copy size={11} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {p.notes && (
                        <p className="text-[10px] text-neutral-500 mt-2 border-t border-neutral-900/60 pt-1.5 font-sans leading-relaxed">
                          {p.notes}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => deletePassword(p.id)}
                      className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:bg-rose-950/10 hover:border-rose-950/40 hover:text-rose-400 transition cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center flex-none"
                      title="Delete entry"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* TAB DIARY */}
        {activeTab === 'diary' && (
          <>
            {filteredDiaries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center text-neutral-500 space-y-1.5">
                <BookHeart size={32} className="opacity-25 text-neutral-400" />
                <span className="font-semibold text-xs text-neutral-400">No diary logs found</span>
                <span className="text-[11px] text-neutral-600 max-w-[200px] leading-relaxed">Record your daily personal insights.</span>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDiaries.map(d => {
                  const moodInfo = moods.find(m => m.type === d.mood);
                  return (
                    <div
                      key={d.id}
                      className="p-4 rounded-xl bg-[#121212]/70 border border-neutral-900/60 relative"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Calendar size={11} className="text-neutral-500" />
                          <span className="text-xs font-mono font-bold text-neutral-400">{d.date}</span>
                        </div>
                        {moodInfo && (
                          <span className="px-2 py-0.5 rounded-md border border-neutral-800 bg-[#161616] text-[10px] font-medium text-neutral-300 flex items-center space-x-1">
                            <span>{moodInfo.icon}</span>
                            <span>{moodInfo.label}</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-neutral-300 leading-relaxed font-sans mt-3 whitespace-pre-wrap">
                        {d.entry}
                      </p>

                      <div className="flex justify-end mt-4 pt-2 border-t border-neutral-900/60">
                        <button
                          onClick={() => deleteDiaryEntry(d.id)}
                          className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:bg-rose-950/10 hover:border-rose-950/40 hover:text-rose-400 transition cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                          title="Delete entry"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

      </div>

      {/* Dynamic Action Sticky Floating Button */}
      <div className="absolute bottom-6 right-6 z-20">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (activeTab === 'notes') openAddNoteModal();
            else if (activeTab === 'passwords') setActiveModal('add-password');
            else if (activeTab === 'diary') setActiveModal('add-diary');
          }}
          className="w-14 h-14 rounded-full bg-neutral-100 hover:bg-white text-neutral-950 shadow-xl shadow-black/40 flex items-center justify-center cursor-pointer min-w-[44px] min-h-[44px] border border-neutral-200/20"
          aria-label="Add new item"
        >
          <Plus size={22} />
        </motion.button>
      </div>

      {/* --- MODAL DIALOG CONTAINER --- */}
      <AnimatePresence>
        {activeModal !== 'none' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center p-4 overflow-y-auto"
          >
            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.96, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 10 }}
              className="w-full max-w-sm bg-[#0d0d0d] border border-neutral-900 rounded-2xl p-5 shadow-2xl shadow-black flex flex-col max-h-[85vh]"
            >
              
              {/* Form Note Modal */}
              {(activeModal === 'add-note' || activeModal === 'view-note') && (
                <form onSubmit={handleSaveNote} className="flex flex-col h-full space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
                    <h2 className="font-bold text-neutral-200 text-xs tracking-wide uppercase font-mono">
                      {isEditingNote || activeModal === 'add-note' ? (isEditingNote ? 'EDIT SECURED NOTE' : 'NEW SECURED NOTE') : 'VIEW SECURED NOTE'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveModal('none')}
                      className="p-1 rounded-xl text-neutral-500 hover:text-neutral-200 min-w-[44px] min-h-[44px] flex items-center justify-center border border-transparent hover:border-neutral-900"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    <div>
                      <label className="block text-[10px] font-medium text-neutral-500 uppercase tracking-wide mb-1 font-mono">Title</label>
                      <input
                        type="text"
                        placeholder="Note Title"
                        value={noteTitle}
                        onChange={(e) => setNoteTitle(e.target.value)}
                        disabled={activeModal === 'view-note' && !isEditingNote}
                        className="w-full bg-[#121212] border border-neutral-900 rounded-xl px-3 py-2.5 text-xs text-neutral-100 outline-none focus:border-neutral-850 disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-neutral-500 uppercase tracking-wide mb-1 font-mono">Content *</label>
                      <textarea
                        placeholder="Write your secret notes here..."
                        rows={8}
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        disabled={activeModal === 'view-note' && !isEditingNote}
                        className="w-full bg-[#121212] border border-neutral-900 rounded-xl px-3 py-2.5 text-xs text-neutral-100 outline-none focus:border-neutral-850 disabled:opacity-50 resize-none font-sans leading-relaxed"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 border-t border-neutral-900 pt-4 flex-none">
                    {activeModal === 'view-note' && !isEditingNote ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsEditingNote(true)}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-200 text-xs font-medium transition flex items-center justify-center space-x-1.5 cursor-pointer min-h-[44px]"
                        >
                          <Edit2 size={11} />
                          <span>Edit Note</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedNote) {
                              deleteNote(selectedNote.id);
                              setActiveModal('none');
                            }
                          }}
                          className="py-2.5 px-4 rounded-xl bg-neutral-900 border border-neutral-850 text-rose-500 hover:bg-rose-950/10 hover:border-rose-950 transition cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                          title="Delete Note"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setActiveModal('none')}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 hover:text-neutral-200 text-xs font-medium cursor-pointer min-h-[44px]"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-2.5 px-4 rounded-xl bg-neutral-200 hover:bg-white text-neutral-950 text-xs font-bold cursor-pointer min-h-[44px]"
                        >
                          Save
                        </button>
                      </>
                    )}
                  </div>
                </form>
              )}

              {/* Form Password Modal */}
              {activeModal === 'add-password' && (
                <form onSubmit={handleSavePassword} className="flex flex-col h-full space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
                    <h2 className="font-bold text-neutral-200 text-xs tracking-wide uppercase font-mono">SECURE NEW ACCOUNT</h2>
                    <button
                      type="button"
                      onClick={() => setActiveModal('none')}
                      className="p-1 rounded-xl text-neutral-500 hover:text-neutral-200 min-w-[44px] min-h-[44px] flex items-center justify-center border border-transparent hover:border-neutral-900"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    <div>
                      <label className="block text-[10px] font-medium text-neutral-500 uppercase tracking-wide mb-1 font-mono">Website / App Name *</label>
                      <input
                        type="text"
                        placeholder="Google, Netflix, Spotify, etc."
                        value={siteName}
                        onChange={(e) => setSiteName(e.target.value)}
                        className="w-full bg-[#121212] border border-neutral-900 rounded-xl px-3 py-2.5 text-xs text-neutral-100 outline-none focus:border-neutral-850"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-neutral-500 uppercase tracking-wide mb-1 font-mono">Username / Email *</label>
                      <input
                        type="text"
                        placeholder="email@example.com"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-[#121212] border border-neutral-900 rounded-xl px-3 py-2.5 text-xs text-neutral-100 outline-none focus:border-neutral-850"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-neutral-500 uppercase tracking-wide mb-1 font-mono">Password *</label>
                      <input
                        type="text"
                        placeholder="Secure Password"
                        value={passVal}
                        onChange={(e) => setPassVal(e.target.value)}
                        className="w-full bg-[#121212] border border-neutral-900 rounded-xl px-3 py-2.5 text-xs text-neutral-100 outline-none focus:border-neutral-850 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-neutral-500 uppercase tracking-wide mb-1 font-mono">Account Notes (Optional)</label>
                      <input
                        type="text"
                        placeholder="PIN, Recovery Codes, etc."
                        value={passNotes}
                        onChange={(e) => setPassNotes(e.target.value)}
                        className="w-full bg-[#121212] border border-neutral-900 rounded-xl px-3 py-2.5 text-xs text-neutral-100 outline-none focus:border-neutral-850"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 border-t border-neutral-900 pt-4 flex-none">
                    <button
                      type="button"
                      onClick={() => setActiveModal('none')}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 hover:text-neutral-200 text-xs font-medium cursor-pointer min-h-[44px]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 px-4 rounded-xl bg-neutral-200 hover:bg-white text-neutral-950 text-xs font-bold cursor-pointer min-h-[44px]"
                    >
                      Save Account
                    </button>
                  </div>
                </form>
              )}

              {/* Form Diary Modal */}
              {activeModal === 'add-diary' && (
                <form onSubmit={handleSaveDiary} className="flex flex-col h-full space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
                    <h2 className="font-bold text-neutral-200 text-xs tracking-wide uppercase font-mono">NEW DIARY LOG</h2>
                    <button
                      type="button"
                      onClick={() => setActiveModal('none')}
                      className="p-1 rounded-xl text-neutral-500 hover:text-neutral-200 min-w-[44px] min-h-[44px] flex items-center justify-center border border-transparent hover:border-neutral-900"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                    {/* Mood Chooser */}
                    <div>
                      <label className="block text-[10px] font-medium text-neutral-500 uppercase tracking-wide mb-2 font-mono">How is your mood? *</label>
                      <div className="flex justify-between gap-1.5">
                        {moods.map((m) => (
                          <button
                            key={m.type}
                            type="button"
                            onClick={() => setDiaryMood(m.type)}
                            className={`flex-1 py-2 px-1 rounded-xl flex flex-col items-center justify-center text-xs border transition cursor-pointer min-h-[44px] ${
                              diaryMood === m.type 
                                ? 'bg-neutral-200 border-neutral-200 text-neutral-950 scale-102 font-bold shadow-md shadow-black/25' 
                                : 'bg-[#121212]/50 border-neutral-900 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                            }`}
                          >
                            <span className="text-base mb-0.5">{m.icon}</span>
                            <span className="text-[9px] font-bold uppercase">{m.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-medium text-neutral-500 uppercase tracking-wide mb-1 font-mono">Your thoughts *</label>
                      <textarea
                        placeholder="Write your private insights..."
                        rows={6}
                        value={diaryEntry}
                        onChange={(e) => setDiaryEntry(e.target.value)}
                        className="w-full bg-[#121212] border border-neutral-900 rounded-xl px-3.5 py-2.5 text-xs text-neutral-100 outline-none focus:border-neutral-850 resize-none leading-relaxed"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 border-t border-neutral-900 pt-4 flex-none">
                    <button
                      type="button"
                      onClick={() => setActiveModal('none')}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 hover:text-neutral-200 text-xs font-medium cursor-pointer min-h-[44px]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 px-4 rounded-xl bg-neutral-200 hover:bg-white text-neutral-950 text-xs font-bold cursor-pointer min-h-[44px]"
                    >
                      Save Entry
                    </button>
                  </div>
                </form>
              )}

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

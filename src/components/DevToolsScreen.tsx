import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Search, 
  UserPlus, 
  Edit2, 
  Trash2, 
  RefreshCw, 
  Database, 
  ShieldCheck, 
  X, 
  AlertTriangle,
  User,
  Key,
  Calendar,
  Smartphone,
  Save,
  Loader2
} from 'lucide-react';
import { UserRepository } from '../repositories/UserRepository';

interface DevToolsScreenProps {
  onBack: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

interface UserRecord {
  id: string; // Document ID (usually the UID)
  uid: string;
  username: string;
  password?: string;
  createdAt: number;
}

export default function DevToolsScreen({ onBack, showToast }: DevToolsScreenProps) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [userRepo] = useState(() => new UserRepository());

  // Modals state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

  // Modal Form Inputs
  const [formUsername, setFormUsername] = useState<string>('');
  const [formPassword, setFormPassword] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch all users on mount
  const fetchUsers = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const allUsers = await userRepo.getAllUsers();
      // Sort by username ascending or createdAt descending
      const sorted = allUsers.sort((a, b) => b.createdAt - a.createdAt);
      setUsers(sorted);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      showToast('Gagal memuat daftar pengguna.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Format date nicely
  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'Tidak diketahui';
    const date = new Date(timestamp);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filtered users list
  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase().trim();
    return (
      user.username.toLowerCase().includes(query) ||
      user.uid.toLowerCase().includes(query)
    );
  });

  // Handle Username input validation (realtime filtering out of invalid characters)
  const sanitizeUsername = (val: string) => {
    return val.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  // ADD USER ACTION
  const openAddModal = () => {
    setFormUsername('');
    setFormPassword('');
    setFormError(null);
    setShowAddModal(true);
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanUsername = sanitizeUsername(formUsername);
    const cleanPassword = formPassword.trim();

    if (!cleanUsername || cleanUsername.length < 3 || cleanUsername.length > 15) {
      setFormError('Username harus 3-15 karakter.');
      return;
    }

    if (!cleanPassword || cleanPassword.length < 4) {
      setFormError('Sandi minimal harus 4 karakter.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if username is taken
      const exists = users.some(u => u.username === cleanUsername);
      if (exists) {
        setFormError('Username sudah digunakan oleh pengguna lain.');
        setIsSubmitting(false);
        return;
      }

      // Generate random dev uid
      const newUid = 'dev_' + Math.random().toString(36).substr(2, 9);
      const success = await userRepo.registerUsername(newUid, cleanUsername, cleanPassword);
      if (success) {
        showToast('Akun berhasil dibuat!', 'success');
        setShowAddModal(false);
        fetchUsers(true);
      } else {
        setFormError('Username sudah terdaftar.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Gagal membuat pengguna.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // EDIT USER ACTION
  const openEditModal = (user: UserRecord) => {
    setSelectedUser(user);
    setFormUsername(user.username);
    setFormPassword(user.password || '');
    setFormError(null);
    setShowEditModal(true);
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormError(null);

    const cleanUsername = sanitizeUsername(formUsername);
    const cleanPassword = formPassword.trim();

    if (!cleanUsername || cleanUsername.length < 3 || cleanUsername.length > 15) {
      setFormError('Username harus 3-15 karakter.');
      return;
    }

    if (!cleanPassword || cleanPassword.length < 4) {
      setFormError('Sandi minimal harus 4 karakter.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if username is taken by anyone else
      const takenByAnother = users.some(u => u.username === cleanUsername && u.uid !== selectedUser.uid);
      if (takenByAnother) {
        setFormError('Username sudah digunakan oleh pengguna lain.');
        setIsSubmitting(false);
        return;
      }

      const success = await userRepo.updateUser(selectedUser.uid, cleanUsername, cleanPassword);
      if (success) {
        showToast('Detail akun berhasil diperbarui!', 'success');
        setShowEditModal(false);
        fetchUsers(true);
      } else {
        setFormError('Gagal memperbarui username.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Gagal mengubah pengguna.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // DELETE USER ACTION
  const openDeleteModal = (user: UserRecord) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      await userRepo.deleteUser(selectedUser.uid);
      showToast('Akun berhasil dihapus permanent.', 'success');
      setShowDeleteModal(false);
      fetchUsers(true);
    } catch (err: any) {
      showToast('Gagal menghapus pengguna.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#030303] text-neutral-100 font-sans select-none overflow-hidden relative">
      
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-900 bg-[#030303] sticky top-0 z-10">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl hover:bg-neutral-900 text-neutral-400 hover:text-neutral-100 transition-all cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center mr-2 border border-transparent hover:border-neutral-800"
            aria-label="Kembali ke Kalkulator"
            id="dev-btn-back"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-semibold text-neutral-100 text-sm tracking-tight">Kelola Akun</h1>
            <p className="text-[10px] text-rose-500 font-mono tracking-wider uppercase">Console Pengembang</p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => fetchUsers()}
            title="Refresh database"
            aria-label="Refresh database"
            className="p-2.5 rounded-xl hover:bg-neutral-900 text-neutral-400 hover:text-neutral-100 transition-all cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center border border-transparent hover:border-neutral-800"
            id="dev-btn-refresh"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          
          <button
            onClick={openAddModal}
            className="bg-rose-600/90 hover:bg-rose-500 text-white p-2.5 rounded-xl transition cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center shadow-lg shadow-rose-950/20"
            title="Tambah User Baru"
            aria-label="Tambah User Baru"
            id="dev-btn-add-user"
          >
            <UserPlus size={16} />
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="px-4 py-3 bg-[#070707] border-b border-neutral-900/60">
        <div className="relative flex items-center bg-[#0d0d0d] border border-neutral-900 rounded-xl px-3 focus-within:border-neutral-800 transition-all">
          <Search size={14} className="text-neutral-500 mr-2" />
          <input
            type="text"
            placeholder="Cari username atau UID perangkat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-2.5 bg-transparent border-none text-xs text-neutral-100 outline-none placeholder:text-neutral-600 font-sans"
            id="dev-search-input"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* DATABASE STATS BANNER */}
      <div className="px-4 py-2 bg-neutral-950/60 border-b border-neutral-900 flex justify-between items-center text-[10px] font-mono text-neutral-500">
        <div className="flex items-center space-x-1.5 text-neutral-400">
          <Database size={10} />
          <span>Firestore DB</span>
        </div>
        <div>
          <span>Total Terdaftar: <strong className="text-neutral-300 font-semibold">{users.length}</strong></span>
        </div>
      </div>

      {/* LIST OF ACCOUNTS */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          // SKELETON LOADING STATE
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} className="bg-[#090909] border border-neutral-900/80 rounded-2xl p-4 space-y-3 animate-pulse">
                <div className="flex justify-between items-start">
                  <div className="h-4 bg-neutral-900 rounded w-1/3"></div>
                  <div className="h-5 bg-neutral-900 rounded-lg w-12"></div>
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 bg-neutral-900 rounded w-1/2"></div>
                  <div className="h-3 bg-neutral-900 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          // EMPTY STATE
          <div className="h-full flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-neutral-950 border border-neutral-900 text-neutral-600 mb-4">
              <Database size={24} />
            </div>
            <h3 className="text-sm font-semibold text-neutral-300">Tidak ada akun ditemukan</h3>
            <p className="text-xs text-neutral-600 max-w-[240px] mt-1 leading-relaxed">
              {searchQuery ? 'Coba cari dengan kata kunci lain atau bersihkan filter pencarian.' : 'Gunakan tombol + di kanan atas untuk mendaftarkan akun baru secara langsung.'}
            </p>
          </div>
        ) : (
          // LIST CONTENT
          filteredUsers.map((user) => (
            <div 
              key={user.id} 
              className="bg-[#090909] border border-neutral-900/80 rounded-2xl p-4 transition duration-200 hover:border-neutral-850 hover:bg-[#0b0b0b] relative group flex flex-col justify-between"
            >
              {/* Card top row */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-900 text-neutral-400">
                    <User size={15} />
                  </div>
                  <div>
                    <h2 className="text-xs font-semibold text-neutral-200 font-sans tracking-wide">
                      {user.username}
                    </h2>
                    <span className="text-[9px] font-mono bg-rose-950/30 text-rose-400 border border-rose-900/40 px-1.5 py-0.5 rounded-md inline-block mt-0.5">
                      {user.password || 'no-pass'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => openEditModal(user)}
                    className="p-2 rounded-xl bg-neutral-950 border border-neutral-900 hover:bg-neutral-900 text-neutral-400 hover:text-neutral-100 transition min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
                    title="Ubah info user"
                    aria-label="Ubah info user"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={() => openDeleteModal(user)}
                    className="p-2 rounded-xl bg-rose-950/20 border border-rose-900/20 hover:bg-rose-900 text-rose-400 hover:text-white transition min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
                    title="Hapus user"
                    aria-label="Hapus user"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Card details */}
              <div className="space-y-1.5 border-t border-neutral-900/50 pt-2.5 text-[10px] font-mono text-neutral-500">
                <div className="flex items-center justify-between">
                  <span className="flex items-center"><Smartphone size={10} className="mr-1" /> Device ID/UID</span>
                  <span className="text-neutral-400 font-semibold truncate max-w-[150px]" title={user.uid}>{user.uid}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center"><Calendar size={10} className="mr-1" /> Waktu Daftar</span>
                  <span className="text-neutral-400">{formatDate(user.createdAt)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* FOOTER */}
      <div className="p-4 border-t border-neutral-900 bg-[#040404]/80 backdrop-blur-md flex items-center justify-center text-[10px] text-neutral-600 font-mono space-x-1.5">
        <ShieldCheck size={11} className="text-emerald-500" />
        <span>Sesi Aman Admin terhubung secara terenkripsi</span>
      </div>

      {/* --- ADD MODAL DIALOG --- */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-[#0a0a0a] border border-neutral-800 rounded-3xl p-5 w-full max-w-sm relative z-10 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-neutral-900">
                <div className="flex items-center space-x-2 text-rose-500">
                  <UserPlus size={16} />
                  <h3 className="font-semibold text-xs text-neutral-200 tracking-wide uppercase font-mono">Tambah User Baru</h3>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 text-neutral-500 hover:text-neutral-300 transition"
                  aria-label="Tutup"
                >
                  <X size={16} />
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-rose-950/20 border border-rose-900/30 text-rose-400 text-xs rounded-xl flex items-start space-x-2">
                  <AlertTriangle size={14} className="mt-0.5 flex-none" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleAddUserSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="modal-add-username" className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">Username *</label>
                  <div className="relative flex items-center bg-neutral-950 border border-neutral-900 rounded-xl px-3 focus-within:border-neutral-850">
                    <User size={13} className="text-neutral-500 mr-2 flex-none" />
                    <input
                      id="modal-add-username"
                      type="text"
                      placeholder="Contoh: alex01"
                      value={formUsername}
                      onChange={(e) => {
                        setFormUsername(sanitizeUsername(e.target.value));
                        setFormError(null);
                      }}
                      required
                      autoFocus
                      className="w-full py-3 bg-transparent border-none text-xs text-neutral-100 outline-none placeholder:text-neutral-700"
                    />
                  </div>
                  <span className="text-[9px] text-neutral-600 block leading-tight">Hanya huruf kecil (a-z) dan angka (0-9). Tanpa spasi/simbol.</span>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="modal-add-password" className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">Kata Sandi *</label>
                  <div className="relative flex items-center bg-neutral-950 border border-neutral-900 rounded-xl px-3 focus-within:border-neutral-850">
                    <Key size={13} className="text-neutral-500 mr-2 flex-none" />
                    <input
                      id="modal-add-password"
                      type="text"
                      placeholder="Minimal 4 karakter"
                      value={formPassword}
                      onChange={(e) => {
                        setFormPassword(e.target.value);
                        setFormError(null);
                      }}
                      required
                      className="w-full py-3 bg-transparent border-none text-xs text-neutral-100 outline-none placeholder:text-neutral-700"
                    />
                  </div>
                </div>

                <div className="pt-2 flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 text-xs font-semibold text-neutral-400 hover:bg-neutral-900 rounded-xl transition cursor-pointer min-h-[44px]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !formUsername || !formPassword}
                    className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl transition cursor-pointer min-h-[44px] flex items-center justify-center space-x-2 disabled:bg-[#121212] disabled:text-neutral-700 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Save size={13} />
                    )}
                    <span>Simpan</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- EDIT MODAL DIALOG --- */}
      <AnimatePresence>
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowEditModal(false)}
            />
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-[#0a0a0a] border border-neutral-800 rounded-3xl p-5 w-full max-w-sm relative z-10 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-neutral-900">
                <div className="flex items-center space-x-2 text-rose-500">
                  <Edit2 size={14} />
                  <h3 className="font-semibold text-xs text-neutral-200 tracking-wide uppercase font-mono">Ubah Akun Pengguna</h3>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1 text-neutral-500 hover:text-neutral-300 transition"
                  aria-label="Tutup"
                >
                  <X size={16} />
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-rose-950/20 border border-rose-900/30 text-rose-400 text-xs rounded-xl flex items-start space-x-2">
                  <AlertTriangle size={14} className="mt-0.5 flex-none" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleEditUserSubmit} className="space-y-4">
                <div className="p-3 rounded-xl bg-[#0e0e0e] border border-neutral-900 text-[10px] font-mono text-neutral-500 space-y-1">
                  <div>UID: <span className="text-neutral-300 font-semibold">{selectedUser.uid}</span></div>
                  <div>Terdaftar: <span className="text-neutral-300">{formatDate(selectedUser.createdAt)}</span></div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="modal-edit-username" className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">Username *</label>
                  <div className="relative flex items-center bg-neutral-950 border border-neutral-900 rounded-xl px-3 focus-within:border-neutral-850">
                    <User size={13} className="text-neutral-500 mr-2 flex-none" />
                    <input
                      id="modal-edit-username"
                      type="text"
                      placeholder="Contoh: alex01"
                      value={formUsername}
                      onChange={(e) => {
                        setFormUsername(sanitizeUsername(e.target.value));
                        setFormError(null);
                      }}
                      required
                      autoFocus
                      className="w-full py-3 bg-transparent border-none text-xs text-neutral-100 outline-none placeholder:text-neutral-700"
                    />
                  </div>
                  <span className="text-[9px] text-neutral-600 block leading-tight">Hanya huruf kecil (a-z) dan angka (0-9). Tanpa spasi/simbol.</span>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="modal-edit-password" className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">Kata Sandi Baru *</label>
                  <div className="relative flex items-center bg-neutral-950 border border-neutral-900 rounded-xl px-3 focus-within:border-neutral-850">
                    <Key size={13} className="text-neutral-500 mr-2 flex-none" />
                    <input
                      id="modal-edit-password"
                      type="text"
                      placeholder="Minimal 4 karakter"
                      value={formPassword}
                      onChange={(e) => {
                        setFormPassword(e.target.value);
                        setFormError(null);
                      }}
                      required
                      className="w-full py-3 bg-transparent border-none text-xs text-neutral-100 outline-none placeholder:text-neutral-700"
                    />
                  </div>
                </div>

                <div className="pt-2 flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 py-3 text-xs font-semibold text-neutral-400 hover:bg-neutral-900 rounded-xl transition cursor-pointer min-h-[44px]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !formUsername || !formPassword}
                    className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl transition cursor-pointer min-h-[44px] flex items-center justify-center space-x-2 disabled:bg-[#121212] disabled:text-neutral-700 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Save size={13} />
                    )}
                    <span>Simpan</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- DELETE CONFIRMATION MODAL DIALOG --- */}
      <AnimatePresence>
        {showDeleteModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowDeleteModal(false)}
            />
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-[#0a0a0a] border border-neutral-800 rounded-3xl p-5 w-full max-w-sm relative z-10 shadow-2xl space-y-4"
            >
              <div className="flex items-center space-x-3 text-rose-500 pb-2 border-b border-neutral-900">
                <AlertTriangle size={20} className="text-rose-500 flex-none" />
                <h3 className="font-semibold text-xs text-neutral-200 tracking-wide uppercase font-mono">Hapus Akun Permanent</h3>
              </div>

              <div className="space-y-2.5">
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Apakah Anda yakin ingin menghapus akun <strong className="text-neutral-200">{selectedUser.username}</strong> secara permanen dari database?
                </p>
                <div className="p-3 bg-rose-950/10 border border-rose-900/20 text-[10px] text-rose-400/90 rounded-xl leading-relaxed">
                  Tindakan ini tidak dapat dibatalkan. Pengguna ini tidak akan bisa login kembali ke sistem ini kecuali didaftarkan ulang.
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-3 text-xs font-semibold text-neutral-400 hover:bg-neutral-900 rounded-xl transition cursor-pointer min-h-[44px] disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl transition cursor-pointer min-h-[44px] flex items-center justify-center space-x-2 disabled:bg-neutral-900"
                >
                  {isSubmitting ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Trash2 size={13} />
                  )}
                  <span>Hapus Akun</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

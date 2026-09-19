import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Plus, Trash2, Shield, Eye, EyeOff, RefreshCw, Check } from 'lucide-react';
import { WordMappingItem } from '../types';
import { applyWordMapping } from '../utils/WordMappingHelper';

interface WordMappingConfigScreenProps {
  wordMappings: WordMappingItem[];
  onAdd: (originalWord: string, mappedWord: string) => void;
  onUpdate: (id: string, updates: Partial<WordMappingItem>) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onClearAll: () => void;
  onBack: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function WordMappingConfigScreen({
  wordMappings,
  onAdd,
  onUpdate,
  onDelete,
  onToggle,
  onClearAll,
  onBack,
  showToast,
}: WordMappingConfigScreenProps) {
  const [origInput, setOrigInput] = useState('');
  const [mappedInput, setMappedInput] = useState('');
  const [testText, setTestText] = useState('halo bos, bawa uang rahasia sekarang');

  const handleAddSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const orig = origInput.trim();
    const mapped = mappedInput.trim();

    if (!orig) {
      showToast('Masukkan kata asli.', 'error');
      return;
    }
    if (!mapped) {
      showToast('Masukkan kata pengganti.', 'error');
      return;
    }

    onAdd(orig, mapped);
    setOrigInput('');
    setMappedInput('');
  };

  const previewOutput = applyWordMapping(testText, wordMappings);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-neutral-100 font-sans select-none overflow-hidden relative">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-neutral-900 bg-[#0a0a0a] sticky top-0 z-20">
        <div className="flex items-center space-x-2.5">
          <button
            onClick={onBack}
            className="p-2 rounded-xl hover:bg-neutral-900 text-neutral-400 hover:text-neutral-100 transition-all cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center border border-transparent hover:border-neutral-800"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-semibold text-sm tracking-tight text-neutral-100">
              Konfigurasi Word Mapping
            </h1>
            <span className="text-[11px] text-emerald-400 font-mono">
              [PIN 5000: Sisi Klien 'Saya']
            </span>
          </div>
        </div>

        {wordMappings.length > 0 && (
          <button
            onClick={() => {
              if (confirm('Hapus semua aturan pemetaan kata?')) {
                onClearAll();
              }
            }}
            className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-rose-950/30 text-neutral-400 hover:text-rose-400 border border-neutral-800 hover:border-rose-900 text-xs font-mono transition cursor-pointer"
          >
            Hapus Semua
          </button>
        )}
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6 max-w-2xl mx-auto w-full">
        {/* Info Banner */}
        <div className="p-4 bg-[#111113] border border-neutral-850 rounded-xl space-y-1.5 text-xs text-neutral-300 font-mono leading-relaxed">
          <div className="text-emerald-400 font-bold flex items-center gap-1.5">
            <Shield size={14} />
            <span>PROTEKSI VISUAL LOKAL AKTIF</span>
          </div>
          <p className="text-neutral-400 text-[11px]">
            Pemetaan kata hanya berlaku dan terlihat di sisi perangkat <strong>'saya'</strong>.
            Setiap pesan masuk dan keluar otomatis berubah menjadi kata pengganti.
            Di sisi <strong>'dia'</strong> (lawan bicara), pesan asli tetap muncul tanpa pemetaan.
          </p>
        </div>

        {/* Add New Word Mapping Form */}
        <div className="bg-[#111113] border border-neutral-850 rounded-xl p-4 space-y-3">
          <span className="text-xs font-semibold text-neutral-200 uppercase tracking-wider font-mono block">
            + Tambah Pemetaan Kata Baru
          </span>

          <form onSubmit={handleAddSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1 font-mono">
                  Kata Asli (yang ingin disamarkan)
                </label>
                <input
                  type="text"
                  placeholder="misal: rahasia"
                  value={origInput}
                  onChange={(e) => setOrigInput(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 font-mono text-xs focus:outline-none focus:border-emerald-500 transition placeholder:text-neutral-600"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1 font-mono">
                  Kata Pengganti (tampilan di sisi 'saya')
                </label>
                <input
                  type="text"
                  placeholder="misal: buku"
                  value={mappedInput}
                  onChange={(e) => setMappedInput(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 font-mono text-xs focus:outline-none focus:border-emerald-500 transition placeholder:text-neutral-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!origInput.trim() || !mappedInput.trim()}
              className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-900 disabled:text-neutral-600 text-white font-mono text-xs font-semibold transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              <Plus size={14} />
              <span>Simpan Pemetaan Kata</span>
            </button>
          </form>
        </div>

        {/* Live Interactive Sandbox Preview */}
        <div className="bg-[#111113] border border-neutral-850 rounded-xl p-4 space-y-2.5">
          <span className="text-xs font-semibold text-neutral-200 uppercase tracking-wider font-mono block">
            Uji Coba Tampilan Langsung (Live Preview)
          </span>
          <div className="space-y-1.5">
            <span className="text-[10px] text-neutral-500 font-mono">Ketik kalimat uji coba (pesan asli):</span>
            <input
              type="text"
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 font-mono text-xs focus:outline-none focus:border-neutral-700 transition"
            />
          </div>

          <div className="p-3 bg-[#0a0a0a] border border-neutral-800 rounded-lg space-y-1">
            <span className="text-[10px] text-emerald-400 font-mono block">Hasil Tampilan di Sisi 'Saya':</span>
            <div className="text-neutral-100 font-mono text-xs break-all select-text">
              &gt; {previewOutput || '<kosong>'}
            </div>
          </div>
        </div>

        {/* List of Active Mappings */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider font-mono">
              Daftar Pemetaan Aktif ({wordMappings.length})
            </span>
          </div>

          {wordMappings.length === 0 ? (
            <div className="p-8 text-center bg-[#111113] border border-neutral-850 rounded-xl text-neutral-500 text-xs font-mono">
              Belum ada kata yang dipetakan. Tambahkan kata baru menggunakan form di atas.
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {wordMappings.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`flex items-center justify-between p-3 rounded-xl border transition ${
                      item.enabled !== false
                        ? 'bg-[#111113] border-neutral-800'
                        : 'bg-[#0e0e10] border-neutral-900 opacity-60'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => onToggle(item.id)}
                        className={`p-1.5 rounded-lg border transition cursor-pointer ${
                          item.enabled !== false
                            ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-400'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-600'
                        }`}
                        title={item.enabled !== false ? 'Nonaktifkan' : 'Aktifkan'}
                      >
                        <Check size={12} className={item.enabled !== false ? 'opacity-100' : 'opacity-0'} />
                      </button>

                      <div className="flex items-center space-x-2 font-mono text-xs truncate flex-1">
                        <span className="text-neutral-200 font-semibold truncate">
                          "{item.originalWord}"
                        </span>
                        <span className="text-emerald-500 font-bold shrink-0">→</span>
                        <span className="text-emerald-400 font-semibold truncate">
                          "{item.mappedWord}"
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDelete(item.id)}
                      className="p-2 rounded-lg hover:bg-rose-950/20 text-neutral-500 hover:text-rose-400 border border-transparent hover:border-rose-900/40 transition cursor-pointer shrink-0 ml-2"
                      title="Hapus pemetaan"
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

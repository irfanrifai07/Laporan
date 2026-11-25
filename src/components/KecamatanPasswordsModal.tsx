/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  X,
  Search,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  ShieldCheck,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthUser } from '../types';
import { getKecamatanAccountsWithPasswords } from '../utils/authManager';

interface KecamatanPasswordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
  customPasswords: Record<string, string>;
}

export const KecamatanPasswordsModal: React.FC<KecamatanPasswordsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  customPasswords
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllPasswords, setShowAllPasswords] = useState(true);
  const [hiddenRows, setHiddenRows] = useState<Record<string, boolean>>({});
  const [copiedUser, setCopiedUser] = useState<string | null>(null);

  const accounts = useMemo(
    () => getKecamatanAccountsWithPasswords(customPasswords),
    [customPasswords]
  );

  const filteredAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (acc) =>
        acc.namaKecamatan.toLowerCase().includes(q) ||
        acc.username.toLowerCase().includes(q)
    );
  }, [accounts, searchQuery]);

  // Hanya Administrator Kabupaten yang diizinkan melihat sandi seluruh kecamatan
  if (!isOpen || currentUser.role !== 'admin' || currentUser.kecamatan) {
    return null;
  }

  const isRowVisible = (username: string) => {
    if (showAllPasswords) {
      return !hiddenRows[username];
    }
    return Boolean(hiddenRows[username]);
  };

  const toggleRowVisibility = (username: string) => {
    setHiddenRows((prev) => ({
      ...prev,
      [username]: !prev[username],
    }));
  };

  const handleToggleAll = () => {
    setShowAllPasswords((prev) => !prev);
    setHiddenRows({});
  };

  const handleCopyPassword = async (username: string, password: string) => {
    try {
      await navigator.clipboard.writeText(password);
      setCopiedUser(username);
      setTimeout(() => {
        setCopiedUser((prev) => (prev === username ? null : prev));
      }, 1600);
    } catch {
      // Fallback jika clipboard API dibatasi
      setCopiedUser(null);
    }
  };

  const customCount = accounts.filter((a) => a.isCustom).length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="w-full max-w-3xl max-h-[92dvh] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-850 border-b border-slate-700/80 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-black text-slate-100 uppercase tracking-tight truncate">
                  Daftar Sandi 28 Kecamatan
                </h3>
                <p className="text-[11px] text-teal-400 font-semibold truncate">
                  Khusus Administrator Kabupaten &bull; Sinkron Real-Time
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Info & Filter Bar */}
          <div className="px-4 sm:px-6 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama kecamatan..."
                className="w-full bg-slate-950 border border-slate-700 focus:border-teal-500 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  title="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 flex-wrap">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 font-semibold">
                  {filteredAccounts.length}/28 Kec.
                </span>
                {customCount > 0 && (
                  <span className="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
                    {customCount} Diubah
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleToggleAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
              >
                {showAllPasswords ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                    <span>Sembunyikan</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-teal-400" />
                    <span>Tampilkan Semua</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Body: Mobile Card List + Desktop Table */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
            {filteredAccounts.length === 0 ? (
              <div className="py-12 px-4 text-center text-slate-400 space-y-2">
                <Search className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-bold text-slate-300">Kecamatan tidak ditemukan</p>
                <p className="text-xs text-slate-500">
                  Tidak ada kecamatan yang cocok dengan &ldquo;{searchQuery}&rdquo;.
                </p>
              </div>
            ) : (
              <>
                {/* Tampilan Mobile (Kartu agar rapi tanpa scroll kanan-kiri) */}
                <div className="sm:hidden divide-y divide-slate-800">
                  {filteredAccounts.map((acc, idx) => {
                    const visible = isRowVisible(acc.username);
                    const isCopied = copiedUser === acc.username;
                    return (
                      <div key={acc.username} className="p-3.5 space-y-2 bg-slate-900/50">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 shrink-0">
                              #{idx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-black text-slate-100 truncate">
                                {acc.namaKecamatan}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                Username: <span className="font-mono text-teal-400 font-bold">{acc.username}</span>
                              </div>
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${
                              acc.isCustom
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {acc.isCustom ? 'Diubah' : 'Standar'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <KeyRound className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                            <span className="font-mono text-xs font-bold text-slate-100 truncate select-all">
                              {visible ? acc.activePassword : '••••••••'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => toggleRowVisibility(acc.username)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                              title={visible ? 'Sembunyikan sandi' : 'Lihat sandi'}
                            >
                              {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyPassword(acc.username, acc.activePassword)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                                isCopied
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-teal-500/15 text-teal-300 border border-teal-500/30 hover:bg-teal-500/25'
                              }`}
                            >
                              {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              <span>{isCopied ? 'Tersalin' : 'Salin'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Tampilan Desktop/Tablet */}
                <div className="hidden sm:block">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-950/95 border-b border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400 z-10">
                      <tr>
                        <th className="px-4 py-3 text-center w-12">No</th>
                        <th className="px-4 py-3">Kecamatan / Username</th>
                        <th className="px-4 py-3">Kata Sandi Aktif</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-right w-36">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-xs">
                      {filteredAccounts.map((acc, idx) => {
                        const visible = isRowVisible(acc.username);
                        const isCopied = copiedUser === acc.username;
                        return (
                          <tr key={acc.username} className="hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 py-2.5 text-center text-slate-500 font-semibold">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="font-bold text-slate-100">{acc.namaKecamatan}</div>
                              <div className="text-[10px] font-mono text-teal-400 font-semibold">
                                {acc.username}
                              </div>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 font-mono font-bold text-slate-100 select-all">
                                {visible ? acc.activePassword : '••••••••'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span
                                className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${
                                  acc.isCustom
                                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                }`}
                              >
                                {acc.isCustom ? 'Diubah Pengguna' : 'Standar'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => toggleRowVisibility(acc.username)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                                  title={visible ? 'Sembunyikan sandi' : 'Lihat sandi'}
                                >
                                  {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCopyPassword(acc.username, acc.activePassword)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                                    isCopied
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-teal-500/15 text-teal-300 border border-teal-500/30 hover:bg-teal-500/25'
                                  }`}
                                >
                                  {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                  <span>{isCopied ? 'Tersalin' : 'Salin'}</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-6 py-3 bg-slate-850 border-t border-slate-700/80 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-[11px] text-slate-400 min-w-0">
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
              <span className="truncate">
                Jika kecamatan mengganti sandi di perangkatnya, daftar ini otomatis terperbarui.
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              Tutup
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

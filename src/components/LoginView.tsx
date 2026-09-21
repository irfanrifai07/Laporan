/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Lock, User, Eye, EyeOff, ShieldCheck, 
  ChevronRight, AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { AuthUser } from '../types';
import { authenticateAccount } from '../utils/authManager';
import logoBojonegoro from '../assets/logo_bojonegoro.svg';

interface LoginViewProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Silakan masukkan nama pengguna dan kata sandi.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const result = authenticateAccount(username, password);

      if (result.success && result.user) {
        if (rememberMe) {
          try {
            localStorage.setItem('laporan_kb_auth_user', JSON.stringify(result.user));
          } catch {
            // Ignore storage errors
          }
        }
        setIsSubmitting(false);
        onLoginSuccess(result.user);
      } else {
        setIsSubmitting(false);
        setErrorMsg(result.error || 'Autentikasi gagal.');
      }
    }, 350);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans select-none">
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-teal-600/10 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-600/10 blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-slate-900/60 blur-[120px] pointer-events-none"></div>

      {/* Top Header Bar */}
      <header className="relative z-10 w-full border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img 
            src={logoBojonegoro} 
            alt="Logo Pemkab Bojonegoro" 
            className="w-9 h-11 object-contain drop-shadow-md" 
          />
          <div>
            <span className="text-xs font-black tracking-wider text-slate-200 block uppercase">
              Pemerintah Kabupaten Bojonegoro
            </span>
            <span className="text-[10px] font-bold text-teal-400 block tracking-wide">
              Dinas Pemberdayaan Perempuan, Perlindungan Anak dan KB
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-2 text-[11px] text-slate-400 bg-slate-800/80 border border-slate-700/70 px-3 py-1.5 rounded-full">
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <span>Sistem Informasi Capaian KB Terintegrasi</span>
        </div>
      </header>

      {/* Main Form Center Box */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/60 backdrop-blur-xl"
        >
          {/* Logo & Headline */}
          <div className="text-center mb-6">
            <div className="inline-block relative mb-3">
              <div className="absolute -inset-1.5 rounded-2xl bg-teal-500/20 blur-md"></div>
              <img 
                src={logoBojonegoro} 
                alt="Logo Bojonegoro" 
                className="relative w-16 h-20 mx-auto object-contain drop-shadow-xl" 
              />
            </div>
            <h1 className="text-lg sm:text-xl font-black text-slate-100 uppercase tracking-tight">
              Masuk ke Aplikasi
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Monitoring dan Pelaporan Capaian Pelayanan KB
            </p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Nama Pengguna (Username)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: NGRAHO atau ADMIN"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Kata Sandi (Password)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center space-x-2 text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-teal-500 focus:ring-teal-500 focus:ring-offset-0 focus:ring-offset-slate-900 cursor-pointer"
                />
                <span>Ingat saya di perangkat ini</span>
              </label>
              <span className="text-teal-400 text-[11px] font-semibold">Terkoneksi Aman</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-teal-500/20 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <span>Masuk Sekarang</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-3 text-center text-[11px] text-slate-500 border-t border-slate-900 bg-slate-950/80">
        <p>
          &copy; {new Date().getFullYear()} Pemerintah Kabupaten Bojonegoro &bull; Dinas PPPA-KB &bull; <span className="text-slate-400">Jer Karta Raharja Mawan Karya</span>
        </p>
      </footer>
    </div>
  );
};

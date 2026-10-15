/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Target, Search, X, Edit3, 
  Layers, ShieldCheck, Info, Calendar, Plus, 
  Save, RotateCcw, CheckCircle2, Sliders, AlertCircle, Copy, Check
} from 'lucide-react';
import { 
  KECAMATAN_LIST, 
  ContraceptiveMethod, 
  METHOD_KEYS 
} from '../types';
import { 
  PpmTargetMap, 
  RAW_PPM_DATA, 
  calculatePpmTargetsList, 
  calculateKabupatenPpmTotal,
  getActivePpmTargets,
  getActivePpmYear
} from '../data/ppmData';

interface PpmViewProps {
  onOpenEntrySidebar?: (kecamatan?: string) => void;
  currentPpmTargets?: PpmTargetMap;
  currentYear?: string;
  availableYears?: string[];
  onSaveTargets?: (year: string, targets: PpmTargetMap) => Promise<void>;
  onYearChange?: (year: string) => void;
  isAdmin?: boolean;
}

export const PpmView: React.FC<PpmViewProps> = ({ 
  onOpenEntrySidebar,
  currentPpmTargets,
  currentYear = '2026',
  availableYears = ['2026'],
  onSaveTargets,
  onYearChange,
  isAdmin = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKec, setSelectedKec] = useState<string | null>(null);

  // Active target map used for display
  const activeTargets: PpmTargetMap = useMemo(() => {
    return currentPpmTargets || getActivePpmTargets() || RAW_PPM_DATA;
  }, [currentPpmTargets]);

  const activeYear: string = currentYear || getActivePpmYear() || '2026';

  // State untuk modal edit target PPM
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editMode, setEditMode] = useState<'single' | 'table'>('single');
  const [editTargetYear, setEditTargetYear] = useState<string>(activeYear);
  const [editingKecamatan, setEditingKecamatan] = useState<string>('NGRAHO');
  const [tempTargets, setTempTargets] = useState<PpmTargetMap>(activeTargets);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [showAddYearModal, setShowAddYearModal] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');

  // Sinkronkan tempTargets setiap kali modal edit dibuka
  useEffect(() => {
    if (isEditModalOpen) {
      setTempTargets(JSON.parse(JSON.stringify(activeTargets)));
      setEditTargetYear(activeYear);
    }
  }, [isEditModalOpen, activeTargets, activeYear]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(Math.round(num || 0));
  };

  // List data terstruktur untuk tabel utama
  const targetList = useMemo(() => {
    return calculatePpmTargetsList(activeTargets);
  }, [activeTargets]);

  // Total Kabupaten Bojonegoro
  const totalBojonegoro = useMemo(() => {
    return calculateKabupatenPpmTotal(targetList);
  }, [targetList]);

  // Filter baris kecamatan
  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return targetList;
    return targetList.filter(item => 
      item.kecamatan.toLowerCase().includes(q)
    );
  }, [searchQuery, targetList]);

  // Handler perubahan angka di modal edit untuk kecamatan & metode tertentu
  const handleMethodInputChange = (
    kec: string,
    method: ContraceptiveMethod,
    valueStr: string
  ) => {
    const parsed = parseInt(valueStr.replace(/[^0-9]/g, ''), 10) || 0;
    const clamped = Math.max(0, Math.min(100000, parsed));

    setTempTargets(prev => ({
      ...prev,
      [kec]: {
        ...(prev[kec] || RAW_PPM_DATA[kec] || { IUD: 0, MOW: 0, MOP: 0, KONDOM: 0, IMPLAN: 0, SUNTIK: 0, PIL: 0 }),
        [method]: clamped
      }
    }));
  };

  // Buka modal edit untuk kecamatan tertentu
  const handleOpenEditForKecamatan = (kec: string) => {
    setEditingKecamatan(kec);
    setEditMode('single');
    setIsEditModalOpen(true);
  };

  // Simpan perubahan target PPM ke Firebase & state
  const handleSaveAllTargets = async () => {
    setIsSaving(true);
    try {
      if (onSaveTargets) {
        await onSaveTargets(editTargetYear, tempTargets);
      }
      setSaveSuccessMessage(`Target PPM Tahun ${editTargetYear} berhasil diperbarui dan disinkronkan ke seluruh sistem!`);
      setTimeout(() => {
        setSaveSuccessMessage(null);
        setIsEditModalOpen(false);
      }, 1500);
    } catch (err) {
      console.error('Gagal menyimpan target PPM:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset target sementara kembali ke default dokumen PDF resmi
  const handleResetToOfficialPdf = () => {
    setTempTargets(JSON.parse(JSON.stringify(RAW_PPM_DATA)));
  };

  // Tambah tahun pelaporan baru
  const handleCreateNewYear = () => {
    const cleaned = newYearInput.trim();
    if (cleaned.match(/^[0-9]{4}$/)) {
      if (onYearChange) {
        onYearChange(cleaned);
      }
      setEditTargetYear(cleaned);
      setShowAddYearModal(false);
      setNewYearInput('');
      setIsEditModalOpen(true);
    }
  };

  // Data kalkulasi modal preview
  const modalTargetList = useMemo(() => {
    return calculatePpmTargetsList(tempTargets);
  }, [tempTargets]);

  const modalKabupatenTotal = useMemo(() => {
    return calculateKabupatenPpmTotal(modalTargetList);
  }, [modalTargetList]);

  const selectedKecEditingRow = useMemo(() => {
    return modalTargetList.find(r => r.kecamatan === editingKecamatan);
  }, [modalTargetList, editingKecamatan]);

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-850 to-slate-800 border border-slate-700 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Target className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-100 uppercase tracking-tight">
              Data Target PPM (Perkiraan Permintaan Masyarakat)
            </h2>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Target PPM resmi pelayanan KB Kabupaten Bojonegoro untuk 28 Kecamatan mencakup 7 metode kontrasepsi (<strong className="text-slate-200">IUD, MOW, MOP, KONDOM, IMPLAN, SUNTIK, PIL</strong>).
            Sebagai <strong className="text-teal-400">ADMIN</strong>, Anda dapat merubah target setiap tahun dan seluruh tampilan Dashboard, Tabel, serta Entri Data otomatis terintegrasi.
          </p>
        </div>

        {/* Kontrol Tahun & Tombol Edit Target */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto shrink-0">
          {/* Pemilih Tahun Target */}
          <div className="flex items-center space-x-2 bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 shadow-inner">
            <Calendar className="w-4 h-4 text-teal-400" />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tahun:</span>
            <select
              value={activeYear}
              onChange={(e) => {
                if (e.target.value === '__add_new__') {
                  setShowAddYearModal(true);
                } else if (onYearChange) {
                  onYearChange(e.target.value);
                }
              }}
              className="bg-transparent text-xs font-black text-teal-300 focus:outline-none cursor-pointer"
            >
              {availableYears.map(yr => (
                <option key={yr} value={yr} className="bg-slate-800 text-slate-200">
                  {yr}
                </option>
              ))}
              <option value="__add_new__" className="bg-slate-800 text-teal-400 font-bold">
                + Tambah Tahun Baru...
              </option>
            </select>
          </div>

          {/* Tombol Ubah Target PPM */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black transition-all shadow-lg shadow-teal-500/20 active:scale-95 cursor-pointer shrink-0"
              title="Ubah Target PPM tahunan untuk kecamatan se-Kabupaten Bojonegoro"
            >
              <Sliders className="w-4 h-4 mr-1.5" />
              <span>Ubah Target PPM</span>
            </button>
          )}
        </div>
      </div>

      {/* Ringkasan Statistik PPM Bojonegoro */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Target PPM ({activeYear})
            </span>
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-100">{formatNumber(totalBojonegoro.total)}</span>
            <span className="text-xs font-semibold text-teal-400">Akseptor</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">28 Kecamatan se-Kab. Bojonegoro</p>
        </div>

        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
              Target MKJP ({activeYear})
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-indigo-300">{formatNumber(totalBojonegoro.mkjp)}</span>
            <span className="text-xs font-semibold text-indigo-400">
              ({totalBojonegoro.total > 0 ? ((totalBojonegoro.mkjp / totalBojonegoro.total) * 100).toFixed(2) : 0}%)
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">IUD, MOW, MOP, Implan</p>
        </div>

        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">
              Target Non-MKJP ({activeYear})
            </span>
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-sky-300">{formatNumber(totalBojonegoro.nonMkjp)}</span>
            <span className="text-xs font-semibold text-sky-400">
              ({totalBojonegoro.total > 0 ? ((totalBojonegoro.nonMkjp / totalBojonegoro.total) * 100).toFixed(2) : 0}%)
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Suntik, Pil, Kondom</p>
        </div>
      </div>

      {/* Kartu Rincian Target Per Alokon Kabupaten */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center">
            <Info className="w-3.5 h-3.5 mr-1.5 text-teal-400" />
            Rincian Target PPM Kabupaten Bojonegoro Per Alokon (Tahun {activeYear})
          </span>
          <span className="text-[10px] text-slate-500 font-semibold">Total: 7 Metode</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60">
            <span className="text-[10px] font-bold text-purple-400 block">IUD</span>
            <span className="text-base font-black text-slate-200 mt-0.5 block">{formatNumber(totalBojonegoro.IUD)}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60">
            <span className="text-[10px] font-bold text-rose-400 block">MOW</span>
            <span className="text-base font-black text-slate-200 mt-0.5 block">{formatNumber(totalBojonegoro.MOW)}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60">
            <span className="text-[10px] font-bold text-blue-400 block">MOP</span>
            <span className="text-base font-black text-slate-200 mt-0.5 block">{formatNumber(totalBojonegoro.MOP)}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60">
            <span className="text-[10px] font-bold text-amber-400 block">IMPLAN</span>
            <span className="text-base font-black text-slate-200 mt-0.5 block">{formatNumber(totalBojonegoro.IMPLAN)}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60">
            <span className="text-[10px] font-bold text-emerald-400 block">SUNTIK</span>
            <span className="text-base font-black text-slate-200 mt-0.5 block">{formatNumber(totalBojonegoro.SUNTIK)}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60">
            <span className="text-[10px] font-bold text-teal-400 block">PIL</span>
            <span className="text-base font-black text-slate-200 mt-0.5 block">{formatNumber(totalBojonegoro.PIL)}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60">
            <span className="text-[10px] font-bold text-cyan-400 block">KONDOM</span>
            <span className="text-base font-black text-slate-200 mt-0.5 block">{formatNumber(totalBojonegoro.KONDOM)}</span>
          </div>
        </div>
      </div>

      {/* Tabel Utama Data PPM */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-xl overflow-hidden">
        {/* Search Bar Tunggal & Header Toolbar */}
        <div className="p-4 sm:px-6 bg-slate-850 border-b border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kecamatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl py-2.5 pl-10 pr-9 text-xs font-medium text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center text-xs text-slate-400 gap-3 shrink-0">
            <span>
              Menampilkan: <strong className="text-teal-400 font-bold">{filteredList.length} Kecamatan</strong>
            </span>
            <span className="text-[11px] bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded border border-teal-500/20 font-bold">
              Tahun {activeYear}
            </span>
          </div>
        </div>

        {/* Tabel Data PPM */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1050px]">
            <thead>
              {/* Grup Header */}
              <tr className="bg-slate-900/95 text-[10px] font-black text-slate-400 uppercase border-b border-slate-700">
                <th className="px-3.5 py-3 text-center w-12" rowSpan={2}>No</th>
                <th className="px-4 py-3" rowSpan={2}>Kecamatan</th>
                <th className="px-3 py-2 text-center bg-indigo-500/10 text-indigo-300 border-x border-slate-700/60" colSpan={4}>
                  Metode MKJP
                </th>
                <th className="px-3 py-2 text-center bg-sky-500/10 text-sky-300 border-r border-slate-700/60" colSpan={3}>
                  Metode Non-MKJP
                </th>
                <th className="px-3 py-2 text-center bg-slate-800/80 border-r border-slate-700/60" colSpan={2}>
                  Subtotal
                </th>
                <th className="px-4 py-3 text-center bg-teal-500/15 text-teal-300 font-black" rowSpan={2}>
                  Total PPM
                </th>
                {isAdmin && (
                  <th className="px-3 py-3 text-center w-28" rowSpan={2}>Aksi Target</th>
                )}
              </tr>
              <tr className="bg-slate-900/80 text-[10px] font-black text-slate-400 uppercase border-b border-slate-700">
                <th className="px-3 py-2 text-center text-purple-400 bg-purple-500/5">IUD</th>
                <th className="px-3 py-2 text-center text-rose-400 bg-rose-500/5">MOW</th>
                <th className="px-3 py-2 text-center text-blue-400 bg-blue-500/5">MOP</th>
                <th className="px-3 py-2 text-center text-amber-400 bg-amber-500/5 border-r border-slate-700/60">IMPLAN</th>
                <th className="px-3 py-2 text-center text-emerald-400 bg-emerald-500/5">SUNTIK</th>
                <th className="px-3 py-2 text-center text-teal-400 bg-teal-500/5">PIL</th>
                <th className="px-3 py-2 text-center text-cyan-400 bg-cyan-500/5 border-r border-slate-700/60">KONDOM</th>
                <th className="px-3 py-2 text-center text-indigo-300 bg-indigo-500/10">MKJP</th>
                <th className="px-3 py-2 text-center text-sky-300 bg-sky-500/10 border-r border-slate-700/60">Non-MKJP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredList.map((row, idx) => {
                const isSelected = selectedKec === row.kecamatan;

                return (
                  <tr 
                    key={row.kecamatan}
                    onClick={() => setSelectedKec(row.kecamatan === selectedKec ? null : row.kecamatan)}
                    className={`transition-colors cursor-pointer ${
                      isSelected 
                        ? 'bg-teal-500/15 font-semibold' 
                        : 'hover:bg-slate-750/50'
                    }`}
                  >
                    <td className="px-3.5 py-3 text-center text-xs font-medium text-slate-500">
                      {idx + 1}
                    </td>

                    <td className="px-4 py-3 text-xs font-bold text-slate-200">
                      {row.kecamatan}
                    </td>

                    {/* IUD */}
                    <td className="px-3 py-3 text-center text-xs font-semibold text-purple-300">
                      {row.IUD || '-'}
                    </td>

                    {/* MOW */}
                    <td className="px-3 py-3 text-center text-xs font-semibold text-rose-300">
                      {row.MOW || '-'}
                    </td>

                    {/* MOP */}
                    <td className="px-3 py-3 text-center text-xs font-semibold text-blue-300">
                      {row.MOP || '-'}
                    </td>

                    {/* IMPLAN */}
                    <td className="px-3 py-3 text-center text-xs font-semibold text-amber-300 border-r border-slate-700/40">
                      {row.IMPLAN || '-'}
                    </td>

                    {/* SUNTIK */}
                    <td className="px-3 py-3 text-center text-xs font-semibold text-emerald-300">
                      {row.SUNTIK || '-'}
                    </td>

                    {/* PIL */}
                    <td className="px-3 py-3 text-center text-xs font-semibold text-teal-300">
                      {row.PIL || '-'}
                    </td>

                    {/* KONDOM */}
                    <td className="px-3 py-3 text-center text-xs font-semibold text-cyan-300 border-r border-slate-700/40">
                      {row.KONDOM || '-'}
                    </td>

                    {/* Subtotal MKJP */}
                    <td className="px-3 py-3 text-center text-xs font-bold text-indigo-300 bg-indigo-500/5">
                      {formatNumber(row.mkjp)}
                    </td>

                    {/* Subtotal Non-MKJP */}
                    <td className="px-3 py-3 text-center text-xs font-bold text-sky-300 bg-sky-500/5 border-r border-slate-700/40">
                      {formatNumber(row.nonMkjp)}
                    </td>

                    {/* Grand Total */}
                    <td className="px-4 py-3 text-center text-xs font-black text-teal-400 bg-teal-500/10">
                      {formatNumber(row.total)}
                    </td>

                    {/* Aksi Ubah Target untuk Admin */}
                    {isAdmin && (
                      <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditForKecamatan(row.kecamatan)}
                          className="inline-flex items-center px-2 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500 hover:text-white text-teal-400 border border-teal-500/30 text-xs font-bold transition-all cursor-pointer"
                          title={`Ubah target PPM tahun ${activeYear} untuk ${row.kecamatan}`}
                        >
                          <Edit3 className="w-3 h-3 mr-1" />
                          <span>Ubah</span>
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}

              {/* Baris Total Kabupaten Bojonegoro */}
              <tr className="bg-teal-500/15 font-black border-t-2 border-slate-600 text-slate-100">
                <td className="px-3.5 py-3.5 text-center text-xs font-bold text-teal-400">
                  -
                </td>
                <td className="px-4 py-3.5 text-xs font-black text-teal-300 uppercase tracking-wide">
                  JUMLAH (KABUPATEN BOJONEGORO)
                </td>
                <td className="px-3 py-3.5 text-center text-xs font-black text-purple-300">
                  {formatNumber(totalBojonegoro.IUD)}
                </td>
                <td className="px-3 py-3.5 text-center text-xs font-black text-rose-300">
                  {formatNumber(totalBojonegoro.MOW)}
                </td>
                <td className="px-3 py-3.5 text-center text-xs font-black text-blue-300">
                  {formatNumber(totalBojonegoro.MOP)}
                </td>
                <td className="px-3 py-3.5 text-center text-xs font-black text-amber-300 border-r border-slate-700/40">
                  {formatNumber(totalBojonegoro.IMPLAN)}
                </td>
                <td className="px-3 py-3.5 text-center text-xs font-black text-emerald-300">
                  {formatNumber(totalBojonegoro.SUNTIK)}
                </td>
                <td className="px-3 py-3.5 text-center text-xs font-black text-teal-300">
                  {formatNumber(totalBojonegoro.PIL)}
                </td>
                <td className="px-3 py-3.5 text-center text-xs font-black text-cyan-300 border-r border-slate-700/40">
                  {formatNumber(totalBojonegoro.KONDOM)}
                </td>
                <td className="px-3 py-3.5 text-center text-xs font-black text-indigo-300 bg-indigo-500/10">
                  {formatNumber(totalBojonegoro.mkjp)}
                </td>
                <td className="px-3 py-3.5 text-center text-xs font-black text-sky-300 bg-sky-500/10 border-r border-slate-700/40">
                  {formatNumber(totalBojonegoro.nonMkjp)}
                </td>
                <td className="px-4 py-3.5 text-center text-sm font-black text-teal-300 bg-teal-500/20">
                  {formatNumber(totalBojonegoro.total)}
                </td>
                {isAdmin && (
                  <td className="px-3 py-3.5 text-center text-xs text-slate-500 font-bold">
                    -
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Edit Target PPM (Admin) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:px-6 bg-slate-850 border-b border-slate-700 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                    Ubah Target PPM Tahun
                    <span className="text-teal-400 px-2 py-0.5 rounded-lg bg-teal-500/15 border border-teal-500/30">
                      {editTargetYear}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Perubahan tersimpan real-time ke Firebase & mengupdate otomatis Dashboard, Tabel Rekap, serta Entri Data.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher & Quick Actions */}
            <div className="px-4 sm:px-6 py-2.5 bg-slate-800/60 border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
              <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditMode('single')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    editMode === 'single'
                      ? 'bg-teal-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Edit Per Kecamatan
                </button>
                <button
                  type="button"
                  onClick={() => setEditMode('table')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    editMode === 'table'
                      ? 'bg-teal-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tabel Semua Kecamatan (28)
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleResetToOfficialPdf}
                  className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
                  title="Kembalikan target ke standar resmi Kabupaten Bojonegoro (PDF)"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1 text-amber-400" />
                  <span>Reset ke Standar PDF</span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              {/* Notifikasi Sukses */}
              {saveSuccessMessage && (
                <div className="p-3.5 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>{saveSuccessMessage}</span>
                </div>
              )}

              {/* MODE 1: Edit Per Kecamatan */}
              {editMode === 'single' ? (
                <div className="space-y-4">
                  {/* Pilihan Kecamatan */}
                  <div className="bg-slate-850 p-4 rounded-xl border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Pilih Kecamatan:
                      </label>
                      <select
                        value={editingKecamatan}
                        onChange={(e) => setEditingKecamatan(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-black text-teal-300 focus:outline-none focus:border-teal-500 cursor-pointer"
                      >
                        {KECAMATAN_LIST.map(kec => (
                          <option key={kec} value={kec} className="bg-slate-800 text-slate-200">
                            {kec}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Indikator Total Target Kecamatan */}
                    {selectedKecEditingRow && (
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-indigo-400 font-bold">
                          MKJP: <strong className="text-slate-100">{formatNumber(selectedKecEditingRow.mkjp)}</strong>
                        </span>
                        <span className="text-sky-400 font-bold">
                          Non-MKJP: <strong className="text-slate-100">{formatNumber(selectedKecEditingRow.nonMkjp)}</strong>
                        </span>
                        <span className="text-teal-400 font-black px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/30">
                          Total Target: {formatNumber(selectedKecEditingRow.total)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Form Input 7 Metode */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Grup MKJP */}
                    <div className="bg-slate-850 border border-slate-700 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                        <span className="text-xs font-black text-indigo-400 uppercase tracking-wider flex items-center">
                          <ShieldCheck className="w-4 h-4 mr-1.5" />
                          Metode MKJP
                        </span>
                        <span className="text-[11px] font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          Subtotal: {formatNumber(selectedKecEditingRow?.mkjp || 0)}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {/* IUD */}
                        <div>
                          <label className="block text-[11px] font-bold text-purple-400 mb-1">
                            IUD (Spiral)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={tempTargets[editingKecamatan]?.IUD ?? 0}
                            onChange={(e) => handleMethodInputChange(editingKecamatan, 'IUD', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 focus:border-teal-500 rounded-lg px-3 py-2 text-xs font-bold text-slate-100 focus:outline-none"
                          />
                        </div>

                        {/* MOW */}
                        <div>
                          <label className="block text-[11px] font-bold text-rose-400 mb-1">
                            MOW (Tubektomi / Operasi Wanita)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={tempTargets[editingKecamatan]?.MOW ?? 0}
                            onChange={(e) => handleMethodInputChange(editingKecamatan, 'MOW', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 focus:border-teal-500 rounded-lg px-3 py-2 text-xs font-bold text-slate-100 focus:outline-none"
                          />
                        </div>

                        {/* MOP */}
                        <div>
                          <label className="block text-[11px] font-bold text-blue-400 mb-1">
                            MOP (Vasektomi / Operasi Pria)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={tempTargets[editingKecamatan]?.MOP ?? 0}
                            onChange={(e) => handleMethodInputChange(editingKecamatan, 'MOP', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 focus:border-teal-500 rounded-lg px-3 py-2 text-xs font-bold text-slate-100 focus:outline-none"
                          />
                        </div>

                        {/* IMPLAN */}
                        <div>
                          <label className="block text-[11px] font-bold text-amber-400 mb-1">
                            IMPLAN (Susuk KB)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={tempTargets[editingKecamatan]?.IMPLAN ?? 0}
                            onChange={(e) => handleMethodInputChange(editingKecamatan, 'IMPLAN', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 focus:border-teal-500 rounded-lg px-3 py-2 text-xs font-bold text-slate-100 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Grup Non-MKJP */}
                    <div className="bg-slate-850 border border-slate-700 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                        <span className="text-xs font-black text-sky-400 uppercase tracking-wider flex items-center">
                          <Layers className="w-4 h-4 mr-1.5" />
                          Metode Non-MKJP
                        </span>
                        <span className="text-[11px] font-bold text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                          Subtotal: {formatNumber(selectedKecEditingRow?.nonMkjp || 0)}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {/* SUNTIK */}
                        <div>
                          <label className="block text-[11px] font-bold text-emerald-400 mb-1">
                            SUNTIK (KB Suntik 1/3 Bulan)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={tempTargets[editingKecamatan]?.SUNTIK ?? 0}
                            onChange={(e) => handleMethodInputChange(editingKecamatan, 'SUNTIK', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 focus:border-teal-500 rounded-lg px-3 py-2 text-xs font-bold text-slate-100 focus:outline-none"
                          />
                        </div>

                        {/* PIL */}
                        <div>
                          <label className="block text-[11px] font-bold text-teal-400 mb-1">
                            PIL (Pil KB)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={tempTargets[editingKecamatan]?.PIL ?? 0}
                            onChange={(e) => handleMethodInputChange(editingKecamatan, 'PIL', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 focus:border-teal-500 rounded-lg px-3 py-2 text-xs font-bold text-slate-100 focus:outline-none"
                          />
                        </div>

                        {/* KONDOM */}
                        <div>
                          <label className="block text-[11px] font-bold text-cyan-400 mb-1">
                            KONDOM
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={tempTargets[editingKecamatan]?.KONDOM ?? 0}
                            onChange={(e) => handleMethodInputChange(editingKecamatan, 'KONDOM', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 focus:border-teal-500 rounded-lg px-3 py-2 text-xs font-bold text-slate-100 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* MODE 2: Tabel Spreadsheet Seluruh 28 Kecamatan */
                <div className="border border-slate-700 rounded-xl overflow-x-auto max-h-[500px] custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead className="sticky top-0 bg-slate-900 text-[10px] font-black uppercase text-slate-400 z-10 border-b border-slate-700">
                      <tr>
                        <th className="p-2.5 text-center w-10">No</th>
                        <th className="p-2.5">Kecamatan</th>
                        <th className="p-2 text-center text-purple-400">IUD</th>
                        <th className="p-2 text-center text-rose-400">MOW</th>
                        <th className="p-2 text-center text-blue-400">MOP</th>
                        <th className="p-2 text-center text-amber-400">IMPLAN</th>
                        <th className="p-2 text-center text-emerald-400">SUNTIK</th>
                        <th className="p-2 text-center text-teal-400">PIL</th>
                        <th className="p-2 text-center text-cyan-400">KONDOM</th>
                        <th className="p-2 text-center text-teal-300">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/40 text-xs">
                      {KECAMATAN_LIST.map((kec, idx) => {
                        const vals = tempTargets[kec] || RAW_PPM_DATA[kec];
                        const rowTotal = (vals.IUD || 0) + (vals.MOW || 0) + (vals.MOP || 0) + 
                                         (vals.IMPLAN || 0) + (vals.SUNTIK || 0) + (vals.PIL || 0) + 
                                         (vals.KONDOM || 0);

                        return (
                          <tr key={kec} className="hover:bg-slate-800/40">
                            <td className="p-2 text-center text-slate-500 text-[11px]">{idx + 1}</td>
                            <td className="p-2 font-bold text-slate-200">{kec}</td>
                            {METHOD_KEYS.map(m => (
                              <td key={m} className="p-1 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  value={vals[m] ?? 0}
                                  onChange={(e) => handleMethodInputChange(kec, m, e.target.value)}
                                  className="w-16 bg-slate-950/70 border border-slate-700 focus:border-teal-500 rounded px-1.5 py-1 text-center text-xs font-semibold text-slate-200 focus:outline-none"
                                />
                              </td>
                            ))}
                            <td className="p-2 text-center font-black text-teal-400 bg-teal-500/5">
                              {formatNumber(rowTotal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:px-6 bg-slate-850 border-t border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="flex items-center text-xs text-slate-400">
                <Info className="w-4 h-4 mr-1.5 text-teal-400 shrink-0" />
                <span>
                  Total Akumulasi Bojonegoro: <strong className="text-teal-400 font-bold">{formatNumber(modalKabupatenTotal.total)}</strong> Akseptor
                </span>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveAllTargets}
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black transition-all shadow-lg shadow-teal-500/20 active:scale-95 cursor-pointer disabled:opacity-50 flex items-center"
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Target PPM ke Firebase'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Tambah Tahun Baru */}
      {showAddYearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-100 uppercase tracking-tight">
                  Tambah Tahun Target Baru
                </h3>
                <p className="text-[11px] text-slate-400">Masukkan 4 digit tahun (contoh: 2027)</p>
              </div>
            </div>

            <div>
              <input
                type="text"
                placeholder="2027"
                maxLength={4}
                value={newYearInput}
                onChange={(e) => setNewYearInput(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full bg-slate-950 border border-slate-700 focus:border-teal-500 rounded-xl px-4 py-2.5 text-base font-black text-teal-300 text-center tracking-widest focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddYearModal(false);
                  setNewYearInput('');
                }}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs font-semibold hover:text-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCreateNewYear}
                disabled={!newYearInput.match(/^[0-9]{4}$/)}
                className="px-4 py-1.5 rounded-lg bg-teal-500 text-slate-950 text-xs font-black hover:bg-teal-400 disabled:opacity-40"
              >
                Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

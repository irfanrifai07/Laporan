/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, Plus, Search, 
  Layers, Calendar, Edit3, X, AlertCircle, Lock, ShieldCheck,
  EyeOff, Table as TableIcon
} from 'lucide-react';
import { 
  KECAMATAN_LIST, 
  MONTHS, 
  METHOD_KEYS, 
  METHOD_DETAILS, 
  RawDataRow,
  AuthUser
} from '../types';
import { getOfficialPpm, PpmTargetMap } from '../data/ppmData';

interface EntryViewProps {
  data: RawDataRow[];
  selectedMonth: string;
  setSelectedMonth?: (month: string) => void;
  activeCategory?: string;
  setActiveCategory?: (category: string) => void;
  onOpenEntrySidebar: (kecamatan?: string) => void;
  onResetToApiData: () => void;
  currentUser?: AuthUser | null;
  lockedKecamatan?: string;
  currentPpmTargets?: PpmTargetMap;
  currentYear?: string;
  availableYears?: string[];
  onYearChange?: (year: string) => void;
  isMobile?: boolean;
  isMobileLandscape?: boolean;
  isTableHidden?: boolean;
  onShowTable?: () => void;
  onHideTable?: () => void;
}

interface SingleMonthRow {
  kecamatan: string;
  ppm: number;
  blnLalu: number;
  blnIni: number;
  jumlah: number;
  percentage: number;
  sisa: number;
  category: string;
  isJumlah: boolean;
}

export const EntryView: React.FC<EntryViewProps> = ({
  data,
  selectedMonth,
  setSelectedMonth,
  activeCategory = 'Semua Metode',
  setActiveCategory,
  onOpenEntrySidebar,
  onResetToApiData,
  currentUser,
  lockedKecamatan,
  currentPpmTargets,
  currentYear = '2026',
  availableYears = ['2026', '2025'],
  onYearChange,
  isMobile = false,
  isMobileLandscape = false,
  isTableHidden = false,
  onShowTable,
  onHideTable
}) => {
  // Local fallback if setters are not provided by parent
  const [localCategory, setLocalCategory] = useState(activeCategory);
  const [localMonth, setLocalMonth] = useState(selectedMonth);
  const [searchQuery, setSearchQuery] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [onlyMyDistrict, setOnlyMyDistrict] = useState(false);

  // Deteksi hak akses kecamatan
  const activeLockKecamatan = lockedKecamatan || (currentUser?.role === 'plkb' ? currentUser?.kecamatan : undefined);
  const isKecamatanUser = !!activeLockKecamatan;

  const currentCategory = activeCategory || localCategory;
  const currentMonth = selectedMonth || localMonth;

  const handleCategoryChange = (val: string) => {
    if (setActiveCategory) {
      setActiveCategory(val);
    } else {
      setLocalCategory(val);
    }
  };

  const handleMonthChange = (val: string) => {
    if (setSelectedMonth) {
      setSelectedMonth(val);
    } else {
      setLocalMonth(val);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(Math.round(num));
  };

  // Olah data baris per kecamatan untuk bulan dan kategori aktif
  const singleMonthDataList = useMemo<SingleMonthRow[]>(() => {
    if (!Array.isArray(data) || data.length === 0) return [];

    const matchCat = currentCategory.toUpperCase().trim();

    return KECAMATAN_LIST.map(kec => {
      const row = data.find(r => 
        r[0]?.toString().toUpperCase().trim() === kec.toUpperCase().trim() &&
        (matchCat === 'SEMUA METODE' 
          ? r[7]?.toString().toUpperCase().trim() === 'SEMUA METODE' 
          : r[7]?.toString().toUpperCase().trim() === matchCat) &&
        r[8]?.toString().trim() === currentMonth
      );

      const ppm = row ? (parseFloat(String(row[1])) || 0) : 0;
      const blnLalu = row ? (parseFloat(String(row[2])) || 0) : 0;
      const blnIni = row ? (parseFloat(String(row[3])) || 0) : 0;
      const jumlah = row ? (parseFloat(String(row[4])) || (blnLalu + blnIni)) : (blnLalu + blnIni);
      const percentage = ppm > 0 ? (jumlah / ppm) * 100 : 0;
      const sisa = ppm - jumlah;

      return {
        kecamatan: kec,
        ppm,
        blnLalu,
        blnIni,
        jumlah,
        percentage,
        sisa,
        category: currentCategory,
        isJumlah: false
      };
    });
  }, [data, currentCategory, currentMonth]);

  // Baris JUMLAH (Total Kabupaten) - Target PPM selalu mengacu ke Data PPM resmi
  const totalRow = useMemo<SingleMonthRow>(() => {
    const officialKabPpm = getOfficialPpm('JUMLAH', currentCategory, currentPpmTargets);
    const sumPpm = singleMonthDataList.reduce((s, r) => s + r.ppm, 0);
    const totalPpm = officialKabPpm > 0 ? officialKabPpm : sumPpm;
    const totalBlnLalu = singleMonthDataList.reduce((s, r) => s + r.blnLalu, 0);
    const totalBlnIni = singleMonthDataList.reduce((s, r) => s + r.blnIni, 0);
    const totalJumlah = singleMonthDataList.reduce((s, r) => s + r.jumlah, 0);
    const totalPercentage = totalPpm > 0 ? (totalJumlah / totalPpm) * 100 : 0;
    const totalSisa = totalPpm - totalJumlah;

    return {
      kecamatan: 'JUMLAH (KABUPATEN BOJONEGORO)',
      ppm: totalPpm,
      blnLalu: totalBlnLalu,
      blnIni: totalBlnIni,
      jumlah: totalJumlah,
      percentage: totalPercentage,
      sisa: totalSisa,
      category: currentCategory,
      isJumlah: true
    };
  }, [singleMonthDataList, currentCategory]);

  // Filter berdasarkan input pencarian dan opsi hanya wilayah sendiri
  const displayedRows = useMemo(() => {
    let list = singleMonthDataList;
    if (onlyMyDistrict && activeLockKecamatan) {
      list = list.filter(r => r.kecamatan.toUpperCase() === activeLockKecamatan.toUpperCase());
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return [...list, totalRow];

    const filtered = list.filter(r => 
      r.kecamatan.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q)
    );
    return [...filtered, totalRow];
  }, [singleMonthDataList, totalRow, searchQuery, onlyMyDistrict, activeLockKecamatan]);

  return (
    <div className={isMobileLandscape ? "space-y-2.5" : "space-y-4"}>
      {/* Top Banner Manajemen Entri */}
      {activeLockKecamatan ? (
        <div
          className={`bg-gradient-to-r from-teal-950/80 via-slate-850 to-slate-800 border border-teal-500/30 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between landscape-row ${
            isMobileLandscape ? "p-2.5 px-3 gap-2" : "p-5 gap-4"
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              {!isMobileLandscape && (
                <div className="p-2 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  <Lock className="w-5 h-5 text-teal-400" />
                </div>
              )}
              <div>
                <h2 className={`${isMobileLandscape ? "text-xs" : "text-base"} font-black text-slate-100 uppercase tracking-tight flex items-center gap-2 flex-wrap`}>
                  <span>Entri Capaian Kecamatan {activeLockKecamatan}</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                    Hak Akses Wilayah
                  </span>
                </h2>
                {!isMobileLandscape && (
                  <p className="text-xs text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
                    Anda login sebagai akun resmi <strong>Kecamatan {activeLockKecamatan}</strong>. Sesuai hak akses, Anda hanya berwenang mengentri data capaian untuk wilayah Anda. Kecamatan lainnya bersifat hanya-baca (<em>read-only</em>).
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className={`flex items-center shrink-0 flex-wrap ${isMobileLandscape ? "gap-2 w-auto" : "gap-3 w-full md:w-auto"}`}>
            <button
              type="button"
              onClick={() => onOpenEntrySidebar(activeLockKecamatan)}
              className={`rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-teal-500/25 flex items-center justify-center transition-all cursor-pointer whitespace-nowrap ${
                isMobileLandscape ? "px-3 py-1.5" : "w-full sm:w-auto px-4 py-2.5"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5 mr-1.5" />
              Entri Data {activeLockKecamatan}
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`bg-gradient-to-r from-slate-800 via-slate-850 to-slate-800 border border-slate-700 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between landscape-row ${
            isMobileLandscape ? "p-2.5 px-3 gap-2" : "p-6 gap-4"
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              {!isMobileLandscape && (
                <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
              )}
              <h2 className={`${isMobileLandscape ? "text-xs" : "text-base"} font-black text-slate-100 uppercase tracking-tight`}>
                Manajemen Entri Data Metode Kontrasepsi
              </h2>
            </div>
            {!isMobileLandscape && (
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                Pilih kecamatan untuk menginput capaian metode <strong className="text-slate-200">MOW, MOP, IUD, IMPLAN, SUNTIK, PIL, dan KONDOM</strong>. Perhitungan MKJP, NON MKJP, dan Total Semua Metode akan dihitung otomatis secara realtime.
              </p>
            )}
          </div>

          <div className={`flex items-center shrink-0 flex-wrap ${isMobileLandscape ? "gap-2 w-auto" : "gap-3 w-full md:w-auto"}`}>
            <button
              type="button"
              onClick={() => onOpenEntrySidebar()}
              className={`rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-extrabold text-xs shadow-lg shadow-teal-500/20 flex items-center justify-center transition-all cursor-pointer whitespace-nowrap ${
                isMobileLandscape ? "px-3 py-1.5" : "w-full sm:w-auto px-4 py-2.5"
              }`}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Buka Pop-up Entri Data
            </button>
          </div>
        </div>
      )}

      {/* Kartu Tabel Utama Entri Data (Tampilan Seperti Awal) */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-xl overflow-hidden">
        {/* Header Tabel dengan Kontrol Filter */}
        <div
          className={`bg-slate-850 border-b border-slate-700 flex flex-col md:flex-row md:items-center justify-between landscape-row ${
            isMobileLandscape ? "p-2.5 px-3 gap-2" : "p-4 sm:px-6 gap-4"
          }`}
        >
          <div className="flex items-center space-x-2.5">
            {!isMobileLandscape && (
              <div className="p-2.5 rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30 shadow-inner">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-1">
                <h2 className={`${isMobileLandscape ? "text-xs" : "text-sm sm:text-base"} font-black text-slate-100 uppercase tracking-tight`}>
                  Tabel Entri Capaian Pelayanan KB
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/30">
                  {currentCategory}
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                  Tahun {currentYear || '2026'}
                </span>
              </div>
              {!isMobileLandscape && (
                <p className="text-xs text-slate-400">
                  Kabupaten Bojonegoro &bull; Periode: <span className="text-teal-400 font-bold">{currentMonth} {currentYear || '2026'}</span>
                </p>
              )}
            </div>
          </div>

          <div className={`flex items-center flex-wrap max-w-full ${isMobileLandscape ? "gap-1.5" : "gap-2"}`}>
            {/* Pilihan Metode Kontrasepsi */}
            <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 max-w-full min-w-0">
              <Layers className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span className="text-[10px] text-slate-500 font-bold uppercase mr-1 shrink-0">Metode:</span>
              <select
                value={currentCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="bg-transparent text-xs font-bold text-teal-400 focus:outline-none cursor-pointer max-w-[140px] sm:max-w-[200px] truncate"
              >
                <optgroup label="Kelompok" className="bg-slate-800 text-slate-300 font-bold">
                  <option value="Semua Metode">SEMUA METODE</option>
                  <option value="MKJP">MKJP</option>
                  <option value="NON MKJP">NON MKJP</option>
                </optgroup>
                <optgroup label="Alokon Individual" className="bg-slate-800 text-teal-300 font-bold">
                  {METHOD_KEYS.map(m => (
                    <option key={m} value={m}>{m} - {METHOD_DETAILS[m].fullName}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Pilihan Bulan */}
            <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span className="text-[10px] text-slate-500 font-bold uppercase mr-1">Bulan:</span>
              <select
                value={currentMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="bg-transparent text-xs font-bold text-teal-400 focus:outline-none cursor-pointer"
              >
                {MONTHS.map(m => (
                  <option key={m} value={m} className="bg-slate-800 text-slate-200">
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Pilihan Tahun Pelaporan */}
            <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 shrink-0">
              <span className="text-[10px] text-slate-500 font-bold uppercase mr-1">Tahun:</span>
              <select
                value={currentYear}
                onChange={(e) => {
                  if (onYearChange) {
                    onYearChange(e.target.value);
                  }
                }}
                className="w-[52px] bg-transparent text-xs font-black text-indigo-300 focus:outline-none cursor-pointer"
              >
                {availableYears.map(yr => (
                  <option key={yr} value={yr} className="bg-slate-800 text-slate-200 font-semibold">
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {isTableHidden ? (
          <div className="p-5 sm:p-6 bg-slate-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
                  Tabel Entri Capaian ({currentCategory})
                </h3>
                <span className="text-[10px] font-bold text-teal-400">
                  {currentMonth} {currentYear || '2026'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Tabel disembunyikan di tampilan mobile. Ketuk tombol untuk menampilkan tabel secara landscape otomatis.
              </p>
            </div>
            {onShowTable && (
              <button
                type="button"
                onClick={onShowTable}
                className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-teal-500/20 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <TableIcon className="w-4 h-4" />
                <span>Tampilkan Tabel</span>
              </button>
            )}
          </div>
        ) : (
        <>
        {/* SATU FILTER PENCARIAN TUNGGAL & TOGGLE WILAYAH */}
        <div
          className={`bg-slate-900/70 border-b border-slate-700 flex flex-col md:flex-row md:items-center justify-between landscape-row ${
            isMobileLandscape ? "p-2 px-3 gap-2" : "p-4 sm:px-6 gap-3"
          }`}
        >
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kecamatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl pl-9 pr-9 text-xs font-medium text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all shadow-inner ${
                isMobileLandscape ? "py-1.5" : "py-2.5"
              }`}
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

          <div className="flex items-center text-xs text-slate-400 gap-2.5 shrink-0 flex-wrap">
            {activeLockKecamatan && (
              <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setOnlyMyDistrict(false)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    !onlyMyDistrict 
                      ? 'bg-slate-700 text-teal-300 shadow-xs' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Semua Wilayah (28)
                </button>
                <button
                  type="button"
                  onClick={() => setOnlyMyDistrict(true)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center space-x-1 ${
                    onlyMyDistrict 
                      ? 'bg-teal-500 text-slate-950 shadow-xs font-black' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Lock className="w-3 h-3 mr-1" />
                  <span>Hanya {activeLockKecamatan}</span>
                </button>
              </div>
            )}

            <span>
              Menampilkan: <strong className="text-teal-400 font-bold">{displayedRows.length} baris</strong>
            </span>
            {searchQuery && (
              <span className="text-[11px] bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded border border-teal-500/20">
                Filter: &ldquo;{searchQuery}&rdquo;
              </span>
            )}
            {isMobile && onHideTable && (
              <button
                type="button"
                onClick={onHideTable}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-500/15 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap"
                title="Sembunyikan tabel dan kembali ke tampilan potret"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Sembunyikan Tabel</span>
              </button>
            )}
          </div>
        </div>

        {/* Ringkasan Metrik Singkat */}
        <div className="grid grid-cols-2 sm:grid-cols-5 landscape-grid-5 divide-x divide-y sm:divide-y-0 divide-slate-700/60 bg-slate-900/40 border-b border-slate-700 text-center">
          <div className={isMobileLandscape ? "p-1.5" : "p-3 sm:py-3.5"}>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total PPM Target</span>
            <span className={`${isMobileLandscape ? "text-xs" : "text-sm sm:text-base"} font-black text-slate-200 mt-0.5 block tabular-nums`}>{formatNumber(totalRow.ppm)}</span>
          </div>
          <div className={isMobileLandscape ? "p-1.5" : "p-3 sm:py-3.5"}>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Bulan Lalu</span>
            <span className={`${isMobileLandscape ? "text-xs" : "text-sm sm:text-base"} font-black text-slate-300 mt-0.5 block tabular-nums`}>{formatNumber(totalRow.blnLalu)}</span>
          </div>
          <div className={isMobileLandscape ? "p-1.5" : "p-3 sm:py-3.5"}>
            <span className="text-[9px] font-bold text-sky-400 uppercase tracking-wider block">Bulan Ini</span>
            <span className={`${isMobileLandscape ? "text-xs" : "text-sm sm:text-base"} font-black text-sky-400 mt-0.5 block tabular-nums`}>{formatNumber(totalRow.blnIni)}</span>
          </div>
          <div className={isMobileLandscape ? "p-1.5" : "p-3 sm:py-3.5"}>
            <span className="text-[9px] font-bold text-teal-400 uppercase tracking-wider block">Total Capaian</span>
            <span className={`${isMobileLandscape ? "text-xs" : "text-sm sm:text-base"} font-black text-teal-400 mt-0.5 block tabular-nums`}>{formatNumber(totalRow.jumlah)}</span>
          </div>
          <div className={`${isMobileLandscape ? "p-1.5" : "p-3 sm:py-3.5"} col-span-2 sm:col-span-1 landscape-span-1`}>
            <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider block">Prosentase</span>
            <span className={`${isMobileLandscape ? "text-xs" : "text-sm sm:text-base"} font-black text-amber-400 mt-0.5 block tabular-nums`}>{totalRow.percentage.toFixed(2)}%</span>
          </div>
        </div>

        {/* TABEL PER BULAN DENGAN FORMAT TAMPILAN AWAL */}
        <div className={isMobile ? "w-full overflow-hidden" : "overflow-x-auto custom-scrollbar"}>
          <table className={`w-full text-left border-collapse ${isMobile ? "table-fixed" : "min-w-[900px]"}`}>
            <thead>
              <tr className={`bg-slate-900/95 font-black text-slate-400 uppercase border-b border-slate-700 ${isMobile ? "text-[9px]" : "text-[10px]"}`}>
                <th className={isMobile ? "px-0.5 py-2 text-center w-[5%]" : "px-4 py-3.5 text-center w-10 sticky left-0 bg-slate-900 z-10"}>No</th>
                <th className={isMobile ? "px-1 py-2 w-[22%] truncate" : "px-4 py-3.5 min-w-[150px] sticky left-10 bg-slate-900 z-10"}>Kecamatan</th>
                <th className={isMobile ? "px-0.5 py-2 text-center w-[10%]" : "px-4 py-3.5 text-center"}>{isMobile ? "PPM" : "PPM Target"}</th>
                <th className={isMobile ? "px-0.5 py-2 text-center w-[9%]" : "px-4 py-3.5 text-center"}>{isMobile ? "Lalu" : "Bln Lalu"}</th>
                <th className={isMobile ? "px-0.5 py-2 text-center w-[9%]" : "px-4 py-3.5 text-center"}>{isMobile ? "Ini" : "Bln Ini"}</th>
                <th className={isMobile ? "px-0.5 py-2 text-center w-[10%]" : "px-4 py-3.5 text-center"}>{isMobile ? "Jml" : "Jumlah Capaian"}</th>
                <th className={isMobile ? "px-1 py-2 w-[14%]" : "px-4 py-3.5 w-[150px]"}>{isMobile ? "%" : "Prosentase"}</th>
                <th className={isMobile ? "px-0.5 py-2 text-center w-[10%]" : "px-4 py-3.5 text-center"}>{isMobile ? "Sisa" : "Sisa Target"}</th>
                <th className={isMobile ? "px-0.5 py-2 w-[11%] text-center" : "px-4 py-3.5 w-28 text-center"}>Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {displayedRows.map((row, idx) => {
                const isTotalRow = row.isJumlah;
                const isUserDistrict = Boolean(
                  activeLockKecamatan && 
                  row.kecamatan.toUpperCase().trim() === activeLockKecamatan.toUpperCase().trim()
                );
                const isLockedRow = isKecamatanUser && !isUserDistrict && !isTotalRow;
                const cellPad = isMobile ? "px-0.5 py-1.5" : "px-4 py-3";
                const numClass = isMobile ? "text-[9.5px]" : "text-xs";

                return (
                  <tr 
                    key={row.kecamatan || idx} 
                    className={`transition-colors ${
                      isTotalRow 
                        ? 'bg-teal-500/10 font-bold border-t-2 border-slate-600 hover:bg-teal-500/15' 
                        : isUserDistrict
                        ? 'bg-teal-500/15 border-l-4 border-l-teal-400 font-semibold hover:bg-teal-500/20'
                        : 'hover:bg-slate-750/50'
                    }`}
                  >
                    <td className={`${cellPad} text-center ${numClass} font-medium ${
                      isMobile ? "" : "sticky left-0 z-10"
                    } ${
                      isTotalRow ? 'bg-slate-850 text-teal-400 font-bold' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {isTotalRow ? '-' : idx + 1}
                    </td>

                    <td className={`${isMobile ? "px-1 py-1.5 text-[9.5px]" : "px-4 py-3 text-xs sticky left-10 z-10"} font-bold ${
                      isTotalRow ? 'bg-slate-850 text-teal-300 uppercase' : 'bg-slate-800 text-slate-200'
                    }`} title={row.kecamatan}>
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="truncate">{isMobile && isTotalRow ? 'JUMLAH KAB.' : row.kecamatan}</span>
                        {isUserDistrict && !isMobile && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-teal-500/25 text-teal-300 border border-teal-500/40 shrink-0">
                            Wilayah Anda
                          </span>
                        )}
                      </div>
                    </td>

                    <td className={`${cellPad} text-center ${numClass} font-semibold text-slate-300 tabular-nums`}>
                      {formatNumber(row.ppm)}
                    </td>

                    <td className={`${cellPad} text-center ${numClass} text-slate-400 tabular-nums`}>
                      {formatNumber(row.blnLalu)}
                    </td>

                    <td className={`${cellPad} text-center ${numClass} font-semibold text-sky-400 tabular-nums`}>
                      {formatNumber(row.blnIni)}
                    </td>

                    <td className={`${cellPad} text-center ${numClass} font-black text-teal-400 tabular-nums`}>
                      {formatNumber(row.jumlah)}
                    </td>

                    <td className={isMobile ? "px-1 py-1.5" : cellPad}>
                      <div className="flex flex-col gap-0.5">
                        <div className={`flex items-center justify-between font-black text-slate-300 tabular-nums ${isMobile ? "text-[9px]" : "text-[10px]"}`}>
                          <span>{row.percentage.toFixed(isMobile ? 1 : 2)}%</span>
                          {!isMobile && row.percentage >= 100 && (
                            <span className="text-[9px] text-emerald-400 font-bold">LUNAS</span>
                          )}
                        </div>
                        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              row.percentage >= 80 
                                ? 'bg-emerald-500' 
                                : row.percentage >= 50 
                                ? 'bg-amber-500' 
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(row.percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className={`${cellPad} text-center ${numClass} font-bold tabular-nums`}>
                      <span className={row.sisa <= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {formatNumber(row.sisa)}
                      </span>
                    </td>

                    <td className={`${cellPad} text-center`}>
                      {!isTotalRow && (
                        isLockedRow ? (
                          <div 
                            className={`inline-flex items-center justify-center rounded-lg bg-slate-800/80 text-slate-500 border border-slate-700/60 font-semibold cursor-not-allowed select-none ${
                              isMobile ? "px-1 py-0.5 text-[9px]" : "px-2 py-1 text-[11px]"
                            }`}
                            title={`Akses Terkunci: Akun Anda hanya berwenang mengentri data Kecamatan ${activeLockKecamatan}`}
                          >
                            <Lock className="w-2.5 h-2.5 shrink-0" />
                            {!isMobile && <span className="ml-1">Terkunci</span>}
                          </div>
                        ) : isUserDistrict ? (
                          <button
                            type="button"
                            onClick={() => onOpenEntrySidebar(row.kecamatan)}
                            className={`inline-flex items-center justify-center rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-black transition-all cursor-pointer shadow-md shadow-teal-500/20 ${
                              isMobile ? "px-1.5 py-1 text-[9.5px]" : "px-3 py-1.5 text-xs"
                            }`}
                            title={`Buka form entri data capaian Kecamatan ${row.kecamatan}`}
                          >
                            <Edit3 className={isMobile ? "w-2.5 h-2.5 mr-0.5" : "w-3.5 h-3.5 mr-1"} />
                            <span>{isMobile ? "Entri" : "Entri Data"}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onOpenEntrySidebar(row.kecamatan)}
                            className={`inline-flex items-center justify-center rounded-lg bg-teal-500/10 hover:bg-teal-500 hover:text-white text-teal-400 border border-teal-500/30 font-bold transition-all cursor-pointer shadow-xs ${
                              isMobile ? "px-1.5 py-1 text-[9.5px]" : "px-2.5 py-1 text-xs"
                            }`}
                            title={`Buka entri data lengkap untuk ${row.kecamatan}`}
                          >
                            <Edit3 className={isMobile ? "w-2.5 h-2.5 mr-0.5" : "w-3 h-3 mr-1"} />
                            <span>Entri</span>
                          </button>
                        )
                      )}
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

      {/* Modal Konfirmasi Reset Data ke Database Awal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-100">Reset Semua Data Entri?</h3>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Tindakan ini akan menghapus semua perubahan capaian yang disimpan di perangkat Anda dan memuat ulang data asli dari Google Sheets. Data yang belum dicadangkan akan hilang.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirm(false);
                  onResetToApiData();
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20 transition-all cursor-pointer"
              >
                Ya, Reset Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

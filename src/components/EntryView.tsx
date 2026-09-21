/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, Plus, Search, 
  Layers, Calendar, Edit3, X, AlertCircle, Lock, ShieldCheck
} from 'lucide-react';
import { 
  KECAMATAN_LIST, 
  MONTHS, 
  METHOD_KEYS, 
  METHOD_DETAILS, 
  RawDataRow,
  AuthUser
} from '../types';
import { getOfficialPpm } from '../data/ppmData';

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
  lockedKecamatan
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
    const officialKabPpm = getOfficialPpm('JUMLAH', currentCategory);
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
    <div className="space-y-4">
      {/* Top Banner Manajemen Entri */}
      {activeLockKecamatan ? (
        <div className="bg-gradient-to-r from-teal-950/80 via-slate-850 to-slate-800 border border-teal-500/30 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30">
                <Lock className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-100 uppercase tracking-tight flex items-center gap-2 flex-wrap">
                  <span>Entri Capaian Kecamatan {activeLockKecamatan}</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                    Hak Akses Wilayah
                  </span>
                </h2>
                <p className="text-xs text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
                  Anda login sebagai akun resmi <strong>Kecamatan {activeLockKecamatan}</strong>. Sesuai hak akses, Anda hanya berwenang mengentri data capaian untuk wilayah Anda. Kecamatan lainnya bersifat hanya-baca (<em>read-only</em>).
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => onOpenEntrySidebar(activeLockKecamatan)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-teal-500/25 flex items-center justify-center transition-all cursor-pointer"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Entri Data {activeLockKecamatan}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-slate-800 via-slate-850 to-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h2 className="text-base font-black text-slate-100 uppercase tracking-tight">
                Manajemen Entri Data Metode Kontrasepsi
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Pilih kecamatan untuk menginput capaian metode <strong className="text-slate-200">MOW, MOP, IUD, IMPLAN, SUNTIK, PIL, dan KONDOM</strong>. Perhitungan MKJP, NON MKJP, dan Total Semua Metode akan dihitung otomatis secara realtime.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => onOpenEntrySidebar()}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-extrabold text-xs shadow-lg shadow-teal-500/20 flex items-center justify-center transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-2" />
              Buka Sidebar Entri Data
            </button>
          </div>
        </div>
      )}

      {/* Kartu Tabel Utama Entri Data (Tampilan Seperti Awal) */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-xl overflow-hidden">
        {/* Header Tabel dengan Kontrol Filter */}
        <div className="p-4 sm:px-6 bg-slate-850 border-b border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30 shadow-inner">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base font-black text-slate-100 uppercase tracking-tight">
                  Tabel Entri Capaian Pelayanan KB
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/30">
                  {currentCategory}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Kabupaten Bojonegoro &bull; Periode: <span className="text-teal-400 font-bold">{currentMonth}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Pilihan Metode Kontrasepsi */}
            <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
              <Layers className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span className="text-[10px] text-slate-500 font-bold uppercase mr-1">Metode:</span>
              <select
                value={currentCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="bg-transparent text-xs font-bold text-teal-400 focus:outline-none cursor-pointer"
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
            <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
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
          </div>
        </div>

        {/* SATU FILTER PENCARIAN TUNGGAL & TOGGLE WILAYAH */}
        <div className="p-4 sm:px-6 bg-slate-900/70 border-b border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-lg">
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

          <div className="flex items-center text-xs text-slate-400 gap-3 shrink-0 flex-wrap">
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
          </div>
        </div>

        {/* Ringkasan Metrik Singkat */}
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-slate-700/60 bg-slate-900/40 border-b border-slate-700 text-center">
          <div className="p-3 sm:py-3.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total PPM Target</span>
            <span className="text-sm sm:text-base font-black text-slate-200 mt-0.5 block">{formatNumber(totalRow.ppm)}</span>
          </div>
          <div className="p-3 sm:py-3.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bulan Lalu</span>
            <span className="text-sm sm:text-base font-black text-slate-300 mt-0.5 block">{formatNumber(totalRow.blnLalu)}</span>
          </div>
          <div className="p-3 sm:py-3.5">
            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">Bulan Ini</span>
            <span className="text-sm sm:text-base font-black text-sky-400 mt-0.5 block">{formatNumber(totalRow.blnIni)}</span>
          </div>
          <div className="p-3 sm:py-3.5">
            <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block">Total Capaian</span>
            <span className="text-sm sm:text-base font-black text-teal-400 mt-0.5 block">{formatNumber(totalRow.jumlah)}</span>
          </div>
          <div className="p-3 sm:py-3.5 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Prosentase</span>
            <span className="text-sm sm:text-base font-black text-amber-400 mt-0.5 block">{totalRow.percentage.toFixed(2)}%</span>
          </div>
        </div>

        {/* TABEL PER BULAN DENGAN FORMAT TAMPILAN AWAL */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-900/90 text-[10px] font-black text-slate-400 uppercase border-b border-slate-700">
                <th className="px-4 py-3.5 text-center w-12">No</th>
                <th className="px-4 py-3.5">Kecamatan</th>
                <th className="px-4 py-3.5 text-center">PPM Target</th>
                <th className="px-4 py-3.5 text-center">Bln Lalu</th>
                <th className="px-4 py-3.5 text-center">Bln Ini</th>
                <th className="px-4 py-3.5 text-center">Jumlah Capaian</th>
                <th className="px-4 py-3.5 w-[150px]">Prosentase</th>
                <th className="px-4 py-3.5 text-center">Sisa Target</th>
                <th className="px-4 py-3.5 text-center w-28">Aksi</th>
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
                    <td className="px-4 py-3 text-center text-xs font-medium text-slate-500">
                      {isTotalRow ? '-' : idx + 1}
                    </td>

                    <td className="px-4 py-3 text-xs font-bold text-slate-200">
                      <div className="flex items-center space-x-2">
                        <span>{row.kecamatan}</span>
                        {isUserDistrict && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-teal-500/25 text-teal-300 border border-teal-500/40 shrink-0">
                            Wilayah Anda
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-center text-xs font-semibold text-slate-300">
                      {formatNumber(row.ppm)}
                    </td>

                    <td className="px-4 py-3 text-center text-xs text-slate-400">
                      {formatNumber(row.blnLalu)}
                    </td>

                    <td className="px-4 py-3 text-center text-xs font-semibold text-sky-400">
                      {formatNumber(row.blnIni)}
                    </td>

                    <td className="px-4 py-3 text-center text-xs font-black text-teal-400">
                      {formatNumber(row.jumlah)}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[10px] font-black text-slate-300">
                          <span>{row.percentage.toFixed(2)}%</span>
                          {row.percentage >= 100 && (
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

                    <td className="px-4 py-3 text-center text-xs font-bold">
                      <span className={row.sisa <= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {formatNumber(row.sisa)}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      {!isTotalRow && (
                        isLockedRow ? (
                          <div 
                            className="inline-flex items-center px-2 py-1 rounded-lg bg-slate-800/80 text-slate-500 border border-slate-700/60 text-[11px] font-semibold cursor-not-allowed select-none"
                            title={`Akses Terkunci: Akun Anda hanya berwenang mengentri data Kecamatan ${activeLockKecamatan}`}
                          >
                            <Lock className="w-3 h-3 mr-1 text-slate-500 shrink-0" />
                            <span>Terkunci</span>
                          </div>
                        ) : isUserDistrict ? (
                          <button
                            type="button"
                            onClick={() => onOpenEntrySidebar(row.kecamatan)}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-md shadow-teal-500/20"
                            title={`Buka form entri data capaian Kecamatan ${row.kecamatan}`}
                          >
                            <Edit3 className="w-3.5 h-3.5 mr-1" />
                            <span>Entri Data</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onOpenEntrySidebar(row.kecamatan)}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500 hover:text-white text-teal-400 border border-teal-500/30 text-xs font-bold transition-all cursor-pointer shadow-xs"
                            title={`Buka entri data lengkap untuk ${row.kecamatan}`}
                          >
                            <Edit3 className="w-3 h-3 mr-1" />
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

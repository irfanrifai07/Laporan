/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Table as TableIcon, Search, Calendar, Download, X, 
  Layers, RotateCcw, CalendarDays, TrendingUp
} from 'lucide-react';
import { 
  RawDataRow, 
  MONTHS, 
  METHOD_KEYS, 
  METHOD_DETAILS,
  KECAMATAN_LIST 
} from '../types';

interface TableViewProps {
  data: RawDataRow[];
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  onOpenEntrySidebar?: (kecamatan?: string) => void;
}

interface YearlyRow {
  kecamatan: string;
  ppm: number;
  monthly: { [month: string]: number };
  totalCapaian: number;
  percentage: number;
  sisa: number;
  category: string;
  isJumlah: boolean;
}

const MONTH_ABBR: { [key: string]: string } = {
  'Januari': 'Jan',
  'Februari': 'Feb',
  'Maret': 'Mar',
  'April': 'Apr',
  'Mei': 'Mei',
  'Juni': 'Jun',
  'Juli': 'Jul',
  'Agustus': 'Ags',
  'September': 'Sep',
  'Oktober': 'Okt',
  'November': 'Nov',
  'Desember': 'Des'
};

export const TableView: React.FC<TableViewProps> = ({
  data,
  activeCategory,
  setActiveCategory,
  selectedMonth,
  setSelectedMonth,
  onOpenEntrySidebar,
}) => {
  // Mode tampilan: default 'month' sesuai tampilan tabel awal
  const [tableMode, setTableMode] = useState<'year' | 'month'>('month');

  // Hanya SATU filter pencarian tunggal sesuai permintaan pengguna
  const [searchQuery, setSearchQuery] = useState('');

  // 1. DATA REKAP 12 BULAN (Januari sampai dengan Desember)
  const yearlyDataList = useMemo<YearlyRow[]>(() => {
    if (!Array.isArray(data) || data.length === 0) return [];

    const matchCat = activeCategory.toUpperCase().trim();

    // Olah untuk setiap kecamatan di Bojonegoro
    const districtRows: YearlyRow[] = KECAMATAN_LIST.map(kec => {
      // Ambil PPM target dari data
      const sampleRow = data.find(r => 
        r[0]?.toString().toUpperCase().trim() === kec.toUpperCase().trim() &&
        (matchCat === 'SEMUA METODE' 
          ? r[7]?.toString().toUpperCase().trim() === 'SEMUA METODE' 
          : r[7]?.toString().toUpperCase().trim() === matchCat)
      );
      const ppm = sampleRow ? (parseFloat(String(sampleRow[1])) || 0) : 0;

      // Ambil capaian per bulan untuk Januari s/d Desember
      const monthly: { [month: string]: number } = {};
      MONTHS.forEach(m => {
        const row = data.find(r => 
          r[0]?.toString().toUpperCase().trim() === kec.toUpperCase().trim() &&
          (matchCat === 'SEMUA METODE' 
            ? r[7]?.toString().toUpperCase().trim() === 'SEMUA METODE' 
            : r[7]?.toString().toUpperCase().trim() === matchCat) &&
          r[8]?.toString().trim() === m
        );
        const blnIni = row ? (parseFloat(String(row[3])) || 0) : 0;
        monthly[m] = blnIni;
      });

      const totalCapaian = MONTHS.reduce((s, m) => s + (monthly[m] || 0), 0);
      const percentage = ppm > 0 ? (totalCapaian / ppm) * 100 : 0;
      const sisa = ppm - totalCapaian;

      return {
        kecamatan: kec,
        ppm,
        monthly,
        totalCapaian,
        percentage,
        sisa,
        category: activeCategory,
        isJumlah: false
      };
    });

    // Hitung baris JUMLAH KABUPATEN
    const kabPpm = districtRows.reduce((s, r) => s + r.ppm, 0);
    const kabMonthly: { [month: string]: number } = {};
    MONTHS.forEach(m => {
      kabMonthly[m] = districtRows.reduce((s, r) => s + (r.monthly[m] || 0), 0);
    });
    const kabTotalCapaian = MONTHS.reduce((s, m) => s + (kabMonthly[m] || 0), 0);
    const kabPercentage = kabPpm > 0 ? (kabTotalCapaian / kabPpm) * 100 : 0;
    const kabSisa = kabPpm - kabTotalCapaian;

    const totalRow: YearlyRow = {
      kecamatan: 'JUMLAH KABUPATEN',
      ppm: kabPpm,
      monthly: kabMonthly,
      totalCapaian: kabTotalCapaian,
      percentage: kabPercentage,
      sisa: kabSisa,
      category: activeCategory,
      isJumlah: true
    };

    return [...districtRows, totalRow];
  }, [data, activeCategory]);

  // Saring data 12 bulan menggunakan SATU filter pencarian
  const displayedYearlyRows = useMemo(() => {
    if (!searchQuery.trim()) return yearlyDataList;
    const q = searchQuery.toLowerCase().trim();

    return yearlyDataList.filter(row => 
      row.kecamatan.toLowerCase().includes(q) || 
      row.category.toLowerCase().includes(q) ||
      row.isJumlah
    );
  }, [yearlyDataList, searchQuery]);

  // Ringkasan metrik untuk 12 Bulan (Januari s/d Desember)
  const yearlySummaryStats = useMemo(() => {
    const totalRow = yearlyDataList.find(d => d.isJumlah);
    if (!totalRow) return null;

    // Cari bulan dengan capaian tertinggi
    let peakMonth = 'Januari';
    let peakValue = 0;
    MONTHS.forEach(m => {
      const val = totalRow.monthly[m] || 0;
      if (val > peakValue) {
        peakValue = val;
        peakMonth = m;
      }
    });

    return {
      ppm: totalRow.ppm,
      totalCapaian: totalRow.totalCapaian,
      percentage: totalRow.percentage,
      sisa: totalRow.sisa,
      peakMonth,
      peakValue
    };
  }, [yearlyDataList]);

  // 2. DATA PER BULAN SPESIFIK (Single Month View)
  const singleMonthDataList = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];

    return data
      .filter(row => {
        if (!Array.isArray(row)) return false;
        const rowCategory = row[7]?.toString().toUpperCase().trim();
        const targetCategory = activeCategory.toUpperCase().trim();

        const categoryMatch = targetCategory === 'SEMUA METODE'
          ? rowCategory === 'SEMUA METODE'
          : rowCategory === targetCategory;

        const rowMonth = row[8]?.toString().trim();
        const monthMatch = rowMonth === selectedMonth;

        return categoryMatch && monthMatch;
      })
      .map(row => {
        const ppm = parseFloat(String(row[1])) || 0;
        const blnLalu = parseFloat(String(row[2])) || 0;
        const blnIni = parseFloat(String(row[3])) || 0;
        const jumlah = parseFloat(String(row[4])) || 0;
        const sisa = parseFloat(String(row[6])) || 0;
        const percentage = ppm > 0 ? (jumlah / ppm) * 100 : 0;

        return {
          kecamatan: row[0]?.toString() || '',
          ppm,
          blnLalu,
          blnIni,
          jumlah,
          percentage,
          sisa,
          category: row[7]?.toString() || activeCategory,
          isJumlah: row[0]?.toString().toUpperCase().includes('JUMLAH')
        };
      });
  }, [data, activeCategory, selectedMonth]);

  const displayedSingleMonthRows = useMemo(() => {
    if (!searchQuery.trim()) return singleMonthDataList;
    const q = searchQuery.toLowerCase().trim();

    return singleMonthDataList.filter(row => 
      row.kecamatan.toLowerCase().includes(q) || 
      row.category.toLowerCase().includes(q) ||
      row.isJumlah
    );
  }, [singleMonthDataList, searchQuery]);

  const singleMonthSummary = useMemo(() => {
    const totalRow = singleMonthDataList.find(d => d.isJumlah);
    if (totalRow) return totalRow;

    const districtRows = singleMonthDataList.filter(d => !d.isJumlah);
    const ppm = districtRows.reduce((s, r) => s + r.ppm, 0);
    const blnLalu = districtRows.reduce((s, r) => s + r.blnLalu, 0);
    const blnIni = districtRows.reduce((s, r) => s + r.blnIni, 0);
    const jumlah = districtRows.reduce((s, r) => s + r.jumlah, 0);
    const sisa = districtRows.reduce((s, r) => s + r.sisa, 0);
    const percentage = ppm > 0 ? (jumlah / ppm) * 100 : 0;

    return {
      kecamatan: 'JUMLAH KABUPATEN',
      ppm,
      blnLalu,
      blnIni,
      jumlah,
      percentage,
      sisa,
      category: activeCategory,
      isJumlah: true
    };
  }, [singleMonthDataList, activeCategory]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(Math.round(num));
  };

  // Export ke CSV
  const handleExportCSV = () => {
    if (tableMode === 'year') {
      // Export 12 Bulan (Januari s/d Desember)
      const headers = [
        'No', 'Kecamatan', 'Metode', 'Target PPM',
        ...MONTHS,
        'Total Capaian', 'Prosentase (%)', 'Sisa Target'
      ];
      const rows: string[] = [headers.join(',')];

      displayedYearlyRows.forEach((row, idx) => {
        const line = [
          row.isJumlah ? '"-"' : idx + 1,
          `"${row.kecamatan}"`,
          `"${row.category}"`,
          row.ppm,
          ...MONTHS.map(m => row.monthly[m] || 0),
          row.totalCapaian,
          row.percentage.toFixed(2),
          row.sisa
        ];
        rows.push(line.join(','));
      });

      const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Tabel_KB_12_Bulan_Januari_s_d_Desember_${activeCategory}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Export Per Bulan
      const headers = ['No', 'Kecamatan', 'Metode', 'Bulan', 'PPM (Target)', 'Bulan Lalu', 'Bulan Ini', 'Jumlah Capaian', 'Prosentase (%)', 'Sisa Target'];
      const rows: string[] = [headers.join(',')];

      displayedSingleMonthRows.forEach((row, idx) => {
        const line = [
          row.isJumlah ? '"-"' : idx + 1,
          `"${row.kecamatan}"`,
          `"${row.category}"`,
          `"${selectedMonth}"`,
          row.ppm,
          row.blnLalu,
          row.blnIni,
          row.jumlah,
          row.percentage.toFixed(2),
          row.sisa
        ];
        rows.push(line.join(','));
      });

      const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Tabel_KB_${activeCategory}_${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-4">
      {/* Kartu Tabel Utama */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-xl overflow-hidden">
        {/* Header Tabel dengan Kontrol Periode & Filter */}
        <div className="p-4 sm:px-6 bg-slate-850 border-b border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30 shadow-inner">
              <TableIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base font-black text-slate-100 uppercase tracking-tight">
                  Tabel Data Capaian Pelayanan KB
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/30">
                  {activeCategory}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Kabupaten Bojonegoro &bull; Periode: <span className="text-teal-400 font-bold">{selectedMonth}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Pilihan Metode Kontrasepsi */}
            <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
              <Layers className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span className="text-[10px] text-slate-500 font-bold uppercase mr-1">Metode:</span>
              <select
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
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
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
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

        {/* SATU FILTER PENCARIAN TUNGGAL */}
        <div className="p-4 sm:px-6 bg-slate-900/70 border-b border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari data kecamatan atau metode kontrasepsi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl py-2.5 pl-10 pr-9 text-xs font-medium text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
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
              Menampilkan: <strong className="text-teal-400 font-bold">{displayedSingleMonthRows.length} baris</strong>
            </span>
            {searchQuery && (
              <span className="text-[11px] bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded border border-teal-500/20">
                Filter: &ldquo;{searchQuery}&rdquo;
              </span>
            )}
          </div>
        </div>

        {/* Ringkasan Metrik Singkat */}
        {tableMode === 'year' && yearlySummaryStats ? (
          <div className="bg-slate-850 px-4 sm:px-6 py-3 border-b border-slate-700 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Target PPM Tahunan</span>
              <span className="text-xs sm:text-sm font-black text-slate-200">{formatNumber(yearlySummaryStats.ppm)}</span>
            </div>
            <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800">
              <span className="text-[9px] font-bold text-teal-400 uppercase block">Total Capaian (Jan-Des)</span>
              <span className="text-xs sm:text-sm font-black text-teal-400">{formatNumber(yearlySummaryStats.totalCapaian)}</span>
            </div>
            <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Prosentase Tahunan</span>
              <span className={`text-xs sm:text-sm font-black ${
                yearlySummaryStats.percentage >= 80 ? 'text-emerald-400' : yearlySummaryStats.percentage >= 50 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {yearlySummaryStats.percentage.toFixed(1)}%
              </span>
            </div>
            <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Sisa Target</span>
              <span className={`text-xs sm:text-sm font-bold ${yearlySummaryStats.sisa <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatNumber(yearlySummaryStats.sisa)}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-slate-900/50 p-2 rounded-lg border border-slate-800 flex flex-col justify-center">
              <span className="text-[9px] font-bold text-sky-400 uppercase block flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3" /> Bulan Tertinggi
              </span>
              <span className="text-xs sm:text-sm font-black text-slate-200">
                {yearlySummaryStats.peakMonth} ({formatNumber(yearlySummaryStats.peakValue)})
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-slate-850 px-4 sm:px-6 py-3 border-b border-slate-700 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Total PPM Target</span>
              <span className="text-xs sm:text-sm font-black text-slate-200">{formatNumber(singleMonthSummary.ppm)}</span>
            </div>
            <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Bulan Lalu</span>
              <span className="text-xs sm:text-sm font-bold text-slate-300">{formatNumber(singleMonthSummary.blnLalu)}</span>
            </div>
            <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Bulan Ini</span>
              <span className="text-xs sm:text-sm font-bold text-sky-400">{formatNumber(singleMonthSummary.blnIni)}</span>
            </div>
            <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800">
              <span className="text-[9px] font-bold text-teal-400 uppercase block">Total Capaian</span>
              <span className="text-xs sm:text-sm font-black text-teal-400">{formatNumber(singleMonthSummary.jumlah)}</span>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-slate-900/50 p-2 rounded-lg border border-slate-800 flex flex-col justify-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">Prosentase</span>
              <span className={`text-xs sm:text-sm font-black ${
                singleMonthSummary.percentage >= 80 ? 'text-emerald-400' : singleMonthSummary.percentage >= 50 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {singleMonthSummary.percentage.toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        {/* TABEL 12 BULAN (JANUARI S/D DESEMBER) */}
        {tableMode === 'year' ? (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1280px]">
              <thead>
                <tr className="bg-slate-900/90 text-[10px] font-black text-slate-400 uppercase border-b border-slate-700 tracking-wider">
                  <th className="px-3 py-3.5 text-center w-12 sticky left-0 bg-slate-900 z-10">No</th>
                  <th className="px-4 py-3.5 sticky left-12 bg-slate-900 z-10 min-w-[160px]">Kecamatan</th>
                  <th className="px-3 py-3.5 text-center min-w-[90px] text-slate-300">PPM Target</th>
                  {MONTHS.map(m => (
                    <th key={m} className="px-2.5 py-3.5 text-center min-w-[65px]" title={m}>
                      {MONTH_ABBR[m] || m.slice(0, 3)}
                    </th>
                  ))}
                  <th className="px-3 py-3.5 text-center min-w-[100px] text-teal-400">Total Capaian</th>
                  <th className="px-3 py-3.5 w-[140px]">Prosentase</th>
                  <th className="px-3 py-3.5 text-center min-w-[90px]">Sisa Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {displayedYearlyRows.map((row, idx) => {
                  const isTotalRow = row.isJumlah;

                  return (
                    <tr 
                      key={row.kecamatan || idx} 
                      className={`transition-colors ${
                        isTotalRow 
                          ? 'bg-teal-500/10 font-bold border-t-2 border-teal-500/40 hover:bg-teal-500/15' 
                          : 'hover:bg-slate-750/50'
                      }`}
                    >
                      {/* No */}
                      <td className={`px-3 py-3 text-center text-xs font-medium sticky left-0 z-10 ${
                        isTotalRow ? 'bg-slate-850 font-bold text-teal-400' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {isTotalRow ? '-' : idx + 1}
                      </td>

                      {/* Kecamatan */}
                      <td className={`px-4 py-3 text-xs font-bold sticky left-12 z-10 ${
                        isTotalRow ? 'bg-slate-850 text-teal-300 uppercase' : 'bg-slate-800 text-slate-200'
                      }`}>
                        {row.kecamatan}
                      </td>

                      {/* PPM */}
                      <td className="px-3 py-3 text-center text-xs font-semibold text-slate-300">
                        {formatNumber(row.ppm)}
                      </td>

                      {/* 12 Kolom Bulan: Januari s/d Desember */}
                      {MONTHS.map(m => {
                        const val = row.monthly[m] || 0;
                        return (
                          <td 
                            key={m} 
                            className={`px-2.5 py-3 text-center text-xs ${
                              val > 0 
                                ? 'text-sky-300 font-semibold' 
                                : 'text-slate-600 font-normal'
                            }`}
                          >
                            {formatNumber(val)}
                          </td>
                        );
                      })}

                      {/* Total Capaian Kumulatif */}
                      <td className="px-3 py-3 text-center text-xs font-black text-teal-400">
                        {formatNumber(row.totalCapaian)}
                      </td>

                      {/* Prosentase Capaian */}
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between text-[10px] font-black text-slate-300">
                            <span>{row.percentage.toFixed(1)}%</span>
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

                      {/* Sisa Target */}
                      <td className={`px-3 py-3 text-center text-xs font-bold ${
                        row.sisa <= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {formatNumber(row.sisa)}
                      </td>
                    </tr>
                  );
                })}

                {displayedYearlyRows.length === 0 && (
                  <tr>
                    <td colSpan={18} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                        <Search className="w-8 h-8 text-slate-600 mb-1" />
                        <p className="text-sm font-bold text-slate-300">Data Tidak Ditemukan</p>
                        <p className="text-xs text-slate-500">
                          Tidak ada data kecamatan yang cocok dengan pencarian &ldquo;{searchQuery}&rdquo;.
                        </p>
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="mt-2 text-xs text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Hapus filter pencarian
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* TABEL PER BULAN (Detail Bulan Lalu & Bulan Ini) */
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-slate-900/90 text-[10px] font-black text-slate-400 uppercase border-b border-slate-700">
                  <th className="px-4 py-3.5 text-center w-12">No</th>
                  <th className="px-4 py-3.5">Kecamatan</th>
                  <th className="px-4 py-3.5 text-center">Metode</th>
                  <th className="px-4 py-3.5 text-center">PPM Target</th>
                  <th className="px-4 py-3.5 text-center">Bln Lalu</th>
                  <th className="px-4 py-3.5 text-center">Bln Ini</th>
                  <th className="px-4 py-3.5 text-center">Jumlah Capaian</th>
                  <th className="px-4 py-3.5 w-[150px]">Prosentase</th>
                  <th className="px-4 py-3.5 text-center">Sisa Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {displayedSingleMonthRows.map((row, idx) => {
                  const isTotalRow = row.isJumlah;

                  return (
                    <tr 
                      key={row.kecamatan || idx} 
                      className={`transition-colors ${
                        isTotalRow 
                          ? 'bg-teal-500/10 font-bold border-t-2 border-slate-600 hover:bg-teal-500/15' 
                          : 'hover:bg-slate-750/50'
                      }`}
                    >
                      <td className="px-4 py-3 text-center text-xs font-medium text-slate-500">
                        {isTotalRow ? '-' : idx + 1}
                      </td>

                      <td className="px-4 py-3 text-xs font-bold text-slate-200">
                        {row.kecamatan}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {row.category}
                        </span>
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
                            <span>{row.percentage.toFixed(1)}%</span>
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

                      <td className={`px-4 py-3 text-center text-xs font-bold ${
                        row.sisa <= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {formatNumber(row.sisa)}
                      </td>
                    </tr>
                  );
                })}

                {displayedSingleMonthRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                        <Search className="w-8 h-8 text-slate-600 mb-1" />
                        <p className="text-sm font-bold text-slate-300">Data Tidak Ditemukan</p>
                        <p className="text-xs text-slate-500">
                          Tidak ada data yang cocok dengan pencarian &ldquo;{searchQuery}&rdquo;.
                        </p>
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="mt-2 text-xs text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Hapus filter pencarian
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

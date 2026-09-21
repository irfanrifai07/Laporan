/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Target, Search, X, Edit3, 
  Layers, ShieldCheck, Info
} from 'lucide-react';
import { 
  OFFICIAL_PPM_LIST, 
  TOTAL_BOJONEGORO_PPM 
} from '../data/ppmData';

interface PpmViewProps {
  onOpenEntrySidebar?: (kecamatan?: string) => void;
}

export const PpmView: React.FC<PpmViewProps> = ({ onOpenEntrySidebar }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKec, setSelectedKec] = useState<string | null>(null);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(Math.round(num));
  };

  // Filter baris kecamatan
  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return OFFICIAL_PPM_LIST;
    return OFFICIAL_PPM_LIST.filter(item => 
      item.kecamatan.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-850 to-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Target className="w-5 h-5" />
            </div>
            <h2 className="text-base font-black text-slate-100 uppercase tracking-tight">
              Data Target PPM (Perkiraan Permintaan Masyarakat)
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Data target PPM resmi pelayanan KB Kabupaten Bojonegoro untuk 28 Kecamatan mencakup 7 metode kontrasepsi (<strong className="text-slate-200">IUD, MOW, MOP, KONDOM, IMPLAN, SUNTIK, PIL</strong>) beserta agregasi MKJP dan Non-MKJP.
          </p>
        </div>
      </div>

      {/* Ringkasan Statistik PPM Bojonegoro */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Target PPM</span>
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-100">{formatNumber(TOTAL_BOJONEGORO_PPM.total)}</span>
            <span className="text-xs font-semibold text-teal-400">Akseptor</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">28 Kecamatan se-Kab. Bojonegoro</p>
        </div>

        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Target MKJP</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-indigo-300">{formatNumber(TOTAL_BOJONEGORO_PPM.mkjp)}</span>
            <span className="text-xs font-semibold text-indigo-400">
              ({((TOTAL_BOJONEGORO_PPM.mkjp / TOTAL_BOJONEGORO_PPM.total) * 100).toFixed(2)}%)
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">IUD, MOW, MOP, Implan</p>
        </div>

        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">Target Non-MKJP</span>
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-sky-300">{formatNumber(TOTAL_BOJONEGORO_PPM.nonMkjp)}</span>
            <span className="text-xs font-semibold text-sky-400">
              ({((TOTAL_BOJONEGORO_PPM.nonMkjp / TOTAL_BOJONEGORO_PPM.total) * 100).toFixed(2)}%)
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
            Rincian Target PPM Kabupaten Bojonegoro Per Alokon
          </span>
          <span className="text-[10px] text-slate-500 font-semibold">Total: 7 Metode</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60">
            <span className="text-[10px] font-bold text-purple-400 block">IUD</span>
            <span className="text-base font-black text-slate-200 mt-0.5 block">{formatNumber(TOTAL_BOJONEGORO_PPM.IUD)}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60">
            <span className="text-[10px] font-bold text-rose-400 block">MOW</span>
            <span className="text-base font-black text-slate-200 mt-0.5 block">{formatNumber(TOTAL_BOJONEGORO_PPM.MOW)}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60">
            <span className="text-[10px] font-bold text-blue-400 block">MOP</span>
            <span className="text-base font-black text-slate-200 mt-0.5 block">{formatNumber(TOTAL_BOJONEGORO_PPM.MOP)}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60">
            <span className="text-[10px] font-bold text-cyan-400 block">KONDOM</span>
            <span className="text-base font-black text-slate-200 mt-0.5 block">{formatNumber(TOTAL_BOJONEGORO_PPM.KONDOM)}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60">
            <span className="text-[10px] font-bold text-amber-400 block">IMPLAN</span>
            <span className="text-base font-black text-slate-200 mt-0.5 block">{formatNumber(TOTAL_BOJONEGORO_PPM.IMPLAN)}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60">
            <span className="text-[10px] font-bold text-emerald-400 block">SUNTIK</span>
            <span className="text-base font-black text-slate-200 mt-0.5 block">{formatNumber(TOTAL_BOJONEGORO_PPM.SUNTIK)}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60">
            <span className="text-[10px] font-bold text-teal-400 block">PIL</span>
            <span className="text-base font-black text-slate-200 mt-0.5 block">{formatNumber(TOTAL_BOJONEGORO_PPM.PIL)}</span>
          </div>
        </div>
      </div>

      {/* Tabel Utama Data PPM */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-xl overflow-hidden">
        {/* Search Bar Tunggal */}
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
            {searchQuery && (
              <span className="text-[11px] bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded border border-teal-500/20">
                Filter: &ldquo;{searchQuery}&rdquo;
              </span>
            )}
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
                {onOpenEntrySidebar && (
                  <th className="px-3 py-3 text-center w-24" rowSpan={2}>Aksi</th>
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

                    {/* Aksi Entri */}
                    {onOpenEntrySidebar && (
                      <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onOpenEntrySidebar(row.kecamatan)}
                          className="inline-flex items-center px-2 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500 hover:text-white text-teal-400 border border-teal-500/30 text-xs font-bold transition-all cursor-pointer"
                          title={`Entri capaian untuk ${row.kecamatan}`}
                        >
                          <Edit3 className="w-3 h-3 mr-1" />
                          <span>Entri</span>
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
                  {formatNumber(TOTAL_BOJONEGORO_PPM.IUD)}
                </td>
                <td className="px-3 py-3.5 text-center text-xs font-black text-rose-300">
                  {formatNumber(TOTAL_BOJONEGORO_PPM.MOW)}
                </td>
                <td className="px-3 py-3.5 text-center text-xs font-black text-blue-300">
                  {formatNumber(TOTAL_BOJONEGORO_PPM.MOP)}
                </td>
                <td className="px-3 py-3.5 text-center text-xs font-black text-amber-300 border-r border-slate-700/40">
                  {formatNumber(TOTAL_BOJONEGORO_PPM.IMPLAN)}
                </td>
                <td className="px-3 py-3.5 text-center text-xs font-black text-emerald-300">
                  {formatNumber(TOTAL_BOJONEGORO_PPM.SUNTIK)}
                </td>
                <td className="px-3 py-3.5 text-center text-xs font-black text-teal-300">
                  {formatNumber(TOTAL_BOJONEGORO_PPM.PIL)}
                </td>
                <td className="px-3 py-3.5 text-center text-xs font-black text-cyan-300 border-r border-slate-700/40">
                  {formatNumber(TOTAL_BOJONEGORO_PPM.KONDOM)}
                </td>
                <td className="px-3 py-3.5 text-center text-xs font-black text-indigo-300 bg-indigo-500/10">
                  {formatNumber(TOTAL_BOJONEGORO_PPM.mkjp)}
                </td>
                <td className="px-3 py-3.5 text-center text-xs font-black text-sky-300 bg-sky-500/10 border-r border-slate-700/40">
                  {formatNumber(TOTAL_BOJONEGORO_PPM.nonMkjp)}
                </td>
                <td className="px-4 py-3.5 text-center text-sm font-black text-teal-300 bg-teal-500/20">
                  {formatNumber(TOTAL_BOJONEGORO_PPM.total)}
                </td>
                {onOpenEntrySidebar && (
                  <td className="px-3 py-3.5 text-center text-xs text-slate-500 font-bold">
                    -
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, Save, RotateCcw, CheckCircle2, ChevronRight, Layers, 
  ShieldCheck, Clock, Calculator, ArrowRight, Download, 
  HelpCircle, AlertCircle, FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  KECAMATAN_LIST, 
  MONTHS, 
  METHOD_KEYS, 
  METHOD_DETAILS, 
  ContraceptiveMethod, 
  AllMethodsEntry, 
  RawDataRow 
} from '../types';
import { 
  getInitialMethodEntry, 
  extractExistingValues, 
  applyMethodEntryToData, 
  saveLocalEntriesToStorage,
  getLastSavedTimestamp
} from '../utils/dataManager';

interface EntrySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentData: RawDataRow[];
  onDataUpdated: (newData: RawDataRow[], savedKec: string, savedMonth: string) => void;
  defaultMonth?: string;
  defaultKecamatan?: string;
}

export const EntrySidebar: React.FC<EntrySidebarProps> = ({
  isOpen,
  onClose,
  currentData,
  onDataUpdated,
  defaultMonth = 'Februari',
  defaultKecamatan = 'NGRAHO'
}) => {
  const [selectedKecamatan, setSelectedKecamatan] = useState(defaultKecamatan);
  const [selectedBulan, setSelectedBulan] = useState(defaultMonth);
  const [entries, setEntries] = useState<AllMethodsEntry>(getInitialMethodEntry());
  const [activeTab, setActiveTab] = useState<'all' | ContraceptiveMethod>('all');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [lastSavedTime, setLastSavedTime] = useState<string>('Tersimpan');
  const prevTargetRef = useRef<string>('');

  // Sync with default props when sidebar opens
  useEffect(() => {
    if (isOpen) {
      if (defaultMonth) setSelectedBulan(defaultMonth);
      if (defaultKecamatan) setSelectedKecamatan(defaultKecamatan);
    }
  }, [isOpen, defaultMonth, defaultKecamatan]);

  // Load existing values when kecamatan or month changes
  useEffect(() => {
    if (isOpen && currentData.length > 0) {
      const targetKey = `${selectedKecamatan}_${selectedBulan}`;
      if (prevTargetRef.current !== targetKey) {
        prevTargetRef.current = targetKey;
        const existing = extractExistingValues(currentData, selectedKecamatan, selectedBulan);
        setEntries(existing);
      }
    } else if (!isOpen) {
      prevTargetRef.current = '';
    }
  }, [isOpen, selectedKecamatan, selectedBulan, currentData]);

  // Handle single input change with REAL-TIME AUTO-SAVE
  const handleInputChange = (
    method: ContraceptiveMethod, 
    field: 'ppm' | 'blnLalu' | 'blnIni', 
    value: string
  ) => {
    const numValue = Math.max(0, parseFloat(value) || 0);
    const newEntries: AllMethodsEntry = {
      ...entries,
      [method]: {
        ...entries[method],
        [field]: numValue
      }
    };
    setEntries(newEntries);

    // AUTO-SAVE OTOMATIS: langsung terapkan perubahan ke data & simpan permanen ke localStorage
    const updatedData = applyMethodEntryToData(
      currentData,
      selectedKecamatan,
      selectedBulan,
      newEntries
    );

    saveLocalEntriesToStorage(updatedData);
    onDataUpdated(updatedData, selectedKecamatan, selectedBulan);

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    setLastSavedTime(timeStr);
  };

  // Auto calculate totals for MKJP, NON MKJP, and SEMUA METODE
  const calculatedSummaries = useMemo(() => {
    const mkjpMethods: ContraceptiveMethod[] = ['MOW', 'MOP', 'IUD', 'IMPLAN'];
    const nonMkjpMethods: ContraceptiveMethod[] = ['SUNTIK', 'PIL', 'KONDOM'];

    const getGroupTotals = (methods: ContraceptiveMethod[]) => {
      const ppm = methods.reduce((sum, m) => sum + (entries[m]?.ppm || 0), 0);
      const blnLalu = methods.reduce((sum, m) => sum + (entries[m]?.blnLalu || 0), 0);
      const blnIni = methods.reduce((sum, m) => sum + (entries[m]?.blnIni || 0), 0);
      const jumlah = blnLalu + blnIni;
      const percentage = ppm > 0 ? (jumlah / ppm) * 100 : 0;
      const sisa = ppm - jumlah;
      return { ppm, blnLalu, blnIni, jumlah, percentage, sisa };
    };

    const mkjp = getGroupTotals(mkjpMethods);
    const nonMkjp = getGroupTotals(nonMkjpMethods);
    const semua = {
      ppm: mkjp.ppm + nonMkjp.ppm,
      blnLalu: mkjp.blnLalu + nonMkjp.blnLalu,
      blnIni: mkjp.blnIni + nonMkjp.blnIni,
      jumlah: mkjp.jumlah + nonMkjp.jumlah,
      percentage: (mkjp.ppm + nonMkjp.ppm) > 0 ? ((mkjp.jumlah + nonMkjp.jumlah) / (mkjp.ppm + nonMkjp.ppm)) * 100 : 0,
      sisa: (mkjp.ppm + nonMkjp.ppm) - (mkjp.jumlah + nonMkjp.jumlah)
    };

    return { mkjp, nonMkjp, semua };
  }, [entries]);

  // Handle Save explicitly
  const handleSave = () => {
    const updatedData = applyMethodEntryToData(
      currentData,
      selectedKecamatan,
      selectedBulan,
      entries
    );

    saveLocalEntriesToStorage(updatedData);
    onDataUpdated(updatedData, selectedKecamatan, selectedBulan);

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    setLastSavedTime(timeStr);

    setToastMessage(`Semua data untuk ${selectedKecamatan} (${selectedBulan}) tersimpan otomatis dan aman.`);
    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
    }, 3500);
  };

  // Reset to current data
  const handleReset = () => {
    const existing = extractExistingValues(currentData, selectedKecamatan, selectedBulan);
    setEntries(existing);
  };

  // Helper format number
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(Math.round(num));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for mobile & click-away */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-xs"
          />

          {/* Sidebar Drawer Container */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[480px] lg:w-[540px] bg-slate-900 border-l border-slate-700 shadow-2xl z-50 flex flex-col overflow-hidden text-slate-100"
          >
            {/* Header */}
            <div className="p-4 sm:px-6 bg-slate-800 border-b border-slate-700 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-sm font-bold text-slate-100 uppercase tracking-tight">
                      Sidebar Entri Data Metode KB
                    </h2>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[9px] font-black text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />
                      Auto-Save Aktif
                    </span>
                  </div>
                  <p className="text-[10px] text-teal-400 font-semibold tracking-wider uppercase">
                    MOW &bull; MOP &bull; IUD &bull; IMPLAN &bull; SUNTIK &bull; PIL &bull; KONDOM
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700/80 transition-colors cursor-pointer"
                title="Tutup Panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification Toast */}
            {showSuccessToast && (
              <div className="bg-emerald-500 text-white text-xs px-4 py-2.5 flex items-center justify-between shadow-md shrink-0 animate-fade-in">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="font-semibold">{toastMessage}</span>
                </div>
                <button onClick={() => setShowSuccessToast(false)} className="text-white/80 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Body Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
              {/* Kecamatan & Periode Selection */}
              <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                    <Layers className="w-3.5 h-3.5 mr-1.5 text-teal-400" />
                    Target Entri Wilayah & Waktu
                  </span>
                  <button
                    onClick={handleReset}
                    type="button"
                    className="text-[10px] font-bold text-slate-400 hover:text-teal-400 flex items-center transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" /> Muat Ulang Data
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                      Kecamatan
                    </label>
                    <select
                      value={selectedKecamatan}
                      onChange={(e) => setSelectedKecamatan(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs font-semibold text-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      {KECAMATAN_LIST.map(kec => (
                        <option key={kec} value={kec}>{kec}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                      Bulan / Periode
                    </label>
                    <select
                      value={selectedBulan}
                      onChange={(e) => setSelectedBulan(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs font-semibold text-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      {MONTHS.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Method Selector Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-teal-500 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  Semua 7 Metode
                </button>

                {METHOD_KEYS.map(key => {
                  const meta = METHOD_DETAILS[key];
                  const isActive = activeTab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveTab(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-teal-500 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {key}
                    </button>
                  );
                })}
              </div>

              {/* Input Forms for Methods */}
              <div className="space-y-3">
                {METHOD_KEYS.map(methodKey => {
                  if (activeTab !== 'all' && activeTab !== methodKey) return null;

                  const meta = METHOD_DETAILS[methodKey];
                  const entry = entries[methodKey];
                  const jumlah = (entry.blnLalu || 0) + (entry.blnIni || 0);
                  const percentage = entry.ppm > 0 ? (jumlah / entry.ppm) * 100 : 0;
                  const sisa = (entry.ppm || 0) - jumlah;

                  return (
                    <div 
                      key={methodKey}
                      className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 sm:p-4 shadow-sm hover:border-slate-600 transition-colors"
                    >
                      {/* Card Top / Title */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider border ${meta.badgeColor}`}>
                            {meta.label}
                          </span>
                          <span className="text-xs font-bold text-slate-200">
                            {meta.fullName}
                          </span>
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                          {meta.category}
                        </span>
                      </div>

                      {/* 3 Input Columns: PPM, Bln Lalu, Bln Ini */}
                      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-3">
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">
                            PPM (Target)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={entry.ppm === 0 ? '' : entry.ppm}
                            placeholder="0"
                            onChange={(e) => handleInputChange(methodKey, 'ppm', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">
                            Bln Lalu
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={entry.blnLalu === 0 ? '' : entry.blnLalu}
                            placeholder="0"
                            onChange={(e) => handleInputChange(methodKey, 'blnLalu', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">
                            Bln Ini
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={entry.blnIni === 0 ? '' : entry.blnIni}
                            placeholder="0"
                            onChange={(e) => handleInputChange(methodKey, 'blnIni', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                          />
                        </div>
                      </div>

                      {/* Live Calculation Footnote for this method */}
                      <div className="bg-slate-900/60 rounded-lg px-3 py-2 flex items-center justify-between text-[11px] border border-slate-800">
                        <div>
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Capaian</span>
                          <span className="font-extrabold text-teal-400">{formatNumber(jumlah)}</span>
                        </div>
                        <div className="text-center">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Prosentase</span>
                          <span className={`font-black ${
                            percentage >= 80 ? 'text-emerald-400' : percentage >= 50 ? 'text-amber-400' : 'text-rose-400'
                          }`}>
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Sisa</span>
                          <span className="font-extrabold text-slate-300">{formatNumber(sisa)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Aggregated Realtime Summary Box */}
              <div className="bg-slate-800/95 border border-slate-700 rounded-xl p-4 space-y-3">
                <div className="flex items-center space-x-2 text-slate-300">
                  <Calculator className="w-4 h-4 text-teal-400" />
                  <span className="text-[11px] font-black uppercase tracking-wider">
                    Ringkasan Otomatis ({selectedKecamatan})
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-700/60 text-center">
                  {/* MKJP */}
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700/50">
                    <span className="text-[9px] font-black text-rose-400 block uppercase">MKJP</span>
                    <span className="text-xs font-bold text-slate-100 block">{formatNumber(calculatedSummaries.mkjp.jumlah)} / {formatNumber(calculatedSummaries.mkjp.ppm)}</span>
                    <span className="text-[10px] font-extrabold text-emerald-400">{calculatedSummaries.mkjp.percentage.toFixed(1)}%</span>
                  </div>

                  {/* NON MKJP */}
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700/50">
                    <span className="text-[9px] font-black text-sky-400 block uppercase">NON MKJP</span>
                    <span className="text-xs font-bold text-slate-100 block">{formatNumber(calculatedSummaries.nonMkjp.jumlah)} / {formatNumber(calculatedSummaries.nonMkjp.ppm)}</span>
                    <span className="text-[10px] font-extrabold text-emerald-400">{calculatedSummaries.nonMkjp.percentage.toFixed(1)}%</span>
                  </div>

                  {/* SEMUA METODE */}
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-teal-500/30">
                    <span className="text-[9px] font-black text-teal-400 block uppercase">TOTAL SEMUA</span>
                    <span className="text-xs font-bold text-slate-100 block">{formatNumber(calculatedSummaries.semua.jumlah)} / {formatNumber(calculatedSummaries.semua.ppm)}</span>
                    <span className="text-[10px] font-extrabold text-teal-300">{calculatedSummaries.semua.percentage.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Footer Action Bar */}
            <div className="p-4 sm:px-6 bg-slate-800 border-t border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center space-x-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-[11px] font-bold text-emerald-400 block sm:inline">
                    Tersimpan Otomatis{lastSavedTime !== 'Tersimpan' ? ` (${lastSavedTime})` : ''}
                  </span>
                  <span className="text-[10px] text-slate-400 sm:ml-1 hidden sm:inline">&bull; Data tidak akan hilang</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs shadow-lg shadow-teal-500/20 flex items-center transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Simpan & Kunci
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

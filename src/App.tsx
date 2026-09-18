/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, Label
} from 'recharts';
import { 
  LayoutDashboard, Table as TableIcon, Search, Menu, X, ChevronRight, 
  ShieldCheck, Clock, Layers, Filter, ArrowUp, ArrowDown, Globe,
  Activity, ArrowDownRight, ArrowUpRight, RefreshCw, AlertCircle,
  FileSpreadsheet, Plus, Edit3, CheckCircle2, RotateCcw, Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  RawDataRow, 
  AppView, 
  MONTHS, 
  METHOD_KEYS, 
  METHOD_DETAILS,
  KECAMATAN_LIST 
} from './types';
import { 
  loadLocalEntriesFromStorage, 
  saveLocalEntriesToStorage, 
  clearLocalStorage,
  emptyEnteredAchievements,
  syncDataWithOfficialPpm,
  generateMasterDatasetFromOfficialPpm
} from './utils/dataManager';
import { EntrySidebar } from './components/EntrySidebar';
import { EntryView } from './components/EntryView';
import { TableView } from './components/TableView';
import { PpmView } from './components/PpmView';

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DEFAULT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyiaIUC4ix2zTp4bFnvHPouJ0S2MMeI-KS360qzarAS1aODo_1FwDTuOSj0ybuHrCu5/exec?type=json";
const WEB_APP_URL = import.meta.env.VITE_WEB_APP_URL || DEFAULT_WEB_APP_URL;

export default function App() {
  const [data, setData] = useState<RawDataRow[]>(() => {
    const local = loadLocalEntriesFromStorage();
    if (local && local.length > 0) {
      return syncDataWithOfficialPpm(local);
    }
    return generateMasterDatasetFromOfficialPpm();
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('Semua Metode');
  const [selectedMonth, setSelectedMonth] = useState('Februari');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);

  // Entry Sidebar State
  const [isEntrySidebarOpen, setIsEntrySidebarOpen] = useState(false);
  const [entryTargetKecamatan, setEntryTargetKecamatan] = useState<string>('NGRAHO');
  const [notification, setNotification] = useState<string | null>(null);
  const [showEmptyConfirmModal, setShowEmptyConfirmModal] = useState(false);

  // Auto-sync any data change to localStorage continuously
  useEffect(() => {
    if (data && data.length > 0) {
      saveLocalEntriesToStorage(data);
    }
  }, [data]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      refreshDataSilently();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    // If local storage already has data, sync it with official PPM targets and keep entered achievements
    const localSaved = loadLocalEntriesFromStorage();
    if (localSaved && localSaved.length > 0) {
      const synced = syncDataWithOfficialPpm(localSaved);
      setData(synced);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await fetch(WEB_APP_URL);
      if (!response.ok) {
        throw new Error(`Koneksi database gagal (Status: ${response.status})`);
      }
      const jsonData = await response.json();
      if (Array.isArray(jsonData) && jsonData.length > 0) {
        const synced = syncDataWithOfficialPpm(emptyEnteredAchievements(jsonData));
        setData(synced);
        saveLocalEntriesToStorage(synced);
      } else {
        const master = generateMasterDatasetFromOfficialPpm();
        setData(master);
        saveLocalEntriesToStorage(master);
      }
    } catch (error: any) {
      // Gunakan dataset target PPM resmi Bojonegoro jika offline atau network issue
      const master = generateMasterDatasetFromOfficialPpm();
      setData(master);
      saveLocalEntriesToStorage(master);
    } finally {
      setIsLoading(false);
    }
  };

  // Kosongkan semua data yang sudah dientri (reset capaian ke 0) dengan konfirmasi
  const confirmEmptyAllEnteredData = () => {
    setData(prevData => {
      const emptied = emptyEnteredAchievements(prevData);
      saveLocalEntriesToStorage(emptied);
      return emptied;
    });
    setShowEmptyConfirmModal(false);
    setNotification("Semua data capaian yang sudah dientri berhasil dikosongkan. Target PPM resmi tetap tersimpan.");
    setTimeout(() => setNotification(null), 4000);
  };

  const refreshDataSilently = async () => {
    try {
      const localSaved = loadLocalEntriesFromStorage();
      if (localSaved && localSaved.length > 0) {
        // Jangan timpa data yang sudah disimpan/dientri pengguna
        return;
      }
      setIsRefreshing(true);
      const response = await fetch(WEB_APP_URL);
      if (response.ok) {
        const jsonData = await response.json();
        if (Array.isArray(jsonData)) {
          const currentLocal = loadLocalEntriesFromStorage();
          if (!currentLocal) {
            const emptied = emptyEnteredAchievements(jsonData);
            setData(emptied);
            saveLocalEntriesToStorage(emptied);
          }
        }
      }
    } catch (error) {
      console.error("Background sync error:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Reset to original data from Google Sheets API
  const handleResetToApiData = async () => {
    clearLocalStorage();
    await fetchData();
    setNotification("Data telah direset kembali ke data default dari Google Sheets.");
    setTimeout(() => setNotification(null), 4000);
  };

  // Callback when data is saved in EntrySidebar
  const handleDataSaved = (newData: RawDataRow[], savedKec: string, savedMonth: string) => {
    setData(newData);
    saveLocalEntriesToStorage(newData);
    setNotification(`Data untuk ${savedKec} (${savedMonth}) tersimpan otomatis.`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleOpenEntrySidebar = (kecamatan?: string) => {
    if (kecamatan) {
      setEntryTargetKecamatan(kecamatan);
    }
    setIsEntrySidebarOpen(true);
  };

  const filteredData = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];
    
    return data.filter(row => {
      if (!Array.isArray(row)) return false;
      const rowCategory = row[7]?.toString().toUpperCase().trim();
      const targetCategory = activeCategory.toUpperCase().trim();
      
      const categoryMatch = targetCategory === 'SEMUA METODE' 
        ? rowCategory === 'SEMUA METODE' 
        : rowCategory === targetCategory;
        
      const rowMonth = row[8]?.toString().trim();
      const monthMatch = rowMonth === selectedMonth;
      
      return categoryMatch && monthMatch;
    }).map(row => {
      const ppm = parseFloat(String(row[1])) || 0;
      const capaian = parseFloat(String(row[4])) || 0;
      const sisa = parseFloat(String(row[6])) || 0;
      const percentage = ppm > 0 ? (capaian / ppm) * 100 : 0;
      
      return {
        kecamatan: row[0]?.toString() || "",
        ppm,
        blnLalu: parseFloat(String(row[2])) || 0,
        blnIni: parseFloat(String(row[3])) || 0,
        jumlah: capaian,
        percentage,
        sisa,
        isJumlah: row[0]?.toString().toUpperCase().includes("JUMLAH")
      };
    });
  }, [data, activeCategory, selectedMonth]);

  const statsData = useMemo(() => {
    const list = filteredData.filter(d => !d.isJumlah);
    if (!list.length) return { highest: null, lowest: null, total: null };

    const sorted = [...list].sort((a, b) => b.percentage - a.percentage);
    const totalRow = filteredData.find(d => d.isJumlah);

    return {
      highest: sorted[0],
      lowest: sorted[sorted.length - 1],
      total: totalRow
    };
  }, [filteredData]);

  const chartData = useMemo(() => {
    return filteredData
      .filter(d => !d.isJumlah)
      .filter(d => d.kecamatan.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => b.percentage - a.percentage);
  }, [filteredData, searchQuery]);

  const tableData = useMemo(() => {
    return filteredData.filter(d => d.kecamatan.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [filteredData, searchQuery]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(Math.round(num));
  };

  if (isLoading && data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-teal-400">
        <Activity className="w-12 h-12 animate-pulse mb-4" />
        <p className="font-semibold tracking-wider text-sm">MENGHUBUNGKAN KE DATABASE...</p>
      </div>
    );
  }

  if (fetchError && data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-200 p-6">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md text-center shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-100 mb-2">Gagal Memuat Data</h2>
          <p className="text-xs text-slate-400 mb-6">{fetchError}</p>
          <button
            onClick={() => fetchData()}
            className="inline-flex items-center px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-semibold text-xs rounded-lg transition-colors shadow-lg cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Coba Hubungkan Kembali
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-900 font-sans text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: sidebarOpen ? 260 : 80 }}
        className="bg-slate-800 border-r border-slate-700 flex flex-col z-20"
      >
        <div className="h-16 flex items-center px-6 border-bottom border-slate-700 bg-teal-500 text-white shrink-0">
          <Layers className="w-6 h-6 mr-3" />
          {sidebarOpen && <span className="font-bold tracking-tight">LAPORAN BULANAN</span>}
        </div>

        <div className="p-4 shrink-0">
          {sidebarOpen && <label className="text-[10px] uppercase tracking-widest text-slate-400 mb-2 block font-bold">Periode</label>}
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 custom-scrollbar">
          <div className="px-4 py-2">
            {sidebarOpen && <label className="text-[10px] uppercase tracking-widest text-slate-500 block mb-2 px-2 font-bold">MENU UTAMA</label>}
            <button 
              onClick={() => {
                setCurrentView(AppView.DASHBOARD);
                setIsEntrySidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center px-3 py-2.5 rounded-lg transition-colors mb-1 cursor-pointer",
                currentView === AppView.DASHBOARD ? "bg-teal-500/15 text-teal-400 border border-teal-500/30 font-bold" : "text-slate-400 hover:bg-slate-700/50"
              )}
            >
              <LayoutDashboard className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span className="ml-3 text-xs font-semibold">Dashboard</span>}
            </button>
            <button 
              onClick={() => {
                setCurrentView(AppView.TABLE);
                setIsEntrySidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center px-3 py-2.5 rounded-lg transition-colors mb-1 cursor-pointer",
                currentView === AppView.TABLE ? "bg-teal-500/15 text-teal-400 border border-teal-500/30 font-bold" : "text-slate-400 hover:bg-slate-700/50"
              )}
            >
              <TableIcon className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span className="ml-3 text-xs font-semibold">Data Tabel</span>}
            </button>
            <button 
              onClick={() => {
                setCurrentView(AppView.ENTRY);
                setIsEntrySidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center px-3 py-2.5 rounded-lg transition-colors mb-1 cursor-pointer",
                currentView === AppView.ENTRY ? "bg-teal-500/15 text-teal-400 border border-teal-500/30 font-bold" : "text-slate-400 hover:bg-slate-700/50"
              )}
            >
              <FileSpreadsheet className="w-5 h-5 shrink-0 text-teal-400" />
              {sidebarOpen && (
                <div className="ml-3 flex items-center justify-between flex-1">
                  <span className="text-xs font-semibold">Entri Data</span>
                </div>
              )}
            </button>
            <button 
              onClick={() => {
                setCurrentView(AppView.PPM);
                setIsEntrySidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center px-3 py-2.5 rounded-lg transition-colors mb-2 cursor-pointer",
                currentView === AppView.PPM ? "bg-teal-500/15 text-teal-400 border border-teal-500/30 font-bold" : "text-slate-400 hover:bg-slate-700/50"
              )}
            >
              <Target className="w-5 h-5 shrink-0 text-teal-400" />
              {sidebarOpen && (
                <div className="ml-3 flex items-center justify-between flex-1">
                  <span className="text-xs font-semibold">Data PPM</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">Target</span>
                </div>
              )}
            </button>
          </div>
        </nav>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold text-teal-400 uppercase tracking-tighter">
                {currentView === AppView.DASHBOARD 
                  ? 'Dashboard Visual Capaian' 
                  : currentView === AppView.TABLE 
                  ? 'Tabel Capaian Layanan' 
                  : currentView === AppView.PPM
                  ? 'Data Target PPM Resmi Bojonegoro'
                  : 'Manajemen Entri Data Metode KB'}
              </h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                {currentView === AppView.PPM
                  ? 'Target Resmi 28 Kecamatan'
                  : `${activeCategory} \u2022 ${selectedMonth}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={() => fetchData()}
              disabled={isLoading || isRefreshing}
              title="Segarkan data dari Google Sheets"
              className="p-2 hover:bg-slate-700 text-slate-400 hover:text-teal-400 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", (isLoading || isRefreshing) && "animate-spin text-teal-400")} />
            </button>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Cari kecamatan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-full py-1.5 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 w-32 sm:w-48 transition-all focus:w-56"
              />
            </div>
          </div>
        </header>

        {/* Global Toast Notification */}
        {notification && (
          <div className="bg-teal-500 text-white px-6 py-2 text-xs font-semibold flex items-center justify-between shadow-md z-10 shrink-0">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{notification}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-white/80 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth bg-slate-900/50 custom-scrollbar">
          {/* Stats Summary - Visible on Dashboard view */}
          {currentView === AppView.DASHBOARD && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <StatCard 
                label="Capaian Tertinggi" 
                name={statsData.highest?.kecamatan || '-'}
                value={statsData.highest?.percentage || 0}
                icon={ArrowUpRight}
                color="emerald"
              />
              <StatCard 
                label="Capaian Terendah" 
                name={statsData.lowest?.kecamatan || '-'}
                value={statsData.lowest?.percentage || 0}
                icon={ArrowDownRight}
                color="rose"
              />
              <StatCard 
                label="Total Kabupaten" 
                name="AKUMULASI"
                value={statsData.total?.percentage || 0}
                icon={Globe}
                color="sky"
              />
            </div>
          )}

          <AnimatePresence mode="wait">
            {currentView === AppView.DASHBOARD ? (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Main Bar Chart */}
                  <div className="lg:col-span-3 bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Grafik Capaian Per Kecamatan</h3>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center text-[10px] text-emerald-400 font-bold"><div className="w-2 h-2 rounded-full bg-emerald-500 mr-1"></div> {'>'}80%</span>
                        <span className="flex items-center text-[10px] text-amber-400 font-bold"><div className="w-2 h-2 rounded-full bg-amber-500 mr-1"></div> 50-80%</span>
                        <span className="flex items-center text-[10px] text-rose-400 font-bold"><div className="w-2 h-2 rounded-full bg-rose-500 mr-1"></div> {'<'}50%</span>
                      </div>
                    </div>
                    <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                          <XAxis 
                            dataKey="kecamatan" 
                            interval={0} 
                            tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }}
                            angle={-45}
                            textAnchor="end"
                            stroke="#334155"
                          />
                          <YAxis 
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            stroke="#334155"
                            domain={[0, (dataMax: number) => Math.max(100, Math.ceil(dataMax / 10) * 10)]}
                            tickFormatter={(v) => `${v}%`}
                          />
                          <Tooltip 
                            cursor={{ fill: 'rgba(20, 184, 166, 0.05)' }}
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                            itemStyle={{ color: '#2dd4bf', fontWeight: 'bold' }}
                          />
                          <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.percentage >= 80 ? '#10b981' : (entry.percentage >= 50 ? '#f59e0b' : '#ef4444')} 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Summary Pie Chart */}
                  <div className="lg:col-span-1 bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl flex flex-col items-center">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 w-full text-center border-b border-slate-700 pb-3 mb-6 decoration-teal-500 decoration-2 underline-offset-8">Sisa dan Capaian</h3>
                    <div className="relative w-full h-[180px] mb-8">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Capaian', value: statsData.total?.jumlah || 0 },
                              { name: 'Sisa', value: statsData.total?.sisa || 0 },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            <Cell fill="#0ea5e9" />
                            <Cell fill="#ef4444" />
                            <Label 
                              value={`${statsData.total?.percentage.toFixed(1)}%`}
                              position="center"
                              className="fill-slate-100 font-black text-lg"
                            />
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full space-y-4">
                      <div className="flex flex-col items-center border-t border-slate-700/50 pt-4">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total PPM</span>
                        <span className="text-xl font-black text-teal-400">{formatNumber(statsData.total?.ppm || 0)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <span className="text-[9px] font-black text-sky-400 uppercase">Capaian</span>
                          <span className="block text-sm font-bold">{formatNumber(statsData.total?.jumlah || 0)}</span>
                        </div>
                        <div className="text-center">
                          <span className="text-[9px] font-black text-rose-400 uppercase">Sisa</span>
                          <span className="block text-sm font-bold">{formatNumber(statsData.total?.sisa || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Panel Metode Kontrasepsi di dalam Dashboard (Sesuai Permintaan) */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 sm:p-6 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-black uppercase tracking-wider text-slate-200">
                            Metode Kontrasepsi & Capaian Pelayanan
                          </h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30">
                            {selectedMonth}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Pilih metode kontrasepsi untuk memfilter visualisasi grafik capaian dan analisis spesifik di atas
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {['Semua Metode', 'MKJP', 'NON MKJP'].map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setActiveCategory(cat)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                            activeCategory === cat 
                              ? "bg-teal-500 text-white shadow-md shadow-teal-500/20 ring-1 ring-teal-400" 
                              : "bg-slate-900/60 hover:bg-slate-750 text-slate-300 border border-slate-700"
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Grid 7 Alokon */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                    {METHOD_KEYS.map(key => {
                      const meta = METHOD_DETAILS[key];
                      const isSelected = activeCategory.toUpperCase().trim() === key.toUpperCase().trim();

                      // Filter data per metode dan bulan
                      const rows = data.filter(r => 
                        !r[0]?.toString().toUpperCase().includes('JUMLAH') &&
                        r[7]?.toString().toUpperCase().trim() === key &&
                        r[8]?.toString().trim() === selectedMonth
                      );
                      const mPpm = rows.reduce((s, r) => s + (parseFloat(String(r[1])) || 0), 0);
                      const mBlnLalu = rows.reduce((s, r) => s + (parseFloat(String(r[2])) || 0), 0);
                      const mBlnIni = rows.reduce((s, r) => s + (parseFloat(String(r[3])) || 0), 0);
                      const mCapaian = rows.reduce((s, r) => s + (parseFloat(String(r[4])) || 0), 0);
                      const mPerc = mPpm > 0 ? (mCapaian / mPpm) * 100 : 0;

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setActiveCategory(key)}
                          className={cn(
                            "p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group",
                            isSelected 
                              ? "bg-teal-500/15 border-teal-500 ring-2 ring-teal-500/30 shadow-lg shadow-teal-500/10" 
                              : "bg-slate-900/50 hover:bg-slate-750 border-slate-700 hover:border-slate-600"
                          )}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className={cn("text-[10px] font-black px-1.5 py-0.5 rounded border", meta.badgeColor)}>
                                {meta.label}
                              </span>
                              <span className="text-[9px] font-bold text-slate-500 uppercase">{meta.category}</span>
                            </div>
                            <span className="text-xs font-bold text-slate-200 block truncate group-hover:text-teal-300">
                              {meta.fullName}
                            </span>
                          </div>

                          <div className="mt-3 pt-2 border-t border-slate-700/60 space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-400">Target PPM:</span>
                              <span className="font-semibold text-slate-200">{formatNumber(mPpm)}</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-400">Capaian:</span>
                              <span className="font-bold text-teal-400">{formatNumber(mCapaian)}</span>
                            </div>
                            <div className="flex items-center justify-between pt-1">
                              <div className="h-1.5 w-14 bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-full rounded-full",
                                    mPerc >= 80 ? "bg-emerald-500" : mPerc >= 50 ? "bg-amber-500" : "bg-rose-500"
                                  )}
                                  style={{ width: `${Math.min(mPerc, 100)}%` }}
                                />
                              </div>
                              <span className={cn(
                                "text-[10px] font-black",
                                mPerc >= 80 ? "text-emerald-400" : mPerc >= 50 ? "text-amber-400" : "text-rose-400"
                              )}>
                                {mPerc.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            ) : currentView === AppView.TABLE ? (
              <motion.div 
                key="table"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <TableView
                  data={data}
                  activeCategory={activeCategory}
                  setActiveCategory={setActiveCategory}
                  selectedMonth={selectedMonth}
                  setSelectedMonth={setSelectedMonth}
                  onOpenEntrySidebar={handleOpenEntrySidebar}
                />
              </motion.div>
            ) : currentView === AppView.PPM ? (
              <motion.div
                key="ppm-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <PpmView />
              </motion.div>
            ) : (
              <motion.div
                key="entry-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <EntryView
                  data={data}
                  activeCategory={activeCategory}
                  setActiveCategory={setActiveCategory}
                  selectedMonth={selectedMonth}
                  setSelectedMonth={setSelectedMonth}
                  onOpenEntrySidebar={handleOpenEntrySidebar}
                  onResetToApiData={handleResetToApiData}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Info */}
        <footer className="h-8 bg-slate-800 border-t border-slate-700 px-6 flex items-center justify-between text-[10px] font-bold text-slate-500 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-emerald-400">Penyimpanan Otomatis Aktif (Auto-Save)</span>
          </div>
          <span>SISTEM INFORMASI CAPAIAN LAYANAN &bull; 2024</span>
        </footer>
      </main>

      {/* Dedicated Sliding Entry Sidebar for MOW, MOP, IUD, IMPLAN, SUNTIK, PIL, KONDOM */}
      <EntrySidebar
        isOpen={isEntrySidebarOpen}
        onClose={() => setIsEntrySidebarOpen(false)}
        currentData={data}
        onDataUpdated={handleDataSaved}
        defaultMonth={selectedMonth}
        defaultKecamatan={entryTargetKecamatan}
      />

      {/* Modal Konfirmasi Kosongkan Data */}
      {showEmptyConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Kosongi Data Entri Capaian?</h3>
                <p className="text-[11px] text-slate-400">Konfirmasi pengosongan capaian</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Tindakan ini akan mengosongkan (me-reset ke <strong>0</strong>) seluruh angka capaian pelayanan yang telah dientri pada semua kecamatan. Target PPM tetap dipertahankan.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEmptyConfirmModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmEmptyAllEnteredData}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                Ya, Kosongkan Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, name, value, icon: Icon, color }: { label: string, name: string, value: number, icon: any, color: 'emerald' | 'rose' | 'sky' }) {
  const styles = {
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    rose: "bg-rose-500/10 border-rose-500/20 text-rose-400",
    sky: "bg-sky-500/10 border-sky-500/20 text-sky-400"
  };

  const iconBg = {
    emerald: "bg-emerald-500/20",
    rose: "bg-rose-500/20",
    sky: "bg-sky-500/20"
  };

  return (
    <div className={cn("p-4 rounded-xl border flex items-center space-x-4 shadow-lg bg-slate-800", styles[color])}>
      <div className={cn("p-3 rounded-xl", iconBg[color])}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 overflow-hidden">
        <label className="text-[9px] font-black uppercase tracking-widest opacity-70">{label}</label>
        <span className="block text-sm font-bold truncate text-slate-200">{name}</span>
        <span className="block text-xl font-black">{value.toFixed(1)}%</span>
      </div>
    </div>
  );
}

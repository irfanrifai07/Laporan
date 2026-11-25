/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Label
} from 'recharts';
import { 
  LayoutDashboard, Table as TableIcon, Search, Menu, X, 
  Layers, Globe,
  Activity, ArrowDownRight, ArrowUpRight, RefreshCw, AlertCircle,
  FileSpreadsheet, CheckCircle2, RotateCcw, Target, Download, Calendar, LogOut, KeyRound,
  BarChart3, EyeOff
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
  AuthUser
} from './types';
import { exportTableToExcel } from './utils/excelExport';
import { 
  getOfficialPpm, 
  PpmTargetMap, 
  RAW_PPM_DATA, 
  setActivePpmTargets, 
  setActivePpmYear 
} from './data/ppmData';
import { 
  loadLocalEntriesFromStorage, 
  saveLocalEntriesToStorage, 
  clearLocalStorage,
  emptyEnteredAchievements,
  syncDataWithOfficialPpm,
  generateMasterDatasetFromOfficialPpm,
  isMonthEntered,
  resetEnteredMonths
} from './utils/dataManager';
import {
  subscribeToRealtimeKbData,
  clearAllEntriesInFirebase,
  savePpmTargetsToFirebase,
  clearPpmTargetsForYearInFirebase,
  deletePpmTargetsYearFromFirebase,
  getDatasetForYearFromEntries,
  FirestoreKbEntryDoc
} from './utils/firebaseSync';
import { EntrySidebar } from './components/EntrySidebar';
import { EntryView } from './components/EntryView';
import { TableView } from './components/TableView';
import { PpmView } from './components/PpmView';
import { LoginView } from './components/LoginView';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import logoBojonegoro from './assets/logo_bojonegoro.svg';

interface DashboardCategoryItem {
  id: string;
  label: string;
  categoryTag: string;
  fullName: string;
  badgeColor: string;
  groupKey: string;
}

const DASHBOARD_CATEGORIES: DashboardCategoryItem[] = [
  {
    id: 'Semua Metode',
    label: 'SEMUA',
    categoryTag: 'TOTAL',
    fullName: 'Semua Metode KB',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    groupKey: 'SEMUA METODE'
  },
  {
    id: 'MKJP',
    label: 'MKJP',
    categoryTag: 'AGREGASI',
    fullName: 'Metode Jangka Panjang',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    groupKey: 'MKJP'
  },
  {
    id: 'NON MKJP',
    label: 'NON MKJP',
    categoryTag: 'AGREGASI',
    fullName: 'Non Jangka Panjang',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    groupKey: 'NON MKJP'
  },
  {
    id: 'MOW',
    label: 'MOW',
    categoryTag: 'MKJP',
    fullName: 'Metode Operasi Wanita',
    badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    groupKey: 'MOW'
  },
  {
    id: 'MOP',
    label: 'MOP',
    categoryTag: 'MKJP',
    fullName: 'Metode Operasi Pria',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    groupKey: 'MOP'
  },
  {
    id: 'IUD',
    label: 'IUD',
    categoryTag: 'MKJP',
    fullName: 'Spiral (IUD)',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    groupKey: 'IUD'
  },
  {
    id: 'IMPLAN',
    label: 'IMPLAN',
    categoryTag: 'MKJP',
    fullName: 'Implan (Susuk KB)',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    groupKey: 'IMPLAN'
  },
  {
    id: 'SUNTIK',
    label: 'SUNTIK',
    categoryTag: 'NON MKJP',
    fullName: 'KB Suntik',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    groupKey: 'SUNTIK'
  },
  {
    id: 'PIL',
    label: 'PIL',
    categoryTag: 'NON MKJP',
    fullName: 'Pil Kontrasepsi',
    badgeColor: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
    groupKey: 'PIL'
  },
  {
    id: 'KONDOM',
    label: 'KONDOM',
    categoryTag: 'NON MKJP',
    fullName: 'Kondom Pria',
    badgeColor: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    groupKey: 'KONDOM'
  }
];

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
  const getViewportInfo = () => {
    if (typeof window === 'undefined') {
      return { mobile: false, portrait: false, minDim: 1024 };
    }
    const w = window.innerWidth;
    const h = window.innerHeight;
    const minDim = Math.min(w, h);
    const maxDim = Math.max(w, h);
    const isCoarsePointer =
      typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    const mobile = w < 1024 || (minDim < 768 && maxDim <= 1024) || (isCoarsePointer && minDim <= 900);
    return {
      mobile,
      portrait: h > w,
      minDim
    };
  };

  const [isMobile, setIsMobile] = useState(() => getViewportInfo().mobile);
  const [isPortrait, setIsPortrait] = useState(() => getViewportInfo().portrait);
  const [viewportMinDim, setViewportMinDim] = useState(() => getViewportInfo().minDim);
  const [showMobileBarChart, setShowMobileBarChart] = useState(false);
  const [showMobileTable, setShowMobileTable] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);

  // Monitor window resize & orientation change to maintain optimal responsive layout on computer and mobile
  useEffect(() => {
    const handleResize = () => {
      const { mobile, portrait, minDim } = getViewportInfo();
      setIsMobile(mobile);
      setIsPortrait(portrait);
      setViewportMinDim(minDim);
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    const orientation = typeof window !== 'undefined' ? window.screen?.orientation : undefined;
    orientation?.addEventListener?.('change', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      orientation?.removeEventListener?.('change', handleResize);
    };
  }, []);

  // Entry Sidebar State
  const [isEntrySidebarOpen, setIsEntrySidebarOpen] = useState(false);
  const [entryTargetKecamatan, setEntryTargetKecamatan] = useState<string>('NGRAHO');
  const [notification, setNotification] = useState<string | null>(null);
  const [showEmptyConfirmModal, setShowEmptyConfirmModal] = useState(false);

  // Akun default Administrator Kabupaten agar saat dibuka pertama kali baik di komputer maupun di HP langsung tampil Dashboard yang sama
  const DEFAULT_APP_USER: AuthUser = {
    id: 'user-admin',
    username: 'ADMIN',
    name: 'Administrator Kabupaten',
    role: 'admin',
    roleLabel: 'Administrator Kabupaten',
    jabatan: 'Dinas PPPA dan KB Kab. Bojonegoro'
  };

  // User Authentication State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const isLoggedOut = localStorage.getItem('laporan_kb_logged_out');
      if (isLoggedOut === 'true') {
        return null;
      }
      const saved = localStorage.getItem('laporan_kb_auth_user');
      if (saved) {
        return JSON.parse(saved);
      }
      // Simpan session default sehingga tampilan di komputer dan HP selalu sama saat dibuka
      localStorage.setItem('laporan_kb_auth_user', JSON.stringify(DEFAULT_APP_USER));
      return DEFAULT_APP_USER;
    } catch {
      return DEFAULT_APP_USER;
    }
  });
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Menentukan apakah pengguna yang sedang login adalah akun Kecamatan
  const isKecamatanUser = Boolean(
    currentUser && (currentUser.role !== 'admin' || currentUser.kecamatan)
  );

  // Mode landscape aktif hanya jika pengguna memang memiringkan perangkat secara fisik ke landscape
  const isMobileLandscape = Boolean(currentUser) && isMobile && !isPortrait;

  const handleNavigateView = (view: AppView) => {
    // Sembunyikan dan cegah akses ke Data PPM untuk user kecamatan
    if (view === AppView.PPM && isKecamatanUser) {
      setCurrentView(AppView.DASHBOARD);
      return;
    }
    if (view === AppView.DASHBOARD) {
      setShowMobileTable(false);
    }
    setCurrentView(view);
    setIsEntrySidebarOpen(false);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  useEffect(() => {
    if (currentUser?.kecamatan) {
      setEntryTargetKecamatan(currentUser.kecamatan);
    }
    // Jika user kecamatan sedang membuka Data PPM, otomatis arahkan ke Dashboard
    if (isKecamatanUser && currentView === AppView.PPM) {
      setCurrentView(AppView.DASHBOARD);
    }
  }, [currentUser, isKecamatanUser, currentView]);

  const handleLogout = () => {
    try {
      localStorage.removeItem('laporan_kb_auth_user');
      localStorage.setItem('laporan_kb_logged_out', 'true');
    } catch {
      // ignore
    }
    setCurrentUser(null);
  };

  // PPM Target Management State (Dukungan perubahan target tahunan oleh Admin)
  const [currentPpmYear, setCurrentPpmYear] = useState<string>(() => {
    try {
      return localStorage.getItem('laporan_kb_active_ppm_year') || '2026';
    } catch {
      return '2026';
    }
  });

  const [currentPpmTargets, setCurrentPpmTargets] = useState<PpmTargetMap>(() => {
    try {
      const year = localStorage.getItem('laporan_kb_active_ppm_year') || '2026';
      const saved = localStorage.getItem(`laporan_kb_ppm_targets_${year}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setActivePpmTargets(parsed, year);
        return parsed;
      }
    } catch {}
    return RAW_PPM_DATA;
  });

  const [availablePpmYears, setAvailablePpmYears] = useState<string[]>(['2026', '2025']);
  const [allRawEntries, setAllRawEntries] = useState<FirestoreKbEntryDoc[]>([]);
  const [allPpmTargetsByYear, setAllPpmTargetsByYear] = useState<Map<string, PpmTargetMap>>(new Map());
  const [showGlobalAddYearModal, setShowGlobalAddYearModal] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');
  const currentPpmYearRef = useRef(currentPpmYear);

  useEffect(() => {
    currentPpmYearRef.current = currentPpmYear;
  }, [currentPpmYear]);

  // Auto-sync any data change to localStorage continuously per active year
  useEffect(() => {
    if (data && data.length > 0) {
      saveLocalEntriesToStorage(data, currentPpmYear);
    }
  }, [data, currentPpmYear]);

  useEffect(() => {
    const initialLocal = loadLocalEntriesFromStorage(currentPpmYear);
    const unsubscribe = subscribeToRealtimeKbData(
      (syncedDataset, _lastUpdatedBy, activeYear) => {
        if (activeYear && activeYear !== currentPpmYearRef.current) {
          setCurrentPpmYear(activeYear);
          setActivePpmYear(activeYear);
        }
        setData(syncedDataset);
        setIsLoading(false);
      },
      undefined,
      initialLocal ? syncDataWithOfficialPpm(initialLocal, currentPpmTargets, currentPpmYear) : undefined,
      (targets, year, availableYears) => {
        setAllPpmTargetsByYear(prev => {
          const next = new Map(prev);
          next.set(year, targets);
          return next;
        });
        if (year === currentPpmYearRef.current) {
          setCurrentPpmTargets(targets);
        }
        if (availableYears && availableYears.length > 0) {
          setAvailablePpmYears(availableYears);
        }
      },
      (entries, allYears) => {
        setAllRawEntries(entries);
        if (allYears && allYears.length > 0) {
          setAvailablePpmYears(allYears);
        }
      }
    );
    return () => {
      unsubscribe();
    };
  }, []);

  // Handler beralih tahun pelaporan KB (otomatis memuat entri dan target PPM tahun terkait)
  const handleSwitchYear = (newYear: string) => {
    const cleanYear = newYear.trim();
    if (!cleanYear.match(/^[0-9]{4}$/)) return;
    setCurrentPpmYear(cleanYear);
    setActivePpmYear(cleanYear);
    try {
      localStorage.setItem('laporan_kb_active_ppm_year', cleanYear);
    } catch {}

    // 1. Target PPM tahun yang dipilih
    let targetsForYear = allPpmTargetsByYear.get(cleanYear);
    if (!targetsForYear) {
      try {
        const saved = localStorage.getItem(`laporan_kb_ppm_targets_${cleanYear}`);
        if (saved) {
          targetsForYear = JSON.parse(saved);
        }
      } catch {}
    }
    if (!targetsForYear) {
      targetsForYear = RAW_PPM_DATA;
    }
    setCurrentPpmTargets(targetsForYear);
    setActivePpmTargets(targetsForYear, cleanYear);

    // 2. Ambil dataset entri tahun yang dipilih
    if (allRawEntries.length > 0) {
      const yearDataset = getDatasetForYearFromEntries(allRawEntries, cleanYear, targetsForYear);
      setData(yearDataset);
      saveLocalEntriesToStorage(yearDataset, cleanYear);
    } else {
      const localSaved = loadLocalEntriesFromStorage(cleanYear);
      if (localSaved && localSaved.length > 0) {
        const synced = syncDataWithOfficialPpm(localSaved, targetsForYear, cleanYear);
        setData(synced);
      } else {
        const master = generateMasterDatasetFromOfficialPpm(targetsForYear, cleanYear);
        setData(master);
        saveLocalEntriesToStorage(master, cleanYear);
      }
    }

    setNotification(`Beralih ke data entri dan target PPM Tahun ${cleanYear}.`);
    setTimeout(() => setNotification(null), 3000);
  };

  // Handler tambah tahun baru
  const handleCreateNewYear = async () => {
    const cleanYear = newYearInput.trim();
    if (!cleanYear.match(/^[0-9]{4}$/)) return;
    setShowGlobalAddYearModal(false);
    setNewYearInput('');

    if (!availablePpmYears.includes(cleanYear)) {
      setAvailablePpmYears(prev => [cleanYear, ...prev.filter(y => y !== cleanYear)].sort().reverse());
    }

    const initialTargets = JSON.parse(JSON.stringify(currentPpmTargets));
    await savePpmTargetsToFirebase(cleanYear, initialTargets, currentUser?.username || 'ADMIN');
    handleSwitchYear(cleanYear);
  };

  // Handler simpan target PPM oleh Admin ke Firebase & sinkronisasi ke seluruh sistem
  const handleSavePpmTargets = async (year: string, newTargets: PpmTargetMap) => {
    await savePpmTargetsToFirebase(year, newTargets, currentUser?.username || 'ADMIN');
    setAllPpmTargetsByYear(prev => {
      const next = new Map(prev);
      next.set(year, newTargets);
      return next;
    });
    setCurrentPpmTargets(newTargets);
    setCurrentPpmYear(year);
    if (!availablePpmYears.includes(year)) {
      setAvailablePpmYears(prev => [year, ...prev.filter(y => y !== year)].sort().reverse());
    }
    // Re-sinkronisasi seluruh dataset dengan target PPM baru sehingga capaian %, sisa, dan grafik langsung terupdate
    const synced = syncDataWithOfficialPpm(data, newTargets, year);
    setData(synced);
    saveLocalEntriesToStorage(synced, year);
    setNotification(`Target PPM Tahun ${year} berhasil disimpan dan diintegrasikan ke seluruh Dashboard, Tabel, dan Entri.`);
    setTimeout(() => setNotification(null), 4000);
  };

  // Handler kosongkan (hapus menjadi 0) seluruh data PPM dalam satu tahun oleh Admin
  const handleClearPpmTargetsForYear = async (year: string) => {
    const emptyTargets = await clearPpmTargetsForYearInFirebase(year, currentUser?.username || 'ADMIN');
    setAllPpmTargetsByYear(prev => {
      const next = new Map(prev);
      next.set(year, emptyTargets);
      return next;
    });
    setCurrentPpmTargets(emptyTargets);
    setCurrentPpmYear(year);
    setActivePpmTargets(emptyTargets, year);

    const synced = syncDataWithOfficialPpm(data, emptyTargets, year);
    setData(synced);
    saveLocalEntriesToStorage(synced, year);
    setNotification(`Seluruh data target PPM Tahun ${year} berhasil dihapus (dikosongkan menjadi 0) secara real-time.`);
    setTimeout(() => setNotification(null), 4000);
  };

  // Handler hapus permanen dokumen target PPM tahun tertentu (tahun non-default) oleh Admin
  const handleDeletePpmYear = async (year: string) => {
    await deletePpmTargetsYearFromFirebase(year, currentUser?.username || 'ADMIN');
    setAllPpmTargetsByYear(prev => {
      const next = new Map(prev);
      next.delete(year);
      return next;
    });
    setAvailablePpmYears(prev => {
      const remaining = prev.filter(y => y !== year);
      return remaining.length > 0 ? remaining : ['2026'];
    });
    if (currentPpmYear === year) {
      handleSwitchYear('2026');
    }
    setNotification(`Data target PPM Tahun ${year} berhasil dihapus permanen dari Firebase.`);
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchData = async () => {
    // If local storage already has data, sync it with official PPM targets and keep entered achievements
    const localSaved = loadLocalEntriesFromStorage();
    if (localSaved && localSaved.length > 0) {
      const synced = syncDataWithOfficialPpm(localSaved, currentPpmTargets);
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
        const synced = syncDataWithOfficialPpm(jsonData, currentPpmTargets);
        setData(synced);
        saveLocalEntriesToStorage(synced);
      } else {
        const master = generateMasterDatasetFromOfficialPpm(currentPpmTargets);
        setData(master);
        saveLocalEntriesToStorage(master);
      }
    } catch (error: any) {
      // Gunakan dataset target PPM resmi Bojonegoro jika offline atau network issue
      const master = generateMasterDatasetFromOfficialPpm(currentPpmTargets);
      setData(master);
      saveLocalEntriesToStorage(master);
    } finally {
      setIsLoading(false);
    }
  };

  // Kosongkan semua data yang sudah dientri untuk tahun aktif
  const confirmEmptyAllEnteredData = () => {
    setData(prevData => {
      const emptied = emptyEnteredAchievements(prevData, currentPpmTargets, currentPpmYear);
      saveLocalEntriesToStorage(emptied, currentPpmYear);
      return emptied;
    });
    resetEnteredMonths(currentPpmYear);
    clearAllEntriesInFirebase(currentUser?.username || 'ADMIN', currentPpmYear).catch(() => {});
    setShowEmptyConfirmModal(false);
    setNotification(`Semua data entri capaian tahun ${currentPpmYear} berhasil dikosongkan secara real-time. Target PPM resmi tetap tersimpan.`);
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
        if (Array.isArray(jsonData) && jsonData.length > 0) {
          const currentLocal = loadLocalEntriesFromStorage();
          if (!currentLocal || currentLocal.length === 0) {
            const synced = syncDataWithOfficialPpm(jsonData);
            setData(synced);
            saveLocalEntriesToStorage(synced);
          }
        }
      }
    } catch (error) {
      console.error("Background sync error:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Reset to original data from Google Sheets API / Firebase
  const handleResetToApiData = async () => {
    clearLocalStorage();
    await clearAllEntriesInFirebase(currentUser?.username || 'ADMIN').catch(() => {});
    await fetchData();
    setNotification("Data telah direset kembali di Firebase dan penyimpanan lokal.");
    setTimeout(() => setNotification(null), 4000);
  };

  // Callback when data is saved in EntrySidebar
  const handleDataSaved = (newData: RawDataRow[], savedKec: string, savedMonth: string) => {
    setData(newData);
    saveLocalEntriesToStorage(newData, currentPpmYear);
    setSelectedMonth(savedMonth);
    setNotification(`Data untuk ${savedKec} bulan ${savedMonth} Tahun ${currentPpmYear} berhasil disimpan.`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleOpenEntrySidebar = (kecamatan?: string) => {
    if (currentUser?.role === 'plkb' && currentUser.kecamatan) {
      // Pastikan akun kecamatan hanya membuka form untuk kecamatannya sendiri
      setEntryTargetKecamatan(currentUser.kecamatan);
    } else if (kecamatan) {
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
      const kecName = row[0]?.toString() || "";
      const isJumlah = kecName.toUpperCase().includes("JUMLAH");
      const officialPpm = isJumlah
        ? getOfficialPpm('JUMLAH', activeCategory, currentPpmTargets)
        : getOfficialPpm(kecName, activeCategory, currentPpmTargets);
      const ppm = officialPpm > 0 ? officialPpm : (parseFloat(String(row[1])) || 0);
      const capaian = parseFloat(String(row[4])) || 0;
      const sisa = ppm - capaian;
      const percentage = ppm > 0 ? (capaian / ppm) * 100 : 0;
      
      return {
        kecamatan: isJumlah ? "JUMLAH (KABUPATEN BOJONEGORO)" : kecName,
        ppm,
        blnLalu: parseFloat(String(row[2])) || 0,
        blnIni: parseFloat(String(row[3])) || 0,
        jumlah: capaian,
        percentage,
        sisa,
        isJumlah
      };
    });
  }, [data, activeCategory, selectedMonth, currentPpmTargets]);

  const isSelectedMonthEntered = useMemo(() => {
    return isMonthEntered(selectedMonth, data);
  }, [selectedMonth, data]);

  const statsData = useMemo(() => {
    const list = filteredData.filter(d => !d.isJumlah);
    if (!list.length) return { highest: null, lowest: null, total: null, isEmpty: true };

    const hasAnyCapaian = isSelectedMonthEntered && list.some(d => d.jumlah > 0 || d.blnIni > 0);
    const sorted = [...list].sort((a, b) => b.percentage - a.percentage);
    const totalRow = filteredData.find(d => d.isJumlah);

    // Target PPM resmi dari Data PPM sebagai acuan
    const officialTotalPpm = getOfficialPpm('JUMLAH', activeCategory, currentPpmTargets);
    const totalPpm = officialTotalPpm > 0 ? officialTotalPpm : (totalRow?.ppm || 0);
    const totalCapaian = hasAnyCapaian ? (totalRow?.jumlah ?? list.reduce((s, r) => s + r.jumlah, 0)) : 0;
    const totalPercentage = totalPpm > 0 && hasAnyCapaian ? (totalCapaian / totalPpm) * 100 : 0;
    const totalSisa = totalPpm - totalCapaian;

    const aggregatedTotal = {
      kecamatan: 'JUMLAH (KABUPATEN BOJONEGORO)',
      ppm: totalPpm,
      blnLalu: hasAnyCapaian ? (totalRow?.blnLalu ?? list.reduce((s, r) => s + r.blnLalu, 0)) : 0,
      blnIni: hasAnyCapaian ? (totalRow?.blnIni ?? list.reduce((s, r) => s + r.blnIni, 0)) : 0,
      jumlah: totalCapaian,
      percentage: totalPercentage,
      sisa: totalSisa,
      isJumlah: true
    };

    return {
      highest: hasAnyCapaian ? sorted[0] : { kecamatan: '-', percentage: 0 },
      lowest: hasAnyCapaian ? sorted[sorted.length - 1] : { kecamatan: '-', percentage: 0 },
      total: aggregatedTotal,
      isEmpty: !hasAnyCapaian
    };
  }, [filteredData, activeCategory, isSelectedMonthEntered, currentPpmTargets]);

  const chartData = useMemo(() => {
    return filteredData
      .filter(d => !d.isJumlah)
      .filter(d => d.kecamatan.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => b.percentage - a.percentage);
  }, [filteredData, searchQuery]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(Math.round(num));
  };

  // Autentikasi Pengguna: Jika belum login, tampilkan halaman Login
  if (!currentUser) {
    return (
      <LoginView 
        onLoginSuccess={(user) => {
          try {
            localStorage.removeItem('laporan_kb_logged_out');
            localStorage.setItem('laporan_kb_auth_user', JSON.stringify(user));
          } catch {
            // ignore
          }
          setCurrentUser(user);
          if (user.kecamatan) {
            setEntryTargetKecamatan(user.kecamatan);
          }
          if (user.role !== 'admin' || user.kecamatan) {
            setCurrentView(AppView.DASHBOARD);
          }
        }} 
      />
    );
  }

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

  const mobileLandscapeChartHeight = Math.max(175, Math.min(250, viewportMinDim - 130));

  return (
    <div
      className={cn(
        "flex bg-slate-900 font-sans text-slate-100 overflow-hidden max-w-full h-[100dvh] w-full",
        isMobileLandscape && "mobile-landscape-active"
      )}
    >
      {/* Mobile Drawer Backdrop */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-40 lg:hidden cursor-pointer"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-slate-800 border-r border-slate-700 flex flex-col transition-all duration-300",
          isMobile
            ? "fixed inset-y-0 left-0 z-50 w-72 shadow-2xl"
            : "relative z-20 shrink-0",
          isMobile && !sidebarOpen && "-translate-x-full pointer-events-none"
        )}
        style={{
          width: !isMobile ? (sidebarOpen ? 260 : 80) : undefined
        }}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700 bg-slate-850 text-white shrink-0 gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <img 
              src={logoBojonegoro} 
              alt="Logo Pemkab Bojonegoro" 
              className="w-8 h-10 object-contain shrink-0 drop-shadow" 
            />
            {(sidebarOpen || isMobile) && (
              <div className="overflow-hidden">
                <span className="font-black text-xs tracking-wider text-slate-100 block uppercase truncate">
                  KAB. BOJONEGORO
                </span>
                <span className="text-[10px] font-bold text-teal-400 block tracking-tight truncate">
                  Dinas PPPA dan KB
                </span>
              </div>
            )}
          </div>
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 lg:hidden cursor-pointer"
              title="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-2 custom-scrollbar">
          <div className="px-4 py-2">
            {(sidebarOpen || isMobile) && <label className="text-[10px] uppercase tracking-widest text-slate-500 block mb-2 px-2 font-bold">MENU UTAMA</label>}
            <button 
              onClick={() => handleNavigateView(AppView.DASHBOARD)}
              className={cn(
                "w-full flex items-center px-3 py-2.5 rounded-lg transition-colors mb-1 cursor-pointer",
                currentView === AppView.DASHBOARD ? "bg-teal-500/15 text-teal-400 border border-teal-500/30 font-bold" : "text-slate-400 hover:bg-slate-700/50"
              )}
            >
              <LayoutDashboard className="w-5 h-5 shrink-0" />
              {(sidebarOpen || isMobile) && <span className="ml-3 text-xs font-semibold">Dashboard</span>}
            </button>

            <button 
              onClick={() => handleNavigateView(AppView.TABLE)}
              className={cn(
                "w-full flex items-center px-3 py-2.5 rounded-lg transition-colors mb-1 cursor-pointer",
                currentView === AppView.TABLE ? "bg-teal-500/15 text-teal-400 border border-teal-500/30 font-bold" : "text-slate-400 hover:bg-slate-700/50"
              )}
            >
              <TableIcon className="w-5 h-5 shrink-0" />
              {(sidebarOpen || isMobile) && <span className="ml-3 text-xs font-semibold">Data Tabel</span>}
            </button>

            <button 
              onClick={() => handleNavigateView(AppView.ENTRY)}
              className={cn(
                "w-full flex items-center px-3 py-2.5 rounded-lg transition-colors mb-1 cursor-pointer",
                currentView === AppView.ENTRY ? "bg-teal-500/15 text-teal-400 border border-teal-500/30 font-bold" : "text-slate-400 hover:bg-slate-700/50"
              )}
            >
              <FileSpreadsheet className="w-5 h-5 shrink-0 text-teal-400" />
              {(sidebarOpen || isMobile) && (
                <div className="ml-3 flex items-center justify-between flex-1">
                  <span className="text-xs font-semibold">Entri Data</span>
                </div>
              )}
            </button>
            {!isKecamatanUser && (
              <button 
                onClick={() => handleNavigateView(AppView.PPM)}
                className={cn(
                  "w-full flex items-center px-3 py-2.5 rounded-lg transition-colors mb-2 cursor-pointer",
                  currentView === AppView.PPM ? "bg-teal-500/15 text-teal-400 border border-teal-500/30 font-bold" : "text-slate-400 hover:bg-slate-700/50"
                )}
              >
                <Target className="w-5 h-5 shrink-0 text-teal-400" />
                {(sidebarOpen || isMobile) && (
                  <div className="ml-3 flex items-center justify-between flex-1">
                    <span className="text-xs font-semibold">Data PPM</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">Target</span>
                  </div>
                )}
              </button>
            )}
          </div>
        </nav>

        {/* User Profile & Logout at bottom of sidebar */}
        <div className="p-3 border-t border-slate-700/80 bg-slate-850/90 shrink-0">
          <div className={cn("flex items-center", (sidebarOpen || isMobile) ? "justify-between" : "justify-center")}>
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center shrink-0 font-black text-xs shadow-inner">
                {currentUser.name.charAt(0)}
              </div>
              {(sidebarOpen || isMobile) && (
                <div className="truncate">
                  <div className="text-xs font-bold text-slate-200 truncate">{currentUser.name}</div>
                  <div className="text-[10px] text-teal-400 font-semibold truncate">
                    {currentUser.roleLabel} {currentUser.kecamatan ? `• ${currentUser.kecamatan}` : ''}
                  </div>
                </div>
              )}
            </div>
            {(sidebarOpen || isMobile) && (
              <div className="flex items-center space-x-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(true)}
                  title="Ubah Kata Sandi (Password)"
                  className="p-1.5 hover:bg-teal-500/20 text-slate-400 hover:text-teal-300 rounded-lg transition-colors cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Keluar dari Akun (Logout)"
                  className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          {!sidebarOpen && !isMobile && (
            <div className="mt-2 space-y-1">
              <button
                type="button"
                onClick={() => setIsChangePasswordOpen(true)}
                title="Ubah Kata Sandi (Password)"
                className="w-full flex justify-center p-1.5 hover:bg-teal-500/20 text-slate-400 hover:text-teal-300 rounded-lg transition-colors cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleLogout}
                title="Keluar dari Akun (Logout)"
                className="w-full flex justify-center p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative min-w-0 w-full">
        <header
          className={cn(
            "bg-slate-800 border-b border-slate-700 shrink-0 z-10",
            isMobileLandscape
              ? "h-11 px-2 flex items-center justify-between gap-1"
              : isMobile
              ? "px-3 py-2.5 flex flex-col gap-2"
              : "h-16 px-6 flex items-center justify-between gap-3"
          )}
        >
          {/* Baris Atas Header (atau Baris Tunggal di Desktop / Landscape) */}
          <div
            className={cn(
              "flex items-center justify-between gap-1.5 sm:gap-2 min-w-0",
              isMobileLandscape ? "flex-1" : isMobile ? "w-full" : "flex-1"
            )}
          >
            <div className="flex items-center space-x-1.5 sm:space-x-3 min-w-0 flex-1">
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1.5 sm:p-2 hover:bg-slate-700 rounded-lg text-slate-400 cursor-pointer shrink-0"
                title="Menu Navigasi"
              >
                <Menu className={cn(isMobileLandscape ? "w-4 h-4" : "w-5 h-5")} />
              </button>
              <div className="flex flex-col min-w-0">
                <h1
                  className={cn(
                    "font-bold text-teal-400 uppercase tracking-tighter truncate",
                    isMobileLandscape ? "text-[10.5px]" : "text-xs sm:text-sm"
                  )}
                >
                  {currentView === AppView.DASHBOARD 
                    ? (isMobileLandscape ? 'Grafik Capaian' : 'Dashboard Visual Capaian')
                    : currentView === AppView.TABLE 
                    ? (isMobileLandscape ? 'Tabel Capaian' : 'Tabel Capaian Layanan')
                    : currentView === AppView.PPM
                    ? (isMobileLandscape ? 'Target PPM' : 'Data Target PPM Resmi Bojonegoro')
                    : (isMobileLandscape ? 'Entri Data KB' : 'Manajemen Entri Data Metode KB')}
                </h1>
                {!isMobileLandscape && (
                  <p className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">
                    {currentView === AppView.PPM
                      ? 'Target Resmi 28 Kecamatan'
                      : `${activeCategory} \u2022 ${selectedMonth}`}
                  </p>
                )}
              </div>
            </div>

            {/* Navigasi Cepat Inline saat Mode Landscape Mobile */}
            {isMobileLandscape && (
              <nav className="flex items-center gap-0.5 bg-slate-900/90 border border-slate-700/80 rounded-lg p-0.5 shrink min-w-0 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => handleNavigateView(AppView.DASHBOARD)}
                  className={cn(
                    "px-1.5 py-0.5 rounded-md text-[9.5px] font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0",
                    currentView === AppView.DASHBOARD
                      ? "bg-teal-500 text-slate-950 font-black"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  )}
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigateView(AppView.TABLE)}
                  className={cn(
                    "px-1.5 py-0.5 rounded-md text-[9.5px] font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0",
                    currentView === AppView.TABLE
                      ? "bg-teal-500 text-slate-950 font-black"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  )}
                >
                  Tabel
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigateView(AppView.ENTRY)}
                  className={cn(
                    "px-1.5 py-0.5 rounded-md text-[9.5px] font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0",
                    currentView === AppView.ENTRY
                      ? "bg-teal-500 text-slate-950 font-black"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  )}
                >
                  Entri
                </button>
                {!isKecamatanUser && (
                  <button
                    type="button"
                    onClick={() => handleNavigateView(AppView.PPM)}
                    className={cn(
                      "px-1.5 py-0.5 rounded-md text-[9.5px] font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0",
                      currentView === AppView.PPM
                        ? "bg-teal-500 text-slate-950 font-black"
                        : "text-slate-300 hover:text-white hover:bg-slate-800"
                    )}
                  >
                    PPM
                  </button>
                )}
              </nav>
            )}

            {/* Kontrol Kanan di Baris Atas */}
            <div className={cn("flex items-center shrink-0", isMobileLandscape ? "gap-1" : "gap-1.5 sm:gap-2")}>

              {/* Pemilih Tahun Pelaporan Global (lebar select dikunci agar opsi '+ Tambah Tahun...' tidak memperlebar tombol) */}
              <div
                className={cn(
                  "flex items-center space-x-1 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300 shadow-inner shrink-0",
                  isMobileLandscape ? "px-1.5 py-0.5" : "px-2 py-1.5"
                )}
              >
                <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-teal-400 shrink-0" />
                {!isMobile && (
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tahun:</span>
                )}
                <select
                  id="header-year-select"
                  value={currentPpmYear}
                  onChange={(e) => {
                    if (e.target.value === '__add_new__') {
                      setShowGlobalAddYearModal(true);
                    } else {
                      handleSwitchYear(e.target.value);
                    }
                  }}
                  className={cn(
                    "bg-transparent font-black text-indigo-300 focus:outline-none cursor-pointer",
                    isMobileLandscape ? "w-[44px] text-[10.5px]" : "w-[50px] text-xs"
                  )}
                  title="Pilih tahun entri & target PPM"
                >
                  {availablePpmYears.map(yr => (
                    <option key={yr} value={yr} className="bg-slate-800 text-slate-200 font-semibold">
                      {yr}
                    </option>
                  ))}
                  {currentUser?.role === 'admin' && (
                    <option value="__add_new__" className="bg-slate-800 text-teal-400 font-bold">
                      + Tambah Tahun...
                    </option>
                  )}
                </select>
              </div>

              {/* Refresh tombol di baris atas untuk Mobile Portrait Dashboard */}
              {isMobile && !isMobileLandscape && currentView === AppView.DASHBOARD && (
                <button 
                  onClick={() => fetchData()}
                  disabled={isLoading || isRefreshing}
                  title="Segarkan data dari Google Sheets"
                  className="p-1.5 bg-slate-900 border border-slate-700 hover:bg-slate-700 text-slate-400 hover:text-teal-400 rounded-xl transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <RefreshCw className={cn("w-4 h-4", (isLoading || isRefreshing) && "animate-spin text-teal-400")} />
                </button>
              )}

              {/* Periode Selector saat Landscape Dashboard (tanpa Search agar tidak terpotong) */}
              {isMobileLandscape && currentView === AppView.DASHBOARD && (
                <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl px-1.5 py-0.5 text-xs text-slate-300 shadow-inner shrink-0">
                  <select
                    id="header-period-select"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-[68px] bg-transparent text-[10.5px] font-bold text-teal-400 focus:outline-none cursor-pointer"
                  >
                    {MONTHS.map(m => (
                      <option key={m} value={m} className="bg-slate-800 text-slate-200">
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Kontrol Desktop (>= 1024px) di Baris Tunggal */}
              {!isMobile && currentView === AppView.DASHBOARD && (
                <>
                  <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 shadow-inner">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Periode:</span>
                    <select
                      id="header-period-select"
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

                  <button 
                    onClick={() => fetchData()}
                    disabled={isLoading || isRefreshing}
                    title="Segarkan data dari Google Sheets"
                    className="p-2 hover:bg-slate-700 text-slate-400 hover:text-teal-400 rounded-lg transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <RefreshCw className={cn("w-4 h-4", (isLoading || isRefreshing) && "animate-spin text-teal-400")} />
                  </button>

                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                      type="text" 
                      placeholder="Cari..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-slate-700 border border-slate-600 rounded-full py-1.5 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 w-44 transition-all focus:w-52"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Baris Kedua Khusus Mobile Portrait Dashboard (Periode + Cari Kecamatan agar lega dan tidak terpotong) */}
          {isMobile && !isMobileLandscape && currentView === AppView.DASHBOARD && (
            <div className="flex items-center gap-2 w-full pt-2 border-t border-slate-700/60">
              <div className="flex items-center space-x-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 shadow-inner shrink-0">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bulan:</span>
                <select
                  id="header-period-select"
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

              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cari kecamatan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-teal-500 rounded-xl py-1.5 pl-8 pr-7 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                    title="Hapus pencarian"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
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

        <div
          className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden scroll-smooth bg-slate-900/50 custom-scrollbar",
            isMobileLandscape ? "p-2 pb-2.5" : "p-3 sm:p-6 pb-24 lg:pb-6"
          )}
        >
          {/* Stats Summary - Visible on Dashboard view (saat grafik mobile landscape terbuka, ditaruh di bawah grafik agar grafik langsung penuh di layar) */}
          {currentView === AppView.DASHBOARD && !(isMobileLandscape && showMobileBarChart) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <StatCard 
                label="Capaian Tertinggi" 
                name={statsData.isEmpty ? '-' : (statsData.highest?.kecamatan || '-')}
                value={statsData.isEmpty ? 0 : (statsData.highest?.percentage || 0)}
                icon={ArrowUpRight}
                color="emerald"
              />
              <StatCard 
                label="Capaian Terendah" 
                name={statsData.isEmpty ? '-' : (statsData.lowest?.kecamatan || '-')}
                value={statsData.isEmpty ? 0 : (statsData.lowest?.percentage || 0)}
                icon={ArrowDownRight}
                color="rose"
              />
              <StatCard 
                label="Total Kabupaten" 
                name="AKUMULASI"
                value={statsData.isEmpty ? 0 : (statsData.total?.percentage || 0)}
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
                className={isMobileLandscape ? "space-y-3" : "space-y-6"}
              >
                <div className={cn("grid grid-cols-1 lg:grid-cols-4", isMobileLandscape ? "gap-3" : "gap-6")}>
                  {/* Mobile Toggle Banner saat Grafik Capaian Per Kecamatan Disembunyikan */}
                  {isMobile && !showMobileBarChart ? (
                    <div className="lg:col-span-3 bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
                      <div className="min-w-0 pl-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
                            Grafik Capaian Per Kecamatan
                          </h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30">
                            {selectedMonth}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                          Grafik disembunyikan di tampilan mobile. Ketuk tombol untuk menampilkan grafik.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowMobileBarChart(true)}
                        className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-teal-500/20 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                      >
                        <BarChart3 className="w-4 h-4" />
                        <span>Tampilkan Grafik</span>
                      </button>
                    </div>
                  ) : (
                    /* Main Bar Chart */
                    <div
                      className={cn(
                        "lg:col-span-3 bg-slate-800 border border-slate-700 rounded-xl shadow-xl relative overflow-hidden min-w-0 w-full",
                        isMobileLandscape ? "p-2.5" : "p-4 sm:p-6"
                      )}
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
                      <div
                        className={cn(
                          "flex flex-col sm:flex-row sm:items-center justify-between landscape-row flex-wrap",
                          isMobileLandscape ? "gap-1.5 mb-1.5 pl-1" : "gap-3 mb-5 pl-1"
                        )}
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <h3 className={cn("font-bold uppercase tracking-wider text-slate-300 truncate", isMobileLandscape ? "text-[11px]" : "text-xs sm:text-sm")}>
                            Grafik Capaian Per Kecamatan
                          </h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30 shrink-0">
                            {selectedMonth}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center text-[10px] text-emerald-400 font-bold"><div className="w-2 h-2 rounded-full bg-emerald-500 mr-1"></div> {'>'}80%</span>
                            <span className="flex items-center text-[10px] text-amber-400 font-bold"><div className="w-2 h-2 rounded-full bg-amber-500 mr-1"></div> 50-80%</span>
                            <span className="flex items-center text-[10px] text-rose-400 font-bold"><div className="w-2 h-2 rounded-full bg-rose-500 mr-1"></div> {'<'}50%</span>
                          </div>

                          {isMobile && (
                            <button
                              type="button"
                              onClick={() => setShowMobileBarChart(false)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-rose-500/15 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 text-[10px] font-bold transition-colors cursor-pointer whitespace-nowrap"
                              title="Sembunyikan Grafik Capaian Per Kecamatan"
                            >
                              <EyeOff className="w-3 h-3" />
                              <span>Sembunyikan Grafik</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <div
                        className={cn("w-full min-w-0", !isMobileLandscape && "h-[280px] sm:h-[350px]")}
                        style={isMobileLandscape ? { height: `${mobileLandscapeChartHeight}px` } : undefined}
                      >
                        <ResponsiveContainer key={isMobileLandscape ? `bar-landscape-${viewportMinDim}` : isMobile ? 'bar-portrait' : 'bar-desktop'} width="100%" height="100%" minWidth={0} minHeight={0}>
                          <BarChart
                            data={chartData}
                            margin={{
                              top: 8,
                              right: isMobile ? 6 : 12,
                              left: isMobile ? 2 : 0,
                              bottom: 4
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                            <XAxis 
                              dataKey="kecamatan" 
                              interval={0} 
                              padding={{ left: 6, right: 6 }}
                              height={isMobileLandscape ? 58 : isMobile ? 74 : 68}
                              tick={{
                                fontSize: isMobileLandscape ? 7.5 : isMobile ? 6.5 : 9,
                                fill: '#94a3b8',
                                fontWeight: 600
                              }}
                              angle={isMobile && !isMobileLandscape ? -90 : -45}
                              textAnchor="end"
                              tickMargin={4}
                              dy={isMobile && !isMobileLandscape ? -2 : 0}
                              stroke="#334155"
                            />
                            <YAxis 
                              width={isMobile ? 36 : 44}
                              tick={{ fontSize: isMobile ? 9 : 10, fill: '#94a3b8' }}
                              stroke="#334155"
                              domain={[0, (dataMax: number) => Math.max(100, Math.ceil(dataMax / 10) * 10)]}
                              tickFormatter={(v) => `${v}%`}
                            />
                            <Tooltip 
                              cursor={{ fill: 'rgba(20, 184, 166, 0.05)' }}
                              wrapperStyle={{ zIndex: 30, maxWidth: '210px' }}
                              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }}
                              itemStyle={{ color: '#2dd4bf', fontWeight: 'bold' }}
                              formatter={(val: any) => [`${Number(val).toFixed(2)}%`, 'Prosentase']}
                            />
                            <Bar dataKey="percentage" radius={[3, 3, 0, 0]}>
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
                  )}

                  {/* Summary Pie Chart */}
                  <div
                    className={cn(
                      "lg:col-span-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl flex flex-col items-center min-w-0 w-full",
                      isMobileLandscape ? "p-3" : "p-4 sm:p-6"
                    )}
                  >
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 w-full text-center border-b border-slate-700 pb-3 mb-6 decoration-teal-500 decoration-2 underline-offset-8">Sisa dan Capaian</h3>
                    <div className="relative w-full h-[180px] mb-8 min-w-0">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
                              value={`${statsData.total?.percentage.toFixed(2)}%`}
                              position="center"
                              className="fill-slate-100 font-black text-lg"
                            />
                          </Pie>
                          <Tooltip
                            wrapperStyle={{ zIndex: 30 }}
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px', color: '#f1f5f9' }}
                            itemStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                            formatter={(val: any) => formatNumber(Number(val))}
                          />
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

                {/* Stats Summary di bawah grafik saat mode mobile landscape agar grafik langsung tampil penuh di atas */}
                {isMobileLandscape && showMobileBarChart && (
                  <div className="grid grid-cols-1 md:grid-cols-3 landscape-grid-3 gap-3">
                    <StatCard 
                      label="Capaian Tertinggi" 
                      name={statsData.isEmpty ? '-' : (statsData.highest?.kecamatan || '-')}
                      value={statsData.isEmpty ? 0 : (statsData.highest?.percentage || 0)}
                      icon={ArrowUpRight}
                      color="emerald"
                    />
                    <StatCard 
                      label="Capaian Terendah" 
                      name={statsData.isEmpty ? '-' : (statsData.lowest?.kecamatan || '-')}
                      value={statsData.isEmpty ? 0 : (statsData.lowest?.percentage || 0)}
                      icon={ArrowDownRight}
                      color="rose"
                    />
                    <StatCard 
                      label="Total Kabupaten" 
                      name="AKUMULASI"
                      value={statsData.isEmpty ? 0 : (statsData.total?.percentage || 0)}
                      icon={Globe}
                      color="sky"
                    />
                  </div>
                )}

                {/* Panel Metode Kontrasepsi di dalam Dashboard */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-6 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-4">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30 shrink-0">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-200">
                            Metode Kontrasepsi & Capaian Pelayanan
                          </h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30 shrink-0">
                            {selectedMonth}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Pilih jenis alokon atau kelompok agregasi di bawah untuk memfilter visualisasi grafik capaian dan data analisis di atas
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Grid Seluruh Alokon & Kelompok Agregasi (Semua Metode, MKJP, NON MKJP & 7 Alokon) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 landscape-grid-5 gap-2.5 sm:gap-3">
                    {DASHBOARD_CATEGORIES.map(item => {
                      const isSelected = activeCategory.toUpperCase().trim() === item.id.toUpperCase().trim();

                      // Filter data per metode/kelompok dan bulan
                      const rows = data.filter(r => 
                        !r[0]?.toString().toUpperCase().includes('JUMLAH') &&
                        r[7]?.toString().toUpperCase().trim() === item.groupKey &&
                        r[8]?.toString().trim() === selectedMonth
                      );
                      const officialTargetPpm = getOfficialPpm('JUMLAH', item.groupKey, currentPpmTargets);
                      const mPpm = officialTargetPpm > 0 ? officialTargetPpm : rows.reduce((s, r) => s + (parseFloat(String(r[1])) || 0), 0);
                      const mCapaian = rows.reduce((s, r) => s + (parseFloat(String(r[4])) || 0), 0);
                      const mPerc = mPpm > 0 ? (mCapaian / mPpm) * 100 : 0;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveCategory(item.id)}
                          className={cn(
                            "p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group relative",
                            isSelected 
                              ? "bg-teal-500/15 border-teal-400 ring-2 ring-teal-500/40 shadow-lg shadow-teal-500/15" 
                              : "bg-slate-900/50 hover:bg-slate-750 border-slate-700 hover:border-slate-600"
                          )}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5 gap-1">
                              <span className={cn("text-[10px] font-black px-1.5 py-0.5 rounded border tracking-tight", item.badgeColor)}>
                                {item.label}
                              </span>
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">{item.categoryTag}</span>
                            </div>
                            <span className="text-xs font-bold text-slate-200 block truncate group-hover:text-teal-300">
                              {item.fullName}
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
                                {mPerc.toFixed(2)}%
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
                  currentPpmTargets={currentPpmTargets}
                  currentYear={currentPpmYear}
                  availableYears={availablePpmYears}
                  onYearChange={handleSwitchYear}
                  isMobile={isMobile}
                  isMobileLandscape={isMobileLandscape}
                  isTableHidden={isMobile && !showMobileTable}
                  onShowTable={() => setShowMobileTable(true)}
                  onHideTable={() => setShowMobileTable(false)}
                />
              </motion.div>
            ) : currentView === AppView.PPM && !isKecamatanUser ? (
              <motion.div
                key="ppm-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <PpmView 
                  currentPpmTargets={currentPpmTargets}
                  currentYear={currentPpmYear}
                  availableYears={availablePpmYears}
                  onSaveTargets={handleSavePpmTargets}
                  onClearTargets={handleClearPpmTargetsForYear}
                  onDeleteYearTargets={handleDeletePpmYear}
                  onYearChange={handleSwitchYear}
                  isAdmin={currentUser?.role === 'admin'}
                  onOpenEntrySidebar={handleOpenEntrySidebar}
                  isMobile={isMobile}
                  isMobileLandscape={isMobileLandscape}
                  isTableHidden={isMobile && !showMobileTable}
                  onShowTable={() => setShowMobileTable(true)}
                  onHideTable={() => setShowMobileTable(false)}
                />
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
                  currentUser={currentUser}
                  lockedKecamatan={currentUser?.role === 'plkb' ? currentUser.kecamatan : undefined}
                  currentPpmTargets={currentPpmTargets}
                  currentYear={currentPpmYear}
                  availableYears={availablePpmYears}
                  onYearChange={handleSwitchYear}
                  isMobile={isMobile}
                  isMobileLandscape={isMobileLandscape}
                  isTableHidden={isMobile && !showMobileTable}
                  onShowTable={() => setShowMobileTable(true)}
                  onHideTable={() => setShowMobileTable(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile Bottom Navigation Bar (Disembunyikan saat mode landscape tabel karena tab sudah ada di header atas) */}
        {!isMobileLandscape && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-850/95 backdrop-blur-md border-t border-slate-700/80 px-1 py-1.5 flex items-center justify-around gap-0.5 shadow-2xl">
          <button
            type="button"
            onClick={() => handleNavigateView(AppView.DASHBOARD)}
            className={cn(
              "flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer whitespace-nowrap",
              currentView === AppView.DASHBOARD
                ? "text-teal-400 bg-teal-500/15 font-bold"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight truncate">Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigateView(AppView.TABLE)}
            className={cn(
              "flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer whitespace-nowrap",
              currentView === AppView.TABLE
                ? "text-teal-400 bg-teal-500/15 font-bold"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <TableIcon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight truncate">Data Tabel</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigateView(AppView.ENTRY)}
            className={cn(
              "flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer whitespace-nowrap",
              currentView === AppView.ENTRY
                ? "text-teal-400 bg-teal-500/15 font-bold"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <FileSpreadsheet className="w-5 h-5 mb-0.5 text-teal-400" />
            <span className="text-[10px] tracking-tight truncate">Entri Data</span>
          </button>

          {!isKecamatanUser && (
            <button
              type="button"
              onClick={() => handleNavigateView(AppView.PPM)}
              className={cn(
                "flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer whitespace-nowrap",
                currentView === AppView.PPM
                  ? "text-teal-400 bg-teal-500/15 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Layers className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight truncate">Data PPM</span>
            </button>
          )}
        </nav>
        )}

        {/* Footer Info (Desktop) */}
        <footer className="h-8 bg-slate-800 border-t border-slate-700 px-6 hidden lg:flex items-center justify-between text-[10px] font-bold text-slate-500 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-emerald-400">Penyimpanan Real-Time Firebase Aktif (Auto-Sync)</span>
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
        lockedKecamatan={currentUser?.role === 'plkb' ? currentUser?.kecamatan : undefined}
        currentPpmTargets={currentPpmTargets}
        currentYear={currentPpmYear}
        isMobileLandscape={isMobileLandscape}
      />

      {/* Modal Ubah Kata Sandi (Hanya Bisa Merubah Password) */}
      {currentUser && (
        <ChangePasswordModal
          isOpen={isChangePasswordOpen}
          onClose={() => setIsChangePasswordOpen(false)}
          currentUser={currentUser}
          onSuccessNotification={(msg) => {
            setNotification(msg);
            setTimeout(() => setNotification(null), 4000);
          }}
        />
      )}

      {/* Modal Tambah Tahun Baru Global */}
      {showGlobalAddYearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full max-h-[94%] overflow-y-auto custom-scrollbar p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center space-x-3 text-teal-400">
              <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Tambah Tahun Pelaporan Baru</h3>
                <p className="text-[11px] text-slate-400">Target PPM & Entri per tahun</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Masukkan 4 digit tahun (contoh: <strong>2027</strong>). Setiap tahun memiliki target PPM dan entri bulanan tersendiri.
            </p>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Tahun Baru:
              </label>
              <input
                type="text"
                maxLength={4}
                placeholder="2027"
                value={newYearInput}
                onChange={(e) => setNewYearInput(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-base font-black text-center text-teal-300 tracking-widest focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-inner"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowGlobalAddYearModal(false);
                  setNewYearInput('');
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!newYearInput.trim().match(/^[0-9]{4}$/)}
                onClick={handleCreateNewYear}
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-950 bg-teal-400 hover:bg-teal-300 transition-colors shadow-lg shadow-teal-500/20 cursor-pointer disabled:opacity-50"
              >
                Buat Tahun {newYearInput || '...'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Kosongkan Data */}
      {showEmptyConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full max-h-[94%] overflow-y-auto custom-scrollbar p-6 shadow-2xl space-y-4 animate-scale-up">
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
        <span className="block text-xl font-black">{value.toFixed(2)}%</span>
      </div>
    </div>
  );
}

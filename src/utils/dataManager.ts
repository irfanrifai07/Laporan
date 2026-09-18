/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  RawDataRow, 
  ContraceptiveMethod, 
  AllMethodsEntry, 
  METHOD_KEYS, 
  MKJP_METHODS, 
  NON_MKJP_METHODS,
  KECAMATAN_LIST,
  MONTHS
} from '../types';
import { getOfficialPpm, RAW_PPM_DATA, TOTAL_BOJONEGORO_PPM } from '../data/ppmData';

export const LOCAL_STORAGE_KEY = 'laporan_kb_local_entries_v3';
export const LOCAL_STORAGE_TIMESTAMP_KEY = 'laporan_kb_last_saved_at';

/**
 * Generates a clean master dataset with all 28 subdistricts + total Bojonegoro,
 * across all 12 months and 10 categories (7 alokon + MKJP + NON MKJP + SEMUA METODE),
 * using the official PPM targets from the PDF document.
 */
export function generateMasterDatasetFromOfficialPpm(): RawDataRow[] {
  const result: RawDataRow[] = [];
  const allCategories = [...METHOD_KEYS, 'MKJP', 'NON MKJP', 'SEMUA METODE'];
  const allLocations = [...KECAMATAN_LIST, 'JUMLAH (KABUPATEN BOJONEGORO)'];

  MONTHS.forEach(month => {
    allLocations.forEach(kec => {
      allCategories.forEach(cat => {
        const ppm = getOfficialPpm(kec, cat);
        const blnLalu = 0;
        const blnIni = 0;
        const jumlah = 0;
        const percentage = 0;
        const sisa = ppm;
        result.push([kec, ppm, blnLalu, blnIni, jumlah, percentage, sisa, cat, month]);
      });
    });
  });

  return result;
}

/**
 * Synchronizes any dataset with the official PPM targets from the PDF,
 * while preserving any custom achievements (blnLalu, blnIni) entered by the user.
 */
export function syncDataWithOfficialPpm(data: RawDataRow[]): RawDataRow[] {
  if (!Array.isArray(data) || data.length === 0) {
    return generateMasterDatasetFromOfficialPpm();
  }

  // Create a map of existing achievements: key = `${kec}_${cat}_${month}`
  const achievementMap = new Map<string, { blnLalu: number; blnIni: number }>();
  data.forEach(row => {
    const kec = row[0]?.toString().toUpperCase().trim();
    const cat = row[7]?.toString().toUpperCase().trim();
    const month = row[8]?.toString().trim();
    if (kec && cat && month) {
      achievementMap.set(`${kec}_${cat}_${month}`, {
        blnLalu: parseFloat(String(row[2])) || 0,
        blnIni: parseFloat(String(row[3])) || 0
      });
    }
  });

  // Rebuild dataset ensuring all official PPM targets are up to date
  const synced: RawDataRow[] = [];
  const allCategories = [...METHOD_KEYS, 'MKJP', 'NON MKJP', 'SEMUA METODE'];
  const allLocations = [...KECAMATAN_LIST, 'JUMLAH (KABUPATEN BOJONEGORO)'];

  MONTHS.forEach(month => {
    allLocations.forEach(kec => {
      allCategories.forEach(cat => {
        const cleanKec = kec.toUpperCase().trim();
        const cleanCat = cat.toUpperCase().trim();
        const ppm = getOfficialPpm(kec, cat);
        const saved = achievementMap.get(`${cleanKec}_${cleanCat}_${month}`);
        const blnLalu = saved?.blnLalu || 0;
        const blnIni = saved?.blnIni || 0;
        const jumlah = blnLalu + blnIni;
        const percentage = ppm > 0 ? (jumlah / ppm) : 0;
        const sisa = ppm - jumlah;
        synced.push([kec, ppm, blnLalu, blnIni, jumlah, percentage, sisa, cat, month]);
      });
    });
  });

  return synced;
}

/**
 * Empties all entered achievement data (blnLalu, blnIni, jumlah, percentage) to 0,
 * keeping official PPM target and setting sisa equal to ppm.
 */
export function emptyEnteredAchievements(data: RawDataRow[]): RawDataRow[] {
  if (!Array.isArray(data) || data.length === 0) {
    return generateMasterDatasetFromOfficialPpm();
  }
  return data.map(row => {
    const kec = row[0];
    const category = row[7];
    const month = row[8];
    const ppm = getOfficialPpm(kec, category) || (parseFloat(String(row[1])) || 0);
    const blnLalu = 0;
    const blnIni = 0;
    const jumlah = 0;
    const percentage = 0;
    const sisa = ppm;
    return [kec, ppm, blnLalu, blnIni, jumlah, percentage, sisa, category, month] as RawDataRow;
  });
}

export function getInitialMethodEntry(kecamatan?: string): AllMethodsEntry {
  const result = {
    MOW: { ppm: 0, blnLalu: 0, blnIni: 0 },
    MOP: { ppm: 0, blnLalu: 0, blnIni: 0 },
    IUD: { ppm: 0, blnLalu: 0, blnIni: 0 },
    IMPLAN: { ppm: 0, blnLalu: 0, blnIni: 0 },
    SUNTIK: { ppm: 0, blnLalu: 0, blnIni: 0 },
    PIL: { ppm: 0, blnLalu: 0, blnIni: 0 },
    KONDOM: { ppm: 0, blnLalu: 0, blnIni: 0 },
  };

  if (kecamatan) {
    METHOD_KEYS.forEach(m => {
      result[m].ppm = getOfficialPpm(kecamatan, m);
    });
  }

  return result;
}

/**
 * Extracts current values from existing raw data for a given Kecamatan and Month
 */
export function extractExistingValues(
  data: RawDataRow[], 
  kecamatan: string, 
  bulan: string
): AllMethodsEntry {
  const result = getInitialMethodEntry(kecamatan);

  if (!Array.isArray(data)) return result;

  METHOD_KEYS.forEach(method => {
    const row = data.find(r => 
      r[0]?.toString().toUpperCase().trim() === kecamatan.toUpperCase().trim() &&
      r[7]?.toString().toUpperCase().trim() === method &&
      r[8]?.toString().trim() === bulan
    );

    if (row) {
      const parsedPpm = parseFloat(String(row[1]));
      result[method] = {
        ppm: !isNaN(parsedPpm) && parsedPpm > 0 ? parsedPpm : getOfficialPpm(kecamatan, method),
        blnLalu: parseFloat(String(row[2])) || 0,
        blnIni: parseFloat(String(row[3])) || 0,
      };
    }
  });

  return result;
}

/**
 * Merges new entries for MOW, MOP, IUD, IMPLAN, SUNTIK, PIL, KONDOM
 * and recalculates MKJP, NON MKJP, SEMUA METODE, plus JUMLAH (Kabupaten total)
 */
export function applyMethodEntryToData(
  currentData: RawDataRow[],
  kecamatan: string,
  bulan: string,
  entry: AllMethodsEntry
): RawDataRow[] {
  // Make a clone of the dataset
  const updatedData: RawDataRow[] = currentData.map(r => [...r] as RawDataRow);

  const setRow = (
    kec: string,
    ppm: number,
    blnLalu: number,
    blnIni: number,
    category: string,
    targetMonth: string
  ) => {
    const jumlah = blnLalu + blnIni;
    const percentage = ppm > 0 ? (jumlah / ppm) : 0;
    const sisa = ppm - jumlah;

    const existingIndex = updatedData.findIndex(r => 
      r[0]?.toString().toUpperCase().trim() === kec.toUpperCase().trim() &&
      r[7]?.toString().toUpperCase().trim() === category.toUpperCase().trim() &&
      r[8]?.toString().trim() === targetMonth
    );

    const newRow: RawDataRow = [
      kec,
      ppm,
      blnLalu,
      blnIni,
      jumlah,
      percentage,
      sisa,
      category,
      targetMonth
    ];

    if (existingIndex >= 0) {
      updatedData[existingIndex] = newRow;
    } else {
      updatedData.push(newRow);
    }
  };

  // 1. Update the 7 individual contraceptive methods
  METHOD_KEYS.forEach(m => {
    const val = entry[m];
    setRow(kecamatan, val.ppm, val.blnLalu, val.blnIni, m, bulan);
  });

  // 2. Compute and update MKJP (MOW + MOP + IUD + IMPLAN) for this kecamatan & month
  const mkjpPpm = MKJP_METHODS.reduce((acc, m) => acc + (entry[m].ppm || 0), 0);
  const mkjpBlnLalu = MKJP_METHODS.reduce((acc, m) => acc + (entry[m].blnLalu || 0), 0);
  const mkjpBlnIni = MKJP_METHODS.reduce((acc, m) => acc + (entry[m].blnIni || 0), 0);
  setRow(kecamatan, mkjpPpm, mkjpBlnLalu, mkjpBlnIni, 'MKJP', bulan);

  // 3. Compute and update NON MKJP (SUNTIK + PIL + KONDOM) for this kecamatan & month
  const nonMkjpPpm = NON_MKJP_METHODS.reduce((acc, m) => acc + (entry[m].ppm || 0), 0);
  const nonMkjpBlnLalu = NON_MKJP_METHODS.reduce((acc, m) => acc + (entry[m].blnLalu || 0), 0);
  const nonMkjpBlnIni = NON_MKJP_METHODS.reduce((acc, m) => acc + (entry[m].blnIni || 0), 0);
  setRow(kecamatan, nonMkjpPpm, nonMkjpBlnLalu, nonMkjpBlnIni, 'NON MKJP', bulan);

  // 4. Compute and update SEMUA METODE for this kecamatan & month
  const totalPpm = mkjpPpm + nonMkjpPpm;
  const totalBlnLalu = mkjpBlnLalu + nonMkjpBlnLalu;
  const totalBlnIni = mkjpBlnIni + nonMkjpBlnIni;
  setRow(kecamatan, totalPpm, totalBlnLalu, totalBlnIni, 'SEMUA METODE', bulan);

  // 5. Recalculate JUMLAH (Kabupaten row) for all categories in this month
  const allCategoriesToRecalc = [
    ...METHOD_KEYS,
    'MKJP',
    'NON MKJP',
    'SEMUA METODE'
  ];

  allCategoriesToRecalc.forEach(category => {
    // Sum over all non-JUMLAH rows for this category and month
    const rowsForCat = updatedData.filter(r => 
      !r[0]?.toString().toUpperCase().includes('JUMLAH') &&
      r[7]?.toString().toUpperCase().trim() === category.toUpperCase().trim() &&
      r[8]?.toString().trim() === bulan
    );

    const kabPpm = rowsForCat.reduce((sum, r) => sum + (parseFloat(String(r[1])) || 0), 0);
    const kabBlnLalu = rowsForCat.reduce((sum, r) => sum + (parseFloat(String(r[2])) || 0), 0);
    const kabBlnIni = rowsForCat.reduce((sum, r) => sum + (parseFloat(String(r[3])) || 0), 0);

    setRow('JUMLAH', kabPpm, kabBlnLalu, kabBlnIni, category, bulan);
  });

  return updatedData;
}

/**
 * Save user custom changes to localStorage
 */
export function saveLocalEntriesToStorage(data: RawDataRow[]): void {
  try {
    if (Array.isArray(data) && data.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem(LOCAL_STORAGE_TIMESTAMP_KEY, new Date().toISOString());
    }
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
}

/**
 * Load local entries from localStorage
 */
export function loadLocalEntriesFromStorage(): RawDataRow[] | null {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load from localStorage', e);
  }
  return null;
}

/**
 * Get timestamp of last saved data
 */
export function getLastSavedTimestamp(): string | null {
  try {
    return localStorage.getItem(LOCAL_STORAGE_TIMESTAMP_KEY);
  } catch {
    return null;
  }
}

/**
 * Clear local entries from localStorage
 */
export function clearLocalStorage(): void {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem(LOCAL_STORAGE_TIMESTAMP_KEY);
  } catch (e) {
    console.error('Failed to clear localStorage', e);
  }
}

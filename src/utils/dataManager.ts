/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  RawDataRow, 
  AllMethodsEntry, 
  METHOD_KEYS, 
  MKJP_METHODS, 
  NON_MKJP_METHODS,
  KECAMATAN_LIST,
  MONTHS
} from '../types';
import { getOfficialPpm } from '../data/ppmData';

export const LOCAL_STORAGE_KEY = 'laporan_kb_local_entries_v3';
export const LOCAL_STORAGE_TIMESTAMP_KEY = 'laporan_kb_last_saved_at';

/**
 * Mendapatkan nama bulan sebelumnya dari urutan 12 bulan (Januari s/d Desember).
 * Mengembalikan null jika bulan adalah Januari (awal tahun).
 */
export function getPreviousMonth(month: string): string | null {
  if (!month) return null;
  const clean = month.trim();
  const idx = MONTHS.indexOf(clean as any);
  if (idx <= 0) return null;
  return MONTHS[idx - 1];
}

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
 * while preserving custom achievements (blnIni).
 * Data Bulan Lalu (blnLalu) secara otomatis diambil dari Jumlah Capaian bulan sebelumnya.
 */
export function syncDataWithOfficialPpm(data: RawDataRow[]): RawDataRow[] {
  if (!Array.isArray(data) || data.length === 0) {
    return generateMasterDatasetFromOfficialPpm();
  }

  // Create a map of existing entries: key = `${kec}_${cat}_${month}`
  const entryMap = new Map<string, { ppm: number; blnLalu: number; blnIni: number }>();
  data.forEach(row => {
    const kec = row[0]?.toString().toUpperCase().trim();
    const cat = row[7]?.toString().toUpperCase().trim();
    const month = row[8]?.toString().trim();
    if (kec && cat && month) {
      const parsedPpm = parseFloat(String(row[1]));
      entryMap.set(`${kec}_${cat}_${month}`, {
        ppm: !isNaN(parsedPpm) ? parsedPpm : 0,
        blnLalu: parseFloat(String(row[2])) || 0,
        blnIni: parseFloat(String(row[3])) || 0
      });
    }
  });

  // Rebuild dataset ensuring all official PPM targets are used as fallback
  // while chaining blnLalu from previous month's jumlah (blnLalu + blnIni)
  const synced: RawDataRow[] = [];
  const allCategories = [...METHOD_KEYS, 'MKJP', 'NON MKJP', 'SEMUA METODE'];

  // Map to store previous month's total cumulative achievement: `${kec}_${cat}` -> jumlah
  const prevMonthJumlahMap = new Map<string, number>();

  MONTHS.forEach((month, monthIndex) => {
    // 1. Proses 28 Kecamatan
    const monthKecRows: { [cat: string]: { blnLalu: number; blnIni: number } } = {};
    allCategories.forEach(c => {
      monthKecRows[c] = { blnLalu: 0, blnIni: 0 };
    });

    KECAMATAN_LIST.forEach(kec => {
      const cleanKec = kec.toUpperCase().trim();

      // 7 Metode alokon individual
      METHOD_KEYS.forEach(cat => {
        const cleanCat = cat.toUpperCase().trim();
        const saved = entryMap.get(`${cleanKec}_${cleanCat}_${month}`);
        
        // Target PPM resmi dari dokumen Data PPM
        const ppm = getOfficialPpm(kec, cat);

        // Data Bulan Lalu otomatis diambil dari Jumlah Capaian bulan sebelumnya
        let blnLalu = 0;
        if (monthIndex === 0) {
          // Bulan pertama (Januari): gunakan saved.blnLalu (jika ada carry-over awal tahun) atau 0
          blnLalu = saved?.blnLalu || 0;
        } else {
          // Bulan Februari s/d Desember: otomatis diambil dari Jumlah Capaian bulan sebelumnya
          const prevJumlah = prevMonthJumlahMap.get(`${cleanKec}_${cleanCat}`);
          if (prevJumlah !== undefined && prevJumlah > 0) {
            blnLalu = prevJumlah;
          } else {
            // Jika bulan sebelumnya belum ada data capaian tercatat, pertahankan data blnLalu yang ada di spreadsheet/data tersimpan
            blnLalu = saved?.blnLalu || 0;
          }
        }

        const blnIni = saved?.blnIni || 0;
        const jumlah = blnLalu + blnIni;
        const percentage = ppm > 0 ? (jumlah / ppm) * 100 : 0;
        const sisa = ppm - jumlah;

        // Simpan jumlah capaian bulan ini untuk menjadi acuan bulan berikutnya
        prevMonthJumlahMap.set(`${cleanKec}_${cleanCat}`, jumlah);

        monthKecRows[cat].blnLalu += blnLalu;
        monthKecRows[cat].blnIni += blnIni;

        synced.push([kec, ppm, blnLalu, blnIni, jumlah, percentage, sisa, cat, month]);
      });

      // Hitung MKJP untuk kecamatan ini
      const mkjpPpm = MKJP_METHODS.reduce((s, m) => s + getOfficialPpm(kec, m), 0);
      const mkjpBlnLalu = MKJP_METHODS.reduce((s, m) => {
        const row = synced.find(r => r[0] === kec && r[7] === m && r[8] === month);
        return s + (parseFloat(String(row?.[2])) || 0);
      }, 0);
      const mkjpBlnIni = MKJP_METHODS.reduce((s, m) => {
        const row = synced.find(r => r[0] === kec && r[7] === m && r[8] === month);
        return s + (parseFloat(String(row?.[3])) || 0);
      }, 0);
      const mkjpJumlah = mkjpBlnLalu + mkjpBlnIni;
      const mkjpPercentage = mkjpPpm > 0 ? (mkjpJumlah / mkjpPpm) * 100 : 0;
      const mkjpSisa = mkjpPpm - mkjpJumlah;
      prevMonthJumlahMap.set(`${cleanKec}_MKJP`, mkjpJumlah);
      monthKecRows['MKJP'].blnLalu += mkjpBlnLalu;
      monthKecRows['MKJP'].blnIni += mkjpBlnIni;
      synced.push([kec, mkjpPpm, mkjpBlnLalu, mkjpBlnIni, mkjpJumlah, mkjpPercentage, mkjpSisa, 'MKJP', month]);

      // Hitung NON MKJP untuk kecamatan ini
      const nonMkjpPpm = NON_MKJP_METHODS.reduce((s, m) => s + getOfficialPpm(kec, m), 0);
      const nonMkjpBlnLalu = NON_MKJP_METHODS.reduce((s, m) => {
        const row = synced.find(r => r[0] === kec && r[7] === m && r[8] === month);
        return s + (parseFloat(String(row?.[2])) || 0);
      }, 0);
      const nonMkjpBlnIni = NON_MKJP_METHODS.reduce((s, m) => {
        const row = synced.find(r => r[0] === kec && r[7] === m && r[8] === month);
        return s + (parseFloat(String(row?.[3])) || 0);
      }, 0);
      const nonMkjpJumlah = nonMkjpBlnLalu + nonMkjpBlnIni;
      const nonMkjpPercentage = nonMkjpPpm > 0 ? (nonMkjpJumlah / nonMkjpPpm) * 100 : 0;
      const nonMkjpSisa = nonMkjpPpm - nonMkjpJumlah;
      prevMonthJumlahMap.set(`${cleanKec}_NON MKJP`, nonMkjpJumlah);
      monthKecRows['NON MKJP'].blnLalu += nonMkjpBlnLalu;
      monthKecRows['NON MKJP'].blnIni += nonMkjpBlnIni;
      synced.push([kec, nonMkjpPpm, nonMkjpBlnLalu, nonMkjpBlnIni, nonMkjpJumlah, nonMkjpPercentage, nonMkjpSisa, 'NON MKJP', month]);

      // Hitung SEMUA METODE untuk kecamatan ini
      const semuaPpm = mkjpPpm + nonMkjpPpm;
      const semuaBlnLalu = mkjpBlnLalu + nonMkjpBlnLalu;
      const semuaBlnIni = mkjpBlnIni + nonMkjpBlnIni;
      const semuaJumlah = semuaBlnLalu + semuaBlnIni;
      const semuaPercentage = semuaPpm > 0 ? (semuaJumlah / semuaPpm) * 100 : 0;
      const semuaSisa = semuaPpm - semuaJumlah;
      prevMonthJumlahMap.set(`${cleanKec}_SEMUA METODE`, semuaJumlah);
      monthKecRows['SEMUA METODE'].blnLalu += semuaBlnLalu;
      monthKecRows['SEMUA METODE'].blnIni += semuaBlnIni;
      synced.push([kec, semuaPpm, semuaBlnLalu, semuaBlnIni, semuaJumlah, semuaPercentage, semuaSisa, 'SEMUA METODE', month]);
    });

    // 2. Baris JUMLAH (KABUPATEN BOJONEGORO) - Target PPM selalu mengacu ke Data PPM resmi
    allCategories.forEach(cat => {
      const kabPpm = getOfficialPpm('JUMLAH (KABUPATEN BOJONEGORO)', cat);
      const kabBlnLalu = monthKecRows[cat].blnLalu;
      const kabBlnIni = monthKecRows[cat].blnIni;
      const kabJumlah = kabBlnLalu + kabBlnIni;
      const kabPercentage = kabPpm > 0 ? (kabJumlah / kabPpm) * 100 : 0;
      const kabSisa = kabPpm - kabJumlah;

      synced.push([
        'JUMLAH (KABUPATEN BOJONEGORO)',
        kabPpm,
        kabBlnLalu,
        kabBlnIni,
        kabJumlah,
        kabPercentage,
        kabSisa,
        cat,
        month
      ]);
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
 * Extracts current values from existing raw data for a given Kecamatan and Month.
 * Data Bulan Lalu secara otomatis diambil dari Jumlah Capaian bulan sebelumnya (jika bukan Januari).
 */
export function extractExistingValues(
  data: RawDataRow[], 
  kecamatan: string, 
  bulan: string
): AllMethodsEntry {
  const result = getInitialMethodEntry(kecamatan);

  if (!Array.isArray(data)) return result;

  const prevMonth = getPreviousMonth(bulan);

  METHOD_KEYS.forEach(method => {
    const row = data.find(r => 
      r[0]?.toString().toUpperCase().trim() === kecamatan.toUpperCase().trim() &&
      r[7]?.toString().toUpperCase().trim() === method &&
      r[8]?.toString().trim() === bulan
    );

    // Bulan Lalu otomatis diambil dari jumlah capaian bulan sebelumnya
    let blnLalu = 0;
    if (prevMonth) {
      const prevRow = data.find(r => 
        r[0]?.toString().toUpperCase().trim() === kecamatan.toUpperCase().trim() &&
        r[7]?.toString().toUpperCase().trim() === method &&
        r[8]?.toString().trim() === prevMonth
      );
      if (prevRow) {
        const prevLalu = parseFloat(String(prevRow[2])) || 0;
        const prevIni = parseFloat(String(prevRow[3])) || 0;
        const prevJumlah = parseFloat(String(prevRow[4]));
        const calculated = !isNaN(prevJumlah) && prevJumlah > 0 ? prevJumlah : (prevLalu + prevIni);
        if (calculated > 0) {
          blnLalu = calculated;
        } else if (row) {
          blnLalu = parseFloat(String(row[2])) || 0;
        }
      } else if (row) {
        blnLalu = parseFloat(String(row[2])) || 0;
      }
    } else if (row) {
      blnLalu = parseFloat(String(row[2])) || 0;
    }

    const blnIni = row ? (parseFloat(String(row[3])) || 0) : 0;

    result[method] = {
      ppm: getOfficialPpm(kecamatan, method),
      blnLalu,
      blnIni,
    };
  });

  return result;
}

/**
 * Merges new entries for MOW, MOP, IUD, IMPLAN, SUNTIK, PIL, KONDOM,
 * ensures blnLalu is automatically derived from the previous month's jumlah,
 * recalculates MKJP, NON MKJP, SEMUA METODE, and JUMLAH (Kabupaten total),
 * and automatically cascades forward to all subsequent months!
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
    const isJumlahKec = kec.toUpperCase().includes('JUMLAH');
    const officialPpmTarget = isJumlahKec ? getOfficialPpm('JUMLAH (KABUPATEN BOJONEGORO)', category) : ppm;
    const jumlah = blnLalu + blnIni;
    const percentage = officialPpmTarget > 0 ? (jumlah / officialPpmTarget) * 100 : 0;
    const sisa = officialPpmTarget - jumlah;

    const existingIndex = updatedData.findIndex(r => {
      const rKec = r[0]?.toString().toUpperCase().trim();
      const kecMatch = isJumlahKec 
        ? rKec.includes('JUMLAH') 
        : rKec === kec.toUpperCase().trim();
      return (
        kecMatch &&
        r[7]?.toString().toUpperCase().trim() === category.toUpperCase().trim() &&
        r[8]?.toString().trim() === targetMonth
      );
    });

    const standardKecName = isJumlahKec ? 'JUMLAH (KABUPATEN BOJONEGORO)' : kec;
    const newRow: RawDataRow = [
      standardKecName,
      officialPpmTarget,
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

  const monthIndex = MONTHS.indexOf(bulan as any);
  const prevMonth = getPreviousMonth(bulan);

  // 1. Tentukan blnLalu untuk bulan ini: otomatis dari jumlah capaian bulan sebelumnya jika bukan Januari
  METHOD_KEYS.forEach(m => {
    let effectiveBlnLalu = entry[m].blnLalu || 0;
    if (prevMonth) {
      const prevRow = updatedData.find(r => 
        r[0]?.toString().toUpperCase().trim() === kecamatan.toUpperCase().trim() &&
        r[7]?.toString().toUpperCase().trim() === m &&
        r[8]?.toString().trim() === prevMonth
      );
      if (prevRow) {
        const prevLalu = parseFloat(String(prevRow[2])) || 0;
        const prevIni = parseFloat(String(prevRow[3])) || 0;
        const prevJumlah = parseFloat(String(prevRow[4]));
        const calculated = !isNaN(prevJumlah) && prevJumlah > 0 ? prevJumlah : (prevLalu + prevIni);
        if (calculated > 0) {
          effectiveBlnLalu = calculated;
        }
      }
    }

    const officialPpm = getOfficialPpm(kecamatan, m);
    setRow(kecamatan, officialPpm, effectiveBlnLalu, entry[m].blnIni || 0, m, bulan);
  });

  const recalculateSummariesForMonth = (targetKec: string, targetBulan: string) => {
    // MKJP (MOW + MOP + IUD + IMPLAN)
    const mkjpPpm = MKJP_METHODS.reduce((acc, m) => acc + getOfficialPpm(targetKec, m), 0);
    const mkjpBlnLalu = MKJP_METHODS.reduce((acc, m) => {
      const row = updatedData.find(r => r[0] === targetKec && r[7] === m && r[8] === targetBulan);
      return acc + (parseFloat(String(row?.[2])) || 0);
    }, 0);
    const mkjpBlnIni = MKJP_METHODS.reduce((acc, m) => {
      const row = updatedData.find(r => r[0] === targetKec && r[7] === m && r[8] === targetBulan);
      return acc + (parseFloat(String(row?.[3])) || 0);
    }, 0);
    setRow(targetKec, mkjpPpm, mkjpBlnLalu, mkjpBlnIni, 'MKJP', targetBulan);

    // NON MKJP (SUNTIK + PIL + KONDOM)
    const nonMkjpPpm = NON_MKJP_METHODS.reduce((acc, m) => acc + getOfficialPpm(targetKec, m), 0);
    const nonMkjpBlnLalu = NON_MKJP_METHODS.reduce((acc, m) => {
      const row = updatedData.find(r => r[0] === targetKec && r[7] === m && r[8] === targetBulan);
      return acc + (parseFloat(String(row?.[2])) || 0);
    }, 0);
    const nonMkjpBlnIni = NON_MKJP_METHODS.reduce((acc, m) => {
      const row = updatedData.find(r => r[0] === targetKec && r[7] === m && r[8] === targetBulan);
      return acc + (parseFloat(String(row?.[3])) || 0);
    }, 0);
    setRow(targetKec, nonMkjpPpm, nonMkjpBlnLalu, nonMkjpBlnIni, 'NON MKJP', targetBulan);

    // SEMUA METODE
    const totalPpm = mkjpPpm + nonMkjpPpm;
    const totalBlnLalu = mkjpBlnLalu + nonMkjpBlnLalu;
    const totalBlnIni = mkjpBlnIni + nonMkjpBlnIni;
    setRow(targetKec, totalPpm, totalBlnLalu, totalBlnIni, 'SEMUA METODE', targetBulan);

    // JUMLAH KABUPATEN
    const allCategoriesToRecalc = [...METHOD_KEYS, 'MKJP', 'NON MKJP', 'SEMUA METODE'];
    allCategoriesToRecalc.forEach(category => {
      const rowsForCat = updatedData.filter(r => 
        !r[0]?.toString().toUpperCase().includes('JUMLAH') &&
        r[7]?.toString().toUpperCase().trim() === category.toUpperCase().trim() &&
        r[8]?.toString().trim() === targetBulan
      );

      const kabPpm = getOfficialPpm('JUMLAH (KABUPATEN BOJONEGORO)', category);
      const kabBlnLalu = rowsForCat.reduce((sum, r) => sum + (parseFloat(String(r[2])) || 0), 0);
      const kabBlnIni = rowsForCat.reduce((sum, r) => sum + (parseFloat(String(r[3])) || 0), 0);

      setRow('JUMLAH (KABUPATEN BOJONEGORO)', kabPpm, kabBlnLalu, kabBlnIni, category, targetBulan);
    });
  };

  // Hitung agregasi untuk bulan aktif
  recalculateSummariesForMonth(kecamatan, bulan);

  // 2. CASCADE FORWARD: Otomatis teruskan capaian kumulatif ke semua bulan berikutnya (Februari s/d Desember)
  if (monthIndex >= 0 && monthIndex < MONTHS.length - 1) {
    for (let i = monthIndex + 1; i < MONTHS.length; i++) {
      const mTarget = MONTHS[i];
      const prevMTarget = MONTHS[i - 1];

      METHOD_KEYS.forEach(m => {
        const prevRow = updatedData.find(r => 
          r[0]?.toString().toUpperCase().trim() === kecamatan.toUpperCase().trim() &&
          r[7]?.toString().toUpperCase().trim() === m &&
          r[8]?.toString().trim() === prevMTarget
        );
        const prevLalu = parseFloat(String(prevRow?.[2])) || 0;
        const prevIni = parseFloat(String(prevRow?.[3])) || 0;
        const prevJumlah = parseFloat(String(prevRow?.[4]));
        const newBlnLalu = !isNaN(prevJumlah) && prevJumlah > 0 ? prevJumlah : (prevLalu + prevIni);

        const currRow = updatedData.find(r => 
          r[0]?.toString().toUpperCase().trim() === kecamatan.toUpperCase().trim() &&
          r[7]?.toString().toUpperCase().trim() === m &&
          r[8]?.toString().trim() === mTarget
        );
        const existingBlnIni = parseFloat(String(currRow?.[3])) || 0;
        const officialPpm = getOfficialPpm(kecamatan, m);

        setRow(kecamatan, officialPpm, newBlnLalu, existingBlnIni, m, mTarget);
      });

      // Hitung ulang agregasi MKJP, NON MKJP, SEMUA METODE, dan JUMLAH KABUPATEN untuk bulan mTarget
      recalculateSummariesForMonth(kecamatan, mTarget);
    }
  }

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

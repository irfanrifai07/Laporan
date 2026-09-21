/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ContraceptiveMethod } from '../types';

export interface KecamatanPpmTarget {
  kecamatan: string;
  IUD: number;
  MOW: number;
  MOP: number;
  KONDOM: number;
  IMPLAN: number;
  SUNTIK: number;
  PIL: number;
  mkjp: number;
  nonMkjp: number;
  total: number;
}

// Master Data PPM resmi sesuai dokumen PDF Kabupaten Bojonegoro
export const RAW_PPM_DATA: Record<string, Record<ContraceptiveMethod, number>> = {
  "NGRAHO":     { IUD: 38, MOW: 3,  MOP: 1, KONDOM: 9,  IMPLAN: 49, SUNTIK: 250, PIL: 106 },
  "TAMBAKREJO": { IUD: 4,  MOW: 2,  MOP: 0, KONDOM: 7,  IMPLAN: 76, SUNTIK: 373, PIL: 45 },
  "NGAMBON":    { IUD: 1,  MOW: 1,  MOP: 0, KONDOM: 3,  IMPLAN: 11, SUNTIK: 107, PIL: 17 },
  "NGASEM":     { IUD: 10, MOW: 4,  MOP: 0, KONDOM: 8,  IMPLAN: 57, SUNTIK: 481, PIL: 67 },
  "BUBULAN":    { IUD: 2,  MOW: 2,  MOP: 0, KONDOM: 12, IMPLAN: 21, SUNTIK: 120, PIL: 7 },
  "DANDER":     { IUD: 14, MOW: 8,  MOP: 0, KONDOM: 22, IMPLAN: 72, SUNTIK: 527, PIL: 96 },
  "SUGIHWARAS": { IUD: 9,  MOW: 3,  MOP: 0, KONDOM: 9,  IMPLAN: 28, SUNTIK: 371, PIL: 67 },
  "KEDUNGADEM": { IUD: 6,  MOW: 6,  MOP: 0, KONDOM: 11, IMPLAN: 45, SUNTIK: 733, PIL: 61 },
  "KEPOHBARU":  { IUD: 13, MOW: 6,  MOP: 0, KONDOM: 8,  IMPLAN: 78, SUNTIK: 498, PIL: 86 },
  "BAURENO":    { IUD: 20, MOW: 8,  MOP: 0, KONDOM: 22, IMPLAN: 89, SUNTIK: 641, PIL: 115 },
  "KANOR":      { IUD: 31, MOW: 5,  MOP: 0, KONDOM: 13, IMPLAN: 44, SUNTIK: 415, PIL: 151 },
  "SUMBEREJO":  { IUD: 16, MOW: 8,  MOP: 0, KONDOM: 21, IMPLAN: 45, SUNTIK: 526, PIL: 122 },
  "BALEN":      { IUD: 16, MOW: 6,  MOP: 0, KONDOM: 17, IMPLAN: 62, SUNTIK: 434, PIL: 128 },
  "KAPAS":      { IUD: 16, MOW: 5,  MOP: 0, KONDOM: 26, IMPLAN: 56, SUNTIK: 355, PIL: 119 },
  "BOJONEGORO": { IUD: 21, MOW: 12, MOP: 1, KONDOM: 78, IMPLAN: 47, SUNTIK: 419, PIL: 101 },
  "KALITIDU":   { IUD: 14, MOW: 6,  MOP: 0, KONDOM: 11, IMPLAN: 33, SUNTIK: 361, PIL: 73 },
  "MALO":       { IUD: 6,  MOW: 4,  MOP: 1, KONDOM: 13, IMPLAN: 59, SUNTIK: 197, PIL: 18 },
  "PURWOSARI":  { IUD: 2,  MOW: 2,  MOP: 0, KONDOM: 3,  IMPLAN: 34, SUNTIK: 217, PIL: 15 },
  "PADANGAN":   { IUD: 8,  MOW: 4,  MOP: 0, KONDOM: 40, IMPLAN: 56, SUNTIK: 250, PIL: 40 },
  "KASIMAN":    { IUD: 9,  MOW: 3,  MOP: 0, KONDOM: 10, IMPLAN: 23, SUNTIK: 176, PIL: 42 },
  "TEMAYANG":   { IUD: 4,  MOW: 2,  MOP: 0, KONDOM: 15, IMPLAN: 67, SUNTIK: 339, PIL: 31 },
  "MARGOMULYO": { IUD: 6,  MOW: 2,  MOP: 0, KONDOM: 2,  IMPLAN: 40, SUNTIK: 139, PIL: 23 },
  "TRUCUK":     { IUD: 15, MOW: 4,  MOP: 0, KONDOM: 16, IMPLAN: 23, SUNTIK: 217, PIL: 70 },
  "SUKOSEWU":   { IUD: 7,  MOW: 3,  MOP: 0, KONDOM: 6,  IMPLAN: 68, SUNTIK: 376, PIL: 55 },
  "KEDEWAN":    { IUD: 1,  MOW: 1,  MOP: 0, KONDOM: 3,  IMPLAN: 15, SUNTIK: 97,  PIL: 11 },
  "GONDANG":    { IUD: 2,  MOW: 1,  MOP: 0, KONDOM: 3,  IMPLAN: 25, SUNTIK: 210, PIL: 30 },
  "SEKAR":      { IUD: 5,  MOW: 1,  MOP: 0, KONDOM: 2,  IMPLAN: 41, SUNTIK: 261, PIL: 14 },
  "GAYAM":      { IUD: 4,  MOW: 8,  MOP: 0, KONDOM: 8,  IMPLAN: 26, SUNTIK: 317, PIL: 20 }
};

// Ubah ke array terstruktur lengkap dengan kalkulasi MKJP, Non-MKJP, dan Total
export const OFFICIAL_PPM_LIST: KecamatanPpmTarget[] = Object.entries(RAW_PPM_DATA).map(([kec, vals]) => {
  const mkjp = vals.IUD + vals.MOW + vals.MOP + vals.IMPLAN;
  const nonMkjp = vals.SUNTIK + vals.PIL + vals.KONDOM;
  const total = mkjp + nonMkjp;
  return {
    kecamatan: kec,
    IUD: vals.IUD,
    MOW: vals.MOW,
    MOP: vals.MOP,
    KONDOM: vals.KONDOM,
    IMPLAN: vals.IMPLAN,
    SUNTIK: vals.SUNTIK,
    PIL: vals.PIL,
    mkjp,
    nonMkjp,
    total
  };
});

// Total Kabupaten Bojonegoro
export const TOTAL_BOJONEGORO_PPM: KecamatanPpmTarget = {
  kecamatan: 'JUMLAH (KABUPATEN BOJONEGORO)',
  IUD: OFFICIAL_PPM_LIST.reduce((s, r) => s + r.IUD, 0),
  MOW: OFFICIAL_PPM_LIST.reduce((s, r) => s + r.MOW, 0),
  MOP: OFFICIAL_PPM_LIST.reduce((s, r) => s + r.MOP, 0),
  KONDOM: OFFICIAL_PPM_LIST.reduce((s, r) => s + r.KONDOM, 0),
  IMPLAN: OFFICIAL_PPM_LIST.reduce((s, r) => s + r.IMPLAN, 0),
  SUNTIK: OFFICIAL_PPM_LIST.reduce((s, r) => s + r.SUNTIK, 0),
  PIL: OFFICIAL_PPM_LIST.reduce((s, r) => s + r.PIL, 0),
  mkjp: OFFICIAL_PPM_LIST.reduce((s, r) => s + r.mkjp, 0),
  nonMkjp: OFFICIAL_PPM_LIST.reduce((s, r) => s + r.nonMkjp, 0),
  total: OFFICIAL_PPM_LIST.reduce((s, r) => s + r.total, 0),
};

/**
 * Menentukan apakah baris merupakan baris total akumulasi Kabupaten Bojonegoro.
 * PENTING: "BOJONEGORO" adalah nama salah satu dari 28 kecamatan, sehingga hanya string
 * yang diawali/mengandung "JUMLAH", "TOTAL", atau eksplisit "KABUPATEN BOJONEGORO" yang dianggap baris total.
 */
export function isKabupatenTotalRow(kecamatan: string): boolean {
  if (!kecamatan) return false;
  const clean = kecamatan.toUpperCase().trim();
  if (clean === 'BOJONEGORO') return false; // Ini Kecamatan Bojonegoro, bukan total kabupaten!
  return (
    clean.startsWith('JUMLAH') ||
    clean.includes('JUMLAH') ||
    clean === 'TOTAL' ||
    clean === 'KABUPATEN BOJONEGORO' ||
    clean === 'JUMLAH (KABUPATEN BOJONEGORO)' ||
    clean === 'TOTAL KABUPATEN' ||
    clean.includes('KABUPATEN')
  );
}

/**
 * Mendapatkan target PPM resmi berdasarkan nama kecamatan dan metode/kategori.
 * Data PPM resmi dari TOTAL_BOJONEGORO_PPM dan RAW_PPM_DATA adalah sumber kebenaran tunggal (single source of truth).
 */
export function getOfficialPpm(kecamatan: string, methodOrCategory: string): number {
  const cleanKec = kecamatan ? kecamatan.toUpperCase().trim() : '';
  const cleanCat = methodOrCategory ? methodOrCategory.toUpperCase().trim() : '';

  // 1. Jika baris JUMLAH / AKUMULASI KABUPATEN BOJONEGORO
  if (isKabupatenTotalRow(cleanKec)) {
    if (cleanCat === 'IUD') return TOTAL_BOJONEGORO_PPM.IUD;
    if (cleanCat === 'MOW') return TOTAL_BOJONEGORO_PPM.MOW;
    if (cleanCat === 'MOP') return TOTAL_BOJONEGORO_PPM.MOP;
    if (cleanCat === 'KONDOM') return TOTAL_BOJONEGORO_PPM.KONDOM;
    if (cleanCat === 'IMPLAN') return TOTAL_BOJONEGORO_PPM.IMPLAN;
    if (cleanCat === 'SUNTIK') return TOTAL_BOJONEGORO_PPM.SUNTIK;
    if (cleanCat === 'PIL') return TOTAL_BOJONEGORO_PPM.PIL;
    if (cleanCat === 'MKJP') return TOTAL_BOJONEGORO_PPM.mkjp;
    if (cleanCat === 'NON MKJP') return TOTAL_BOJONEGORO_PPM.nonMkjp;
    if (cleanCat === 'SEMUA METODE') return TOTAL_BOJONEGORO_PPM.total;
    return TOTAL_BOJONEGORO_PPM.total;
  }

  // 2. Jika kecamatan spesifik (termasuk Kecamatan BOJONEGORO)
  const kecTarget = RAW_PPM_DATA[cleanKec];
  if (!kecTarget) return 0;

  if (cleanCat === 'IUD') return kecTarget.IUD;
  if (cleanCat === 'MOW') return kecTarget.MOW;
  if (cleanCat === 'MOP') return kecTarget.MOP;
  if (cleanCat === 'KONDOM') return kecTarget.KONDOM;
  if (cleanCat === 'IMPLAN') return kecTarget.IMPLAN;
  if (cleanCat === 'SUNTIK') return kecTarget.SUNTIK;
  if (cleanCat === 'PIL') return kecTarget.PIL;
  if (cleanCat === 'MKJP') return kecTarget.IUD + kecTarget.MOW + kecTarget.MOP + kecTarget.IMPLAN;
  if (cleanCat === 'NON MKJP') return kecTarget.SUNTIK + kecTarget.PIL + kecTarget.KONDOM;
  if (cleanCat === 'SEMUA METODE') {
    return (kecTarget.IUD + kecTarget.MOW + kecTarget.MOP + kecTarget.IMPLAN) +
           (kecTarget.SUNTIK + kecTarget.PIL + kecTarget.KONDOM);
  }

  return 0;
}

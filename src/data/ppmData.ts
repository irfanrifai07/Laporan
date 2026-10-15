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

export type PpmMethodTargets = Record<ContraceptiveMethod, number>;
export type PpmTargetMap = Record<string, PpmMethodTargets>;

// Master Data PPM resmi sesuai dokumen PDF Kabupaten Bojonegoro (Baseline Default)
export const RAW_PPM_DATA: PpmTargetMap = {
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

/**
 * Menghitung list target per kecamatan dari target map apapun
 */
export function calculatePpmTargetsList(targetMap: PpmTargetMap): KecamatanPpmTarget[] {
  return Object.entries(targetMap).map(([kec, vals]) => {
    const mkjp = (vals.IUD || 0) + (vals.MOW || 0) + (vals.MOP || 0) + (vals.IMPLAN || 0);
    const nonMkjp = (vals.SUNTIK || 0) + (vals.PIL || 0) + (vals.KONDOM || 0);
    const total = mkjp + nonMkjp;
    return {
      kecamatan: kec,
      IUD: vals.IUD || 0,
      MOW: vals.MOW || 0,
      MOP: vals.MOP || 0,
      KONDOM: vals.KONDOM || 0,
      IMPLAN: vals.IMPLAN || 0,
      SUNTIK: vals.SUNTIK || 0,
      PIL: vals.PIL || 0,
      mkjp,
      nonMkjp,
      total
    };
  });
}

/**
 * Menghitung akumulasi total Kabupaten Bojonegoro dari daftar target kecamatan
 */
export function calculateKabupatenPpmTotal(list: KecamatanPpmTarget[]): KecamatanPpmTarget {
  return {
    kecamatan: 'JUMLAH (KABUPATEN BOJONEGORO)',
    IUD: list.reduce((s, r) => s + r.IUD, 0),
    MOW: list.reduce((s, r) => s + r.MOW, 0),
    MOP: list.reduce((s, r) => s + r.MOP, 0),
    KONDOM: list.reduce((s, r) => s + r.KONDOM, 0),
    IMPLAN: list.reduce((s, r) => s + r.IMPLAN, 0),
    SUNTIK: list.reduce((s, r) => s + r.SUNTIK, 0),
    PIL: list.reduce((s, r) => s + r.PIL, 0),
    mkjp: list.reduce((s, r) => s + r.mkjp, 0),
    nonMkjp: list.reduce((s, r) => s + r.nonMkjp, 0),
    total: list.reduce((s, r) => s + r.total, 0),
  };
}

// In-Memory store untuk target PPM yang sedang aktif (dapat diubah oleh Admin)
let activePpmTargetsStore: PpmTargetMap = { ...RAW_PPM_DATA };
let activePpmYearStore: string = '2026';

export function getActivePpmTargets(): PpmTargetMap {
  return activePpmTargetsStore;
}

export function setActivePpmTargets(targets: PpmTargetMap, year?: string): void {
  activePpmTargetsStore = { ...targets };
  if (year) {
    activePpmYearStore = year;
  }
}

export function getActivePpmYear(): string {
  return activePpmYearStore;
}

export function setActivePpmYear(year: string): void {
  activePpmYearStore = year;
}

// Ubah ke array terstruktur lengkap dengan kalkulasi MKJP, Non-MKJP, dan Total
export const OFFICIAL_PPM_LIST: KecamatanPpmTarget[] = calculatePpmTargetsList(RAW_PPM_DATA);

// Total Kabupaten Bojonegoro
export const TOTAL_BOJONEGORO_PPM: KecamatanPpmTarget = calculateKabupatenPpmTotal(OFFICIAL_PPM_LIST);

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
 * Mendukung kustomisasi target per tahun secara dinamis.
 */
export function getOfficialPpm(
  kecamatan: string, 
  methodOrCategory: string,
  customTargets?: PpmTargetMap
): number {
  const cleanKec = kecamatan ? kecamatan.toUpperCase().trim() : '';
  const cleanCat = methodOrCategory ? methodOrCategory.toUpperCase().trim() : '';
  const targets = customTargets || activePpmTargetsStore;

  // 1. Jika baris JUMLAH / AKUMULASI KABUPATEN BOJONEGORO
  if (isKabupatenTotalRow(cleanKec)) {
    const list = calculatePpmTargetsList(targets);
    const kabTotal = calculateKabupatenPpmTotal(list);

    if (cleanCat === 'IUD') return kabTotal.IUD;
    if (cleanCat === 'MOW') return kabTotal.MOW;
    if (cleanCat === 'MOP') return kabTotal.MOP;
    if (cleanCat === 'KONDOM') return kabTotal.KONDOM;
    if (cleanCat === 'IMPLAN') return kabTotal.IMPLAN;
    if (cleanCat === 'SUNTIK') return kabTotal.SUNTIK;
    if (cleanCat === 'PIL') return kabTotal.PIL;
    if (cleanCat === 'MKJP') return kabTotal.mkjp;
    if (cleanCat === 'NON MKJP') return kabTotal.nonMkjp;
    if (cleanCat === 'SEMUA METODE') return kabTotal.total;
    return kabTotal.total;
  }

  // 2. Jika kecamatan spesifik (termasuk Kecamatan BOJONEGORO)
  const kecTarget = targets[cleanKec] || RAW_PPM_DATA[cleanKec];
  if (!kecTarget) return 0;

  if (cleanCat === 'IUD') return kecTarget.IUD || 0;
  if (cleanCat === 'MOW') return kecTarget.MOW || 0;
  if (cleanCat === 'MOP') return kecTarget.MOP || 0;
  if (cleanCat === 'KONDOM') return kecTarget.KONDOM || 0;
  if (cleanCat === 'IMPLAN') return kecTarget.IMPLAN || 0;
  if (cleanCat === 'SUNTIK') return kecTarget.SUNTIK || 0;
  if (cleanCat === 'PIL') return kecTarget.PIL || 0;
  if (cleanCat === 'MKJP') {
    return (kecTarget.IUD || 0) + (kecTarget.MOW || 0) + (kecTarget.MOP || 0) + (kecTarget.IMPLAN || 0);
  }
  if (cleanCat === 'NON MKJP') {
    return (kecTarget.SUNTIK || 0) + (kecTarget.PIL || 0) + (kecTarget.KONDOM || 0);
  }
  if (cleanCat === 'SEMUA METODE') {
    return (
      (kecTarget.IUD || 0) + (kecTarget.MOW || 0) + (kecTarget.MOP || 0) + (kecTarget.IMPLAN || 0) +
      (kecTarget.SUNTIK || 0) + (kecTarget.PIL || 0) + (kecTarget.KONDOM || 0)
    );
  }

  return 0;
}

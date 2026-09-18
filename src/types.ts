/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RawDataRow = [string, number, number, number, number, number, number, string, string];

export interface ProcessedData {
  kecamatan: string;
  ppm: number;
  blnLalu: number;
  blnIni: number;
  jumlah: number;
  percentage: number;
  sisa: number;
  isJumlah?: boolean;
}

export enum AppView {
  DASHBOARD = 'dashboard',
  TABLE = 'table',
  ENTRY = 'entry',
  PPM = 'ppm'
}

export const METHOD_KEYS = ['MOW', 'MOP', 'IUD', 'IMPLAN', 'SUNTIK', 'PIL', 'KONDOM'] as const;
export type ContraceptiveMethod = typeof METHOD_KEYS[number];

export interface MethodEntryValues {
  ppm: number;
  blnLalu: number;
  blnIni: number;
}

export type AllMethodsEntry = Record<ContraceptiveMethod, MethodEntryValues>;

export const KECAMATAN_LIST = [
  'NGRAHO',
  'TAMBAKREJO',
  'NGAMBON',
  'NGASEM',
  'BUBULAN',
  'DANDER',
  'SUGIHWARAS',
  'KEDUNGADEM',
  'KEPOHBARU',
  'BAURENO',
  'KANOR',
  'SUMBEREJO',
  'BALEN',
  'KAPAS',
  'BOJONEGORO',
  'KALITIDU',
  'MALO',
  'PURWOSARI',
  'PADANGAN',
  'KASIMAN',
  'TEMAYANG',
  'MARGOMULYO',
  'TRUCUK',
  'SUKOSEWU',
  'KEDEWAN',
  'GONDANG',
  'SEKAR',
  'GAYAM'
];

export const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export const MKJP_METHODS = ['MOW', 'MOP', 'IUD', 'IMPLAN'] as const;
export const NON_MKJP_METHODS = ['SUNTIK', 'PIL', 'KONDOM'] as const;

export interface MethodMeta {
  id: ContraceptiveMethod;
  label: string;
  category: 'MKJP' | 'NON MKJP';
  fullName: string;
  badgeColor: string;
}

export const METHOD_DETAILS: Record<ContraceptiveMethod, MethodMeta> = {
  MOW: {
    id: 'MOW',
    label: 'MOW',
    category: 'MKJP',
    fullName: 'Metode Operasi Wanita (Tubektomi)',
    badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30'
  },
  MOP: {
    id: 'MOP',
    label: 'MOP',
    category: 'MKJP',
    fullName: 'Metode Operasi Pria (Vasektomi)',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30'
  },
  IUD: {
    id: 'IUD',
    label: 'IUD',
    category: 'MKJP',
    fullName: 'Intrauterine Device (Spiral)',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30'
  },
  IMPLAN: {
    id: 'IMPLAN',
    label: 'IMPLAN',
    category: 'MKJP',
    fullName: 'Implan (Susuk KB)',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30'
  },
  SUNTIK: {
    id: 'SUNTIK',
    label: 'SUNTIK',
    category: 'NON MKJP',
    fullName: 'KB Suntik (1/3 Bulan)',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
  },
  PIL: {
    id: 'PIL',
    label: 'PIL',
    category: 'NON MKJP',
    fullName: 'KB Pil Hormonal',
    badgeColor: 'bg-teal-500/10 text-teal-400 border-teal-500/30'
  },
  KONDOM: {
    id: 'KONDOM',
    label: 'KONDOM',
    category: 'NON MKJP',
    fullName: 'Kondom',
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
  }
};

export interface AlokonItem {
  id: string;
  label: string;
  category: 'SEMUA' | 'MKJP' | 'NON MKJP';
  fullName: string;
  description: string;
  badgeColor: string;
  keywords: string[];
}

export const ALOKON_ITEMS: AlokonItem[] = [
  {
    id: 'Semua Metode',
    label: 'SEMUA METODE',
    category: 'SEMUA',
    fullName: 'Semua Metode Kontrasepsi (Total Akumulasi)',
    description: 'Gabungan seluruh capaian metode MKJP & Non-MKJP',
    badgeColor: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
    keywords: ['semua', 'all', 'total', 'gabungan', 'rekap', 'akumulasi', 'metode']
  },
  {
    id: 'MKJP',
    label: 'MKJP',
    category: 'MKJP',
    fullName: 'Metode Kontrasepsi Jangka Panjang',
    description: 'Gabungan IUD, MOW, MOP, dan Implan',
    badgeColor: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    keywords: ['mkjp', 'jangka panjang', 'panjang', 'gabungan mkjp']
  },
  {
    id: 'NON MKJP',
    label: 'NON MKJP',
    category: 'NON MKJP',
    fullName: 'Non Metode Kontrasepsi Jangka Panjang',
    description: 'Gabungan Suntik, Pil, dan Kondom',
    badgeColor: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    keywords: ['non mkjp', 'non-mkjp', 'jangka pendek', 'pendek', 'gabungan non']
  },
  {
    id: 'IUD',
    label: 'IUD',
    category: 'MKJP',
    fullName: 'Intrauterine Device (Spiral / AKDR)',
    description: 'Alat kontrasepsi dalam rahim jangka panjang efektif',
    badgeColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    keywords: ['iud', 'spiral', 'akdr', 'intrauterine', 'copper-t', 'rahim']
  },
  {
    id: 'MOW',
    label: 'MOW',
    category: 'MKJP',
    fullName: 'Metode Operasi Wanita (Tubektomi)',
    description: 'Kontrasepsi mantap / sterilisasi sukarela pada wanita',
    badgeColor: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    keywords: ['mow', 'tubektomi', 'steril wanita', 'operasi wanita', 'tubal']
  },
  {
    id: 'MOP',
    label: 'MOP',
    category: 'MKJP',
    fullName: 'Metode Operasi Pria (Vasektomi)',
    description: 'Kontrasepsi mantap / sterilisasi sukarela pada pria',
    badgeColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    keywords: ['mop', 'vasektomi', 'steril pria', 'operasi pria', 'vas']
  },
  {
    id: 'IMPLAN',
    label: 'IMPLAN',
    category: 'MKJP',
    fullName: 'Implan (Susuk KB)',
    description: 'Batang kecil fleksibel yang dipasang di bawah kulit lengan',
    badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    keywords: ['implan', 'implant', 'susuk', 'susuk kb', 'norplant', 'lengan']
  },
  {
    id: 'SUNTIK',
    label: 'SUNTIK',
    category: 'NON MKJP',
    fullName: 'KB Suntik (Injeksi Hormonal)',
    description: 'Injeksi kontrasepsi berkala 1 bulan atau 3 bulan',
    badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    keywords: ['suntik', 'injeksi', 'suntikan', 'depo', '1 bulan', '3 bulan']
  },
  {
    id: 'PIL',
    label: 'PIL',
    category: 'NON MKJP',
    fullName: 'KB Pil Hormonal (Oral)',
    description: 'Pil kontrasepsi oral kombinasi atau progestin',
    badgeColor: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
    keywords: ['pil', 'oral', 'tablet', 'minum', 'pil kb']
  },
  {
    id: 'KONDOM',
    label: 'KONDOM',
    category: 'NON MKJP',
    fullName: 'Kondom',
    description: 'Alat kontrasepsi barrier / barier',
    badgeColor: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    keywords: ['kondom', 'condom', 'karet', 'pengaman', 'barrier']
  }
];

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { RawDataRow, MONTHS, KECAMATAN_LIST } from '../types';
import { getOfficialPpm } from '../data/ppmData';

interface ExportTableOptions {
  data: RawDataRow[];
  selectedMonth: string;
  activeCategory: string;
  tableMode?: 'month' | 'year';
}

/**
 * Downloads purely the data table as a native Excel file (.xlsx)
 */
export function exportTableToExcel({
  data,
  selectedMonth,
  activeCategory,
  tableMode = 'month'
}: ExportTableOptions): void {
  const wb = XLSX.utils.book_new();
  const matchCat = activeCategory.toUpperCase().trim();

  // 1. Data Per Bulan (Single Month)
  const singleMonthRows = data.filter(row => {
    if (!Array.isArray(row)) return false;
    const rowCategory = row[7]?.toString().toUpperCase().trim();
    const categoryMatch = matchCat === 'SEMUA METODE'
      ? rowCategory === 'SEMUA METODE'
      : rowCategory === matchCat;
    const rowMonth = row[8]?.toString().trim();
    return categoryMatch && rowMonth === selectedMonth;
  });

  const monthSheetData: (string | number)[][] = [
    ['TABEL CAPAIAN PELAYANAN KB - KABUPATEN BOJONEGORO'],
    [`Periode Bulan: ${selectedMonth} | Metode: ${activeCategory}`],
    [`Tanggal Unduh: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`],
    [], // Blank line
    [
      'No',
      'Kecamatan',
      'Metode Kontrasepsi',
      'Bulan',
      'Target PPM',
      'Capaian Bulan Lalu',
      'Capaian Bulan Ini',
      'Total Capaian',
      'Prosentase (%)',
      'Sisa Target'
    ]
  ];

  let sumPpm = 0;
  let sumBlnLalu = 0;
  let sumBlnIni = 0;
  let sumJumlah = 0;
  let sumSisa = 0;

  // Process 28 kecamatan
  KECAMATAN_LIST.forEach((kec, idx) => {
    const row = singleMonthRows.find(r => 
      r[0]?.toString().toUpperCase().trim() === kec.toUpperCase().trim()
    );

    const officialPpm = getOfficialPpm(kec, activeCategory);
    const ppm = officialPpm > 0 ? officialPpm : (row ? (parseFloat(String(row[1])) || 0) : 0);
    const blnLalu = row ? (parseFloat(String(row[2])) || 0) : 0;
    const blnIni = row ? (parseFloat(String(row[3])) || 0) : 0;
    const jumlah = row ? (parseFloat(String(row[4])) || 0) : (blnLalu + blnIni);
    const sisa = ppm - jumlah;
    const percentage = ppm > 0 ? (jumlah / ppm) * 100 : 0;

    sumPpm += ppm;
    sumBlnLalu += blnLalu;
    sumBlnIni += blnIni;
    sumJumlah += jumlah;

    monthSheetData.push([
      idx + 1,
      kec,
      activeCategory,
      selectedMonth,
      ppm,
      blnLalu,
      blnIni,
      jumlah,
      Number(percentage.toFixed(2)),
      sisa
    ]);
  });

  // Total Kabupaten Row - Target PPM selalu mengacu ke data PPM resmi
  const officialKabPpm = getOfficialPpm('JUMLAH', activeCategory);
  const totalPpm = officialKabPpm > 0 ? officialKabPpm : sumPpm;
  const totalPercentage = totalPpm > 0 ? (sumJumlah / totalPpm) * 100 : 0;
  const totalSisa = totalPpm - sumJumlah;

  monthSheetData.push([
    '-',
    'JUMLAH KABUPATEN BOJONEGORO',
    activeCategory,
    selectedMonth,
    totalPpm,
    sumBlnLalu,
    sumBlnIni,
    sumJumlah,
    Number(totalPercentage.toFixed(2)),
    totalSisa
  ]);

  const wsMonth = XLSX.utils.aoa_to_sheet(monthSheetData);

  // Set column widths
  wsMonth['!cols'] = [
    { wch: 6 },  // No
    { wch: 22 }, // Kecamatan
    { wch: 20 }, // Metode
    { wch: 14 }, // Bulan
    { wch: 14 }, // Target PPM
    { wch: 18 }, // Bln Lalu
    { wch: 18 }, // Bln Ini
    { wch: 16 }, // Total Capaian
    { wch: 16 }, // Prosentase
    { wch: 14 }, // Sisa
  ];

  XLSX.utils.book_append_sheet(wb, wsMonth, `Tabel ${selectedMonth.slice(0, 15)}`);

  // 2. Data Rekap 12 Bulan (Januari - Desember)
  const yearlySheetData: (string | number)[][] = [
    ['REKAPITULASI CAPAIAN 12 BULAN (JANUARI S/D DESEMBER) - KABUPATEN BOJONEGORO'],
    [`Metode Kontrasepsi: ${activeCategory}`],
    [`Tahun Laporan: 2024`],
    [],
    [
      'No',
      'Kecamatan',
      'Metode',
      'Target PPM',
      ...MONTHS,
      'Total Capaian (Jan-Des)',
      'Prosentase (%)',
      'Sisa Target'
    ]
  ];

  let ySumPpm = 0;
  const yMonthlySums: { [m: string]: number } = {};
  MONTHS.forEach(m => { yMonthlySums[m] = 0; });
  let ySumTotalCapaian = 0;

  KECAMATAN_LIST.forEach((kec, idx) => {
    // Ambil sample PPM resmi dari Data PPM
    const officialPpm = getOfficialPpm(kec, activeCategory);
    const sampleRow = data.find(r => 
      r[0]?.toString().toUpperCase().trim() === kec.toUpperCase().trim() &&
      (matchCat === 'SEMUA METODE' 
        ? r[7]?.toString().toUpperCase().trim() === 'SEMUA METODE' 
        : r[7]?.toString().toUpperCase().trim() === matchCat)
    );
    const ppm = officialPpm > 0 ? officialPpm : (sampleRow ? (parseFloat(String(sampleRow[1])) || 0) : 0);
    ySumPpm += ppm;

    const monthlyVals = MONTHS.map(m => {
      const row = data.find(r => 
        r[0]?.toString().toUpperCase().trim() === kec.toUpperCase().trim() &&
        (matchCat === 'SEMUA METODE' 
          ? r[7]?.toString().toUpperCase().trim() === 'SEMUA METODE' 
          : r[7]?.toString().toUpperCase().trim() === matchCat) &&
        r[8]?.toString().trim() === m
      );
      const val = row ? (parseFloat(String(row[3])) || 0) : 0;
      yMonthlySums[m] += val;
      return val;
    });

    const totalCapaian = monthlyVals.reduce((acc, v) => acc + v, 0);
    ySumTotalCapaian += totalCapaian;
    const percentage = ppm > 0 ? (totalCapaian / ppm) * 100 : 0;
    const sisa = ppm - totalCapaian;

    yearlySheetData.push([
      idx + 1,
      kec,
      activeCategory,
      ppm,
      ...monthlyVals,
      totalCapaian,
      Number(percentage.toFixed(2)),
      sisa
    ]);
  });

  // Total Baris Rekap 12 Bulan - Target PPM mengacu ke Data PPM resmi
  const yOfficialKabPpm = getOfficialPpm('JUMLAH', activeCategory);
  const yFinalTotalPpm = yOfficialKabPpm > 0 ? yOfficialKabPpm : ySumPpm;
  const yTotalPercentage = yFinalTotalPpm > 0 ? (ySumTotalCapaian / yFinalTotalPpm) * 100 : 0;
  const yTotalSisa = yFinalTotalPpm - ySumTotalCapaian;
  yearlySheetData.push([
    '-',
    'JUMLAH KABUPATEN BOJONEGORO',
    activeCategory,
    yFinalTotalPpm,
    ...MONTHS.map(m => yMonthlySums[m]),
    ySumTotalCapaian,
    Number(yTotalPercentage.toFixed(2)),
    yTotalSisa
  ]);

  const wsYearly = XLSX.utils.aoa_to_sheet(yearlySheetData);
  wsYearly['!cols'] = [
    { wch: 6 },
    { wch: 22 },
    { wch: 18 },
    { wch: 14 },
    ...MONTHS.map(() => ({ wch: 10 })),
    { wch: 20 },
    { wch: 16 },
    { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(wb, wsYearly, 'Rekap 12 Bulan');

  // File Name
  const cleanCategory = activeCategory.replace(/\s+/g, '_');
  const fileName = tableMode === 'year'
    ? `Tabel_KB_12_Bulan_${cleanCategory}.xlsx`
    : `Tabel_KB_${cleanCategory}_${selectedMonth}.xlsx`;

  XLSX.writeFile(wb, fileName);
}

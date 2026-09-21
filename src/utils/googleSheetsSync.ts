/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RawDataRow } from '../types';

export const APPS_SCRIPT_SAVE_URL = "https://script.google.com/macros/s/AKfycbyiaIUC4ix2zTp4bFnvHPouJ0S2MMeI-KS360qzarAS1aODo_1FwDTuOSj0ybuHrCu5/exec";

/**
 * Mengirim data yang telah diubah ke Google Apps Script Spreadsheet.
 * Menggunakan mode no-cors / form-data atau json agar tidak terbentur CORS browser.
 */
export async function syncRowsToGoogleSheets(
  rowsToUpdate: RawDataRow[],
  targetKecamatan?: string,
  targetMonth?: string
): Promise<{ success: boolean; message: string }> {
  if (!rowsToUpdate || rowsToUpdate.length === 0) {
    return { success: true, message: 'Tidak ada baris yang dikirim.' };
  }

  try {
    const payload = {
      action: 'save',
      month: targetMonth || '',
      kecamatan: targetKecamatan || '',
      rows: rowsToUpdate,
      timestamp: new Date().toISOString()
    };

    // Mencoba kirim dengan text/plain payload (menghindari preflight OPTIONS CORS di Google Apps Script)
    await fetch(APPS_SCRIPT_SAVE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      mode: 'no-cors' // Google Apps Script redirects require no-cors or standard text/plain
    });

    return {
      success: true,
      message: `Data ${targetKecamatan ? targetKecamatan + ' ' : ''}bulan ${targetMonth || ''} berhasil disinkronkan ke Spreadsheet.`
    };
  } catch (err: any) {
    console.warn('Sinkronisasi ke Google Apps Script:', err);
    // Walaupun browser mungkin melempar warning CORS, data di no-cors tetap sampai ke endpoint
    return {
      success: false,
      message: err?.message || 'Gagal terhubung ke Google Sheets'
    };
  }
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthUser } from '../types';

export interface OfficialAccount {
  username: string;
  defaultPassword: string;
  namaKecamatan: string;
  role: 'plkb' | 'admin';
  roleLabel: string;
}

export const OFFICIAL_ACCOUNTS: OfficialAccount[] = [
  { username: 'NGRAHO', defaultPassword: '12345', namaKecamatan: 'NGRAHO', role: 'plkb', roleLabel: 'Operator PLKB Kec. NGRAHO' },
  { username: 'TAMBAKREJO', defaultPassword: '12345', namaKecamatan: 'TAMBAKREJO', role: 'plkb', roleLabel: 'Operator PLKB Kec. TAMBAKREJO' },
  { username: 'NGAMBON', defaultPassword: '12345', namaKecamatan: 'NGAMBON', role: 'plkb', roleLabel: 'Operator PLKB Kec. NGAMBON' },
  { username: 'NGASEM', defaultPassword: '12345', namaKecamatan: 'NGASEM', role: 'plkb', roleLabel: 'Operator PLKB Kec. NGASEM' },
  { username: 'BUBULAN', defaultPassword: '45678', namaKecamatan: 'BUBULAN', role: 'plkb', roleLabel: 'Operator PLKB Kec. BUBULAN' },
  { username: 'DANDER', defaultPassword: '12345', namaKecamatan: 'DANDER', role: 'plkb', roleLabel: 'Operator PLKB Kec. DANDER' },
  { username: 'SUGIHWARAS', defaultPassword: '45678', namaKecamatan: 'SUGIHWARAS', role: 'plkb', roleLabel: 'Operator PLKB Kec. SUGIHWARAS' },
  { username: 'KEDUNGADEM', defaultPassword: '12345', namaKecamatan: 'KEDUNGADEM', role: 'plkb', roleLabel: 'Operator PLKB Kec. KEDUNGADEM' },
  { username: 'KEPOHBARU', defaultPassword: '12345', namaKecamatan: 'KEPOHBARU', role: 'plkb', roleLabel: 'Operator PLKB Kec. KEPOHBARU' },
  { username: 'BAURENO', defaultPassword: '12345', namaKecamatan: 'BAURENO', role: 'plkb', roleLabel: 'Operator PLKB Kec. BAURENO' },
  { username: 'KANOR', defaultPassword: '12345', namaKecamatan: 'KANOR', role: 'plkb', roleLabel: 'Operator PLKB Kec. KANOR' },
  { username: 'SUMBEREJO', defaultPassword: '12345', namaKecamatan: 'SUMBEREJO', role: 'plkb', roleLabel: 'Operator PLKB Kec. SUMBEREJO' },
  { username: 'BALEN', defaultPassword: '12345', namaKecamatan: 'BALEN', role: 'plkb', roleLabel: 'Operator PLKB Kec. BALEN' },
  { username: 'KAPAS', defaultPassword: '12345', namaKecamatan: 'KAPAS', role: 'plkb', roleLabel: 'Operator PLKB Kec. KAPAS' },
  { username: 'BOJONEGORO', defaultPassword: '12345', namaKecamatan: 'BOJONEGORO', role: 'plkb', roleLabel: 'Operator PLKB Kec. BOJONEGORO' },
  { username: 'KALITIDU', defaultPassword: '12345', namaKecamatan: 'KALITIDU', role: 'plkb', roleLabel: 'Operator PLKB Kec. KALITIDU' },
  { username: 'MALO', defaultPassword: '12345', namaKecamatan: 'MALO', role: 'plkb', roleLabel: 'Operator PLKB Kec. MALO' },
  { username: 'PURWOSARI', defaultPassword: '12345', namaKecamatan: 'PURWOSARI', role: 'plkb', roleLabel: 'Operator PLKB Kec. PURWOSARI' },
  { username: 'PADANGAN', defaultPassword: '12345', namaKecamatan: 'PADANGAN', role: 'plkb', roleLabel: 'Operator PLKB Kec. PADANGAN' },
  { username: 'KASIMAN', defaultPassword: '12345', namaKecamatan: 'KASIMAN', role: 'plkb', roleLabel: 'Operator PLKB Kec. KASIMAN' },
  { username: 'TEMAYANG', defaultPassword: '12345', namaKecamatan: 'TEMAYANG', role: 'plkb', roleLabel: 'Operator PLKB Kec. TEMAYANG' },
  { username: 'MARGOMULYO', defaultPassword: '12345', namaKecamatan: 'MARGOMULYO', role: 'plkb', roleLabel: 'Operator PLKB Kec. MARGOMULYO' },
  { username: 'TRUCUK', defaultPassword: '12345', namaKecamatan: 'TRUCUK', role: 'plkb', roleLabel: 'Operator PLKB Kec. TRUCUK' },
  { username: 'SUKOSEWU', defaultPassword: '12345', namaKecamatan: 'SUKOSEWU', role: 'plkb', roleLabel: 'Operator PLKB Kec. SUKOSEWU' },
  { username: 'KEDEWAN', defaultPassword: '12345', namaKecamatan: 'KEDEWAN', role: 'plkb', roleLabel: 'Operator PLKB Kec. KEDEWAN' },
  { username: 'GONDANG', defaultPassword: '12345', namaKecamatan: 'GONDANG', role: 'plkb', roleLabel: 'Operator PLKB Kec. GONDANG' },
  { username: 'SEKAR', defaultPassword: '12345', namaKecamatan: 'SEKAR', role: 'plkb', roleLabel: 'Operator PLKB Kec. SEKAR' },
  { username: 'GAYAM', defaultPassword: '12345', namaKecamatan: 'GAYAM', role: 'plkb', roleLabel: 'Operator PLKB Kec. GAYAM' },
  { username: 'ADMIN', defaultPassword: 'admin123', namaKecamatan: 'KABUPATEN BOJONEGORO', role: 'admin', roleLabel: 'Administrator Kabupaten' }
];

const STORAGE_KEY_PASSWORDS = 'laporan_kb_custom_passwords';

/**
 * Mendapatkan seluruh password kustom yang telah diubah pengguna dari localStorage
 */
export function getCustomPasswords(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PASSWORDS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Mendapatkan password aktif untuk suatu username (memeriksa perubahan di localStorage, fallback ke default)
 */
export function getActivePassword(username: string): string | null {
  const normUser = username.trim().toUpperCase();
  const customMap = getCustomPasswords();

  if (customMap[normUser]) {
    return customMap[normUser];
  }

  const account = OFFICIAL_ACCOUNTS.find(a => a.username.toUpperCase() === normUser);
  return account ? account.defaultPassword : null;
}

/**
 * Validasi login akun kecamatan atau admin
 */
export function authenticateAccount(inputUser: string, inputPass: string): { success: boolean; user?: AuthUser; error?: string } {
  const trimmedUser = inputUser.trim();
  const trimmedPass = inputPass.trim();

  if (!trimmedUser || !trimmedPass) {
    return { success: false, error: 'Silakan isi username dan kata sandi.' };
  }

  const normUser = trimmedUser.toUpperCase();
  const account = OFFICIAL_ACCOUNTS.find(a => a.username.toUpperCase() === normUser);

  if (!account) {
    return { success: false, error: `Username "${trimmedUser}" tidak terdaftar. Gunakan nama kecamatan (misal: NGRAHO) atau ADMIN.` };
  }

  const activePass = getActivePassword(normUser);

  if (trimmedPass !== activePass) {
    return { success: false, error: 'Kata sandi salah. Silakan periksa kembali kata sandi Anda.' };
  }

  const authUser: AuthUser = {
    id: `user-${normUser.toLowerCase()}`,
    username: account.username,
    name: account.role === 'admin' ? 'Administrator Kabupaten' : `Kecamatan ${account.namaKecamatan}`,
    role: account.role,
    roleLabel: account.roleLabel,
    kecamatan: account.role === 'plkb' ? account.namaKecamatan : undefined,
    jabatan: account.role === 'admin' ? 'Dinas PPPA dan KB Kab. Bojonegoro' : `Petugas PLKB Balai Penyuluh Kec. ${account.namaKecamatan}`
  };

  return { success: true, user: authUser };
}

/**
 * Merubah password akun pengguna.
 * Pengguna hanya diizinkan merubah password saja, username tetap tidak berubah.
 */
export function changePassword(
  username: string, 
  currentPass: string, 
  newPass: string, 
  confirmPass: string
): { success: boolean; error?: string } {
  const normUser = username.trim().toUpperCase();
  const account = OFFICIAL_ACCOUNTS.find(a => a.username.toUpperCase() === normUser);

  if (!account) {
    return { success: false, error: 'Pengguna tidak ditemukan dalam sistem.' };
  }

  const activePass = getActivePassword(normUser);

  if (currentPass.trim() !== activePass) {
    return { success: false, error: 'Kata sandi saat ini tidak sesuai.' };
  }

  if (!newPass || newPass.length < 4) {
    return { success: false, error: 'Kata sandi baru minimal 4 karakter.' };
  }

  if (newPass !== confirmPass) {
    return { success: false, error: 'Konfirmasi kata sandi baru tidak cocok.' };
  }

  if (newPass === currentPass.trim()) {
    return { success: false, error: 'Kata sandi baru tidak boleh sama dengan kata sandi lama.' };
  }

  try {
    const customMap = getCustomPasswords();
    customMap[normUser] = newPass;
    localStorage.setItem(STORAGE_KEY_PASSWORDS, JSON.stringify(customMap));
    return { success: true };
  } catch {
    return { success: false, error: 'Gagal menyimpan perubahan kata sandi ke penyimpanan lokal.' };
  }
}

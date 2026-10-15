/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  setDoc,
  getDocs,
  writeBatch,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  RawDataRow,
  KECAMATAN_LIST,
  MONTHS,
  METHOD_KEYS,
  ContraceptiveMethod,
} from '../types';
import { 
  getOfficialPpm, 
  PpmTargetMap, 
  RAW_PPM_DATA, 
  setActivePpmTargets 
} from '../data/ppmData';
import {
  syncDataWithOfficialPpm,
  getEnteredMonths,
  markMonthAsEntered,
  resetEnteredMonths,
  saveLocalEntriesToStorage,
  LOCAL_STORAGE_ENTERED_MONTHS,
} from './dataManager';

const APP_ID = 'bojonegoro-kb-v1';

export interface FirestoreKbEntryDoc {
  appId: string;
  kecamatan: string;
  bulan: string;
  year?: string;
  MOW_lalu: number;
  MOW_ini: number;
  MOP_lalu: number;
  MOP_ini: number;
  IUD_lalu: number;
  IUD_ini: number;
  IMPLAN_lalu: number;
  IMPLAN_ini: number;
  SUNTIK_lalu: number;
  SUNTIK_ini: number;
  PIL_lalu: number;
  PIL_ini: number;
  KONDOM_lalu: number;
  KONDOM_ini: number;
  updatedBy: string;
  updatedAt?: unknown;
}

function clampMetric(val: unknown): number {
  const parsed = Number(val);
  if (isNaN(parsed) || !isFinite(parsed)) return 0;
  return Math.min(1000000, Math.max(0, Math.round(parsed)));
}

function sanitizeUpdatedBy(user?: string): string {
  const cleaned = (user || 'ADMIN').replace(/[^a-zA-Z0-9_\- ]/g, '').trim().slice(0, 64);
  return cleaned.length > 0 ? cleaned : 'ADMIN';
}

function buildDocPayloadForKecamatanMonth(
  data: RawDataRow[],
  kecamatan: string,
  bulan: string,
  updatedBy: string,
  year = '2026'
): Record<string, unknown> | null {
  const cleanKec = kecamatan.toUpperCase().trim();
  if (!KECAMATAN_LIST.includes(cleanKec)) return null;
  if (!MONTHS.includes(bulan)) return null;
  const cleanYear = (year || data?.[0]?.[9] || '2026').toString().trim();

  const findMethodValues = (method: ContraceptiveMethod) => {
    const row = data.find(
      (r) =>
        r[0]?.toString().toUpperCase().trim() === cleanKec &&
        r[7]?.toString().toUpperCase().trim() === method &&
        r[8]?.toString().trim() === bulan
    );
    return {
      lalu: clampMetric(row?.[2]),
      ini: clampMetric(row?.[3]),
    };
  };

  const mow = findMethodValues('MOW');
  const mop = findMethodValues('MOP');
  const iud = findMethodValues('IUD');
  const implan = findMethodValues('IMPLAN');
  const suntik = findMethodValues('SUNTIK');
  const pil = findMethodValues('PIL');
  const kondom = findMethodValues('KONDOM');

  return {
    appId: APP_ID,
    kecamatan: cleanKec,
    bulan,
    year: cleanYear,
    MOW_lalu: mow.lalu,
    MOW_ini: mow.ini,
    MOP_lalu: mop.lalu,
    MOP_ini: mop.ini,
    IUD_lalu: iud.lalu,
    IUD_ini: iud.ini,
    IMPLAN_lalu: implan.lalu,
    IMPLAN_ini: implan.ini,
    SUNTIK_lalu: suntik.lalu,
    SUNTIK_ini: suntik.ini,
    PIL_lalu: pil.lalu,
    PIL_ini: pil.ini,
    KONDOM_lalu: kondom.lalu,
    KONDOM_ini: kondom.ini,
    updatedBy: sanitizeUpdatedBy(updatedBy),
    updatedAt: serverTimestamp(),
  };
}

/**
 * Konversi kumpulan dokumen Firestore kb_entries menjadi RawDataRow[] yang terintegrasi penuh dengan Target PPM Resmi
 */
export function convertFirestoreEntriesToDataset(
  entries: FirestoreKbEntryDoc[],
  enteredMonthsFromMeta?: string[],
  customTargets?: PpmTargetMap,
  targetYear = '2026'
): RawDataRow[] {
  const cleanYear = (targetYear || '2026').trim();

  if (Array.isArray(enteredMonthsFromMeta)) {
    try {
      const validMonths = enteredMonthsFromMeta.filter((m) => MONTHS.includes(m)).slice(0, 12);
      localStorage.setItem(`${LOCAL_STORAGE_ENTERED_MONTHS}_${cleanYear}`, JSON.stringify(validMonths));
      if (cleanYear === '2026') {
        localStorage.setItem(LOCAL_STORAGE_ENTERED_MONTHS, JSON.stringify(validMonths));
      }
    } catch {
      // ignore storage error
    }
  }

  const rawRows: RawDataRow[] = [];
  const filteredEntries = entries.filter(
    (d) => (d.year || '2026').trim() === cleanYear
  );

  filteredEntries.forEach((docData) => {
    const kec = docData.kecamatan?.toUpperCase().trim();
    const bulan = docData.bulan?.trim();
    if (!kec || !bulan || !KECAMATAN_LIST.includes(kec) || !MONTHS.includes(bulan)) {
      return;
    }

    const methodMap: Record<ContraceptiveMethod, { lalu: number; ini: number }> = {
      MOW: { lalu: clampMetric(docData.MOW_lalu), ini: clampMetric(docData.MOW_ini) },
      MOP: { lalu: clampMetric(docData.MOP_lalu), ini: clampMetric(docData.MOP_ini) },
      IUD: { lalu: clampMetric(docData.IUD_lalu), ini: clampMetric(docData.IUD_ini) },
      IMPLAN: { lalu: clampMetric(docData.IMPLAN_lalu), ini: clampMetric(docData.IMPLAN_ini) },
      SUNTIK: { lalu: clampMetric(docData.SUNTIK_lalu), ini: clampMetric(docData.SUNTIK_ini) },
      PIL: { lalu: clampMetric(docData.PIL_lalu), ini: clampMetric(docData.PIL_ini) },
      KONDOM: { lalu: clampMetric(docData.KONDOM_lalu), ini: clampMetric(docData.KONDOM_ini) },
    };

    let hasActiveValue = false;
    METHOD_KEYS.forEach((method) => {
      const { lalu, ini } = methodMap[method];
      if (ini > 0 || lalu > 0) {
        hasActiveValue = true;
      }
      const ppm = getOfficialPpm(kec, method, customTargets);
      const jumlah = lalu + ini;
      const percentage = ppm > 0 ? (jumlah / ppm) * 100 : 0;
      const sisa = ppm - jumlah;
      rawRows.push([kec, ppm, lalu, ini, jumlah, percentage, sisa, method, bulan, cleanYear]);
    });

    if (hasActiveValue && (!enteredMonthsFromMeta || enteredMonthsFromMeta.length === 0)) {
      markMonthAsEntered(bulan, cleanYear);
    }
  });

  return syncDataWithOfficialPpm(rawRows, customTargets, cleanYear);
}

/**
 * Simpan perubahan Kecamatan & Bulan (beserta bulan berikutnya yang terdampak cascade) secara real-time ke Firestore
 */
export async function syncKecamatanMonthToFirebase(
  updatedData: RawDataRow[],
  kecamatan: string,
  bulan: string,
  updatedBy = 'ADMIN',
  year = '2026'
): Promise<void> {
  const cleanKec = kecamatan.toUpperCase().trim();
  if (!KECAMATAN_LIST.includes(cleanKec) || !MONTHS.includes(bulan)) return;
  const cleanYear = (year || updatedData?.[0]?.[9] || '2026').toString().trim();

  const enteredMonths = getEnteredMonths(updatedData, cleanYear)
    .filter((m) => MONTHS.includes(m))
    .slice(0, 12);

  const monthIndex = MONTHS.indexOf(bulan);
  const monthsToSync = new Set<string>([bulan]);

  if (monthIndex >= 0) {
    for (let i = monthIndex + 1; i < MONTHS.length; i++) {
      const nextM = MONTHS[i];
      if (enteredMonths.includes(nextM)) {
        monthsToSync.add(nextM);
      } else {
        break;
      }
    }
  }

  const batch = writeBatch(db);

  monthsToSync.forEach((m) => {
    const payload = buildDocPayloadForKecamatanMonth(updatedData, cleanKec, m, updatedBy, cleanYear);
    if (payload) {
      const docId = `${cleanKec}_${m}_${cleanYear}`;
      batch.set(doc(db, 'kb_entries', docId), payload);
    }
  });

  batch.set(doc(db, 'kb_meta', 'config'), {
    appId: APP_ID,
    activeYear: cleanYear,
    enteredMonths,
    updatedBy: sanitizeUpdatedBy(updatedBy),
    updatedAt: serverTimestamp(),
  }, { merge: true });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `kb_entries/${cleanKec}_${bulan}_${cleanYear}`);
  }
}

/**
 * Unggah dataset awal ke Firestore jika koleksi kb_entries di Firestore masih kosong namun ada data lokal
 */
export async function seedDatasetToFirebaseIfNeeded(
  localData: RawDataRow[],
  updatedBy = 'ADMIN',
  year = '2026'
): Promise<void> {
  if (!Array.isArray(localData) || localData.length === 0) return;
  const cleanYear = (year || localData?.[0]?.[9] || '2026').toString().trim();

  const enteredMonths = getEnteredMonths(localData, cleanYear)
    .filter((m) => MONTHS.includes(m))
    .slice(0, 12);

  if (enteredMonths.length === 0) return;

  const payloads: { docId: string; payload: Record<string, unknown> }[] = [];

  enteredMonths.forEach((bulan) => {
    KECAMATAN_LIST.forEach((kec) => {
      const payload = buildDocPayloadForKecamatanMonth(localData, kec, bulan, updatedBy, cleanYear);
      if (payload) {
        const hasAny = METHOD_KEYS.some(
          (m) => (Number(payload[`${m}_ini`]) || 0) > 0 || (Number(payload[`${m}_lalu`]) || 0) > 0
        );
        if (hasAny) {
          payloads.push({ docId: `${kec}_${bulan}_${cleanYear}`, payload });
        }
      }
    });
  });

  if (payloads.length === 0) return;

  try {
    const batch = writeBatch(db);
    payloads.slice(0, 450).forEach(({ docId, payload }) => {
      batch.set(doc(db, 'kb_entries', docId), payload);
    });
    batch.set(doc(db, 'kb_meta', 'config'), {
      appId: APP_ID,
      activeYear: cleanYear,
      enteredMonths,
      updatedBy: sanitizeUpdatedBy(updatedBy),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'kb_entries');
  }
}

/**
 * Hapus / kosongkan entri capaian tahun tertentu di Firestore secara real-time
 */
export async function clearAllEntriesInFirebase(
  updatedBy = 'ADMIN',
  year = '2026'
): Promise<void> {
  const cleanYear = (year || '2026').trim();
  const path = 'kb_entries';
  try {
    const q = query(collection(db, path), where('appId', '==', APP_ID));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const docYear = (data.year || '2026').toString().trim();
      if (docYear === cleanYear) {
        batch.delete(docSnap.ref);
      }
    });
    batch.set(doc(db, 'kb_meta', 'config'), {
      appId: APP_ID,
      activeYear: cleanYear,
      enteredMonths: [],
      updatedBy: sanitizeUpdatedBy(updatedBy),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Simpan perubahan kata sandi akun resmi Kecamatan / Admin ke Firestore secara real-time
 */
export async function syncPasswordToFirebase(
  username: string,
  customPassword: string
): Promise<void> {
  const normUser = username.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 32);
  if (!normUser || customPassword.length < 4 || customPassword.length > 64) return;

  const path = `kb_accounts/${normUser}`;
  try {
    await setDoc(doc(db, 'kb_accounts', normUser), {
      appId: APP_ID,
      username: normUser,
      customPassword,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Simpan target PPM tahunan resmi ke Firestore secara real-time
 */
export async function savePpmTargetsToFirebase(
  year: string,
  targets: PpmTargetMap,
  updatedBy = 'ADMIN'
): Promise<void> {
  const cleanYear = (year || '2026').trim().slice(0, 4);
  if (!cleanYear.match(/^[0-9]{4}$/)) return;

  const docId = `targets_${cleanYear}`;
  const path = `kb_ppm_targets/${docId}`;
  const payload = {
    appId: APP_ID,
    year: cleanYear,
    targets,
    updatedBy: sanitizeUpdatedBy(updatedBy),
    updatedAt: serverTimestamp(),
  };

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'kb_ppm_targets', docId), payload);
    batch.set(doc(db, 'kb_meta', 'config'), {
      appId: APP_ID,
      activeYear: cleanYear,
      enteredMonths: getEnteredMonths(),
      updatedBy: sanitizeUpdatedBy(updatedBy),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    await batch.commit();

    try {
      localStorage.setItem(`laporan_kb_ppm_targets_${cleanYear}`, JSON.stringify(targets));
      localStorage.setItem('laporan_kb_active_ppm_year', cleanYear);
    } catch {}

    setActivePpmTargets(targets, cleanYear);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Berlangganan (subscribe) perubahan data capaian KB dan Target PPM secara real-time dari Cloud Firestore
 */
export function subscribeToRealtimeKbData(
  onDataChange: (syncedDataset: RawDataRow[], lastUpdatedBy?: string, activeYear?: string) => void,
  onSyncStatusChange?: (isConnected: boolean) => void,
  initialLocalData?: RawDataRow[],
  onPpmTargetsLoaded?: (targets: PpmTargetMap, year: string, availableYears: string[]) => void,
  onEntriesLoaded?: (entries: FirestoreKbEntryDoc[], allYears: string[]) => void
): Unsubscribe {
  let latestEntries: FirestoreKbEntryDoc[] = [];
  let latestEnteredMonths: string[] | undefined = undefined;
  let latestActiveYear = '2026';
  let latestPpmTargets: PpmTargetMap = { ...RAW_PPM_DATA };
  let yearMap = new Map<string, PpmTargetMap>();
  let hasSeededInitial = false;
  let metaLoaded = false;
  let entriesLoaded = false;

  const getAvailableYears = () => {
    const yrSet = new Set<string>(yearMap.keys());
    latestEntries.forEach((e) => {
      if (e.year && e.year.match(/^[0-9]{4}$/)) {
        yrSet.add(e.year);
      }
    });
    yrSet.add('2026');
    return Array.from(yrSet).sort().reverse();
  };

  const recomputeAndNotify = (lastUpdatedBy?: string) => {
    if (!entriesLoaded) return;

    const availableYears = getAvailableYears();
    onEntriesLoaded?.(latestEntries, availableYears);

    const yearEntries = latestEntries.filter((e) => (e.year || '2026').trim() === latestActiveYear);

    if (yearEntries.length === 0 && (!latestEnteredMonths || latestEnteredMonths.length === 0)) {
      if (!hasSeededInitial && initialLocalData && initialLocalData.length > 0 && latestActiveYear === '2026') {
        const localEntered = getEnteredMonths(initialLocalData, latestActiveYear);
        if (localEntered.length > 0) {
          hasSeededInitial = true;
          seedDatasetToFirebaseIfNeeded(initialLocalData, 'ADMIN', latestActiveYear).catch(() => {});
          return;
        }
      }
      resetEnteredMonths(latestActiveYear);
      const emptyMaster = convertFirestoreEntriesToDataset([], [], latestPpmTargets, latestActiveYear);
      saveLocalEntriesToStorage(emptyMaster, latestActiveYear);
      onDataChange(emptyMaster, lastUpdatedBy, latestActiveYear);
      return;
    }

    const synced = convertFirestoreEntriesToDataset(latestEntries, latestEnteredMonths, latestPpmTargets, latestActiveYear);
    saveLocalEntriesToStorage(synced, latestActiveYear);
    onDataChange(synced, lastUpdatedBy, latestActiveYear);
  };

  const metaRef = doc(db, 'kb_meta', 'config');
  const unsubMeta = onSnapshot(
    metaRef,
    (docSnap) => {
      metaLoaded = true;
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (Array.isArray(data.enteredMonths)) {
          latestEnteredMonths = data.enteredMonths.filter((m: unknown) => typeof m === 'string');
        }
        if (typeof data.activeYear === 'string' && data.activeYear.match(/^[0-9]{4}$/)) {
          latestActiveYear = data.activeYear;
          if (yearMap.has(latestActiveYear)) {
            latestPpmTargets = yearMap.get(latestActiveYear)!;
            setActivePpmTargets(latestPpmTargets, latestActiveYear);
            const availableYears = Array.from(yearMap.keys()).sort().reverse();
            if (!availableYears.includes('2026')) availableYears.unshift('2026');
            onPpmTargetsLoaded?.(latestPpmTargets, latestActiveYear, availableYears);
          }
        }
        recomputeAndNotify(typeof data.updatedBy === 'string' ? data.updatedBy : undefined);
      } else if (entriesLoaded) {
        recomputeAndNotify();
      }
    },
    (error) => {
      onSyncStatusChange?.(false);
      handleFirestoreError(error, OperationType.GET, 'kb_meta/config');
    }
  );

  const targetsQuery = query(collection(db, 'kb_ppm_targets'), where('appId', '==', APP_ID));
  const unsubTargets = onSnapshot(
    targetsQuery,
    (querySnap) => {
      yearMap = new Map<string, PpmTargetMap>();
      querySnap.docs.forEach((d) => {
        const docData = d.data() as { year?: string; targets?: PpmTargetMap };
        if (docData.year && docData.targets) {
          yearMap.set(docData.year, docData.targets);
        }
      });

      const availableYears = Array.from(yearMap.keys()).sort().reverse();
      if (!availableYears.includes('2026')) {
        availableYears.unshift('2026');
      }

      const activeTargets = yearMap.get(latestActiveYear) || RAW_PPM_DATA;
      latestPpmTargets = activeTargets;
      setActivePpmTargets(activeTargets, latestActiveYear);
      onPpmTargetsLoaded?.(activeTargets, latestActiveYear, availableYears);

      if (entriesLoaded) {
        recomputeAndNotify();
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'kb_ppm_targets');
    }
  );

  const entriesQuery = query(collection(db, 'kb_entries'), where('appId', '==', APP_ID));
  const unsubEntries = onSnapshot(
    entriesQuery,
    (querySnap) => {
      entriesLoaded = true;
      onSyncStatusChange?.(true);
      latestEntries = querySnap.docs.map((d) => d.data() as FirestoreKbEntryDoc);
      if (metaLoaded || querySnap.docs.length > 0) {
        recomputeAndNotify();
      }
    },
    (error) => {
      onSyncStatusChange?.(false);
      handleFirestoreError(error, OperationType.LIST, 'kb_entries');
    }
  );

  const accountsQuery = query(collection(db, 'kb_accounts'), where('appId', '==', APP_ID));
  const unsubAccounts = onSnapshot(
    accountsQuery,
    (querySnap) => {
      try {
        const raw = localStorage.getItem('laporan_kb_custom_passwords');
        const currentMap: Record<string, string> = raw ? JSON.parse(raw) : {};
        let changed = false;
        querySnap.docs.forEach((d) => {
          const acc = d.data();
          if (
            typeof acc.username === 'string' &&
            typeof acc.customPassword === 'string' &&
            currentMap[acc.username] !== acc.customPassword
          ) {
            currentMap[acc.username] = acc.customPassword;
            changed = true;
          }
        });
        if (changed) {
          localStorage.setItem('laporan_kb_custom_passwords', JSON.stringify(currentMap));
        }
      } catch {
        // ignore localStorage error
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'kb_accounts');
    }
  );

  return () => {
    unsubMeta();
    unsubTargets();
    unsubEntries();
    unsubAccounts();
  };
}

/**
 * Mendapatkan dataset terstruktur untuk tahun tertentu dari kumpulan dokumen Firestore
 */
export function getDatasetForYearFromEntries(
  entries: FirestoreKbEntryDoc[],
  year: string,
  targets: PpmTargetMap,
  enteredMonths?: string[]
): RawDataRow[] {
  return convertFirestoreEntriesToDataset(entries, enteredMonths, targets, year);
}

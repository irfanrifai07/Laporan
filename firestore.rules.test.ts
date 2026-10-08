/**
 * Security Rules Verification Suite for Dirty Dozen Payloads
 * Verifies that all 12 adversarial payloads described in security_spec.md
 * are rejected with PERMISSION_DENIED by the Firestore Security Rules.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  collectionPath: string;
  docId: string;
  operation: 'create' | 'update' | 'get' | 'list';
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TEST_CASES: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on kb_entries',
    collectionPath: 'kb_entries',
    docId: 'NGRAHO_Februari',
    operation: 'create',
    payload: {
      appId: 'bojonegoro-kb-v1',
      kecamatan: 'NGRAHO',
      bulan: 'Februari',
      MOW_lalu: 0, MOW_ini: 1,
      MOP_lalu: 0, MOP_ini: 0,
      IUD_lalu: 0, IUD_ini: 2,
      IMPLAN_lalu: 0, IMPLAN_ini: 3,
      SUNTIK_lalu: 0, SUNTIK_ini: 10,
      PIL_lalu: 0, PIL_ini: 5,
      KONDOM_lalu: 0, KONDOM_ini: 2,
      updatedBy: 'NGRAHO',
      isAdmin: true
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 2,
    name: 'ID Poisoning on kb_entries',
    collectionPath: 'kb_entries',
    docId: 'INVALID$ID#WITH!SPECIAL*CHARS',
    operation: 'create',
    payload: {},
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 3,
    name: 'Composite ID Mismatch',
    collectionPath: 'kb_entries',
    docId: 'NGRAHO_Februari',
    operation: 'create',
    payload: {
      appId: 'bojonegoro-kb-v1',
      kecamatan: 'BOJONEGORO',
      bulan: 'Februari'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 4,
    name: 'Negative Achievement Value',
    collectionPath: 'kb_entries',
    docId: 'NGRAHO_Februari',
    operation: 'create',
    payload: {
      appId: 'bojonegoro-kb-v1',
      kecamatan: 'NGRAHO',
      bulan: 'Februari',
      IUD_ini: -50
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 5,
    name: 'Type Poisoning on Numeric Field',
    collectionPath: 'kb_entries',
    docId: 'NGRAHO_Februari',
    operation: 'update',
    payload: {
      SUNTIK_ini: '100'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 6,
    name: 'Client Forged Timestamp',
    collectionPath: 'kb_entries',
    docId: 'NGRAHO_Februari',
    operation: 'create',
    payload: {
      updatedAt: '2020-01-01T00:00:00Z'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 7,
    name: 'Immutable Field Mutation on Update',
    collectionPath: 'kb_entries',
    docId: 'NGRAHO_Februari',
    operation: 'update',
    payload: {
      kecamatan: 'DANDER'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 8,
    name: 'Unbounded Array Attack on kb_meta',
    collectionPath: 'kb_meta',
    docId: 'config',
    operation: 'update',
    payload: {
      enteredMonths: new Array(50).fill('Januari')
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 9,
    name: 'Invalid Meta Document ID',
    collectionPath: 'kb_meta',
    docId: 'arbitrary_id',
    operation: 'create',
    payload: {
      appId: 'bojonegoro-kb-v1',
      enteredMonths: ['Februari'],
      updatedBy: 'ADMIN'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 10,
    name: 'Oversized String DoW Attack',
    collectionPath: 'kb_entries',
    docId: 'NGRAHO_Februari',
    operation: 'update',
    payload: {
      updatedBy: 'A'.repeat(10000)
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 11,
    name: 'Account Username Spoofing',
    collectionPath: 'kb_accounts',
    docId: 'NGRAHO',
    operation: 'create',
    payload: {
      appId: 'bojonegoro-kb-v1',
      username: 'ADMIN',
      customPassword: 'newpassword123'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 12,
    name: 'Weak Password on kb_accounts',
    collectionPath: 'kb_accounts',
    docId: 'NGRAHO',
    operation: 'update',
    payload: {
      customPassword: '12'
    },
    expectedResult: 'PERMISSION_DENIED'
  }
];

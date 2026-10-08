# Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Default-Deny Global Catch-All**: All unspecified paths in `/databases/{database}/documents/{document=**}` are strictly denied (`allow read, write: if false;`).
2. **Document ID Integrity (`isValidId`)**: Every single-document target path variable (`{entryId}`, `{metaId}`, `{accountId}`) must be a string with `size() <= 128` matching `^[a-zA-Z0-9_\-]+$`.
3. **Strict Key & Shadow Field Prevention**:
   - `/kb_entries/{entryId}` must contain ONLY the 19 required keys (`appId`, `kecamatan`, `bulan`, `MOW_lalu`, `MOW_ini`, `MOP_lalu`, `MOP_ini`, `IUD_lalu`, `IUD_ini`, `IMPLAN_lalu`, `IMPLAN_ini`, `SUNTIK_lalu`, `SUNTIK_ini`, `PIL_lalu`, `PIL_ini`, `KONDOM_lalu`, `KONDOM_ini`, `updatedBy`, `updatedAt`). Any ghost/shadow field is rejected.
   - `/kb_meta/{metaId}` must have `metaId == 'config'` and contain ONLY `['appId', 'enteredMonths', 'updatedBy', 'updatedAt']`.
   - `/kb_accounts/{accountId}` must have `accountId == incoming().username` and contain ONLY `['appId', 'username', 'customPassword', 'updatedAt']`.
4. **Composite Key Matching**: For `/kb_entries/{entryId}`, `entryId` must strictly equal `incoming().kecamatan + '_' + incoming().bulan`.
5. **Immutability on Updates**: During `update` on `/kb_entries/{entryId}`, `kecamatan`, `bulan`, and `appId` are immutable and `affectedKeys()` may only modify the numeric achievement fields, `updatedBy`, and `updatedAt`.
6. **Temporal Integrity**: `updatedAt` must strictly equal `request.time` (server timestamp) on every create and update.
7. **Bounded Lists & Numbers**: `enteredMonths` in `/kb_meta/config` must be a `list` with `size() <= 12`, and all achievement numbers must be `>= 0` and `<= 1000000`.
8. **Query Enforcer**: All `list` operations must evaluate `resource.data.appId == 'bojonegoro-kb-v1'`, preventing blanket reads.

## 2. The "Dirty Dozen" Payloads
1. **Payload 1 (Shadow Field Injection on `kb_entries`)**: Includes all 19 valid fields plus `"isAdmin": true`. Rejected by `hasOnly()`.
2. **Payload 2 (ID Poisoning on `kb_entries`)**: Document ID contains invalid characters or exceeds 128 chars. Rejected by `isValidId(entryId)`.
3. **Payload 3 (Composite ID Mismatch)**: Document path is `/kb_entries/NGRAHO_Februari` but payload has `kecamatan: "BOJONEGORO"`. Rejected by `entryId == incoming().kecamatan + '_' + incoming().bulan`.
4. **Payload 4 (Negative / Out-of-Bounds Achievement Value)**: Payload sets `IUD_ini: -50` or `10000000`. Rejected by `isValidMetric()`.
5. **Payload 5 (Type Poisoning on Numeric Field)**: Payload sets `SUNTIK_ini: "100"` (string instead of number). Rejected by `isValidKbEntry()`.
6. **Payload 6 (Client Forged Timestamp)**: Payload provides a past/future client timestamp instead of `request.time`. Rejected by `data.updatedAt == request.time`.
7. **Payload 7 (Immutable Field Mutation on Update)**: Update attempts to change `kecamatan` from `"NGRAHO"` to `"DANDER"`. Rejected by `affectedKeys().hasOnly(...)` and immutability gate.
8. **Payload 8 (Unbounded Array Attack on `kb_meta`)**: Payload sends `enteredMonths` with 50 items. Rejected by `data.enteredMonths.size() <= 12`.
9. **Payload 9 (Invalid Meta Document ID)**: Write to `/kb_meta/arbitrary_id` instead of `/kb_meta/config`. Rejected by `metaId == 'config'`.
10. **Payload 10 (Oversized String / DoW Attack)**: `updatedBy` is a 10,000-character string. Rejected by `data.updatedBy.size() <= 64`.
11. **Payload 11 (Account Username Spoofing)**: Write to `/kb_accounts/NGRAHO` with `username: "ADMIN"`. Rejected by `accountId == incoming().username`.
12. **Payload 12 (Weak/Oversized Password on `kb_accounts`)**: `customPassword` length < 4 or > 64. Rejected by `isValidKbAccount()`.

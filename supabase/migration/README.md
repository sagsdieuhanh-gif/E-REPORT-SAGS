# E-REPORT → Supabase · Firebase source copy/staging
**Status:** Backend copy staging is ready. Source Firebase is NOT CONNECTED, and NO LIVE DATA HAS BEEN IMPORTED.
Target is the *new, separate* Supabase project wggirxzdcfnxyjgjvpgh in Singapore. NEVER use the SAGS-RNS project.

The dedicated project has 8 operational empty tables and 2 new **PRIVATE** snapshot staging tables:
- e_report_migration_batches (snapshot identity and completeness)
- e_report_migration_entries (lossless JSON data, split into checksummed chunks)

Both staging tables have RLS enabled and intentionally **no browser/client policies**, so personal data cannot be read by staff through public APIs. The Supabase advisor INFO 'RLS Enabled No Policy' is intentional, not a misconfiguration. There is no deletion path and the import does not write to operational tables.

## Source backup limits
Existing E-REPORT Production AD CONTROL CENTER → 'TẢI BẢN SAO LƯU' produces E_REPORT_SAGS_BACKUP_V503 with exactly:
- RTDB: sags_live_v470, sags_live_v469
- Firestore: sags_handovers, users
This backup **DOES NOT** include Firebase Authentication, unknown Firestore collections/subcollections, Cloud Storage/external attachments, draft data not uploaded from devices. For true full migration, obtain an **authorized Firebase Admin SDK export** and object-store backup in addition to V503. Do not click 'XÓA SAU KHI SAO LƯU'.

## Safe validation & import
- The script is copy-only, defaults to dry run (no writes).
- It rejects incorrect schema or destination; checks source content SHA256; reassembles split JSON locally to prove losslessness.
- It can stage via a server-only legacy service_role JWT in environment variables, idempotently; tests every remote record checksum before setting VERIFIED. Never put server keys in client/browser or commit them.
- After receiving a V503 backup, review source count and checksum, then run staging import. Avoid entering project secrets into ChatGPT text.
- Staging is **NOT a translated operational application**: Auth users, role mappings, flight/roster/document relations and multi-user handover/claim logic must be migrated with independent reconciliation and acceptance tests.

Dry run with Node 22+: 
    node supabase/migration/import-v503.mjs ./E-REPORT-SAGS-BACKUP-xxxx.json
Staging import (trusted private server environment, never in browser): 
    SUPABASE_URL=https://wggirxzdcfnxyjgjvpgh.supabase.co/ SUPABASE_SERVICE_ROLE_KEY=<set-in-secret-manager> E_REPORT_ACK_SCOPE=STAGING_ONLY node supabase/migration/import-v503.mjs ./backup.json --apply
Staging import only if the origin has authorized access and source snapshot is validated; no removal/mutation of Firebase.

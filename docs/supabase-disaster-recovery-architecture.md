# E-REPORT-SAGS — Firebase primary / Supabase standby (draft implementation contract)

Status: **DESIGN + READINESS ASSESSMENT ONLY**. NOT a working failover. Do not enable in production until every release gate below passes.

Verified on 2026-11-17 (Asia/Ho_Chi_Minh):
- Firebase is the current production primary. The production frontend uses Firebase Auth, Realtime Database, and Firestore. Radio custody uses Firestore transactional device/event/photo collections.
- Connected Supabase project: **E-REPORT-SAGS-SUPABASE**, ref `wggirxzdcfnxyjgjvpgh`, Singapore region, restored from INACTIVE to ACTIVE_HEALTHY.
- Existing Supabase public tables: e_report_profiles, e_report_flights, e_report_assignments, e_report_documents, e_report_drafts, e_report_roster_imports, e_report_handoffs, e_report_audit_events, e_report_migration_batches, e_report_migration_entries.
- **All ten data tables currently have zero records; Supabase Auth has zero users and Storage has zero buckets.** These are baseline schemas, NOT a replica. The migration staging tables are denied to ordinary authenticated clients through RLS.
- No Supabase Edge Functions currently deployed. No verified scheduled or near-real-time replication.
- Supabase Free is not an always-on disaster recovery guarantee: it may pause after a week of insufficient activity; reliable standby needs continuous monitored activity and an appropriate paid availability plan if downtime guarantees are required.

## Non-negotiable invariants

1. **No surprise cutover**: Firebase remains primary; a Firebase timeout, iOS background suspension, Wi-Fi loss, CDN issue, or isolated permissions failure MUST NOT silently select another write leader.
2. **Independent standby identity**: Firebase-issued JWTs can be trusted by Supabase while Firebase is healthy, but Firebase-only login is not sufficient when Firebase Auth is down. Pre-provision separate Supabase Auth accounts for active employees with securely established account mapping. Password hashes cannot simply be copied from Firebase; use appropriate employee activation. Preserve established roles from server-owned records, not user-editable metadata.
3. **One global authoritative writer at a time**: switch only after a verified server-issued cutover generation/epoch and fencing lease, with admin authorization and explicit acceptable replication point; block competing primary/standby writes. A stale tab must never override a newer epoch.
4. **Preserve domain rules**: exactly one radio held per person; immutable photos, timestamps and signed events; no duplicate radio issue; roster reassignment preserves incomplete work; signatures and full-size evidence must be durably stored before completion; shift boundary 08:00–18:15 / 18:16–07:59 is only advisory. Defective radios stay usable as governed by the separately pending PR/rules rollout.
5. **No false success**: locally buffered drafts are pending and never labeled Firebase- or Supabase-confirmed until the designated backend acknowledges persistence.
6. **Privacy and security**: no Firebase Admin, Supabase service_role, database passwords or private keys in GitHub Pages JavaScript, config, service worker, source maps, or localStorage. Keep RLS on exposed tables. Use server-side code to replicate with least privileges and audit logs.
7. **No fabricated historical data**: mirror exact source values, timestamps, IDs, signatures and attachments. Never generate signed events, backfill unknown actors, or overwrite data with empty placeholder records.
8. **No destructive failback**: replay standby-only operations exactly once with stable operation IDs and monotonic versions; reconcile conflicts by domain rules, never blind last-write-wins for signed receipts or radio custody.

## Recommended architecture

```
E-REPORT-SAGS GitHub Pages
  ├── ACTIVE: Firebase Auth + RTDB + Firestore (canonical business writes)
  │     ├── persisted local drafts (LocalStorage + IndexedDB)
  │     └── server-side change journal + incremental snapshot/reconciliation worker
  ├── STANDBY: Supabase Auth + PostgreSQL + private Storage
  │     ├── durable mirrored RTDB data and immutable Firestore radio events
  │     ├── employee identity/role mapping and authorization (RLS)
  │     └── standby transaction APIs implementing same business invariants
  └── verified cutover lease / epoch + admin control plane
        ├── one write leader
        ├── clear mode, lag, snapshots and pending count visible to AD
        └── controlled reconciliation after Firebase recovery
```

The existing normalized Supabase flight/forms tables alone are NOT enough to reproduce all realtime RTDB roster assignment semantics. First preserve lossless source snapshots and incremental operation IDs; only then map normalized tables into the operational application.

### Delivery phases and gates

**A. Standby inventory & readiness (in progress)**
- Reuse existing Supabase project; never create another paid project without approval.
- Document source datasets: RTDB roster imports, flight workspace, form envelopes, inbox/assignments, user profiles, draft HLC records; Firestore radio devices/events/proofs and permissions.
- Inventory live collections and verify record counts/versions with authorized Firebase read access before migration; GitHub source files are NOT live data.
- Establish private Supabase Storage for binary evidence and a trusted sync worker, with no public bucket and no client secret key.

**B. Replication while Firebase healthy**
- Implement server-side initial backfill; verify counts/checksums before accepting standby as ready.
- Incrementally sync with idempotent `operation_id`, `source_key`, `source_revision`, timestamps, tombstones and immutable append-only events.
- Monitor replication lag and authorization failures continuously; surface last verified snapshot to Admin.
- Do not assume frontend dual-writes alone are a reliable backup. Use a trusted server with retry/outbox and periodic reconciliation.

**C. Independent standby authentication and API**
- Invite users into Supabase Auth; map immutable employee/account identifiers securely.
- Match role, form access and roster rules via Supabase RLS / transactional APIs, not Firebase SDK calls.
- Implement radio issuance/return as one atomic backend transaction, with a database uniqueness constraint and lock to prevent concurrent double claims.
- Use signed URL or authorized Storage downloads for PDF; no publicly accessible photographs.

**D. Controlled failover and failback**
- Distinguish Firebase Auth outage, RTDB outage, Firestore outage, local network outage, and total platform outage.
- Require verified standby identity, completeness, tested business APIs, acknowledged replication point, and server-controlled cutover epoch.
- During failover, append every Supabase-only operation to a durable journal, mark source and authoritative server time, and keep mobile drafts recoverable.
- On Firebase recovery, reconcile operation-by-operation (radio and signatures require special conflict policy); test a rollback before any production cutover.

**E. Real regression/cutover rehearsal**
- Firebase Auth disabled, RTDB unavailable, Firestore unavailable, partially broken connectivity, stale cached tabs, and iOS Safari reload.
- Parallel phone sessions receiving/returning the same radio; verify no double issuance and no orphaned timestamp/photo/signature.
- Roster coassignee handoffs, incomplete forms, draft recovery, per-carrier PDF forms, AD export with source-resolution image.
- Verify no duplicate events, no overwritten approvals, and no leaks of signed data to other employees.
- Measure and agree on Recovery Point Objective (data freshness) and Recovery Time Objective (allowed interruption) from actual tests, not estimates.

## Operational policy

Until A–E are implemented and verified:
- Site remains **FIREBASE PRIMARY ONLY**.
- Do not display `SUPABASE READY`, failover buttons, or automated switchover in production.
- If Firebase is temporarily unavailable, keep only explicitly pending mobile drafts. **Never claim a signed transaction completed** until an authoritative backend confirms.
- If Supabase Free pauses again, standby availability is zero until restoration. Consider Pro for business-critical hot standby; 2026 published base from USD 25/month, confirm current plan/prices before upgrade.
- No changes to the existing project billing plans or Firebase rules without explicit approval.

## Missing credentials/dependencies

- Authorized read-only Firebase Admin or supported connector access to read live RTDB/Firestore records, with appropriate secrets stored server-side.
- Trusted background replication runtime and Supabase server credentials configured in a secret manager, not checked into Git.
- Active employee onboarding to independent Supabase Auth, including account recovery and admin-controlled role mapping.
- Defined standby ownership, alarm thresholds, backup retention, RPO/RTO acceptance, cost envelope, and drill schedule.

Created as a reviewable foundation; no production switch or live data mirroring is implied.

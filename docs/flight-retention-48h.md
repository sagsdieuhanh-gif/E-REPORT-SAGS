# 48-hour retention for completed flights

This change is a deployment candidate, not proof that a live Firebase scheduler exists.

## Policy

- Door Close (42.3/42.1/TVJ) starts a per-flight 48-hour deadline. Sending FINAL, signing PVHK, pushback, the roster date and a list-clear action do not start that deadline.
- Repeated saves preserve the same deadline. Removing or changing Door Close before the purge is claimed cancels/restarts the countdown. Once a due purge is claimed, it is irreversible.
- Existing local flights without a completion timestamp receive a 48-hour grace period from the first new-policy observation. Do not infer a historical completion timestamp from the flight date.
- Server cleanup runs every 15 minutes: the normal deletion window is 48h–48h15m, subject to backlog, service availability and retries. It does not require an open browser.
- Local cleanup runs on reopen/online and every 15 minutes while the application runs. It requires a server-only `purged` receipt, and skips the active flight, focused inputs, offline queue, local drafts, pending IndexedDB rows and unverified local sheets. Offline data remains until this can be verified.
- Accounts, passwords, signatures in user profiles, preferences, other flights, global configuration and daily roster headers are preserved. Receipt metadata is retained to prevent obsolete offline clients resurrecting expired payloads; it contains no photos/form values.

## Firebase coverage

The worker discovers linked Firestore flight archives/chunks, FINALs, paper photos, comparison packages, clean/v3 crosschecks/mailboxes, PVHK closeouts and legacy ramp presence via exact date/flight/registration match keys and validated parent references. It does not delete unknown document kinds or same-number flights with a different date/aircraft.

For RTDB it deletes exact matching day-manifest items, roster sessions (including draft recovery), personal mailbox/revocation items, unshared workspaces/flight records, indexed ramp presence, closeout signals, modern/legacy FINAL signals, crosscheck state and linked personal crosscheck events. Shared workspace/flight-record nodes are retained if another unmatched assignment references them. Unknown legacy paths/global audit streams are not swept. Complete mapping of historical audit/legacy data requires a staging inventory before production activation.

Firestore and RTDB cannot commit atomically together. A server-only durable plan is recorded before deletion; `deleting` jobs retry the same paths after failure. Local clients accept `purged` only after both stages finish. Groups above 400 Firestore documents stop for review instead of deleting partially.

## Deploy and activate

1. Install the Firebase CLI and log into the authorized project. Confirm that its Firestore collection is `sags_handovers` and the database URL is the existing application database; do not create a new database. Functions use the deployment project's default Admin credentials/database.
2. In `firebase/functions`, run `npm ci --ignore-scripts`. The runtime is Node 22. A billing-enabled project and permission to deploy Functions/Cloud Scheduler are needed.
3. Merge `retention.indexes.json` into the project's existing index definitions; do not replace unrelated indexes. Add an RTDB `.indexOn` for `package/parentDocId` on `sags_live_v470/cross_mail/$user/events` in the existing rules. This repository does not contain the live RTDB rules, so no replacement rules file is supplied.
4. From `firebase`, deploy the codebase/rules to a staging project first:

   `firebase deploy --config retention.firebase.json --project PROJECT_ID --only functions:sags-retention,firestore:rules`

   Deploy the merged Firestore indexes through the project's normal index process. Keep `SAGS_RETENTION_DELETE_ENABLED=false` for the initial dry-run. The supplied rules grant active users read-only access to receipts; no browser can forge them.
5. Deploy the browser build, and verify an actual closed flight creates an archive lifecycle and a waiting receipt. Confirm reopen cancellation, exact matches for each airline/form, account ownership, attachment coverage and RTDB path plans with representative historical data. The browser/worker tests use simulators and are not a deployment/rules certification.
6. Enable `SAGS_RETENTION_DELETE_ENABLED=true` in the Functions parameter environment for this project and redeploy the functions only after that validation. Verify a due flight disappears from both databases and a second device cleans its verified local copy. Monitor `48h cleanup postponed` logs and waiting/deleting backlog.

Never change the old `FF_RETENTION_DAYS` to 2: that would expire FINALs relative to submission, including unfinished flights. The old submission/date-based cleanup entry points now delegate to the guarded completion policy.

## Local checks

`node tests/flight-retention48h.test.cjs` tests the deadline boundary, stable timestamps, reopen, exact identity, related documents, interrupted cross-database deletion/retry and local data guards. `node tests/draft-data-safety.test.cjs` tests the existing draft conflict/recovery protocol. `npm run release` runs generated assets, syntax, regression and release hash checks.

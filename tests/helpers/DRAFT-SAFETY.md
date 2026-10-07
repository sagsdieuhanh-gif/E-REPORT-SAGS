# Draft safety contract (V2.7)

Identity (`account`, `flightSessionId`, `rosterAssignmentId`, `field`, `part`, durable `key`) is captured synchronously at input. Pending writes use that identity, including after a flight change. Account changes suspend the old account queue; login to that account retries every pending flight. No localStorage or IndexedDB reset is performed. Legacy schema-2 entries keep their keys and atMs and are still retried.

Each field is ordered by `(version.atMs, version.counter, version.writer, deleted, value)`; legacy records use `(atMs, 0, '')`. atMs uses Firebase serverTimeOffset when available. The hybrid logical clock observes durable local/remote versions, increments when the clock rolls back, and persists a version-only watermark under `sagsDraftClockV27:`. writer is unique per page. Tombstones participate in the same ordering; no physical deletion of the cloud record occurs.

Transactions compare the candidate against the latest server value. Queued candidates are never rebased on a newer server record during transaction retries, so a stale candidate cannot become the winner just because it arrived later. Writes in one page serialize per key; RTDB transaction retries provide arbitration across tabs/devices. Reads and recovery use captured context plus an epoch guard, checked after async boundaries. A late acknowledgement only marks the exact version synced, never a later IDB edit.

This is a deterministic conflict order, not proof of actual chronological time between disconnected devices with unknown clock skew. Server offset corrects observed skew; simultaneous/offline conflicts have the documented tie-break. A client-only algorithm cannot recover unseen edit causality. Older deployed clients still using read/set can violate the new protocol; rollout and RTDB server rules require separate validation before production merge.

Behavioral tests use actual production module code, fake-indexeddb and an atomic RTDB simulator with delayed reads/transactions. They do not establish that deployed Firebase rules permit transactions or enforce account ownership. Run `node tests/draft-data-safety.test.cjs`.

Firebase contract references: https://firebase.google.com/docs/database/web/read-and-write#save_data_as_transactions and https://firebase.google.com/docs/database/web/offline-capabilities#clock_skew .

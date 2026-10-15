# V2.5.9: storage failure recovery

The supplied phone recording shows a draft write alert after reload, followed by a generic My Flight initialization failure when reopening completed KE467/KE468. Device storage and console logs are unavailable, so the recording alone does not establish a physical quota exhaustion or RAM problem.

Confirmed code defects corrected:

- A failed synchronous localStorage draft write used to bypass both IndexedDB and cloud protection. The wrapper now retains an account/flight-scoped in-memory recovery value, writes IndexedDB independently, and queues cloud protection for roster assignments. The synchronous result remains false: memory alone is not durable storage.
- Startup and resume restore matching IndexedDB records even while offline. Existing version ordering, account/flight identity and tombstones prevent older or foreign drafts overwriting current input.
- Draft writes now verify localStorage read-back. A subsequent unrelated core save cannot clear an outstanding draft failure.
- A new local flight was advertised in the session list before its envelope write succeeded. The envelope is now written and verified first. Initialization preserves the actual exception; a quota error triggers one attempt using the existing old-signature compaction routine before retrying, instead of treating every storage failure as a roster-sync delay.

No bulk deletion, retention-policy change, Firebase schema migration, or billing change is included. If localStorage and IndexedDB both refuse writes, the app cannot guarantee durability. Opening a flight still requires enough localStorage for the existing legacy editor; compaction cannot resolve every kind of device quota exhaustion. Device validation remains necessary.

Validation: behavioral tests inject failed local writes and silent writes, exercise offline IndexedDB recovery/restart, cloud synchronization, account and flight isolation, later edits, deletion tombstones, and failed/retried flight initialization. Existing release suite also required.

Release verification: 94/94 regression files pass; syntax and 197 asset hashes pass. A separate Chromium fixture filled real localStorage to quota and verified real IndexedDB backup, reload recovery and flight isolation with all network requests intercepted. This is not a test on the reported iPhone or its production data.

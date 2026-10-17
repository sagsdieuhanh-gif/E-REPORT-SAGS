# V2.5.11: recover localStorage capacity without deleting flight data

The V2.5.10 screenshots show both a failed draft write and the quota-specific My Flight initialization error. V2.5.9 protected drafts in independent IDB/cloud layers but the legacy flight editor still required localStorage capacity. This release addresses that remaining write dependency; it does not increase device storage or change Firebase billing/retention.

## Storage contract

- An early, inline decoder and vendored LZ-String codec precede every legacy data read. The build embeds identical source in index.html and storage-recovery.html. This avoids an offline external-codec load race.
- Only an explicit allowlist of business envelopes, drafts and caches may be converted. Authentication storage, unknown keys and sessionStorage are not compressed. Logical keys and values remain byte-for-byte equivalent as JavaScript strings, including image/signature data URLs.
- A physical value starts with `~SAGS-LZ1~` followed by logical length, checksum and compressed UTF-16 payload. Encode/decode equality is checked before the atomic overwrite; the stored representation is read back after writing. Existing plain JSON remains readable. A damaged packed record is never replaced by a default/empty envelope.
- Initial conversion requires the release Service Worker to report exactly one same-origin app window, including uncontrolled old windows. Multiple windows block conversion. Existing packed records remain readable and writable while conversion is blocked.
- On quota failure, eligible large records are compacted and the write retried. Idle conversion yields between records; the decoded cache is limited to four values and one million characters. There is no blanket deletion and no copying of all envelopes into unbounded memory.
- The codec must remain in all future releases. Do not roll back to a pre-V2.5.11 shell after conversion: that shell cannot read the packed representation. To revert the scheme, first implement and verify decoding back into plain storage with adequate capacity.

## Recovery page

`storage-recovery.html` is a standalone same-origin path so a device blocked in My Flight can install/activate the verified new worker, close other E-REPORT windows, compact existing records, and test a 32 KiB write/read-back. It never clears localStorage or IndexedDB. A successful probe is not a guarantee of unlimited future space. If storage is disabled or remains exhausted, the page reports failure and retains the records.

The operator must use the browser/profile containing the affected data. Opening this page on another browser/device cannot repair the original browser's storage.

Pending failed draft writes retry after capacity recovery. An unrelated save badge no longer displays an unqualified success while the draft layer reports a write failure.

## Validation

- Behavioral tests cover Unicode, image/signature payload preservation, restart, another old window, session/auth isolation, full storage recovery, failed atomic writes and corrupted records.
- Chromium with genuinely full localStorage and pseudo-random photo payloads: compact, run the actual My Flight session-creation function through the actual V2.2.5/V2.2.6 legacy storage wrappers, and reload with exact old data retained.
- Standalone recovery page with the real release Service Worker and a local HTTP server: verifies cached release assets, blocks a second old window without converting its JSON, compacts after that window closes, verifies a new write, and offers return to the application. External network is intercepted; no production credentials or Firebase data used.
- The user's iPhone has not been directly inspected; WebKit-specific device validation remains necessary. Lossless compression cannot solve every device-level storage denial or indefinitely growing photo collection.

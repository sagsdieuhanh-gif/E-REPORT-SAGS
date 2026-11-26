# E-REPORT-SAGS — Development Rules

These rules apply to all modifications in this repository. The operational workflow must remain stable. Do not treat this document as implementation of any feature: changes to code, tests, and a verified deployment are separate actions.

## iOS radio handover photo rules — mandatory

### Business workflow and safety
- For every radio checkout (nhận bộ đàm) and return (trả bộ đàm), the user must capture a real camera photo; preserve the existing signature, audit history, user, device, and shift associations.
- Display the actual capture date and time on the photo, in Vietnam time (Asia/Ho_Chi_Minh). Store original capture timestamp, timezone information, and server receipt/upload time independently. Do not silently substitute upload time for capture time. Clearly indicate when device time is unverified.
- Never declare a handover complete unless its photo and signature have been persisted safely, or there is an explicitly designed, durable pending-sync state that cannot be mistaken for completed server submission.
- If an upload fails or the network drops, keep the captured photo and all entered/signature data safely available for retry. Do not force the employee to retake the photo needlessly.
- Radio devices reported defective remain available for use; aggregate defects in reports. Do not introduce quarantine/blocking unless explicitly requested.

### Image capture, rendering and processing
- Preserve true image sharpness, color, EXIF orientation, aspect ratio and sufficient detail to inspect radio condition. Avoid thumbnail / video-preview frames as the definitive saved file.
- On iOS Safari, verify HEIC/HEIF/JPEG capture compatibility, decoding, orientation and correct sRGB color conversion. Avoid accidental loss of color profile, canvas backing-resolution downscaling and double compression.
- Prefer the highest practical quality within upload/storage constraints. Apply **at most one** deliberate encode/compression pass to the selected final image.
- Proposed starting quality targets (tune based on real iOS testing, not fixed unconditional downgrades): longest edge 1600 px, JPEG quality ~0.85; if still too large use 1280 px/~0.80, then emergency fallback 1024 px/~0.70–0.75. Aim for <=2 MB per photo where feasible, without sacrificing readability. Never permanently force every iOS photo to a low resolution.
- Do not stretch the image or use CSS dimensions as the canvas's underlying pixel dimensions. Inspect the final saved image itself in history and PDF exports.
- Keep a photo-preview UI lightweight. Avoid storing large base64 images in Firestore or giant localStorage values.
- Use Firebase Storage for binary images when existing architecture allows it; keep durable file references and metadata in Firestore. Respect existing permissions and storage rules. Do not migrate historical data without a migration plan.

### Upload robustness and performance
- If the photo exceeds accepted upload limits, automatically apply the progressive fallbacks and retry. Show a concise actionable error only after retry alternatives are exhausted; never just block signature submission with an oversized-photo error.
- Handle iOS tab suspension/reload and low memory without losing draft form state. Use suitable durable local storage with explicit size limits and cleanup. Never silently drop an unsynced photo.
- Avoid data races, duplicate uploads, double submit and event handler regressions. Keep the system responsive on Android, iOS and desktop.

### Mandatory regression checks before deploying
1. iPhone Safari: take new checkout and return photos, sign, save and reopen history.
2. Confirm color, orientation, sharpness and legibility from the **stored image**, not only the camera preview.
3. Check large HEIC/JPEG images and upload-size fallback; no failure that prevents signing.
4. Simulate poor connectivity, reload and retry; no missing image, signature or handover data.
5. Verify timestamp in image, metadata and relevant shift/date; operational shift boundaries: morning 08:30–19:00 (inclusive), evening 19:01–08:29 next day. These are reminders/report windows only; shift rollover must never quarantine a radio or block flight work. Do not reintroduce old 04:00 split.
6. Export reports/PDF with photos enabled and disabled; verify image quality when included.
7. Smoke-test Android and desktop; do not degrade image quality for other platforms.
8. Run repository checks/tests/build if available; report results accurately, including tests not run.

### Change boundaries
- Before editing, locate existing camera/image compression/upload/storage/signature/report code and diagnose the real bottleneck. Make narrowly scoped fixes with test coverage, not a blanket rewrite.
- Do not alter the established roster, handover, form allocation, draft retention, branding/logo, navigation or user role logic as a side effect.
- No production deployment until code changes are verified. For each change, provide commit SHA, files changed, test evidence, deployed environment and rollback path.

## Version numbering from 2026-11-26: V1.0 onward
- Release displayed to operators/administrators resets to **V1.0** for the mandatory-update baseline published 2026-11-26. **This is a new visible numbering baseline only**, not a code rollback: never restore old Firebase databases, bypass security rules, delete Supabase originals, wipe photos, or undo established operational workflows as a result of the reset.
- For the next user-requested release AFTER the 2026-11-26 V1.0 baseline increase the public/display version **V1.1**, then **V1.2**, **V1.3**, etc. Every release is mandatory; no defer or bypass path may be added. Continue minor version steps unless the user explicitly requests another scheme. Do not retain the prior public **V2.2** sequence in new releases.
- Keep `version.json` `version` / `displayVersion` / unique `build`, `index.html` release metadata and `loginReleaseVersion`, `service-worker.js` BUILD/DISPLAY_VERSION/cache namespaces and `asset-manifest.json` version/build/hash inventory in sync. A version number change alone must not remove app data, existing server security, or stored drafts.
- On radio signature entry, an employee with no radio sees only unheld/issueable devices (READY, CHARGING or FAULT advisory, excluding LOST), an employee holding a radio sees only that machine; an ADMIN may explicitly opt into full inventory. This visibility rule is UI-only. Keep server-authoritative atomic custody and one-holder validation intact.
- On PC the radio view must use legible body, field labels and buttons; no horizontal overflow, overlapping modal controls, or hidden bottom sign action on Safari/mobile. Test the focused view and layout regressions before deploy.

## V1.5 - No manual finish or flight-closeout controls
- My Flight and flight forms do not require or expose manual **Hoàn Tất**, **Kết Thúc Chuyến**, or **Mở Lại Chuyến** actions. Employees may open another assigned flight without finishing the previous one; keep mandatory release checks, live roster assignment authorization, radio custody verification, and safe drafts.
- Do not delete or rewrite historical completion/closeout markers in Firebase. Preserve the existing co-assignee protection and handover snapshots, past form statuses, export/report compatibility and audit logs. Treat these fields as historical data rather than new required gates.
- FSAGS 208 must retain the separate **Gửi hồ sơ** publishing action. MH F27 must retain safe **Lưu nháp** and **Xuất PDF gốc**. The version-upgrade path must wait for safe draft persistence and pending sync, never for a retired manual completion button.
- When removing an obsolete feature, remove its DOM controls, event handlers, relevant styling, obsolete helpers and tests, update all canonical/generated runtime copies, and verify startup/mobile layout plus end-to-end smoke tests before deployment.

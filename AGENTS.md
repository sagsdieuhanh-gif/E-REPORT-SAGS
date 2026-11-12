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
5. Verify timestamp in image, metadata and relevant shift/date; schedule: morning 08:30–19:00, evening 19:01–08:29 next day. Do not reintroduce old 04:00 split.
6. Export reports/PDF with photos enabled and disabled; verify image quality when included.
7. Smoke-test Android and desktop; do not degrade image quality for other platforms.
8. Run repository checks/tests/build if available; report results accurately, including tests not run.

### Change boundaries
- Before editing, locate existing camera/image compression/upload/storage/signature/report code and diagnose the real bottleneck. Make narrowly scoped fixes with test coverage, not a blanket rewrite.
- Do not alter the established roster, handover, form allocation, draft retention, branding/logo, navigation or user role logic as a side effect.
- No production deployment until code changes are verified. For each change, provide commit SHA, files changed, test evidence, deployed environment and rollback path.

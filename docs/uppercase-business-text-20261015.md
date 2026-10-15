# V2.5.8 — Uniform uppercase business text and application wording

## Scope

User-entered business data, personal/display names, job titles, units and application-owned wording use uppercase. Published form artwork and original SVG wording retain their typography; entered values on those forms are normalized separately. Passwords, login identifiers, emails, resource URLs, internal record IDs, checkbox booleans, signature/image payloads and technical settings remain case-sensitive where needed.

The previous rule only handled native fields whose type was exactly `text`. Quick-entry text, PVHK free text, some FSAGS54/94 paths and recovered drafts could retain lowercase. Application labels and profile names also used mixed casing.

## Implementation

`business-text.v1.js` loads synchronously before the legacy entry engine. It normalizes input in capture phase before target handlers update their private draft maps, waits for IME composition to finish, and retains selection positions when Unicode uppercase expands a character. A focused, programmatically restored value dispatches input after normalization so consumers receive the same value. It adds no observer, timer or DOM scan per keystroke.

The actual `persist` and `draw` boundaries normalize known textual form fields, including older loaded state with no input event. Field keys, nested metadata and binary data are never recursively transformed. Registry aliases can overlap checkbox/text declarations; actual booleans remain booleans, and signature/image declarations always remain opaque.

Quick-entry, FS09, FSAGS54/94, TVJ, local draft read/write and IndexedDB/cloud draft writes share the same canonical values. Account/profile save and signature-sample name save also uppercase names. Application CSS uppercases UI wording while resetting original paper/SVG typography. Native alert/confirm/prompt messages are uppercased without changing prompt defaults, return values or entered credentials.

No bulk rewrite of historical Firebase documents is performed. Older business state is normalized when loaded for rendering or saved; old draft values are normalized during recovery. Server-side retention settings are outside this change.

## Validation

- Behavior tests exercise 947 textual fields across 10 registry forms, real canonical persist/draw boundaries, Vietnamese/Unicode text, IME completion, caret expansion, opaque data and native-dialog return values.
- An actual draft passes through the local adapter, IndexedDB and simulated Firebase transaction with its uppercase value and unchanged identity/flags.
- Playwright input tests exercise downstream input consumers, quick/native fields, restored input, IME, editable notes, credentials and original-paper typography offline.
- The shared browser audit checks UI text casing and contrast across 81 root areas / 87 template variants in dark and light themes: 11,324 desktop and 10,952 mobile-simulation measurements, zero detected failures.

Browser checks use offline fixtures, actual project CSS, quick-panel builders and native guide configuration. They are not physical-device Safari coverage or a live Firebase mutation test. Repeated state measurements are not distinct fields.

Run `npm run release` for the default suite and asset verification. Optional browser checks require Playwright and an available Chromium executable:

```sh
AUDIT_CHROME=/path/to/chrome node tools/test-business-text-browser.cjs
AUDIT_CHROME=/path/to/chrome AUDIT_UPPERCASE=1 AUDIT_LABEL=uppercase-desktop node tools/audit-ui-contrast-browser.cjs
AUDIT_CHROME=/path/to/chrome AUDIT_UPPERCASE=1 AUDIT_LABEL=uppercase-mobile AUDIT_WIDTH=390 node tools/audit-ui-contrast-browser.cjs
```

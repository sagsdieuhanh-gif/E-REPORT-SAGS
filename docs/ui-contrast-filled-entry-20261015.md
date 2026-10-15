# V2.5.7 — Filled entry contrast follow-up

## Reproduced defect

The native multiline editor uses a transparent textarea above `#entryPaperSheet.sags-ruled`. In dark UI, the sheet retained `--ui-surface-soft` (#1a2a33), while a separate editor rule forced Safari text fill to #17212b. Effective contrast was approximately 1.1:1. Static, empty-editor fixtures from the previous audit never installed the ruled guide and missed this layer.

## Change

Pair the native preview sheet's white background with dark textarea color, WebKit text fill and caret in both themes. Retain a transparent ruled textarea so dotted rules remain visible. Scope every override inside `#entry`; printed forms, SVG, PDF rendering and stored values are untouched. No observers or per-input runtime styling were added.

The existing paper-isolation regression now distinguishes this HTML editor preview from actual printed `.sheet`/SVG surfaces, and requires preview overrides to remain inside the native editor.

## Browser verification

`tools/audit-ui-contrast-browser.cjs` loads project CSS and extracted dialog templates offline with all network requests blocked. It runs actual quick-time panel builders and the real `sagsV6113ConfigureEntry` function with a five-row guide fixture. Native textarea text is inserted through Playwright keyboard input. It covers single-line, ruled and asynchronous-guide variants; the last guide is deliberately resolved while the textarea is focused and contains text.

The wider checks enumerate 81 root areas / 87 template variants in both themes. They inspect initial, populated, individually focused, readonly, disabled and restored-control states. “Restored” here means the original control flags are restored with values retained; it is not a Firebase or autosave recovery test.

| Viewport | Text/control contrast measurements | Failures |
|---|---:|---:|
| Desktop 1200 × 900 | 11,324 | 0 |
| Mobile simulation 390 × 900 | 10,952 | 0 |

These counts include repeated measurements across states. This is fixture-based Chromium coverage, not proof that every possible live record or physical Safari device was exercised. Gradient checks use the first gradient stop; SVG and printed form fields are deliberately excluded. Native browser autofill is styled by the existing paired variables but actual OS autofill was not automated.

Reproduce with Playwright installed (or `CODEX_PRIMARY_RUNTIME_NODE_MODULES` pointing to its module directory), and `AUDIT_CHROME` pointing to a Chromium/headless-shell executable if not using Playwright's installed browser:

```sh
AUDIT_LABEL=desktop node tools/audit-ui-contrast-browser.cjs
AUDIT_LABEL=mobile AUDIT_WIDTH=390 node tools/audit-ui-contrast-browser.cjs
AUDIT_BASE_REF=86ecb27 AUDIT_ROOT=entry AUDIT_LABEL=before node tools/audit-ui-contrast-browser.cjs
```

The last command intentionally fails against the previous theme module. JSON reports and screenshots are written under `/tmp`; any detected contrast issue exits nonzero. Browser checks are explicit, separate from the dependency-light default regression suite.

# E-REPORT SAGS V6.4.104 — Performance & redundancy audit

## Scope
Audit repository runtime/deploy payload after V6.4.103, with priority on mobile/PC startup, render cost and provably redundant files.

## Safe cleanup applied
- Removed the generated `previews/final-ui/` snapshot tree. It duplicated live application/assets and had no runtime/workflow references.
- Consolidated four tiny CSS patch files into `app/styles/new-ui-v1.css`, removing four stylesheet requests:
  - `boot-19-v502RosterDirectStyle.css`
  - `boot-20-v503hf1AdControlResetStyle.css`
  - `boot-21-legacy.css`
  - `boot-22-sags-v611-update-alert-style.css`
- Added `previews/final-ui/` to `.gitignore` so generated snapshots do not return.

### Repository reduction
- Before: **548 files / 45,932,564 bytes**
- Removed from deploy tree: **297 files / 23,633,463 bytes** (293 duplicated preview files + 4 consolidated micro-CSS files)
- Repository payload reduction from those deletions: **~51.5% of repository bytes**

## Runtime optimizations applied
- Mobile operational metrics now remain in one 3-column row from 360–767px.
- Flight table rendering uses a revision/signature key so resize events do not rebuild identical table HTML.
- Airline identity decoration is debounced and only retries when cards are still missing branding.
- Long off-screen flight/user/roster cards use `content-visibility:auto` where supported.
- Firebase SDK host receives `preconnect` + DNS prefetch.
- Lazy AI loader now derives its cache-busting version from the current release meta instead of a stale V6.4.101 constant.
- Service-worker bootstrap no longer verifies/downloads the four deleted micro CSS assets.

## Files reviewed but intentionally retained
- `app/core/app.v503.js` and `app/core/runtime.v503hf2.bundle.js`: not loaded by the live page, but retained because the roster/business regression suite reads these canonical sources directly. Removing them broke CI, so they are **not** redundant until those tests are migrated to generated runtime modules.

## Intentional duplicates retained
- `data/form-configuration.json` and root `form-configuration.json`: currently identical but retained as a compatibility fallback used by legacy/new loaders.
- `assets/airlines/AK.png` and `FD.png`: same binary artwork is retained under two airline codes so mapping remains direct and offline-safe.

## Large files retained deliberately
The largest remaining files are form backgrounds/templates (`forms/`, `pdf-bg/`) and the mutable form registry. These are business assets, not duplicate build artifacts. Removing or recompressing them without a form-by-form visual regression pass could change WYSIWYG/PDF output.

The largest JavaScript remaining is legacy/core business logic. It is still referenced by the live shell, so this audit does not delete it. Further reduction should be done as a separate refactor by extracting/lazy-loading role/form-specific code with regression coverage rather than deleting by size alone.

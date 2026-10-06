# V6.4.106 — MY FLIGHT stability & performance audit

## Fixed
- MY FLIGHT card list no longer rewrites identical HTML. `applyListMarkup()` skips DOM replacement when markup is unchanged.
- Employee MY FLIGHT no longer renders the all-flight list and then replaces it 80–100 ms later. It now opens a lightweight shell and renders the personal queue directly.
- Realtime mailbox startup no longer treats Firebase's initial `child_added` replay as fresh work; existing keys are primed and ignored.
- Realtime refresh prefers the stable refresh path instead of reopening the workspace.
- The whole-document literal-newline cleanup observer is debounced (140 ms) instead of performing a full body TreeWalker on every DOM insertion.
- Form overview uses a single horizontal chip rail with local horizontal scrolling.

## Repository audit
- 255 tracked files, ~22.33 MB.
- No `previews/final-ui/` snapshot files remain.
- Service-worker bootstrap: 99 entries, no missing targets.
- Asset manifest: no stale paths.
- Only two intentional duplicate binary/content groups remain:
  - `data/form-configuration.json` + `form-configuration.json` (legacy/new loader compatibility fallback).
  - `assets/airlines/AK.png` + `assets/airlines/FD.png` (same artwork under two carrier codes for direct offline mapping).

## Remaining technical debt not deleted automatically
Several generated runtime/core files remain large and contain legacy patches/observers. They are still referenced by the live shell or regression suite. Removing or splitting them requires a separate module-migration pass with role/form-by-form regression tests; deleting by file size alone would be unsafe.

# V2.7 release process

Run `npm ci`, then **`npm run release`**. This single command normalizes release text to the Git LF contract, builds canonical JS, builds CSS, generates the final SHA-256/byte manifest, checks syntax, runs every regression (including staging/lifecycle tests), and re-verifies the final assets. A failed stage returns a nonzero exit code; only the complete sequence prints RELEASE READY. This indicates local release checks, not production approval.

The audit baseline had source/generated drift: monolith compilation dropped the deployed My Flight/parallel-read/update-guard fixes. `app/core/phases/core-*.js` are now the canonical seven phase sources, promoted byte-for-byte from baseline deployed generated output. `app/core/runtime.v503hf2.bundle.js` retains the five deployed chunks with explicit source separators. Boot groups are built from canonical app/boot sources promoted from deployed groups. Runtime order and contents are preserved. `app/core/app.v503.js` remains an archived monolith, not a build input. Do not edit it to change runtime behavior.

Never edit app/generated directly. `node tools/build-runtime.cjs --check` verifies canonical JS/output equality. CSS sources/groups remain unchanged. JS/CSS builders do not calculate release hashes; tools/release-manifest.cjs hashes only final asset bytes, in stable order. `npm run verify:release` is a read-only byte verification and fails on any mismatch. Mutable metadata is explicitly listed in manifest.mutableAssets; it remains part of the packaged manifest verification but is not pinned in executable bootstrap. Existing SW network metadata behavior is retained.

The PR/workflow-dispatch CI gate also checks that rebuilding leaves no tracked diff. No deploy, promotion, cache reset or Firebase production mutation is part of these commands. Vercel hosting settings are unchanged. Run the release gate before requesting approval to merge/deploy.

Remaining production prerequisites: Firebase transaction/read rules under roster_sessions, old read/set clients during rollout, real-browser/phone workflow and update QA. Node simulations cannot certify those.

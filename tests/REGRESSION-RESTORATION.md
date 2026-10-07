# Regression restoration

Baseline audit: 39/65 pass, 26 fail. A=production bug; B=stale test; C=broken harness; D=obsolete release assertion; E=unstable fixture. Every baseline failure is listed below; no failing test file was deleted.

| Test | Category | Resolution |
|---|---|---|
| airline-dashboard-ad-contrast.test.cjs | A | Overescaped hostname dots prevented the existing GitHub canonical redirect; corrected regex, preserved preview/local isolation. |
| airline-form-policy.test.cjs | E | Mutable repository policy had aircraft/carrier restrictions; explicit valid test fixtures preserve business policy. |
| auth-cache-cutover.test.cjs | B | Old clients.claim expectation conflicts with pinned old-tab strategy; assert no claim and lifecycle coverage. |
| form-entry-contrast-rule.test.cjs | D | Build literal and script query now checked against manifest/current release. |
| form-load-performance.test.cjs | D | Old build literal replaced by release contract; parallel read/deferred migration assertions retained. |
| fsags208-configured-flow.test.cjs | B | Complete now publishes; local save/autosync tests use local save API, publish assertions retained. |
| fsags208-image-reader.test.cjs | B | OCR fallback uses combined quality<84/count<12, not historical quality<78. |
| fsags208-toolbar.test.cjs | B | Current single Complete/Send action replaces separate old Save/Send; editable/readonly/role behavior retained. |
| mobile-dock-final-2x2.test.cjs | B/D | Test canonical grid and functional owner, not old comments/DOM-order selectors. |
| mobile-dock-semantic-grid.test.cjs | B/D | v2 functional IDs own slots; v1 label class implementation is no longer loaded. |
| mobile-dock-tvj-identity.test.cjs | B/D | Current canonical two rows; TVJ name type/binding and grouping assertions retained. |
| mobile-dock-v26-canonical.test.cjs | D | Version equality comes from release manifest, canonical behavior assertions retained. |
| myflight-dossier.test.cjs | C/B | Missing dossierDocsHtml fixture dependency, then stale button wording; ownership/exact IDs/date/account race assertions retained. |
| myflight-reopen.test.cjs | C | Mock installFlightListObserver in isolated drawShell harness; repeated reopen checks retained. |
| pwa-staging.test.cjs | A | Asset checksum mismatch; final-byte generation after builds fixes staging. |
| quick-time-final-owner.test.cjs | D | Historical build literal replaced by release invariant; owner assertions retained. |
| quick-time-mobile-contrast.test.cjs | D | Historical build literal replaced by release invariant; contrast assertions retained. |
| release-assets.test.cjs | A | Final manifest corrected by generator; checksum every entry and phase-source parity retained. |
| repair-unregister-first.test.cjs | B | Existing retry policy uses 10 attempts, not 8; unregister-before-navigation contract retained. |
| stale-controller-detach.test.cjs | D | Date field format validated rather than historical 03/10/26 value. |
| startup-performance.test.cjs | D | Old runtime internal V6.4.89 marker is not release truth; HTML/version/query contract retained. |
| test-pages-no-production-redirect.test.cjs | B | Production candidate is not TEST reset page; explicit preview/local no-redirect behavior and no user-data reset tested. |
| ui-preferences.test.cjs | B | Accessible group toggle replaced static heading; persistence and collapsed-state contracts retained. |
| update-incomplete-work-guard.test.cjs | D | Old build literal replaced; completion/quick-entry update guard assertions retained. |
| v21-settings-center.test.cjs | C/D | Literal backslash-n syntax bug and double-escaped regex repaired; release query invariant replaces old build stamp. |
| v25-settings-pc-layout.test.cjs | D | Historical build literal replaced; desktop/mobile layout contracts retained. |

Additional V2.7 release-stamp failures in mobile visibility were updated to the same release invariant. During rebuilding, the old generator discarded deployed fixes and airline bootstrap assets; canonical source promotion and bootstrap preservation prevent that regression. New tests cover draft behavior (13 cases), runner aggregation, generated-source parity, manifest corruption and PWA lifecycle. Static UI checks remain contract tests, not browser layout certification.

The previous report appendix accidentally named required-auto-update instead of repair-unregister-first; this table uses the saved actual baseline test results.

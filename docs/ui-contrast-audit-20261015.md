# UI contrast audit · V2.5.6

The roster transfer section inherited pale text while its nested fields retained
white backgrounds. Other legacy dialogs mixed dark surfaces with light-theme
labels, or light surfaces with dark-theme labels. Safari text fill could also
differ from the declared text color.

## Changes

- Pair dialog backgrounds, cards, foregrounds, secondary text and buttons using
  shared dark/light surface tokens in `theme-contrast.v2.js`.
- Correct nested admin, Fleet, A/C Limits, roster, archive, assignment, AI,
  settings, export, signature-dialog and notification controls.
- Keep operational quick-entry headers, rows and controls consistently dark in
  either global theme. Set foreground, background, placeholder and WebKit text
  fill together.
- Correct warning/success/error pairs, selected buttons, disabled controls,
  nested creation cards and mobile admin headers.

This is a CSS correction. It adds no runtime DOM observer or background scan.
It does not modify printed-page coordinates, SVG/canvas content, form values,
storage, assignment permissions or submission logic.

## Verification

Chrome 155 rendered isolated fixtures from project HTML/templates and styles,
with sample assignments and populated quick-entry pages. Live backend actions
were not executed. Animations were disabled for stable measurements.

| Viewport | Themes | UI areas | Cases per theme | Text/control checks | Remaining failures |
|---|---|---:|---:|---:|---:|
| 1200 × 900 | Dark + light | 81 | 85 | 2,182 | 0 |
| 390 × 900 | Dark + light | 81 | 85 | 2,108 | 0 |

The checks cover visible text, controls, placeholders, effective inherited
backgrounds and WebKit text fill. Normal text uses a 4.5:1 threshold and large
text 3:1. Populated cases include My Flight, roster transfer rows and warnings,
quick-time arrival/departure/other pages, and all three PVHK quick-entry pages.
Roster screenshots were visually inspected before and after the correction.

`dialog-surface-contrast.test.cjs` additionally verifies 60 color pairs read from
the emitted correction CSS, including both dialog/settings themes.
`npm run release` passes all 90 regression files, syntax checks and 196 asset
hashes.

The fixture audit is not a certification of every possible live-data state.
Background images/gradients and physical Safari/iPhone rendering still require
device review; Chrome's computed WebKit properties were checked here.

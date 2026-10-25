'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const css=fs.readFileSync('app/styles/aviation-reference.v1.css','utf8'),html=fs.readFileSync('index.html','utf8'),js=fs.readFileSync('app/modules/theme-contrast.v2.js','utf8');
const block=css.slice(css.indexOf('/* V1.4 · Theme coverage audit: application CHROME only.'));
assert.ok(block.length>18000,'A V1.4 app-wide pair-coverage layer must exist');
assert.match(block,/@media screen/);
assert.match(block,/html\.new-ui-v1\.new-ui-v1\[data-ui-theme\]/);
for(const token of ['--et-shell','--et-card','--et-raised','--et-input','--et-fg','--et-sub','--et-muted','--et-edge','--et-link','--et-focus'])
 assert.ok(block.includes('var('+token+')'),'Missing theme token '+token);
const areas=[
 '#v157Drawer','#v157BottomBar','#sagsMobileFormDock','#v324FormActions','#v163OperationNav',
 '#v6494AviationHome','#opsHomeMetrics','#opsHomeFlights','#opsHomeQueue','#opsAirlineStrip',
 '#fwcModal','#sagsFlightDossierModal','#dailyRosterModal','#drManage',
 '#aclSimpleModal','#csgModal','#csgSearch','#v440Fm','#sagsSettingsCenter',
 '#v181AdminCenter','#v174DataHub','#fleetManagerModal','#accountManagerModal',
 '#v485FeaturePermissionModal','#sagsQuickEntry','#quickTimeModal','#fs09QuickModal',
 '#sags5494Quick','#sags5494FieldEditor','#appUpdateModal'
];
for(const area of areas)assert.ok(block.includes(area),'Theme coverage missing '+area);
assert.match(block,/#aclSimpleModal#aclSimpleModal/,'Compete with legacy double-ID A/C LIMITS styles');
assert.match(block,/body #dailyRosterModal :is\(/,'Daily roster forced-dark style must be countered');
assert.match(block,/-webkit-text-fill-color:var\(--et-fg\)!important/,'Safari text-fill contrast must follow palette');
assert.match(block,/color-scheme:inherit!important/,'Native date and select controls must follow selected mode');
for(const part of ['.sheet','.paper','#entryPaperSheet','canvas','svg','.hit']){
 const rule=/^[^*]*\b(?:background|color)\s*:/i;
 const rows=block.split('}');
 assert.ok(rows.every(x=>!x.includes(part)||!rule.test(x)),'Theme CSS must never recolor '+part);
}
assert.match(css,/url\('\.\.\/\.\.\/assets\/branding\/apron-night-v6494\.webp'\)/,'Original aviation hero image must remain');
assert.ok(!block.includes('.v6494Hero,.v6494Work'),'Do not blank the hero photo');
assert.ok(js.includes('#aclSimpleModal#aclSimpleModal'),'Coverage tests must guard the live legacy conflict');
assert.equal([...html.matchAll(/<link[^>]+rel="stylesheet"/g)].length,6,'No extra CSS network requests');
const manifest=JSON.parse(fs.readFileSync('asset-manifest.json'));
const bytes=fs.readFileSync('app/styles/aviation-reference.v1.css'),meta=manifest.assets['./app/styles/aviation-reference.v1.css'];
assert.equal(meta.bytes,bytes.length);
assert.equal(meta.sha256,crypto.createHash('sha256').update(bytes).digest('hex'));
console.log('V1.4 app-wide paired light/dark CSS coverage, paper exclusion and cache integrity verified');

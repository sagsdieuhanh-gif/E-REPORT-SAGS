const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const home=fs.readFileSync(path.join(root,'app/modules/aviation-reference.v1.js'),'utf8');
const css=fs.readFileSync(path.join(root,'app/styles/aviation-reference.v1.css'),'utf8');
const roster=fs.readFileSync(path.join(root,'app/modules/roster-lite.v5.js'),'utf8');
const daily=fs.readFileSync(path.join(root,'app/modules/daily-roster.v502.js'),'utf8');
const guide=JSON.parse(fs.readFileSync(path.join(root,'data/carrier-service-guide.json'),'utf8'));

assert.ok(Array.isArray(guide.carriers)&&guide.carriers.length>=20,'carrier service guide must remain the airline source');
assert.match(home,/\.\/data\/carrier-service-guide\.json/,'home must read Lưu ý phục vụ hãng source');
assert.doesNotMatch(home,/https:\/\/images\.kiwi\.com\/airlines\/64\//,'airline logos must not depend on an external CDN');
assert.match(home,/\.\/assets\/airlines\//,'airline logos must use local project assets');
assert.match(home,/<th>Hãng<\/th>/,'today table must include airline column');
assert.match(home,/opsAirlineStrip/,'home must render airline strip');
assert.match(home,/IntersectionObserver/,'airline strip should lazy-render cached local logos');
assert.match(css,/--ops-home-max:1380px/,'home must use one shared alignment width');
assert.match(css,/#opsAirlineStrip/,'airline strip must be styled');
assert.match(css,/\.opsAirlineCell/,'table airline logos must be styled');

assert.match(roster,/sagsV478GetAssignmentFast/,'server-live mailbox fast path must exist');
assert.match(daily,/sagsV478GetAssignmentFast\?\.\(aid,date\)/,'open path must reuse server-live assignment');
assert.match(daily,/readState\(aid,false\)/,'open path must reuse queue state cache');
assert.doesNotMatch(daily,/readState\(aid,true\),t=normalizedTask/,'open path must not force redundant claim-state read');

console.log('Home airline + receive-speed regression passed.');

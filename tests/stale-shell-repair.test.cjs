const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
assert.match(sw,/source','shell-not-ready'/,'missing-shell navigation must route to repair');
assert.match(sw,/Response\.redirect\(repair\.href,302\)/,'missing-shell navigation must redirect instead of 503');
assert.ok(!/APP SHELL NOT READY/.test(sw),'blank APP SHELL NOT READY response must be removed');
assert.match(sw,/fetchFresh\(path\).*__sags_release.*cache:'no-store'/,'release staging must fetch fresh bytes');
assert.match(sw,/url\.searchParams\.has\('__repair'\).*cache:'no-store'/,'recovery navigation must bypass the HTTP cache');
console.log('Stale shell auto-repair regression checks passed');

const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
const vc=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));
assert.match(sw,/source','shell-not-ready'/,'missing-shell navigation must route to repair');
assert.match(sw,/Response\.redirect\(repair\.href,302\)/,'missing-shell navigation must redirect instead of 503');
assert.ok(!/APP SHELL NOT READY/.test(sw),'blank APP SHELL NOT READY response must be removed');
for(const source of ['/','/index.html','/repair.html','/service-worker.js','/version.json','/asset-manifest.json']){
  const row=vc.headers.find(x=>x.source===source);
  assert.ok(row,'missing Vercel cache rule for '+source);
  const value=String(row.headers.find(x=>String(x.key).toLowerCase()==='cache-control')?.value||'');
  assert.match(value,/no-cache/,'missing no-cache for '+source);
}
console.log('Stale shell auto-repair regression checks passed');

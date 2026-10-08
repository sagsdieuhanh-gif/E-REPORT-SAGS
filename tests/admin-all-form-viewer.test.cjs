const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'app/modules/admin-all-form-viewer.v1.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const reg=JSON.parse(fs.readFileSync(path.join(root,'forms/forms.registry.json'),'utf8'));
assert.match(index,/admin-all-form-viewer\.v1\.js/,'viewer must load in production index');
assert.match(src,/role\(\)==='AD'\|\|role\(\)==='ADMIN'/,'viewer must be AD-only');
assert.match(src,/flight_records\//,'viewer must read flight assignments');
assert.match(src,/roster_sessions\//,'viewer must read shared assignment sessions');
assert.match(src,/completionEnvelope/,'viewer must support completed snapshots');
assert.match(src,/handoverEnvelope/,'viewer must support handover snapshots');
assert.match(src,/forms\/forms\.registry\.json/,'viewer must enumerate canonical forms registry');
assert.match(src,/sagsAdminOpenReadOnlyForm/,'viewer must expose read-only opener');
assert.doesNotMatch(src,/\.set\s*\(/,'read-only viewer must not write RTDB with set()');
assert.doesNotMatch(src,/\.update\s*\(/,'read-only viewer must not write RTDB with update()');
assert.doesNotMatch(src,/\.transaction\s*\(/,'read-only viewer must not write RTDB with transaction()');
for(const form of reg.forms){
  const id=String(form.id||''),group=String(form.group||''),code=String(form.code||'');
  assert.ok(id||group||code,'registry form identity missing');
}
assert.ok(reg.forms.length>=10,'expected all current registry forms');
console.log('AD all-form read-only viewer coverage passed: '+reg.forms.length+' registry forms.');

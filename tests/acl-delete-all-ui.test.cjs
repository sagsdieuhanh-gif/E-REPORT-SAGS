const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');const src=fs.readFileSync(path.join(root,'app/core/phases/core-tools.js'),'utf8');const compiled=fs.readFileSync(path.join(root,'app/generated/core-tools.js'),'utf8');
assert.equal(src,compiled,'Generated A/C LIMITS source must match canonical');
for(const snippet of ['id="aclSTabEdit"','id="aclSTabManage"','id="aclSManageView"','id="aclSEditView"','id="aclSDeleteAll"','window.aclSimpleDeleteAll=async function()','if(role()!=="AD")return alert("Chỉ tài khoản AD','XOA TAT CA','SIMPLE_DELETE_ALL_BACKUP','await db().collection(collectionName()).doc(backupDoc).set','await writeCatalog([],"SIMPLE_DELETE_ALL")','originalVersion','aclSimpleShowToday'])assert.ok(src.includes(snippet),'Missing bulk-delete/UI invariant: '+snippet);
assert.ok(src.indexOf('await db().collection(collectionName()).doc(backupDoc).set')<src.indexOf('await writeCatalog([],"SIMPLE_DELETE_ALL")'),'A backup must precede full deletion');
assert.ok(src.includes('await loadCatalog(!0);if((catalog.items||[]).length!==originalCount'),'Catalog must be reread after confirmation');
console.log('A/C LIMITS tabs, AD-only bulk delete, backup, and recheck verified');

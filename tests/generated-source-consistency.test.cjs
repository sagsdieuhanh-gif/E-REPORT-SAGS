const cp=require('child_process'),path=require('path'),assert=require('assert/strict');
const r=cp.spawnSync(process.execPath,[path.join(__dirname,'../tools/build-runtime.cjs'),'--check'],{encoding:'utf8'});assert.equal(r.status,0,r.stderr||String(r.error));console.log('Canonical sources reproduce deployed generated JS without dropping patches');

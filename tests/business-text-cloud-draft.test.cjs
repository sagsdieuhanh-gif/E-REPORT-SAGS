const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {server,client,settle}=require('./helpers/draft-harness.cjs');
(async()=>{
 const s=server(),a=client(s);vm.runInContext(fs.readFileSync('app/modules/business-text.v1.js','utf8'),a.c);
 a.c.SAGSBusinessText.register([{key:'name',type:'text'},{key:'flag',type:'check'}]);
 a.record('Nguyễn Trung Kiên','name');await settle();
 assert.equal(a.local.get('USER|A|name|quickTime').value,'NGUYỄN TRUNG KIÊN');
 assert.equal((await a.rows()).find(r=>r.field==='name').value,'NGUYỄN TRUNG KIÊN');
 await a.runTimers(1000);await a.flush();assert.ok(s.writes.some(w=>w.value?.value==='NGUYỄN TRUNG KIÊN'));
 a.record('true','flag');await settle();assert.equal((await a.rows()).find(r=>r.field==='flag').value,'true');
 assert.ok((await a.rows()).every(r=>r.flightSessionId==='A'&&r.account==='USER'),'normalization cannot modify draft identity');
 console.log('Uppercase draft survives local cache, IndexedDB and cloud write without altering flags or identity');
})().catch(e=>{console.error(e);process.exitCode=1});

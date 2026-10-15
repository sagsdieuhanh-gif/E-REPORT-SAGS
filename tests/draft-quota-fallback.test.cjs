const assert=require('node:assert/strict');
const {server,client,settle}=require('./helpers/draft-harness.cjs');
(async()=>{
 const s=server(),a=client(s,{failLocal:true});a.c.navigator.onLine=false;
 assert.equal(a.record('BẢN NHÁP KHI ĐẦY'),false,'never report localStorage success');
 await settle();assert.equal(a.read().value,'BẢN NHÁP KHI ĐẦY');
 assert.equal((await a.rows())[0].value,'BẢN NHÁP KHI ĐẦY');assert.equal(s.writes.length,0);
 const b=client(s,{db:a.db,writer:'restarted',failLocal:true});b.c.navigator.onLine=false;
 assert.equal(await b.c.sagsDraftV2RestoreLocal(),true);assert.equal(b.read().value,'BẢN NHÁP KHI ĐẦY','offline restart restores from IDB with full localStorage');
 b.setFlight('B');assert.equal(b.read(),null,'no cross-flight leakage');
 b.setFlight('A');b.setUser('OTHER');assert.equal(b.read(),null,'no cross-account leakage');
 a.c.navigator.onLine=true;await a.flush();assert.equal(s.writes[0].value.value,'BẢN NHÁP KHI ĐẦY');assert.equal(s.writes[0].value.deleted,false,'failed local write is not a tombstone');
 const c=client(s,{db:a.db,writer:'healthy'});await c.c.sagsDraftV2RestoreLocal();assert.equal(c.read().value,'BẢN NHÁP KHI ĐẦY');
 c.setClock(2000);c.record('MỚI HƠN');await settle();await c.c.sagsDraftV2RestoreLocal();assert.equal(c.read().value,'MỚI HƠN');
 c.forget();await settle();const d=client(s,{db:a.db,writer:'after-forget'});await d.c.sagsDraftV2RestoreLocal();assert.equal(d.read(),null,'deleted draft cannot reappear');
 console.log('Quota fallback: truthful failure, IDB durability, offline restart, cloud queue, isolation, new input and tombstone passed');
})().catch(e=>{console.error(e);process.exitCode=1});

'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');const {indexedDB}=require('fake-indexeddb');
let username='TEST_A',list=[{id:'F1',updatedAt:1},{id:'F2',updatedAt:1},{id:'F3',updatedAt:1}],reads=[],race=null;
const envs={F1:{state:{note:'ONE'}},F2:{state:{note:'TWO'}},F3:{state:{note:'THREE'}}},timers=new Map();let seq=0;
const c={indexedDB,document:{readyState:'loading',getElementById:()=>null,addEventListener(){}},console,addEventListener(){},__sagsGetSession:()=>({profile:{username}}),readFlightSessionList:()=>structuredClone(list),writeFlightSessionList:value=>{list=structuredClone(value)},readFlightSessionEnvelope:id=>{reads.push(id);if(race){const run=race;race=null;run()}return structuredClone(envs[id])},setTimeout:fn=>{timers.set(++seq,fn);return seq},clearTimeout:id=>timers.delete(id)};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync('app/modules/indexeddb-flight-store.v1.js','utf8'),c);
(async()=>{
 const api=c.sagsIndexedDbFlightStoreV1;await api.mirrorNow('initial');assert.deepEqual(reads,['F1','F2','F3']);assert(api.installShadowWriteHook());
 reads=[];envs.F2.state.note='NEW';c.writeFlightSessionList(list.map(x=>({...x,updatedAt:x.id==='F2'?2:x.updatedAt})));await api.mirrorNow('one-save');assert.deepEqual(reads,['F2'],'saving F2 does not parse photos from F1/F3');assert.equal((await api.getEnvelope('F2')).state.note,'NEW');assert.equal((await api.getEnvelope('F1')).state.note,'ONE');
 reads=[];c.writeFlightSessionList(list.map(x=>({...x,updatedAt:x.id==='F1'?3:x.updatedAt})));race=()=>{envs.F1.state.note='DURING MIRROR';c.writeFlightSessionList(list.map(x=>({...x,updatedAt:x.id==='F1'?4:x.updatedAt})))};await api.mirrorNow('first-pass');await api.mirrorNow('queued-pass');assert.deepEqual(reads,['F1','F1'],'save arriving during mirror receives a second pass');assert.equal((await api.getEnvelope('F1')).state.note,'DURING MIRROR');
 reads=[];const changing=api.mirrorCurrentLocalStorage(null,'TEST_A');username='TEST_B';const result=await changing;assert.equal(result.skipped,true);assert.deepEqual(reads,[],'account change prevents reading another account into old scope');assert.equal(await api.getEnvelope('F1'),null,'new account has no leaked envelope');
 username='TEST_A';assert.equal((await api.getEnvelope('F2')).state.note,'NEW');
 console.log('V2.5.33 IndexedDB: changed-flight-only mirror, queued save follow-up, retained other flights and account-switch isolation passed');
})().catch(e=>{console.error(e);process.exitCode=1});

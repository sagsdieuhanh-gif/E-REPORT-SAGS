'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),src=fs.readFileSync(path.join(root,'app/modules/form-edit-history.v1.js'),'utf8');
assert.match(src,/readFlightSessionEnvelope/,'history must use saved envelope');
assert.match(src,/wrap\('persist'\)/,'wrap persisted save');
assert.match(src,/sagsV22SaveNow/,'wrap verified autosave');
assert.match(src,/edit_audit_v1/,'cloud path available when authorized');
assert.match(src,/IndexedDB/);
const store=new Map(),cloud=new Map();
const win={
 __sagsGetSession:()=>({role:'DH',profile:{username:'KIENNT',fullName:'Kiểm thử'}}),
 currentFlightSessionMeta:()=>({id:'flight1',name:'LJ087/LJ088',rosterAssignmentId:'aid1',initialGroup:'fsags'}),
 firebase:{auth:()=>({currentUser:{uid:'uid1'}}),database:{ServerValue:{TIMESTAMP:{'.sv':'timestamp'}}}},
 sagsV470Ref:p=>({set:async v=>{cloud.set(p,v)}}),
 addEventListener(){},
 readFlightSessionEnvelope:()=>({state:{h24Start:'14:38'},rosterAssignmentId:'aid1'})
};
const listeners={};const doc={readyState:'loading',body:{classList:{contains:()=>true}},addEventListener(n,fn){listeners[n]=fn},getElementById(){return null}};
const nav={onLine:true};
const localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
vm.runInNewContext(src,{window:win,document:doc,navigator:nav,localStorage,console,indexedDB:undefined,setTimeout,clearTimeout},{filename:'form-edit-history.v1.js'});
const api=win.SAGSFormEditHistoryV1;assert.ok(api);
const changes=api.changesOf({h24Start:'14:35',fltBefore:'LJ087',signatureImage:'data:image/png;base64,foo',password:'x',photo:'image'},{h24Start:'14:38',fltBefore:'LJ087',signatureImage:'data:image/png;base64,bar',password:'y',photo:'other'});
assert.equal(changes.length,1,'sensitive and unchanged fields must be excluded');
assert.deepEqual(JSON.parse(JSON.stringify(api.changesOf({staffId:'1234',Name_copy:'CXR-2310'},{staffId:'4321',Name_copy:'CXR-9999'}))),[],'employee identifiers must never be logged');assert.equal(changes[0].before,'14:35');assert.equal(changes[0].after,'14:38');
assert.deepEqual(JSON.parse(JSON.stringify(api.changesOf({h24Start:'14:38'},{h24Start:'14:38'}))),[]);
assert.equal(api.scrub('note','x'.repeat(200)),'[Nội dung dài hoặc tệp đính kèm: không lưu giá trị]');
assert.equal(api.scrub('text','abc@example.com'),'[Nội dung dài hoặc tệp đính kèm: không lưu giá trị]');
listeners.input({isTrusted:true,target:{tagName:'INPUT',type:'text',closest:()=>null}});
api.capture(win.currentFlightSessionMeta(),{state:{h24Start:'14:35',signatureImage:'x'}},{state:{h24Start:'14:38',signatureImage:'secret'}},'Lưu biểu mẫu');
api.flushBatch('uid1|flight1').then(async()=>{
 try{
  const local=JSON.parse(store.get('sagsFormHistoryV1')||'[]');
  assert.equal(local.length,1);
  assert.equal(local[0].actor.username,'KIENNT');
  assert.equal(local[0].changes.length,1);
  assert.doesNotMatch(JSON.stringify(local),/secret|signatureImage|data:image/);
  assert.ok(local[0].synced===true,'remote acknowledged audit updates local status');
  assert.ok([...cloud.keys()].some(k=>k.startsWith('roster_sessions/aid1/edit_audit_v1/')));
  assert.equal((await api.entriesFor(win.currentFlightSessionMeta())).length,1);
  console.log('PASS saved-only diff, sensitive exclusions, local fallback, cloud write and history retrieval');
 }catch(e){console.error(e);process.exitCode=1}
});

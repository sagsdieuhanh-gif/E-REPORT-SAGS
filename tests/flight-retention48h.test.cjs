const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {IDBFactory}=require('fake-indexeddb');
const P=require('../app/modules/flight-retention-policy.v1.js'),R=require('../firebase/functions/retention');
const key='FS09|20261012|VJ123|VN123|CXR',at=1800000000000;
const closed=P.transition(null,{h21Start:'12:34'},at);
assert.equal(P.due(closed,at+P.TTL-1),false);assert.equal(P.due(closed,at+P.TTL),true);
assert.deepEqual(P.transition(closed,{h21Start:'1234'},at+1000),closed);
assert.equal(P.transition(closed,{h21Start:'N/A'},at+1000),null);
assert.equal(P.transition(closed,{h24Start:'12:34'},at+1000),null,'Pushback is not Door Close');
assert.equal(P.transition(null,{f421_h21Start:'23:59'},at).completedAtMs,at);
assert.equal(P.transition(closed,{h21Start:'13:00'},at+1000).completedAtMs,at+1000);
const parent={id:'EARCH_TEST',kind:'sags_flight_archive_v488',retentionTracksDoor:true,retention48h:closed,matchKeys:[key],dateToken:'20261012',flights:['VJ123'],acRegToken:'VN123'};
const job=R.lifecycle(parent,null,at);assert.equal(job.expiresAtMs,at+P.TTL);
assert.equal(R.lifecycle(parent,job,at+1000).completedAtMs,at);
assert.equal(R.lifecycle({...parent,retention48h:null},job,at+1000),null);
assert(R.matchRoster({opDate:'2026-10-12',acReg:'VN-123',depFlight:'VJ123'},job));
assert(!R.matchRoster({opDate:'2026-10-12',acReg:'VN-999',depFlight:'VJ123'},job));
assert(!R.related({kind:'users',matchKeys:[key]},job,new Set()));
assert(R.related({kind:'airline_final_form',identity:{dateToken:'20261012',flightToken:'VJ123',acRegToken:'VN123'}},job,new Set()));
function fakeFirestore(seed){
 const rows=new Map(Object.entries(seed));
 const pathField=(obj,path)=>path.split('.').reduce((x,k)=>x?.[k],obj);
 const snap=(path)=>({id:path.split('/').at(-1),exists:rows.has(path),data:()=>rows.get(path),ref:doc(path)});
 function doc(path){return {id:path.split('/').at(-1),path,get:async()=>snap(path),set:async(x,o)=>rows.set(path,o?.merge?{...rows.get(path),...x}:x),delete:async()=>rows.delete(path)}}
 function query(collection,filters=[]){return {doc:id=>doc(collection+'/'+id),where:(field,op,value)=>query(collection,[...filters,{field,op,value}]),get:async()=>({docs:[...rows.keys()].filter(path=>path.startsWith(collection+'/')&&!path.slice(collection.length+1).includes('/')).filter(path=>filters.every(({field,op,value})=>{const x=pathField(rows.get(path),field);return op==='array-contains'?Array.isArray(x)&&x.includes(value):x===value})).map(snap)})}}
 const db={rows,collection:c=>query(c),runTransaction:async fn=>{const writes=[];const tx={get:ref=>ref.get(),set:(ref,x,o)=>writes.push(()=>ref.set(x,o)),delete:ref=>writes.push(()=>ref.delete())};const result=await fn(tx);for(const write of writes)await write();return result},batch:()=>{const writes=[];return {delete:ref=>writes.push(ref),commit:async()=>{for(const ref of writes)await ref.delete()}}}};return db;
}
async function backend(){
 const db=fakeFirestore({'sags_handovers/EARCH_TEST':parent,'sags_handovers/FNL_TEST':{kind:'airline_final_form',matchKeys:[key]},'sags_handovers/paper_FNL_TEST':{kind:'airline_final_paper_photo',parentDocId:'FNL_TEST'},'sags_handovers/SYS':{kind:'system',matchKeys:[key]}});
 await R.markArchive(db,parent,at);let fail=true,updates=[];
 const rtdb={ref:path=>({child:p=>({once:async()=>({val:()=>p==='roster_manifests/2026-10-12'?{items:{A:{opDate:'2026-10-12',acReg:'VN123',depFlight:'VJ123',user:'USER',flightId:'FID'},B:{opDate:'2026-10-12',acReg:'VN999',depFlight:'VJ123',user:'OTHER',flightId:'OTHER'}}}:null}),orderByChild(){return this},equalTo(){return this}}),update:async patch=>{if(fail){fail=false;throw Error('simulated network error')}updates.push(patch)}})};
 await assert.rejects(R.purge(db,rtdb,job,at+P.TTL),/network error/);
 assert.equal(db.rows.get('sags_flight_retention_v1/EARCH_TEST').status,'deleting');
 assert(!db.rows.has('sags_handovers/FNL_TEST'));assert(db.rows.has('sags_handovers/SYS'));
 await R.purge(db,rtdb,job,at+P.TTL+1);
 const receipt=db.rows.get('sags_flight_retention_v1/EARCH_TEST');assert.equal(receipt.status,'purged');
 const patch=updates[0];assert.equal(patch['sags_live_v470/roster_sessions/A'],null);assert(!('sags_live_v470/roster_sessions/B' in patch));assert.equal(patch['sags_live_v469/finals/FNL_TEST'],null);
 // A non-Door-Close form cannot cancel another team's authoritative closure.
 await R.markArchive(db,{...parent,retentionTracksDoor:false,retention48h:null},at+1);assert.equal(db.rows.get('sags_flight_retention_v1/EARCH_TEST').status,'purged');
 console.log('PASS 48h boundary, stable clock, reopen, exact flight identity, related documents, resumable Firestore/RTDB deletion');
}
async function client(){
 const storage=new Map(),indexedDB=new IDBFactory();let list=[{id:'A',initialGroup:'fsags'},{id:'B'}];
 storage.set('OWN:flight:A',JSON.stringify({state:{h21Start:'12:34'},retention48h:closed}));storage.set('OWN:flight:B','{}');storage.set('AUTH','KEEP');storage.set('OWN:sagsV22LocalCheckpoint::A','checkpoint');
 const api={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k),key:i=>[...storage.keys()][i]??null,get length(){return storage.size}};
 const root={SAGSFlightRetentionPolicy:P,addEventListener(){},firebase:{auth:()=>({currentUser:{uid:'UID'}})},sagsIndexedDbFlightStoreV1:{accountScope:()=> 'USER',putSessionList:async()=>{}},indexedDB};
 const c={window:root,indexedDB,navigator:{onLine:true,serviceWorker:{controller:{postMessage:(message,ports)=>queueMicrotask(()=>ports[0].receive({data:{count:1}}))}}},document:{activeElement:null,addEventListener(){}},localStorage:api,MessageChannel:class{constructor(){this.port1={close(){},onmessage:null};this.port2={close(){},receive:e=>this.port1.onmessage?.(e)}}},setTimeout(){},setInterval(){},clearTimeout(){},console,Date,currentUserProfile:{username:'USER'},activeFlightSessionId:'A',readOfflineQueue:()=>[],sagsOwnedKey:k=>'OWN:'+k,sagsOwnedPrefix:k=>'OWN:'+k,flightSessionStorageKey:id=>'OWN:flight:'+id,readFlightSessionEnvelope:id=>JSON.parse(api.getItem('OWN:flight:'+id)||'{}'),readFlightSessionList:()=>list,writeFlightSessionList:x=>{list=x}};
 vm.createContext(c);vm.runInContext(fs.readFileSync('app/modules/flight-retention.v1.js','utf8'),c);
 const env=c.readFlightSessionEnvelope('A'),receipt={...job,status:'purged'};
 assert.equal(await root.SAGSFlightRetention.purgeLocal(list[0],env,receipt),false,'active session preserved');
 c.activeFlightSessionId='B';storage.set('OWN:sagsV61Uncommitted:A:field:manual','draft');assert.equal(await root.SAGSFlightRetention.purgeLocal(list[0],env,receipt),false,'local unsent draft preserved');storage.delete('OWN:sagsV61Uncommitted:A:field:manual');
 const db=await new Promise((resolve,reject)=>{const q=indexedDB.open('sags-draft-recovery-v2',1);q.onupgradeneeded=()=>q.result.createObjectStore('drafts',{keyPath:'key'});q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});
 async function row(pending){await new Promise((resolve,reject)=>{const tx=db.transaction('drafts','readwrite');tx.objectStore('drafts').put({key:'UID|A|field',account:'UID',flightSessionId:'A',pendingSync:pending});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
 await row(true);assert.equal(await root.SAGSFlightRetention.purgeLocal(list[0],env,receipt),false,'pending IDB preserved');await row(false);
 assert.equal(await root.SAGSFlightRetention.purgeLocal(list[0],env,receipt),true);
 assert.equal(api.getItem('AUTH'),'KEEP');assert.equal(api.getItem('OWN:flight:B'),'{}');assert.equal(api.getItem('OWN:flight:A'),null);assert.equal(api.getItem('OWN:sagsV22LocalCheckpoint::A'),null);assert.deepEqual(list,[{id:'B'}]);db.close();
 console.log('PASS local active-flight/unsent/IDB guards; expired flight removal; unrelated account/auth/session preservation');
}
(async()=>{await backend();await client()})().catch(error=>{console.error(error);process.exitCode=1});

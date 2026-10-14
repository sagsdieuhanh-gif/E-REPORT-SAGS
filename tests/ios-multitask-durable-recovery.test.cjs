const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {IDBFactory}=require('fake-indexeddb');
const root=__dirname+'/../',read=p=>fs.readFileSync(root+p,'utf8');
const core=read('app/modules/stability.v6-core.js');
const idb=read('app/modules/indexeddb-flight-store.v1.js');
const cloud=read('app/modules/cloud-draft-sync.v2.js');
function storage(){const m=new Map();return {get length(){return m.size},key:i=>[...m.keys()][i],getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}}
async function run(){
 const local=storage(),listeners={};
 let persisted=0,env={state:{remarks:'OK'}};
 const c={console,Date,Promise,JSON,localStorage:local,sessionStorage:storage(),state:{remarks:'OK'},activeFlightSessionId:'A',
  currentUserProfile:{username:'USER'},sagsOwnedPrefix:p=>p+'USER:',
  readFlightSessionEnvelope:()=>env,persist:()=>{persisted++;env={state:JSON.parse(JSON.stringify(c.state))}},
  document:{readyState:'loading',addEventListener:(name,fn)=>(listeners[name]??=[]).push(fn),getElementById:()=>null},
  navigator:{onLine:false},addEventListener(){},setInterval(){},setTimeout(){},clearTimeout(){},alert(){},confirm:()=>false};
 c.window=c;vm.createContext(c);vm.runInContext(core,c);
 const drafts=c.sagsV61Draft;
 assert.ok(core.includes('CÓ NHÁP CHƯA LƯU'));
 drafts.record('remarks','Chữ nhập dở');
 assert.equal(drafts.read('remarks').value,'Chữ nhập dở');
 c.activeFlightSessionId='B';drafts.persistChangedCore();
 assert.equal(persisted,1,'same JSON in another flight still must be checkpointed');
 assert.equal(drafts.read('remarks'),null,'B must not see A draft');
 c.activeFlightSessionId='A';
 assert.equal(drafts.read('remarks').value,'Chữ nhập dở','A may recover its own draft');
 const list=[{id:'A'},{id:'B'}],envelopes={A:{state:{remarks:'A saved'}},B:{state:{remarks:'B saved'}}},events={};
 const d={console,Date,Promise,JSON,indexedDB:new IDBFactory(),localStorage:local,
  currentUserProfile:{username:'USER'},activeFlightSessionId:'A',
  __sagsGetSession:()=>({profile:{username:'USER'}}),
  readFlightSessionList:()=>list.slice(),readFlightSessionEnvelope:id=>envelopes[id],
  writeFlightSessionList:()=>true,
  document:{readyState:'loading',addEventListener:(n,fn)=>(events[n]??=[]).push(fn),getElementById:()=>null},
  navigator:{storage:{}},addEventListener(){},setTimeout(){return 1},clearTimeout(){},setInterval(){}};
 d.window=d;vm.createContext(d);vm.runInContext(idb,d);
 const api=d.sagsIndexedDbFlightStoreV1;
 assert.equal((await api.mirrorActiveImmediately('test')).ok,true);
 assert.equal((await api.getEnvelope('A')).state.remarks,'A saved');
 d.activeFlightSessionId='B';assert.equal((await api.mirrorActiveImmediately('test')).ok,true);
 assert.equal((await api.getEnvelope('B')).state.remarks,'B saved');
 assert.equal((await api.getEnvelope('A')).state.remarks,'A saved','B must not overwrite A');
 assert.equal(idb.includes("if(document.visibilityState==='hidden')void mirrorActiveImmediately('visibility-hidden')"),true,'hidden event must start writing without timeout');
 assert.equal(idb.includes("void mirrorActiveImmediately('session-list-write')"),true,'committed session must trigger immediate mirror');
 assert.equal(cloud.includes("if(document.hidden||document.visibilityState==='hidden'){void enqueue(entry);return;}"),true,'cloud request should not wait for background timer');
 assert.equal(cloud.includes("root.addEventListener?.('pagehide',()=>{void flushPending();"),true,'pagehide must attempt pending cloud flush');
 assert.equal(core.includes("window.addEventListener('beforeunload',snapshotAllEditors)"),true,'manual text must snapshot before unload');
 console.log('iOS multitask draft checkpoint, flight/account isolation and immediate IDB regression PASS');
}
run().catch(e=>{console.error(e);process.exitCode=1});

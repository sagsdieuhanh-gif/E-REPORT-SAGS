const fs=require('node:fs'),vm=require('node:vm');
const {IDBFactory}=require('fake-indexeddb');
const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
const settle=async()=>{for(let i=0;i<30;i++)await new Promise(r=>setImmediate(r));};
function server(){
 const values=new Map(),writes=[],jobs=[];let hold=false,holdReads=false,readJobs=[],offset=0;
 const ref=path=>({
  on(name,cb){cb({val:()=>offset})},off(){},
  once:()=>new Promise(resolve=>{const value=clone(values.get(path)??Object.fromEntries([...values].filter(([p])=>p.startsWith(path+'/')).map(([p,v])=>[p.slice(path.length+1),v])));const finish=()=>resolve({val:()=>value});if(holdReads)readJobs.push(finish);else finish()}),
  transaction:fn=>new Promise(resolve=>{const finish=()=>{const v=fn(clone(values.get(path)||null));if(v!==undefined){values.set(path,clone(v));writes.push({path,value:clone(v)})}resolve({committed:v!==undefined,snapshot:{val:()=>clone(values.get(path)||null)}})};if(hold)jobs.push(finish);else finish()})
 });
 return {values,writes,jobs,ref,setHold:v=>{hold=v},setReadHold:v=>{holdReads=v},releaseRead:()=>readJobs.shift()?.(),setOffset:v=>{offset=v}};
}
const watermarks=new WeakMap();
function client(s,{db=new IDBFactory(),writer='tab-1',now=1000}={}){
 if(!watermarks.has(db))watermarks.set(db,new Map());const storage=watermarks.get(db);
 let uid='USER',flight='A',assignment='A',clock=now,seq=0;const local=new Map(),events={},docEvents={},timers=new Map(),restored=[];
 const key=(field,part)=>[uid,flight,field,part].join('|');
 const c={localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},console,Map,Set,Object,Promise,Math,JSON,indexedDB:db,navigator:{onLine:true},crypto:{randomUUID:()=>writer},Date:class extends Date{static now(){return clock}},CustomEvent:class{constructor(type,o){this.type=type;this.detail=o?.detail}},
  firebase:{auth:()=>({currentUser:uid?{uid}:null}),database:()=>({ref:s.ref})},
  currentFlightSessionMeta:()=>({id:flight,rosterAssignmentId:assignment}),readFlightSessionEnvelope:()=>({state:{}}),
  sagsV470Ref:s.ref,setTimeout:(fn,ms)=>{const id=++seq;timers.set(id,{fn,ms});return id},clearTimeout:id=>timers.delete(id),
  addEventListener:(name,fn)=>(events[name]??=[]).push(fn),dispatchEvent:e=>restored.push(e),
  document:{readyState:'loading',hidden:false,addEventListener:(name,fn)=>(docEvents[name]??=[]).push(fn)},
  sagsV61Draft:{read:(f,p)=>clone(local.get(key(f,p))||null),record:(f,v,p)=>{local.set(key(f,p),{field:f,part:p,value:String(v),atMs:clock});return true},forget:(f,p)=>local.delete(key(f,p))}
 };Object.defineProperty(c,'activeFlightSessionId',{get:()=>flight});c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(__dirname+'/../../app/modules/cloud-draft-sync.v2.js','utf8'),c);docEvents.DOMContentLoaded[0]();
 return {c,db,local,restored,setFlight:(f,a=f)=>{flight=f;assignment=a},setUser:u=>{uid=u;(events['sags:login']||[]).forEach(fn=>fn())},setClock:n=>{clock=n},record:(v,f='field')=>c.sagsV61Draft.record(f,v,'quickTime'),forget:()=>c.sagsV61Draft.forget('field','quickTime'),read:()=>c.sagsV61Draft.read('field','quickTime'),flush:()=>c.sagsDraftV2Flush(),pull:()=>c.sagsDraftV2Pull(),runTimers:async max=>{await settle();for(const [id,t]of [...timers])if(t.ms<=max){timers.delete(id);t.fn()}await settle()},rows:async()=>{const db=await new Promise((res,rej)=>{const q=c.indexedDB.open('sags-draft-recovery-v2',1);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});const rows=await new Promise(res=>{const q=db.transaction('drafts').objectStore('drafts').getAll();q.onsuccess=()=>res(q.result)});db.close();return rows;}};
}
module.exports={server,client,settle,clone};

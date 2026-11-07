'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('app/modules/roster-open-guard.v1.js','utf8');
const roster=fs.readFileSync('app/modules/daily-roster.v502.js','utf8');
function harness(){
 const state={uid:'U-1',online:true,docs:[],fromCache:false,networkFailure:null,reads:0,opens:0,takeovers:0,alerts:[],requestedSource:[]};
 const c={Promise,Error,Set,Proxy,Reflect,Object,Array,String,console,
  navigator:{get onLine(){return state.online}},
  document:{readyState:'complete',body:null,getElementById:()=>null},
  setTimeout(){return 1},clearTimeout(){},
  alert:x=>state.alerts.push(String(x)),
  sagsV470Ref:()=>({once:()=>Promise.resolve({val:()=>({})})}),
  firebase:{
   auth:()=>({currentUser:state.uid?{uid:state.uid}:null}),
   firestore:()=>({collection:name=>{
    assert.equal(name,'sags_radio_devices_v1');
    return {where:(field,op,uid)=>{
     assert.equal(field,'holderUid');assert.equal(op,'==');
     return {get:options=>{
      state.reads++;state.requestedSource.push(options?.source);
      if(state.networkFailure)return Promise.reject(state.networkFailure);
      return Promise.resolve({metadata:{fromCache:state.fromCache},docs:state.docs.filter(d=>d.data().holderUid===uid)});
     }};
    };
   }})
  }
 };
 c.window=c;c.v324ReceiveOrOpen=async()=>{state.opens++;return 'OPENED'};
 c.v324TakeoverWaiting=async()=>{state.takeovers++;return 'TAKEN'};
 vm.createContext(c);vm.runInContext(src,c);
 return {c,state,sign:()=>{state.docs=[{id:'DH01',data:()=>({holderUid:'U-1',status:'OUT'})}]},
   malformed:()=>{state.docs=[{id:'DH01',data:()=>({holderUid:'U-1',status:'READY'})}]}};
}
(async()=>{
 const a=harness();
 assert.equal(await a.c.v324ReceiveOrOpen('VJ100'),false,'No radio -> no report');
 assert.equal(a.state.opens,0,'No claim writes before verified custody');
 assert.equal(a.state.reads,1,'Server checked at the time of the attempt');
 assert(a.state.alerts.at(-1).includes('BẮT BUỘC KÝ NHẬN'));
 a.sign();
 assert.equal(await a.c.v324ReceiveOrOpen('VJ100'),'OPENED','Signed radio permits report');
 assert.equal(a.state.opens,1);assert.deepEqual(a.state.requestedSource,['server','server']);
 a.state.docs=[];assert.equal(await a.c.v324ReceiveOrOpen('VJ200'),false,'Returning radio revokes future openings');
 assert.equal(a.state.opens,1);
 a.malformed();assert.equal(await a.c.v324ReceiveOrOpen('VJ300'),false,'Inactive machine is not custody');
 a.sign();a.state.fromCache=true;
 assert.equal(await a.c.v324ReceiveOrOpen('VJ301'),false,'Cached Firestore cannot authorize opening');
 a.state.fromCache=false;a.state.online=false;const priorReads=a.state.reads;
 assert.equal(await a.c.v324ReceiveOrOpen('VJ302'),false,'Offline fails closed');
 assert.equal(a.state.reads,priorReads);
 a.state.online=true;a.state.networkFailure=new Error('permission-denied');
 assert.equal(await a.c.v324ReceiveOrOpen('VJ303'),false,'Rule/network denial fails closed');
 a.state.networkFailure=null;a.state.docs=[
  {id:'DH01',data:()=>({holderUid:'U-1',status:'OUT'})},
  {id:'DH02',data:()=>({holderUid:'U-1',status:'OUT'})}
 ];
 assert.equal(await a.c.v324ReceiveOrOpen('VJ304'),false,'Multiple held machines require administrator reconciliation');
 a.sign();a.state.uid='U-2';
 assert.equal(await a.c.v324ReceiveOrOpen('VJ305'),false,'Custody does not transfer between accounts');
 a.state.uid=null;assert.equal(await a.c.v324ReceiveOrOpen('VJ306'),false,'Missing Firebase auth fails closed');
 const t=harness();
 assert.equal(await t.c.v324TakeoverWaiting('VJ300'),false,'Legacy NHẬN THAY cannot skip radio preflight');
 assert.equal(t.state.takeovers,0);
 t.sign();
 assert.equal(await t.c.v324TakeoverWaiting('VJ300'),'TAKEN');
 assert.equal(t.state.takeovers,1);
 assert(src.includes("await requireRadio();")&&src.includes("return base.apply(this,arguments)"),'Central claim must await custody');
 assert(src.includes("root.SAGSAviationOpenRadio()"),'Blocked user should reach camera/sign screen');
 assert(src.includes("source:'server'"),'Do not use local or cached custody state');
 const open=roster.indexOf('async function openTask('),stale=roster.indexOf('await clearStaleClaimIfNeeded(item)',open),check=roster.indexOf('await root.SAGSRosterOpenGuard.requireRadio()',open);
 assert(open>0&&check>open&&check<stale,'Preflight must precede stale assignment mutations');
 const reopen=roster.indexOf('async function reopenPushback('),reopenCheck=roster.indexOf('await root.SAGSRosterOpenGuard.requireRadio()',reopen),patch=roster.indexOf('const t=Date.now(),u=me(),patch={}',reopen);
 assert(reopen>0&&reopenCheck>reopen&&reopenCheck<patch,'Reopen pushback must not mutate before custody check');
 console.log('Mandatory signed-radio-before-report gate: server-only, return revocation, offline/error fail closed, mobile UI, legacy takeover and prewrite guards PASS');
})().catch(e=>{console.error(e);process.exitCode=1});

const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('app/modules/roster-open-guard.v1.js','utf8');
function harness(base,ref){
 const timers=new Map(),nodes=new Map(),alerts=[];let next=0;
 const c={console,Promise,Proxy,Reflect,Set,Error,alert:m=>alerts.push(m),setTimeout:(f,ms)=>{const id=++next;timers.set(id,{f,ms});return id},clearTimeout:id=>timers.delete(id),document:{readyState:'complete',getElementById:id=>nodes.get(id),createElement:()=>({setAttribute(){},style:{}}),body:{appendChild:el=>nodes.set(el.id,el)}}};
 c.window=c;c.sagsV470Ref=()=>ref;c.v324ReceiveOrOpen=function(){return base(c,...arguments)};
 vm.createContext(c);vm.runInContext(source,c);
 return {c,alerts,timers,expire:ms=>{for(const [id,t] of [...timers])if(t.ms===ms){timers.delete(id);t.f()}}};
}
(async()=>{
 let resolveRead,writes=0,opens=0,calls=0;
 const ref={once:()=>new Promise(r=>{resolveRead=r}),update:()=>{writes++;return Promise.resolve()}};
 const h=harness(async c=>{calls++;try{await c.sagsV470Ref('roster_sessions/A').once('value')}catch(_){}await c.sagsV470Ref('roster_sessions/A').update({claimStatus:'CLAIMED'});opens++;},ref);
 const first=h.c.v324ReceiveOrOpen('FID','A','2026-10-18'),second=h.c.v324ReceiveOrOpen('FID');assert.equal(first,second);
 await Promise.resolve();h.expire(12000);await first;
 assert.equal(calls,1);assert.equal(writes,0,'swallowed failed reads cannot permit a claim');assert.equal(opens,0);assert.equal(h.alerts.length,1);assert.equal(h.c.SAGSRosterOpenGuard.status().pending,false);
 resolveRead({val:()=>({claimStatus:'CLAIMED'})});await Promise.resolve();assert.equal(opens,0,'late Firebase result cannot reopen unexpectedly');
 let releaseWrite;const ok=harness(async c=>{await c.sagsV470Ref('x').once('value');await c.sagsV470Ref('x').update({});opens++;},{once:()=>Promise.resolve({val:()=>({})}),update:()=>new Promise(r=>{releaseWrite=r})});
 const pending=ok.c.v324ReceiveOrOpen('F');for(let i=0;i<8;i++)await Promise.resolve();ok.expire(15000);
 assert.equal(ok.c.SAGSRosterOpenGuard.status().pending,true,'unacknowledged writes remain pending');assert.equal(pending,ok.c.v324ReceiveOrOpen('F'));
 releaseWrite();await pending;assert.equal(opens,1);assert.equal(ok.alerts.length,0);
 // Re-install must not wrap an outer legacy wrapper around the guard again.
 const previous=ok.c.v324ReceiveOrOpen;ok.c.v324ReceiveOrOpen=(...args)=>previous(...args);ok.c.SAGSRosterOpenGuard.install();
 const result=ok.c.v324ReceiveOrOpen('F');for(let i=0;i<8;i++)await Promise.resolve();releaseWrite();await result;assert.equal(opens,2);
 const idle=ok.c.sagsV470Ref('x').once('value');await idle;assert.equal(ok.c.SAGSRosterOpenGuard.status().pending,false);
 let listener,detached=0;
 const live=harness(c=>c.sagsV470Ref('x').once('value'),{once(){throw Error('must use cancellable listener')},on(event,fn){listener=fn},off(event,fn){assert.equal(fn,listener);detached++}});
 const wait=live.c.v324ReceiveOrOpen('F');await Promise.resolve();live.expire(12000);await wait;assert.equal(detached,1,'timed out listener is detached');
 listener({val:()=>({})});assert.equal(live.c.SAGSRosterOpenGuard.status().pending,false);
 const shared=fs.readFileSync('app/core/phases/core-shared.js','utf8');
 const start=shared.indexOf('async function sessionState(aid)'),end=shared.indexOf('function itemFlightId',start);
 const error=Object.assign(new Error('denied'),{code:'PERMISSION_DENIED'});
 const ctx={db:()=>({once:()=>Promise.reject(error)}),safe:x=>x,root:{},clone:x=>x};vm.createContext(ctx);vm.runInContext(shared.slice(start,end),ctx);
 await assert.rejects(ctx.sessionState('A'),e=>e===error,'claim state read failures must not become empty state');
 console.log('PASS opening feedback, duplicate clicks, read timeout, fail-closed claims, late responses, write acknowledgements and wrapper reinstallation');
})().catch(e=>{console.error(e);process.exitCode=1});

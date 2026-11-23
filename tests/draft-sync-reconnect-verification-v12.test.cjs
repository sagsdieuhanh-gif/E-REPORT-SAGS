'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const code=fs.readFileSync('app/modules/cloud-draft-sync.v2.js','utf8');
const start=code.indexOf('function wake(delay=0,reconnected=false){');
const end=code.indexOf('function start(){',start);
assert(start>0&&end>start,'reconnection state machine must be present');
const pendingStart=code.indexOf('async function pendingFor(user,strict=false)');
const pendingEnd=code.indexOf('// A localStorage quota failure',pendingStart);
assert(pendingStart>0&&pendingEnd>pendingStart);
const strictPending=new Function('openDb','valid',code.slice(pendingStart,pendingEnd)+';return pendingFor')(
 async()=>{throw Error('IndexedDB unavailable')},()=>true
);
async function simulate(initial,outcome){
 let pending=initial,phases=[];
 const ctx={
  installWrap(){},capture(){return {account:'person',flightSessionId:'flight'}},
  active(){return true},restoreLocal:async()=>true,
  navigator:{onLine:true},notifyOfflineOnce(){phases.push('offline')},
  pullCloud:async()=>true,pendingFor:async(_user,strict)=>{
   assert.strictEqual(strict,true,'reconnect checks must not mask IndexedDB errors');
   if(outcome==='read-error')throw Error('IndexedDB read error');
   return Array(pending).fill({key:'x'});
  },
  flushPending:async strict=>{assert.strictEqual(strict,true);if(outcome==='success')pending=0;return true},
  notifyDraftState(phase){phases.push(phase)},
  lastCloudError:'',S:String,
  setTimeout:fn=>{fn();return 1}
 };
 vm.createContext(ctx);
 vm.runInContext(code.slice(start,end)+'\nthis.wake=wake;',ctx);
 ctx.wake(0,true);
 await new Promise(resolve=>setTimeout(resolve,15));
 return phases;
}
(async()=>{
 assert.deepEqual(await simulate(2,'success'),['syncing','synced']);
 assert.deepEqual(await simulate(2,'no-receipt'),['syncing','failed']);
 assert.deepEqual(await simulate(2,'read-error'),['failed']);
 assert.deepEqual(await simulate(0,'success'),['connected']);
 await assert.rejects(()=>strictPending('person',true),/IndexedDB unavailable/);
 assert.deepEqual(await strictPending('person'),[]);
 console.log('Auto-reconnect: Firebase receipt only after queue drains; errors cannot produce success PASS');
})().catch(e=>{console.error(e);process.exitCode=1});

'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),{performance}=require('perf_hooks');
const c={document:{readyState:'loading',addEventListener(){},getElementById(){return null}},addEventListener(){},setTimeout(){},clearTimeout(){},console:{warn(){}},navigator:{onLine:true}};c.window=c;vm.createContext(c);
vm.runInContext(`
var activeFlightSessionId='A',account='U',state={},saves=0,reads=0,stateSerializations=0,failSave=false,failVerify=false;
for(let i=0;i<900;i++)state['field'+i]='VALUE '+i;
state.attachments=Array.from({length:8},(_,i)=>({id:i,src:'data:image/jpeg;base64,'+('Ab'+i).repeat(170000)}));
const nativeStringify=JSON.stringify;let durable=JSON.parse(nativeStringify(state));
JSON.stringify=function(value,...args){if(value===state)stateSerializations++;return nativeStringify(value,...args)};
function sagsOwnedPrefix(p){return p+account+':'}
function persist(){saves++;if(failSave)throw Error('quota');if(!failVerify)durable=JSON.parse(JSON.stringify(state))}
function readFlightSessionEnvelope(){reads++;return {state:durable}}
`,c);
vm.runInContext(fs.readFileSync('app/modules/stability.v6-core.js','utf8'),c);const api=c.sagsV61Draft;
let start=performance.now();vm.runInContext('for(let i=0;i<20;i++)nativeStringify(state)',c);const oldMs=performance.now()-start;
start=performance.now();for(let i=0;i<20;i++)api.persistChangedCore();const newMs=performance.now()-start;
assert.equal(c.stateSerializations,0);assert.equal(c.saves,0);assert.equal(c.reads,0,'idle does not read/serialize durable images');
function changed(code,fast=true){const before=c.saves;vm.runInContext(code,c);api.persistChangedCore();assert.equal(c.saves,before+1,code);assert(!api.hasStorageError());const serial=c.stateSerializations;api.persistChangedCore();assert.equal(c.saves,before+1);if(fast)assert.equal(c.stateSerializations,serial,'unchanged nested data skipped')}
changed("state.field1='NEW'");changed("state.attachments[0].caption='ADDED'");changed("state.attachments[0].caption='CHANGED'");changed("delete state.attachments[0].caption");changed("state.attachments.push({id:9,src:'extra'})");changed('state.attachments.reverse()');changed('state.attachments.pop()');changed('state.attachments.length=2');changed('delete state.field2');changed("state.field2='RESTORED'");changed("state.field3=null");changed("state.field3={nested:[{count:1}]}");changed('state.field3.nested[0].count=2');
// Scope isolation: identical values in another account/flight still need a save.
changed("activeFlightSessionId='B'");changed("account='OTHER'");
// An unsuccessful write/read-back must not advance the baseline.
vm.runInContext("state.field1='RETRY';failSave=true",c);api.persistChangedCore();assert(api.hasStorageError());let n=c.saves;vm.runInContext('failSave=false',c);api.persistChangedCore();assert.equal(c.saves,n+1);assert(!api.hasStorageError());
vm.runInContext("state.field1='VERIFY';failVerify=true",c);api.persistChangedCore();assert(api.hasStorageError());n=c.saves;vm.runInContext('failVerify=false',c);api.persistChangedCore();assert.equal(c.saves,n+1);assert(!api.hasStorageError());
// Exotic JSON behavior falls back to the original serializer, including changes
// hidden inside Date/toJSON/accessors. Sparse arrays must not ignore inheritance.
for(const [setup,mutate]of [
 ["state.extra=new Date('2026-01-01')","state.extra.setFullYear(2027)"],
 ["state.extra={v:1,toJSON(){return this.v}}","state.extra.v=2"],
 ["state.extra={get x(){return this._x},_x:1}","state.extra._x=2"],
 ["state.extra=[1,,3]","state.extra[1]=2"],
 ["state.extra={};for(let i=0;i<8200;i++)state.extra[i]=i","state.extra[3]=99"],
 ["state.extra={};let cursor=state.extra;for(let i=0;i<20;i++)cursor=cursor.next={};cursor.end=1","state.extra.next.changed=2"]
]){changed(setup,false);changed(mutate,false)}
vm.runInContext('state.extra=state',c);api.persistChangedCore();assert(api.hasStorageError(),'cyclic JSON cannot be accepted');vm.runInContext('delete state.extra',c);api.persistChangedCore();assert(!api.hasStorageError());
console.log(`Large state: 900 fields + 8 image strings (~4 MB); 20 idle polls: 0 state serializations / 0 saves / 0 durable reads. Node sample JSON=${oldMs.toFixed(1)}ms, structural=${newMs.toFixed(1)}ms (synthetic, not a device benchmark). Nested edits, scope, failed writes/verification and JSON fallbacks passed.`);

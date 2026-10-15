const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),acorn=require('acorn');
const src=fs.readFileSync('app/core/phases/core-control.js','utf8');let code;
(function walk(n){if(!n||typeof n!=='object')return;if(n.type==='FunctionDeclaration'&&n.id.name==='ensureLocalSession')code=src.slice(n.start,n.end);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v)})(acorn.parse(src,{ecmaVersion:'latest'}));
let list=[],blocked=true,silent=false;const data=new Map();
const c={Date,S:x=>String(x??'').trim(),canonicalFormGroup:x=>x,hash:()=> 'stable-id',me:()=> 'USER',startPage:()=>6,manualSeed:()=>({f421_fltBefore:'KE467'}),localStorage:{getItem:k=>data.get(k)??null,setItem(k,v){if(blocked)throw Object.assign(Error('quota'),{name:'QuotaExceededError'});if(!silent)data.set(k,v)}},root:{readFlightSessionList:()=>structuredClone(list),writeFlightSessionList:x=>{list=structuredClone(x)},flightSessionStorageKey:id=>'session:'+id,readFlightSessionEnvelope:id=>JSON.parse(data.get('session:'+id)||'{}')}};
(async()=>{
vm.createContext(c);vm.runInContext(code,c);const item={assignmentId:'A',formGroup:'fsags421'};
await assert.rejects(()=>c.ensureLocalSession(item),/quota/);assert.equal(list.length,0,'failed envelope cannot advertise a usable session');
blocked=false;silent=true;await assert.rejects(()=>c.ensureLocalSession(item),/LOCAL_SESSION_WRITE_VERIFY/);assert.equal(list.length,0);
silent=false;const meta=await c.ensureLocalSession(item);assert.equal(list.length,1);assert.equal(JSON.parse(data.get('session:'+meta.id)).state.f421_fltBefore,'KE467');
const env=JSON.parse(data.get('session:'+meta.id));env.state.notes='NỘI DUNG CŨ';data.set('session:'+meta.id,JSON.stringify(env));await c.ensureLocalSession(item);assert.equal(list.length,1);assert.equal(JSON.parse(data.get('session:'+meta.id)).state.notes,'NỘI DUNG CŨ');
console.log('My Flight initialization: quota/silent failure cannot publish phantom sessions; retry preserves existing data');

})().catch(e=>{console.error(e);process.exitCode=1});

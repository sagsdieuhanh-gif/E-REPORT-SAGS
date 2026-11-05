'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('app/modules/mobile-draft-recovery.v1.js','utf8');
const v61=fs.readFileSync('app/modules/stability.v6-core.js','utf8');
const cloud=fs.readFileSync('app/modules/cloud-draft-sync.v2.js','utf8');
for(const term of ["draft().record(String(el.dataset.key),String(el.value??''),'ios-live')","iosPersist('ios-hidden')","iosPersist('ios-pagehide')","iosPersist('ios-change')","iosPersist('ios-blur')","sagsV22SaveNow?.(reason)","sagsIndexedDbFlightStoreV1?.scheduleMirror?.","sagsDraftV2Flush?.()"]){
 assert(src.includes(term),'Missing iOS flight crash-recovery protection '+term);
}
assert(v61.includes("textarea.addEventListener(event,()=>{const f=currentManual();if(f)root.sagsV61Draft.record(f.key,textarea.value);"),'manual fields already save each keystroke');
assert(cloud.includes('async function idbPut(entry'),'independent IndexedDB draft shadow must remain');
assert(cloud.includes("const record=function(field,value,part='manual')"),'cloud sync wrapper must receive new ios-live fields');
const a=src.indexOf('  const draft=()=>root.sagsV61Draft;'),b=src.indexOf('  function canonical(',a);
assert(a>=0&&b>a);
function harness(agent='iPhone',id='FLT01'){
 const store=new Map(),events=[],timers=[];
 const root={navigator:{userAgent:agent,maxTouchPoints:agent==='Macintosh'?5:0},
  currentFlightSessionMeta:()=>({id}),readFlightSessionEnvelope:()=>({state:{pax:''}}),
  sagsV61Draft:{record(k,v,p){store.set(id+'|'+k+'|'+p,{value:v});events.push('record:'+k);return true},
   read(k,p){return store.get(id+'|'+k+'|'+p)||null},forget(k,p){store.delete(id+'|'+k+'|'+p);events.push('forget:'+k)},snapshotAllEditors(){events.push('snapshot')}},
  sagsV22SaveNow(reason){events.push('save:'+reason);return true},
  sagsIndexedDbFlightStoreV1:{scheduleMirror(reason,ms,ids){events.push('idb:'+ids[0])}},
  confirm:()=>true};
 const c={root,document:{getElementById:()=>({dataset:{},hidden:true})},
  setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout:()=>{},Event:function(name){this.type=name},console};
 vm.createContext(c);
 vm.runInContext(src.slice(a,b)+'\nthis.record=iosRecord;this.restore=iosRestore;this.snapshot=iosPersist;this.schedule=iosScheduleSave;this.enabled=ios;',c);
 const el={dataset:{key:'pax'},value:'143',
  matches:x=>x==='input,textarea,select',
  closest:sel=>sel==='.page,.sheet'?{}:null,
  dispatchEvent:e=>events.push('recovered:'+e.type)};
 return {c,el,root,events,store,timers};
}
const h=harness();assert.equal(h.c.enabled,true);
assert.equal(h.c.record(h.el),true);
assert.deepEqual(h.events,['record:pax'],'typing must synchronously store field before debounce');
h.c.schedule();assert.equal(h.timers.length,1);
h.timers[0]();
assert(h.events.includes('save:ios-input')&&h.events.includes('idb:FLT01'));
assert(!h.events.includes('snapshot'),'typing must not double-persist the whole flight');
h.c.snapshot('ios-hidden');assert(h.events.includes('snapshot'),'background must capture unfinished editors before checkpoint');
assert(h.events.includes('save:ios-hidden'));
h.el.value='';h.c.restore(h.el);assert.equal(h.el.value,'143');
assert(h.events.includes('recovered:input'),'restored input must update original field state');
const x=harness('Android');assert.equal(x.c.enabled,false);assert.equal(x.c.record(x.el),false);
const y=harness();y.root.confirm=()=>false;y.store.set('FLT01|pax|ios-live',{value:'55'});y.el.value='11';y.c.restore(y.el);assert.equal(y.el.value,'11','never overwrite existing user edits on rejected recovery');
const z=harness();z.el.closest=()=>null;assert.equal(z.c.record(z.el),false,'settings/other forms must not be captured');
console.log('iOS flight input immediate recovery, foreground/background checkpoint, IndexedDB mirror, exact session, and no Android interference PASS');

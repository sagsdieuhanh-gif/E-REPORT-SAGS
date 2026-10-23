'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const boot=read('app/boot/05-legacy.js'),resume=read('app/boot/06-legacy.js');
assert.doesNotMatch(boot,/entryText\.addEventListener\(["']input["'],\(\)=>\{if\(editing\)v1153CaptureRefreshView\(\)\}/,
  'Typing must not synchronously write the navigation snapshot on each character');
assert.match(resume,/window\.addEventListener\(["']pagehide["'],v1153CaptureRefreshView/);
assert.match(resume,/document\.addEventListener\(["']visibilitychange["'],\(\)=>\{if\(document\.hidden\)v1153CaptureRefreshView/);

const rows=new Map(),timers=[],canceled=[];let enumerations=0,envelopes=0,writes=0;
const badge={hidden:false,dataset:{},textContent:''};
const activeEditor={matches:s=>s==='input,textarea',closest:s=>s.includes('#quickTimeModal')?{}:null};
const context={
 window:null,document:{readyState:'loading',hidden:false,activeElement:activeEditor,
  addEventListener(){},getElementById:id=>id==='sagsV61DraftStatus'?badge:null},
 activeFlightSessionId:'F',currentUserProfile:{username:'OP'},state:{},
 sagsOwnedPrefix:x=>x+'OP:',readFlightSessionEnvelope:()=>{envelopes++;return{state:{}}},
 localStorage:{get length(){return rows.size},key:i=>{enumerations++;return [...rows.keys()][i]},
  getItem:k=>rows.get(k)??null,setItem:(k,v)=>{writes++;rows.set(k,v)},removeItem:k=>rows.delete(k)},
 setTimeout:(f,delay)=>{timers.push({f,delay});return timers.length},
 clearTimeout:id=>canceled.push(id),addEventListener(){},navigator:{onLine:true},
 alert(){throw Error('Unexpected storage alert')},console:{warn(){}}
};
context.window=context;
vm.createContext(context);vm.runInContext(read('app/modules/stability.v6-core.js'),context);
for(let i=0;i<80;i++)rows.set('sagsV61Uncommitted:OP:F:k'+i+':manual',
 JSON.stringify({field:'k'+i,part:'manual',value:'DRAFT'}));
const api=context.sagsV61Draft;
api.status();
assert.equal(enumerations,0,'No full localStorage scan while a quick-input keyboard is focused');
assert.match(badge.textContent,/Nháp đang lưu trên máy/);
context.document.activeElement=null;api.status();
assert.equal(enumerations,80,'Idle status still discovers and verifies pending recovery drafts');
assert.equal(envelopes,1,'One committed envelope read for all 80 pending drafts');
context.document.activeElement=activeEditor;
const before=writes;
assert(api.record('estimatedBag','KS 35'));
assert(api.record('estimatedBag','KS 358'));
assert(api.record('estimatedBag','KS 358/5847'));
assert.equal(writes-before,3,'Every changed value is immediately committed to the recovery store');
assert.equal(api.read('estimatedBag').value,'KS 358/5847');
assert.equal(envelopes,2,'Three progressive keystrokes require only one committed-envelope parse');
// When an identical value is sent again, its committed status is rechecked.
const previousEnvelopes=envelopes;
assert(api.record('estimatedBag','KS 358/5847'));
assert.equal(envelopes,previousEnvelopes+1,'Identical input must revalidate the durable committed envelope');
assert.deepEqual(timers.map(x=>x.delay),[350,350,350,350]);
assert.deepEqual(canceled,[1,2,3],'Status timer is reset as typing continues');
const scannedBefore=enumerations;timers.at(-1).f();
assert.equal(enumerations,scannedBefore,'Debounced status while typing never scans all drafts');
context.document.activeElement=null;api.status();
assert.equal(enumerations,scannedBefore+81,'After editing, recovery drafts are discoverable again');
const stability=read('app/modules/stability.v6-core.js'),loader=read('app/modules/stability.v6.js');
assert(stability.includes('!document.hidden&&!currentManual()&&!currentQuick()'),
 'Background whole-form serialization must be skipped while the mobile editor is open');
assert(loader.includes("searchParams.get('v')"),'Draft loader must share parent release version');
assert(!loader.includes('?v=V2.0'),'Draft loader must not keep stale recovery code cached forever');
assert(stability.includes('localStorage.getItem(k)!==encoded'),
 'Each changed field draft must still be verified immediately');
console.log('Mobile typing: no navigation write per keystroke; durable drafts, deferred scans, trailing status and idle recovery PASS');

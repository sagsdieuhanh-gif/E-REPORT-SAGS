'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),acorn=require('acorn');
const read=p=>fs.readFileSync(p,'utf8');
function find(source,predicate){let found;function walk(n){if(!n||typeof n!=='object'||found)return;if(predicate(n)){found=n;return}for(const [k,v]of Object.entries(n))if(k!=='start'&&k!=='end')if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v)}walk(acorn.parse(source,{ecmaVersion:'latest'}));assert(found);return source.slice(found.start,found.end)}
const boot=read('app/boot/06-legacy.js');
const handler=find(boot,n=>n.type==='VariableDeclarator'&&n.id?.name==='saveFinalFieldLive').replace(/^saveFinalFieldLive\s*=\s*/,'');
const save=find(boot,n=>n.type==='FunctionDeclaration'&&n.id?.name==='ffSaveField');
const roleSave=find(boot,n=>n.type==='AssignmentExpression'&&n.left?.name==='ffSaveField'&&boot.slice(n.start,n.end).includes('_roleFfSaveField'));
const identitySource=read('app/core/phases/core-postcontrol.js');
const identitySave=find(identitySource,n=>n.type==='FunctionExpression'&&n.params?.[0]?.name==='form'&&identitySource.slice(n.start,n.end).includes('save.apply(this,arguments)'));
for(const key of ['flight','adultq','zonea']){
 let reads=0,writes=0,touched=0,pax=0,fail=false,invalid=false;
 let store={F:{other:'KEPT'},G:{flight:'OTHER FLIGHT'}};
 const c={ffScheduleLocalFit(){},ffScheduleFinalDerivedPaint(){},ffScheduleFinalRealtimeRefresh(){},currentRole:'CBTT',clearTimeout(){},ffScheduleFinalDisplayFit(){},form:'F',key,el:{value:'12',type:'text',focus(){}},out:{},FF_ZONE_RULES:{F:{zones:['zonea']}},ffLastAcceptedValue:'OLD',ffDisplayText:(k,v)=>v,ffStore:()=>{reads++;return structuredClone(store)},ffWriteStore:all=>{if(fail)throw Error('quota');writes++;store=structuredClone(all)},touchFinalSheetRecord:()=>touched++,requestAnimationFrame(){},setTimeout(){},sagsCheckZoneMax:()=>({status:invalid?'invalid':'valid'}),ffCheckZoneTotal:()=>({status:invalid?'invalid':'valid'}),ffShowZoneMaxWarning(){},ffHideZoneMaxWarning(){},ffShowZoneWarning(){},ffAutoPaxWeights:(f,d)=>{pax++;d.weight='WEIGHT'},ffApplyVJFormulas:(f,d)=>{d.derived='CALCULATED'}};
 for(const n of ['ffRefreshVJFormulaDisplay','ffRefreshAllFinalLoadWarning','ffRefreshVUFormulaWarning','ffRefreshZoneWarning','ffRefreshZoneMaxWarning','ffRefreshPaxWeightDisplay','refreshFinalRealtimeSubscription'])c[n]=()=>{};
 vm.createContext(c);vm.runInContext(save+';const _roleFfSaveField=ffSaveField;'+roleSave+';const save=ffSaveField,S=String;let syncTimer;ffSaveField=('+identitySave+');run='+handler,c);c.run(false);
 assert.equal(reads,1,key+' reads once');assert.equal(writes,1,key+' writes once');assert.equal(touched,1);assert.equal(store.F[key],'12');assert.equal(store.F.derived,'CALCULATED');assert.equal(store.G.flight,'OTHER FLIGHT');assert.equal(pax,key==='adultq'?1:0);
 const allowedWrites=writes;c.currentRole='PVHK';c.ffSaveField('F',key,'DENIED');assert.equal(writes,allowedWrites,'role check retained');c.currentRole='CBTT';
 const accepted=c.ffLastAcceptedValue;c.el.value='13';fail=true;assert.throws(()=>c.run(false),/quota/);assert.equal(c.ffLastAcceptedValue,accepted,'failed save is not accepted');assert.equal(store.F[key],'12','durable original remains');
 if(key==='zonea'){fail=false;invalid=true;const before=writes;c.el.value='999';c.run(true);assert.equal(writes,before,'invalid zone never saved')}
}
// Immediate durable per-field draft, bounded envelope reads, account/flight scope.
let envelopeReads=0;const timers=[],data=new Map(),badge={dataset:{}};
const c={window:null,document:{readyState:'loading',getElementById:id=>id==='sagsV61DraftStatus'?badge:null,addEventListener(){}},currentUserProfile:{username:'TEST'},activeFlightSessionId:'F1',sagsOwnedPrefix:p=>p+'TEST:',readFlightSessionEnvelope:()=>{envelopeReads++;return {state:{stale:'SAME'}}},localStorage:{get length(){return data.size},key:i=>[...data.keys()][i],getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout(){},console,navigator:{onLine:false},addEventListener(){},alert:()=>assert.fail('unexpected save failure')};c.window=c;vm.createContext(c);vm.runInContext(read('app/modules/stability.v6-core.js'),c);
for(let i=0;i<40;i++)data.set('sagsV61Uncommitted:TEST:F1:k'+i+':manual',JSON.stringify({field:'k'+i,part:'manual',value:'DRAFT'}));
const api=c.sagsV61Draft;api.record('notes','NEW');assert.equal(envelopeReads,1,'typing reads only the committed field envelope');assert.equal(api.read('notes').value,'NEW','durable before status timer');
data.set('sagsV61Uncommitted:TEST:F1:stale:manual',JSON.stringify({field:'stale',part:'manual',value:'SAME'}));
envelopeReads=0;assert.equal(api.pending().length,41);assert.equal(envelopeReads,1,'41 pending fields share one envelope read');assert(!data.has('sagsV61Uncommitted:TEST:F1:stale:manual'));
c.activeFlightSessionId='F2';assert.equal(api.read('notes'),null);api.record('notes','SECOND');c.activeFlightSessionId='F1';assert.equal(api.read('notes').value,'NEW');
// Detached drawing publishes once per page rather than once per SVG field.
const drawSource=read('app/boot/05-legacy.js'),draw=find(drawSource,n=>n.type==='FunctionDeclaration'&&n.id?.name==='draw');
const {svgDOM}=require('./helpers/svg-dom.cjs'),dom=svgDOM();dom.createPage(1);dom.createPage(2);
const d={window:{},state:{a:true,b:true,bbbtManualV18:true},fields:[{page:1,key:'a',type:'displayCheck'},{page:2,key:'b',type:'displayCheck'}],activeKey:null,BASE_W:1241,BASE_H:1755,cancelPendingTouchHit(){},sagsBindSvgHitEvents(){},getActiveFlightMainForm:()=> 'fsags',abs:()=>({tickX:0,tickY:0}),E:dom.E,document:dom.document};
vm.createContext(d);vm.runInContext(find(drawSource,n=>n.type==='FunctionDeclaration'&&n.id?.name==='sagsBeginSvgDraw')+';'+draw,d);d.draw();assert.equal(dom.stats.replaced,2);assert.equal(dom.pages.get('svg1').nodes.length,1);
console.log('V2.5.33 input: FINAL one atomic write, validation/failure intact; 41 drafts one envelope read; flight isolation; batched SVG passed');
// Idle dock must not mutate the observed body/style on every animation frame.
let removals=0,styleWrites=0;const styles=new Map();
const dock={matchMedia:()=>({matches:true}),document:{readyState:'loading',body:{classList:{contains:()=>false,toggle(){},remove(){removals++}}},documentElement:{style:{getPropertyValue:k=>styles.get(k)||'',setProperty:(k,v)=>{styleWrites++;styles.set(k,v)}}},getElementById:()=>null,addEventListener(){}},addEventListener(){},setTimeout(){},Map};dock.window=dock;vm.createContext(dock);vm.runInContext(read('app/modules/mobile-form-dock.v2.js'),dock);dock.sagsV26SyncMobileFormDock();dock.sagsV26SyncMobileFormDock();assert.equal(removals,0);assert.equal(styleWrites,1,'unchanged height is not written again');

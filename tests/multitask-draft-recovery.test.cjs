const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),acorn=require('acorn');
const read=p=>fs.readFileSync(p,'utf8');
function fn(source,name){let found;function walk(n){if(!n||typeof n!=='object')return;if(n.type==='FunctionDeclaration'&&n.id.name===name)found=source.slice(n.start,n.end);if(n.type==='VariableDeclarator'&&n.id.name===name)found='const '+source.slice(n.start,n.end)+';';for(const v of Object.values(n))if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v)}walk(acorn.parse(source,{ecmaVersion:'latest'}));assert.ok(found,name);return found}
function storage(){const map=new Map();return {map,get length(){return map.size},key:i=>[...map.keys()][i],getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)}}
// Run the actual local recovery module, without timers or unload promises.
function core(local=storage()){
 const events={},docEvents={};const textarea={value:''},entry={style:{display:'flex'}};let envelope={state:{}};
 const c={console,localStorage:local,sessionStorage:storage(),navigator:{onLine:false},state:{},editing:{key:'remarks'},activeFlightSessionId:'A',currentUserProfile:{username:'USER'},sagsOwnedPrefix:p=>p+'USER:',readFlightSessionEnvelope:()=>envelope,persist:()=>{envelope={state:JSON.parse(JSON.stringify(c.state))}},getComputedStyle:()=>({display:'flex'}),setInterval(){},setTimeout(){},
 document:{readyState:'loading',hidden:false,addEventListener:(n,f)=>(docEvents[n]??=[]).push(f),getElementById:id=>id==='entryText'?textarea:id==='entry'?entry:null},addEventListener:(n,f)=>(events[n]??=[]).push(f)};
 c.window=c;vm.createContext(c);vm.runInContext(read('app/modules/stability.v6-core.js'),c);
 return {c,textarea,local,emit:(n,doc=false)=>{for(const f of (doc?docEvents:events)[n]||[])f()}};
}
for(const event of ['blur','pagehide','freeze','visibilitychange']){
 const t=core();t.textarea.value='ĐANG NHẬP 12';t.c.document.hidden=true;
 let quick=0,mobile=0,pvhk=0;t.c.sagsQuickEntrySnapshot=()=>quick++;t.c.SAGSFS09DraftSnapshot=()=>pvhk++;t.c.SAGSMobileDraftRecovery={snapshotVisibleDirty:()=>mobile++};
 t.emit(event,['freeze','visibilitychange'].includes(event));
 assert.equal(t.c.sagsV61Draft.read('remarks').value,'ĐANG NHẬP 12',event);assert.equal(quick,1);assert.equal(mobile,1);assert.equal(pvhk,1);
 const restarted=core(t.local);assert.equal(restarted.c.sagsV61Draft.read('remarks').value,'ĐANG NHẬP 12');
 restarted.c.activeFlightSessionId='B';assert.equal(restarted.c.sagsV61Draft.read('remarks'),null,'flight separation');
}
// Manual lifecycle saves go through the public pipeline (also mirrored by V2).
{
 const t=core();let calls=0;const record=t.c.sagsV61Draft.record;t.c.sagsV61Draft.record=(...args)=>{calls++;return record(...args)};t.textarea.value='unfinished';t.c.sagsV61Draft.saveManualNow();assert.equal(calls,1);
}
// PVHK: full module, real init/input/toggle/save, durable rows survive restart.
function pvhk(drafts=new Map()){
 const modal={style:{display:'none'}},alerts=[];let fail=false,saves=0;
 const c={console,state:{f09_ckiADL:'10'},activeFormGroup:'fsags09',getComputedStyle:el=>el.style,
 document:{getElementById:id=>id==='fs09QuickModal'?modal:null,querySelectorAll:()=>[],body:{classList:{add(){},remove(){}}}},
 sagsV61Draft:{contextKey:()=>c.scope,read:(k,p)=>drafts.get(c.scope+'|'+k+'|'+p),record:(k,v,p)=>drafts.set(c.scope+'|'+k+'|'+p,{value:String(v)}),forget:(k,p)=>drafts.delete(c.scope+'|'+k+'|'+p)},scope:'USER:A',
 persist(){if(fail)throw Error('quota');saves++},draw(){},v121RefreshValidation(){},alert:m=>alerts.push(m),nowHHMM:()=> '20:15'};
 c.window=c;vm.createContext(c);vm.runInContext(read('app/boot/19-v183-fs09-quick.js'),c);c.openFS09QuickPanel();
 return {c,drafts,alerts,setFail:v=>fail=v,saves:()=>saves};
}
{
 const t=pvhk();t.c.fs09qDataChanged({dataset:{key:'f09_ckiADL'},value:'123'});t.c.fs09qToggle('f09_postMessage');t.c.fs09qNow('f09_mon_boardingActualStart');
 assert.equal(t.drafts.get('USER:A|f09_ckiADL|mobile-fs09').value,'123');
 const resumed=pvhk(t.drafts);resumed.c.fs09qSave();assert.equal(resumed.c.state.f09_ckiADL,'123');assert.equal(resumed.c.state.f09_postMessage,true);assert.equal(resumed.c.state.f09_mon_boardingActualStart,'20:15');assert.equal(resumed.drafts.size,0);
 // A failed persist cannot clear drafts, mutate official state, or claim success.
 const failed=pvhk();failed.c.fs09qDataChanged({dataset:{key:'f09_ckiADL'},value:'999'});failed.setFail(true);failed.c.fs09qSave();assert.equal(failed.c.state.f09_ckiADL,'10');assert.equal(failed.drafts.get('USER:A|f09_ckiADL|mobile-fs09').value,'999');assert.equal(failed.saves(),0);assert.equal(failed.alerts.length,1);
 failed.c.scope='USER:B';const before=failed.drafts.size;failed.c.SAGSFS09DraftSnapshot();assert.equal(failed.drafts.size,before,'old modal cannot write into another flight');
}
// Actual quick-entry display and bag parser restore digits/empty and both bag parts.
{
 const s=read('app/modules/quick-entry.v1.js'),drafts=new Map([['pax|quick',{value:'12'}],['bags|pcs',{value:'120'}],['bags|kg',{value:'23'}]]);
 const ui={};for(const k of ['heading','value','title','count','error','hint','restore','discard','prev','next'])ui[k]={value:'',focus(){},select(){}};
 const c={console,state:{pax:'10',bags:'100/2000'},ui,session:{heading:'Pax',steps:[{key:'pax',kind:'pax',label:'PAX'}],index:0,bags:new Map()},root:{sagsV61Draft:{read:(k,p)=>drafts.get(k+'|'+p)}},ensureUi:()=>ui,document:{activeElement:ui.value},matchMedia:()=>({matches:true})};vm.createContext(c);
 for(const name of ['numberText','parseBag','bagDraft','display'])vm.runInContext(fn(s,name),c);
 c.display();assert.equal(ui.value.value,'12');assert.equal(ui.restore.hidden,true);
 drafts.set('pax|quick',{value:''});c.display();assert.equal(ui.value.value,'','an intentional clear also resumes');
 const b=c.bagDraft('bags');assert.equal(b.pcs,'120');assert.equal(b.kg,'23');assert.equal(b.dirty,true);
 const start=s.indexOf('root.sagsQuickEntrySnapshot=function()'),end=s.indexOf("window.addEventListener('pagehide'",start);
 c.session.steps=[{key:'bags',kind:'bag',part:'kg'}];c.session.draftScope='USER:A';c.root.sagsV61Draft.contextKey=()=> 'USER:A';c.root.sagsV61Draft.record=(k,v,p)=>drafts.set(k+'|'+p,{value:v});ui.value.value='2345';vm.runInContext(s.slice(start,end),c);c.root.sagsQuickEntrySnapshot();assert.equal(drafts.get('bags|kg').value,'2345','snapshot must not overwrite the newest visible bag digits');
 assert.doesNotMatch(s.slice(s.indexOf('root.sagsQuickEntrySnapshot=function()')),/saveCurrent\(/,'backgrounding must preserve drafts without committing incomplete entries');
}
// A visible quick-time value is backed up even before a dirty/input marker.
{
 const events={},records=new Map();const modal={};const el={value:'201',dataset:{key:'h5Start'},matches:()=>true,closest:selector=>selector.includes('quickTimeModal')?modal:null,classList:{contains:()=>true}};
 const c={console,state:{h5Start:'20:00'},getComputedStyle:()=>({display:'flex'}),document:{querySelectorAll:()=>[el],addEventListener:(n,f)=>(events[n]??=[]).push(f)},sagsV61Draft:{read:(k,p)=>records.get(k+'|'+p),record:(k,v,p)=>records.set(k+'|'+p,{value:v}),forget:(k,p)=>records.delete(k+'|'+p),pending:()=>[]},addEventListener(){}};c.window=c;vm.createContext(c);vm.runInContext(read('app/modules/mobile-draft-recovery.v1.js'),c);
 let latest;c.qteInputChanged=e=>{latest=e.value};c.SAGSMobileDraftRecovery.snapshotVisibleDirty();assert.equal(latest,'201');assert.equal(records.get('h5Start|quickTime').value,'201');
 el.value='2015';events.compositionend[0]({target:el});assert.equal(records.get('h5Start|quickTime').value,'2015');
}
console.log('Multitask draft recovery behavior passed');

'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const reg=JSON.parse(read('forms/forms.registry.json')),boot=read('app/boot/05-legacy.js'),final=read('app/boot/06-legacy.js');
const core=read('app/core/runtime.v503hf2.bundle.js'),ship=read('app/generated/runtime-4.js'),tvj=read('app/modules/tvj-gof-035.v630.js');
assert.equal(reg.forms.length,10);
const bx=reg.forms.find(f=>f.id==='fsags423');assert(bx,'RAMP 42.3 / BX baseline');
const dataFields=(f)=>(f.fields||[]).filter(x=>!['checkbox','signature','static-text','displaycheck'].includes(String(x.type||'').toLowerCase()));
const ref=dataFields(bx)[0];assert.equal(ref.fontFamily,'Times New Roman');assert.equal(ref.fontWeight,'700');assert.equal(ref.fontSize,20);
let checked=0;for(const f of reg.forms){for(const x of dataFields(f)){assert.equal(x.fontFamily,ref.fontFamily,f.id+'/'+x.key);assert.equal(x.fontWeight,ref.fontWeight,f.id+'/'+x.key);assert.equal(x.fontSize,ref.fontSize,f.id+'/'+x.key);checked++}}
assert(checked>900);
assert.match(boot,/const renderFont=signatureNameField\?v1101AutoFitSingleLineFont/);
assert.match(boot,/v1101AutoFitSingleLineFont\(val,drawW,drawH,23,9\)/);
assert(!boot.includes('signatureNameField?"Arial, sans-serif":"Times New Roman"'));
for(const src of [core,ship])assert(!src.includes('if(signatureNameFieldV6119)st.fontFamily="Arial"'));
assert(tvj.includes('PREFIX+"noDamageFoundTime",PREFIX+"damageFoundTime"'));
assert(tvj.includes('root.__SAGS_TVJ_NEXT_EDIT_FIELD__=String(f.key)'));
assert(tvj.includes('finally{root.__SAGS_TVJ_NEXT_EDIT_FIELD__=previous}'));
const t0=tvj.indexOf('      const base=activate;'),t1=tvj.indexOf('    }catch(e){console.warn("TVJ wrap activate",e)}',t0);
assert(t0>=0&&t1>t0);
const marker=[],state={vz_noDamageFound:false,vz_damageFound:false};
const root={__SAGS_TVJ_NEXT_EDIT_FIELD__:'PREVIOUS',sagsTvjDamageChoice:()=>true};
const context={root,state,PREFIX:'vz_',PAGE:15,INS_TIME:new Map(),CHECK_GROUPS:[],now:()=>'11:30',persist(){},draw(){},setTimeout(){},console,
 activate(f){marker.push({key:f.key,flag:root.__SAGS_TVJ_NEXT_EDIT_FIELD__});}};
vm.createContext(context);vm.runInContext('try{'+tvj.slice(t0,t1)+'}catch(e){throw e}',context);
for(const key of ['vz_noDamageFoundTime','vz_damageFoundTime']){context.activate({key,page:15,type:'timeNow'});assert.equal(marker.at(-1).flag,key);assert.equal(root.__SAGS_TVJ_NEXT_EDIT_FIELD__,'PREVIOUS')}
context.activate({key:'vz_noDamageFound',page:15,type:'check'});assert.equal(state.vz_noDamageFound,true);
assert.equal(marker.length,2,'Checkbox must not enter time editor');
// FINAL: The input value is durably written immediately, while expensive
// formula repaint + layout measurements are coalesced to one frame.
assert.match(final,/ffSaveField\(form,key,upper,all\);ffLastAcceptedValue=upper;ffScheduleFinalDerivedPaint\(form,d,paxEdit\)/);
assert.match(final,/if\(ffLocalFitFrame\)return/);
assert.match(final,/ffScheduleFinalRealtimeRefresh\(isCommit\)/);
const start=final.indexOf('let ffLiveDerivedFrame=0'),end=final.indexOf('let ffDisplayFitFrame=0;',start);
assert(start>0&&end>start);
let frameCalls=0,realtime=0,derived=0,reads=0,refreshes=0;
const frames=[],timers=new Map();let seq=0;
const mocks={requestAnimationFrame:cb=>{frameCalls++;frames.push(cb);return frameCalls},
 setTimeout:(cb,ms)=>{timers.set(++seq,{cb,ms});return seq},
 clearTimeout:id=>timers.delete(id),refreshFinalRealtimeSubscription:()=>realtime++,
 ffRefreshVJFormulaDisplay:()=>derived++,ffRefreshAllFinalLoadWarning:()=>reads++,ffRefreshVUFormulaWarning:()=>{},
 ffRefreshZoneWarning:()=>{},ffRefreshZoneMaxWarning:()=>{},ffRefreshVUFormulaDisplay:()=>{},ffRefresh9GLoadDisplay:()=>{},
 ffRefreshPaxWeightDisplay:()=>{},ffScheduleFinalDisplayFit:()=>refreshes++};
vm.createContext(mocks);vm.runInContext(final.slice(start,end),mocks);
for(let i=0;i<24;i++){mocks.ffScheduleFinalDerivedPaint('forms/vj/vj2.png',{n:i},false);mocks.ffScheduleFinalRealtimeRefresh(false);}
assert.equal(frameCalls,1,'24 keystrokes should queue just one derived repaint');
assert.equal(timers.size,1,'24 keystrokes should leave only one realtime refresh timer');
assert.equal([...timers.values()][0].ms,250);
frames.shift()();assert.equal(derived,1);assert.equal(reads,1);[...timers.values()][0].cb();assert.equal(realtime,1);
console.log('RAMP BX typography: '+checked+' data fields across 10 forms; TVJ CHECKED/TIME controls; FINAL 24 keys / 1 paint + 1 realtime refresh PASS');

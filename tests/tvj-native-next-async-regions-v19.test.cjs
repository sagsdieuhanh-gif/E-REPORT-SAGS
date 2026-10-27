'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const reg=JSON.parse(read('forms/forms.registry.json')).forms.find(f=>f.id==='tvj_gof_035');
const tvj=read('app/modules/tvj-gof-035.v632.js'),browser=read('app/modules/cross-browser-entry.v1.js');
assert.equal(reg.fields.length,132);
const begin=tvj.indexOf('const TVJ_REGIONS='),mid=tvj.indexOf('let regionLabels=',begin);
const fx=vm.createContext({window:{},console});
vm.runInContext('const X="vz_",S=v=>String(v??"").trim();'+tvj.slice(begin,mid)+';this.regions=TVJ_REGIONS;',fx);
const regions=fx.regions,allByKey=new Map(reg.fields.map(f=>[f.bind,f]));
const sections=regions.map(r=>r.keys.map(key=>reg.fields.find(f=>f.key===key)).filter(Boolean)
  .map(q=>({k:q.bind,key:q.key,type:q.type==='checkbox'?'check':q.type})));
const planStart=tvj.indexOf('window.sagsTvjNextFieldKeyV19=key=>'),planEnd=tvj.indexOf('// Legacy N/A is converted only',planStart);
assert(planStart>0&&planEnd>planStart);
const scope={window:{},form:reg,preparedForm:reg,sections,TVJ_REGIONS:regions,S:v=>String(v??'').trim()};
vm.createContext(scope);vm.runInContext(tvj.slice(planStart,planEnd),scope);
const plan=scope.window.sagsTvjNextFieldKeyV19;
let traversed=0;
for(const r of regions){
  const editable=r.keys.filter(key=>!['Name','STAFF_ID'].includes(key))
    .map(k=>reg.fields.find(f=>f.key===k)).filter(q=>q&&q.type!=='checkbox');
  for(let i=0;i<editable.length;i++){
    const current=editable[i],next=editable[i+1]||null;
    assert.equal(plan(current.bind),next?.bind||null,r.id+' '+current.key+' must follow its printed rectangle');
    traversed++;
  }
}
assert.equal(traversed,111,'111 native editable TVJ cells across 14 regions incl V1.8 header times');
assert.equal(plan('vz_arrBaggagePcs'),'vz_arrBaggageKgs','PCS -> KGS never says Hết nhóm');
assert.equal(plan('vz_fwdCompartmentTime'),'vz_fwdDividerNetTime','FWD header TIME -> divider net TIME');
assert.equal(plan('vz_aftCompartmentTime'),'vz_aftDividerNetTime','AFT header TIME -> divider net TIME');
assert.equal(plan('vz_fwdDividerNetTime'),'vz_fwdAllRestraintsTime');
assert.equal(plan('vz_aftDividerNetTime'),'vz_aftAllRestraintsTime');
scope.preparedForm=null;
assert.equal(plan('vz_arrBaggagePcs'),undefined,'initial loading is not end-of-group');
scope.preparedForm=reg;
const nextStart=browser.indexOf('  function regionNext(current){');
const nextEnd=browser.indexOf('  root.sagsEntryRegions=',nextStart);
assert(nextStart>0&&nextEnd>nextStart);
const runtimeFields=reg.fields.map(q=>({key:q.bind,page:15,type:q.type==='checkbox'?'check':q.type==='time'?'timeNow':q.type==='date'?'dateAuto':q.type,w:q.w,h:q.h})).reverse();
const root={sagsTvjNextFieldKeyV19:plan,sagsTvjEntryRegionV2539:fx.window.sagsTvjEntryRegionV2539};
const inner={root,fieldList:()=>runtimeFields,tvjRegion:f=>root.sagsTvjEntryRegionV2539?.(f?.key),regionFields:()=>[],console};
vm.createContext(inner);vm.runInContext(browser.slice(nextStart,nextEnd)+';this.next=regionNext;',inner);
const stale={key:'vz_arrBaggagePcs',page:15,type:'number',w:0,h:0};
assert.equal(inner.next(stale)?.key,'vz_arrBaggageKgs','stale original hit reference still uses printed order');
const last={key:'vz_arrCargoLoadedIn',page:15,type:'timeNow',w:.1,h:.01};
assert.equal(inner.next(last),null,'real printed rectangle end stays an end');
const removed=runtimeFields.findIndex(f=>f.key==='vz_arrBaggageKgs');
const missing=runtimeFields.splice(removed,1)[0];
assert.equal(inner.next(stale),null,'missing next while registry is mounting must not skip the required field');
const buttonStart=browser.indexOf('  function updateNextButton(){'),buttonEnd=browser.indexOf('  function installEntryPreviewCss(){',buttonStart);
assert(buttonStart>0&&buttonEnd>buttonStart);
const btn={disabled:null,style:{},title:'',textContent:''};
let ensureCalls=0;
const ui={document:{getElementById:id=>id==='sagsEntryNextBtn'?btn:null},root:{...root,sagsTvjEnsureFieldsV19:()=>{ensureCalls++;return Promise.resolve()}},editing:stale,nextField:inner.next,regionOf:()=>({title:'ARRIVAL FLIGHT'})};
vm.createContext(ui);vm.runInContext(browser.slice(buttonStart,buttonEnd)+';this.update=updateNextButton;',ui);
ui.update();
assert.equal(btn.textContent,'Đang tải nhóm…','missing field must NOT show Hết nhóm');
assert(ensureCalls>0,'pending TVJ group must request field initialization');
runtimeFields.push(missing);
ui.update();
assert.equal(btn.textContent,'Tiếp trong nhóm ›');
assert.equal(btn.disabled,false);
ui.editing=last;ui.update();
assert.equal(btn.textContent,'Hết nhóm','only actual last editable input ends its rectangle');
assert(browser.includes("root.addEventListener?.('sags:tvj-regions-ready',updateNextButton"),'Next must refresh when async TVJ registry completes');
assert(tvj.includes("new Event('sags:tvj-regions-ready')"),'TVJ must notify readiness');
console.log('TVJ V1.9 native NEXT: '+traversed+' fields, cached reorder/stale editor/async registry and true group ends PASS');

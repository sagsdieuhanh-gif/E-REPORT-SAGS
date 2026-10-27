'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const reg=JSON.parse(read('forms/forms.registry.json')),tvj=reg.forms.find(f=>f.id==='tvj_gof_035');
assert.equal(tvj.fields.length,132);
const headerKeys=['fwdCompartmentChecked','fwdCompartmentTime','aftCompartmentChecked','aftCompartmentTime'];
const byKey=k=>tvj.fields.find(f=>f.key===k);
for(const k of headerKeys){const f=byKey(k);assert(f,'missing '+k);assert.equal(f.bind,'vz_'+k);assert.equal(f.pageId,'p1');assert.equal(f.fontFamily,'Times New Roman');assert.equal(f.fontWeight,'700');assert.equal(f.type,k.endsWith('Checked')?'checkbox':'time')}
for(const prefix of ['fwd','aft']){
 const check=byKey(prefix+'CompartmentChecked'),time=byKey(prefix+'CompartmentTime'),next=byKey(prefix+'DividerNet');
 assert(check.y+check.h<=next.y,'section header check must not overlap divider row');
 assert(time.y+time.h<=byKey(prefix+'DividerNetTime').y,'section header time must not overlap divider time');
 assert.equal(check.x,next.x);assert.equal(time.x,byKey(prefix+'DividerNetTime').x);
 const gap=next.y-check.y;assert(gap>.015&&gap<.018,'heading must be one row above divider');
}
const quick=read('app/modules/tvj-gof-035.v632.js');
const begin=quick.indexOf('const TVJ_REGIONS='),end=quick.indexOf('let regionLabels=',begin);
const rctx={window:{},console,X:'vz_',S:v=>String(v??'').trim()};
vm.createContext(rctx);vm.runInContext(quick.slice(begin,end)+';this.regions=TVJ_REGIONS;',rctx);
const inspect=rctx.regions.find(x=>x.id==='inspection');
assert.equal(inspect.keys.length,22);
for(const k of headerKeys)assert(inspect.keys.includes(k),'quick editor must include '+k);
assert(inspect.keys.indexOf('fwdCompartmentChecked')<inspect.keys.indexOf('fwdDividerNet'));
assert(inspect.keys.indexOf('aftCompartmentChecked')<inspect.keys.indexOf('aftDividerNet'));
const native=read('app/modules/tvj-gof-035.v630.js');
const wrapperStart=native.indexOf('    try{\n      const base=activate;'),wrapperEnd=native.indexOf('    try{\n      const base=updateFormMenuForCurrentFlight;',wrapperStart);
assert(wrapperStart>0&&wrapperEnd>wrapperStart);
const states={},calls=[];let persists=0,draws=0;
const root={__SAGS_TVJ_NEXT_EDIT_FIELD__:'unchanged'};
const c={root,state:states,PREFIX:'vz_',PAGE:15,CHECK_GROUPS:[],INS_TIME:new Map(),now:()=>'15:15',
 persist(){persists++},draw(){draws++},setTimeout(){},console,activate(f){calls.push({key:f.key,flag:root.__SAGS_TVJ_NEXT_EDIT_FIELD__})}};
vm.createContext(c);vm.runInContext(native.slice(wrapperStart,wrapperEnd),c);
for(const prefix of ['fwd','aft']){
 const ck='vz_'+prefix+'CompartmentChecked',tm='vz_'+prefix+'CompartmentTime';
 c.activate({page:15,key:ck,type:'check'});assert.equal(states[ck],true);
 assert.equal(states[tm],undefined,'checking header must leave editable time blank');
 c.activate({page:15,key:tm,type:'timeNow'});assert.equal(calls.at(-1).key,tm);
 assert.equal(calls.at(-1).flag,tm,'header time must enter native HH:MM editor');
 assert.equal(root.__SAGS_TVJ_NEXT_EDIT_FIELD__,'unchanged','time editor flag must restore');
}
assert.equal(persists,2);assert.equal(draws,2);
// Printed '-' are preserved only while empty and must disappear after values are entered.
const canonical=read('app/core/runtime.v503hf2.bundle.js'),shipped=read('app/generated/runtime-4.js');
const extract=s=>{const a=s.indexOf('function fmPaintCanonicalPageV495('),b=s.indexOf('function fmManagedPageV495(',a);assert(a>0&&b>a);return s.slice(a,b)};
assert.equal(extract(canonical),extract(shipped));
const pctx={fmNormalizeFieldV487:x=>x,fmStyleV487:x=>({fontSize:20,fontStyle:'normal',fontWeight:'700',fontFamily:'Times New Roman',textColor:'#003b8e',align:x.align||'center',lineHeight:1.08,letterSpacing:0}),fmIsMultiV489:()=>false,fmV6119Baseline:(f,st,p,y,h)=>y+h/2,fmV6119DrawLine:(ctx,v,x,y)=>ctx.fillText(v,x,y),pageNoV45:()=>15};
vm.createContext(pctx);vm.runInContext(extract(canonical)+';this.paint=fmPaintCanonicalPageV495;',pctx);
let prints=[],masks=[];const canvas={canvas:{width:1241,height:1755},save(){},restore(){},scale(){},beginPath(){},rect(){},clip(){},fillStyle:'',textAlign:'',textBaseline:'',font:'',measureText(s){return {width:String(s).length*10}},fillRect(...args){masks.push(args)},fillText(v){prints.push(String(v))}};
pctx.paint(canvas,tvj,tvj.pages[0],()=>undefined);
assert.equal(prints.filter(x=>x==='-').length,4,'4 blank header cells show minus marker');
prints=[];masks=[];
const data={vz_fwdCompartmentChecked:true,vz_fwdCompartmentTime:'14:10',vz_aftCompartmentChecked:true,vz_aftCompartmentTime:'14:11'};
pctx.paint(canvas,tvj,tvj.pages[0],f=>data[f.bind]);
assert.equal(prints.filter(x=>x==='-').length,0,'no dash may overwrite entered header cells in PDF');
assert.equal(prints.filter(x=>x==='✓').length,2);
assert(prints.includes('14:10')&&prints.includes('14:11'));
assert.equal(masks.length,4,'hide printed dashes below four entered values');
assert(read('app/boot/05-legacy.js').includes('vz_fwdCompartment(?:Checked|Time)|vz_aftCompartment(?:Checked|Time)'),'live SVG must cover dash before text');
console.log('V1.8 PASS: two FWD/AFT header rows, Checked ✓ independently, Time explicit input, quick editor, SVG/PDF with no overlapping dash');

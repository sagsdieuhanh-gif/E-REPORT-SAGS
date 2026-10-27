'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const registry=JSON.parse(fs.readFileSync('forms/forms.registry.json','utf8'));
const tvj=registry.forms.find(f=>f.id==='tvj_gof_035');
assert(tvj&&tvj.fields.length===128,'TVJ field contract must remain 128');
const get=k=>tvj.fields.find(x=>x.key===k);
const name=get('Name'),staff=get('STAFF_ID');
assert.ok(name&&staff);assert.equal(name.bind,'acuStart_copy');
assert(Math.abs((name.y+name.h/2)-(staff.y+staff.h/2))<0.00001,'NAME must be on same printed baseline as STAFF ID');
assert(name.h<0.02,'NAME cannot have oversized box extending below NAME line');
const canonical=fs.readFileSync('app/core/runtime.v503hf2.bundle.js','utf8');
const generated=fs.readFileSync('app/generated/runtime-4.js','utf8');
const extract=s=>{let st=s.indexOf('function fmPaintCanonicalPageV495('),en=s.indexOf('function fmManagedPageV495(',st);assert(st>0&&en>st);return s.slice(st,en)};
assert.equal(extract(canonical),extract(generated),'Live Canvas/PDF painter must be identical to source');
const paints=[];const ctx={canvas:{width:1241,height:1755},font:'',textAlign:'',textBaseline:'',fillStyle:'',letterSpacing:'',
 save(){},restore(){},scale(){},beginPath(){},rect(){},clip(){},
 measureText(s){const px=Number(this.font.match(/(\d+(?:\.\d+)?)px/)?.[1]||20);return {width:[...String(s)].length*px*.55}},
 fillText(value,x,y,maxWidth){paints.push({value,x,y,maxWidth,align:this.textAlign,font:this.font})}};
const testContext={fmNormalizeFieldV487:x=>x,fmStyleV487:x=>({fontSize:Number(x.fontSize)||20,fontStyle:'normal',fontWeight:700,fontFamily:'Times New Roman',textColor:'#003b8e',align:x.align||'center',letterSpacing:0,lineHeight:1.08}),fmIsMultiV489:()=>false,fmV6119Baseline:(fld,st,page,y,h)=>y+h/2,fmV6119DrawLine(ctx,v,x,y){ctx.fillText(v,x,y)},pageNoV45:()=>15};
vm.createContext(testContext);
vm.runInContext(extract(canonical)+';this.paint=fmPaintCanonicalPageV495;',testContext);
const data={acuStart_copy:'NGUYỄN THANH HUYỀN',vz_notocNo:true};
testContext.paint(ctx,tvj,tvj.pages[0],fld=>data[fld.bind]);
assert.equal(paints.filter(x=>x.value==='-').length,4,'two printed compartment headers must each have Checked and Time dash');
for(const prefix of ['fwd','aft']){
 const c=get(prefix+'DividerNet'),t=get(prefix+'DividerNetTime');
 const y=(c.y-.009)*1755;
 for(const f of [c,t])assert(paints.some(x=>x.value==='-'&&Math.abs(x.x-(f.x+f.w/2)*1241)<.01&&Math.abs(x.y-y)<.01),'exact printed '+prefix+' heading dash');
}
assert.equal(paints.filter(x=>x.value==='✓').length,1,'NOTOC NO must be checked');
let rendered=paints.find(x=>x.value==='NGUYỄN THANH HUYỀN');
assert(rendered&&rendered.maxWidth>0&&/20px/.test(rendered.font),'short NAME single-line 20px and bounded');
assert.equal(rendered.align,'center');assert(Math.abs(rendered.y-(staff.y+staff.h/2)*1755)<.02);
const v632=fs.readFileSync('app/modules/tvj-gof-035.v632.js','utf8'),v630=fs.readFileSync('app/modules/tvj-gof-035.v630.js','utf8');
const from=v632.indexOf('function defaultNotocNo(flags)'),to=v632.indexOf('const active=',from);
assert(from>0&&to>from,'single initialization helper must be present');
const makeHelper=new Function('X',v632.slice(from,to)+';return defaultNotocNo;');
const def=makeHelper('vz_');
for(const [input,result] of [
 [{},{vz_notocNo:true}],
 [{vz_notocYes:true},{vz_notocYes:true,vz_notocNo:undefined}],
 [{vz_notocYes:false,vz_notocNo:false},{vz_notocNo:true}],
 [{vz_notocYes:true,vz_notocNo:true},{vz_notocYes:true,vz_notocNo:false}]
]){
 const a={...input};def(a);
 for(const [k,v] of Object.entries(result))assert.equal(a[k],v,'NOTOC must default NO or honor YES: '+k);
}
assert(v630.includes('if(!st[PREFIX+\'notocNo\'])st[PREFIX+\'notocNo\']=true'),'Normal TVJ open seeds NO');
assert(v632.includes('const notocChanged=defaultNotocNo(state)'),'TVJ quick editor persistently seeds NO');
assert(v632.includes('defaultNotocNo(draft)'),'Quick editor NO state is initialized');
const toggleStart=v632.indexOf('window.vz632Toggle=e=>'),toggleEnd=v632.indexOf('window.vz632Now=',toggleStart);
assert(toggleStart>0&&toggleEnd>toggleStart);
const state={draft:{vz_notocNo:true,vz_notocYes:false}},buttons={};
for(const k of ['vz_notocNo','vz_notocYes'])buttons[k]={dataset:{vzk:k},classList:{toggle(){}},textContent:''};
const qctx={window:{},X:'vz_',S:s=>String(s).trim(),draft:state.draft,document:{querySelectorAll(){return Object.values(buttons)}}};
vm.createContext(qctx);vm.runInContext(v632.slice(toggleStart,toggleEnd),qctx);
qctx.window.vz632Toggle(buttons.vz_notocYes);
assert.equal(state.draft.vz_notocYes,true);assert.equal(state.draft.vz_notocNo,false);
qctx.window.vz632Toggle(buttons.vz_notocNo);
assert.equal(state.draft.vz_notocYes,false);assert.equal(state.draft.vz_notocNo,true);
assert(!v632.includes('setInterval('),'TVJ should not introduce continuous redraw polling');
console.log('TVJ NAME inline auto-fit + FWD/AFT four heading dashes + NOTOC default NO / editable exclusive YES PASS');

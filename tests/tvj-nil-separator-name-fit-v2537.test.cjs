'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const registry=JSON.parse(fs.readFileSync('forms/forms.registry.json','utf8')).forms;
const f=registry.find(x=>x.id==='tvj_gof_035');assert(f,'missing TVJ registry');
const page=f.pages.find(x=>x.runtimePage===15);assert(page,'TVJ must be runtime page 15');
const pairs=[
 ['arrBaggagePcs','arrBaggageKgs'],['arrCargoPcs','arrCargoKgs'],
 ['finalCargoPcs','finalCargoKgs'],['psaBaggagePcs','psaBaggageKgs'],
 ['offloadBagPcs','offloadBagKgs']
];
const selected=pairs.flat().concat('Name');
const fields=f.fields.filter(x=>selected.includes(x.key));
assert.equal(fields.length,11,'five paired data fields and NAME are present');
const data={acuStart_copy:'TRẦN THỊ NGỌC PHƯƠNG HUYỀN TRANG'};
for(const fld of fields)if(fld.key!=='Name')data[fld.bind]='NIL';
const src=fs.readFileSync('app/core/runtime.v503hf2.bundle.js','utf8');
const generated=fs.readFileSync('app/generated/runtime-4.js','utf8');
const marker='function fmPaintCanonicalPageV495(',endMarker='function fmManagedPageV495(';
const segment=s=>{const a=s.indexOf(marker),b=s.indexOf(endMarker,a);
 assert(a>0&&b>a,'canonical painter available');return s.slice(a,b)};
assert.equal(segment(src),segment(generated),'deployed generated painter must match canonical source');
assert.match(src,/root\.sagsV495PaintCanonicalPage=\(ctx,pageNo\)=>/);
assert.match(fs.readFileSync('app/modules/form-registry-runtime.v647.js','utf8'),/root\.sagsV495PaintCanonicalPage\?\.\(ctx,pageNo\)/);
const draws=[];
const ctx={canvas:{width:1241,height:1755},font:'',letterSpacing:'',fillStyle:'',textAlign:'',textBaseline:'',
 save(){},restore(){},scale(){},beginPath(){},rect(){},clip(){},
 measureText(value){const fontsize=Number(this.font.match(/(\d+(?:\.\d+)?)px/)?.[1]||20);
  return {width:[...String(value)].length*fontsize*.55}},
 fillText(value,x,y,maxWidth){draws.push({value,x,y,maxWidth,font:this.font,align:this.textAlign,baseline:this.textBaseline})}
};
const sandbox={fmNormalizeFieldV487:x=>x,fmStyleV487:x=>({
 fontStyle:'normal',fontWeight:700,fontSize:Number(x.fontSize)||20,fontFamily:'Times New Roman',
 letterSpacing:0,lineHeight:1.08,align:x.align||'left',textColor:'#003b8e'
}),fmIsMultiV489:()=>false,fmV6119Baseline:(fld,st,pg,py,h)=>py+h/2,
 fmV6119DrawLine(ctx,v,x,y){ctx.fillText(v,x,y)},pageNoV45:()=>15};
vm.createContext(sandbox);vm.runInContext(segment(src)+';this.paint=fmPaintCanonicalPageV495',sandbox);
function paint(){draws.length=0;sandbox.paint(ctx,{id:f.id,fields},page,fld=>data[fld.bind])}
paint();
assert.equal(draws.filter(x=>x.value==='/').length,5,'canonical canvas draws 5 real separators');
assert.equal(draws.filter(x=>x.value==='NIL').length,10,'all 10 NIL values remain separate');
assert.equal(draws.filter(x=>x.value==='TRẦN THỊ NGỌC PHƯƠNG HUYỀN TRANG').length,1);
let name=draws.find(x=>x.value==='TRẦN THỊ NGỌC PHƯƠNG HUYỀN TRANG');
assert.equal(name.align,'center');assert.equal(name.baseline,'middle');
assert(name.maxWidth>0,'single-line NAME always has an explicit width limit');
data.acuStart_copy=('TRẦN THỊ NGỌC PHƯƠNG HUYỀN TRANG ').repeat(5).trim();
paint();name=draws.find(x=>x.value===data.acuStart_copy);
assert(name&&name.maxWidth>0,'very long NAME must remain complete on one line');
assert.match(name.font,/\b8px\b/,'long NAME shrinks to minimum font before canvas maxWidth fit');
data.acuStart_copy='NGUYỄN VĂN KIÊN';paint();name=draws.find(x=>x.value===data.acuStart_copy);
assert(name&&name.font.includes('20px'),'short NAME should not shrink');
for(const fld of fields)if(fld.key!=='Name')delete data[fld.bind];
paint();assert.equal(draws.filter(x=>x.value==='/').length,0,'blank PCS/KGS needs no separator');
console.log('TVJ authoritative Canvas/PDF: 5 NIL / NIL separators, single-line fitted NAME and generated runtime parity PASS');

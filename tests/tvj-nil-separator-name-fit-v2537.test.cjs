'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const js=fs.readFileSync('app/boot/05-legacy.js','utf8');
const forms=JSON.parse(fs.readFileSync('forms/forms.registry.json','utf8')).forms;
const tvj=forms.find(f=>f.id==='tvj_gof_035');
assert(tvj&&tvj.fields.length===128,'TVJ form registry must contain 128 fields');
const pairs=[
 ['arrBaggagePcs','arrBaggageKgs'],
 ['arrCargoPcs','arrCargoKgs'],
 ['finalCargoPcs','finalCargoKgs'],
 ['psaBaggagePcs','psaBaggageKgs'],
 ['offloadBagPcs','offloadBagKgs']
];
const map=new Map(tvj.fields.map(f=>[f.key,f]));
const runtime=(keys)=>keys.map(k=>{const f=map.get(k);assert(f,'missing '+k);return {
  page:15,key:f.bind,type:f.type,x:f.x,y:f.y,w:f.w,h:f.h,
  vx:f.x,vy:f.y,vw:f.w,vh:f.h,font:f.fontSize,align:f.align,
  valign:f.valign,leftValue:f.align==='left'
};});
const keys=pairs.flat(),fields=runtime(keys.concat(['Name']));
const state={bbbtManualV18:true};
for(const key of keys)state[map.get(key).bind]='NIL';
state.acuStart_copy='TRẦN THỊ NGỌC PHƯƠNG HUYỀN TRANG';
const nodes=new Map();
const node=(tag,attrs={})=>({tag,attrs:{...attrs},children:[],textContent:'',
  setAttribute(k,v){this.attrs[k]=v},appendChild(child){this.children.push(child)}});
const svg15={children:[],replaceChildren(frag){this.children=frag.children.slice()}};
const document={getElementById:id=>id==='svg15'?svg15:null,
  createDocumentFragment:()=>node('fragment'),createElement:tag=>tag==='canvas'?{
    getContext:()=>({font:'700 20px "Times New Roman"',
      measureText:s=>({width:[...String(s)].length*15})})
  }:node(tag)};
const start=js.indexOf('// TVJ-GOF-035: preserve each PCS/KGS');
const end=js.indexOf('function todayDDMMYYYY()',start);
const fitStart=js.indexOf('function v1101AutoFitSingleLineFont(');
const fitEnd=js.indexOf('function v1101AutoFitMultilineFont(',fitStart);
assert(start>=0&&end>start&&fitStart>=0&&fitEnd>fitStart,'TVJ rendering hooks present');
const sandbox={document,fields,state,window:{},cancelPendingTouchHit(){},
  sagsBindSvgHitEvents(){},getActiveFlightMainForm:()=> 'fsags',
  abs:f=>({x:f.x*1241,y:f.y*1755,w:f.w*1241,h:f.h*1755,
    vx:f.vx*1241,vy:f.vy*1755,vw:f.vw*1241,vh:f.vh*1755}),
  E:node,BASE_W:1241,BASE_H:1755,activeKey:null,V1101_FONT23_PAGES:new Set(),
  sagsCachedTextWidth:(ctx,t)=>ctx.measureText(t).width};
vm.createContext(sandbox);
vm.runInContext(js.slice(fitStart,fitEnd)+'\n'+js.slice(start,end)+'\nthis.run=draw;',sandbox);
sandbox.run();
let separators=svg15.children.filter(x=>x.attrs['data-tvj-separator']);
assert.equal(separators.length,5,'five PCS/KGS physical pairs receive exactly one separator');
assert(separators.every(x=>x.textContent==='/'&&x.attrs.class.includes('value')));
assert.equal(state.vz_arrBaggagePcs,'NIL');
assert.equal(state.vz_arrBaggageKgs,'NIL');
const textFor=key=>svg15.children.find(x=>x.attrs['data-field-key']===key&&x.tag==='text');
let name=textFor('acuStart_copy');
assert(name,'NAME must be rendered from the bound account identity');
assert.equal(name.textContent,'TRẦN THỊ NGỌC PHƯƠNG HUYỀN TRANG');
assert.equal(name.attrs['text-anchor'],'middle');
assert.equal(name.attrs['dominant-baseline'],'middle');
assert(Number(name.attrs['font-size'])<20,'NAME should reduce font size for a long name');
assert(name.attrs.textLength,'extremely long NAME is horizontally fitted rather than cropped');
state.acuStart_copy='NGUYỄN VĂN KIÊN';
sandbox.run();
name=textFor('acuStart_copy');
assert.equal(name.textContent,'NGUYỄN VĂN KIÊN');
assert(!name.attrs.textLength,'short NAME does not need forced stretching or compression');
for(const key of keys)delete state[map.get(key).bind];
sandbox.run();separators=svg15.children.filter(x=>x.attrs['data-tvj-separator']);
assert.equal(separators.length,0,'blank pairs should not gain a visual separator');
assert.equal(state.acuStart_copy,'NGUYỄN VĂN KIÊN','account NAME remains intact');
console.log('TVJ PCS/KGS: 5 NIL / NIL separators, no data merge, PDF SVG class intact, single-line auto-fit NAME PASS');

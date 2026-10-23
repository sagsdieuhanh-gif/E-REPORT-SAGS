'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),acorn=require('acorn');
const {svgDOM}=require('./helpers/svg-dom.cjs');
const source=fs.readFileSync('app/boot/05-legacy.js','utf8'),ast=acorn.parse(source,{ecmaVersion:'latest'});
const fn=name=>{const n=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);assert(n,name);return source.slice(n.start,n.end)};
const draw=fn('draw');
// The same canonical rendering body, with the V2.5.36 full-page publication path,
// is the reference. Compare resulting SVG after real values/layout/selection edits.
const reference=draw.replace('function draw()','function referenceDraw()')
 .replace('const __sagsSvgDraw=sagsBeginSvgDraw(fields,mainForm);','const fragments=new Map();for(const f of fields){const page=Number(f.page);if(!fragments.has(page)&&document.getElementById("svg"+page))fragments.set(page,document.createDocumentFragment())}')
 .replace('svg=__sagsSvgDraw.field(f,a,state[f.key],activeKey===f.key)','svg=fragments.get(Number(f.page))')
 .replace('__sagsSvgDraw.commit();','for(const [page,fragment]of fragments)document.getElementById("svg"+page).replaceChildren(fragment);');
assert(!reference.includes('__sagsSvgDraw'));
const helpers=ast.body.filter(n=>n.type==='FunctionDeclaration'&&!['draw','E'].includes(n.id.name)).map(n=>source.slice(n.start,n.end)).join('\n');
function client(fields,state,main='fsags'){
 const dom=svgDOM();for(const page of new Set(fields.map(f=>f.page)))dom.createPage(page);
 const c={window:null,document:dom.document,E:dom.E,state,fields,activeKey:null,activeFlightSessionId:'A',BASE_W:1241,BASE_H:1755,ENTRY_COLOR:'#003B8E',SAGS_V6120_RULE_GAP:4,V1101_FONT23_PAGES:new Set([1,2,6,7,9,10]),console};c.window=c;
 vm.createContext(c);vm.runInContext(helpers+';'+draw+';'+reference,c);c.cancelPendingTouchHit=()=>{};c.sagsBindSvgHitEvents=()=>{};c.getActiveFlightMainForm=()=>main;
 return {c,dom};
}
function tree(n){return {tag:n.tagName,attrs:n.attrs,style:n.style,text:n.textContent||'',children:n.childNodes.filter(n=>n.nodeType!==8).map(tree)}}
function compare(a,b){for(const [id,page]of a.dom.pages)assert.deepEqual(tree(page),tree(b.dom.pages.get(id)),id)}
const registry=JSON.parse(fs.readFileSync('forms/forms.registry.json','utf8'));
let total=0;
for(const form of registry.forms){
 const fields=form.fields.map(f=>({...f,key:f.bind||f.key,page:Number(f.sourcePage)||1,type:f.sourceType||f.type,font:f.fontSize||16,vx:f.x,vy:f.y,vw:f.w,vh:f.h,tickX:f.x+f.w/2,tickY:f.y+f.h/2,multiline:!!f.sourceMultiline}));
 const state={bbbtManualV18:true};for(const f of fields)state[f.key]=['check','displayCheck','checkbox'].includes(f.type)?true:f.type==='signature'?'data:image/png;base64,aBcD':'NGUYỄN TRUNG KIÊN / 123\nGHI CHÚ';
 const a=client(structuredClone(fields),structuredClone(state),form.id),b=client(structuredClone(fields),structuredClone(state),form.id);
 a.c.draw();b.c.referenceDraw();compare(a,b);
 const before={...a.dom.stats};a.c.draw();compare(a,b);assert.equal(a.dom.stats.created,before.created,form.id+' unchanged creates no SVG nodes');assert.equal(a.dom.stats.replaced,before.replaced);assert.equal(a.dom.stats.inserted,before.inserted);assert.equal(a.dom.stats.removed,before.removed);
 for(const action of [
  c=>{c.state[c.fields[0].key]='THAY ĐỔI'},
  c=>{c.activeKey=c.fields[1].key},
  c=>{c.activeKey=c.fields[2].key},
  c=>{delete c.state[c.fields[0].key]},
  c=>{c.fields[1].x+=.001;c.fields[1].vx+=.001;c.fields[1].font=12},
  c=>{c.fields=[...c.fields].reverse()},
  c=>{c.fields=c.fields.slice(1)},
  c=>{c.activeFlightSessionId='B'},
  c=>{c.document.fonts.size++}
 ]){action(a.c);action(b.c);a.c.draw();b.c.referenceDraw();compare(a,b)}
 // Another renderer may replace/remove SVG nodes; next draw repairs the page.
 const page=[...a.dom.pages.values()][0];page.nodes[0]?.remove();a.c.draw();b.c.referenceDraw();compare(a,b);
 total+=fields.length;
}
// A single edit in a large page creates only its two nodes, not all 2,000.
const fields=Array.from({length:1000},(_,i)=>({page:1,key:'k'+i,type:'text',font:16,x:0,y:0,w:.1,h:.01,vx:0,vy:0,vw:.1,vh:.01}));
const state=Object.fromEntries(fields.map(f=>[f.key,'VALUE']));state.bbbtManualV18=true;
const a=client(fields,state);a.c.draw();const created=a.dom.stats.created,replaced=a.dom.stats.replaced;const untouched=a.dom.pages.get('svg1').nodes[2];a.c.state.k0='EDIT';a.c.draw();assert.equal(a.dom.stats.created-created,2);assert.equal(a.dom.stats.replaced,replaced);assert(a.dom.pages.get('svg1').nodes.includes(untouched));
// A refreshed schema object must also refresh the delegated event's field ref.
const oldField=a.c.fields[1];a.c.fields[1]={...oldField};a.c.draw();const hit=a.dom.pages.get('svg1').nodes.find(n=>n.__sagsHitField?.key==='k1');assert.equal(hit.__sagsHitField,a.c.fields[1]);
// Font loading forces a rebuild of the measured values until fonts settle.
a.c.document.fonts.status='loading';let n=a.dom.stats.created;a.c.draw();assert(a.dom.stats.created>n);
console.log(`Incremental SVG: ${registry.forms.length} forms / ${total} fields match full redraw after edits, selection, layout, reorder, deletion, flight/font changes and external node removal. 1,000-field single edit creates 2 nodes instead of 2,000; unchanged draw creates/mutates zero nodes.`);

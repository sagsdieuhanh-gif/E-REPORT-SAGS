'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),acorn=require('acorn');
const source=fs.readFileSync('app/core/runtime.v503hf2.bundle.js','utf8');
const generated=fs.readFileSync('app/generated/runtime-5.js','utf8');
const boot=fs.readFileSync('app/boot/05-legacy.js','utf8');
const ast=acorn.parse(source,{ecmaVersion:'latest'});
const functions=new Map();
function scan(n){if(!n||typeof n!=='object')return;if(n.type==='FunctionDeclaration')functions.set(n.id.name,source.slice(n.start,n.end));
  for(const [key,v] of Object.entries(n))if(key!=='start'&&key!=='end')if(Array.isArray(v))v.forEach(scan);else if(v&&typeof v==='object')scan(v);}
scan(ast);
for(const name of ['sagsPdfExactSvgOverlay','fastPage']){
  const code=functions.get(name);assert(code,'canonical '+name+' should exist');
  assert(generated.includes(code),'generated release must ship exact '+name);
}
assert(boot.includes('"data-sags-tvj-dash-mask":"1"'),'TVJ mask should be marked as canonical PDF duplicate');
assert(functions.get('sagsPdfExactSvgOverlay').includes('image,[data-sags-tvj-dash-mask]'),'managed overlay removes duplicated TVJ mask');
let serializations=0,svgLoads=0;
function fakeSvg(graphics){
 const clone={
  querySelectorAll(){return []},
  querySelector(sel){assert(sel.includes('path')&&sel.includes('rect'),'check all drawable shapes');return graphics?{}:null},
  setAttribute(){},getAttribute(){return '0 0 1241 1755'},
  insertBefore(){},firstChild:null
 };
 return {cloneNode(){return clone}};
}
const doc={createElementNS:()=>({textContent:''})};
const ctx={root:{sagsV495ManagedPage:()=>true},document:doc,
 sanitizeSvgForExport(){},baseW:()=>1241,baseH:()=>1755,ENTRY_COLOR:'#003b8e',
 XMLSerializer:class{serializeToString(){serializations++;return '<svg><path d="M0 0"/></svg>'}},
 v479LoadSvgOverlay:async()=>{svgLoads++;return {width:1241,height:1755}},
 console};
vm.createContext(ctx);
vm.runInContext(functions.get('sagsPdfExactSvgOverlay')+';this.run=sagsPdfExactSvgOverlay;',ctx);
(async()=>{
 assert.equal(await ctx.run(fakeSvg(false),15),null,'TVJ with only canonical field nodes should skip empty SVG rasterization');
 assert.equal(serializations,0);assert.equal(svgLoads,0);
 const image=await ctx.run(fakeSvg(true),15);
 assert.equal(image.width,1241,'non-canonical graphics retained');
 assert.equal(serializations,1);assert.equal(svgLoads,1);
 ctx.root.sagsV495ManagedPage=()=>false;
 assert(await ctx.run(fakeSvg(false),3),'non-canonical page keeps existing raster path');
 assert.equal(serializations,2);assert.equal(svgLoads,2);

 // Real fastPage: a blank overlay bypasses drawImage; original background,
 // canonical text, signatures and page dimensions are unchanged.
 let overlays=0,paint=0,signatures=0,drawn=0,filled=0;
 const info={image:'./forms/fsags42.3/page-01.png',width:1241,height:1755,blobKey:false};
 const canvas={width:0,height:0,getContext:()=>({fillRect(){filled++},drawImage(){drawn++}})};
 const painter={root:{sagsV495PageInfo:()=>info,sagsV495ManagedPage:()=>true,sagsV495PaintCanonicalPage:()=>{paint++}},
  document:{getElementById:()=>({}),createElement:()=>canvas},perf:()=>0,baseW:()=>1241,baseH:()=>1755,
  isMobile:()=>false,stateObj:()=>({}),bgPath:()=> './pdf-bg/fsags42.3/page-01.jpg',
  layerCfg:()=>({w:1241,h:1755}),loadImage:async()=>{throw Error('must keep packaged background fast path')},
  sagsPdfExactSvgOverlay:async()=>{overlays++;return null},drawSignatures:async()=>{signatures++}};
 vm.createContext(painter);
 vm.runInContext(functions.get('fastPage')+';this.fastPage=fastPage;',painter);
 const out=await painter.fastPage(1);
 assert.equal(out.width,1241);assert.equal(out.height,1755);
 assert.equal(overlays,1);assert.equal(drawn,0,'no image decode/draw for a blank SVG');
 assert.equal(paint,1,'canonical painter draws original form values');assert.equal(signatures,1,'signature painter retained');assert(filled>0);
 painter.sagsPdfExactSvgOverlay=async()=>({width:1241,height:1755});
 await painter.fastPage(1);assert.equal(drawn,1,'real SVG graphics still drawn');
 console.log('PDF V1.10: skip empty canonical SVG raster decode, preserve arbitrary graphics, dimensions, text, background and signatures PASS');
})().catch(e=>{console.error(e);process.exitCode=1});

'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const tvj=fs.readFileSync('app/modules/tvj-gof-035.v630.js','utf8');
const core=fs.readFileSync('app/boot/05-legacy.js','utf8');
const render=fs.readFileSync('app/modules/form-registry-runtime.v647.js','utf8');
const start=tvj.indexOf('    try{\n      const base=draw;');
const endToken='    }catch(e){console.warn("TVJ wrap draw",e)}';
const end=tvj.indexOf(endToken,start);
assert(start>=0&&end>start,'TVJ draw override should be present');
const source=tvj.slice(start,end+endToken.length);
assert(!source.includes('innerHTML'),'TVJ draw must not erase cached SVG hit/text nodes');
assert(!source.includes('replaceChildren'),'Only the incremental core can invalidate an entire page');
assert(core.includes('function sagsBeginSvgDraw('),'Incremental renderer is available');
assert(core.includes('const __sagsSvgDraw=sagsBeginSvgDraw(fields,mainForm)'),'Core draw still uses incremental renderer');
assert(core.includes('old?.layout===layout&&Object.is(old.value,value)'),'Core diff retains unchanged field nodes');
let wipes=0,baseDraws=0,identitySyncs=0;
const svg={get innerHTML(){return '<svg-existing-field/>'},set innerHTML(v){wipes++;}};
const context={document:{getElementById:id=>id==='svg15'?svg:null},
  root:{},syncAccountIdentity:()=>{identitySyncs++},
  draw:function(...args){baseDraws++;assert.equal(this.tag,'flight');return args[0]*2},console};
vm.createContext(context);vm.runInContext(source,context);
const flight={tag:'flight'};
for(let i=0;i<30;i++)assert.equal(context.draw.call(flight,i),i*2);
assert.equal(baseDraws,30,'Existing draw and business calculations remain in use');
assert.equal(identitySyncs,30,'Identity sync remains active');
assert.equal(wipes,0,'No full page reset on repeated edits, saves or other-form redraws');
assert(render.includes('paintedPages.get(c)')&&render.includes('input.values.every((v,i)=>Object.is(v,old.values[i]))'),
  'Canonical canvas keeps its independent invalidation cache');
console.log('Chrome/Edge Android TVJ draw: 30 updates, no forced SVG reset; identity and canonical paint retained');

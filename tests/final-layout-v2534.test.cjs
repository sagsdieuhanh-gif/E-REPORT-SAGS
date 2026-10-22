'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),acorn=require('acorn');
const src=fs.readFileSync('app/boot/06-legacy.js','utf8'),ast=acorn.parse(src,{ecmaVersion:'latest'});
function fn(name){const n=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);assert(n,name);return src.slice(n.start,n.end)}
const events=[],frames=[];
function element(text,multiline=false){const styles=new Map();return {textContent:text,clientWidth:100,clientHeight:30,classList:{contains:()=>multiline},style:{getPropertyValue:k=>styles.get(k)||'',getPropertyPriority:()=> 'important',setProperty(k,v){events.push('write');styles.set(k,v)}},styles}}
const els=[element('TEST'),element('LONG TEXT',true),element('123')];
const c={document:{getElementById:()=>({querySelectorAll:s=>s.includes('Zone')?[els[2]]:els.slice(0,2)})},ffUniversalMaxFont:()=>12,ffMeasureTextWidth:(el,text,size)=>{events.push('measure');return text.length*size},requestAnimationFrame:cb=>{frames.push(cb);return frames.length}};
vm.createContext(c);vm.runInContext(['ffAutoFitElement','ffAutoFitFinalDisplay','ffAutoFitFinalInputs'].map(fn).join(';'),c);
for(const name of ['ffAutoFitFinalDisplay','ffAutoFitFinalInputs']){for(const el of els)el.styles.clear();events.length=0;c[name]();assert(events.includes('write'));assert(events.lastIndexOf('measure')<events.indexOf('write'),'all measurements precede style writes');for(const el of els)assert(el.styles.has('font-size'))}
const direct=element('SAME'),deferred=element('SAME');c.ffAutoFitElement(direct,{min:6,max:12,boost:1.7});const apply=c.ffAutoFitElement(deferred,{min:6,max:12,boost:1.7,deferWrite:true});assert.equal(deferred.styles.size,0);apply();assert.deepEqual([...direct.styles],[...deferred.styles],'batching preserves font output');
let fits=0;c.ffAutoFitFinalDisplay=()=>fits++;vm.runInContext('let ffDisplayFitFrame=0;'+fn('ffScheduleFinalDisplayFit'),c);for(let i=0;i<30;i++)c.ffScheduleFinalDisplayFit();assert.equal(frames.length,1);frames.shift()();assert.equal(fits,1);c.ffScheduleFinalDisplayFit();assert.equal(frames.length,1);frames.shift()();assert.equal(fits,2,'new frame is not suppressed');
console.log('FINAL layout: reads before writes, same font output, 30 queued refits coalesce into one');

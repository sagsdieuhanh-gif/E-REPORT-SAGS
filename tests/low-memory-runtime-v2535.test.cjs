'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),acorn=require('acorn');
const source=fs.readFileSync('app/boot/05-legacy.js','utf8'),ast=acorn.parse(source,{ecmaVersion:'latest'});
const fn=name=>{const n=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);assert(n,name);return source.slice(n.start,n.end)};
// Bounded, invalidation-aware text measurements: cached widths match the native result.
let native=0;const context={font:'18px Arial',direction:'ltr',measureText:t=>{native++;return {width:t.length*8}}};
const c={document:{documentElement:{dir:'ltr',lang:'vi'},fonts:{status:'loaded'}},Map,JSON};vm.createContext(c);vm.runInContext(fn('sagsCachedTextWidth'),c);
for(let i=0;i<100;i++)assert.equal(c.sagsCachedTextWidth(context,'SAGS CXR'),64);assert.equal(native,1);
context.font='20px Arial';c.sagsCachedTextWidth(context,'SAGS CXR');assert.equal(native,2);
c.document.fonts.status='loading';c.sagsCachedTextWidth(context,'SAGS CXR');c.sagsCachedTextWidth(context,'SAGS CXR');assert.equal(native,4);c.document.fonts.status='loaded';
for(let i=0;i<1000;i++)c.sagsCachedTextWidth(context,'value '+i);assert.equal(c.sagsCachedTextWidth.cache.size,256);
c.sagsCachedTextWidth.cache.clear();c.sagsCachedTextWidth(context,'SAGS CXR');assert.equal(c.sagsCachedTextWidth.cache.size,1);
// Real draw builds 1,000 interactive fields but only four listeners per SVG, even on redraw.
let listeners=0,fieldListeners=0,created=0;const opened=[],touch=[];
const pages=new Map([1,2].map(n=>['svg'+n,{handlers:{},addEventListener(t,f){listeners++;this.handlers[t]=f},replaceChildren(fragment){this.nodes=fragment.nodes;for(const n of this.nodes)n.ownerSVGElement=this}}]));
const d={window:{},state:{bbbtManualV18:true},fields:Array.from({length:1000},(_,i)=>({page:i%2+1,key:'k'+i,type:'text'})),activeKey:null,BASE_W:1241,BASE_H:1755,cancelPendingTouchHit(){},getActiveFlightMainForm:()=> 'fsags',abs:()=>({x:0,y:0,w:10,h:10}),activate:f=>opened.push(f.key),beginTouchHit:(e,f)=>touch.push('down:'+f.key),moveTouchHit:()=>touch.push('move'),endTouchHit:()=>touch.push('up'),cancelTouchHit:()=>touch.push('cancel'),E:()=>{created++;const n={dataset:{},style:{},addEventListener(){fieldListeners++},setPointerCapture(){},releasePointerCapture(){},closest:()=>n};return n},document:{getElementById:id=>pages.get(id),createDocumentFragment:()=>({nodes:[],appendChild(n){this.nodes.push(n)}})}};
vm.createContext(d);vm.runInContext(fn('sagsBindSvgHitEvents')+';'+fn('draw'),d);d.draw();assert.equal(created,1000);assert.equal(listeners,8);assert.equal(fieldListeners,0);d.draw();assert.equal(listeners,8);
const page=pages.get('svg1'),hit=page.nodes[0];const event=type=>({target:hit,pointerType:type,pointerId:1,stopPropagation(){},preventDefault(){}});
page.handlers.pointerdown(event('mouse'));assert.equal(opened.length,0);page.handlers.pointerup(event('mouse'));assert.deepEqual(opened,['k0']);
hit.__sagsHitField={page:4,key:'signature',type:'signature'};page.handlers.pointerdown(event('mouse'));page.handlers.pointerup(event('mouse'));assert.deepEqual(opened,['k0','signature']);
for(const type of ['pointerdown','pointermove','pointerup','pointercancel'])page.handlers[type](event('touch'));assert.deepEqual(touch,['down:signature','move','up','cancel']);
const foreign={...event('mouse'),target:{closest:()=>({__sagsHitField:{key:'wrong'},ownerSVGElement:{}})}};page.handlers.pointerdown(foreign);assert.equal(opened.length,2,'ignore other SVG roots');
console.log('Low-memory SVG: 1000 fields use 8 shared listeners instead of 4000; 100 same width queries use 1 native measurement; cache bounded to 256');

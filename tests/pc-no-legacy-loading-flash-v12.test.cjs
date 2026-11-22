'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const shell=fs.readFileSync('app/boot/32-v6494-aviation-shell.js','utf8');
const start=shell.indexOf('const OVERLAY_IDS='),end=shell.indexOf('function legacyButton(key)',start);
assert(start>0&&end>start,'Navigation/overlay guards must be present in the aviation shell');
assert(!shell.includes("home?.classList?.remove?.('show')"),'Never hide the new shell at menu click time');
assert(!shell.includes("document.body?.classList?.remove?.('v6494-home-active')"),'Legacy screen cannot be exposed before a destination opens');
assert.match(shell,/stateObserver\.observe\(document\.body,\{attributes:true,attributeFilter:\['class'\],childList:true\}\)/,'Lazy overlays must be observed on insertion');
const fixtures={};let now=1000,hasHome=true;
fixtures.roleHomeIdle={hidden:false,getAttribute:k=>k==='aria-hidden'?'false':null};
const ctx={
 $:id=>fixtures[id]||null,
 auth:()=>true,
 isShown:e=>e.styleDisplay!=='none'&&e.visibility!=='hidden',
 document:{body:{classList:{contains:k=>k==='v157-home'&&hasHome}}},
 Date:{now:()=>now},
 navTransitionUntil:2000
};
vm.createContext(ctx);
vm.runInContext(shell.slice(start,end)+'\nthis.checkHome=homeState;this.checkOverlay=overlayVisible;',ctx);
assert.equal(ctx.checkHome(),true,'Home shell remains visible while legacy home is active');
hasHome=false;
assert.equal(ctx.checkHome(),true,'A pending route must not reveal legacy home during an asynchronous load');
now=2200;
assert.equal(ctx.checkHome(),false,'Once the transition window ends, do not cover an operational workspace');
hasHome=true;
function el(cls='',display='flex'){
 return {hidden:false,styleDisplay:display,style:{display:cls?'':display},
 classList:{contains:x=>x===cls},getAttribute:()=>null};
}
for(const [id,cls] of [
 ['fwcModal','show'],['sagsHistoryOverlay','open'],['v342Modal','show'],
 ['aclSimpleModal',''],['fs09SheetManagerModal',''],['finalSheetManagerModal','']
]){
 fixtures[id]=el(cls);
 assert.equal(ctx.checkOverlay(),true,id+' must suppress the home shell when actually visible');
 assert.equal(ctx.checkHome(),false,id+' must not be covered by the home shell');
 fixtures[id].styleDisplay='none';
 assert.equal(ctx.checkOverlay(),false,id+' hidden state must restore home');
 delete fixtures[id];
}
console.log('V1.2 PC async navigation: no old landing flash, lazy overlay detection and sheet managers PASS');

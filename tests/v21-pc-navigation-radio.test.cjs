'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const shell=fs.readFileSync('app/boot/32-v6494-aviation-shell.js','utf8');
const radio=fs.readFileSync('app/modules/radio-custody.v1.js','utf8');
const reminders=fs.readFileSync('app/modules/radio-reminders.v21.js','utf8');
const ver=JSON.parse(fs.readFileSync('version.json','utf8'));
const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
assert.equal(ver.version,'V2.1');
assert(index.includes(ver.build)&&sw.includes(ver.build),'hotfix must be cache-busted');
assert(sw.includes('"./app/modules/radio-custody.v1.js"')&&sw.includes('"./app/styles/radio-custody.v1.css"'),'standalone radio menu must work from verified PWA cache');
assert(shell.includes('e.stopPropagation();trigger(b.dataset.v6494Key)'),'PC quick actions cannot bubble into legacy My Flight route');
assert(shell.includes("if(key!=='home'){"),'non-home routes must suppress fixed landing');
assert(shell.includes('navTransitionUntil=Date.now()+2200'),'async module loads must not re-open landing shell');
assert(shell.includes("'sagsSettingsCenter','sagsHistoryOverlay'"),'settings and history must suppress fixed landing');
assert(shell.includes("id==='sagsRadioPanel'"),'radio uses hidden property, not show/open');
assert(shell.includes("document.addEventListener('click',e=>{if(e.target?.closest?.('#v157MenuBody"),'native PC menu guard missing');
assert(!shell.includes('data-sags-radio-shortcut'),'no inserted unkeyed navigation button');
assert(shell.includes("['roleLoginModal',...OVERLAY_IDS]"),'must observe module state');
assert(radio.includes("if(!u.uid){$('sagsRadioPanel').hidden=false;notify("),'radio must visibly report missing Firebase auth');
assert(!/navigator\.vibrate|AudioContext|sendSms|ZALO_OA/.test(reminders),'silent reminders only');
// Evaluate the real overlay predicate with minimal realistic DOM state, rather than only static pattern matching.
const begin=shell.indexOf('const OVERLAY_IDS='),end=shell.indexOf('function homeState(){',begin);
assert(begin>0&&end>begin,'overlay predicate not found');
const source=shell.slice(begin,end)+'\nthis.overlayVisible=overlayVisible;';
const fixtures={};
const get=id=>fixtures[id]||null;
const cx={
 $:get,
 isShown:e=>e.styleDisplay!=='none'&&e.visibility!=='hidden'&&e.opacity!==0,
};
vm.createContext(cx);vm.runInContext(source,cx);
const elem=(o={})=>({hidden:false,styleDisplay:'flex',visibility:'visible',opacity:1,
 getAttribute:key=>key==='aria-hidden'?(o.ariaHidden||null):null,
 classList:{contains:cls=>(o.classes||[]).includes(cls)},...o});
assert.equal(cx.overlayVisible(),false,'normal home shows when no dialog open');
fixtures.sagsRadioPanel=elem();
assert.equal(cx.overlayVisible(),true,'radio panel must hide fixed PC home');
fixtures.sagsRadioPanel.hidden=true;
assert.equal(cx.overlayVisible(),false,'hidden radio must not block home');
fixtures.sagsSettingsCenter=elem({classes:['show']});
assert.equal(cx.overlayVisible(),true,'settings opens above PC home');
delete fixtures.sagsSettingsCenter;
fixtures.sagsHistoryOverlay=elem({classes:['open']});
assert.equal(cx.overlayVisible(),true,'history opens above PC home');
delete fixtures.sagsHistoryOverlay;
fixtures.fwcModal=elem({classes:['show']});
assert.equal(cx.overlayVisible(),true,'My Flight opens above PC home');
fixtures.fwcModal.hidden=true;
assert.equal(cx.overlayVisible(),false,'closed My Flight allows PC home');
console.log('V2.1 PC routing: radio, history, settings, My Flight, source guards PASS');

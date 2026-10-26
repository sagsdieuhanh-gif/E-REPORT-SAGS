'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const src=fs.readFileSync('app/modules/theme-contrast.v2.js','utf8');
const css=fs.readFileSync('app/styles/aviation-reference.v1.css','utf8');
const html=fs.readFileSync('index.html','utf8');
function boot(search){
 const events={},children=[],listeners={};
 const rootNode={id:'dailyRosterModal',isConnected:true,nodeType:1,
   className:'',getClientRects:()=>[1],querySelectorAll:()=>[item]};
 let light=false;
 const item={id:'auditTestLabel',tagName:'LABEL',isConnected:true,nodeType:1,
  parentElement:rootNode,getClientRects:()=>[1],closest:()=>null};
 const styles=el=>({display:'block',visibility:'visible',opacity:'1',backgroundImage:'none',
  backgroundColor:el===rootNode?(light?'rgb(255, 255, 255)':'rgb(12, 17, 26)'):'rgba(0, 0, 0, 0)',
  color:'rgb(248, 250, 252)',webkitTextFillColor:'rgb(248, 250, 252)'});
 const doc={hidden:false,documentElement:{getAttribute:()=>light?'light':'dark'},body:{},
  createElement:()=>({id:'',textContent:''}),getElementById:id=>id==='sagsThemeContrastV2'?children[0]:null,
  head:{appendChild:el=>children.push(el)},querySelectorAll:()=>[rootNode],
  addEventListener:(n,fn)=>listeners[n]=fn};
 const win={location:{search},getComputedStyle:styles,addEventListener:(n,fn)=>events[n]=fn,
  setTimeout,clearTimeout,requestAnimationFrame:cb=>cb(),SAGS_FORMS_REGISTRY:{forms:[]}};
 const ctx={window:win,document:doc,URLSearchParams,console,setTimeout,clearTimeout};
 vm.runInNewContext(src,ctx,{filename:'theme-contrast.v2.js'});
 return {win,doc,children,setLight:v=>light=v,events,listeners};
}
const normal=boot('');
assert.equal(normal.win.sagsThemeJourneyAudit,undefined,'No extra click observer in a production session');
assert.equal(normal.listeners.click,undefined,'Do not add click instrumentation in normal user sessions');
const audit=boot('?sags_theme_audit=1');
assert.ok(audit.win.sagsThemeJourneyAudit,'Explicit QA URL should activate click-by-click recorder');
audit.win.sagsThemeJourneyAudit.capture();
assert.equal(audit.win.sagsThemeJourneyAudit.summary().clicks,1);
assert.equal(audit.win.sagsThemeJourneyAudit.report()[0].mode,'dark');
assert.equal(audit.win.sagsThemeJourneyAudit.report()[0].failures.length,0,'Dark text must contrast with dark panel');
audit.setLight(true);audit.win.sagsThemeJourneyAudit.capture();
assert.equal(audit.win.sagsThemeJourneyAudit.report()[1].mode,'light');
assert.ok(audit.win.sagsThemeJourneyAudit.report()[1].failures.length>0,'White on white must be detected');
assert.ok(!('text' in audit.win.sagsThemeJourneyAudit.report()[1].failures[0]),'Never record user field values or visible text');
const injected=audit.children[0].textContent;
assert.ok(injected.includes('--sags-dialog-bg:var(--et-card'),'Legacy modal must inherit active mode');
assert.ok(injected.includes('background:var(--et-shell,#edf2f7)'),'AC Limits must no longer be forced light');
assert.ok(injected.includes('#dailyRosterModal .drPanel{background:var(--et-card'),'Roster must no longer be forced dark');
assert.ok(!injected.includes('#dailyRosterModal .drPanel{background:#0b1e2c'),'No hardcoded roster background');
assert.ok(injected.includes('#entry#entry #entryPaperSheet{\n background:#ffffff'),'Official paper surface must remain white');
assert.equal([...html.matchAll(/<link[^>]+rel="stylesheet"/g)].length,6,'No new style network request');
const clickCount=[...html.matchAll(/\bonclick="/g)].length;
assert.ok(clickCount>=185,'Screen journey inventory must recognize major inline flows');
const needed=['#v157Drawer','#v6494AviationHome','#fwcModal','#sagsSettingsCenter','#dailyRosterModal','#aclSimpleModal','#csgModal','#quickTimeModal','#fs09QuickModal','#sagsQuickEntry'];
for(const id of needed)assert.ok(css.includes(id),'Missing screen styling '+id);
console.log('V1.5: no-cost normal mode, opt-in per-click contrast audit, paper protection, and '+clickCount+' inline UI actions accounted for');

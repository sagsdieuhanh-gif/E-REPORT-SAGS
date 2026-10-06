const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const src=fs.readFileSync(__dirname+'/../app/modules/fsags208-workspace.v1.js','utf8');
const start=src.indexOf('root.sags208SyncFormActions=function(row){'),end=src.indexOf('async function sendWorkspace',start);
const nodes=Object.fromEntries(['kh208SendBtn','v324HandoverBtn','v163SignBtn'].map(id=>[id,{style:{},classList:{add(){}},parentElement:null}]));
let readonly=false;const c={root:{activeFormGroup:'loading208'},document:{getElementById:id=>nodes[id]},FORM:'loading208',isHandlerRole:()=>true,readOnlyFlag:()=>readonly,bindingFor:()=>({flightId:'F1'}),sendWorkspace(){},completeDraft(){}};
const classes=new Set(),row={appendChild(n){n.parentElement=this},classList:{remove(...s){s.forEach(v=>classes.delete(v))},add(...s){s.forEach(v=>classes.add(v))}}};
vm.createContext(c);vm.runInContext(src.slice(start,end),c);
assert.equal(c.root.sags208SyncFormActions(row),true);assert.equal(nodes.kh208SendBtn.parentElement,row);assert.equal(nodes.kh208SendBtn.style.display,'none');assert.equal(nodes.kh208SendBtn.onclick,c.sendWorkspace);assert.equal(nodes.v324HandoverBtn.onclick,c.sendWorkspace);assert(classes.has('two'));
readonly=true;c.root.sags208SyncFormActions(row);assert.equal(nodes.kh208SendBtn.style.display,'none');assert.equal(nodes.v324HandoverBtn.style.display,'none');
assert.equal(nodes.v163SignBtn.style.display,'none');
c.root.activeFormGroup='ramp';assert.equal(c.root.sags208SyncFormActions(row),false);assert.equal(nodes.kh208SendBtn.style.display,'none');
assert.notEqual(nodes.v163SignBtn.style.display,'none');
const core=fs.readFileSync(__dirname+'/../app/core/app.v503.js','utf8');assert(core.includes('if(root.sags208SyncFormActions?.(row))return;'));
console.log('208 toolbar passed: visible separate Save/Send, readonly and non-208 guards');


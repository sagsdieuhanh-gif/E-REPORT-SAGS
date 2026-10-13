const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),acorn=require('acorn'),cp=require('node:child_process');
const read=p=>fs.readFileSync(p,'utf8');
function declaration(s,name){let result;function walk(n){if(!n||typeof n!=='object')return;if(n.type==='FunctionDeclaration'&&n.id.name===name)result=s.slice(n.start,n.end);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v)}walk(acorn.parse(s,{ecmaVersion:'latest'}));assert.ok(result,name);return result}
function setup(legacy,quick){
 const nodes=new Map(),drafts=new Map(),envelopes=new Map([['BX',{state:{fltBefore:'BX787',b1ADL:'10'}}],['KE',{state:{fltBefore:'KE468',b1ADL:'20'}}]]),events=[],writes=[],alerts=[];let valid=true;
 function node(id){if(!nodes.has(id)){const classes=new Set();const listeners={};nodes.set(id,{id,value:'',style:{display:'none'},dataset:{},hidden:false,classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},addEventListener:(n,f)=>(listeners[n]??=[]).push(f),fire(n){for(const f of listeners[n]||[])f({})},setAttribute(){},querySelector:sel=>node(sel.replace(/^#/,'')),focus(){},select(){}})}return nodes.get(id)}
 const c={console,state:{fltBefore:'BX787',b1ADL:'10'},activeFlightSessionId:'BX',activeFormGroup:'fsags',activeKey:null,editing:null,signing:null,currentPage:1,
 fields:[{key:'b1ADL',type:'number'}],readFlightSessionList:()=>['BX','KE'].map(id=>({id,initialGroup:'fsags'})),readFlightSessionEnvelope:id=>JSON.parse(JSON.stringify(envelopes.get(id))),
 document:{getElementById:id=>nodes.get(id)||null,createElement:()=>node('created'+nodes.size),head:{appendChild(){}},body:{appendChild:el=>nodes.set(el.id,el)}},
 localStorage:{setItem(k,v){if(k.startsWith('flight:'))envelopes.set(k.slice(6),JSON.parse(v))}},sagsOwnedKey:k=>k,flightSessionStorageKey:id=>'flight:'+id,FLIGHT_SESSION_ACTIVE_KEY:'active',FORM_GROUP_STORAGE_KEY:'group',
 persist(){writes.push(c.activeFlightSessionId);envelopes.set(c.activeFlightSessionId,{state:JSON.parse(JSON.stringify(c.state))})},
 hideRoleHomeIdle(){},dismissFS09PreviewForFlightSwitch(){},flightTabActiveSet(){},closeFlightSessions(){},showFormGroup(){},updateBagTotals(){},updateCurrentFerryFlag(){},draw(){},renderAttachments(){},renderBBBTAttachments(){},renderFSAGS421Attachments(){},showPendingFS09ForActiveSession(){},requestAnimationFrame:fn=>fn(),scrollTo(){},resetFormTouchGesture(){},
 closeEntry(){c.editing=null},closeQuickTimePanel(){events.push('close-time:'+c.activeFlightSessionId)},closeFS09QuickPanel(){events.push('close-fs09:'+c.activeFlightSessionId)},matchMedia:()=>({matches:true}),getComputedStyle:()=>({display:'none'}),alert:m=>alerts.push(m),addEventListener(){},dispatchEvent:e=>events.push(e.type+':'+e.detail.sessionId),CustomEvent:class{constructor(type,{detail}){this.type=type;this.detail=detail}},
 sagsV61Draft:{contextKey:()=>c.activeFlightSessionId,record:(k,v,p)=>drafts.set(c.activeFlightSessionId+'|'+k+'|'+p,{value:String(v)}),read:(k,p)=>drafts.get(c.activeFlightSessionId+'|'+k+'|'+p),forget:(k,p)=>drafts.delete(c.activeFlightSessionId+'|'+k+'|'+p),verifyPending:()=>valid,snapshotAllEditors(){c.sagsQuickEntrySnapshot?.()}}
 };c.window=c;vm.createContext(c);vm.runInContext(quick,c);
 for(const name of ['flightMainGroupForChooser','flightStartPageForGroup','switchFlightSession'])vm.runInContext(declaration(legacy,name),c);
 if(legacy.includes('function prepareFlightEditorsForSwitch'))vm.runInContext(declaration(legacy,'prepareFlightEditorsForSwitch'),c);
 return {c,nodes,drafts,envelopes,events,writes,alerts,setValid:v=>valid=v,open:()=>c.sagsQuickTryActivate(c.fields[0]),type(value){node('sqValue').value=value;node('sqValue').fire('input')},commit(){node('sqNext').fire('click')}};
}
const legacy=read('app/boot/05-legacy.js'),quick=read('app/modules/quick-entry.v1.js');
// Same printed field in BX and KE: entering KE must never reuse BX's wizard.
{
 const t=setup(legacy,quick);assert.equal(t.open(),true);t.type('12');t.c.switchFlightSession('KE');
 assert.equal(t.c.state.fltBefore,'KE468');assert.equal(t.c.sagsQuickEntryStatus(),null);assert.equal(t.nodes.get('sagsQuickEntry').classList.contains('open'),false);
 assert.equal(t.drafts.get('BX|b1ADL|quick').value,'12');assert.equal(t.drafts.has('KE|b1ADL|quick'),false);
 assert.equal(t.open(),true);assert.equal(t.nodes.get('sqValue').value,'20');t.type('34');t.commit();
 t.c.switchFlightSession('BX');assert.equal(t.open(),true);assert.equal(t.nodes.get('sqValue').value,'12');t.commit();
 assert.equal(t.envelopes.get('BX').state.b1ADL,'12');assert.equal(t.envelopes.get('BX').state.fltBefore,'BX787');assert.equal(t.envelopes.get('KE').state.b1ADL,'34');assert.equal(t.envelopes.get('KE').state.fltBefore,'KE468');
 assert.ok(t.events.includes('sags:flightchange:KE'));assert.ok(t.events.includes('close-time:BX'));
}
// Latest visible digits are captured before the active ID changes, even without input.
{
 const t=setup(legacy,quick);t.open();t.nodes.get('sqValue').value='123';t.c.switchFlightSession('KE');assert.equal(t.drafts.get('BX|b1ADL|quick').value,'123');assert.equal(t.drafts.has('KE|b1ADL|quick'),false);
}
// Failed durable draft verification blocks the switch and leaves the editor usable.
{
 const t=setup(legacy,quick);t.open();t.type('99');t.setValid(false);t.c.switchFlightSession('KE');assert.equal(t.c.activeFlightSessionId,'BX');assert.ok(t.c.sagsQuickEntryStatus());assert.equal(t.alerts.length,1);assert.equal(t.nodes.get('sqValue').value,'99');
}
// Same-flight reopen also clears the old wizard before reopening a field.
{
 const t=setup(legacy,quick);t.open();t.type('15');t.c.switchFlightSession('BX');assert.equal(t.c.sagsQuickEntryStatus(),null);assert.equal(t.open(),true);assert.equal(t.nodes.get('sqValue').value,'15');
}
assert.match(read('app/boot/06-legacy.js'),/function openStandaloneFS09Sheet\(id\)\{if\(!prepareFlightEditorsForSwitch\(\)\)return;/);
console.log('BX -> KE -> BX draft and editor isolation passed');
module.exports={setup};

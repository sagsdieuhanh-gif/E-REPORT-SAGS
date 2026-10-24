'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const history=fs.readFileSync('app/modules/form-edit-history.v1.js','utf8');
const core=fs.readFileSync('app/core/phases/core-tools.js','utf8');
const generated=fs.readFileSync('app/generated/core-tools.js','utf8');
const roster=fs.readFileSync('app/modules/daily-roster.v502.js','utf8');
assert.equal(core,generated,'AC LIMITS deployed runtime must match canonical source');
const store=new Map();const events={};
const event={schema:1,id:'E1',atMs:1730000000000,actor:{username:'PHUONGDD',name:'Phương'},assignmentId:'A1',
 sessionId:'other-device-session',formGroup:'fsags423',changes:[{field:'h24Start',before:'14:10',after:'14:30'}]};
const auth={role:'AD',profile:{username:'ADMIN',fullName:'Quản trị'}};
const root={__sagsGetSession:()=>auth,currentFlightSessionMeta:()=>null,
 firebase:{auth:()=>({currentUser:{uid:'adminuid'}})},addEventListener(){},
 sagsV470Ref:path=>({
  limitToLast:()=>({once:async()=>({val:()=>({'E1':event})})}),
  once:async()=>({val:()=>({'E1':event})})
 })};
const document={readyState:'loading',body:{classList:{contains:()=>true}},addEventListener(){},getElementById(){return null}};
const localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
vm.runInNewContext(history,{window:root,document,localStorage,indexedDB:undefined,navigator:{onLine:true},
 console,setTimeout,clearTimeout},{filename:'form-edit-history.v1.js'});
const api=root.SAGSFormEditHistoryV1;
assert.equal(api.fieldTitle('h24Start','fsags423',new Map()),'Bắt đầu đẩy lùi tàu bay (PUSHBACK START)');
assert.equal(api.fieldTitle('f421_h24Start','fsags421',new Map()),'Bắt đầu đẩy lùi tàu bay (PUSHBACK START)');
assert.equal(api.fieldTitle('vz_arrBaggagePcs','tvj_gof_035',new Map()),'ARR BAGGAGE PCS');
assert.match(history,/roster_manifests\/.*\/items/,'admin must load all roster assignments for selected date');
assert.match(history,/if\(strict\)throw e/,'denied admin RTDB read must be visible, not report empty history');
assert.match(history,/renderRequest.*refreshToken/,'change in selected form must not display stale query');
const eligible=roster.match(/async function personalGroups\([\s\S]*?async function renderPersonal\(/)?.[0]||'';
assert(eligible.includes("canonicalForm(x)==='FINAL'"),'hide only inactive CBTT FINAL load sheet from display');
assert(eligible.includes('displayItems.map(x=>readState(x.assignmentId))'),'excluded form must not create extra RTDB reads');
assert(eligible.includes('const groups=groupTasks(displayItems.map'),'keep generated FSAGS54/94 task views');
assert(roster.includes('async function reconcilePolicyAuxForms('),'CBTT source remains for policy forms');
assert.match(core,/model:"gemini-3\.8-flash"/,'A/C LIMITS uses verified supported stable model');
assert.match(core,/function aclTryOcrFallback\(/);
const start=core.indexOf('function normalizedCategory(v)'),end=core.indexOf('async function readAI()',start);
assert(start>=0&&end>start);
const code=core.slice(start,end),ui={};
const element=id=>ui[id]||(ui[id]={children:[],appendChild(x){this.children.push(x)}});
const dom={getElementById:element,createElement:tag=>({tag,appendChild(x){(this.children||=[]).push(x)},style:{}}),head:{appendChild(){}}};
const environment={
 root:{Tesseract:{recognize:async()=>({data:{text:'VN-A648 APU INOP REQ GPU ASU\nHL7269 HOLD INOP CARGO\nX123 flight 123'}})}},
 document:dom,URL,aiRows:[],status(t){ui.status=t},renderRows(){},
 normReg:s=>String(s).trim().toUpperCase().replace(/[^A-Z0-9]/g,'')
};
const keys=Object.keys(environment),factory=new Function(...keys,'let aclOcrPromise=null;'+code.replace('let aclOcrPromise=null;','')+';return{read:aclTryOcrFallback,rows:()=>aiRows};');
const helper=factory(...Object.values(environment));
module.exports=(async()=>{
 const adminRows=await api.entriesFor({id:'admin:A1',rosterAssignmentId:'A1',adminRemote:true});
 assert.equal(adminRows.length,1,'admin can see remote employee history despite different local session id');
 assert.equal(adminRows[0].actor.username,'PHUONGDD');
 auth.role='DH';
 const normal=await api.entriesFor({id:'my-session',rosterAssignmentId:'A1'});
 assert.equal(normal.length,0,'regular worker still scoped to their local session');
 const accepted=await helper.read({name:'limit.png'},Error('Firebase App Check blocked'));
 assert.equal(accepted,true);
 assert.equal(helper.rows().length,2,'OCR fallback finds only plausible aircraft registrations');
 assert(helper.rows().every(x=>x.selected===false&&x.needsReview===true&&x.confidence===0),
  'unverified OCR predictions are never preselected for operational publishing');
 assert(ui.aclAIList.children.some(x=>x.tag==='details'),'raw OCR result remains available for inspection');
 console.log('PASS admin remote history (role/date), readable paper labels, CBTT FINAL hide and review-only A/C LIMITS OCR');
})().catch(e=>{console.error(e);process.exitCode=1});

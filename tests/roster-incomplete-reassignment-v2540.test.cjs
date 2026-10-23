'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const src=fs.readFileSync('app/core/phases/core-flight.js','utf8');
const gen=fs.readFileSync('app/generated/core-flight.js','utf8');
assert.equal(src,gen,'deployed flight code must match canonical flight code');
const S=x=>String(x??'').trim(),normUser=x=>S(x).toUpperCase();
const protect=st=>!!st?.envelope?.state?.typed;
const begin=src.indexOf('const oldItem=oldItems[baseRec.assignmentId]||{}'),finish=src.indexOf(',rk=upper(r.roleKey)',begin);
assert(begin>0&&finish>begin,'roster same-assignment owner decision must be found');
const decision=new Function('oldItems','sessionById','baseRec','protectRosterAssignment','sessionReadFailedIds','S','normUser',
 'let overrides=0,ownerChanges=0,dateOwnerChanges=0;'+src.slice(begin,finish)+
 ';return {user:r.targetUser,manual,oldProtected,ownerChanges,dateOwnerChanges,overrides};');
const base={assignmentId:'A',targetUser:'PHUONGDD',flightName:'FD123'};
const old={A:{assignmentId:'A',user:'KIENNT',manualOverride:true,active:true}};
const pending={A:{claimStatus:'CLAIMED',claimedBy:'KIENNT',envelope:{state:{typed:'NIL'},rosterSeed:{}}}};
let d=decision(old,pending,base,protect,new Set(),S,normUser);
assert.equal(d.user,'PHUONGDD','explicit roster change must transfer even if previous user entered but did not Complete');
assert.equal(d.oldProtected,true,'working envelope remains protected');
assert.equal(d.manual,false,'stale manual override must not pin previous user after newer roster');
assert.equal(d.ownerChanges,1);
d=decision(old,{A:{claimStatus:'CLAIMED'}},base,protect,new Set(),S,normUser);
assert.equal(d.user,'PHUONGDD','claim-only incomplete work must not block');
assert.throws(()=>decision(old,pending,base,protect,new Set(['A']),S,normUser),/Không kiểm tra được dữ liệu/,'Firebase read failure must abort');
const publish=src.slice(src.indexOf('if(oldUser&&oldUser!==newUser){patch[',begin),src.indexOf('writes++;dateWrites++}',begin));
assert.match(publish,/if\(hadOld\)\{patch\[.*?ownerUser/,'same-ID transfer must reset claim even when unfinished');
for(const marker of ['rosterReassignedWithDraft','rosterReassignedFrom','rosterReassignedTo','workPartHistory','workPartStatus','claimedBy','roster_co_claims'])assert(publish.includes(marker),'missing history or claim lifecycle marker '+marker);
assert(!publish.includes('/envelope'+String.fromCharCode(96)+']='),'owner transfer must never erase previous input envelope');
const f0=src.indexOf('async function transferAssignment('),f1=src.indexOf('root.dailyRosterReassign=',f0);
assert(f0>0&&f1>f0,'manual transfer implementation must exist');
const transferSource=src.slice(f0,f1);
let updates=[],failed=false;
const oldSession={claimStatus:'CLAIMED',claimedBy:'KIENNT',ownerUser:'KIENNT',coClaimedAssignmentId:'A',
 envelope:{state:{typed:'NIL',bags:'11'},rosterSeed:{}}};
const item={assignmentId:'A',user:'KIENNT',flightId:'FID',opDate:'2026-10-23',coAssigneeGroupId:'G',formGroup:'fsags421',flightRaw:'FD123'};
const originalMail={assignmentId:'A',targetUser:'KIENNT',opDate:item.opDate,flightId:'FID',active:true,formGroup:'fsags421'};
const reference=path=>({
 once:async()=>{if(failed&&path==='roster_sessions/A')throw Error('offline');
 return {val:()=>path==='roster_sessions/A'?oldSession:path.includes('roster_mail/KIENNT/')?originalMail:null}},
 update:async patch=>{updates.push(patch)}
});
const make=new Function('manifestDate','loadManifest','normUser','safeKey','sagsV470Ref','MAIL_PATH','SESSION_PATH','REVOKE_PATH','MANIFEST_PATH','FLIGHT_PATH','currentUserProfile','S','protectRosterAssignment','sessionIsCompleted',
 transferSource+';return transferAssignment');
const transfer=make(()=>item.opDate,async()=>({items:{A:item}}),normUser,S,reference,'roster_mail','roster_sessions','roster_revocations','roster_manifests','flight_records',{username:'AD'},S,protect,()=>false);
module.exports=(async()=>{
 let r=await transfer('A','PHUONGDD');
 assert.equal(r.target,'PHUONGDD');assert.equal(updates.length,1);
 let p=updates[0];
 assert.equal(p['roster_sessions/A/claimStatus'],'READY');
 assert.equal(p['roster_sessions/A/taskStatusV333'],'UNCLAIMED');
 assert.equal(p['roster_sessions/A/workPartStatus'],'UNCLAIMED');
 assert.equal(p['roster_sessions/A/claimedBy'],null);
 assert.equal(p['roster_sessions/A/ownerUser'],'PHUONGDD');
 assert.equal(p['roster_sessions/A/rosterReassignedWithDraft'],true);
 assert.equal(p['roster_mail/KIENNT/items/A'],null);
 assert.equal(p['roster_mail/PHUONGDD/items/A'].targetUser,'PHUONGDD');
 assert.equal(p['roster_co_claims/2026-10-23/G'],null);
 assert(!Object.keys(p).some(k=>k.endsWith('/envelope')),'no old envelope data can be overwritten during reassign');
 assert.deepEqual(oldSession.envelope.state,{typed:'NIL',bags:'11'},'prior form must remain untouched');
 assert(Object.keys(p).some(k=>k.includes('/workPartHistory/')),'handover event is auditable');
 updates=[];failed=true;
 await assert.rejects(()=>transfer('A','PHUONGDD'),/Không thể xác minh/);
 assert.equal(updates.length,0,'offline Firebase verification cannot transfer ownership');
 const sharedSource=fs.readFileSync('app/core/phases/core-shared.js','utf8');
 assert.equal(sharedSource,fs.readFileSync('app/generated/core-shared.js','utf8'),'hydration source and runtime must match');
 const sharedStart=sharedSource.indexOf('async function resolveHandoverEnvelope('),sharedEnd=sharedSource.indexOf('function mergeRosterSeedDefaults(',sharedStart);
 assert(sharedStart>0&&sharedEnd>sharedStart,'handover resolver must exist');
 assert(sharedSource.includes('"ROSTER_TRANSFER_DRAFT"].includes(resolved.source)'),'handover treats roster transfer as immutable first-load snapshot');
 const envelope={state:{typed:'NIL',bags:'11'},mainForm:'fsags421'};
 const resolverFn=new Function('S','norm','me','sessionState','latestRosterFormSnapshot','previousItem','envelopeHasData',
 sharedSource.slice(sharedStart,sharedEnd)+';return resolveHandoverEnvelope');
 let shared={envelope,rosterReassignedAtMs:1700000000123,rosterReassignedTo:'PHUONGDD',envelopeUpdatedAtMs:1700000000000,claimStatus:'READY'};
 const resolver=resolverFn(S,normUser,()=> 'PHUONGDD',async()=>shared,async()=>null,()=>null,e=>!!Object.keys(e?.state||{}).length);
 let transferred=await resolver({assignmentId:'A'},{});
 assert.equal(transferred.source,'ROSTER_TRANSFER_DRAFT','new owner must hydrate saved form despite missing previous Complete');
 assert.equal(transferred.at,1700000000123,'immutable transfer timestamp must not be advanced by later writes');
 assert.equal(transferred.env.state.bags,'11','preserved draft must be available to the next owner');
 shared={...shared,rosterReassignedTo:'OTHER'};
 transferred=await resolver({assignmentId:'A'},{});
 assert.equal(transferred.source,'SHARED_ENVELOPE','only actual reassigned owner receives protected transfer signal');
 console.log('Roster unfinished transfer: latest roster wins, preserve envelope, reset claim, audit and fail-closed PASS');
})().catch(e=>{console.error(e);process.exitCode=1});

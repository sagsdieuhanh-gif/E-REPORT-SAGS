const assert=require('node:assert/strict'),fs=require('node:fs');
const shared=fs.readFileSync('app/core/phases/core-shared.js','utf8');
assert.equal(shared,fs.readFileSync('app/generated/core-shared.js','utf8'));
const flight=fs.readFileSync('app/core/phases/core-flight.js','utf8');
const S=x=>String(x??'').trim(),U=x=>S(x).toUpperCase();
const i=flight.indexOf('function validRosterUser('),j=flight.indexOf('function formLabel(',i);
const parse=new Function('S','upper','normUser',flight.slice(i,j)+';return grndCorPlan;')(S,U,U);
const groups=parse('PHUONGDD, KIENNT / PHUONGDD, KIENNT',true);
assert.equal(groups.split,true);
assert.deepEqual(groups.arr,['PHUONGDD','KIENNT']);
assert.deepEqual(groups.dep,['PHUONGDD','KIENNT']);
const p=shared.indexOf('function coContinueHasOperatorDataV2541('),q=shared.indexOf('async function markClaim(',p);
assert(p>0&&q>p);
const previous={claimStatus:'CLAIMED',taskStatusV333:'IN_PROGRESS',claimedBy:'PHUONGDD',envelope:{state:{notes:'ĐÃ NHẬP'},rosterSeed:{}}};
let next={claimStatus:'READY',envelope:{state:{flight:'FD123'},rosterSeed:{flight:'FD123'}}};
let lock={status:'CLAIMED',claimedBy:'PHUONGDD',claimedAssignmentId:'PARR',claimedAtMs:1,updatedAtMs:2};
let patches=[],transactions=0,confirms=0;
const peer={assignmentId:'PARR',user:'PHUONGDD',coAssigneeGroupId:'CG',flightId:'F',sourceColumn:'Grnd_Cor',formGroup:'fsags421',roleKey:'COR'};
const mine={...peer,assignmentId:'KARR',user:'KIENNT'};
const db=path=>({once:async()=>({val:()=>lock}),transaction:async fn=>{transactions++;const optimistic=fn(null);if(!optimistic)return{committed:false,snapshot:{val:()=>lock}};const updated=fn(lock);if(!updated)return{committed:false,snapshot:{val:()=>lock}};lock=updated;return{committed:true,snapshot:{val:()=>lock}}},update:async p=>patches.push(p)});
const vars={db,S,safe:S,U,norm:U,me:()=> 'KIENNT',coGroupId:x=>x.coAssigneeGroupId,
lane:()=>[peer,mine],laneKey:x=>[x.flightId,x.formGroup,x.sourceColumn,x.roleKey].join('|'),
sessionState:async aid=>aid==='PARR'?previous:next,workPartFinished:()=>false,
sanitizeEnvelope:x=>JSON.parse(JSON.stringify(x)),envelopeHasData:x=>Object.keys(x?.state||{}).length>0,
confirm:()=>{confirms++;return true},addAudit:async()=>{},Date,rosterLabel:()=> 'FD123',formLabel:()=> '42.1'};
const api=new Function(...Object.keys(vars),shared.slice(p,q)+';return {continueWork:continueCoAssignmentV2541,hasData:coContinueHasOperatorDataV2541};')(...Object.values(vars));
assert.equal(api.hasData(next),false);
assert.equal(api.hasData(previous),true);
module.exports=(async()=>{
const standby={coOwner:{user:'PHUONGDD',assignmentId:'PARR'}};
assert.equal(await api.continueWork('2026-10-23','F',mine,{},standby),true);
assert.equal(lock.claimedBy,'KIENNT');
assert.equal(confirms,1);assert.equal(transactions,1);
const patch=patches.at(-1);
assert.equal(patch['roster_sessions/PARR/claimStatus'],'STANDBY');
assert.equal(patch['roster_sessions/PARR/workPartStatus'],'PAUSED_FOR_CO_TAKEOVER');
assert.equal(patch['roster_sessions/KARR/handoverEnvelope'].state.notes,'ĐÃ NHẬP');
assert.equal(patch['roster_sessions/KARR/handoverFromAssignmentId'],'PARR');
assert(!Object.keys(patch).some(k=>k==='roster_sessions/PARR/envelope'));
assert(!Object.values(patch).includes('COMPLETED'));
lock={status:'CLAIMED',claimedBy:'OTHER',claimedAssignmentId:'X',claimedAtMs:3,updatedAtMs:4};
await assert.rejects(()=>api.continueWork('2026-10-23','F',mine,{},standby),/đã được chuyển/);
assert.equal(transactions,1);
next={claimStatus:'READY',envelope:{state:{flight:'FD123',memo:'TYPED'},rosterSeed:{flight:'FD123'}}};
lock={status:'CLAIMED',claimedBy:'PHUONGDD',claimedAssignmentId:'PARR',claimedAtMs:1,updatedAtMs:2};
await assert.rejects(()=>api.continueWork('2026-10-23','F',mine,{},standby),/dữ liệu riêng/);
next={claimStatus:'READY',envelope:{state:{flight:'FD123'},rosterSeed:{flight:'FD123'}}};
lock={status:'READY',claimedBy:null,claimedAssignmentId:null};
assert.equal(await api.continueWork('2026-10-23','F',mine,{},standby),true,
 'a READY previous lock must not falsely block a valid continuation');
assert.equal(lock.claimedBy,'KIENNT');
lock=null;
assert.equal(await api.continueWork('2026-10-23','F',mine,{},standby),true,
 'a newly created co-group may have no prior lock');
assert.equal(lock.claimedBy,'KIENNT');
assert(shared.includes('old.textContent="NHẬN TIẾP"'));
assert(shared.includes('continueCoAssignmentV2541(d,fid,item,man,cs)'));
const sync=fs.readFileSync('app/modules/daily-roster.v502.js','utf8');
assert(sync.includes('roster_co_claims/')&&sync.includes('lock.claimedAssignmentId'));
console.log('Same-group co-assignee unfinished continuation and single-owner lock PASS');
})().catch(e=>{console.error(e);process.exitCode=1});

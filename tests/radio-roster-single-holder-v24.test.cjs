'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('app/modules/radio-custody.v1.js','utf8'),css=fs.readFileSync('app/styles/radio-custody.v1.css','utf8');
for(const check of ['radioRosterDate','radioRosterShift','radioRosterAlert','function reconcileRoster(',
 'rosterRef.on(\'value\'','collection(\'users\').get({source:\'server\'})',
 "e.docs", "assertSingleHolder(inventory,user.uid)",
 "transactionInventory(tx,db,code", "if(connected&&rosterDate)queueRosterAudit()"])
 assert(src.includes(check),'Radio roster/single holder integration missing: '+check);
for(const check of ['.radioRosterMonitor','.radioRosterStats','.radioHeldNotice'])
 assert(css.includes(check),'Missing responsive radio roster styling: '+check);
const start=src.indexOf('function rosterLogin('),end=src.indexOf('function renderAdminOverview(){',start);
assert(start>0&&end>start);
const today='2026-11-06',base=Date.parse('2026-11-06T00:00:00+07:00');
const ctx={S:x=>String(x??'').trim(),label:x=>x,vnDateKey:()=>today,Date,Map,Set,Number,Math};
vm.createContext(ctx);vm.runInContext(src.slice(start,end)+'\nthis.reconcile=reconcileRoster;this.duty=rosterDutyShift;',ctx);
assert.equal(ctx.duty({sta:'09:30'}),'AM');
assert.equal(ctx.duty({std:'15:05'}),'PM');
assert.equal(ctx.duty({sta:'2345+1'}),'PM');
assert.equal(ctx.duty({sta:'NOT_SET'}),'');
const rows=[
 {user:'KIENNT',flightId:'VJ100',sta:'09:00'},
 {user:'KIENNT',flightId:'VJ101',sta:'10:00'},
 {user:'PHUONGDD',flightId:'VJ102',sta:'10:45'},
 {user:'HUYNT',flightId:'VJ103',sta:'11:10'},
 {user:'VUNP',flightId:'VJ104',sta:'19:10'},
 {user:'UNKNOWN_SHIFT',flightId:'VJ105'}
];
const users=new Map([['KIENNT','uid-k'],['PHUONGDD','uid-p'],['HUYNT','uid-h'],['VUNP','uid-v']]);
const history=[{action:'ISSUE',personUid:'uid-p',shift:'AM'},{action:'RETURN',personUid:'uid-p',shift:'AM'}];
const holder={code:'DH01',status:'OUT',holderUid:'uid-h',shift:'AM',updatedAt:{toDate:()=>new Date(base+2*3600000)}};
let result=ctx.reconcile(rows,users,[holder],history,today,'AM',base+10*3600000);
assert.equal(result.total,3,'One employee counts once despite multiple roster flights');
assert.equal(result.missing.join('|'),'KIENNT');
assert.equal(result.completed.join('|'),'PHUONGDD','Returned user not falsely missing');
assert.equal(result.holding.length,1,'Holding user has not yet missed return during shift');
assert.equal(result.unreturned.length,0);
result=ctx.reconcile(rows,users,[holder],history,today,'AM',base+13*3600000);
assert.equal(result.unreturned.length,1,'After shift, still holding is a missing return');
result=ctx.reconcile(rows,users,[],history,today,'AM',base+10*3600000);
assert.equal(result.missing.length,2);
assert.equal(result.completed.length,1);
result=ctx.reconcile(rows,users,[],history,today,'PM',base+17*3600000);
assert.equal(result.total,1);
assert.equal(result.missing.join(''),'VUNP');
const a=src.indexOf('async function transactionInventory('),b=src.indexOf('async function submit(){',a);
assert(a>0&&b>a);
const guard={INIT:['DH01','DH02','DH03'],devices:[{code:'DH01'},{code:'DH02'},{code:'DH03'}],Set,Map,Promise,label:x=>x};
vm.createContext(guard);vm.runInContext(src.slice(a,b)+'\nthis.inventory=transactionInventory;this.assertOne=assertSingleHolder;',guard);
(async()=>{
 const stored={DH01:{status:'OUT',holderUid:'user1'},DH02:{status:'READY'},DH03:{status:'READY'}};
 const reads=[],tx={get:ref=>{reads.push(ref.id);return Promise.resolve({data:()=>stored[ref.id]})}};
 const db={collection:()=>({doc:id=>({id})})};
 const inv=await guard.inventory(tx,db,'DH02');
 assert.deepEqual(reads,['DH01','DH02','DH03'],'Issue reads every known radio in a single transaction');
 assert.throws(()=>guard.assertOne(inv,'user1'),/Phải trả trước/);
 assert.doesNotThrow(()=>guard.assertOne(inv,'user2'));
 assert.doesNotThrow(()=>guard.assertOne(inv,'user1','DH01'),'Atomic swap can replace the same person\'s existing device');
 console.log('Roster AM/PM dedupe, prior return, post-shift overdue and single-holder inventory regression PASS');
})().catch(e=>{console.error(e);process.exitCode=1});

const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../app/modules/daily-roster.v502.js'),'utf8');
const start=source.indexOf('root.__SAGS_DAILY_ROSTER_FINAL_V1199.readOverview=');
const end=source.indexOf('\n};',start)+3;
let owner='alice',actorRole='DH',manager=false,calls=0;
const rows=[
 {assignmentId:'a',user:'alice',active:true,flightId:'F1'},
 {assignmentId:'b',user:'bob',active:true,flightId:'F2'},
 {assignmentId:'c',targetUser:'alice',active:false,flightId:'F3'},
 {assignmentId:'d',targetUser:'alice',formGroup:'forbidden',flightId:'F4'},
 {assignmentId:'e',user:'alice',formGroup:'done',flightId:'F5'}
];
const fullManifest={items:Object.fromEntries(rows.map(x=>[x.assignmentId,x]))};
const ctx={
 root:{__SAGS_DAILY_ROSTER_FINAL_V1199:{},sagsAirlineFormPolicy:{ready:async()=>{},allowed:(_,g)=>g!=='forbidden'}},
 me:()=>owner,role:()=>actorRole,allFlightScope:()=>manager,
 readManifest:async date=>{assert.equal(date,'2026-10-05');calls++;return fullManifest},
 db:path=>({once:async()=>{assert.equal(path,'roster_manifests/2026-10-05');return{val:()=>fullManifest}}}),
 safe:s=>s,norm:s=>String(s||'').toLowerCase(),
 dedupeItems:(_,items)=>({items}),
 readState:async id=>({id}),
 itemCompleted:x=>x.formGroup==='done',
 groupTasks:x=>x
};
vm.runInNewContext(source.slice(start,end),ctx);
(async()=>{
 let result=await ctx.root.__SAGS_DAILY_ROSTER_FINAL_V1199.readOverview('2026-10-05');
 assert.equal(result.scope,'PERSONAL');
 assert.equal(result.groups.map(x=>x.item.assignmentId).join(','),'a,e');
 assert.equal(result.groups[0].st.id,'a');

 result=await ctx.root.__SAGS_DAILY_ROSTER_FINAL_V1199.readOverview('2026-10-05',{allFlights:true});
 assert.equal(result.scope,'PERSONAL','employee cannot elevate itself to all-flight scope');
 assert.equal(result.groups.map(x=>x.item.assignmentId).join(','),'a,e');

 manager=true;
 result=await ctx.root.__SAGS_DAILY_ROSTER_FINAL_V1199.readOverview('2026-10-05',{allFlights:true});
 assert.equal(result.scope,'ALL');
 assert.equal(result.groups.map(x=>x.item.assignmentId).join(','),'a,b,e');

 owner='';assert.equal((await ctx.root.__SAGS_DAILY_ROSTER_FINAL_V1199.readOverview('2026-10-05')).groups.length,0);

 owner='alice';manager=false;ctx.readState=async()=>{owner='bob';return {}};
 await assert.rejects(ctx.root.__SAGS_DAILY_ROSTER_FINAL_V1199.readOverview('2026-10-05'),/Account changed/);
 assert(calls>=2);
 console.log('Home overview scope passed: employees stay personal; authorized managers can read all flights');
})().catch(e=>{console.error(e);process.exitCode=1});

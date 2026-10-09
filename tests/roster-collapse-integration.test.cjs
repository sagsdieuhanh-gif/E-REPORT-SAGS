const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const file=fs.readFileSync(path.resolve(__dirname,'../app/generated/core-flight.js'),'utf8');
const start=file.indexOf('function rosterSafeCollapseCandidate('),end=file.indexOf('}function seedFor(rec)',start);
assert.ok(start>=0&&end>start,'roster family helpers missing');
const extract=file.slice(start,end+1);
const upper=x=>String(x??'').trim().toUpperCase(),S=x=>String(x??'').trim();
const xfn=new Function('grndCorPlan','normUser','validRosterUser','rosterValueHasData','parseDate','seedFor','sessionIsCompleted','S','upper','allFlightRows','headerRowInfo','getCell','flightIdForRoster','rosterSlotSource','sameRosterFlightIdentity','safeKey','sagsV470Ref','MANIFEST_PATH','SESSION_PATH','formLabel',extract+';return existingRosterFormFamilyLocks');
const date='2026-10-09',row=['FlightNo','ArrFlightDate','DepFlightDate','Grnd_Cor','Grnd_Ld'],data=['FD123/FD124','Oct 09, 26','Oct 09, 26','PHUONGDD',''];
const make=(st421,st551)=>{
 const manifest={items:{
  old421:{assignmentId:'old421',active:true,flightId:'FLT1',formGroup:'fsags421',sourceColumn:'Grnd_Cor',roleKey:'COR',user:'KIEN',opDate:date,flightRaw:'FD123/FD124',sta:'12:00',acReg:'RA73850'},
  old551:{assignmentId:'old551',active:true,flightId:'FLT1',formGroup:'fsags551',sourceColumn:'Grnd_Ld',roleKey:'LD',user:'PHUONGDD',opDate:date,flightRaw:'FD123/FD124',sta:'12:00',acReg:'RA73850'}
 }};
 const snap=address=>({
  once:async()=>({val:()=>address.startsWith('roster_manifests/')?manifest:address.endsWith('old421')?st421:st551})
 });
 const find=xfn(
  x=>({turn:S(x).split(/[;,/]/).map(S).filter(Boolean),arr:[],dep:[]}),
  upper,x=>/^[A-Z][A-Z0-9]+$/.test(x),
  v=>v===true||(v!==false&&v!==null&&v!==undefined&&JSON.stringify(v)!=='""'),
  x=>({display:'09/10/2026'}),
  x=>x.formGroup==='fsags421'?{f421_date:x.date,f421_sta:x.sta,f421_regn:x.acReg}:x.formGroup==='fsags551'?{f551_date:x.date,f551_sta:x.sta,f551_regn:x.acReg}:{},
  x=>x?.taskStatusV333==='COMPLETED',
  S,upper,
  ()=>({records:[{opDate:date,rowNo:2,arrFlight:'FD123',depFlight:'FD124',flightRaw:'FD123/FD124',flightName:'FD123 / FD124'}]}),
  ()=>({row:0,map:Object.fromEntries(row.map((k,i)=>[k,i]))}),
  (r,m,k)=>S(r[m[k]]),
  ()=>'FLT1',
  x=>S(x.roleKey)==='COR'?'GRND_COR':'GRND_LD',
  (a,b)=>S(a.flightRaw).replace(/\s/g,'')===S(b.flightRaw).replace(/\s/g,''),
  S,snap,'roster_manifests','roster_sessions',x=>x);
 return find({rows:[row,data]});
};
module.exports=(async()=>{
 const initial=await make({envelope:{state:{f421_date:'09/10/2026',f421_sta:'12:00',f421_regn:'RA73850'}}},{envelope:{state:{f551_date:'09/10/2026',f551_sta:'12:00',f551_regn:'RA73850'}}});
 const solo=initial[date+'|FLT1'];
 assert.equal(solo.family,'423','KIEN/PHUONGDD -> solo PHUONGDD must switch to 42.3');
 assert.equal(solo.assignmentIdVariant,'SAFE423_V1','new 42.3 must have independent assignment id');
 const edited=await make({envelope:{state:{f421_notes:'typed by worker'}}},{envelope:{state:{f551_date:'09/10/2026'}}});
 assert.equal(edited[date+'|FLT1'].family,'421_551','manual data must remain in original form');
 assert.ok(edited[date+'|FLT1'].safeCollapseBlocked,'manual data requires explicit warning');
 const signed=await make({}, {signedAtMs:100});
 assert.equal(signed[date+'|FLT1'].family,'421_551','signed 55.1 must not be replaced');
 console.log('Roster 2-to-1 integration simulation passed');
})().catch(e=>{console.error(e);process.exitCode=1});

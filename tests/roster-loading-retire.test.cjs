const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),code=fs.readFileSync(path.join(root,'app/generated/core-flight.js'),'utf8');
assert.equal(code,fs.readFileSync(path.join(root,'app/core/phases/core-flight.js'),'utf8'));
for(const token of ['function rosterMissingLoadingSuccessor(','UNASSIGNED_LOADING_ARCHIVED','UNASSIGNED_LOADING_NO_DATA','rosterArchives/','rosterSafeCollapseProtectionReason(oldSt,x,opDate)','const expected423=recs0.filter','42.3 đã tạo nhưng 42.1/55.1 cũ chưa thu hồi hết','const rows=[...grouped.values()].slice(0,100),collapsed=(data.collapseWarnings||[])'])assert.ok(code.includes(token),token);
const from=code.indexOf('function rosterMissingLoadingSuccessor('),to=code.indexOf('function sameRosterWorkerFormSwitch(',from);
assert.ok(from>0&&to>from);
const check=new Function('upper','rosterSlotSource','sameRosterFlightIdentity',code.slice(from,to)+';return rosterMissingLoadingSuccessor')(
 x=>String(x??'').toUpperCase(),
 x=>String(x?.sourceColumn||'').toUpperCase().includes('GRND_LD')?'GRND_LD':'GRND_COR',
 (a,b)=>a.flightRaw===b.flightRaw
);
const old={formGroup:'fsags551',sourceColumn:'Grnd_Ld',flightRaw:'N49901 3540'};
const sole=[{formGroup:'fsags',sourceColumn:'Grnd_Cor',flightRaw:'N49901 3540',targetUser:'PHUONGDD'}];
assert.equal(check(old,sole),true,'old 55.1 must not remain active when Loading no longer in roster');
assert.equal(check(old,[...sole,{formGroup:'fsags551',sourceColumn:'Grnd_Ld',flightRaw:'N49901 3540'}]),false,'still-assigned loading must be kept');
assert.equal(check({...old,formGroup:'fsags421'},sole),false,'never mistakenly archive 42.1');
assert.equal(check(old,[]),false,'missing flight in roster must not cause an automatic archive');
console.log('Roster stale Loading retirement and read-back release tests passed');

const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const r=path.resolve(__dirname,'..'),s=fs.readFileSync(path.join(r,'app/core/phases/core-flight.js'),'utf8');
assert.equal(s,fs.readFileSync(path.join(r,'app/generated/core-flight.js'),'utf8'));
for(const token of ['rosterSafeCollapseCandidate','rosterSafeCollapseProtected','migrationFrom:"421_551"','SAFE423_V1','SAFE_COLLAPSE_ARCHIVED','rosterArchives/','sessionReadFailedIds','sameRosterSafeCollapseReplacement(x,q)'])assert.ok(s.includes(token),token);
const choose=new Function('grndCorPlan','normUser','validRosterUser',s.slice(s.indexOf('function rosterSafeCollapseCandidate('),s.indexOf('function rosterSafeCollapseProtected('))+';return rosterSafeCollapseCandidate')(
 x=>({turn:String(x||'').split(/[,;/]/).map(k=>k.trim()).filter(Boolean)}),x=>String(x||'').toUpperCase(),x=>/^[A-Z][A-Z0-9]+$/.test(x));
assert.equal(choose('PHUONGDD','',true),'PHUONGDD');assert.equal(choose('KIEN','PHUONGDD',true),'');assert.equal(choose('KIEN,PHUONGDD','',true),'');
const protect=new Function('sessionHasOperatorEdits','sessionIsCompleted',s.slice(s.indexOf('function rosterSafeCollapseProtected('),s.indexOf('async function existingRosterFormFamilyLocks('))+';return rosterSafeCollapseProtected')(
 x=>!!x?.envelope?.state?.entered,x=>x?.taskStatusV333==='COMPLETED');
assert.equal(protect({}),false);assert.equal(protect({envelope:{state:{entered:'1144'}}}),true);assert.equal(protect({signedAtMs:1}),true);assert.equal(protect({taskStatusV333:'COMPLETED'}),true);
console.log('Safe roster-collapse regression passed');

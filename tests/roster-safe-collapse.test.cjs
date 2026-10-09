const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const r=path.resolve(__dirname,'..'),s=fs.readFileSync(path.join(r,'app/core/phases/core-flight.js'),'utf8');
assert.equal(s,fs.readFileSync(path.join(r,'app/generated/core-flight.js'),'utf8'));
for(const token of ['rosterSafeCollapseCandidate','rosterSafeCollapseProtected','migrationFrom:"421_551"','SAFE423_V1','SAFE_COLLAPSE_ARCHIVED','rosterArchives/','sessionReadFailedIds','sameRosterSafeCollapseReplacement(x,q)'])assert.ok(s.includes(token),token);
const choose=new Function('grndCorPlan','normUser','validRosterUser',s.slice(s.indexOf('function rosterSafeCollapseCandidate('),s.indexOf('function rosterSafeCollapseProtected('))+';return rosterSafeCollapseCandidate')(
 x=>({turn:String(x||'').split(/[,;/]/).map(k=>k.trim()).filter(Boolean)}),x=>String(x||'').toUpperCase(),x=>/^[A-Z][A-Z0-9]+$/.test(x));
assert.equal(choose('PHUONGDD','',true),'PHUONGDD');assert.equal(choose('KIEN','PHUONGDD',true),'');assert.equal(choose('KIEN,PHUONGDD','',true),'');
const part=s.slice(s.indexOf('function rosterSafeCollapseProtectionReason('),s.indexOf('async function existingRosterFormFamilyLocks('));
const guard=new Function('S','parseDate','seedFor','sessionIsCompleted','rosterValueHasData',part+';return rosterSafeCollapseProtected')(
 x=>String(x??'').trim(),x=>({display:'09/10/2026'}),
 x=>x.formGroup==='fsags421'?{f421_date:x.date,f421_sta:x.sta,f421_regn:x.acReg}:{},
 x=>x?.taskStatusV333==='COMPLETED',
 v=>v===true||v!==false&&v!==null&&v!==undefined&&JSON.stringify(v)!=='""'
);
const old={formGroup:'FSAGS421',opDate:'2026-10-09',sta:'12:00',acReg:'RA73850'};
assert.equal(guard({},old,'2026-10-09'),false);
assert.equal(guard({envelope:{state:{f421_date:'09/10/2026',f421_sta:'12:00',f421_regn:'RA73850'}}},old,'2026-10-09'),false,'old automatically seeded roster state must not be treated as entered data');
assert.equal(guard({envelope:{state:{f421_date:'09/10/2026',f421_notes:'entered'}}},old,'2026-10-09'),true);
assert.equal(guard({envelope:{state:{f421_sta:'13:00'}}},old,'2026-10-09'),true);
assert.equal(guard({signedAtMs:1},old,'2026-10-09'),true);
assert.equal(guard({taskStatusV333:'COMPLETED'},old,'2026-10-09'),true);
assert.ok(s.includes('else if(!x.collapseWarnings?.length)setStatus'),'blocked warning must not be hidden by a success toast');
assert.ok(s.includes('preview?.collapseWarnings?.length'),'blocked warning must persist after publish');
const explain=new Function('S','parseDate','seedFor','sessionIsCompleted','rosterValueHasData',part+';return rosterSafeCollapseProtectionReason')(
 x=>String(x??'').trim(),()=>({display:'09/10/2026'}),()=>({}),()=>false,
 v=>v===true||v!==false&&v!==null&&v!==undefined&&JSON.stringify(v)!=='""');
assert.match(explain({reopenedAtMs:123},old,'2026-10-09'),/MỞ LẠI/,'reopened completion must show distinct reason');
assert.match(explain({handoverQrClaimedAtMs:456},old,'2026-10-09'),/BÀN GIAO qua QR/,'QR handover must show distinct reason');
assert.equal(explain({taskStatusV333:'IN_PROGRESS'},old,'2026-10-09'),'','claim-only status is not entered data');
assert.ok(s.includes('Trạng thái đang nhập không tự chứng minh đã nhập tay'),'the warning must distinguish a claim from typed data');
console.log('Safe roster-collapse regression passed');

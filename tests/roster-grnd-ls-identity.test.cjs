const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync(__dirname+'/../app/core/phases/core-flight.js','utf8');
const start=code.indexOf('!function(root){const ENGINE='),end=code.indexOf('function rosterSafeCollapseCandidate(',start);
const window={sagsAirlineFormPolicy:{allowed:()=>true}};
vm.runInNewContext(code.slice(start,end)+'root.parse=rosterRecords;}(window);',{window});
function parse(header='Grnd_Ls',users='KIENNT',flight='VJ123 124'){
 return window.parse({rows:[['21/10/2026'],['FlightNo','STA','STD','Grnd_Cor',header],[flight,'1000','1100','PHUONGDD',users]]}).records;
}
const cbtt=parse().filter(x=>x.roleKey==='CBTT');
assert.equal(cbtt.length,3);
assert.equal(new Set(cbtt.map(x=>x.assignmentId)).size,3,'FINAL, 54 and 94 must never overwrite each other');
const final=cbtt.find(x=>x.formGroup==='final');
assert.equal(parse('Grnd_Ls').find(x=>x.formGroup==='final').assignmentId,final.assignmentId,'stable re-import');
assert.equal(parse('Grnd_LS').filter(x=>x.roleKey==='CBTT').length,3,'accept uppercase LS header');
const multi=parse('GRND_LS','KIENNT/PHUONGDD').filter(x=>x.roleKey==='CBTT');
assert.equal(multi.length,6);assert.equal(new Set(multi.map(x=>x.assignmentId)).size,6);
for(const flight of ['VJ123 124','VU123 124','KE123 124'])assert(!parse('Grnd_Ls','KIENNT',flight).some(x=>x.formGroup==='tvjgof035'));
assert(parse('Grnd_Ls','KIENNT','VZ123 124').some(x=>x.formGroup==='tvjgof035'));
console.log('Grnd_LS: distinct forms/users, header casing, stable IDs and VZ-only routing passed');
const from=code.indexOf('function sameRosterWorkSlot('),to=code.indexOf('const ROSTER_RAMP_FORMS',from);
const sameSlot=new Function('rosterSlotSource','upper','rosterWorkSlotKey','sameRosterFlightIdentity',code.slice(from,to)+';return sameRosterWorkSlot')(()=> 'GRND_LS',x=>String(x||'').toUpperCase(),()=> 'SAME_FLIGHT_LS_SLOT',()=>true);
assert.equal(sameSlot({formGroup:'final'},{formGroup:'FSAGS54'}),false,'54 must not revoke a FINAL assignment');
assert.equal(sameSlot({formGroup:'clc_checklist'},{formGroup:'final'}),false,'FINAL must not revoke 94');
assert.equal(sameSlot({formGroup:'final'},{formGroup:'final'}),true,'same-form owner reassignment still works');

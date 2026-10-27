'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const phase=fs.readFileSync('app/core/phases/core-control.js','utf8');
const generated=fs.readFileSync('app/generated/core-control.js','utf8');
const roster=fs.readFileSync('app/core/phases/core-flight.js','utf8');
const personal=fs.readFileSync('app/modules/daily-roster.v502.js','utf8');
const final=fs.readFileSync('app/boot/06-legacy.js','utf8');
assert.equal(phase,generated,'Release-generated core control must match authoritative source');
assert(phase.includes('function formOptions(unit){if("CBTT"===unit)return[];'),'CBTT cannot be offered manual FINAL assignment');
assert(phase.includes('root.sagsV340OpenManualFlight=function(){if("CBTT"===unitForProfile()&&"AD"!==role())return;'),
 'CBTT cannot open the manual assignment dialog');
assert(phase.includes('Object.entries(UNITS).filter(([k])=>k!=="CBTT")'),
 'CBTT option absent from admin manual creation modal');
const guard='if(unit==="CBTT"||formGroup==="final")throw new Error("Tạm ngưng phân công FINAL/bảng tải thủ công vào chuyến của CBTT.");';
assert(phase.includes(guard),'Direct old form submit must be blocked before any Firebase query/write');
const createAt=phase.indexOf('root.sagsV340CreateManualFlight=async function()');
assert(createAt>=0&&phase.indexOf(guard,createAt)>createAt);
assert(phase.indexOf(guard,createAt)<phase.indexOf('db(`flight_records/',createAt),
 'Validation must reject before any flight record write');
// Roster source, 54/94 and FINAL crosscheck remain present; no historic records are deleted.
assert(roster.includes('lsUsers.forEach((u,j)=>{add(u,"final","Grnd_Ls","CBTT"'));
assert(personal.includes("CBTT FINAL is not in operational use"));
assert(final.includes('ffX3StartMailbox()'));
console.log('CBTT manual FINAL assignment disabled: UI, direct submit; roster and existing crosscheck retained PASS');

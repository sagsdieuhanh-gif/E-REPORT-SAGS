'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const gate=fs.readFileSync('app/modules/radio-work-gate.v1.js','utf8');
const custody=fs.readFileSync('app/modules/radio-custody.v1.js','utf8');
const reminders=fs.readFileSync('app/modules/radio-reminders.v21.js','utf8');
assert(!gate.includes('WORKDAY_CUTOFF_HOUR=4'),'4 AM cutoff must be removed');
assert(!custody.includes('Từ 04:00'),'Admin UI must not claim incorrect prior cutoff');
assert(!custody.includes('>=OVERDUE_MS'),'Never use fixed hours to decide a missed return');
assert(!reminders.includes('OVERDUE_MS=12'),'Visual reminders must use shift rollover');
assert(custody.includes('shiftVal=shift()'),'Signing shift must follow actual clock, not manual UI');
assert(custody.includes("e.disabled=busy||e.id==='radioShift'"),'Signing form must not let user override clock-derived shift');
assert(custody.includes('const {start,end}=shiftBounds(day,shift),db=fs()'),'Report must use exact time window');
assert(custody.includes("const {start,end}=shiftBounds(day,S($('radioRosterShift').value))"),'Roster audit must query same time window');
const gateStart=gate.indexOf(' function radioShiftAt(ms){'),gateEnd=gate.indexOf(' function radioTimestampMs(',gateStart);
assert(gateStart>0&&gateEnd>gateStart);
const g={Intl,Date,Number};vm.createContext(g);vm.runInContext(gate.slice(gateStart,gateEnd)+'\nthis.shiftAt=radioShiftAt;',g);
const a=custody.indexOf('function radioShiftAt(ms){'),b=custody.indexOf('function heldBy(uid){',a);
const d=custody.indexOf('function vnDateKey('),e=custody.indexOf('function reportScope()',d);
const r={Intl,Date,Number,Math,VN:'Asia/Ho_Chi_Minh'};
vm.createContext(r);vm.runInContext(custody.slice(d,e)+'\n'+custody.slice(a,b)+'\nthis.shiftAt=radioShiftAt;this.bounds=shiftBounds;this.shift=shift;',r);
const moments=[
 ['2026-11-11T01:29:59Z','2026-11-10/PM'], // 08:29:59
 ['2026-11-11T01:30:00Z','2026-11-11/AM'], // 08:30
 ['2026-11-11T12:00:59Z','2026-11-11/AM'], // 19:00:59
 ['2026-11-11T12:01:00Z','2026-11-11/PM'], // 19:01
 ['2026-11-11T17:00:00Z','2026-11-11/PM'], // midnight VN
 ['2026-11-11T21:00:00Z','2026-11-11/PM'], // 04:00 VN
 ['2026-11-12T01:29:59Z','2026-11-11/PM'], // 08:29:59 next day
 ['2026-11-12T01:30:00Z','2026-11-12/AM'] // 08:30 next day
];
for(const [stamp,expected] of moments){
 const ms=Date.parse(stamp);
 assert.equal(g.shiftAt(ms).key,expected,'Flight gate '+stamp);
 assert.equal(r.shiftAt(ms).key,expected,'Radio custody '+stamp);
}
for(const [day,which,start,end] of [
 ['2026-11-11','AM','2026-11-11T01:30:00.000Z','2026-11-11T12:01:00.000Z'],
 ['2026-11-11','PM','2026-11-11T12:01:00.000Z','2026-11-12T01:30:00.000Z']
]){
 const bounds=r.bounds(day,which);
 assert.equal(bounds.start.toISOString(),start);
 assert.equal(bounds.end.toISOString(),end);
}
console.log('Shift boundary policy PASS: 08:30–19:00 AM, 19:01–08:29 PM, overnight reports/roster, no 04:00 lock');

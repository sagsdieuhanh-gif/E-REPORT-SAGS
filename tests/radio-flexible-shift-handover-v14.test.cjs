'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('app/modules/radio-custody.v1.js','utf8');
const reminder=fs.readFileSync('app/modules/radio-reminders.v21.js','utf8');
const gate=fs.readFileSync('app/modules/radio-work-gate.v1.js','utf8');
const rule=fs.readFileSync('firebase/firestore.rules','utf8');
for(const marker of [
 'id="radioShift"','value="">— Bắt buộc chọn ca —',
 "e.id==='radioShift'&&mode!=='ISSUE'",
 "shiftVal=mode==='ISSUE'?S($('radioShift').value)",
 "Ca nhận bộ đàm (bắt buộc)","Ca của lượt nhận ban đầu được giữ nguyên khi trả hoặc đổi máy.",
 "const DRAFT_FIELDS=['radioReturnReason','radioDetail','radioShift']",
 "if(typeof draft.fields?.[id]==='string')",
 "radioReportEventDuty(e).key===day+'/'+shift",
 "radioReportEventDuty(e).key!==reportDate+'/'+reportShift",
 "radioCustodyDue(heldAtMs,d.shift)",
 "return !!at&&now>=radioCustodyDue(at,d.shift)",
 "radioCustodyDuty(time,e.shift)","radioCustodyDue(time,e.shift)"
])assert(source.includes(marker),'Missing early handover safety: '+marker);
assert(rule.includes("d.shift in ['', 'AM','PM']"),'Selected shift is already an allowed field; no production Rules changes are needed');
const basic=source.slice(source.indexOf('function radioShiftAt(ms){'),source.indexOf('function heldBy(uid){'));
const dayHelpers=source.slice(source.indexOf('function vnDateKey('),source.indexOf('function syncRadioReportMode(){'));
const reportHelpers=source.slice(source.indexOf('function radioReportFetchBounds('),source.indexOf('function reportScope(){'));
const reconciliation=source.slice(source.indexOf('function radioReconcileCustody('),source.indexOf('function radioOutstandingSummaryHtml('));
const c={Intl,Date,Math,Number,Map,Set,Array,Promise,
 VN:'Asia/Ho_Chi_Minh',S:x=>String(x??'').trim(),radioHeldSince:d=>d.heldSince||d.updatedAt};
vm.createContext(c);
vm.runInContext(basic+dayHelpers+reportHelpers+reconciliation+
 '\nthis.receiveWindow=radioReceiveWindow;this.duty=radioCustodyDuty;this.due=radioCustodyDue;this.clock=radioShiftAt;this.preselect=radioPreselectShift;this.reportBounds=radioReportFetchBounds;this.eventDuty=radioReportEventDuty;this.reconcile=radioReconcileCustody;this.live=radioLiveCustody;this.staffStats=radioStaffStatistics;',c);
const when=x=>Date.parse(x);
const early=when('2026-11-24T18:15:00+07:00');
const early1730=when('2026-11-24T17:30:00+07:00');
const eveningDue=when('2026-11-25T08:30:00+07:00');
const morningDue=when('2026-11-24T19:01:00+07:00');
for(const [clock,expected] of [
 ['2026-11-24T07:59:00+07:00','2026-11-23/PM'],
 ['2026-11-24T08:00:00+07:00','2026-11-24/AM'],
 ['2026-11-24T18:30:00+07:00','2026-11-24/AM'],
 ['2026-11-24T18:31:00+07:00','2026-11-24/PM'],
 ['2026-11-25T07:59:00+07:00','2026-11-24/PM'],
 ['2026-11-25T08:00:00+07:00','2026-11-25/AM']
]){
 assert.equal(c.receiveWindow(when(clock)).key,expected,'Exact received-window cutoff '+clock);
}
assert(source.includes("action==='ISSUE'?'':"),'Even 08:00 and 20:00 must not silently preselect an employee shift');
assert(source.includes("if(!['AM','PM'].includes(shiftVal))return notify"),'Empty choice must block receipt');
for(const ms of [early,early1730]){
 assert.equal(c.clock(ms).key,'2026-11-24/AM','Nominal clock shift remains AM');
 assert.equal(c.duty(ms,'PM').key,'2026-11-24/PM','Selected PM should own early evening receipt');
 assert.equal(c.due(ms,'PM'),eveningDue,'Early night receipt must not be due until next morning');
 assert.equal(c.duty(ms,'AM').key,'2026-11-24/AM');
 assert.equal(c.due(ms,'AM'),morningDue,'Morning receipt remains due at 19:01');
}
assert.equal(c.preselect(early),'','At handover overlap employee must explicitly select shift');
assert.equal(c.preselect(when('2026-11-24T10:00:00+07:00')),'','Morning must also be an explicit selection');
assert.equal(c.preselect(when('2026-11-24T20:00:00+07:00')),'','Night must also be an explicit selection');
assert.equal(c.duty(when('2026-11-25T07:59:00+07:00'),'PM').key,'2026-11-24/PM');
assert.equal(c.duty(when('2026-11-25T07:30:00+07:00'),'AM').key,'2026-11-25/AM','Early morning duty can be selected');
assert.equal(c.duty(when('2026-11-25T08:10:00+07:00'),'PM','RETURN').key,'2026-11-24/PM',
 'An 08:10 return still belongs to the preceding night duty ending 08:29');
assert.equal(c.duty(when('2026-11-25T08:10:00+07:00'),'PM','ISSUE').key,'2026-11-25/PM',
 'Receiving window starts AM at 08:00; explicit PM pickup is not silently re-dated');
assert.equal(c.duty(when('2026-11-25T08:10:00+07:00'),'AM','ISSUE').key,'2026-11-25/AM');
const device=(code,shift)=>({code,status:'OUT',holderUid:code,holderName:code,shift,heldSince:{toMillis:()=>early}});
const inventory=[device('DH01','AM'),device('DH02','PM')];
const alert=c.live(inventory,when('2026-11-24T19:00:00+07:00'));
assert.equal(alert.filter(x=>x.overdue).length,0,'At 19:00 both shifts still valid');
const after=c.live(inventory,when('2026-11-24T19:01:00+07:00'));
assert.equal(after.filter(x=>x.overdue).length,1,'Only AM person can be overdue at 19:01');
assert.equal(after.find(x=>x.deviceCode==='DH02').dueMs,eveningDue);
assert.equal(c.live(inventory,eveningDue).filter(x=>x.overdue).length,2);
const ev=(id,code,shift,action='ISSUE',ms=early)=>({
 id,deviceCode:code,shift,action,personUid:code,personName:code,actorUid:code,actorName:code,
 at:{toMillis:()=>ms}
});
const pair=[ev('a','DH01','AM'),ev('b','DH02','PM')];
const matched=c.reconcile(pair,when('2026-11-24T19:01:00+07:00'));
assert.equal(matched.outstanding.length,2);
assert.equal(matched.outstanding.filter(x=>x.overdue).length,1,'Reconciliation must honor selected PM shift');
assert.equal(c.staffStats(pair,when('2026-11-24T19:01:00+07:00')).staff.filter(x=>x.overdue).length,1);
assert.equal(c.eventDuty(pair[1]).key,'2026-11-24/PM','Early PM belongs to PM PDF');
assert.equal(c.eventDuty(pair[0]).key,'2026-11-24/AM','Actual AM remains AM');
assert.equal(c.reportBounds('2026-11-24','PM').start.toISOString(),'2026-11-23T17:00:00.000Z','PM reporting query starts before early pickup');
assert.equal(c.reportBounds('2026-11-24','PM').end.toISOString(),'2026-11-25T01:30:00.000Z');
const active={flightId:'VN100',active:true,taskStatusV333:'PENDING'};
const fakeWindow={addEventListener(){},currentUserProfile:{},firebase:{}},fakeDocument={readyState:'loading',addEventListener(){}};
vm.runInNewContext(reminder,{window:fakeWindow,document:fakeDocument,setTimeout(){},setInterval(){},clearTimeout(){},clearInterval(){},navigator:{onLine:true},Intl,Date});
const api=fakeWindow.SAGSRadioRemindersV21;
assert(api,'Reminder module should initialize');
assert.equal(api.evaluate([active],[device('DH02','PM')],'DH02',when('2026-11-24T19:10:00+07:00')),null,'No premature night-shift RETURN reminder');
assert.equal(api.evaluate([active],[device('DH02','PM')],'DH02',when('2026-11-25T08:30:00+07:00')).kind,'RETURN');
assert.equal(api.evaluate([],[device('DH02','PM')],'DH02',when('2026-11-24T19:10:00+07:00')),null,'No return alert merely because night shift has not received flight roster yet');
const gateCut=gate.slice(gate.indexOf(' function radioShiftAt(ms){'),gate.indexOf(' function gateError('));
const g={Intl,Date,Number,VN_ZONE:'Asia/Ho_Chi_Minh',S:x=>String(x??'').trim()};
vm.createContext(g);vm.runInContext(gateCut+'\nthis.due=radioCustodyDueMs;',g);
assert.equal(g.due(early,'PM'),eveningDue);
assert.equal(g.due(early,'AM'),morningDue);
console.log('Early night-shift radio custody PASS: 17:30/18:15 PM, morning alternative, 19:01 and 08:30 cutoffs, live alerts, daily PDF, reminders, no new Rules');

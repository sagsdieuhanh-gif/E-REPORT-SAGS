'use strict';
const assert=require('node:assert/strict');
const {range,summarize,RECIPIENTS}=require('../firebase/functions/radio-report.cjs');
const d=range('daily',new Date('2026-11-02T00:05:00Z'));
assert.deepEqual([d.start,d.end,d.key],['2026-11-01','2026-11-02','daily_2026-11-01']);
const w=range('weekly',new Date('2026-11-02T00:15:00Z'));
assert.deepEqual([w.start,w.end,w.key],['2026-10-26','2026-11-02','weekly_2026-10-26']);
assert.deepEqual(RECIPIENTS,['HUNGHT-CXR@SAGS.VN','XUANDT-CXR@SAGS.VN','MANAGERONDUTY-CXR@SAGS.VN']);
const e={action:'REPORT',deviceCode:'DH03',reasonCode:'INTERMITTENT',signature:'sensitive',at:{toDate:()=>new Date('2026-11-01T00:00:00Z')}};
const devices=[
 {code:'DH03',status:'OUT',faultCode:'INTERMITTENT'},
 {code:'DH04',status:'READY',faultCode:'BATTERY_WEAK'}
];
const s=summarize(devices,[e,{action:'RETURN',deviceCode:'DH04',reasonCode:'BATTERY_WEAK'}],d);
assert.equal(s.status.OUT,1);
assert.equal(s.status.READY,1);
assert.equal(s.problems.length,2);
assert.deepEqual(s.unresolved.map(x=>x.code),['DH03','DH04']);
assert(!JSON.stringify(s).includes('sensitive'));
console.log('Radio daily/weekly VN period, recipients and no-signature report PASS');

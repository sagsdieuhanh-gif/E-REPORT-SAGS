'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('app/modules/radio-custody.v1.js','utf8');
const rules=fs.readFileSync('firebase/firestore.rules','utf8');
for(const absent of ['id="radioBattery"','id="radioSwapBattery"',
 'id="radioBatteryWrap"','id="radioSwapBatteryWrap"',
 "shiftVal=nativeDraft?.shift||shift(),bat=$('radioBattery').value",
 "swapBattery=$('radioSwapBattery').value",
 'Vui lòng kiểm tra mức pin trước khi nhận hoặc trả máy.',
 'Vui lòng ghi mức pin máy thay thế trước khi đổi.',
 'Pin máy thay thế','Pin lúc nhận/trả'])
 assert(!src.includes(absent),'Battery selection must be fully removed from signing UI: '+absent);
assert(src.includes("const DRAFT_FIELDS=['radioReturnReason','radioDetail','radioShift']"),
 'Saved iOS drafts must preserve chosen duty shift while never reading nonexistent battery fields');
assert(src.includes('battery:radioBatteryForWrite(b)'),
 'Atomic SWAP_IN uses previously recorded battery instead of removed select');
assert(src.includes('battery:radioBatteryForWrite(d)'),
 'ISSUE uses device state rather than asking staff for battery');
assert(src.includes('battery:radioBatteryForFaultReport(a,reason)'),
 'SWAP_OUT records reason-based fault if appropriate');
assert(src.includes('battery:radioBatteryForFaultReport(d,reason)'),
 'REPORT must still record explicit pin issue');
assert(src.includes("const battery=radioBatteryForWrite(d),low="),
 'RETURN must avoid mandatory battery select while preserving warning logic');
assert(rules.includes("next.battery in ['FULL','GOOD','LOW','EMPTY']"),
 'Client must continue to satisfy existing live Firebase Rules');
const start=src.indexOf('function radioBatteryForWrite('),
 end=src.indexOf('const radioHeldSince=',start);
assert(start>=0&&end>start);
const context={S:x=>String(x??'').trim()};
vm.createContext(context);
vm.runInContext(src.slice(start,end)+
 '\nthis.auto=radioBatteryForWrite;this.report=radioBatteryForFaultReport;',context);
const c=context;
assert.equal(c.auto({battery:'FULL',faultCode:''}),'FULL');
assert.equal(c.auto({battery:'GOOD',faultCode:''}),'GOOD');
assert.equal(c.auto({battery:'LOW',faultCode:''}),'LOW');
assert.equal(c.auto({battery:'EMPTY',faultCode:''}),'EMPTY');
assert.equal(c.auto({battery:'UNKNOWN',faultCode:''}),'GOOD',
 'Legacy UNKNOWN must use valid Firestore compatibility value without blocking signature');
assert.equal(c.auto({battery:'GOOD',faultCode:'BATTERY_WEAK'}),'LOW');
assert.equal(c.auto({battery:'GOOD',faultCode:'BATTERY_EMPTY'}),'EMPTY');
assert.equal(c.report({battery:'UNKNOWN',faultCode:''},'AUDIO'),'UNKNOWN',
 'Nonbattery reports must not invent a battery assessment');
assert.equal(c.report({battery:'GOOD'},'BATTERY_WEAK'),'LOW');
assert.equal(c.report({battery:'FULL'},'BATTERY_EMPTY'),'EMPTY');
console.log('V1.1 radio signing no PIN selector and compatibility with Firebase Rules, existing battery/fault and iOS draft integrity PASS');

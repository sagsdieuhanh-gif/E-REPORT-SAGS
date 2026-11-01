'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const rules=fs.readFileSync('firebase/firestore.rules','utf8'),front=fs.readFileSync('app/modules/radio-custody.v1.js','utf8');
for(const col of ['sags_radio_devices_v1','sags_radio_events_v1','sags_radio_mail_runs_v1'])
 assert(rules.includes('match /'+col+'/'),col+' must have rule');
assert(rules.includes('getAfter(/databases/$(database)/documents/sags_radio_events_v1/$(d.lastEventId))'));
assert(rules.includes('allow update, delete: if false;'));
assert(rules.includes('allow create, update, delete: if false;'));
for(const action of ['ISSUE','RETURN','REPORT','SWAP_IN','SWAP_OUT','RELEASE','INIT'])assert(front.includes(action));
assert(front.includes('runTransaction')&&front.includes("if(!navigator.onLine)")&&front.includes("toDataURL('image/webp'"));
assert(!front.includes('localStorage.setItem('));
assert(front.includes('if(d.status===')&&front.includes('faultCode'));
console.log('Radio custody static security/inventory/atomic transactions tests pass');

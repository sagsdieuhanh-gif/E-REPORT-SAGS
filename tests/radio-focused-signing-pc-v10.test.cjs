'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('app/modules/radio-custody.v1.js','utf8');
const css=fs.readFileSync('app/styles/radio-custody.v1.css','utf8');
const start=source.indexOf('function radioVisibleDevices(');
const end=source.indexOf('async function start(',start);
assert(start>=0&&end>start,'Visible-device filter must precede atomic signing flow');
const filter={radioIssueable:d=>!!d&&['READY','CHARGING','FAULT'].includes(d.status)&&!d.holderUid&&d.faultCode!=='LOST'};
vm.createContext(filter);
vm.runInContext(source.slice(start,end)+'\nthis.visible=radioVisibleDevices;',filter);
const inventory=[
 {code:'DH01',status:'READY',holderUid:'',faultCode:''},
 {code:'DH02',status:'OUT',holderUid:'staff-B',faultCode:''},
 {code:'DH03',status:'CHARGING',holderUid:'',faultCode:'BATTERY_WEAK'},
 {code:'DH04',status:'FAULT',holderUid:'',faultCode:'AUDIO'},
 {code:'DH05',status:'LOST',holderUid:'',faultCode:'LOST'},
 {code:'DH06',status:'OUT',holderUid:'staff-A',faultCode:''}
];
const ids=(uid,admin=false,all=false)=>Array.from(filter.visible(inventory,uid,admin,all),d=>d.code);
assert.deepEqual(ids('staff-C'),['DH01','DH03','DH04'],
 'Staff without radio sees only free machines including advisory battery/other warnings');
assert.deepEqual(ids('staff-A'),['DH06'],
 'Staff currently holding a radio sees only their own one for returning/swapping/reporting');
assert.deepEqual(ids('staff-B'),['DH02'],'Never show someone else’s held machine');
assert.deepEqual(ids('staff-C',true,false),['DH01','DH03','DH04'],
 'AD sees only free devices by default, as do employees');
assert.deepEqual(ids('staff-C',true,true),inventory.map(x=>x.code),
 'Explicit AD management expands entire inventory');
assert.deepEqual(ids('staff-C',false,true),['DH01','DH03','DH04'],
 'A non-admin cannot force full inventory through a flag');
assert.deepEqual(ids('',false,true),['DH01','DH03','DH04'],
 'Unknown holder must not see other users’ devices');
assert(source.includes('visible=active?liveHolds.map(x=>devices.find(d=>d.code===x.deviceCode)).filter(Boolean):radioVisibleDevices(devices,u.uid,admin,adminAllDevices);'),'Filtered AD list must not change default staff visibility');
assert(source.includes("adminAllDevices=false;"));
assert(source.includes("id=\"radioAdminAll\" hidden aria-pressed=\"false\""));
assert(source.includes("id=\"radioAdminDisclosure\" class=\"radioAdminDisclosure\" hidden"));
assert(source.includes('adminToggle.setAttribute(\'aria-pressed\',String(allDevices))'));
assert(source.includes("buttons.push(['RETURN','Ký trả máy']"));
assert(source.includes("buttons.push(['ISSUE','Ký nhận máy']"));
assert(!source.includes("$('radioDeviceList').innerHTML=devices.length?devices.map"),
 'No full-device inventory by default');
for(const item of [
 '.sagsRadioPanel .radioDeviceList.radioManageAll',
 '@media(min-width:900px)',
 '.sagsRadioPanel .radioFields label{font-size:16px',
 '.sagsRadioPanel .radioDevice strong{font-size:25px',
 '.sagsRadioPanel .radioProofViewer header{display:grid',
 '@media(max-width:560px)',
 '.sagsRadioPanel .radioDeviceTools{align-items:flex-start;flex-direction:column',
 '.sagsRadioPanel .radioShell{padding:12px 10px calc(82px + env(safe-area-inset-bottom,0px))'
])assert(css.includes(item),'Desktop/mobile responsive guard missing: '+item);
const version=JSON.parse(fs.readFileSync('version.json','utf8'));
assert.match(version.displayVersion,/^V\d+\.\d+$/);
assert.match(version.version,/^V\d+\.\d+$/);
assert.match(version.build,/^V\d+\.\d+-\d{8}-/);
console.log('Radio V1.4 focused signing: available-only / held-only / admin full opt-in, defect advisory eligibility, desktop legibility and mobile overflow checks PASS');

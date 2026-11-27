'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const role=fs.readFileSync('app/boot/14-v18CanonicalAccountHierarchy.js','utf8');
const auth=fs.readFileSync('app/boot/06-legacy.js','utf8');
const labels=fs.readFileSync('app/boot/12-v484SystemDepartmentRoles.js','utf8');
const titles=fs.readFileSync('app/boot/09-v454AccountProfileOverrides.js','utf8');
const perms=fs.readFileSync('app/boot/13-v485FeaturePermissions.js','utf8');
const radio=fs.readFileSync('app/modules/radio-custody.v1.js','utf8');
const menu=fs.readFileSync('app/boot/32-v6494-aviation-shell.js','utf8');
const rules=fs.readFileSync('firebase/firestore.rules','utf8');
const snippet=fs.readFileSync('firebase/radio-custody.rules.snippet','utf8');
const account=fs.readFileSync('app/modules/admin-account-actions.v2.js','utf8');
assert(role.includes('RADIO_MANAGER:{label:"Quản lý bộ đàm",role:"RADIO_MANAGER",roleCode:"QLBD"'), 'Role must be selectable by AD');
assert(auth.includes('"VIEWER","RADIO_MANAGER"].includes(normalizeFirebaseOperationalRole(r))'), 'Firebase login allowlist must include RADIO_MANAGER after Firestore rules publish');
assert(auth.includes('RADIO_MANAGER:{label:"Quản lý bộ đàm"}'), 'Role label must exist for post-deployment enablement');
assert(!account.includes("if(d.roleCode==='RADIO_MANAGER')return status("),'AD must be allowed to create a radio-only manager account');
assert(role.includes('"Quản lý bộ đàm":"QUAN_LY_BO_DAM"'));
assert(labels.includes('RADIO_MANAGER:"Quản lý bộ đàm"'));
assert(titles.includes('"Nhân viên","Quản lý bộ đàm"'));
assert(account.includes("'RADIO_MANAGER']).has(d.username)"),'Role code is not a valid username');
assert(perms.includes('if(r==="RADIO_MANAGER")return v485Blank()'), 'No granted flight feature can elevate radio-only role');
assert(menu.includes("if(role()==='RADIO_MANAGER')return key==='home'||key==='radio'"), 'Radio-only menu contract');
assert(menu.includes("if(role()==='RADIO_MANAGER'&&key!=='home'&&key!=='radio')return;"), 'Prevent forbidden direct menu routing');
assert(radio.includes("function canMonitor(u){return isAdmin(u)||u?.role==='RADIO_MANAGER'}"));
assert(radio.includes("if(!rosterDate||!isAdmin(currentUser()))return;"),'Roster audit must remain AD only');
assert(radio.includes("if(!isAdmin(currentUser())||$('sagsRadioPanel')?.hidden)return;"),'Manager must not subscribe to RTDB roster');
assert(radio.includes("if(!isAdmin(currentUser())||!rosterDate||!connected||!navigator.onLine)return renderRosterAlert();"),'Manager must not list users for roster reconciliation');
assert(radio.includes("roster.hidden=!isAdmin(currentUser())"),'Radio manager must not see AD-only roster reconciliation');

for(const guard of [
 "if(action==='RELEASE'&&!isAdmin(u))",
 "if(['RETURN','SWAP_OUT'].includes(action)&&d.holderUid!==u.uid&&!isAdmin(u))",
 "if(!isAdmin(user)||!hasRadioWarning(d))",
 "if(!isAdmin(user))return notify('Chỉ AD được khởi tạo."
])assert(radio.includes(guard),'Must preserve AD-only radio mutations: '+guard);
assert(radio.includes("if(administrator&&allDevices&&hasRadioWarning(d))"),'Manager cannot see release action');
assert(radio.includes("if(d.status==='OUT'&&(mine||administrator&&(allDevices||active)))"),'Manager cannot sign for someone else; filtered view is AD-only');
assert(radio.includes("active=administrator&&radioOnlyUnreturned"),'Unreturned filter must be admin-only');
assert(radio.includes("const query=canMonitor(u)?db.collection(EVENTS)"),'Manager must have global immutable audit access');
assert(radio.includes("if(!canMonitor(currentUser()))return notify('Chỉ AD và Quản lý bộ đàm"),'Manager PDF permission');
assert(radio.includes("Ca sáng hết 19:00, ca tối hết 08:29"),'Radio shift boundary must remain accurate');
assert(rules.includes("data.role != 'RADIO_MANAGER'"),'Business activeUser access must exclude radio role');
assert(rules.includes("data.role == 'RADIO_MANAGER'"),'Radio role must be server-side');
assert(rules.includes("function radioMember()"));
assert(rules.includes("function radioMonitor()"));
assert(rules.includes("allow read: if radioMember() && (radioMonitor() || resource.data.actorUid == request.auth.uid)"));
assert(rules.includes("allow create: if isAdmin()\n        && radioAssetShape"),'Asset init stays AD only');
assert(rules.includes("request.resource.data.action in ['INIT','RELEASE'] ? isAdmin()"),'Admin-only event actions');
assert(rules.includes("allow read: if radioMonitor()"),'Private radio email reports visible to radio monitors');
const start=rules.indexOf('    // E-REPORT radio asset custody v1:');
const end=rules.indexOf('    match /{document=**}',start);
assert.equal(rules.slice(start,end).trimEnd(),snippet.trimEnd(), 'Radio snippet must match live rules source');
const match=radio.match(/function isAdmin\(u\)\{[^\n]+\}\nfunction canMonitor\(u\)\{[^\n]+\}/);
assert(match,'Monitor helper was not found');
const context={};vm.createContext(context);vm.runInContext(match[0]+';this.canMonitor=canMonitor;this.isAdmin=isAdmin;',context);
for(const roleName of ['RADIO_MANAGER','AD','ADMIN'])assert.equal(context.canMonitor({role:roleName}),true);
for(const roleName of ['DH','CBTT','PVHK','VIEWER'])assert.equal(context.canMonitor({role:roleName}),false);
assert.equal(context.isAdmin({role:'RADIO_MANAGER'}),false);
console.log('RADIO_MANAGER role labels, strict menu, no flight grants, server-isolated rules, monitor PDF, AD-only mutations PASS');

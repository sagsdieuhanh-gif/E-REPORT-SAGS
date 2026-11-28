'use strict';
const assert=require('node:assert/strict');
const policy=require('../app/modules/multi-role-policy.v18.js');
const p=policy.normalizeAssignments({role:'DH',jobTitle:'Nhân viên'});
assert.deepEqual(p.roles,['DH']);
assert.deepEqual(p.jobTitles,['Nhân viên']);
assert.equal(p.role,'DH');
const multi=policy.normalizeAssignments({
 role:'ĐH',roles:['CBTT','RADIO_MANAGER','DH'],jobTitle:'Nhân viên',
 jobTitles:['Ca trưởng','Nhân viên','Quản lý bộ đàm']
});
assert.deepEqual(multi.roles,['DH','CBTT','RADIO_MANAGER']);
assert.deepEqual(multi.jobTitles,['Nhân viên','Ca trưởng','Quản lý bộ đàm']);
assert.equal(policy.selectedDuty({...multi,active:true},'CBTT'),'CBTT');
assert.equal(policy.canSelectDuty({...multi,active:true},'RADIO_MANAGER'),true);
assert.equal(policy.canSelectDuty({...multi,active:false},'DH'),false);
assert.equal(policy.canSelectDuty({...multi,deleted:true},'CBTT'),false);
assert.equal(policy.canSelectDuty({...multi,active:true},'AD'),false);
assert.throws(()=>policy.selectedDuty({...multi,active:true},'PVHK'),/chưa được AD cấp/);
assert.throws(()=>policy.normalizeAssignments({role:'DH',roles:['ADMIN']}),/Không được cấp quyền AD/);
assert.throws(()=>policy.normalizeAssignments({role:'AD',roles:['CBTT']}),/AD phải độc lập/);
assert.throws(()=>policy.normalizeAssignments({role:'VIEWER',roles:['DH']}),/VIEWER/);
assert.throws(()=>policy.normalizeAssignments({role:'DH',roles:['UNLISTED']}),/không hợp lệ/);
assert.throws(()=>policy.normalizeAssignments({role:'DH',jobTitles:['Chức danh tự nhập']}),/danh mục chuẩn/);
const event=policy.auditAssignmentChange(
 {role:'DH',jobTitle:'Nhân viên'},multi,'admin-uid',Date.now());
assert.equal(event.type,'ACCOUNT_ROLE_ASSIGNMENTS');
assert.deepEqual(event.afterRoles,['DH','CBTT','RADIO_MANAGER']);
assert.deepEqual(event.beforeRoles,['DH']);
console.log('Multi-role identity contract: legacy migration, titles, selection, no AD escalation PASS');

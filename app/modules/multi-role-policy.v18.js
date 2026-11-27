/* E-REPORT SAGS: multi-role account policy, phase 1.
 * Pure identity/validation utility only. Not a privilege grant.
 * Do not wire to production until Firestore Rules and duty-scoped forms pass emulator tests.
 */
(function(root){
'use strict';
const OPERATIONS=Object.freeze(['DH','CBTT','PVHK','KH','RADIO_MANAGER']);
const ALL=Object.freeze(['AD',...OPERATIONS,'VIEWER']);
const TITLES=Object.freeze(['Trưởng phòng','Phó phòng','Đội trưởng','Đội phó','Ca trưởng','Ca phó','Nhân viên','Quản lý bộ đàm']);
const ROLE_ALIASES=Object.freeze({'ADMIN':'AD','ĐH':'DH'});
function text(value){return String(value??'').trim()}
function canonicalRole(value){return ROLE_ALIASES[text(value).toUpperCase()]||text(value).toUpperCase()}
function unique(items){return [...new Set(items)]}
function normalizeAssignments(data={}){
 const primary=canonicalRole(data.role);
 if(!ALL.includes(primary))throw new Error('Vai trò chính không hợp lệ.');
 const extra=Array.isArray(data.roles)?data.roles.map(canonicalRole):[];
 if(extra.some(x=>!ALL.includes(x)))throw new Error('Có vai trò bổ sung không hợp lệ.');
 if(extra.some(x=>x==='AD'&&primary!=='AD'))throw new Error('Không được cấp quyền AD dưới dạng vai trò bổ sung.');
 let roles=unique([primary,...extra]);
 if(primary==='AD'&&roles.length!==1)throw new Error('Vai trò AD phải độc lập.');
 if(roles.includes('VIEWER')&&roles.length!==1)throw new Error('VIEWER chỉ được cấp độc lập.');
 const initialTitle=text(data.jobTitle),extraTitles=Array.isArray(data.jobTitles)?data.jobTitles.map(text):[];
 const titles=unique([initialTitle,...extraTitles].filter(Boolean));
 if(titles.some(t=>!TITLES.includes(t)))throw new Error('Có chức danh không thuộc danh mục chuẩn.');
 if(roles.length>OPERATIONS.length||titles.length>TITLES.length)throw new Error('Vượt số lượng vai trò/chức danh.');
 return {role:primary,roles,jobTitle:initialTitle||titles[0]||'',jobTitles:titles};
}
function canSelectDuty(profile,requested){
 if(!profile||profile.active===false||profile.deleted===true)return false;
 let p;
 try{p=normalizeAssignments(profile)}catch(_){return false}
 return p.roles.includes(canonicalRole(requested));
}
function selectedDuty(profile,requested){
 if(!profile||profile.active===false||profile.deleted===true)throw new Error('Tài khoản không hoạt động.');
 const p=normalizeAssignments(profile);
 const selected=canonicalRole(requested||p.role);
 if(!p.roles.includes(selected))throw new Error('Tài khoản chưa được AD cấp vai trò này.');
 return selected;
}
function auditAssignmentChange(before,after,actorUid,atMs){
 const old=normalizeAssignments(before),next=normalizeAssignments(after);
 if(!text(actorUid))throw new Error('Không có UID AD thực hiện.');
 if(!Number.isFinite(atMs)||atMs<=0)throw new Error('Thiếu thời điểm ghi nhật ký.');
 return {type:'ACCOUNT_ROLE_ASSIGNMENTS',actorUid:text(actorUid),atMs,
  beforeRoles:old.roles,beforeTitles:old.jobTitles,afterRoles:next.roles,afterTitles:next.jobTitles};
}
const api=Object.freeze({OPERATIONS,ALL,TITLES,canonicalRole,normalizeAssignments,canSelectDuty,selectedDuty,auditAssignmentChange});
if(root)root.SAGSMultiRolePolicyV18=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:null);

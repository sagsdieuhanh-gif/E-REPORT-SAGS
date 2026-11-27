'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('app/modules/password-change-recovery.v110.js','utf8');
const boot=fs.readFileSync('app/boot/06-legacy.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const rules=fs.readFileSync('firebase/firestore.rules','utf8');
assert(src.includes('root.SAGSPasswordChangeV110=Object.freeze'),'Password module must export a safe API');
assert(boot.includes('function sagsPasswordFixReady()'),'Password module should load only when requested');
assert(boot.includes('syncBtn.hidden=!forcePasswordChangeOpen'),'Recovery button must appear only on mandatory password change');
assert(html.includes('id="ownConfirmChangedPassword"'),'Recovery button must exist in HTML');
assert(rules.includes('(activeUser() || radioManager())\n          && request.auth.uid == uid'),'Manager may update only their own password confirmation');
assert(rules.includes("request.resource.data.diff(resource.data).affectedKeys()\n               .hasOnly([\n                 'mustChangePassword',\n                 'passwordChangedAtMs'"),'Password update remains field-limited');
const fragment=src;
function scenario(){
 let password='123456',deny=false,changes=0,updates=0,authCalls=0;
 const inputs=Object.fromEntries(['ownCurrentPassword','ownNewPassword','ownConfirmPassword'].map(id=>[id,{value:''}]));
 const statuses=[];
 const profile={firebaseUid:'radio-manager',firebaseEmail:'manager@example.test',mustChangePassword:true};
 const authUser={uid:'radio-manager',email:'manager@example.test',
  async reauthenticateWithCredential(c){authCalls++;if(c.password!==password)throw {code:'auth/wrong-password'};},
  async updatePassword(p){changes++;password=p;}
 };
 const ctx={currentUserProfile:profile,forcePasswordChangeOpen:true,PERSONAL_SESSION_KEY:'test-session',
  document:{getElementById:id=>inputs[id]},setChangePasswordStatus:(s)=>statuses.push(s),
  setTimeout:()=>0,closeChangePasswordModal:()=>{},
  adFirebaseGetAuth:()=>({currentUser:authUser}),localStorage:{setItem:()=>{}},
  firebase:{auth:{EmailAuthProvider:{credential:(email,p)=>({email,password:p})}},
    firestore:()=>({collection:()=>({doc:()=>({async set(payload){updates++;if(deny)throw {code:'permission-denied'};assert.equal(payload.mustChangePassword,false)}})})})}
 };
 ctx.window=ctx;
 vm.createContext(ctx);
 vm.runInContext(fragment,ctx);
 ctx.change=ctx.SAGSPasswordChangeV110.change;
 ctx.recover=ctx.SAGSPasswordChangeV110.confirm;
 return {ctx,inputs,statuses,get password(){return password},get changes(){return changes},get updates(){return updates},get authCalls(){return authCalls},setDeny:v=>{deny=v}};
}
(async()=>{
 const good=scenario();good.inputs.ownCurrentPassword.value='123456';good.inputs.ownNewPassword.value='NewPassword#123';good.inputs.ownConfirmPassword.value='NewPassword#123';
 await good.ctx.change();
 assert.equal(good.password,'NewPassword#123');assert.equal(good.changes,1);assert.equal(good.ctx.currentUserProfile.mustChangePassword,false);
 assert(good.statuses.some(x=>x.includes('hồ sơ đã xác nhận thành công')));
 const fail=scenario();fail.setDeny(true);fail.inputs.ownCurrentPassword.value='123456';fail.inputs.ownNewPassword.value='GoodPassword#99';fail.inputs.ownConfirmPassword.value='GoodPassword#99';
 await fail.ctx.change();
 assert.equal(fail.password,'GoodPassword#99','Auth success must not be reported as total failure');
 assert.equal(fail.ctx.currentUserProfile.mustChangePassword,true,'Never claim profile sync before Firestore confirms');
 assert(fail.statuses.some(x=>x.includes('MẬT KHẨU FIREBASE ĐÃ ĐỔI THÀNH CÔNG')),'Error must describe partial success');
 fail.inputs.ownCurrentPassword.value='GoodPassword#99';fail.setDeny(false);await fail.ctx.recover();
 assert.equal(fail.changes,1,'Recovery must not rotate password a second time');
 assert.equal(fail.ctx.currentUserProfile.mustChangePassword,false,'Recovery confirms profile');
 const blocked=scenario();blocked.inputs.ownCurrentPassword.value='123456';await blocked.ctx.recover();
 assert.equal(blocked.updates,0,'Default credential cannot bypass first-change flow');
 assert(blocked.statuses.some(x=>x.includes('mật khẩu khởi tạo')));
 console.log('Password change and Firestore recovery regression PASS');
})().catch(e=>{console.error(e);process.exitCode=1});

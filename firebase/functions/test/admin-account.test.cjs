'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createAdminResetAuthPassword,strongPassword}=require('../admin-account');

class HttpsError extends Error {
  constructor(code,message){super(message);this.code=code;}
}
const strong='SaGs2026!AdminReset#A9';
function rig({actor={},target={},disabledActor=false,disabledTarget=false,failPrewrite=false,failAuth=false,failAudit=false}={}){
  const docs={
    ADMIN:{active:true,deleted:false,role:'ADMIN',email:'admin@example.invalid',...actor},
    STAFF:{active:true,deleted:false,role:'DH',email:'staff@example.invalid',...target}
  };
  const writes=[],updates=[];
  const firestore={collection:name=>{
    assert.equal(name,'users');
    return {doc:uid=>({
      get:async()=>({exists:!!docs[uid],data:()=>docs[uid]}),
      update:async patch=>{
        writes.push({uid,patch});
        if((failPrewrite&&writes.length===1)||(failAudit&&writes.length===2))throw Error('simulated Firestore failure');
        docs[uid]={...docs[uid],...patch};
      }
    })};
  }};
  const identity={
    getUser:async uid=>{
      if(!docs[uid])throw Error('missing user');
      return {uid,disabled:uid==='ADMIN'?disabledActor:disabledTarget,email:docs[uid].email};
    },
    updateUser:async(uid,patch)=>{
      if(failAuth)throw Error('simulated Auth failure');
      updates.push({uid,patch});
    }
  };
  const handler=createAdminResetAuthPassword({firestore,identity,HttpsError,now:()=>1800000000000});
  const request={auth:{uid:'ADMIN'},data:{uid:'STAFF',targetUid:'STAFF',userId:'STAFF',password:strong,newPassword:strong}};
  return {handler,request,docs,writes,updates};
}
test('strong password policy enforces 4 classes and a length floor',()=>{
  assert(strongPassword(strong));
  for(const weak of ['123456','alllowercase123456789!', 'ALLUPPERCASE12345!', 'NoDigitsPassword!', 'NoSymbolPassword2026', 'X'.repeat(129)])assert(!strongPassword(weak));
});
test('anonymous reset is rejected without accessing user data',async()=>{
  const r=rig();
  await assert.rejects(r.handler({...r.request,auth:null}),{code:'unauthenticated'});
  assert.equal(r.writes.length,0);
});
test('non-admin and disabled AD cannot reset passwords',async()=>{
  for(const x of [{actor:{role:'DH'}},{actor:{active:false}},{actor:{deleted:true}},{disabledActor:true}]){
    const r=rig(x);await assert.rejects(r.handler(r.request),{code:'permission-denied'});
    assert.equal(r.updates.length,0);
  }
});
test('inactive/deleted/disabled accounts and email mismatch are rejected',async()=>{
  for(const x of [{target:{active:false}},{target:{deleted:true}},{target:{email:''}},{disabledTarget:true}]){
    const r=rig(x);await assert.rejects(r.handler(r.request),{code:'failed-precondition'});
    assert.equal(r.updates.length,0);
  }
  const mismatch=rig();
  mismatch.request.data.targetUid='UNKNOWN';
  await assert.rejects(mismatch.handler(mismatch.request),{code:'invalid-argument'});
});
test('self-reset and weak password never reach Auth',async()=>{
  const r=rig();
  await assert.rejects(r.handler({...r.request,data:{...r.request.data,targetUid:'ADMIN',uid:'ADMIN',userId:'ADMIN'}}),{code:'failed-precondition'});
  await assert.rejects(r.handler({...r.request,data:{...r.request.data,password:'123456',newPassword:'123456'}}),{code:'invalid-argument'});
  assert.equal(r.updates.length,0);
});
test('successful reset verifies AD, enforces first-login change and never persists/returns plaintext',async()=>{
  const r=rig(),out=await r.handler(r.request);
  assert.deepEqual(out,{ok:true,uid:'STAFF',mustChangePassword:true});
  assert.equal(r.docs.STAFF.mustChangePassword,true);
  assert.equal(r.docs.STAFF.passwordResetAtMs,1800000000000);
  assert.deepEqual(r.updates,[{uid:'STAFF',patch:{password:strong}}]);
  assert(!JSON.stringify(r.writes).includes(strong));
  assert(!JSON.stringify(out).includes(strong));
});
test('Firestore prewrite failure leaves the Firebase Auth password unchanged',async()=>{
  const r=rig({failPrewrite:true});
  await assert.rejects(r.handler(r.request),/Firestore/);
  assert.equal(r.updates.length,0);
});
test('Firebase Auth failure is not reported as a successful reset',async()=>{
  const r=rig({failAuth:true});
  await assert.rejects(r.handler(r.request),/Auth failure/);
  assert.equal(r.docs.STAFF.mustChangePassword,true);
  assert.equal(r.updates.length,0);
});
test('audit timestamp failure does not hide a successfully issued password',async()=>{
  const original=console.error;let warned=false;console.error=()=>{warned=true};
  try{
    const r=rig({failAudit:true});
    assert.equal((await r.handler(r.request)).ok,true);
    assert.equal(r.updates.length,1);
    assert(warned);
  }finally{console.error=original;}
});

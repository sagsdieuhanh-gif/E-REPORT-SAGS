// E-REPORT radio custody Firebase Rules emulator: NO production connection.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {initializeTestEnvironment, assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {collection, doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, runTransaction, serverTimestamp} from 'firebase/firestore';

const projectId='demo-e-report-radio-rules';
const env=await initializeTestEnvironment({projectId,firestore:{rules:readFileSync('firebase/firestore.rules','utf8'),host:'127.0.0.1',port:8080}});
const getDb=uid=>uid?env.authenticatedContext(uid).firestore():env.unauthenticatedContext().firestore();
const root='sags_radio_devices_v1',audit='sags_radio_events_v1';
const d=code=>doc(getDb('admin'),root,code);
const sig='data:image/webp;base64,'+'a'.repeat(180);
const jpegWithin=limit=>{
 const prefix='data:image/jpeg;base64,';
 return prefix+'A'.repeat(4*Math.floor((limit-prefix.length)/4));
};
const names={admin:'Quản trị',alice:'Nhân viên A',bob:'Nhân viên B',radioManager:'Quản lý bộ đàm'};
const baseDevice=(code,eventId)=>({
 schemaVersion:1,code,label:code,status:'READY',holderUid:'',holderName:'',shift:'',faultCode:'',faultDetail:'',battery:'UNKNOWN',
 version:0,lastEventId:eventId,updatedAt:serverTimestamp()
});
const event=(uid,action,deviceCode,beforeStatus,afterStatus,version,extra={})=>({
 schemaVersion:1,action,deviceCode,actorUid:uid,actorName:names[uid],personUid:'',personName:'',
 shift:'AM',reasonCode:'',details:'',signature:action==='INIT'||action==='RELEASE'?'':sig,
 beforeStatus,afterStatus,deviceVersion:version,relatedDeviceCode:'',swapId:'',at:serverTimestamp(),...extra
});
function actor(uid){return getDb(uid)}
async function seedUsers(){
 await env.withSecurityRulesDisabled(async c=>{
  const db=c.firestore();
  for(const [uid,role,active] of [['admin','ADMIN',true],['alice','DH',true],['bob','DH',true],['radioManager','RADIO_MANAGER',true],['radioInactive','RADIO_MANAGER',false],['inactive','DH',false]]){
   await setDoc(doc(db,'users',uid),{role,active,username:uid,email:uid+'@example.test'});
  }
 });
}
async function createRadio(uid='admin',code='DH01'){
 const db=actor(uid),ref=doc(db,root,code),eRef=doc(collection(db,audit));
 return runTransaction(db,async tx=>{
  const old=await tx.get(ref);
  if(old.exists())throw Error('Already provisioned');
  tx.set(ref,baseDevice(code,eRef.id));
  tx.set(eRef,event(uid,'INIT',code,'','READY',0,{shift:''}));
 });
}
async function transition(uid,code,action,mutations={},opts={}){
 const db=actor(uid),ref=doc(db,root,code),evRef=doc(collection(db,audit));
 const {fullProof,...eventExtras}=opts;
 return runTransaction(db,async tx=>{
  const existing=await tx.get(ref);
  if(!existing.exists())throw Error('No device');
  const old=existing.data();
  const update={...mutations,version:old.version+1,lastEventId:evRef.id,updatedAt:serverTimestamp()};
  const newStatus=update.status||old.status;
  update.heldSince=newStatus!=='OUT'?null:old.status==='OUT'?(old.heldSince||old.updatedAt):serverTimestamp();
  const data=event(uid,action,code,old.status,newStatus,old.version+1,{
   personUid:action==='ISSUE'?uid:old.holderUid,
   personName:action==='ISSUE'?names[uid]:old.holderName,
   reasonCode:update.faultCode||'',...eventExtras
  });
  tx.update(ref,update);
  tx.set(evRef,data);
  if(fullProof)tx.set(doc(db,'sags_radio_proofs_v22',evRef.id),{
   schemaVersion:2,eventId:evRef.id,actorUid:uid,deviceCode:code,action,
   capturedAtMs:Date.now(),image:fullProof
  });
  return evRef.id;
 });
}
async function atomicSwap(uid,oldCode,newCode){
 const db=actor(uid),oldRef=doc(db,root,oldCode),newRef=doc(db,root,newCode);
 const oldEv=doc(collection(db,audit)),newEv=doc(collection(db,audit));
 const swapId=doc(collection(db,audit)).id;
 return runTransaction(db,async tx=>{
  const [oldSnap,newSnap]=await Promise.all([tx.get(oldRef),tx.get(newRef)]);
  const old=oldSnap.data(),next=newSnap.data();
  assert.equal(old.status,'OUT');assert.ok(['READY','FAULT','CHARGING'].includes(next.status));
  const oldState={status:'READY',holderUid:'',holderName:'',shift:'',faultCode:'BATTERY_EMPTY',faultDetail:'Hết pin trong ca trực',battery:'EMPTY',heldSince:null,version:old.version+1,lastEventId:oldEv.id,updatedAt:serverTimestamp()};
  const newState={status:'OUT',holderUid:uid,holderName:names[uid],shift:'AM',faultCode:next.faultCode,faultDetail:next.faultDetail,battery:'LOW',heldSince:serverTimestamp(),version:next.version+1,lastEventId:newEv.id,updatedAt:serverTimestamp()};
  tx.update(oldRef,oldState);
  tx.update(newRef,newState);
  tx.set(oldEv,event(uid,'SWAP_OUT',oldCode,'OUT','READY',oldState.version,{
   personUid:uid,personName:names[uid],reasonCode:'BATTERY_EMPTY',
   details:'Hết pin trong ca trực',relatedDeviceCode:newCode,swapId
  }));
  tx.set(newEv,event(uid,'SWAP_IN',newCode,next.status,'OUT',newState.version,{
   personUid:uid,personName:names[uid],reasonCode:'BATTERY_EMPTY',
   details:'Thay máy do bộ cũ hết pin',relatedDeviceCode:oldCode,swapId
  }));
 });
}
async function main(){
 await seedUsers();
 await assertFails(getDoc(doc(getDb(),root,'DH01')));
 await assertFails(getDoc(doc(getDb('inactive'),root,'DH01')));
 await assertFails(createRadio('alice','DH02')); // staff must not initialize asset master
 await assertSucceeds(createRadio('admin','DH01'));
 // RADIO_MANAGER can monitor radios but cannot read operational/business data.
 await assertSucceeds(getDoc(doc(getDb('radioManager'),root,'DH01')));
 await assertSucceeds(getDoc(doc(getDb('radioManager'),'users','radioManager')));
 await assertFails(getDoc(doc(getDb('radioManager'),'users','admin')));
 await assertFails(getDoc(doc(getDb('radioManager'),'sags_handovers','FLIGHT_TEST')));
 await assertFails(setDoc(doc(getDb('radioManager'),'sags_handovers','FLIGHT_TEST'),{kind:'airline_final_form'}));
 await assertFails(getDoc(doc(getDb('radioInactive'),root,'DH01')));
 await assertFails(createRadio('radioManager','DH20'));
 await assertFails(deleteDoc(doc(getDb('radioManager'),root,'DH01')));
 await assertSucceeds(createRadio('admin','DH07'));
 // Self-signing remains available, but no ability to impersonate another holder.
 await assertSucceeds(transition('radioManager','DH07','ISSUE',{
  status:'OUT',holderUid:'radioManager',holderName:names.radioManager,shift:'AM',
  faultCode:'',faultDetail:'',battery:'GOOD'
 }));
 await assertFails(transition('alice','DH07','RETURN',{
  status:'READY',holderUid:'',holderName:'',shift:'',faultCode:'',faultDetail:'',battery:'GOOD'
 }));
 await assertSucceeds(transition('radioManager','DH07','RETURN',{
  status:'READY',holderUid:'',holderName:'',shift:'',faultCode:'',faultDetail:'',battery:'GOOD'
 }));
 await assertSucceeds(getDocs(collection(getDb('radioManager'),audit)));
 // V2.2 high-quality photo is an immutable, private atomic companion to
 // the existing receipt; old readers continue reading event.signature.
 await assertSucceeds(createRadio('admin','DH09'));
 const proofId=await assertSucceeds(transition('alice','DH09','ISSUE',{
  status:'OUT',holderUid:'alice',holderName:names.alice,shift:'AM',
  faultCode:'',faultDetail:'',battery:'GOOD'
 },{fullProof:jpegWithin(700000),signature:jpegWithin(44000)}));
 const proofDb='sags_radio_proofs_v22';
 await assertSucceeds(getDoc(doc(getDb('admin'),proofDb,proofId)));
 await assertSucceeds(getDoc(doc(getDb('radioManager'),proofDb,proofId)));
 await assertFails(getDoc(doc(getDb('radioInactive'),proofDb,proofId)));
 await assertFails(getDocs(collection(getDb('radioManager'),proofDb)));
 await assertSucceeds(getDoc(doc(getDb('alice'),proofDb,proofId)));
 await assertFails(getDoc(doc(getDb('bob'),proofDb,proofId)));
 await assertFails(getDoc(doc(getDb(),proofDb,proofId)));
 await assertFails(getDocs(collection(getDb('alice'),proofDb)));
 await assertFails(updateDoc(doc(getDb('alice'),proofDb,proofId),{image:'FAKE'}));
 await assertFails(deleteDoc(doc(getDb('admin'),proofDb,proofId)));
 await assertFails(setDoc(doc(getDb('alice'),proofDb,'FAKE_EVENT'),{
  schemaVersion:2,eventId:'FAKE_EVENT',actorUid:'alice',deviceCode:'DH09',
  action:'ISSUE',capturedAtMs:Date.now(),image:'data:image/jpeg;base64,'+'A'.repeat(18000)
 }));
 await assertFails(transition('radioManager','DH09','RETURN',{
  status:'READY',holderUid:'',holderName:'',shift:'',faultCode:'',faultDetail:'',battery:'GOOD'
 }));
 const returnDevice={status:'READY',holderUid:'',holderName:'',shift:'',faultCode:'',faultDetail:'',battery:'GOOD'};
 await assertFails(transition('alice','DH09','RETURN',returnDevice,{
  fullProof:jpegWithin(701000),signature:jpegWithin(44000)
 }));
 assert.equal((await getDoc(d('DH09'))).data().status,'OUT','rejected evidence leaves custody intact');
 const returnId=await assertSucceeds(transition('alice','DH09','RETURN',returnDevice,{
  fullProof:jpegWithin(235000),signature:jpegWithin(44000)
 }));
 assert.equal((await getDoc(doc(getDb('admin'),proofDb,returnId))).data().image.length,jpegWithin(235000).length);
 assert.equal((await getDoc(d('DH09'))).data().lastEventId,returnId);
 // Legacy DH10 scenario: old non-battery fault + low battery + blank fault details.
 // The old client added a new battery description on RETURN while keeping MIC,
 // which Firestore correctly rejects as a mismatched historical fault update.
 await assertSucceeds(createRadio('admin','DH10'));
 await env.withSecurityRulesDisabled(c=>updateDoc(doc(c.firestore(),root,'DH10'),{
  faultCode:'MIC',faultDetail:'',battery:'LOW'
 }));
 await assertSucceeds(transition('alice','DH10','ISSUE',{
  status:'OUT',holderUid:'alice',holderName:names.alice,shift:'AM',
  faultCode:'MIC',faultDetail:'',battery:'LOW'
 }));
 await assertFails(transition('alice','DH10','RETURN',{
  status:'READY',holderUid:'',holderName:'',shift:'',
  faultCode:'MIC',faultDetail:'Pin yếu/hết pin đã được ghi nhận trước đó',battery:'LOW'
 }));
 assert.equal((await getDoc(d('DH10'))).data().status,'OUT','Rejected return must keep DH10 in custody');
 await assertSucceeds(transition('alice','DH10','RETURN',{
  status:'READY',holderUid:'',holderName:'',shift:'',
  faultCode:'MIC',faultDetail:'',battery:'LOW'
 }));
 assert.equal((await getDoc(d('DH10'))).data().status,'READY');
 await assertSucceeds(getDoc(doc(getDb('alice'),root,'DH01')));
 await assertSucceeds(transition('alice','DH01','ISSUE',{
  status:'OUT',holderUid:'alice',holderName:names.alice,shift:'AM',
  faultCode:'',faultDetail:'',battery:'GOOD'},{signature:'data:image/jpeg;base64,'+'A'.repeat(180)}));
 await assertFails(transition('bob','DH01','RETURN',{
  status:'READY',holderUid:'',holderName:'',shift:'',faultCode:'',faultDetail:'',battery:'GOOD'}));
 await assertSucceeds(transition('alice','DH01','RETURN',{
  status:'READY',holderUid:'',holderName:'',shift:'',faultCode:'',faultDetail:'',battery:'GOOD'}));
 await assertSucceeds(transition('alice','DH01','ISSUE',{
  status:'OUT',holderUid:'alice',holderName:names.alice,shift:'PM',faultCode:'',faultDetail:'',battery:'GOOD'}));
 await assertFails(transition('alice','DH01','RETURN',{
  status:'READY',holderUid:'',holderName:'',shift:'',faultCode:'',faultDetail:'',battery:'LOW'}));
 await assertSucceeds(transition('alice','DH01','RETURN',{
  status:'READY',holderUid:'',holderName:'',shift:'',faultCode:'BATTERY_WEAK',faultDetail:'Pin yếu ghi nhận',battery:'LOW'}));
 await assertFails(transition('alice','DH01','RELEASE',{
  status:'READY',holderUid:'',holderName:'',shift:'',faultCode:'',faultDetail:'',battery:'GOOD'}, {signature:'',details:'Đã sạc và kiểm tra đạt'}));
 await assertSucceeds(transition('admin','DH01','RELEASE',{
  status:'READY',holderUid:'',holderName:'',shift:'',faultCode:'',faultDetail:'',battery:'LOW'}, {signature:'',details:'Đã tiếp nhận và xử lý thông tin lỗi'}));
 await assertFails(updateDoc(doc(getDb('alice'),root,'DH01'),{label:'HACK'}));
 const own=query(collection(getDb('alice'),audit),where('actorUid','==','alice'));
 await assertSucceeds(getDocs(own));
 await assertFails(getDocs(collection(getDb('alice'),audit))); // cannot dump all signatures
 await assertSucceeds(getDocs(collection(getDb('admin'),audit)));
 const one=await getDocs(own);
 assert(one.docs.length>=3);
 await assertFails(updateDoc(one.docs[0].ref,{details:'Sửa lịch sử trái phép'}));
 await assertFails(deleteDoc(one.docs[0].ref));
 await assertFails(setDoc(doc(getDb('alice'),'sags_radio_mail_runs_v1','daily_2026-11-01'),{status:'SENT'}));
 const initial=(await getDoc(doc(getDb('admin'),root,'DH01'))).data();
 assert.equal(initial.status,'READY');
 assert.equal(initial.version,5);
 // Low battery is advisory and cannot prevent receipt, even though the user must inspect it.
 await assertSucceeds(createRadio('admin','DH02'));
 await assertSucceeds(transition('bob','DH02','ISSUE',{
  status:'OUT',holderUid:'bob',holderName:names.bob,shift:'AM',faultCode:'',faultDetail:'',battery:'LOW'
 }));
 await assertSucceeds(transition('bob','DH02','RETURN',{
  status:'READY',holderUid:'',holderName:'',shift:'',faultCode:'',faultDetail:'',battery:'GOOD'
 }));
 await assertSucceeds(transition('alice','DH01','ISSUE',{
  status:'OUT',holderUid:'alice',holderName:names.alice,shift:'AM',faultCode:'',faultDetail:'',battery:'GOOD'
 },{signature:'data:image/png;base64,'+'b'.repeat(180)}));
 // An old CHARGING record can be received as the second leg of an atomic swap.
 await env.withSecurityRulesDisabled(c=>updateDoc(doc(c.firestore(),root,'DH02'),{
  status:'CHARGING',faultCode:'CHARGING',faultDetail:'Ghi nhận lỗi sạc từ phiên bản cũ'
 }));
 await assertSucceeds(atomicSwap('alice','DH01','DH02'));
 const old=(await getDoc(doc(getDb('admin'),root,'DH01'))).data();
 const newer=(await getDoc(doc(getDb('admin'),root,'DH02'))).data();
 assert.equal(old.status,'READY');
 assert.equal(old.faultCode,'BATTERY_EMPTY','Fault details remain visible but not isolated');
 assert.equal(old.version,7);
 assert.equal(newer.status,'OUT');
 assert.equal(newer.holderUid,'alice');
 assert.equal(newer.battery,'LOW');
 assert.equal(newer.faultCode,'CHARGING');
 assert.equal(newer.version,3);
 await assertFails(transition('bob','DH02','ISSUE',{
  status:'OUT',holderUid:'bob',holderName:names.bob,shift:'AM',faultCode:'',faultDetail:'',battery:'GOOD'
 }));

 // Fault reports must never alter current custody or require an admin unlock.
 await assertSucceeds(createRadio('admin','DH03'));
 await assertSucceeds(transition('alice','DH03','REPORT',{
  status:'READY',holderUid:'',holderName:'',shift:'',
  faultCode:'MIC',faultDetail:'Micro rè, kiểm tra sau',battery:'LOW'
 },{details:'Micro rè, kiểm tra sau'}));
 assert.equal((await getDoc(d('DH03'))).data().status,'READY');
 await assertSucceeds(transition('bob','DH03','ISSUE',{
  status:'OUT',holderUid:'bob',holderName:names.bob,shift:'AM',
  faultCode:'MIC',faultDetail:'Micro rè, kiểm tra sau',battery:'LOW'
 }));
 const received=(await getDoc(d('DH03'))).data();
 await assertFails(transition('alice','DH03','REPORT',{
  status:'OUT',holderUid:'bob',holderName:names.bob,shift:'AM',
  faultCode:'PTT',faultDetail:'Lỗi nút PTT',battery:'LOW'
 },{details:'Lỗi nút PTT'}));
 await assertFails(transition('bob','DH03','REPORT',{
  status:'READY',holderUid:'',holderName:'',shift:'',
  faultCode:'PTT',faultDetail:'Lỗi nút PTT',battery:'LOW'
 },{details:'Không được tự động trả máy'}));
 await assertSucceeds(transition('bob','DH03','REPORT',{
  status:'OUT',holderUid:'bob',holderName:names.bob,shift:'AM',
  faultCode:'PTT',faultDetail:'Lỗi nút PTT',battery:'LOW'
 },{details:'Lỗi nút PTT'}));
 const reported=(await getDoc(d('DH03'))).data();
 assert.equal(reported.status,'OUT');
 assert.equal(reported.holderUid,'bob','Reporting a defect must preserve the current owner');
 assert.equal(reported.holderName,names.bob);
 assert.equal(reported.shift,'AM');
 assert.equal(reported.heldSince.toMillis(),received.heldSince.toMillis());
 assert.ok(reported.updatedAt.toMillis()>reported.heldSince.toMillis());
 await assertSucceeds(transition('bob','DH03','RETURN',{
  status:'READY',holderUid:'',holderName:'',shift:'',
  faultCode:'PTT',faultDetail:'Lỗi nút PTT',battery:'LOW'
 }));
 await assertSucceeds(transition('alice','DH03','ISSUE',{
  status:'OUT',holderUid:'alice',holderName:names.alice,shift:'PM',
  faultCode:'PTT',faultDetail:'Lỗi nút PTT',battery:'LOW'
 }));
 // A lost device is physically unavailable, unlike a damaged one.
 await assertSucceeds(createRadio('admin','DH04'));
 await assertSucceeds(transition('alice','DH04','REPORT',{
  status:'LOST',holderUid:'',holderName:'',shift:'',
  faultCode:'LOST',faultDetail:'Mất thiết bị cần xác minh',battery:'UNKNOWN'
 },{details:'Mất thiết bị cần xác minh'}));
 await assertFails(transition('bob','DH04','ISSUE',{
  status:'OUT',holderUid:'bob',holderName:names.bob,shift:'AM',
  faultCode:'LOST',faultDetail:'Mất thiết bị cần xác minh',battery:'GOOD'
 }));

 await assertFails(transition('bob','DH04','RELEASE',{...returnDevice,battery:'UNKNOWN'},
  {details:'Xác nhận đã tìm thấy bộ đàm tại phòng trực'}));
 await assertSucceeds(transition('admin','DH04','RELEASE',{...returnDevice,battery:'UNKNOWN'},
  {details:'Xác nhận đã tìm thấy bộ đàm tại phòng trực'}));
 await assertSucceeds(createRadio('admin','DH05'));
 await env.withSecurityRulesDisabled(c=>updateDoc(doc(c.firestore(),root,'DH05'),{
  status:'FAULT',faultCode:'AUDIO',faultDetail:'Loa rè'
 }));
 const contenders=await Promise.allSettled([[ 'alice','PM'],['bob','AM']].map(([uid,shift])=>
  transition(uid,'DH05','ISSUE',{status:'OUT',holderUid:uid,holderName:names[uid],shift,
   faultCode:'AUDIO',faultDetail:'Loa rè',battery:'EMPTY'})
 ));
 assert.equal(contenders.filter(result=>result.status==='fulfilled').length,1);
 assert.equal(contenders.find(result=>result.status==='rejected').reason.code,'permission-denied');

 console.log('Firebase emulator PASS: private signed custody, advisory faults and low battery, atomic swaps, real lost-device handling, full-colour photo, immutable audit');
}
try{await main()}finally{await env.cleanup()}

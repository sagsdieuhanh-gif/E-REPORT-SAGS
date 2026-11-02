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
const names={admin:'Quản trị',alice:'Nhân viên A',bob:'Nhân viên B'};
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
  for(const [uid,role,active] of [['admin','ADMIN',true],['alice','DH',true],['bob','DH',true],['inactive','DH',false]]){
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
 return runTransaction(db,async tx=>{
  const existing=await tx.get(ref);
  if(!existing.exists())throw Error('No device');
  const old=existing.data();
  const update={...mutations,version:old.version+1,lastEventId:evRef.id,updatedAt:serverTimestamp()};
  const newStatus=update.status||old.status;
  const data=event(uid,action,code,old.status,newStatus,old.version+1,{
   personUid:action==='ISSUE'?uid:old.holderUid,
   personName:action==='ISSUE'?names[uid]:old.holderName,
   reasonCode:update.faultCode||'',...opts
  });
  tx.update(ref,update);
  tx.set(evRef,data);
 });
}
async function atomicSwap(uid,oldCode,newCode){
 const db=actor(uid),oldRef=doc(db,root,oldCode),newRef=doc(db,root,newCode);
 const oldEv=doc(collection(db,audit)),newEv=doc(collection(db,audit));
 const swapId=doc(collection(db,audit)).id;
 return runTransaction(db,async tx=>{
  const [oldSnap,newSnap]=await Promise.all([tx.get(oldRef),tx.get(newRef)]);
  const old=oldSnap.data(),next=newSnap.data();
  assert.equal(old.status,'OUT');assert.equal(next.status,'READY');
  const oldState={status:'CHARGING',holderUid:'',holderName:'',shift:'',faultCode:'BATTERY_EMPTY',faultDetail:'Hết pin trong ca trực',battery:'EMPTY',version:old.version+1,lastEventId:oldEv.id,updatedAt:serverTimestamp()};
  const newState={status:'OUT',holderUid:uid,holderName:names[uid],shift:'AM',faultCode:'',faultDetail:'',battery:'GOOD',version:next.version+1,lastEventId:newEv.id,updatedAt:serverTimestamp()};
  tx.update(oldRef,oldState);
  tx.update(newRef,newState);
  tx.set(oldEv,event(uid,'SWAP_OUT',oldCode,'OUT','CHARGING',oldState.version,{
   personUid:uid,personName:names[uid],reasonCode:'BATTERY_EMPTY',
   details:'Hết pin trong ca trực',relatedDeviceCode:newCode,swapId
  }));
  tx.set(newEv,event(uid,'SWAP_IN',newCode,'READY','OUT',newState.version,{
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
 await assertSucceeds(getDoc(doc(getDb('alice'),root,'DH01')));
 await assertSucceeds(transition('alice','DH01','ISSUE',{
  status:'OUT',holderUid:'alice',holderName:names.alice,shift:'AM',
  faultCode:'',faultDetail:'',battery:'GOOD'}));
 await assertFails(transition('bob','DH01','RETURN',{
  status:'READY',holderUid:'',holderName:'',shift:'',faultCode:'',faultDetail:'',battery:'GOOD'}));
 await assertSucceeds(transition('alice','DH01','RETURN',{
  status:'READY',holderUid:'',holderName:'',shift:'',faultCode:'',faultDetail:'',battery:'GOOD'}));
 await assertSucceeds(transition('alice','DH01','ISSUE',{
  status:'OUT',holderUid:'alice',holderName:names.alice,shift:'PM',faultCode:'',faultDetail:'',battery:'GOOD'}));
 await assertFails(transition('alice','DH01','RETURN',{
  status:'READY',holderUid:'',holderName:'',shift:'',faultCode:'',faultDetail:'',battery:'LOW'}));
 await assertSucceeds(transition('alice','DH01','RETURN',{
  status:'CHARGING',holderUid:'',holderName:'',shift:'',faultCode:'BATTERY_WEAK',faultDetail:'',battery:'LOW'}));
 await assertFails(transition('alice','DH01','RELEASE',{
  status:'READY',holderUid:'',holderName:'',shift:'',faultCode:'',faultDetail:'',battery:'GOOD'}, {signature:'',details:'Đã sạc và kiểm tra đạt'}));
 await assertSucceeds(transition('admin','DH01','RELEASE',{
  status:'READY',holderUid:'',holderName:'',shift:'',faultCode:'',faultDetail:'',battery:'GOOD'}, {signature:'',details:'Đã sạc pin, kiểm tra phát sóng đạt'}));
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
 // Tested on a second radio; failed attempts cannot mark broken/low-battery radios as issued.
 await assertSucceeds(createRadio('admin','DH02'));
 await assertFails(transition('alice','DH02','ISSUE',{
  status:'OUT',holderUid:'alice',holderName:names.alice,shift:'AM',faultCode:'',faultDetail:'',battery:'LOW'
 }));
 await assertSucceeds(transition('alice','DH01','ISSUE',{
  status:'OUT',holderUid:'alice',holderName:names.alice,shift:'AM',faultCode:'',faultDetail:'',battery:'GOOD'
 },{signature:'data:image/png;base64,'+'b'.repeat(180)}));
 // One old-radio return and one new-radio issue must commit atomically.
 await assertSucceeds(atomicSwap('alice','DH01','DH02'));
 const old=(await getDoc(doc(getDb('admin'),root,'DH01'))).data();
 const newer=(await getDoc(doc(getDb('admin'),root,'DH02'))).data();
 assert.equal(old.status,'CHARGING');
 assert.equal(old.version,7);
 assert.equal(newer.status,'OUT');
 assert.equal(newer.holderUid,'alice');
 assert.equal(newer.battery,'GOOD');
 assert.equal(newer.version,1);
 await assertFails(transition('bob','DH02','ISSUE',{
  status:'OUT',holderUid:'bob',holderName:names.bob,shift:'AM',faultCode:'',faultDetail:'',battery:'GOOD'
 }));
 console.log('Firebase emulator PASS: privacy, signed custody (WebP/PNG), battery quarantine, atomic replacement and immutable audit');
}
try{await main()}finally{await env.cleanup()}

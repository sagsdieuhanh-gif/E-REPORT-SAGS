'use strict';
const {initializeApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const {getDatabase}=require('firebase-admin/database');
const {onDocumentWritten}=require('firebase-functions/v2/firestore');
const {onSchedule}=require('firebase-functions/v2/scheduler');
const {defineBoolean}=require('firebase-functions/params');
const R=require('./retention'),P=require('./policy');initializeApp();
const enabled=defineBoolean('SAGS_RETENTION_DELETE_ENABLED',{default:false});
const options={region:'asia-southeast1',maxInstances:1,memory:'512MiB',timeoutSeconds:540};
exports.observeFlightRetention=onDocumentWritten({...options,document:'sags_handovers/{id}'},async event=>{
  const after=event.data?.after;if(!after?.exists)return;
  const fs=getFirestore(),data={...after.data(),id:after.id};
  if(data.kind==='sags_flight_archive_v488')await R.markArchive(fs,data,Date.now());
  if(!enabled.value()||!R.KINDS.has(data.kind))return;
  const receipts=new Map();
  for(const key of P.keys(data)){const rows=await fs.collection(R.LEDGER).where('matchKeys','array-contains',key).get();rows.docs.forEach(d=>receipts.set(d.id,d.data()));}
  const parent=data.parentId||data.parentDocId||data.package?.parentDocId;
  if(parent){const rows=await fs.collection(R.LEDGER).where('documentIds','array-contains',String(parent)).get();rows.docs.forEach(d=>receipts.set(d.id,d.data()));}
  if([...receipts.values()].some(x=>['deleting','purged'].includes(x.status)))await fs.runTransaction(async tx=>{const latest=await tx.get(after.ref);if(!latest.exists)return;const current=latest.data();if([...receipts.values()].some(x=>['deleting','purged'].includes(x.status)&&R.related(current,x,new Set(x.documentIds||[]))))tx.delete(after.ref);});
});
exports.cleanupCompletedFlights48h=onSchedule({...options,schedule:'every 15 minutes',timeZone:'Asia/Ho_Chi_Minh'},async()=>{
  const fs=getFirestore(),now=Date.now();
  for(const status of ['waiting','deleting']){
    const rows=await fs.collection(R.LEDGER).where('status','==',status).where('expiresAtMs','<=',now).orderBy('expiresAtMs').limit(25).get();
    for(const doc of rows.docs){if(!enabled.value()){console.info('48h retention dry-run',{archiveId:doc.id,expiresAtMs:doc.data().expiresAtMs});continue;}
      try{await R.purge(fs,getDatabase(),{...doc.data(),archiveId:doc.id},now);}catch(error){console.error('48h cleanup postponed',{archiveId:doc.id,error:String(error?.message||error)});}
    }
  }
});

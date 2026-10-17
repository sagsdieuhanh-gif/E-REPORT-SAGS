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
// Keep the deployed function name to avoid creating a second scheduler during upgrades.
// Both deployment options use the same bounded 24h worker and legacy-ledger migration.
exports.cleanupCompletedFlights48h=onSchedule({...options,schedule:'every 15 minutes',timeZone:'Asia/Ho_Chi_Minh'},async()=>{
  const out=await require('./actions-worker').runWorker(getFirestore(),getDatabase(),{dryRun:!enabled.value()});
  console.info('24h retention',out);
  if(out.failed)throw Error('Some completed flights could not be cleaned; retry scheduled');
});

'use strict';
/* Spark-compatible worker: trusted Admin SDK on GitHub, without Cloud Functions. */
const R=require('./retention'),P=require('./policy');
const CONTROL='sags_retention_control_v1',STATE='github-actions';
const LIMIT=100,OVERLAP=10*60*1000;
function field(row,name){return Number(row.data()[name])||0;}
async function rejectResurrection(fs,doc){
  const value=doc.data();if(!R.KINDS.has(value.kind))return false;
  const receipts=new Map();
  for(const key of P.keys(value)){
    const rows=await fs.collection(R.LEDGER).where('matchKeys','array-contains',key).limit(10).get();
    for(const row of rows.docs)receipts.set(row.id,row.data());
  }
  const parent=value.parentId||value.parentDocId||value.package?.parentDocId;
  if(parent){const rows=await fs.collection(R.LEDGER).where('documentIds','array-contains',String(parent)).limit(10).get();for(const row of rows.docs)receipts.set(row.id,row.data());}
  const retired=[...receipts.values()].filter(x=>['deleting','purged'].includes(x.status));if(!retired.length)return false;
  return fs.runTransaction(async tx=>{const fresh=await tx.get(doc.ref);if(!fresh.exists)return false;
    if(retired.some(job=>R.related(fresh.data(),job,new Set(job.documentIds||[])))){tx.delete(doc.ref);return true;}return false;
  });
}
async function scanChanges(fs,state,now,dryRun){
  const next={...state.streams||{}},counts={scanned:0,observed:0,resurrections:0};
  for(const name of ['updatedAtMs','submittedAtMs']){
    const cursor=next[name]||{},resume=cursor.backlog===true;
    const from=resume?Number(cursor.atMs||0):Math.max(0,Number(cursor.atMs||0)-OVERLAP);
    let query=fs.collection(R.COLLECTION).orderBy(name).orderBy('__name__').endAt(now);
    query=resume&&cursor.id?query.startAfter(from,cursor.id):query.startAt(from);
    const rows=await query.limit(LIMIT).get();
    for(const doc of rows.docs){const value=doc.data();counts.scanned++;
      if(value.kind==='sags_flight_archive_v488'&&value.retentionTracksDoor===true){
        if(!dryRun)await R.markArchive(fs,{...value,id:doc.id},now);counts.observed++;
      }
      if(!dryRun&&await rejectResurrection(fs,doc))counts.resurrections++;
    }
    if(rows.docs.length){const last=rows.docs.at(-1);next[name]={atMs:field(last,name),id:last.id,backlog:rows.docs.length===LIMIT};}
    else next[name]={atMs:now,id:'',backlog:false};
  }
  return {streams:next,counts};
}
async function runWorker(fs,db,{now=Date.now(),dryRun=true}={}){
  const stateRef=fs.collection(CONTROL).doc(STATE),state=(await stateRef.get()).data()||{};
  const scanned=await scanChanges(fs,state,now,dryRun);
  let eligible=0,purged=0,failed=0;
  for(const status of ['waiting','deleting']){
    // Single-field status query avoids requiring a new composite index.
    // Fresh waiting deadlines are selected chronologically in Node; the bounded queue rotates.
    const cursor=state.queues?.[status]||'';
    let query=fs.collection(R.LEDGER).where('status','==',status).orderBy('__name__');
    if(cursor)query=query.startAfter(cursor);
    let rows=await query.limit(25).get();
    if(!rows.docs.length&&cursor)rows=await fs.collection(R.LEDGER).where('status','==',status).orderBy('__name__').limit(25).get();
    const queue={...state.queues||{},[status]:rows.docs.length===25?rows.docs.at(-1).id:''};state.queues=queue;
    for(const row of rows.docs){const job=row.data();if(!P.due(job,now))continue;eligible++;
      if(dryRun)continue;
      try{const out=await R.purge(fs,db,{...job,archiveId:row.id},now);if(!out.skipped)purged++;}catch(_){failed++;}
    }
  }
  if(!dryRun)await stateRef.set({streams:scanned.streams,queues:state.queues||{},lastRunAtMs:now,lastCounts:{...scanned.counts,eligible,purged,failed}});
  return {mode:dryRun?'dry-run':'apply',...scanned.counts,eligible,purged,failed};
}
async function main(){
  const {initializeApp}=require('firebase-admin/app'),{getFirestore}=require('firebase-admin/firestore'),{getDatabase}=require('firebase-admin/database');
  const projectId=process.env.FIREBASE_PROJECT_ID;if(projectId!=='e-report-sags')throw Error('Unexpected Firebase project');
  const databaseURL=process.env.FIREBASE_DATABASE_URL;
  if(databaseURL!=='https://e-report-sags-default-rtdb.asia-southeast1.firebasedatabase.app')throw Error('Unexpected Firebase database');
  initializeApp({projectId,databaseURL});
  const dryRun=process.argv.includes('--dry-run')||!process.argv.includes('--apply');
  const out=await runWorker(getFirestore(),getDatabase(),{dryRun});
  console.log(JSON.stringify(out)); // Counts only: no flight, person or credential data in public logs.
  if(process.env.GITHUB_STEP_SUMMARY)require('fs').appendFileSync(process.env.GITHUB_STEP_SUMMARY,'## Flight retention\n\n'+Object.entries(out).map(([k,v])=>'- '+k+': '+v).join('\n')+'\n');
  if(out.failed)process.exitCode=1;
}
if(require.main===module)main().catch(()=>{console.error('Retention worker failed; verify authentication, permissions, indexes and quotas. No credentials or flight payloads are logged.');process.exitCode=1;});
module.exports={LIMIT,OVERLAP,scanChanges,rejectResurrection,runWorker};

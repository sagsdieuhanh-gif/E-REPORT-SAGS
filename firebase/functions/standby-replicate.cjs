'use strict';
/*
 * Server-only Firebase -> Supabase standby snapshot worker (initial foundation).
 * Read-only toward Firebase. Never promotes Supabase to primary or writes
 * signed business operations. Secrets must be injected by a trusted runner.
 *
 * Usage: node firebase/functions/standby-replicate.cjs --dry-run | --apply
 */
const {randomUUID}=require('node:crypto');
const core=require('./standby-core.cjs');
const APPLY=process.argv.includes('--apply');
if(process.argv.includes('--apply')&&process.argv.includes('--dry-run'))throw Error('Conflicting modes');
const ROOT='sags_live_v470';
const RTDB_NAMESPACES=['flight_records','roster_mail','roster_manifests',
 'roster_sessions','roster_revocations','roster_flight_status',
 'roster_workspaces','roster_co_claims','closeouts','ramp_presence',
 'aircraft_cleaning','cloud_drafts'];
const FIRESTORE_COLLECTIONS=['users','sags_radio_devices_v1','sags_radio_events_v1',
 'sags_radio_proofs_v22'];
const MAX_ITEMS=Math.max(1,Math.min(5000,Number(process.env.SAGS_STANDBY_MAX_ITEMS||1500)));
const MAX_NAMESPACE_BYTES=Math.max(102400,Math.min(100*1024*1024,
 Number(process.env.SAGS_STANDBY_MAX_NAMESPACE_BYTES||30*1024*1024)));
const TABLES={
 mirror:'sags_standby_mirror_v1',batches:'sags_standby_batches_v1',
 checkpoints:'sags_standby_checkpoints_v1',control:'sags_standby_failover_v1'
};
const supaUrl=String(process.env.SAGS_STANDBY_SUPABASE_URL||'').trim().replace(/\/+$/,'');
const serviceKey=String(process.env.SAGS_STANDBY_SUPABASE_SERVICE_ROLE_KEY||'').trim();
const firebaseProject=String(process.env.FIREBASE_PROJECT_ID||'e-report-sags').trim();
const firebaseDatabase=String(process.env.FIREBASE_DATABASE_URL||'https://e-report-sags-default-rtdb.asia-southeast1.firebasedatabase.app').trim();
const batchId=randomUUID();
let firebase;
const isApply=()=>APPLY;
const assertConfigured=()=>{
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(supaUrl)&&APPLY)
  throw Error('Supabase HTTPS project URL missing or not hosted on supabase.co');
 if(!serviceKey&&APPLY)throw Error('Supabase standby service role secret missing');
 if(!process.env.GOOGLE_APPLICATION_CREDENTIALS&&!process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
  throw Error('Firebase server credentials are not configured; no data has been read or copied');
};
function apiUrl(name,query=''){
 const url=new URL('/rest/v1/'+name,supaUrl);
 if(query)url.search=query;
 return url.toString();
}
async function http(method,url,data,moreHeaders={}){
 if(!serviceKey)throw Error('Missing secret for Supabase verification');
 let last;
 for(let i=0;i<3;i++){
  const opt={method,headers:{apikey:serviceKey,Authorization:'Bearer '+serviceKey,
   ...(data!==undefined?{'Content-Type':'application/json'}:{}),...moreHeaders}};
  if(data!==undefined)opt.body=typeof data==='string'?data:JSON.stringify(data);
  try{
   const response=await fetch(url,opt);
   const raw=await response.text();
   if(!response.ok){
    const err=Error('Supabase '+response.status+' '+method+' '+new URL(url).pathname+' '+raw.slice(0,180));
    err.code=response.status;
    throw err;
   }
   if(!raw)return null;
   try{return JSON.parse(raw)}catch(_){return raw}
  }catch(e){
   last=e;
   if(![429,500,502,503,504].includes(Number(e.code))||i===2)break;
   await new Promise(r=>setTimeout(r,Math.min(1800,200*(2**i))));
  }
 }
 throw last;
}
const enc=encodeURIComponent;
const urlFor=(name,filter)=>apiUrl(name,filter);
async function verifyFirebaseIsLeader(){
 const q='id=eq.production&select=primary_provider,promotion_epoch,standby_writes_allowed,failover_tested';
 const value=await http('GET',urlFor(TABLES.control,q));
 if(!Array.isArray(value)||value.length!==1||value[0].primary_provider!=='firebase'
   ||value[0].standby_writes_allowed!==false)
  throw Error('Standby control does not allow a Firebase->Supabase mirror run');
 return value[0];
}
function adminApp(){
 const admin=require('firebase-admin');
 if(!admin.apps.length){
  const opt={projectId:firebaseProject,databaseURL:firebaseDatabase};
  if(process.env.FIREBASE_SERVICE_ACCOUNT_JSON){
   opt.credential=admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
  }else opt.credential=admin.credential.applicationDefault();
  admin.initializeApp(opt);
 }
 return admin;
}
function jsonSize(x){return Buffer.byteLength(core.stable(x)||'null')}
async function collectRtdb(app,name){
 const snap=await app.database().ref(ROOT+'/'+name).once('value');
 const raw=snap.val();
 const nodes=raw===null?[]:(raw&&typeof raw==='object'&&!Array.isArray(raw)
  ?Object.entries(raw):[['__value__',raw]]);
 if(nodes.length>MAX_ITEMS)throw Error('RTDB '+name+' has '+nodes.length+' children; partitioning required');
 let bytes=0;
 for(const [k,v] of nodes){
  bytes+=Buffer.byteLength(String(k))+jsonSize(v);
  if(bytes>MAX_NAMESPACE_BYTES)throw Error('RTDB '+name+' exceeds memory/size safety limit');
 }
 return {origin:'rtdb',namespace:name,nodes,bytes,proofs:[]};
}
async function collectFirestore(app,name){
 const snap=await app.firestore().collection(name).limit(MAX_ITEMS+1).get();
 if(snap.size>MAX_ITEMS)throw Error('Firestore '+name+' exceeds '+MAX_ITEMS+' documents; pagination required');
 let bytes=0;
 const nodes=[],proofs=[];
 for(const doc of snap.docs){
  let value=doc.data();
  if(name==='sags_radio_proofs_v22'&&typeof value?.image==='string'){
   const separated=core.redactEvidence(value);
   value=separated.value;
   if(separated.proof)proofs.push(separated.proof);
  }
  bytes+=Buffer.byteLength(doc.id)+jsonSize(value);
  if(bytes>MAX_NAMESPACE_BYTES)throw Error('Firestore '+name+' exceeds safety limit; partition collection');
  nodes.push([doc.id,value]);
 }
 return {origin:'firestore',namespace:name,nodes,bytes,proofs};
}
async function collectAll(app){
 const sources=[];
 for(const ns of RTDB_NAMESPACES)sources.push(await collectRtdb(app,ns));
 for(const ns of FIRESTORE_COLLECTIONS)sources.push(await collectFirestore(app,ns));
 return sources;
}
async function upsert(table,rows){
 if(!rows.length)return;
 const conflicts=table===TABLES.mirror?'origin,namespace,key_hash':
  table===TABLES.checkpoints?'origin,namespace':'batch_id';
 const u=urlFor(table,'on_conflict='+enc(conflicts));
 for(let i=0;i<rows.length;i+=30){
  await http('POST',u,rows.slice(i,i+30),{'Prefer':'resolution=merge-duplicates,return=minimal'});
 }
}
async function getCurrent(origin,namespace){
 // Key metadata only; never download other mirrored business payloads.
 const q='origin=eq.'+enc(origin)+'&namespace=eq.'+enc(namespace)+
  '&select=key_hash,record_key,content_sha256,deleted&order=key_hash.asc';
 const all=[];
 for(let offset=0;offset<=MAX_ITEMS+100;offset+=500){
  const rows=await http('GET',urlFor(TABLES.mirror,q+'&limit=500&offset='+offset));
  if(!Array.isArray(rows))throw Error('Unexpected mirror list result');
  all.push(...rows);
  if(rows.length<500)break;
 }
 if(all.length>MAX_ITEMS+100)throw Error('Mirrored namespace oversized; cannot reconcile');
 return all;
}
async function uploadEvidence(proof){
 if(!isApply())return;
 const url=new URL('/storage/v1/object/sags-standby-evidence/'+proof.path,supaUrl).toString();
 const resp=await fetch(url,{method:'POST',headers:{
  'apikey':serviceKey,'Authorization':'Bearer '+serviceKey,
  'Content-Type':proof.mime,'x-upsert':'false'
 },body:proof.bytes});
 if(resp.ok||resp.status===409)return; // content-addressed immutable path: same sha256
 throw Error('Private standby evidence upload failed ('+resp.status+')');
}
async function mirrorSource(source){
 const {origin,namespace,nodes,proofs}=source;
 const previous=await getCurrent(origin,namespace);
 // An unexpected zero read must not erase a previously non-empty namespace.
 if(nodes.length===0&&previous.some(r=>!r.deleted))
  throw Error(origin+'/'+namespace+' unexpectedly empty; refuse automatic tombstones');
 const fresh=nodes.map(([key,value])=>core.makeRow(origin,namespace,key,value,batchId));
 const freshKeys=new Set(fresh.map(x=>x.key_hash));
 const removed=previous.filter(x=>!freshKeys.has(x.key_hash)&&!x.deleted).map(x=>({
  origin,namespace,key_hash:x.key_hash,record_key:x.record_key,
  payload:{_sags_tombstone:true},content_sha256:core.hash(core.stable({_sags_tombstone:true})),
  source_version:null,deleted:true,batch_id:batchId
 }));
 for(const proof of proofs)await uploadEvidence(proof);
 await upsert(TABLES.mirror,[...fresh,...removed]);
 const expected=new Map([...fresh,...removed].map(x=>[x.key_hash,x.content_sha256]));
 const q='origin=eq.'+enc(origin)+'&namespace=eq.'+enc(namespace)+
  '&batch_id=eq.'+enc(batchId)+'&select=key_hash,content_sha256&limit='+enc(String(MAX_ITEMS+100));
 const verified=await http('GET',urlFor(TABLES.mirror,q));
 if(!Array.isArray(verified)||verified.length!==expected.size||
  verified.some(row=>expected.get(row.key_hash)!==row.content_sha256))
  throw Error('Supabase source mirror verification failed: '+origin+'/'+namespace);
 await upsert(TABLES.checkpoints,[{origin,namespace,batch_id:batchId,
  record_count:fresh.length,content_fingerprint:core.summarizeRows(fresh).fingerprint,
  completed_at:new Date().toISOString()}]);
 return {origin,namespace,count:fresh.length,deleted:removed.length,bytes:source.bytes,proofs:proofs.length};
}
async function run(){
 assertConfigured();
 firebase=adminApp();
 const source=await collectAll(firebase);
 const total=source.reduce((sum,x)=>sum+x.nodes.length,0);
 console.log('Standby mirror inspected:',source.length,'namespaces,',total,'records; mode',APPLY?'APPLY':'DRY_RUN');
 if(!APPLY)return;
 await verifyFirebaseIsLeader();
 await upsert(TABLES.batches,[{batch_id:batchId,run_kind:process.env.GITHUB_EVENT_NAME==='schedule'?'SCHEDULED':'MANUAL',
  state:'RUNNING',expected_namespaces:source.length,completed_namespaces:0,written_records:0}]);
 const results=[];
 try{
  for(const ns of source){
   results.push(await mirrorSource(ns));
   await http('PATCH',urlFor(TABLES.batches,'batch_id=eq.'+enc(batchId)),
    {completed_namespaces:results.length,written_records:results.reduce((n,x)=>n+x.count,0)});
  }
  // Recheck epoch before declaring the batch complete. No automatic failover.
  await verifyFirebaseIsLeader();
  await http('PATCH',urlFor(TABLES.batches,'batch_id=eq.'+enc(batchId)),
   {state:'COMPLETE',completed_at:new Date().toISOString(),summary:{
    namespaces:results.map(x=>({origin:x.origin,namespace:x.namespace,count:x.count,deleted:x.deleted,proofs:x.proofs}))
   }});
  console.log('Verified standby backup batch COMPLETE',batchId,'namespaces',results.length);
 }catch(e){
  await http('PATCH',urlFor(TABLES.batches,'batch_id=eq.'+enc(batchId)),
   {state:'FAILED',completed_at:new Date().toISOString(),error_summary:String(e.message||e).slice(0,380),
    completed_namespaces:results.length}).catch(()=>{});
  throw e;
 }
}
run().catch(e=>{console.error('STANDBY NOT READY:',String(e.message||e).slice(0,700));process.exitCode=1});

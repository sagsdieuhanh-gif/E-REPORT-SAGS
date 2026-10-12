'use strict';
const P=require('./policy');
const COLLECTION='sags_handovers',LEDGER='sags_flight_retention_v1';
const KINDS=new Set(['sags_flight_archive_v488','sags_flight_archive_chunk_v488','airline_final_form','airline_final_paper_photo','airline_final_compare_package','final_crosscheck_v3','final_crosscheck_mailbox_v3','fsags09_closeout','sags_crosscheck_clean_v2','sags_crosscheck_mail_clean_v2','sags_ramp_presence_v21']);
const token=x=>/^[A-Za-z0-9_-]{1,180}$/.test(String(x||''))?String(x):'';
function lifecycle(data,old,now){
  if(data.kind!=='sags_flight_archive_v488'||!P.keys(data).length)return null;
  const life=data.retention48h;
  if(!life?.doorSignature||!P.clock(String(life.doorSignature).split(':').slice(1).join(':')))return null;
  const proposed=Number(life.completedAtMs);
  const at=Number.isSafeInteger(proposed)&&proposed>0?Math.min(proposed,now):now;
  const same=old?.doorSignature===life.doorSignature&&old?.status==='waiting';
  const completedAtMs=same?old.completedAtMs:at;
  return {schema:1,archiveId:data.id,matchKeys:P.keys(data),doorSignature:life.doorSignature,completedAtMs,expiresAtMs:completedAtMs+P.TTL,status:'waiting',identity:{dateToken:data.dateToken,flights:data.flights||[],acRegToken:data.acRegToken},links:data.retentionLinks||{},updatedAtMs:now};
}
function related(data,job,parents){return KINDS.has(data.kind)&&(P.intersects(P.keys(data),job.matchKeys)||parents.has(String(data.parentId||data.parentDocId||data.package?.parentDocId||'')));}
function matchRoster(item,job){
  const date=String(job.identity?.dateToken||''),reg=String(item.acReg||item.acRegn||'').toUpperCase().replace(/[^A-Z0-9]/g,''),day=String(item.opDate||'').replace(/-/g,'');
  const flights=[item.arrFlight,item.depFlight].filter(Boolean).map(x=>String(x).toUpperCase().replace(/[^A-Z0-9]/g,''));
  return day===date&&reg===job.identity?.acRegToken&&flights.some(f=>job.matchKeys.includes(['FS09',date,f,reg,'CXR'].join('|')));
}
async function candidates(fs,job){
  const col=fs.collection(COLLECTION),docs=new Map();
  const add=s=>s.docs.forEach(d=>{if(KINDS.has(d.data().kind))docs.set(d.id,d)});
  const archive=await col.doc(job.archiveId).get();if(archive.exists)docs.set(archive.id,archive);
  for(const key of job.matchKeys){
    for(const field of ['matchKeys','rampMatchKeys','identity.matchKeys','identity.rampMatchKeys','finalSnapshot.matchKeys','package.matchKeys','package.identity.matchKeys'])add(await col.where(field,'array-contains',key).get());
    add(await col.where('matchKey','==',key).get());
    const [,date,flight,reg]=key.split('|');
    const rows=await col.where('identity.flightToken','==',flight).get();
    for(const d of rows.docs){const x=d.data();if(KINDS.has(x.kind)&&String(x.identity?.dateToken)===date&&String(x.identity?.acRegToken)===reg)docs.set(d.id,d);}
  }
  for(const field of ['identity.dateToken','package.identity.dateToken']){const rows=await col.where(field,'==',job.identity.dateToken).get();for(const row of rows.docs)if(KINDS.has(row.data().kind)&&P.intersects(P.keys(row.data()),job.matchKeys))docs.set(row.id,row);}
  const parents=new Set([...docs.keys()]);
  for(const id of parents)for(const field of ['parentId','parentDocId','package.parentDocId'])add(await col.where(field,'==',id).get());
  return [...docs.values()].filter(d=>related(d.data(),job,parents)||d.id===job.archiveId);
}
async function markArchive(fs,data,now){
  if(data.retentionTracksDoor!==true)return null;
  const ref=fs.collection(LEDGER).doc(data.id);
  return fs.runTransaction(async tx=>{
    const [snapshot,archive]=await Promise.all([tx.get(ref),tx.get(fs.collection(COLLECTION).doc(data.id))]);
    const old=snapshot.exists?snapshot.data():null;
    if(['purged','deleting'].includes(old?.status))return old;
    if(!archive.exists||archive.data().retentionTracksDoor!==true)return old;
    // Triggers may arrive out of order or more than once: use the current durable archive.
    const next=lifecycle({...archive.data(),id:data.id},old,now);
    if(!next){if(old)tx.delete(ref);return null;}
    tx.set(ref,next);return next;
  });
}
async function rtdbPlan(db,job,docs){
  const root=db.ref('sags_live_v470'),date=String(job.identity?.dateToken||'');
  if(!/^\d{8}$/.test(date))throw Error('Missing flight day');
  const day=date.slice(0,4)+'-'+date.slice(4,6)+'-'+date.slice(6,8);
  const manifest=(await root.child('roster_manifests/'+day).once('value')).val()||{};
  const targets=Object.entries(manifest.items||{}).filter(([,item])=>matchRoster(item,job)),ids=new Set(targets.map(([id])=>id)),paths=new Set();
  for(const [id,item] of targets){
    if(!token(id))throw Error('Invalid assignment ID');
    paths.add('roster_sessions/'+id);paths.add('roster_manifests/'+day+'/items/'+id);
    for(const name of [item.user,item.targetUser])if(token(name)){paths.add('roster_mail/'+name+'/items/'+id);paths.add('roster_revocations/'+name+'/items/'+id);}
    for(const [field,base] of [['workspaceKey','roster_flight_workspaces'],['flightId','flight_records/'+day]]){
      const key=token(item[field]||(field==='workspaceKey'?item.rosterWorkspaceKey:''));
      if(key&&!Object.entries(manifest.items||{}).some(([other,x])=>!ids.has(other)&&(x[field]||(field==='workspaceKey'?x.rosterWorkspaceKey:''))===key))paths.add(base+'/'+key);
    }
  }
  function hash(s){let h=2166136261;for(const ch of s){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(36).toUpperCase();}
  for(const key of job.matchKeys){
    const node=hash(key);paths.add('ramp_presence/'+node);
    const [,dateToken,flight]=key.split('|'),lookup='ramp_presence_lookup/'+dateToken+'/'+flight;
    const rows=(await root.child(lookup).once('value')).val()||{};
    for(const [id,row] of Object.entries(rows))if(row.matchKey===key&&token(id))paths.add(lookup+'/'+id);
    const closeout=(await root.child('closeouts/'+node).once('value')).val();if(closeout&&P.intersects(P.keys(closeout),job.matchKeys))paths.add('closeouts/'+node);
  }
  const absolute=new Set([...paths].map(x=>'sags_live_v470/'+x));
  const safe=x=>String(x||'').replace(/[.#$\[\]\/]/g,'_').replace(/[^A-Za-z0-9_-]/g,'_').slice(0,180)||'X';
  const parents=docs.filter(d=>d.data().kind==='airline_final_form').map(d=>d.id),users=new Set();
  for(const d of docs){const x=d.data();
    if(x.kind==='airline_final_form'){absolute.add('sags_live_v470/finals/'+safe(d.id));absolute.add('sags_live_v469/finals/'+safe(d.id));}
    if(x.kind==='fsags09_closeout')absolute.add('sags_live_v470/closeouts/'+safe(d.id));
    if(['sags_crosscheck_clean_v2','final_crosscheck_v3'].includes(x.kind))absolute.add('sags_live_v470/cross_state/'+safe(d.id));
    for(const u of [x.targetUser,x.targetCbtt?.username,x.submittedBy?.username,x.package?.targetUser])if(u)users.add(safe(u));
  }
  for(const user of users)for(const parent of parents){
    const rows=(await root.child('cross_mail/'+user+'/events').orderByChild('package/parentDocId').equalTo(parent).once('value')).val()||{};
    for(const id of Object.keys(rows))if(token(id))absolute.add('sags_live_v470/cross_mail/'+user+'/events/'+id);
  }
  return [...absolute];
}
async function purge(fs,db,job,now){
  const ref=fs.collection(LEDGER).doc(job.archiveId);let current=(await ref.get()).data();
  if(!current||!P.due(current,now)||!['waiting','deleting'].includes(current.status))return {skipped:true};
  if(current.status==='waiting'){
    const docs=await candidates(fs,current);if(docs.length>400)throw Error('More than 400 related documents; cleanup postponed');
    const paths=await rtdbPlan(db,current,docs);
    // Persist the entire deletion plan BEFORE removing payloads, so RTDB failure/retry is safe.
    await fs.runTransaction(async tx=>{
      const [receipt,parent]=await Promise.all([tx.get(ref),tx.get(fs.collection(COLLECTION).doc(job.archiveId))]);const fresh=receipt.data();
      if(!fresh||fresh.status!=='waiting'||!P.due(fresh,now)||!parent.exists||(parent.data().retentionTracksDoor===true&&parent.data().retention48h?.doorSignature!==fresh.doorSignature))throw Error('Closure changed');
      tx.set(ref,{...fresh,status:'deleting',documentIds:docs.map(d=>d.id),rtdbPaths:paths,startedAtMs:now});
    });current=(await ref.get()).data();
  }
  // Retention is irreversible once the due job has claimed this completed flight.
  const batch=fs.batch();for(const id of current.documentIds||[])batch.delete(fs.collection(COLLECTION).doc(id));await batch.commit();
  const patch=Object.fromEntries((current.rtdbPaths||[]).map(path=>[path,null]));if(Object.keys(patch).length)await db.ref().update(patch);
  await ref.set({status:'purged',purgedAtMs:now},{merge:true});return {documents:(current.documentIds||[]).length,paths:Object.keys(patch).length};
}
module.exports={COLLECTION,LEDGER,KINDS,token,lifecycle,related,matchRoster,candidates,markArchive,rtdbPlan,purge};

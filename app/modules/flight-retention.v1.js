/* Delete only server-confirmed purged flights. Never clear an origin or auth state. */
(function(root){
  'use strict';
  const P=root.SAGSFlightRetentionPolicy;if(!P||root.SAGSFlightRetention)return;
  let running=false,lastRun=0,publishTimer=0;
  const activeId=()=>{try{return String(activeFlightSessionId||'')}catch(_){return ''}};
  const online=()=>navigator.onLine!==false;
  const db=()=>typeof initHandoverFirebase==='function'?initHandoverFirebase():null;
  function stamp(previous,state){return P.transition(previous,state,Date.now());}
  function identity(meta,env){try{return fs09IdentityFromState(env.state||{},meta)}catch(_){return {matchKeys:[]}}}
  function account(){try{return String(currentUserProfile?.username||'')}catch(_){return ''}}
  function json(key){const raw=localStorage.getItem(key);return raw===null?null:JSON.parse(raw)}
  async function cleanIdb(name,stores,sessionId){
    if(!root.indexedDB)return;
    if(indexedDB.databases){const list=await indexedDB.databases();if(!list.some(x=>x.name===name))return;}
    const connection=await new Promise((resolve,reject)=>{const q=indexedDB.open(name);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});
    try{
      const found=stores.filter(x=>connection.objectStoreNames.contains(x));if(!found.length)return;
      await new Promise((resolve,reject)=>{
        const tx=connection.transaction(found,'readwrite');
        for(const name of found){const q=tx.objectStore(name).openCursor();q.onsuccess=()=>{const c=q.result;if(!c)return;const row=c.value;const own=name==='drafts'?row.account===root.firebase?.auth?.().currentUser?.uid:row.scope===root.sagsIndexedDbFlightStoreV1?.accountScope?.();if(own&&!row.pendingSync&&String(row.flightSessionId||row.sessionId||'')===sessionId)c.delete();c.continue();};}
        tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Retention aborted'));
      });
    }finally{connection.close();}
  }
  async function hasPendingIdb(sessionId){
    if(!root.indexedDB)return true; // Unknown durability is never permission to delete.
    if(indexedDB.databases){const list=await indexedDB.databases();if(!list.some(x=>x.name==='sags-draft-recovery-v2'))return false;}
    const connection=await new Promise((resolve,reject)=>{const q=indexedDB.open('sags-draft-recovery-v2');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});
    try{
      if(!connection.objectStoreNames.contains('drafts'))return false;
      return await new Promise((resolve,reject)=>{let pending=false;const tx=connection.transaction('drafts','readonly'),q=tx.objectStore('drafts').openCursor();q.onsuccess=()=>{const c=q.result;if(!c)return;if(c.value.flightSessionId===sessionId&&c.value.pendingSync)pending=true;c.continue();};tx.oncomplete=()=>resolve(pending);tx.onerror=()=>reject(tx.error);});
    }finally{connection.close();}
  }
  function busy(){
    if(root.sagsV622StorageBlocked)return true;
    try{if(typeof readOfflineQueue!=='function'||readOfflineQueue().length)return true;}catch(_){return true;}
    const el=document.activeElement;
    if(el?.matches?.('input,textarea,[contenteditable="true"]'))return true;
    return false;
  }
  function localDraftKeys(sessionId){
    const prefix=sagsOwnedPrefix('sagsV61Uncommitted:')+sessionId+':',out=[];
    for(let n=0;n<localStorage.length;n++){const k=localStorage.key(n);if(k?.startsWith(prefix))out.push(k);}
    return out;
  }
  function relatedSheets(sessionId,keys){
    const out=[];
    for(const [listKey,dataPrefix] of [['sagsFinalSheetListV10','sagsFinalSheetDataV10:'],['sagsFS09SheetListV11','sagsFS09StandaloneV11:'],['sagsKH208ListV1','sagsKH208SheetV1:']]){
      const key=sagsOwnedKey(listKey),list=json(key)||[];if(!Array.isArray(list))throw Error('Malformed sheet list');
      const expired=list.filter(x=>x.flightSessionId===sessionId||P.intersects(P.keys(x),keys));
      // A local unsent sheet is preserved even when the main flight is expired.
      if(expired.some(x=>!x.receivedSubmittedAtMs&&!x.receivedAtMs&&!x.cloudDocId&&!x.receivedDocId))throw Error('Unverified local sheet');
      out.push({key,list,expired,dataPrefix});
    }
    return out;
  }
  async function singleTab(){
    const worker=navigator.serviceWorker?.controller;
    if(!worker||typeof MessageChannel!=='function')return false;
    return await new Promise(resolve=>{
      const channel=new MessageChannel();let done=false;
      const finish=ok=>{if(done)return;done=true;clearTimeout(timer);channel.port1.close();channel.port2.close();resolve(ok);};
      const timer=setTimeout(()=>finish(false),2000);
      channel.port1.onmessage=e=>finish(e.data?.count===1);
      try{worker.postMessage({type:'SAGS_RETENTION_CLIENT_COUNT'},[channel.port2]);}catch(_){finish(false);}
    });
  }
  async function purgeLocal(meta,env,receipt){
    const id=String(meta.id),user=account(),keys=P.keys(receipt);
    if(id===activeId()||busy()||localDraftKeys(id).length||await hasPendingIdb(id)||!await singleTab())return false;
    if(account()!==user||id===activeId()||busy())return false;
    const sheets=relatedSheets(id,keys),baseline=JSON.stringify(env);
    // Cleanup is postponed if another tab edited the envelope while IDB was checked.
    if(JSON.stringify(readFlightSessionEnvelope(id))!==baseline)return false;
    await cleanIdb('sags-draft-recovery-v2',['drafts'],id);
    await cleanIdb('sags-ereport-device-v1',['flightEnvelopes'],id);
    if(account()!==user||id===activeId()||busy()||JSON.stringify(readFlightSessionEnvelope(id))!==baseline)return false;
    const list=readFlightSessionList();writeFlightSessionList(list.filter(x=>x.id!==id));
    for(const x of sheets){localStorage.setItem(x.key,JSON.stringify(x.list.filter(r=>!x.expired.some(z=>z.id===r.id))));for(const r of x.expired)localStorage.removeItem(sagsOwnedPrefix(x.dataPrefix)+r.id);}
    localStorage.removeItem(flightSessionStorageKey(id));
    localStorage.removeItem(sagsOwnedKey('sagsV22LocalCheckpoint::'+id));
    localStorage.removeItem(sagsOwnedKey('sagsRetentionAckV1:'+id));
    for(const mapName of ['sagsArchiveDoorSyncMapV488','sagsArchiveSnapshotMapV488','sagsRampPresenceMapV488']){
      const mapKey=sagsOwnedKey(mapName),map=json(mapKey);if(!map||Array.isArray(map))continue;
      for(const k of Object.keys(map))if(k===id||k===receipt.archiveId||k.startsWith(id+'|'))delete map[k];
      localStorage.setItem(mapKey,JSON.stringify(map));
    }

    const accountUid=root.firebase?.auth?.().currentUser?.uid;
    const clockPrefix='sagsDraftClockV27:'+accountUid+'|'+id+'|';
    const clocks=[];for(let n=0;n<localStorage.length;n++){const k=localStorage.key(n);if(accountUid&&k?.startsWith(clockPrefix))clocks.push(k);}clocks.forEach(k=>localStorage.removeItem(k));
    // Do not leave an obsolete shadow list that can resurrect removed envelopes.
    await root.sagsIndexedDbFlightStoreV1?.putSessionList?.(readFlightSessionList());
    return true;
  }
  async function publishLifecycle(){
    if(!online()||!account()||busy()||typeof root.sagsRetentionSnapshot!=='function')return;
    const user=account();
    for(const meta of readFlightSessionList()){
      if(account()!==user)return;
      const env=readFlightSessionEnvelope(meta.id);if(!['fsags','fsags421','tvjgof035'].includes(String(meta.initialGroup||env.mainForm||'')))continue;const next=stamp(env.retention48h,env.state||{});
      if(!next&&!env.retention48h)continue;
      if(JSON.stringify(next)!==JSON.stringify(env.retention48h||null)){
        const updated={...env,retention48h:next};
        sagsV622VerifiedWrite(flightSessionStorageKey(meta.id),updated);
      }
      // Retry until the server archive acknowledges this lifecycle; old snapshots get a 48h grace period.
      const ackKey=sagsOwnedKey('sagsRetentionAckV1:'+meta.id),signature=JSON.stringify(next);
      if(localStorage.getItem(ackKey)!==signature&&await root.sagsRetentionSnapshot(meta,'RETENTION_LIFECYCLE'))localStorage.setItem(ackKey,signature);
    }
  }
  async function run(force=false){
    if(running||!online()||!account()||busy()||(!force&&Date.now()-lastRun<15*60*1000))return {skipped:true};
    running=true;lastRun=Date.now();let deleted=0;
    try{
      await publishLifecycle();
      const server=db();if(!server)return {skipped:true};
      for(const meta of readFlightSessionList()){
        if(meta.id===activeId())continue;
        const env=readFlightSessionEnvelope(meta.id),life=env.retention48h;
        if(!P.due(life,Date.now())||!P.door(env.state))continue;
        const keys=P.keys({identity:identity(meta,env)});if(!keys.length)continue;
        // Never infer cloud deletion merely from a missing document or permission error.
        const snap=await server.collection('sags_flight_retention_v1').where('matchKeys','array-contains',keys[0]).limit(10).get({source:'server'});
        const receipt=snap.docs.map(x=>x.data()).find(x=>x.status==='purged'&&P.due(x,Date.now())&&P.intersects(P.keys(x),keys));
        if(receipt&&await purgeLocal(meta,env,receipt))deleted++;
      }
      if(deleted)root.renderFlightSessionList?.();
      return {deleted};
    }catch(error){console.info('48h cleanup postponed',error?.message||error);return {deleted,error:String(error?.message||error)};}
    finally{running=false;}
  }
  root.SAGSFlightRetention={stamp,run,purgeLocal,hasPendingIdb,publishLifecycle};
  root.addEventListener('sags:retention-changed',()=>{clearTimeout(publishTimer);publishTimer=setTimeout(()=>void publishLifecycle().catch(error=>console.info('Retention lifecycle pending',error?.message)),1000);});
  root.addEventListener('online',()=>void run(true));
  root.addEventListener('pageshow',()=>void run());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void run();});
  setTimeout(()=>void run(),12000);setInterval(()=>void run(),15*60*1000);
})(window);

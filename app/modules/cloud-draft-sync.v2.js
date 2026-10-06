/* E-REPORT SAGS V2.0 · THREE-LAYER FIELD DRAFT PROTECTION
 * Layer 1: sagsV61Draft/localStorage (synchronous, authoritative for unsaved fields).
 * Layer 2: IndexedDB field mirror (immediate async write on every draft change).
 * Layer 3: RTDB backup for roster-bound drafts, conflict-safe newest-write-wins by atMs.
 */
(function(root){
  'use strict';
  if(root.__SAGS_DRAFT_SYNC_V2__)return;
  root.__SAGS_DRAFT_SYNC_V2__=true;
  const DB_NAME='sags-draft-recovery-v2',DB_VERSION=1,STORE='drafts';
  const S=v=>String(v??'').trim();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_').replace(/\s+/g,'_').slice(0,96);
  const hash=v=>{let h=2166136261;for(const ch of String(v||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return h.toString(36)};
  let wrapped=false,suppress=false,lastCloudSyncAtMs=0,lastCloudError='',lastPullAtMs=0,cloudWrites=0,idbWrites=0;
  const timers=new Map();

  function profile(){try{return root.__sagsGetSession?.()?.profile||root.currentUserProfile||{}}catch(_){return root.currentUserProfile||{}}}
  function account(){
    const p=profile();let uid='';
    try{uid=S(root.firebase?.auth?.().currentUser?.uid)}catch(_){}
    return safe(uid||p.firebaseUid||p.uid||p.username||p.userName||p.code||'');
  }
  function flightSession(){
    let id='';try{id=S(typeof activeFlightSessionId!=='undefined'?activeFlightSessionId:root.activeFlightSessionId)}catch(_){id=S(root.activeFlightSessionId)}
    if(!id)try{id=S((typeof currentFlightSessionMeta==='function'?currentFlightSessionMeta():root.currentFlightSessionMeta?.())?.id)}catch(_){}
    return safe(id);
  }
  function meta(){try{return (typeof currentFlightSessionMeta==='function'?currentFlightSessionMeta():root.currentFlightSessionMeta?.())||null}catch(_){return null}}
  function assignment(){
    const m=meta();let aid=S(m?.rosterAssignmentId);
    if(!aid&&m?.id)try{aid=S(root.readFlightSessionEnvelope?.(m.id)?.rosterAssignmentId)}catch(_){}
    return safe(aid);
  }
  function fieldToken(field,part){return safe(field).slice(0,58)+'__'+safe(part||'manual').slice(0,18)+'__'+hash(S(field)+'|'+S(part||'manual'))}
  function entryKey(field,part){return [account(),flightSession(),fieldToken(field,part)].join('|')}
  function cloudBase(){const a=assignment(),u=account();return a&&u?'roster_sessions/'+a+'/draftRecoveryV2/'+u:''}
  function cloudCapable(){return !!(cloudBase()&&typeof root.sagsV470Ref==='function')}

  function openDb(){return new Promise((resolve,reject)=>{try{const q=indexedDB.open(DB_NAME,DB_VERSION);q.onupgradeneeded=()=>{const db=q.result;if(!db.objectStoreNames.contains(STORE)){const s=db.createObjectStore(STORE,{keyPath:'key'});s.createIndex('scope','scope',{unique:false});s.createIndex('pendingSync','pendingSync',{unique:false})}};q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)}catch(e){reject(e)}})}
  async function idbPut(entry){try{const db=await openDb();await new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(entry);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)});idbWrites++;return true}catch(e){console.warn('V2 draft IndexedDB write',e?.message||e);return false}}
  async function idbGet(key){try{const db=await openDb();return await new Promise((res,rej)=>{const q=db.transaction(STORE,'readonly').objectStore(STORE).get(key);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)})}catch(_){return null}}
  async function idbScope(){const scope=account()+'|'+flightSession()+'|';if(!account()||!flightSession())return[];try{const db=await openDb();return await new Promise((res,rej)=>{const q=db.transaction(STORE,'readonly').objectStore(STORE).getAll();q.onsuccess=()=>res((q.result||[]).filter(x=>S(x.key).startsWith(scope)));q.onerror=()=>rej(q.error)})}catch(_){return[]}}
  function committed(field){try{const m=meta(),env=m?.id?root.readFlightSessionEnvelope?.(m.id):null;return String(env?.state?.[field]??'')}catch(_){return''}}

  function makeEntry(field,value,part,base,deleted=false){
    const now=Number(base?.atMs||Date.now())||Date.now(),u=account(),f=flightSession(),aid=assignment();
    return {schema:2,key:entryKey(field,part),scope:u+'|'+f+'|',account:u,flightSessionId:f,rosterAssignmentId:aid,field:S(field),part:S(part||'manual'),value:String(value??''),atMs:now,deleted:!!deleted,pendingSync:!!aid,updatedAtMs:Date.now()};
  }
  async function markSynced(entry){const current=await idbGet(entry.key);if(!current||Number(current.atMs)!==Number(entry.atMs)||current.deleted!==entry.deleted)return;current.pendingSync=false;current.syncedAtMs=Date.now();await idbPut(current)}
  function refFor(entry){const base=cloudBase();return base&&entry?.field?root.sagsV470Ref?.(base+'/'+fieldToken(entry.field,entry.part)):null}

  async function mergeRemote(remote,originalRecord,originalForget){
    if(!remote?.field||!Number(remote.atMs))return false;
    const api=root.sagsV61Draft;if(!api)return false;
    const local=api.read?.(remote.field,remote.part)||null;
    if(local&&Number(local.atMs)>Number(remote.atMs)){
      const e=makeEntry(remote.field,local.value,remote.part,local,false);await idbPut(e);scheduleCloud(e,80);return false;
    }
    if(remote.deleted){
      if(!local||Number(remote.atMs)>=Number(local.atMs)){suppress=true;try{originalForget?.(remote.field,remote.part)}finally{suppress=false};await idbPut(makeEntry(remote.field,'',remote.part,remote,true));return true}
      return false;
    }
    if((remote.part==='manual'||remote.part==='quick'||remote.part==='quickTime')&&String(remote.value??'')===committed(remote.field)){
      return false;
    }
    if(!local||Number(remote.atMs)>=Number(local.atMs)){
      suppress=true;try{originalRecord?.(remote.field,String(remote.value??''),remote.part)}finally{suppress=false}
      const after=api.read?.(remote.field,remote.part)||remote;await idbPut({...makeEntry(remote.field,String(remote.value??''),remote.part,after,false),cloudAtMs:Number(remote.atMs)});
      try{root.dispatchEvent?.(new CustomEvent('sags:draft-cloud-restored',{detail:{field:remote.field,part:remote.part,atMs:remote.atMs}}))}catch(_){}
      return true;
    }
    return false;
  }

  async function syncEntry(entry,originalRecord,originalForget){
    if(!entry?.field||!entry.pendingSync||navigator.onLine===false||!cloudCapable())return false;
    let ref=null;try{ref=refFor(entry)}catch(_){}
    if(!ref)return false;
    try{
      const snap=await ref.once('value'),remote=snap.val()||null;
      if(remote&&Number(remote.atMs)>Number(entry.atMs)){await mergeRemote(remote,originalRecord,originalForget);return false}
      const payload={schema:2,field:entry.field,part:entry.part,value:entry.deleted?'':entry.value,atMs:Number(entry.atMs),deleted:!!entry.deleted,flightSessionId:entry.flightSessionId,rosterAssignmentId:entry.rosterAssignmentId,updatedAtMs:Date.now()};
      await ref.set(payload);cloudWrites++;lastCloudSyncAtMs=Date.now();lastCloudError='';await markSynced(entry);return true;
    }catch(e){lastCloudError=S(e?.message||e);console.info('V2 draft cloud pending',lastCloudError);return false}
  }
  function scheduleCloud(entry,delay=320){
    if(!entry?.key)return;
    clearTimeout(timers.get(entry.key));
    timers.set(entry.key,setTimeout(()=>{timers.delete(entry.key);void syncEntry(entry,wrapState.originalRecord,wrapState.originalForget)},Math.max(0,delay)));
  }
  async function flushPending(){for(const entry of await idbScope())if(entry.pendingSync)scheduleCloud(entry,0)}
  async function pullCloud(){
    const base=cloudBase();if(!base||navigator.onLine===false||typeof root.sagsV470Ref!=='function')return false;
    try{
      const snap=await root.sagsV470Ref(base).once('value'),rows=Object.values(snap.val()||{});lastPullAtMs=Date.now();
      for(const row of rows)await mergeRemote(row,wrapState.originalRecord,wrapState.originalForget);
      await flushPending();lastCloudError='';return true;
    }catch(e){lastCloudError=S(e?.message||e);return false}
  }

  const wrapState={originalRecord:null,originalForget:null};
  function installWrap(){
    const api=root.sagsV61Draft;if(!api||typeof api.record!=='function'||api.record.__sagsV2)return false;
    const originalRecord=api.record.bind(api),originalForget=api.forget.bind(api);wrapState.originalRecord=originalRecord;wrapState.originalForget=originalForget;
    const record=function(field,value,part='manual'){
      const ok=originalRecord(field,value,part);if(!ok||suppress)return ok;
      const local=api.read?.(field,part),entry=makeEntry(field,value,part,local,false);
      void idbPut(entry);scheduleCloud(entry);return ok;
    };
    record.__sagsV2=true;
    const forget=function(field,part='manual'){
      const before=api.read?.(field,part),out=originalForget(field,part);if(suppress)return out;
      const entry=makeEntry(field,'',part,{atMs:Math.max(Date.now(),Number(before?.atMs||0)+1)},true);
      void idbPut(entry);scheduleCloud(entry,40);return out;
    };
    forget.__sagsV2=true;api.record=record;api.forget=forget;wrapped=true;
    setTimeout(()=>{void pullCloud()},220);return true;
  }
  function wake(delay=0){setTimeout(()=>{installWrap();void pullCloud();void flushPending()},delay)}
  function start(){
    installWrap();wake(700);
    root.addEventListener?.('online',()=>wake(40),{passive:true});
    root.addEventListener?.('pageshow',()=>wake(180),{passive:true});
    ['sags:login','sags:rolechange','sags:profilechange','sags:personal-roster-updated'].forEach(name=>root.addEventListener?.(name,()=>wake(250)));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)wake(80)},{passive:true});
    document.addEventListener('click',e=>{if(e.target?.closest?.('.v1199TaskBtn,[data-task-aid],#roleBtnQuickTime,#roleBtnFlights,#roleBtnRosterFlights,.v157MenuItem[data-v157-key="myflight"]'))wake(650)},true);
  }
  root.sagsDraftV2Pull=pullCloud;
  root.sagsDraftV2Flush=flushPending;
  root.sagsDraftV2Status=()=>({build:'V2.0',wrapped,cloudCapable:cloudCapable(),online:navigator.onLine!==false,account:account(),flightSessionId:flightSession(),rosterAssignmentId:assignment(),lastCloudSyncAtMs,lastPullAtMs,lastCloudError,cloudWrites,idbWrites});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(typeof window!=='undefined'?window:globalThis);

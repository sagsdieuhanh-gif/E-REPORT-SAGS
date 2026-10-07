/* Three-layer draft recovery. Identity is captured at input; RTDB writes are atomic.
 * Conflict order: server-adjusted HLC (atMs, counter), writer, tombstone, value.
 * Disconnected devices cannot infer real wall-clock order; ties are deterministic.
 * Legacy atMs-only records remain readable; no draft store is reset or migrated away.
 */
(function(root){
  'use strict';
  if(root.__SAGS_DRAFT_SYNC_V2__)return;
  root.__SAGS_DRAFT_SYNC_V2__=true;
  const DB_NAME='sags-draft-recovery-v2',DB_VERSION=1,STORE='drafts';
  const S=v=>String(v??'').trim();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_').replace(/\s+/g,'_').slice(0,96);
  const hash=v=>{let h=2166136261;for(const ch of String(v||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return h.toString(36)};
  const writer=root.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  const timers=new Map(),chains=new Map(),clocks=new Map(),pulls=new Map();
  let dbPromise=null,offsetRef=null,serverOffset=0,epoch=0,lastContext='',wrapped=false,suppress=false;
  let lastCloudSyncAtMs=0,lastCloudError='',lastPullAtMs=0,cloudWrites=0,idbWrites=0;
  const wrapState={originalRecord:null,originalForget:null};
  function account(){
    try{if(typeof root.firebase?.auth==='function')return safe(root.firebase.auth().currentUser?.uid||'')}catch(_){}
    const p=root.__sagsGetSession?.()?.profile||root.currentUserProfile||{};
    return safe(p.firebaseUid||p.uid||p.username||p.userName||p.code||'');
  }
  function meta(){try{return (typeof currentFlightSessionMeta==='function'?currentFlightSessionMeta():root.currentFlightSessionMeta?.())||null}catch(_){return null}}
  function identity(){
    const m=meta();let f='';try{f=S(typeof activeFlightSessionId!=='undefined'?activeFlightSessionId:root.activeFlightSessionId)}catch(_){}
    let aid=S(m?.rosterAssignmentId);if(!aid&&m?.id)aid=S(root.readFlightSessionEnvelope?.(m.id)?.rosterAssignmentId);
    return Object.freeze({account:account(),flightSessionId:safe(f||m?.id||''),rosterAssignmentId:safe(aid)});
  }
  const scopeOf=i=>[i.account,i.flightSessionId,i.rosterAssignmentId].join('|');
  function capture(){const i=identity(),s=scopeOf(i);if(s!==lastContext){lastContext=s;epoch++}return {...i,epoch}}
  function active(i){const current=capture();return current.epoch===i.epoch&&scopeOf(current)===scopeOf(i)}
  function fieldToken(field,part){return safe(field).slice(0,58)+'__'+safe(part||'manual').slice(0,18)+'__'+hash(S(field)+'|'+S(part||'manual'))}
  function baseFor(i){return i?.account&&i?.rosterAssignmentId?'roster_sessions/'+safe(i.rosterAssignmentId)+'/draftRecoveryV2/'+safe(i.account):''}
  function keyFor(i,field,part){return [i.account,i.flightSessionId,fieldToken(field,part)].join('|')}
  function valid(entry){return !!(entry?.account&&entry.flightSessionId&&entry.rosterAssignmentId&&entry.field&&entry.key===keyFor(entry,entry.field,entry.part))}
  function matches(row,i){return row&&(!row.account||row.account===i.account)&&row.flightSessionId===i.flightSessionId&&row.rosterAssignmentId===i.rosterAssignmentId}
  function version(e){return {atMs:Number(e?.version?.atMs??e?.atMs)||0,counter:Number(e?.version?.counter)||0,writer:S(e?.version?.writer)}}
  function compare(a,b){const x=version(a),y=version(b);return x.atMs-y.atMs||x.counter-y.counter||(x.writer<y.writer?-1:x.writer>y.writer?1:0)||Number(!!a?.deleted)-Number(!!b?.deleted)||(String(a?.value??'')<String(b?.value??'')?-1:String(a?.value??'')>String(b?.value??'')?1:0)}
  function observe(key,e){const prior=clocks.get(key);if(!prior||compare(e,prior)>0){clocks.set(key,e);try{const saved=JSON.parse(localStorage.getItem("sagsDraftClockV27:"+key)||"null");if(!saved||compare(e,saved)>=0)localStorage.setItem("sagsDraftClockV27:"+key,JSON.stringify({version:version(e)}))}catch(_){}}}
  function tick(key,base){let saved=null;try{saved=JSON.parse(localStorage.getItem("sagsDraftClockV27:"+key)||"null")}catch(_){}const prior=clocks.get(key),p=version(prior),b=version(saved||base?.version&&base),wall=Math.max(1,Math.trunc(Date.now()+serverOffset));const atMs=Math.max(wall,p.atMs,b.atMs);const counter=Math.max(atMs===p.atMs?p.counter:-1,atMs===b.atMs?b.counter:-1)+1;return {atMs,counter,writer}}
  function installClock(){
    if(offsetRef)return;
    try{const ref=root.firebase?.database?.().ref('.info/serverTimeOffset');if(!ref?.on)return;offsetRef=ref;ref.on('value',s=>{const n=Number(s.val());if(Number.isFinite(n))serverOffset=n})}catch(_){}
  }
  function openDb(){
    if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{try{const q=indexedDB.open(DB_NAME,DB_VERSION);q.onupgradeneeded=()=>{const db=q.result;if(!db.objectStoreNames.contains(STORE)){const s=db.createObjectStore(STORE,{keyPath:'key'});s.createIndex('scope','scope',{unique:false});s.createIndex('pendingSync','pendingSync',{unique:false})}};q.onsuccess=()=>{q.result.onversionchange=()=>{q.result.close();dbPromise=null};resolve(q.result)};q.onerror=()=>reject(q.error)}catch(e){reject(e)}}).catch(e=>{dbPromise=null;throw e});
    return dbPromise;
  }
  async function idbPut(entry,syncedOnly=false){
    try{const db=await openDb();return await new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),q=store.get(entry.key);let written=false;q.onsuccess=()=>{const old=q.result;if(syncedOnly){if(!old||compare(old,entry)!==0)return;store.put({...old,pendingSync:false,syncedAtMs:Date.now()});written=true}else if(!old||compare(entry,old)>=0){store.put(entry);written=true}};tx.oncomplete=()=>{if(written)idbWrites++;res(written)};tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error||Error('Draft transaction aborted'))})}catch(e){lastCloudError=S(e?.message||e);console.warn('Draft IndexedDB write',lastCloudError);return false}
  }
  async function idbGet(key){try{const db=await openDb();return await new Promise((res,rej)=>{const q=db.transaction(STORE,'readonly').objectStore(STORE).get(key);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)})}catch(_){return null}}
  async function pendingFor(user){try{const db=await openDb();return await new Promise((res,rej)=>{const q=db.transaction(STORE,'readonly').objectStore(STORE).getAll();q.onsuccess=()=>res((q.result||[]).filter(e=>e.account===user&&e.pendingSync&&valid(e)));q.onerror=()=>rej(q.error)})}catch(_){return[]}}
  function makeEntry(i,field,value,part,base,deleted=false){
    const key=keyFor(i,field,part),v=tick(key,base);
    const entry=Object.freeze({schema:3,key,scope:i.account+'|'+i.flightSessionId+'|',account:i.account,flightSessionId:i.flightSessionId,rosterAssignmentId:i.rosterAssignmentId,field:S(field),part:S(part||'manual'),value:String(value??''),atMs:v.atMs,version:Object.freeze(v),deleted:!!deleted,pendingSync:!!i.rosterAssignmentId,updatedAtMs:Date.now()});observe(key,entry);return entry;
  }
  function committed(field){try{const m=meta();return String(root.readFlightSessionEnvelope?.(m?.id)?.state?.[field]??'')}catch(_){return''}}
  async function mergeRemote(remote,i){
    if(!active(i)||!matches(remote,i)||!remote.field||!Number(remote.atMs))return false;
    const api=root.sagsV61Draft,key=keyFor(i,remote.field,remote.part),stored=await idbGet(key);
    if(!active(i)||!api)return false;
    const local=api.read?.(remote.field,remote.part)||null;
    // Local input can race the IDB read. The in-memory clock is advanced synchronously.
    const known=[stored,clocks.get(key)].filter(Boolean);const candidates=known.length?known:[local&&{...local,atMs:Number(local.atMs)+serverOffset}].filter(Boolean);const newest=candidates.sort((a,b)=>compare(b,a))[0];
    if(newest&&compare(newest,remote)>0)return false;
    observe(key,remote);
    if(!remote.deleted&&['manual','quick','quickTime'].includes(remote.part)&&String(remote.value??'')===committed(remote.field))return false;
    if(!active(i))return false;
    suppress=true;try{if(remote.deleted)wrapState.originalForget?.(remote.field,remote.part);else wrapState.originalRecord?.(remote.field,String(remote.value??''),remote.part)}finally{suppress=false}
    const entry={...remote,key,scope:i.account+'|'+i.flightSessionId+'|',account:i.account,pendingSync:false,cloudAtMs:Number(remote.atMs)};
    await idbPut(entry);
    if(!active(i))return false;
    try{root.dispatchEvent?.(new CustomEvent('sags:draft-cloud-restored',{detail:{field:remote.field,part:remote.part,atMs:remote.atMs}}))}catch(_){}
    return true;
  }
  async function syncEntry(entry){
    if(!valid(entry)||!entry.pendingSync||navigator.onLine===false||account()!==entry.account||typeof root.sagsV470Ref!=='function')return false;
    const i=capture();
    try{
      const ref=root.sagsV470Ref(baseFor(entry)+'/'+fieldToken(entry.field,entry.part));
      if(typeof ref?.transaction!=='function')throw Error('Atomic draft transaction unavailable');
      const payload={schema:3,account:entry.account,field:entry.field,part:entry.part,value:entry.deleted?'':entry.value,atMs:entry.atMs,version:entry.version||version(entry),deleted:!!entry.deleted,flightSessionId:entry.flightSessionId,rosterAssignmentId:entry.rosterAssignmentId,updatedAtMs:entry.updatedAtMs};
      const result=await ref.transaction(remote=>{
        if(account()!==entry.account||navigator.onLine===false)return;
        // Never rebase a queued write on a newer remote: that would make stale data win.
        if(remote&&(!matches(remote,entry)||remote.field!==entry.field||remote.part!==entry.part||compare(remote,payload)>=0))return;
        return payload;
      },undefined,false);
      if(account()!==entry.account)return false;
      const remote=result.snapshot?.val?.();
      if(result.committed){cloudWrites++;lastCloudSyncAtMs=Date.now();lastCloudError='';await idbPut(entry,true);return true}
      if(remote&&(!matches(remote,entry)||remote.field!==entry.field||remote.part!==entry.part)){lastCloudError="Cloud draft identity mismatch; local draft remains pending";return false}
      if(remote&&compare(remote,entry)>=0){
        if(active(i)&&matches(entry,i))await mergeRemote(remote,i);
        if(account()===entry.account)await idbPut(entry,true);
      }
      return false;
    }catch(e){lastCloudError=S(e?.message||e);console.info('Draft cloud pending',lastCloudError);return false}
  }
  function enqueue(entry){
    const previous=chains.get(entry.key)||Promise.resolve();
    const run=previous.catch(()=>{}).then(()=>syncEntry(entry));chains.set(entry.key,run);
    void run.finally(()=>{if(chains.get(entry.key)===run)chains.delete(entry.key)});return run;
  }
  function scheduleCloud(entry,delay=320){
    if(!valid(entry))return;
    clearTimeout(timers.get(entry.key));timers.set(entry.key,setTimeout(()=>{timers.delete(entry.key);void enqueue(entry)},Math.max(0,delay)));
  }
  async function flushPending(){
    const user=account();if(!user)return false;
    const rows=await pendingFor(user);if(account()!==user)return false;
    await Promise.all(rows.map(e=>{observe(e.key,e);return enqueue(e)}));return true;
  }
  function pullCloud(){
    const i=capture(),base=baseFor(i);if(!base||navigator.onLine===false||typeof root.sagsV470Ref!=='function')return Promise.resolve(false);
    const key=scopeOf(i)+'|'+i.epoch;if(pulls.has(key))return pulls.get(key);
    const run=(async()=>{try{const snap=await root.sagsV470Ref(base).once('value');if(!active(i))return false;lastPullAtMs=Date.now();for(const row of Object.values(snap.val()||{})){if(!active(i))return false;await mergeRemote(row,i)}if(!active(i))return false;lastCloudError='';return true}catch(e){lastCloudError=S(e?.message||e);return false}})();pulls.set(key,run);void run.finally(()=>{if(pulls.get(key)===run)pulls.delete(key)});return run;
  }
  function installWrap(){
    installClock();const api=root.sagsV61Draft;if(!api||typeof api.record!=='function'||api.record.__sagsV2)return false;
    wrapState.originalRecord=api.record.bind(api);wrapState.originalForget=api.forget.bind(api);
    const record=function(field,value,part='manual'){
      const i=capture(),ok=wrapState.originalRecord(field,value,part);if(!ok||suppress)return ok;
      const local=api.read?.(field,part),entry=makeEntry(i,field,value,part,local,!local);
      void idbPut(entry).then(()=>scheduleCloud(entry));return ok;
    };record.__sagsV2=true;
    const forget=function(field,part='manual'){
      const i=capture(),before=api.read?.(field,part),out=wrapState.originalForget(field,part);if(suppress)return out;
      const entry=makeEntry(i,field,'',part,before,true);void idbPut(entry).then(()=>scheduleCloud(entry,40));return out;
    };forget.__sagsV2=true;api.record=record;api.forget=forget;wrapped=true;return true;
  }
  function wake(delay=0){setTimeout(()=>{installWrap();void pullCloud();void flushPending()},delay)}
  function start(){
    installWrap();wake(700);
    root.addEventListener?.('online',()=>wake(40),{passive:true});root.addEventListener?.('pageshow',()=>wake(180),{passive:true});
    ['sags:login','sags:logout','sags:rolechange','sags:profilechange','sags:personal-roster-updated','sags:flightchange'].forEach(name=>root.addEventListener?.(name,()=>{epoch++;wake(250)}));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)wake(80)},{passive:true});
    document.addEventListener('click',e=>{if(e.target?.closest?.('.v1199TaskBtn,[data-task-aid],#roleBtnQuickTime,#roleBtnFlights,#roleBtnRosterFlights,.v157MenuItem[data-v157-key="myflight"]')){epoch++;wake(650)}},true);
    root.addEventListener?.('pagehide',()=>{if(offsetRef){offsetRef.off('value');offsetRef=null}},{passive:true});
  }
  root.sagsDraftV2Pull=pullCloud;root.sagsDraftV2Flush=flushPending;
  root.sagsDraftV2Status=()=>({build:'V2.1',wrapped,cloudCapable:!!(baseFor(identity())&&typeof root.sagsV470Ref==='function'),online:navigator.onLine!==false,...identity(),lastCloudSyncAtMs,lastPullAtMs,lastCloudError,cloudWrites,idbWrites});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(typeof window!=='undefined'?window:globalThis);

/* E-REPORT/SAGS V2.2.6 · SIGNATURE LEGACY QUOTA FIX
 * BUILD: V2.2.6-SIGNATURE-LEGACY-QUOTA-FIX
 * Base: V2.2.5 R2 + V2.2.2 ARR/DEP.
 *
 * Exact recurring bug fixed:
 * saveSignature() stores a PNG data URL in state and immediately calls persist().
 * persist() first writes the canonical flight session envelope, then writes the
 * same large state again to legacy "rampFullTestV17Data::<user>".
 * V2.2.5 only ignored that legacy quota error inside the EXPORT window, but the
 * signature persist happens BEFORE exportDepth starts. Result: signing can throw
 * QuotaExceededError and the operator cannot proceed to export.
 *
 * V2.2.6 rules:
 * 1) Canonical sagsFlightSessionV1:* remains mandatory and is NEVER silently dropped.
 * 2) Legacy rampFullTestV17Data is best-effort only. If a canonical session exists,
 *    do not physically duplicate the full state there.
 * 3) Before every canonical session write, remove obsolete legacy duplicates and
 *    compact old full V2.2 checkpoints when their canonical session already exists.
 * 4) If canonical write still exceeds quota after safe cleanup, rethrow the error.
 *    Normal autosave/data-integrity failures are therefore never hidden.
 * 5) Never clear all website data and never delete a checkpoint that is the only
 *    recoverable copy of a session.
 */
(function(root){
  'use strict';

  const BUILD='V2.2.6-SIGNATURE-LEGACY-QUOTA-FIX';
  if(root.__SAGS_V226_SIGNATURE_QUOTA===BUILD)return;
  root.__SAGS_V226_SIGNATURE_QUOTA=BUILD;

  const S=v=>String(v??'').trim();
  const previousSet=Storage.prototype.setItem;
  const currentGet=Storage.prototype.getItem;
  const nativeRemove=Storage.prototype.removeItem;

  let legacyRemoved=0;
  let checkpointsCompacted=0;
  let legacyWritesSkipped=0;
  let canonicalRetries=0;
  let canonicalQuotaErrors=0;
  let lastCleanupAtMs=0;
  let lastCanonicalKey='';
  let lastLegacyKey='';

  function isLocal(store){
    try{return store===root.localStorage}catch(_){return false}
  }

  function isQuota(e){
    const n=S(e?.name);
    const m=S(e?.message).toLowerCase();
    return n==='QuotaExceededError'
      ||n==='NS_ERROR_DOM_QUOTA_REACHED'
      ||m.includes('quota')
      ||m.includes('storage')&&m.includes('exceed');
  }

  function isLegacyKey(key){
    return S(key).includes('rampFullTestV17Data');
  }

  function isCheckpointKey(key){
    return S(key).includes('sagsV22LocalCheckpoint::');
  }

  function isCanonicalSessionKey(key){
    return S(key).includes('sagsFlightSessionV1:');
  }

  function parseJson(raw){
    try{return JSON.parse(raw)}catch(_){return null}
  }

  function allKeys(){
    const a=[];
    try{
      for(let i=0;i<root.localStorage.length;i++){
        const k=root.localStorage.key(i);
        if(k)a.push(k);
      }
    }catch(_){}
    return a;
  }

  function canonicalExists(){
    try{
      for(const k of allKeys()){
        if(!isCanonicalSessionKey(k))continue;
        const v=currentGet.call(root.localStorage,k);
        if(v&&v!=='{}')return true;
      }
    }catch(_){}
    return false;
  }

  function primaryKeyForSessionId(sessionId){
    try{
      if(typeof root.flightSessionStorageKey==='function'){
        return S(root.flightSessionStorageKey(sessionId));
      }
    }catch(_){}
    // Fallback: infer the owned prefix from an existing canonical key.
    const sid=S(sessionId);
    if(!sid)return '';
    for(const k of allKeys()){
      const i=k.indexOf('sagsFlightSessionV1:');
      if(i>=0)return k.slice(0,i)+'sagsFlightSessionV1:'+sid;
    }
    return '';
  }

  function removeLegacyDuplicates(){
    if(!canonicalExists())return 0;
    let n=0;
    for(const k of allKeys()){
      if(!isLegacyKey(k))continue;
      try{
        nativeRemove.call(root.localStorage,k);
        n++;
        lastLegacyKey=k;
      }catch(_){}
    }
    if(n){
      legacyRemoved+=n;
      lastCleanupAtMs=Date.now();
    }
    return n;
  }

  function compactRecoverableCheckpoints(){
    let n=0;
    for(const k of allKeys()){
      if(!isCheckpointKey(k))continue;

      let raw='';
      try{raw=currentGet.call(root.localStorage,k)||''}catch(_){}
      if(!raw)continue;

      const cp=parseJson(raw);
      if(!cp||typeof cp!=='object'||!cp.envelope)continue;

      const sid=S(cp.sessionId);
      const pk=primaryKeyForSessionId(sid);
      if(!pk)continue;

      let primary='';
      try{primary=currentGet.call(root.localStorage,pk)||''}catch(_){}
      // Safety: if checkpoint is the only copy, leave it untouched.
      if(!primary)continue;

      const compact={...cp};
      let bytes=0;
      try{bytes=JSON.stringify(cp.envelope).length}catch(_){}
      delete compact.envelope;
      compact.envelopeRef=pk;
      compact.envelopeBytes=bytes;
      compact.compactedBy=BUILD;
      compact.compactedAtMs=Date.now();

      try{
        previousSet.call(root.localStorage,k,JSON.stringify(compact));
        n++;
      }catch(e){
        // Replacing a large value with a smaller one should normally work.
        // If it does not, preserve the original checkpoint.
        console.info('V2.2.6 checkpoint compact skipped',k,e?.name||e?.message||e);
      }
    }
    if(n){
      checkpointsCompacted+=n;
      lastCleanupAtMs=Date.now();
    }
    return n;
  }

  function safeCleanupBeforeCanonical(){
    // Order matters: removing the old legacy full-state duplicate releases space
    // immediately, then checkpoint compaction releases another duplicate copy.
    removeLegacyDuplicates();
    compactRecoverableCheckpoints();
  }

  Storage.prototype.setItem=function(key,value){
    if(!isLocal(this))return previousSet.call(this,key,value);

    const k=S(key);
    const v=String(value);

    // Canonical session is the source of truth. Make room for it first.
    if(isCanonicalSessionKey(k)){
      lastCanonicalKey=k;
      safeCleanupBeforeCanonical();

      try{
        return previousSet.call(this,k,v);
      }catch(e){
        if(!isQuota(e))throw e;

        // One deterministic retry after another safe cleanup. We do NOT delete
        // unrelated app/site data and do NOT suppress a second canonical failure.
        canonicalRetries++;
        safeCleanupBeforeCanonical();
        try{
          return previousSet.call(this,k,v);
        }catch(e2){
          if(isQuota(e2))canonicalQuotaErrors++;
          throw e2;
        }
      }
    }

    // Legacy state is only a backward-compatibility bootstrap. persist() writes the
    // canonical session BEFORE this legacy key. If canonical data exists, writing
    // the same signed/image-heavy state again is unnecessary and caused the exact
    // historical quota failure.
    if(isLegacyKey(k)){
      lastLegacyKey=k;

      if(canonicalExists()){
        try{nativeRemove.call(this,k)}catch(_){}
        legacyWritesSkipped++;
        lastCleanupAtMs=Date.now();
        return;
      }

      // No canonical session exists yet: preserve old bootstrap behavior.
      try{
        return previousSet.call(this,k,v);
      }catch(e){
        // Do not hide a quota error if legacy is genuinely the only data path.
        throw e;
      }
    }

    return previousSet.call(this,k,v);
  };

  function startupCleanup(){
    try{
      removeLegacyDuplicates();
      compactRecoverableCheckpoints();
    }catch(e){
      console.info('V2.2.6 startup cleanup',e);
    }
  }

  // Run immediately, then once after V2.2.5's own migration timer.
  startupCleanup();
  setTimeout(startupCleanup,500);
  window.addEventListener('pageshow',()=>setTimeout(startupCleanup,50),{passive:true});

  root.sagsV226StorageDiagnostics=function(){
    let legacyBytes=0,legacyCount=0,checkpointBytes=0,checkpointCount=0,canonicalBytes=0,canonicalCount=0;
    try{
      for(const k of allKeys()){
        const raw=currentGet.call(root.localStorage,k)||'';
        if(isLegacyKey(k)){legacyCount++;legacyBytes+=raw.length}
        if(isCheckpointKey(k)){checkpointCount++;checkpointBytes+=raw.length}
        if(isCanonicalSessionKey(k)){canonicalCount++;canonicalBytes+=raw.length}
      }
    }catch(_){}
    return {
      build:BUILD,
      canonicalCount,canonicalBytes,
      legacyCount,legacyBytes,
      checkpointCount,checkpointBytes,
      legacyRemoved,legacyWritesSkipped,checkpointsCompacted,
      canonicalRetries,canonicalQuotaErrors,
      lastCanonicalKey,lastLegacyKey,lastCleanupAtMs,
      v225:typeof root.sagsV225StorageDiagnostics==='function'
        ?root.sagsV225StorageDiagnostics()
        :null
    };
  };
})(typeof window!=='undefined'?window:globalThis);

/* E-REPORT/SAGS V2.8 · PDF EXPORT QUOTA GUARD
 * BUILD: V2.8-PDF-QUOTA-GUARD
 *
 * Fix Android/iOS/browser localStorage quota errors that can surface only when
 * exporting a completed F/SAGS PDF. The completed snapshot in RTDB remains
 * authoritative; export must not fail merely because a redundant local cache
 * cannot be enlarged.
 *
 * Safety:
 * - Never suppress quota errors during normal editing/autosave.
 * - Suppress only QuotaExceededError during an active PDF export and only for
 *   the legacy form cache key rampFullTestV17Data*.
 * - Remove only redundant V2.2 local checkpoints when the current assignment
 *   is already strongly COMPLETED in RTDB, or old checkpoints already marked
 *   pendingSync=false.
 */
(function(root){
  'use strict';
  const BUILD='V2.8-PDF-QUOTA-GUARD';
  if(root.__SAGS_V28_PDF_QUOTA_GUARD===BUILD)return;
  root.__SAGS_V28_PDF_QUOTA_GUARD=BUILD;

  const S=v=>String(v??'').trim();
  const U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const normUser=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}};

  function session(){try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}}
  function profile(){return session().profile||root.currentUserProfile||{}}
  function me(){const p=profile();return normUser(p.username||p.userName||p.code||'')}
  function activeMeta(){try{return root.currentFlightSessionMeta?.()||null}catch(_){return null}}
  function ownedKey(k){try{return typeof root.sagsOwnedKey==='function'?root.sagsOwnedKey(k):k}catch(_){return k}}
  function db(path=''){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase chưa sẵn sàng.');return root.sagsV470Ref(path)}
  async function once(path){return (await db(path).once('value')).val()}

  function isQuotaError(e){
    const x=S(e?.name)+' '+S(e?.message||e);
    return /QuotaExceededError|quota|exceeded the quota|NS_ERROR_DOM_QUOTA_REACHED/i.test(x);
  }
  function strongDone(st){
    if(!st)return false;
    const c=U(st.claimStatus),w=U(st.workPartStatus),t=U(st.taskStatusV333||st.taskStatus);
    const done=['PART_COMPLETED','COMPLETED','HANDED_OVER'].includes(c)||w==='COMPLETED'||t==='COMPLETED';
    return !!(done&&st.completionEnvelope&&Number(st.completedAtMs||st.completionEnvelopeAtMs||0)>0);
  }

  let exportGuardDepth=0,lastQuotaKey='',lastQuotaAtMs=0,removedBytes=0,removedKeys=0;
  const nativeSetItem=Storage.prototype.setItem;
  if(!Storage.prototype.setItem.__sagsV28QuotaGuard){
    const guarded=function(key,value){
      try{return nativeSetItem.call(this,key,value)}catch(e){
        const k=S(key);
        if(exportGuardDepth>0&&this===root.localStorage&&isQuotaError(e)&&/rampFullTestV17Data/i.test(k)){
          lastQuotaKey=k;lastQuotaAtMs=Date.now();
          console.warn('V2.8: bỏ qua local cache write do quota trong lúc xuất PDF đã hoàn tất:',k);
          return undefined;
        }
        throw e;
      }
    };
    guarded.__sagsV28QuotaGuard=1;
    guarded.__sagsV28Native=nativeSetItem;
    try{Storage.prototype.setItem=guarded}catch(e){console.warn('V2.8 Storage guard unavailable',e)}
  }

  function checkpointKeyForSession(id){return ownedKey(`sagsV22LocalCheckpoint::${S(id)}`)}
  function removeLocalKey(k){
    try{
      const v=localStorage.getItem(k);if(v!=null){removedBytes+=String(v).length*2;removedKeys++;localStorage.removeItem(k);return true}
    }catch(_){}
    return false;
  }
  function cleanupSyncedCheckpoints(exceptSessionId=''){
    try{
      const keys=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.includes('sagsV22LocalCheckpoint::'))keys.push(k)}
      for(const k of keys){
        try{
          const x=JSON.parse(localStorage.getItem(k)||'null');
          if(!x||x.pendingSync!==false)continue;
          if(exceptSessionId&&S(x.sessionId)===S(exceptSessionId))continue;
          removeLocalKey(k);
        }catch(_){}
      }
    }catch(_){}
  }
  async function prepareCompletedExportHeadroom(){
    const meta=activeMeta(),aid=S(meta?.rosterAssignmentId),sid=S(meta?.id);if(!aid)return false;
    const st=(await once(`roster_sessions/${safe(aid)}`).catch(()=>null))||null;
    if(!strongDone(st))return false;
    // The completionEnvelope in RTDB is authoritative now; current V2.2 checkpoint
    // is only a duplicate recovery copy and is safe to drop before PDF generation.
    if(sid)removeLocalKey(checkpointKeyForSession(sid));
    cleanupSyncedCheckpoints(sid);
    return true;
  }

  function patchPersist(){
    const base=root.persist;if(typeof base!=='function'||base.__v28QuotaGuard)return false;
    const wrapped=function(){
      try{return base.apply(this,arguments)}catch(e){
        if(exportGuardDepth>0&&isQuotaError(e)){
          lastQuotaKey=lastQuotaKey||'persist';lastQuotaAtMs=Date.now();
          console.warn('V2.8: persist local quota ignored only during completed PDF export',e);
          return false;
        }
        throw e;
      }
    };
    wrapped.__v28QuotaGuard=1;root.persist=wrapped;try{persist=wrapped}catch(_){};return true;
  }

  function patchSendReport(){
    const base=root.sendReport;if(typeof base!=='function'||base.__v28QuotaGuard)return false;
    const wrapped=async function(){
      let prepared=false;
      try{
        prepared=await prepareCompletedExportHeadroom();
        exportGuardDepth++;
        return await base.apply(this,arguments);
      }catch(e){
        // Do not hide non-quota errors: those still need operator attention.
        if(isQuotaError(e)&&prepared){
          lastQuotaAtMs=Date.now();
          alert('Bộ nhớ tạm của trình duyệt đã đầy nhưng dữ liệu HOÀN TẤT đã được lưu. Hệ thống đã bỏ qua cache cục bộ dư thừa; vui lòng bấm XUẤT lại một lần.');
          return false;
        }
        throw e;
      }finally{exportGuardDepth=Math.max(0,exportGuardDepth-1)}
    };
    wrapped.__v28QuotaGuard=1;root.sendReport=wrapped;try{sendReport=wrapped}catch(_){};return true;
  }

  function patchExportMenu(){
    const base=root.openExportChoiceMenu;if(typeof base!=='function'||base.__v28QuotaGuard)return false;
    const wrapped=async function(){
      try{await prepareCompletedExportHeadroom()}catch(_){}
      return await base.apply(this,arguments);
    };
    wrapped.__v28QuotaGuard=1;root.openExportChoiceMenu=wrapped;try{openExportChoiceMenu=wrapped}catch(_){};return true;
  }

  function patchComplete(){
    const base=root.v324ConfirmRosterHandover;if(typeof base!=='function'||base.__v28Cleanup)return false;
    const wrapped=async function(){
      const r=await base.apply(this,arguments);
      setTimeout(()=>prepareCompletedExportHeadroom().catch(()=>{}),180);
      return r;
    };
    wrapped.__v28Cleanup=1;root.v324ConfirmRosterHandover=wrapped;try{v324ConfirmRosterHandover=wrapped}catch(_){};return true;
  }

  function install(){patchPersist();patchSendReport();patchExportMenu();patchComplete()}
  install();let n=0;const timer=setInterval(()=>{install();if(++n>40)clearInterval(timer)},250);
  window.addEventListener('pageshow',()=>setTimeout(install,80),{passive:true});

  root.sagsV28QuotaDiagnostics=()=>({
    build:BUILD,exportGuardDepth,lastQuotaKey,lastQuotaAtMs,removedKeys,removedApproxBytes:removedBytes,
    persistPatched:!!root.persist?.__v28QuotaGuard,sendPatched:!!root.sendReport?.__v28QuotaGuard
  });
})(typeof window!=='undefined'?window:globalThis);

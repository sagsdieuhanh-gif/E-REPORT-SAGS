/* E-REPORT/SAGS V2.9 · EXPORT SPEED FIX
 * BUILD: V2.9-EXPORT-SPEED-FIX
 *
 * Mục tiêu: giảm độ trễ sau HOÀN TẤT -> XUẤT.
 *
 * V2.8 đã an toàn trước QuotaExceededError nhưng mỗi lần mở XUẤT và gửi PDF
 * còn chờ thêm RTDB + quét toàn bộ localStorage. V2.9 bỏ các bước chặn UI đó.
 *
 * An toàn vẫn giữ nguyên:
 * - V2.7 vẫn là lớp xác nhận COMPLETED và khóa PDF khi chưa HOÀN TẤT.
 * - Quota guard chỉ hoạt động trong đúng lúc sendReport đang xuất và chỉ bỏ qua
 *   lỗi ghi legacy cache rampFullTestV17Data*.
 * - Không nuốt lỗi quota khi người dùng đang nhập liệu/autosave bình thường.
 * - Chỉ dọn checkpoint V2.2 của đúng session hiện tại, chạy bất đồng bộ sau khi
 *   V2.7 đã mở quyền xuất; không quét toàn bộ localStorage.
 */
(function(root){
  'use strict';
  const BUILD='V2.9-EXPORT-SPEED-FIX';
  if(root.__SAGS_V29_EXPORT_SPEED_FIX===BUILD)return;
  root.__SAGS_V29_EXPORT_SPEED_FIX=BUILD;

  const S=v=>String(v??'').trim();
  function activeMeta(){try{return root.currentFlightSessionMeta?.()||null}catch(_){return null}}
  function ownedKey(k){try{return typeof root.sagsOwnedKey==='function'?root.sagsOwnedKey(k):k}catch(_){return k}}
  function isQuotaError(e){const x=S(e?.name)+' '+S(e?.message||e);return /QuotaExceededError|quota|exceeded the quota|NS_ERROR_DOM_QUOTA_REACHED/i.test(x)}

  let exportDepth=0,lastQuotaKey='',lastQuotaAtMs=0,removedCheckpoint=false;

  /* If an old page happened to have V2.8 in memory, unwrap to the real native setItem. */
  const currentSetItem=Storage.prototype.setItem;
  const nativeSetItem=currentSetItem?.__sagsV28Native||currentSetItem?.__sagsV29Native||currentSetItem;
  if(!Storage.prototype.setItem.__sagsV29FastQuotaGuard){
    const guarded=function(key,value){
      try{return nativeSetItem.call(this,key,value)}catch(e){
        const k=S(key);
        if(exportDepth>0&&this===root.localStorage&&isQuotaError(e)&&/rampFullTestV17Data/i.test(k)){
          lastQuotaKey=k;lastQuotaAtMs=Date.now();
          console.warn('V2.9: bỏ qua legacy cache write do quota trong lúc xuất PDF:',k);
          return undefined;
        }
        throw e;
      }
    };
    guarded.__sagsV29FastQuotaGuard=1;
    guarded.__sagsV29Native=nativeSetItem;
    try{Storage.prototype.setItem=guarded}catch(e){console.warn('V2.9 Storage quota guard unavailable',e)}
  }

  function validV27PdfContext(){
    try{
      const c=root.__SAGS_V27_PDF_CTX;if(!c||Number(c.expiresAtMs||0)<Date.now())return null;
      const m=activeMeta();if(S(m?.rosterAssignmentId)&&S(c.aid)&&S(m.rosterAssignmentId)!==S(c.aid))return null;
      return c;
    }catch(_){return null}
  }

  function cleanupCurrentCheckpointAsync(){
    const ctx=validV27PdfContext();if(!ctx)return false;
    const meta=activeMeta(),sid=S(meta?.id);if(!sid)return false;
    const key=ownedKey(`sagsV22LocalCheckpoint::${sid}`);
    setTimeout(()=>{
      try{
        if(!validV27PdfContext())return;
        if(localStorage.getItem(key)!=null){localStorage.removeItem(key);removedCheckpoint=true}
      }catch(_){ }
    },0);
    return true;
  }

  function patchExportMenu(){
    const base=root.openExportChoiceMenu;if(typeof base!=='function'||base.__v29ExportSpeed)return false;
    const wrapped=async function(){
      /* V2.7 performs the authoritative COMPLETED check. Do not add another RTDB read here. */
      const r=await base.apply(this,arguments);
      cleanupCurrentCheckpointAsync();
      return r;
    };
    wrapped.__v29ExportSpeed=1;root.openExportChoiceMenu=wrapped;try{openExportChoiceMenu=wrapped}catch(_){};return true;
  }

  function patchSendReport(){
    const base=root.sendReport;if(typeof base!=='function'||base.__v29ExportSpeed)return false;
    const wrapped=async function(){
      exportDepth++;
      try{
        /* No pre-export Firebase read / no full localStorage scan. */
        cleanupCurrentCheckpointAsync();
        return await base.apply(this,arguments);
      }finally{exportDepth=Math.max(0,exportDepth-1)}
    };
    wrapped.__v29ExportSpeed=1;root.sendReport=wrapped;try{sendReport=wrapped}catch(_){};return true;
  }

  function install(){patchExportMenu();patchSendReport()}
  install();let n=0;const timer=setInterval(()=>{install();if(++n>40)clearInterval(timer)},250);
  window.addEventListener('pageshow',()=>setTimeout(install,80),{passive:true});

  root.sagsV29ExportDiagnostics=()=>({
    build:BUILD,exportDepth,lastQuotaKey,lastQuotaAtMs,removedCheckpoint,
    v27Context:!!validV27PdfContext(),
    exportMenuPatched:!!root.openExportChoiceMenu?.__v29ExportSpeed,
    sendPatched:!!root.sendReport?.__v29ExportSpeed
  });
})(typeof window!=='undefined'?window:globalThis);

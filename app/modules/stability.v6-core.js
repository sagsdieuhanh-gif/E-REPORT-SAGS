/* V6.1 STABILITY: local-only edit recovery and non-interruptive optional updates.
   No new Firebase reads/writes. Never claim a local Ramp draft is cloud-synced. */
(function(root){
  'use strict';
  if(root.__SAGS_V61_STABILITY__)return;
  root.__SAGS_V61_STABILITY__=true;
  const PREFIX='sagsV61Uncommitted:';
  const $=id=>document.getElementById(id);
  const text=x=>String(x??'');
  const failedDrafts=new Map();
  let lastVerifiedDraft=null;
  let lastManualCompare=null;
  let storageError=false, lastCore='', statusTimer=0, reloading=false, warnedStorage=false, statusRefreshTimer=0;
  function scope(){
    try{return sagsOwnedPrefix(PREFIX)+String(activeFlightSessionId||'')+':';}
    catch(_){return PREFIX+'NO_ACCOUNT:NO_FLIGHT:';}
  }
  function key(field,part='manual'){return scope()+encodeURIComponent(text(field))+':'+part;}
  function read(field,part='manual'){
    try{const x=JSON.parse(localStorage.getItem(key(field,part))||'null');
      return x&&x.field===field&&x.part===part&&typeof x.value==='string'?{...x,value:root.SAGSBusinessText?.draft(field,x.value)??x.value}:null;
    }catch(_){return null;}
  }
  function record(field,value,part='manual'){
    if(!field)return false;
    try{
      const k=key(field,part),v=root.SAGSBusinessText?.draft(field,text(value))??text(value);
      // Compare to the durable envelope, NOT mutable in-memory state: a failed
      // SAVE must never trick the recovery layer into deleting its only copy.
      // During continuous typing, a previous verified committed value cannot
      // equal a *new, different* keystroke. Skip repeated full-envelope JSON
      // parsing in that case. A stale comparison can only retain an extra
      // recovery draft; it must NEVER delete a potentially uncommitted one.
      // Identical value events and values matching the cached baseline always
      // re-read the durable envelope before any draft can be deleted.
      let matchesCommitted=false;
      if(part==='manual'){
        const prev=lastManualCompare;
        if(prev?.key===k&&prev.input!==v&&prev.committed!==v){
          lastManualCompare={key:k,input:v,committed:prev.committed};
        }else{
          const committed=text(readFlightSessionEnvelope(activeFlightSessionId)?.state?.[field]);
          lastManualCompare={key:k,input:v,committed};
          matchesCommitted=v===committed;
        }
      }
      if(matchesCommitted){localStorage.removeItem(k);failedDrafts.delete(k);storageError=failedDrafts.size>0;scheduleStatus();return true;}
      // Repeated input/change/snapshot events need no new write if the exact
      // bytes still exist now. A fresh read also catches another tab, deletion,
      // corruption and storage failures; never trust the in-memory memo alone.
      if(lastVerifiedDraft?.key===k&&lastVerifiedDraft.value===v&&localStorage.getItem(k)===lastVerifiedDraft.encoded){
        failedDrafts.delete(k);storageError=failedDrafts.size>0;scheduleStatus();return true;
      }
      const encoded=JSON.stringify({field,part,value:v,atMs:Date.now()});
      localStorage.setItem(k,encoded);
      if(localStorage.getItem(k)!==encoded)throw new Error('DRAFT_WRITE_VERIFY');
      lastVerifiedDraft=encoded.length<=65536?{key:k,value:v,encoded}:null;
      failedDrafts.delete(k);storageError=failedDrafts.size>0;scheduleStatus();return true;
    }catch(e){failedDrafts.set(key(field,part),{field,value:text(value),part,scope:scope()});storageError=true;status();if(!warnedStorage){warnedStorage=true;
      alert('Bộ nhớ trình duyệt không ghi được bản nháp. Hãy giữ màn hình này và báo quản trị; KHÔNG cập nhật hoặc xóa dữ liệu trình duyệt.');
    }console.warn('V6.1 draft write failed',e);return false;}
  }
  function forget(field,part='manual'){
    if(!field)return;try{localStorage.removeItem(key(field,part));failedDrafts.delete(key(field,part));storageError=failedDrafts.size>0;}catch(e){storageError=true;}
    status();
  }
  function pending(){
    const prefix=scope(),out=[],stale=[];let committedState=null;
    try{for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);if(k?.startsWith(prefix)){
        const x=JSON.parse(localStorage.getItem(k)||'null');
        if(!x?.field)continue;
        // A manual recovery record that is already identical to committed state
        // is stale, not unfinished work. Prune it lazily so it cannot block UI.
        if((x.part||'manual')==='manual'){
          if(committedState===null)committedState=readFlightSessionEnvelope(activeFlightSessionId)?.state||{};
          if(x.value===text(committedState[x.field])){stale.push(k);continue;}
        }
        out.push(x);
      }
    }
    for(const k of stale)localStorage.removeItem(k);
    }catch(e){storageError=true;console.warn('V6.1 pending draft read failed',e);}
    return out;
  }
  function verifyPending(items=pending()){
    if(storageError)return false;
    try{
      for(const x of items){
        const part=x.part||'manual',r=read(x.field,part);
        if(!r||r.value!==x.value||r.field!==x.field||r.part!==part)return false;
      }
      return true;
    }catch(e){storageError=true;console.warn('V6.1 pending draft verify failed',e);return false;}
  }
  function currentManual(){
    try{return editing?.key&&$('entry')?.style.display!=='none'?editing:null;}catch(_){return null;}
  }
  function currentQuick(){try{return root.sagsQuickEntryStatus?.()||null;}catch(_){return null;}}
  function blockReason(){
    if(storageError||root.sagsV622StorageBlocked)return 'Trình duyệt chưa lưu được bản nháp hoặc FINAL. Giữ nguyên màn hình để xử lý.';
    if(currentManual())return 'Bạn đang nhập một ô. Hãy bấm LƯU hoặc ĐÓNG ô đó trước khi cập nhật.';
    if(currentQuick())return 'Bạn đang nhập nhanh. Hãy hoàn tất hoặc đóng nhập nhanh trước khi cập nhật.';
    try{
      const layout=$('v368LayoutPanel'),guide=$('csgMgr');
      if(layout?.classList?.contains('show')||guide?.classList?.contains('open'))return 'Đang mở phần chỉnh sửa bố cục hoặc Sổ tay. Hãy lưu/đóng phần chỉnh sửa trước khi cập nhật.';
      for(const id of ['quickTimeModal','fs09QuickModal']){
        const el=$(id);if(el&&typeof getComputedStyle==='function'&&getComputedStyle(el).display!=='none')return 'Đang nhập dữ liệu trong bảng nhập nhanh. Hãy lưu/đóng bảng này trước khi cập nhật.';
      }
    }catch(_){}
    const items=pending();
    // Local recovery drafts survive a Service Worker/app update because the
    // update replaces cached code, not this origin's localStorage. Do not force
    // the operator to reopen/save every draft before updating; only block if
    // the stored recovery copy itself cannot be verified by immediate read-back.
    if(storageError||!verifyPending(items))return 'Không xác minh được bản nháp khôi phục trên máy. Giữ nguyên màn hình và thử lại.';
    try{if(typeof readOfflineQueue==='function'&&readOfflineQueue().length)return 'Vẫn còn thao tác chính thức chờ đồng bộ. Hãy đợi đồng bộ thành công.';}catch(_){return 'Chưa kiểm tra được hàng đợi đồng bộ.';}
    if(navigator.onLine===false)return 'Máy đang ngoại tuyến. Hãy thử lại khi có mạng.';
    return '';
  }
  function scheduleStatus(){
    // Trailing debounce: a fast typist must not rescan every draft while typing.
    if(statusRefreshTimer)clearTimeout(statusRefreshTimer);
    statusRefreshTimer=setTimeout(()=>{statusRefreshTimer=0;status();},350);
  }
  function status(){
    const badge=$('sagsV61DraftStatus');if(!badge||document.hidden)return;
    const set=(key,value)=>{if(badge[key]!==value)badge[key]=value};
    const level=value=>{if(badge.dataset.level!==value)badge.dataset.level=value};
    let logged=false;try{logged=!!currentUserProfile?.username;}catch(_){}
    set('hidden',!logged);if(!logged)return;
    if(storageError||root.sagsV622StorageBlocked){set('textContent','⚠ Không lưu được nháp');level('error');return;}
    const manual=!!currentManual(),quick=!!currentQuick();
    const focus=document.activeElement;
    const quickTimeTyping=!!focus?.matches?.('input,textarea')&&!!focus.closest?.('#quickTimeModal,#fs09QuickModal');
    // The recovery record is verified on each input; scanning all localStorage
    // during focused typing adds contention without improving durability.
    // Once the editor closes, pending() runs again and prunes committed drafts.
    const p=manual||quick||quickTimeTyping?[]:pending();
    const cloud=root.sagsDraftV2Status?.()||{},cloudReady=cloud.cloudCapable===true;
    set('textContent',p.length||manual||quick||quickTimeTyping?(cloudReady?'📝 Nháp đang được bảo vệ':'📝 Nháp đang lưu trên máy'):(cloudReady?'✓ Nháp đã bảo vệ 3 lớp':'✓ Nháp chuyến trên máy này'));
    level(p.length||manual||quick||quickTimeTyping?'pending':'local');
    set('title',cloudReady?'localStorage + IndexedDB trên máy; khi có mạng đồng bộ bản nháp roster lên server để có thể phục hồi trên thiết bị khác.':'Bản nháp đang được bảo vệ trên thiết bị này; đồng bộ server sẽ bật khi có assignment roster và Firebase sẵn sàng.');
  }
  function showPending(){
    const p=pending();alert(p.length
      ?`Các ô có nội dung nhập dở:\n${p.map(x=>'• '+x.field+(x.part!=='manual'?' · '+x.part:'')).join('\n')}\n\nNháp được lưu tức thời trên máy. Với chuyến roster, lớp V2.0 sẽ đồng bộ dự phòng lên server khi có mạng để hỗ trợ phục hồi trên thiết bị khác.`
      :'Biểu mẫu đang được bảo vệ cục bộ. Với chuyến roster và khi có mạng, V2.0 đồng bộ bản nháp dự phòng lên server; thao tác gửi/hoàn tất chính thức vẫn là quy trình riêng.');
  }
  function ensureUi(){
    if($('sagsV61DraftStatus'))return;
    const st=document.createElement('style');st.id='sagsV61Style';st.textContent=`
      #sagsV61DraftStatus{position:fixed;right:10px;bottom:calc(76px + env(safe-area-inset-bottom));z-index:9800;max-width:min(70vw,285px);border:1px solid #bfd6cc;background:#ecfdf5;color:#065f46;border-radius:999px;padding:7px 11px;font:800 11px/1.4 Arial;box-shadow:0 3px 12px #0002;white-space:normal;text-align:center}
      #sagsV61DraftStatus[data-level="pending"]{border-color:#f6c865;background:#fff7e6;color:#92400e}
      #sagsV61DraftStatus[data-level="error"]{border-color:#ef4444;background:#fef2f2;color:#991b1b}
      #sagsV61DraftStatus[hidden]{display:none!important}
      #sagsV61Restore{display:none;border:1px solid #93c5fd;background:#eff6ff;color:#1e40af;border-radius:8px;padding:8px;margin:8px 0;font:700 12px Arial}
      #sagsV61Restore button{margin-left:7px;min-height:32px;border:1px solid #3b82f6;background:#fff;border-radius:7px;color:#1d4ed8;font:800 12px Arial}
      @media(max-width:430px){#sagsV61DraftStatus{font-size:10px;padding:6px 9px}}
    `;document.head.appendChild(st);
    const badge=document.createElement('button');badge.type='button';badge.id='sagsV61DraftStatus';badge.hidden=true;
    badge.addEventListener('click',showPending);document.body.appendChild(badge);
    const textarea=$('entryText');if(textarea){
      const box=document.createElement('div');box.id='sagsV61Restore';box.setAttribute('role','status');
      box.innerHTML='<span>Có nội dung nhập dở đã lưu trên máy.</span> <button type="button" id="sagsV61RestoreYes">Khôi phục</button> <button type="button" id="sagsV61RestoreNo">Bỏ nháp</button>';
      textarea.insertAdjacentElement('afterend',box);
      $('sagsV61RestoreYes').addEventListener('click',()=>{
        const f=currentManual(),r=f&&read(f.key);if(!r)return;
        textarea.value=r.value;root.sagsV622EntryDraftRestored?.(r.value);
        box.style.display='none';textarea.focus();
      });
      $('sagsV61RestoreNo').addEventListener('click',()=>{const f=currentManual();if(f)root.sagsV61Draft.forget(f.key);box.style.display='none';textarea.focus();});
      textarea.addEventListener('focusin',()=>{
        const f=currentManual();if(!f)return;
        const r=read(f.key),committed=text(readFlightSessionEnvelope(activeFlightSessionId)?.state?.[f.key]);
        if(r&&r.value===committed){root.sagsV61Draft.forget(f.key);box.style.display='none';return;}
        if(r&&textarea.value===committed){
          textarea.value=r.value;root.sagsV622EntryDraftRestored?.(r.value);
          try{textarea.setSelectionRange(r.value.length,r.value.length);}catch(_e){}
          box.style.display='none';status();return;
        }
        // Different unsaved text is already in the editor: never overwrite it.
        box.style.display=r&&r.value!==textarea.value?'block':'none';
      });
      for(const event of ['input','change','compositionend'])textarea.addEventListener(event,()=>{const f=currentManual();if(f)root.sagsV61Draft.record(f.key,textarea.value);});
    }
    status();
  }
  function saveManualNow(){const f=currentManual(),v=$('entryText')?.value;if(f&&typeof v==='string')root.sagsV61Draft.record(f.key,v);}
  function snapshotAllEditors(){
    saveManualNow();
    try{root.sagsQuickEntrySnapshot?.();}catch(e){console.warn('Quick entry snapshot failed',e);}
    try{root.SAGSFS09DraftSnapshot?.();}catch(e){console.warn('PVHK draft snapshot failed',e);}
    try{root.SAGSMobileDraftRecovery?.snapshotVisibleDirty();}catch(e){console.warn('Mobile draft snapshot failed',e);}
    persistChangedCore();
  }
  // Compare JSON-compatible data structurally without copying large base64
  // strings. Nested mutations are checked too; unsupported shapes use JSON.
  const CORE_UNSUPPORTED=Symbol('unsupported core snapshot');
  let coreSnapshot=CORE_UNSUPPORTED,coreSnapshotScope='';
  function captureCoreSnapshot(value){
    let budget=8192;
    function visit(v,depth){
      if(--budget<0||depth>16)throw CORE_UNSUPPORTED;
      if(v===null||['string','boolean','undefined'].includes(typeof v))return v;
      if(typeof v==='number'&&Number.isFinite(v))return v;
      if(typeof v!=='object')throw CORE_UNSUPPORTED;
      const array=Array.isArray(v),proto=Object.getPrototypeOf(v);
      if((array?proto!==Array.prototype:proto!==Object.prototype&&proto!==null)||'toJSON' in v)throw CORE_UNSUPPORTED;
      const keys=Object.keys(v);if(keys.length>budget)throw CORE_UNSUPPORTED;
      if(array&&(keys.length<v.length||keys.slice(0,v.length).some((k,i)=>k!==String(i))))throw CORE_UNSUPPORTED;
      const values=keys.map(k=>{const d=Object.getOwnPropertyDescriptor(v,k);if(!d||!('value' in d))throw CORE_UNSUPPORTED;return visit(d.value,depth+1)});
      return {array,length:array?v.length:0,keys,values};
    }
    try{return visit(value,0)}catch(_){return CORE_UNSUPPORTED}
  }
  function matchesCoreSnapshot(value,snapshot){
    if(snapshot===CORE_UNSUPPORTED)return false;
    function equal(v,s){
      if(s===null||typeof s!=='object')return Object.is(v,s);
      if(!v||typeof v!=='object'||Array.isArray(v)!==s.array||'toJSON' in v)return false;
      const proto=Object.getPrototypeOf(v);
      if(s.array?proto!==Array.prototype:proto!==Object.prototype&&proto!==null)return false;
      if(s.array&&v.length!==s.length)return false;
      const keys=Object.keys(v);if(keys.length!==s.keys.length)return false;
      for(let i=0;i<keys.length;i++){
        if(keys[i]!==s.keys[i])return false;
        const d=Object.getOwnPropertyDescriptor(v,keys[i]);
        if(!d||!('value' in d)||!equal(d.value,s.values[i]))return false;
      }
      return true;
    }
    try{return equal(value,snapshot)}catch(_){return false}
  }
  function persistChangedCore(){
    try{
      if(!activeFlightSessionId){status();return;}
      const currentScope=scope();
      if(currentScope===coreSnapshotScope&&matchesCoreSnapshot(state,coreSnapshot)){status();return;}
      const serialized=JSON.stringify(state);
      if(currentScope===coreSnapshotScope&&coreSnapshot===CORE_UNSUPPORTED&&serialized===lastCore){status();return;}
      // Only persist when this tab's in-memory state changes, not when another tab edits storage.
      persist();
      const saved=readFlightSessionEnvelope(activeFlightSessionId);
      if(JSON.stringify(saved.state)!==serialized)throw new Error('Lưu nháp chuyến không khớp');
      coreSnapshot=captureCoreSnapshot(state);coreSnapshotScope=currentScope;
      lastCore=coreSnapshot===CORE_UNSUPPORTED?serialized:'';storageError=failedDrafts.size>0;
    }catch(e){storageError=true;console.warn('V6.1 local persist failed',e);}
    status();
  }
  function deferPromptWhileTyping(){
    if(currentManual()||currentQuick())return true;
    const active=document.activeElement;
    return !!(active&&active!==document.body&&active.matches?.('input,textarea,[contenteditable="true"]')&&!active.closest?.('#appUpdateModal'));
  }
  function cancelReload(reason){
    appUpdateApplyRequested=false;reloading=false;
    try{sessionStorage.removeItem(APP_UPDATE_EXPLICIT_KEY);localStorage.removeItem('pdh-update-applying');}catch(_){}
    const btn=$('appUpdateNowBtn');if(btn){btn.disabled=false;btn.textContent='CẬP NHẬT NGAY';}
    const badge=$('sagsDeferredUpdate');if(badge)badge.hidden=false;
    if(reason)alert('Chưa cập nhật để bảo vệ dữ liệu. '+reason);
  }
  function patchUpdates(){
    if(typeof openAppUpdatePrompt==='function'){
      const original=openAppUpdatePrompt;
      openAppUpdatePrompt=function(build){
        if(deferPromptWhileTyping()){
          appUpdateTarget=build;
          const badge=$('sagsDeferredUpdate');if(badge)badge.hidden=false;
          return;
        }
        return original(build);
      };
    }
    if(typeof applyAppUpdate==='function'){
      const original=applyAppUpdate;
      applyAppUpdate=async function(){
        saveManualNow();persistChangedCore();
        const reason=blockReason();if(reason){alert('Chưa thể cập nhật. '+reason);return;}
        return original();
      };
    }
    if(typeof sagsSaveBeforeAppUpdate==='function'){
      // The original helper swallowed failed writes and returned success. Require a real local read-back.
      sagsSaveBeforeAppUpdate=async function(){
        try{
          saveManualNow();if(blockReason())return false;
          if(activeFlightSessionId){
            persist();const saved=readFlightSessionEnvelope(activeFlightSessionId);
            if(JSON.stringify(saved.state)!==JSON.stringify(state))return false;
          }
          // Uncommitted field recovery records are intentionally allowed across
          // update, but require exact localStorage read-back before reload.
          const drafts=pending();if(!verifyPending(drafts))return false;
          return !blockReason();
        }catch(e){storageError=true;status();console.warn('V6.1 pre-update save failed',e);return false;}
      };
    }
    if(typeof reloadIntoBuild==='function'){
      reloadIntoBuild=function(target){
        if(reloading||!appUpdateApplyRequested)return false;
        let explicitAt=0;try{explicitAt=Number(sessionStorage.getItem(APP_UPDATE_EXPLICIT_KEY)||0);}catch(_){}
        if(!explicitAt||Date.now()-explicitAt>45000){cancelReload();return false;}
        const reason=blockReason();if(reason){cancelReload(reason);return false;}
        reloading=true;
        void (async()=>{
          const ok=await sagsSaveBeforeAppUpdate();
          const nextReason=blockReason();
          if(!ok||nextReason){cancelReload(nextReason||'Chưa xác minh được bản lưu nháp trên máy.');return;}
          try{if(activeFlightSessionId)flightTabActiveSet(activeFlightSessionId);}catch(_){}
          const u=new URL(location.href);u.searchParams.set('_build',target||Date.now().toString());u.searchParams.set('_upd',Date.now().toString());
          location.replace(u.toString());
        })().catch(e=>cancelReload(String(e?.message||e)));
        return true;
      };
    }
  }
  function retryFailed(){
    for(const item of [...failedDrafts.values()])if(item.scope===scope())root.sagsV61Draft.record(item.field,item.value,item.part);
    persistChangedCore();status();return !storageError;
  }
  root.sagsV61Draft={retryFailed,hasStorageError:()=>storageError||failedDrafts.size>0,read,record,forget,pending,verifyPending,blockReason,status,saveManualNow,persistChangedCore,snapshotAllEditors,contextKey:scope};
  // SAVE clears a verified draft; closing an unfinished editor retains it.
  root.sagsStabilityForgetManualDraft=function(field){if(field)root.sagsV61Draft.forget(field);const b=$('sagsV61Restore');if(b)b.style.display='none';};
  try{coreSnapshot=captureCoreSnapshot(state);coreSnapshotScope=scope();lastCore=coreSnapshot===CORE_UNSUPPORTED?JSON.stringify(state):'';}catch(_){lastCore='';}
  function boot(){ensureUi();patchUpdates();status();
    // Manual/quick editors already persist each changing field. Avoid a full
    // JSON.stringify(state) on the main thread every two seconds while the
    // mobile keyboard is open; saving/closing, blur and visibility hooks still
    // persist changed core state and verify it before updates.
    statusTimer=setInterval(()=>{
      if(!document.hidden&&!currentManual()&&!currentQuick())persistChangedCore();
    },2000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  document.addEventListener('visibilitychange',()=>{if(document.hidden)snapshotAllEditors();else status();});
  window.addEventListener('pagehide',snapshotAllEditors);
  window.addEventListener('blur',snapshotAllEditors);
  document.addEventListener('freeze',snapshotAllEditors,{capture:true});
  window.addEventListener('online',status);window.addEventListener('offline',status);
})(window);

/* V6.1 STABILITY: local-only edit recovery and non-interruptive optional updates.
   No new Firebase reads/writes. Never claim a local Ramp draft is cloud-synced. */
(function(root){
  'use strict';
  if(root.__SAGS_V61_STABILITY__)return;
  root.__SAGS_V61_STABILITY__=true;
  const PREFIX='sagsV61Uncommitted:';
  const $=id=>document.getElementById(id);
  const text=x=>String(x??'');
  let storageError=false, lastCore='', statusTimer=0, reloading=false, warnedStorage=false;
  function scope(){
    try{return sagsOwnedPrefix(PREFIX)+String(activeFlightSessionId||'')+':';}
    catch(_){return PREFIX+'NO_ACCOUNT:NO_FLIGHT:';}
  }
  function key(field,part='manual'){return scope()+encodeURIComponent(text(field))+':'+part;}
  function read(field,part='manual'){
    try{const x=JSON.parse(localStorage.getItem(key(field,part))||'null');
      return x&&x.field===field&&x.part===part&&typeof x.value==='string'?x:null;
    }catch(_){return null;}
  }
  function record(field,value,part='manual'){
    if(!field)return false;
    try{
      const k=key(field,part),v=text(value);
      // Compare to the durable envelope, NOT mutable in-memory state: a failed
      // SAVE must never trick the recovery layer into deleting its only copy.
      const committed=part==='manual'?text(readFlightSessionEnvelope(activeFlightSessionId)?.state?.[field]):'';
      if(part==='manual'&&v===committed){localStorage.removeItem(k);status();return true;}
      localStorage.setItem(k,JSON.stringify({field,part,value:v,atMs:Date.now()}));
      storageError=false;status();return true;
    }catch(e){storageError=true;status();if(!warnedStorage){warnedStorage=true;
      alert('Bộ nhớ trình duyệt không ghi được bản nháp. Hãy giữ màn hình này và báo quản trị; KHÔNG cập nhật hoặc xóa dữ liệu trình duyệt.');
    }console.warn('V6.1 draft write failed',e);return false;}
  }
  function forget(field,part='manual'){
    if(!field)return;try{localStorage.removeItem(key(field,part));}catch(e){storageError=true;}
    status();
  }
  function pending(){
    const prefix=scope(),out=[],stale=[];
    try{for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);if(k?.startsWith(prefix)){
        const x=JSON.parse(localStorage.getItem(k)||'null');
        if(!x?.field)continue;
        // A manual recovery record that is already identical to committed state
        // is stale, not unfinished work. Prune it lazily so it cannot block UI.
        if((x.part||'manual')==='manual'&&x.value===text(readFlightSessionEnvelope(activeFlightSessionId)?.state?.[x.field])){stale.push(k);continue;}
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
  function status(){
    const badge=$('sagsV61DraftStatus');if(!badge)return;
    let logged=false;try{logged=!!currentUserProfile?.username;}catch(_){}
    badge.hidden=!logged;if(!logged)return;
    if(storageError||root.sagsV622StorageBlocked){badge.textContent='⚠ Không lưu được nháp';badge.dataset.level='error';return;}
    const p=pending(),manual=!!currentManual(),quick=!!currentQuick();
    badge.textContent=p.length||manual||quick?'📝 Nháp đang lưu trên máy':'✓ Nháp chuyến trên máy này';
    badge.dataset.level=p.length||manual||quick?'pending':'local';
    badge.title='Chỉ xác nhận lưu trên THIẾT BỊ NÀY. Bản nháp Ramp chưa tự đồng bộ sang máy khác.';
  }
  function showPending(){
    const p=pending();alert(p.length
      ?`Các ô có nội dung nhập dở trên máy này:\n${p.map(x=>'• '+x.field+(x.part!=='manual'?' · '+x.part:'')).join('\n')}\n\nNháp này được giữ khi cập nhật trên chính thiết bị này. Mở ô tương ứng để khôi phục khi cần. Nháp Ramp chưa tự chuyển sang điện thoại/máy tính khác.`
      :'Biểu mẫu đang được lưu trên máy này. Bản nháp Ramp chưa tự đồng bộ sang thiết bị khác; các thao tác gửi chính thức dùng quy trình riêng.');
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
      $('sagsV61RestoreNo').addEventListener('click',()=>{const f=currentManual();if(f)forget(f.key);box.style.display='none';textarea.focus();});
      textarea.addEventListener('focusin',()=>{
        const f=currentManual();if(!f)return;
        const r=read(f.key),committed=text(readFlightSessionEnvelope(activeFlightSessionId)?.state?.[f.key]);
        if(r&&r.value===committed){forget(f.key);box.style.display='none';return;}
        if(r&&textarea.value===committed){
          textarea.value=r.value;root.sagsV622EntryDraftRestored?.(r.value);
          try{textarea.setSelectionRange(r.value.length,r.value.length);}catch(_e){}
          box.style.display='none';status();return;
        }
        // Different unsaved text is already in the editor: never overwrite it.
        box.style.display=r&&r.value!==textarea.value?'block':'none';
      });
      textarea.addEventListener('input',()=>{const f=currentManual();if(f)record(f.key,textarea.value);});
    }
    status();
  }
  function saveManualNow(){const f=currentManual(),v=$('entryText')?.value;if(f&&typeof v==='string')record(f.key,v);}
  function persistChangedCore(){
    try{
      if(!activeFlightSessionId)return;
      const serialized=JSON.stringify(state);
      if(serialized===lastCore)return;
      // Only persist when this tab's in-memory state changes, not when another tab edits storage.
      persist();
      const saved=readFlightSessionEnvelope(activeFlightSessionId);
      if(JSON.stringify(saved.state)!==serialized)throw new Error('Lưu nháp chuyến không khớp');
      lastCore=serialized;storageError=false;
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
  root.sagsV61Draft={read,record,forget,pending,verifyPending,blockReason,status,saveManualNow,persistChangedCore};
  // SAVE clears a verified draft; closing an unfinished editor retains it.
  root.sagsStabilityForgetManualDraft=function(field){if(field)forget(field);const b=$('sagsV61Restore');if(b)b.style.display='none';};
  try{lastCore=JSON.stringify(state);}catch(_){lastCore='';}
  function boot(){ensureUi();patchUpdates();status();
    statusTimer=setInterval(()=>{persistChangedCore();status();},2000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  document.addEventListener('visibilitychange',()=>{if(document.hidden){saveManualNow();persistChangedCore();}else status();});
  window.addEventListener('pagehide',()=>{saveManualNow();persistChangedCore();});
  window.addEventListener('online',status);window.addEventListener('offline',status);
})(window);

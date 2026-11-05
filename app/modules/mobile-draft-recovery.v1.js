/* E-REPORT/SAGS mobile draft recovery: quick-time and FSAGS09 input.
 * Local to the current account and flight via sagsV61Draft; no Firebase I/O.
 * Restore is opt-in; never submit a recovered value automatically.
 */
(function(root){
  'use strict';
  if(root.__SAGS_MOBILE_DRAFT_RECOVERY_V1__)return;
  root.__SAGS_MOBILE_DRAFT_RECOVERY_V1__=true;
  const SELECTOR='#quickTimeModal input.quickTimeInput[data-key],'+
    '#fs09QuickModal input.fs09qInput[data-key],'+
    '#fs09QuickModal input.fs09qDataInput[data-key],'+
    '#fs09QuickModal textarea.fs09qTextArea[data-key]';
  const watched=el=>el&&el.matches&&el.matches(SELECTOR);
  const part=el=>el.closest('#quickTimeModal')?'quickTime':'mobile-fs09';
  const value=el=>String(el.value??'');
  const field=el=>String(el.dataset.key||'');
  const draft=()=>root.sagsV61Draft;
  const ios=/iPhone|iPad|iPod/i.test(root.navigator?.userAgent||'')||(/Macintosh/i.test(root.navigator?.userAgent||'')&&Number(root.navigator?.maxTouchPoints||0)>1);
  let iosSaveTimer=0,iosSnapshotBusy=false;
  const flightInput=el=>!!(el?.matches?.('input,textarea,select')&&el.dataset?.key&&el.closest?.('.page,.sheet')&&!el.closest?.('#finalFormsModal,#roleLoginModal,#sagsSettingsCenter'));
  const flightMeta=()=>{try{return root.currentFlightSessionMeta?.()||null}catch(_){return null}};
  function iosRecord(el){
    if(!ios||!flightInput(el)||!flightMeta()?.id||!draft())return false;
    return !!draft().record(String(el.dataset.key),String(el.value??''),'ios-live');
  }
  function iosRestore(el){
    if(!ios||!flightInput(el)||!flightMeta()?.id||!draft())return;
    const key=String(el.dataset.key),row=draft().read(key,'ios-live');
    if(!row)return;
    const durable=(()=>{try{return String(root.readFlightSessionEnvelope?.(flightMeta().id)?.state?.[key]??'')}catch(_){return''}})();
    if(row.value===durable){draft().forget(key,'ios-live');return}
    if(String(el.value??'')===row.value)return;
    // Never overwrite data already present in an editor. The user decides if
    // a recovered draft should replace the currently displayed value.
    const ok=root.confirm?.('Safari đã khôi phục dữ liệu nhập dở cho ô này. Dùng nội dung chưa lưu trước đó?');
    if(!ok)return;
    el.value=row.value;
    el.dispatchEvent(new Event('input',{bubbles:true}));
  }
  function iosPersist(reason){
    if(!ios||iosSnapshotBusy||!flightMeta()?.id)return false;
    iosSnapshotBusy=true;clearTimeout(iosSaveTimer);
    try{
      // Commit fields to the existing per-account/per-flight recovery layers
      // *before* attempting the whole-envelope localStorage checkpoint.
      // During typing every edited field is already in its own verified draft.
      // snapshotAllEditors() performs a full persistChangedCore() itself, so
      // calling it and sagsV22SaveNow() together on every key pause wrote the
      // full flight twice and increased Safari memory pressure.
      if(reason!=='ios-input')draft()?.snapshotAllEditors?.();
      const saved=typeof root.sagsV22SaveNow==='function'
        ?root.sagsV22SaveNow(reason)
        :false;
      const ok=saved===true;
      if(ok){
        try{root.sagsIndexedDbFlightStoreV1?.scheduleMirror?.('ios-urgent-checkpoint',900,[flightMeta().id])}catch(_){}
      }else{
        const badge=document.getElementById('sagsV61DraftStatus');
        if(badge){badge.hidden=false;badge.textContent='⚠ Chưa lưu xong chuyến, dữ liệu ô nhập đang được bảo vệ';badge.dataset.level='error'}
      }
      return ok;
    }catch(e){console.warn('iOS urgent flight checkpoint',e);return false}
    finally{iosSnapshotBusy=false}
  }
  function iosScheduleSave(){
    if(!ios||!flightMeta()?.id)return;
    clearTimeout(iosSaveTimer);
    // Modest debounce avoids rewriting large flight envelopes per keystroke;
    // every editable field has already been recorded synchronously above.
    iosSaveTimer=setTimeout(()=>iosPersist('ios-input'),300);
  }

  function canonical(fieldName){
    try{return typeof state!=='undefined'?String(state[fieldName]??''):'';}
    catch(_){return '';}
  }
  function sameValue(a,b,el){
    const x=String(a??''),y=String(b??'');
    if(x===y)return true;
    if(el.classList.contains('quickTimeInput')||el.classList.contains('fs09qInput')){
      // A saved 12:34 is the same value as the quick editor's 1234.
      return /^\d{4}$/.test(x.replace(':',''))&&x.replace(':','')===y.replace(':','');
    }
    return false;
  }
  function store(el){
    if(!watched(el)||!field(el)||!draft())return;
    const k=field(el),v=value(el),p=part(el);
    if(sameValue(v,canonical(k),el))draft().forget(k,p);
    else if(draft().read(k,p)?.value!==v)draft().record(k,v,p);
  }
  function restoreOnFocus(el){
    if(!watched(el)||!field(el)||!draft())return;
    const k=field(el),p=part(el),saved=draft().read(k,p)||(p==='quickTime'?draft().read(k,'mobile-quick-time'):null);
    if(!saved)return;
    if(sameValue(saved.value,canonical(k),el)){
      draft().forget(k,p);return;
    }
    // The draft already exists in the currently open panel: do not interrupt typing.
    if(saved.value===value(el))return;
    const label=el.closest('.quickTimeRow,.fs09qRow')?.querySelector('.quickTimeLabel,.fs09qLabel')?.textContent?.trim()||k;
    const yes=root.confirm('Có dữ liệu nhập dở trên máy ở ô '+label+'. Khôi phục nội dung chưa bấm CẬP NHẬT?');
    if(!yes)return; // Dismissing a recovery prompt never deletes local data.
    el.value=saved.value;
    // Update the original modal's internal draft map, not just its visible input.
    el.dispatchEvent(new Event('input',{bubbles:true}));
    try{el.focus({preventScroll:true});}catch(_){}
  }
  function snapshotVisibleDirty(){
    document.querySelectorAll(SELECTOR).forEach(el=>{
      const modal=el.closest('#quickTimeModal,#fs09QuickModal');
      if(modal&&getComputedStyle(modal).display!=='none'){
        // Synchronize the panel's internal draft map with the last visible
        // IME/autofill value before storing it, even if input was not delivered.
        if(draft()?.read(field(el),part(el))?.value!==value(el)){
          if(part(el)==='quickTime')root.qteInputChanged?.(el);
          else if(el.classList.contains('fs09qInput'))root.fs09qTimeInput?.(el);
          else root.fs09qDataChanged?.(el);
        }
        store(el);
      }
    });
  }
  function cleanCommitted(){
    if(!draft())return;
    for(const r of draft().pending()){
      if(r.part!=='quickTime'&&r.part!=='mobile-quick-time'&&r.part!=='mobile-fs09')continue;
      const selector=r.part==='mobile-fs09'?'#fs09QuickModal':'#quickTimeModal';
      const el=Array.from(document.querySelectorAll(selector+' [data-key]')).find(x=>watched(x)&&field(x)===r.field);
      if(el&&sameValue(r.value,canonical(r.field),el))draft().forget(r.field,r.part);
    }
  }
  for(const type of ['input','change','compositionend'])document.addEventListener(type,event=>{
    const el=event.target;if(watched(el))store(el);
  });
  document.addEventListener('focusin',event=>restoreOnFocus(event.target));
  // NOW / N-A controls can update inputs programmatically without firing input events.
  document.addEventListener('click',event=>{
    if(event.target.closest?.('#quickTimeModal .quickTimeNow,#quickTimeModal .quickTimeNA,#fs09QuickModal .fs09qNow')){
      queueMicrotask(snapshotVisibleDirty);
    }
    if(event.target.closest?.('#quickTimeSaveBtn,#fs09QuickModal .fs09qSave')){
      setTimeout(cleanCommitted,0);
      setTimeout(cleanCommitted,350);
    }
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)snapshotVisibleDirty();
    else cleanCommitted();
  });
  root.addEventListener('pagehide',snapshotVisibleDirty);
  if(ios){
    document.addEventListener('input',event=>{if(iosRecord(event.target))iosScheduleSave()},{capture:true});
    document.addEventListener('change',event=>{if(iosRecord(event.target))iosPersist('ios-change')},{capture:true});
    document.addEventListener('focusin',event=>iosRestore(event.target),{capture:true});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){iosPersist('ios-hidden');void root.sagsDraftV2Flush?.()}},{capture:true});
    root.addEventListener('pagehide',()=>iosPersist('ios-pagehide'),{capture:true});
    root.addEventListener('blur',()=>iosPersist('ios-blur'),{passive:true});
    root.addEventListener('pageshow',()=>{try{void root.sagsDraftV2RestoreLocal?.()}catch(_){}},{passive:true});
  }
  root.SAGSIosDraftGuard={enabled:ios,snapshot:iosPersist};
  // Make pending quick-time drafts visible through the existing V6 local-draft badge.
  root.SAGSMobileDraftRecovery={snapshotVisibleDirty,cleanCommitted};
})(window);

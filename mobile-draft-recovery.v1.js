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
  const part=el=>el.closest('#quickTimeModal')?'mobile-quick-time':'mobile-fs09';
  const value=el=>String(el.value??'');
  const field=el=>String(el.dataset.key||'');
  const draft=()=>root.sagsV61Draft;
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
    else draft().record(k,v,p);
  }
  function restoreOnFocus(el){
    if(!watched(el)||!field(el)||!draft())return;
    const k=field(el),p=part(el),saved=draft().read(k,p);
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
      if(modal&&getComputedStyle(modal).display!=='none'&&el.classList.contains('dirty'))store(el);
    });
  }
  function cleanCommitted(){
    if(!draft())return;
    for(const r of draft().pending()){
      if(r.part!=='mobile-quick-time'&&r.part!=='mobile-fs09')continue;
      const selector=r.part==='mobile-quick-time'?'#quickTimeModal':'#fs09QuickModal';
      const el=Array.from(document.querySelectorAll(selector+' [data-key]')).find(x=>watched(x)&&field(x)===r.field);
      if(el&&sameValue(r.value,canonical(r.field),el))draft().forget(r.field,r.part);
    }
  }
  document.addEventListener('input',event=>{
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
  // Make pending quick-time drafts visible through the existing V6 local-draft badge.
  root.SAGSMobileDraftRecovery={snapshotVisibleDirty,cleanCommitted};
})(window);

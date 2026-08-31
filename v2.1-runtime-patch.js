/* E-REPORT/SAGS V2.1 · MY FLIGHT REALTIME + ADAPTIVE FILE SHARE
 * Scope:
 * 1) When roster_mail changes for the signed-in user, refresh MY FLIGHT immediately
 *    if the flight list is currently visible. Never force the operator out of an open form.
 * 2) Normalize file sharing across browsers: use native file Share only when supported;
 *    otherwise download/open the file. User-cancelled Share is not treated as an error.
 * This patch intentionally does not change FINAL/CROSSCHECK/KẾT SỔ business logic.
 */
(function(root){
  'use strict';
  const BUILD='V2.1-MYFLIGHT-REALTIME-ADAPTIVE-SHARE';
  if(root.__SAGS_V21_RUNTIME_PATCH===BUILD)return;
  root.__SAGS_V21_RUNTIME_PATCH=BUILD;

  const S=v=>String(v??'').trim();
  const U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');

  function session(){
    try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}
    catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}
  }
  function normUser(v){
    try{
      if(typeof root.normalizePersonalUsername==='function')return root.normalizePersonalUsername(v);
    }catch(_){}
    return U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40);
  }
  function me(){
    const s=session(),p=s?.profile||root.currentUserProfile||{};
    return normUser(p.username||p.userName||p.code||(U(s?.role)==='AD'?'AD':''));
  }
  function today(){
    const d=new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function opDate(){
    return S(document.getElementById('fwcDate')?.value)
      || S(sessionStorage.getItem('sagsV36FwcDate'))
      || today();
  }
  function listVisible(){
    const e=document.getElementById('fwcList');
    if(!e)return false;
    try{
      const cs=getComputedStyle(e);
      return cs.display!=='none'&&cs.visibility!=='hidden'&&e.offsetParent!==null;
    }catch(_){return true}
  }
  function showSyncHint(){
    if(!listVisible())return;
    const body=document.getElementById('fwcBody');
    if(!body)return;
    let e=document.getElementById('v21MyFlightSyncHint');
    if(!e){
      e=document.createElement('div');
      e.id='v21MyFlightSyncHint';
      e.style.cssText='margin:6px 0;padding:7px 9px;border-radius:9px;background:#eef6ff;color:#28506f;font:800 11px/1.35 Arial;';
      const list=document.getElementById('fwcList');
      if(list?.parentNode)list.parentNode.insertBefore(e,list);
      else body.prepend(e);
    }
    e.textContent='ĐANG ĐỒNG BỘ PHÂN CÔNG MỚI…';
    e.style.display='block';
    clearTimeout(showSyncHint._t);
    showSyncHint._t=setTimeout(()=>{try{e.style.display='none'}catch(_){}},1800);
  }

  let refreshTimer=0, refreshAgainTimer=0, refreshing=false, queued=false;
  async function refreshMyFlight(date){
    date=S(date)||opDate();
    if(!listVisible()||typeof root.flightWorkspaceOpenList!=='function')return;
    if(refreshing){queued=true;return}
    refreshing=true;
    try{
      await Promise.resolve(root.flightWorkspaceOpenList(date));
      try{root.v38ApplyListFilter?.()}catch(_){}
      root.dispatchEvent?.(new CustomEvent('sags:v21-myflight-refreshed',{detail:{date,atMs:Date.now()}}));
    }catch(e){
      console.warn('V2.1 MY FLIGHT realtime refresh',e);
    }finally{
      refreshing=false;
      if(queued){queued=false;setTimeout(()=>refreshMyFlight(date),60);}
    }
  }
  function scheduleRefresh(rec){
    const recDate=S(rec?.opDate||rec?.date||rec?.operationDate||'');
    const d=opDate();
    if(recDate&&d&&recDate!==d)return;
    try{root.dailyRosterRestartMailbox?.()}catch(_){}
    if(!listVisible())return;
    showSyncHint();
    clearTimeout(refreshTimer);
    clearTimeout(refreshAgainTimer);
    refreshTimer=setTimeout(()=>refreshMyFlight(recDate||d),70);
    // Second short refresh catches the rare case where the mailbox event reaches the
    // client a fraction before the master flight/manifest is visible to the list reader.
    refreshAgainTimer=setTimeout(()=>refreshMyFlight(recDate||d),420);
  }

  let mailRef=null, boundPath='', mailAdded=null, mailChanged=null, mailRemoved=null;
  function unbindMailbox(){
    try{
      if(mailRef&&mailAdded)mailRef.off('child_added',mailAdded);
      if(mailRef&&mailChanged)mailRef.off('child_changed',mailChanged);
      if(mailRef&&mailRemoved)mailRef.off('child_removed',mailRemoved);
    }catch(_){}
    mailRef=null;boundPath='';mailAdded=mailChanged=mailRemoved=null;
  }
  function bindMailbox(){
    const u=me();
    if(!u||typeof root.sagsV470Ref!=='function')return false;
    const path=`roster_mail/${safe(u)}/items`;
    if(path===boundPath&&mailRef)return true;
    unbindMailbox();
    try{
      const ref=root.sagsV470Ref(path);
      if(!ref||typeof ref.on!=='function')return false;
      mailAdded=s=>scheduleRefresh(s?.val?.()||{});
      mailChanged=s=>scheduleRefresh(s?.val?.()||{});
      mailRemoved=s=>scheduleRefresh(s?.val?.()||{});
      ref.on('child_added',mailAdded);
      ref.on('child_changed',mailChanged);
      ref.on('child_removed',mailRemoved);
      mailRef=ref;boundPath=path;
      root.__SAGS_V21_MAIL_PATH=path;
      return true;
    }catch(e){
      console.warn('V2.1 mailbox bind',e);
      return false;
    }
  }

  function bindWithRetry(){
    let tries=0;
    const tick=()=>{
      if(bindMailbox()||++tries>=30)return;
      setTimeout(tick,500);
    };
    tick();
  }

  // Rebind when the role/session UI changes. This is event-driven; no permanent heartbeat.
  const baseApply=root.applyRoleUI;
  if(typeof baseApply==='function'&&!baseApply.__v21Mailbox){
    const wrapped=function(){
      const r=baseApply.apply(this,arguments);
      Promise.resolve(r).finally(()=>setTimeout(bindMailbox,0));
      return r;
    };
    wrapped.__v21Mailbox=1;
    root.applyRoleUI=wrapped;
    try{applyRoleUI=wrapped}catch(_){}
  }
  window.addEventListener('pageshow',()=>setTimeout(bindMailbox,80),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(bindMailbox,80)},{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindWithRetry,{once:true});
  else bindWithRetry();

  /* ---------- Adaptive file share ---------- */
  function isIOS(){
    try{
      const ua=S(navigator.userAgent),p=S(navigator.platform);
      return /iPad|iPhone|iPod/i.test(ua)||(p==='MacIntel'&&Number(navigator.maxTouchPoints||0)>1);
    }catch(_){return false}
  }
  function fileName(file,i=0){
    return S(file?.name)||`SAGS_EXPORT_${Date.now()}${i?`_${i+1}`:''}.pdf`;
  }
  function fallbackFile(file,i=0){
    try{
      const blob=file instanceof Blob?file:new Blob([file],{type:'application/octet-stream'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;
      a.download=fileName(file,i);
      a.rel='noopener';
      if(isIOS())a.target='_blank';
      a.style.display='none';
      document.body.appendChild(a);
      a.click();
      setTimeout(()=>{try{URL.revokeObjectURL(url);a.remove()}catch(_){}},30000);
      return true;
    }catch(e){
      console.warn('V2.1 file fallback',e);
      return false;
    }
  }
  function fallbackFiles(files){
    let ok=false;
    Array.from(files||[]).forEach((f,i)=>{ok=fallbackFile(f,i)||ok});
    return ok;
  }
  function nativeFileCapability(files){
    if(typeof navigator.share!=='function')return false;
    if(typeof navigator.canShare!=='function')return null;
    try{return !!navigator.canShare({files:Array.from(files||[])})}catch(_){return false}
  }

  const nativeShare=typeof navigator.share==='function'?navigator.share.bind(navigator):null;
  async function adaptiveShare(data){
    const files=Array.from(data?.files||[]);
    if(!files.length){
      if(!nativeShare)throw new Error('Trình duyệt không hỗ trợ Share API.');
      return nativeShare(data);
    }
    const cap=nativeFileCapability(files);
    if(cap===false){
      fallbackFiles(files);
      return {fallback:'download'};
    }
    if(nativeShare){
      try{
        await nativeShare(data);
        return {shared:true};
      }catch(e){
        if(e?.name==='AbortError')return {cancelled:true};
        console.warn('V2.1 native file share failed; fallback to download/open',e);
        fallbackFiles(files);
        return {fallback:'download',error:S(e?.message||e)};
      }
    }
    fallbackFiles(files);
    return {fallback:'download'};
  }

  // Shadow navigator.share on this page so legacy export paths inherit the same behavior.
  // URL/text shares are passed through unchanged; only file shares get adaptive fallback.
  if(nativeShare){
    const wrappedShare=function(data){return adaptiveShare(data)};
    wrappedShare.__sagsV21AdaptiveShare=1;
    try{
      Object.defineProperty(navigator,'share',{configurable:true,writable:true,value:wrappedShare});
      root.__SAGS_V21_SHARE_WRAPPED=true;
    }catch(e){
      try{
        navigator.share=wrappedShare;
        root.__SAGS_V21_SHARE_WRAPPED=navigator.share===wrappedShare;
      }catch(_){
        root.__SAGS_V21_SHARE_WRAPPED=false;
        console.info('V2.1 navigator.share could not be shadowed; existing fallback paths remain active.');
      }
    }
  }

  root.sagsV21ShareFile=async function(file,opts={}){
    if(!file)throw new Error('Chưa có file để chia sẻ.');
    const f=file instanceof File?file:new File([file],S(opts.name)||'SAGS_EXPORT.pdf',{type:S(file?.type)||S(opts.type)||'application/pdf',lastModified:Date.now()});
    return adaptiveShare({title:S(opts.title)||f.name.replace(/\.[^.]+$/,''),text:S(opts.text)||undefined,files:[f]});
  };
  root.sagsV21ShareDiagnostics=function(){
    let pdfCap=null;
    try{
      if(typeof File==='function'&&typeof navigator.canShare==='function'){
        pdfCap=navigator.canShare({files:[new File(['%PDF-1.4'],'SAGS_TEST.pdf',{type:'application/pdf'})]});
      }
    }catch(_){pdfCap=false}
    return {
      build:BUILD,
      shareApi:typeof navigator.share==='function',
      canShareApi:typeof navigator.canShare==='function',
      pdfFileShare:pdfCap,
      wrapped:!!root.__SAGS_V21_SHARE_WRAPPED,
      ios:isIOS(),
      userAgent:S(navigator.userAgent)
    };
  };

  // Light UI hint: browser cannot share PDF files natively -> existing GỬI/CHIA SẺ
  // buttons still work, but will save/open the PDF instead.
  function decorateExportButtons(){
    let cap=null;
    try{
      if(typeof File==='function'&&typeof navigator.canShare==='function'){
        cap=navigator.canShare({files:[new File(['%PDF-1.4'],'SAGS_TEST.pdf',{type:'application/pdf'})]});
      }
    }catch(_){cap=false}
    if(cap!==false)return;
    document.querySelectorAll('button').forEach(b=>{
      const t=U(b.textContent);
      if(/GỬI PDF|CHIA SẺ PDF|SHARE PDF/.test(t)){
        b.title='Trình duyệt này không hỗ trợ chia sẻ file PDF trực tiếp. V2.1 sẽ chuyển sang LƯU/TẢI hoặc mở PDF.';
      }
    });
  }
  const mo=new MutationObserver(()=>decorateExportButtons());
  try{mo.observe(document.documentElement,{childList:true,subtree:true})}catch(_){}
  setTimeout(decorateExportButtons,500);

})(typeof window!=='undefined'?window:globalThis);

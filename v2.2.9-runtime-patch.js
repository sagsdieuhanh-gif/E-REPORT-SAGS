/* E-REPORT/SAGS V2.2.9 · PDF EXPORT COMPLETE / SHARE FIX
 * BUILD: V2.2.9-PDF-EXPORT-COMPLETE-SHARE-FIX
 * Base production: V2.2.7
 *
 * Real-device symptom fixed:
 * - PDF is already generated/exported, but the export UI remains at
 *   "Đang hoàn tất PDF...".
 * - Pressing XUẤT again can then open the native share sheet.
 *
 * Root cause class:
 * Mobile Web Share requires a live user activation. PDF rendering is async;
 * on some browsers that activation has expired before navigator.share() is
 * reached. Some WebView/browser builds reject, while some remain pending.
 * The legacy caller keeps awaiting that Promise, so the PDF is ready but the
 * progress UI never transitions to DONE.
 *
 * V2.2.9:
 * 1) Never call file-share without a live user gesture when UserActivation API
 *    says the gesture is already gone.
 * 2) If a share Promise remains pending while the page is still visible/focused,
 *    release the export caller instead of leaving "Đang hoàn tất PDF..." forever.
 * 3) Keep the generated File and show an explicit "CHIA SẺ / LƯU PDF" button.
 *    Its tap is a NEW user gesture, so native Share opens reliably.
 * 4) If native share/download already completed, transition stuck progress text
 *    to "PDF đã tạo xong." and re-enable ĐÓNG.
 * 5) No business data, form data, signature data, FINAL/CROSSCHECK/KẾT SỔ logic
 *    is changed.
 */
(function(root){
  'use strict';

  const BUILD='V2.2.9-PDF-EXPORT-COMPLETE-SHARE-FIX';
  if(root.__SAGS_V229_PDF_EXPORT===BUILD)return;
  root.__SAGS_V229_PDF_EXPORT=BUILD;

  const S=v=>String(v??'').trim();
  const FILE_SHARE_TIMEOUT_MS=3200;

  let installed=false;
  let baseNavigatorShare=null;
  let baseSagsShareFile=null;
  let pendingShareData=null;
  let pendingShareSource='';
  let deferredCount=0;
  let watchdogCount=0;
  let completedCount=0;
  let cancelledCount=0;
  let lastReason='';
  let lastAtMs=0;

  function hasFiles(data){
    try{return !!(data&&data.files&&Array.from(data.files).length)}catch(_){return false}
  }
  function activationKnownInactive(){
    try{
      return !!navigator.userActivation && navigator.userActivation.isActive===false;
    }catch(_){return false}
  }
  function pageStillForeground(){
    try{
      const visible=document.visibilityState!=='hidden';
      const focused=typeof document.hasFocus==='function'?document.hasFocus():true;
      return visible&&focused;
    }catch(_){return true}
  }
  function isRetryableGestureError(e){
    const n=S(e?.name);
    const m=S(e?.message||e).toLowerCase();
    return n==='NotAllowedError'
      ||n==='SecurityError'
      ||n==='InvalidStateError'
      ||m.includes('user activation')
      ||m.includes('user gesture')
      ||m.includes('not allowed')
      ||m.includes('permission');
  }

  function fileLabel(data){
    try{
      const f=Array.from(data?.files||[])[0];
      return S(f?.name)||'PDF';
    }catch(_){return 'PDF'}
  }

  function ensureReadyUi(){
    let box=document.getElementById('v229PdfReady');
    if(box)return box;

    const st=document.createElement('style');
    st.id='v229PdfReadyStyle';
    st.textContent=`
      #v229PdfReady{position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom));transform:translateX(-50%);
        z-index:2147482000;width:min(92vw,470px);display:none;box-sizing:border-box;background:#fff;color:#17324d;
        border:1px solid #cbd9e6;border-radius:16px;padding:11px;box-shadow:0 10px 35px rgba(0,0,0,.28);font-family:Arial,sans-serif}
      #v229PdfReady.show{display:block}
      #v229PdfReady .v229row{display:grid;grid-template-columns:1fr auto;gap:9px;align-items:center}
      #v229PdfReady .v229title{font:900 14px/1.2 Arial;color:#0b5ea8}
      #v229PdfReady .v229sub{margin-top:3px;font:700 10px/1.3 Arial;color:#687c90;word-break:break-word}
      #v229PdfReady button{border:0;border-radius:11px;min-height:44px;padding:9px 13px;font:900 12px Arial}
      #v229PdfReadyShare{background:#e7f7ed;color:#176b3b}
      #v229PdfReadyClose{margin-top:7px;width:100%;background:#eef2f6;color:#536579;min-height:36px!important}
      @media print{#v229PdfReady{display:none!important}}
    `;
    document.head.appendChild(st);

    box=document.createElement('div');
    box.id='v229PdfReady';
    box.innerHTML=`
      <div class="v229row">
        <div>
          <div class="v229title">PDF ĐÃ TẠO XONG</div>
          <div id="v229PdfReadySub" class="v229sub">Bấm CHIA SẺ / LƯU để mở Share Sheet.</div>
        </div>
        <button id="v229PdfReadyShare" type="button">CHIA SẺ / LƯU PDF</button>
      </div>
      <button id="v229PdfReadyClose" type="button">ẨN THÔNG BÁO</button>
    `;
    document.body.appendChild(box);

    document.getElementById('v229PdfReadyClose').onclick=()=>box.classList.remove('show');
    document.getElementById('v229PdfReadyShare').onclick=()=>void retryPendingShare();
    return box;
  }

  function releaseStuckUi(message='PDF đã tạo xong.'){
    try{
      const all=[...document.querySelectorAll('body *')];
      for(const el of all){
        if(el.children?.length)continue;
        const t=S(el.textContent);
        if(/Đang\s+hoàn\s+tất\s+PDF/i.test(t)){
          el.textContent=message;
          const host=el.closest('[role="dialog"],.modal,.dialog,[class*="modal"],[class*="dialog"]')||el.parentElement?.parentElement;
          if(host){
            [...host.querySelectorAll('button')].forEach(b=>{
              if(/Đóng|Close/i.test(S(b.textContent))){
                b.disabled=false;
                b.removeAttribute('aria-disabled');
              }
            });
          }
        }
      }
    }catch(_){}
  }

  function rememberPending(data,reason,source){
    if(!hasFiles(data))return;
    pendingShareData=data;
    pendingShareSource=source||'share';
    deferredCount++;
    lastReason=reason||'deferred';
    lastAtMs=Date.now();

    releaseStuckUi('PDF đã tạo xong.');
    const box=ensureReadyUi();
    const sub=document.getElementById('v229PdfReadySub');
    if(sub){
      sub.textContent=`${fileLabel(data)} · PDF đã sẵn sàng. Bấm nút bên phải để chia sẻ/lưu.`;
    }
    box.classList.add('show');
  }

  function hideReady(){
    try{document.getElementById('v229PdfReady')?.classList.remove('show')}catch(_){}
  }

  async function retryPendingShare(){
    const data=pendingShareData;
    if(!data)return hideReady();

    const btn=document.getElementById('v229PdfReadyShare');
    if(btn){btn.disabled=true;btn.textContent='ĐANG MỞ…';}

    try{
      // This function is executed directly from the visible button's click:
      // user activation is fresh here.
      let r;
      if(pendingShareSource==='sagsV21ShareFile' && typeof baseSagsShareFile==='function'){
        const f=Array.from(data.files||[])[0];
        r=await baseSagsShareFile(f,{
          name:S(f?.name),
          type:S(f?.type)||'application/pdf',
          title:S(data.title),
          text:S(data.text)
        });
      }else if(typeof baseNavigatorShare==='function'){
        r=await baseNavigatorShare(data);
      }else if(typeof root.sagsV21ShareFile==='function'){
        const f=Array.from(data.files||[])[0];
        r=await root.sagsV21ShareFile(f,{name:S(f?.name),type:S(f?.type)||'application/pdf'});
      }else{
        throw new Error('Trình duyệt không có chức năng chia sẻ file.');
      }

      if(r?.cancelled){
        cancelledCount++;
        lastReason='user-cancelled-retry';
        return;
      }

      completedCount++;
      lastReason=r?.fallback?'fallback-complete':'share-complete';
      lastAtMs=Date.now();
      pendingShareData=null;
      pendingShareSource='';
      hideReady();
      releaseStuckUi('PDF đã tạo xong.');
    }catch(e){
      if(e?.name==='AbortError'){
        cancelledCount++;
        lastReason='user-cancelled-retry';
      }else{
        lastReason='retry-error: '+S(e?.message||e);
        const sub=document.getElementById('v229PdfReadySub');
        if(sub)sub.textContent='Chưa mở được Share Sheet. Có thể bấm lại CHIA SẺ / LƯU PDF.';
      }
    }finally{
      if(btn){btn.disabled=false;btn.textContent='CHIA SẺ / LƯU PDF';}
    }
  }

  function callWithWatchdog(call,data,source){
    // If the browser tells us the async PDF build already consumed the user
    // activation, do NOT enter navigator.share at all.
    if(hasFiles(data)&&activationKnownInactive()){
      rememberPending(data,'user-activation-expired',source);
      return Promise.resolve({deferred:true,reason:'user-activation-expired'});
    }

    let settled=false;
    let externalUi=false;
    let resolveOuter,rejectOuter;
    const outer=new Promise((resolve,reject)=>{resolveOuter=resolve;rejectOuter=reject});

    const onBlur=()=>{externalUi=true};
    const onVis=()=>{if(document.visibilityState==='hidden')externalUi=true};
    root.addEventListener('blur',onBlur,{once:true,capture:true});
    document.addEventListener('visibilitychange',onVis,{capture:true});

    let timer=0;
    const clean=()=>{
      clearTimeout(timer);
      root.removeEventListener('blur',onBlur,true);
      document.removeEventListener('visibilitychange',onVis,true);
    };

    timer=setTimeout(()=>{
      if(settled)return;
      // If the page lost focus/visibility, native Share is probably genuinely open.
      // Never time it out while the user is inside the Share Sheet.
      if(externalUi||!pageStillForeground())return;

      settled=true;
      watchdogCount++;
      rememberPending(data,'share-promise-watchdog',source);
      clean();
      resolveOuter({deferred:true,reason:'share-promise-watchdog'});
    },FILE_SHARE_TIMEOUT_MS);

    Promise.resolve().then(call).then(r=>{
      if(settled)return;
      settled=true;clean();
      if(r?.cancelled){
        cancelledCount++;
        lastReason='user-cancelled';
      }else{
        completedCount++;
        lastReason=r?.fallback?'fallback-complete':'share-complete';
      }
      lastAtMs=Date.now();
      releaseStuckUi('PDF đã tạo xong.');
      resolveOuter(r);
    }).catch(e=>{
      if(settled)return;
      settled=true;clean();

      if(e?.name==='AbortError'){
        cancelledCount++;
        lastReason='user-cancelled';
        lastAtMs=Date.now();
        releaseStuckUi('PDF đã tạo xong.');
        resolveOuter({cancelled:true});
        return;
      }

      if(hasFiles(data)&&isRetryableGestureError(e)){
        rememberPending(data,'share-gesture-error',source);
        resolveOuter({deferred:true,reason:'share-gesture-error'});
        return;
      }

      rejectOuter(e);
    });

    return outer;
  }

  function installNavigatorShare(){
    const cur=navigator.share;
    if(typeof cur!=='function')return false;
    if(cur.__sagsV229PdfExport)return true;

    baseNavigatorShare=cur.bind(navigator);

    const wrapped=function(data){
      if(!hasFiles(data))return baseNavigatorShare(data);
      return callWithWatchdog(()=>baseNavigatorShare(data),data,'navigator.share');
    };
    wrapped.__sagsV229PdfExport=1;
    wrapped.__sagsV229Base=cur;

    try{
      Object.defineProperty(navigator,'share',{configurable:true,writable:true,value:wrapped});
      return navigator.share===wrapped;
    }catch(_){
      try{navigator.share=wrapped;return navigator.share===wrapped}catch(_2){return false}
    }
  }

  function installSagsShareFile(){
    const cur=root.sagsV21ShareFile;
    if(typeof cur!=='function')return false;
    if(cur.__sagsV229PdfExport)return true;

    baseSagsShareFile=cur;
    const wrapped=function(file,opts={}){
      const f=file instanceof File
        ?file
        :new File([file],S(opts.name)||'SAGS_EXPORT.pdf',{
            type:S(file?.type)||S(opts.type)||'application/pdf',
            lastModified:Date.now()
          });
      const data={
        title:S(opts.title)||S(f.name).replace(/\.[^.]+$/,''),
        text:S(opts.text)||undefined,
        files:[f]
      };
      return callWithWatchdog(()=>baseSagsShareFile.apply(this,arguments),data,'sagsV21ShareFile');
    };
    wrapped.__sagsV229PdfExport=1;
    wrapped.__sagsV229Base=cur;
    root.sagsV21ShareFile=wrapped;
    return true;
  }

  function install(){
    ensureReadyUi();
    installNavigatorShare();
    installSagsShareFile();
    installed=true;
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>setTimeout(install,80),{once:true});
  }else setTimeout(install,40);

  setTimeout(install,350);
  setTimeout(install,900);
  setTimeout(install,1800);
  window.addEventListener('pageshow',()=>setTimeout(install,60),{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden)setTimeout(install,60);
  },{passive:true});

  root.sagsV229PdfExportDiagnostics=function(){
    return {
      build:BUILD,
      installed,
      navigatorSharePatched:!!navigator.share?.__sagsV229PdfExport,
      sagsShareFilePatched:!!root.sagsV21ShareFile?.__sagsV229PdfExport,
      userActivationSupported:!!navigator.userActivation,
      userActivationActive:navigator.userActivation?.isActive,
      pending:!!pendingShareData,
      pendingFile:pendingShareData?fileLabel(pendingShareData):'',
      deferredCount,watchdogCount,completedCount,cancelledCount,
      lastReason,lastAtMs
    };
  };
})(typeof window!=='undefined'?window:globalThis);

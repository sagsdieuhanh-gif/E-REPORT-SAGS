(()=>{"use strict";
if(window.__SAGS_V1154_UPDATE_R2)return;window.__SAGS_V1154_UPDATE_R2=true;
function sagsIndexReleaseMeta(html){try{const doc=new DOMParser().parseFromString(String(html||""),"text/html");return{build:String(doc.querySelector('meta[name="sags-release-build"]')?.getAttribute("content")||"").trim(),version:String(doc.querySelector('meta[name="sags-release-version"]')?.getAttribute("content")||"").trim()}}catch(_e){return{build:"",version:""}}}
window.fetchServerVersion=async function(){try{const stamp=Date.now(),opts={cache:"no-store",headers:{"Cache-Control":"no-cache",Pragma:"no-cache"}},[res,mr,ir]=await Promise.all([fetch(APP_VERSION_URL+"?__sags_strict=1&t="+stamp,opts),fetch("./asset-manifest.json?__sags_strict=1&t="+stamp,opts),fetch("./index.html?__sags_contract=1&t="+stamp,opts)]);if(!res.ok||!mr.ok||!ir.ok)throw new Error("RELEASE CONTRACT HTTP "+res.status+"/"+mr.status+"/"+ir.status);const[data,manifest,indexHtml]=await Promise.all([res.json(),mr.json(),ir.text()]),declaredBuild=String(data?.build||"").trim(),declaredVersion=String(data?.displayVersion||data?.version||"").trim(),idx=sagsIndexReleaseMeta(indexHtml);appUpdateDisplayTarget=declaredVersion;appUpdatePendingServerBuild="";appUpdatePendingDisplay="";if(!declaredBuild||!declaredVersion)return"";if(String(manifest?.build||"").trim()!==declaredBuild||String(manifest?.version||"").trim()!==declaredVersion)return"";if(idx.build!==declaredBuild||idx.version!==declaredVersion)return"";for(const key of["./index.html","./service-worker.js","./repair.html","./app/boot/05-legacy.js","./app/generated/boot-group-4.js"]){const a=manifest?.assets?.[key];if(!a?.sha256||!Number.isSafeInteger(Number(a.bytes)))return""}if(declaredBuild===APP_BUILD_VERSION){try{localStorage.removeItem("sags-v6-deferred-build");localStorage.removeItem("pdh-update-applying");localStorage.removeItem("sags-repair-target");localStorage.removeItem("sags-repair-ready")}catch(_e){}return APP_BUILD_VERSION}return declaredBuild}catch(_e){return""}};
async function sagsVerifiedWaiting(worker,expectedBuild){if(!worker||!expectedBuild)return false;return await new Promise(resolve=>{const channel=new MessageChannel;let done=false;const finish=value=>{if(done)return;done=true;clearTimeout(timer);channel.port1.close();resolve(value)},timer=setTimeout(()=>finish(false),3500);channel.port1.onmessage=e=>finish(e?.data?.ready===true&&e?.data?.build===expectedBuild);try{worker.postMessage({type:"SAGS_QUERY_BUILD"},[channel.port2])}catch(_e){finish(false)}})}
window.checkForNewestBuild=async function(reg){if(appUpdateCheckBusy||appUpdateApplyRequested)return;appUpdateCheckBusy=true;try{const serverVersion=await fetchServerVersion();appUpdateRegistration=reg||appUpdateRegistration;if(!serverVersion)return;if(serverVersion===APP_BUILD_VERSION){appUpdateTarget="";const modal=document.getElementById("appUpdateModal"),badge=document.getElementById("sagsDeferredUpdate");if(modal)modal.style.display="none";if(badge)badge.hidden=true;try{localStorage.removeItem("sags-v6-deferred-build");localStorage.removeItem("pdh-update-applying")}catch(_e){}await alignWaitingWorkerWhenPageAlreadyCurrent(appUpdateRegistration);return}appUpdateTarget=serverVersion;try{localStorage.setItem("sags-v6-deferred-build",serverVersion)}catch(_e){}openAppUpdatePrompt(serverVersion);let r=appUpdateRegistration||await navigator.serviceWorker.getRegistration("./");if(!r){try{r=await navigator.serviceWorker.register("./service-worker.js?stage="+encodeURIComponent(serverVersion)+"&t="+Date.now(),{scope:"./",updateViaCache:"none"});appUpdateRegistration=r;wireUpdateSignals(r)}catch(err){console.info("SW staging unavailable; update notice remains visible",err?.message||err);return}}else{appUpdateRegistration=r;wireUpdateSignals(r)}try{void r.update().catch(e=>console.info("Background update staging",e?.message||e))}catch(e){console.info("Background update staging",e?.message||e)}}catch(e){console.info("Không kiểm tra được bản mới:",e?.message||e)}finally{appUpdateCheckBusy=false}};
async function sagsUpdateIncompleteWorkGuard(){
  let sid="";
  try{sid=String(typeof activeFlightSessionId!=="undefined"?activeFlightSessionId:(window.activeFlightSessionId||"")).trim()}catch(_e){sid=String(window.activeFlightSessionId||"").trim()}
  if(!sid)return{blocked:false};
  let meta=null,env=null;
  try{meta=typeof currentFlightSessionMeta==="function"?currentFlightSessionMeta():window.currentFlightSessionMeta?.()}catch(_e){}
  try{env=typeof readFlightSessionEnvelope==="function"?readFlightSessionEnvelope(sid):window.readFlightSessionEnvelope?.(sid)}catch(_e){}
  const aid=String(meta?.rosterAssignmentId||env?.rosterAssignmentId||"").trim();
  const norm=v=>String(v??"").trim().toUpperCase();
  const isDone=st=>{
    const cs=norm(st?.claimStatus),ws=norm(st?.workPartStatus),ts=norm(st?.taskStatusV333||st?.taskStatus);
    return!!st?.completionEnvelope||Number(st?.completedAtMs||st?.completionEnvelopeAtMs||0)>0||["PART_COMPLETED","COMPLETED","HANDED_OVER"].includes(cs)||ws==="COMPLETED"||ts==="COMPLETED"
  };
  if(aid){
    try{
      const ref=typeof window.sagsV470Ref==="function"?window.sagsV470Ref:(typeof sagsV470Ref==="function"?sagsV470Ref:null);
      if(!ref)return{blocked:true,reason:"Không xác nhận được trạng thái HOÀN TẤT của biểu mẫu."};
      const st=(await ref("roster_sessions/"+aid.replace(/[.#$\[\]\/]/g,"_")).once("value")).val()||{};
      return{blocked:!isDone(st),reason:!isDone(st)?"Biểu mẫu đang làm chưa HOÀN TẤT.":""};
    }catch(_e){
      return{blocked:true,reason:"Không xác nhận được trạng thái HOÀN TẤT của biểu mẫu."};
    }
  }
  try{
    const btn=[...document.querySelectorAll("#sagsMobileFormDock button,#v324FormActions button,#v163OperationNav button")].find(b=>{
      const t=norm(b.textContent).normalize("NFD").replace(/[\u0300-\u036f]/g,"");
      const visible=b.offsetParent!==null&&getComputedStyle(b).display!=="none";
      return visible&&!b.disabled&&t.includes("HOAN TAT")
    });
    if(btn)return{blocked:true,reason:"Biểu mẫu đang làm chưa HOÀN TẤT."};
  }catch(_e){}
  return{blocked:false}
}
window.sagsUpdateIncompleteWorkGuard=sagsUpdateIncompleteWorkGuard;
window.applyAppUpdate=async function(){if(navigator.onLine===false){alert("Máy đang ngoại tuyến. Hãy kết nối mạng và hoàn tất đồng bộ trước khi cập nhật.");return}if(window.sagsQuickEntryStatus?.()){alert("Đang nhập nhanh. Hãy hoàn tất hoặc đóng nhập nhanh rồi cập nhật.");return}const workGuard=await sagsUpdateIncompleteWorkGuard();if(workGuard?.blocked){alert((workGuard.reason||"Biểu mẫu đang làm chưa HOÀN TẤT.")+" Hãy bấm HOÀN TẤT trước khi cập nhật. Dữ liệu nháp vẫn được giữ nguyên.");return}if(typeof readOfflineQueue==="function"&&readOfflineQueue().length){alert("Vẫn còn thao tác chờ đồng bộ. Hãy đồng bộ hết trước khi cập nhật.");return}const safe=await sagsSaveBeforeAppUpdate();if(!safe||navigator.onLine===false||typeof readOfflineQueue==="function"&&readOfflineQueue().length){alert("Chưa xác nhận được việc lưu hoặc vẫn còn dữ liệu chờ đồng bộ. Giữ nguyên màn hình; hãy thử lại sau.");return}try{if(activeFlightSessionId){const saved=readFlightSessionEnvelope(activeFlightSessionId);if(!saved||JSON.stringify(saved.state)!==JSON.stringify(state))throw Error("Dữ liệu chuyến chưa lưu đầy đủ vào máy.")}}catch(e){alert((e?.message||e)+" Giữ nguyên màn hình và thử lưu lại.");return}const btn=document.getElementById("appUpdateNowBtn");if(btn){btn.disabled=true;btn.textContent="ĐANG TẢI BẢN CẬP NHẬT…";btn.setAttribute("aria-busy","true")}const updateModal=document.getElementById("appUpdateModal"),updateTitle=document.getElementById("appUpdateTitle"),updateText=document.getElementById("appUpdateVersionText"),updateLater=document.getElementById("appUpdateLaterBtn");if(updateTitle)updateTitle.textContent="ĐANG TẢI BẢN CẬP NHẬT";if(updateText)updateText.textContent="Đang kiểm tra và tải bản mới. Vui lòng giữ trang mở, hệ thống sẽ tự tải lại khi cập nhật hoàn tất.";if(updateLater)updateLater.hidden=true;if(updateModal)updateModal.style.display="flex";try{const target=await fetchServerVersion();if(!target||target===APP_BUILD_VERSION){appUpdateApplyRequested=false;if(updateLater)updateLater.hidden=false;const modal=document.getElementById("appUpdateModal");if(modal)modal.style.display="none";if(btn){btn.disabled=false;btn.textContent="CẬP NHẬT NGAY";btn.removeAttribute("aria-busy")}return}try{sessionStorage.setItem(APP_UPDATE_EXPLICIT_KEY,String(Date.now()));localStorage.setItem("pdh-update-applying",target);localStorage.setItem("sags-v6-deferred-build",target);localStorage.setItem("sags-repair-target",target)}catch(_e){}appUpdateTarget=target;appUpdateApplyRequested=true;if(updateTitle)updateTitle.textContent="ĐANG CẬP NHẬT";if(updateText)updateText.textContent="Đã xác minh phiên bản mới. Đang chuyển sang bộ cập nhật an toàn; trang sẽ tự mở lại khi hoàn tất.";if(btn)btn.textContent="ĐANG CẬP NHẬT…";const u=new URL("./repair.html",location.href);u.searchParams.set("stage","1");u.searchParams.set("auto","1");u.searchParams.set("target",target);u.searchParams.set("from","update");u.searchParams.set("_",Date.now());location.replace(u.href)}catch(e){appUpdateApplyRequested=false;try{sessionStorage.removeItem(APP_UPDATE_EXPLICIT_KEY);localStorage.removeItem("pdh-update-applying")}catch(_e){}if(btn){btn.disabled=false;btn.textContent="THỬ LẠI CẬP NHẬT";btn.removeAttribute("aria-busy")}if(updateTitle)updateTitle.textContent="CẬP NHẬT CHƯA HOÀN TẤT";if(updateText)updateText.textContent="Ứng dụng vẫn giữ dữ liệu cũ. Kiểm tra kết nối mạng rồi thử lại. "+String(e?.message||e);if(updateLater)updateLater.hidden=false;if(updateModal)updateModal.style.display="flex"}};
window.sagsApplyUpdateFromButton=function(ev){try{ev?.preventDefault?.();ev?.stopPropagation?.()}catch(_e){}Promise.resolve(window.applyAppUpdate?.()).catch(e=>alert("Không thể khởi động cập nhật.\n"+String(e?.message||e)));return false};
function sagsUpdateFinishedOnce(){
 try{
  const key='sags-repair-ready',mark='sags-update-complete-v1',build=sessionStorage.getItem(mark)||localStorage.getItem(key);
  if(!build||build!==APP_BUILD_VERSION)return;
  sessionStorage.removeItem(mark);localStorage.removeItem(key);localStorage.removeItem('sags-repair-target');localStorage.removeItem('pdh-update-applying');localStorage.removeItem('sags-v6-deferred-build');
  const show=()=>{
   if(document.getElementById('sagsUpdateSuccessNotice'))return;
   const el=document.createElement('div');el.id='sagsUpdateSuccessNotice';
   el.setAttribute('role','status');el.setAttribute('aria-live','polite');
   el.textContent='✓ CẬP NHẬT HOÀN TẤT · '+APP_DISPLAY_VERSION+' · Đã tự tải lại bản mới';
   el.style.cssText='position:fixed;z-index:90000;top:calc(12px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);width:min(92vw,490px);padding:14px 18px;border:1px solid #77c7a4;border-radius:14px;background:#e8f8ef;color:#115839;font:800 14px/1.45 system-ui,Arial;text-align:center;box-shadow:0 8px 22px #0003;pointer-events:none';
   document.body.appendChild(el);setTimeout(()=>el.remove(),4200);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show,{once:true});else show();
 }catch(e){console.info('Release complete UI',e?.message||e)}
}
sagsUpdateFinishedOnce();
let sagsReturnCheckAt=0;function sagsCheckAfterReturn(){const now=Date.now();if(now-sagsReturnCheckAt<15000)return;sagsReturnCheckAt=now;setTimeout(()=>{try{window.checkForNewestBuild(appUpdateRegistration)}catch(_e){}},180)}
setTimeout(()=>{try{window.checkForNewestBuild(appUpdateRegistration)}catch(_e){}},700);window.addEventListener("pageshow",sagsCheckAfterReturn,{passive:true});document.addEventListener("visibilitychange",()=>{if(!document.hidden)sagsCheckAfterReturn()},{passive:true});
})();

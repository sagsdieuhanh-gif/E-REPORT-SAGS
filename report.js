/* E-REPORT/SAGS V4.2.26 · HARD REMOVE LEGACY REPORT BUTTONS
   Retire every legacy DAY BRIEF / NIGHT REPORT entry point.
   Keep only the current SHIFT REPORT. */
(function(root){
  "use strict";
  if(root.__SAGS_REPORT_V426_CLEANUP)return;
  root.__SAGS_REPORT_V426_CLEANUP=true;

  const OLD_FN_NAMES=["v1171OpenDayReport","v1171OpenNightReport"];

  function norm(v){
    return String(v??"")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/Đ/g,"D").replace(/đ/g,"d")
      .replace(/\s+/g," ")
      .trim()
      .toUpperCase();
  }

  function isLegacyControl(el){
    if(!el || el.id==="srOpen" || el.id==="srFromOld") return false;

    const t=norm(el.textContent);
    const title=norm(el.getAttribute?.("title"));
    const aria=norm(el.getAttribute?.("aria-label"));
    const onclick=String(el.getAttribute?.("onclick")||"");

    // Match the labels actually shown on the toolbar, with/without icons/prefixes.
    const legacyText=
      t.includes("GIAO BAN NGAY") ||
      t.includes("BAO CAO BAY DEM") ||
      t.includes("BAO CAO CHIEU DEM") ||
      t.includes("BAO CAO TINH HINH PHUC VU BAY CHIEU DEM") ||
      title.includes("GIAO BAN NGAY") ||
      title.includes("BAO CAO BAY DEM") ||
      aria.includes("GIAO BAN NGAY") ||
      aria.includes("BAO CAO BAY DEM");

    const legacyHandler=OLD_FN_NAMES.some(fn=>onclick.includes(fn));
    return legacyText || legacyHandler;
  }

  function removeLegacyControls(rootNode=document){
    // Remove retired modal from old report.js/runtime cache.
    document.getElementById("v1171ReportModal")?.remove();

    // Toolbar controls can be inserted after login/role changes, so scan all clickable controls.
    rootNode.querySelectorAll?.(
      'button,a,[role="button"],input[type="button"],input[type="submit"]'
    ).forEach(el=>{
      if(isLegacyControl(el)) el.remove();
    });
  }

  // Any stale direct call is retired. It does NOT open another report.
  root.v1171OpenDayReport=function(){ removeLegacyControls(); };
  root.v1171OpenNightReport=function(){ removeLegacyControls(); };

  // Block a legacy control at capture phase even if an old runtime inserts it
  // between MutationObserver cycles.
  document.addEventListener("click",function(ev){
    const el=ev.target?.closest?.('button,a,[role="button"],input[type="button"],input[type="submit"]');
    if(!isLegacyControl(el))return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    el.remove();
  },true);

  let queued=false;
  function scheduleCleanup(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      removeLegacyControls();
    });
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",()=>removeLegacyControls(),{once:true});
  }else{
    removeLegacyControls();
  }

  // Old toolbar code can recreate buttons after authentication/profile rendering.
  new MutationObserver(scheduleCleanup).observe(document.documentElement,{
    childList:true,
    subtree:true,
    characterData:true
  });

  // Extra post-login safety without a continuous timer.
  ["sags:login","sags:rolechange","sags:profilechange","sags:ui-ready"].forEach(name=>{
    window.addEventListener(name,scheduleCleanup);
  });
})(typeof window!=="undefined"?window:globalThis);

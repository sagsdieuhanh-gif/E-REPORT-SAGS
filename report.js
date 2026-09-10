/* E-REPORT/SAGS V4.2.27 · ONLY SHIFT REPORT + SESSION PROFILE FIX */
(function(root){
  "use strict";
  if(root.__SAGS_REPORT_V427_FIX)return;
  root.__SAGS_REPORT_V427_FIX=true;

  const S=v=>String(v??"").trim();
  const U=v=>S(v).toUpperCase();

  /* The main UI reads role from __sagsGetSession().profile.role.
     Shift Report V4.2.24 expected top-level session.username/session.role.
     Bridge the same authenticated session shape without creating a second login. */
  let wrappedGetter=null;
  let originalGetter=null;

  function ensureSessionBridge(){
    const current=root.__sagsGetSession;
    if(typeof current!=="function")return false;
    if(current===wrappedGetter)return true;

    originalGetter=current;
    wrappedGetter=function(){
      let s={};
      try{s=originalGetter?.()||{}}catch(_){s={}}
      const p=(s&&typeof s.profile==="object"&&s.profile)||{};
      return {
        ...s,
        username:S(s.username||p.username||p.userName||p.login||p.account),
        role:U(s.role||p.role||p.systemRole),
        profile:p
      };
    };
    root.__sagsGetSession=wrappedGetter;
    return true;
  }

  function authenticatedSession(){
    ensureSessionBridge();
    let s={};
    try{s=root.__sagsGetSession?.()||{}}catch(_){}
    const p=s.profile||{};
    return {
      username:S(s.username||p.username||p.userName||p.login||p.account),
      role:U(s.role||p.role||p.systemRole),
      profile:p
    };
  }

  function canOpenShift(){
    const s=authenticatedSession();
    return !!s.username && !["","VIEW","VIEWER"].includes(s.role);
  }

  function openShift(){
    ensureSessionBridge();
    if(typeof root.sagsShiftOpen!=="function"){
      try{alert("BÁO CÁO CA chưa nạp xong. Vui lòng mở lại chức năng.")}catch(_){}
      return;
    }
    return root.sagsShiftOpen();
  }

  // Legacy callers now point to ONE current report, so old cached UI cannot break.
  root.v1171OpenDayReport=openShift;
  root.v1171OpenNightReport=openShift;

  function setMenuLabel(btn,label,icon){
    if(!btn)return;
    const spans=btn.querySelectorAll("span");
    if(spans[0]&&icon)spans[0].textContent=icon;
    if(spans[1])spans[1].textContent=label;
    else btn.textContent=label;
  }

  function reconcileReportUi(){
    ensureSessionBridge();

    // Retired standalone modal must never return from old cache.
    document.getElementById("v1171ReportModal")?.remove();

    // ui.js currently creates two old drawer entries:
    // shift = Giao ban ngày; night = Báo cáo bay đêm.
    // Keep ONE entry only and route it to the current Shift Report.
    const shift=document.querySelector('[data-v157-key="shift"]');
    if(shift){
      setMenuLabel(shift,"Báo cáo ca","▤");
      shift.setAttribute("aria-label","Báo cáo ca");
      shift.title="Báo cáo khai thác ca trực";
    }

    const night=document.querySelector('[data-v157-key="night"]');
    if(night)night.remove();

    // Home "Báo cáo / Xem tất cả" is also routed to the current report by
    // overriding the legacy function above; keep the home shortcut intact.

    // Remove any other stray legacy report buttons injected by older cache/runtime.
    document.querySelectorAll('button,a,[role="button"]').forEach(el=>{
      if(el===shift || el.id==="srOpen" || el.id==="v157ReportBtn")return;
      const t=U(el.textContent)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g,"")
        .replace(/Đ/g,"D");
      if(
        t.includes("GIAO BAN NGAY") ||
        t.includes("BAO CAO BAY DEM") ||
        t.includes("BAO CAO CHIEU DEM") ||
        t.includes("BAO CAO TINH HINH PHUC VU BAY CHIEU DEM")
      ) el.remove();
    });
  }

  // Ensure the session bridge is installed BEFORE Shift Report permission check.
  document.addEventListener("click",function(ev){
    const el=ev.target?.closest?.('button,a,[role="button"]');
    if(!el)return;

    const isShift=
      el.id==="srOpen" ||
      el.id==="v157ReportBtn" ||
      el.matches?.('[data-v157-key="shift"]');

    if(isShift)ensureSessionBridge();

    // A stale "night" element must never execute its old listener.
    if(el.matches?.('[data-v157-key="night"]')){
      ev.preventDefault();
      ev.stopImmediatePropagation();
      el.remove();
      return;
    }
  },true);

  let queued=false;
  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      reconcileReportUi();
    });
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",reconcileReportUi,{once:true});
  }else{
    reconcileReportUi();
  }

  new MutationObserver(schedule).observe(document.documentElement,{
    childList:true,
    subtree:true
  });

  // Expose a tiny diagnostic for future troubleshooting; no sensitive data returned.
  root.sagsShiftSessionCheck=function(){
    const s=authenticatedSession();
    return {loggedIn:!!s.username,role:s.role||"",permitted:canOpenShift()};
  };
})(typeof window!=="undefined"?window:globalThis);

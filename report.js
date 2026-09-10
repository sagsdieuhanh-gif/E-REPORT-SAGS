/* E-REPORT/SAGS V4.2.25 · REMOVE LEGACY REPORTS
   Legacy day/night report UI is retired.
   Only the current SHIFT REPORT (sagsShiftOpen) remains available. */
(function(root){
  "use strict";
  if(root.__SAGS_REPORT_V425_CLEANUP)return;
  root.__SAGS_REPORT_V425_CLEANUP=true;

  function openNewReport(){
    if(typeof root.sagsShiftOpen==="function"){
      return root.sagsShiftOpen();
    }
    try{
      alert("BÁO CÁO CA đang được nạp. Vui lòng mở lại sau khi giao diện hoàn tất.");
    }catch(_){}
  }

  // Compatibility only: any old caller now opens the new report.
  root.v1171OpenDayReport=openNewReport;
  root.v1171OpenNightReport=openNewReport;

  function retireLegacyReportUi(){
    // Remove the legacy modal if an older cached/runtime block created it.
    const oldModal=document.getElementById("v1171ReportModal");
    if(oldModal) oldModal.remove();

    // Remove buttons/links that explicitly call the retired report entry points.
    document.querySelectorAll(
      '[onclick*="v1171OpenDayReport"],[onclick*="v1171OpenNightReport"]'
    ).forEach(el=>{
      if(el.id!=="srOpen") el.remove();
    });

    // Remove obvious legacy report controls left by old HTML/runtime patches,
    // while never touching the current "BÁO CÁO CA" button.
    document.querySelectorAll("button,a").forEach(el=>{
      if(el.id==="srOpen")return;
      const t=String(el.textContent||"").trim().toUpperCase();
      if(
        t==="BÁO CÁO GIAO BAN NGÀY" ||
        t==="BÁO CÁO BAY ĐÊM" ||
        t==="BÁO CÁO CHIỀU ĐÊM" ||
        t==="BÁO CÁO TÌNH HÌNH PHỤC VỤ BAY CHIỀU ĐÊM"
      ) el.remove();
    });
  }

  let queued=false;
  function scheduleCleanup(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      retireLegacyReportUi();
    });
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",retireLegacyReportUi,{once:true});
  }else{
    retireLegacyReportUi();
  }

  new MutationObserver(scheduleCleanup).observe(document.documentElement,{
    childList:true,
    subtree:true
  });
})(typeof window!=="undefined"?window:globalThis);

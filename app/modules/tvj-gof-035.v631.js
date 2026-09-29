(function tvjV631Module(){
  "use strict";
  (function(root){
    if(root.__SAGS_TVJ_GOF_035_V631)return;
    root.__SAGS_TVJ_GOF_035_V631="V6.3.14-20260925-TVJ-LEGACY-CLEAN-RECEIVE-ID-16";
    const GROUP="tvjgof035",FORM_ID="tvj_gof_035",PAGE=15;

    function clone(x){try{return JSON.parse(JSON.stringify(x))}catch(_){return null}}
    function env(){
      try{return typeof readFlightSessionEnvelope==="function"?readFlightSessionEnvelope(activeFlightSessionId)||{}:{}}
      catch(_){return {}}
    }
    function hasVzState(st){
      st=st&&typeof st==="object"?st:{};
      return Object.keys(st).some(k=>String(k).startsWith("vz_")) || /(^|[\s/,+-])VZ\s*\d+/i.test(String(st.vz_flightNumber||""));
    }
    function isVzActive(){
      try{
        if(String(activeFormGroup||"")===GROUP)return true;
        const e=env();
        if(String(e.mainForm||e.activeFormGroup||"")===GROUP||String(e.vzForm||"")===FORM_ID)return true;
        return hasVzState(typeof state==="object"?state:e.state);
      }catch(_){return false}
    }
    function safe(v){
      try{return typeof safeFilePart==="function"?safeFilePart(String(v||"")):String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Za-z0-9._-]+/g,"_")}
      catch(_){return "REPORT"}
    }
    function permission(kind){
      try{
        if(typeof v485Can!=="function")return true;
        if(!v485Can("EXPORT_RAMP")){roleDenied?.("Tài khoản chưa được AD cấp quyền XUẤT RAMP / BBBT.");return false}
        if((kind===GROUP||kind==="all")&&!v485Can("FSAGS423")){roleDenied?.("Không có quyền xuất TVJ-GOF-035.");return false}
        if((kind==="bbbt"||kind==="all")&&!v485Can("BBBT")){roleDenied?.("Không có quyền xuất BBBT.");return false}
      }catch(_){}
      return true;
    }
    function filename(kind){
      let flight="REPORT",date="";
      try{
        const meta=typeof currentFlightSessionMeta==="function"?currentFlightSessionMeta():null;
        flight=(typeof flightSessionDisplayName==="function"?flightSessionDisplayName(meta):"")||
          (typeof deriveFlightSessionLabel==="function"?deriveFlightSessionLabel():"")||"REPORT";
        date=String(state?.vz_date||state?.date||new Date().toLocaleDateString("en-GB")).replace(/\//g,"-");
      }catch(_){}
      const form=kind==="bbbt"?"BBBT":kind==="all"?"TVJ-GOF-035_BBBT":"TVJ-GOF-035";
      return `${safe(form)}_${safe(flight)}_${safe(date)}.pdf`;
    }
    function setExportStatus(msg){
      const s=document.getElementById("exportStatus");if(s)s.textContent=String(msg||"");
    }
    async function renderBbbtWithNumber(){
      let job=null;
      window.__SAGS_SUPPRESS_BBBT_CXR_ON_RENDER=true;
      if(typeof allocateGlobalBBBTCxrNo==="function"){job=allocateGlobalBBBTCxrNo();job?.catch?.(()=>{})}
      const canvas=await renderReportPage(4);
      let no=null;if(job)no=await job;
      if(no!==null&&no!==undefined&&typeof v481PaintBbbtCxrNo==="function")v481PaintBbbtCxrNo(canvas,no);
      window.__SAGS_SUPPRESS_BBBT_CXR_ON_RENDER=false;
      return canvas;
    }
    async function exportVz(kind=GROUP){
      kind=String(kind||GROUP);
      if(!permission(kind))return;
      activeKey=null;
      try{
        if(typeof root.sagsV495BeforeExport!=="function")throw new Error("Form Manager canonical export chưa sẵn sàng.");
        setExportStatus("Đang xác minh Form Manager và registry TVJ-GOF-035...");
        await root.sagsV495BeforeExport();
        if(!root.sagsV495ManagedPage?.(PAGE))throw new Error("TVJ-GOF-035 chưa được đăng ký canonical ở Trang 15.");
        try{root.sagsTvjSyncAccountIdentity?.()}catch(_){}
        try{if(typeof persist==="function")persist()}catch(_){}
        const fileName=filename(kind);
        try{v479ReleasePreparedUrl()}catch(_){}
        preparedPdfFile=null;preparedPdfName=fileName;
        openExportModal("Đang tạo PDF TVJ-GOF-035...");
        window.__SAGS_EXPORT_BATCH_DRAWN=true;
        const pages=[];
        if(kind===GROUP||kind==="all"){
          setExportStatus("Đang dựng TVJ-GOF-035 từ nền gốc + tọa độ Form Manager...");
          try{root.sagsTvjSyncAccountIdentity?.();root.draw?.()}catch(_){}
          pages.push(await renderReportPage(PAGE));
        }
        if(kind==="bbbt"||kind==="all"){
          setExportStatus("Đang cấp CXR No. và dựng BBBT...");
          pages.push(await renderBbbtWithNumber());
          if(typeof getBBBTAttachments==="function"&&getBBBTAttachments().length&&typeof renderBBBTAttachmentPage==="function"){
            setExportStatus("Đang thêm BBBT-Pic...");
            pages.push(await renderBBBTAttachmentPage());
          }
        }
        if(!pages.length)throw new Error("Không có trang để xuất.");
        setExportStatus("Đang hoàn tất PDF...");
        preparedPdfFile=await canvasesToPdfFile(pages,fileName);
        preparedPdfName=fileName;
        for(const c of pages){try{c.width=1;c.height=1}catch(_){}}
        window.__SAGS_EXPORT_BATCH_DRAWN=false;
        window.__SAGS_SUPPRESS_BBBT_CXR_ON_RENDER=false;
        if(kind==="bbbt"||kind==="all"){try{v481DeferredPersistAfterPdf?.()}catch(_){}}
        v479ShowPreparedButtons();
        if(typeof root.v452IsDesktopExportDevice==="function"&&root.v452IsDesktopExportDevice()){
          setExportStatus("PDF đã tạo xong. Đang tự tải file về máy tính...");
          const ok=typeof root.v452DesktopDownloadPrepared==="function"&&root.v452DesktopDownloadPrepared();
          if(!ok)setExportStatus("Không tự tải được PDF. Bấm TẢI LẠI PDF để tải thủ công.");
          return;
        }
        setExportStatus(v479CanSharePdf()
          ?"PDF TVJ-GOF-035 đã sẵn sàng. Bấm LƯU / CHIA SẺ hoặc MỞ PDF."
          :"PDF TVJ-GOF-035 đã tạo xong. Bấm MỞ PDF hoặc TẢI PDF.");
      }catch(e){
        window.__SAGS_EXPORT_BATCH_DRAWN=false;
        window.__SAGS_SUPPRESS_BBBT_CXR_ON_RENDER=false;
        preparedPdfFile=null;
        try{v479ReleasePreparedUrl()}catch(_){}
        console.error("TVJ-GOF-035 PDF",e);
        setExportStatus("Không tạo được PDF TVJ-GOF-035: "+String(e?.message||e));
        ["exportShareBtn","exportOpenBtn","exportDownloadBtn"].forEach(id=>{const b=document.getElementById(id);if(b)b.style.display="none"});
      }
    }
    root.sagsTVJExportPdf=exportVz;

    function installExport(){
      if(root.__SAGS_TVJ_GOF_035_EXPORT_WRAPPED)return;
      root.__SAGS_TVJ_GOF_035_EXPORT_WRAPPED=true;
      // V6.3.12: TVJ-GOF-035 uses the exact shared exportChoiceModal/sendReport
      // flow from index.html, just like FSAGS 42.3 / 42.1 / 55.1 / 09.
      // Keep sagsTVJExportPdf above only as a compatibility API for old callers;
      // do not override getCurrentExportMainForm, openExportChoiceMenu or sendReport.
    }

    function installPageVisibilityFix(){
      if(root.__SAGS_TVJ_PAGE_VIS_V631)return;
      root.__SAGS_TVJ_PAGE_VIS_V631=true;
      try{
        const base=showFormGroup;
        const fn=function(group,scrollTop=true){
          const g=String(group||"");
          if(g!==GROUP){
            for(let n=1;n<=14;n++){const p=document.getElementById("page"+n);if(p)p.style.display=""}
            const out=base.apply(this,arguments);
            const p15=document.getElementById("page15");if(p15){p15.classList.add("hide");p15.style.display="none"}
            try{document.getElementById("tvjQuickBtn").style.display="none"}catch(_){}
            return out;
          }
          return base.apply(this,arguments);
        };
        showFormGroup=fn;root.showFormGroup=fn;
      }catch(e){console.warn("TVJ visibility fix",e)}
    }

    function install(){
      installPageVisibilityFix();
      installExport();
      root.__SAGS_TVJ_GOF_035_V631_READY={group:GROUP,page:PAGE,pdf:true,archive:true,restore:true};
    }
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(install,260),{once:true});
    else setTimeout(install,260);
    root.addEventListener("pageshow",()=>setTimeout(install,120),{passive:true});
  })(window);
})();

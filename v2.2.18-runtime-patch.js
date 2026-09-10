/* E-REPORT/SAGS V4.2.40 · V2.2.18-REMOVE-FORM-ALIGN-STALE-UI
   One-purpose cleanup: remove any stale form-alignment UI left in an already-open page.
   No editor, no library, no Firebase alignment read/write. */
(function(root){
  "use strict";
  const ids=[
    "sagsAlignLaunch","sagsAlignPanel","sagsAlignAdminCard",
    "sagsAlignLibraryBtn","sagsAlignLibrary","sagsAlignPreview",
    "sagsAlignEditNow","sagsAlignStyle","sagsAlignLibraryStyle"
  ];
  function cleanup(){
    ids.forEach(id=>document.getElementById(id)?.remove());
    document.body?.classList.remove("sagsAlignEditing");
    document.querySelectorAll(".sagsAlignField,.sagsAlignSelected").forEach(el=>{
      el.classList.remove("sagsAlignField","sagsAlignSelected");
      try{el.style.removeProperty("translate")}catch(_){}
      try{delete el.dataset.sagsAlignKey}catch(_){}
    });
    // Remove public hooks from the retired feature if old scripts were already loaded.
    [
      "sagsFormAlignOpen","sagsFormAlignUseStage","sagsFormAlignInfo",
      "sagsFormLibraryOpen","sagsFormLibraryList"
    ].forEach(k=>{try{delete root[k]}catch(_){root[k]=undefined}});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",cleanup,{once:true});
  else cleanup();
  setTimeout(cleanup,300);
})(typeof window==="undefined"?globalThis:window);

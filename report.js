/* E-REPORT/SAGS V4.2.28
   ONE OFFICIAL SHIFT REPORT + QUICK VOICE REPORT PIPELINE
   - AD / DH / ĐH: create, finalize and export Shift Report.
   - Other authenticated operational accounts: Quick Report via voice/photo.
   - Quick reports are stored in the shared incident source and are automatically
     collected by Shift Report through incident_index when TỔNG HỢP is used. */
(function(root){
  "use strict";
  if(root.__SAGS_REPORT_V428)return;
  root.__SAGS_REPORT_V428=true;

  const S=v=>String(v??"").trim();
  const U=v=>S(v).toUpperCase();
  const MANAGER_ROLES=new Set(["AD","DH","ĐH"]);
  const VIEW_ROLES=new Set(["","VIEW","VIEWER"]);

  let wrappedGetter=null, originalGetter=null;

  function normalizeRole(v){return U(v)}
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
        role:normalizeRole(s.role||p.role||p.systemRole),
        profile:p
      };
    };
    root.__sagsGetSession=wrappedGetter;
    return true;
  }

  function session(){
    ensureSessionBridge();
    let s={};
    try{s=root.__sagsGetSession?.()||{}}catch(_){}
    const p=s.profile||{};
    return {
      username:S(root.currentUserProfile?.username||s.username||p.username||p.userName||p.login||p.account),
      role:normalizeRole(root.currentRole||s.role||p.role||p.systemRole),
      profile:p
    };
  }

  function loggedIn(){return !!session().username}
  function canQuickReport(){
    const s=session();
    return !!s.username&&!VIEW_ROLES.has(s.role);
  }
  function canOfficialReport(){
    const s=session();
    return !!s.username&&MANAGER_ROLES.has(s.role);
  }

  function openOfficialReport(){
    ensureSessionBridge();
    if(!canOfficialReport()){
      try{alert("Chỉ tài khoản AD hoặc ĐH được phép lập, chốt và xuất BÁO CÁO CA.")}catch(_){}
      return;
    }
    if(typeof root.sagsShiftOpen!=="function"){
      try{alert("BÁO CÁO CA chưa nạp xong. Vui lòng mở lại chức năng.")}catch(_){}
      return;
    }
    return root.sagsShiftOpen();
  }

  function openQuickReport(){
    ensureSessionBridge();
    if(!canQuickReport()){
      try{alert("Tài khoản hiện tại chưa được phép gửi BÁO CÁO NHANH.")}catch(_){}
      return;
    }
    if(typeof root.sagsQuickOpen!=="function"){
      try{alert("BÁO CÁO NHANH chưa nạp xong. Vui lòng mở lại chức năng.")}catch(_){}
      return;
    }
    return root.sagsQuickOpen();
  }

  /* Legacy callers from cached UI all route to the one official report.
     There is no second day/night report anymore. */
  root.v1171OpenDayReport=openOfficialReport;
  root.v1171OpenNightReport=openOfficialReport;

  function normText(v){
    return U(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/Đ/g,"D");
  }

  function setMenuLabel(btn,label,icon,meta){
    if(!btn)return;
    const spans=btn.querySelectorAll("span");
    if(spans[0]&&icon)spans[0].textContent=icon;
    if(spans[1])spans[1].textContent=label;
    if(spans[2]&&meta!==undefined)spans[2].textContent=meta;
    if(!spans.length)btn.textContent=label;
  }

  function createReportSection(body){
    const section=document.createElement("section");
    section.className="v157Section";
    section.dataset.sagsReportSection="1";
    section.innerHTML='<h3 class="v157SectionTitle">BÁO CÁO ĐIỀU HÀNH</h3>';
    const system=[...body.querySelectorAll(".v157Section")].find(sec=>
      normText(sec.querySelector(".v157SectionTitle")?.textContent).includes("HE THONG")
    );
    if(system)body.insertBefore(section,system);
    else body.appendChild(section);
    return section;
  }

  function ensureQuickMenu(){
    const body=document.getElementById("v157MenuBody");
    if(!body||!canQuickReport())return;

    let section=[...body.querySelectorAll(".v157Section")].find(sec=>
      normText(sec.querySelector(".v157SectionTitle")?.textContent).includes("BAO CAO DIEU HANH")
    );
    if(!section)section=createReportSection(body);

    let btn=section.querySelector('[data-sags-quick-report="1"]');
    if(!btn){
      btn=document.createElement("button");
      btn.type="button";
      btn.className="v157MenuItem";
      btn.dataset.sagsQuickReport="1";
      btn.innerHTML='<span class="ico">🎤</span><span>Báo cáo nhanh</span><span class="meta">Nói · ảnh · gửi nguồn chung</span>';
      btn.onclick=()=>{
        try{document.getElementById("v157DrawerBackdrop")?.click()}catch(_){}
        openQuickReport();
      };
      section.appendChild(btn);
    }
  }

  function reconcileDrawer(){
    const shift=document.querySelector('[data-v157-key="shift"]');
    const night=document.querySelector('[data-v157-key="night"]');

    if(shift){
      if(canOfficialReport()){
        shift.hidden=false;
        setMenuLabel(shift,"Báo cáo ca","▤","Chốt · xuất file");
        shift.setAttribute("aria-label","Báo cáo ca");
        shift.title="Báo cáo khai thác ca trực";
      }else{
        shift.remove();
      }
    }
    if(night)night.remove();

    ensureQuickMenu();

    // Remove any other legacy report controls that older cached code can recreate.
    document.querySelectorAll('button,a,[role="button"]').forEach(el=>{
      if(el.id==="srOpen"||el.id==="v157ReportBtn"||el.dataset?.sagsQuickReport==="1")return;
      if(el.matches?.('[data-v157-key="shift"]'))return;
      const t=normText(el.textContent);
      if(
        t.includes("GIAO BAN NGAY")||
        t.includes("BAO CAO BAY DEM")||
        t.includes("BAO CAO CHIEU DEM")||
        t.includes("BAO CAO TINH HINH PHUC VU BAY CHIEU DEM")
      )el.remove();
    });
  }

  /* ---------- Direct voice entry inside the official Shift Report ---------- */
  let activeVoice=null;

  function stopVoice(abort=false){
    if(!activeVoice)return;
    const v=activeVoice;
    activeVoice=null;
    try{abort?v.rec.abort():v.rec.stop()}catch(_){}
    try{v.btn.classList.remove("listening");v.btn.textContent="🎤 NÓI"}catch(_){}
  }

  function voiceCtor(){
    return root.SpeechRecognition||root.webkitSpeechRecognition||null;
  }

  function startVoice(textarea,btn){
    if(!canOfficialReport())return;
    const Ctor=voiceCtor();
    if(!Ctor){
      alert("Trình duyệt chưa hỗ trợ nhận giọng nói. Có thể dùng micro trên bàn phím điện thoại để nhập.");
      return;
    }
    if(activeVoice){stopVoice(false);return}

    const rec=new Ctor();
    rec.lang="vi-VN";
    rec.continuous=true;
    rec.interimResults=false;
    const base=S(textarea.value);
    let additions=[];

    rec.onresult=e=>{
      for(let i=e.resultIndex;i<e.results.length;i++){
        if(e.results[i].isFinal){
          const t=S(e.results[i][0]?.transcript);
          if(t)additions.push(t);
        }
      }
      const extra=additions.join(" ").trim();
      textarea.value=base+(base&&extra?" ":"")+extra;
      textarea.dispatchEvent(new Event("input",{bubbles:true}));
    };
    rec.onerror=e=>{
      if(e.error!=="aborted"&&e.error!=="no-speech"){
        try{alert("Không nhận được giọng nói. Có thể dùng micro bàn phím để nhập.")}catch(_){}
      }
    };
    rec.onend=()=>{
      if(activeVoice?.rec===rec){
        activeVoice=null;
        btn.classList.remove("listening");
        btn.textContent="🎤 NÓI";
      }
    };
    activeVoice={rec,btn};
    btn.classList.add("listening");
    btn.textContent="■ DỪNG";
    try{rec.start()}catch(_){stopVoice(true)}
  }

  const VOICE_FIELDS=[
    ["srChanges","🎤 NÓI · THAY ĐỔI KHAI THÁC"],
    ["srIncidentNote","🎤 NÓI · DIỄN BIẾN / XỬ LÝ"],
    ["srHandover","🎤 NÓI · BÀN GIAO"],
    ["srAdvice","🎤 NÓI · KIẾN NGHỊ"]
  ];

  function installShiftVoice(){
    if(!canOfficialReport())return;
    for(const [id,label] of VOICE_FIELDS){
      const ta=document.getElementById(id);
      if(!ta||ta.dataset.sagsVoiceReady==="1")continue;
      ta.dataset.sagsVoiceReady="1";
      const b=document.createElement("button");
      b.type="button";
      b.className="srVoiceBtn";
      b.textContent="🎤 NÓI";
      b.title=label;
      b.setAttribute("aria-label",label);
      b.onclick=()=>startVoice(ta,b);
      ta.insertAdjacentElement("afterend",b);
    }
  }

  /* ---------- Quick Report: explain shared aggregation and retire old form bridge ---------- */
  function reconcileQuickModal(){
    const modal=document.getElementById("qiModal");
    if(!modal)return;

    const title=document.getElementById("qiTitle");
    if(title)title.textContent="BÁO CÁO NHANH · NÓI / ẢNH";

    const send=document.getElementById("qiSend");
    if(send&&!document.getElementById("qiSharedReportNote")){
      const note=document.createElement("div");
      note.id="qiSharedReportNote";
      note.className="qiSharedReportNote";
      note.innerHTML="<b>NGUỒN CHUNG BÁO CÁO CA</b><span>GỬI NỘI DUNG + LINK sẽ lưu báo cáo nhanh vào hồ sơ chung. AD/ĐH lấy nội dung này khi bấm TỔNG HỢP trong BÁO CÁO CA rồi rà soát, chốt và xuất file.</span>";
      send.closest(".qiActions")?.insertAdjacentElement("beforebegin",note);
    }

    // The old Quick Incident UI offered "ĐƯA NỘI DUNG VÀO BÁO CÁO"
    // by searching legacy #v1171Form. That form is retired. Shift Report now
    // reads incident_index automatically, so remove only this obsolete manual bridge.
    document.querySelectorAll("#qiEvents article").forEach(card=>{
      [...card.querySelectorAll("button")].forEach(b=>{
        if(normText(b.textContent).includes("DUA NOI DUNG VAO BAO CAO")){
          const sel=b.previousElementSibling;
          if(sel?.tagName==="SELECT")sel.remove();
          b.remove();
          if(!card.querySelector(".qiAutoAggregate")){
            const p=document.createElement("p");
            p.className="qiAutoAggregate";
            p.textContent="✓ Đã nằm trong nguồn chung để BÁO CÁO CA tự tổng hợp.";
            card.appendChild(p);
          }
        }
      });
    });
  }

  function reconcileOfficialUi(){
    const srOpen=document.getElementById("srOpen");
    if(srOpen){
      srOpen.hidden=!canOfficialReport();
      srOpen.style.display=canOfficialReport()?"":"none";
    }
    const homeReport=document.getElementById("v157ReportBtn");
    if(homeReport){
      homeReport.textContent=canOfficialReport()?"Mở báo cáo ca →":"Báo cáo nhanh →";
      homeReport.onclick=()=>canOfficialReport()?openOfficialReport():openQuickReport();
    }
    if(!canOfficialReport()){
      document.getElementById("srModal")?.setAttribute("data-not-authorized","1");
    }else{
      installShiftVoice();
    }
  }

  function reconcileAll(){
    ensureSessionBridge();
    document.getElementById("v1171ReportModal")?.remove();
    reconcileDrawer();
    reconcileOfficialUi();
    reconcileQuickModal();
  }

  // Capture phase enforces role before old target handlers run.
  document.addEventListener("click",function(ev){
    ensureSessionBridge();
    const el=ev.target?.closest?.('button,a,[role="button"]');
    if(!el)return;

    const official=
      el.id==="srOpen"||
      el.matches?.('[data-v157-key="shift"]');

    if(official&&!canOfficialReport()){
      ev.preventDefault();
      ev.stopImmediatePropagation();
      alert("Chỉ tài khoản AD hoặc ĐH được phép lập, chốt và xuất BÁO CÁO CA. Tài khoản này có thể dùng BÁO CÁO NHANH.");
      return;
    }

    if(el.matches?.('[data-v157-key="night"]')){
      ev.preventDefault();
      ev.stopImmediatePropagation();
      el.remove();
      return;
    }

    if(el.dataset?.sagsQuickReport==="1"){
      ensureSessionBridge();
    }
  },true);

  let queued=false;
  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      reconcileAll();
    });
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",reconcileAll,{once:true});
  }else{
    reconcileAll();
  }

  new MutationObserver(schedule).observe(document.documentElement,{
    childList:true,
    subtree:true
  });

  ["sags:login","sags:rolechange","sags:profilechange","sags:ui-ready"].forEach(name=>{
    root.addEventListener?.(name,schedule);
  });

  // Small non-sensitive diagnostics for support.
  root.sagsReportPermissionCheck=function(){
    const s=session();
    return {
      loggedIn:!!s.username,
      role:s.role||"",
      quickReport:canQuickReport(),
      officialShiftReport:canOfficialReport()
    };
  };
})(typeof window!=="undefined"?window:globalThis);

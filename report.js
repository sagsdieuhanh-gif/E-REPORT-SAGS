/* E-REPORT/SAGS V4.2.30
   SIMPLE & DIRECT REPORT UI
   - Keep role model from V4.2.28
   - Simplify official Shift Report and Quick Report screens
   - Remove legacy day/night report entries
   - Keep Quick Report as source input, Official Shift Report as finalize/export */
(function(root){
  "use strict";
  if(root.__SAGS_REPORT_V430)return;
  root.__SAGS_REPORT_V430=true;

  const $=id=>document.getElementById(id);
  const S=v=>String(v??"").trim();
  const U=v=>S(v).toUpperCase();
  const MANAGER_ROLES=new Set(["AD","DH","ĐH"]);
  const VIEW_ROLES=new Set(["","VIEW","VIEWER"]);

  let wrappedGetter=null, originalGetter=null;

  function normText(v){
    return U(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/Đ/g,"D");
  }

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

  function session(){
    ensureSessionBridge();
    let s={};
    try{s=root.__sagsGetSession?.()||{}}catch(_){}
    const p=s.profile||{};
    return {
      username:S(root.currentUserProfile?.username||s.username||p.username||p.userName||p.login||p.account),
      role:U(root.currentRole||s.role||p.role||p.systemRole),
      profile:p
    };
  }

  function canQuickReport(){
    const s=session();
    return !!s.username && !VIEW_ROLES.has(s.role);
  }
  function canOfficialReport(){
    const s=session();
    return !!s.username && MANAGER_ROLES.has(s.role);
  }

  function openOfficialReport(){
    ensureSessionBridge();
    if(!canOfficialReport()){
      try{alert("Chỉ tài khoản AD hoặc ĐH/DH được phép lập, chốt và xuất BÁO CÁO CA.")}catch(_){}
      return;
    }
    if(typeof root.sagsShiftOpen==="function")return root.sagsShiftOpen();
    try{alert("BÁO CÁO CA chưa nạp xong. Vui lòng mở lại chức năng.")}catch(_){}
  }

  function openQuickReport(){
    ensureSessionBridge();
    if(!canQuickReport()){
      try{alert("Tài khoản hiện tại chưa được phép gửi BÁO CÁO NHANH.")}catch(_){}
      return;
    }
    if(typeof root.sagsQuickOpen==="function")return root.sagsQuickOpen();
    try{alert("BÁO CÁO NHANH chưa nạp xong. Vui lòng mở lại chức năng.")}catch(_){}
  }

  // All old entry points now route to the ONE official report only.
  root.v1171OpenDayReport=openOfficialReport;
  root.v1171OpenNightReport=openOfficialReport;

  function setMenuLabel(btn,label,icon,meta){
    if(!btn)return;
    const spans=btn.querySelectorAll("span");
    if(spans[0]&&icon)spans[0].textContent=icon;
    if(spans[1])spans[1].textContent=label;
    if(spans[2]&&meta!==undefined)spans[2].textContent=meta;
    if(!spans.length)btn.textContent=label;
  }

  function ensureQuickMenu(){
    const body=$("v157MenuBody");
    if(!body || !canQuickReport())return;

    let section=[...body.querySelectorAll(".v157Section")].find(sec=>
      normText(sec.querySelector(".v157SectionTitle")?.textContent).includes("BAO CAO DIEU HANH")
    );
    if(!section){
      section=document.createElement("section");
      section.className="v157Section";
      section.dataset.sagsReportSection="1";
      section.innerHTML='<h3 class="v157SectionTitle">BÁO CÁO ĐIỀU HÀNH</h3>';
      body.appendChild(section);
    }

    let btn=section.querySelector('[data-sags-quick-report="1"]');
    if(!btn){
      btn=document.createElement("button");
      btn.type="button";
      btn.className="v157MenuItem";
      btn.dataset.sagsQuickReport="1";
      btn.innerHTML='<span class="ico">🎤</span><span>Báo cáo nhanh</span><span class="meta">nói · ảnh · gửi nguồn chung</span>';
      btn.onclick=()=>{
        try{$("v157DrawerBackdrop")?.click()}catch(_){}
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
        setMenuLabel(shift,"Báo cáo ca","▤","tổng hợp · chốt · xuất file");
        shift.setAttribute("aria-label","Báo cáo ca");
        shift.title="Báo cáo khai thác ca trực";
      }else shift.remove();
    }
    if(night)night.remove();
    ensureQuickMenu();

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

  function card(title,sub){
    const wrap=document.createElement("section");
    wrap.className="sgrCard";
    const head=document.createElement("div");
    head.className="sgrCardHead";
    const h=document.createElement("h3");
    h.textContent=title;
    head.appendChild(h);
    if(sub){
      const p=document.createElement("p");
      p.textContent=sub;
      head.appendChild(p);
    }
    const body=document.createElement("div");
    body.className="sgrCardBody";
    wrap.append(head,body);
    return {wrap,body};
  }

  function move(body, items){
    items.filter(Boolean).forEach(el=>body.appendChild(el));
  }

  function makeDetails(summaryText, className="sgrFold"){
    const d=document.createElement("details");
    d.className=className;
    const s=document.createElement("summary");
    s.textContent=summaryText;
    d.appendChild(s);
    return d;
  }

  function simplifyShiftUi(){
    const panel=document.querySelector("#srModal .srPanel");
    if(!panel || panel.dataset.sgrSimpleReady==="1")return;
    panel.dataset.sgrSimpleReady="1";

    const header=panel.querySelector("header");
    const busy=$("srBusy");
    const help=panel.querySelector("details");
    const grid=panel.querySelector(".srGrid");
    const archive=$("srArchive")?.closest("label");
    const actions=panel.querySelectorAll(".srActions");
    const actionsLoad=actions[0];
    const status=$("srStatus");
    const results=$("srResults");
    const editable=$("srEditable");
    const actionsFinal=actions[1];
    const preview=$("srPreviewBody");
    const hr=panel.querySelector("hr");
    const histTitle=hr?.nextElementSibling;
    const histLabel=histTitle?.nextElementSibling;
    const histBtn=histLabel?.nextElementSibling;
    const histBox=histBtn?.nextElementSibling;

    if(help) help.open=false;
    if($("srLoad")) $("srLoad").textContent="LẤY DỮ LIỆU";
    if($("srIncident")) $("srIncident").textContent="BÁO CÁO NHANH";
    if($("srFinalize")) $("srFinalize").textContent="CHỐT BÁO CÁO";
    if($("srPreview")) $("srPreview").textContent="XEM BẢN GỬI";
    if($("srPrint")) $("srPrint").textContent="IN / PDF";
    if($("srSave")) $("srSave").textContent="LƯU NHÁP";
    if($("srUpdate")) $("srUpdate").textContent="TẠO UPDATE";
    if($("srNew")) $("srNew").textContent="MỚI";
    if($("srCopy")) $("srCopy").textContent="SAO CHÉP";
    if($("srShare")) $("srShare").textContent="CHIA SẺ";
    if($("srDownload")) $("srDownload").textContent="TẢI TXT";

    const shell=document.createElement("div");
    shell.className="sgrShell";

    const intro=document.createElement("div");
    intro.className="sgrIntro";
    intro.innerHTML='<b>BÁO CÁO CA · GỌN & DỄ LÀM</b><span>Chỉ còn 4 bước: chọn thời gian → lấy dữ liệu → bổ sung nội dung → chốt / xuất file.</span>';
    shell.appendChild(intro);

    const steps=document.createElement("div");
    steps.className="sgrSteps";
    ["1. Thời gian","2. Dữ liệu","3. Nội dung","4. Xuất file"].forEach(t=>{
      const item=document.createElement("div");
      item.className="sgrStep";
      item.textContent=t;
      steps.appendChild(item);
    });
    shell.appendChild(steps);

    const c1=card("Bước 1 · Chọn ca / khoảng thời gian","Chọn nhanh ca trực rồi lấy dữ liệu.");
    const helpFold=makeDetails("Hướng dẫn nhanh");
    if(help) helpFold.appendChild(help);
    move(c1.body,[helpFold,grid,archive]);

    const c2=card("Bước 2 · Lấy dữ liệu & kiểm tra số liệu","Bấm LẤY DỮ LIỆU. Nếu có báo nhanh trong nguồn chung, báo cáo sẽ tự đọc khi tổng hợp.");
    move(c2.body,[actionsLoad,status,results]);

    const c3=card("Bước 3 · Bổ sung nội dung báo cáo","Nhập ngắn gọn các ý chính. Có thể dùng nút micro ngay dưới từng ô.");
    move(c3.body,[editable]);

    const c4=card("Bước 4 · Chốt / xem bản gửi / xuất file","Dùng 3 nút chính bên dưới. Các thao tác khác nằm trong mục nâng cao.");
    const primary=document.createElement("div");
    primary.className="sgrPrimaryRow";
    [$("srPreview"),$("srFinalize"),$("srPrint")].filter(Boolean).forEach(b=>primary.appendChild(b));

    const extra=makeDetails("Tác vụ nâng cao");
    extra.open=false;
    const extraRow=document.createElement("div");
    extraRow.className="sgrSecondaryRow";
    [$("srSave"),$("srUpdate"),$("srNew"),$("srCopy"),$("srShare"),$("srDownload")].filter(Boolean).forEach(b=>extraRow.appendChild(b));
    extra.appendChild(extraRow);

    move(c4.body,[busy,primary,extra,preview]);

    const hist=makeDetails("Lịch sử báo cáo đã chốt / UPDATE","sgrFold sgrHistory");
    hist.open=false;
    move(hist,[histLabel,histBtn,histBox]);

    [c1.wrap,c2.wrap,c3.wrap,c4.wrap,hist].forEach(x=>shell.appendChild(x));

    // Clean the panel and rebuild in a simpler order.
    const nodes=[busy,help,grid,archive,actionsLoad,status,results,editable,actionsFinal,preview,hr,histTitle,histLabel,histBtn,histBox];
    nodes.forEach(n=>{ try{ if(n&&n.parentNode===panel)n.remove(); }catch(_){} });
    if(header) header.insertAdjacentElement("afterend",shell);
    else panel.prepend(shell);
    try{actionsFinal?.remove()}catch(_){}
    try{hr?.remove()}catch(_){}
    try{histTitle?.remove()}catch(_){}
  }

  function simplifyQuickUi(){
    const panel=document.querySelector("#qiModal .qiPanel");
    if(!panel || panel.dataset.sgrQuickReady==="1")return;
    panel.dataset.sgrQuickReady="1";

    const header=panel.querySelector("header");
    const help=panel.querySelector("details");
    const grids=panel.querySelectorAll(".qiGrid");
    const gridMain=grids[0];
    const labelContent=$("qiContent")?.closest("label");
    const speech1=labelContent?.nextElementSibling?.classList?.contains("qiSpeech") ? labelContent.nextElementSibling : null;
    const labelResult=$("qiResult")?.closest("label");
    const speech2=labelResult?.nextElementSibling?.classList?.contains("qiSpeech") ? labelResult.nextElementSibling : null;
    const labelState=$("qiState")?.closest("label");
    const photoActions=$("qiCamera")?.closest(".qiActions");
    const file1=$("qiCameraFile"), file2=$("qiPickFile");
    const photos=$("qiPhotos");
    const photoNote=photos?.nextElementSibling;
    const labelLinks=$("qiLinks")?.closest("label");
    const submitActions=$("qiSave")?.closest(".qiActions");
    const status=$("qiStatus");
    const drafts=panel.querySelector("details:last-of-type");
    const hr=panel.querySelector("hr");
    const sentTitle=hr?.nextElementSibling;
    const gridFilter=sentTitle?.nextElementSibling;
    const loadActions=gridFilter?.nextElementSibling;
    const sentHelp=loadActions?.nextElementSibling;
    const sentBox=$("qiEvents");

    if(help) help.open=false;
    if($("qiTitle")) $("qiTitle").textContent="BÁO CÁO NHANH · NÓI / ẢNH";
    if($("qiSave")) $("qiSave").textContent="LƯU NHÁP";
    if($("qiSend")) $("qiSend").textContent="GỬI NGUỒN CHUNG";
    if($("qiNew")) $("qiNew").textContent="THÊM SỰ VIỆC";
    if($("qiLoad")) $("qiLoad").textContent="XEM ĐÃ GỬI";

    const shell=document.createElement("div");
    shell.className="sgrShell sgrQuickShell";

    const intro=document.createElement("div");
    intro.className="sgrIntro";
    intro.innerHTML='<b>BÁO CÁO NHANH</b><span>Nói hoặc nhập nội dung ngắn gọn → gửi nguồn chung. AD / ĐH sẽ tổng hợp lại trong BÁO CÁO CA để chốt và xuất file.</span>';
    shell.appendChild(intro);

    const c1=card("Bước 1 · Thông tin sự việc","Chọn chuyến hoặc SỰ VIỆC CHUNG rồi nhập nội dung.");
    const helpFold=makeDetails("Hướng dẫn nhanh");
    if(help) helpFold.appendChild(help);
    move(c1.body,[helpFold,gridMain,labelContent,speech1,labelResult,speech2,labelState]);

    const c2=card("Bước 2 · Ảnh / link đính kèm","Ảnh chỉ lưu trên máy. Nếu có MediaFire thì dán link bên dưới.");
    move(c2.body,[photoActions,file1,file2,photos,photoNote,labelLinks]);

    const c3=card("Bước 3 · Lưu / gửi báo cáo nhanh","Bấm GỬI NGUỒN CHUNG để AD/ĐH lấy vào BÁO CÁO CA khi tổng hợp.");
    const note=document.createElement("div");
    note.className="sgrSharedNote";
    note.textContent="Nguồn chung báo cáo ca: sau khi gửi, nội dung nằm trong hồ sơ chung để người có quyền tổng hợp và xuất báo cáo.";
    move(c3.body,[note,submitActions,status]);

    const sent=makeDetails("Nháp trên máy / danh sách đã gửi","sgrFold sgrHistory");
    sent.open=false;
    move(sent,[drafts,gridFilter,loadActions,sentHelp,sentBox]);

    [c1.wrap,c2.wrap,c3.wrap,sent].forEach(x=>shell.appendChild(x));

    [help,gridMain,labelContent,speech1,labelResult,speech2,labelState,photoActions,file1,file2,photos,photoNote,labelLinks,submitActions,status,drafts,hr,sentTitle,gridFilter,loadActions,sentHelp,sentBox].forEach(n=>{
      try{ if(n&&n.parentNode===panel)n.remove(); }catch(_){}
    });
    try{hr?.remove()}catch(_){}
    try{sentTitle?.remove()}catch(_){}
    if(header) header.insertAdjacentElement("afterend",shell);
    else panel.prepend(shell);

    // Remove obsolete "ĐƯA NỘI DUNG VÀO BÁO CÁO" bridge from loaded events cards.
    document.querySelectorAll("#qiEvents article").forEach(card=>{
      [...card.querySelectorAll("button")].forEach(b=>{
        if(normText(b.textContent).includes("DUA NOI DUNG VAO BAO CAO")){
          const prev=b.previousElementSibling;
          if(prev?.tagName==="SELECT")prev.remove();
          b.remove();
          if(!card.querySelector(".sgrAutoUsed")){
            const p=document.createElement("p");
            p.className="sgrAutoUsed";
            p.textContent="✓ Dữ liệu này đã là nguồn chung cho BÁO CÁO CA.";
            card.appendChild(p);
          }
        }
      });
    });
  }

  function reconcileHomeAndToolbar(){
    const srOpen=$("srOpen");
    if(srOpen){
      srOpen.hidden=!canOfficialReport();
      srOpen.style.display=canOfficialReport()?"":"none";
    }
    const homeReport=$("v157ReportBtn");
    if(homeReport){
      homeReport.textContent=canOfficialReport()?"Mở báo cáo ca →":"Báo cáo nhanh →";
      homeReport.onclick=()=>canOfficialReport()?openOfficialReport():openQuickReport();
    }
  }

  function reconcileAll(){
    ensureSessionBridge();
    document.getElementById("v1171ReportModal")?.remove();
    reconcileDrawer();
    reconcileHomeAndToolbar();
    simplifyShiftUi();
    simplifyQuickUi();
  }

  document.addEventListener("click",function(ev){
    ensureSessionBridge();
    const el=ev.target?.closest?.('button,a,[role="button"]');
    if(!el)return;
    const official = el.id==="srOpen" || el.matches?.('[data-v157-key="shift"]');
    if(official && !canOfficialReport()){
      ev.preventDefault();
      ev.stopImmediatePropagation();
      alert("Chỉ AD hoặc ĐH/DH được phép lập, chốt và xuất BÁO CÁO CA. Tài khoản này có thể dùng BÁO CÁO NHANH.");
      return;
    }
    if(el.matches?.('[data-v157-key="night"]')){
      ev.preventDefault(); ev.stopImmediatePropagation(); el.remove(); return;
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
  }else reconcileAll();

  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  ["sags:login","sags:rolechange","sags:profilechange","sags:ui-ready"].forEach(name=>root.addEventListener?.(name,schedule));

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

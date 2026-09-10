/* E-REPORT/SAGS V4.2.33
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

  /* ---------- Smart Voice: de-duplicate, overlap-merge, aviation vocabulary ---------- */
  let activeVoice=null;

  function voiceCtor(){
    return root.SpeechRecognition||root.webkitSpeechRecognition||null;
  }

  function speechKey(v){
    return S(v)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/Đ/g,"D").replace(/đ/g,"d")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g," ")
      .trim();
  }

  function sameWords(a,b){
    if(a.length!==b.length)return false;
    for(let i=0;i<a.length;i++)if(speechKey(a[i])!==speechKey(b[i]))return false;
    return true;
  }

  function collapseSpeechRepeats(text){
    let tokens=S(text).replace(/\s+/g," ").split(" ").filter(Boolean);
    // Browser STT on mobile can return patterns such as
    // "khi kiểm tra khi kiểm tra" or repeated partial phrases.
    for(let pass=0;pass<6;pass++){
      let changed=false;
      for(let i=0;i<tokens.length;i++){
        const max=Math.min(8,Math.floor((tokens.length-i)/2));
        for(let n=max;n>=1;n--){
          const a=tokens.slice(i,i+n),b=tokens.slice(i+n,i+2*n);
          if(sameWords(a,b)){
            tokens.splice(i+n,n);
            changed=true;
            i=Math.max(-1,i-n);
            break;
          }
        }
      }
      if(!changed)break;
    }
    return tokens.join(" ").trim();
  }

  function aviationTerms(text){
    let t=S(text);
    const upper=["apu","gpu","asu","fod","mvt","mva","uld","pax","adl","chd","inf","sta","std","eta","etd"];
    for(const x of upper)t=t.replace(new RegExp(`\\b${x}\\b`,"gi"),x.toUpperCase());
    t=t.replace(/\bpush\s*back\b/gi,"PUSHBACK")
      .replace(/\bchock\s*on\b/gi,"CHOCK ON")
      .replace(/\bchock\s*off\b/gi,"CHOCK OFF")
      .replace(/\bdoor\s*close\b/gi,"DOOR CLOSE")
      .replace(/\bs[\s-]*mod\b/gi,"S-MOD")
      .replace(/\ba\s*\/\s*c\b/gi,"A/C");
    return t.replace(/\s+([,.;:!?])/g,"$1").replace(/\s+/g," ").trim();
  }

  function cleanSpeech(text){
    return aviationTerms(collapseSpeechRepeats(text));
  }

  function mergeSpeech(existing,incoming){
    const current=S(existing),fresh=cleanSpeech(incoming);
    if(!fresh)return current;

    const curTokens=current.split(/\s+/).filter(Boolean);
    const newTokens=fresh.split(/\s+/).filter(Boolean);
    const curKeys=curTokens.map(speechKey),newKeys=newTokens.map(speechKey);
    const recent=curKeys.slice(-40).join(" "),wholeNew=newKeys.join(" ");
    if(wholeNew&&recent.includes(wholeNew))return current;

    const max=Math.min(16,curKeys.length,newKeys.length);
    let overlap=0;
    for(let n=max;n>=1;n--){
      if(curKeys.slice(-n).join(" ")===newKeys.slice(0,n).join(" ")){
        overlap=n;break;
      }
    }
    const add=newTokens.slice(overlap).join(" ").trim();
    if(!add)return current;
    return current+(current&&!/\s$/.test(current)?" ":"")+add;
  }

  function alternativeScore(alt){
    const raw=S(alt?.transcript),clean=cleanSpeech(raw);
    if(!clean)return -999;
    const rawN=raw.split(/\s+/).filter(Boolean).length||1;
    const cleanN=clean.split(/\s+/).filter(Boolean).length||1;
    const repetitionLoss=Math.max(0,rawN-cleanN);
    const conf=Number(alt?.confidence||0);
    return (conf>0?conf:0.55)*10 + Math.min(cleanN,14)*0.03 - repetitionLoss*0.35;
  }

  function bestAlternative(result){
    let best=null,score=-Infinity;
    const count=Math.min(result?.length||0,3);
    for(let i=0;i<count;i++){
      const alt=result[i],s=alternativeScore(alt);
      if(s>score){score=s;best=alt}
    }
    return best||result?.[0]||null;
  }

  function restoreVoiceUi(v,message=""){
    clearTimeout(v.silenceTimer);
    clearTimeout(v.maxTimer);
    try{v.field.readOnly=v.wasReadOnly}catch(_){}
    try{
      v.btn.classList.remove("listening");
      v.btn.textContent=v.idleLabel;
      v.btn.setAttribute("aria-pressed","false");
    }catch(_){}
    if(v.hint&&message)v.hint.textContent=message;
  }

  function stopVoice(abort=false,message="Đã dừng. Đọc lại chữ trước khi lưu."){
    if(!activeVoice)return;
    const v=activeVoice;
    activeVoice=null;
    clearTimeout(v.silenceTimer);
    clearTimeout(v.maxTimer);
    try{abort?v.rec.abort():v.rec.stop()}catch(_){}
    restoreVoiceUi(v,message);
  }

  function startSmartVoice(field,btn,hint,permissionFn){
    if(permissionFn&&!permissionFn())return;
    const Ctor=voiceCtor();
    if(!Ctor||!root.isSecureContext){
      if(hint)hint.textContent="Trình duyệt chưa hỗ trợ nhận giọng nói hoặc chưa dùng HTTPS. Có thể dùng micro bàn phím.";
      else alert("Trình duyệt chưa hỗ trợ nhận giọng nói. Có thể dùng micro trên bàn phím điện thoại để nhập.");
      return;
    }
    if(activeVoice){
      if(activeVoice.field===field){stopVoice(false);return}
      stopVoice(true,"Đã chuyển sang ô khác.");
    }
    if(field.disabled||field.readOnly)return;

    const rec=new Ctor();
    rec.lang="vi-VN";
    rec.continuous=true;
    rec.interimResults=true;
    try{rec.maxAlternatives=3}catch(_){}

    const idleLabel=S(btn.dataset.sagsIdleLabel||btn.textContent||"🎤 NÓI");
    btn.dataset.sagsIdleLabel=idleLabel;
    const v={rec,field,btn,hint,idleLabel,wasReadOnly:field.readOnly,silenceTimer:0,maxTimer:0,lastKey:"",lastAt:0};
    activeVoice=v;
    field.readOnly=true;
    btn.classList.add("listening");
    btn.textContent="■ DỪNG";
    btn.setAttribute("aria-pressed","true");
    if(hint)hint.textContent="Đang nghe… nói từng câu ngắn, ngắt nhẹ giữa các ý.";

    const armSilence=()=>{
      clearTimeout(v.silenceTimer);
      v.silenceTimer=setTimeout(()=>{
        if(activeVoice===v)stopVoice(false,"Tự dừng vì đã im lặng. Đọc lại chữ trước khi lưu.");
      },6000);
    };
    armSilence();
    v.maxTimer=setTimeout(()=>{
      if(activeVoice===v)stopVoice(false,"Đã đủ 60 giây. Có thể bấm NÓI để ghi tiếp.");
    },60000);

    rec.onspeechstart=armSilence;
    rec.onresult=e=>{
      if(activeVoice!==v||!field.isConnected)return;
      armSilence();
      let interim="";
      for(let i=e.resultIndex;i<e.results.length;i++){
        const r=e.results[i];
        if(r.isFinal){
          const alt=bestAlternative(r),conf=Number(alt?.confidence||0),text=cleanSpeech(alt?.transcript);
          if(!text)continue;
          // Confidence is not supplied by every browser. Only reject when it is
          // explicitly very low; do not reject valid results whose confidence=0.
          if(conf>0&&conf<0.24){
            if(hint)hint.textContent="Đoạn vừa nói nghe chưa rõ nên chưa thêm. Nói lại chậm hơn một chút.";
            continue;
          }
          const key=speechKey(text),now=Date.now();
          if(key&&key===v.lastKey&&now-v.lastAt<5000)continue;
          const merged=mergeSpeech(field.value,text);
          if(merged!==field.value){
            field.value=merged;
            field.dispatchEvent(new Event("input",{bubbles:true}));
            field.dispatchEvent(new Event("change",{bubbles:true}));
          }
          v.lastKey=key;v.lastAt=now;
          if(hint)hint.textContent="Đã nhận: "+text;
        }else{
          const alt=bestAlternative(r);
          interim=cleanSpeech(alt?.transcript);
        }
      }
      if(interim&&hint)hint.textContent="Đang nghe: "+interim;
    };
    rec.onerror=e=>{
      const msg=({
        "not-allowed":"Chưa được cấp micro. Cho phép micro trong trình duyệt hoặc dùng micro bàn phím.",
        "audio-capture":"Không mở được micro.",
        "network":"Lỗi mạng khi nhận giọng nói. Chữ đã nhận được vẫn được giữ.",
        "no-speech":"Chưa nghe rõ. Bấm NÓI để thử lại."
      })[e.error]||"Nhận giọng nói đã dừng. Chữ đã nhận được vẫn được giữ.";
      if(activeVoice===v)activeVoice=null;
      restoreVoiceUi(v,msg);
    };
    rec.onend=()=>{
      if(activeVoice===v){
        activeVoice=null;
        restoreVoiceUi(v,"Đã dừng. Đọc lại chữ trước khi lưu.");
      }
    };
    try{rec.start()}catch(_){
      if(activeVoice===v)activeVoice=null;
      restoreVoiceUi(v,"Không khởi động được micro. Có thể dùng micro bàn phím.");
    }
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
      if(!ta)continue;
      let b=ta.nextElementSibling?.classList?.contains("srVoiceBtn")?ta.nextElementSibling:null;
      if(!b){
        b=document.createElement("button");
        b.type="button";
        b.className="srVoiceBtn";
        b.textContent="🎤 NÓI";
        b.title=label;
        b.setAttribute("aria-label",label);
        ta.insertAdjacentElement("afterend",b);
      }
      b.dataset.sagsIdleLabel="🎤 NÓI";
      b.onclick=()=>startSmartVoice(ta,b,null,canOfficialReport);
      ta.dataset.sagsVoiceReady="2";
    }
  }

  /* ---------- Quick Report: explain shared aggregation and retire old form bridge ---------- */
  function reconcileQuickModal(){
    const modal=document.getElementById("qiModal");
    if(!modal)return;

    const title=document.getElementById("qiTitle");
    if(title)title.textContent="BÁO CÁO NHANH · NÓI / ẢNH";

    // Replace the V4.2.23 browser speech handler with Smart Voice without
    // changing the Quick Report storage/data flow.
    document.querySelectorAll("#qiModal .qiSpeech").forEach(box=>{
      const field=box.previousElementSibling;
      const b=box.querySelector("button");
      const hint=box.querySelector('[role="status"]');
      if(!field||field.tagName!=="TEXTAREA"||!b)return;
      b.dataset.sagsIdleLabel="🎤 NÓI ĐỂ NHẬP";
      b.dataset.sagsSmartVoice="1";
      if(!b.classList.contains("listening"))b.textContent="🎤 NÓI ĐỂ NHẬP";
      b.onclick=()=>startSmartVoice(field,b,hint,canQuickReport);
      if(hint&&!hint.dataset.sagsSmartHint){
        hint.dataset.sagsSmartHint="1";
        hint.textContent="Nói từng câu ngắn; hệ thống tự lọc đoạn lặp và ghép phần bị chồng.";
      }
    });

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


  /* ---------- Ultra-simple official report: DATE + SHIFT -> EXPORT ---------- */
  function installUltraShiftUi(){
    if(!canOfficialReport())return;
    const panel=document.querySelector("#srModal .srPanel");
    if(!panel)return;

    const title=document.getElementById("srTitle");
    if(title)title.textContent="BÁO CÁO CA";

    // Remove a previous simplified shell if an old runtime happened to create one.
    panel.querySelectorAll(":scope > .sgrShell,:scope > .sgrUltraShell").forEach(el=>el.remove());

    const shell=document.createElement("div");
    shell.className="sgrUltraShell";

    const intro=document.createElement("div");
    intro.className="sgrUltraIntro";
    intro.innerHTML="<b>CHỌN NGÀY + CA → XUẤT PDF</b><span>Hệ thống tự đặt giờ ca, tự đọc nguồn và tự tổng hợp. Không cần nhập TỪ / ĐẾN.</span>";

    const fields=document.createElement("div");
    fields.className="sgrUltraFields";

    const dayLabel=document.createElement("label");
    dayLabel.textContent="NGÀY";
    const day=document.createElement("input");
    day.type="date";
    day.id="sgrUltraDay";
    dayLabel.appendChild(day);

    const shiftLabel=document.createElement("label");
    shiftLabel.textContent="CA";
    const shift=document.createElement("select");
    shift.id="sgrUltraShift";
    shift.add(new Option("CA SÁNG · 08:15–18:15","day"));
    shift.add(new Option("CA TỐI · 18:15–08:15 hôm sau","night"));
    shiftLabel.appendChild(shift);

    fields.append(dayLabel,shiftLabel);

    const exportBtn=document.createElement("button");
    exportBtn.type="button";
    exportBtn.id="sgrUltraExport";
    exportBtn.textContent="TẠO & XUẤT PDF";

    const note=document.createElement("div");
    note.className="sgrUltraNote";
    note.textContent="Báo cáo nhanh / sự việc đã gửi trong nguồn chung sẽ được lấy tự động khi tổng hợp.";

    const visibleStatus=document.createElement("p");
    visibleStatus.id="sgrUltraStatus";
    visibleStatus.setAttribute("role","status");
    visibleStatus.setAttribute("aria-live","polite");

    shell.append(intro,fields,exportBtn,note,visibleStatus);
    panel.querySelector("header")?.insertAdjacentElement("afterend",shell);

    const internalDay=document.getElementById("srDay");
    const internalShift=document.getElementById("srShift");
    const localToday=()=>{
      try{
        return new Intl.DateTimeFormat("en-CA",{
          timeZone:"Asia/Ho_Chi_Minh",year:"numeric",month:"2-digit",day:"2-digit"
        }).format(new Date());
      }catch(_){
        return new Date(Date.now()+7*3600000).toISOString().slice(0,10);
      }
    };
    day.value=internalDay?.value||localToday();
    shift.value=internalShift?.value||"day";

    exportBtn.onclick=async()=>{
      if(exportBtn.disabled)return;
      if(!day.value){
        visibleStatus.textContent="Chọn ngày báo cáo.";
        day.focus();
        return;
      }

      exportBtn.disabled=true;
      exportBtn.textContent="ĐANG TỔNG HỢP…";
      visibleStatus.textContent="Đang chuẩn bị ca và đọc dữ liệu…";

      try{
        ensureSessionBridge();

        // A finalized report restores as locked. Starting another DATE/SHIFT means
        // a new report, so reset the finalized screen automatically.
        const loadBtn=document.getElementById("srLoad");
        const newBtn=document.getElementById("srNew");
        if(loadBtn?.disabled&&typeof newBtn?.onclick==="function"){
          const oldConfirm=root.confirm;
          try{
            root.confirm=()=>true;
            await newBtn.onclick();
          }finally{
            root.confirm=oldConfirm;
          }
        }

        const srDay=document.getElementById("srDay");
        const srShift=document.getElementById("srShift");
        const srPreset=document.getElementById("srPreset");
        const srScope=document.getElementById("srScope");
        const srArchive=document.getElementById("srArchive");
        const srPeople=document.getElementById("srPeople");
        const srLoad=document.getElementById("srLoad");
        const srPrint=document.getElementById("srPrint");
        const srStatus=document.getElementById("srStatus");

        if(!srDay||!srShift||!srPreset||!srLoad||!srPrint){
          throw Error("Mô-đun BÁO CÁO CA chưa nạp đầy đủ.");
        }

        srDay.value=day.value;
        srShift.value=shift.value;

        // Existing preset is the single source of shift boundaries:
        // day 08:15–18:15; night 18:15–08:15 next day.
        if(typeof srPreset.onclick==="function")srPreset.onclick();

        if(srScope)srScope.value="all";
        if(srArchive)srArchive.checked=true;

        const s=session();
        if(srPeople&&!S(srPeople.value)){
          srPeople.value=S(s.profile?.name||s.profile?.fullName||s.username);
          srPeople.dispatchEvent(new Event("input",{bubbles:true}));
        }

        visibleStatus.textContent="Đang tổng hợp đúng thời gian ca…";
        if(typeof srLoad.onclick!=="function")throw Error("Không mở được chức năng tổng hợp.");
        await srLoad.onclick();

        const msg=S(srStatus?.textContent);
        if(/^Chưa hoàn tất:/i.test(msg)){
          visibleStatus.textContent=msg;
          return;
        }

        visibleStatus.textContent=msg||"Đã tổng hợp. Đang mở xuất PDF…";
        exportBtn.textContent="ĐANG MỞ PDF…";

        // Export immediately. The existing print function uses the just-loaded
        // report snapshot and opens the system Print / Save PDF dialog.
        if(typeof srPrint.onclick!=="function")throw Error("Không mở được chức năng xuất PDF.");
        await srPrint.onclick();

        visibleStatus.textContent=(msg?msg+" ":"")+"Đã mở chức năng IN / LƯU PDF.";
      }catch(e){
        visibleStatus.textContent="Chưa hoàn tất: "+S(e?.message||e);
      }finally{
        exportBtn.disabled=false;
        exportBtn.textContent="TẠO & XUẤT PDF";
      }
    };
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
      installUltraShiftUi();
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

    const quickSpeechBox=el.closest?.(".qiSpeech");
    if(quickSpeechBox&&el.tagName==="BUTTON"){
      const field=quickSpeechBox.previousElementSibling;
      if(field?.tagName==="TEXTAREA"){
        ev.preventDefault();
        ev.stopImmediatePropagation();
        startSmartVoice(field,el,quickSpeechBox.querySelector('[role="status"]'),canQuickReport);
        return;
      }
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

  root.addEventListener?.("visibilitychange",()=>{
    if(document.hidden&&activeVoice)stopVoice(true,"Đã dừng micro khi ứng dụng ra nền.");
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


/* E-REPORT/SAGS V1.1.78 · CORRECT REPORT TEMPLATES
   DAY: BÁO CÁO GIAO BAN NGÀY.
   NIGHT: BÁO CÁO TÌNH HÌNH PHỤC VỤ BAY CHIỀU ĐÊM.
   Drafting rule: do not infer unavailable source data. */
(function(root){
  "use strict";
  if(root.__SAGS_REPORT_V1178)return;
  root.__SAGS_REPORT_V1178=true;
  const $=id=>document.getElementById(id);
  const S=v=>String(v??"").trim();
  const U=v=>S(v).toUpperCase();
  const pad=n=>String(n).padStart(2,"0");
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
  const viDate=iso=>{const m=S(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}/${m[2]}/${m[1]}`:S(iso)};
  const viLongDate=iso=>{const m=S(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`ngày ${Number(m[3])} tháng ${Number(m[2])} năm ${m[1]}`:S(iso)};
  const role=()=>{try{return U(root.currentRole||root.__sagsGetSession?.()?.role||"")}catch(_){return ""}};
  const allowed=()=>["AD","DH","ĐH"].includes(role());
  const actor=()=>S(root.currentUserProfile?.name||root.currentUserProfile?.username||"");
  const notify=(type,title,message)=>{
    try{
      if(typeof root.sagsActionPopup==="function"){
        root.sagsActionPopup({type,title,message});
        return;
      }
    }catch(_){}
    try{alert(`${title||"THÔNG BÁO"}${message?`\n\n${message}`:""}`)}catch(_){}
  };
  const get=id=>S($(id)?.value);
  const set=(id,v)=>{if($(id))$(id).value=v??""};
  const lines=v=>S(v).split(/\n+/).map(x=>x.trim()).filter(Boolean);
  const bullet=(v,empty="CHƯA NHẬP")=>{const a=lines(v);return a.length?a.map(x=>x.startsWith("-")?x:`- ${x}`).join("\n"):`- ${empty}`};
  const plain=(v,empty="CHƯA NHẬP")=>S(v)||empty;
  const prefKey=t=>`sagsReport1171_${t}`;
  let type="day";

  function saveDraft(){
    try{
      const p={};
      document.querySelectorAll("#v1171ReportModal [data-v1171]").forEach(el=>p[el.id]=el.value);
      localStorage.setItem(prefKey(type),JSON.stringify(p));
    }catch(_){}
  }
  function loadDraft(){
    try{
      const p=JSON.parse(localStorage.getItem(prefKey(type))||"{}")||{};
      Object.entries(p).forEach(([id,v])=>set(id,v));
    }catch(_){}
  }

  function commonRules(){
    return `<details class="v1171Rules" open><summary>QUY TẮC SOẠN BẮT BUỘC</summary><ul>
      <li>Chỉ ghi dữ liệu có nguồn/xác nhận; không tự suy diễn số chuyến, nguyên nhân delay, giờ Door Close, hành khách, hàng hóa hoặc sự việc.</li>
      <li>Nội dung không phát sinh chỉ ghi <b>NIL</b> khi người lập đã xác nhận thật sự không phát sinh; nếu chưa có dữ liệu thì để trống/CHƯA NHẬP để tiếp tục bổ sung.</li>
      <li>Khi dùng lịch bay để briefing: ưu tiên giờ cập nhật ở cột sau cùng; nếu cột sau cùng trống mới dùng giờ đang hiển thị trong dòng lịch. Dấu “+” là qua ngày.</li>
      <li>Chuyến đến–đi cùng tàu phải xem là một cặp khai thác khi phân tích cao điểm; không cộng tách thành 2 cặp.</li>
      <li>Nội dung phải ngắn, rõ, có số hiệu chuyến/giờ/người phụ trách khi cần; không lặp lại một thông tin ở nhiều mục.</li><li><b>Form DOCX gốc phải giữ nguyên bố cục, bảng, tiêu đề, thứ tự mục và phần ký.</b> Chỉ thay dữ liệu vào đúng vị trí tương ứng.</li>
    </ul></details>`;
  }

  function field(id,label,placeholder="",full=true,rows=3){
    return `<div class="v1171Field${full?" full":""}"><label>${label}</label><textarea id="${id}" data-v1171 rows="${rows}" placeholder="${placeholder}"></textarea></div>`;
  }
  function input(id,label,placeholder="",typeInput="text"){
    return `<div class="v1171Field"><label>${label}</label><input id="${id}" data-v1171 type="${typeInput}" placeholder="${placeholder}"></div>`;
  }

  function dayForm(){
    return `
      <div class="v1171Grid">
        ${input("v1171DayNo","SỐ BÁO CÁO","VD: 235/BCGBN-PĐH")}
        ${input("v1171DayDate","NGÀY","", "date")}
        ${input("v1171DaySigner","TRỰC BAN ĐIỀU HÀNH / NGƯỜI LẬP","Họ tên")}
        ${input("v1171DayUnit","ĐƠN VỊ","PHÒNG ĐH,TL&HDCX")}
        <div class="v1171SectionTitle">1. THÀNH PHẦN THAM GIA</div>
        ${field("v1171DayParticipants","THÀNH PHẦN","Ban TGĐ ...\nPhòng Điều Hành ...\nPhòng PVKT sân đỗ ...\nPhòng PVHK ...")}
        <div class="v1171SectionTitle">2. ĐÁNH GIÁ CHUNG</div>
        ${field("v1171DayLabor","2.1 NỘI QUY LAO ĐỘNG","Phân công nhân sự...\nTrang thiết bị...")}
        ${field("v1171DaySafety","2.2 AN NINH, AN TOÀN","Công tác an ninh, an toàn...\nPCCC...")}
        <div class="v1171SectionTitle">3. THỰC HIỆN NHIỆM VỤ TRỌNG TÂM</div>
        ${field("v1171DayFrequency","3.1 THỐNG KÊ TẦN SUẤT KHAI THÁC","Nhập theo từng hãng: quốc nội đến/đi, quốc tế đến/đi, tổng cộng, so sánh hôm trước",true,5)}
        ${field("v1171DayBridge","3.2 THỐNG KÊ CHUYẾN SAGS VÀO ỐNG LỒNG","Quốc tế / Quốc nội / Tổng; Thang ống / Bãi ngoài")}
        <div class="v1171SectionTitle">4 → 8. TÌNH HÌNH PHỤC VỤ / GIAO BAN</div>
        ${field("v1171DayAbnormal","4. BẤT THƯỜNG TRONG CÔNG TÁC PHỤC VỤ","NIL nếu đã xác nhận không phát sinh")}
        ${field("v1171DayErrors","5. SAI LỖI, ĐIỂM KHÔNG PHÙ HỢP","NIL nếu đã xác nhận không phát sinh")}
        ${field("v1171DayApps","6. CÁC ỨNG DỤNG THUỘC SAGS","SDCS...\nSMIS...")}
        ${field("v1171DayDirectives","7. CHỈ ĐẠO CỦA BAN TỔNG GIÁM ĐỐC","NIL hoặc nội dung chỉ đạo")}
        ${field("v1171DayBrief","8. THÔNG TIN GIAO BAN NGÀY","Các đơn vị đảm bảo an ninh an toàn...")}
        <div class="v1171SectionTitle">9 → 12. THỜI TIẾT / LỊCH BAY / ĐẶC BIỆT</div>
        ${field("v1171DayWeather","9. DỰ BÁO THỜI TIẾT","Chỉ nhập dữ liệu thời tiết có nguồn")}
        ${field("v1171DayMorning","LỊCH BAY SÁNG","Tổng chuyến đến/đi, chuyến delay/hủy, các chuyến cần nêu")}
        ${field("v1171DayEvening","10. LỊCH BAY CHIỀU TỐI","Lịch từ 14:00 đến hết lịch bay")}
        ${field("v1171DayTomorrow","11. LỊCH BAY NGÀY MAI","QN/QT đến/đi, chuyến đầu/cuối, thay đổi giờ nếu có")}
        ${field("v1171DayPeak","11.1 KHUNG CAO ĐIỂM","Nêu khung 60 phút, số cặp khai thác, chuyến trọng điểm")}
        ${field("v1171DaySpecial","12.1 → 12.4 CHUYÊN CƠ / CHT / VIP SVC","VIP A: NIL\nCHT SVC: NIL\nCHT VIP SVC: NIL\nVIP SVC: NIL")}
      </div>`;
  }

  function nightForm(){
    return `
      <div class="v1171Grid">
        ${input("v1171NightDate","NGÀY LẬP BÁO CÁO","", "date")}
        ${input("v1171NightAuthor","TRỰC BAN ĐIỀU HÀNH","Họ tên")}
        ${input("v1171NightFromDate","NGÀY PHỤC VỤ CHIỀU ĐÊM","", "date")}
        ${input("v1171NightToDate","RẠNG SÁNG NGÀY","", "date")}
        <div class="v1171SectionTitle">1. KHÁCH KHAI BÁO MẤT ĐỒ TRONG HLKG</div>
        ${field("v1171NightLostFound","NỘI DUNG","NIL nếu đã xác nhận không phát sinh")}
        <div class="v1171SectionTitle">2. BẤT THƯỜNG TRONG CÔNG TÁC PHỤC VỤ</div>
        ${field("v1171NightAbnormal","NỘI DUNG","NIL nếu đã xác nhận không phát sinh")}
        <div class="v1171SectionTitle">3. SAI LỖI / KPH</div>
        ${field("v1171NightKph","NỘI DUNG","NIL nếu đã xác nhận không phát sinh")}
        <div class="v1171SectionTitle">4. TỔNG HỢP CÔNG TÁC PHỤC VỤ CHIỀU ĐÊM</div>
        ${input("v1171NightWindow","KHUNG THỜI GIAN","VD: từ 1400 - hết chuyến")}
        ${input("v1171NightSource","NGUỒN DỮ LIỆU","VD: theo ảnh khai thác được cung cấp")}
        ${field("v1171NightSummaryTable","BẢNG TỔNG HỢP QN / QT / TỔNG","Nhập đúng theo nguồn, ví dụ:\nQuốc nội | đến 08 | đi 09 | đến delay 08 | đi delay 07\nQuốc tế | đến 13 | đi 15 | đến delay 09 | đi delay 07\nTổng chuyến | đến 21 | đi 24 | đến delay 17 | đi delay 14",true,5)}
        ${field("v1171NightDomesticDelay","LÝ DO DELAY - QUỐC NỘI","Liệt kê từng chuyến đi trễ: Flight, route, STD/ETD, Door Close, số phút chậm. Nếu nguồn không có nguyên nhân delay thì ghi rõ nguồn không thể hiện nguyên nhân.",true,6)}
        ${field("v1171NightInternationalDelay","LÝ DO DELAY - QUỐC TẾ","Liệt kê từng chuyến đi trễ: Flight, route, STD/ETD, Door Close, số phút chậm. Nếu nguồn không có nguyên nhân delay thì ghi rõ nguồn không thể hiện nguyên nhân.",true,6)}
        ${field("v1171NightVipA","4.1 CHUYÊN CƠ VIP A","NIL nếu đã xác nhận")}
        ${field("v1171NightChtSvc","4.2 CHT SVC","NIL nếu đã xác nhận")}
        ${field("v1171NightChtVipSvc","4.3 CHT VIP SVC","NIL nếu đã xác nhận")}
        <div class="v1171SectionTitle">5. TỔNG HỢP LỊCH BAY VÀ TÌNH HÌNH KHAI THÁC NGÀY KẾ TIẾP</div>
        ${field("v1171NightNextDaySummary","NỘI DUNG / GHI CHÚ LỊCH BAY","Có thể ghi chú 'Đính kèm ảnh lịch bay' hoặc tóm tắt theo nguồn. Không tự suy diễn số chuyến.",true,4)}
        <div class="v1171SectionTitle">6. TỪ 04:00 - 07:30</div>
        ${input("v1171NightEarlyQnArr","QN ĐẾN","VD: 00 chuyến")}
        ${input("v1171NightEarlyQnDep","QN ĐI","VD: 00 chuyến")}
        ${input("v1171NightEarlyQtArr","QT ĐẾN","VD: 00 chuyến")}
        ${input("v1171NightEarlyQtDep","QT ĐI","VD: 00 chuyến")}
      </div>`;
  }

  function ensureUi(){
    if($("v1171ReportModal"))return;
    const m=document.createElement("div");m.id="v1171ReportModal";
    m.innerHTML=`<div class="v1171Panel">
      <div class="v1171Top"><h3 id="v1171Title">BÁO CÁO</h3><button class="v1171Close" id="v1171Close">ĐÓNG</button></div>
      <div class="v1171Tabs">
        <button class="v1171Tab" id="v1171TabDay">BÁO CÁO GIAO BAN NGÀY</button>
        <button class="v1171Tab" id="v1171TabNight">BÁO CÁO BAY ĐÊM</button>
      </div>
      ${commonRules()}
      <div id="v1171Form"></div>
      <div class="v1171Actions">
        <button class="v1171Btn" id="v1171Generate">SOẠN THEO MẪU</button>
        <button class="v1171Btn green" id="v1171Copy">SAO CHÉP</button>
        <button class="v1171Btn orange" id="v1171Share">CHIA SẺ</button>
        <button class="v1171Btn gray" id="v1171Save">LƯU</button>
        <button class="v1171Btn v1178DocxBtn" id="v1178OriginalDocx">📄 MẪU DOCX GỐC</button>
      </div>
      <div id="v1171Status"></div>
      <textarea id="v1171Output" spellcheck="false" placeholder="Nội dung báo cáo sẽ xuất hiện tại đây..."></textarea>
    </div>`;
    document.body.appendChild(m);
    $("v1171Close").onclick=()=>{saveDraft();m.style.display="none"};
    m.addEventListener("click",e=>{if(e.target===m){saveDraft();m.style.display="none"}});
    $("v1171TabDay").onclick=()=>open("day");
    $("v1171TabNight").onclick=()=>open("night");
    $("v1171Generate").onclick=generate;
    $("v1171Copy").onclick=copy;
    $("v1171Share").onclick=share;
    $("v1171Save").onclick=save;
    $("v1178OriginalDocx").onclick=()=>{
      if(type!=="night")return alert("Mẫu DOCX gốc này dành cho Báo cáo bay đêm.");
      const a=document.createElement("a");
      a.href="./templates/BAO_CAO_DEM_MAU_GOC.docx";
      a.download="BAO_CAO_DEM_MAU_GOC.docx";
      document.body.appendChild(a);a.click();a.remove();
      $("v1171Status").textContent="✓ Đã xuất đúng file DOCX mẫu gốc.";
      notify("success","ĐÃ XUẤT MẪU DOCX GỐC","File Báo cáo bay đêm giữ nguyên đúng mẫu gốc.");
    };
  }

  function render(){
    ensureUi();
    $("v1171Title").textContent=type==="day"?"BÁO CÁO GIAO BAN NGÀY":"BÁO CÁO TÌNH HÌNH PHỤC VỤ BAY CHIỀU ĐÊM";
    $("v1171TabDay").classList.toggle("active",type==="day");
    $("v1171TabNight").classList.toggle("active",type==="night");
    if($("v1178OriginalDocx"))$("v1178OriginalDocx").style.display=type==="night"?"":"none";
    $("v1171Form").innerHTML=type==="day"?dayForm():nightForm();
    if(type==="day"){
      set("v1171DayDate",today()); set("v1171DayUnit","PHÒNG ĐH,TL&HDCX"); set("v1171DaySigner",actor());
    }else{
      set("v1171NightDate",today());set("v1171NightAuthor",actor());
      if(!get("v1171NightFromDate"))set("v1171NightFromDate",today());
    }
    loadDraft();
    document.querySelectorAll("#v1171Form [data-v1171]").forEach(el=>el.addEventListener("change",saveDraft));
  }

  function open(t){
    if(!allowed())return alert("Chức năng báo cáo hiện dành cho ĐH và AD.");
    type=t;render();$("v1171ReportModal").style.display="flex";$("v1171Status").textContent="";
  }

  function generateDay(){
    const d=get("v1171DayDate");
    const out=[];
    out.push("CTCP PHỤC VỤ MẶT ĐẤT SÀI GÒN-CAM RANH");
    out.push(plain(get("v1171DayUnit"),"PHÒNG ĐH,TL&HDCX"));
    out.push("");
    out.push(`Số: ${plain(get("v1171DayNo"),"____/BCGBN-PĐH")}    Bắc Cam Ranh, ${viLongDate(d)}`);
    out.push("");
    out.push("BÁO CÁO GIAO BAN NGÀY");
    out.push("Kính gửi: - Ban Tổng Giám đốc");
    out.push("          - Thủ trưởng các đơn vị");
    out.push("Phòng ĐH báo cáo tình hình hoạt động phục vụ bay trong ngày như sau:");
    out.push("");
    out.push("1. THÀNH PHẦN THAM GIA");
    out.push(plain(get("v1171DayParticipants")));
    out.push("");
    out.push("2. ĐÁNH GIÁ CHUNG");
    out.push("2.1 Nội quy lao động");
    out.push(bullet(get("v1171DayLabor")));
    out.push("2.2 An ninh, an toàn");
    out.push(bullet(get("v1171DaySafety")));
    out.push("");
    out.push("3. THỰC HIỆN NHIỆM VỤ TRỌNG TÂM");
    out.push("3.1 Thống kê tần suất khai thác");
    out.push(plain(get("v1171DayFrequency")));
    out.push("3.2 Thống kê các chuyến bay SAGS vào ống lồng");
    out.push(plain(get("v1171DayBridge")));
    out.push("");
    [["4. Bất thường trong công tác phục vụ","v1171DayAbnormal"],
     ["5. Sai lỗi, điểm không phù hợp trong phục vụ","v1171DayErrors"],
     ["6. Các ứng dụng thuộc SAGS","v1171DayApps"],
     ["7. Chỉ đạo của Ban Tổng Giám đốc","v1171DayDirectives"],
     ["8. Thông tin giao ban ngày","v1171DayBrief"],
     ["9. Dự báo thời tiết","v1171DayWeather"],
     ["LỊCH BAY SÁNG","v1171DayMorning"],
     ["10. LỊCH BAY CHIỀU TỐI","v1171DayEvening"],
     ["11. LỊCH BAY NGÀY MAI","v1171DayTomorrow"],
     ["11.1 Khung cao điểm","v1171DayPeak"],
     ["12.1 Chuyên cơ VIP A / 12.2 CHT SVC / 12.3 CHT VIP SVC / 12.4 VIP SVC","v1171DaySpecial"]
    ].forEach(([h,id])=>{out.push("");out.push(h);out.push(plain(get(id)))});
    out.push("");
    out.push("Phòng ĐH sẽ cập nhật thông tin và triển khai đến các đơn vị khi có lịch bay thay đổi.");
    out.push("");
    out.push("TRỰC BAN ĐIỀU HÀNH");
    out.push("");
    out.push(plain(get("v1171DaySigner"),"CHƯA NHẬP"));
    return out.join("\n");
  }

  function generateNight(){
    const out=[];
    const reportDate=get("v1171NightDate"),fromDate=get("v1171NightFromDate"),toDate=get("v1171NightToDate");
    out.push("CTCP PHỤC VỤ MẶT ĐẤT");
    out.push("SÀI GÒN - CAM RANH");
    out.push("PHÒNG ĐH,TL&HDCX");
    out.push("");
    out.push(`Bắc Cam Ranh, ${viLongDate(reportDate)}`);
    out.push("");
    out.push("BÁO CÁO TÌNH HÌNH PHỤC VỤ BAY CHIỀU ĐÊM");
    out.push("Kính gửi: Ban Tổng Giám đốc");
    out.push("");
    out.push(`Trực ban Điều hành xin kính gửi báo cáo tình hình phục vụ bay chiều, đêm ${plain(viDate(fromDate))} và rạng sáng ${plain(viDate(toDate))}.`);
    out.push("");
    out.push(`1. Khách khai báo mất đồ trong HLKG: ${plain(get("v1171NightLostFound"))}`);
    out.push(`2. Bất thường trong công tác phục vụ: ${plain(get("v1171NightAbnormal"))}`);
    out.push(`3. Sai lỗi/ KPH: ${plain(get("v1171NightKph"))}`);
    out.push("");
    out.push(`4. Tổng hợp công tác phục vụ chiều đêm ${plain(viDate(fromDate))} (${plain(get("v1171NightWindow"),"từ 1400 - hết chuyến")}, ${plain(get("v1171NightSource"),"theo nguồn được cung cấp")}):`);
    out.push(plain(get("v1171NightSummaryTable")));
    out.push("");
    out.push("Lý do delay");
    out.push("Quốc nội");
    out.push(plain(get("v1171NightDomesticDelay")));
    out.push("");
    out.push("Quốc tế");
    out.push(plain(get("v1171NightInternationalDelay")));
    out.push("");
    out.push(`4.1 CHUYÊN CƠ VIP A: ${plain(get("v1171NightVipA"))}`);
    out.push(`4.2 CHT SVC: ${plain(get("v1171NightChtSvc"))}`);
    out.push(`4.3 CHT VIP SVC: ${plain(get("v1171NightChtVipSvc"))}`);
    out.push("");
    out.push(`5. Tổng hợp lịch bay và tình hình khai thác trong ngày ${plain(viDate(toDate))}`);
    out.push(plain(get("v1171NightNextDaySummary")));
    out.push("");
    out.push(`6. Từ 0400 - 0730: Phục vụ ${plain(get("v1171NightEarlyQnArr"),"00 chuyến")} bay QN đến và ${plain(get("v1171NightEarlyQnDep"),"00 chuyến")} bay QN đi.`);
    out.push(`Phục vụ ${plain(get("v1171NightEarlyQtArr"),"00 chuyến")} bay QT đến và ${plain(get("v1171NightEarlyQtDep"),"00 chuyến")} bay QT đi.`);
    out.push("");
    out.push("TRỰC BAN ĐIỀU HÀNH");
    out.push("");
    out.push(plain(get("v1171NightAuthor")));
    return out.join("\n");
  }

  function generate(){
    saveDraft();
    const text=type==="day"?generateDay():generateNight();
    $("v1171Output").value=text;
    $("v1171Status").textContent="✓ Đã soạn theo đúng mẫu. Hãy rà soát dữ liệu trước khi phát hành.";
    notify("success","ĐÃ SOẠN BÁO CÁO","Đã soạn theo đúng mẫu. Hãy rà soát dữ liệu trước khi phát hành.");
  }
  async function copy(){
    const text=S($("v1171Output")?.value);if(!text)return alert("Chưa có nội dung báo cáo.");
    try{await navigator.clipboard.writeText(text)}catch(_){
      const ta=document.createElement("textarea");ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();
    }
    $("v1171Status").textContent="✓ Đã sao chép.";
    notify("success","ĐÃ SAO CHÉP BÁO CÁO","Nội dung báo cáo đã được sao chép.");
  }
  async function share(){
    const text=S($("v1171Output")?.value);if(!text)return alert("Chưa có nội dung báo cáo.");
    try{
      if(navigator.share){
        await navigator.share({title:type==="day"?"Báo cáo giao ban ngày":"Báo cáo tình hình phục vụ bay chiều đêm",text});
        notify("success","ĐÃ CHIA SẺ BÁO CÁO","Thiết bị đã hoàn tất thao tác chia sẻ.");
      }else await copy();
    }catch(e){
      if(e?.name!=="AbortError")await copy();
    }
  }
  async function save(){
    const text=S($("v1171Output")?.value);if(!text)return alert("Hãy SOẠN THEO MẪU trước.");
    saveDraft();
    try{
      const db=typeof root.initHandoverFirebase==="function"?root.initHandoverFirebase():null;
      if(!db)throw new Error("Firebase chưa sẵn sàng");
      const now=Date.now(),date=type==="day"?get("v1171DayDate"):get("v1171NightDate");
      const id=`REPORT_${type.toUpperCase()}_${S(date).replace(/-/g,"")}_${now}`;
      await db.collection(root.HANDOVER_COLLECTION||"handover").doc(id).set({
        kind:type==="day"?"sags_day_brief_report_v1171":"sags_night_service_report_v1172",
        reportType:type,reportDate:date,text,createdAtMs:now,
        createdByUsername:S(root.currentUserProfile?.username),createdByName:actor(),createdByRole:role()
      },{merge:false});
      $("v1171Status").textContent="✓ Đã lưu báo cáo.";
      notify("success","ĐÃ LƯU BÁO CÁO",`Báo cáo ${type==="day"?"giao ban ngày":"bay đêm"} đã được lưu.`);
    }catch(e){const msg=S(e?.message||e);$("v1171Status").textContent="Không lưu được: "+msg;notify("error","KHÔNG LƯU ĐƯỢC BÁO CÁO",msg)}
  }

  root.v1171OpenDayReport=()=>open("day");
  root.v1171OpenNightReport=()=>open("night");
})(typeof window!=="undefined"?window:globalThis);

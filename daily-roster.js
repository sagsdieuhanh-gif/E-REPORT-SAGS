/* E-REPORT SAGS · DAILY ROSTER AUTO ASSIGN · V1.65 */
(function(root){
  "use strict";

  const BUILD="V1.65-20260819-01";
  const ENGINE="DAILY_ROSTER_V1";
  const MAIL_PATH="roster_mail";
  const MANIFEST_PATH="roster_manifests";
  const PERSON_COLUMNS=["Grnd_Cor","Grnd_Ld","Pax_Supr","Ramp_Supr","Cabin_Clean","Grnd_Ls","Baggage","Cargo","BookingCargo","LIRCargo"];
  const DEFAULT_COLUMNS=["Grnd_Cor"];

  const S=v=>String(v??"").trim();
  const upper=v=>S(v).toUpperCase();
  const normUser=v=>{
    try{ if(typeof normalizePersonalUsername==="function") return normalizePersonalUsername(v); }catch(e){}
    return upper(v).replace(/\s+/g,"").replace(/[^A-Z0-9._-]/g,"_").slice(0,40);
  };
  const safeKey=v=>{
    try{ if(typeof sagsV470Safe==="function") return sagsV470Safe(v); }catch(e){}
    return S(v).replace(/[.#$\[\]\/]/g,"_");
  };
  const esc=v=>S(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  function xmlUnescape(s){
    return S(s)
      .replace(/&#x([0-9a-f]+);/gi,(_,h)=>String.fromCodePoint(parseInt(h,16)))
      .replace(/&#(\d+);/g,(_,d)=>String.fromCodePoint(Number(d)))
      .replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,"&");
  }
  function attrsOf(s){
    const o={};
    String(s||"").replace(/([:\w-]+)="([^"]*)"/g,(_,k,v)=>{o[k]=xmlUnescape(v);return "";});
    return o;
  }
  function colIndex(ref){
    const m=/^([A-Z]+)\d+$/i.exec(S(ref));
    if(!m)return -1;
    let n=0; for(const ch of m[1].toUpperCase()) n=n*26+(ch.charCodeAt(0)-64);
    return n-1;
  }
  function textFromSi(body){
    let out="";
    String(body||"").replace(/<t\b[^>]*>([\s\S]*?)<\/t>/gi,(_,x)=>{out+=xmlUnescape(x);return "";});
    return out;
  }
  async function inflateRaw(u8){
    if(typeof DecompressionStream!=="function") throw new Error("Trình duyệt chưa hỗ trợ giải nén XLSX. Hãy dùng Safari/Chrome mới hoặc lưu roster thành CSV.");
    const ds=new DecompressionStream("deflate-raw");
    const ab=await new Response(new Blob([u8]).stream().pipeThrough(ds)).arrayBuffer();
    return new Uint8Array(ab);
  }
  async function unzipEntries(bytes){
    const u8=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
    const dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength);
    let eocd=-1;
    const from=Math.max(0,u8.length-65557);
    for(let i=u8.length-22;i>=from;i--){ if(dv.getUint32(i,true)===0x06054b50){eocd=i;break;} }
    if(eocd<0)throw new Error("File XLSX không hợp lệ: không tìm thấy ZIP directory.");
    const count=dv.getUint16(eocd+10,true),cdOffset=dv.getUint32(eocd+16,true);
    const decoder=new TextDecoder("utf-8");
    const entries={}; let p=cdOffset;
    for(let n=0;n<count;n++){
      if(dv.getUint32(p,true)!==0x02014b50)throw new Error("File XLSX lỗi central directory.");
      const method=dv.getUint16(p+10,true),compSize=dv.getUint32(p+20,true),nameLen=dv.getUint16(p+28,true),extraLen=dv.getUint16(p+30,true),commentLen=dv.getUint16(p+32,true),localOff=dv.getUint32(p+42,true);
      const name=decoder.decode(u8.subarray(p+46,p+46+nameLen));
      entries[name]={method,compSize,localOff};
      p+=46+nameLen+extraLen+commentLen;
    }
    async function read(name){
      const e=entries[name]; if(!e)return null;
      const q=e.localOff;
      if(dv.getUint32(q,true)!==0x04034b50)throw new Error("File XLSX lỗi local header: "+name);
      const nameLen=dv.getUint16(q+26,true),extraLen=dv.getUint16(q+28,true),start=q+30+nameLen+extraLen;
      const src=u8.subarray(start,start+e.compSize);
      if(e.method===0)return src.slice();
      if(e.method===8)return await inflateRaw(src);
      throw new Error("XLSX dùng kiểu nén chưa hỗ trợ: "+e.method);
    }
    return {entries,read};
  }
  async function parseXlsxBytes(bytes){
    const zip=await unzipEntries(bytes);
    const dec=new TextDecoder("utf-8");
    const readText=async name=>{const b=await zip.read(name);return b?dec.decode(b):"";};
    const workbook=await readText("xl/workbook.xml");
    const rels=await readText("xl/_rels/workbook.xml.rels");
    if(!workbook||!rels)throw new Error("Không đọc được cấu trúc workbook.");

    const sheets=[];
    workbook.replace(/<sheet\b([^>]*)\/?\s*>/gi,(_,a)=>{const x=attrsOf(a);if(x.name&&x["r:id"])sheets.push({name:x.name,rid:x["r:id"]});return "";});
    const wanted=sheets.find(x=>upper(x.name)==="DAILY_ROSTER")||sheets[0];
    if(!wanted)throw new Error("Workbook không có sheet dữ liệu.");

    const relMap={};
    rels.replace(/<Relationship\b([^>]*)\/?\s*>/gi,(_,a)=>{const x=attrsOf(a);if(x.Id&&x.Target)relMap[x.Id]=x.Target;return "";});
    let target=relMap[wanted.rid];
    if(!target)throw new Error("Không xác định được sheet DAILY_ROSTER.");
    target=target.replace(/^\//,"");
    if(!target.startsWith("xl/"))target="xl/"+target.replace(/^\.\//,"");

    const sharedXml=await readText("xl/sharedStrings.xml");
    const shared=[];
    if(sharedXml)sharedXml.replace(/<si\b[^>]*>([\s\S]*?)<\/si>/gi,(_,b)=>{shared.push(textFromSi(b));return "";});
    const sheetXml=await readText(target);
    if(!sheetXml)throw new Error("Không đọc được sheet DAILY_ROSTER.");

    const rows=[];
    sheetXml.replace(/<row\b([^>]*)>([\s\S]*?)<\/row>/gi,(_,ra,body)=>{
      const rattrs=attrsOf(ra),rnum=Number(rattrs.r||rows.length+1),arr=[];
      body.replace(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/gi,(__,ca,cb)=>{
        const a=attrsOf(ca),idx=colIndex(a.r); if(idx<0)return "";
        const inside=cb||"",vm=/<v\b[^>]*>([\s\S]*?)<\/v>/i.exec(inside),raw=vm?xmlUnescape(vm[1]):"";
        let v="";
        if(a.t==="s")v=shared[Number(raw)]??"";
        else if(a.t==="inlineStr")v=textFromSi(inside);
        else if(a.t==="e")v="";
        else if(a.t==="b")v=raw==="1"?"TRUE":"FALSE";
        else v=raw;
        arr[idx]=v; return "";
      });
      rows[rnum-1]=arr; return "";
    });
    return {sheetName:wanted.name,rows};
  }
  function parseCsvText(text){
    const rows=[]; let row=[],cell="",q=false;
    const s=String(text||"");
    for(let i=0;i<s.length;i++){
      const c=s[i];
      if(q){ if(c==='"'&&s[i+1]==='"'){cell+='"';i++;} else if(c==='"')q=false; else cell+=c; }
      else if(c==='"')q=true; else if(c===','){row.push(cell);cell="";} else if(c==='\n'){row.push(cell.replace(/\r$/, ""));rows.push(row);row=[];cell="";} else cell+=c;
    }
    row.push(cell.replace(/\r$/, "")); if(row.some(x=>S(x)))rows.push(row);
    return {sheetName:"CSV",rows};
  }
  async function parseRosterFile(file){
    const name=upper(file?.name||"");
    if(name.endsWith(".CSV"))return parseCsvText(await file.text());
    const buf=await file.arrayBuffer();
    return await parseXlsxBytes(new Uint8Array(buf));
  }

  function headerRowInfo(rows){
    for(let i=0;i<Math.min(rows.length,80);i++){
      const r=rows[i]||[];
      const map={};r.forEach((v,j)=>{const k=S(v);if(k)map[k]=j;});
      if(map.FlightNo!==undefined && (map.STA!==undefined||map.STD!==undefined))return {row:i,map};
    }
    throw new Error("Không tìm thấy hàng tiêu đề có FlightNo / STA / STD.");
  }
  function parseDate(v){
    const s=S(v);if(!s||/^\d+(?:\.\d+)?$/.test(s))return null;
    let m=/^(\d{1,2})[-\/]([A-Za-z]{3}|\d{1,2})[-\/,\s](\d{2,4})$/.exec(s);
    if(m){
      const mons={JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12};
      const d=Number(m[1]),mo=mons[upper(m[2])]||Number(m[2]),y=Number(m[3])+(Number(m[3])<100?2000:0);
      if(d&&mo>=1&&mo<=12)return {iso:`${y}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`,display:`${String(d).padStart(2,"0")}/${String(mo).padStart(2,"0")}/${y}`};
    }
    const d=new Date(s);
    if(Number.isFinite(d.getTime()))return {iso:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`,display:`${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`};
    return null;
  }
  function fmtTime(v){
    let s=S(v);if(!s)return "";
    s=s.replace(/\.0+$/,"");
    if(/^\d{1,4}$/.test(s)){s=s.padStart(4,"0");const h=Number(s.slice(0,2)),m=Number(s.slice(2));if(h<24&&m<60)return `${s.slice(0,2)}:${s.slice(2)}`;}
    const m=/^(\d{1,2}):(\d{2})/.exec(s);if(m&&Number(m[1])<24&&Number(m[2])<60)return `${String(Number(m[1])).padStart(2,"0")}:${m[2]}`;
    return "";
  }
  function splitFlights(raw){
    const parts=upper(raw).replace(/[\/]+/g," ").split(/\s+/).filter(Boolean);
    let prefix="";const out=[];
    for(const p0 of parts){
      const p=p0.replace(/[^A-Z0-9]/g,"");if(!p)continue;
      let m=/^([A-Z0-9]{2,3}?)(\d{1,5})$/.exec(p);
      if(m&&/[A-Z]/.test(m[1])){prefix=m[1];out.push(prefix+m[2]);continue;}
      m=/^(\d{1,5})$/.exec(p);if(m&&prefix){out.push(prefix+m[1]);continue;}
    }
    return [...new Set(out)];
  }
  function routeParts(route){
    const a=upper(route).split(/[-–—>/]+/).map(S).filter(Boolean),i=a.indexOf("CXR");
    if(i>=0)return {route1:a[i-1]||"",route3:a[i+1]||""};
    return {route1:a[0]||"",route3:a[1]||""};
  }
  function usersFromCell(v){
    return [...new Set(upper(v).split(/[\/,;|\n]+/).map(normUser).filter(x=>x&&/^[A-Z][A-Z0-9._-]{1,39}$/.test(x)&&!/^N\/?A$/.test(x)&&!/^\d+$/.test(x)))];
  }
  function hashId(s){
    let h=2166136261>>>0;for(let i=0;i<String(s).length;i++){h^=String(s).charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h.toString(36).toUpperCase();
  }
  function getCell(row,map,key){const i=map[key];return i===undefined?"":S(row?.[i]);}
  function rosterRecords(parsed,selectedColumns,defaultForm){
    const {row:hi,map}=headerRowInfo(parsed.rows||[]),out=[];
    let rosterDate=null;
    for(let i=0;i<Math.min(hi,15);i++)for(const x of (parsed.rows[i]||[])){const d=parseDate(x);if(d){rosterDate=d;break;}if(rosterDate)break;}
    for(let i=hi+1;i<(parsed.rows||[]).length;i++){
      const row=parsed.rows[i]||[],flightRaw=getCell(row,map,"FlightNo");if(!flightRaw)continue;
      const arrDate=parseDate(getCell(row,map,"ArrFlightDate")),depDate=parseDate(getCell(row,map,"DepFlightDate"));
      const opDate=arrDate||depDate||rosterDate;if(!opDate)continue;
      const flights=splitFlights(flightRaw),sta=fmtTime(getCell(row,map,"STA")),std=fmtTime(getCell(row,map,"STD"));
      let arrFlight="",depFlight="";
      if(flights.length>=2){arrFlight=flights[0];depFlight=flights[1];}
      else if(flights.length===1){ if(arrDate||sta)arrFlight=flights[0]; else if(depDate||std)depFlight=flights[0]; }
      const rp=routeParts(getCell(row,map,"Route"));
      const users=[];
      for(const col of selectedColumns||[])for(const u of usersFromCell(getCell(row,map,col)))users.push({username:u,column:col});
      const uniq=[];const seen=new Set();for(const x of users){if(!seen.has(x.username)){seen.add(x.username);uniq.push(x);}}
      if(!uniq.length)continue;
      const base={
        rowNo:i+1,opDate:opDate.iso,date:opDate.display,flightRaw:upper(flightRaw),arrFlight,depFlight,sta,std,
        acReg:upper(getCell(row,map,"ACRegNo")),acType:upper(getCell(row,map,"ACType")),route:upper(getCell(row,map,"Route")),
        route1:rp.route1,route3:rp.route3,bay:S(getCell(row,map,"ParkingBay")),formGroup:defaultForm||"fsags"
      };
      for(const u of uniq){
        const id="RA_"+hashId([base.opDate,base.flightRaw,u.username,base.formGroup].join("|"));
        out.push({...base,assignmentId:id,targetUser:u.username,sourceColumn:u.column});
      }
    }
    return {records:out,headerMap:map,headerRow:hi+1,rosterDate:rosterDate?.iso||""};
  }
  function seedFor(rec){
    const s={};
    if(rec.formGroup==="fsags421"){
      Object.assign(s,{f421_date:rec.date,f421_fltBefore:rec.arrFlight,f421_fltAfter:rec.depFlight,f421_sta:rec.sta,f421_std:rec.std,f421_regn:rec.acReg,f421_acType:rec.acType,f421_route1:rec.route1,f421_route3:rec.route3});
      if(rec.bay){s.f421_bayBefore=rec.bay;s.f421_bayAfter=rec.bay;}
    }else{
      Object.assign(s,{date:rec.date,fltBefore:rec.arrFlight,fltAfter:rec.depFlight,sta:rec.sta,std:rec.std,regn:rec.acReg,acType:rec.acType,route1:rec.route1,route2:"CXR",route3:rec.route3});
      if(rec.bay){s.bayBefore=rec.bay;s.bayAfter=rec.bay;}
    }
    for(const k of Object.keys(s))if(!S(s[k]))delete s[k];
    return s;
  }

  // Pure helpers exposed for validation/tests.
  root.__SAGS_DAILY_ROSTER_TEST__={parseXlsxBytes,parseCsvText,headerRowInfo,parseDate,fmtTime,splitFlights,usersFromCell,rosterRecords,seedFor};
  if(typeof document==="undefined")return;

  let preview=null,mailRef=null,mailCb=null,lastToastSig="";
  function isAD(){try{return upper(currentRole)==="AD";}catch(e){return false;}}
  function ensureUI(){
    if(document.getElementById("dailyRosterModal"))return;
    const style=document.createElement("style");
    style.textContent=`
      #dailyRosterModal{display:none;position:fixed;inset:0;z-index:16050;background:rgba(0,0,0,.52);align-items:center;justify-content:center;padding:12px;box-sizing:border-box;font-family:Arial,sans-serif}
      #dailyRosterModal.show{display:flex}.drPanel{width:min(96vw,960px);max-height:92vh;overflow:auto;background:#fff;border-radius:16px;box-shadow:0 16px 45px rgba(0,0,0,.28);padding:16px;box-sizing:border-box}.drHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.drHead h3{margin:0;color:#0b4f91}.drSub{font-size:13px;color:#5d6875;line-height:1.45;margin:5px 0 12px}.drGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.drField{border:1px solid #d9e1e8;border-radius:11px;padding:10px;background:#f9fbfd}.drField label{display:block;font-size:12px;font-weight:800;color:#29445e;margin-bottom:5px}.drField input,.drField select{width:100%;box-sizing:border-box;padding:9px;border:1px solid #c9d5df;border-radius:8px;background:#fff}.drCols{display:flex;flex-wrap:wrap;gap:7px}.drCheck{display:flex!important;align-items:center;gap:5px;font-size:12px!important;font-weight:700!important;margin:0!important;padding:5px 7px;border:1px solid #d7e0e8;border-radius:8px;background:#fff}.drCheck input{width:auto!important}.drActions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:12px}.drBtn{border:0;border-radius:9px;padding:9px 13px;font-weight:800;cursor:pointer;background:#0b67b2;color:#fff}.drBtn.secondary{background:#eef3f7;color:#31475a;border:1px solid #ccd7df}.drBtn.publish{background:#15803d}.drStatus{margin-top:10px;padding:9px 10px;border-radius:9px;background:#eef6ff;color:#234764;font-size:13px;white-space:pre-wrap}.drStatus.err{background:#fff0f0;color:#9b1c1c}.drTableWrap{overflow:auto;margin-top:10px;border:1px solid #d9e1e8;border-radius:10px;max-height:38vh}.drTable{border-collapse:collapse;width:100%;font-size:12px;white-space:nowrap}.drTable th,.drTable td{border-bottom:1px solid #e5ebf0;padding:7px 8px;text-align:left}.drTable th{position:sticky;top:0;background:#edf5fb;color:#214968;z-index:1}.drBadge{display:inline-block;border-radius:999px;padding:2px 7px;background:#e8f5e9;color:#176b32;font-weight:800;margin:1px}.drEmpty{padding:14px;color:#667}.drToast{position:fixed;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:17000;background:#123d64;color:#fff;border-radius:12px;padding:10px 14px;font:700 13px Arial;box-shadow:0 8px 25px rgba(0,0,0,.25);max-width:min(90vw,520px);text-align:center}
      @media(max-width:650px){.drGrid{grid-template-columns:1fr}.drPanel{padding:12px}.drActions .drBtn{flex:1}}
    `;
    document.head.appendChild(style);
    const m=document.createElement("div");m.id="dailyRosterModal";
    m.innerHTML=`<div class="drPanel"><div class="drHead"><div><h3>📋 DAILY ROSTER · TẠO & PHÂN CÔNG</h3><div class="drSub">AD tải roster Excel. Hệ thống đọc chuyến + giờ + mã nhân viên, gửi biểu mẫu vào mailbox đúng username. Nhân viên đăng nhập sẽ <b>tự nhận biểu mẫu</b>, không cần bấm NHẬN.</div></div><button class="drBtn secondary" onclick="closeDailyRosterManager()">ĐÓNG</button></div>
      <div class="drGrid"><div class="drField"><label>File roster</label><input id="drFile" type="file" accept=".xlsx,.xlsm,.csv"></div><div class="drField"><label>Biểu mẫu tạo sẵn</label><select id="drForm"><option value="fsags">FSAGS 42.3</option><option value="fsags421">FSAGS 42.1</option></select></div></div>
      <div class="drField" style="margin-top:10px"><label>Cột tên nhân viên dùng để phân công</label><div class="drCols" id="drColumns">${PERSON_COLUMNS.map(c=>`<label class="drCheck"><input type="checkbox" value="${c}" ${DEFAULT_COLUMNS.includes(c)?"checked":""}>${c}</label>`).join("")}</div></div>
      <div class="drActions"><button class="drBtn" onclick="dailyRosterReadPreview()">ĐỌC & XEM TRƯỚC</button><button class="drBtn publish" id="drPublishBtn" onclick="dailyRosterPublish()" disabled>TẠO & PHÂN CÔNG</button></div>
      <div class="drStatus" id="drStatus">Chọn file roster để bắt đầu.</div><div id="drPreview"></div></div>`;
    document.body.appendChild(m);
    document.getElementById("drFile")?.addEventListener("change",()=>{preview=null;const b=document.getElementById("drPublishBtn");if(b)b.disabled=true;});
  }
  function ensureButton(){
    const bar=document.querySelector(".toolbar-row.main-actions");if(!bar)return;
    let b=document.getElementById("roleBtnDailyRoster");
    if(!b){b=document.createElement("button");b.id="roleBtnDailyRoster";b.textContent="📋 DAILY ROSTER";b.onclick=()=>openDailyRosterManager();b.style.display="none";const anchor=document.getElementById("roleBtnActivity");if(anchor?.parentNode)anchor.parentNode.insertBefore(b,anchor.nextSibling);else bar.appendChild(b);}
    b.style.display=isAD()?"":"none";
  }
  function setStatus(msg,err=false){const e=document.getElementById("drStatus");if(e){e.textContent=msg;e.classList.toggle("err",!!err);}}
  function selectedColumns(){return [...document.querySelectorAll('#drColumns input[type="checkbox"]:checked')].map(x=>x.value);}
  function renderPreview(data){
    const host=document.getElementById("drPreview");if(!host)return;
    const recs=data.records||[],users=[...new Set(recs.map(x=>x.targetUser))];
    const grouped=new Map();for(const r of recs){const k=r.opDate+"|"+r.flightRaw;if(!grouped.has(k))grouped.set(k,{...r,users:[]});grouped.get(k).users.push(r.targetUser);}
    const rows=[...grouped.values()].slice(0,80);
    host.innerHTML=`<div class="drStatus">Đọc được <b>${grouped.size}</b> dòng chuyến · <b>${recs.length}</b> phân công · <b>${users.length}</b> username.<br>Ngày trong roster: ${esc(data.rosterDate||"không xác định")} · Sheet: ${esc(data.sheetName||"")}</div>${rows.length?`<div class="drTableWrap"><table class="drTable"><thead><tr><th>Ngày</th><th>Flight</th><th>STA</th><th>STD</th><th>A/C</th><th>Route</th><th>Người nhận</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.date)}</td><td><b>${esc(r.flightRaw)}</b></td><td>${esc(r.sta)}</td><td>${esc(r.std)}</td><td>${esc([r.acReg,r.acType].filter(Boolean).join(" / "))}</td><td>${esc(r.route)}</td><td>${[...new Set(r.users)].map(u=>`<span class="drBadge">${esc(u)}</span>`).join(" ")}</td></tr>`).join("")}</tbody></table></div>`:'<div class="drEmpty">Không có phân công phù hợp với các cột đã chọn.</div>'}`;
  }

  root.openDailyRosterManager=function(){if(!isAD()){try{roleDenied?.("Chỉ AD được nhập DAILY ROSTER.");}catch(e){}return;}ensureUI();document.getElementById("dailyRosterModal")?.classList.add("show");};
  root.closeDailyRosterManager=function(){document.getElementById("dailyRosterModal")?.classList.remove("show");};
  root.dailyRosterReadPreview=async function(){
    if(!isAD())return;const file=document.getElementById("drFile")?.files?.[0],cols=selectedColumns();if(!file)return setStatus("Chưa chọn file roster.",true);if(!cols.length)return setStatus("Chọn ít nhất 1 cột tên nhân viên.",true);
    try{setStatus("Đang đọc "+file.name+"…");const parsed=await parseRosterFile(file);const form=S(document.getElementById("drForm")?.value||"fsags");const x=rosterRecords(parsed,cols,form);preview={...x,sheetName:parsed.sheetName,fileName:file.name,columns:cols,formGroup:form};renderPreview(preview);document.getElementById("drPublishBtn").disabled=!preview.records.length;setStatus(`Đã đọc ${preview.records.length} phân công. Kiểm tra bảng xem trước rồi bấm TẠO & PHÂN CÔNG.`);}catch(e){preview=null;document.getElementById("drPublishBtn").disabled=true;setStatus("Không đọc được roster: "+S(e?.message||e),true);}
  };

  async function publishRecords(data){
    const byDate=new Map();for(const r of data.records||[]){if(!byDate.has(r.opDate))byDate.set(r.opDate,[]);byDate.get(r.opDate).push(r);}
    let writes=0,removes=0;
    for(const [opDate,recs] of byDate){
      const manRef=sagsV470Ref(MANIFEST_PATH+"/"+safeKey(opDate));let old={};try{old=(await manRef.once("value")).val()||{};}catch(e){}
      const oldItems=old.items||{},nextItems={},patch={};
      for(const r of recs){
        const payload={engine:ENGINE,schema:1,assignmentId:r.assignmentId,targetUser:r.targetUser,opDate:r.opDate,date:r.date,flightRaw:r.flightRaw,arrFlight:r.arrFlight,depFlight:r.depFlight,sta:r.sta,std:r.std,acReg:r.acReg,acType:r.acType,route:r.route,route1:r.route1,route3:r.route3,bay:r.bay,formGroup:r.formGroup,sourceColumn:r.sourceColumn,sourceFile:data.fileName||"",active:true,publishedAtMs:Date.now(),publishedBy:normUser(currentUserProfile?.username||"AD")};
        patch[`${MAIL_PATH}/${safeKey(r.targetUser)}/items/${safeKey(r.assignmentId)}`]=payload;
        nextItems[r.assignmentId]={user:r.targetUser,flightRaw:r.flightRaw};writes++;
      }
      for(const [id,x] of Object.entries(oldItems)){if(!nextItems[id]&&x?.user){patch[`${MAIL_PATH}/${safeKey(x.user)}/items/${safeKey(id)}`]=null;removes++;}}
      patch[`${MANIFEST_PATH}/${safeKey(opDate)}`]={engine:ENGINE,schema:1,opDate,fileName:data.fileName||"",columns:data.columns||[],formGroup:data.formGroup||"fsags",publishedAtMs:Date.now(),publishedBy:normUser(currentUserProfile?.username||"AD"),items:nextItems};
      await sagsV470Ref("").update(patch);
    }
    return {writes,removes,dates:byDate.size};
  }
  root.dailyRosterPublish=async function(){
    if(!isAD()||!preview?.records?.length)return;const btn=document.getElementById("drPublishBtn");if(btn)btn.disabled=true;
    try{setStatus("Đang tạo mailbox và phân công biểu mẫu…");const r=await publishRecords(preview);setStatus(`✓ Đã phân công ${r.writes} biểu mẫu cho ${r.dates} ngày. Xóa ${r.removes} phân công cũ không còn trong roster.\nNhân viên có username khớp mã roster sẽ tự nhận biểu mẫu.`);}
    catch(e){setStatus("Không phân công được: "+S(e?.message||e),true);}
    finally{if(btn)btn.disabled=false;}
  };

  function opDateMs(iso){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(S(iso));if(!m)return Date.now();return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12,0,0,0).getTime();}
  function sameFlightDate(env,rec){
    const st=env?.state||{},date=S(st.date||st.f421_date),flt=[S(st.fltBefore||st.f421_fltBefore),S(st.fltAfter||st.f421_fltAfter)].filter(Boolean).map(upper);
    const recFlights=[rec.arrFlight,rec.depFlight].filter(Boolean).map(upper);
    return date===rec.date && recFlights.some(f=>flt.includes(f));
  }
  function mergeRosterSeed(env,seed){
    env=env&&typeof env==="object"?env:{};env.state=env.state&&typeof env.state==="object"?env.state:{};const prev=env.rosterSeed||{};
    for(const [k,v] of Object.entries(seed||{})){const cur=S(env.state[k]),old=S(prev[k]);if(!cur||cur===old)env.state[k]=v;}
    env.rosterSeed={...seed};return env;
  }
  function makeRosterLocalId(rec){return "roster-"+hashId(rec.assignmentId+"|"+normUser(rec.targetUser));}
  function autoReceiveOne(rec){
    if(!rec||rec.engine!==ENGINE||rec.active===false)return {ok:false,reason:"INACTIVE"};
    const me=normUser(currentUserProfile?.username||"");if(!me||me!==normUser(rec.targetUser))return {ok:false,reason:"USER"};
    const list=readFlightSessionList();let meta=list.find(x=>S(x.rosterAssignmentId)===S(rec.assignmentId));let id=meta?.id||"";
    if(!id){for(const x of list){const env=readFlightSessionEnvelope(x.id);if(sameFlightDate(env,rec)){meta=x;id=x.id;break;}}}
    const seed=seedFor(rec),now=Date.now();
    if(!id){
      id=makeRosterLocalId(rec);if(list.some(x=>x.id===id))id=id+"-"+Math.random().toString(36).slice(2,6);
      meta={id,name:rec.flightRaw||[rec.arrFlight,rec.depFlight].filter(Boolean).join("/"),customName:true,initialGroup:rec.formGroup||"fsags",arrivalOp:"passenger",departureOp:"passenger",createdAt:opDateMs(rec.opDate),updatedAt:now,rosterAssignmentId:rec.assignmentId,rosterAutoReceived:true,rosterSourceColumn:rec.sourceColumn,rosterOpDate:rec.opDate};
      list.push(meta);writeFlightSessionList(list);
      const env=mergeRosterSeed({state:{},mainForm:meta.initialGroup,activeFormGroup:meta.initialGroup,currentPage:meta.initialGroup==="fsags421"?6:1,scrollY:0,arrivalOp:"passenger",departureOp:"passenger"},seed);
      env.rosterAssignmentId=rec.assignmentId;env.rosterAutoReceived=true;env.rosterReceivedAtMs=now;localStorage.setItem(flightSessionStorageKey(id),JSON.stringify(env));
      return {ok:true,created:true,id};
    }
    meta.rosterAssignmentId=rec.assignmentId;meta.rosterAutoReceived=true;meta.rosterSourceColumn=rec.sourceColumn;meta.rosterOpDate=rec.opDate;meta.updatedAt=now;writeFlightSessionList(list);
    const env=mergeRosterSeed(readFlightSessionEnvelope(id),seed);env.rosterAssignmentId=rec.assignmentId;env.rosterAutoReceived=true;env.rosterReceivedAtMs=env.rosterReceivedAtMs||now;localStorage.setItem(flightSessionStorageKey(id),JSON.stringify(env));
    return {ok:true,created:false,id};
  }
  function showToast(msg){const sig=S(msg);if(!sig||sig===lastToastSig)return;lastToastSig=sig;document.querySelectorAll(".drToast").forEach(x=>x.remove());const e=document.createElement("div");e.className="drToast";e.textContent=msg;document.body.appendChild(e);setTimeout(()=>e.remove(),4500);}
  async function processMailbox(raw){
    const items=Object.values(raw||{}).filter(x=>x&&x.engine===ENGINE&&x.active!==false),created=[];for(const rec of items){try{const r=autoReceiveOne(rec);if(r.ok&&r.created)created.push(rec.flightRaw||rec.arrFlight||rec.depFlight);}catch(e){console.info("Daily roster auto receive",e?.message||e);}}
    if(created.length){showToast(`DAILY ROSTER: đã tự nhận ${created.length} biểu mẫu · ${created.slice(0,3).join(", ")}${created.length>3?"…":""}`);try{window.rampProgressSyncAll?.("ROSTER_AUTO_RECEIVE");}catch(e){}try{renderFlightSessionList?.();}catch(e){}}
  }
  function stopMailbox(){try{if(mailRef&&mailCb)mailRef.off("value",mailCb);}catch(e){}mailRef=null;mailCb=null;}
  function startMailbox(){
    stopMailbox();const me=normUser(currentUserProfile?.username||"");if(!me)return;
    try{mailRef=sagsV470Ref(`${MAIL_PATH}/${safeKey(me)}/items`);mailCb=s=>void processMailbox(s.val()||{});mailRef.on("value",mailCb,e=>console.warn("Daily roster mailbox",e));}catch(e){console.warn("Daily roster mailbox start",e);}
  }
  root.dailyRosterRestartMailbox=startMailbox;

  function applyRole(){ensureUI();ensureButton();}
  const baseApply=root.applyRoleUI;
  if(typeof baseApply==="function")root.applyRoleUI=applyRoleUI=function(){const r=baseApply.apply(this,arguments);setTimeout(applyRole,0);setTimeout(startMailbox,80);return r;};

  setTimeout(()=>{ensureUI();ensureButton();startMailbox();},900);
})(typeof window!=="undefined"?window:globalThis);

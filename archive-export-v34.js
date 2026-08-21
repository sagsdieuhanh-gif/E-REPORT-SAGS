/* E-REPORT/SAGS V3.4 · AD ARCHIVE EXPORT
   - AD only: export selected archived flight sections as PDF.
   - AD only: export/import a working file to continue editing.
   - Imported working files restore editable form data into a NEW local flight session.
     FINAL/CROSSCHECK/KET SO/AUDIT/OPS are reference-only and are never written back as sent revisions.
*/
(function(){
"use strict";
const V34_WORK_FORMAT="E-REPORT-WORKING-FILE";
const V34_WORK_SCHEMA=1;
const V34_REF_PREFIX="sagsWorkingReferenceV34:";
const V34_KINDS=[
  ["ramp","FSAGS / RAMP"],
  ["bbbt","BBBT"],
  ["attachments","ẢNH ĐÍNH KÈM"],
  ["final","FINAL"],
  ["check","ẢNH / LỊCH SỬ CHECK"],
  ["closeout","KẾT SỔ"],
  ["audit","AUDIT / OPS"]
];
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
function clone(x){try{return JSON.parse(JSON.stringify(x));}catch(e){return null;}}
function isAD(){try{return String(currentRole||currentUserProfile?.role||"").toUpperCase()==="AD";}catch(e){return false;}}
function deny(){try{roleDenied?.("Chỉ AD được xuất/nhập hồ sơ.");}catch(e){alert("Chỉ AD được xuất/nhập hồ sơ.");}return false;}
function archive(){try{return window.v488GetArchiveData?.()||null;}catch(e){return null;}}
function flightAt(i){return archive()?.flights?.[Number(i)]||null;}
function safeName(v){return String(v||"HOSO").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Za-z0-9._-]+/g,"_").replace(/^_+|_+$/g,"").slice(0,80)||"HOSO";}
function flightLabel(f){const fs=(f?.identity?.flights||[]).filter(Boolean).join("-")||f?.identity?.flightToken||f?.flightName||f?.sessionMeta?.name||"CHUYEN";const reg=f?.identity?.acRegToken?"_"+f.identity.acRegToken:"";return safeName(fs+reg);}
function dayLabel(f){const s=String(f?.identity?.dateToken||"").replace(/\D/g,"");return /^\d{8}$/.test(s)?`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`:(archive()?.operationalDate||new Date().toISOString().slice(0,10));}
function selectedKinds(i){const root=document.getElementById(`v34ExportPanel_${Number(i)}`);if(!root)return [];return [...root.querySelectorAll('input[data-v34-kind]:checked')].map(x=>x.dataset.v34Kind).filter(Boolean);}
function setPanelStatus(i,text,kind=""){const e=document.getElementById(`v34ExportStatus_${Number(i)}`);if(e){e.textContent=text||"";e.style.color=kind==="err"?"#b42318":kind==="ok"?"#137333":"#52677b";}}
function selectAll(i,on){const root=document.getElementById(`v34ExportPanel_${Number(i)}`);root?.querySelectorAll('input[data-v34-kind]').forEach(x=>x.checked=!!on);}
window.v34SelectAll=selectAll;
function panelHtml(i){
  const checks=V34_KINDS.map(([k,l])=>`<label style="display:flex;gap:7px;align-items:center;border:1px solid #d6e0ea;border-radius:8px;padding:8px;background:#fff"><input type="checkbox" data-v34-kind="${k}" ${k==="audit"?"":"checked"}><span style="font-weight:800">${esc(l)}</span></label>`).join("");
  return `<div class="v488Section" id="v34ExportPanel_${Number(i)}" style="border:2px solid #0b6aa9;border-radius:12px;padding:11px;background:#f6fbff">
    <h3 style="color:#064f9e;margin:0 0 5px">⬇ AD · XUẤT / KHÔI PHỤC HỒ SƠ</h3>
    <div class="v488Small" style="margin-bottom:8px">Tích đúng loại tài liệu cần lấy. <b>PDF</b> chỉ chứa mục đã chọn. <b>Bản làm việc</b> giữ dữ liệu biểu mẫu để AD nhập lại và điền tiếp; FINAL/CHECK/KẾT SỔ/AUDIT chỉ là tham chiếu, không ghi đè bản đã SEND.</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:7px">${checks}</div>
    <div class="v488Actions" style="margin-top:9px">
      <button class="v488Btn gray" onclick="v34SelectAll(${Number(i)},true)">CHỌN TẤT CẢ</button>
      <button class="v488Btn gray" onclick="v34SelectAll(${Number(i)},false)">BỎ TẤT CẢ</button>
      <button class="v488Btn green" onclick="v34ExportSelectedPdf(${Number(i)})">📄 XUẤT PDF ĐÃ CHỌN</button>
      <button class="v488Btn" onclick="v34ExportWorking(${Number(i)})">📝 XUẤT BẢN LÀM VIỆC</button>
    </div>
    <div id="v34ExportStatus_${Number(i)}" class="v488Small" style="margin-top:7px"></div>
  </div>`;
}
function appendPanel(i){if(!isAD())return;const h=document.getElementById("v488ArchiveDetail");if(!h||document.getElementById(`v34ExportPanel_${Number(i)}`))return;const host=h.querySelector(".v488Card")||h;host.insertAdjacentHTML("afterbegin",panelHtml(i));}
function installArchiveToolbar(){
  const modal=document.getElementById("v488ArchiveModal");if(!modal||document.getElementById("v34WorkingFile"))return;
  const actions=modal.querySelector(".v488Card .v488Actions");if(!actions)return;
  const btn=document.createElement("button");btn.className="v488Btn";btn.textContent="📝 NHẬP BẢN LÀM VIỆC";btn.onclick=()=>{if(!isAD())return deny();document.getElementById("v34WorkingFile")?.click();};
  const inp=document.createElement("input");inp.id="v34WorkingFile";inp.type="file";inp.accept=".sagswork,.json,application/json";inp.style.display="none";inp.onchange=()=>{const f=inp.files?.[0];if(f)void importWorking(f);inp.value="";};
  actions.append(btn,inp);
}
const baseOpen=window.v488OpenArchiveFlight;
if(typeof baseOpen==="function")window.v488OpenArchiveFlight=function(i){const out=baseOpen.apply(this,arguments);setTimeout(()=>appendPanel(i),0);return out;};

async function sha256(text){try{const h=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(String(text||"")));return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,"0")).join("");}catch(e){let n=2166136261;for(const c of String(text||"")){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return "fnv-"+(n>>>0).toString(16);}}
function downloadBlob(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2500);}
function workingReferences(f,kinds){return {
  selectedKinds:kinds.slice(),
  finalDocs:kinds.includes("final")?clone(f.finalDocs||[]):[],
  crosschecks:kinds.includes("check")?clone(f.crosschecks||[]):[],
  closeouts:kinds.includes("closeout")?clone(f.closeouts||[]):[],
  audits:kinds.includes("audit")?clone(f.audits||[]):[],
  ops:kinds.includes("audit")?clone(f.ops||[]):[]
};}
function workingEnvelope(f,kinds){
  const env=clone(f?.envelope||{})||{};const src=(env.state&&typeof env.state==="object")?env.state:{};const dst={};
  const attachmentKeys=new Set(["attachments","fsags421Attachments","fsags551Attachments","bbbtAttachments"]);
  for(const [k,v] of Object.entries(src)){
    if(attachmentKeys.has(k)){if(kinds.includes("attachments"))dst[k]=clone(v);continue;}
    const isBbbt=String(k).startsWith("bbbt");
    if(isBbbt&&kinds.includes("bbbt"))dst[k]=clone(v);
    else if(!isBbbt&&kinds.includes("ramp"))dst[k]=clone(v);
  }
  env.state=dst;return env;
}
async function exportWorking(i){
  if(!isAD())return deny();const f=flightAt(i);if(!f)return alert("Không tìm thấy hồ sơ chuyến.");const kinds=selectedKinds(i);if(!kinds.length)return alert("Hãy chọn ít nhất 1 loại hồ sơ.");if(!kinds.includes("ramp")&&!kinds.includes("bbbt"))return alert("Bản làm việc cần chọn FSAGS / RAMP hoặc BBBT để có dữ liệu biểu mẫu điền tiếp.");
  setPanelStatus(i,"Đang tạo bản làm việc...");
  try{
    const pkg={format:V34_WORK_FORMAT,schemaVersion:V34_WORK_SCHEMA,appVersion:"V3.4",exportedAtMs:Date.now(),exportedBy:{username:String(currentUserProfile?.username||""),name:String(currentUserProfile?.name||""),role:"AD"},operationalDate:dayLabel(f),flight:{identity:clone(f.identity||{}),matchKeys:clone(f.matchKeys||[]),flightName:String(f.flightName||""),sessionMeta:clone(f.sessionMeta||{}),envelope:workingEnvelope(f,kinds)},references:workingReferences(f,kinds),note:"Editable form state may be restored by AD. FINAL/CROSSCHECK/KET SO/AUDIT/OPS are reference-only and must not overwrite sent revisions."};
    const unsigned=JSON.stringify(pkg);pkg.checksum={algorithm:"SHA-256",value:await sha256(unsigned)};
    const blob=new Blob([JSON.stringify(pkg)],{type:"application/json"});const name=`EREPORT_WORK_${flightLabel(f)}_${dayLabel(f)}.sagswork`;downloadBlob(blob,name);setPanelStatus(i,`✓ Đã xuất ${name}. File này AD có thể nhập lại để điền tiếp.`,"ok");
  }catch(e){console.error("V3.4 working export",e);setPanelStatus(i,"Không xuất được bản làm việc: "+(e?.message||e),"err");}
}
window.v34ExportWorking=exportWorking;

function stripImages(v){
  if(typeof v==="string"&&v.startsWith("data:image/"))return "[IMAGE_DATA]";
  if(Array.isArray(v))return v.map(stripImages);
  if(v&&typeof v==="object"){const o={};for(const [k,x] of Object.entries(v))o[k]=stripImages(x);return o;}
  return v;
}
function wrapText(ctx,text,maxWidth){const out=[];for(const raw of String(text??"").split(/\r?\n/)){if(!raw){out.push("");continue;}let line="";for(const word of raw.split(/\s+/)){const t=line?line+" "+word:word;if(ctx.measureText(t).width<=maxWidth){line=t;continue;}if(line)out.push(line);if(ctx.measureText(word).width<=maxWidth){line=word;continue;}let part="";for(const ch of word){const p=part+ch;if(ctx.measureText(p).width>maxWidth&&part){out.push(part);part=ch;}else part=p;}line=part;}if(line)out.push(line);}return out;}
function makeTextPages(title,obj){
  const W=1240,H=1754,M=70,header=105,footer=50,lineH=28;const raw=JSON.stringify(stripImages(obj),null,2);const base=document.createElement("canvas");base.width=W;base.height=H;const bctx=base.getContext("2d");bctx.font="22px monospace";const lines=wrapText(bctx,raw,W-2*M);const per=Math.max(1,Math.floor((H-header-footer-M)/lineH));const pages=[];
  for(let p=0;p<Math.max(1,Math.ceil(lines.length/per));p++){
    const c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,W,H);x.fillStyle="#064f9e";x.font="bold 34px Arial";x.fillText(title,M,62);x.fillStyle="#667085";x.font="18px Arial";x.fillText(`E-REPORT/SAGS · Trang ${p+1}/${Math.max(1,Math.ceil(lines.length/per))}`,M,92);x.strokeStyle="#ccd6e0";x.beginPath();x.moveTo(M,108);x.lineTo(W-M,108);x.stroke();x.fillStyle="#111827";x.font="22px monospace";let y=145;for(const line of lines.slice(p*per,(p+1)*per)){x.fillText(line,M,y);y+=lineH;}pages.push(c);
  }return pages;
}
function dataSrc(item){if(typeof item==="string")return item.startsWith("data:image/")?item:"";if(item&&typeof item==="object")return String(item.data||item.dataUrl||item.url||"").startsWith("data:image/")?String(item.data||item.dataUrl||item.url):"";return "";}
async function imagePage(src,title){return await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{const W=1240,H=1754,M=60,top=120;const c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,W,H);x.fillStyle="#064f9e";x.font="bold 30px Arial";x.fillText(title,M,55);const maxW=W-2*M,maxH=H-top-M,scale=Math.min(maxW/im.naturalWidth,maxH/im.naturalHeight,1),w=im.naturalWidth*scale,h=im.naturalHeight*scale;x.drawImage(im,(W-w)/2,top+(maxH-h)/2,w,h);resolve(c);};im.onerror=()=>reject(new Error("Không đọc được ảnh hồ sơ."));im.src=src;});}
function allAttachmentSources(st){const keys=["attachments","fsags421Attachments","fsags551Attachments","bbbtAttachments"],out=[];for(const k of keys){for(const it of (Array.isArray(st?.[k])?st[k]:[])){const s=dataSrc(it);if(s)out.push({src:s,label:k});}}return out;}
function checkImageSources(f){const out=[];for(const d of (Array.isArray(f?.crosschecks)?f.crosschecks:[])){for(const key of ["dhPhoto","paperPhoto","checkPhoto","image"]){const s=dataSrc(d?.[key]);if(s)out.push({src:s,label:`CHECK · REV ${Number(d?.revisionNo||d?.versionNo||1)}`});}}return out;}
async function exportSelectedPdf(i){
  if(!isAD())return deny();const f=flightAt(i);if(!f)return alert("Không tìm thấy hồ sơ chuyến.");const kinds=selectedKinds(i);if(!kinds.length)return alert("Hãy chọn ít nhất 1 loại hồ sơ.");setPanelStatus(i,"Đang dựng PDF từ các mục đã chọn...");
  const savedState=clone(state),savedGroup=typeof activeFormGroup!=="undefined"?activeFormGroup:null,savedPage=typeof currentPage!=="undefined"?currentPage:null;const pages=[];
  try{
    const st=clone(f.envelope?.state||{});Object.keys(state).forEach(k=>delete state[k]);Object.assign(state,st||{});const main=String(f.sessionMeta?.initialGroup||f.envelope?.mainForm||"fsags");if(typeof activeFormGroup!=="undefined")activeFormGroup=main;if(typeof currentPage!=="undefined")currentPage=main==="fsags421"?6:main==="fsags551"?9:main==="fsags09"?11:1;
    if(kinds.includes("ramp")){
      const nums=main==="fsags421"?[6,7]:main==="fsags551"?[9,10]:main==="fsags09"?[11,12]:[1,2];for(const n of nums)pages.push(await renderReportPage(n));
    }
    if(kinds.includes("bbbt"))pages.push(await renderReportPage(4));
    if(kinds.includes("attachments")){let n=0;for(const it of allAttachmentSources(st)){n++;try{pages.push(await imagePage(it.src,`ẢNH ĐÍNH KÈM ${n}`));}catch(e){console.warn("V3.4 attachment PDF",e);}}}
    if(kinds.includes("final"))pages.push(...makeTextPages("FINAL · DỮ LIỆU HỒ SƠ",f.finalDocs||[]));
    if(kinds.includes("check")){pages.push(...makeTextPages("CROSSCHECK · LỊCH SỬ",f.crosschecks||[]));let n=0;for(const it of checkImageSources(f)){n++;try{pages.push(await imagePage(it.src,it.label+` · ẢNH ${n}`));}catch(e){console.warn("V3.4 check image PDF",e);}}}
    if(kinds.includes("closeout"))pages.push(...makeTextPages("KẾT SỔ",f.closeouts||[]));
    if(kinds.includes("audit"))pages.push(...makeTextPages("AUDIT / OPS",{audits:f.audits||[],ops:f.ops||[]}));
    if(!pages.length)throw new Error("Các mục đã chọn chưa có dữ liệu để xuất PDF.");
    const name=`EREPORT_${flightLabel(f)}_${dayLabel(f)}_SELECTED.pdf`;const pdf=await canvasesToPdfFile(pages,name);downloadBlob(pdf,name);setPanelStatus(i,`✓ Đã xuất ${name} · ${pages.length} trang.`,"ok");
  }catch(e){console.error("V3.4 archive PDF",e);setPanelStatus(i,"Không xuất được PDF: "+(e?.message||e),"err");}
  finally{Object.keys(state).forEach(k=>delete state[k]);Object.assign(state,savedState||{});try{if(savedGroup!=null)activeFormGroup=savedGroup;if(savedPage!=null)currentPage=savedPage;draw?.();}catch(e){}}
}
window.v34ExportSelectedPdf=exportSelectedPdf;

async function validateWorking(pkg){if(!pkg||pkg.format!==V34_WORK_FORMAT)throw new Error("Không đúng định dạng BẢN LÀM VIỆC E-Report.");if(Number(pkg.schemaVersion||0)!==V34_WORK_SCHEMA)throw new Error("Phiên bản file làm việc chưa được hỗ trợ.");if(!pkg.flight?.envelope||typeof pkg.flight.envelope!=="object")throw new Error("File thiếu dữ liệu biểu mẫu.");if(pkg.checksum?.value){const c=clone(pkg);const expected=String(c.checksum.value||"");delete c.checksum;const actual=await sha256(JSON.stringify(c));if(actual!==expected)throw new Error("Checksum không khớp: file có thể đã bị sửa hoặc hỏng.");}return true;}
async function importWorking(file){
  if(!isAD())return deny();try{const text=await file.text();const pkg=JSON.parse(text);await validateWorking(pkg);const env=clone(pkg.flight.envelope||{}),oldMeta=clone(pkg.flight.sessionMeta||{}),now=Date.now(),id=makeFlightSessionId();let list=readFlightSessionList();const main=String(oldMeta.initialGroup||env.mainForm||"fsags");const base=String(pkg.flight.flightName||oldMeta.name||"HỒ SƠ").trim();const meta={...oldMeta,id,name:`${base} · KHÔI PHỤC`,customName:true,initialGroup:["fsags","fsags421","fsags551","fsags09"].includes(main)?main:"fsags",createdAt:now,updatedAt:now,restoredFromWorkingV34:true,restoredAtMs:now,restoredSourceDate:String(pkg.operationalDate||""),restoredMatchKeys:clone(pkg.flight.matchKeys||[])};env.mainForm=meta.initialGroup;env.activeFormGroup=meta.initialGroup;env.currentPage=meta.initialGroup==="fsags421"?6:meta.initialGroup==="fsags551"?9:meta.initialGroup==="fsags09"?11:1;env.scrollY=0;list.push(meta);writeFlightSessionList(list);localStorage.setItem(flightSessionStorageKey(id),JSON.stringify(env));try{localStorage.setItem(sagsOwnedPrefix(V34_REF_PREFIX)+id,JSON.stringify({format:V34_WORK_FORMAT,references:pkg.references||{},identity:pkg.flight.identity||{},matchKeys:pkg.flight.matchKeys||[],importedAtMs:now}));}catch(e){}
    const modal=document.getElementById("v488ArchiveModal");if(modal)modal.style.display="none";switchFlightSession(id);alert(`Đã khôi phục bản làm việc: ${base}.\n\nDữ liệu biểu mẫu đã mở để AD điền tiếp. FINAL/CROSSCHECK/KẾT SỔ cũ chỉ lưu tham chiếu, không ghi đè revision đã SEND.`);
  }catch(e){console.error("V3.4 working import",e);alert("Không nhập được bản làm việc: "+(e?.message||e));}
}
window.v34ImportWorking=importWorking;

function boot(){installArchiveToolbar();setInterval(()=>{if(isAD())installArchiveToolbar();},2500);}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,120),{once:true});else setTimeout(boot,120);
})();

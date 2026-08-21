/* E-REPORT/SAGS V3.43 · Approved PVHK closeout -> CBTT FINAL autofill
 * Applies only matching DATE + FLIGHT records. Later revisions update only
 * empty fields or values that still equal the previous automatic value.
 */
(function(root){
"use strict";
if(root.__SAGS_V343_CLOSEOUT_FINAL_LOADED)return;
root.__SAGS_V343_CLOSEOUT_FINAL_LOADED=true;

const BUILD="V3.43-20260821-01";
const S=v=>String(v??"").trim();
const U=v=>S(v).toUpperCase();
const flight=v=>U(v).replace(/[^A-Z0-9]/g,"");
const reg=v=>U(v).replace(/[^A-Z0-9]/g,"");
const num=v=>{const s=S(v).replace(",", ".");if(!s)return null;const n=Number(s);return Number.isFinite(n)?n:null};
const role=()=>{try{return U((typeof currentRole!=="undefined"?currentRole:root.currentRole)||"")}catch(_){return U(root.currentRole)}};
const collectionName=()=>{try{return typeof HANDOVER_COLLECTION!=="undefined"?HANDOVER_COLLECTION:"sags_handovers"}catch(_){return "sags_handovers"}};
const activeId=()=>{try{return typeof activeFinalSheetId!=="undefined"?S(activeFinalSheetId):S(root.activeFinalSheetId)}catch(_){return S(root.activeFinalSheetId)}};
const clone=v=>{try{return typeof root.cloneSafe==="function"?root.cloneSafe(v):JSON.parse(JSON.stringify(v))}catch(_){return v}};
const dateToken=v=>{try{return typeof root.paxNormDate==="function"?root.paxNormDate(v):root.ffDateToken?.(v)||S(v).replace(/\D/g,"")}catch(_){return S(v).replace(/\D/g,"")}};
const ownedKey=k=>{try{return typeof root.sagsOwnedKey==="function"?root.sagsOwnedKey(k):k}catch(_){return k}};
const INBOX_KEY="sagsCloseoutInboxV121";

function readInbox(){try{return JSON.parse(localStorage.getItem(ownedKey(INBOX_KEY))||"{}")||{}}catch(_){return{}}}
function writeInbox(x){try{localStorage.setItem(ownedKey(INBOX_KEY),JSON.stringify(x||{}))}catch(_){}}
function payloadFlights(p){const i=p?.identity||{},f=p?.f09||{};return [...new Set([...(Array.isArray(i.flights)?i.flights:[]),f.f09_fltAfter,f.f09_fltBefore].map(flight).filter(Boolean))]}
function payloadDate(p){return dateToken(p?.identity?.dateToken||p?.f09?.f09_date)}
function payloadRevision(p){return Math.max(1,Number(p?.closeoutNo||p?.revisionNo||1)||1)}
function cachePayload(p){if(!p)return;const box=readInbox(),no=payloadRevision(p),dt=payloadDate(p);for(const f of payloadFlights(p)){if(!dt||!f)continue;const key=dt+"|"+f,old=box[key]||{},versions=Array.isArray(old.versions)?old.versions.filter(x=>payloadRevision(x)!==no):[];versions.push(clone(p));versions.sort((a,b)=>payloadRevision(a)-payloadRevision(b)||Number(a?.submittedAtMs||0)-Number(b?.submittedAtMs||0));const latest=versions[versions.length-1]||clone(p);box[key]={latest,versions:versions.slice(-5),updatedAtMs:Number(latest?.submittedAtMs||Date.now())}}writeInbox(box)}

function readRecordData(rec){let all={};try{all=JSON.parse(localStorage.getItem(root.finalSheetDataKey(rec.id))||"{}")||{}}catch(_){}return {all,data:all?.[rec.form]&&typeof all[rec.form]==="object"?all[rec.form]:{}}}
function recordIdentity(rec,data){return {dateToken:dateToken(rec?.dateToken||data?.date),flight:flight(rec?.flightToken||data?.flight),reg:reg(rec?.acRegToken||data?.acreg)}}
function matches(rec,data,p){const a=recordIdentity(rec,data),dt=payloadDate(p),fs=payloadFlights(p);if(!a.dateToken||!a.flight||a.dateToken!==dt||!fs.includes(a.flight))return false;const pr=reg(p?.identity?.acRegToken||p?.f09?.f09_regn);return !(a.reg&&pr&&a.reg!==pr)}
function fieldMap(form){if(form==="VUfinal.png")return {adl:"adult",chd:"child",inf:"infant",bagPcs:"bagpcs",bagKg:"bagkg"};if(form==="9Gfinal.png")return {adl:"adult",chd:"child",inf:"infant",bagPcs:"bagpcs",bagKg:"bagw"};if(form==="VJfinal2.png")return {adl:"adlq",chd:"chdq",inf:"infq",bagPcs:"bagq",bagKg:"bagw"};return {adl:"adultq",chd:"childq",inf:"infantq",bagPcs:"bagq",bagKg:"bagw"}}
function payloadValues(p){const f=p?.f09||{};return {adl:num(f.f09_finalADL),chd:num(f.f09_finalCHD),inf:num(f.f09_finalINF),bagPcs:num(f.f09_finalBagP),bagKg:num(f.f09_finalBagW)}}
function hasSentFinal(rec){return !!(S(rec?.sentDocId)||Number(rec?.versionNo||0)>0||(Array.isArray(rec?.sentFinalHistory)&&rec.sentFinalHistory.length))}
function applyFormulas(form,data){try{root.ffAutoPaxWeights?.(form,data)}catch(_){}try{root.ffApplyVJFormulas?.(form,data)}catch(_){}if(form==="VUfinal.png")try{root.ffApplyVUFormulas?.(data)}catch(_){}if(form==="9Gfinal.png")try{root.ffApply9GLoadFormulas?.(data)}catch(_){}return data}

function applyRecord(rec,p){
  const {all,data}=readRecordData(rec);if(!matches(rec,data,p))return {matched:false,changed:false,conflicts:[]};
  const no=payloadRevision(p),last=Number(rec.ksAutofillRevisionV343||0),locked=hasSentFinal(rec)&&no>last,source=payloadValues(p),map=fieldMap(rec.form),previous=rec.ksAutofillValuesV343&&typeof rec.ksAutofillValuesV343==="object"?{...rec.ksAutofillValuesV343}:{},written={},conflicts=[];
  for(const [name,key] of Object.entries(map)){
    const raw=source[name];if(raw===null)continue;const next=String(raw),cur=S(data[key]),prev=S(previous[key]);
    if(locked){if(cur!==next)conflicts.push(key);continue}
    if(!cur||prev&&cur===prev){if(cur!==next){data[key]=next;written[key]=next}else if(prev)written[key]=next}
    else if(cur!==next)conflicts.push(key);
  }
  const id=p?.identity||{},f=p?.f09||{},dep=flight(f.f09_fltAfter)||payloadFlights(p)[0]||"",iso=/^\d{8}$/.test(payloadDate(p))?payloadDate(p).slice(0,4)+"-"+payloadDate(p).slice(4,6)+"-"+payloadDate(p).slice(6,8):S(f.f09_date),identity={date:iso,flight:dep,acreg:U(id.acRegToken||f.f09_regn)};
  for(const [key,next0] of Object.entries(identity)){const next=S(next0),cur=S(data[key]);if(next&&!cur&&!locked){data[key]=next;written[key]=next}}
  const changed=Object.keys(written).length>0;if(changed){applyFormulas(rec.form,data);all[rec.form]=data;localStorage.setItem(root.finalSheetDataKey(rec.id),JSON.stringify(all))}
  rec.ksAutofillRevisionV343=Math.max(last,no);rec.ksAutofillAtMsV343=Date.now();rec.ksAutofillSourceDocIdV343=S(p?.internalApprovalRequestId||p?.canonicalDocId||"");rec.ksAutofillValuesV343={...previous,...written};
  if(conflicts.length||locked){rec.ksPendingRevisionV121=no;rec.ksPendingAtMsV121=Number(p?.submittedAtMs||Date.now())}else{delete rec.ksPendingRevisionV121;delete rec.ksPendingAtMsV121;delete rec.ksPendingChangesV121}
  rec.updatedAt=Date.now();return {matched:true,changed,conflicts,locked,written:Object.keys(written)};
}

function refreshActive(rec,result){if(!result.changed||activeId()!==S(rec.id))return;const focused=document.activeElement?.closest?.("#finalFormFields");if(focused)return;setTimeout(()=>{try{root.renderFinalFields?.(rec.form);root.v121RefreshValidation?.()}catch(_){}},60)}
function applyAll(p,{notify=true}={}){
  if(!p||!["CBTT","AD"].includes(role()))return {matched:0,changed:0,conflicts:0};cachePayload(p);let list=[];try{list=root.readFinalSheetList?.()||[]}catch(_){return {matched:0,changed:0,conflicts:0}}let matched=0,changed=0,conflicts=0;
  for(const rec of list){const r=applyRecord(rec,p);if(!r.matched)continue;matched++;if(r.changed)changed++;conflicts+=r.conflicts.length+(r.locked?1:0);refreshActive(rec,r)}
  if(matched)try{root.writeFinalSheetList?.(list)}catch(_){}
  if(notify&&changed)try{root.showToast?.(`✓ KẾT SỔ LẦN ${payloadRevision(p)} ĐÃ TỰ ĐIỀN VÀO ${changed} TỜ FINAL.`)}catch(_){}
  return {matched,changed,conflicts};
}

function cachedForRecord(rec){const {data}=readRecordData(rec),id=recordIdentity(rec,data);if(!id.dateToken||!id.flight)return null;return readInbox()?.[id.dateToken+"|"+id.flight]?.latest||null}
async function fetchCloseout(rec){
  const {data}=readRecordData(rec),id=recordIdentity(rec,data);if(!id.dateToken||!id.flight||!id.reg||typeof root.initHandoverFirebase!=="function"||typeof root.fs09MakeMatchKey!=="function")return null;
  const key=root.fs09MakeMatchKey(id.dateToken,id.flight,id.reg,"CXR");if(!key)return null;
  const snap=await root.initHandoverFirebase().collection(collectionName()).where("matchKeys","array-contains",key).limit(12).get(),arr=[];
  snap.forEach(doc=>{const d=doc.data()||{},k=U(d.kind);if(k==="FSAGS09_CLOSEOUT"||String(doc.id).startsWith("KS09_")&&!String(doc.id).startsWith("KS09H_"))arr.push(d)});
  return arr.sort((a,b)=>payloadRevision(b)-payloadRevision(a)||Number(b?.submittedAtMs||0)-Number(a?.submittedAtMs||0))[0]||null;
}
async function syncRecord(id,{notify=true}={}){const rec=(root.readFinalSheetList?.()||[]).find(x=>S(x.id)===S(id));if(!rec)return false;const cached=cachedForRecord(rec);if(cached)applyAll(cached,{notify});try{const cloud=await fetchCloseout(rec);if(cloud){applyAll(cloud,{notify});return true}}catch(e){console.info("V3.43 closeout autofill query",e?.message||e)}return !!cached}

let syncTimer=0;function scheduleActiveSync(){clearTimeout(syncTimer);syncTimer=setTimeout(()=>{const id=activeId();if(id)syncRecord(id,{notify:true})},420)}
root.sagsV343ApplyCloseoutToFinals=(p,o)=>Promise.resolve(applyAll(p,o));
root.sagsV343SyncFinalRecord=(id,o)=>syncRecord(id,o);

function installHooks(){
  const open=root.openFinalSheetRecord;if(typeof open==="function"&&!open.__v343){const w=function(id){const out=open.apply(this,arguments);setTimeout(()=>syncRecord(id,{notify:true}),140);return out};w.__v343=true;root.openFinalSheetRecord=w;try{openFinalSheetRecord=w}catch(_){}}
  const save=root.ffSaveField;if(typeof save==="function"&&!save.__v343){const w=function(form,key,val){const out=save.apply(this,arguments);if(["date","flight","acreg"].includes(S(key)))scheduleActiveSync();return out};w.__v343=true;root.ffSaveField=w;try{ffSaveField=w}catch(_){}}
}
function injectReleaseNote(){const panel=document.querySelector("#updateInfoModal>div");if(!panel||document.getElementById("v343ReleaseNote"))return;const d=document.createElement("div");d.id="v343ReleaseNote";d.innerHTML='<p style="margin:10px 0 4px"><b>V3.43 · 21/08/2026 — KẾT SỔ DUYỆT XONG TỰ ĐIỀN FINAL</b></p><p style="margin:4px 0">• KẾT SỔ PVHK sau xác nhận nội bộ tự điền ADL, CHD, INF, BAG PCS và BAG KG vào đúng FINAL CBTT theo DATE + FLIGHT.</p><p style="margin:4px 0">• KẾT SỔ cập nhật chỉ thay ô còn trống hoặc vẫn là dữ liệu tự điền cũ; không ghi đè số CBTT đã sửa và không âm thầm đổi FINAL đã gửi.</p><p style="margin:4px 0">• CBTT mở FINAL sau thời điểm duyệt vẫn tự lấy bản KẾT SỔ mới nhất từ Firestore nếu bỏ lỡ tín hiệu realtime.</p>';panel.prepend(d)}
function install(){installHooks();injectReleaseNote()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(install,500),{once:true});else setTimeout(install,500);
root.addEventListener("pageshow",()=>setTimeout(install,200),{passive:true});
root.__SAGS_V343_BUILD=BUILD;
root.__SAGS_V343_HDSD="V3.43: KẾT SỔ PVHK chỉ tự điền FINAL sau khi đã được xác nhận nội bộ và phát chính thức. Khớp DATE + FLIGHT, A/C REG dùng kiểm tra phụ. Điền ADL/CHD/INF/BAG PCS/BAG KG; revision sau chỉ cập nhật ô trống hoặc giá trị tự điền cũ, không đè dữ liệu CBTT sửa hay FINAL đã gửi. Khi mở FINAL, ứng dụng truy vấn bản KẾT SỔ mới nhất nếu đã bỏ lỡ realtime.";
root.__SAGS_V343_TEST__={fieldMap,payloadValues,matches,applyRecord,payloadFlights,payloadDate};
})(typeof window!=="undefined"?window:globalThis);

/* E-REPORT/SAGS V1.1.101 DAILY ROSTER · RTDB PATH CONFLICT FIX */
/* E-REPORT/SAGS V1.1.96 PUSHBACK REOPEN VISIBLE PATCH */
/* E-REPORT/SAGS V1.1.95 PUSHBACK REOPEN PATCH */
/* E-REPORT/SAGS V1.1.63 CLEAN CORE UI · DIRECT BUSINESS SOURCE */
/* E-REPORT/SAGS V3.25 QUICK TIME CLEAR - consolidated runtime. */
(function(){
'use strict';
var phase=(document.currentScript&&document.currentScript.dataset&&document.currentScript.dataset.phase)||'';

if(phase==='config'){

/* ===== BEGIN firebase-config.js ===== */
// E-REPORT SAGS · Firebase Web App config for GitHub Pages
// Project: e-report-sags
// GitHub Pages hosts the web app; Firebase is used only as backend services.
// Firebase Web config is client-side configuration. Do not place service-account/private keys here.
window.SAGS_FIREBASE_CONFIG = Object.freeze({
  apiKey: "AIzaSyCImOnRxvqbL-sRGbiS2eFE_Wmvktgc8oI",
  authDomain: "e-report-sags.firebaseapp.com",
  databaseURL: "https://e-report-sags-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "e-report-sags",
  storageBucket: "e-report-sags.firebasestorage.app",
  messagingSenderId: "670672018280",
  appId: "1:670672018280:web:46c336986ecdbbc6a954dd",
  measurementId: "G-JFTKH5BHPX"
});

/* ===== END firebase-config.js ===== */
}
if(phase==='archive'){

/* ===== BEGIN v488-archive.js ===== */
/* E-Report V4.88
   - Ramp Presence: RTDB primary + sparse Firestore compatibility bridge.
   - Flight archive: one canonical snapshot per matched turnaround/flight group.
   - AD daily .ereport export/import viewer; R&S intentionally excluded.
*/
(function(){
"use strict";
const V488_VERSION="V4.88";
const V488_ARCHIVE_KIND="sags_flight_archive_v488";
const V488_ARCHIVE_CHUNK_KIND="sags_flight_archive_chunk_v488";
const V488_ARCHIVE_SCHEMA=1;
const V488_CHUNK_CHARS=250000;
const V488_SNAPSHOT_LOCAL_KEY="sagsArchiveSnapshotMapV488";
const V488_DOOR_SYNC_LOCAL_KEY="sagsArchiveDoorSyncMapV488";
const V488_PRESENCE_LOCAL_KEY="sagsRampPresenceMapV488";
const V488_CLOSEOUT_SEEN_KEY="sagsCloseoutSignalSeenV488";
// Firestore compatibility bridge is event-driven only; no periodic refresh.
const V488_BRIDGE_REFRESH_MS=0;
const V488_ARCHIVE_TTL_LABEL="Lưu đến khi AD tải hồ sơ và chủ động dọn dữ liệu";
let v488ArchiveData=null;
let v488PresencePublishing=false;
let v488PresenceTimer=null;
let v488ArchiveTimer=null;
let v488CloseoutRef=null,v488CloseoutAddedCb=null,v488CloseoutChangedCb=null;

function v488Esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));}
function v488Clone(x){try{return JSON.parse(JSON.stringify(x));}catch(e){return null;}}
function v488LocalRead(key){try{const x=JSON.parse(localStorage.getItem(sagsOwnedKey(key))||"{}");return x&&typeof x==="object"?x:{};}catch(e){return {};}}
function v488LocalWrite(key,x){try{localStorage.setItem(sagsOwnedKey(key),JSON.stringify(x||{}));}catch(e){}}
function v488DayFromToken(t){const s=String(t||"").replace(/\D/g,"");return /^\d{8}$/.test(s)?`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`:"";}
function v488TokenFromDay(d){return String(d||"").replace(/\D/g,"").slice(0,8);}
function v488CxrDay(ms){try{return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Ho_Chi_Minh",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(Number(ms)||Date.now()));}catch(e){return new Date(Number(ms)||Date.now()).toISOString().slice(0,10);}}
function v488Time(ms){if(!ms)return "";try{return new Intl.DateTimeFormat("vi-VN",{timeZone:"Asia/Ho_Chi_Minh",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(new Date(Number(ms)));}catch(e){return new Date(Number(ms)).toLocaleString("vi-VN");}}
function v488HashFast(text){return typeof fs09Hash==="function"?fs09Hash(String(text||"")):String(Math.abs(String(text||"").split("").reduce((a,c)=>((a<<5)-a)+c.charCodeAt(0)|0,0)));}
async function v488Sha256(text){try{const b=new TextEncoder().encode(String(text));const h=await crypto.subtle.digest("SHA-256",b);return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,"0")).join("");}catch(e){return "fnv-"+v488HashFast(text);}}
function v488BytesToBase64(bytes){let s="";for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,Math.min(bytes.length,i+0x8000)));return btoa(s);}
function v488Base64ToBytes(s){const b=atob(String(s||"")),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u;}
async function v488PackJson(obj){const raw=JSON.stringify(obj);if(typeof CompressionStream!=="undefined"){try{const cs=new CompressionStream("gzip"),w=cs.writable.getWriter();await w.write(new TextEncoder().encode(raw));await w.close();const ab=await new Response(cs.readable).arrayBuffer();return {encoding:"gzip-base64",data:v488BytesToBase64(new Uint8Array(ab)),rawChars:raw.length};}catch(e){}}
return {encoding:"json",data:raw,rawChars:raw.length};}
async function v488UnpackJson(encoding,data){if(encoding==="gzip-base64"&&typeof DecompressionStream!=="undefined"){const ds=new DecompressionStream("gzip"),w=ds.writable.getWriter();await w.write(v488Base64ToBytes(data));await w.close();return JSON.parse(await new Response(ds.readable).text());}return JSON.parse(String(data||"{}"));}
function v488Intersect(a,b){const s=new Set(Array.isArray(a)?a:[]);return (Array.isArray(b)?b:[]).some(x=>s.has(x));}
function v488DocKeys(d){const out=new Set();const add=x=>{if(Array.isArray(x))x.forEach(k=>k&&out.add(String(k)));};add(d?.matchKeys);add(d?.rampMatchKeys);add(d?.identity?.matchKeys);add(d?.identity?.rampMatchKeys);add(d?.finalSnapshot?.matchKeys);add(d?.finalSnapshot?.rampMatchKeys);add(d?.finalSnapshot?.identity?.matchKeys);add(d?.finalSnapshot?.identity?.rampMatchKeys);if(!out.size&&d?.identity?.dateToken&&d?.identity?.acRegToken){const fs=[...(Array.isArray(d.identity.flights)?d.identity.flights:[]),d.identity.flightToken].filter(Boolean);fs.forEach(f=>{const k=fs09MakeMatchKey?.(d.identity.dateToken,f,d.identity.acRegToken,"CXR");if(k)out.add(k);});}return [...out];}
function v488IdentityLabel(i,meta){const fs=(i?.flights||[]).filter(Boolean).join(" / ")||String(meta?.name||"").trim()||"CHUYẾN";return `${fs}${i?.acRegToken?" · "+i.acRegToken:""}`;}

/* ---------- UI ---------- */
function v488InstallUi(){
  if(document.getElementById("v488ArchiveModal"))return;
  const style=document.createElement("style");style.id="v488ArchiveStyle";style.textContent=`
  #v488ArchiveModal{position:fixed;inset:0;z-index:16000;background:rgba(0,0,0,.58);display:none;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;font-family:Arial,sans-serif}
  .v488Box{width:min(97vw,1120px);max-height:94vh;overflow:auto;background:#f5f8fb;border-radius:16px;padding:15px;box-shadow:0 15px 44px rgba(0,0,0,.35);color:#17324d}.v488Top{display:flex;justify-content:space-between;gap:8px;align-items:center;position:sticky;top:-15px;background:#f5f8fb;z-index:3;padding:10px 0 8px}.v488Top h2{font-size:20px;margin:0;color:#064f9e}.v488Actions{display:flex;gap:7px;flex-wrap:wrap}.v488Btn{border:0;border-radius:9px;padding:10px 12px;font-weight:800;background:#0b6aa9;color:#fff}.v488Btn.gray{background:#e5e9ef;color:#243746}.v488Btn.green{background:#167947}.v488Btn.red{background:#b42318}.v488Card{background:#fff;border:1px solid #d6e0ea;border-radius:12px;padding:11px;margin:9px 0}.v488Grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:9px}.v488Flight{border:1px solid #ccd9e6;background:#fff;border-radius:12px;padding:12px}.v488Flight h3{margin:0 0 5px;color:#064f9e;font-size:17px}.v488Pills{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}.v488Pill{font-size:11px;font-weight:800;padding:4px 7px;border-radius:999px;background:#eef3f8;color:#52677b}.v488Pill.ok{background:#e8f6ee;color:#137333}.v488Pill.warn{background:#fff4dd;color:#8a5700}.v488Pill.lazy{background:#eef2f6;color:#667085;border:1px dashed #b6c0ca}.v488Flight.loading{opacity:.72;pointer-events:none}.v488LazyNote{margin-top:7px;padding:7px 8px;border-radius:8px;background:#f3f6f9;color:#596b7d;font-size:11px;font-weight:800}.v488Status{font-size:13px;line-height:1.45;min-height:20px;margin:7px 0;color:#344054}.v488Status.err{color:#b42318;font-weight:800}.v488Status.ok{color:#137333;font-weight:800}.v488Section{margin:12px 0}.v488Section h3{font-size:15px;margin:0 0 6px;color:#344054}.v488Table{width:100%;border-collapse:collapse;font-size:12px;background:#fff}.v488Table td,.v488Table th{border:1px solid #dce4ec;padding:5px 7px;vertical-align:top;word-break:break-word}.v488Table th{background:#eef4f9;text-align:left}.v488Preview img{display:block;width:min(100%,760px);height:auto;margin:10px auto;border:1px solid #b9c7d5;background:#fff;box-shadow:0 3px 10px rgba(0,0,0,.12)}.v488Thumbs{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}.v488Thumbs img{width:100%;max-height:240px;object-fit:contain;background:#fff;border:1px solid #ccd6e0;border-radius:8px}.v488Small{font-size:12px;color:#65758b;line-height:1.4}.v488Input{border:1px solid #b9c6d4;border-radius:8px;padding:9px;background:#fff;font:14px Arial}.v488Details{background:#fff;border:1px solid #d6e0ea;border-radius:10px;padding:10px;margin-top:8px}.v488Details summary{cursor:pointer;font-weight:800;color:#344054}
  @media(max-width:600px){.v488Box{padding:10px}.v488Top{top:-10px}.v488Top{align-items:flex-start}.v488Actions{justify-content:flex-end}.v488Btn{padding:8px 9px;font-size:12px}}
  `;document.head.appendChild(style);
  const modal=document.createElement("div");modal.id="v488ArchiveModal";modal.innerHTML=`<div class="v488Box"><div class="v488Top"><div><h2>HỒ SƠ LƯU TRỮ · E-REPORT</h2><div class="v488Small">Danh sách ngày chỉ tải thông tin chuyến · chi tiết chỉ tải khi bấm đúng chuyến · R&amp;S không nằm trong file ngày</div></div><div class="v488Actions"><button class="v488Btn gray" onclick="v488CloseArchive()">ĐÓNG</button></div></div><div class="v488Card"><div class="v488Actions"><input id="v488ArchiveDay" class="v488Input" type="date"><button class="v488Btn" onclick="v488BrowseArchiveDay()">XEM CHUYẾN</button><button class="v488Btn green" onclick="v488ExportDailyArchive()">XUẤT FILE CẢ NGÀY</button><button class="v488Btn" onclick="v488SyncClosedLocalFlights()">ĐỒNG BỘ HỒ SƠ ĐÃ ĐÓNG TRÊN MÁY NÀY</button><button class="v488Btn gray" onclick="document.getElementById('v488ArchiveFile').click()">MỞ FILE .EREPORT</button><input id="v488ArchiveFile" type="file" accept=".ereport,application/json,application/octet-stream" style="display:none" onchange="v488ImportArchiveFile(this.files?.[0])"></div><div id="v488ArchiveStatus" class="v488Status"></div><div class="v488Small"><b>Tiết kiệm dữ liệu:</b> XEM CHUYẾN chỉ tải danh sách nhẹ. Chỉ khi bấm MỞ HỒ SƠ / XEM BIỂU MẪU mới tải dữ liệu của chuyến đó. <b>XUẤT FILE CẢ NGÀY</b> mới tải toàn bộ hồ sơ ngày. File nhập lại chỉ đọc cục bộ, không ghi Firestore/RTDB và không kích hoạt FINAL/CROSSCHECK.</div></div><div id="v488ArchiveList"></div><div id="v488ArchiveDetail"></div></div>`;document.body.appendChild(modal);
  const tb=document.querySelector(".toolbar-row.main-actions");if(tb&&!document.getElementById("roleBtnArchive")){const b=document.createElement("button");b.id="roleBtnArchive";b.textContent="Hồ sơ";b.style.display="none";b.onclick=()=>v488OpenArchive();const anchor=document.getElementById("roleBtnAudit");if(anchor)tb.insertBefore(b,anchor);else tb.appendChild(b);}
  const inp=document.getElementById("v488ArchiveDay");if(inp&&!inp.value)inp.value=v488CxrDay(Date.now());if(inp&&!inp.dataset.lazyBrowse){inp.dataset.lazyBrowse="1";inp.addEventListener("change",()=>v488BrowseArchiveDay());}
}
function v488SetStatus(t,kind=""){const e=document.getElementById("v488ArchiveStatus");if(e){e.textContent=t||"";e.className="v488Status"+(kind?" "+kind:"");}}
function v488OpenArchive(){if(String(currentRole||"")!=="AD")return roleDenied?.("Chỉ AD được xuất/mở kho hồ sơ.");v488InstallUi();document.getElementById("v488ArchiveModal").style.display="flex";v488SetStatus("Đang tải danh sách chuyến nhẹ…");setTimeout(()=>v488BrowseArchiveDay(),0);}
function v488CloseArchive(){const m=document.getElementById("v488ArchiveModal");if(m)m.style.display="none";}
window.v488OpenArchive=v488OpenArchive;window.v488CloseArchive=v488CloseArchive;

/* ---------- RTDB Ramp Presence ---------- */
function v488PresenceNodeKey(matchKey){return sagsV470Safe?.(v488HashFast(matchKey))||v488HashFast(matchKey);}
function v488PresenceDeviceKey(){return sagsV470Safe?.(ffDeviceId?.()||fs09DeviceId?.()||"DEVICE")||"DEVICE";}
function v488PresencePayload(meta,x,now){return {kind:"sags_ramp_presence_v488",matchKey:String(x.keys[0]||""),dateToken:String(x.id.dateToken||""),flights:Array.isArray(x.id.flights)?x.id.flights:[],acRegToken:String(x.id.acRegToken||""),station:String(x.id.station||"CXR"),flightName:typeof flightSessionDisplayName==="function"?flightSessionDisplayName(meta):String(meta?.name||""),sourceDeviceId:String(ffDeviceId?.()||fs09DeviceId?.()||""),sourceSessionId:String(meta.id||""),ownerAccountKey:String(sagsStorageOwnerKey?.()||""),ownerUsername:String(currentUserProfile?.username||""),ownerRole:String(currentRole||""),doorClosed:!!x.doorClosed,doorCloseTime:String(x.doorCloseTime||""),updatedAtMs:now,expiresAtMs:now+FF_RAMP_PRESENCE_TTL_MS,appVersion:V488_VERSION};}
function v488PresenceFingerprint(p){return JSON.stringify([p.dateToken,p.flights,p.acRegToken,p.station,p.sourceSessionId,p.ownerUsername,p.ownerRole,p.doorClosed,p.doorCloseTime]);}
async function v488PublishPresence(force=false){
  if(v488PresencePublishing||typeof sagsV470Ref!=="function")return;v488PresencePublishing=true;
  try{
    const now=Date.now(),device=v488PresenceDeviceKey(),old=v488LocalRead(V488_PRESENCE_LOCAL_KEY),next={},updates={};
    for(const meta of readFlightSessionList()){
      const x=ffRampPresenceIdentity(meta);if(!x)continue;
      for(const key of x.keys){const base=v488PresencePayload(meta,x,now);base.matchKey=key;const fp=v488PresenceFingerprint(base),slot=meta.id+"|"+key,node=v488PresenceNodeKey(key),exact=`ramp_presence/${node}/${device}`,flightToken=(Array.isArray(x.id.flights)?x.id.flights:[]).find(f=>fs09MakeMatchKey(x.id.dateToken,f,x.id.acRegToken,x.id.station)===key)||String(base.flights[0]||""),lookup=`ramp_presence_lookup/${sagsV470Safe(x.id.dateToken)}/${sagsV470Safe(flightToken)}/${device}_${node}`;const prev=old[slot]||{},changed=prev.fp!==fp,refresh=force||changed||now-Number(prev.rtdbAtMs||0)>6*60*60*1000;if(refresh){updates[exact]=base;updates[lookup]=base;}next[slot]={fp,exact,lookup,matchKey:key,sourceSessionId:meta.id,rtdbAtMs:refresh?now:Number(prev.rtdbAtMs||0)};}
    }
    for(const [slot,prev] of Object.entries(old)){if(next[slot])continue;if(prev.exact)updates[prev.exact]=null;if(prev.lookup)updates[prev.lookup]=null;}
    if(Object.keys(updates).length)await sagsV470Ref("").update(updates);
    // V1.1.20: RAMP presence is RTDB-only. Never mirror hot presence into sags_handovers.
    // Older RAMP_ACTIVE_* documents remain readable as fallback until they expire, but this build creates none.
    v488LocalWrite(V488_PRESENCE_LOCAL_KEY,next);
  }catch(e){console.info("V4.88 Ramp Presence",e?.message||e);}finally{v488PresencePublishing=false;}
}
function v488SchedulePresence(delay=500,force=false){if(v488PresenceTimer)clearTimeout(v488PresenceTimer);v488PresenceTimer=setTimeout(()=>{v488PresenceTimer=null;v488PublishPresence(force);},Math.max(0,delay));}
async function v488RtdbPresenceByKey(key){try{const s=await sagsV470Ref(`ramp_presence/${v488PresenceNodeKey(key)}`).once("value"),now=Date.now(),arr=[];s.forEach(c=>{const d=c.val()||{};if(d.matchKey!==key)return;if(Number(d.expiresAtMs||0)&&Number(d.expiresAtMs)<now)return;arr.push(d);});arr.sort((a,b)=>Number(b.updatedAtMs||0)-Number(a.updatedAtMs||0));return arr;}catch(e){return [];}}
async function v488FirestorePresenceFallback(keys){try{const db=initHandoverFirebase(),now=Date.now();for(const key of keys){const snap=await db.collection(HANDOVER_COLLECTION).where("matchKey","==",key).get();for(const doc of snap.docs){const d=doc.data()||{};if(d.kind!==FF_RAMP_PRESENCE_KIND)continue;if(Number(d.expiresAtMs||0)&&Number(d.expiresAtMs)<now)continue;return d;}}}catch(e){}return null;}
function v488OverridePresence(){
  if(typeof ffPublishAllLocalRampPresence==="function")ffPublishAllLocalRampPresence=function(){return v488PublishPresence(false);};
  if(typeof ffScheduleRampPresencePublish==="function")ffScheduleRampPresencePublish=function(delay=350){return v488SchedulePresence(delay,false);};
  if(typeof ffCheckCloudRampPresence==="function")ffCheckCloudRampPresence=async function(finalId){const keys=Array.isArray(finalId?.rampMatchKeys)?finalId.rampMatchKeys.filter(Boolean):[];if(!keys.length)return {checked:true,ok:false,message:"FINAL THIẾU DỮ LIỆU ĐỂ ĐỐI CHIẾU",detail:"Cần đủ DATE + FLIGHT + A/C REG."};let foundClosed=false,closedInfo="";for(const key of keys){const arr=await v488RtdbPresenceByKey(key);for(const d of arr){if(d.doorClosed){foundClosed=true;closedInfo=d.doorCloseTime||"";continue;}return {checked:true,ok:true,remote:true,presence:d,message:"",detail:""};}}const legacy=await v488FirestorePresenceFallback(keys);if(legacy){if(legacy.doorClosed){foundClosed=true;closedInfo=legacy.doorCloseTime||closedInfo;}else return {checked:true,ok:true,remote:true,presence:legacy,compat:true,message:"",detail:""};}if(foundClosed)return {checked:true,ok:false,message:"TỜ RAMP KHỚP ĐÃ DOOR CLOSE",detail:"Có tờ Ramp khớp nhưng chuyến đã đóng"+(closedInfo?" lúc "+closedInfo:"")+"."};return {checked:true,ok:false,message:"CHƯA THẤY TỜ RAMP KHỚP TRÊN MÁY CHỦ",detail:"V4.88 đối chiếu RTDB theo DATE + FLIGHT + A/C REG + CXR; Firestore chỉ dùng fallback tương thích bản cũ."};};
  if(typeof kh208FindMatchingRampPresence==="function")kh208FindMatchingRampPresence=async function(identity){if(!identity?.flightToken||!identity?.dateToken)return {valid:false,matched:false,message:"Cần đủ Số hiệu chuyến bay + Ngày."};try{const path=`ramp_presence_lookup/${sagsV470Safe(identity.dateToken)}/${sagsV470Safe(identity.flightToken)}`,s=await sagsV470Ref(path).once("value"),now=Date.now(),matches=[];s.forEach(c=>{const d=c.val()||{};if(Number(d.expiresAtMs||0)&&Number(d.expiresAtMs)<now)return;if(identity.acRegToken&&String(d.acRegToken||"")!==identity.acRegToken)return;matches.push(d);});matches.sort((a,b)=>Number(b.updatedAtMs||0)-Number(a.updatedAtMs||0));if(matches.length)return {valid:true,matched:true,presence:matches[0],count:matches.length};return {valid:true,matched:false,presence:null,count:0,message:"Không có tờ Ramp khớp. Phiếu vẫn được phép gửi broadcast cho ĐH + CBTT + AD."};}catch(e){return {valid:true,matched:false,presence:null,count:0,lookupError:true,message:"Không kiểm tra được tờ Ramp. Phiếu vẫn gửi broadcast."};}};
  setTimeout(()=>v488SchedulePresence(100,true),500);window.addEventListener("focus",()=>v488SchedulePresence(120,true));window.addEventListener("online",()=>v488SchedulePresence(120,true));document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")v488SchedulePresence(120,true);});
}

/* ---------- canonical Ramp/BBBT snapshot ---------- */
function v488ArchiveParentId(keys){return "EARCH_"+v488HashFast((Array.isArray(keys)?keys:[]).slice().sort().join("__"));}
function v488SnapshotMap(){return v488LocalRead(V488_SNAPSHOT_LOCAL_KEY);}
function v488DoorMap(){return v488LocalRead(V488_DOOR_SYNC_LOCAL_KEY);}
async function v488SnapshotSession(meta,trigger="MANUAL"){
  try{if(!meta?.id)return false;const env=readFlightSessionEnvelope(meta.id)||{},main=String(meta.initialGroup||env.mainForm||"");if(!["fsags","fsags421","fsags551"].includes(main))return false;const x=ffRampPresenceIdentity(meta)||(()=>{const id=fs09RampIdentityFromState(env.state||{},meta);return id?.matchKeys?.length?{id,keys:id.matchKeys,doorClosed:ffRampSessionHasDoorClose?.(meta)||false,doorCloseTime:String(env.state?.h21Start||env.state?.f421_h21Start||"")}:null;})();if(!x?.keys?.length||!x.id?.dateToken||!x.id?.acRegToken)return false;const payload={format:"E-REPORT-FLIGHT-SNAPSHOT",schemaVersion:V488_ARCHIVE_SCHEMA,appVersion:V488_VERSION,station:"CXR",archiveDayKey:v488DayFromToken(x.id.dateToken),identity:v488Clone(x.id),matchKeys:x.keys.slice(),flightName:typeof flightSessionDisplayName==="function"?flightSessionDisplayName(meta):String(meta.name||""),sessionMeta:v488Clone(meta),envelope:v488Clone(env),source:{deviceId:String(ffDeviceId?.()||fs09DeviceId?.()||""),sessionId:String(meta.id),username:String(currentUserProfile?.username||""),name:String(currentUserProfile?.name||""),role:String(currentRole||"")},trigger:String(trigger||""),capturedAtMs:Date.now()};const contentHashSource=JSON.stringify({identity:payload.identity,matchKeys:payload.matchKeys,flightName:payload.flightName,sessionMeta:payload.sessionMeta,envelope:payload.envelope}),raw=JSON.stringify(payload),hash=await v488Sha256(contentHashSource),parentId=v488ArchiveParentId(x.keys),local=v488SnapshotMap();if(local[parentId]?.hash===hash)return true;const packed={encoding:"json",data:raw,rawChars:raw.length},chunks=[];for(let i=0;i<packed.data.length;i+=V488_CHUNK_CHARS)chunks.push(packed.data.slice(i,i+V488_CHUNK_CHARS));const db=initHandoverFirebase(),parent=db.collection(HANDOVER_COLLECTION).doc(parentId),batch=db.batch(),now=Date.now();batch.set(parent,{kind:V488_ARCHIVE_KIND,schemaVersion:V488_ARCHIVE_SCHEMA,appVersion:V488_VERSION,archiveDayKey:payload.archiveDayKey,dateToken:String(x.id.dateToken||""),flights:Array.isArray(x.id.flights)?x.id.flights:[],acRegToken:String(x.id.acRegToken||""),station:"CXR",matchKeys:x.keys.slice(),flightName:payload.flightName,source:payload.source,trigger:payload.trigger,payloadHash:hash,encoding:packed.encoding,chunkCount:chunks.length,rawChars:packed.rawChars,updatedAtMs:now,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),retention:V488_ARCHIVE_TTL_LABEL},{merge:false});chunks.forEach((data,i)=>batch.set(db.collection(HANDOVER_COLLECTION).doc(`${parentId}__${String(i+1).padStart(3,"0")}`),{kind:V488_ARCHIVE_CHUNK_KIND,parentId,index:i+1,data,updatedAtMs:now},{merge:false}));await batch.commit();const prevCount=Number(local[parentId]?.chunkCount||0);if(prevCount>chunks.length){for(let i=chunks.length+1;i<=prevCount;i++)await db.collection(HANDOVER_COLLECTION).doc(`${parentId}__${String(i).padStart(3,"0")}`).delete().catch(()=>{});}local[parentId]={hash,chunkCount:chunks.length,at:now,day:payload.archiveDayKey};v488LocalWrite(V488_SNAPSHOT_LOCAL_KEY,local);return true;}catch(e){console.warn("V4.88 archive snapshot",e);return false;}}
function v488ScheduleDoorArchive(delay=1800){if(v488ArchiveTimer)clearTimeout(v488ArchiveTimer);v488ArchiveTimer=setTimeout(async()=>{v488ArchiveTimer=null;const map=v488DoorMap();let changed=false;for(const meta of readFlightSessionList()){if(!ffRampSessionHasDoorClose?.(meta))continue;const x=ffRampPresenceIdentity(meta);if(!x?.keys?.length)continue;const fp=x.keys.slice().sort().join("|")+"|"+String(x.doorCloseTime||"");if(map[meta.id]===fp)continue;if(await v488SnapshotSession(meta,"DOOR_CLOSE")){map[meta.id]=fp;changed=true;}}if(changed)v488LocalWrite(V488_DOOR_SYNC_LOCAL_KEY,map);},delay);}
async function v488SyncClosedLocalFlights(){if(String(currentRole||"")!=="AD")return;v488SetStatus("Đang đồng bộ các hồ sơ đã Door Close/Kết sổ trên máy này...");let ok=0,skip=0;for(const meta of readFlightSessionList()){const env=readFlightSessionEnvelope(meta.id)||{},closed=ffRampSessionHasDoorClose?.(meta)||!!env.fs09Cloud;if(!closed){skip++;continue;}if(await v488SnapshotSession(meta,"AD_MANUAL_SYNC"))ok++;}v488SetStatus(`Đã rà ${ok+skip} chuyến trên máy này · đồng bộ/đã có ${ok} · chưa đóng ${skip}.`,"ok");}
window.v488SyncClosedLocalFlights=v488SyncClosedLocalFlights;
function v488HookArchiveLifecycle(){
  // Existing persist already schedules presence. Add only a cheap local Door Close detector.
  const basePersist=persist;persist=function(){const out=basePersist.apply(this,arguments);v488SchedulePresence(700,false);v488ScheduleDoorArchive(2000);return out;};window.persist=persist;
  if(typeof attachIncomingFS09==="function"){const baseAttach=attachIncomingFS09;attachIncomingFS09=function(payload){const m=baseAttach.apply(this,arguments);if(m)setTimeout(()=>v488SnapshotSession(m,"CLOSEOUT"),80);return m;};window.attachIncomingFS09=attachIncomingFS09;}
  setTimeout(()=>v488ScheduleDoorArchive(300),1200);
}

/* ---------- KẾT SỔ RTDB event signal ---------- */
async function v488PublishCurrentCloseoutSignal(ctx){try{const i=ctx?.identity;if(!i?.matchKeys?.length)return false;const docId="KS09_"+fs09Hash(i.matchKeys.join("__")),snap=await initHandoverFirebase().collection(HANDOVER_COLLECTION).doc(docId).get();if(!snap.exists)return false;const d=snap.data()||{};if(Number(d.submittedAtMs||0)<Number(ctx.startedAtMs||0)-1000)return false;await sagsV470Ref("closeouts/"+sagsV470Safe(docId)).set({docId,eventAtMs:Date.now(),submittedAtMs:Number(d.submittedAtMs||Date.now()),closeoutNo:Number(d.closeoutNo||d.revisionNo||1),matchKeys:fs09PayloadMatchKeys(d),dateToken:String(d.identity?.dateToken||""),flights:Array.isArray(d.identity?.flights)?d.identity.flights:[],acRegToken:String(d.identity?.acRegToken||""),sourceDeviceId:String(d.sourceDeviceId||""),sourceSessionId:String(d.sourceSessionId||""),appVersion:V488_VERSION});return true;}catch(e){console.info("V4.88 closeout signal",e?.message||e);return false;}}
function v488HookCloseoutSend(){if(typeof sendFSAGS09CloseoutAuthorized!=="function")return;const base=sendFSAGS09CloseoutAuthorized;sendFSAGS09CloseoutAuthorized=async function(){let identity=null;try{identity=fs09IdentityFromState(state,currentFlightSessionMeta?.());}catch(e){}const ctx={identity:v488Clone(identity),startedAtMs:Date.now()};const out=await base.apply(this,arguments);setTimeout(()=>v488PublishCurrentCloseoutSignal(ctx),120);return out;};window.sendFSAGS09CloseoutAuthorized=sendFSAGS09CloseoutAuthorized;}
function v488CloseoutSeen(){return v488LocalRead(V488_CLOSEOUT_SEEN_KEY);}
async function v488HandleCloseoutSignal(s){const sig=s.val()||{};if(!sig.docId||Date.now()-Number(sig.eventAtMs||0)>72*60*60*1000)return;const localKeys=typeof fs09CollectRampMatchKeys==="function"?fs09CollectRampMatchKeys():[];if(!v488Intersect(localKeys,sig.matchKeys||[]))return;const seen=v488CloseoutSeen();if(Number(seen[sig.docId]||0)>=Number(sig.submittedAtMs||0))return;try{const doc=await initHandoverFirebase().collection(HANDOVER_COLLECTION).doc(sig.docId).get();if(!doc.exists)return;const d=doc.data()||{},m=attachIncomingFS09(d);if(m){seen[sig.docId]=Number(sig.submittedAtMs||Date.now());v488LocalWrite(V488_CLOSEOUT_SEEN_KEY,seen);setTimeout(()=>v488SnapshotSession(m,"CLOSEOUT_SIGNAL"),80);}}catch(e){console.info("V4.88 closeout receive",e?.message||e);}}
function v488StopCloseoutSignals(){try{if(v488CloseoutRef&&v488CloseoutAddedCb)v488CloseoutRef.off("child_added",v488CloseoutAddedCb);if(v488CloseoutRef&&v488CloseoutChangedCb)v488CloseoutRef.off("child_changed",v488CloseoutChangedCb);}catch(e){}v488CloseoutRef=null;v488CloseoutAddedCb=null;v488CloseoutChangedCb=null;}
function v488CloseoutSignalEligible(){try{const r=String(currentRole||currentUserProfile?.role||"").toUpperCase();return r==="AD"||(r==="DH"&&!!currentUserProfile?.username);}catch(e){return false;}}
function v488StartCloseoutSignals(){
  if(!v488CloseoutSignalEligible()){v488StopCloseoutSignals();return;}
  try{
    v488StopCloseoutSignals();
    const since=Date.now()-72*60*60*1000;
    // Handler already ignores signals older than 72 h; apply the same condition on
    // the server query so non-relevant historical signals are never downloaded.
    v488CloseoutRef=sagsV470Ref("closeouts").orderByChild("eventAtMs").startAt(since).limitToLast(80);
    v488CloseoutAddedCb=v488HandleCloseoutSignal;v488CloseoutChangedCb=v488HandleCloseoutSignal;
    v488CloseoutRef.on("child_added",v488CloseoutAddedCb);v488CloseoutRef.on("child_changed",v488CloseoutChangedCb);
  }catch(e){console.info("V4.88 closeout listener",e?.message||e);}
}

/* ---------- daily archive export ---------- */
async function v488FetchKind(kind){try{const q=await initHandoverFirebase().collection(HANDOVER_COLLECTION).where("kind","==",kind).get(),a=[];q.forEach(d=>a.push({__docId:d.id,...(d.data()||{})}));return a;}catch(e){console.warn("V4.88 query",kind,e);return [];}}
async function v488FetchArchiveParentsForDay(day){
  const a=[];try{
    const q=await initHandoverFirebase().collection(HANDOVER_COLLECTION).where("archiveDayKey","==",String(day||"")).get();
    q.forEach(d=>{const x=d.data()||{};if(x.kind===V488_ARCHIVE_KIND)a.push({__docId:d.id,...x});});
  }catch(e){console.warn("V3.96 archive day metadata",e);}
  a.sort((x,y)=>String(x.flightName||"").localeCompare(String(y.flightName||""),"vi"));
  return a;
}
function v488LazyStub(parent){
  return {
    __lazy:true,__snapshotLoaded:false,__relatedLoaded:false,__parent:parent,
    identity:{dateToken:String(parent.dateToken||""),flights:Array.isArray(parent.flights)?parent.flights:[],acRegToken:String(parent.acRegToken||"")},
    matchKeys:Array.isArray(parent.matchKeys)?parent.matchKeys.slice():[],
    flightName:String(parent.flightName||""),
    sessionMeta:{name:String(parent.flightName||"")},
    envelope:null,finalDocs:null,crosschecks:null,closeouts:null,kh208:null,audits:null,ops:null
  };
}
async function v488BrowseArchiveDay(){
  if(String(currentRole||"")!=="AD")return false;
  const day=document.getElementById("v488ArchiveDay")?.value||v488CxrDay(Date.now());
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return v488SetStatus("Ngày không hợp lệ.","err");
  const list=document.getElementById("v488ArchiveList"),detail=document.getElementById("v488ArchiveDetail");
  if(detail)detail.innerHTML="";if(list)list.innerHTML='<div class="v488Card"><b>Đang tải danh sách chuyến…</b><div class="v488Small">Chỉ đọc metadata, chưa tải biểu mẫu/ảnh/FINAL/CROSSCHECK.</div></div>';
  v488SetStatus("Đang tải danh sách chuyến nhẹ của "+day+"…");
  try{
    const parents=await v488FetchArchiveParentsForDay(day);
    v488ArchiveData={format:"E-REPORT-LIVE-LAZY",schemaVersion:V488_ARCHIVE_SCHEMA,appVersion:V488_VERSION,station:"CXR",operationalDate:day,liveLazy:true,manifest:{flightCount:parents.length},flights:parents.map(v488LazyStub)};
    v488RenderArchiveList(v488ArchiveData);
    if(!parents.length)v488SetStatus("Chưa có hồ sơ chuyến đã đóng của ngày "+day+".","err");
    else v488SetStatus(`✓ ${parents.length} chuyến · mới tải DANH SÁCH. Bấm đúng chuyến để tải chi tiết.`,"ok");
    return true;
  }catch(e){console.error(e);v488SetStatus("Không tải được danh sách chuyến: "+String(e?.message||e),"err");return false;}
}
window.v488BrowseArchiveDay=v488BrowseArchiveDay;

async function v488FetchDocsByMatchKeys(keys){
  const list=(Array.isArray(keys)?keys:[]).filter(Boolean),db=initHandoverFirebase(),col=db.collection(HANDOVER_COLLECTION),out=new Map();
  if(!list.length)return [];
  const fields=["matchKeys","rampMatchKeys","identity.matchKeys","identity.rampMatchKeys","finalSnapshot.matchKeys","finalSnapshot.rampMatchKeys","finalSnapshot.identity.matchKeys","finalSnapshot.identity.rampMatchKeys"];
  for(const key of list){
    for(const field of fields){
      try{
        const q=await col.where(field,"array-contains",key).get();
        q.forEach(d=>out.set(d.id,{__docId:d.id,...(d.data()||{})}));
      }catch(e){/* legacy documents may not index every nested field; skip only that path */}
    }
  }
  return [...out.values()];
}
async function v488EnsureFlightSnapshot(i){
  const n=Number(i),f=v488ArchiveData?.flights?.[n];if(!f)return null;
  if(!f.__lazy||f.__snapshotLoaded)return f;
  v488SetStatus(`Đang tải dữ liệu biểu mẫu của ${v488IdentityLabel(f.identity,f.sessionMeta)}…`);
  const snap=await v488LoadSnapshot(f.__parent);
  const merged={...snap,__lazy:true,__snapshotLoaded:true,__relatedLoaded:false,__parent:f.__parent,finalDocs:null,crosschecks:null,closeouts:null,kh208:null,audits:null,ops:null};
  v488ArchiveData.flights[n]=merged;return merged;
}
async function v488EnsureFlightFull(i){
  const n=Number(i);let f=await v488EnsureFlightSnapshot(n);if(!f)return null;if(f.__relatedLoaded)return f;
  v488SetStatus(`Đang tải FINAL/CROSSCHECK/KẾT SỔ đúng chuyến ${v488IdentityLabel(f.identity,f.sessionMeta)}…`);
  const docs=await v488FetchDocsByMatchKeys(f.matchKeys||[]),token=v488TokenFromDay(v488ArchiveData?.operationalDate||v488DayFromToken(f.identity?.dateToken));
  const kind=x=>String(x?.kind||"");
  f.finalDocs=docs.filter(d=>kind(d)===FF_CLOUD_KIND&&(!v488DocDateToken(d)||v488DocDateToken(d)===token)&&v488Intersect(f.matchKeys||[],v488DocKeys(d)));
  f.crosschecks=docs.filter(d=>kind(d)===CX_CLEAN_KIND&&(!v488DocDateToken(d)||v488DocDateToken(d)===token)&&v488Intersect(f.matchKeys||[],v488DocKeys(d)));
  f.closeouts=docs.filter(d=>kind(d)===FS09_CLOSEOUT_KIND&&(!v488DocDateToken(d)||v488DocDateToken(d)===token)&&v488Intersect(f.matchKeys||[],v488DocKeys(d)));
  f.kh208=typeof KH208_KIND!=="undefined"?docs.filter(d=>kind(d)===KH208_KIND&&v488Intersect(f.matchKeys||[],v488DocKeys(d))):[];
  /* Audit/OPS are intentionally not broad-scanned in live browse. Full day export still includes them. */
  f.audits=[];f.ops=[];f.__relatedLoaded=true;v488ArchiveData.flights[n]=f;
  return f;
}
async function v488LoadSnapshot(parent){let data="";for(let i=1;i<=Number(parent.chunkCount||0);i++){const id=`${parent.__docId}__${String(i).padStart(3,"0")}`,s=await initHandoverFirebase().collection(HANDOVER_COLLECTION).doc(id).get();if(!s.exists)throw new Error("Thiếu chunk "+i+" của "+parent.flightName);data+=String(s.data()?.data||"");}const payload=await v488UnpackJson(parent.encoding,data);return {...payload,__parent:parent};}
function v488DocDateToken(d){return String(d?.dateToken||d?.identity?.dateToken||d?.finalSnapshot?.identity?.dateToken||"");}
function v488OpsEventsFromBroadcast(docs){const a=[];for(const d of docs){if(Array.isArray(d.events))d.events.forEach(x=>a.push(x));else if(d.eventType)a.push(d);}return a;}
function v488MatchAuditToFlight(a,f,day){if(v488CxrDay(a.createdAtMs||0)!==day)return false;const txt=JSON.stringify(a.meta||{}).toUpperCase(),fl=(f.identity?.flights||[]).map(x=>String(x).toUpperCase()),reg=String(f.identity?.acRegToken||"").toUpperCase();return fl.some(x=>x&&txt.includes(x))&&(!reg||txt.includes(reg));}
async function v488ExportDailyArchive(){
  if(String(currentRole||"")!=="AD")return;const day=document.getElementById("v488ArchiveDay")?.value||v488CxrDay(Date.now()),token=v488TokenFromDay(day);if(token.length!==8)return v488SetStatus("Ngày không hợp lệ.","err");
  if(!confirm(`XUẤT FILE CẢ NGÀY sẽ tải toàn bộ snapshot, FINAL, CROSSCHECK, KẾT SỔ, AUDIT/OPS của ${day}.\n\nNếu chỉ muốn xem một chuyến, hãy bấm HỦY rồi dùng XEM CHUYẾN → chọn đúng chuyến.\n\nTiếp tục xuất file cả ngày?`))return false;
  v488SetStatus("Đang tải TOÀN BỘ hồ sơ ngày "+day+" để xuất file...");
  try{
    const [dayParents,finals,cross,closeouts,kh208,audits,opsDocs]=await Promise.all([v488FetchArchiveParentsForDay(day),v488FetchKind(FF_CLOUD_KIND),v488FetchKind(CX_CLEAN_KIND),v488FetchKind(FS09_CLOSEOUT_KIND),typeof KH208_KIND!=="undefined"?v488FetchKind(KH208_KIND):Promise.resolve([]),v488FetchKind(PERSONAL_AUDIT_KIND),typeof OPS_BROADCAST_KIND!=="undefined"?v488FetchKind(OPS_BROADCAST_KIND):Promise.resolve([])]);
    const flights=[];for(let n=0;n<dayParents.length;n++){v488SetStatus(`Đang giải nén hồ sơ chuyến ${n+1}/${dayParents.length}...`);try{const snap=await v488LoadSnapshot(dayParents[n]);flights.push(snap);}catch(e){throw e;}}
    if(!flights.length)return v488SetStatus("Chưa có snapshot Ramp/BBBT nào của ngày này trên Firebase. Hãy bảo đảm các chuyến đã Door Close/Kết sổ trên V4.88.","err");
    const ops=v488OpsEventsFromBroadcast(opsDocs);
    for(const f of flights){const keys=f.matchKeys||[];f.finalDocs=finals.filter(d=>v488DocDateToken(d)===token&&v488Intersect(keys,v488DocKeys(d)));f.crosschecks=cross.filter(d=>(!v488DocDateToken(d)||v488DocDateToken(d)===token)&&v488Intersect(keys,v488DocKeys(d)));f.closeouts=closeouts.filter(d=>v488DocDateToken(d)===token&&v488Intersect(keys,v488DocKeys(d)));f.kh208=kh208.filter(d=>(!v488DocDateToken(d)||v488DocDateToken(d)===token)&&v488Intersect(keys,v488DocKeys(d)));f.audits=audits.filter(a=>v488MatchAuditToFlight(a,f,day));f.ops=ops.filter(o=>v488CxrDay(o.eventAtMs||o.createdAtMs||0)===day&&(v488Intersect(keys,v488DocKeys(o))||JSON.stringify(o).toUpperCase().includes(String(f.identity?.acRegToken||"").toUpperCase())));}
    const archive={format:"E-REPORT-DAILY-ARCHIVE",schemaVersion:V488_ARCHIVE_SCHEMA,appVersion:V488_VERSION,station:"CXR",operationalDate:day,exportedAtMs:Date.now(),exportedBy:{username:String(currentUserProfile?.username||""),name:String(currentUserProfile?.name||""),role:String(currentRole||"")},note:"R&S excluded: R&S is exported separately at deadline/completion.",manifest:{flightCount:flights.length,finalCount:flights.reduce((n,x)=>n+x.finalDocs.reduce((m,d)=>m+v488FinalRevisionRows(d).length,0),0),crosscheckCount:flights.reduce((n,x)=>n+x.crosschecks.length,0),closeoutCount:flights.reduce((n,x)=>n+x.closeouts.length,0),bbbtWithImages:flights.filter(x=>Array.isArray(x.envelope?.state?.bbbtAttachments)&&x.envelope.state.bbbtAttachments.length).length},flights};const unsigned=JSON.stringify(archive),checksum=await v488Sha256(unsigned);archive.checksum={algorithm:"SHA-256",value:checksum};const blob=new Blob([JSON.stringify(archive)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`EREPORT_CXR_${day}.ereport`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2500);v488ArchiveData=archive;v488RenderArchiveList(archive);v488SetStatus(`✓ Đã tạo ${a.download} · ${archive.manifest.flightCount} hồ sơ chuyến · ${archive.manifest.finalCount} FINAL · ${archive.manifest.crosscheckCount} CROSSCHECK.`,"ok");
  }catch(e){console.error(e);v488SetStatus("Không xuất được hồ sơ: "+String(e?.message||e),"err");}
}
window.v488ExportDailyArchive=v488ExportDailyArchive;

/* ---------- import + offline viewer ---------- */
async function v488ReadArchiveBlob(file){const ab=await file.arrayBuffer(),u=new Uint8Array(ab);if(u[0]===0x1f&&u[1]===0x8b){if(typeof DecompressionStream==="undefined")throw new Error("Trình duyệt chưa hỗ trợ giải nén GZIP.");const ds=new DecompressionStream("gzip"),w=ds.writable.getWriter();await w.write(u);await w.close();return JSON.parse(await new Response(ds.readable).text());}return JSON.parse(new TextDecoder().decode(u));}
async function v488ValidateArchive(a){if(a?.format!=="E-REPORT-DAILY-ARCHIVE")throw new Error("Không phải file E-Report Archive hợp lệ.");if(!Array.isArray(a.flights))throw new Error("File thiếu danh sách hồ sơ chuyến.");if(a.checksum?.value){const c=v488Clone(a),expected=String(c.checksum.value||"");delete c.checksum;const actual=await v488Sha256(JSON.stringify(c));if(actual!==expected)throw new Error("Checksum không khớp: file có thể bị thay đổi hoặc hỏng.");}return true;}
async function v488ImportArchiveFile(file){if(!file)return;v488SetStatus("Đang kiểm tra file "+file.name+"...");try{const a=await v488ReadArchiveBlob(file);await v488ValidateArchive(a);v488ArchiveData=a;v488RenderArchiveList(a);v488SetStatus(`✓ File toàn vẹn · ${a.operationalDate} · ${a.flights.length} hồ sơ chuyến. Đang xem OFFLINE, không ghi Firebase.`,"ok");}catch(e){v488ArchiveData=null;document.getElementById("v488ArchiveList").innerHTML="";document.getElementById("v488ArchiveDetail").innerHTML="";v488SetStatus("Không mở được file: "+String(e?.message||e),"err");}}
window.v488ImportArchiveFile=v488ImportArchiveFile;
window.v488GetArchiveData=()=>v488ArchiveData;
function v488Completeness(f){
  if(f?.__lazy&&!f.__snapshotLoaded)return {lazy:true,ramp:0,bbbt:0,final:0,cross:0,ks:0};
  const st=f?.envelope?.state||{},bbbt=Object.keys(st).some(k=>k.startsWith("bbbt")&&st[k]&&k!=="bbbtAttachments"),imgs=Array.isArray(st.bbbtAttachments)&&st.bbbtAttachments.length,final=Array.isArray(f.finalDocs)&&f.finalDocs.length,cross=Array.isArray(f.crosschecks)&&f.crosschecks.length,ks=Array.isArray(f.closeouts)&&f.closeouts.length;
  return {lazy:false,relatedPending:!!(f?.__lazy&&!f.__relatedLoaded),ramp:!!Object.keys(st).length,bbbt:bbbt||imgs,final,cross,ks};
}
function v488RenderArchiveList(a){
  const host=document.getElementById("v488ArchiveList"),detail=document.getElementById("v488ArchiveDetail");if(detail)detail.innerHTML="";if(!host)return;
  const live=!!a.liveLazy;
  const head=live?`<div class="v488Card"><b>HỒ SƠ NGÀY ${v488Esc(a.operationalDate||"")}</b> · ${Number(a.manifest?.flightCount||a.flights.length)} chuyến <span class="v488Small">· chế độ tiết kiệm: chưa tải nội dung hồ sơ</span></div>`:`<div class="v488Card"><b>HỒ SƠ NGÀY ${v488Esc(a.operationalDate||"")}</b> · ${Number(a.manifest?.flightCount||a.flights.length)} chuyến <span class="v488Small">· xuất ${v488Esc(v488Time(a.exportedAtMs))}</span></div>`;
  host.innerHTML=head+`<div class="v488Grid">`+a.flights.map((f,i)=>{
    const c=v488Completeness(f),label=v488IdentityLabel(f.identity,f.sessionMeta),day=v488DayFromToken(f.identity?.dateToken)||a.operationalDate||"";
    let pills="";
    if(c.lazy)pills=`<span class="v488Pill lazy">CHƯA TẢI CHI TIẾT</span>`;
    else{
      pills=`<span class="v488Pill ${c.ramp?'ok':'warn'}">${c.ramp?'✓':'!'} RAMP</span><span class="v488Pill ${c.bbbt?'ok':'warn'}">${c.bbbt?'✓':'!'} BBBT</span>`;
      if(c.relatedPending)pills+=`<span class="v488Pill lazy">FINAL / CROSS / KẾT SỔ CHƯA TẢI</span>`;
      else pills+=`<span class="v488Pill ${c.final?'ok':'warn'}">${c.final?'✓':'!'} FINAL ${c.final||''}</span><span class="v488Pill ${c.cross?'ok':'warn'}">${c.cross?'✓':'!'} CROSS ${c.cross||''}</span><span class="v488Pill ${c.ks?'ok':'warn'}">${c.ks?'✓':'!'} KẾT SỔ</span>`;
    }
    return `<div class="v488Flight" id="v488FlightCard_${i}"><h3>${v488Esc(label)}</h3><div class="v488Small">${v488Esc(day)}${c.lazy?' · chưa tải biểu mẫu':` · ${v488Esc(f.sessionMeta?.initialGroup||f.envelope?.mainForm||"")}`}</div><div class="v488Pills">${pills}</div>${c.lazy?'<div class="v488LazyNote">Chỉ tải dữ liệu của chuyến này khi bạn bấm nút bên dưới.</div>':""}<div class="v488Actions" style="margin-top:9px"><button class="v488Btn" onclick="v488OpenArchiveFlight(${i})">MỞ HỒ SƠ</button><button class="v488Btn gray" onclick="v488PreviewArchivedForms(${i})">XEM BIỂU MẪU</button></div></div>`;
  }).join("")+`</div>`;
}
function v488Val(v){if(v===true)return "✓";if(v===false)return "";if(typeof v==="string"&&v.startsWith("data:image/"))return "[Ảnh/Chữ ký]";if(Array.isArray(v))return `[${v.length} mục]`;if(v&&typeof v==="object")return JSON.stringify(v);return String(v??"");}
function v488FieldName(k){try{const f=fields.find(x=>x.key===k);if(f?.label)return f.label;}catch(e){}return k;}
function v488StateTable(st,pred){const rows=Object.entries(st||{}).filter(([k,v])=>pred(k,v)&&v!==""&&v!=null&&v!==false&&!(Array.isArray(v)&&!v.length));if(!rows.length)return '<div class="v488Small">Không có dữ liệu.</div>';return `<table class="v488Table"><thead><tr><th style="width:34%">Trường</th><th>Dữ liệu</th></tr></thead><tbody>${rows.map(([k,v])=>`<tr><td>${v488Esc(v488FieldName(k))}</td><td>${v488Esc(v488Val(v))}</td></tr>`).join("")}</tbody></table>`;}
function v488Actor(d){return d?.actor?.name||d?.actor?.username||d?.submittedBy?.name||d?.submittedBy?.username||d?.dhActor?.name||d?.dhActor?.username||d?.cbttActor?.name||d?.cbttActor?.username||"";}
function v488FinalRevisionRows(d){const revs=(d?.revisionFinals&&typeof d.revisionFinals==="object")?d.revisionFinals:null;if(revs&&Object.keys(revs).length){return Object.keys(revs).map(Number).filter(Number.isFinite).sort((a,b)=>a-b).map(n=>{const r=revs[String(n)]||{},actor=d?.revisionActors?.[String(n)]||r.submittedBy||d.submittedBy||{},ts=Number(r.submittedAtMs||r.sentAtMs||d.submittedAtMs||0);return {flight:d.flightName||d.identity?.flightToken||"",revisionNo:n,submittedAtMs:ts,actor};});}return [{flight:d?.flightName||d?.identity?.flightToken||"",revisionNo:Number(d?.revisionNo||d?.versionNo||1),submittedAtMs:Number(d?.submittedAtMs||0),actor:d?.submittedBy||{}}];}
async function v488OpenArchiveFlight(i){
  const h=document.getElementById("v488ArchiveDetail");if(!h)return;
  h.innerHTML='<div class="v488Card"><b>Đang tải đúng hồ sơ chuyến đã chọn…</b><div class="v488Small">Không tải hồ sơ các chuyến khác.</div></div>';
  try{
    const f=await v488EnsureFlightFull(i);if(!f)return;
    if(v488ArchiveData?.liveLazy)v488RenderArchiveList(v488ArchiveData);
    const st=f.envelope?.state||{},att=[...(Array.isArray(st.attachments)?st.attachments:[]),...(Array.isArray(st.bbbtAttachments)?st.bbbtAttachments:[])];
    const finalRows=(f.finalDocs||[]).flatMap(v488FinalRevisionRows).map(r=>`<tr><td>${v488Esc(r.flight||"")}</td><td>${Number(r.revisionNo||1)}</td><td>${v488Esc(v488Time(r.submittedAtMs))}</td><td>${v488Esc(r.actor?.name||r.actor?.username||"")}</td></tr>`).join("");
    const crossRows=(f.crosschecks||[]).map(d=>`<tr><td>${Number(d.revisionNo||1)}</td><td>${v488Esc(d.status||"")}</td><td>${v488Esc(v488Time(d.updatedAtMs||d.cbttConfirmedAtMs||d.dhSentAtMs))}</td><td>${v488Esc(v488Actor(d))}</td></tr>`).join("");
    h.innerHTML=`<div class="v488Card"><div class="v488Actions"><button class="v488Btn gray" onclick="document.getElementById('v488ArchiveDetail').innerHTML=''">← DANH SÁCH</button><button class="v488Btn" onclick="v488PreviewArchivedForms(${Number(i)})">XEM BIỂU MẪU TRỰC QUAN</button></div><h2 style="color:#064f9e">${v488Esc(v488IdentityLabel(f.identity,f.sessionMeta))}</h2><div class="v488Small">Chỉ dữ liệu chuyến này đã được tải · MatchKey: ${v488Esc((f.matchKeys||[]).join(" · "))}</div><div class="v488Section"><h3>FSAGS / RAMP</h3>${v488StateTable(st,(k)=>!k.startsWith("bbbt")&&!k.startsWith("f09_")&&k!=="attachments")}</div><div class="v488Section"><h3>BBBT</h3>${v488StateTable(st,(k)=>k.startsWith("bbbt")&&k!=="bbbtAttachments")}</div>${att.length?`<div class="v488Section"><h3>ẢNH ĐÍNH KÈM (${att.length})</h3><div class="v488Thumbs">${att.filter(x=>typeof x==="string"&&x.startsWith("data:image/")).map(x=>`<img src="${x}" alt="Ảnh hồ sơ">`).join("")}</div></div>`:""}<div class="v488Section"><h3>FINAL</h3>${finalRows?`<table class="v488Table"><tr><th>Chuyến</th><th>Revision</th><th>Gửi lúc</th><th>Người gửi</th></tr>${finalRows}</table>`:'<div class="v488Small">Không có FINAL khớp.</div>'}</div><div class="v488Section"><h3>CROSSCHECK</h3>${crossRows?`<table class="v488Table"><tr><th>Revision</th><th>Trạng thái</th><th>Thời gian</th><th>Actor</th></tr>${crossRows}</table>`:'<div class="v488Small">Không có CROSSCHECK khớp.</div>'}${(f.crosschecks||[]).filter(d=>typeof d.dhPhoto==="string"&&d.dhPhoto.startsWith("data:image/")).length?`<div class="v488Thumbs" style="margin-top:8px">${f.crosschecks.filter(d=>typeof d.dhPhoto==="string"&&d.dhPhoto.startsWith("data:image/")).map(d=>`<img src="${d.dhPhoto}" alt="Ảnh crosscheck">`).join("")}</div>`:""}</div><div class="v488Section"><h3>KẾT SỔ / AUDIT / OPS</h3><div class="v488Small">Kết sổ: <b>${(f.closeouts||[]).length}</b> · Audit/OPS: <b>${v488ArchiveData?.liveLazy?"không quét toàn kho ở chế độ xem tiết kiệm":"đã có trong file ngày"}</b></div></div><details class="v488Details"><summary>DỮ LIỆU KỸ THUẬT HỒ SƠ</summary><pre style="white-space:pre-wrap;word-break:break-word;font-size:11px">${v488Esc(JSON.stringify({finalDocs:f.finalDocs,crosschecks:f.crosschecks,closeouts:f.closeouts,kh208:f.kh208,audits:f.audits,ops:f.ops},null,2))}</pre></details></div>`;
    h.scrollIntoView({behavior:"smooth",block:"start"});v488SetStatus(`✓ Đã tải đúng hồ sơ ${v488IdentityLabel(f.identity,f.sessionMeta)}.`,"ok");
  }catch(e){console.error(e);h.innerHTML=`<div class="v488Card"><b>Không tải được hồ sơ:</b> ${v488Esc(e?.message||e)}</div>`;v488SetStatus("Không tải được hồ sơ chuyến: "+String(e?.message||e),"err");}
}
window.v488OpenArchiveFlight=v488OpenArchiveFlight;
async function v488PreviewArchivedForms(i){
  const h=document.getElementById("v488ArchiveDetail");if(!h)return;h.innerHTML='<div class="v488Card"><b>Đang tải biểu mẫu của đúng chuyến đã chọn…</b><div class="v488Small">Không tải FINAL/CROSSCHECK của chuyến khác.</div></div>';
  let f;try{f=await v488EnsureFlightSnapshot(i);}catch(e){h.innerHTML=`<div class="v488Card"><b>Không tải được dữ liệu chuyến:</b> ${v488Esc(e?.message||e)}</div>`;return;}if(!f)return;
  const saved=v488Clone(state),arch=v488Clone(f.envelope?.state||{}),main=String(f.sessionMeta?.initialGroup||f.envelope?.mainForm||"fsags");
  try{
    Object.keys(state).forEach(k=>delete state[k]);Object.assign(state,arch);const pages=main==="fsags421"?[6,7,4]:main==="fsags551"?[9,10,4]:[1,2,4],imgs=[];for(const p of pages){const c=await renderReportPage(p);imgs.push(c.toDataURL("image/jpeg",.9));}
    const att=[...(Array.isArray(arch.attachments)?arch.attachments:[]),...(Array.isArray(arch.bbbtAttachments)?arch.bbbtAttachments:[])].filter(x=>typeof x==="string"&&x.startsWith("data:image/"));
    h.innerHTML=`<div class="v488Card"><div class="v488Actions"><button class="v488Btn gray" onclick="v488OpenArchiveFlight(${Number(i)})">← CHI TIẾT HỒ SƠ</button></div><h3>BIỂU MẪU · ${v488Esc(v488IdentityLabel(f.identity,f.sessionMeta))}</h3><div class="v488Small">Chỉ snapshot/biểu mẫu chuyến này được tải.</div><div class="v488Preview">${imgs.map(x=>`<img src="${x}" alt="Biểu mẫu lưu trữ">`).join("")}</div>${att.length?`<h3>ẢNH ĐÍNH KÈM</h3><div class="v488Thumbs">${att.map(x=>`<img src="${x}" alt="Ảnh đính kèm">`).join("")}</div>`:""}</div>`;v488SetStatus(`✓ Đã tải biểu mẫu đúng chuyến ${v488IdentityLabel(f.identity,f.sessionMeta)}.`,"ok");
  }catch(e){h.innerHTML=`<div class="v488Card"><b>Không dựng được biểu mẫu:</b> ${v488Esc(e?.message||e)}</div>`;}finally{Object.keys(state).forEach(k=>delete state[k]);Object.assign(state,saved||{});try{draw();}catch(e){}}
}
window.v488PreviewArchivedForms=v488PreviewArchivedForms;

/* ---------- role UI + boot ---------- */
function v488WrapRoleUi(){if(typeof applyRoleUI!=="function")return;const base=applyRoleUI;applyRoleUI=function(){const out=base.apply(this,arguments);const b=document.getElementById("roleBtnArchive");if(b)b.style.display="none";setTimeout(v488StartCloseoutSignals,0);return out;};window.applyRoleUI=applyRoleUI;}
function v488Boot(){v488InstallUi();v488WrapRoleUi();try{applyRoleUI();}catch(e){}v488OverridePresence();v488HookArchiveLifecycle();v488HookCloseoutSend();v488StartCloseoutSignals();}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(v488Boot,40),{once:true});else setTimeout(v488Boot,40);
})();

/* ===== END v488-archive.js ===== */

/* ===== BEGIN archive-export-v34.js ===== */
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
if(typeof baseOpen==="function")window.v488OpenArchiveFlight=function(i){const out=baseOpen.apply(this,arguments);Promise.resolve(out).finally(()=>setTimeout(()=>appendPanel(i),0));return out;};

async function sha256(text){try{const h=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(String(text||"")));return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,"0")).join("");}catch(e){let n=2166136261;for(const c of String(text||"")){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return "fnv-"+(n>>>0).toString(16);}}
function downloadBlob(blob,name){
  const ios=/iPad|iPhone|iPod/i.test(String(navigator.userAgent||''))||(String(navigator.platform||'')==='MacIntel'&&Number(navigator.maxTouchPoints||0)>1);
  const fallback=()=>{const a=document.createElement("a"),u=URL.createObjectURL(blob);a.href=u;a.download=name;a.rel='noopener';if(ios)a.target='_blank';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(u);a.remove();},10000);};
  if(ios&&typeof navigator.share==='function'&&typeof File==='function'&&(!navigator.userActivation||navigator.userActivation.isActive)){
    try{
      const file=blob instanceof File?blob:new File([blob],String(name||'SAGS_FILE'),{type:String(blob?.type||'application/octet-stream'),lastModified:Date.now()});
      navigator.share({title:String(name||'SAGS FILE'),files:[file]}).catch(e=>{if(e?.name!=='AbortError'){console.warn('V1.1.49 iOS generic share fallback',e);fallback();}});
      return;
    }catch(e){console.warn('V1.1.49 iOS generic file fallback',e)}
  }
  fallback();
}
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

function boot(){installArchiveToolbar();window.addEventListener("pageshow",()=>{if(isAD())setTimeout(installArchiveToolbar,60)},{passive:true});}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,120),{once:true});else setTimeout(boot,120);
})();

/* ===== END archive-export-v34.js ===== */

/* ===== BEGIN contextual-back-v314.js ===== */
/* E-REPORT/SAGS V1.1.83 · CONTEXTUAL BACK
   QUAY LẠI = đúng màn ngay trước đó.
   Nếu đang ở màn con trong cùng modal thì quay về màn cha của modal.
   Nếu modal/module được mở từ AD CONTROL CENTER hoặc DỮ LIỆU KHAI THÁC,
   khi modal đóng sẽ tự khôi phục đúng workspace cha. TRANG CHỦ vẫn là lệnh riêng.
*/
(function(){
  "use strict";
  const ROW_ID="sagsContextBackRow";
  const BTN_ID="sagsContextBackBtn";
  const BUILD="V1.1.83-CONTEXT-BACK";

  function visible(el){
    if(!el || !el.isConnected)return false;
    const st=getComputedStyle(el);
    if(st.display==="none" || st.visibility==="hidden" || Number(st.opacity||1)===0)return false;
    const r=el.getBoundingClientRect();
    return r.width>4 && r.height>4;
  }
  function zOf(el){const z=parseInt(getComputedStyle(el).zIndex,10);return Number.isFinite(z)?z:0;}
  function logged(){return !!String(window.currentRole||window.__sagsGetSession?.()?.role||'');}
  function isLoginVisible(){return visible(document.getElementById('roleLoginModal'));}

  function layers(){
    const q=[
      '[role="dialog"]','[aria-modal="true"]','.sagsAdminModal',
      '[id$="Modal"]','[id$="Overlay"]','[id$="Scanner"]',
      '#flightSessionsModal','#flightSessionModal','#handoverMenu','#handoverQrScanner',
      '#quickTimeModal','#fs09QuickModal','#rsOverlay','#finalFormsModal'
    ].join(',');
    const out=[],seen=new Set();
    document.querySelectorAll(q).forEach(el=>{
      if(seen.has(el) || !visible(el))return;seen.add(el);
      if(el.id==='roleLoginModal' || el.id==='roleHomeIdle' || el.id==='appUpdateModal')return;
      if(el.id===ROW_ID || el.id===BTN_ID)return;
      const r=el.getBoundingClientRect(), area=Math.max(1,r.width*r.height), screen=Math.max(1,innerWidth*innerHeight);
      const modalLike=el.getAttribute('aria-modal')==='true'||el.getAttribute('role')==='dialog'||/modal|overlay|scanner|manager|panel/i.test((el.id||'')+' '+(el.className||''));
      if(!modalLike)return;
      if(area/screen<0.12 && zOf(el)<10000)return;
      out.push(el);
    });
    out.sort((a,b)=>zOf(a)-zOf(b));
    return out;
  }
  function topLayer(){const a=layers();return a.length?a[a.length-1]:null;}
  function txt(b){return String(b?.textContent||b?.getAttribute?.('aria-label')||'').replace(/\s+/g,' ').trim().toUpperCase();}

  function controls(layer){
    return [...layer.querySelectorAll('button,[role="button"],a')].filter(b=>visible(b)&&b.id!==BTN_ID&&!b.closest('#'+ROW_ID));
  }
  function findNativeBack(layer){
    const arr=controls(layer).map((b,i)=>{
      const t=txt(b), oc=String(b.getAttribute?.('onclick')||''), meta=String(b.id||'')+' '+String(b.className||'');
      let score=0;
      if(/QUAY LẠI|TRỞ LẠI/.test(t))score+=120;
      if(/^←|^‹/.test(t))score+=100;
      if(/DANH SÁCH CHUYẾN|DANH SÁCH/.test(t))score+=90;
      if(/back/i.test(oc)||/back/i.test(meta))score+=70;
      // Không coi nút đóng là back native; nó chỉ là fallback khi màn không có back riêng.
      if(/ĐÓNG|CLOSE|HỦY|HUỶ/.test(t)||/close/i.test(oc)||/close/i.test(meta))score-=100;
      return {b,score,i};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.i-b.i);
    return arr[0]?.b||null;
  }
  function findClose(layer){
    const arr=controls(layer).map((b,i)=>{
      const t=txt(b), oc=String(b.getAttribute?.('onclick')||''), meta=String(b.id||'')+' '+String(b.className||'');
      let score=0;
      if(/ĐÓNG|CLOSE/.test(t))score+=100;
      if(/^[×✕X]$/.test(t))score+=95;
      if(/HỦY|HUỶ|ĐỂ SAU/.test(t))score+=75;
      if(/close/i.test(oc)||/close/i.test(meta))score+=85;
      const r=b.getBoundingClientRect(), lr=layer.getBoundingClientRect();
      if(r.top<lr.top+Math.min(120,lr.height*.22))score+=10;
      return {b,score,i};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.i-b.i);
    return arr[0]?.b||null;
  }

  function panelFor(layer){
    if(!layer)return null;
    const preferred=layer.querySelector('.ahPanel,.fwcPanel,.rsPanel,.finalPanel,.modal-content,.modalContent,[class*="ModalPanel"],[class*="modalPanel"],[class*="Panel"]');
    if(preferred && visible(preferred))return preferred;
    const kids=[...layer.children].filter(visible).sort((a,b)=>{
      const ar=a.getBoundingClientRect(), br=b.getBoundingClientRect();
      return (br.width*br.height)-(ar.width*ar.height);
    });
    return kids[0]||layer;
  }

  function finishContextBack(previousLayer){
    setTimeout(()=>{
      const same=previousLayer&&previousLayer.isConnected&&visible(previousLayer)&&topLayer()===previousLayer;
      // Nếu native back chỉ đổi một màn con bên trong cùng modal thì KHÔNG pop parent.
      // Chỉ khi lớp hiện tại thực sự đóng mới quay về workspace ngay trước đó.
      if(!same){
        try{window.sagsUiReturnPrevious?.()}catch(_){}
      }
      sync();
    },90);
    setTimeout(sync,220);
  }

  function goBack(ev){
    try{ev?.preventDefault?.();ev?.stopPropagation?.();ev?.stopImmediatePropagation?.();}catch(_){ }
    const layer=topLayer();
    if(!layer){
      try{window.sagsUiReturnPrevious?.()}catch(_){}
      return;
    }
    const native=findNativeBack(layer);
    if(native){native.click();finishContextBack(layer);return;}
    const close=findClose(layer);
    if(close){close.click();finishContextBack(layer);return;}
    const id=String(layer.id||''),stem=id.replace(/(Modal|Overlay|Scanner)$/i,'');
    for(const name of [`close${stem}`,`close${id}`,`stop${stem}`]){
      if(typeof window[name]==='function'){
        try{window[name]();finishContextBack(layer);return;}catch(_){ }
      }
    }
    // Không ẩn cưỡng bức DOM chưa biết vì có thể bỏ cleanup camera/listener.
  }

  function removeInjected(){document.getElementById(ROW_ID)?.remove();}
  function sync(){
    // Dọn nút nổi legacy nếu DOM cache cũ còn sót.
    document.getElementById('sagsGlobalBackBtn')?.remove();
    document.getElementById('sags-global-back-v35-style')?.remove();
    const layer=topLayer();
    if(!logged() || isLoginVisible() || !layer){removeInjected();return;}
    // Nếu màn đã có nút quay lại đúng ngữ cảnh thì không chèn thêm.
    if(findNativeBack(layer)){removeInjected();return;}
    const panel=panelFor(layer);
    if(!panel){removeInjected();return;}
    let row=document.getElementById(ROW_ID);
    if(row && !panel.contains(row)){row.remove();row=null;}
    if(!row){
      row=document.createElement('div');row.id=ROW_ID;row.className='sagsContextBackRow';
      const b=document.createElement('button');b.id=BTN_ID;b.type='button';b.className='sagsContextBackBtn';
      b.setAttribute('aria-label','Quay lại trang trước');b.innerHTML='<span aria-hidden="true">←</span> QUAY LẠI';
      b.addEventListener('click',goBack,true);row.appendChild(b);
      // Nằm trong trang/panel, ngay đầu nội dung; không fixed/overlay.
      panel.insertBefore(row,panel.firstChild||null);
    }
  }

  const css=document.createElement('style');css.id='sags-context-back-v314-style';css.textContent=`
#${ROW_ID}{display:flex;align-items:center;justify-content:flex-start;gap:8px;margin:0 0 10px 0;padding:0;position:relative;z-index:2}
#${BTN_ID}{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:42px;padding:9px 14px;border:1px solid #d2dde8;border-radius:12px;background:#eef3f8;color:#27384b;font:900 14px/1.1 Arial;cursor:pointer;box-shadow:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
#${BTN_ID} span{font-size:20px;line-height:1}
#${BTN_ID}:active{transform:translateY(1px)}
@media(max-width:480px){#${BTN_ID}{min-height:40px;padding:8px 12px;font-size:13px;border-radius:11px}}
@media print{#${ROW_ID}{display:none!important}}
`;
  document.head.appendChild(css);

  let raf=0;const requestSync=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;sync();});};
  new MutationObserver(requestSync).observe(document.documentElement,{subtree:true,attributes:true,childList:true,attributeFilter:['style','class','aria-hidden']});
  document.addEventListener('click',()=>setTimeout(sync,0),true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById(BTN_ID))goBack(e);},true);
  window.addEventListener('pageshow',sync);window.addEventListener('resize',requestSync);
  window.sagsContextGoBack=goBack;window.sagsGlobalGoBack=goBack;window.__SAGS_CONTEXT_BACK_BUILD=BUILD;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(sync,100),{once:true});else setTimeout(sync,100);
})();

/* ===== END contextual-back-v314.js ===== */
}
if(phase==='tools'){

/* ADMIN BUILDER removed in V3.91 PC UI cleanup. */


/* ===== BEGIN ac-limits.js ===== */
/* E-Report SAGS · V1.37 A/C LIMITS / AIRCRAFT RESTRICTIONS
   Admin: manual entry + quick paste only. No image/AI import.
   Runtime: match active flight/A-C REG; general limits alert at STA-10, ASU-related limits alert at ETD-10 (fallback STD-10).
*/
(()=>{
'use strict';
const ACL_VERSION='1.4.1';
const ACL_DOC='AC_LIMITS_CATALOG_V1';
const ACL_HISTORY_PREFIX='AC_LIMITS_HISTORY_';
const ACL_KIND='sags_ac_limits_catalog_v1';
const ACL_SIGNAL='ac_limits/catalog_signal';
const ACL_PUBLIC='ac_limits/catalog_public';
const ACL_CACHE='sags_ac_limits_catalog_cache_v1';
const ACL_ACK='sags_ac_limits_ack_v1';
const ACL_DEFAULT_ROLES=['DH','CBTT','VHTTB','PVHK','PVHLNG'];
const ACL_CATEGORIES=['APU INOP','HOLD INOP/ISSUES','SEAT INOP','OTHERS'];
let aclCatalog={version:0,items:[],dailyDate:'',dailyVersion:''};
let aclSignalRef=null,aclSignalCb=null,aclPollTimer=null;
let aclCurrentAlert=null,aclAlertQueue=[];
let aclEditingManualId='';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v??'').trim().toUpperCase();
const normFlight=v=>norm(v).replace(/[^A-Z0-9]/g,'');
const normReg=v=>norm(v).replace(/[^A-Z0-9]/g,'');
const uid=()=>`ACL_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`.toUpperCase();
const clone=v=>JSON.parse(JSON.stringify(v??null));
function aclDb(){if(typeof initHandoverFirebase!=='function')throw new Error('Firebase chưa sẵn sàng.');return initHandoverFirebase();}
function aclActor(){try{return currentActor?.()||{role:String(currentRole||''),username:String(currentUserProfile?.username||'')}}catch(_){return {role:''}}}
function aclNormRole(v){let s=String(v||'').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');s=s.replace(/Đ/g,'D').replace(/[^A-Z0-9]/g,'');if(s==='DH'||s==='DIEUHANH')return 'DH';if(s==='LNF'||s==='LOSTANDFOUND'||s==='LOSTFOUND')return 'LOSTFOUND';return s}
function aclRole(){try{return aclNormRole(currentRole||currentUserProfile?.role||currentUserProfile?.roleCode||'')}catch(_){return ''}}
function aclIsAdmin(){return aclRole()==='AD'}
function aclCanManage(){return aclIsAdmin()||(typeof window.v485Can==='function'&&window.v485Can('AC_LIMITS'))}
function todayISO(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function aclRolesFromHost(host){return [...host.querySelectorAll('input[type=checkbox][data-acl-role]:checked')].map(x=>aclNormRole(x.dataset.aclRole||'')).filter(Boolean)}
function aclRolesHtml(prefix,selected=ACL_DEFAULT_ROLES){const set=new Set((selected||[]).map(x=>String(x).toUpperCase()));const roles=['DH','CBTT','PVHK','VHTTB','KTTB','PVHLNG','LOSTFOUND','AD'];return `<div class="aclRoleGrid">${roles.map(r=>`<label><input type="checkbox" data-acl-role="${r}" id="${prefix}_${r}" ${set.has(r)?'checked':''}> ${r}</label>`).join('')}</div>`}
function aclNormalizeItem(x={}){return {
 id:String(x.id||uid()),source:String(x.source||'MANUAL').toUpperCase(),active:x.active!==false,
 airline:norm(x.airline||''),flightNo:normFlight(x.flightNo||''),acReg:normReg(x.acReg||''),displayReg:norm(x.displayReg||x.acReg||''),
 matchMode:String(x.matchMode||((x.flightNo&&x.acReg)?'BOTH':x.flightNo?'FLIGHT':'REG')).toUpperCase(),
 category:ACL_CATEGORIES.includes(norm(x.category))?norm(x.category):'OTHERS',restriction:String(x.restriction||'').trim(),
 effectiveFrom:String(x.effectiveFrom||''),effectiveTo:String(x.effectiveTo||''),batchDate:String(x.batchDate||''),batchVersion:String(x.batchVersion||''),
 recipientRoles:[...new Set((x.recipientRoles||ACL_DEFAULT_ROLES).map(aclNormRole).filter(Boolean))],
 createdAtMs:Number(x.createdAtMs||Date.now()),updatedAtMs:Number(x.updatedAtMs||Date.now()),createdBy:x.createdBy||null,updatedBy:x.updatedBy||null
}}
function aclSaveCache(){try{localStorage.setItem(ACL_CACHE,JSON.stringify({at:Date.now(),catalog:aclCatalog}))}catch(_){}}
function aclLoadCache(){try{const x=JSON.parse(localStorage.getItem(ACL_CACHE)||'null');if(x?.catalog){aclCatalog={version:Number(x.catalog.version||0),items:(x.catalog.items||[]).map(aclNormalizeItem),dailyDate:String(x.catalog.dailyDate||''),dailyVersion:String(x.catalog.dailyVersion||'')};return true}}catch(_){}return false}
function aclSetStatus(text,err=false){const e=$('aclAdminStatus');if(e){e.textContent=text||'';e.style.color=err?'#b42318':'#40566b'}}
function aclInjectCss(){if($('aclStyle'))return;const s=document.createElement('style');s.id='aclStyle';s.textContent=`
#aclAdminModal,#aclAlertModal{position:fixed;inset:0;z-index:13950;display:none;background:rgba(0,0,0,.6);padding:max(8px,env(safe-area-inset-top)) 7px max(8px,env(safe-area-inset-bottom));box-sizing:border-box;overflow:auto;align-items:flex-start;justify-content:center}
.aclPanel{width:min(98vw,1050px);max-height:96dvh;overflow:auto;background:#fff;border-radius:16px;padding:14px;box-sizing:border-box;font:13px/1.4 Arial;color:#203040;box-shadow:0 18px 52px rgba(0,0,0,.36)}
.aclTop{position:sticky;top:-14px;z-index:5;background:#fff;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 0 10px;border-bottom:1px solid #dde5ec}.aclTop h3{margin:0;color:#003B8E;font:900 19px Arial}.aclClose{border:0;background:#e9eef3;border-radius:9px;padding:9px 13px;font-weight:900}
.aclTabs{display:flex;gap:6px;overflow:auto;position:sticky;top:43px;background:#fff;z-index:4;padding:8px 0}.aclTab{white-space:nowrap;border:1px solid #bac6d1;background:#f7f9fb;border-radius:9px;padding:8px 10px;font-weight:900}.aclTab.active{background:#003B8E;color:#fff;border-color:#003B8E}.aclPane{display:none}.aclPane.active{display:block}
.aclCard{border:1px solid #d6dfe7;background:#fbfcfe;border-radius:12px;padding:11px;margin:9px 0}.aclTitle{font:900 15px Arial;color:#17324d;margin-bottom:7px}.aclHint{background:#eef6ff;border-left:4px solid #0b67b2;border-radius:9px;padding:9px;margin:8px 0;font-weight:700;color:#274862}.aclWarn{background:#fff0ef;border:2px solid #d92d20;border-radius:10px;padding:10px;color:#9d1c14;font-weight:900}
.aclGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.aclGrid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.aclLabel{display:block;font:900 11px Arial;color:#4c5d6c;margin:4px 0}.aclInput,.aclSelect,.aclText{width:100%;box-sizing:border-box;border:1px solid #aeb9c4;border-radius:8px;padding:9px;background:#fff;font:700 13px Arial}.aclText{min-height:70px;resize:vertical}.aclBtn{border:0;border-radius:8px;min-height:36px;padding:8px 11px;font-weight:900;background:#003B8E;color:#fff}.aclBtn.secondary{background:#e8eef5;color:#234;border:1px solid #c3ced8}.aclBtn.good{background:#167947}.aclBtn.danger{background:#b42318}.aclActions{display:flex;gap:7px;flex-wrap:wrap;margin:9px 0}.aclRoleGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}.aclRoleGrid label{border:1px solid #d7e0e8;border-radius:8px;padding:7px;background:#fff;font-weight:800}.aclItem{border:1px solid #d8e0e7;border-radius:10px;padding:9px;margin:7px 0;background:#fff}.aclItem b{color:#123b63}.aclMeta{font-size:11px;color:#607080;margin-top:4px}.aclDraftRow{display:grid;grid-template-columns:150px 180px 1fr auto;gap:6px;align-items:start;margin:6px 0}.aclDraftRow input,.aclDraftRow select{width:100%;box-sizing:border-box;border:1px solid #b8c3cc;border-radius:7px;padding:7px;font:700 12px Arial}.aclDraftRow textarea{width:100%;min-height:48px;box-sizing:border-box;border:1px solid #b8c3cc;border-radius:7px;padding:7px;font:700 12px Arial}
#aclAlertModal{z-index:14980;align-items:center;padding:12px}.aclAlertBox{width:min(94vw,520px);background:#fff;border:4px solid #d92d20;border-radius:16px;padding:16px;box-sizing:border-box;box-shadow:0 20px 60px rgba(0,0,0,.45)}.aclAlertTitle{color:#b42318;font:900 21px Arial;margin:0 0 7px}.aclAlertFlight{font:900 17px Arial;color:#172b4d;margin:5px 0}.aclAlertLine{background:#fff0ef;border-left:5px solid #d92d20;border-radius:7px;padding:9px;margin:7px 0;font-weight:900;white-space:pre-wrap}.aclAck{width:100%;border:0;border-radius:10px;padding:12px;background:#b42318;color:#fff;font:900 16px Arial;margin-top:10px}
@media(max-width:650px){.aclGrid,.aclGrid3{grid-template-columns:1fr}.aclRoleGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.aclDraftRow{grid-template-columns:1fr 1fr}.aclDraftRow textarea{grid-column:1/-1}.aclDraftRow .aclDraftDel{grid-column:1/-1}}
`;document.head.appendChild(s)}
function aclEnsureButton(){if($('roleBtnAcLimits'))return;const row=document.querySelector('.toolbar-row.main-actions');if(!row)return;const b=document.createElement('button');b.id='roleBtnAcLimits';b.textContent='A/C LIMITS';b.style.display='none';b.onclick=()=>aclOpenAdmin();const anchor=$('roleBtnManual');if(anchor)row.insertBefore(b,anchor);else row.appendChild(b)}
function aclRefreshRoleUI(){aclEnsureButton();const b=$('roleBtnAcLimits');if(b)b.style.display=(aclCanManage()&&!window.SAGS_ADMIN_HUB_V137)?'inline-flex':'none'}
function aclEnsureUi(){aclInjectCss();aclEnsureButton();if(!$('aclAdminModal')){const d=document.createElement('div');d.id='aclAdminModal';d.innerHTML=`<div class="aclPanel"><div class="aclTop"><h3>A/C LIMITS · AIRCRAFT RESTRICTIONS</h3><button class="aclClose" onclick="aclCloseAdmin()">ĐÓNG</button></div><div class="aclTabs">
<button class="aclTab active" data-acltab="manual" onclick="aclTab('manual')">1 · THÊM CẢNH BÁO</button><button class="aclTab" data-acltab="quick" onclick="aclTab('quick')">2 · DÁN NHANH</button><button class="aclTab" data-acltab="list" onclick="aclTab('list')">3 · ĐANG HIỆU LỰC</button><button class="aclTab" data-acltab="help" onclick="aclTab('help')">HDSD</button></div>
<div id="aclAdminStatus" style="min-height:20px;font-weight:800"></div>
<div id="aclPaneManual" class="aclPane active"></div><div id="aclPaneQuick" class="aclPane"></div><div id="aclPaneList" class="aclPane"></div><div id="aclPaneHelp" class="aclPane"></div></div>`;document.body.appendChild(d)}
if(!$('aclAlertModal')){const a=document.createElement('div');a.id='aclAlertModal';a.innerHTML=`<div class="aclAlertBox"><div class="aclAlertTitle">⚠ A/C LIMITS</div><div id="aclAlertFlight" class="aclAlertFlight"></div><div id="aclAlertBody"></div><button class="aclAck" onclick="aclAckAlert()">ĐÃ BIẾT</button></div>`;document.body.appendChild(a)}
aclRenderAll()}
function aclTab(name){document.querySelectorAll('#aclAdminModal .aclTab').forEach(x=>x.classList.toggle('active',x.dataset.acltab===name));document.querySelectorAll('#aclAdminModal .aclPane').forEach(x=>x.classList.remove('active'));const p=$('aclPane'+name.charAt(0).toUpperCase()+name.slice(1));if(p)p.classList.add('active');if(name==='list')aclRenderList()}
function aclOpenAdmin(){if(!aclCanManage())return alert('Tài khoản chưa được cấp quyền A/C LIMITS.');aclEnsureUi();$('aclAdminModal').style.display='flex';aclLoadCatalog(true).then(()=>aclRenderAll()).catch(e=>aclSetStatus(String(e?.message||e),true))}
function aclCloseAdmin(){const m=$('aclAdminModal');if(m)m.style.display='none'}
function aclRenderAll(){aclRenderManualPane();aclRenderQuickPane();aclRenderList();aclRenderHelp()}
function aclRenderManualPane(){const h=$('aclPaneManual');if(!h)return;h.innerHTML=`<div class="aclCard"><div class="aclTitle">THÊM CẢNH BÁO A/C LIMITS</div><div class="aclHint">Nhập trực tiếp Flight No / A/C Reg và nội dung cần cảnh báo. Dùng được cho mọi hãng. Ví dụ <b>BX782 · HL7269 · NEED GPU ASU</b>.</div><div class="aclGrid3">
<div><label class="aclLabel">Hãng</label><input id="aclManAirline" class="aclInput" placeholder="BX"></div><div><label class="aclLabel">Flight No</label><input id="aclManFlight" class="aclInput" placeholder="BX782"></div><div><label class="aclLabel">A/C Reg</label><input id="aclManReg" class="aclInput" placeholder="HL7269"></div>
<div><label class="aclLabel">Khớp theo</label><select id="aclManMode" class="aclSelect"><option value="BOTH">FLIGHT + REG</option><option value="REG">A/C REG</option><option value="FLIGHT">FLIGHT NO</option></select></div><div><label class="aclLabel">Nhóm</label><select id="aclManCat" class="aclSelect">${ACL_CATEGORIES.map(c=>`<option>${esc(c)}</option>`).join('')}</select></div><div><label class="aclLabel">Từ ngày</label><input id="aclManFrom" class="aclInput" type="date" value="${todayISO()}"></div><div><label class="aclLabel">Đến ngày</label><input id="aclManTo" class="aclInput" type="date" value="${todayISO()}"></div></div><label class="aclLabel">Nội dung hạn chế</label><textarea id="aclManText" class="aclText" placeholder="NEED GPU ASU"></textarea><label class="aclLabel">Đối tượng nhận</label>${aclRolesHtml('aclManRole',ACL_DEFAULT_ROLES)}<div class="aclActions"><button class="aclBtn good" onclick="aclSaveManual()">${aclEditingManualId?'LƯU THAY ĐỔI':'LƯU & ÁP DỤNG'}</button><button class="aclBtn secondary" onclick="aclClearManual()">XÓA Ô</button></div></div>`}
function aclClearManual(){aclEditingManualId='';['aclManAirline','aclManFlight','aclManReg','aclManText'].forEach(id=>{if($(id))$(id).value=''});if($('aclManFrom'))$('aclManFrom').value=todayISO();if($('aclManTo'))$('aclManTo').value=todayISO()}
async function aclSaveManual(){if(!aclCanManage())return;const flight=normFlight($('aclManFlight')?.value),reg=normReg($('aclManReg')?.value),mode=String($('aclManMode')?.value||'BOTH'),text=String($('aclManText')?.value||'').trim(),roles=aclRolesFromHost($('aclPaneManual'));if(!text)return alert('Nhập nội dung hạn chế.');if(mode==='BOTH'&&(!flight||!reg))return alert('Khớp FLIGHT + REG cần nhập đủ Flight No và A/C Reg.');if(mode==='REG'&&!reg)return alert('Cần nhập A/C Reg.');if(mode==='FLIGHT'&&!flight)return alert('Cần nhập Flight No.');if(!roles.length)return alert('Chọn ít nhất 1 đối tượng nhận.');const stamp=Date.now(),oldItem=aclEditingManualId?(aclCatalog.items||[]).find(x=>x.id===aclEditingManualId):null,item=aclNormalizeItem({id:oldItem?.id||uid(),source:oldItem?.source||'MANUAL',airline:$('aclManAirline')?.value,flightNo:flight,acReg:reg,displayReg:$('aclManReg')?.value,matchMode:mode,category:$('aclManCat')?.value,restriction:text,effectiveFrom:$('aclManFrom')?.value,effectiveTo:$('aclManTo')?.value,recipientRoles:roles,createdAtMs:oldItem?.createdAtMs||stamp,createdBy:oldItem?.createdBy||aclActor(),updatedAtMs:stamp,updatedBy:aclActor()});try{const arr=oldItem?(aclCatalog.items||[]).map(x=>x.id===oldItem.id?item:x):[...(aclCatalog.items||[]),item];await aclWriteCatalog(arr,{action:oldItem?'MANUAL_EDIT':'MANUAL_ADD'});aclSetStatus(`${oldItem?'Đã sửa':'Đã thêm'} ${flight||''} ${item.displayReg||reg} · ${text}`);aclEditingManualId='';aclRenderManualPane();aclRenderList()}catch(e){aclSetStatus('Không lưu được: '+String(e?.message||e),true)}}
function aclRenderQuickPane(){const h=$('aclPaneQuick');if(!h)return;h.innerHTML=`<div class="aclCard"><div class="aclTitle">DÁN NHANH THÔNG BÁO HÃNG</div><div class="aclHint">Ví dụ: <b>BX782 HL7269 NEED GPU ASU</b>. Hệ thống tách Flight / Reg / nội dung rồi đưa sang mục THÊM TAY để anh kiểm tra trước khi lưu.</div><textarea id="aclQuickText" class="aclText" placeholder="BX782 HL7269 NEED GPU ASU"></textarea><div class="aclActions"><button class="aclBtn" onclick="aclQuickParse()">TÁCH THÔNG TIN</button></div><div id="aclQuickResult"></div></div>`}
function aclQuickParse(){const raw=norm($('aclQuickText')?.value);if(!raw)return;const tokens=raw.split(/\s+/),reg=tokens.find(t=>/^(?:HL\d{4}|VN-?A[A-Z0-9]+|B-?[A-Z0-9]{3,6}|HS-?[A-Z0-9]{3,6}|RP-C\d+|9M-?[A-Z0-9]+)$/.test(t))||'',flight=tokens.find(t=>t!==reg&&/^[A-Z0-9]{2,3}\d{2,5}[A-Z]?$/.test(t))||'';const idxs=[flight?tokens.indexOf(flight):-1,reg?tokens.indexOf(reg):-1].filter(x=>x>=0);const after=idxs.length?Math.max(...idxs)+1:0,text=tokens.slice(after).join(' ').trim();aclTab('manual');$('aclManFlight').value=flight;$('aclManReg').value=reg;$('aclManAirline').value=(flight.match(/^([A-Z0-9]{2,3}?)(?=\d)/)||['',''])[1];$('aclManText').value=text;if(flight&&reg)$('aclManMode').value='BOTH';else if(reg)$('aclManMode').value='REG';else $('aclManMode').value='FLIGHT';if(/APU|GPU|ASU|ACU/.test(text))$('aclManCat').value='APU INOP';aclSetStatus(`Đã tách: ${flight||'(chưa thấy Flight)'} · ${reg||'(chưa thấy Reg)'} · ${text||'(chưa thấy nội dung)'}. Kiểm tra rồi bấm LƯU & ÁP DỤNG.`)}
function aclRuntimeDiagnostic(){const cs=aclContexts(),role=aclRole(),now=Date.now();return cs.map(c=>{const matches=(aclCatalog.items||[]).filter(x=>aclMatch(x,c)&&(x.recipientRoles||[]).map(aclNormRole).includes(role));const general=matches.filter(x=>!aclIsAsuItem(x)),asu=matches.filter(aclIsAsuItem);const g=general[0]?aclTimingForItem(general[0],c):{event:'STA',clock:c.sta,due:c.sta?aclStaMs(c.date,c.sta)-10*60000:null};const a=asu[0]?aclTimingForItem(asu[0],c):{event:c.etd?'ETD':'STD',clock:c.etd||c.std,due:(c.etd||c.std)?(aclDepartureMs(c)-10*60000):null};return {...c,now,matches:matches.length,generalCount:general.length,asuCount:asu.length,generalTiming:g,asuTiming:a}})}
function aclShowDiagnostic(){const rows=aclRuntimeDiagnostic();if(!rows.length)return alert('Máy này chưa có chuyến nào để kiểm tra A/C LIMITS.');const fmt=x=>x?new Date(x).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}):'(không tính được)';alert(rows.map(x=>`${x.flightLabel} · REG ${x.reg||'(trống)'} · ROLE ${aclRole()||'(trống)'}\nSTA ${x.sta||'(trống)'} → LIMIT chung T-10 ${fmt(x.generalTiming?.due)} · MATCH ${x.generalCount}\n${x.asuTiming?.event||'STD'} ${x.asuTiming?.clock||'(trống)'} → ASU T-10 ${fmt(x.asuTiming?.due)} · MATCH ${x.asuCount}`).join('\n\n'))}
function aclRenderList(){const h=$('aclPaneList');if(!h)return;const arr=(aclCatalog.items||[]).slice().sort((a,b)=>Number(b.active)-Number(a.active)||Number(b.updatedAtMs)-Number(a.updatedAtMs));h.innerHTML=`<div class="aclCard"><div class="aclTitle">DANH SÁCH A/C LIMITS</div><div class="aclHint">Toàn bộ cảnh báo được AD nhập thủ công hoặc tạo từ DÁN NHANH. Có thể SỬA / TẮT / BẬT / XÓA từng cảnh báo.</div><div class="aclActions"><button class="aclBtn secondary" onclick="aclLoadCatalog(true).then(aclRenderList)">LÀM MỚI</button><button class="aclBtn secondary" onclick="aclShowDiagnostic()">KIỂM TRA T-10 TRÊN MÁY NÀY</button></div>${arr.length?arr.map(aclItemHtml).join(''):'<div class="aclHint">Chưa có hạn chế.</div>'}</div>`}
function aclItemHtml(x){const key=esc(x.id);const who=(x.recipientRoles||[]).join(', '),srcLabel=String(x.source||'MANUAL').startsWith('IMAGE')?'LEGACY':String(x.source||'MANUAL');return `<div class="aclItem"><b>${esc(x.category)} · ${esc(x.displayReg||x.acReg||'')}</b>${x.flightNo?` · <b>${esc(x.flightNo)}</b>`:''}<div>${esc(x.restriction)}</div><div class="aclMeta">${esc(srcLabel)} · ${esc(x.matchMode)} · ${esc(x.effectiveFrom||'')} → ${esc(x.effectiveTo||'')} · Nhận: ${esc(who)} · ${x.active?'ĐANG BẬT':'ĐÃ TẮT'}</div><div class="aclActions"><button class="aclBtn secondary" onclick="aclToggleItem('${key}',${x.active?'false':'true'})">${x.active?'TẮT':'BẬT'}</button><button class="aclBtn secondary" onclick="aclEditItem('${key}')">SỬA</button><button class="aclBtn danger" onclick="aclDeleteItem('${key}')">XÓA</button></div></div>`}
async function aclToggleItem(id,on){const arr=(aclCatalog.items||[]).map(x=>x.id===id?aclNormalizeItem({...x,active:!!on,updatedAtMs:Date.now(),updatedBy:aclActor()}):x);await aclWriteCatalog(arr,{action:on?'REACTIVATE':'DEACTIVATE'});aclRenderList()}
async function aclDeleteItem(id){if(!confirm('Xóa hạn chế này khỏi danh sách?'))return;await aclWriteCatalog((aclCatalog.items||[]).filter(x=>x.id!==id),{action:'DELETE'});aclRenderList()}
function aclEditItem(id){const x=(aclCatalog.items||[]).find(v=>v.id===id);if(!x)return;aclEditingManualId=id;aclRenderManualPane();aclTab('manual');$('aclManAirline').value=x.airline||'';$('aclManFlight').value=x.flightNo||'';$('aclManReg').value=x.displayReg||x.acReg||'';$('aclManMode').value=x.matchMode||'REG';$('aclManCat').value=x.category||'OTHERS';$('aclManFrom').value=x.effectiveFrom||todayISO();$('aclManTo').value=x.effectiveTo||todayISO();$('aclManText').value=x.restriction||'';document.querySelectorAll('#aclPaneManual input[data-acl-role]').forEach(c=>c.checked=(x.recipientRoles||[]).includes(c.dataset.aclRole));aclSetStatus('Đang sửa hạn chế. Bấm LƯU THAY ĐỔI khi xong.')}
function aclRenderHelp(){const h=$('aclPaneHelp');if(!h)return;h.innerHTML=`<div class="aclCard"><div class="aclTitle">HDSD · A/C LIMITS</div><ol>
<li><b>Thêm cảnh báo:</b> AD → A/C LIMITS → <b>THÊM CẢNH BÁO</b>. Nhập Hãng (nếu cần), Flight No, A/C Reg, nội dung hạn chế/cảnh báo, ngày hiệu lực và đối tượng nhận.</li>
<li><b>Chọn kiểu khớp:</b> REG = cảnh báo theo đăng bạ; FLIGHT = theo số chuyến; FLIGHT + REG = chỉ cảnh báo khi cả hai cùng khớp.</li>
<li><b>Dán nhanh:</b> dùng cho tin nhắn ngắn như <code>BX782 HL7269 NEED GPU ASU</code> → bấm <b>TÁCH THÔNG TIN</b> → hệ thống điền Flight/Reg/nội dung vào form → kiểm tra → <b>LƯU & ÁP DỤNG</b>.</li>
<li><b>Nhiều hạn chế cùng một tàu:</b> nhập thành nhiều cảnh báo riêng. Khi tới mốc, hệ thống gom các hạn chế đang khớp để người làm chuyến thấy đầy đủ.</li>
<li><b>Thời điểm cảnh báo:</b> hạn chế chung cảnh báo từ <b>STA - 10 phút</b>. Riêng nội dung có chữ <b>ASU</b>: ưu tiên <b>ETD - 10 phút</b>; nếu chưa có ETD thì dùng <b>STD - 10 phút</b>. Nếu đã qua mốc mà chưa PUSHBACK, cảnh báo vẫn xuất hiện.</li>
<li><b>Đối tượng nhận:</b> chỉ các Role được AD chọn mới nhận popup. Cùng chuyến + cùng bản hạn chế chỉ cảnh báo một lần sau khi bấm <b>ĐÃ BIẾT</b>; nếu AD sửa nội dung thành bản mới thì có thể cảnh báo lại.</li>
<li><b>Kiểm tra trước khi khai thác:</b> vào <b>ĐANG HIỆU LỰC → KIỂM TRA T-10 TRÊN MÁY NÀY</b> để xem Flight / Reg / Role / mốc thời gian / số LIMIT đang match.</li>
</ol><div class="aclWarn">A/C LIMITS không còn dùng UP ẢNH hoặc AI. Mọi cảnh báo do AD chủ động nhập/chỉnh sửa trực tiếp để dữ liệu gọn và dễ kiểm soát.</div></div>`}
function aclApplyCatalog(d){d=d||{};aclCatalog={version:Number(d.version||0),items:(d.items||[]).map(aclNormalizeItem),dailyDate:String(d.dailyDate||''),dailyVersion:String(d.dailyVersion||'')};const activeById=new Map((aclCatalog.items||[]).filter(x=>x.active!==false).map(x=>[String(x.id),x]));aclAlertQueue=(aclAlertQueue||[]).map(a=>({...a,items:(a.items||[]).map(x=>activeById.get(String(x.id))).filter(Boolean)})).filter(a=>a.items.length);if(aclCurrentAlert){const live=(aclCurrentAlert.items||[]).map(x=>activeById.get(String(x.id))).filter(Boolean);if(!live.length){try{const m=$('aclAlertModal');if(m)m.style.display='none'}catch(_){}aclCurrentAlert=null;setTimeout(aclTryShowNext,120)}else aclCurrentAlert={...aclCurrentAlert,items:live};}aclSaveCache();return aclCatalog}
async function aclWriteCatalog(items,meta={}){if(!aclCanManage())throw new Error('Tài khoản chưa được cấp quyền cập nhật A/C LIMITS.');const now=Date.now(),catalog={kind:ACL_KIND,version:now,dailyDate:meta.dailyDate??aclCatalog.dailyDate??'',dailyVersion:meta.dailyVersion??aclCatalog.dailyVersion??'',items:(items||[]).map(aclNormalizeItem),updatedAtMs:now,updatedBy:aclActor()};const db=aclDb(),old=clone(aclCatalog);await db.collection(HANDOVER_COLLECTION).doc(ACL_DOC).set(catalog,{merge:false});try{await db.collection(HANDOVER_COLLECTION).doc(ACL_HISTORY_PREFIX+now).set({kind:'sags_ac_limits_history_v1',action:String(meta.action||'UPDATE'),oldVersion:Number(old?.version||0),newVersion:now,oldCount:Array.isArray(old?.items)?old.items.length:0,newCount:catalog.items.length,dailyDate:catalog.dailyDate,dailyVersion:catalog.dailyVersion,createdAtMs:now,createdBy:aclActor()},{merge:false})}catch(_){}aclApplyCatalog(catalog);try{if(typeof sagsV470Ref==='function'){await sagsV470Ref(ACL_PUBLIC).set(catalog);await sagsV470Ref(ACL_SIGNAL).set({version:now,action:String(meta.action||'UPDATE'),updatedAtMs:now,updatedBy:aclActor()})}}catch(e){console.info('A/C LIMITS RTDB publish',e?.message||e)}aclEvaluateSoon();return catalog}
async function aclLoadCatalog(force=false){if(!force&&aclCatalog.version)return aclCatalog;let loaded=false;try{if(typeof sagsV470Ref==='function'){const snap=await sagsV470Ref(ACL_PUBLIC).once('value'),d=snap?.val?.();if(d?.version){aclApplyCatalog(d);loaded=true}}}catch(e){console.info('A/C LIMITS RTDB read fallback',e?.message||e)}if(!loaded){try{const s=await aclDb().collection(HANDOVER_COLLECTION).doc(ACL_DOC).get();if(s.exists){const d=s.data()||{};aclApplyCatalog(d);loaded=true;if(aclCanManage()&&typeof sagsV470Ref==='function'){try{await sagsV470Ref(ACL_PUBLIC).set({...d,items:(d.items||[]).map(aclNormalizeItem)})}catch(_){}}}}catch(e){if(!aclCatalog.version)aclLoadCache();if(force&&!aclCatalog.version)throw e}}aclEvaluateSoon();return aclCatalog}
function aclStartSignal(){try{if(aclSignalRef||typeof sagsV470Ref!=='function')return;aclSignalRef=sagsV470Ref(ACL_SIGNAL);aclSignalCb=async snap=>{const v=Number(snap?.val?.()?.version||0);if(v&&v!==Number(aclCatalog.version||0)){try{await aclLoadCatalog(true);aclRenderList()}catch(_){}}};aclSignalRef.on('value',aclSignalCb)}catch(e){console.info('A/C LIMITS signal',e?.message||e)}}
function aclIdentityFor(sessionId,st,meta){st=(st&&typeof st==='object')?st:{};meta=meta||null;let identity={};try{identity=fs09IdentityFromState?.(st,meta)||{}}catch(_){try{identity=opsRampIdentity?.(st,meta)||{}}catch(__){identity={}}}const pick=(...keys)=>{for(const k of keys){const v=String(st?.[k]??'').trim();if(v&&v.toUpperCase()!=='N/A')return v}return ''};let flights=Array.isArray(identity.flights)?identity.flights.map(normFlight).filter(Boolean):[];if(!flights.length){flights=[pick('fltBefore','f421_fltBefore','f551_fltBefore','f09_fltBefore'),pick('fltAfter','f421_fltAfter','f551_fltAfter','f09_fltAfter')].map(normFlight).filter(Boolean)}const reg=normReg(identity.acRegToken||identity.regn||pick('regn','f421_regn','f551_regn','f09_regn','acReg','acreg','f421_acReg','f421_acreg','f551_acReg','f09_acReg'));const date=aclIdentityDate(identity,pick('date','f421_date','f551_date','f09_date'));const sta=pick('sta','f421_sta','f551_sta','f09_sta');const std=pick('std','f421_std','f551_std','f09_std');const etd=pick('etd','f421_etd','f551_etd','f09_etd');const pushback=pick('pushback','f421_pushback','f551_pushback','f09_pushback','h24Start','f421_h24Start','f551_h24Start','f09_h24Start');const sid=String(sessionId||'').trim()||`AUTO_${date}_${flights.join('_')}_${reg}`;return {sessionId:sid,flightLabel:flights.join('/')||String(meta?.name||'CHUYẾN'),flights,reg,date,sta,std,etd,pushback}}
function aclIdentity(){let st={},meta=null,sid='';try{sid=String(typeof activeFlightSessionId!=='undefined'?activeFlightSessionId:'');meta=currentFlightSessionMeta?.()||null;const env=readFlightSessionEnvelope?.(sid)||{};st=(typeof state==='object'&&state)||env?.state||{}}catch(_){st={}}return aclIdentityFor(sid,st,meta)}
function aclContexts(){const out=[],seen=new Set();const add=(sid,st,meta)=>{const c=aclIdentityFor(sid,st,meta);const k=c.sessionId;if(!k||seen.has(k))return;seen.add(k);out.push(c)};try{const active=aclIdentity();add(active.sessionId,(typeof state==='object'&&state)||{},currentFlightSessionMeta?.()||null)}catch(_){}try{const list=typeof readFlightSessionList==='function'?readFlightSessionList():[];(list||[]).forEach(meta=>{const sid=String(meta?.id||'');if(!sid||seen.has(sid))return;const env=readFlightSessionEnvelope?.(sid)||{};add(sid,env?.state||{},meta)})}catch(_){}return out}
function aclIdentityDate(identity,raw){let v=String(identity?.dateToken||raw||'').trim();if(/^\d{8}$/.test(v)){if(Number(v.slice(0,4))>1900)return `${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}`;return `${v.slice(4,8)}-${v.slice(2,4)}-${v.slice(0,2)}`}return aclDateToISO(v)||todayISO()}
function aclClockMinutes(v){const d=String(v||'').replace(/[^0-9]/g,'');if(d.length<3||d.length>4)return null;const s=d.padStart(4,'0'),h=Number(s.slice(0,2)),m=Number(s.slice(2));return h<=23&&m<=59?h*60+m:null}
function aclClockMs(date,clock){const m=aclClockMinutes(clock);if(m===null)return null;const a=String(date||todayISO()).split('-').map(Number);if(a.length!==3||!a[0]||!a[1]||!a[2])return null;return new Date(a[0],a[1]-1,a[2],Math.floor(m/60),m%60,0,0).getTime()}
function aclStaMs(date,sta){return aclClockMs(date,sta)}
function aclIsAsuItem(item){return /(^|[^A-Z])ASU([^A-Z]|$)/i.test(String(item?.restriction||''))}
function aclDepartureMs(ctx){const clock=ctx.etd||ctx.std;if(!clock)return null;let ms=aclClockMs(ctx.date,clock);if(!ms)return null;const staMs=aclStaMs(ctx.date,ctx.sta);if(staMs&&ms+12*60*60*1000<staMs)ms+=24*60*60*1000;return ms}
function aclTimingForItem(item,ctx){if(aclIsAsuItem(item)){const clock=ctx.etd||ctx.std;const ms=aclDepartureMs(ctx);return {kind:'ASU',event:ctx.etd?'ETD':'STD',clock,ms,due:ms?ms-10*60*1000:null}}const ms=aclStaMs(ctx.date,ctx.sta);return {kind:'GENERAL',event:'STA',clock:ctx.sta,ms,due:ms?ms-10*60*1000:null}}
function aclDateWithin(item,date){const f=item.effectiveFrom||'',t=item.effectiveTo||'';if(f&&date<f)return false;if(t&&date>t)return false;return true}
function aclMatch(item,ctx){if(!item.active||!item.restriction||!aclDateWithin(item,ctx.date))return false;const mode=item.matchMode||'REG',fm=item.flightNo?ctx.flights.includes(normFlight(item.flightNo)):false,rm=item.acReg?normReg(item.acReg)===ctx.reg:false;if(mode==='BOTH')return !!item.flightNo&&!!item.acReg&&fm&&rm;if(mode==='FLIGHT')return !!item.flightNo&&fm;return !!item.acReg&&rm}
function aclAckStore(){try{return JSON.parse(localStorage.getItem(ACL_ACK)||'{}')||{}}catch(_){return {}}}
function aclAckKey(ctx,items){const sig=items.map(x=>`${x.id}:${Number(x.updatedAtMs||0)}:${String(x.restriction||'')}`).sort().join(',');return `${ctx.sessionId}|${ctx.date}|${ctx.flightLabel}|${ctx.reg}|${sig}`}
function aclEvaluateSoon(){setTimeout(()=>{try{aclEvaluate()}catch(_){}},80)}
function aclEvaluate(){if(!aclCatalog.version||!aclRole())return;const role=aclRole(),acks=aclAckStore(),now=Date.now();for(const ctx of aclContexts()){if((!ctx.flights.length&&!ctx.reg)||ctx.pushback)continue;const matches=(aclCatalog.items||[]).filter(x=>aclMatch(x,ctx)&&(x.recipientRoles||[]).map(aclNormRole).includes(role));if(!matches.length)continue;for(const kind of ['GENERAL','ASU']){const items=matches.filter(x=>(aclIsAsuItem(x)?'ASU':'GENERAL')===kind);if(!items.length)continue;const timing=aclTimingForItem(items[0],ctx);if(!timing.due||now<timing.due)continue;const key=aclAckKey(ctx,items)+'|'+kind+'|'+String(timing.event||'');if(Number(acks[key]||0)>0)continue;if(aclCurrentAlert?.key===key||aclAlertQueue.some(x=>x.key===key))continue;aclEnqueueAlert({key,ctx,items,dueAtMs:timing.due,catalogVersion:aclCatalog.version,timing})}}}
function aclEnqueueAlert(a){aclAlertQueue.push(a);aclTryShowNext()}
function aclTryShowNext(){if(aclCurrentAlert||!aclAlertQueue.length)return;try{if(typeof opsVisibleAlerts!=='undefined'&&opsVisibleAlerts.size){setTimeout(aclTryShowNext,1200);return}}catch(_){}aclCurrentAlert=aclAlertQueue.shift();aclShowAlert(aclCurrentAlert)}
function aclShowAlert(a){aclEnsureUi();const f=$('aclAlertFlight'),b=$('aclAlertBody'),t=a.timing||{event:'STA',clock:a.ctx.sta,kind:'GENERAL'};if(f)f.textContent=`${a.ctx.flightLabel}${a.ctx.reg?' · A/C '+a.ctx.reg:''} · ${t.event} ${t.clock||'—'} · ${t.kind==='ASU'?'CẢNH BÁO ASU T-10':'CẢNH BÁO A/C LIMITS T-10'}`;if(b)b.innerHTML=a.items.map(x=>`<div class="aclAlertLine"><b>${esc(x.category)}</b>${x.displayReg||x.acReg?` · ${esc(x.displayReg||x.acReg)}`:''}${x.flightNo?` · ${esc(x.flightNo)}`:''}<br>${esc(x.restriction)}</div>`).join('');$('aclAlertModal').style.display='flex';try{navigator.vibrate?.([450,180,450])}catch(_){}try{writeUserActivity?.(t.kind==='ASU'?'A/C LIMITS · ASU T-10':'A/C LIMITS · STA T-10',`${a.ctx.flightLabel} · ${a.ctx.reg} · ${a.items.length} cảnh báo`,{acLimitCount:a.items.length,sta:a.ctx.sta,std:a.ctx.std,etd:a.ctx.etd,triggerEvent:t.event,triggerClock:t.clock})}catch(_){}}
function aclAckAlert(){if(!aclCurrentAlert)return;const acks=aclAckStore();acks[aclCurrentAlert.key]=Date.now();try{localStorage.setItem(ACL_ACK,JSON.stringify(acks))}catch(_){}$('aclAlertModal').style.display='none';aclCurrentAlert=null;setTimeout(aclTryShowNext,180)}
function aclInit(){aclEnsureUi();aclLoadCache();aclRefreshRoleUI();aclLoadCatalog(false).catch(()=>{});aclStartSignal();if(aclPollTimer)clearInterval(aclPollTimer);aclPollTimer=setInterval(()=>{aclRefreshRoleUI();aclEvaluate()},5000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)aclEvaluateSoon()});window.addEventListener('pageshow',aclEvaluateSoon)}
window.aclOpenAdmin=aclOpenAdmin;window.aclCloseAdmin=aclCloseAdmin;window.aclTab=aclTab;window.aclSaveManual=aclSaveManual;window.aclClearManual=aclClearManual;window.aclQuickParse=aclQuickParse;window.aclLoadCatalog=aclLoadCatalog;window.aclRenderList=aclRenderList;window.aclToggleItem=aclToggleItem;window.aclDeleteItem=aclDeleteItem;window.aclEditItem=aclEditItem;window.aclAckAlert=aclAckAlert;window.aclEvaluate=aclEvaluate;window.aclShowDiagnostic=aclShowDiagnostic;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',aclInit,{once:true});else setTimeout(aclInit,0);
})();

/* ===== END ac-limits.js ===== */

/* ===== BEGIN ac-limits-simple.js ===== */
/* E-REPORT SAGS · A/C LIMITS SIMPLE ENTRY · V1.88
 * Admin UI only. Existing ac-limits.js remains the runtime alert engine.
 * Workflow: A/C REG first -> tick APU INOP / HOLD INOP / OTHER.
 */
(()=>{
'use strict';

const BUILD='V1.103-20260820-01';
const DOC='AC_LIMITS_CATALOG_V1';
const HISTORY_PREFIX='AC_LIMITS_HISTORY_';
const KIND='sags_ac_limits_catalog_v1';
const PUBLIC_PATH='ac_limits/catalog_public';
const SIGNAL_PATH='ac_limits/catalog_signal';
const DEFAULT_ROLES=['DH','CBTT','VHTTB','PVHK','PVHLNG'];
const ALL_ROLES=['DH','CBTT','PVHK','VHTTB','KTTB','PVHLNG','LOSTFOUND','AD'];
let catalog={version:0,items:[],dailyDate:'',dailyVersion:''};
let editingId='';
let lastReg='';

const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normReg=v=>String(v??'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
const displayReg=v=>String(v??'').trim().toUpperCase();
const todayISO=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const uid=()=>`ACL_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`.toUpperCase();
const clone=v=>JSON.parse(JSON.stringify(v??null));
function role(){try{return String(currentRole||currentUserProfile?.role||'').trim().toUpperCase()}catch(_){return ''}}
function isAdmin(){return role()==='AD'||(typeof window.v485Can==='function'&&window.v485Can('AC_LIMITS'))}
function actor(){try{return currentActor?.()||{role:role(),username:String(currentUserProfile?.username||'')}}catch(_){return {role:role()}}}
function collectionName(){try{if(typeof HANDOVER_COLLECTION!=='undefined'&&HANDOVER_COLLECTION)return HANDOVER_COLLECTION}catch(_){}throw new Error('Không xác định được HANDOVER_COLLECTION.')}
function db(){if(typeof initHandoverFirebase!=='function')throw new Error('Firebase chưa sẵn sàng.');return initHandoverFirebase()}
function normalizeItem(x={}){
  return {
    ...x,
    id:String(x.id||uid()),
    source:String(x.source||'MANUAL').toUpperCase(),
    active:x.active!==false,
    airline:String(x.airline||'').trim().toUpperCase(),
    flightNo:String(x.flightNo||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,''),
    acReg:normReg(x.acReg||x.displayReg||''),
    displayReg:displayReg(x.displayReg||x.acReg||''),
    matchMode:String(x.matchMode||'REG').toUpperCase(),
    category:String(x.category||'OTHERS').toUpperCase(),
    restriction:String(x.restriction||'').trim(),
    effectiveFrom:String(x.effectiveFrom||''),
    effectiveTo:String(x.effectiveTo||''),
    batchDate:String(x.batchDate||''),
    batchVersion:String(x.batchVersion||''),
    recipientRoles:[...new Set((x.recipientRoles||DEFAULT_ROLES).map(v=>String(v||'').trim().toUpperCase()).filter(Boolean))],
    createdAtMs:Number(x.createdAtMs||Date.now()),
    updatedAtMs:Number(x.updatedAtMs||Date.now()),
    createdBy:x.createdBy||null,
    updatedBy:x.updatedBy||null
  };
}
function friendlyCategory(c){c=String(c||'').toUpperCase();if(c==='APU INOP')return 'APU INOP';if(c==='HOLD INOP/ISSUES')return 'HOLD INOP';if(c==='OTHERS')return 'OTHER';return c||'OTHER'}
function fleetMap(){try{return sagsDynamicFleetCache?.()?.byReg||{}}catch(_){return {}}}
async function refreshFleet(){try{if(typeof refreshDynamicFleetCache==='function')await refreshDynamicFleetCache(false)}catch(_){}renderRegOptions()}
function fleetInfo(reg){const key=normReg(reg),map=fleetMap();return map[key]||Object.values(map).find(x=>normReg(x?.reg)===key)||null}
function renderRegOptions(){
  const list=$('aclSRegList');if(!list)return;
  const rows=Object.values(fleetMap()).filter(Boolean).sort((a,b)=>String(a.reg||'').localeCompare(String(b.reg||'')));
  list.innerHTML=rows.map(x=>`<option value="${esc(x.reg||'')}">${esc([x.airline,x.acType].filter(Boolean).join(' · '))}</option>`).join('');
  updateFleetHint();
}
function updateFleetHint(){
  const reg=$('aclSReg')?.value||'',info=fleetInfo(reg),h=$('aclSFleetHint');if(!h)return;
  h.textContent=info?`✓ ${info.airline||''}${info.acType?' · '+info.acType:''}`:(reg?'REG chưa có trong Fleet — vẫn có thể lưu LIMIT theo REG này.':'Chọn A/C REG trước để mở phần loại LIMIT.');
  h.classList.toggle('warn',!!reg&&!info);
  const types=$('aclSTypes');if(types)types.classList.toggle('disabled',!normReg(reg));
}
async function loadCatalog(force=false){
  if(!force&&catalog.version)return catalog;
  let loaded=null;
  try{if(typeof sagsV470Ref==='function'){const s=await sagsV470Ref(PUBLIC_PATH).once('value');const d=s?.val?.();if(d?.version)loaded=d}}catch(_){}
  if(!loaded){try{const s=await db().collection(collectionName()).doc(DOC).get();if(s.exists)loaded=s.data()||{}}catch(e){if(force)throw e}}
  if(loaded)catalog={version:Number(loaded.version||0),items:(loaded.items||[]).map(normalizeItem),dailyDate:String(loaded.dailyDate||''),dailyVersion:String(loaded.dailyVersion||'')};
  return catalog;
}
async function writeCatalog(items,action='SIMPLE_UPDATE'){
  if(!isAdmin())throw new Error('Tài khoản chưa được AD cấp quyền A/C LIMITS.');
  const now=Date.now(),old=clone(catalog),next={kind:KIND,version:now,dailyDate:catalog.dailyDate||'',dailyVersion:catalog.dailyVersion||'',items:(items||[]).map(normalizeItem),updatedAtMs:now,updatedBy:actor()};
  const dbase=db(),col=collectionName();
  await dbase.collection(col).doc(DOC).set(next,{merge:false});
  try{await dbase.collection(col).doc(HISTORY_PREFIX+now).set({kind:'sags_ac_limits_history_v1',action,oldVersion:Number(old?.version||0),newVersion:now,oldCount:Array.isArray(old?.items)?old.items.length:0,newCount:next.items.length,dailyDate:next.dailyDate,dailyVersion:next.dailyVersion,createdAtMs:now,createdBy:actor()},{merge:false})}catch(_){}
  catalog={...next,items:next.items.map(normalizeItem)};
  try{if(typeof sagsV470Ref==='function'){await sagsV470Ref(PUBLIC_PATH).set(next);await sagsV470Ref(SIGNAL_PATH).set({version:now,action,updatedAtMs:now,updatedBy:actor()})}}catch(e){console.info('A/C LIMITS simple RTDB publish',e?.message||e)}
  try{await window.aclLoadCatalog?.(true);window.aclEvaluate?.()}catch(_){}
  return catalog;
}
function selectedRoles(){return [...document.querySelectorAll('#aclSimpleModal input[data-acls-role]:checked')].map(x=>x.dataset.aclsRole).filter(Boolean)}
function selectedEquipment(){return ['GPU','ACU','ASU'].filter(x=>$('aclSEq'+x)?.checked)}
function checked(id){return !!$(id)?.checked}
function setChecked(id,on){const e=$(id);if(e)e.checked=!!on}
function toggleSections(){
  const enabled=!!normReg($('aclSReg')?.value);
  ['aclSApuBox','aclSHoldBox','aclSOtherBox'].forEach(id=>{const e=$(id);if(e)e.style.opacity=enabled?'1':'.48'});
  const apu=$('aclSApuDetail'),hold=$('aclSHoldDetail'),other=$('aclSOtherDetail');
  if(apu)apu.style.display=enabled&&checked('aclSApu')?'block':'none';
  if(hold)hold.style.display=enabled&&checked('aclSHold')?'block':'none';
  if(other)other.style.display=enabled&&checked('aclSOther')?'block':'none';
}
function status(text,err=false){const e=$('aclSStatus');if(!e)return;e.textContent=text||'';e.classList.toggle('err',!!err);e.classList.toggle('ok',!!text&&!err)}
function aclActionPopup(type,title,message){
  try{if(typeof window.sagsActionPopup==='function')window.sagsActionPopup({type,title,message});}catch(_){}
}
function clearForm(keepReg=false){
  editingId='';
  if(!keepReg&&$('aclSReg'))$('aclSReg').value='';
  ['aclSApu','aclSEqGPU','aclSEqACU','aclSEqASU','aclSHold','aclSOther'].forEach(id=>setChecked(id,false));
  if($('aclSHoldText'))$('aclSHoldText').value='';if($('aclSOtherText'))$('aclSOtherText').value='';
  if($('aclSFrom'))$('aclSFrom').value=todayISO();if($('aclSTo'))$('aclSTo').value=todayISO();
  document.querySelectorAll('#aclSimpleModal input[data-acls-role]').forEach(x=>x.checked=DEFAULT_ROLES.includes(x.dataset.aclsRole));
  const b=$('aclSSave');if(b)b.textContent='LƯU LIMIT';
  toggleSections();updateFleetHint();
}
function buildGeneratedItems(){
  const rawReg=displayReg($('aclSReg')?.value),reg=normReg(rawReg),from=$('aclSFrom')?.value||todayISO(),to=$('aclSTo')?.value||from,roles=selectedRoles();
  if(!reg)throw new Error('Chọn A/C REG trước.');if(!roles.length)throw new Error('Chọn ít nhất 1 đối tượng nhận cảnh báo.');
  const base={source:'MANUAL',active:true,airline:String(fleetInfo(rawReg)?.airline||''),flightNo:'',acReg:reg,displayReg:rawReg,matchMode:'REG',effectiveFrom:from,effectiveTo:to,recipientRoles:roles,updatedAtMs:Date.now(),updatedBy:actor()};
  const out=[];
  if(checked('aclSApu')){const eq=selectedEquipment(),text=eq.length?`APU INOP · NEED ${eq.join(' / ')}`:'APU INOP';out.push(normalizeItem({...base,category:'APU INOP',restriction:text}))}
  if(checked('aclSHold')){const text=String($('aclSHoldText')?.value||'').trim();if(!text)throw new Error('HOLD INOP đã tích — cần dán nội dung HOLD từ file LIMIT.');out.push(normalizeItem({...base,category:'HOLD INOP/ISSUES',restriction:text}))}
  if(checked('aclSOther')){const text=String($('aclSOtherText')?.value||'').trim();if(!text)throw new Error('OTHER đã tích — cần dán nội dung từ file LIMIT.');out.push(normalizeItem({...base,category:'OTHERS',restriction:text}))}
  if(!out.length)throw new Error('Tích ít nhất một loại LIMIT: APU INOP / HOLD INOP / OTHER.');
  return out;
}
async function save(){
  try{
    status('Đang lưu...');await loadCatalog(true);const made=buildGeneratedItems(),reg=made[0].acReg,now=Date.now();let arr=(catalog.items||[]).slice();
    if(editingId){arr=arr.filter(x=>x.id!==editingId)}
    for(let i=0;i<made.length;i++){
      const n=made[i],same=arr.find(x=>normReg(x.acReg)===reg&&String(x.category).toUpperCase()===String(n.category).toUpperCase());
      const old=(i===0&&editingId)?(catalog.items||[]).find(x=>x.id===editingId):same;
      if(same)arr=arr.filter(x=>x.id!==same.id);
      n.id=old?.id||uid();n.createdAtMs=Number(old?.createdAtMs||now);n.createdBy=old?.createdBy||actor();n.updatedAtMs=now;n.updatedBy=actor();n.active=true;
      arr.push(normalizeItem(n));
    }
    const wasEditing=!!editingId;
    await writeCatalog(arr,wasEditing?'SIMPLE_EDIT':'SIMPLE_UPSERT');lastReg=made[0].displayReg||made[0].acReg;
    const msg=`Đã ${wasEditing?'cập nhật':'lưu'} ${made.length} LIMIT cho ${lastReg}.`;
    status(`✓ ${msg}`);clearForm(true);renderList();
    if(!window.__SAGS_ACL_BATCH_SAVE_ACTIVE)aclActionPopup('success',wasEditing?'ĐÃ CẬP NHẬT A/C LIMITS':'ĐÃ LƯU A/C LIMITS',msg);
  }catch(e){
    const msg=String(e?.message||e);status(msg,true);
    if(!window.__SAGS_ACL_BATCH_SAVE_ACTIVE)aclActionPopup('error','KHÔNG LƯU ĐƯỢC A/C LIMITS',msg);
  }
}
async function toggleItem(id,on){
  try{
    await loadCatalog(true);const arr=(catalog.items||[]).map(x=>x.id===id?normalizeItem({...x,active:!!on,updatedAtMs:Date.now(),updatedBy:actor()}):x);
    await writeCatalog(arr,on?'SIMPLE_REACTIVATE':'SIMPLE_DEACTIVATE');renderList();
    aclActionPopup('success',on?'ĐÃ BẬT A/C LIMIT':'ĐÃ TẮT A/C LIMIT',on?'Cảnh báo đã được kích hoạt lại.':'Cảnh báo đã được tắt.');
  }catch(e){const msg=String(e?.message||e);status(msg,true);aclActionPopup('error','KHÔNG CẬP NHẬT ĐƯỢC A/C LIMIT',msg)}
}
async function deleteItem(id){
  if(!confirm('Xóa LIMIT này?'))return;
  try{
    await loadCatalog(true);await writeCatalog((catalog.items||[]).filter(x=>x.id!==id),'SIMPLE_DELETE');renderList();
    aclActionPopup('success','ĐÃ XÓA A/C LIMIT','LIMIT đã được xóa khỏi danh sách đang hiệu lực.');
  }catch(e){const msg=String(e?.message||e);status(msg,true);aclActionPopup('error','KHÔNG XÓA ĐƯỢC A/C LIMIT',msg)}
}
function editItem(id){
  const x=(catalog.items||[]).find(v=>v.id===id);if(!x)return;editingId=id;
  $('aclSReg').value=x.displayReg||x.acReg||'';$('aclSFrom').value=x.effectiveFrom||todayISO();$('aclSTo').value=x.effectiveTo||x.effectiveFrom||todayISO();
  ['aclSApu','aclSEqGPU','aclSEqACU','aclSEqASU','aclSHold','aclSOther'].forEach(k=>setChecked(k,false));$('aclSHoldText').value='';$('aclSOtherText').value='';
  const cat=String(x.category||'').toUpperCase();
  if(cat==='APU INOP'){setChecked('aclSApu',true);const t=String(x.restriction||'').toUpperCase();['GPU','ACU','ASU'].forEach(eq=>setChecked('aclSEq'+eq,t.includes(eq)))}
  else if(cat==='HOLD INOP/ISSUES'){setChecked('aclSHold',true);$('aclSHoldText').value=x.restriction||''}
  else {setChecked('aclSOther',true);$('aclSOtherText').value=x.restriction||''}
  document.querySelectorAll('#aclSimpleModal input[data-acls-role]').forEach(c=>c.checked=(x.recipientRoles||[]).includes(c.dataset.aclsRole));
  $('aclSSave').textContent='LƯU THAY ĐỔI';updateFleetHint();toggleSections();status(`Đang sửa ${friendlyCategory(x.category)} · ${x.displayReg||x.acReg}.`);$('aclSimplePanel')?.scrollTo({top:0,behavior:'smooth'});
}
function itemDay(x){const d=String(x?.effectiveFrom||x?.batchDate||'').trim();if(/^\d{4}-\d{2}-\d{2}$/.test(d))return d;const ms=Number(x?.createdAtMs||x?.updatedAtMs||0);if(ms){const z=new Date(ms);if(!Number.isNaN(z.getTime()))return `${z.getFullYear()}-${String(z.getMonth()+1).padStart(2,'0')}-${String(z.getDate()).padStart(2,'0')}`}return 'KHONG_NGAY'}
function dayLabel(day){if(day==='KHONG_NGAY')return 'KHÔNG XÁC ĐỊNH NGÀY';const a=String(day).split('-');return a.length===3?`${a[2]}/${a[1]}/${a[0]}`:day}
function itemHtml(x){const reg=x.displayReg||x.acReg||'',cat=friendlyCategory(x.category),roles=(x.recipientRoles||[]).join(', '),date=x.effectiveFrom===x.effectiveTo?(x.effectiveFrom||''):`${x.effectiveFrom||''} → ${x.effectiveTo||''}`;return `<div class="acls-item ${x.active?'':'off'}"><div class="acls-item-head"><label class="acls-select"><input type="checkbox" data-acls-select="${esc(x.id)}"> <span><b>${esc(reg||'—')}</b>${x.flightNo?` · <b>${esc(x.flightNo)}</b>`:''}</span></label><span class="acls-badge ${cat==='APU INOP'?'apu':cat==='HOLD INOP'?'hold':'other'}">${esc(cat)}</span><span class="acls-state">${x.active?'ĐANG BẬT':'ĐÃ TẮT'}</span></div><div class="acls-text">${esc(x.restriction||'')}</div><div class="acls-meta">${esc(date)} · Nhận: ${esc(roles)}</div><div class="acls-actions"><button onclick="aclSimpleEdit('${esc(x.id)}')">SỬA</button><button onclick="aclSimpleToggle('${esc(x.id)}',${x.active?'false':'true'})">${x.active?'TẮT':'BẬT'}</button><button class="danger" onclick="aclSimpleDelete('${esc(x.id)}')">XÓA</button></div></div>`}
function renderList(){const h=$('aclSList');if(!h)return;const q=String($('aclSFilter')?.value||'').trim().toUpperCase(),dateFilter=String($('aclSDateFilter')?.value||'').trim();const arr=(catalog.items||[]).slice().filter(x=>{const hay=[x.displayReg,x.acReg,x.flightNo,x.restriction,x.category].join(' ').toUpperCase();return (!q||hay.includes(q))&&(!dateFilter||itemDay(x)===dateFilter)}).sort((a,b)=>itemDay(b).localeCompare(itemDay(a))||Number(b.active)-Number(a.active)||Number(b.updatedAtMs)-Number(a.updatedAtMs));const groups=new Map();for(const x of arr){const d=itemDay(x);if(!groups.has(d))groups.set(d,[]);groups.get(d).push(x)}h.innerHTML=groups.size?[...groups.entries()].map(([day,items])=>`<section class="acls-day" data-day="${esc(day)}"><div class="acls-day-head"><label><input type="checkbox" onchange="aclSimpleSelectDay('${esc(day)}',this.checked)"> <b>${esc(dayLabel(day))}</b> <span>${items.length} LIMIT</span></label><button class="acls-day-delete danger" onclick="aclSimpleDeleteDay('${esc(day)}')">XÓA NGÀY</button></div><div class="acls-day-body">${items.map(itemHtml).join('')}</div></section>`).join(''):'<div class="acls-empty">Chưa có LIMIT phù hợp.</div>';const n=$('aclSVisibleCount');if(n)n.textContent=`${arr.length} LIMIT`}
async function deleteMany(ids,action,label){
  ids=[...new Set((ids||[]).map(String).filter(Boolean))];if(!ids.length)return;
  try{
    await loadCatalog(true);const set=new Set(ids),before=(catalog.items||[]).length;
    await writeCatalog((catalog.items||[]).filter(x=>!set.has(String(x.id))),action);
    const removed=before-(catalog.items||[]).length;renderList();const msg=`Đã xóa ${removed} LIMIT${label?' · '+label:''}.`;status(`✓ ${msg}`);aclActionPopup('success','ĐÃ XÓA A/C LIMITS',msg);
  }catch(e){const msg='Không xóa được LIMIT: '+String(e?.message||e);status(msg,true);aclActionPopup('error','KHÔNG XÓA ĐƯỢC A/C LIMITS',msg)}
}
async function deleteSelected(){const ids=[...document.querySelectorAll('#aclSList input[data-acls-select]:checked')].map(x=>x.dataset.aclsSelect);if(!ids.length)return alert('Chưa chọn LIMIT cần xóa.');if(!confirm(`Xóa ${ids.length} LIMIT đã chọn?\n\nCác cảnh báo đang chờ của những LIMIT này cũng sẽ được hủy.`))return;await deleteMany(ids,'SIMPLE_DELETE_SELECTED','đã chọn')}
async function deleteDay(day){const ids=(catalog.items||[]).filter(x=>itemDay(x)===day).map(x=>x.id);if(!ids.length)return;if(!confirm(`Xóa TOÀN BỘ ${ids.length} LIMIT ngày ${dayLabel(day)}?\n\nAudit/lịch sử sự kiện đã phát sinh không bị sửa.`))return;await deleteMany(ids,'SIMPLE_DELETE_DAY',dayLabel(day))}
function selectDay(day,on){document.querySelectorAll('#aclSList section.acls-day').forEach(sec=>{if(sec.dataset.day===day)sec.querySelectorAll('input[data-acls-select]').forEach(x=>x.checked=!!on)})}
function rolesHtml(){return ALL_ROLES.map(r=>`<label class="acls-role"><input type="checkbox" data-acls-role="${r}" ${DEFAULT_ROLES.includes(r)?'checked':''}> ${r}</label>`).join('')}
function ensureCss(){if($('aclSimpleStyle'))return;const s=document.createElement('style');s.id='aclSimpleStyle';s.textContent=`
#aclSimpleModal{position:fixed;inset:0;z-index:16050;display:none;background:rgba(4,14,25,.72);padding:max(8px,env(safe-area-inset-top)) 7px max(8px,env(safe-area-inset-bottom));box-sizing:border-box;align-items:flex-start;justify-content:center;overflow:auto}.acls-panel{width:min(98vw,780px);max-height:96dvh;overflow:auto;background:#f7f9fb;border-radius:18px;padding:14px;box-sizing:border-box;color:#193047;font:14px/1.4 Arial;box-shadow:0 18px 54px rgba(0,0,0,.38)}.acls-top{position:sticky;top:-14px;z-index:5;background:#f7f9fb;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 0 11px;border-bottom:1px solid #d6e0e8}.acls-top h3{margin:0;color:#003b8e;font:900 20px Arial}.acls-close{border:0;border-radius:10px;padding:10px 13px;background:#e5ebf0;font-weight:900}.acls-step{background:#fff;border:1px solid #d9e2ea;border-radius:14px;padding:12px;margin:10px 0}.acls-step-title{font:900 15px Arial;color:#17324d;margin-bottom:8px}.acls-num{display:inline-grid;place-items:center;width:25px;height:25px;border-radius:50%;background:#003b8e;color:#fff;margin-right:6px}.acls-reg{width:100%;box-sizing:border-box;border:2px solid #7b93a8;border-radius:12px;padding:13px 14px;font:900 20px Arial;text-transform:uppercase;background:#fff}.acls-hint{margin-top:7px;font-weight:800;color:#426078}.acls-hint.warn{color:#9a5b00}.acls-types.disabled{pointer-events:none}.acls-type{display:block;border:2px solid #ced8e1;border-radius:13px;padding:11px;margin:8px 0;background:#fbfcfd}.acls-type:has(>label>input:checked){border-color:#0b67b2;background:#eef7ff}.acls-type>label{display:flex;align-items:center;gap:9px;font:900 17px Arial;cursor:pointer}.acls-type input[type=checkbox]{width:22px;height:22px;accent-color:#075ea8}.acls-detail{display:none;margin:10px 0 0 31px;padding-top:9px;border-top:1px dashed #cad5de}.acls-equipment{display:flex;gap:8px;flex-wrap:wrap}.acls-chip{display:flex;align-items:center;gap:6px;border:1px solid #bfcbd5;border-radius:999px;padding:8px 12px;background:#fff;font-weight:900}.acls-textarea{width:100%;min-height:76px;box-sizing:border-box;border:1px solid #9fb0bf;border-radius:10px;padding:10px;font:700 14px Arial;resize:vertical}.acls-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.acls-grid label{font-weight:900;font-size:11px;color:#54697a}.acls-date{width:100%;box-sizing:border-box;border:1px solid #aab9c5;border-radius:9px;padding:9px;font-weight:800}.acls-roles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:8px}.acls-role{border:1px solid #d2dce5;border-radius:8px;padding:7px;background:#fff;font-weight:800}.acls-role input{accent-color:#075ea8}.acls-save-row{display:flex;gap:8px;flex-wrap:wrap;position:sticky;bottom:-14px;background:#f7f9fb;padding:10px 0 4px;z-index:4}.acls-save{flex:1;min-width:190px;border:0;border-radius:11px;padding:13px;background:#0a6d45;color:#fff;font:900 16px Arial}.acls-reset{border:1px solid #bdc9d3;border-radius:11px;padding:12px;background:#fff;font-weight:900}.acls-status{min-height:20px;font-weight:900;color:#0a6d45}.acls-status.err{color:#b42318}.acls-list-head{display:flex;gap:8px;align-items:center;justify-content:space-between}.acls-filter{width:min(210px,48%);border:1px solid #a9b8c4;border-radius:9px;padding:8px;font-weight:800;text-transform:uppercase}.acls-item{border:1px solid #d5dee6;border-radius:11px;padding:10px;margin:8px 0;background:#fff}.acls-item.off{opacity:.58}.acls-item-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.acls-item-head b{font-size:16px}.acls-badge{display:inline-block;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:900}.acls-badge.apu{background:#fff0d7;color:#8c5700}.acls-badge.hold{background:#e9f2ff;color:#15528a}.acls-badge.other{background:#eceff3;color:#4b5662}.acls-state{font-size:10px;font-weight:900;color:#557}.acls-text{white-space:pre-wrap;font-weight:800;margin:7px 0}.acls-meta,.acls-legacy{font-size:11px;color:#657788}.acls-actions{display:flex;gap:6px;margin-top:8px}.acls-actions button{border:1px solid #bcc9d4;border-radius:8px;padding:7px 10px;background:#f4f7f9;font-weight:900}.acls-actions .danger{border-color:#e3b4b0;color:#a51f16}.acls-sub{margin-top:3px;font-size:11px;color:#657788;font-weight:800}.acls-filter-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.acls-filter-row .acls-filter{width:auto;min-width:180px;flex:1}.acls-bulk,.acls-day-delete{border:1px solid #e3b4b0;border-radius:8px;padding:8px 10px;background:#fff;color:#a51f16;font-weight:900}.acls-day{border:1px solid #cfdae4;border-radius:12px;background:#f8fafc;margin:9px 0;overflow:hidden}.acls-day-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 10px;background:#eaf2f9;border-bottom:1px solid #d3dee8}.acls-day-head label{display:flex;align-items:center;gap:6px;font-weight:900;color:#173f60}.acls-day-head span{font-size:11px;color:#5c7184}.acls-day-body{padding:3px 8px 7px}.acls-select{display:flex;align-items:center;gap:7px;min-width:0;flex:1}.acls-select input{width:18px;height:18px;accent-color:#075ea8}.acls-empty{padding:14px;text-align:center;color:#617485;font-weight:800}.acls-help{font-size:12px;color:#506778;background:#eef4f8;border-radius:10px;padding:9px;margin-top:10px}.acls-help summary{font-weight:900;cursor:pointer}
@media(max-width:620px){.acls-grid{grid-template-columns:1fr}.acls-roles{grid-template-columns:repeat(2,minmax(0,1fr))}.acls-panel{padding:10px}.acls-top{top:-10px}.acls-detail{margin-left:0}.acls-item-head{align-items:flex-start;flex-wrap:wrap}.acls-list-head{align-items:stretch;flex-direction:column}.acls-filter{width:100%}.acls-filter-row{display:grid;grid-template-columns:1fr 1fr}.acls-filter-row .acls-filter{width:100%;min-width:0}.acls-bulk{grid-column:1/-1}.acls-day-head{align-items:flex-start}.acls-day-head label{flex-wrap:wrap}}
`;document.head.appendChild(s)}
function ensureUi(){
  ensureCss();if($('aclSimpleModal'))return;
  const d=document.createElement('div');d.id='aclSimpleModal';d.innerHTML=`<div id="aclSimplePanel" class="acls-panel"><div class="acls-top"><h3>A/C LIMITS</h3><button class="acls-close" onclick="aclSimpleClose()">ĐÓNG</button></div>
  <div id="aclSStatus" class="acls-status"></div>
  <div class="acls-step"><div class="acls-step-title"><span class="acls-num">1</span>CHỌN A/C REG</div><input id="aclSReg" class="acls-reg" list="aclSRegList" placeholder="VD: HL7269" autocomplete="off"><datalist id="aclSRegList"></datalist><div id="aclSFleetHint" class="acls-hint">Chọn A/C REG trước để mở phần loại LIMIT.</div></div>
  <div id="aclSTypes" class="acls-step acls-types disabled"><div class="acls-step-title"><span class="acls-num">2</span>TÍCH LOẠI LIMIT</div>
    <div id="aclSApuBox" class="acls-type"><label><input id="aclSApu" type="checkbox"> APU INOP</label><div id="aclSApuDetail" class="acls-detail"><div style="font-weight:900;margin-bottom:7px">Cần thiết bị nào?</div><div class="acls-equipment"><label class="acls-chip"><input id="aclSEqGPU" type="checkbox"> GPU</label><label class="acls-chip"><input id="aclSEqACU" type="checkbox"> ACU</label><label class="acls-chip"><input id="aclSEqASU" type="checkbox"> ASU</label></div></div></div>
    <div id="aclSHoldBox" class="acls-type"><label><input id="aclSHold" type="checkbox"> HOLD INOP</label><div id="aclSHoldDetail" class="acls-detail"><textarea id="aclSHoldText" class="acls-textarea" placeholder="Dán nguyên nội dung HOLD từ file LIMIT..."></textarea></div></div>
    <div id="aclSOtherBox" class="acls-type"><label><input id="aclSOther" type="checkbox"> OTHER</label><div id="aclSOtherDetail" class="acls-detail"><textarea id="aclSOtherText" class="acls-textarea" placeholder="Dán nguyên nội dung OTHER từ file LIMIT..."></textarea></div></div>
  </div>
  <div class="acls-step"><div class="acls-step-title"><span class="acls-num">3</span>ÁP DỤNG</div><div class="acls-grid"><label>TỪ NGÀY<input id="aclSFrom" class="acls-date" type="date"></label><label>ĐẾN NGÀY<input id="aclSTo" class="acls-date" type="date"></label></div><details class="acls-help"><summary>ĐỐI TƯỢNG NHẬN CẢNH BÁO</summary><div class="acls-roles">${rolesHtml()}</div></details></div>
  <div class="acls-save-row"><button id="aclSSave" class="acls-save" onclick="aclSimpleSave()">LƯU LIMIT</button><button class="acls-reset" onclick="aclSimpleClear()">XÓA Ô</button></div>
  <div class="acls-step"><div class="acls-list-head"><div><div class="acls-step-title" style="margin:0">QUẢN LÝ HỒ SƠ LIMIT</div><div class="acls-sub"><span id="aclSVisibleCount">0 LIMIT</span> · Gom theo ngày hiệu lực</div></div><div class="acls-filter-row"><input id="aclSFilter" class="acls-filter" placeholder="Tìm Flight / A/C Reg / nội dung"><input id="aclSDateFilter" class="acls-filter" type="date"><button class="acls-bulk danger" onclick="aclSimpleDeleteSelected()">XÓA ĐÃ CHỌN</button></div></div><div id="aclSList"></div></div>
  <details class="acls-help"><summary>HDSD A/C LIMITS</summary><ol><li>Chọn <b>A/C REG</b> rồi nhập tay, hoặc dán nhanh nội dung LIMIT vào biểu mẫu.</li><li>Hồ sơ LIMIT được <b>gom theo ngày hiệu lực</b>, có tìm Flight/A/C Reg/nội dung và lọc ngày.</li><li>Có thể XÓA từng LIMIT, <b>XÓA ĐÃ CHỌN</b> hoặc <b>XÓA NGÀY</b>. LIMIT đã xóa/tắt được hủy khỏi popup đang chờ.</li><li>Audit/lịch sử sự kiện đã phát sinh vẫn giữ nguyên.</li><li>LIMIT chung cảnh báo STA-10; nội dung có ASU dùng ETD-10, chưa có ETD thì STD-10.</li></ol></details>
  </div>`;document.body.appendChild(d);
  $('aclSFrom').value=todayISO();$('aclSTo').value=todayISO();
  $('aclSReg').addEventListener('input',()=>{updateFleetHint();toggleSections()});
  ['aclSApu','aclSHold','aclSOther'].forEach(id=>$(id).addEventListener('change',toggleSections));
  $('aclSFilter').addEventListener('input',renderList);$('aclSDateFilter').addEventListener('change',renderList);
}
async function open(){
  if(!isAdmin())return alert('Tài khoản chưa được AD cấp quyền A/C LIMITS.');ensureUi();
  try{const old=$('aclAdminModal');if(old)old.style.display='none'}catch(_){}
  $('aclSimpleModal').style.display='flex';status('Đang tải LIMIT...');
  try{await Promise.all([loadCatalog(true),refreshFleet()]);renderRegOptions();renderList();if(!editingId)clearForm(false);status('')}catch(e){const msg='Không tải được A/C LIMITS: '+String(e?.message||e);status(msg,true);aclActionPopup('error','KHÔNG TẢI ĐƯỢC A/C LIMITS',msg)}
}
function close(){const m=$('aclSimpleModal');if(m)m.style.display='none'}
function patchButton(){const b=$('roleBtnAcLimits');if(!b)return;if(!b.dataset.aclSimple){b.dataset.aclSimple='1';b.onclick=e=>{e?.preventDefault?.();open();return false}}if(typeof window.v485Can==='function')b.style.display=window.v485Can('AC_LIMITS')?'inline-flex':'none'}
function init(){ensureUi();patchButton();refreshFleet();const mo=new MutationObserver(patchButton),host=document.querySelector('.toolbar.compact-main-toolbar')||document.body;mo.observe(host,{childList:true,subtree:true});window.addEventListener('pageshow',()=>setTimeout(patchButton,80),{passive:true});window.aclOpenAdmin=open;window.aclCloseAdmin=close}

window.aclSimpleOpen=open;window.aclSimpleClose=close;window.aclSimpleSave=save;window.aclSimpleClear=()=>{clearForm(false);status('')};window.aclSimpleEdit=editItem;window.aclSimpleToggle=toggleItem;window.aclSimpleDelete=deleteItem;window.aclSimpleDeleteSelected=deleteSelected;window.aclSimpleDeleteDay=deleteDay;window.aclSimpleSelectDay=selectDay;window.ACLSimple={build:'V3.23',open,close,refresh:async()=>{await loadCatalog(true);renderList()}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else setTimeout(init,0);
})();

/* ===== END ac-limits-simple.js ===== */

/* ===== BEGIN bbbt-quick-entry.js ===== */
/* E-REPORT SAGS · BBBT QUICK ENTRY
 * V1.85 · 2026-08-19
 * Adds a glove-friendly quick-entry layer for the existing F/SAGS-CXR/56 BBBT.
 * It does NOT create a new form and does NOT change PDF rendering.
 */
(function(){
  'use strict';

  const BUILD='V1.85-20260819-01';
  const BUTTON_ID='bbbtQuickEntryBtn';
  const MODAL_ID='bbbtQuickEntryModal';
  const STYLE_ID='bbbtQuickEntryStyle';
  const GUIDE_ID='bbbtQuickEntryGuide';

  const BOOL_KEYS=[
    'bbbtFoundSorting','bbbtFoundParking','bbbtFoundOther',
    'bbbtBaggage','bbbtCargo','bbbtMail','bbbtULD',
    'bbbtBrokenHandle','bbbtMissingWheel','bbbtDented','bbbtWet',
    'bbbtTorn','bbbtScratched','bbbtLeaking','bbbtDamageOther',
    'bbbtFoundOffload','bbbtFoundLoading','bbbtFoundUnidentified','bbbtFoundWhileOther',
    'bbbtReportRep','bbbtTakePicture','bbbtTape','bbbtHandover','bbbtHandlingOther'
  ];

  const TEXT_KEYS=[
    'bbbtReportAt','bbbtFoundOtherText',
    'bbbtPerson1','bbbtDuty1','bbbtPerson2','bbbtDuty2','bbbtPerson3','bbbtDuty3',
    'bbbtDamageOtherText','bbbtDetail','bbbtFoundWhileOtherText',
    'bbbtHandlingOtherText','bbbtComment'
  ];

  let draft={};
  let morePeople=false;

  function appState(){
    try{return (typeof state!=='undefined' && state) ? state : null;}catch(_){return null;}
  }

  function roleCode(){
    try{return String(typeof currentRole!=='undefined' ? currentRole : '').trim().toUpperCase();}catch(_){return '';}
  }

  function canUse(){
    const role=roleCode();
    if(!role || role==='VIEWER') return false;
    try{
      if(typeof v485Can==='function') return !!v485Can('BBBT');
    }catch(_){ }
    return true;
  }

  function h(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function normalizeTime(v){
    const raw=String(v||'').trim().replace(/\s/g,'');
    if(!raw) return '';
    let hh='',mm='';
    if(/^\d{4}$/.test(raw)){hh=raw.slice(0,2);mm=raw.slice(2);}
    else if(/^\d{1,2}:\d{2}$/.test(raw)){const p=raw.split(':');hh=p[0].padStart(2,'0');mm=p[1];}
    else return null;
    const H=Number(hh),M=Number(mm);
    if(H<0||H>23||M<0||M>59) return null;
    return hh+':'+mm;
  }

  function nowTime(){
    const d=new Date();
    return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  }

  function cloneDraft(){
    const s=appState();
    if(!s) return false;
    draft={};
    for(const k of BOOL_KEYS) draft[k]=!!s[k];
    for(const k of TEXT_KEYS) draft[k]=String(s[k]??'');
    morePeople=!!(draft.bbbtPerson2||draft.bbbtDuty2||draft.bbbtPerson3||draft.bbbtDuty3);
    return true;
  }

  function setDraft(key,value){draft[key]=value;}

  function metaHtml(){
    const s=appState()||{};
    const cells=[
      ['FLIGHT',s.bbbtFlight],['REG',s.bbbtRegn],['TYPE',s.bbbtAcType],
      ['DATE',s.bbbtDateText],['ROUTE',s.bbbtRoute]
    ];
    return `<div class="bq-meta">${cells.map(([l,v])=>`<div><small>${h(l)}</small><strong>${h(v||'—')}</strong></div>`).join('')}</div>`;
  }

  function toggleGroup(title,items,cls=''){
    return `<section class="bq-section ${cls}"><h3>${h(title)}</h3><div class="bq-chip-grid">${items.map(it=>`<button type="button" class="bq-chip ${draft[it[0]]?'on':''}" data-bq-toggle="${h(it[0])}" aria-pressed="${draft[it[0]]?'true':'false'}">${h(it[1])}</button>`).join('')}</div></section>`;
  }

  function textField(key,label,placeholder='',opts={}){
    const tag=opts.multiline?'textarea':'input';
    const value=h(draft[key]||'');
    return `<label class="bq-field ${opts.className||''}"><span>${h(label)}</span>${tag==='textarea'
      ? `<textarea data-bq-input="${h(key)}" rows="${opts.rows||3}" placeholder="${h(placeholder)}">${value}</textarea>`
      : `<input data-bq-input="${h(key)}" value="${value}" placeholder="${h(placeholder)}" ${opts.inputmode?`inputmode="${h(opts.inputmode)}"`:''}>`}</label>`;
  }

  function render(){
    const modal=document.getElementById(MODAL_ID);
    if(!modal) return;
    const body=modal.querySelector('.bq-body');
    if(!body) return;

    body.innerHTML=`
      ${metaHtml()}
      <section class="bq-section bq-time-section">
        <h3>GIỜ LẬP BBBT</h3>
        <div class="bq-time-row">
          <input id="bqReportAt" inputmode="numeric" maxlength="5" value="${h(draft.bbbtReportAt||'')}" placeholder="HHMM">
          <button type="button" class="bq-now" data-bq-now>🕐 BÂY GIỜ</button>
        </div>
      </section>

      ${toggleGroup('1 · PHÁT HIỆN TẠI',[
        ['bbbtFoundSorting','SORTING AREA'],['bbbtFoundParking','PARKING BAY'],['bbbtFoundOther','OTHER']
      ])}
      <div class="bq-conditional ${draft.bbbtFoundOther?'show':''}" data-bq-cond="bbbtFoundOther">
        ${textField('bbbtFoundOtherText','Vị trí khác','Nhập vị trí…')}
      </div>

      <section class="bq-section">
        <h3>2 · NGƯỜI LẬP / DUTY</h3>
        <div class="bq-two">${textField('bbbtPerson1','Person 1','Họ tên')}${textField('bbbtDuty1','Duty 1','Nhiệm vụ')}</div>
        <button type="button" class="bq-secondary-wide" data-bq-more>${morePeople?'THU GỌN':'＋ THÊM NGƯỜI'}</button>
        <div class="bq-more ${morePeople?'show':''}">
          <div class="bq-two">${textField('bbbtPerson2','Person 2','Họ tên')}${textField('bbbtDuty2','Duty 2','Nhiệm vụ')}</div>
          <div class="bq-two">${textField('bbbtPerson3','Person 3','Họ tên')}${textField('bbbtDuty3','Duty 3','Nhiệm vụ')}</div>
        </div>
      </section>

      ${toggleGroup('3 · ĐỐI TƯỢNG',[
        ['bbbtBaggage','BAGGAGE'],['bbbtCargo','CARGO'],['bbbtMail','MAIL'],['bbbtULD','ULD']
      ])}

      ${toggleGroup('4 · DẠNG HƯ HỎNG',[
        ['bbbtBrokenHandle','BROKEN HANDLE / ZIPPER'],['bbbtMissingWheel','MISSING WHEEL'],
        ['bbbtDented','DENTED'],['bbbtWet','WET'],['bbbtTorn','TORN'],['bbbtScratched','SCRATCHED'],
        ['bbbtLeaking','LEAKING'],['bbbtDamageOther','OTHER']
      ],'bq-damage')}
      <div class="bq-conditional ${draft.bbbtDamageOther?'show':''}" data-bq-cond="bbbtDamageOther">
        ${textField('bbbtDamageOtherText','Hư hỏng khác','Mô tả ngắn…',{multiline:true,rows:2})}
      </div>

      <section class="bq-section">
        <h3>5 · CHI TIẾT BẤT THƯỜNG</h3>
        ${textField('bbbtDetail','Detail of irregularity','Mô tả tình trạng thực tế…',{multiline:true,rows:4})}
      </section>

      ${toggleGroup('6 · PHÁT HIỆN TRONG LÚC',[
        ['bbbtFoundOffload','OFF-LOADING'],['bbbtFoundLoading','LOADING'],
        ['bbbtFoundUnidentified','UNIDENTIFIED'],['bbbtFoundWhileOther','OTHER']
      ])}
      <div class="bq-conditional ${draft.bbbtFoundWhileOther?'show':''}" data-bq-cond="bbbtFoundWhileOther">
        ${textField('bbbtFoundWhileOtherText','Trường hợp khác','Nhập nội dung…')}
      </div>

      ${toggleGroup('7 · XỬ LÝ BAN ĐẦU',[
        ['bbbtReportRep','REPORT AIRLINES REP'],['bbbtTakePicture','TAKE PICTURE & SEND REP'],
        ['bbbtTape','CELLOPHANE TAPE'],['bbbtHandover','HAND-OVER LnF / CARGO'],['bbbtHandlingOther','OTHER']
      ],'bq-handling')}
      <div class="bq-conditional ${draft.bbbtHandlingOther?'show':''}" data-bq-cond="bbbtHandlingOther">
        ${textField('bbbtHandlingOtherText','Xử lý khác','Nhập xử lý…')}
      </div>

      <section class="bq-section">
        <h3>8 · COMMENT</h3>
        ${textField('bbbtComment','Comment','Ghi chú nếu có…',{multiline:true,rows:3})}
      </section>

      <section class="bq-guide" id="${GUIDE_ID}">
        <strong>HDSD NHẬP NHANH BBBT</strong>
        <p>Chọn các nút lớn theo tình trạng thực tế → nhập phần chữ cần thiết → bấm <b>CẬP NHẬT BBBT</b> một lần. Dữ liệu được ghi vào đúng F/SAGS-CXR/56 hiện tại. Chữ ký vẫn thực hiện trực tiếp trên tờ BBBT.</p>
      </section>
    `;
  }

  function syncInputToDraft(el){
    const key=el?.dataset?.bqInput;
    if(key) draft[key]=el.value;
  }

  function refreshConditional(){
    document.querySelectorAll(`#${MODAL_ID} [data-bq-cond]`).forEach(el=>{
      el.classList.toggle('show',!!draft[el.dataset.bqCond]);
    });
  }

  function save(){
    const s=appState();
    if(!s){alert('Không đọc được dữ liệu BBBT hiện tại.');return;}
    document.querySelectorAll(`#${MODAL_ID} [data-bq-input]`).forEach(syncInputToDraft);
    const report=document.getElementById('bqReportAt');
    if(report) draft.bbbtReportAt=report.value;
    const nt=normalizeTime(draft.bbbtReportAt);
    if(draft.bbbtReportAt && nt===null){
      alert('Giờ lập BBBT không hợp lệ. Nhập 4 số HHMM, ví dụ 1524.');
      try{report?.focus();}catch(_){ }
      return;
    }
    draft.bbbtReportAt=nt||'';

    for(const k of BOOL_KEYS) s[k]=!!draft[k];
    for(const k of TEXT_KEYS) s[k]=String(draft[k]??'').trim();

    try{if(typeof persist==='function') persist();}catch(e){console.warn('[BBBT QUICK] persist',e);}
    try{if(typeof draw==='function') draw();}catch(e){console.warn('[BBBT QUICK] draw',e);}
    close();
    toast('✓ Đã cập nhật BBBT');
  }

  function open(){
    if(!canUse()){
      try{if(typeof roleDenied==='function') return roleDenied('Tài khoản chưa được cấp quyền BBBT.');}catch(_){ }
      alert('Tài khoản chưa được cấp quyền BBBT.');return;
    }
    if(!cloneDraft()){alert('Chưa sẵn sàng dữ liệu BBBT.');return;}
    render();
    const modal=document.getElementById(MODAL_ID);
    if(modal){modal.classList.add('show');modal.setAttribute('aria-hidden','false');}
  }

  function close(){
    const modal=document.getElementById(MODAL_ID);
    if(modal){modal.classList.remove('show');modal.setAttribute('aria-hidden','true');}
  }

  function toast(msg){
    let el=document.getElementById('bbbtQuickToast');
    if(!el){el=document.createElement('div');el.id='bbbtQuickToast';el.className='bq-toast';document.body.appendChild(el);}
    el.textContent=msg;el.classList.add('show');
    clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),1800);
  }

  function ensureStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const st=document.createElement('style');st.id=STYLE_ID;
    st.textContent=`
#${BUTTON_ID}{background:#0b5cab!important;color:#fff!important;font-weight:900!important;white-space:nowrap!important}
#${MODAL_ID}{position:fixed;inset:0;z-index:26050;background:#0a1421;display:none;flex-direction:column;color:#eef5fb;font-family:Arial,sans-serif;overscroll-behavior:contain}
#${MODAL_ID}.show{display:flex}
#${MODAL_ID} .bq-head{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:max(10px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) 10px max(12px,env(safe-area-inset-left));background:#102336;border-bottom:1px solid #28445f}
#${MODAL_ID} .bq-head h2{font-size:20px;line-height:1.05;margin:0;font-weight:900;letter-spacing:.2px}
#${MODAL_ID} .bq-close{min-width:76px;min-height:50px;border:0;border-radius:10px;background:#334a5e;color:#fff;font:900 15px Arial;touch-action:manipulation}
#${MODAL_ID} .bq-body{flex:1 1 auto;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:12px max(12px,env(safe-area-inset-right)) 110px max(12px,env(safe-area-inset-left))}
#${MODAL_ID} .bq-meta{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px;margin-bottom:10px}
#${MODAL_ID} .bq-meta>div{min-width:0;background:#162c40;padding:8px 6px;border-radius:8px;text-align:center}
#${MODAL_ID} .bq-meta small{display:block;color:#91a8bb;font-size:9px;font-weight:800;margin-bottom:3px}
#${MODAL_ID} .bq-meta strong{display:block;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#${MODAL_ID} .bq-section{margin:0 0 13px;padding:0;border:0}
#${MODAL_ID} .bq-section h3{margin:0 0 7px;color:#c8dae8;font-size:13px;letter-spacing:.6px;font-weight:900}
#${MODAL_ID} .bq-chip-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
#${MODAL_ID} .bq-chip{min-height:60px;border:0;border-radius:10px;padding:8px 6px;background:#1d3449;color:#eef5fb;font:900 14px/1.15 Arial;touch-action:manipulation;box-shadow:inset 0 0 0 1px #36536e}
#${MODAL_ID} .bq-chip.on{background:#0d6d63;box-shadow:inset 0 0 0 2px #6fe0ce;color:#fff}
#${MODAL_ID} .bq-damage .bq-chip-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
#${MODAL_ID} .bq-field{display:block;margin:0 0 8px}
#${MODAL_ID} .bq-field>span{display:block;margin:0 0 4px;color:#a9bdcc;font-size:12px;font-weight:800}
#${MODAL_ID} input,#${MODAL_ID} textarea{width:100%;border:1px solid #39566e;border-radius:10px;background:#14283a;color:#fff;font:800 17px Arial;padding:12px;outline:none;box-sizing:border-box;-webkit-appearance:none}
#${MODAL_ID} input{min-height:54px}
#${MODAL_ID} textarea{min-height:82px;resize:vertical;line-height:1.3}
#${MODAL_ID} input:focus,#${MODAL_ID} textarea:focus{border-color:#61c5ff;box-shadow:0 0 0 2px rgba(97,197,255,.18)}
#${MODAL_ID} .bq-two{display:grid;grid-template-columns:1.2fr .8fr;gap:7px}
#${MODAL_ID} .bq-time-row{display:grid;grid-template-columns:1fr 1.25fr;gap:7px}
#${MODAL_ID} .bq-time-row input{text-align:center;font-size:24px;font-variant-numeric:tabular-nums}
#${MODAL_ID} .bq-now,#${MODAL_ID} .bq-secondary-wide{min-height:56px;border:0;border-radius:10px;background:#28506e;color:#fff;font:900 15px Arial;touch-action:manipulation}
#${MODAL_ID} .bq-secondary-wide{width:100%;margin:0 0 8px;background:#263d51}
#${MODAL_ID} .bq-more{display:none}.bq-more.show{display:block}
#${MODAL_ID} .bq-conditional{display:none;margin:-5px 0 12px;padding:8px 8px 0;background:#10263a;border-radius:10px}.bq-conditional.show{display:block}
#${MODAL_ID} .bq-guide{margin-top:16px;padding:12px;border-radius:10px;background:#10263a;color:#c7d9e7;font-size:13px;line-height:1.4}
#${MODAL_ID} .bq-guide strong{display:block;color:#fff;margin-bottom:5px}#${MODAL_ID} .bq-guide p{margin:0}
#${MODAL_ID} .bq-foot{position:fixed;left:0;right:0;bottom:0;z-index:1;padding:8px max(12px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));background:linear-gradient(to top,#0a1421 78%,rgba(10,20,33,.88));display:grid;grid-template-columns:.8fr 1.8fr;gap:8px}
#${MODAL_ID} .bq-foot button{min-height:60px;border:0;border-radius:11px;font:900 16px Arial;touch-action:manipulation}
#${MODAL_ID} .bq-cancel{background:#334a5e;color:#fff}#${MODAL_ID} .bq-save{background:#137333;color:#fff}
.bq-toast{position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom));transform:translate(-50%,20px);z-index:27000;background:#137333;color:#fff;padding:11px 18px;border-radius:999px;font:900 14px Arial;opacity:0;pointer-events:none;transition:.18s}.bq-toast.show{opacity:1;transform:translate(-50%,0)}
@media(max-width:390px){#${MODAL_ID} .bq-meta{grid-template-columns:repeat(3,minmax(0,1fr))}#${MODAL_ID} .bq-chip{min-height:58px;font-size:13px}#${MODAL_ID} .bq-two{grid-template-columns:1fr}#${MODAL_ID} .bq-head h2{font-size:18px}}
@media(min-width:700px){#${MODAL_ID} .bq-body{width:min(760px,100%);margin:0 auto}#${MODAL_ID} .bq-chip-grid{grid-template-columns:repeat(3,minmax(0,1fr))}#${MODAL_ID} .bq-damage .bq-chip-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media print{#${MODAL_ID},#${BUTTON_ID},.bq-toast{display:none!important}}
`;
    document.head.appendChild(st);
  }

  function ensureModal(){
    if(document.getElementById(MODAL_ID)) return;
    const modal=document.createElement('div');
    modal.id=MODAL_ID;modal.setAttribute('aria-hidden','true');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
    modal.innerHTML=`<div class="bq-head"><h2>Nhập nhanh BBBT</h2><button type="button" class="bq-close" data-bq-close>ĐÓNG</button></div><div class="bq-body"></div><div class="bq-foot"><button type="button" class="bq-cancel" data-bq-close>ĐÓNG</button><button type="button" class="bq-save" data-bq-save>CẬP NHẬT BBBT</button></div>`;
    document.body.appendChild(modal);

    modal.addEventListener('click',ev=>{
      const btn=ev.target.closest('button');
      if(!btn) return;
      if(btn.hasAttribute('data-bq-close')){close();return;}
      if(btn.hasAttribute('data-bq-save')){save();return;}
      if(btn.hasAttribute('data-bq-now')){
        draft.bbbtReportAt=nowTime();
        const el=document.getElementById('bqReportAt');if(el)el.value=draft.bbbtReportAt;
        return;
      }
      if(btn.hasAttribute('data-bq-more')){morePeople=!morePeople;render();return;}
      const key=btn.dataset.bqToggle;
      if(key){
        draft[key]=!draft[key];
        btn.classList.toggle('on',!!draft[key]);
        btn.setAttribute('aria-pressed',draft[key]?'true':'false');
        refreshConditional();
      }
    });
    modal.addEventListener('input',ev=>{
      if(ev.target?.matches?.('[data-bq-input]')) syncInputToDraft(ev.target);
      if(ev.target?.id==='bqReportAt') draft.bbbtReportAt=ev.target.value;
    });
  }

  function buttonVisible(){return canUse();}

  function ensureButton(){
    const row=document.querySelector('.toolbar-row.main-actions');
    if(!row) return false;
    let btn=document.getElementById(BUTTON_ID);
    if(!btn){
      btn=document.createElement('button');btn.id=BUTTON_ID;btn.type='button';btn.textContent='Nhập nhanh BBBT';btn.addEventListener('click',open);
      const manual=document.getElementById('roleBtnManualBBBT');
      if(manual?.parentNode===row) manual.insertAdjacentElement('afterend',btn);
      else {
        const quick=document.getElementById('roleBtnQuickTime');
        if(quick?.parentNode===row) quick.insertAdjacentElement('afterend',btn); else row.appendChild(btn);
      }
    }
    btn.style.display=buttonVisible()?'':'none';
    return true;
  }


  function injectUserGuide(){
    const host=document.getElementById('roleGuideContent');
    if(!host || host.querySelector('[data-bbbt-quick-guide]')) return;
    const guide=document.createElement('div');guide.setAttribute('data-bbbt-quick-guide','1');
    guide.style.cssText='margin-top:14px;padding:12px;border:1px solid #ccd8e3;border-radius:10px;background:#f7fbff;color:#123;line-height:1.45';
    guide.innerHTML='<b>NHẬP NHANH BBBT</b><br>Trong thanh chức năng chọn <b>Nhập nhanh BBBT</b> → bấm các nút lớn theo tình trạng thực tế → nhập phần mô tả cần thiết → bấm <b>CẬP NHẬT BBBT</b>. Dữ liệu được điền vào đúng F/SAGS-CXR/56 đang sử dụng. Chữ ký thực hiện trên tờ BBBT.';
    host.appendChild(guide);
  }

  function hookRoleUi(){
    try{
      const base=window.applyRoleUI;
      if(typeof base!=='function' || base.__bbbtQuickWrapped) return;
      const wrapped=function(){
        const out=base.apply(this,arguments);
        setTimeout(()=>{try{ensureButton();}catch(_){ }},0);
        return out;
      };
      wrapped.__bbbtQuickWrapped=true;
      window.applyRoleUI=wrapped;
    }catch(_){ }
  }

  function init(){
    ensureStyle();ensureModal();ensureButton();injectUserGuide();hookRoleUi();
    const obs=new MutationObserver(()=>{ensureButton();injectUserGuide();hookRoleUi();});
    obs.observe(document.body,{childList:true,subtree:true});
    setTimeout(()=>{ensureButton();hookRoleUi();},800);
    setTimeout(()=>{ensureButton();hookRoleUi();},2500);
    window.BBBTQuickEntry={build:BUILD,open,close,refresh:()=>{ensureButton();injectUserGuide();}};
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();

/* ===== END bbbt-quick-entry.js ===== */

/* ===== BUNDLED ac-limits-ai-review.js · V3.93 ===== */
/* E-REPORT SAGS · A/C LIMITS AI IMAGE REVIEW · V1.97
 * AI is input assistance only: image -> proposed rows -> AD reviews -> save.
 * Never auto-applies an unread/uncertain row and never auto-deletes CLEAR rows.
 */
(()=>{
'use strict';
const ACL_AI_MODEL='gemini-3.6-flash';
const BUILD='V1.97-20260820-01';
const APP_CHECK_SITE_KEY='6LeJjYotAAAAAELyLTYPzugn_Zn37U5qOz9tHjqV';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normReg=v=>String(v??'').trim().toUpperCase().replace(/\s+/g,'').replace(/^([A-Z]{2})A(?=\d)/,'$1-A');
let aiRows=[];
let previewUrl='';
let aiSdkPromise=null;

function isAdmin(){try{const r=String(currentRole||currentUserProfile?.role||'').trim().toUpperCase();return r==='AD'||r==='ADMIN'||r==='ROLE-ADMIN'}catch(_){return false}}
function status(t,err=false){const e=$('aclAIStatus');if(e){e.textContent=t||'';e.classList.toggle('err',!!err)}}
function ensureCss(){if($('aclAIStyle'))return;const s=document.createElement('style');s.id='aclAIStyle';s.textContent=`
.aclai-box{border:2px solid #a9c7e4;background:#f3f9ff;border-radius:14px;padding:12px;margin:10px 0}.aclai-title{font:900 15px Arial;color:#173f69;margin-bottom:8px}.aclai-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.aclai-file{max-width:100%;font-weight:800}.aclai-btn{border:0;border-radius:10px;padding:10px 13px;background:#075ea8;color:#fff;font-weight:900}.aclai-btn.good{background:#0a7147}.aclai-btn.secondary{background:#e6edf4;color:#25435e;border:1px solid #c3d0dc}.aclai-preview{display:none;max-width:100%;max-height:280px;margin:9px auto;border-radius:10px;border:1px solid #c9d4de;object-fit:contain;background:#fff}.aclai-status{min-height:20px;margin:7px 0;font-weight:900;color:#17613f}.aclai-status.err{color:#b42318}.aclai-list{display:grid;gap:8px;margin-top:10px}.aclai-row{border:1px solid #cad6e1;background:#fff;border-radius:12px;padding:10px}.aclai-row.warn{border-color:#e0ae56;background:#fffaf0}.aclai-row.clear{border-color:#e0a5a0;background:#fff5f4}.aclai-head{display:flex;gap:8px;align-items:center;justify-content:space-between}.aclai-head-left{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.aclai-reg{width:135px;max-width:44vw;border:1px solid #9fb2c4;border-radius:8px;padding:8px;font:900 15px Arial;text-transform:uppercase}.aclai-cat{border:1px solid #9fb2c4;border-radius:8px;padding:8px;font-weight:900}.aclai-conf{font-size:11px;font-weight:900;padding:4px 8px;border-radius:999px;background:#e9f5ec;color:#146338}.aclai-conf.mid{background:#fff1d8;color:#8b5b00}.aclai-conf.low{background:#ffe7e5;color:#a72b22}.aclai-eq{display:flex;gap:7px;flex-wrap:wrap;margin:8px 0}.aclai-eq label{border:1px solid #bdcbd7;border-radius:999px;padding:6px 10px;font-weight:900}.aclai-text{width:100%;min-height:52px;box-sizing:border-box;border:1px solid #a9b9c7;border-radius:8px;padding:8px;font:700 13px Arial}.aclai-note{font-size:11px;color:#657789;margin-top:5px}.aclai-check{width:20px;height:20px;accent-color:#0871bd}
@media(max-width:620px){.aclai-head{align-items:flex-start;flex-direction:column}.aclai-reg{width:100%;max-width:none}.aclai-cat{width:100%}}
`;document.head.appendChild(s)}
function switchLimitMode(mode){
  mode=mode==='ai'?'ai':'manual';
  const manual=$('aclManualMode'),ai=$('aclAIMode');if(manual)manual.classList.toggle('active',mode==='manual');if(ai)ai.classList.toggle('active',mode==='ai');
  document.querySelectorAll('#aclLimitModeSwitch .aclModeBtn').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
}
function ensureUi(){
  const panel=$('aclSimplePanel');if(!panel||$('aclAIBox'))return false;ensureCss();
  const top=panel.querySelector('.acls-top');
  let sw=$('aclLimitModeSwitch'),manual=$('aclManualMode'),ai=$('aclAIMode');
  if(!sw){
    sw=document.createElement('div');sw.id='aclLimitModeSwitch';sw.innerHTML=`<button type="button" class="aclModeBtn active" data-mode="manual">✍ NHẬP THỦ CÔNG</button><button type="button" class="aclModeBtn ai" data-mode="ai">📷 AI ĐỌC ẢNH</button>`;
    manual=document.createElement('div');manual.id='aclManualMode';manual.className='aclModePane active';
    ai=document.createElement('div');ai.id='aclAIMode';ai.className='aclModePane';
    const move=[...panel.children].filter(x=>x!==top);move.forEach(x=>manual.appendChild(x));
    if(top?.nextSibling)panel.insertBefore(sw,top.nextSibling);else panel.appendChild(sw);panel.appendChild(manual);panel.appendChild(ai);
    sw.querySelectorAll('.aclModeBtn').forEach(b=>b.addEventListener('click',()=>switchLimitMode(b.dataset.mode)));
  }
  const d=document.createElement('div');d.id='aclAIBox';d.className='aclai-box';d.innerHTML=`
    <div class="aclai-title">📷 UP ẢNH LIMIT + AI ĐỌC</div>
    <div class="aclai-actions"><input id="aclAIFile" class="aclai-file" type="file" accept="image/jpeg,image/png,image/webp"><button id="aclAIRead" class="aclai-btn" type="button">🤖 AI ĐỌC ẢNH</button><button id="aclAIClear" class="aclai-btn secondary" type="button">XÓA KẾT QUẢ</button></div>
    <img id="aclAIPreview" class="aclai-preview" alt="Ảnh LIMIT">
    <div id="aclAIStatus" class="aclai-status"></div><div id="aclAIList" class="aclai-list"></div>
    <div id="aclAISaveWrap" class="aclai-actions" style="display:none;margin-top:10px"><button id="aclAISave" class="aclai-btn good" type="button">✓ LƯU CÁC DÒNG ĐÃ CHỌN</button></div>
    <div class="aclai-note">AI chỉ đề xuất. AD phải kiểm tra REG / loại LIMIT / nội dung trước khi lưu. Dòng CLEAR không tự xóa LIMIT cũ.</div>`;
  ai.appendChild(d);switchLimitMode('manual');
  $('aclAIFile').addEventListener('change',onFile);$('aclAIRead').addEventListener('click',readAI);$('aclAIClear').addEventListener('click',clearAI);$('aclAISave').addEventListener('click',saveSelected);
  return true;
}
function onFile(){const f=$('aclAIFile')?.files?.[0],img=$('aclAIPreview');aiRows=[];renderRows();if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=''}if(!f){if(img)img.style.display='none';return}previewUrl=URL.createObjectURL(f);if(img){img.src=previewUrl;img.style.display='block'}status(`${f.name} · ${(f.size/1024).toFixed(0)} KB · sẵn sàng AI đọc.`)}
function clearAI(){aiRows=[];renderRows();status('');const f=$('aclAIFile');if(f)f.value='';const img=$('aclAIPreview');if(img)img.style.display='none';if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=''}}
async function filePart(file){const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||'').split(',')[1]||'');r.onerror=()=>reject(r.error||new Error('Không đọc được ảnh.'));r.readAsDataURL(file)});return {inlineData:{data,mimeType:file.type||'image/jpeg'}}}
async function sdk(){
  if(aiSdkPromise)return aiSdkPromise;
  aiSdkPromise=(async()=>{
    const [appMod,appCheckMod,aiMod]=await Promise.all([
      import('https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.1.0/firebase-app-check.js'),
      import('https://www.gstatic.com/firebasejs/12.1.0/firebase-ai.js')
    ]);
    const opts=window.firebase?.app?.().options;if(!opts?.apiKey||!opts?.projectId||!opts?.appId)throw new Error('Không lấy được Firebase config đầy đủ của SAGS.');
    let app;try{app=appMod.getApp('sags-acl-ai')}catch(_){app=appMod.initializeApp(opts,'sags-acl-ai')}
    let appCheck;
    try{
      appCheck=appCheckMod.initializeAppCheck(app,{
        provider:new appCheckMod.ReCaptchaEnterpriseProvider(APP_CHECK_SITE_KEY),
        isTokenAutoRefreshEnabled:true
      });
    }catch(e){
      // initializeAppCheck chỉ được gọi một lần/app. Nếu module đã được khởi tạo, lấy instance hiện có.
      try{appCheck=appCheckMod.getAppCheck(app)}catch(_){throw e}
    }
    const token=await appCheckMod.getToken(appCheck,false);
    if(!token?.token)throw new Error('Không lấy được Firebase App Check token.');
    const ai=aiMod.getAI(app,{backend:new aiMod.GoogleAIBackend()});
    const model=aiMod.getGenerativeModel(ai,{model:ACL_AI_MODEL,generationConfig:{responseMimeType:'application/json',temperature:0.1}});
    return {model,appCheck};
  })();
  return aiSdkPromise;
}
function prompt(){return `Bạn là trợ lý nhập A/C LIMITS khai thác hàng không. Đọc chính xác bảng trong ảnh, không suy đoán ký tự không nhìn thấy.
Mục tiêu: tách theo A/C REG làm gốc rồi phân loại đúng 3 loại: APU INOP, HOLD INOP, OTHER.
Quy tắc:
1) APU INOP: nếu nội dung yêu cầu GPU/ACU/ASU thì equipment liệt kê đúng các mã xuất hiện.
2) HOLD INOP/ISSUES, cargo/hold inop -> HOLD INOP và giữ nguyên nội dung restriction.
3) Seat inop và mọi hạn chế khác -> OTHER, giữ nguyên nội dung.
4) Nếu một ô có nhiều REG cùng một nội dung, tách thành nhiều item, mỗi REG một item.
5) Dòng CLEAR -> action CLEAR, category OTHER; KHÔNG biến thành cảnh báo.
6) Nếu không chắc REG/nội dung, vẫn trả item nhưng confidence thấp và needsReview=true; không tự bịa.
Chỉ trả JSON hợp lệ, không markdown:
{"documentTitle":"","documentDate":"","version":"","items":[{"reg":"VN-A648","category":"APU INOP","equipment":["GPU","ACU","ASU"],"restriction":"REQ ASU,ACU,GPU","action":"UPSERT","confidence":0.98,"needsReview":false}]}`}
function extractJson(text){text=String(text||'').trim().replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();const a=text.indexOf('{'),b=text.lastIndexOf('}');if(a<0||b<a)throw new Error('AI không trả JSON hợp lệ.');return JSON.parse(text.slice(a,b+1))}
function normalizedCategory(v){const s=String(v||'').toUpperCase();if(s.includes('APU'))return 'APU INOP';if(s.includes('HOLD')||s.includes('CARGO'))return 'HOLD INOP';return 'OTHER'}
function normalizeRows(obj){
  const out=[];for(const x of (Array.isArray(obj?.items)?obj.items:[])){
    const reg=normReg(x?.reg||'');if(!reg)continue;const cat=normalizedCategory(x.category),restriction=String(x.restriction||'').trim();const action=String(x.action||'UPSERT').toUpperCase()==='CLEAR'?'CLEAR':'UPSERT';
    const eq=['GPU','ACU','ASU'].filter(k=>(x.equipment||[]).map(v=>String(v).toUpperCase()).includes(k)||new RegExp(`\\b${k}\\b`,'i').test(restriction));const confidence=Math.max(0,Math.min(1,Number(x.confidence||0)));
    out.push({selected:action!=='CLEAR'&&confidence>=.7,reg,category:cat,equipment:eq,restriction,action,confidence,needsReview:!!x.needsReview||confidence<.85});
  }
  return out;
}
async function readAI(){
  if(!isAdmin()){status('Chỉ AD được dùng AI A/C LIMITS.',true);return window.sagsActionPopup?.({type:'warning',title:'KHÔNG CÓ QUYỀN',message:'Chỉ AD được dùng AI A/C LIMITS.'})}
  const file=$('aclAIFile')?.files?.[0];
  if(!file){status('Chọn ảnh LIMIT trước.',true);return window.sagsActionPopup?.({type:'warning',title:'CHƯA CHỌN ẢNH',message:'Chọn ảnh LIMIT trước khi AI đọc.'})}
  if(file.size>10*1024*1024){status('Ảnh vượt 10 MB.',true);return window.sagsActionPopup?.({type:'warning',title:'ẢNH VƯỢT GIỚI HẠN',message:'Ảnh A/C LIMITS tối đa 10 MB.'})}
  const btn=$('aclAIRead');if(btn)btn.disabled=true;status('AI đang đọc REG và phân loại LIMIT...');
  try{
    const {model}=await sdk(),part=await filePart(file);const result=await model.generateContent([prompt(),part]);const text=result?.response?.text?.()||'';const obj=extractJson(text);
    aiRows=normalizeRows(obj);renderRows();
    if(aiRows.length){
      const msg=`AI đọc được ${aiRows.length} dòng. AD phải kiểm tra REG / loại LIMIT / nội dung trước khi lưu.`;
      status(`✓ ${msg}`);window.sagsActionPopup?.({type:'success',title:'AI ĐÃ ĐỌC A/C LIMITS',message:msg});
    }else{
      const msg='AI chưa đọc được dòng LIMIT nào.';status(msg,true);window.sagsActionPopup?.({type:'warning',title:'CHƯA ĐỌC ĐƯỢC A/C LIMITS',message:msg});
    }
  }catch(e){
    aiSdkPromise=null;const msg='AI đọc ảnh lỗi: '+String(e?.message||e);status(msg,true);window.sagsActionPopup?.({type:'error',title:'AI ĐỌC ẢNH THẤT BẠI',message:msg});
  }finally{if(btn)btn.disabled=false}
}
function confClass(c){return c>=.9?'':c>=.7?'mid':'low'}
function renderRows(){const h=$('aclAIList'),w=$('aclAISaveWrap');if(!h)return;h.innerHTML=aiRows.map((x,i)=>`<div class="aclai-row ${x.action==='CLEAR'?'clear':x.needsReview?'warn':''}" data-i="${i}"><div class="aclai-head"><div class="aclai-head-left"><input class="aclai-check" type="checkbox" data-k="selected" ${x.selected?'checked':''} ${x.action==='CLEAR'?'disabled':''}><input class="aclai-reg" data-k="reg" value="${esc(x.reg)}"><select class="aclai-cat" data-k="category"><option ${x.category==='APU INOP'?'selected':''}>APU INOP</option><option ${x.category==='HOLD INOP'?'selected':''}>HOLD INOP</option><option ${x.category==='OTHER'?'selected':''}>OTHER</option></select></div><span class="aclai-conf ${confClass(x.confidence)}">${x.action==='CLEAR'?'CLEAR':Math.round(x.confidence*100)+'%'}</span></div><div class="aclai-eq" style="${x.category==='APU INOP'?'':'display:none'}"><label><input type="checkbox" data-eq="GPU" ${x.equipment.includes('GPU')?'checked':''}> GPU</label><label><input type="checkbox" data-eq="ACU" ${x.equipment.includes('ACU')?'checked':''}> ACU</label><label><input type="checkbox" data-eq="ASU" ${x.equipment.includes('ASU')?'checked':''}> ASU</label></div><textarea class="aclai-text" data-k="restriction">${esc(x.restriction)}</textarea>${x.action==='CLEAR'?'<div class="aclai-note"><b>CLEAR:</b> không được AI tự xóa. AD kiểm tra LIMIT cũ rồi tự tắt/xóa nếu đúng.</div>':x.needsReview?'<div class="aclai-note"><b>⚠ CẦN KIỂM TRA:</b> độ tin cậy chưa cao.</div>':''}</div>`).join('');if(w)w.style.display=aiRows.some(x=>x.action!=='CLEAR')?'flex':'none';
  h.querySelectorAll('.aclai-row').forEach(row=>{const i=Number(row.dataset.i);row.addEventListener('input',ev=>{const k=ev.target.dataset.k;if(k){aiRows[i][k]=k==='selected'?!!ev.target.checked:ev.target.value;if(k==='category')renderRows()}const eq=ev.target.dataset.eq;if(eq){const set=new Set(aiRows[i].equipment);ev.target.checked?set.add(eq):set.delete(eq);aiRows[i].equipment=[...set]}})})
}
function setSimple(row){
  const reg=$('aclSReg');if(reg)reg.value=row.reg;['aclSApu','aclSEqGPU','aclSEqACU','aclSEqASU','aclSHold','aclSOther'].forEach(id=>{if($(id))$(id).checked=false});if($('aclSHoldText'))$('aclSHoldText').value='';if($('aclSOtherText'))$('aclSOtherText').value='';
  if(row.category==='APU INOP'){if($('aclSApu'))$('aclSApu').checked=true;for(const eq of row.equipment){const e=$('aclSEq'+eq);if(e)e.checked=true}}
  else if(row.category==='HOLD INOP'){if($('aclSHold'))$('aclSHold').checked=true;if($('aclSHoldText'))$('aclSHoldText').value=row.restriction||'HOLD INOP'}
  else {if($('aclSOther'))$('aclSOther').checked=true;if($('aclSOtherText'))$('aclSOtherText').value=row.restriction||'OTHER'}
  reg?.dispatchEvent(new Event('input',{bubbles:true}));['aclSApu','aclSHold','aclSOther'].forEach(id=>$(id)?.dispatchEvent(new Event('change',{bubbles:true})));
}
function aclAISavePopup(message,type='ok',detail=''){
  if(typeof window.sagsActionPopup==='function'){
    window.sagsActionPopup({
      type:type==='err'?'error':(type==='warn'?'warning':'success'),
      title:type==='err'?'LƯU THẤT BẠI':(type==='warn'?'CHƯA CHỌN DÒNG NÀO':'ĐÃ LƯU A/C LIMITS'),
      message:detail||message||''
    });
    return;
  }
  let wrap=$('aclAISavePopup');
  if(!wrap){
    wrap=document.createElement('div');
    wrap.id='aclAISavePopup';
    wrap.style.cssText='position:fixed;z-index:19080;inset:0;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.58);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);';
    wrap.innerHTML=`
      <div id="aclAISavePopupCard" style="width:min(92vw,520px);background:#fff;border-radius:22px;padding:22px 18px 18px;box-shadow:0 28px 80px rgba(0,0,0,.38);text-align:center;">
        <div id="aclAISavePopupIcon" style="font-size:48px;line-height:1;margin-bottom:12px;">✅</div>
        <div id="aclAISavePopupTitle" style="font:900 22px/1.22 Arial;color:#143b62;margin-bottom:8px;">ĐÃ LƯU A/C LIMITS</div>
        <div id="aclAISavePopupDetail" style="font:800 14px/1.45 Arial;color:#5f748b;white-space:pre-wrap;"></div>
        <button id="aclAISavePopupClose" type="button" style="margin-top:18px;min-width:150px;min-height:46px;border:0;border-radius:13px;background:#0c67c8;color:#fff;font:900 15px Arial;">OK</button>
      </div>`;
    document.body.appendChild(wrap);
    const close=()=>{wrap.style.display='none';};
    $('aclAISavePopupClose').onclick=close;
    wrap.addEventListener('click',e=>{if(e.target===wrap)close()});
  }
  const icon=$('aclAISavePopupIcon'),title=$('aclAISavePopupTitle'),dt=$('aclAISavePopupDetail'),btn=$('aclAISavePopupClose');
  if(type==='err'){
    icon.textContent='❌';title.textContent='LƯU THẤT BẠI';
    title.style.color='#b42318';btn.style.background='#b42318';
  }else if(type==='warn'){
    icon.textContent='⚠️';title.textContent='CHƯA CHỌN DÒNG NÀO';
    title.style.color='#9a5d00';btn.style.background='#a86400';
  }else{
    icon.textContent='✅';title.textContent='ĐÃ LƯU A/C LIMITS';
    title.style.color='#087443';btn.style.background='#087443';
  }
  dt.textContent=detail||message||'';
  wrap.style.display='flex';
}
async function saveSelected(){
  const rows=aiRows.filter(x=>x.selected&&x.action!=='CLEAR');
  if(!rows.length){
    status('Chưa tích dòng nào để lưu.',true);
    aclAISavePopup('CHƯA CHỌN DÒNG NÀO','warn','Hãy tích chọn ít nhất 1 dòng A/C LIMITS trước khi lưu.');
    return;
  }
  const btn=$('aclAISave'),oldText=btn?.textContent||'✓ LƯU CÁC DÒNG ĐÃ CHỌN';
  if(btn){btn.disabled=true;btn.textContent='⏳ ĐANG LƯU...'}
  let ok=0;
  window.__SAGS_ACL_BATCH_SAVE_ACTIVE=true;
  try{
    for(const r of rows){
      if(!r.reg||(!r.restriction&&r.category!=='APU INOP'))continue;
      setSimple(r);
      await window.aclSimpleSave?.();
      if($('aclSStatus')?.classList.contains('err'))throw new Error($('aclSStatus')?.textContent||('Không lưu được '+r.reg));
      ok++;
    }
    if(!ok)throw new Error('Không có dòng hợp lệ để lưu.');
    const msg=`✅ ĐÃ LƯU A/C LIMITS · ${ok} DÒNG`;
    status(`✓ Đã lưu ${ok} dòng AI đã duyệt vào A/C LIMITS. Kiểm tra danh sách đang lưu bên dưới.`);
    aclAISavePopup(msg,'ok',`Đã lưu thành công ${ok} dòng vào A/C LIMITS.`);
    try{await window.ACLSimple?.refresh?.()}catch(_){}
  }catch(e){
    const msg=String(e?.message||e||'Không xác định');
    status('Lưu thất bại: '+msg,true);
    aclAISavePopup('LƯU THẤT BẠI','err',msg);
  }finally{
    window.__SAGS_ACL_BATCH_SAVE_ACTIVE=false;
    if(btn){btn.disabled=false;btn.textContent=oldText}
  }
}
function patchHelp(){}
function install(){if(ensureUi())patchHelp();else if(!$('aclAIBox'))setTimeout(install,350)}
function hookSimpleOpen(){
  try{
    const api=window.ACLSimple;
    if(api&&typeof api.open==='function'&&!api.open.__aclAIHook){
      const original=api.open;
      const wrapped=async function(){const r=await original.apply(this,arguments);ensureUi();patchHelp();return r};
      wrapped.__aclAIHook=true;api.open=wrapped;window.aclSimpleOpen=wrapped;
      const b=$('roleBtnAcLimits');if(b)b.onclick=e=>{e?.preventDefault?.();wrapped();return false};
    }
  }catch(_){}
  if(!$('aclAIBox'))setTimeout(hookSimpleOpen,500);
}
window.ACL_AI_MODEL=ACL_AI_MODEL;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{install();hookSimpleOpen()},{once:true});else setTimeout(()=>{install();hookSimpleOpen()},0);
window.ACLLimitAI={build:BUILD,read:readAI,clear:clearAI};
})();


/* ===== V3.89 LIMIT UI POLISH ===== */
(function(){
  if(document.getElementById('aclLimitUiPolishV389')) return;
  const st=document.createElement('style');
  st.id='aclLimitUiPolishV389';
  st.textContent=`
  #aclAIModal{background:rgba(6,18,34,.72)!important;backdrop-filter:blur(3px)}
  #aclAIModal .aclai-panel{
    width:min(96vw,860px)!important;
    border-radius:20px!important;
    box-shadow:0 22px 70px rgba(0,0,0,.34)!important;
    background:linear-gradient(180deg,#f7fbff 0%,#f6f8fb 100%)!important;
    border:1px solid #d6e3ef!important;
  }
  #aclAIModal .aclai-top{
    border-bottom:1px solid #d8e3ec!important;
    padding-bottom:12px!important;
    margin-bottom:10px!important;
  }
  #aclAIModal .aclai-top h3{
    font-size:21px!important;
    line-height:1.2!important;
    letter-spacing:-.2px!important;
    color:#064f9e!important;
  }
  #aclAIModal .aclai-card{
    border:1px solid #d9e4ee!important;
    border-radius:15px!important;
    padding:13px!important;
    box-shadow:0 2px 8px rgba(20,54,88,.05)!important;
    background:#fff!important;
  }
  #aclAIModal .aclai-file{
    width:100%!important;
    box-sizing:border-box!important;
    border:2px dashed #7fa8c8!important;
    border-radius:14px!important;
    padding:14px!important;
    background:#f7fbff!important;
    font-weight:800!important;
    color:#28465f!important;
  }
  #aclAIModal .aclai-file::file-selector-button{
    border:0!important;
    border-radius:10px!important;
    padding:10px 13px!important;
    margin-right:10px!important;
    font-weight:900!important;
    background:#e7f2fb!important;
    color:#075ea8!important;
  }
  #aclAIModal #aclAIRead{
    width:100%!important;
    min-height:48px!important;
    border-radius:12px!important;
    font-size:16px!important;
    font-weight:900!important;
    box-shadow:0 4px 12px rgba(6,79,158,.18)!important;
  }
  #aclAIModal .aclai-btn{
    min-height:42px!important;
    border-radius:11px!important;
    padding:10px 14px!important;
  }
  #aclAIModal img{
    border-radius:14px!important;
    border:1px solid #cbd9e5!important;
    background:#f4f7fa!important;
    box-shadow:0 3px 12px rgba(0,0,0,.08)!important;
  }
  #aclAIModal textarea,
  #aclAIModal input[type="text"],
  #aclAIModal input[type="date"],
  #aclAIModal select{
    border-radius:10px!important;
    border:1px solid #aebfce!important;
    min-height:40px!important;
    background:#fff!important;
  }
  #aclAIModal textarea:focus,
  #aclAIModal input:focus,
  #aclAIModal select:focus{
    outline:3px solid rgba(11,106,169,.12)!important;
    border-color:#0b6aa9!important;
  }
  #aclAIModal .aclai-status{
    border-radius:11px!important;
    padding:10px 12px!important;
    background:#eef6fc!important;
    border:1px solid #d5e7f5!important;
    font-weight:800!important;
    line-height:1.45!important;
  }

  #aclSimpleModal{background:rgba(6,18,34,.72)!important;backdrop-filter:blur(3px)}
  #aclSimpleModal .acls-panel{
    width:min(97vw,900px)!important;
    border-radius:20px!important;
    background:linear-gradient(180deg,#f8fbfe 0%,#f5f7fa 100%)!important;
    box-shadow:0 22px 70px rgba(0,0,0,.34)!important;
  }
  #aclSimpleModal .acls-step{
    border-radius:15px!important;
    border:1px solid #d8e3ec!important;
    box-shadow:0 2px 8px rgba(20,54,88,.05)!important;
  }
  #aclSimpleModal .acls-step-title{
    display:flex!important;
    align-items:center!important;
    gap:7px!important;
    font-size:16px!important;
    color:#163d5b!important;
  }
  #aclSimpleModal .acls-num{
    width:28px!important;height:28px!important;
    box-shadow:0 2px 5px rgba(0,59,142,.18)!important;
  }
  #aclSimpleModal .acls-reg{
    min-height:50px!important;
    font-size:22px!important;
    letter-spacing:.7px!important;
    text-align:center!important;
  }
  #aclSimpleModal .acls-type{
    transition:.15s ease!important;
    cursor:pointer!important;
  }
  #aclSimpleModal .acls-type:has(>label>input:checked){
    box-shadow:0 3px 12px rgba(7,94,168,.10)!important;
  }
  #aclSimpleModal .acls-save-row{
    border-top:1px solid #d8e3ec!important;
    box-shadow:0 -5px 14px rgba(21,45,69,.04)!important;
  }
  #aclSimpleModal .acls-save-row button{
    min-height:44px!important;
    flex:1 1 180px!important;
  }
  #aclSimpleModal .acls-day{
    border:1px solid #d7e2eb!important;
    border-radius:14px!important;
    overflow:hidden!important;
    margin:10px 0!important;
    background:#fff!important;
    box-shadow:0 2px 8px rgba(20,54,88,.05)!important;
  }
  #aclSimpleModal .acls-day-head{
    padding:10px 12px!important;
    background:#f1f7fb!important;
    border-bottom:1px solid #d9e5ee!important;
  }
  #aclSimpleModal .acls-day-body{padding:8px!important}
  #aclSimpleModal .acls-day-delete{border-radius:9px!important}
  #aclSimpleModal .acls-empty{
    border:1px dashed #c7d5e2!important;
    border-radius:13px!important;
    padding:18px!important;
    text-align:center!important;
    background:#fff!important;
    color:#61778a!important;
    font-weight:800!important;
  }

  @media(max-width:640px){
    #aclAIModal .aclai-panel,#aclSimpleModal .acls-panel{
      width:100%!important;
      max-height:98dvh!important;
      border-radius:16px!important;
      padding:10px!important;
    }
    #aclAIModal .aclai-top h3,#aclSimpleModal .acls-top h3{font-size:18px!important}
    #aclAIModal .aclai-card,#aclSimpleModal .acls-step{padding:10px!important}
    #aclSimpleModal .acls-grid{grid-template-columns:1fr!important}
    #aclSimpleModal .acls-roles{grid-template-columns:repeat(2,minmax(0,1fr))!important}
    #aclSimpleModal .acls-save-row{gap:6px!important}
  }`;
  document.head.appendChild(st);
})();


/* ===== V3.92 LIMIT TWO-MODE UI ===== */
(function(){
  if(document.getElementById('aclLimitModeStyleV392'))return;
  const st=document.createElement('style');st.id='aclLimitModeStyleV392';st.textContent=`
  #aclLimitModeSwitch{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}
  .aclModeBtn{border:2px solid #c7d7e5;border-radius:13px;padding:12px 10px;background:#fff;color:#31536d;font:900 14px Arial;cursor:pointer}
  .aclModeBtn.active{border-color:#0b67b2;background:#eaf5ff;color:#07599d;box-shadow:0 3px 10px rgba(11,103,178,.12)}
  .aclModeBtn.ai.active{border-color:#6b4bb8;background:#f3efff;color:#5931a4}
  .aclModePane{display:none}
  .aclModePane.active{display:block}
  #aclManualMode{border:2px solid #c9dceb;border-radius:16px;padding:10px;background:#f7fbff}
  #aclAIMode{border:2px solid #d8cbed;border-radius:16px;padding:10px;background:#fbf9ff}
  #aclManualMode:before,#aclAIMode:before{display:block;font:900 12px Arial;letter-spacing:.3px;margin:1px 2px 9px}
  #aclManualMode:before{content:"✍ NHẬP LIMIT THỦ CÔNG";color:#07599d}
  #aclAIMode:before{content:"📷 UP ẢNH + AI ĐỌC LIMIT";color:#5931a4}
  #aclAIMode #aclAIBox{margin:0!important;border:0!important;box-shadow:none!important;background:transparent!important;padding:2px!important}
  @media(max-width:640px){
    #aclLimitModeSwitch{grid-template-columns:1fr 1fr;gap:6px}
    .aclModeBtn{padding:10px 6px;font-size:12px}
    #aclManualMode,#aclAIMode{padding:7px}
  }`;
  document.head.appendChild(st);
})();


}
if(phase==='flight'){

/* ===== BEGIN daily-roster.js ===== */
/* E-REPORT SAGS · DAILY ROSTER ROLE MAP + PVHK FSAGS09 + DIRECT REASSIGN · V2.4 UI */
(function(root){
  "use strict";

  const BUILD="V1.83-20260822-01";
  const ENGINE="DAILY_ROSTER_V1";
  const MAIL_PATH="roster_mail";
  const MANIFEST_PATH="roster_manifests";
  const SESSION_PATH="roster_sessions";
  const REVOKE_PATH="roster_revocations";
  const FLIGHT_PATH="flight_records";
  const FIXED_ROLE_COLUMNS=["Grnd_Cor","Grnd_Ld","Grnd_Ls","Pax_Supr"];

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
  function addIsoDays(iso,n){
    const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(S(iso));if(!m)return S(iso);
    const d=new Date(Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3])+Number(n||0)));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`;
  }
  function isoDayDiff(base,target){
    const a=/^(\d{4})-(\d{2})-(\d{2})$/.exec(S(base)),b=/^(\d{4})-(\d{2})-(\d{2})$/.exec(S(target));if(!a||!b)return 0;
    return Math.round((Date.UTC(Number(b[1]),Number(b[2])-1,Number(b[3]))-Date.UTC(Number(a[1]),Number(a[2])-1,Number(a[3])))/86400000);
  }
  function parseRosterTime(v){
    let raw=S(v);if(!raw)return {clock:"",display:"",nextDay:false,dayOffset:0,raw:""};
    raw=raw.replace(/\.0+$/,'').trim();
    const nextDay=/\+\s*$/.test(raw);
    let s=raw.replace(/\+\s*$/,'').trim(),clock="";
    if(/^\d{1,4}$/.test(s)){s=s.padStart(4,"0");const h=Number(s.slice(0,2)),m=Number(s.slice(2));if(h<24&&m<60)clock=`${s.slice(0,2)}:${s.slice(2)}`;}
    if(!clock){const m=/^(\d{1,2}):(\d{2})/.exec(s);if(m&&Number(m[1])<24&&Number(m[2])<60)clock=`${String(Number(m[1])).padStart(2,"0")}:${m[2]}`;}
    return {clock,display:clock?(clock+(nextDay?"+":"")):"",nextDay:!!nextDay,dayOffset:nextDay?1:0,raw};
  }
  function fmtTime(v){return parseRosterTime(v).display;}
  function resolveEventDate(opIso,explicitIso,timeInfo){
    const base=S(opIso),exp=S(explicitIso);let out=exp||base;
    if(timeInfo?.dayOffset>0 && isoDayDiff(base,out)<timeInfo.dayOffset)out=addIsoDays(base,timeInfo.dayOffset);
    return out||base;
  }
  function sortMinuteFor(opIso,eventIso,clock){
    const m=/^(\d{2}):(\d{2})$/.exec(S(clock));if(!m)return 999999;
    return isoDayDiff(opIso,eventIso)*1440+Number(m[1])*60+Number(m[2]);
  }
  function safeSortMinute(value,opIso,eventIso,clock){
    const raw=S(value),n=raw===""?NaN:Number(raw);
    return Number.isFinite(n)?n:sortMinuteFor(opIso,eventIso,clock);
  }
  function safeFiniteNumber(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback;}
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
  function validRosterUser(x){return !!(x&&/^[A-Z][A-Z0-9._-]{1,39}$/.test(x)&&!/^N\/?A$/.test(x)&&!/^\d+$/.test(x))}
  // V1.1.42: dấu phẩy trong Grnd_Cor / Grnd_Ld là NHÓM HỖ TRỢ CÙNG PHẦN VIỆC.
  // Các dấu phân cách khác (/, ;, |, xuống dòng) vẫn tách thành các nhóm tuần tự legacy.
  // Riêng Grnd_Cor có đúng 1 dấu "/" trên dòng ARR/DEP thì "/" vẫn là ranh giới ĐẾN / ĐI.
  function coAssigneeGroupsFromCell(v){
    const out=[];
    for(const block of upper(v).split(/[\/;|\n]+/)){
      const group=[...new Set(block.split(/,+/).map(normUser).filter(validRosterUser))];
      if(group.length)out.push(group);
    }
    return out;
  }
  function flattenUserGroups(groups){return [...new Set((groups||[]).flatMap(g=>Array.isArray(g)?g:[]).map(normUser).filter(validRosterUser))]}
  function groupDisplay(groups,leg=''){return (groups||[]).map(g=>`${g.join(' + ')}${leg?` · ${leg}`:''}`)}
  // Grnd_Cor ARR/DEP:
  //   A / B       => A chỉ ARR, B chỉ DEP
  //   A,B / C,D   => A+B cùng nhóm ARR; C+D cùng nhóm DEP
  //   A / A       => A phụ trách cả turnaround (1 assignment, không tạo trùng)
  //   A /          => A chỉ ARR
  //     / B        => B chỉ DEP
  // Không có split ARR/DEP: dấu phẩy vẫn là cùng nhóm; ; | xuống dòng giữ thứ tự nhóm legacy.
  function grndCorPlan(v,hasPair){
    const raw=S(v),legacyGroups=coAssigneeGroupsFromCell(raw),legacy=flattenUserGroups(legacyGroups),slashes=(raw.match(/\//g)||[]).length;
    if(!hasPair||slashes!==1)return {split:false,turn:legacy,arr:[],dep:[],turnGroups:legacyGroups,arrGroups:[],depGroups:[],display:groupDisplay(legacyGroups)};
    const at=raw.indexOf('/'),arrGroups=coAssigneeGroupsFromCell(raw.slice(0,at)),depGroups=coAssigneeGroupsFromCell(raw.slice(at+1)),arr=flattenUserGroups(arrGroups),dep=flattenUserGroups(depGroups);
    if(arrGroups.length===1&&depGroups.length===1&&arrGroups[0].length===1&&depGroups[0].length===1&&arr[0]===dep[0])return {split:true,turn:[arr[0]],arr:[],dep:[],turnGroups:[[arr[0]]],arrGroups:[],depGroups:[],display:[`${arr[0]} · ĐẾN+ĐI`]};
    const display=[...groupDisplay(arrGroups,'ĐẾN'),...groupDisplay(depGroups,'ĐI')];
    return {split:true,turn:[],arr,dep,turnGroups:[],arrGroups,depGroups,display};
  }
  function formLabel(g){g=upper(g);return g==="FINAL"?"FINAL":g==="FSAGS421"?"42.1":(g==="FSAGS551"?"55.1":(g==="FSAGS09"?"FSAGS 09":"42.3"));}
  function hashId(s){
    let h=2166136261>>>0;for(let i=0;i<String(s).length;i++){h^=String(s).charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h.toString(36).toUpperCase();
  }
  function flightIdForRoster(rec){
    let fid="";
    try{if(typeof root.sagsFlightHubFlightId==="function")fid=S(root.sagsFlightHubFlightId(rec?.opDate,rec?.arrFlight,rec?.depFlight,rec?.flightRaw||rec?.flightName));}catch(_){ }
    if(fid)return fid;
    const normFlight=v=>upper(v).replace(/[^A-Z0-9]/g,"");
    const flights=[normFlight(rec?.arrFlight),normFlight(rec?.depFlight)].filter(Boolean);
    if(!flights.length)flights.push(...splitFlights(rec?.flightRaw||rec?.flightName).map(normFlight));
    const sig=`${S(rec?.opDate)}|${flights.join("|")||normFlight(rec?.flightRaw||rec?.flightName)||"UNKNOWN"}`;
    return `FLT_${hashId(sig)}`;
  }
  function getCell(row,map,key){const i=map[key];return i===undefined?"":S(row?.[i]);}
  function allFlightRows(parsed){
    const {row:hi,map}=headerRowInfo(parsed.rows||[]),out=[];
    let rosterDate=null;
    for(let i=0;i<Math.min(hi,15);i++){
      for(const x of (parsed.rows[i]||[])){
        const d=parseDate(x);if(d){rosterDate=d;break;}
      }
      if(rosterDate)break;
    }
    const seen=new Set();
    for(let i=hi+1;i<(parsed.rows||[]).length;i++){
      const row=parsed.rows[i]||[],flightRaw=getCell(row,map,"FlightNo");if(!flightRaw)continue;
      const arrDate=parseDate(getCell(row,map,"ArrFlightDate")),depDate=parseDate(getCell(row,map,"DepFlightDate"));
      const opDate=arrDate||depDate||rosterDate;if(!opDate)continue;
      const staInfo=parseRosterTime(getCell(row,map,"STA")),stdInfo=parseRosterTime(getCell(row,map,"STD")),etaInfo=parseRosterTime(getCell(row,map,"ETA")),etdInfo=parseRosterTime(getCell(row,map,"ETD"));
      const sta=staInfo.display,std=stdInfo.display,arrFlightDate=resolveEventDate(opDate.iso,arrDate?.iso,staInfo),depFlightDate=resolveEventDate(opDate.iso,depDate?.iso,stdInfo);
      const etaFlightDate=resolveEventDate(opDate.iso,arrDate?.iso||arrFlightDate,etaInfo),etdFlightDate=resolveEventDate(opDate.iso,depDate?.iso||depFlightDate,etdInfo);
      const flights=splitFlights(flightRaw);
      let arrFlight="",depFlight="";
      if(flights.length>=2){arrFlight=flights[0];depFlight=flights[1];}
      else if(flights.length===1){if(arrDate||sta)arrFlight=flights[0];else if(depDate||std)depFlight=flights[0];}
      if(!arrFlight&&!depFlight)continue;
      const rp=routeParts(getCell(row,map,"Route"));
      const rec={
        rowNo:i+1,opDate:opDate.iso,date:opDate.display,flightRaw:upper(flightRaw),
        flightName:[arrFlight,depFlight].filter(Boolean).join(" / ")||upper(flightRaw),
        arrFlight,depFlight,sta,std,eta:etaInfo.display,etd:etdInfo.display,
        arrFlightDate,depFlightDate,etaFlightDate,etdFlightDate,
        staClock:staInfo.clock,stdClock:stdInfo.clock,etaClock:etaInfo.clock,etdClock:etdInfo.clock,
        staDayOffset:isoDayDiff(opDate.iso,arrFlightDate),stdDayOffset:isoDayDiff(opDate.iso,depFlightDate),etaDayOffset:isoDayDiff(opDate.iso,etaFlightDate),etdDayOffset:isoDayDiff(opDate.iso,etdFlightDate),
        staSortMinute:sortMinuteFor(opDate.iso,arrFlightDate,staInfo.clock),stdSortMinute:sortMinuteFor(opDate.iso,depFlightDate,stdInfo.clock),etaSortMinute:sortMinuteFor(opDate.iso,etaFlightDate,etaInfo.clock),etdSortMinute:sortMinuteFor(opDate.iso,etdFlightDate,etdInfo.clock),
        acReg:upper(getCell(row,map,"ACRegNo")),acType:upper(getCell(row,map,"ACType")),
        route:upper(getCell(row,map,"Route")),route1:rp.route1,route3:rp.route3,
        bay:S(getCell(row,map,"ParkingBay")),gate:S(getCell(row,map,"Gate")),
        booking:S(getCell(row,map,"Booking"))
      };
      const key=rec.opDate+"|"+rec.flightName;
      if(seen.has(key))continue;
      seen.add(key);out.push(rec);
    }
    return {records:out,headerMap:map,headerRow:hi+1,rosterDate:rosterDate?.iso||""};
  }

  function pvhk09SeedFor(rec){
    const s={
      f09_date:rec.date,f09_fltBefore:rec.arrFlight,f09_fltAfter:rec.depFlight,
      f09_sta:rec.sta,f09_std:rec.std,f09_eta:rec.eta,f09_etd:rec.etd,
      f09_regn:rec.acReg,f09_acType:rec.acType,f09_route1:rec.route1,f09_route3:rec.route3
    };
    if(rec.bay){s.f09_parkingArr=rec.bay;s.f09_parkingDep=rec.bay;}
    if(rec.gate){s.f09_gateArr=rec.gate;s.f09_gateDep=rec.gate;}
    if(rec.booking)s.f09_booking=rec.booking;
    for(const k of Object.keys(s))if(!S(s[k]))delete s[k];
    return s;
  }

  function ldConflictKey(rowNo,opDate,flightRaw,user){
    return "LDC_"+hashId([Number(rowNo)||0,S(opDate),upper(flightRaw),normUser(user)].join("|"));
  }
  function rosterRecords(parsed){
    const {row:hi,map}=headerRowInfo(parsed.rows||[]),out=[],ldConflicts=[];
    let rosterDate=null;
    for(let i=0;i<Math.min(hi,15);i++)for(const x of (parsed.rows[i]||[])){const d=parseDate(x);if(d){rosterDate=d;break;}if(rosterDate)break;}
    for(let i=hi+1;i<(parsed.rows||[]).length;i++){
      const row=parsed.rows[i]||[],flightRaw=getCell(row,map,"FlightNo");if(!flightRaw)continue;
      const arrDate=parseDate(getCell(row,map,"ArrFlightDate")),depDate=parseDate(getCell(row,map,"DepFlightDate"));
      const opDate=arrDate||depDate||rosterDate;if(!opDate)continue;
      const staInfo=parseRosterTime(getCell(row,map,"STA")),stdInfo=parseRosterTime(getCell(row,map,"STD")),etaInfo=parseRosterTime(getCell(row,map,"ETA")),etdInfo=parseRosterTime(getCell(row,map,"ETD"));
      const sta=staInfo.display,std=stdInfo.display,arrFlightDate=resolveEventDate(opDate.iso,arrDate?.iso,staInfo),depFlightDate=resolveEventDate(opDate.iso,depDate?.iso,stdInfo);
      const etaFlightDate=resolveEventDate(opDate.iso,arrDate?.iso||arrFlightDate,etaInfo),etdFlightDate=resolveEventDate(opDate.iso,depDate?.iso||depFlightDate,etdInfo);
      const flights=splitFlights(flightRaw);
      let arrFlight="",depFlight="";
      if(flights.length>=2){arrFlight=flights[0];depFlight=flights[1];}
      else if(flights.length===1){if(arrDate||sta)arrFlight=flights[0];else if(depDate||std)depFlight=flights[0];}
      const rp=routeParts(getCell(row,map,"Route"));
      const corCell=getCell(row,map,"Grnd_Cor"),corPlan=grndCorPlan(corCell,!!arrFlight&&!!depFlight);
      const groupEntries=(groups,leg)=>((groups||[]).flatMap((group,groupIndex)=>(group||[]).map((u,coIndex)=>({user:u,leg,groupIndex,coIndex,groupUsers:[...group]}))));
      const corEntries=[
        ...groupEntries(corPlan.turnGroups||corPlan.turn.map(u=>[u]),""),
        ...groupEntries(corPlan.arrGroups||corPlan.arr.map(u=>[u]),"ARR"),
        ...groupEntries(corPlan.depGroups||corPlan.dep.map(u=>[u]),"DEP")
      ];
      const corUsers=[...new Set(corEntries.map(x=>x.user))];
      const ldGroups=coAssigneeGroupsFromCell(getCell(row,map,"Grnd_Ld")),ldUsers=flattenUserGroups(ldGroups);
      const lsUsers=usersFromCell(getCell(row,map,"Grnd_Ls"));
      const paxUsers=usersFromCell(getCell(row,map,"Pax_Supr"));
      const ldSet=new Set(ldUsers);
      const overlapUsers=[...new Set(corUsers.filter(u=>ldSet.has(u)))];
      if(!corEntries.length&&!ldUsers.length&&!lsUsers.length&&!paxUsers.length)continue;

      const base={
        rowNo:i+1,opDate:opDate.iso,date:opDate.display,flightRaw:upper(flightRaw),arrFlight,depFlight,sta,std,eta:etaInfo.display,etd:etdInfo.display,
        arrFlightDate,depFlightDate,etaFlightDate,etdFlightDate,
        staClock:staInfo.clock,stdClock:stdInfo.clock,etaClock:etaInfo.clock,etdClock:etdInfo.clock,
        staDayOffset:isoDayDiff(opDate.iso,arrFlightDate),stdDayOffset:isoDayDiff(opDate.iso,depFlightDate),etaDayOffset:isoDayDiff(opDate.iso,etaFlightDate),etdDayOffset:isoDayDiff(opDate.iso,etdFlightDate),
        staSortMinute:sortMinuteFor(opDate.iso,arrFlightDate,staInfo.clock),stdSortMinute:sortMinuteFor(opDate.iso,depFlightDate,stdInfo.clock),etaSortMinute:sortMinuteFor(opDate.iso,etaFlightDate,etaInfo.clock),etdSortMinute:sortMinuteFor(opDate.iso,etdFlightDate,etdInfo.clock),
        acReg:upper(getCell(row,map,"ACRegNo")),acType:upper(getCell(row,map,"ACType")),route:upper(getCell(row,map,"Route")),
        route1:rp.route1,route3:rp.route3,bay:S(getCell(row,map,"ParkingBay")),
        grndCor:corPlan.display.length?corPlan.display:corUsers,grndLd:ldUsers,grndLs:lsUsers,paxSupr:paxUsers,
        flightName:[arrFlight,depFlight].filter(Boolean).join(" / ")||upper(flightRaw)
      };
      for(const u of overlapUsers){
        const legs=[...new Set(corEntries.filter(e=>e.user===u).map(e=>e.leg||"TURNAROUND"))];
        ldConflicts.push({
          key:ldConflictKey(base.rowNo,base.opDate,base.flightRaw,u),
          rowNo:base.rowNo,opDate:base.opDate,date:base.date,flightRaw:base.flightRaw,flightName:base.flightName,
          user:u,corLegs:legs
        });
      }
      const add=(u,formGroup,sourceColumn,roleKey,workPartOrder=1,workPartTotal=1,assignmentLeg="",coMeta=null)=>{
        // ID dựa trên roster gốc + vai trò. Chỉ assignment tách chặng mới thêm ARR/DEP vào ID;
        // giữ ID username hiện hữu để update roster không làm mất draft/override cũ.
        const idParts=[base.opDate,base.flightRaw,roleKey,u];if(assignmentLeg)idParts.push(assignmentLeg);
        const id="RA_"+hashId(idParts.join("|"));
        const assignmentFlight=assignmentLeg==="ARR"?base.arrFlight:(assignmentLeg==="DEP"?base.depFlight:"");
        const assignmentTime=assignmentLeg==="ARR"?base.sta:(assignmentLeg==="DEP"?base.std:"");
        const coUsers=[...new Set((coMeta?.users||[u]).map(normUser).filter(validRosterUser))],coTotal=coUsers.length;
        const coAssigneeGroupId=coTotal>1?`CG_${hashId([base.opDate,base.flightRaw,sourceColumn,roleKey,formGroup,assignmentLeg||'TURN',Number(workPartOrder)||1].join('|'))}`:"";
        out.push({...base,assignmentId:id,targetUser:u,originalTargetUser:u,formGroup,sourceColumn,roleKey,assignmentLeg,assignmentFlight,assignmentTime,assignmentScope:assignmentLeg?"FLIGHT_LEG":"TURNAROUND",rosterLegSplit:!!corPlan.split,workPartOrder:Number(workPartOrder)||1,workPartTotal:Number(workPartTotal)||1,workPartSequenceSource:sourceColumn,coAssigneeGroupId,coAssigneeMode:coTotal>1?"PARALLEL_STANDBY":"",coAssigneeRank:coTotal>1?Number(coMeta?.rank||1):1,coAssigneeTotal:coTotal||1,coAssigneeUsers:coUsers});
      };
      // V3.94 · Quy tắc Grnd_Ld bắt buộc:
      // - Không có Grnd_Ld: mọi Grnd_Cor nhận F/SAGS 42.3.
      // - Có Grnd_Ld:
      //   + Grnd_Cor trùng username với Grnd_Ld vẫn nhận 42.3 theo nhiệm vụ Cor.
      //   + Grnd_Cor không trùng Grnd_Ld nhận 42.1.
      //   + MỌI username xuất hiện trong Grnd_Ld LUÔN nhận thêm F/SAGS 55.1,
      //     kể cả username đó đồng thời có trong Grnd_Cor.
      const addCorEntries=(entries,formGroup,sourceColumn,roleKey)=>{
        // V1.1.42: dấu phẩy = nhiều người cùng một WORK PART. Mỗi nhóm có cùng
        // workPartOrder; chỉ ; | xuống dòng (hoặc ARR -> DEP) mới tạo bước kế tiếp.
        const rank=e=>e?.leg==="ARR"?0:(e?.leg==="DEP"?2:1),groups=new Map();
        for(const e of entries||[]){const k=`${e?.leg||'TURN'}|${Number(e?.groupIndex)||0}`;if(!groups.has(k))groups.set(k,{leg:e?.leg||'',groupIndex:Number(e?.groupIndex)||0,rows:[]});groups.get(k).rows.push(e)}
        const ordered=[...groups.values()].sort((a,b)=>rank(a)-rank(b)||a.groupIndex-b.groupIndex);
        ordered.forEach((g,step)=>{const rows=g.rows.slice().sort((a,b)=>(Number(a.coIndex)||0)-(Number(b.coIndex)||0)),users=rows.map(e=>e.user);rows.forEach((e,i)=>add(e.user,formGroup,sourceColumn,roleKey,step+1,ordered.length,e.leg,{users,rank:i+1}))});
      };
      if(!ldUsers.length){
        addCorEntries(corEntries,"fsags","Grnd_Cor","COR");
      }else{
        const commonEntries=corEntries.filter(e=>ldSet.has(e.user));
        const corOnlyEntries=corEntries.filter(e=>!ldSet.has(e.user));
        addCorEntries(commonEntries,"fsags","Grnd_Cor + Grnd_Ld","BOTH");
        addCorEntries(corOnlyEntries,"fsags421","Grnd_Cor","COR");
        const ldEntries=groupEntries(ldGroups,"");
        addCorEntries(ldEntries,"fsags551","Grnd_Ld","LD");
      }
      // V1.82: Grnd_Ls là nguồn phân công CBTT. Mỗi username trong Grnd_Ls sinh nhiệm vụ FINAL/CROSSCHECK cho đúng chuyến.
      // Thứ tự username trong cùng ô là thứ tự bắt buộc nhận/làm: A / B / C => A → B → C.
      lsUsers.forEach((u,i)=>add(u,"final","Grnd_Ls","CBTT",i+1,lsUsers.length));
      // V1.77: PVHK Passenger Supervisor nhận F/SAGS-CXR/09.
      paxUsers.forEach((u,i)=>add(u,"fsags09","Pax_Supr","PAX09",i+1,paxUsers.length));
    }
    return {records:out,ldConflicts,headerMap:map,headerRow:hi+1,rosterDate:rosterDate?.iso||""};
  }
  function seedFor(rec){
    const s={};
    if(rec.formGroup==="fsags421"){
      Object.assign(s,{f421_date:rec.date,f421_fltBefore:rec.arrFlight,f421_fltAfter:rec.depFlight,f421_sta:rec.sta,f421_std:rec.std,f421_regn:rec.acReg,f421_acType:rec.acType,f421_route1:rec.route1,f421_route3:rec.route3});
      if(rec.bay){s.f421_bayBefore=rec.bay;s.f421_bayAfter=rec.bay;}
    }else if(rec.formGroup==="fsags551"){
      Object.assign(s,{f551_date:rec.date,f551_fltBefore:rec.arrFlight,f551_fltAfter:rec.depFlight,f551_sta:rec.sta,f551_std:rec.std,f551_regn:rec.acReg,f551_acType:rec.acType,f551_route1:rec.route1,f551_route3:rec.route3});
      if(rec.bay)s.f551_bay=rec.bay;
    }else if(rec.formGroup==="fsags09"){
      Object.assign(s,{
        f09_date:rec.date,f09_fltBefore:rec.arrFlight,f09_fltAfter:rec.depFlight,
        f09_sta:rec.sta,f09_std:rec.std,f09_regn:rec.acReg,f09_acType:rec.acType,
        f09_route1:rec.route1,f09_route3:rec.route3
      });
      if(rec.bay){s.f09_parkingArr=rec.bay;s.f09_parkingDep=rec.bay;}
    }else{
      Object.assign(s,{date:rec.date,fltBefore:rec.arrFlight,fltAfter:rec.depFlight,sta:rec.sta,std:rec.std,regn:rec.acReg,acType:rec.acType,route1:rec.route1,route2:"CXR",route3:rec.route3});
      if(rec.bay){s.bayBefore=rec.bay;s.bayAfter=rec.bay;}
    }
    for(const k of Object.keys(s))if(!S(s[k]))delete s[k];
    return s;
  }


  // Pure helpers exposed for validation/tests.
  root.__SAGS_DAILY_ROSTER_TEST__={parseXlsxBytes,parseCsvText,headerRowInfo,parseDate,parseRosterTime,fmtTime,addIsoDays,isoDayDiff,resolveEventDate,sortMinuteFor,splitFlights,usersFromCell,coAssigneeGroupsFromCell,flattenUserGroups,grndCorPlan,allFlightRows,pvhk09SeedFor,rosterRecords,seedFor,flightIdForRoster};
  if(typeof document==="undefined")return;

  let preview=null,mailRef=null,mailAddedCb=null,mailChangedCb=null,mailRemovedCb=null,mailPending={},mailFlushTimer=0,revRef=null,revAddedCb=null,revChangedCb=null,lastToastSig="";
  const rosterSyncTimers=new Map(),rosterSyncSig=new Map();
  function isAD(){try{return upper(currentRole)==="AD";}catch(e){return false;}}
  function localRosterDate(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
  function canManageDailyRoster(){
    if(isAD())return true;
    try{return typeof v485Can==="function"&&v485Can("DAILY_ROSTER");}catch(e){return false;}
  }
  function ensureUI(){
    if(document.getElementById("dailyRosterModal"))return;
    const style=document.createElement("style");
    style.textContent=`
      #dailyRosterModal{display:none;position:fixed;inset:0;z-index:16050;background:rgba(0,0,0,.52);align-items:center;justify-content:center;padding:12px;box-sizing:border-box;font-family:Arial,sans-serif}
      #dailyRosterModal.show{display:flex}.drPanel{width:min(96vw,960px);max-height:92vh;overflow:auto;background:#fff;border-radius:16px;box-shadow:0 16px 45px rgba(0,0,0,.28);padding:16px;box-sizing:border-box}.drHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.drHead h3{margin:0;color:#0b4f91}.drSub{font-size:13px;color:#5d6875;line-height:1.45;margin:5px 0 12px}.drGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.drField{border:1px solid #d9e1e8;border-radius:11px;padding:10px;background:#f9fbfd}.drField label{display:block;font-size:12px;font-weight:800;color:#29445e;margin-bottom:5px}.drField input,.drField select{width:100%;box-sizing:border-box;padding:9px;border:1px solid #c9d5df;border-radius:8px;background:#fff}.drCols{display:flex;flex-wrap:wrap;gap:7px}.drCheck{display:flex!important;align-items:center;gap:5px;font-size:12px!important;font-weight:700!important;margin:0!important;padding:5px 7px;border:1px solid #d7e0e8;border-radius:8px;background:#fff}.drCheck input{width:auto!important}.drActions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:12px}.drBtn{border:0;border-radius:9px;padding:9px 13px;font-weight:800;cursor:pointer;background:#0b67b2;color:#fff}.drBtn.secondary{background:#eef3f7;color:#31475a;border:1px solid #ccd7df}.drBtn.publish{background:#15803d}.drBtn.createFlight{display:none;width:100%;min-height:58px;font-size:18px;justify-content:center;align-items:center;box-shadow:0 8px 20px rgba(21,128,61,.22)}.drBtn.createFlight.ready{display:flex}.drStatus{margin-top:10px;padding:9px 10px;border-radius:9px;background:#eef6ff;color:#234764;font-size:13px;white-space:pre-wrap}.drStatus.err{background:#fff0f0;color:#9b1c1c}.drStatus.warn{background:#fff7e6;color:#8a4b00;border:2px solid #f0a93b;font-weight:900}.drStatus.nochange{background:#fff1f1;color:#c00000;border:3px solid #d60000;font-size:19px;font-weight:900;line-height:1.55;text-align:center;padding:15px 14px;box-shadow:0 5px 16px rgba(190,0,0,.18)}.drTableWrap{overflow:auto;margin-top:10px;border:1px solid #d9e1e8;border-radius:10px;max-height:38vh}.drTable{border-collapse:collapse;width:100%;font-size:12px;white-space:nowrap}.drTable th,.drTable td{border-bottom:1px solid #e5ebf0;padding:7px 8px;text-align:left}.drTable th{position:sticky;top:0;background:#edf5fb;color:#214968;z-index:1}.drBadge{display:inline-block;border-radius:999px;padding:2px 7px;background:#e8f5e9;color:#176b32;font-weight:800;margin:1px}.drPending{display:inline-block;margin-left:5px;border-radius:999px;padding:2px 6px;background:#fff0d6;color:#9a5600;border:1px solid #efbf72;font-size:10px;font-weight:900}
      .drConflictPanel{margin:12px 0;border:3px solid #e08a00;border-radius:14px;background:#fff9eb;overflow:hidden;box-shadow:0 6px 18px rgba(174,96,0,.14)}
      .drConflictHead{padding:12px 14px;background:#f08a00;color:#fff;font:900 16px/1.25 Arial}
      .drConflictIntro{padding:10px 14px;color:#6f4300;font:800 12px/1.5 Arial;border-bottom:1px solid #efd29c}
      .drConflictItem{display:grid;grid-template-columns:minmax(210px,1fr) minmax(300px,1.2fr);gap:10px;align-items:center;padding:11px 14px;border-bottom:1px solid #f0d9ad;background:#fffdf7}
      .drConflictItem:last-of-type{border-bottom:0}.drConflictMeta{min-width:0}.drConflictMeta b{display:block;color:#173f60;font-size:14px}.drConflictUser{display:inline-block;margin-top:5px;border-radius:999px;padding:4px 9px;background:#ffe4bd;color:#8f4a00;font-weight:900}
      .drConflictChoices{display:grid;grid-template-columns:1fr 1fr;gap:7px}.drConflictChoice{border:2px solid #c9d4de;border-radius:10px;padding:10px 8px;background:#fff;color:#314a5f;font:900 12px Arial;cursor:pointer}.drConflictChoice:hover{border-color:#6c91af}.drConflictChoice.both.selected{background:#e9f7ee;border-color:#13834f;color:#12623d}.drConflictChoice.only.selected{background:#eaf3ff;border-color:#176fbd;color:#0b5798}
      .drConflictFoot{padding:10px 14px;background:#fff3d8;color:#8e5200;font:900 13px Arial}.drConflictFoot.done{background:#eaf7ef;color:#17623b}
      .drEmpty{padding:14px;color:#667}.drToast{position:fixed;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:17000;background:#123d64;color:#fff;border-radius:12px;padding:10px 14px;font:700 13px Arial;box-shadow:0 8px 25px rgba(0,0,0,.25);max-width:min(90vw,520px);text-align:center}
      #roleBtnPVHK09Roster{background:#0b6b72!important;color:#fff!important}
      @media(max-width:650px){.drGrid{grid-template-columns:1fr}.drPanel{padding:12px}.drActions .drBtn{flex:1}.drConflictItem{grid-template-columns:1fr}.drConflictChoices{grid-template-columns:1fr}.drConflictChoice{min-height:44px}}
    `;
    document.head.appendChild(style);
    const m=document.createElement("div");m.id="dailyRosterModal";
    m.innerHTML=`<div class="drPanel"><div class="drHead"><div><h3>📋 DAILY ROSTER · TỰ TẠO CHUYẾN</h3><div class="drSub"><b>AD chỉ cần chọn file.</b> Hệ thống tự đọc roster, tự tạo Flight Workspace và phân công dữ liệu roster hiện có. Không cần bấm TẠO CHUYẾN.</div></div><button class="drBtn secondary" onclick="closeDailyRosterManager()">ĐÓNG</button></div>
      <div class="drField"><label>File DAILY ROSTER</label><input id="drFile" type="file" accept=".xlsx,.xlsm,.csv"></div>
      <div class="drStatus"><b>QUY TẮC TẠO FORM</b><br>• <b>Grnd_Cor A / B: A = chuyến ĐẾN, B = chuyến ĐI</b> (A / = chỉ ĐẾN; / B = chỉ ĐI; A / A = cả hai)<br>• <b>Dấu phẩy = CÙNG NHÓM HỖ TRỢ:</b> KIENNT, DATVH cùng thấy chuyến ngay; ai NHẬN CHUYẾN trước giữ quyền chỉnh sửa, người còn lại ở HỖ TRỢ. Áp dụng cho 42.3 / 42.1 / 55.1.<br>• Không có Grnd_Ld: Grnd_Cor → 42.3<br>• Grnd_Ld không trùng Grnd_Cor → luôn 55.1<br>• <b>Trùng cùng người ở Grnd_Cor + Grnd_Ld: hệ thống CẢNH BÁO và bắt buộc AD chọn “42.3 + 55.1” hoặc “CHỈ 42.3” trước khi tạo chuyến.</b><br>• Grnd_Cor khác người Grnd_Ld → 42.1<br>• <b>Grnd_Ls → CBTT · FINAL/CROSSCHECK</b><br>• <b>Pax_Supr → FSAGS 09</b>.</div>
      <div class="drActions" style="display:none"><button class="drBtn" id="drReadBtn" onclick="dailyRosterReadPreview()">📄 ĐỌC DAILY ROSTER</button></div>
      <div class="drActions"><button class="drBtn publish createFlight" id="drPublishBtn" onclick="dailyRosterPublish()" disabled style="display:none">✓ XÁC NHẬN TẠO CHUYẾN</button></div>
      <div class="drStatus" id="drStatus">Chọn file roster để bắt đầu.</div><div id="drPreview"></div>
      <div class="drField" style="margin-top:14px"><label>AD · CHUYỂN NGƯỜI PHỤ TRÁCH TRỰC TIẾP</label><div class="drSub">Không dùng GIAO CA. Chọn ngày → tải phân công → bấm CHUYỂN ở đúng biểu mẫu. Dữ liệu roster đã lưu trên V1.66 được giữ qua bản đồng bộ roster.</div><div style="display:flex;gap:8px;flex-wrap:wrap"><input id="drManageDate" type="date" style="flex:1;min-width:160px"><button class="drBtn secondary" onclick="dailyRosterLoadAssignments()">TẢI PHÂN CÔNG</button></div><div id="drManage"></div></div>
      </div>`;
    document.body.appendChild(m);
    const td=new Date(),d=`${td.getFullYear()}-${String(td.getMonth()+1).padStart(2,"0")}-${String(td.getDate()).padStart(2,"0")}`;const md=document.getElementById("drManageDate");if(md)md.value=d;
    document.getElementById("drFile")?.addEventListener("change",async(e)=>{preview=null;const b=document.getElementById("drPublishBtn");if(b){b.disabled=true;b.classList.remove("ready");b.style.display="none";}const file=e?.target?.files?.[0];if(!file)return;setStatus("Đã nhận file. Hệ thống đang đọc DAILY ROSTER…");await root.dailyRosterLoadFile?.(file);});
  }
  function canBuildPVHK09(){
    try{return upper(currentRole)==="AD"||(typeof v485Can==="function"&&v485Can("FSAGS09"));}catch(e){return false;}
  }
  function ensureButton(){
    const bar=document.querySelector(".toolbar-row.main-actions");if(!bar)return;
    let b=document.getElementById("roleBtnDailyRoster");
    if(!b){b=document.createElement("button");b.id="roleBtnDailyRoster";b.textContent="📋 DAILY ROSTER";b.onclick=()=>openDailyRosterManager();b.style.display="none";const anchor=document.getElementById("roleBtnActivity");if(anchor?.parentNode)anchor.parentNode.insertBefore(b,anchor.nextSibling);else bar.appendChild(b);}
    b.style.display=canManageDailyRoster()?"":"none";

    let p=document.getElementById("roleBtnPVHK09Roster");
    if(!p){
      p=document.createElement("button");p.id="roleBtnPVHK09Roster";p.textContent="📋 PHÂN CHUYẾN 09";p.style.display="none";
      p.onclick=()=>root.dailyRosterPickPVHK09?.();
      const anchor=document.getElementById("roleBtnFlights");
      if(anchor?.parentNode)anchor.parentNode.insertBefore(p,anchor.nextSibling);else bar.appendChild(p);

      const f=document.createElement("input");f.id="pvhk09RosterFile";f.type="file";f.accept=".xlsx,.xlsm,.csv";
      f.style.position="fixed";f.style.left="-9999px";f.style.top="-9999px";f.style.width="1px";f.style.height="1px";f.style.opacity="0";
      f.addEventListener("change",async()=>{const file=f.files?.[0];f.value="";if(file)await root.dailyRosterCreatePVHK09FromFile?.(file);});
      document.body.appendChild(f);
    }
    p.style.display=canBuildPVHK09()?"":"none";
  }
  function setStatus(msg,err=false,noChange=false,warn=false){const e=document.getElementById("drStatus");if(e){e.textContent=msg;e.classList.toggle("err",!!err);e.classList.toggle("nochange",!!noChange);e.classList.toggle("warn",!!warn);}}
  function rosterFlightKey(v){return upper(v).replace(/[^A-Z0-9]/g,"");}
  function rosterFlightTokens(){const out=new Set();for(const v of arguments){for(const m of upper(v).matchAll(/[A-Z0-9]{2,3}\s*\d{1,5}/g)){const k=rosterFlightKey(m[0]);if(k)out.add(k)}}return out;}
  function sameRosterFlightIdentity(a,b){const x=rosterFlightTokens(a?.flightRaw,a?.flightName,a?.arrFlight,a?.depFlight),y=rosterFlightTokens(b?.flightRaw,b?.flightName,b?.arrFlight,b?.depFlight);return [...x].some(k=>y.has(k));}
  function unresolvedLdConflicts(data=preview){
    const choices=data?.ldConflictChoices||{};
    return (data?.ldConflicts||[]).filter(c=>!["BOTH","ONLY423"].includes(choices[c.key]));
  }
  function effectiveRosterRecords(data=preview){
    const raw=Array.isArray(data?.rawRecords)?data.rawRecords:(data?.records||[]);
    const choices=data?.ldConflictChoices||{},conflictKeys=new Set((data?.ldConflicts||[]).map(c=>c.key));
    const kept=raw.filter(r=>{
      if(r.formGroup!=="fsags551"||upper(r.roleKey)!=="LD")return true;
      const key=ldConflictKey(r.rowNo,r.opDate,r.flightRaw,r.targetUser);
      return !(conflictKeys.has(key)&&choices[key]==="ONLY423");
    });
    // Nếu lựa chọn xung đột loại một thành viên khỏi 55.1, cập nhật lại nhóm hỗ trợ
    // theo đúng các assignment còn thực sự được phát hành; không giữ peer "ma" trong group.
    const groups=new Map();for(const r of kept){const gid=S(r?.coAssigneeGroupId);if(!gid)continue;if(!groups.has(gid))groups.set(gid,[]);groups.get(gid).push(r)}
    return kept.map(r=>{const gid=S(r?.coAssigneeGroupId);if(!gid)return r;const peers=(groups.get(gid)||[]).map(x=>normUser(x.targetUser)).filter(Boolean);if(peers.length<=1)return {...r,coAssigneeGroupId:"",coAssigneeMode:"",coAssigneeRank:1,coAssigneeTotal:1,coAssigneeUsers:peers.length?peers:[normUser(r.targetUser)]};const rank=Math.max(1,peers.indexOf(normUser(r.targetUser))+1);return {...r,coAssigneeUsers:peers,coAssigneeTotal:peers.length,coAssigneeRank:rank,coAssigneeMode:"PARALLEL_STANDBY"}});
  }
  function syncLdConflictState(data=preview){
    if(!data)return;
    if(!Array.isArray(data.rawRecords))data.rawRecords=(data.records||[]).slice();
    if(!data.ldConflictChoices||typeof data.ldConflictChoices!=="object")data.ldConflictChoices={};
    data.records=effectiveRosterRecords(data);
  }
  function updateDailyRosterPublishState(){
    const btn=document.getElementById("drPublishBtn");if(!btn)return;
    const has=!!((preview?.rawRecords||preview?.records||[]).length),left=unresolvedLdConflicts(preview).length,ok=has&&!left;
    btn.disabled=!ok;btn.classList.toggle("ready",ok);btn.style.display=has?"flex":"none";
    btn.textContent=left?`⚠ CÒN ${left} CẢNH BÁO CHƯA CHỌN`:"✓ XÁC NHẬN TẠO CHUYẾN";
  }
  root.dailyRosterChooseLdConflict=function(key,choice){
    if(!preview||!["BOTH","ONLY423"].includes(choice))return false;
    const c=(preview.ldConflicts||[]).find(x=>x.key===key);if(!c)return false;
    preview.ldConflictChoices=preview.ldConflictChoices||{};preview.ldConflictChoices[key]=choice;
    syncLdConflictState(preview);renderPreview(preview);updateDailyRosterPublishState();
    const left=unresolvedLdConflicts(preview).length;
    if(left)setStatus(`⚠ Còn ${left} trường hợp Grnd_Cor + Grnd_Ld chưa chọn. Phải xử lý hết trước khi tạo chuyến.`,false,false,true);
    else setStatus(`✓ Đã xử lý đủ ${(preview.ldConflicts||[]).length} cảnh báo Grnd_Cor + Grnd_Ld. Kiểm tra bảng biểu mẫu rồi bấm XÁC NHẬN TẠO CHUYẾN.`);
    return true;
  };
  function renderPreview(data){
    const host=document.getElementById("drPreview");if(!host)return;
    syncLdConflictState(data);
    const recs=data.records||[],users=[...new Set(recs.map(x=>x.targetUser))];
    const conflicts=data.ldConflicts||[],choices=data.ldConflictChoices||{},conflictMap=new Map(conflicts.map(c=>[c.key,c]));
    const unresolved=unresolvedLdConflicts(data);
    const conflictHtml=conflicts.length?`<div class="drConflictPanel" id="drConflictPanel">
      <div class="drConflictHead">⚠ BẮT BUỘC XÁC NHẬN · TRÙNG Grnd_Cor + Grnd_Ld</div>
      <div class="drConflictIntro">Một hoặc nhiều người xuất hiện đồng thời ở <b>Grnd_Cor</b> và <b>Grnd_Ld</b>. Hệ thống <b>KHÔNG tự đoán</b> có cần F/SAGS 55.1 hay không. AD phải chọn rõ cho <b>từng người / từng chuyến</b>.</div>
      ${conflicts.map(c=>{const ch=choices[c.key]||"",legs=(c.corLegs||[]).map(x=>x==="ARR"?"ĐẾN":x==="DEP"?"ĐI":"CẢ VÒNG").join(" + ");return `<div class="drConflictItem">
        <div class="drConflictMeta"><b>${esc(c.flightName||c.flightRaw)} · ${esc(c.date||c.opDate)}</b><span class="drConflictUser">${esc(c.user)}</span><div class="drSub" style="margin:5px 0 0">Grnd_Cor: ${esc(legs||"CẢ VÒNG")} · đồng thời có Grnd_Ld</div></div>
        <div class="drConflictChoices"><button type="button" class="drConflictChoice both ${ch==="BOTH"?"selected":""}" onclick="dailyRosterChooseLdConflict('${esc(c.key)}','BOTH')">✓ 42.3 + 55.1</button><button type="button" class="drConflictChoice only ${ch==="ONLY423"?"selected":""}" onclick="dailyRosterChooseLdConflict('${esc(c.key)}','ONLY423')">✓ CHỈ 42.3</button></div>
      </div>`}).join("")}
      <div class="drConflictFoot ${unresolved.length?"":"done"}">${unresolved.length?`⚠ CÒN ${unresolved.length} TRƯỜNG HỢP CHƯA CHỌN · CHƯA ĐƯỢC TẠO CHUYẾN`:`✓ ĐÃ XỬ LÝ HẾT CẢNH BÁO · CÓ THỂ TẠO CHUYẾN`}</div>
    </div>`:"";
    const grouped=new Map();
    for(const r of recs){
      const k=r.opDate+"|"+r.flightRaw;
      if(!grouped.has(k))grouped.set(k,{...r,assignments:[]});
      const conflictKey=(r.formGroup==="fsags551"&&upper(r.roleKey)==="LD")?ldConflictKey(r.rowNo,r.opDate,r.flightRaw,r.targetUser):"";
      grouped.get(k).assignments.push({user:r.targetUser,formGroup:r.formGroup,sourceColumn:r.sourceColumn,assignmentLeg:r.assignmentLeg||"",conflictKey});
    }
    const rows=[...grouped.values()].slice(0,100);
    host.innerHTML=`${conflictHtml}<div class="drStatus">Đọc được <b>${grouped.size}</b> dòng chuyến · <b>${recs.length}</b> biểu mẫu sau lựa chọn · <b>${users.length}</b> username.<br>Ngày roster: ${esc(data.rosterDate||"không xác định")} · Sheet: ${esc(data.sheetName||"")}</div>${rows.length?`<div class="drTableWrap"><table class="drTable"><thead><tr><th>Ngày KT</th><th>Flight</th><th>STA</th><th>STD</th><th>Ngày đi</th><th>Grnd_Cor</th><th>Grnd_Ld</th><th>Grnd_Ls</th><th>Pax_Supr</th><th>Biểu mẫu sinh ra</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.date)}</td><td><b>${esc(r.flightRaw)}</b></td><td>${esc(r.sta)}</td><td>${esc(r.std)}</td><td>${esc(r.depFlightDate||r.opDate)}${Number(r.stdDayOffset||0)>0?' <span class="drBadge">NEXT DAY</span>':''}</td><td>${(r.grndCor||[]).map(u=>`<span class="drBadge">${esc(u)}</span>`).join(" ")}</td><td>${(r.grndLd||[]).map(u=>`<span class="drBadge">${esc(u)}</span>`).join(" ")}</td><td>${(r.grndLs||[]).map(u=>`<span class="drBadge">${esc(u)}</span>`).join(" ")}</td><td>${(r.paxSupr||[]).map(u=>`<span class="drBadge">${esc(u)}</span>`).join(" ")}</td><td>${r.assignments.map(a=>{const pending=a.conflictKey&&conflictMap.has(a.conflictKey)&&!choices[a.conflictKey];return `<span class="drBadge">${esc(a.user)} · ${formLabel(a.formGroup)}${a.assignmentLeg?` · ${a.assignmentLeg==="ARR"?"ĐẾN":"ĐI"}`:""}${pending?'<span class="drPending">CHỜ CHỌN</span>':""}</span>`}).join(" ")}</td></tr>`).join("")}</tbody></table></div>`:'<div class="drEmpty">Không có tên hợp lệ ở Grnd_Cor / Grnd_Ld / Grnd_Ls / Pax_Supr.</div>'}`;
  }

  root.dailyRosterLoadFile=async function(file){
    if(!file||!canManageDailyRoster())return false;
    ensureUI();
    root.openDailyRosterManager();
    const inp=document.getElementById("drFile");
    if(inp&&inp.files?.[0]!==file){try{const dt=new DataTransfer();dt.items.add(file);inp.files=dt.files;}catch(e){console.info("DAILY ROSTER file bridge",e?.message||e);}}
    await root.dailyRosterReadPreview();
    if(!preview?.records?.length&&!preview?.rawRecords?.length)return false;
    const left=unresolvedLdConflicts(preview);
    if(left.length){
      setStatus(`⚠ PHÁT HIỆN ${left.length} trường hợp trùng Grnd_Cor + Grnd_Ld. AD phải chọn rõ “42.3 + 55.1” hoặc “CHỈ 42.3” cho từng người trước khi tạo chuyến.`,false,false,true);
      setTimeout(()=>document.getElementById("drConflictPanel")?.scrollIntoView({behavior:"smooth",block:"center"}),120);
      return false;
    }
    setStatus(`✓ DAILY ROSTER hợp lệ (${preview.records.length} phân công). Đang tự tạo Flight Workspace…`);
    const ok=await root.dailyRosterPublish();
    if(ok)setStatus("✓ ĐÃ TỰ TẠO CHUYẾN. Bấm CHUYẾN khi muốn mở danh sách.");
    return !!ok;
  };

  root.openDailyRosterManager=function(){if(!canManageDailyRoster()){try{roleDenied?.("Tài khoản chưa được cấp quyền DAILY ROSTER.");}catch(e){}return;}ensureUI();document.getElementById("dailyRosterModal")?.classList.add("show");};
  root.closeDailyRosterManager=function(){document.getElementById("dailyRosterModal")?.classList.remove("show");};
  root.dailyRosterReadPreview=async function(){
    if(!canManageDailyRoster())return;
    const file=document.getElementById("drFile")?.files?.[0];if(!file)return setStatus("Chưa chọn file roster.",true);
    try{
      setStatus("Đang đọc "+file.name+"…");
      const parsed=await parseRosterFile(file),x=rosterRecords(parsed);
      preview={...x,rawRecords:(x.records||[]).slice(),records:(x.records||[]).slice(),ldConflictChoices:{},sheetName:parsed.sheetName,fileName:file.name};
      syncLdConflictState(preview);renderPreview(preview);updateDailyRosterPublishState();
      const md=document.getElementById("drManageDate");if(md&&preview.rosterDate)md.value=preview.rosterDate;
      const left=unresolvedLdConflicts(preview);
      if(left.length){
        setStatus(`⚠ DAILY ROSTER có ${left.length} trường hợp trùng Grnd_Cor + Grnd_Ld. BẮT BUỘC chọn phương án cho từng người trước khi tạo chuyến.`,false,false,true);
        setTimeout(()=>document.getElementById("drConflictPanel")?.scrollIntoView({behavior:"smooth",block:"center"}),120);
      }else setStatus(`✓ DAILY ROSTER hợp lệ. Đã nhận ${preview.records.length} phân công. Hệ thống sẽ tự tạo chuyến.`);
    }catch(e){preview=null;const createBtn=document.getElementById("drPublishBtn");if(createBtn){createBtn.disabled=true;createBtn.classList.remove("ready");createBtn.style.display="none";}setStatus("Không đọc được roster: "+S(e?.message||e),true);}
  };

  // V3.63: DELTA IMPORT. Roster đã tồn tại được so sánh theo dữ liệu nghiệp vụ;
  // assignment không đổi sẽ không ghi lại mailbox/manifest/Flight Hub.
  const ROSTER_DELTA_FIELDS=[
    "assignmentId","user","originalUser","flightRaw","flightName","arrFlight","depFlight","sta","std","eta","etd",
    "arrFlightDate","depFlightDate","etaFlightDate","etdFlightDate","staClock","stdClock","etaClock","etdClock",
    "staDayOffset","stdDayOffset","etaDayOffset","etdDayOffset","staSortMinute","stdSortMinute","etaSortMinute","etdSortMinute",
    "acReg","acType","route","route1","route3","bay","formGroup","sourceColumn","roleKey","assignmentLeg","assignmentFlight",
    "assignmentTime","assignmentScope","rosterLegSplit","workPartOrder","workPartTotal","workPartSequenceSource","coAssigneeGroupId","coAssigneeMode","coAssigneeRank","coAssigneeTotal","coAssigneeUsers","manualOverride","active","flightId",
    "manualCreatedV340","manualUnit"
  ];
  function rosterDeltaComparable(x){
    x=x&&typeof x==="object"?x:{};const out={};
    for(const k of ROSTER_DELTA_FIELDS){
      let v=x[k];
      if(["staDayOffset","stdDayOffset","etaDayOffset","etdDayOffset","staSortMinute","stdSortMinute","etaSortMinute","etdSortMinute","workPartOrder","workPartTotal","coAssigneeRank","coAssigneeTotal"].includes(k))v=Number(v||0);
      else if(["rosterLegSplit","manualOverride","active","manualCreatedV340"].includes(k))v=(k==="active"?v!==false:v===true);
      else if(k==="coAssigneeUsers")v=(Array.isArray(v)?v:[]).map(normUser).filter(Boolean).join(",");
      else v=S(v);
      out[k]=v;
    }
    return out;
  }
  function sameRosterDelta(a,b){return JSON.stringify(rosterDeltaComparable(a))===JSON.stringify(rosterDeltaComparable(b));}

  // V1.1.36 SAFE ROSTER MERGE: repeated roster imports never revoke a task already being worked.
  function rosterValueHasData(v){
    if(v===true)return true;if(v===false||v===null||v===undefined)return false;
    if(Array.isArray(v))return v.length>0;if(typeof v==='object')return Object.keys(v).length>0;return S(v)!=='';
  }
  function sessionHasOperatorEdits(st){
    st=st&&typeof st==='object'?st:{};
    // V1.1.80: NHẬN CHUYẾN chỉ tự đặt CLAIMED + IN_PROGRESS.
    // Hai trạng thái này KHÔNG được xem là đã thực hiện E-FORM.
    // Chỉ bảo vệ assignment cũ khi đã có dữ liệu thực tế khác rosterSeed,
    // có attachment, hoặc đã mở lại một hồ sơ đã hoàn tất.
    if(Number(st.reopenedAtMs||0)>0)return true;
    if(Number(st.handoverQrClaimedAtMs||0)>0)return true;
    const env=st.envelope&&typeof st.envelope==='object'?st.envelope:{},
          state=env.state&&typeof env.state==='object'?env.state:{},
          seed=env.rosterSeed&&typeof env.rosterSeed==='object'?env.rosterSeed:(st.rosterSeed&&typeof st.rosterSeed==='object'?st.rosterSeed:{});
    for(const [k,v] of Object.entries(state)){
      if(!rosterValueHasData(v))continue;
      if(/attachment/i.test(k))return true;
      const sv=seed[k];
      try{
        if(!(k in seed)||JSON.stringify(v)!==JSON.stringify(sv))return true;
      }catch(_){
        if(S(v)!==S(sv))return true;
      }
    }
    return false;
  }
  function sessionIsCompleted(st){st=st&&typeof st==='object'?st:{};return [st.taskStatusV333,st.taskStatus,st.claimStatus,st.workPartStatus].map(upper).some(x=>['COMPLETED','PART_COMPLETED','HANDED_OVER','DONE','FINISHED'].includes(x));}
  function sessionIsClaimOnly(st){
    st=st&&typeof st==='object'?st:{};
    if(sessionIsCompleted(st)||sessionHasOperatorEdits(st))return false;
    const status=upper(st.taskStatusV333||st.taskStatus||st.claimStatus||st.workPartStatus);
    return ['CLAIMED','IN_PROGRESS','ACTIVE','WORKING'].includes(status);
  }
  function protectRosterAssignment(st){return !sessionIsCompleted(st)&&sessionHasOperatorEdits(st);}
  function rosterSlotSource(x){
    const src=upper(x?.sourceColumn),rk=upper(x?.roleKey),fg=upper(x?.formGroup);
    if(rk==="CBTT"||src.includes("GRND_LS")||fg==="FINAL")return "GRND_LS";
    if(rk==="PAX09"||src.includes("PAX_SUPR")||fg==="FSAGS09")return "PAX_SUPR";
    if((rk==="LD"||fg==="FSAGS551"||src==="GRND_LD")&&!src.includes("GRND_COR"))return "GRND_LD";
    if(["COR","BOTH"].includes(rk)||src.includes("GRND_COR")||["FSAGS","FSAGS421"].includes(fg))return "GRND_COR";
    return src||rk||fg;
  }
  function rosterSlotFlightKey(x){
    const tokens=[...rosterFlightTokens(x?.flightRaw,x?.flightName,x?.arrFlight,x?.depFlight)].sort();
    return tokens.join("/");
  }
  function rosterWorkSlotKey(x){
    return [
      S(x?.opDate),
      rosterSlotFlightKey(x),
      rosterSlotSource(x),
      upper(x?.assignmentLeg)||"TURN",
      Number(x?.workPartOrder||1)
    ].join("|");
  }
  function sameRosterWorkSlot(a,b){
    const ka=rosterWorkSlotKey(a),kb=rosterWorkSlotKey(b);
    if(ka&&kb&&ka===kb)return true;
    if(!sameRosterFlightIdentity(a,b))return false;
    return rosterSlotSource(a)===rosterSlotSource(b)
      && upper(a?.assignmentLeg)===upper(b?.assignmentLeg)
      && Number(a?.workPartOrder||1)===Number(b?.workPartOrder||1);
  }
  function pendingWorkOrder(oldItem,nextItem){const n=Number(oldItem?.workPartOrder||nextItem?.workPartOrder||1);return Number.isFinite(n)?Math.round((n+0.1)*100)/100:1.1;}

  async function publishRecords(data){
    const byDate=new Map();for(const r of data.records||[]){if(!byDate.has(r.opDate))byDate.set(r.opDate,[]);byDate.get(r.opDate).push(r);}
    let writes=0,removes=0,overrides=0,removedFlights=0,unchanged=0,changedDates=0,deferred=0,protectedKept=0,claimOnlyReplaced=0,editedReplaced=0,ownerChanges=0;
    const oldManByDate={},newManByDate={},datesWithRemovals=[];
    for(const [opDate,recs0] of byDate){
      const manRef=sagsV470Ref(MANIFEST_PATH+"/"+safeKey(opDate));let old={};try{old=(await manRef.once("value")).val()||{};}catch(e){}
      oldManByDate[opDate]=old;
      const oldItems=old.items||{},nextItems={},patch={},now=Date.now(),by=normUser(currentUserProfile?.username||"");
      const sessionById={};
      await Promise.all(Object.keys(oldItems).map(async id=>{try{sessionById[id]=(await sagsV470Ref(`${SESSION_PATH}/${safeKey(id)}`).once('value')).val()||{}}catch(_){sessionById[id]={}}}));
      const protectedIds=new Set(Object.keys(oldItems).filter(id=>protectRosterAssignment(sessionById[id]))),replacementUsed=new Set();
      const nextFlightKeys=new Set(recs0.map(r=>rosterFlightKey(r.flightRaw||r.flightName)).filter(Boolean));
      let dateWrites=0,dateRemoves=0,dateDeferred=0,dateOwnerChanges=0;
      for(const baseRec of recs0){
        const oldItem=oldItems[baseRec.assignmentId]||{},hadOld=!!oldItems[baseRec.assignmentId];
        const oldSession=sessionById[baseRec.assignmentId]||{};
        const rosterUser=normUser(baseRec.targetUser),oldAssignedUser=normUser(oldItem.user||oldItem.targetUser);
        const sameIdOwnerChanged=!!(hadOld&&rosterUser&&oldAssignedUser&&rosterUser!==oldAssignedUser);
        const oldProtected=protectRosterAssignment(oldSession);
        // Latest confirmed DAILY ROSTER is authoritative when the old assignee
        // has only CLAIMED the task but has not actually edited E-FORM data.
        const keepManual=oldItem.manualOverride===true&&S(oldItem.user)&&!(sameIdOwnerChanged&&!oldProtected);
        const manual=!!keepManual;
        const effectiveUser=manual?normUser(oldItem.user):baseRec.targetUser;
        if(manual)overrides++;
        if(sameIdOwnerChanged&&!oldProtected){ownerChanges++;dateOwnerChanges++;}
        const r={...baseRec,targetUser:effectiveUser};
        const rk=upper(r.roleKey),src=upper(r.sourceColumn),fg=upper(r.formGroup),unit=(rk==="CBTT"||src.includes("GRND_LS")||fg==="FINAL")?"CBTT":((rk==="PAX09"||src.includes("PAX_SUPR")||fg==="FSAGS09")?"PVHK":"DH");
        const manualBase=Object.values(oldItems).find(x=>x?.manualCreatedV340===true&&upper(x.manualUnit)===unit&&sameRosterFlightIdentity(x,r)),resolvedFlightId=S(oldItem.flightId||manualBase?.flightId)||flightIdForRoster(r);
        const nextItem={assignmentId:r.assignmentId,user:r.targetUser,originalUser:baseRec.originalTargetUser||baseRec.targetUser,flightRaw:r.flightRaw,flightName:r.flightName||"",arrFlight:r.arrFlight||"",depFlight:r.depFlight||"",sta:r.sta||"",std:r.std||"",eta:r.eta||"",etd:r.etd||"",arrFlightDate:r.arrFlightDate||r.opDate,depFlightDate:r.depFlightDate||r.opDate,etaFlightDate:r.etaFlightDate||r.arrFlightDate||r.opDate,etdFlightDate:r.etdFlightDate||r.depFlightDate||r.opDate,staClock:r.staClock||"",stdClock:r.stdClock||"",etaClock:r.etaClock||"",etdClock:r.etdClock||"",staDayOffset:safeFiniteNumber(r.staDayOffset,0),stdDayOffset:safeFiniteNumber(r.stdDayOffset,0),etaDayOffset:safeFiniteNumber(r.etaDayOffset,0),etdDayOffset:safeFiniteNumber(r.etdDayOffset,0),staSortMinute:safeSortMinute(r.staSortMinute,r.opDate,r.arrFlightDate||r.opDate,r.staClock),stdSortMinute:safeSortMinute(r.stdSortMinute,r.opDate,r.depFlightDate||r.opDate,r.stdClock),etaSortMinute:safeSortMinute(r.etaSortMinute,r.opDate,r.etaFlightDate||r.arrFlightDate||r.opDate,r.etaClock),etdSortMinute:safeSortMinute(r.etdSortMinute,r.opDate,r.etdFlightDate||r.depFlightDate||r.opDate,r.etdClock),acReg:r.acReg||"",acType:r.acType||"",route:r.route||"",route1:r.route1||"",route3:r.route3||"",bay:r.bay||"",formGroup:r.formGroup,sourceColumn:r.sourceColumn,roleKey:r.roleKey,assignmentLeg:S(r.assignmentLeg),assignmentFlight:S(r.assignmentFlight),assignmentTime:S(r.assignmentTime),assignmentScope:S(r.assignmentScope||"TURNAROUND"),rosterLegSplit:r.rosterLegSplit===true,workPartOrder:safeFiniteNumber(r.workPartOrder,1),workPartTotal:safeFiniteNumber(r.workPartTotal,1),workPartSequenceSource:S(r.workPartSequenceSource||r.sourceColumn),coAssigneeGroupId:S(r.coAssigneeGroupId),coAssigneeMode:S(r.coAssigneeMode),coAssigneeRank:safeFiniteNumber(r.coAssigneeRank,1),coAssigneeTotal:safeFiniteNumber(r.coAssigneeTotal,1),coAssigneeUsers:Array.isArray(r.coAssigneeUsers)?r.coAssigneeUsers.map(normUser).filter(Boolean):[],manualOverride:manual,active:true,flightId:resolvedFlightId};
        let lockedPair=null,protectedCoPeer=null;
        // V1.1.42: adding a comma co-assignee to a work part already in progress is NOT
        // a successor/replacement. Publish the added person immediately as HỖ TRỢ and
        // preserve the current editor. This keeps SAFE ROSTER MERGE while allowing AD to
        // add backup staff before the primary operator finishes.
        if(!hadOld&&S(nextItem.coAssigneeGroupId)){const peerRec=(recs0||[]).find(q=>S(q?.coAssigneeGroupId)===S(nextItem.coAssigneeGroupId)&&S(q?.assignmentId)!==S(r.assignmentId)&&protectedIds.has(S(q?.assignmentId)));if(peerRec){const paid=S(peerRec.assignmentId);protectedCoPeer={aid:paid,item:oldItems[paid]||peerRec,st:sessionById[paid]||{}};}}
        // V1.1.80: latest confirmed DAILY ROSTER defines the ACTIVE assignment set.
        // Do not keep an obsolete previous assignee active beside the new roster assignee.
        // Existing E-FORM payload stays in roster_sessions/history and is backed up on the
        // revoked user's device, but the stale assignment itself is revoked immediately.
        lockedPair=null;
        nextItems[r.assignmentId]=nextItem;
        if(sameRosterDelta(oldItem,nextItem)){unchanged++;continue;}

        const payload={engine:ENGINE,schema:2,assignmentId:r.assignmentId,targetUser:r.targetUser,originalTargetUser:baseRec.originalTargetUser||baseRec.targetUser,opDate:r.opDate,date:r.date,flightId:resolvedFlightId,flightRaw:r.flightRaw,flightName:r.flightName||"",arrFlight:r.arrFlight,depFlight:r.depFlight,sta:r.sta,std:r.std,eta:r.eta||"",etd:r.etd||"",arrFlightDate:r.arrFlightDate||r.opDate,depFlightDate:r.depFlightDate||r.opDate,etaFlightDate:r.etaFlightDate||r.arrFlightDate||r.opDate,etdFlightDate:r.etdFlightDate||r.depFlightDate||r.opDate,staClock:r.staClock||"",stdClock:r.stdClock||"",etaClock:r.etaClock||"",etdClock:r.etdClock||"",staDayOffset:safeFiniteNumber(r.staDayOffset,0),stdDayOffset:safeFiniteNumber(r.stdDayOffset,0),etaDayOffset:safeFiniteNumber(r.etaDayOffset,0),etdDayOffset:safeFiniteNumber(r.etdDayOffset,0),staSortMinute:safeSortMinute(r.staSortMinute,r.opDate,r.arrFlightDate||r.opDate,r.staClock),stdSortMinute:safeSortMinute(r.stdSortMinute,r.opDate,r.depFlightDate||r.opDate,r.stdClock),etaSortMinute:safeSortMinute(r.etaSortMinute,r.opDate,r.etaFlightDate||r.arrFlightDate||r.opDate,r.etaClock),etdSortMinute:safeSortMinute(r.etdSortMinute,r.opDate,r.etdFlightDate||r.depFlightDate||r.opDate,r.etdClock),acReg:r.acReg,acType:r.acType,route:r.route,route1:r.route1,route3:r.route3,bay:r.bay,formGroup:r.formGroup,sourceColumn:r.sourceColumn,roleKey:r.roleKey,assignmentLeg:S(r.assignmentLeg),assignmentFlight:S(r.assignmentFlight),assignmentTime:S(r.assignmentTime),assignmentScope:S(r.assignmentScope||"TURNAROUND"),rosterLegSplit:r.rosterLegSplit===true,workPartOrder:safeFiniteNumber(r.workPartOrder,1),workPartTotal:safeFiniteNumber(r.workPartTotal,1),workPartSequenceSource:S(r.workPartSequenceSource||r.sourceColumn),coAssigneeGroupId:S(r.coAssigneeGroupId),coAssigneeMode:S(r.coAssigneeMode),coAssigneeRank:safeFiniteNumber(r.coAssigneeRank,1),coAssigneeTotal:safeFiniteNumber(r.coAssigneeTotal,1),coAssigneeUsers:Array.isArray(r.coAssigneeUsers)?r.coAssigneeUsers.map(normUser).filter(Boolean):[],sourceFile:data.fileName||"",active:true,manualOverride:manual,publishedAtMs:now,publishedBy:by};
        patch[`${MANIFEST_PATH}/${safeKey(opDate)}/items/${safeKey(r.assignmentId)}`]=nextItem;
        patch[`${MAIL_PATH}/${safeKey(r.targetUser)}/items/${safeKey(r.assignmentId)}`]=payload;
        const oldUser=normUser(oldItem.user||oldItem.targetUser),newUser=normUser(r.targetUser);
        if(!hadOld||oldUser!==newUser||oldItem.active===false)patch[`${REVOKE_PATH}/${safeKey(r.targetUser)}/items/${safeKey(r.assignmentId)}`]=null;
        if(protectedCoPeer){const gid=S(nextItem.coAssigneeGroupId),peerAid=S(protectedCoPeer.aid),peerItem=protectedCoPeer.item||{},peerSt=protectedCoPeer.st||{},peerUser=normUser(peerSt.claimedBy||peerSt.coClaimedBy||peerSt.ownerUser||peerItem.user||peerItem.targetUser);if(gid&&peerAid&&peerUser){patch[`${SESSION_PATH}/${safeKey(r.assignmentId)}/claimStatus`]='STANDBY';patch[`${SESSION_PATH}/${safeKey(r.assignmentId)}/taskStatusV333`]='UNCLAIMED';patch[`${SESSION_PATH}/${safeKey(r.assignmentId)}/taskAvailabilityV333`]='STANDBY';patch[`${SESSION_PATH}/${safeKey(r.assignmentId)}/coClaimedBy`]=peerUser;patch[`${SESSION_PATH}/${safeKey(r.assignmentId)}/coClaimedAssignmentId`]=peerAid;patch[`${SESSION_PATH}/${safeKey(r.assignmentId)}/coClaimedAtMs`]=Number(peerSt.claimedAtMs||now);patch[`${SESSION_PATH}/${safeKey(r.assignmentId)}/updatedAtMs`]=now;patch[`${SESSION_PATH}/${safeKey(peerAid)}/coClaimedBy`]=peerUser;patch[`${SESSION_PATH}/${safeKey(peerAid)}/coClaimedAssignmentId`]=peerAid;patch[`${SESSION_PATH}/${safeKey(peerAid)}/updatedAtMs`]=now;patch[`roster_co_claims/${safeKey(opDate)}/${safeKey(gid)}`]={schema:1,groupId:gid,status:'CLAIMED',claimedBy:peerUser,claimedAssignmentId:peerAid,claimedAtMs:Number(peerSt.claimedAtMs||now),updatedAtMs:now,opDate,flightId:S(nextItem.flightId),formGroup:S(nextItem.formGroup),sourceColumn:S(nextItem.sourceColumn),claimSource:'SAFE_MERGE_ADD_CO_ASSIGNEE'};}}
        if(oldUser&&oldUser!==newUser){
          patch[`${MAIL_PATH}/${safeKey(oldUser)}/items/${safeKey(r.assignmentId)}`]=null;
          patch[`${REVOKE_PATH}/${safeKey(oldUser)}/items/${safeKey(r.assignmentId)}`]={assignmentId:r.assignmentId,reason:"REASSIGNED_BY_LATEST_ROSTER",atMs:now,by};
          if(hadOld&&!protectRosterAssignment(sessionById[r.assignmentId]||{})){
            patch[`${SESSION_PATH}/${safeKey(r.assignmentId)}/ownerUser`]=newUser;
            patch[`${SESSION_PATH}/${safeKey(r.assignmentId)}/claimStatus`]='READY';
            patch[`${SESSION_PATH}/${safeKey(r.assignmentId)}/taskStatusV333`]='UNCLAIMED';
            patch[`${SESSION_PATH}/${safeKey(r.assignmentId)}/taskAvailabilityV333`]='READY';
            patch[`${SESSION_PATH}/${safeKey(r.assignmentId)}/claimedBy`]=null;
            patch[`${SESSION_PATH}/${safeKey(r.assignmentId)}/claimedAtMs`]=null;
            patch[`${SESSION_PATH}/${safeKey(r.assignmentId)}/coClaimedBy`]=null;
            patch[`${SESSION_PATH}/${safeKey(r.assignmentId)}/coClaimedAssignmentId`]=null;
            patch[`${SESSION_PATH}/${safeKey(r.assignmentId)}/pendingRosterSuccessor`]=null;
            patch[`${SESSION_PATH}/${safeKey(r.assignmentId)}/updatedAtMs`]=now;
            const gid=S(oldItem.coAssigneeGroupId);
            const claimedAid=S((sessionById[r.assignmentId]||{}).coClaimedAssignmentId||r.assignmentId);
            const claimedBy=normUser((sessionById[r.assignmentId]||{}).claimedBy||(sessionById[r.assignmentId]||{}).ownerUser);
            if(gid&&claimedAid===S(r.assignmentId)&&claimedBy===oldUser)patch[`roster_co_claims/${safeKey(opDate)}/${safeKey(gid)}`]=null;
          }
        }
        writes++;dateWrites++;
      }
      const removedFlightIds=new Set();
      for(const [id,x] of Object.entries(oldItems)){
        if(!nextItems[id]&&x?.manualCreatedV340===true){
          const manualUnit=upper(x.manualUnit);
          const replaced=recs0.some(r=>{
            const rk=upper(r.roleKey),src=upper(r.sourceColumn),fg=upper(r.formGroup);
            const unit=(rk==="CBTT"||src.includes("GRND_LS")||fg==="FINAL")?"CBTT":((rk==="PAX09"||src.includes("PAX_SUPR")||fg==="FSAGS09")?"PVHK":"DH");
            return manualUnit===unit&&sameRosterFlightIdentity(x,r);
          });
          if(!replaced){nextItems[id]=x;continue;}
        }
        // V1.1.86: DAILY ROSTER re-import uses MERGE UPDATE mode.
        // - Nếu cùng work slot có bản phân công mới thì THAY/REASSIGN bản cũ để tránh trùng.
        // - Nếu không có bản thay thế trong file mới thì GIỮ NGUYÊN phân công cũ, không xoá hàng loạt.
        if(!nextItems[id]){
          const oldSt=sessionById[id]||{};
          const replacementRec=(recs0||[]).find(q=>sameRosterWorkSlot(x,q));
          const hasReplacement=!!replacementRec;
          if(!hasReplacement){
            nextItems[id]={...x,active:x?.active!==false};
            continue;
          }
          const claimOnlyReplacement=!!(hasReplacement&&sessionIsClaimOnly(oldSt));
          const editedReplacement=!!(hasReplacement&&sessionHasOperatorEdits(oldSt));
          if(claimOnlyReplacement)claimOnlyReplaced++;
          if(editedReplacement)editedReplaced++;
          patch[`${MANIFEST_PATH}/${safeKey(opDate)}/items/${safeKey(id)}`]=null;
          const oldUser=normUser(x?.user||x?.targetUser),toUser=hasReplacement?normUser(replacementRec?.targetUser||replacementRec?.user):"";
          if(oldUser){
            patch[`${MAIL_PATH}/${safeKey(oldUser)}/items/${safeKey(id)}`]=null;
            patch[`${REVOKE_PATH}/${safeKey(oldUser)}/items/${safeKey(id)}`]={
              assignmentId:id,
              reason:editedReplacement?"ROSTER_REASSIGNED_PRESERVE_DATA":"ROSTER_REASSIGNED_BY_LATEST",
              atMs:now,by,toUser:toUser||null,preserveEnvelope:editedReplacement===true
            };
          }
          // Chỉ thu hồi những assignment thực sự bị assignment mới thay thế.
          patch[`${SESSION_PATH}/${safeKey(id)}/rosterActive`]=false;
          patch[`${SESSION_PATH}/${safeKey(id)}/active`]=false;
          patch[`${SESSION_PATH}/${safeKey(id)}/rosterStatus`]='ROSTER_REASSIGNED';
          patch[`${SESSION_PATH}/${safeKey(id)}/claimStatus`]='ROSTER_REMOVED';
          patch[`${SESSION_PATH}/${safeKey(id)}/taskAvailabilityV333`]='ROSTER_REMOVED';
          patch[`${SESSION_PATH}/${safeKey(id)}/claimedBy`]=null;
          patch[`${SESSION_PATH}/${safeKey(id)}/claimedAtMs`]=null;
          patch[`${SESSION_PATH}/${safeKey(id)}/coClaimedBy`]=null;
          patch[`${SESSION_PATH}/${safeKey(id)}/coClaimedAssignmentId`]=null;
          patch[`${SESSION_PATH}/${safeKey(id)}/pendingRosterSuccessor`]=null;
          patch[`${SESSION_PATH}/${safeKey(id)}/rosterRemovedAtMs`]=now;
          patch[`${SESSION_PATH}/${safeKey(id)}/rosterRemovedBy`]=by;
          patch[`${SESSION_PATH}/${safeKey(id)}/updatedAtMs`]=now;
          const gid=S(x?.coAssigneeGroupId),claimedAid=S(oldSt.coClaimedAssignmentId||id),claimedBy=normUser(oldSt.claimedBy||oldSt.ownerUser);
          if(gid&&claimedAid===S(id)&&(!oldUser||claimedBy===oldUser))patch[`roster_co_claims/${safeKey(opDate)}/${safeKey(gid)}`]=null;
          removes++;dateRemoves++;
        }
        const oldFlightKey=rosterFlightKey(x?.flightRaw||x?.flightName);
        if(!nextItems[id]&&oldFlightKey&&!nextFlightKeys.has(oldFlightKey)){
          let fid=S(x?.flightId);
          if(!fid&&typeof root.sagsFlightHubFlightId==="function")try{fid=S(root.sagsFlightHubFlightId(opDate,"","",x?.flightRaw||x?.flightName));}catch(_){ }
          if(fid){
            removedFlightIds.add(fid);
            patch[`${FLIGHT_PATH}/${safeKey(opDate)}/${safeKey(fid)}/assignments/${safeKey(id)}/active`]=false;
            patch[`${FLIGHT_PATH}/${safeKey(opDate)}/${safeKey(fid)}/assignments/${safeKey(id)}/rosterStatus`]="ROSTER_REMOVED";
            patch[`${FLIGHT_PATH}/${safeKey(opDate)}/${safeKey(fid)}/assignments/${safeKey(id)}/rosterRemovedAtMs`]=now;
          }
        }
      }
      for(const fid of removedFlightIds){
        patch[`${FLIGHT_PATH}/${safeKey(opDate)}/${safeKey(fid)}/rosterActive`]=false;
        patch[`${FLIGHT_PATH}/${safeKey(opDate)}/${safeKey(fid)}/rosterStatus`]="ROSTER_REMOVED";
        patch[`${FLIGHT_PATH}/${safeKey(opDate)}/${safeKey(fid)}/rosterRemovedAtMs`]=now;
        patch[`${FLIGHT_PATH}/${safeKey(opDate)}/${safeKey(fid)}/rosterRemovedBy`]=by;
        patch[`${FLIGHT_PATH}/${safeKey(opDate)}/${safeKey(fid)}/rosterRemovedSourceFile`]=data.fileName||"";
        patch[`${FLIGHT_PATH}/${safeKey(opDate)}/${safeKey(fid)}/updatedAtMs`]=now;
      }
      removedFlights+=removedFlightIds.size;
      const dateChanged=dateWrites>0||dateRemoves>0||removedFlightIds.size>0||dateDeferred>0;
      if(dateChanged){
        changedDates++;
        patch[`${MANIFEST_PATH}/${safeKey(opDate)}/engine`]=ENGINE;
        patch[`${MANIFEST_PATH}/${safeKey(opDate)}/schema`]=2;
        patch[`${MANIFEST_PATH}/${safeKey(opDate)}/opDate`]=opDate;
        patch[`${MANIFEST_PATH}/${safeKey(opDate)}/fileName`]=data.fileName||"";
        patch[`${MANIFEST_PATH}/${safeKey(opDate)}/columns`]=FIXED_ROLE_COLUMNS;
        patch[`${MANIFEST_PATH}/${safeKey(opDate)}/publishedAtMs`]=now;
        patch[`${MANIFEST_PATH}/${safeKey(opDate)}/publishedBy`]=by;
        patch[`${MANIFEST_PATH}/${safeKey(opDate)}/cumulative`]=true;
        patch[`${MANIFEST_PATH}/${safeKey(opDate)}/cumulativeMode`]="MERGE_UPDATE";
        patch[`${MANIFEST_PATH}/${safeKey(opDate)}/syncMode`]="MERGE_UPDATE_SAME_DAY";
        patch[`${MANIFEST_PATH}/${safeKey(opDate)}/previousBatchFileName`]=S(old.fileName||old.lastBatchFileName||"");
        patch[`${MANIFEST_PATH}/${safeKey(opDate)}/lastBatchFileName`]=data.fileName||"";
        patch[`${MANIFEST_PATH}/${safeKey(opDate)}/lastBatchAtMs`]=now;
        // V1.1.102: FINAL guard immediately before Firebase update.
        // RTDB rejects a multi-location update containing both an ancestor path
        // and a descendant path. Keep ancestor semantics; merge descendants into
        // object ancestors, or discard descendants when ancestor is null/scalar.
        const __v11102CollapsePatch=(src)=>{
          const out={...(src||{})};
          const setDeep=(obj,parts,val)=>{let cur=obj;for(let i=0;i<parts.length-1;i++){const k=parts[i];if(!cur[k]||typeof cur[k]!=="object"||Array.isArray(cur[k]))cur[k]={};cur=cur[k];}cur[parts[parts.length-1]]=val;};
          const keys=Object.keys(out).sort((a,b)=>a.split("/").length-b.split("/").length||a.localeCompare(b));
          for(const parent of keys){if(!Object.prototype.hasOwnProperty.call(out,parent))continue;const prefix=parent+"/";for(const child of Object.keys(out)){if(child===parent||!child.startsWith(prefix))continue;const pv=out[parent];if(pv&&typeof pv==="object"&&!Array.isArray(pv)){const rel=child.slice(prefix.length).split("/").filter(Boolean);if(rel.length)setDeep(pv,rel,out[child]);}delete out[child];}}
          return out;
        };
        await sagsV470Ref("").update(__v11102CollapsePatch(patch));
      }
      if(dateRemoves||dateOwnerChanges)datesWithRemovals.push(opDate);
      newManByDate[opDate]={...old,engine:ENGINE,schema:2,opDate,fileName:dateChanged?(data.fileName||""):old.fileName,columns:FIXED_ROLE_COLUMNS,publishedAtMs:dateChanged?now:old.publishedAtMs,publishedBy:dateChanged?by:old.publishedBy,cumulative:true,cumulativeMode:"MERGE_UPDATE",syncMode:dateChanged?"MERGE_UPDATE_SAME_DAY":old.syncMode,items:nextItems};
    }
    const result={writes,removes,overrides,removedFlights,unchanged,deferred,protectedKept,claimOnlyReplaced,editedReplaced,ownerChanges,changedDates,dates:byDate.size,noChange:writes===0&&removes===0&&removedFlights===0&&deferred===0&&protectedKept===0&&ownerChanges===0,datesWithRemovals,oldManByDate,newManByDate};
    root.__SAGS_ROSTER_LAST_DELTA=result;
    return result;
  }
  root.dailyRosterPublish=async function(){
    if(!canManageDailyRoster()||!preview)return false;
    syncLdConflictState(preview);
    const pending=unresolvedLdConflicts(preview);
    if(pending.length){
      updateDailyRosterPublishState();renderPreview(preview);
      setStatus(`⚠ CHƯA THỂ TẠO CHUYẾN: còn ${pending.length} trường hợp Grnd_Cor + Grnd_Ld chưa được chọn.`,false,false,true);
      setTimeout(()=>document.getElementById("drConflictPanel")?.scrollIntoView({behavior:"smooth",block:"center"}),80);
      return false;
    }
    if(!preview.records?.length)return false;
    const btn=document.getElementById("drPublishBtn");if(btn)btn.disabled=true;let ok=false;
    try{
      setStatus("Đang đồng bộ chuyến và phân công công việc…");
      const r=await publishRecords(preview);ok=true;
      if(r.noChange){
        setStatus(`✓ DAILY ROSTER KHÔNG CÓ THAY ĐỔI · bỏ qua ${r.unchanged} phân công đã giống dữ liệu hiện có.\nKhông phát sinh ghi lại manifest/mailbox/Flight Hub. Dữ liệu nghiệp vụ giữ nguyên.`,false,true);
      }else{
        setStatus(`✓ ĐÃ ĐỒNG BỘ DAILY ROSTER THEO MERGE AN TOÀN. Cập nhật/thêm ${r.writes} phân công; bỏ qua ${r.unchanged} phân công không đổi; giữ khóa ${r.protectedKept} phân công đang làm; chờ áp dụng ${r.deferred} thay đổi người sau khi người hiện tại HOÀN TẤT; thu hồi ${r.removes} phân công chưa bắt đầu không còn trong roster. ${r.removedFlights?`Đánh dấu ${r.removedFlights} chuyến cũ không còn roster. `:""}Giữ ${r.overrides} chuyển người thủ công; thay ngay ${r.claimOnlyReplaced||0} phân công chỉ mới NHẬN CHUYẾN và ${r.ownerChanges||0} thay đổi người cùng assignment theo roster mới.
Không ghi đè working envelope của nhân viên đang thao tác.`);
        void root.dailyRosterLoadAssignments();
      }
    }catch(e){setStatus("Không đồng bộ DAILY ROSTER được: "+S(e?.message||e),true);}
    finally{updateDailyRosterPublishState();}
    return ok;
  };

  function opDateMs(iso){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(S(iso));if(!m)return Date.now();return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12,0,0,0).getTime();}
  function sameFlightDate(env,rec){
    const st=env?.state||{},date=S(st.date||st.f421_date||st.f551_date||st.f09_date),flt=[S(st.fltBefore||st.f421_fltBefore||st.f551_fltBefore||st.f09_fltBefore),S(st.fltAfter||st.f421_fltAfter||st.f551_fltAfter||st.f09_fltAfter)].filter(Boolean).map(upper);
    const recFlights=[rec.arrFlight,rec.depFlight].filter(Boolean).map(upper),group=S(env?.mainForm||env?.activeFormGroup||"");
    return group===S(rec.formGroup) && date===rec.date && recFlights.some(f=>flt.includes(f));
  }
  function mergeRosterSeed(env,seed){
    env=env&&typeof env==="object"?env:{};env.state=env.state&&typeof env.state==="object"?env.state:{};const prev=env.rosterSeed||{};
    for(const [k,v] of Object.entries(seed||{})){const cur=S(env.state[k]),old=S(prev[k]);if(!cur||cur===old)env.state[k]=v;}
    env.rosterSeed={...seed};return env;
  }
  function makeRosterLocalId(rec){return "roster-"+hashId(rec.assignmentId);}
  function startPageForGroup(g){return g==="fsags421"?6:(g==="fsags551"?9:(g==="fsags09"?11:1));}
  function sanitizeRosterEnvelope(env){
    const x=env&&typeof env==="object"?env:{},src=x.state&&typeof x.state==="object"?x.state:{},state={};
    for(const [k,v] of Object.entries(src)){
      if(/attachment/i.test(k))continue;
      try{const s=JSON.stringify(v);if(s.length<=180000)state[k]=JSON.parse(s);}catch(e){}
    }
    return {state,mainForm:S(x.mainForm||x.activeFormGroup||"fsags"),activeFormGroup:S(x.mainForm||x.activeFormGroup||"fsags"),currentPage:Number(x.currentPage)||1,scrollY:0,arrivalOp:S(x.arrivalOp||"passenger"),departureOp:S(x.departureOp||"passenger"),rosterSeed:x.rosterSeed||{}};
  }
  // V1.1.31: distinguish a real form payload from an empty/status-only session.
  // Status timestamps (CLAIMED/READY/etc.) must never make an empty cloud envelope
  // overwrite a local form that already contains operational data.
  function rosterEnvelopeHasData(env){
    const st=env?.state&&typeof env.state==='object'?env.state:{};
    return Object.values(st).some(v=>{
      if(v===true)return true;if(v===false||v===null||v===undefined)return false;
      if(Array.isArray(v))return v.length>0;if(typeof v==='object')return Object.keys(v).length>0;
      return S(v)!=='';
    });
  }
  async function readSharedAssignment(id){
    try{
      const ref=sagsV470Ref(`${SESSION_PATH}/${safeKey(id)}`),snap=await ref.once("value"),direct=snap.val()||null;
      let legacy=null;try{legacy=await root.rosterWorkspaceLegacyRead?.(id)||null}catch(_){}
      if(!legacy)return direct;
      const merged={...(legacy||{}),...(direct||{})};
      for(const k of ['envelope','completionEnvelope','handoverEnvelope','rosterSeed'])if(!(direct&&direct[k])&&legacy?.[k])merged[k]=clone(legacy[k]);
      // Migrate only the working envelope. Never copy legacy claim/completed status to a
      // new assignment because A and B used to share those fields in V1.93.
      if(!(direct?.envelope)&&legacy?.envelope){
        try{await ref.update({engine:ENGINE,schema:1,assignmentId:id,envelope:clone(legacy.envelope),legacyWorkspaceRecoveredAtMs:Date.now(),legacyWorkspaceRecovered:true,envelopeUpdatedAtMs:Date.now()})}catch(_){}
      }
      return merged;
    }catch(e){return null;}
  }
  async function writeSharedAssignment(id,env,owner,formGroup,force=false){
    if(!id||!env)return false;
    const clean=sanitizeRosterEnvelope(env),sig=JSON.stringify(clean);
    if(!force&&rosterSyncSig.get(id)===sig)return false;
    try{
      const envelopeUpdatedAtMs=Date.now();
      await sagsV470Ref(`${SESSION_PATH}/${safeKey(id)}`).update({engine:ENGINE,schema:1,assignmentId:id,ownerUser:normUser(owner),formGroup:S(formGroup||clean.mainForm),envelope:clean,envelopeUpdatedAtMs,updatedAtMs:envelopeUpdatedAtMs,updatedBy:normUser(currentUserProfile?.username||owner)});
      rosterSyncSig.set(id,sig);return true;
    }catch(e){console.info("Roster shared sync",e?.message||e);return false;}
  }
  function scheduleSharedSync(meta,env,delay=260){
    const id=S(meta?.rosterAssignmentId);if(!id)return;
    if(rosterSyncTimers.has(id))clearTimeout(rosterSyncTimers.get(id));
    rosterSyncTimers.set(id,setTimeout(()=>{rosterSyncTimers.delete(id);void writeSharedAssignment(id,env,currentUserProfile?.username||"",meta.initialGroup||env?.mainForm||"",false);},delay));
  }
  async function autoReceiveOne(rec){
    if(!rec||rec.engine!==ENGINE||rec.active===false)return {ok:false,reason:"INACTIVE"};
    const me=normUser(currentUserProfile?.username||"");if(!me||me!==normUser(rec.targetUser))return {ok:false,reason:"USER"};
    if(upper(rec.formGroup)==="FINAL"){
      if(typeof root.sagsV340EnsureFinalForRoster==="function"){
        const out=await root.sagsV340EnsureFinalForRoster(rec,{open:false});
        return {ok:true,created:!!out?.created,moduleOnly:true,pendingTemplate:!!out?.pendingTemplate};
      }
      setTimeout(()=>{try{void root.sagsV340EnsureFinalForRoster?.(rec,{open:false})}catch(_){}},300);
      return {ok:true,created:false,moduleOnly:true};
    }
    if(upper(rec.formGroup)==="UNIT_TASK")return {ok:true,created:false,moduleOnly:true};
    const list=readFlightSessionList();let meta=list.find(x=>S(x.rosterAssignmentId)===S(rec.assignmentId));let id=meta?.id||"";
    // V1.1.44: one username can legitimately own more than one assignment on the same
    // flight (e.g. HUYNDL ARR and HUYNDL DEP in "HUYNDL / HUYNDL, PHUNQ").
    // Never recycle a local session that is already bound to a DIFFERENT assignmentId.
    // Older code matched only flight/date/form and could let the later DEP mailbox item
    // overwrite the ARR session binding, so MY FLIGHT selected ARR but localMeta(ARR) was
    // missing and the operator saw "Chưa khởi tạo được biểu mẫu chuyến".
    // We still allow adoption of an unbound legacy local session for migration safety.
    if(!id){for(const x of list){const env=readFlightSessionEnvelope(x.id),bound=S(x?.rosterAssignmentId||env?.rosterAssignmentId);if(bound&&bound!==S(rec.assignmentId))continue;if(sameFlightDate(env,rec)){meta=x;id=x.id;break;}}}
    const seed=seedFor(rec),now=Date.now(),shared=await readSharedAssignment(rec.assignmentId);
    if(!id){
      id=makeRosterLocalId(rec);if(list.some(x=>x.id===id))id=id+"-"+Math.random().toString(36).slice(2,6);
      meta={id,name:rec.assignmentFlight||rec.flightName||[rec.arrFlight,rec.depFlight].filter(Boolean).join(" / ")||rec.flightRaw,customName:true,initialGroup:rec.formGroup||"fsags",arrivalOp:"passenger",departureOp:"passenger",createdAt:opDateMs(rec.opDate),updatedAt:now,rosterAssignmentId:rec.assignmentId,rosterFlightId:S(rec.flightId),rosterAutoReceived:true,rosterSourceColumn:rec.sourceColumn,rosterOpDate:rec.opDate,rosterOwner:me};
      list.push(meta);writeFlightSessionList(list);
      let env=shared?.envelope&&typeof shared.envelope==="object"?JSON.parse(JSON.stringify(shared.envelope)):{state:{},mainForm:meta.initialGroup,activeFormGroup:meta.initialGroup,currentPage:startPageForGroup(meta.initialGroup),scrollY:0,arrivalOp:"passenger",departureOp:"passenger"};
      env.mainForm=meta.initialGroup;env.activeFormGroup=meta.initialGroup;env.currentPage=startPageForGroup(meta.initialGroup);
      env=mergeRosterSeed(env,seed);env.rosterAssignmentId=rec.assignmentId;env.rosterAutoReceived=true;env.rosterReceivedAtMs=now;
      localStorage.setItem(flightSessionStorageKey(id),JSON.stringify(env));
      if(!shared)void writeSharedAssignment(rec.assignmentId,env,me,meta.initialGroup,true);
      return {ok:true,created:true,id};
    }
    meta.rosterAssignmentId=rec.assignmentId;meta.rosterFlightId=S(rec.flightId||meta.rosterFlightId);if(S(rec.assignmentFlight))meta.name=S(rec.assignmentFlight);meta.rosterAutoReceived=true;meta.rosterSourceColumn=rec.sourceColumn;meta.rosterOpDate=rec.opDate;meta.rosterOwner=me;meta.initialGroup=rec.formGroup||meta.initialGroup;meta.updatedAt=now;writeFlightSessionList(list);
    const isActiveNow=(typeof activeFlightSessionId!=="undefined"&&S(activeFlightSessionId)===S(id));
    // Flush the currently edited form first. Remote roster/session data must never win over
    // the active local form merely because a mailbox value event arrived.
    if(isActiveNow){try{persist?.();}catch(_e){}}
    let env=readFlightSessionEnvelope(id);
    // V1.1.31: only a CONTENT timestamp may replace a local envelope in the background.
    // Generic updatedAtMs is also touched by CLAIM/READY/COMPLETED and previously made
    // an old/blank cloud envelope appear newer than real local form data.
    const sharedEnvelopeAt=Number(shared?.envelopeUpdatedAtMs||0),localSharedAt=Number(env?.rosterSharedAtMs||0);
    const remoteHasData=rosterEnvelopeHasData(shared?.envelope),localHasData=rosterEnvelopeHasData(env);
    if(!isActiveNow&&shared?.envelope&&remoteHasData&&((sharedEnvelopeAt>0&&sharedEnvelopeAt>localSharedAt)||!localHasData)){
      const incoming=JSON.parse(JSON.stringify(shared.envelope));incoming.rosterSharedAtMs=sharedEnvelopeAt||Date.now();env=incoming;
    }
    env.mainForm=rec.formGroup||env.mainForm;env.activeFormGroup=env.mainForm;env.currentPage=startPageForGroup(env.mainForm);
    env=mergeRosterSeed(env,seed);env.rosterAssignmentId=rec.assignmentId;env.rosterAutoReceived=true;env.rosterReceivedAtMs=env.rosterReceivedAtMs||now;
    localStorage.setItem(flightSessionStorageKey(id),JSON.stringify(env));
    return {ok:true,created:false,id};
  }
  function showToast(msg){
    const sig=S(msg);if(!sig||sig===lastToastSig)return;lastToastSig=sig;
    if(typeof root.sagsActionPopup==="function"){root.sagsActionPopup({type:"auto",title:"DAILY ROSTER",message:sig});return;}
    document.querySelectorAll(".drToast").forEach(x=>x.remove());const e=document.createElement("div");e.className="drToast";e.textContent=msg;document.body.appendChild(e);setTimeout(()=>e.remove(),4500);
  }
  async function processMailbox(raw){
    const items=Object.values(raw||{}).filter(x=>x&&x.engine===ENGINE&&x.active!==false),created=[];
    for(const rec of items){try{const r=await autoReceiveOne(rec);if(r.ok&&r.created)created.push(`${rec.flightRaw||rec.arrFlight||rec.depFlight} · ${formLabel(rec.formGroup)}`);}catch(e){console.info("Daily roster auto receive",e?.message||e);}}
    if(created.length){showToast(`DAILY ROSTER: đã đồng bộ ${created.length} biểu mẫu chờ nhận · ${created.slice(0,3).join(", ")}${created.length>3?"…":""}`);try{window.rampProgressSyncAll?.("ROSTER_AUTO_RECEIVE");}catch(e){}try{renderFlightSessionList?.();}catch(e){}}
  }
  function queueMailboxSnapshot(snap){
    try{
      const id=S(snap?.key),v=snap?.val?.();if(!id)return;
      if(v&&typeof v==="object")mailPending[id]=v;else delete mailPending[id];
      clearTimeout(mailFlushTimer);mailFlushTimer=setTimeout(()=>{const batch=mailPending;mailPending={};if(Object.keys(batch).length)void processMailbox(batch);},70);
    }catch(e){console.info("Daily roster mailbox queue",e?.message||e);}
  }
  function stopMailbox(){
    clearTimeout(mailFlushTimer);mailFlushTimer=0;mailPending={};
    try{if(mailRef&&mailAddedCb)mailRef.off("child_added",mailAddedCb);}catch(e){}
    try{if(mailRef&&mailChangedCb)mailRef.off("child_changed",mailChangedCb);}catch(e){}
    try{if(mailRef&&mailRemovedCb)mailRef.off("child_removed",mailRemovedCb);}catch(e){}
    mailRef=null;mailAddedCb=null;mailChangedCb=null;mailRemovedCb=null;
  }
  function startMailbox(){
    stopMailbox();const me=normUser(currentUserProfile?.username||"");if(!me)return;
    try{
      const td=localRosterDate(),from=addIsoDays(td,-1),to=addIsoDays(td,1);
      // Keep only yesterday/today/tomorrow in the live mailbox window. Historical
      // assignments remain in RTDB/local archives but are not downloaded on every login.
      mailRef=sagsV470Ref(`${MAIL_PATH}/${safeKey(me)}/items`).orderByChild("opDate").startAt(from).endAt(to);
      mailAddedCb=s=>queueMailboxSnapshot(s);
      mailChangedCb=s=>queueMailboxSnapshot(s);
      mailRemovedCb=s=>{const id=S(s?.key);if(id)delete mailPending[id];};
      mailRef.on("child_added",mailAddedCb,e=>console.warn("Daily roster mailbox add",e));
      mailRef.on("child_changed",mailChangedCb,e=>console.warn("Daily roster mailbox change",e));
      mailRef.on("child_removed",mailRemovedCb,e=>console.warn("Daily roster mailbox remove",e));
    }catch(e){console.warn("Daily roster mailbox start",e);}
  }
  root.dailyRosterRestartMailbox=startMailbox;
  root.dailyRosterCanManage=canManageDailyRoster;


  function manifestDate(){return S(document.getElementById("drManageDate")?.value||preview?.rosterDate||"");}
  async function loadManifest(date){if(!date)return null;try{return (await sagsV470Ref(`${MANIFEST_PATH}/${safeKey(date)}`).once("value")).val()||null;}catch(e){throw e;}}
  function renderManage(man){
    const host=document.getElementById("drManage");if(!host)return;
    const items=Object.values(man?.items||{}).filter(x=>x&&x.active!==false&&upper(x.rosterStatus)!=="ROSTER_REMOVED"&&upper(x.rosterStatus)!=="ROSTER_REASSIGNED").sort((a,b)=>S(a.flightRaw).localeCompare(S(b.flightRaw))||S(a.formGroup).localeCompare(S(b.formGroup))||Number(a.workPartOrder||1)-Number(b.workPartOrder||1));
    host.innerHTML=items.length?`<div class="drTableWrap"><table class="drTable"><thead><tr><th>Flight</th><th>Form</th><th>Vai trò</th><th>Người hiện tại</th><th>Thao tác</th></tr></thead><tbody>${items.map(x=>`<tr><td><b>${esc(x.flightRaw||"")}</b></td><td>${esc(formLabel(x.formGroup))}</td><td>${esc(x.sourceColumn||"")}</td><td>${esc(x.user||"")}${x.manualOverride?` <span class="drBadge">chuyển tay</span>`:""}</td><td><button class="drBtn" style="padding:6px 9px" onclick="dailyRosterReassign('${esc(x.assignmentId||"")}')">CHUYỂN</button>${x.manualOverride&&x.originalUser?` <button class="drBtn secondary" style="padding:6px 9px" onclick="dailyRosterResetToRoster('${esc(x.assignmentId||"")}')">THEO ROSTER</button>`:""}</td></tr>`).join("")}</tbody></table></div>`:'<div class="drEmpty">Ngày này chưa có phân công DAILY ROSTER.</div>';
  }
  root.dailyRosterLoadAssignments=async function(){
    if(!canManageDailyRoster())return;const d=manifestDate();if(!d)return setStatus("Chọn ngày để tải phân công.",true);
    try{const man=await loadManifest(d);renderManage(man);if(!man)setStatus("Ngày "+d+" chưa có manifest DAILY ROSTER.",true);}catch(e){setStatus("Không tải được phân công: "+S(e?.message||e),true);}
  };
  async function transferAssignment(id,newUser,reset=false){
    const d=manifestDate(),man=await loadManifest(d);if(!man?.items?.[id])throw new Error("Không tìm thấy assignment trong ngày đã chọn.");
    const item=man.items[id],oldUser=normUser(item.user),target=normUser(newUser);if(!target)throw new Error("Username mới không hợp lệ.");if(target===oldUser&&!reset)return {same:true};
    let payload=null;try{payload=(await sagsV470Ref(`${MAIL_PATH}/${safeKey(oldUser)}/items/${safeKey(id)}`).once("value")).val();}catch(e){}
    payload=payload||{engine:ENGINE,schema:2,assignmentId:id,opDate:d,flightRaw:item.flightRaw||"",formGroup:item.formGroup||"fsags",sourceColumn:item.sourceColumn||"",roleKey:item.roleKey||""};
    payload={...payload,targetUser:target,originalTargetUser:item.originalUser||payload.originalTargetUser||oldUser,manualOverride:!reset,reassignedFrom:oldUser,reassignedAtMs:Date.now(),reassignedBy:normUser(currentUserProfile?.username||""),active:true};
    const patch={};
    patch[`${MAIL_PATH}/${safeKey(oldUser)}/items/${safeKey(id)}`]=null;
    patch[`${MAIL_PATH}/${safeKey(target)}/items/${safeKey(id)}`]=payload;
    patch[`${REVOKE_PATH}/${safeKey(oldUser)}/items/${safeKey(id)}`]={assignmentId:id,reason:"ROSTER_REASSIGN",toUser:target,atMs:Date.now(),by:normUser(currentUserProfile?.username||"")};
    patch[`${REVOKE_PATH}/${safeKey(target)}/items/${safeKey(id)}`]=null;
    patch[`${MANIFEST_PATH}/${safeKey(d)}/items/${safeKey(id)}`]={...item,user:target,originalUser:item.originalUser||payload.originalTargetUser||oldUser,manualOverride:!reset,assignmentId:id};
    patch[`${SESSION_PATH}/${safeKey(id)}/ownerUser`]=target;
    patch[`${SESSION_PATH}/${safeKey(id)}/reassignedAtMs`]=Date.now();
    patch[`${SESSION_PATH}/${safeKey(id)}/reassignedBy`]=normUser(currentUserProfile?.username||"");
    await sagsV470Ref("").update(patch);
    return {oldUser,target,item};
  }
  root.dailyRosterReassign=async function(id){
    if(!canManageDailyRoster())return;const man=await loadManifest(manifestDate()),item=man?.items?.[id];if(!item)return setStatus("Không tìm thấy phân công để chuyển.",true);
    const u=prompt(`CHUYỂN ${item.flightRaw||""} · ${formLabel(item.formGroup)}\\nTừ: ${item.user||""}\\nNhập username người mới:`);if(u===null)return;
    try{const r=await transferAssignment(id,u,false);if(r.same)return setStatus("Username mới đang là người phụ trách hiện tại.");setStatus(`✓ Đã chuyển ${r.item.flightRaw||""} · ${formLabel(r.item.formGroup)} từ ${r.oldUser} → ${r.target}. Không cần GIAO CA.`);await root.dailyRosterLoadAssignments();}catch(e){setStatus("Không chuyển được: "+S(e?.message||e),true);}
  };
  root.dailyRosterResetToRoster=async function(id){
    if(!canManageDailyRoster())return;const man=await loadManifest(manifestDate()),item=man?.items?.[id],u=normUser(item?.originalUser||"");if(!item||!u)return setStatus("Không xác định được người gốc trong roster.",true);
    try{const r=await transferAssignment(id,u,true);setStatus(`✓ Đã trả ${r.item.flightRaw||""} · ${formLabel(r.item.formGroup)} về ${r.target} theo roster.`);await root.dailyRosterLoadAssignments();}catch(e){setStatus("Không trả về roster được: "+S(e?.message||e),true);}
  };


  function mergePVHK09Seed(env,seed){
    env=env&&typeof env==="object"?env:{};env.state=env.state&&typeof env.state==="object"?env.state:{};
    const prev=env.pvhk09RosterSeed||{};
    for(const [k,v] of Object.entries(seed||{})){
      const cur=S(env.state[k]),old=S(prev[k]);
      if(!cur||cur===old)env.state[k]=v;
    }
    env.pvhk09RosterSeed={...seed};
    return env;
  }
  function pvhk09StableId(rec){return "pvhk09-"+hashId(rec.opDate+"|"+rec.flightName);}
  function findExistingPVHK09(list,rec){
    const stable=pvhk09StableId(rec);
    let m=list.find(x=>x.id===stable||S(x.pvhk09RosterKey)===S(rec.opDate+"|"+rec.flightName));
    if(m)return m;
    for(const x of list){
      try{const env=readFlightSessionEnvelope(x.id);if(sameFlightDate(env,{...rec,formGroup:"fsags09"}))return x;}catch(e){}
    }
    return null;
  }
  root.dailyRosterPickPVHK09=function(){
    if(!canBuildPVHK09())return;
    const f=document.getElementById("pvhk09RosterFile");if(f)f.click();
  };
  root.dailyRosterCreatePVHK09FromFile=async function(file){
    if(!canBuildPVHK09()||!file)return;
    try{
      showToast("PVHK: đang đọc roster "+file.name+"…");
      const parsed=await parseRosterFile(file),data=allFlightRows(parsed),rows=data.records||[];
      if(!rows.length){alert("Không tìm thấy dòng chuyến hợp lệ trong roster.");return;}
      if(!confirm(`Tạo/cập nhật ${rows.length} F/SAGS-CXR/09 từ roster?\\n\\nMỗi form được đặt tên theo chuyến bay. Dữ liệu đã nhập tay trước đó không bị ghi đè.`))return;

      const list=readFlightSessionList();let created=0,updated=0;
      const now=Date.now();
      for(const rec of rows){
        let meta=findExistingPVHK09(list,rec),id=meta?.id||pvhk09StableId(rec);
        const seed=pvhk09SeedFor(rec);
        if(!meta){
          meta={
            id,name:rec.flightName,customName:true,initialGroup:"fsags09",
            arrivalOp:"passenger",departureOp:"passenger",
            createdAt:opDateMs(rec.opDate),updatedAt:now,
            pvhk09RosterBatch:true,pvhk09RosterKey:rec.opDate+"|"+rec.flightName,
            rosterOpDate:rec.opDate
          };
          list.push(meta);created++;
          let env={state:{},mainForm:"fsags09",activeFormGroup:"fsags09",currentPage:11,scrollY:0,arrivalOp:"passenger",departureOp:"passenger"};
          env=mergePVHK09Seed(env,seed);
          localStorage.setItem(flightSessionStorageKey(id),JSON.stringify(env));
        }else{
          meta.name=rec.flightName;meta.customName=true;meta.initialGroup="fsags09";meta.updatedAt=now;
          meta.pvhk09RosterBatch=true;meta.pvhk09RosterKey=rec.opDate+"|"+rec.flightName;meta.rosterOpDate=rec.opDate;
          let env=readFlightSessionEnvelope(id)||{state:{},mainForm:"fsags09",activeFormGroup:"fsags09",currentPage:11,scrollY:0};
          env.mainForm="fsags09";env.activeFormGroup="fsags09";env.currentPage=11;
          env=mergePVHK09Seed(env,seed);
          localStorage.setItem(flightSessionStorageKey(id),JSON.stringify(env));
          updated++;
        }
      }
      writeFlightSessionList(list);
      try{renderFlightSessionList?.();}catch(e){}
      showToast(`PVHK FSAGS 09: tạo mới ${created} · cập nhật ${updated} · tổng ${rows.length} chuyến.`);
    }catch(e){
      console.error("PVHK FSAGS09 roster",e);
      alert("Không tạo được FSAGS 09 từ roster: "+S(e?.message||e));
    }
  };

  function backupKey(id){try{return sagsOwnedKey("rosterRevokedBackupV166_"+id)}catch(e){return "rosterRevokedBackupV166_"+id}}
  async function revokeLocalAssignment(id,info={}){
    const list=readFlightSessionList(),affected=list.filter(x=>S(x.rosterAssignmentId)===S(id));if(!affected.length)return false;
    for(const meta of affected){
      const env=readFlightSessionEnvelope(meta.id);try{localStorage.setItem(backupKey(id),JSON.stringify({meta,envelope:env,revokedAtMs:Date.now(),info}));}catch(e){}
      try{await writeSharedAssignment(id,env,meta.rosterOwner||currentUserProfile?.username||"",meta.initialGroup||env?.mainForm||"",true);}catch(e){}
      localStorage.removeItem(flightSessionStorageKey(meta.id));
    }
    const ids=new Set(affected.map(x=>x.id)),next=list.filter(x=>!ids.has(x.id));writeFlightSessionList(next);
    if(ids.has(activeFlightSessionId)){
      try{persist?.();}catch(_e){}
      alert("Phân công của CHUYẾN ĐANG MỞ vừa được chuyển/thu hồi trên DAILY ROSTER.\n\nDữ liệu hiện tại đã được lưu dự phòng. Hệ thống sẽ đóng chuyến này và chỉ sau khi bạn bấm OK mới chuyển về chuyến còn lại.");
      activeFlightSessionId="";try{localStorage.removeItem(sagsOwnedKey(FLIGHT_SESSION_ACTIVE_KEY));flightTabActiveSet?.("");}catch(e){}
      if(next.length){const fb=next.slice().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0];switchFlightSession(fb.id);}
      else{
        try{for(const k of Object.keys(state))delete state[k];activeKey=null;editing=null;signing=null;updateBagTotals();draw();renderAttachments();renderBBBTAttachments();renderFSAGS421Attachments();renderFSAGS551Attachments?.();renderFlightSessionList();showRoleHomeIdle?.();}catch(e){console.info("Roster revoke idle",e);}
      }
    }else try{renderFlightSessionList?.();}catch(e){}
    showToast(`DAILY ROSTER: người phụ trách đã được chuyển cho ${affected.length} biểu mẫu.`);return true;
  }
  async function processRevocationSnapshot(snap){
    const x=snap?.val?.()||{};if(!x?.assignmentId)return;
    try{
      await revokeLocalAssignment(x.assignmentId,x);
      // Revocation is an inbox event, not history. ACK after processing so it cannot
      // grow forever or be downloaded again on every future login.
      try{await snap.ref.remove();}catch(_){}
    }catch(e){console.info("Roster revoke",e?.message||e);}
  }
  function stopRevocations(){
    try{if(revRef&&revAddedCb)revRef.off("child_added",revAddedCb);}catch(e){}
    try{if(revRef&&revChangedCb)revRef.off("child_changed",revChangedCb);}catch(e){}
    revRef=null;revAddedCb=null;revChangedCb=null;
  }
  function startRevocations(){
    stopRevocations();const me=normUser(currentUserProfile?.username||"");if(!me)return;
    try{
      revRef=sagsV470Ref(`${REVOKE_PATH}/${safeKey(me)}/items`);
      revAddedCb=s=>void processRevocationSnapshot(s);
      revChangedCb=s=>void processRevocationSnapshot(s);
      revRef.on("child_added",revAddedCb,e=>console.warn("Roster revocation add",e));
      revRef.on("child_changed",revChangedCb,e=>console.warn("Roster revocation change",e));
    }catch(e){console.warn("Roster revocation start",e);}
  }

  // Đồng bộ dữ liệu form roster theo sự kiện persist, không heartbeat.
  const baseRosterPersist=root.persist||persist;
  root.persist=persist=function(){
    const r=baseRosterPersist.apply(this,arguments);
    try{
      const meta=currentFlightSessionMeta?.();if(meta?.rosterAssignmentId){const env=readFlightSessionEnvelope(meta.id);scheduleSharedSync(meta,env,260);}
    }catch(e){}
    return r;
  };
  function applyRole(){ensureUI();ensureButton();}
  const baseApply=root.applyRoleUI;
  if(typeof baseApply==="function")root.applyRoleUI=applyRoleUI=function(){const r=baseApply.apply(this,arguments);setTimeout(applyRole,0);setTimeout(startMailbox,80);setTimeout(startRevocations,100);return r;};

  setTimeout(()=>{ensureUI();ensureButton();startMailbox();startRevocations();},900);
})(typeof window!=="undefined"?window:globalThis);

/* ===== END daily-roster.js ===== */

/* ===== BEGIN roster-extra-seed.js ===== */
/* E-REPORT SAGS · DAILY ROSTER ROUTE + BOOKING + ARR PAX SAFE SEED · V1.95
 * Reads Route/Booking from the same roster file and enriches mailbox payloads.
 * Applies only when target field is empty or still equals previous roster seed.
 */
(function(root){
'use strict';
const BUILD='V1.95-20260820-01',MAIL='roster_mail';
const S=v=>String(v??'').trim(),U=v=>S(v).toUpperCase(),safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
let lookup=new Map(),installed=false;
const normFlight=v=>U(v).replace(/[^A-Z0-9]/g,'');
const key=(date,flight)=>`${S(date)}|${normFlight(flight)}`;
function cell(row,map,name){const i=map?.[name];return i===undefined?'':S(row?.[i])}
function routeParts(v){const a=U(v).split(/[-–—>/]+/).map(S).filter(Boolean),i=a.indexOf('CXR');return i>=0?{route1:a[i-1]||'',route3:a[i+1]||''}:{route1:a[0]||'',route3:a[1]||''}}
function bookingParts(raw){const s=U(raw),o={raw:S(raw),total:'',F:'',C:'',Y:'',I:''};if(/^\d+$/.test(S(raw)))o.total=S(raw);for(const c of ['F','C','Y','I']){const m=new RegExp(`(?:^|[\\s,;/|])${c}\\s*[:=\\-]?\\s*(\\d+)`,'i').exec(s);if(m)o[c]=m[1]}return o}
function arrivalPaxTotal(raw){const s=S(raw);if(!s)return '';const first=s.split('/')[0].trim();const m=first.match(/\d+/);return m?m[0]:''}
async function parseFile(file){
  const T=root.__SAGS_DAILY_ROSTER_TEST__;if(!T||!file)return null;let parsed;if(/\.csv$/i.test(file.name||''))parsed=T.parseCsvText(await file.text());else parsed=await T.parseXlsxBytes(new Uint8Array(await file.arrayBuffer()));
  const hi=T.headerRowInfo(parsed.rows||[]),map=hi.map,next=new Map();let rosterDate=null;for(let i=0;i<Math.min(hi.row,15)&&!rosterDate;i++)for(const x of (parsed.rows[i]||[])){const d=T.parseDate(x);if(d){rosterDate=d;break}}
  for(let i=hi.row+1;i<(parsed.rows||[]).length;i++){
    const row=parsed.rows[i]||[],flightRaw=cell(row,map,'FlightNo');if(!flightRaw)continue;const arr=T.parseDate(cell(row,map,'ArrFlightDate')),dep=T.parseDate(cell(row,map,'DepFlightDate')),op=arr||dep||rosterDate;if(!op)continue;
    const route=U(cell(row,map,'Route')),rp=routeParts(route),booking=cell(row,map,'Booking'),totalPax=cell(row,map,'TotalPax'),extra={opDate:op.iso,flightRaw:U(flightRaw),route,route1:rp.route1,route3:rp.route3,booking,bookingParts:bookingParts(booking),totalPax,arrPaxTTL:arrivalPaxTotal(totalPax)};next.set(key(op.iso,flightRaw),extra);
  }
  lookup=next;root.__SAGS_ROSTER_EXTRA_LOOKUP__=Object.fromEntries(next);return next;
}
function findExtra(rec){return lookup.get(key(rec?.opDate,rec?.flightRaw))||null}
function enrichObject(x){if(!x||typeof x!=='object')return x;const e=findExtra(x);if(!e)return x;return {...x,rosterRoute:e.route,route:e.route||x.route,route1:e.route1||x.route1,route3:e.route3||x.route3,booking:e.booking,bookingParts:e.bookingParts,totalPax:e.totalPax,arrPaxTTL:e.arrPaxTTL}}
function enrichPatch(patch){for(const k of Object.keys(patch||{})){if(/^roster_mail\/[^/]+\/items\/[^/]+$/.test(k)&&patch[k]&&typeof patch[k]==='object')patch[k]=enrichObject(patch[k]);if(/^roster_manifests\/[^/]+$/.test(k)&&patch[k]?.items){for(const id of Object.keys(patch[k].items))patch[k].items[id]=enrichObject(patch[k].items[id])}}}
function safeSeed(env,k,v){v=S(v);if(!v)return false;env.state=env.state&&typeof env.state==='object'?env.state:{};env.rosterSeed=env.rosterSeed&&typeof env.rosterSeed==='object'?env.rosterSeed:{};const cur=S(env.state[k]),old=S(env.rosterSeed[k]);if(!cur||cur===old){env.state[k]=v;env.rosterSeed[k]=v;return true}return false}
function applyRec(rec){
  const list=typeof root.readFlightSessionList==='function'?root.readFlightSessionList():[],meta=list.find(x=>S(x.rosterAssignmentId)===S(rec.assignmentId));if(!meta)return false;
  const activeMeta=typeof root.currentFlightSessionMeta==='function'?root.currentFlightSessionMeta():null;
  if(S(activeMeta?.id)===S(meta.id)){try{root.persist?.();}catch(_){}}
  let env=root.readFlightSessionEnvelope?.(meta.id);if(!env)return false;const g=S(meta.initialGroup||rec.formGroup||env.mainForm),bp=rec.bookingParts||bookingParts(rec.booking),r1=S(rec.route1),r3=S(rec.route3),arrTTL=S(rec.arrPaxTTL||arrivalPaxTotal(rec.totalPax));let changed=false;
  if(g==='fsags421'){changed=safeSeed(env,'f421_route1',r1)||changed;changed=safeSeed(env,'f421_route3',r3)||changed;if(arrTTL)changed=safeSeed(env,'f421_arrPaxTTL',arrTTL)||changed;if(bp.F)changed=safeSeed(env,'f421_bookingF',bp.F)||changed;if(bp.C)changed=safeSeed(env,'f421_bookingC',bp.C)||changed;if(bp.Y)changed=safeSeed(env,'f421_bookingY',bp.Y)||changed}
  else if(g==='fsags551'){changed=safeSeed(env,'f551_route1',r1)||changed;changed=safeSeed(env,'f551_route3',r3)||changed}
  else if(g==='fsags09'){changed=safeSeed(env,'f09_route1',r1)||changed;changed=safeSeed(env,'f09_route3',r3)||changed;if(bp.total)changed=safeSeed(env,'f09_booking',bp.total)||changed;if(bp.F)changed=safeSeed(env,'f09_bookF',bp.F)||changed;if(bp.C)changed=safeSeed(env,'f09_bookC',bp.C)||changed;if(bp.Y)changed=safeSeed(env,'f09_bookY',bp.Y)||changed;if(bp.I)changed=safeSeed(env,'f09_bookI',bp.I)||changed}
  else {changed=safeSeed(env,'route1',r1)||changed;changed=safeSeed(env,'route2','CXR')||changed;changed=safeSeed(env,'route3',r3)||changed;if(arrTTL)changed=safeSeed(env,'arrPaxTTL',arrTTL)||changed;if(bp.F)changed=safeSeed(env,'bookingF',bp.F)||changed;if(bp.C)changed=safeSeed(env,'bookingC',bp.C)||changed;if(bp.Y)changed=safeSeed(env,'bookingY',bp.Y)||changed}
  if(changed){
    try{localStorage.setItem(root.flightSessionStorageKey(meta.id),JSON.stringify(env))}catch(_){return false}
    // V1.0.3: never redraw/replace the live form from a background roster seed.
    // If this is the active flight, the live state stays authoritative and its next persist wins.
  }
  return changed;
}
function scan(raw){const vals=Object.values(raw||{}).filter(x=>x&&x.engine==='DAILY_ROSTER_V1');for(const rec of vals)if(rec.booking||rec.route1||rec.route3||rec.totalPax||rec.arrPaxTTL){setTimeout(()=>applyRec(rec),250);setTimeout(()=>applyRec(rec),900);setTimeout(()=>applyRec(rec),1900)}}
function bindFile(){const f=document.getElementById('drFile');if(!f||f.dataset.extraSeedV195)return;f.dataset.extraSeedV195='1';f.addEventListener('change',async()=>{try{if(f.files?.[0]){await parseFile(f.files[0]);const e=document.getElementById('drStatus');if(e&&lookup.size)e.textContent=(e.textContent?e.textContent+'\n':'')+`Route/Booking/TotalPax: đã đọc ${lookup.size} dòng để tự điền an toàn.`}}catch(e){console.warn('Roster Route/Booking parse',e)}})}
function install(){
  if(installed)return;const prev=root.sagsV470Ref;if(typeof prev!=='function'||!root.__SAGS_DAILY_ROSTER_TEST__){setTimeout(install,400);return}installed=true;root.__ROSTER_EXTRA_SEED_V195=BUILD;
  root.sagsV470Ref=function(path=''){
    const p=S(path),ref=prev(p);if(p===''&&ref&&typeof ref.update==='function'){const base=ref.update.bind(ref);ref.update=async patch=>{if(patch&&typeof patch==='object')enrichPatch(patch);return base(patch)}}
    if(/^roster_mail\/[^/]+\/items$/.test(p)&&ref){if(typeof ref.on==='function'){const bon=ref.on.bind(ref);ref.on=function(event,cb,...rest){if(event==='value'&&typeof cb==='function'){const wrap=s=>{const r=cb(s);try{scan(s?.val?.()||{})}catch(_){}return r};return bon(event,wrap,...rest)}return bon(event,cb,...rest)}}if(typeof ref.once==='function'){const bo=ref.once.bind(ref);ref.once=async function(){const s=await bo.apply(this,arguments);try{scan(s?.val?.()||{})}catch(_){}return s}}
    }
    return ref;
  };
  bindFile();const mo=new MutationObserver(bindFile);mo.observe(document.documentElement,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0),{once:true});else setTimeout(install,0);
})(window);

/* ===== END roster-extra-seed.js ===== */

/* ===== BEGIN roster-completed.js ===== */
/* E-REPORT SAGS · DAILY ROSTER COMPLETED TASKS + CUMULATIVE IMPORT · V1.96 PUSHBACK REOPEN VISIBLE
   Shared flight completion status: one DATE + flight pair => all roster assignments complete together.
   No heartbeat. RTDB is used only for lightweight completion state. */
(function(root){
  "use strict";

  const BUILD="V1.96-20260830-PUSHBACK-REOPEN-VISIBLE";
  const SESSION_PATH="roster_sessions";
  const STATUS_PATH="roster_flight_status";
  const MANIFEST_PATH="roster_manifests";
  const MAIL_PATH="roster_mail";
  const REVOKE_PATH="roster_revocations";
  let activeTab="pending";
  let renderGuard=false;
  let statusRef=null,statusAddedCb=null,statusChangedCb=null,statusRemovedCb=null,statusApplyTimer=0,statusDate="",statusCache={};
  let lastPublishedSig="";

  const S=v=>String(v??"").trim();
  const now=()=>Date.now();
  const safeId=v=>S(v).replace(/[.#$\[\]\/]/g,"_");
  const norm=v=>S(v).toUpperCase().replace(/\s+/g," ").trim();
  const hashId=s=>{let h=2166136261>>>0;for(let i=0;i<String(s).length;i++){h^=String(s).charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h.toString(36).toUpperCase();};
  const validClock=v=>{
    const s=S(v).replace(/\s+/g,"");
    if(/^([01]\d|2[0-3]):[0-5]\d$/.test(s))return s;
    if(/^\d{4}$/.test(s)){
      const h=Number(s.slice(0,2)),m=Number(s.slice(2));
      if(h<24&&m<60)return s.slice(0,2)+":"+s.slice(2);
    }
    return "";
  };
  function todayIso(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
  function isRoster(meta){return !!S(meta?.rosterAssignmentId);}
  function envelopeOf(meta){try{return root.readFlightSessionEnvelope?.(meta.id)||{};}catch(e){return {};}}
  function pushbackOf(env){const st=(env&&env.state&&typeof env.state==="object")?env.state:{};return validClock(st.h24Start||st.f421_h24Start||"");}
  function opDateOf(meta,env){return S(meta?.rosterOpDate||env?.rosterOpDate||"");}
  function flightPartsFromState(st){
    const arr=S(st?.fltBefore||st?.f421_fltBefore||st?.f551_fltBefore||st?.f09_fltBefore||"");
    const dep=S(st?.fltAfter||st?.f421_fltAfter||st?.f551_fltAfter||st?.f09_fltAfter||"");
    return [arr,dep].map(x=>norm(x).replace(/[^A-Z0-9]/g,"")).filter(Boolean);
  }
  function flightSignature(meta,env){
    const st=(env&&env.state&&typeof env.state==="object")?env.state:{};
    const parts=flightPartsFromState(st);
    if(parts.length)return parts.join("_");
    const fromName=norm(meta?.name||"").match(/[A-Z0-9]{2,3}\s*\d{1,5}/g)||[];
    if(fromName.length)return fromName.map(x=>x.replace(/\s+/g,"")).join("_");
    return norm(meta?.name||meta?.id||"").replace(/[^A-Z0-9]+/g,"_").replace(/^_+|_+$/g,"");
  }
  function tripInfo(meta,env){
    const opDate=opDateOf(meta,env),sig=flightSignature(meta,env);
    if(!opDate||!sig)return null;
    return {opDate,sig,key:"RF_"+hashId(opDate+"|"+sig),label:S(meta?.name||sig.replace(/_/g," / "))};
  }
  function archivedAt(meta,env){return Number(env?.rosterCompletedArchivedAtMs||meta?.rosterCompletedArchivedAtMs||0)||0;}
  function completedAt(meta,env){return Number(env?.rosterCompletedAtMs||meta?.rosterCompletedAtMs||0)||0;}
  function sharedStatus(meta,env){const t=tripInfo(meta,env);return t?statusCache[t.key]||null:null;}
  function isTodayRoster(meta,env){return isRoster(meta)&&opDateOf(meta,env)===todayIso();}
  function pushbackSourceGroup(meta,env){
    const g=norm(meta?.initialGroup||env?.mainForm||env?.activeFormGroup||"");
    // Daily Roster may carry either canonical lower-case groups or roster codes.
    return g==="FSAGS"||g==="FSAGS423"||g==="FSAGS421";
  }
  async function reopenPushbackSource(meta){
    const env=envelopeOf(meta);
    if(!pushbackSourceGroup(meta,env)){root.switchFlightSession?.(meta?.id,true);return true;}
    const pb=pushbackOf(env)||validClock(sharedStatus(meta,env)?.pushback||"")||"đã ghi nhận";
    const fid=S(meta?.rosterFlightId||env?.rosterFlightId||"");
    // Prefer the official MY FLIGHT reopen path so DONE/claim/co-assignee state is restored correctly.
    if(fid&&typeof root.v324ReceiveOrOpen==="function"){
      await root.v324ReceiveOrOpen(fid);
      return true;
    }
    // Backward-compatible fallback for old local sessions that do not have rosterFlightId yet.
    if(!confirm(`MỞ LẠI 42.1/42.3 ĐỂ CHỈNH SỬA\n\nPUSHBACK hiện tại: ${pb}\n\nMở lại không tự xóa PUSHBACK. Bạn có thể sửa giờ hoặc xóa nếu đã nhập nhầm.`))return false;
    root.switchFlightSession?.(meta?.id,true);
    return true;
  }
  root.dailyRosterReopenPushbackSession=reopenPushbackSource;
  root.dailyRosterIsPushbackSourceSession=function(meta){
    try{return !!meta&&pushbackSourceGroup(meta,envelopeOf(meta));}catch(_){return false;}
  };
  root.dailyRosterPushbackValue=function(meta){
    try{const env=envelopeOf(meta);return pushbackOf(env)||validClock(sharedStatus(meta,env)?.pushback||"")||"";}catch(_){return "";}
  };

  function classify(meta){
    const env=envelopeOf(meta);
    if(!isRoster(meta))return {kind:"manual",env,pushback:"",archived:false};
    if(!isTodayRoster(meta,env))return {kind:"outdated",env,pushback:"",archived:false};
    const localPush=pushbackOf(env),ss=sharedStatus(meta,env);
    const completed=!!localPush||ss?.completed===true;
    if(!completed)return {kind:"pending",env,pushback:"",archived:false};
    const archived=archivedAt(meta,env)>0;
    return {kind:archived?"archived":"completed",env,pushback:localPush||validClock(ss?.pushback||"")||"",archived,completedAt:completedAt(meta,env)||Number(ss?.completedAtMs||0)||0};
  }
  function listSorted(){try{return (root.readFlightSessionList?.()||[]).slice().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));}catch(e){return [];}}

  function ensureStyle(){
    if(document.getElementById("rosterCompletedStyle"))return;
    const st=document.createElement("style");st.id="rosterCompletedStyle";st.textContent=`
#rosterTaskTabs{display:none;grid-template-columns:1fr 1.45fr;gap:7px;margin:8px 0 10px}
.rosterTaskTab{min-height:44px;border:0;border-radius:10px;background:#e8edf2;color:#29445d;font:900 13px Arial;padding:7px 8px;touch-action:manipulation}
.rosterTaskTab.active{background:#0b5cab;color:#fff;box-shadow:0 3px 10px rgba(11,92,171,.2)}
.rosterTaskCount{display:inline-flex;min-width:23px;height:23px;align-items:center;justify-content:center;margin-left:5px;padding:0 6px;border-radius:99px;background:rgba(255,255,255,.9);color:#0b5cab;font:900 12px Arial}
.rosterTaskTab:not(.active) .rosterTaskCount{background:#fff;color:#34495e}
#rosterCompletedTools{display:none;margin:-2px 0 10px;gap:7px;align-items:center;justify-content:space-between;flex-wrap:wrap}
#rosterCompletedClear{min-height:38px;border:0;border-radius:9px;background:#f2e7e6;color:#9b261f;font:900 12px Arial;padding:8px 11px;touch-action:manipulation}
#rosterCompletedGuideBtn{min-height:38px;border:0;border-radius:9px;background:#eaf2fb;color:#174f86;font:900 12px Arial;padding:8px 11px;touch-action:manipulation}
#rosterTaskEmpty{display:none;padding:18px 12px;text-align:center;border:1px dashed #c9d2dc;border-radius:10px;background:#fafcfe;color:#607080;font:800 12px/1.45 Arial}
#rosterCompletedGuide{display:none;margin:0 0 10px;padding:10px 11px;border-radius:10px;background:#f5f8fb;color:#405466;font:12px/1.45 Arial}
#rosterCompletedGuide b{color:#0b5cab}.rosterCompletedBadge{display:inline-flex;margin-left:5px;padding:2px 6px;border-radius:99px;background:#e7f6ec;color:#14713d;font:900 10px Arial;vertical-align:middle}
#rosterCompletedTools .rosterCompletedReopen,.rosterCompletedReopen{border:0;border-radius:8px;background:#0b5cab;color:#fff;font:900 10px/1.15 Arial;padding:7px 8px;min-width:76px;touch-action:manipulation}
.rosterCompletedReopen:active{background:#073f76}
@media(max-width:430px){#rosterTaskTabs{grid-template-columns:1fr 1.55fr}.rosterTaskTab{font-size:12px;padding:6px 5px}.rosterTaskCount{min-width:21px;height:21px;margin-left:3px}}`;
    document.head.appendChild(st);
  }
  function ensureUi(){
    ensureStyle();const current=document.getElementById("flightSessionCurrent"),listEl=document.getElementById("flightSessionList");if(!current||!listEl)return null;
    let tabs=document.getElementById("rosterTaskTabs");if(!tabs){
      tabs=document.createElement("div");tabs.id="rosterTaskTabs";tabs.innerHTML=`<button type="button" class="rosterTaskTab active" id="rosterTaskPendingBtn">CHUYẾN <span class="rosterTaskCount" id="rosterTaskPendingCount">0</span></button><button type="button" class="rosterTaskTab" id="rosterTaskCompletedBtn">✅ ĐÃ HOÀN THÀNH <span class="rosterTaskCount" id="rosterTaskCompletedCount">0</span></button>`;
      current.insertAdjacentElement("afterend",tabs);
      document.getElementById("rosterTaskPendingBtn").onclick=()=>{activeTab="pending";enhanceList();};
      document.getElementById("rosterTaskCompletedBtn").onclick=()=>{activeTab="completed";enhanceList();};
      const tools=document.createElement("div");tools.id="rosterCompletedTools";tools.innerHTML=`<button id="rosterCompletedClear" type="button">🗑 XÓA DANH SÁCH HOÀN THÀNH</button><button id="rosterCompletedGuideBtn" type="button">HDSD</button>`;tabs.insertAdjacentElement("afterend",tools);
      document.getElementById("rosterCompletedClear").onclick=clearCompletedList;
      document.getElementById("rosterCompletedGuideBtn").onclick=()=>{const g=document.getElementById("rosterCompletedGuide");if(g)g.style.display=g.style.display==="block"?"none":"block";};
      const guide=document.createElement("div");guide.id="rosterCompletedGuide";guide.innerHTML=`<b>HDSD:</b> Khi 42.1/42.3 lưu <b>PUSHBACK</b>, chuyến chuyển sang <b>✅ ĐÃ HOÀN THÀNH</b> để ngừng theo dõi/cảnh báo. <b>Không khóa biểu mẫu.</b> Nếu cần sửa giờ PUSHBACK, mở tab ĐÃ HOÀN THÀNH và bấm <b>MỞ LẠI · SỬA PUSHBACK</b> trên đúng 42.1/42.3. Mở lại giữ nguyên dữ liệu cũ; sửa giờ rồi lưu sẽ đồng bộ giờ mới. Nếu xóa PUSHBACK, chuyến quay lại nhóm CHUYẾN. 55.1 chỉ nhận trạng thái/giờ chung, không phải nguồn quyết định PUSHBACK. Dọn cuối ca chỉ ẩn danh sách hoàn thành, không xóa hồ sơ.`;tools.insertAdjacentElement("afterend",guide);
      const empty=document.createElement("div");empty.id="rosterTaskEmpty";listEl.insertAdjacentElement("afterend",empty);
    }
    return tabs;
  }

  function enhanceList(){
    if(renderGuard)return;renderGuard=true;
    try{
      const tabs=ensureUi();if(!tabs)return;const listEl=document.getElementById("flightSessionList"),rows=Array.from(listEl?.children||[]).filter(x=>x.classList?.contains("flightSessionRow")),list=listSorted();
      let rosterToday=0,pendingCount=0,completedCount=0,visible=0;
      list.forEach((meta,i)=>{
        const c=classify(meta),row=rows[i];if(!row)return;
        if(c.kind==="pending"||c.kind==="completed"||c.kind==="archived")rosterToday++;
        if(c.kind==="pending")pendingCount++;if(c.kind==="completed")completedCount++;
        let show=false;
        if(c.kind==="outdated"||c.kind==="archived")show=false;
        else if(c.kind==="manual")show=activeTab==="pending";
        else if(activeTab==="completed")show=c.kind==="completed";
        else show=c.kind==="pending";
        row.style.display=show?"":"none";if(show)visible++;
        const sub=row.querySelector(".flightSessionSelect span");if(sub){sub.querySelectorAll(".rosterCompletedBadge").forEach(x=>x.remove());if(c.kind==="completed"){const badge=document.createElement("span");badge.className="rosterCompletedBadge";badge.textContent="✓ PUSHBACK "+(c.pushback||"ĐÃ GHI NHẬN");sub.appendChild(badge);}}
        // V1.1.95: PUSHBACK completes tracking, but must never lock 42.1/42.3 against correction.
        const actions=row.querySelector(".flightSessionActions"),select=row.querySelector(".flightSessionSelect"),oldReopen=row.querySelector(".rosterCompletedReopen");
        if(c.kind==="completed"&&pushbackSourceGroup(meta,c.env)){
          let reopen=oldReopen;
          if(!reopen&&actions){reopen=document.createElement("button");reopen.type="button";reopen.className="rosterCompletedReopen";reopen.textContent="MỞ LẠI · SỬA PUSHBACK";actions.insertBefore(reopen,actions.firstChild);}
          if(reopen)reopen.onclick=ev=>{ev.stopPropagation();void reopenPushbackSource(meta);};
          if(select)select.onclick=ev=>{ev.stopPropagation();void reopenPushbackSource(meta);};
          row.onclick=()=>void reopenPushbackSource(meta);
        }else if(oldReopen){oldReopen.remove();}
      });
      tabs.style.display=rosterToday?"grid":"none";
      const tools=document.getElementById("rosterCompletedTools"),guide=document.getElementById("rosterCompletedGuide"),empty=document.getElementById("rosterTaskEmpty"),pBtn=document.getElementById("rosterTaskPendingBtn"),cBtn=document.getElementById("rosterTaskCompletedBtn"),pCount=document.getElementById("rosterTaskPendingCount"),cCount=document.getElementById("rosterTaskCompletedCount");
      if(pCount)pCount.textContent=String(pendingCount);if(cCount)cCount.textContent=String(completedCount);
      pBtn?.classList.toggle("active",activeTab==="pending");cBtn?.classList.toggle("active",activeTab==="completed");if(tools)tools.style.display=rosterToday&&activeTab==="completed"?"flex":"none";
      const clear=document.getElementById("rosterCompletedClear");if(clear){clear.disabled=completedCount===0;clear.style.opacity=completedCount?"1":".45";}if(guide&&activeTab!=="completed")guide.style.display="none";
      if(empty){empty.style.display=rosterToday&&visible===0?"block":"none";empty.textContent=activeTab==="completed"?"Chưa có chuyến DAILY ROSTER nào đã hoàn thành hôm nay.":(completedCount?"Không còn chuyến đang theo dõi. Muốn sửa PUSHBACK đã nhập, bấm tab ✅ ĐÃ HOÀN THÀNH rồi chọn MỞ LẠI · SỬA PUSHBACK.":"Không còn chuyến DAILY ROSTER cần làm hôm nay.");}
    }finally{renderGuard=false;}
  }

  function saveMarkers(meta,env,completed,completedMs,preserveArchive=true){
    let changed=false;
    if(completed){
      const at=Number(completedMs||env.rosterCompletedAtMs||meta.rosterCompletedAtMs||now())||now();
      if(Number(env.rosterCompletedAtMs||0)!==at){env.rosterCompletedAtMs=at;changed=true;}if(Number(meta.rosterCompletedAtMs||0)!==at){meta.rosterCompletedAtMs=at;changed=true;}
      if(!preserveArchive){if(env.rosterCompletedArchivedAtMs){delete env.rosterCompletedArchivedAtMs;changed=true;}if(meta.rosterCompletedArchivedAtMs){delete meta.rosterCompletedArchivedAtMs;changed=true;}}
    }else if(env.rosterCompletedAtMs||meta.rosterCompletedAtMs||env.rosterCompletedArchivedAtMs||meta.rosterCompletedArchivedAtMs){delete env.rosterCompletedAtMs;delete meta.rosterCompletedAtMs;delete env.rosterCompletedArchivedAtMs;delete meta.rosterCompletedArchivedAtMs;changed=true;}
    return changed;
  }
  function syncAssignment(meta,env){
    const assignment=S(meta?.rosterAssignmentId);if(!assignment||typeof root.sagsV470Ref!=="function")return;
    const patch={completedAtMs:Number(env?.rosterCompletedAtMs||0)||null,completedPushback:pushbackOf(env)||null,completedListClearedAtMs:Number(env?.rosterCompletedArchivedAtMs||0)||null,"envelope/rosterCompletedAtMs":Number(env?.rosterCompletedAtMs||0)||null,"envelope/rosterCompletedArchivedAtMs":Number(env?.rosterCompletedArchivedAtMs||0)||null};
    try{root.sagsV470Ref(`${SESSION_PATH}/${safeId(assignment)}`).update(patch).catch?.(()=>{});}catch(e){}
  }
  function applySharedToLocal(){
    const list=root.readFlightSessionList?.()||[];let listChanged=false;
    for(let i=0;i<list.length;i++){
      const meta=list[i],env=envelopeOf(meta);if(!isTodayRoster(meta,env))continue;const t=tripInfo(meta,env);if(!t)continue;const ss=statusCache[t.key]||null,localPush=pushbackOf(env),done=!!localPush||ss?.completed===true;
      const changed=saveMarkers(meta,env,done,Number(ss?.completedAtMs||0)||0,true);if(changed){try{localStorage.setItem(root.flightSessionStorageKey(meta.id),JSON.stringify(env));}catch(e){}list[i]=meta;listChanged=true;syncAssignment(meta,env);}
    }
    if(listChanged)root.writeFlightSessionList?.(list);
  }
  function statusPayload(meta,env,push){
    const t=tripInfo(meta,env);if(!t)return null;return {engine:"DAILY_ROSTER_V1",schema:1,opDate:t.opDate,tripKey:t.key,flightLabel:t.label,flightSignature:t.sig,completed:!!push,pushback:push||null,completedAtMs:push?now():null,updatedAtMs:now(),updatedBy:S(root.currentUserProfile?.username||"")};
  }
  function publishFlightStatus(meta,env,push){
    const p=statusPayload(meta,env,push);if(!p||typeof root.sagsV470Ref!=="function")return;
    statusCache[p.tripKey]=p;applySharedToLocal();enhanceList();const sig=JSON.stringify([p.opDate,p.tripKey,p.completed,p.pushback]);if(sig===lastPublishedSig)return;lastPublishedSig=sig;
    try{root.sagsV470Ref(`${STATUS_PATH}/${safeId(p.opDate)}/${safeId(p.tripKey)}`).set(p).catch?.(e=>console.info("Roster flight status",e?.message||e));}catch(e){}
  }
  function reconcileActiveCompletion(){
    try{
      const meta=root.currentFlightSessionMeta?.();if(!meta||!isRoster(meta))return;
      const env=envelopeOf(meta);if(!isTodayRoster(meta,env))return;
      // Chỉ 42.3 / 42.1 là nguồn có field PUSHBACK. 55.1/FSAGS09 chỉ NHẬN trạng thái chung,
      // tuyệt đối không được persist "không có PUSHBACK" rồi xóa trạng thái hoàn thành của chuyến.
      const group=S(meta?.initialGroup||env?.mainForm||"");
      if(group!=="fsags"&&group!=="fsags421")return;
      publishFlightStatus(meta,env,pushbackOf(env));
    }catch(e){console.info("Roster completion reconcile",e?.message||e);}
  }
  function scheduleStatusApply(){
    clearTimeout(statusApplyTimer);statusApplyTimer=setTimeout(()=>{applySharedToLocal();try{root.renderFlightSessionList?.();}catch(e){enhanceList();}},45);
  }
  function stopStatusListener(){
    clearTimeout(statusApplyTimer);statusApplyTimer=0;
    try{if(statusRef&&statusAddedCb)statusRef.off("child_added",statusAddedCb);}catch(e){}
    try{if(statusRef&&statusChangedCb)statusRef.off("child_changed",statusChangedCb);}catch(e){}
    try{if(statusRef&&statusRemovedCb)statusRef.off("child_removed",statusRemovedCb);}catch(e){}
    statusRef=null;statusAddedCb=null;statusChangedCb=null;statusRemovedCb=null;statusDate="";
  }
  function startStatusListener(){
    const d=todayIso();if(statusRef&&statusDate===d)return;stopStatusListener();statusDate=d;statusCache={};if(typeof root.sagsV470Ref!=="function")return;
    try{
      statusRef=root.sagsV470Ref(`${STATUS_PATH}/${safeId(d)}`);
      const up=s=>{const k=S(s?.key);if(k){const v=s?.val?.();if(v)statusCache[k]=v;else delete statusCache[k];scheduleStatusApply();}};
      statusAddedCb=up;statusChangedCb=up;statusRemovedCb=s=>{const k=S(s?.key);if(k){delete statusCache[k];scheduleStatusApply();}};
      statusRef.on("child_added",statusAddedCb,e=>console.info("Roster status add",e?.message||e));
      statusRef.on("child_changed",statusChangedCb,e=>console.info("Roster status change",e?.message||e));
      statusRef.on("child_removed",statusRemovedCb,e=>console.info("Roster status remove",e?.message||e));
    }catch(e){console.info("Roster status listener start",e?.message||e);}
  }
  function migrateExistingPushbacks(){
    for(const meta of listSorted()){const env=envelopeOf(meta);if(!isTodayRoster(meta,env))continue;const push=pushbackOf(env);if(push){publishFlightStatus(meta,env,push);break;}}
  }

  async function clearCompletedList(){
    const list=root.readFlightSessionList?.()||[],targets=[];for(const meta of list){const c=classify(meta);if(c.kind==="completed")targets.push({meta,c});}if(!targets.length)return;
    const d=new Date(),label=`${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;if(!confirm(`Xóa ${targets.length} chuyến đã hoàn thành khỏi danh sách công việc ngày ${label}?\n\nHồ sơ chuyến và biểu mẫu vẫn được giữ lại.`))return;
    const at=now();for(const x of targets){const meta=x.meta,env=x.c.env||envelopeOf(meta);meta.rosterCompletedArchivedAtMs=at;env.rosterCompletedArchivedAtMs=at;try{localStorage.setItem(root.flightSessionStorageKey(meta.id),JSON.stringify(env));}catch(e){}syncAssignment(meta,env);}root.writeFlightSessionList?.(list);enhanceList();
  }
  root.dailyRosterClearCompletedList=clearCompletedList;

  // V3.16: DAILY ROSTER re-import on the same operational date is authoritative.
  // The newest file replaces the active roster assignment set for that date. Missing
  // assignments are revoked by dailyRosterPublish; missing flights are retained only as
  // historical Flight Records and marked ROSTER_REMOVED/INACTIVE. Business/module data
  // is never deleted here.
  function installCumulativeRosterMerge(){
    if(root.__rosterCumulativeMergeV187)return true;
    const originalRef=root.sagsV470Ref;
    if(typeof originalRef!=="function")return false;
    root.__rosterCumulativeMergeV187=true;

    root.sagsV470Ref=function(path=""){
      const ref=originalRef(path);
      if(S(path)!==""||!ref||typeof ref.update!=="function")return ref;
      const originalUpdate=ref.update.bind(ref);
      ref.update=async function(patch){
        if(!patch||typeof patch!=="object"||Array.isArray(patch))return originalUpdate(patch);
        const manifestKeys=Object.keys(patch).filter(k=>/^roster_manifests\/[^/]+$/.test(k));
        if(!manifestKeys.length)return originalUpdate(patch);

        let removed=0,updated=0,added=0;
        for(const manifestKey of manifestKeys){
          const incoming=patch[manifestKey];
          if(!incoming||typeof incoming!=="object"||!incoming.items)continue;
          const dateKey=manifestKey.slice((MANIFEST_PATH+"/").length);
          let old={};
          try{old=(await originalRef(`${MANIFEST_PATH}/${dateKey}`).once("value")).val()||{};}catch(e){old={};}
          const oldItems=(old.items&&typeof old.items==="object")?old.items:{};
          const newItems=(incoming.items&&typeof incoming.items==="object")?incoming.items:{};
          for(const id of Object.keys(newItems)){if(oldItems[id])updated++;else added++;}
          for(const id of Object.keys(oldItems)){if(!Object.prototype.hasOwnProperty.call(newItems,id))removed++;}

          // Do not merge old.items back. The incoming manifest is the authoritative active
          // set. Removal/revocation paths already prepared by dailyRosterPublish must pass
          // through unchanged.
          patch[manifestKey]={
            ...incoming,
            schema:Math.max(Number(incoming.schema||0),2),
            cumulative:false,
            cumulativeMode:null,
            syncMode:"REPLACE_SAME_DAY",
            previousBatchFileName:S(old.fileName||old.lastBatchFileName||""),
            lastBatchFileName:S(incoming.fileName||""),
            lastBatchAtMs:Number(incoming.publishedAtMs||now())
          };
        }
        root.__ROSTER_CUMULATIVE_LAST={removed,updated,added,atMs:now(),mode:"REPLACE_SAME_DAY"};
        return originalUpdate(patch);
      };
      return ref;
    };
    return true;
  }

  function installHooks(){
    if(root.__rosterCompletedHooksV186B02)return;root.__rosterCompletedHooksV186B02=true;
    try{const baseRender=root.renderFlightSessionList;if(typeof baseRender==="function")root.renderFlightSessionList=function(){const out=baseRender.apply(this,arguments);setTimeout(enhanceList,0);return out;};}catch(e){}
    try{const baseOpen=root.openFlightSessions;if(typeof baseOpen==="function")root.openFlightSessions=function(){activeTab="pending";startStatusListener();const out=baseOpen.apply(this,arguments);setTimeout(enhanceList,0);return out;};}catch(e){}
    try{const basePersist=root.persist;if(typeof basePersist==="function")root.persist=function(){const out=basePersist.apply(this,arguments);reconcileActiveCompletion();setTimeout(()=>{try{root.renderFlightSessionList?.();}catch(e){}},0);return out;};}catch(e){}
    try{const baseApply=root.applyRoleUI;if(typeof baseApply==="function")root.applyRoleUI=function(){const out=baseApply.apply(this,arguments);setTimeout(startStatusListener,40);return out;};}catch(e){}
    setTimeout(()=>{ensureUi();startStatusListener();applySharedToLocal();migrateExistingPushbacks();try{root.renderFlightSessionList?.();}catch(e){}},450);
    setInterval(()=>{if(statusDate&&statusDate!==todayIso()){statusCache={};startStatusListener();try{root.renderFlightSessionList?.();}catch(e){}}},60000);
  }

  installCumulativeRosterMerge();
  installHooks();root.__ROSTER_COMPLETED_BUILD=BUILD;root.__ROSTER_CUMULATIVE_BUILD=BUILD;
})(window);

/* ===== END roster-completed.js ===== */

/* ===== BEGIN flight-hub.js ===== */
/* E-REPORT/SAGS V1.1.103 RTDB ANCESTOR HOTFIX ONLY */
/* E-REPORT SAGS V3.63 · MASTER FLIGHT HUB
 * One Daily Roster flight = one master flight record. Operational modules keep their canonical data
 * but register a compact pointer/status under the same flightId so every department works in one flight workspace.
 */
(function(root){'use strict';
  const BUILD='V3.63-20260822-01';
  const ROOT='flight_records', MANIFEST='roster_manifests', MAIL='roster_mail';
  const S=v=>String(v??'').trim(), U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const normFlight=v=>U(v).replace(/[^A-Z0-9]/g,'');
  const hash=s=>{let h=2166136261>>>0;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return h.toString(36).toUpperCase()};
  const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(_){return v}};
  const finiteNumber=(v,fallback=0)=>{const n=Number(v);return Number.isFinite(n)?n:fallback};
  function finiteSortMinute(value,dayOffset,clock){const raw=S(value),n=raw===''?NaN:Number(raw);if(Number.isFinite(n))return n;const m=/^(\d{2}):(\d{2})$/.exec(S(clock));return m?finiteNumber(dayOffset,0)*1440+Number(m[1])*60+Number(m[2]):999999}
  function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function isoDate(v){const s=S(v);let m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s);if(m)return s;m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);if(m)return `${m[3]}-${m[2]}-${m[1]}`;m=/^(\d{8})$/.exec(s.replace(/\D/g,''));if(m){const x=m[1];if(Number(x.slice(0,4))>2000)return `${x.slice(0,4)}-${x.slice(4,6)}-${x.slice(6,8)}`;return `${x.slice(4,8)}-${x.slice(2,4)}-${x.slice(0,2)}`;}return today()}
  function splitFlights(raw){const s=U(raw).replace(/[\/]+/g,' '),out=[];let prefix='';for(const p0 of s.split(/\s+/).filter(Boolean)){const p=p0.replace(/[^A-Z0-9]/g,'');let m=/^([A-Z0-9]{2,3}?)(\d{1,5})$/.exec(p);if(m&&/[A-Z]/.test(m[1])){prefix=m[1];out.push(prefix+m[2]);continue}m=/^(\d{1,5})$/.exec(p);if(m&&prefix)out.push(prefix+m[1]);}return [...new Set(out)]}
  function flightId(date,arr,dep,raw){const flights=[normFlight(arr),normFlight(dep)].filter(Boolean);if(!flights.length)flights.push(...splitFlights(raw).map(normFlight));const sig=`${isoDate(date)}|${flights.join('|')||normFlight(raw)||'UNKNOWN'}`;return `FLT_${hash(sig)}`}
  function extractMailByAssignment(patch){const out={};for(const [k,v] of Object.entries(patch||{})){const m=/^roster_mail\/[^/]+\/items\/([^/]+)$/.exec(k);if(m&&v&&typeof v==='object')out[S(v.assignmentId||m[1])]=v;}return out}
  function enrichRosterPatch(patch){
    const mails=extractMailByAssignment(patch),groups={};
    const add=(date,aid,item,container=null)=>{date=S(date);aid=S(aid);if(!date||!aid||!item||typeof item!=="object")return;groups[date]=groups[date]||{};groups[date][aid]={item,container};};
    for(const [k,v] of Object.entries(patch||{})){
      let m=/^roster_manifests\/([^/]+)$/.exec(k);
      if(m&&v?.items){for(const [aid,item] of Object.entries(v.items||{}))add(m[1],aid,item,v);continue;}
      m=/^roster_manifests\/([^/]+)\/items\/([^/]+)$/.exec(k);
      if(m&&v&&typeof v==='object')add(m[1],m[2],v,null);
    }
    for(const [date,items] of Object.entries(groups)){
      const records={};
      for(const [aid,entry] of Object.entries(items||{})){
        const item={...(entry.item||{})},mail=mails[aid]||{};
        // V3.63: hỗ trợ manifest delta item-level; chỉ assignment thay đổi mới đụng Flight Hub.
        const fid=S(item.flightId||mail.flightId)||flightId(date,mail.arrFlight||item.arrFlight,mail.depFlight||item.depFlight,item.flightRaw||mail.flightRaw);
        item.flightId=fid;
        if(entry.container?.items)entry.container.items[aid]=item;
        else patch[`${MANIFEST}/${date}/items/${aid}`]=item;
        if(mails[aid])mails[aid].flightId=fid;
        const get=name=>mail[name]??item[name];
        const rec=records[fid]||(records[fid]={flightId:fid,opDate:date,flightRaw:S(item.flightRaw||mail.flightRaw),flightName:S(item.flightName||mail.flightName),arrFlight:S(get('arrFlight')),depFlight:S(get('depFlight')),sta:S(get('sta')),std:S(get('std')),eta:S(get('eta')),etd:S(get('etd')),arrFlightDate:S(get('arrFlightDate')||date),depFlightDate:S(get('depFlightDate')||date),etaFlightDate:S(get('etaFlightDate')||get('arrFlightDate')||date),etdFlightDate:S(get('etdFlightDate')||get('depFlightDate')||date),staClock:S(get('staClock')),stdClock:S(get('stdClock')),etaClock:S(get('etaClock')),etdClock:S(get('etdClock')),staDayOffset:finiteNumber(get('staDayOffset'),0),stdDayOffset:finiteNumber(get('stdDayOffset'),0),etaDayOffset:finiteNumber(get('etaDayOffset'),0),etdDayOffset:finiteNumber(get('etdDayOffset'),0),staSortMinute:finiteSortMinute(get('staSortMinute'),get('staDayOffset'),get('staClock')),stdSortMinute:finiteSortMinute(get('stdSortMinute'),get('stdDayOffset'),get('stdClock')),etaSortMinute:finiteSortMinute(get('etaSortMinute'),get('etaDayOffset'),get('etaClock')),etdSortMinute:finiteSortMinute(get('etdSortMinute'),get('etdDayOffset'),get('etdClock')),acReg:S(get('acReg')),acType:S(get('acType')),route:S(get('route')),bay:S(get('bay')),createdFrom:'DAILY_ROSTER',createdAtMs:Date.now(),updatedAtMs:Date.now(),assignments:{}});
        rec.assignments[aid]={assignmentId:aid,user:S(item.user||mail.targetUser),originalUser:S(item.originalUser||mail.originalTargetUser),formGroup:S(item.formGroup||mail.formGroup),sourceColumn:S(item.sourceColumn||mail.sourceColumn),roleKey:S(item.roleKey||mail.roleKey),workspaceKey:S(item.workspaceKey||item.rosterWorkspaceKey||mail.workspaceKey||mail.rosterWorkspaceKey),assignmentScope:S(item.assignmentScope||mail.assignmentScope||'BOTH'),workPartOrder:finiteNumber(item.workPartOrder||mail.workPartOrder,1),workPartTotal:finiteNumber(item.workPartTotal||mail.workPartTotal,1),workPartSequenceSource:S(item.workPartSequenceSource||mail.workPartSequenceSource||item.sourceColumn||mail.sourceColumn),coAssigneeGroupId:S(item.coAssigneeGroupId||mail.coAssigneeGroupId),coAssigneeMode:S(item.coAssigneeMode||mail.coAssigneeMode),coAssigneeRank:finiteNumber(item.coAssigneeRank||mail.coAssigneeRank,1),coAssigneeTotal:finiteNumber(item.coAssigneeTotal||mail.coAssigneeTotal,1),coAssigneeUsers:Array.isArray(item.coAssigneeUsers)?item.coAssigneeUsers:(Array.isArray(mail.coAssigneeUsers)?mail.coAssigneeUsers:[]),active:item.active!==false};
      }
      for(const [fid,rec] of Object.entries(records)){
        const base=`${ROOT}/${safe(date)}/${safe(fid)}`;
        for(const k of ['flightId','opDate','flightRaw','flightName','arrFlight','depFlight','sta','std','eta','etd','arrFlightDate','depFlightDate','etaFlightDate','etdFlightDate','staClock','stdClock','etaClock','etdClock','staDayOffset','stdDayOffset','etaDayOffset','etdDayOffset','staSortMinute','stdSortMinute','etaSortMinute','etdSortMinute','acReg','acType','route','bay','createdFrom'])patch[`${base}/${k}`]=rec[k]??'';
        patch[`${base}/updatedAtMs`]=Date.now();patch[`${base}/createdAtMs`]=rec.createdAtMs||Date.now();patch[`${base}/rosterActive`]=true;patch[`${base}/rosterStatus`]="ACTIVE";patch[`${base}/rosterRemovedAtMs`]=null;patch[`${base}/rosterRemovedBy`]=null;patch[`${base}/rosterRemovedSourceFile`]=null;
        // V1.1.103 HOTFIX ONLY: Flight Hub must not re-create an RTDB ancestor/descendant
        // conflict after DAILY ROSTER has already prepared child fields such as
        // assignments/{id}/active. Merge any existing descendant fields into the
        // assignment object, delete those descendant paths, then write one parent path.
        for(const [aid,assignment0] of Object.entries(rec.assignments||{})){
          const assignmentPath=`${base}/assignments/${safe(aid)}`,assignment={...assignment0},prefix=assignmentPath+'/';
          const setDeep=(obj,parts,val)=>{let cur=obj;for(let i=0;i<parts.length-1;i++){const k=parts[i];if(!cur[k]||typeof cur[k]!=='object'||Array.isArray(cur[k]))cur[k]={};cur=cur[k]}cur[parts[parts.length-1]]=val};
          for(const child of Object.keys(patch)){
            if(child===assignmentPath||!child.startsWith(prefix))continue;
            const rel=child.slice(prefix.length).split('/').filter(Boolean);
            if(rel.length)setDeep(assignment,rel,patch[child]);
            delete patch[child];
          }
          patch[assignmentPath]=assignment;
        }
      }
      patch[`${MANIFEST}/${date}/flightHubSchema`]=1;
    }
  }
  async function readDate(date){try{return (await root.sagsV470Ref(`${ROOT}/${safe(date)}`).once('value')).val()||{}}catch(_){return {}}}
  function identity(payload,meta){const id=payload?.identity||{},f09=payload?.f09||{},st=payload?.state||{};const rawFlights=[];for(const x of [id.flightToken,...(id.flights||[]),payload?.flight,payload?.flightRaw,f09.f09_fltBefore,f09.f09_fltAfter,st.fltBefore,st.fltAfter,st.f421_fltBefore,st.f421_fltAfter])if(S(x))rawFlights.push(normFlight(x));const flights=[...new Set(rawFlights.filter(Boolean))];const date=isoDate(meta?.opDate||id.date||id.dateToken||payload?.date||f09.f09_date||st.date||st.f421_date||meta?.date||today());return {date,flights,reg:S(id.acRegToken||payload?.acReg||payload?.acreg||f09.f09_regn||st.regn||st.f421_regn).toUpperCase()}}
  function matchRecord(records,flights){const fset=new Set(flights);for(const rec of Object.values(records||{})){const rfl=[rec.arrFlight,rec.depFlight,...splitFlights(rec.flightRaw),...splitFlights(rec.flightName)].map(normFlight).filter(Boolean);if(rfl.some(x=>fset.has(x)))return rec;}return null}
  function moduleSummary(kind,payload,meta){const k=U(kind),id=identity(payload,meta);const base={kind:k,updatedAtMs:Date.now(),updatedBy:S(root.currentUserProfile?.username||root.currentRole||''),docId:S(meta?.docId),sourcePath:S(meta?.sourcePath),revisionNo:Number(meta?.revisionNo||payload?.revisionNo||payload?.closeoutNo||0)||0,reg:id.reg};if(k==='KẾT SỔ'||k==='KET_SO'||k==='CLOSEOUT')return {...base,kind:'KẾT SỔ',status:'ĐÃ CÓ',adl:payload?.f09?.f09_finalADL??null,chd:payload?.f09?.f09_finalCHD??null,inf:payload?.f09?.f09_finalINF??null,bagPcs:payload?.f09?.f09_finalBagP??null,bagKg:payload?.f09?.f09_finalBagW??null};if(k==='FINAL')return {...base,status:'ĐÃ CÓ',form:S(payload?.form),crosscheckStatus:S(payload?.cleanCrosscheck?.[String(payload?.revisionNo||1)]?.status||'WAITING')};if(k==='RAMP')return {...base,status:S(meta?.status||'ĐANG KHAI THÁC'),sessionId:S(meta?.sessionId),assignmentId:S(meta?.assignmentId),workspaceKey:S(meta?.workspaceKey),sourcePath:S(meta?.sourcePath),chockOn:S(meta?.chockOn),doorClose:S(meta?.doorClose),chockOff:S(meta?.chockOff),pushback:S(meta?.pushback),cargoOffload:S(meta?.cargoOffload),cargoOnload:S(meta?.cargoOnload)};return {...base,status:S(meta?.status||'ĐÃ CẬP NHẬT')};}
  root.sagsFlightHubLink=async function(kind,payload,meta={}){try{if(typeof root.sagsV470Ref!=='function')return null;const id=identity(payload,meta),records=await readDate(id.date);let rec=matchRecord(records,id.flights),fid=rec?.flightId;if(!fid){fid=flightId(id.date,id.flights[0],id.flights[1],id.flights.join('/'));rec={flightId:fid,opDate:id.date,flightRaw:id.flights.join('/'),flightName:id.flights.join(' / '),arrFlight:id.flights[0]||'',depFlight:id.flights[1]||'',createdFrom:'MODULE_FALLBACK',createdAtMs:Date.now(),assignments:{}};}const mod=moduleSummary(kind,payload,meta),eventId=`EV_${Date.now()}_${hash(kind+'|'+S(meta.docId)+'|'+Math.random())}`;const patch={};patch[`${ROOT}/${safe(id.date)}/${safe(fid)}/flightId`]=fid;patch[`${ROOT}/${safe(id.date)}/${safe(fid)}/opDate`]=id.date;patch[`${ROOT}/${safe(id.date)}/${safe(fid)}/updatedAtMs`]=Date.now();if(id.reg)patch[`${ROOT}/${safe(id.date)}/${safe(fid)}/acReg`]=id.reg;patch[`${ROOT}/${safe(id.date)}/${safe(fid)}/modules/${safe(mod.kind)}`]=mod;patch[`${ROOT}/${safe(id.date)}/${safe(fid)}/timeline/${safe(eventId)}`]={eventId,kind:mod.kind,status:mod.status,atMs:Date.now(),by:mod.updatedBy,docId:mod.docId,revisionNo:mod.revisionNo};await root.sagsV470Ref('').update(patch);return {flightId:fid,opDate:id.date}}catch(e){console.warn('FlightHub link',kind,e);return null}};
  function rampMeta(){try{const st=root.state||{},meta=typeof root.currentFlightSessionMeta==='function'?root.currentFlightSessionMeta():null,aid=S(meta?.rosterAssignmentId||st.rosterAssignmentId),wi=typeof root.rosterWorkspaceInfo==='function'?root.rosterWorkspaceInfo(aid):null;return {opDate:S(meta?.rosterOpDate),sessionId:S(root.activeFlightSessionId),assignmentId:aid,workspaceKey:S(wi?.workspaceKey),sourcePath:wi?.workspaceKey?`roster_flight_workspaces/${safe(wi.workspaceKey)}`:'',chockOn:S(st.h5||st.f421_h5),doorClose:S(st.h21||st.f421_h21),chockOff:S(st.h22||st.f421_h22),pushback:S(st.h24||st.f421_h24),cargoOffload:S(st.offloadCargoFinish||st.f421_offloadCargoFinish),cargoOnload:S(st.onloadCargoFinish||st.f421_onloadCargoFinish),status:S(st.h24||st.f421_h24)?'PUSHBACK':(S(st.h21||st.f421_h21)?'DOOR CLOSE':'ĐANG KHAI THÁC')}}catch(_){return {}}}
  let syncTimer=0,lastRampSig='';root.sagsFlightHubSyncCurrentRamp=function(){clearTimeout(syncTimer);syncTimer=setTimeout(async()=>{try{if(!root.activeFlightSessionId)return;const st=clone(root.state||{}),m=rampMeta(),sig=JSON.stringify([root.activeFlightSessionId,m.chockOn,m.doorClose,m.chockOff,m.pushback,m.cargoOffload,m.cargoOnload,S(st.fltBefore||st.f421_fltBefore),S(st.fltAfter||st.f421_fltAfter)]);if(sig===lastRampSig)return;lastRampSig=sig;await root.sagsFlightHubLink('RAMP',{state:st},m)}catch(e){console.warn('FlightHub ramp',e)}},700)};
  function installPersistHook(){if(root.__FLIGHT_HUB_PERSIST_HOOK)return;const base=root.persist;if(typeof base!=='function'){setTimeout(installPersistHook,500);return}root.__FLIGHT_HUB_PERSIST_HOOK=1;root.persist=function(){const r=base.apply(this,arguments);try{root.sagsFlightHubSyncCurrentRamp()}catch(_){}return r}}
  function installRefHook(){if(root.__FLIGHT_HUB_REF_HOOK)return;const prev=root.sagsV470Ref;if(typeof prev!=='function'){setTimeout(installRefHook,500);return}root.__FLIGHT_HUB_REF_HOOK=1;root.sagsV470Ref=function(path=''){const ref=prev(path);if(S(path)===''&&ref&&typeof ref.update==='function'){const base=ref.update.bind(ref);ref.update=function(patch){if(patch&&typeof patch==='object'&&!Array.isArray(patch))try{enrichRosterPatch(patch)}catch(e){console.warn('FlightHub roster enrich',e)}return base(patch)}}return ref};}
  root.sagsFlightHubRead=async function(date){return await readDate(isoDate(date))};
  root.sagsFlightHubFlightId=flightId;

  function installDailyRosterUi(){
    try{const b=document.getElementById('drPublishBtn');if(b)b.textContent='✈ TẠO CHUYẾN';}catch(_){}
    if(root.__FLIGHT_HUB_DAILY_HOOK)return;const base=root.dailyRosterPublish;if(typeof base!=='function'){setTimeout(installDailyRosterUi,500);return}
    root.__FLIGHT_HUB_DAILY_HOOK=1;root.dailyRosterPublish=async function(){return await base.apply(this,arguments)};
  }
  root.sagsFlightHubModuleBadges=function(rec){const mods=rec?.modules||{},order=['KẾT SỔ','FINAL','RAMP','HÀNG HÓA','ULD','MVT','MVA'];return order.filter(k=>mods[k]).map(k=>({kind:k,status:S(mods[k]?.status||'ĐÃ CÓ'),revisionNo:Number(mods[k]?.revisionNo||0)}));};

  root.__SAGS_FLIGHT_HUB_TEST__={enrichRosterPatch};
  installRefHook();installPersistHook();installDailyRosterUi();root.__FLIGHT_HUB_BUILD=BUILD;
})(typeof window!=='undefined'?window:globalThis);

/* ===== END flight-hub.js ===== */

/* ===== BEGIN roster-leg-workspace.js ===== */
/* E-REPORT SAGS · DAILY ROSTER LEG WORKSPACE CONTINUITY · V1.93
 * One flight pair keeps one shared roster workspace for a given operational role/form.
 * Later roster batches may split ARRIVAL and DEPARTURE assignees without recreating form state.
 * No heartbeat. Only roster publish/mailbox/session events are intercepted.
 */
(function(root){
  'use strict';
  const BUILD='V1.93-20260820-01';
  const MANIFEST_PATH='roster_manifests';
  const MAIL_PATH='roster_mail';
  const SESSION_PATH='roster_sessions';
  const WORKSPACE_PATH='roster_flight_workspaces';
  const REVOKE_PATH='roster_revocations';
  const MAP_KEY='sags_roster_workspace_map_v193';
  const S=v=>String(v??'').trim();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const norm=v=>S(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
  const hash=s=>{let h=2166136261>>>0;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return h.toString(36).toUpperCase()};
  const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(_){return v}};
  let map={};
  try{map=JSON.parse(localStorage.getItem(MAP_KEY)||'{}')||{}}catch(_){map={}};
  function persistMap(){try{localStorage.setItem(MAP_KEY,JSON.stringify(map))}catch(_){}}
  function remember(id,workspaceKey,scope){id=S(id);workspaceKey=S(workspaceKey);if(!id||!workspaceKey)return;map[id]={workspaceKey,scope:S(scope||map[id]?.scope||'BOTH'),atMs:Date.now()};persistMap()}
  function mapping(id){return map[S(id)]||null}
  function stableKey(opDate,item){
    const flight=norm(item?.flightRaw||item?.flightName||'');
    const role=norm(item?.roleKey||item?.sourceColumn||'ROLE');
    const form=norm(item?.formGroup||'FORM');
    return 'RW_'+hash([S(opDate),flight,role,form].join('|'));
  }
  function sameDuty(a,b){
    if(!a||!b)return false;
    return norm(a.flightRaw||a.flightName)===norm(b.flightRaw||b.flightName)
      && norm(a.roleKey||a.sourceColumn)===norm(b.roleKey||b.sourceColumn)
      && norm(a.formGroup)===norm(b.formGroup);
  }
  function scanMailbox(raw){
    for(const rec of Object.values(raw||{})){
      if(!rec||typeof rec!=='object')continue;
      const id=S(rec.assignmentId),wk=S(rec.workspaceKey||rec.rosterWorkspaceKey);
      if(id&&wk)remember(id,wk,rec.assignmentScope||rec.legScope||'BOTH');
    }
  }
  function wrapMailboxRef(ref,path){
    if(!ref||!/^roster_mail\/[^/]+\/items$/.test(S(path)))return ref;
    const cbMap=new Map();
    if(typeof ref.on==='function'){
      const baseOn=ref.on.bind(ref);
      ref.on=function(event,cb,cancel){
        if(event!=='value'||typeof cb!=='function')return baseOn(event,cb,cancel);
        const wrapped=snap=>{try{scanMailbox(snap?.val?.()||{})}catch(_){}return cb(snap)};
        cbMap.set(cb,wrapped);
        return baseOn(event,wrapped,cancel);
      };
    }
    if(typeof ref.off==='function'){
      const baseOff=ref.off.bind(ref);
      ref.off=function(event,cb){const wrapped=cbMap.get(cb)||cb;const r=baseOff(event,wrapped);if(cb)cbMap.delete(cb);return r};
    }
    if(typeof ref.once==='function'){
      const baseOnce=ref.once.bind(ref);
      ref.once=async function(){const snap=await baseOnce.apply(this,arguments);try{scanMailbox(snap?.val?.()||{})}catch(_){}return snap};
    }
    return ref;
  }
  // V1.1.30: assignment status MUST stay under roster_sessions/{assignmentId}.
  // Older V1.93 redirected A + B (ARR/DEP) into the same workspace, so claimStatus,
  // COMPLETED/READY and handover metadata could overwrite each other.  The shared
  // workspace is now legacy data fallback only; it is never the live session path.
  function redirectSessionPath(path){ return S(path); }
  function rewriteSessionPatchPaths(patch){ return patch; }
  async function loadVal(baseRef,path){try{return (await baseRef(path).once('value')).val()||null}catch(_){return null}}
  function patchMailFields(patch,user,id,wk,scope){
    user=safe(user);id=safe(id);if(!user||!id)return;
    const parent=`${MAIL_PATH}/${user}/items/${id}`;
    if(patch[parent]&&typeof patch[parent]==='object'){
      patch[parent]={...patch[parent],workspaceKey:wk,rosterWorkspaceKey:wk,assignmentScope:scope,active:true};
    }else if(patch[parent]!==null){
      patch[`${parent}/workspaceKey`]=wk;patch[`${parent}/rosterWorkspaceKey`]=wk;patch[`${parent}/assignmentScope`]=scope;patch[`${parent}/active`]=true;
    }
  }
  async function enhanceRosterPublish(baseRef,patch){
    const manifestKeys=Object.keys(patch||{}).filter(k=>/^roster_manifests\/[^/]+$/.test(k));
    if(!manifestKeys.length)return;
    for(const manifestKey of manifestKeys){
      const incoming=patch[manifestKey];if(!incoming?.items||typeof incoming.items!=='object')continue;
      const dateKey=manifestKey.slice(MANIFEST_PATH.length+1);
      const old=(await loadVal(baseRef,`${MANIFEST_PATH}/${dateKey}`))||{};
      const oldItems=old.items||{};
      const incomingItems=incoming.items||{};
      const incomingIds=new Set(Object.keys(incomingItems));

      for(const [newId,newItem0] of Object.entries(incomingItems)){
        const newItem={...newItem0};
        const sameId=oldItems[newId]||null;
        let peers=Object.entries(oldItems).filter(([id,x])=>id!==newId&&sameDuty(x,newItem));
        let arrival=peers.find(([,x])=>S(x.assignmentScope)==='ARRIVAL')||null;
        let departure=peers.find(([,x])=>S(x.assignmentScope)==='DEPARTURE')||null;
        const unscoped=peers.filter(([,x])=>!S(x.assignmentScope)||S(x.assignmentScope)==='BOTH');
        const wk=S(sameId?.workspaceKey||sameId?.rosterWorkspaceKey||arrival?.[1]?.workspaceKey||departure?.[1]?.workspaceKey||unscoped?.[0]?.[1]?.workspaceKey)||stableKey(dateKey,newItem);

        if(sameId){
          newItem.workspaceKey=wk;newItem.rosterWorkspaceKey=wk;newItem.assignmentScope=S(sameId.assignmentScope||'BOTH');
          incomingItems[newId]=newItem;remember(newId,wk,newItem.assignmentScope);
          patchMailFields(patch,newItem.user||newItem.targetUser,newId,wk,newItem.assignmentScope);
          continue;
        }

        // A later batch assigning the same flight/role to a different user means:
        // preserve the original worker as ARRIVAL and assign the latest worker to DEPARTURE.
        let source=arrival||unscoped[0]||departure;
        if(source){
          const [srcId,src0]=source,src={...src0,workspaceKey:wk,rosterWorkspaceKey:wk,assignmentScope:'ARRIVAL',active:true};
          // If an ARRIVAL already exists, the previous DEPARTURE is superseded instead.
          if(arrival&&departure){
            const [depId,dep0]=departure;
            const dep={...dep0,workspaceKey:wk,rosterWorkspaceKey:wk,assignmentScope:'DEPARTURE',active:false,supersededAtMs:Date.now(),supersededBy:newId};
            incomingItems[depId]=dep;
            const du=S(dep0.user||dep0.targetUser);
            if(du){patch[`${MAIL_PATH}/${safe(du)}/items/${safe(depId)}`]=null;patch[`${REVOKE_PATH}/${safe(du)}/items/${safe(depId)}`]={assignmentId:depId,reason:'LEG_REASSIGNED_DEPARTURE',toUser:S(newItem.user||newItem.targetUser),atMs:Date.now()};}
          }else{
            incomingItems[srcId]=src;
            patchMailFields(patch,src.user||src.targetUser,srcId,wk,'ARRIVAL');
            remember(srcId,wk,'ARRIVAL');
          }

          newItem.workspaceKey=wk;newItem.rosterWorkspaceKey=wk;newItem.assignmentScope='DEPARTURE';newItem.active=true;
          incomingItems[newId]=newItem;remember(newId,wk,'DEPARTURE');
          patchMailFields(patch,newItem.user||newItem.targetUser,newId,wk,'DEPARTURE');

          // Seed the common workspace once from the already-used assignment session.
          const wsPath=`${WORKSPACE_PATH}/${safe(wk)}`;
          let ws=await loadVal(baseRef,wsPath);
          if(!ws){
            const srcSession=await loadVal(baseRef,`${SESSION_PATH}/${safe(srcId)}`);
            if(srcSession)patch[wsPath]={...clone(srcSession),workspaceKey:wk,rosterWorkspaceKey:wk,migratedFromAssignmentId:srcId,migratedAtMs:Date.now()};
          }
        }else{
          newItem.workspaceKey=wk;newItem.rosterWorkspaceKey=wk;newItem.assignmentScope='BOTH';incomingItems[newId]=newItem;remember(newId,wk,'BOTH');patchMailFields(patch,newItem.user||newItem.targetUser,newId,wk,'BOTH');
        }
      }
      patch[manifestKey]={...incoming,workspaceSchema:1,legAssignmentMode:true,items:incomingItems};
    }
  }
  function install(){
    if(root.__ROSTER_LEG_WORKSPACE_V193)return;
    const previous=root.sagsV470Ref;if(typeof previous!=='function'){setTimeout(install,500);return;}
    root.__ROSTER_LEG_WORKSPACE_V193=BUILD;
    root.sagsV470Ref=function(path=''){
      const originalPath=S(path);
      const redirected=redirectSessionPath(originalPath);
      const ref=previous(redirected);
      wrapMailboxRef(ref,originalPath);
      if(originalPath===''&&ref&&typeof ref.update==='function'){
        const baseUpdate=ref.update.bind(ref);
        ref.update=async function(patch){
          if(patch&&typeof patch==='object'&&!Array.isArray(patch)){
            await enhanceRosterPublish(previous,patch);
            rewriteSessionPatchPaths(patch);
          }
          return baseUpdate(patch);
        };
      }
      return ref;
    };

    root.rosterWorkspaceInfo=function(assignmentId){return clone(mapping(assignmentId)||null)};
    root.rosterWorkspaceLegacyRead=async function(assignmentId){
      try{
        const hit=mapping(assignmentId);if(!hit?.workspaceKey)return null;
        return (await previous(`${WORKSPACE_PATH}/${safe(hit.workspaceKey)}`).once('value')).val()||null;
      }catch(_){return null}
    };
  }
  install();
})(window);

/* ===== END roster-leg-workspace.js ===== */

/* Legacy BÀN GIAO / DUYỆT workflow removed in V1.1.20. Daily Roster / MY FLIGHT remain active. */


/* ===== BEGIN admin-hub.js ===== */
/* E-REPORT SAGS V3.0 · Compact Admin Management Hub */
(function(root){'use strict';
 const S=v=>String(v??'').trim(), U=v=>S(v).toUpperCase();
 function session(){try{return root.__sagsGetSession?.()||{}}catch(_){return {}}}
 function isAD(){const x=session();return U(x.role||x.profile?.role)==='AD'}
 const groups=[
  {key:'ops',title:'✈ VẬN HÀNH CHUYẾN',sub:'DAILY ROSTER tự tạo chuyến, Flight Workspace và theo dõi khai thác',items:[
    ['roleBtnRosterFlights','✈ DANH SÁCH CHUYẾN HÔM NAY','Mở hồ sơ chuyến và phân công/bàn giao'],
    ['roleBtnActivity','📊 TIẾN ĐỘ','Theo dõi các chuyến đang khai thác'],
    ['roleBtnAcLimits','⚠ A/C LIMITS','Hạn chế tàu bay / cảnh báo khai thác'],
    ['roleBtnFleet','🛫 FLEET TÀU BAY','A/C REG · A/C TYPE · CONFIG']
  ]},
  {key:'people',title:'👥 NHÂN SỰ & CẤU HÌNH',sub:'Tài khoản, quyền và cấu hình chức năng',items:[
    ['roleBtnAccounts','👤 TÀI KHOẢN & PHÂN QUYỀN','Tạo/sửa tài khoản, vai trò và quyền']
  ]},
  {key:'monitor',title:'🛡 GIÁM SÁT & HỒ SƠ',sub:'Nhật ký, tài nguyên hệ thống và lưu trữ',items:[
    ['roleBtnAudit','🧾 NHẬT KÝ / AUDIT','Các mốc FINAL, KẾT SỔ và UPDATE quan trọng'],
    ['roleBtnFirebaseUsage','🔥 FIREBASE USAGE','Theo dõi mức sử dụng Firebase'],
    ['roleBtnArchive','🗄 HỒ SƠ','Tra cứu hồ sơ lưu trữ'],
  ]}
 ];
 const hideIds=['roleBtnDailyRoster','roleBtnRosterFlights','roleBtnActivity','roleBtnAcLimits','roleBtnFleet','roleBtnAccounts','roleBtnAudit','roleBtnFirebaseUsage','roleBtnArchive'];
 function ensure(){
  if(!document.getElementById('adminHubStyle')){const st=document.createElement('style');st.id='adminHubStyle';st.textContent=`body.sagsAdminHub ${hideIds.map(x=>'#'+x).join(',body.sagsAdminHub ')}{display:none!important}#adminHubModal{display:none;position:fixed;inset:0;z-index:17600;background:rgba(0,0,0,.55);align-items:center;justify-content:center;padding:12px;font-family:Arial,sans-serif}#adminHubModal.show{display:flex}.ahPanel{width:min(95vw,760px);max-height:92vh;overflow:auto;background:#fff;border-radius:16px;padding:14px;box-shadow:0 18px 48px rgba(0,0,0,.35)}.ahHead{display:flex;align-items:center;justify-content:space-between;gap:10px}.ahHead h3{margin:0;color:#0b4f91}.ahClose,.ahGroupBtn,.ahBack,.ahItem,.ahRosterBtn{border:0;border-radius:11px;font-weight:900;cursor:pointer}.ahClose,.ahBack{padding:8px 11px;background:#eef2f6;color:#334}.ahGroups{display:grid;grid-template-columns:1fr;gap:10px;margin-top:14px}.ahGroupBtn{min-height:78px;padding:14px;text-align:left;background:#eef6ff;color:#164e7a;border:1px solid #c9def0;font-size:18px}.ahGroupBtn small,.ahItem small{display:block;font-size:12px;font-weight:700;color:#657789;margin-top:5px}.ahSectionHead{display:flex;align-items:center;gap:8px;margin:14px 0 8px}.ahSectionHead h4{margin:0;color:#294b66;font-size:17px}.ahGrid{display:grid;grid-template-columns:1fr;gap:8px}.ahItem{min-height:58px;padding:10px 12px;text-align:left;background:#f7fbff;color:#164e7a;border:1px solid #d3e3ef;font-size:15px}.ahRosterBox{padding:14px;border-radius:14px;background:#eaf7ef;border:2px solid #9bcfab;margin:10px 0 14px}.ahRosterTitle{font-size:19px;font-weight:900;color:#176b32;margin-bottom:5px}.ahRosterSub{font-size:12px;font-weight:700;color:#526b59;margin-bottom:10px}.ahRosterFile{display:block;width:100%;box-sizing:border-box;padding:10px;background:#fff;border:1px solid #b8c9bd;border-radius:10px;margin-bottom:9px}.ahRosterBtn{width:100%;padding:14px;background:#18783a;color:white;font-size:17px}.ahRosterBtn:disabled{opacity:.45;cursor:not-allowed}.ahSub{font-size:12px;color:#667788;margin-top:4px}`;document.head.appendChild(st)}
  if(!document.getElementById('adminHubModal')){const m=document.createElement('div');m.id='adminHubModal';m.innerHTML=`<div class="ahPanel"><div class="ahHead"><div><h3>⚙ QUẢN LÝ ADMIN</h3><div class="ahSub">Các chức năng cùng mục đích được gom theo nhóm.</div></div><button class="ahClose" onclick="adminHubClose()">ĐÓNG</button></div><div id="adminHubBody"></div></div>`;document.body.appendChild(m)}
  const bar=document.querySelector('.toolbar-row.main-actions');if(bar&&!document.getElementById('roleBtnAdminHub')){const b=document.createElement('button');b.id='roleBtnAdminHub';b.textContent='⚙ QUẢN LÝ';b.onclick=()=>root.adminHubOpen();const anchor=document.getElementById('roleBtnAccounts');if(anchor?.parentNode)anchor.parentNode.insertBefore(b,anchor);else bar.appendChild(b)}
 }
 function renderHome(){const host=document.getElementById('adminHubBody');if(!host)return;host.innerHTML=`<div class="ahGroups">${groups.map(g=>`<button class="ahGroupBtn" onclick="adminHubOpenGroup('${g.key}')">${g.title}<small>${g.sub}</small></button>`).join('')}</div>`}
 root.adminHubOpenGroup=function(key){const g=groups.find(x=>x.key===key),host=document.getElementById('adminHubBody');if(!g||!host)return;const roster=key==='ops'?`<div class="ahRosterBox"><div class="ahRosterTitle">📋 DAILY ROSTER → TỰ TẠO CHUYẾN</div><input class="ahRosterFile" id="adminRosterFile" type="file" accept=".xlsx,.xlsm,.csv" onchange="adminHubRosterPicked(this)"><button class="ahRosterBtn" id="adminRosterOpenBtn" onclick="adminHubOpenRoster()">CHỌN DAILY ROSTER / TỰ TẠO CHUYẾN</button></div>`:'';host.innerHTML=`<div class="ahSectionHead"><button class="ahBack" onclick="adminHubHome()">← QUAY LẠI</button><h4>${g.title}</h4></div>${roster}<div class="ahGrid">${g.items.map(([id,label,note])=>{const exists=!!document.getElementById(id);return `<button class="ahItem${exists?'':' missing'}" ${exists?`onclick="adminHubRun('${id}')"`:'disabled'}>${label}<small>${note}</small></button>`}).join('')}</div>`}
 root.adminHubRosterPicked=function(inp){const f=inp?.files?.[0];if(f)root.dailyRosterLoadFile?.(f)};
 root.adminHubOpenRoster=function(){root.adminHubClose();if(typeof root.flightWorkspacePickRoster==='function')root.flightWorkspacePickRoster();else root.openDailyRosterManager?.()};
 root.adminHubHome=renderHome;
 root.adminHubRun=function(id){const b=document.getElementById(id);if(!b)return alert('Chức năng này chưa sẵn sàng.');root.adminHubClose();const old=b.style.display;b.style.setProperty('display','inline-flex','important');try{b.click()}finally{setTimeout(()=>{b.style.display=old||'';sync()},0)}};
 root.adminHubOpen=function(){ensure();if(!isAD())return;renderHome();document.getElementById('adminHubModal')?.classList.add('show')};
 root.adminHubClose=function(){document.getElementById('adminHubModal')?.classList.remove('show')};
 function sync(){ensure();const ad=isAD();document.body.classList.toggle('sagsAdminHub',ad);const b=document.getElementById('roleBtnAdminHub');if(b)b.style.display=ad?'inline-flex':'none'}
 const base=root.applyRoleUI;if(typeof base==='function')root.applyRoleUI=function(){const r=base.apply(this,arguments);setTimeout(sync,0);return r};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(sync,50),{once:true});else setTimeout(sync,50);
 window.addEventListener('pageshow',()=>setTimeout(sync,80),{passive:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(sync,80)},{passive:true});
})(typeof window!=='undefined'?window:globalThis);

/* ===== END admin-hub.js ===== */

/* ===== BEGIN flight-workspace-core.js ===== */
/* E-REPORT/SAGS V3.0 · FLIGHT WORKSPACE CORE
 * One flight = one workspace shared by all operating units.
 * Phase 1: list flights sorted by STD, unit ownership, module status, and direct DAILY ROSTER entry.
 */
(function(root){'use strict';
  const BUILD='V3.3-20260821-01';
  const ROOT='flight_records', MANIFEST='roster_manifests';
  const S=v=>String(v??'').trim(), U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normUser=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}};
  const UNITS=[
    {key:'DH',label:'ĐH · ĐIỀU HÀNH',icon:'✈',tasks:['Theo dõi và điều phối tổng thể chuyến','Theo dõi STA/STD/ETD, Door Close, Pushback, MVA/MVT','Theo dõi tiến độ và bất thường khai thác']},
    {key:'CBTT',label:'CBTT · CÂN BẰNG TRỌNG TẢI',icon:'⚖',tasks:['Nhận dữ liệu KẾT SỔ, hành lý và hàng hóa','Lập/kiểm tra FINAL, Weight & Balance','Thực hiện CROSSCHECK FINAL theo revision']},
    {key:'PVHK',label:'PVHK · PHỤC VỤ HÀNH KHÁCH',icon:'👥',tasks:['Check-in/boarding và KẾT SỔ','ADL / CHD / INF','BAG PCS / KG và khách đặc biệt']},
    {key:'HLNG',label:'HLNG · HÀNH LÝ NHÀ GA',icon:'🛄',tasks:['Chuyến đi: nhận hành lý từ băng chuyền, phân loại, chất lên móc/ULD','Chuyến đến: nhận hành lý từ móc/ULD, đưa lên băng chuyền trả khách','Ghi nhận thời gian hoàn tất và bất thường']},
    {key:'CARGO',label:'KHO HÀNG · CARGO',icon:'📦',tasks:['Tiếp nhận/xử lý hàng hóa','Build-up / loading / breakdown','Cargo weight, ULD hàng và hàng đặc biệt']},
    {key:'VSTB',label:'VSTB · VỆ SINH TÀU BAY',icon:'🧹',tasks:['Nhận nhiệm vụ vệ sinh tàu bay','Bắt đầu và hoàn tất vệ sinh','Ghi nhận bất thường phục vụ cabin']},
    {key:'VHTTB',label:'VHTTB · VẬN HÀNH TRANG THIẾT BỊ',icon:'🚜',tasks:['Nhận yêu cầu thiết bị phục vụ','Điều động thiết bị và nhân sự vận hành','Cập nhật tình trạng đáp ứng']},
    {key:'KTTB',label:'KTTB · KỸ THUẬT THIẾT BỊ',icon:'🔧',tasks:['Tiếp nhận yêu cầu báo hỏng thiết bị','Bảo trì / bảo dưỡng / sửa chữa','Cập nhật tình trạng thiết bị sau xử lý'],requestOnly:true},
    {key:'LNF',label:'LNF · LOST & FOUND',icon:'🔎',tasks:['Tiếp nhận case hành lý thất lạc chuyến đến','Theo dõi xử lý','Ghi nhận kết quả trả khách'],requestOnly:true}
  ];
  function session(){try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}}
  function profile(){return session().profile||root.currentUserProfile||{}}
  function role(){return U(session().role||profile().role)}
  function me(){const p=profile();return S(p.username||(role()==='AD'?'AD':''));}
  function myName(){const p=profile();return S(p.name||p.fullName||p.displayName||p.username||me());}
  function dep(){const p=profile();return U(p.departmentCode||p.systemDepartment||p.department||p.groupCode||p.group||'');}
  function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function unitForProfile(){
    if(role()==='AD')return '';
    const p=profile(), text=U([p.role,p.roleCode,p.groupCode,p.departmentCode,p.systemDepartment,p.department,p.group,p.jobTitle].filter(Boolean).join(' '));
    const tests=[
      ['CBTT',/(CBTT|CÂN BẰNG TRỌNG TẢI|CAN BANG TRONG TAI|LOAD CONTROL)/],
      ['PVHK',/(PVHK|PHỤC VỤ HÀNH KHÁCH|PHUC VU HANH KHACH)/],
      ['HLNG',/(HLNG|HÀNH LÝ NHÀ GA|HANH LY NHA GA)/],
      ['CARGO',/(KHO HÀNG|KHO HANG|CARGO)/],
      ['VSTB',/(VSTB|VỆ SINH TÀU BAY|VE SINH TAU BAY)/],
      ['VHTTB',/(VHTTB|VẬN HÀNH TRANG THIẾT BỊ|VAN HANH TRANG THIET BI)/],
      ['KTTB',/(KTTB|KỸ THUẬT THIẾT BỊ|KY THUAT THIET BI)/],
      ['LNF',/(LNF|LOST\s*&?\s*FOUND|LOST AND FOUND)/],
      ['DH',/(^|\s)(ĐH|DH)(\s|$)|ĐIỀU HÀNH|DIEU HANH/]
    ];
    for(const [k,re] of tests)if(re.test(text))return k;
    return '';
  }
  function timeScore(v){const raw=S(v),plus=/\+\s*$/.test(raw),s=raw.replace(/[^0-9]/g,'');if(s.length<3)return 99999;const hh=Number(s.slice(0,-2)),mm=Number(s.slice(-2));return (plus?1440:0)+(Number.isFinite(hh)?hh:99)*60+(Number.isFinite(mm)?mm:99);}
  function recordTimeScore(rec,key='std'){const n=Number(rec?.[`${key}SortMinute`]);return Number.isFinite(n)&&n>=0?n:timeScore(rec?.[key]);}
  function dbref(path){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase RTDB chưa sẵn sàng.');return root.sagsV470Ref(path);}
  async function readFlights(date){if(typeof root.sagsFlightHubRead==='function')return await root.sagsFlightHubRead(date);const s=await dbref(`${ROOT}/${safe(date)}`).once('value');return s.val()||{};}
  async function readManifest(date){try{const s=await dbref(`${MANIFEST}/${safe(date)}`).once('value');return s.val()||null}catch(_){return null}}
  function rosterUnit(item){const roleKey=U(item?.roleKey),src=U(item?.sourceColumn),form=U(item?.formGroup);if(roleKey==='CBTT'||src.includes('GRND_LS')||form==='FINAL')return 'CBTT';if(roleKey==='PAX09'||src.includes('PAX_SUPR')||form==='FSAGS09')return 'PVHK';if(['COR','LD','BOTH'].includes(roleKey)||src.includes('GRND_COR')||src.includes('GRND_LD')||['FSAGS','FSAGS421','FSAGS551'].includes(form))return 'DH';return ''}
  function sameRosterFlight(item,rec){if(!item||!rec)return false;const ifid=S(item.flightId),rfid=S(rec.flightId);if(ifid&&rfid)return ifid===rfid;const a=U(item.flightRaw||item.flightName),b=U(rec.flightRaw||rec.flightName);if(a&&b&&a===b)return true;const af=U(rec.arrFlight),df=U(rec.depFlight),x=U(item.flightRaw||item.flightName);return !!x&&((af&&x.includes(af))||(df&&x.includes(df)))}
  function rosterUsersForUnit(rec,unit,manifest){const out=[];for(const item of Object.values(manifest?.items||{})){if(!item||item.active===false||rosterUnit(item)!==unit||!sameRosterFlight(item,rec))continue;const u=normUser(item.user||item.targetUser);if(u&&!out.includes(u))out.push(u)}return out}
  function flightsWithManifestFallback(date,flights,manifest){
    const out={...(flights||{})};
    for(const item0 of Object.values(manifest?.items||{})){
      if(!item0||item0.active===false)continue;const item=item0;
      let fid=S(item.flightId);try{if(!fid&&typeof root.sagsFlightHubFlightId==='function')fid=S(root.sagsFlightHubFlightId(date,item.arrFlight||'',item.depFlight||'',item.flightRaw||item.flightName||''))}catch(_){}
      if(!fid)continue;
      const old=out[fid]||{},arr=S(old.arrFlight||item.arrFlight),dep=S(old.depFlight||item.depFlight),raw=S(old.flightRaw||item.flightRaw||item.flightName),name=S(old.flightName||item.flightName||item.assignmentFlight||raw||[arr,dep].filter(Boolean).join(' / '));
      out[fid]={...old,flightId:fid,opDate:S(old.opDate||date),flightRaw:raw,flightName:name,arrFlight:arr,depFlight:dep,route:S(old.route||item.route),acReg:S(old.acReg||item.acReg),acType:S(old.acType||item.acType),bay:S(old.bay||item.bay),sta:S(old.sta||item.sta),std:S(old.std||item.std),eta:S(old.eta||item.eta),etd:S(old.etd||item.etd),rosterActive:old.rosterActive!==false,rosterStatus:U(old.rosterStatus)==='ROSTER_REMOVED'?'ROSTER_REMOVED':'ACTIVE',unitAssignments:old.unitAssignments||{},createdFrom:S(old.createdFrom||'ROSTER_MANIFEST_FALLBACK')};
    }
    return out;
  }
  async function reconcileRosterClaims(date,flights,manifest){const patch={},events=[];for(const rec of Object.values(flights||{})){if(!rec?.flightId)continue;for(const unit of ['DH','CBTT','PVHK']){const rosterUsers=rosterUsersForUnit(rec,unit,manifest),a=rec.unitAssignments?.[unit],owner=normUser(a?.username);if(!rosterUsers.length||!owner||rosterUsers.includes(owner))continue;const at=Date.now(),eid=`ROSTER_FIX_${safe(unit)}_${at}`;patch[`${ROOT}/${safe(date)}/${safe(rec.flightId)}/assignmentHistory/${safe(eid)}`]={eventId:eid,action:'INVALID_ROSTER_CLAIM_REMOVED',unit,removedUser:owner,removedName:S(a?.name||a?.username),rosterEligibleUsers:rosterUsers,atMs:at,by:'SYSTEM_V3.3'};patch[`${ROOT}/${safe(date)}/${safe(rec.flightId)}/unitAssignments/${safe(unit)}`]=null;if(rec.unitAssignments)delete rec.unitAssignments[unit];events.push({flightId:rec.flightId,unit,owner,rosterUsers})}}if(Object.keys(patch).length)await dbref('').update(patch);return events}
  let cache={date:'',flights:{},manifest:null,selected:null};
  function ensureUI(){
    if(document.getElementById('fwcModal'))return;
    const st=document.createElement('style');st.textContent=`
      #fwcModal{display:none;position:fixed;inset:0;z-index:16820;background:rgba(0,0,0,.55);align-items:center;justify-content:center;padding:10px;font-family:Arial,sans-serif}#fwcModal.show{display:flex}
      .fwcPanel{width:min(98vw,1120px);max-height:95vh;overflow:auto;background:#fff;border-radius:16px;padding:14px;box-sizing:border-box;box-shadow:0 18px 50px rgba(0,0,0,.32)}.fwcHead{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.fwcHead h3{margin:0;color:#0b4f91}.fwcSub{font-size:12px;color:#5f6f7d;line-height:1.45;margin-top:4px}.fwcBtn{border:0;border-radius:9px;padding:9px 12px;font-weight:900;cursor:pointer;background:#0b67b2;color:#fff}.fwcBtn.gray{background:#eef3f7;color:#31475a;border:1px solid #ccd7df}.fwcBtn.green{background:#15803d}.fwcBtn.orange{background:#b45309}.fwcBtn:disabled{opacity:.45;cursor:not-allowed}.fwcTools{display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin:10px 0}.fwcTools input{padding:9px;border:1px solid #cad6df;border-radius:9px}.fwcStatus{padding:9px 10px;border-radius:9px;background:#eef6ff;color:#244862;font-size:12px;margin:8px 0}.fwcStatus.err{background:#fff0f0;color:#9b1c1c}
      .fwcFlight{border:1px solid #d9e2e9;border-radius:12px;margin:8px 0;padding:10px;display:grid;grid-template-columns:minmax(200px,1.3fr) minmax(200px,1fr) auto;gap:10px;align-items:center}.fwcFlight:hover{background:#f8fbfd}.fwcFlightTitle{font-size:17px;font-weight:900;color:#173f60}.fwcMeta{font-size:12px;color:#5e6f7d;margin-top:3px}.fwcBadges{display:flex;gap:5px;flex-wrap:wrap}.fwcBadge{display:inline-block;padding:3px 7px;border-radius:999px;background:#e9f7ee;color:#17643a;font-size:11px;font-weight:900}.fwcBadge.warn{background:#fff3cd;color:#7a5200}.fwcEmpty{padding:18px;text-align:center;color:#687987}
      .fwcBack{margin:6px 0 10px}.fwcWorkspaceHead{border:1px solid #cfe0ed;background:#f3f9fd;border-radius:13px;padding:12px;margin-bottom:10px}.fwcWorkspaceTitle{font-size:22px;font-weight:900;color:#123f63}.fwcUnitGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.fwcUnit{border:1px solid #d8e3eb;border-radius:12px;padding:10px;background:#fff}.fwcUnit.mine{border-color:#76b98b;background:#f5fbf7}.fwcUnit h4{margin:0 0 6px;color:#194766}.fwcOwner{font-size:12px;font-weight:800;color:#31556f;margin:5px 0}.fwcTasks{margin:6px 0 0;padding-left:18px;color:#596a78;font-size:12px;line-height:1.45}.fwcUnitActions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.fwcNotice{font-size:11px;color:#6c7b87;margin-top:6px}.fwcModules{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
      @media(max-width:720px){.fwcUnitGrid{grid-template-columns:1fr}.fwcFlight{grid-template-columns:1fr}.fwcPanel{padding:10px}.fwcBtn{width:auto}.fwcFlight .fwcBtn{width:100%}}
    `;document.head.appendChild(st);
    const m=document.createElement('div');m.id='fwcModal';m.innerHTML=`<div class="fwcPanel"><div class="fwcHead"><div><h3>✈ CHUYẾN HÔM NAY · MY FLIGHT</h3></div><button class="fwcBtn gray" onclick="flightWorkspaceClose()">ĐÓNG</button></div><div id="fwcBody"></div></div>`;document.body.appendChild(m);
  }
  function status(msg,err=false){const e=document.getElementById('fwcStatus');if(e){e.textContent=msg||'';e.classList.toggle('err',!!err);e.style.display=msg?'block':'none'}}
  function moduleBadges(rec){try{return root.sagsFlightHubModuleBadges?.(rec)||[]}catch(_){return []}}
  function listHtml(date,flights){const arr=Object.values(flights||{}).filter(rec=>rec&&rec.rosterActive!==false&&U(rec.rosterStatus)!=='ROSTER_REMOVED').sort((a,b)=>recordTimeScore(a,'std')-recordTimeScore(b,'std')||S(a.depFlight||a.arrFlight||a.flightRaw).localeCompare(S(b.depFlight||b.arrFlight||b.flightRaw),'vi'));if(!arr.length)return '<div class="fwcEmpty">Ngày này chưa có chuyến.</div>';
    return arr.map(rec=>{const arrNo=S(rec.arrFlight),depNo=S(rec.depFlight),name=arrNo&&depNo&&U(arrNo)!==U(depNo)?`${arrNo} / ${depNo}`:S(rec.flightName||rec.flightRaw||depNo||arrNo||rec.flightId),mods=moduleBadges(rec),assign=rec.unitAssignments||{},owners=Object.keys(assign).filter(k=>assign[k]?.username).length;return `<div class="fwcFlight"><div><div class="fwcFlightTitle">${esc(name)}</div><div class="fwcMeta">${esc(rec.route||'')} · A/C ${esc(rec.acReg||'—')} · STA ${esc(rec.sta||'—')} · <b>STD ${esc(rec.std||'—')}</b></div><div class="fwcMeta">${esc(rec.flightId||'')}</div></div><div><div class="fwcBadges">${mods.length?mods.map(x=>`<span class="fwcBadge">${esc(x.kind)}: ${esc(x.status)}</span>`).join(''):'<span class="fwcBadge warn">CHƯA CÓ DỮ LIỆU NGHIỆP VỤ</span>'}</div><div class="fwcMeta">Đơn vị đã nhận: ${owners}/${UNITS.filter(x=>!x.requestOnly).length}</div></div><button class="fwcBtn" onclick="flightWorkspaceOpenFlight('${esc(rec.flightId)}')">MỞ CHUYẾN</button></div>`}).join('');}
  async function renderList(date){ensureUI();const body=document.getElementById('fwcBody');body.innerHTML=`<div class="fwcTools"><input id="fwcDate" type="date" value="${esc(date)}"><button class="fwcBtn" onclick="flightWorkspaceRefresh()">TẢI DANH SÁCH</button>${role()==='AD'?'<button class="fwcBtn green" onclick="flightWorkspacePickRoster()">📋 CHỌN DAILY ROSTER</button>':''}<button id="v1113QrScanDirect" class="fwcBtn green" type="button" onclick="sagsOpenQrScanner?.()">▣ QUÉT QR</button></div><div id="fwcStatus" class="fwcStatus">Đang tải danh sách chuyến…</div><div id="fwcList"></div>`;
    try{let [flights,manifest]=await Promise.all([readFlights(date),readManifest(date)]);flights=flightsWithManifestFallback(date,flights,manifest);const fixed=await reconcileRosterClaims(date,flights,manifest);cache={date,flights,manifest,selected:null};for(const [fid,rec] of Object.entries(flights||{}))root.sagsV338PrimeDossier?.(date,S(rec?.flightId||fid),rec);document.getElementById('fwcList').innerHTML=listHtml(date,flights);status('');}catch(e){status('Không tải được danh sách chuyến: '+S(e?.message||e),true)}}
  root.flightWorkspaceOpenList=function(date){ensureUI();document.getElementById('fwcModal').classList.add('show');return renderList(S(date)||today());};
  root.flightWorkspaceClose=function(){document.getElementById('fwcModal')?.classList.remove('show');};
  root.flightWorkspaceRefresh=function(){return renderList(S(document.getElementById('fwcDate')?.value)||cache.date||today());};
  root.flightWorkspacePickRoster=function(){if(role()!=='AD')return;let inp=document.getElementById('fwcRosterFile');if(!inp){inp=document.createElement('input');inp.id='fwcRosterFile';inp.type='file';inp.accept='.xlsx,.xlsm,.csv';inp.style.position='fixed';inp.style.left='-9999px';inp.addEventListener('change',async()=>{const f=inp.files?.[0];inp.value='';if(!f)return;try{status('Đang đọc DAILY ROSTER và tự tạo chuyến…');const ok=await root.dailyRosterLoadFile?.(f);if(ok)setTimeout(()=>root.flightWorkspaceRefresh?.(),500);}catch(e){status('Không tạo chuyến từ DAILY ROSTER: '+S(e?.message||e),true)}});document.body.appendChild(inp);}inp.click();};
  root.flightWorkspaceOpenFlight=function(fid){const rec=cache.flights?.[fid];if(!rec)return;cache.selected=fid;root.sagsV338PrimeDossier?.(cache.date,fid,rec);const body=document.getElementById('fwcBody'),myUnit=unitForProfile(),isAdmin=role()==='AD',mods=moduleBadges(rec);body.innerHTML=`<div class="fwcBack"><button class="fwcBtn gray" onclick="flightWorkspaceOpenList('${esc(cache.date)}')">← DANH SÁCH CHUYẾN</button></div><div class="fwcWorkspaceHead"><div class="fwcWorkspaceTitle">${esc((S(rec.arrFlight)&&S(rec.depFlight)&&U(rec.arrFlight)!==U(rec.depFlight))?`${S(rec.arrFlight)} / ${S(rec.depFlight)}`:S(rec.flightName||rec.flightRaw||rec.depFlight||rec.arrFlight||fid))}</div><div class="fwcMeta">${esc(rec.route||'')} · STA ${esc(rec.sta||'—')} · STD ${esc(rec.std||'—')} · A/C ${esc(rec.acReg||'—')} · ${esc(fid)}</div><div class="fwcModules">${mods.length?mods.map(x=>`<span class="fwcBadge">${esc(x.kind)}: ${esc(x.status)}</span>`).join(''):'<span class="fwcBadge warn">Chưa phát sinh dữ liệu module</span>'}</div></div><div class="fwcUnitGrid">${UNITS.map(u=>unitHtml(rec,u,myUnit,isAdmin)).join('')}</div>`;};
  function unitHtml(rec,u,myUnit,isAdmin){const a=rec.unitAssignments?.[u.key]||{},mine=myUnit===u.key,ownerUser=normUser(a.username),owner=S(a.name||a.username),rosterUsers=rosterUsersForUnit(rec,u.key,cache.manifest),meUser=normUser(me()),rosterLocked=rosterUsers.length>0,eligible=!rosterLocked||rosterUsers.includes(meUser),ownerValid=!ownerUser||!rosterLocked||rosterUsers.includes(ownerUser),isOwner=!!ownerUser&&ownerUser===meUser&&ownerValid,canClaim=!u.requestOnly&&!owner&&mine&&eligible;const rosterLine=rosterLocked?`<div class="fwcNotice"><b>DAILY ROSTER:</b> ${esc(rosterUsers.join(', '))}${mine&&!eligible?' · Tài khoản này không được phân nhiệm vụ.':''}${ownerUser&&!ownerValid?' · ⚠ Người đang nhận KHÔNG KHỚP roster.':''}</div>`:'';return `<div class="fwcUnit ${mine?'mine':''}"><h4>${u.icon} ${esc(u.label)}</h4><div class="fwcOwner">${u.requestOnly?'Loại công việc: tiếp nhận yêu cầu theo sự kiện':`Người phụ trách: ${owner?esc(owner):'<span style="color:#9b1c1c">CHƯA NHẬN</span>'}`}</div>${rosterLine}<ul class="fwcTasks">${u.tasks.map(t=>`<li>${esc(t)}</li>`).join('')}</ul><div class="fwcUnitActions">${canClaim?`<button class="fwcBtn green" onclick="flightWorkspaceClaim('${esc(rec.flightId)}','${u.key}')">NHẬN CÔNG VIỆC</button>`:''}${isOwner?'<span class="fwcBadge">BẠN ĐANG PHỤ TRÁCH</span>':''}${ownerUser&&!ownerValid?'<span class="fwcBadge warn">⚠ NHẬN SAI DAILY ROSTER</span>':''}${mine&&rosterLocked&&!eligible?'<span class="fwcBadge warn">KHÔNG ĐÚNG NGƯỜI ROSTER</span>':''}${isAdmin&&!u.requestOnly?`<span class="fwcNotice">AD theo dõi; đổi người phải dùng CHUYỂN/BÀN GIAO theo quy trình.</span>`:''}</div>${!myUnit&&!isAdmin?'<div class="fwcNotice">Tài khoản chưa map được đơn vị; AD cần kiểm tra Department/Group/Role trong hồ sơ.</div>':''}</div>`;}
  root.flightWorkspaceClaim=async function(fid,unit){try{const rec=cache.flights?.[fid];if(!rec)throw new Error('Không tìm thấy chuyến.');const myUnit=unitForProfile();if(myUnit!==unit)throw new Error('Tài khoản không thuộc đơn vị này.');const liveManifest=await readManifest(cache.date),rosterUsers=rosterUsersForUnit(rec,unit,liveManifest),meUser=normUser(me());cache.manifest=liveManifest;if(rosterUsers.length&&!rosterUsers.includes(meUser))throw new Error(`DAILY ROSTER đã phân nhiệm vụ cho ${rosterUsers.join(', ')}. Tài khoản ${meUser||'hiện tại'} không được nhận thay. Tài khoản hiện tại không được phân công nhận thay.`);const snap=await dbref(`${ROOT}/${safe(cache.date)}/${safe(fid)}/unitAssignments/${safe(unit)}`).once('value'),current=snap.val()||null;if(current?.username)throw new Error(`Đơn vị đã có người phụ trách: ${S(current.name||current.username)}. Vui lòng kiểm tra lại phân công.`);const t=Date.now(),p=profile(),value={unit,username:meUser||me(),name:myName(),departmentCode:S(p.departmentCode||p.systemDepartment||p.department),groupCode:S(p.groupCode||p.group),claimedAtMs:t,updatedAtMs:t,status:'ACTIVE',claimSource:rosterUsers.length?'DAILY_ROSTER':'OPEN_UNIT',rosterEligibleUsers:rosterUsers};await dbref(`${ROOT}/${safe(cache.date)}/${safe(fid)}/unitAssignments/${safe(unit)}`).set(value);cache.flights[fid].unitAssignments=cache.flights[fid].unitAssignments||{};cache.flights[fid].unitAssignments[unit]=value;root.flightWorkspaceOpenFlight(fid);}catch(e){alert('Không nhận được công việc: '+S(e?.message||e));}};
  function installButton(){const bar=document.querySelector('.toolbar-row.main-actions');if(!bar)return;let b=document.getElementById('roleBtnRosterFlights');if(!b){b=document.createElement('button');b.id='roleBtnRosterFlights';b.textContent='✈ CHUYẾN HÔM NAY';bar.appendChild(b);}b.onclick=()=>root.flightWorkspaceOpenList();b.style.display=role()?'inline-flex':'none';}
  function sync(){ensureUI();installButton();const b=document.getElementById('roleBtnRosterFlights');if(b)b.onclick=()=>root.flightWorkspaceOpenList();}
  const base=root.applyRoleUI;if(typeof base==='function')root.applyRoleUI=function(){const r=base.apply(this,arguments);setTimeout(sync,0);return r};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(sync,100),{once:true});else setTimeout(sync,100);
  window.addEventListener('pageshow',()=>setTimeout(sync,80),{passive:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(sync,80)},{passive:true});
  root.__FLIGHT_WORKSPACE_V33_TEST__={rosterUnit,sameRosterFlight,rosterUsersForUnit,normUser,reconcileRosterClaims};
  root.__FLIGHT_WORKSPACE_BUILD=BUILD;
})(typeof window!=='undefined'?window:globalThis);

/* ===== END flight-workspace-core.js ===== */
}
if(phase==='control'){

/* ===== BEGIN multitask-crosscheck-v36.js ===== */
/* E-REPORT/SAGS V3.6 · STICKY FLIGHT WORKSPACE + MULTITASK + CROSSCHECK COMPLETE */
(function(root){'use strict';
const BUILD='V3.6-20260821-01', ROOT='flight_records', MANIFEST='roster_manifests', AUDIO='./alert-crosscheck-complete.mp3';
const S=v=>String(v??'').trim(),U=v=>S(v).toUpperCase(),safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_'),esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normUser=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}};
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const sess=()=>{try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}}, role=()=>U(sess().role||sess().profile?.role), me=()=>normUser(sess().profile?.username||(role()==='AD'?'AD':''));
function dbref(path){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase RTDB chưa sẵn sàng.');return root.sagsV470Ref(path)}
function timeScore(v){const raw=S(v),plus=/\+\s*$/.test(raw),s=raw.replace(/[^0-9]/g,'');if(s.length<3)return 99999;return (plus?1440:0)+Number(s.slice(0,-2))*60+Number(s.slice(-2))}
function recordTimeScore(rec,key='std'){const n=Number(rec?.[`${key}SortMinute`]);return Number.isFinite(n)&&n>=0?n:timeScore(rec?.[key])}
const flightName=r=>S(r?.depFlight||r?.arrFlight||r?.flightName||r?.flightRaw||r?.flightId);
const opDate=()=>S(sessionStorage.getItem('sagsV36FwcDate'))||S(document.getElementById('fwcDate')?.value)||today(), selected=()=>S(sessionStorage.getItem('sagsV36FwcSelected'));
function setCtx(d,f=''){if(d)sessionStorage.setItem('sagsV36FwcDate',d);if(f)sessionStorage.setItem('sagsV36FwcSelected',f);else sessionStorage.removeItem('sagsV36FwcSelected')}
function css(){if(document.getElementById('sags-v36-style'))return;const e=document.createElement('style');e.id='sags-v36-style';e.textContent=`
#fwcModal{padding:max(6px,env(safe-area-inset-top)) max(6px,env(safe-area-inset-right)) max(6px,env(safe-area-inset-bottom)) max(6px,env(safe-area-inset-left))!important}
#fwcModal .fwcPanel{max-height:calc(100dvh - max(12px,env(safe-area-inset-top)) - max(12px,env(safe-area-inset-bottom)))!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;padding:12px!important}
#fwcModal .fwcHead{flex:0 0 auto;background:#fff;z-index:4;padding-bottom:8px;border-bottom:1px solid #e3eaf0}#fwcStickyNav{display:none;flex:0 0 auto;gap:7px;flex-wrap:wrap;align-items:center;background:#fff;padding:8px 0;border-bottom:1px solid #e5ebf0;z-index:4}#fwcStickyNav.show{display:flex}#fwcBody{flex:1 1 auto;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;padding-top:4px}#fwcBody>.fwcBack{display:none!important}.fwcMultiBtn{background:#5b21b6!important;color:#fff!important}.fwcMultiCount{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 5px;margin-left:5px;border-radius:999px;background:#fff;color:#5b21b6;font:900 10px Arial}
#fwcMultitaskModal{position:fixed;inset:0;z-index:52040;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.58);padding:max(12px,env(safe-area-inset-top)) 10px max(12px,env(safe-area-inset-bottom));box-sizing:border-box;font-family:Arial}#fwcMultitaskModal.show{display:flex}.fwcMultiPanel{width:min(94vw,620px);max-height:88dvh;overflow:hidden;background:#fff;border-radius:16px;box-shadow:0 18px 55px rgba(0,0,0,.34);display:flex;flex-direction:column}.fwcMultiHead{padding:13px 14px 10px;border-bottom:1px solid #dbe4eb;display:flex;justify-content:space-between;gap:10px}.fwcMultiTitle{font:900 18px Arial;color:#183f62}.fwcMultiSub{font:700 11px/1.4 Arial;color:#687784;margin-top:3px}.fwcMultiList{padding:9px;overflow:auto}.fwcMultiItem{width:100%;display:grid;grid-template-columns:1fr auto;gap:9px;align-items:center;text-align:left;border:1px solid #d8e3eb;border-radius:12px;padding:10px;margin:7px 0;background:#fff}.fwcMultiItem.active{border:2px solid #0b67b2;background:#f0f7fd}.fwcMultiItem.alert{border-color:#d97706;background:#fff8e8}.fwcMultiName{font:900 16px Arial;color:#173f60}.fwcMultiMeta{font:700 11px/1.45 Arial;color:#647584;margin-top:3px}.fwcMultiState{font:900 10px Arial;padding:4px 7px;border-radius:999px;background:#e8f5ed;color:#17663b}.fwcMultiOpen{display:grid;grid-template-columns:1fr auto;gap:9px;align-items:center;width:100%;border:0;background:transparent;text-align:left;padding:0;color:inherit}.fwcMultiDone{grid-column:1/-1;border:1px solid #c8d3dd;border-radius:8px;background:#f5f8fa;color:#42586b;padding:7px 9px;font:900 10px Arial}.fwcMultiEmpty{padding:24px 14px;text-align:center;color:#657786;font:700 13px/1.5 Arial}
#sagsCxDoneV36{position:fixed;inset:0;z-index:53050;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.42);padding:14px;box-sizing:border-box;font-family:Arial}#sagsCxDoneV36.show{display:flex}.sagsCxDoneCard{width:min(92vw,470px);background:#fff;border:4px solid #16a34a;border-radius:18px;box-shadow:0 20px 65px rgba(0,0,0,.42);padding:18px;text-align:center}.sagsCxDoneIcon{font-size:46px}.sagsCxDoneTitle{margin-top:7px;color:#08783b;font:900 22px/1.15 Arial}.sagsCxDoneFlight{margin-top:10px;color:#173f60;font:900 18px Arial}.sagsCxDoneText{margin-top:7px;color:#4b5d6a;font:700 13px/1.5 Arial}.sagsCxDoneActions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:15px}.sagsCxDoneActions button{border:0;border-radius:10px;padding:11px 10px;font:900 12px Arial}.sagsCxDoneOpen{background:#0b67b2;color:#fff}.sagsCxDoneAck{background:#e9eef3;color:#33485b}
@media(max-width:620px){#fwcModal .fwcPanel{padding:9px!important}.fwcHead h3{font-size:16px}.fwcSub{font-size:10.5px}.fwcStickyNav .fwcBtn{padding:8px 9px;font-size:11px}.fwcMultiItem{grid-template-columns:1fr}.sagsCxDoneActions{grid-template-columns:1fr}}`;document.head.appendChild(e)}
function modal(){if(!document.getElementById('fwcMultitaskModal')){const m=document.createElement('div');m.id='fwcMultitaskModal';m.innerHTML=`<div class="fwcMultiPanel"><div class="fwcMultiHead"><div><div class="fwcMultiTitle">⇄ MULTITASK · CHUYẾN ĐANG LÀM</div></div><button class="fwcBtn gray" onclick="sagsV36CloseMultitask()">ĐÓNG</button></div><div id="fwcMultiStatus" class="fwcStatus" style="margin:9px 9px 0">Đang tải…</div><div id="fwcMultiList" class="fwcMultiList"></div></div>`;document.body.appendChild(m)}if(!document.getElementById('sagsCxDoneV36')){const m=document.createElement('div');m.id='sagsCxDoneV36';m.innerHTML=`<div class="sagsCxDoneCard"><div class="sagsCxDoneIcon">✅</div><div class="sagsCxDoneTitle">ĐÃ HOÀN TẤT CROSSCHECK</div><div id="sagsCxDoneFlight" class="sagsCxDoneFlight"></div><div id="sagsCxDoneText" class="sagsCxDoneText"></div><div class="sagsCxDoneActions"><button class="sagsCxDoneOpen" onclick="sagsV36OpenCxFlight()">MỞ CHUYẾN</button><button class="sagsCxDoneAck" onclick="sagsV36AckCxDone()">ĐÃ BIẾT</button></div></div>`;document.body.appendChild(m)}}
function sticky(){css();modal();const p=document.querySelector('#fwcModal .fwcPanel'),h=p?.querySelector('.fwcHead'),b=document.getElementById('fwcBody');if(!p||!h||!b)return null;let n=document.getElementById('fwcStickyNav');if(!n){n=document.createElement('div');n.id='fwcStickyNav';h.insertAdjacentElement('afterend',n)}return n}
function navFlight(fid){const n=sticky();if(!n)return;n.innerHTML=`<button class="fwcBtn gray" onclick="flightWorkspaceOpenList('${esc(opDate())}')">← DANH SÁCH CHUYẾN</button><button id="fwcMultitaskBtn" class="fwcBtn fwcMultiBtn" onclick="sagsV36OpenMultitask()">⇄ MULTITASK<span id="fwcMultitaskCount" class="fwcMultiCount">…</span></button>`;n.classList.add('show');setCtx(opDate(),fid);multiAdd(fid);setTimeout(count,50)}
function navList(d){const n=sticky();if(n){n.innerHTML='';n.classList.remove('show')}setCtx(d||today(),'')}
function multiKey(){return `sagsV323Multi:${me()||'UNKNOWN'}:${opDate()}`}
function multiSet(){try{return new Set(JSON.parse(sessionStorage.getItem(multiKey())||'[]').map(S).filter(Boolean))}catch(_){return new Set()}}
function multiSave(set){try{sessionStorage.setItem(multiKey(),JSON.stringify([...set].filter(Boolean)))}catch(_){}}
function multiAdd(fid){fid=S(fid);if(!fid)return;const set=multiSet();set.add(fid);multiSave(set)}
function multiRemove(fid){const set=multiSet();set.delete(S(fid));multiSave(set)}
async function assignedData(){
  const d=opDate(),u=me();if(!u)throw new Error('Không xác định được tài khoản.');
  const [a,b]=await Promise.all([dbref(`${ROOT}/${safe(d)}`).once('value'),dbref(`${MANIFEST}/${safe(d)}`).once('value')]),fl=a.val()||{},man=b.val()||{},ids=new Set();
  Object.values(fl).forEach(r=>Object.values(r?.unitAssignments||{}).forEach(x=>{if(normUser(x?.username)===u&&S(r.flightId))ids.add(S(r.flightId))}));
  Object.values(man?.items||{}).forEach(x=>{
    if(x?.active===false||normUser(x?.user||x?.targetUser)!==u)return;
    const fid=S(x?.flightId)||S(root.sagsV346ResolveRosterFlightId?.(d,x,fl));if(fid)ids.add(fid);
  });
  if(role()==='AD'&&selected())ids.add(selected());
  const list=[...ids].map(id=>fl[id]).filter(Boolean).sort((x,y)=>recordTimeScore(x,'std')-recordTimeScore(y,'std')||flightName(x).localeCompare(flightName(y),'vi'));return {d,list}
}
async function data(){const all=await assignedData(),set=multiSet(),cur=selected();if(cur&&all.list.some(r=>S(r.flightId)===cur)){set.add(cur);multiSave(set)}const list=all.list.filter(r=>set.has(S(r.flightId)));const clean=new Set(list.map(r=>S(r.flightId)));if([...set].some(id=>!clean.has(id)))multiSave(clean);return {d:all.d,list,totalMyFlight:all.list.length}}
function alerting(r){const x=r?.modules?.FINAL||{},s=U(x.crosscheckStatus||'');return !!s&&!/(COMPLETE|COMPLETED|OK)/.test(s)}
async function count(){const e=document.getElementById('fwcMultitaskCount');if(!e)return;try{e.textContent=String((await data()).list.length)}catch(_){e.textContent='0'}}
root.sagsV36OpenMultitask=async()=>{sticky();const m=document.getElementById('fwcMultitaskModal'),l=document.getElementById('fwcMultiList'),s=document.getElementById('fwcMultiStatus');m?.classList.add('show');if(l)l.innerHTML='';try{const d=await data();if(s){s.classList.remove('err');s.textContent=`ĐANG LÀM CÙNG LÚC: ${d.list.length} · MY FLIGHT: ${d.totalMyFlight}`;}const mb=document.getElementById('v38NavMulti');if(mb)mb.textContent=`⇄ MULTITASK · ${d.list.length}`;if(!d.list.length){if(l)l.innerHTML='<div class="fwcMultiEmpty"><b>MULTITASK = 0</b><br>Chưa có chuyến nào đang làm đồng thời. Mở chuyến trong MY FLIGHT để đưa vào MULTITASK.</div>';return}const cur=selected();if(l)l.innerHTML=d.list.map(r=>`<div class="fwcMultiItem ${S(r.flightId)===cur?'active':''} ${alerting(r)?'alert':''}"><button class="fwcMultiOpen" onclick="sagsV36SwitchFlight('${esc(r.flightId)}')"><div><div class="fwcMultiName">${esc(flightName(r))}</div><div class="fwcMultiMeta">${esc(r.route||'')} · STA ${esc(r.sta||'—')} · STD ${esc(r.std||'—')} · A/C ${esc(r.acReg||'—')}</div></div><span class="fwcMultiState">${S(r.flightId)===cur?'ĐANG MỞ':alerting(r)?'⚠ CẦN CHÚ Ý':'ĐANG LÀM'}</span></button><button class="fwcMultiDone" onclick="sagsV323FinishMultitask('${esc(r.flightId)}')">✓ XONG / BỎ MULTI</button></div>`).join('')}catch(e){if(s){s.textContent='Không tải được Multitask: '+S(e?.message||e);s.classList.add('err')}}};
root.sagsV36CloseMultitask=()=>document.getElementById('fwcMultitaskModal')?.classList.remove('show');root.sagsV36SwitchFlight=f=>{multiAdd(f);root.sagsV36CloseMultitask();setCtx(opDate(),f);root.flightWorkspaceOpenFlight?.(f)};root.sagsV323FinishMultitask=f=>{f=S(f);const wasCurrent=selected()===f;if(wasCurrent)setCtx(opDate(),'');multiRemove(f);if(wasCurrent){root.sagsV36CloseMultitask();root.flightWorkspaceOpenList?.(opDate());setTimeout(count,80)}else{count();setTimeout(()=>root.sagsV36OpenMultitask?.(),20)}};
root.sagsV36OpenFlightByToken=async token=>{const d=opDate(),k=U(token).replace(/[^A-Z0-9]/g,'');if(!k)return false;try{const fl=(await dbref(`${ROOT}/${safe(d)}`).once('value')).val()||{},r=Object.values(fl).find(x=>[x?.depFlight,x?.arrFlight,x?.flightRaw,x?.flightName].some(v=>U(v).replace(/[^A-Z0-9]/g,'').includes(k)));if(!r?.flightId)return false;root.flightWorkspaceOpenList?.(d);setTimeout(()=>root.flightWorkspaceOpenFlight?.(r.flightId),120);return true}catch(_){return false}};
let done=null,audio=null,primed=false,q=[],retry=0;const seenKey=m=>`sagsV36CxDone:${S(m?.eventKey||m?.eventAtMs||`${m?.package?.parentDocId}:R${m?.package?.revisionNo}`)}`;const seen=m=>{try{return sessionStorage.getItem(seenKey(m))==='1'}catch(_){return false}},mark=m=>{try{sessionStorage.setItem(seenKey(m),'1')}catch(_){}};
function prime(){if(primed)return;primed=true;try{audio=new Audio(AUDIO);audio.muted=true;const p=audio.play();p?.then?.(()=>{audio.pause();audio.currentTime=0;audio.muted=false}).catch(()=>primed=false)}catch(_){primed=false}}
function sound(){try{if(!audio)audio=new Audio(AUDIO);audio.pause();audio.currentTime=0;audio.muted=false;audio.volume=1;audio.play()?.catch?.(()=>{})}catch(_){ }try{navigator.vibrate?.([220,90,220,90,380])}catch(_){}}
function blocked(){return document.getElementById('finalPaperNotifyToast')?.style.display==='block'||document.getElementById('rhNotice')?.classList.contains('show')||!!document.querySelector('#opsAlertTrayScroller .opsAlertCard')}
function schedule(){clearTimeout(retry);retry=setTimeout(()=>{if(done||blocked()||!q.length){if(q.length)schedule();return}show(q.shift(),true)},500)}
function show(mail,fromQ=false){if(role()!=='DH'||seen(mail))return false;const key=S(mail?.eventKey||mail?.eventAtMs);if(!fromQ&&(done||blocked())){if(!q.some(x=>S(x?.eventKey||x?.eventAtMs)===key))q.push(mail);schedule();return true}modal();done=mail;const p=mail.package||{},f=S(p.identity?.flightToken||p.identity?.flightRaw||'');document.getElementById('sagsCxDoneFlight').textContent=f?`CHUYẾN ${f}`:`FINAL LẦN ${p.revisionNo||1}`;document.getElementById('sagsCxDoneText').innerHTML=`CBTT đã xác nhận <b>FINAL lần ${esc(p.revisionNo||1)}</b> hoàn tất CROSSCHECK${p.attemptNo?` · CHECK lần ${esc(p.attemptNo)}`:''}.`;document.getElementById('sagsCxDoneV36')?.classList.add('show');sound();return true}
root.sagsV36AckCxDone=()=>{if(done)mark(done);document.getElementById('sagsCxDoneV36')?.classList.remove('show');done=null;if(q.length)schedule()};root.sagsV36OpenCxFlight=async()=>{const m=done,p=m?.package||{},t=S(p.identity?.flightToken||p.identity?.flightRaw||'');if(m)mark(m);document.getElementById('sagsCxDoneV36')?.classList.remove('show');done=null;if(q.length)schedule();if(t&&await root.sagsV36OpenFlightByToken(t))return;root.flightWorkspaceOpenList?.(opDate())};
function patch(){let n=0,t=setInterval(()=>{if(typeof root.flightWorkspaceOpenFlight==='function'&&typeof root.flightWorkspaceOpenList==='function'){clearInterval(t);if(!root.flightWorkspaceOpenFlight.__v36){const f=root.flightWorkspaceOpenFlight,l=root.flightWorkspaceOpenList,c=root.flightWorkspaceClose;root.flightWorkspaceOpenFlight=function(id){const r=f.apply(this,arguments);setTimeout(()=>{sticky();document.querySelector('#fwcBody>.fwcBack')?.remove();navFlight(id)},0);return r};root.flightWorkspaceOpenFlight.__v36=1;root.flightWorkspaceOpenList=function(d){d=S(d)||today();const r=l.apply(this,arguments);navList(d);Promise.resolve(r).finally(()=>setTimeout(()=>navList(d),0));return r};root.flightWorkspaceClose=function(){root.sagsV36CloseMultitask();return c?.apply(this,arguments)}}sticky()}else if(++n>60)clearInterval(t)},200);n=0;t=setInterval(()=>{if(typeof root.cxCleanShowToast==='function'){clearInterval(t);if(!root.cxCleanShowToast.__v36){const b=root.cxCleanShowToast;root.cxCleanShowToast=function(m){if(S(m?.eventType)==='COMPLETE_OK'&&role()==='DH'&&show(m))return;return b.apply(this,arguments)};root.cxCleanShowToast.__v36=1}}else if(++n>60)clearInterval(t)},250)}
function boot(){css();modal();patch();document.addEventListener('pointerdown',prime,{once:true,capture:true});document.addEventListener('keydown',prime,{once:true,capture:true})}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,60),{once:true});else setTimeout(boot,60);root.__SAGS_V36_BUILD=BUILD;
})(typeof window!=='undefined'?window:globalThis);

/* ===== END multitask-crosscheck-v36.js ===== */

/* ===== BEGIN permission-authority-v31.js ===== */
/* E-REPORT/SAGS V3.1 · Permission live-refresh hardening */
(()=>{
  'use strict';
  const norm=o=>{const out={};if(!o||typeof o!=='object')return out;Object.keys(o).sort().forEach(k=>{if(typeof o[k]==='boolean')out[k]=!!o[k];});return out;};
  try{
    const verifyBase=window.verifyPersonalSession;
    if(typeof verifyBase==='function' && !verifyBase.__v31Wrapped){
      const wrapped=async function(force=false){
        const beforeRev=Number(currentUserProfile?.permissionRevV485||0),before=JSON.stringify(norm(currentUserProfile?.featureOverridesV485));
        const out=await verifyBase.call(this,force);
        const afterRev=Number(currentUserProfile?.permissionRevV485||0),after=JSON.stringify(norm(currentUserProfile?.featureOverridesV485));
        if(beforeRev!==afterRev||before!==after){
          try{applyRoleUI?.();}catch(e){}
          try{updateFormMenuForCurrentFlight?.();}catch(e){}
        }
        return out;
      };
      wrapped.__v31Wrapped=true;
      window.verifyPersonalSession=wrapped;
      try{verifyPersonalSession=wrapped;}catch(e){}
    }
  }catch(e){console.info('V3.1 permission verify wrapper',e?.message||e);}
  const restart=()=>{try{if(currentUserProfile?.username&&typeof v485StartPermissionSignal==='function')v485StartPermissionSignal();}catch(e){}};
  setTimeout(restart,700);
  window.addEventListener('pageshow',()=>setTimeout(restart,80),{passive:true});
})();

/* ===== END permission-authority-v31.js ===== */

/* ===== BEGIN quick-time-save-v32.js ===== */
/* E-REPORT SAGS · V3.2 QUICK TIME SAVE RELIABILITY
 * 2026-08-21
 * Fixes mobile/iOS cases where the visible quick-entry input value had not yet
 * been committed to the internal draft when UPDATE/tab navigation was tapped.
 */
(function(){
  'use strict';
  const BUILD='V3.2-20260821-01';
  const S=v=>String(v??'').trim();

  function callInputHandler(el,name){
    if(!el)return;
    try{
      const fn=window[name];
      if(typeof fn==='function'){fn(el);return;}
    }catch(_){ }
    try{el.dispatchEvent(new Event('input',{bubbles:true}));}catch(_){ }
  }

  function flushRampQuickDom(){
    try{
      document.querySelectorAll('#quickTimeBody .quickTimeInput[data-key]').forEach(el=>callInputHandler(el,'qteInputChanged'));
    }catch(e){console.warn('[V3.2 QUICK TIME] flush ramp',e);}
  }

  function flushFs09QuickDom(){
    try{
      document.querySelectorAll('#fs09qBody .fs09qInput[data-key]').forEach(el=>callInputHandler(el,'fs09qTimeInput'));
      document.querySelectorAll('#fs09qBody .fs09qDataInput[data-key],#fs09qBody .fs09qTextArea[data-key]').forEach(el=>callInputHandler(el,'fs09qDataChanged'));
    }catch(e){console.warn('[V3.2 QUICK TIME] flush fs09',e);}
  }

  function normalizeTime(v){
    v=S(v);
    if(!v)return '';
    if(v.toUpperCase()==='N/A')return 'N/A';
    let d=v.replace(/\D/g,'').slice(0,4);
    if(d.length===3)d='0'+d;
    if(d.length!==4)return null;
    const h=Number(d.slice(0,2)),m=Number(d.slice(2));
    if(!Number.isInteger(h)||!Number.isInteger(m)||h<0||h>23||m<0||m>59)return null;
    return d.slice(0,2)+':'+d.slice(2);
  }

  function captureExpected(selector){
    const out=[];
    try{
      document.querySelectorAll(selector).forEach(el=>{
        const key=S(el.dataset?.key);if(!key)return;
        const v=normalizeTime(el.value);
        if(v!==null)out.push([key,v]);
      });
    }catch(_){ }
    return out;
  }

  function repairState(expected,label){
    let changed=false;
    try{
      if(typeof state==='undefined'||!state)return false;
      for(const [key,value] of expected){
        const cur=S(state[key]);
        if(value===''){
          if(Object.prototype.hasOwnProperty.call(state,key)){delete state[key];changed=true;}
        }else if(cur!==value){
          state[key]=value;changed=true;
          try{clearTimeSkipFlag?.(key);}catch(_){ }
        }
      }
      if(changed){
        try{persist?.();}catch(e){console.warn('[V3.2 QUICK TIME] persist repair '+label,e);}
        try{draw?.();}catch(_){ }
      }
    }catch(e){console.warn('[V3.2 QUICK TIME] repair '+label,e);}
    return changed;
  }

  function install(){
    if(window.__SAGS_QUICK_TIME_V32_INSTALLED)return true;
    const qSave=window.qteSaveCompact;
    const qPage=window.qteGoPage;
    const fSave=window.fs09qSave;
    const fPage=window.fs09qGoPage;
    if(typeof qSave!=='function'||typeof fSave!=='function')return false;
    window.__SAGS_QUICK_TIME_V32_INSTALLED=BUILD;

    window.qteSaveCompact=function(){
      flushRampQuickDom();
      const expected=captureExpected('#quickTimeBody .quickTimeInput[data-key]');
      const r=qSave.apply(this,arguments);
      const repaired=repairState(expected,'RAMP');
      if(repaired){
        const st=document.getElementById('quickTimeSaveStatus');
        if(st)st.textContent='ĐÃ CẬP NHẬT';
      }
      return r;
    };

    if(typeof qPage==='function')window.qteGoPage=function(){
      flushRampQuickDom();
      return qPage.apply(this,arguments);
    };

    window.fs09qSave=function(){
      flushFs09QuickDom();
      const expected=captureExpected('#fs09qBody .fs09qInput[data-key]');
      const r=fSave.apply(this,arguments);
      const repaired=repairState(expected,'FSAGS09');
      if(repaired){
        const st=document.getElementById('fs09qStatus');
        if(st)st.textContent='ĐÃ CẬP NHẬT';
      }
      return r;
    };

    if(typeof fPage==='function')window.fs09qGoPage=function(){
      flushFs09QuickDom();
      return fPage.apply(this,arguments);
    };

    // Extra safety for iOS: commit the field on change/blur as well as input.
    document.addEventListener('change',ev=>{
      const el=ev.target;
      if(el?.matches?.('#quickTimeBody .quickTimeInput[data-key]'))callInputHandler(el,'qteInputChanged');
      else if(el?.matches?.('#fs09qBody .fs09qInput[data-key]'))callInputHandler(el,'fs09qTimeInput');
      else if(el?.matches?.('#fs09qBody .fs09qDataInput[data-key],#fs09qBody .fs09qTextArea[data-key]'))callInputHandler(el,'fs09qDataChanged');
    },true);

    return true;
  }

  function boot(){
    if(install())return;
    let n=0;const t=setInterval(()=>{n++;if(install()||n>40)clearInterval(t);},100);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

/* ===== END quick-time-save-v32.js ===== */

/* V3.31: unused Pilot Control module removed. */

/* ===== BEGIN clean-workflow-v38.js ===== */
/* E-REPORT/SAGS V3.8 · CLEAN WORKFLOW UI
 * Clean workflow shell.
 * Flow: Login -> Flight list -> MY FLIGHT filter -> Flight Workspace -> assigned operational module.
 * Legacy operational functions remain as engines, but old role-specific toolbar/menu entry points are hidden.
 */
(function(root){'use strict';
  const BUILD='V3.8-20260821-01';
  const ROOT='flight_records', MANIFEST='roster_manifests';
  const S=v=>String(v??'').trim(), U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normUser=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}};
  const today=()=>{const d=new Date(),iso=x=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`,cur=iso(d),p=new Date(d);p.setDate(p.getDate()-1);const prev=iso(p),saved=S(sessionStorage.getItem('sagsV36FwcDate'));if(saved===cur||saved===prev)return saved;return d.getHours()<4?prev:cur};
  function session(){try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}}
  function profile(){return session().profile||root.currentUserProfile||{}}
  function role(){return U(session().role||profile().role)}
  function me(){const p=profile();return normUser(p.username||(role()==='AD'?'AD':''))}
  function logged(){return !!role()&&!!me()}
  function isAD(){return role()==='AD'}
  function dbref(path){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase RTDB chưa sẵn sàng.');return root.sagsV470Ref(path)}
  function canFeature(k){try{return isAD()||typeof root.v485Can!=='function'||!!root.v485Can(k)}catch(_){return isAD()}}
  function dateFromUi(){return S(document.getElementById('fwcDate')?.value)||S(sessionStorage.getItem('sagsV36FwcDate'))||today()}
  function flightIdFromCard(card){const s=S(card?.querySelector('button[onclick*="flightWorkspaceOpenFlight"]')?.getAttribute('onclick'));return s.match(/flightWorkspaceOpenFlight\(['"]([^'"]+)['"]\)/)?.[1]||''}
  function flightName(rec){const a=S(rec?.arrFlight),d=S(rec?.depFlight);return a&&d&&U(a)!==U(d)?`${a} / ${d}`:S(rec?.flightName||rec?.flightRaw||d||a||rec?.flightId)}
  function normFlight(v){return U(v).replace(/[^A-Z0-9]/g,'')}
  function splitFlightTokens(raw){const out=[],s=U(raw).replace(/[\/]+/g,' ');let prefix='';for(const p0 of s.split(/\s+/).filter(Boolean)){const p=p0.replace(/[^A-Z0-9]/g,'');let m=/^([A-Z0-9]{2,3}?)(\d{1,5})$/.exec(p);if(m&&/[A-Z]/.test(m[1])){prefix=m[1];out.push(prefix+m[2]);continue}m=/^(\d{1,5})$/.exec(p);if(m&&prefix)out.push(prefix+m[1])}return [...new Set(out)]}
  function rosterFlightTokens(item){return [...new Set([normFlight(item?.arrFlight),normFlight(item?.depFlight),...splitFlightTokens(item?.flightRaw),...splitFlightTokens(item?.flightName)].filter(Boolean))]}
  function v1130ManifestFlightFallback(date,flights,manifest){
    const out={...(flights||{})};
    for(const item of Object.values(manifest?.items||{})){
      if(!item||item.active===false)continue;let fid=S(item.flightId);try{if(!fid&&typeof root.sagsFlightHubFlightId==='function')fid=S(root.sagsFlightHubFlightId(date,item.arrFlight||'',item.depFlight||'',item.flightRaw||item.flightName||''))}catch(_){}
      if(!fid)continue;const old=out[fid]||{};out[fid]={...old,flightId:fid,opDate:S(old.opDate||date),flightRaw:S(old.flightRaw||item.flightRaw||item.flightName),flightName:S(old.flightName||item.flightName||item.assignmentFlight||item.flightRaw),arrFlight:S(old.arrFlight||item.arrFlight),depFlight:S(old.depFlight||item.depFlight),route:S(old.route||item.route),acReg:S(old.acReg||item.acReg),acType:S(old.acType||item.acType),bay:S(old.bay||item.bay),sta:S(old.sta||item.sta),std:S(old.std||item.std),eta:S(old.eta||item.eta),etd:S(old.etd||item.etd),rosterActive:old.rosterActive!==false,rosterStatus:U(old.rosterStatus)==='ROSTER_REMOVED'?'ROSTER_REMOVED':'ACTIVE',unitAssignments:old.unitAssignments||{},createdFrom:S(old.createdFrom||'ROSTER_MANIFEST_FALLBACK')};
    }
    return out;
  }
  function resolveRosterFlightId(date,item,flights={}){
    if(!item||item.active===false)return '';
    const direct=S(item.flightId);if(direct&&(!flights||!Object.keys(flights).length||flights[direct]))return direct;
    let derived='';try{if(typeof root.sagsFlightHubFlightId==='function')derived=S(root.sagsFlightHubFlightId(date,item?.arrFlight||'',item?.depFlight||'',item?.flightRaw||item?.flightName||''))}catch(_){ }
    if(derived&&(!flights||!Object.keys(flights).length||flights?.[derived]))return S(flights?.[derived]?.flightId||derived);
    const wanted=new Set(rosterFlightTokens(item));if(!wanted.size)return '';
    const hits=[];for(const [key,rec] of Object.entries(flights||{})){if(!rec||rec.rosterActive===false||U(rec.rosterStatus)==='ROSTER_REMOVED')continue;const common=rosterFlightTokens(rec).filter(x=>wanted.has(x)).length;if(common)hits.push({fid:S(rec.flightId||key),score:common})}
    hits.sort((a,b)=>b.score-a.score);return hits.length&&(!hits[1]||hits[0].score>hits[1].score)?hits[0].fid:'';
  }
  root.sagsV346ResolveRosterFlightId=resolveRosterFlightId;
  function rosterItemMatches(item,fid){return item&&item.active!==false&&resolveRosterFlightId(dataCache.date||dateFromUi(),item,dataCache.flights)===S(fid)}
  function myFilterKey(){return `sagsV38MyFlight:${me()||'ANON'}`}
  function myOnlyDefault(){try{const v=sessionStorage.getItem(myFilterKey());if(v==='0'||v==='1')return v==='1'}catch(_){}return !isAD()}
  function setMyOnly(v){try{sessionStorage.setItem(myFilterKey(),v?'1':'0')}catch(_){} }

  let dataCache={date:'',flights:{},manifest:{},myIds:new Set(),pendingIds:new Set()};
  async function loadContext(date){
    date=S(date)||today();
    const [fs,ms]=await Promise.all([
      dbref(`${ROOT}/${safe(date)}`).once('value'),
      dbref(`${MANIFEST}/${safe(date)}`).once('value')
    ]);
    const manifest=ms.val()||{},flights=v1130ManifestFlightFallback(date,fs.val()||{},manifest),u=me(),myIds=new Set(),pendingIds=new Set(),repairPatch={};
    for(const rec of Object.values(flights)){if(rec?.rosterActive===false||U(rec?.rosterStatus)==='ROSTER_REMOVED')continue;for(const a of Object.values(rec?.unitAssignments||{}))if(normUser(a?.username)===u)myIds.add(S(rec.flightId));}
    for(const [aid,item] of Object.entries(manifest?.items||{})){
      if(!item||item.active===false)continue;
      const oldFid=S(item.flightId),fid=resolveRosterFlightId(date,item,flights),owner=normUser(item.user||item.targetUser);
      if(fid)item.flightId=fid;
      if(owner===u&&fid)myIds.add(fid);
      if(fid&&oldFid!==fid&&(owner===u||isAD())){
        repairPatch[`${MANIFEST}/${safe(date)}/items/${safe(aid)}/flightId`]=fid;
        if(owner)repairPatch[`roster_mail/${safe(owner)}/items/${safe(aid)}/flightId`]=fid;
      }
    }
    dataCache={date,flights,manifest,myIds,pendingIds};
    if(Object.keys(repairPatch).length)Promise.resolve(dbref('').update(repairPatch)).then(()=>{root.__SAGS_V346_LAST_REPAIR={date,count:Object.keys(repairPatch).length,atMs:Date.now()}}).catch(e=>console.info('V3.46 roster flightId repair',e?.message||e));
    return dataCache;
  }
  function isMine(fid){return dataCache.myIds.has(S(fid))}

  function ensureStyle(){if(document.getElementById('v38CleanStyle'))return;const st=document.createElement('style');st.id='v38CleanStyle';st.textContent=`
body.v38-clean-workflow .toolbar-row.main-actions{display:none!important}
body.v38-clean-workflow .toolbar{gap:6px!important;padding-bottom:6px!important}
#v38CleanNav{display:none;gap:6px;flex-wrap:wrap;width:100%;align-items:center;padding-top:4px}
body.v38-clean-workflow #v38CleanNav{display:flex}
.v38NavBtn{border:0;border-radius:10px;min-height:38px;padding:8px 12px;background:#0b67b2;color:#fff;font:900 12px Arial;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.10)}
.v38NavBtn.purple{background:#5b21b6}.v38NavBtn.gray{background:#e9eef3;color:#30475b}.v38NavBtn.admin{background:#7c2d12}.v38NavBtn.rs{background:#0f766e}.v38NavSpacer{flex:1}
#v38FlowHint{font:800 10px/1.25 Arial;color:#526777;white-space:nowrap;align-self:center;padding:0 4px}
.v38MyToggle{display:inline-flex;align-items:center;gap:7px;border:2px solid #0b67b2;border-radius:10px;padding:7px 10px;background:#eef7ff;color:#0b4f91;font:900 12px Arial;cursor:pointer;user-select:none}.v38MyToggle input{width:19px;height:19px;accent-color:#0b67b2;margin:0}.v38MyToggle.on{background:#0b67b2;color:#fff}
.v38ListHint{font:800 11px Arial;color:#5d7080;padding:4px 0}.v38Flag{display:inline-flex;align-items:center;border-radius:999px;padding:3px 7px;margin-right:5px;font:900 10px Arial}.v38Flag.my{background:#dff6e8;color:#126b39}.v38Flag.view{background:#edf2f6;color:#566877}.v38Flag.hand{background:#fff1cb;color:#855a00}
.v38ViewOnly{margin:0 0 10px;padding:10px 12px;border:2px solid #e0a400;border-radius:11px;background:#fff9df;color:#705100;font:900 12px/1.45 Arial}
.v38MyOps{margin:0 0 12px;border:2px solid #0b67b2;border-radius:13px;padding:11px;background:#f4faff}.v38MyOpsTitle{font:900 15px Arial;color:#0b4f91;margin-bottom:4px}.v38MyOpsSub{font:700 11px/1.4 Arial;color:#607383;margin-bottom:8px}.v38MyOpsBtns{display:flex;gap:7px;flex-wrap:wrap}.v38OpBtn{border:0;border-radius:9px;padding:9px 11px;background:#0b67b2;color:#fff;font:900 12px Arial;cursor:pointer}.v38OpBtn.green{background:#15803d}.v38OpBtn.orange{background:#b45309}.v38OpBtn.gray{background:#e8eef3;color:#31485a}.v38OpBtn:disabled{opacity:.5}
body.v38-clean-workflow #roleHomeIdle{pointer-events:auto!important;touch-action:manipulation!important}
body.v344-login-settling #v38CleanNav{pointer-events:none!important}
@media(max-width:620px){#v38CleanNav{display:grid!important;grid-template-columns:1fr 1fr}.v38NavBtn{width:100%;padding:8px 7px;font-size:11px}.v38NavSpacer,#v38FlowHint{display:none}.v38MyOpsBtns{display:grid;grid-template-columns:1fr}.v38OpBtn{width:100%}}
/* V3.21 · compact flat operator action bar */
body.v38-clean-workflow .toolbar.compact-main-toolbar{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:6px!important;row-gap:5px!important;padding:6px 8px calc(6px + env(safe-area-inset-bottom))!important;align-items:center!important;background:linear-gradient(180deg,#0869b6,#075d9f)!important;border-radius:14px 14px 0 0!important;box-shadow:0 -2px 10px rgba(0,45,82,.12)!important}
body.v38-clean-workflow .toolbar.compact-main-toolbar>.badge{display:none!important}
body.v38-clean-workflow #roleAccountCluster{grid-column:1/-1!important;justify-self:end!important;display:flex!important;gap:4px!important;margin:0!important;min-height:0!important;align-items:center!important}
body.v38-clean-workflow #roleStatusBadge{font-size:10px!important;line-height:1.15!important;padding:5px 8px!important;border-radius:8px!important}
body.v38-clean-workflow #roleChangePasswordBtn,body.v38-clean-workflow #roleLogoutBtn{min-height:30px!important;padding:5px 8px!important;border-radius:8px!important;font-size:10px!important;box-shadow:none!important}
body.v38-clean-workflow #v313QuickContext{grid-column:1!important;width:100%!important;padding:0!important;margin:0!important;min-width:0!important}
body.v38-clean-workflow #v320NaContext{grid-column:2!important;width:100%!important;padding:0!important;margin:0!important;min-width:0!important}
body.v38-clean-workflow #v313QuickContext.show,body.v38-clean-workflow #v320NaContext.show{display:block!important}
body.v38-clean-workflow #v313QuickContextBtn,body.v38-clean-workflow #v320NaBtn{width:100%!important;min-height:39px!important;height:39px!important;padding:6px 8px!important;border-radius:9px!important;font:900 11px/1.1 Arial!important;box-shadow:none!important;white-space:normal!important;touch-action:manipulation!important}
body.v38-clean-workflow #v313QuickContextBtn{background:#0b77d1!important;border:1px solid rgba(255,255,255,.18)!important}
body.v38-clean-workflow #v320NaBtn{background:#3f5366!important;border:1px solid rgba(255,255,255,.14)!important}
body.v38-clean-workflow #v313QuickContextHint,body.v38-clean-workflow #v320NaHint{display:none!important}
body.v38-clean-workflow #v38CleanNav{grid-column:1/-1!important;display:flex!important;flex-wrap:nowrap!important;overflow-x:auto!important;overflow-y:hidden!important;gap:5px!important;width:100%!important;padding:0 0 1px!important;margin:0!important;align-items:stretch!important;scrollbar-width:none!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior-x:contain!important}
body.v38-clean-workflow #v38CleanNav::-webkit-scrollbar{display:none!important}
body.v38-clean-workflow .v38NavBtn{flex:0 0 auto!important;width:auto!important;min-width:96px!important;min-height:34px!important;height:34px!important;padding:5px 9px!important;border-radius:9px!important;font:900 10.5px/1 Arial!important;box-shadow:none!important;border:1px solid #d8e3ec!important;background:#f8fbfd!important;color:#23455f!important;white-space:nowrap!important}
body.v38-clean-workflow .v38NavBtn.flights{background:#eef7ff!important;color:#07599d!important;border-color:#bad9f1!important}
body.v38-clean-workflow .v38NavBtn.multi{background:#f5f1ff!important;color:#5b21b6!important;border-color:#d9ccfa!important}
body.v38-clean-workflow .v38NavBtn.shift{background:#fff7e9!important;color:#a65400!important;border-color:#f0d3aa!important}
body.v38-clean-workflow .v38NavBtn.sign{background:#f4f6f8!important;color:#35495a!important;border-color:#d7dee4!important}
body.v38-clean-workflow .v38NavBtn.admin{background:#fff0ed!important;color:#9a3412!important;border-color:#efc2b5!important}
body.v38-clean-workflow .v38NavSpacer,body.v38-clean-workflow #v38FlowHint{display:none!important}
body.v38-clean-workflow #v38NavRS,body.v38-clean-workflow #readSignQuickBtn,body.v38-clean-workflow .readSignNotifyBadge{display:none!important}
@media(max-width:620px){body.v38-clean-workflow #v38CleanNav{display:flex!important;grid-template-columns:none!important}.v38NavBtn{width:auto!important}.v38MyOpsBtns{display:grid;grid-template-columns:1fr}.v38OpBtn{width:100%}}
/* V3.91 · PC-only action layout. Mobile <=620px intentionally unchanged. */
@media(min-width:621px){
  body.v38-clean-workflow .toolbar.compact-main-toolbar{
    grid-template-columns:minmax(240px,1fr) minmax(240px,1fr)!important;
    column-gap:10px!important;row-gap:8px!important;
    padding:8px 12px 10px!important;
  }
  body.v38-clean-workflow #roleAccountCluster{
    gap:6px!important;margin-bottom:1px!important;
  }
  body.v38-clean-workflow #v313QuickContextBtn,
  body.v38-clean-workflow #v320NaBtn{
    height:42px!important;min-height:42px!important;
    font-size:11.5px!important;border-radius:10px!important;
  }
  body.v38-clean-workflow #v38CleanNav{
    display:grid!important;
    grid-template-columns:repeat(auto-fit,minmax(118px,1fr))!important;
    overflow:visible!important;
    gap:8px!important;
    padding:2px 0 0!important;
    align-items:stretch!important;
  }
  body.v38-clean-workflow .v38NavBtn{
    width:100%!important;min-width:0!important;
    height:40px!important;min-height:40px!important;
    padding:7px 10px!important;
    font:900 11.5px/1.05 Arial!important;
    justify-content:center!important;text-align:center!important;
    border-radius:10px!important;
  }
}

`;document.head.appendChild(st)}

  function ensureCleanNav(){
    ensureStyle();const bar=document.querySelector('.toolbar');if(!bar)return;
    let nav=document.getElementById('v38CleanNav');if(!nav){nav=document.createElement('div');nav.id='v38CleanNav';bar.appendChild(nav)}
    const rsAvailable=false; // V3.21: READ & SIGN is not enabled for operation yet.
    const shiftAvailable=typeof root.v310ShiftOpen==='function';
    const signAvailable=typeof root.openTemplateMenu==='function' && ['AD','DH','PVHK','CBTT','KH'].includes(role());
    const sig=[logged()?'1':'0',rsAvailable?'1':'0',shiftAvailable?'1':'0',signAvailable?'1':'0',isAD()?'1':'0'].join('|');
    // V3.11: do not rebuild the navigation bar on polling/sync. Replacing innerHTML
    // every few seconds caused READ & SIGN and GIAO CA to visibly blink on mobile.
    if(nav.dataset.v311Sig===sig && document.getElementById('v38NavFlights') && document.getElementById('v38NavMulti'))return;
    nav.dataset.v311Sig=sig;
    nav.innerHTML=`<button class="v38NavBtn flights" id="v38NavFlights">✈ CHUYẾN</button><button class="v38NavBtn multi" id="v38NavMulti">⇄ MULTI</button>${shiftAvailable?'<button class="v38NavBtn shift" id="v310ShiftNav">↔ GIAO CA</button>':''}${signAvailable?'<button class="v38NavBtn sign" id="v38NavSignature">✍ KÝ</button>':''}<span class="v38NavSpacer"></span>${isAD()?'<button class="v38NavBtn admin" id="v38NavAdmin">⚙ QUẢN LÝ</button>':''}`;
    document.getElementById('v38NavFlights').onclick=()=>root.flightWorkspaceOpenList?.(today());
    document.getElementById('v38NavMulti').onclick=()=>root.sagsV36OpenMultitask?.();
    const sh=document.getElementById('v310ShiftNav');if(sh)sh.onclick=()=>root.v310ShiftOpen?.('create');
    const sign=document.getElementById('v38NavSignature');if(sign)sign.onclick=()=>root.openTemplateMenu?.();
    const ad=document.getElementById('v38NavAdmin');if(ad)ad.onclick=()=>root.adminHubOpen?.();
  }

  async function decorateList(date){
    const host=document.getElementById('fwcList');if(!host)return;date=S(date)||dateFromUi();
    try{await loadContext(date)}catch(e){console.warn('V3.8 list context',e);return}
    const tools=document.querySelector('#fwcBody .fwcTools');
    if(tools&&!document.getElementById('v38MyFlightToggle')){
      const wrap=document.createElement('label');wrap.id='v38MyFlightLabel';wrap.className='v38MyToggle';wrap.innerHTML='<input id="v38MyFlightToggle" type="checkbox"> MY FLIGHT';tools.insertBefore(wrap,tools.firstChild);
      document.getElementById('v38MyFlightToggle').onchange=e=>{setMyOnly(!!e.target.checked);applyListFilter()};
    }
    const tog=document.getElementById('v38MyFlightToggle');if(tog)tog.checked=myOnlyDefault();
    for(const card of host.querySelectorAll('.fwcFlight')){
      const fid=flightIdFromCard(card);if(!fid)continue;card.dataset.v38Fid=fid;
      let flags=card.querySelector('.v38Flags');if(!flags){flags=document.createElement('div');flags.className='v38Flags';card.querySelector('.fwcFlightTitle')?.insertAdjacentElement('beforebegin',flags)}
      const mine=isMine(fid),pending=dataCache.pendingIds.has(fid);flags.innerHTML=`${mine?'<span class="v38Flag my">MY</span>':'<span class="v38Flag view">VIEW</span>'}${pending?'<span class="v38Flag hand">HANDOVER</span>':''}`;
    }
    applyListFilter();
  }
  function applyListFilter(){
    const only=!!document.getElementById('v38MyFlightToggle')?.checked;setMyOnly(only);const lab=document.getElementById('v38MyFlightLabel');lab?.classList.toggle('on',only);
    let shown=0,total=0,myCount=0;for(const card of document.querySelectorAll('#fwcList .fwcFlight')){total++;const mine=isMine(card.dataset.v38Fid);if(mine)myCount++;const show=!only||mine;card.style.display=show?'grid':'none';if(show)shown++}
    const status=document.getElementById('fwcStatus');if(status){status.textContent=(only&&shown===0)?'Chưa có chuyến.':'';status.style.display=(only&&shown===0)?'block':'none';}
  }

  function assignedItems(fid){const u=me(),items=[];for(const x of Object.values(dataCache.manifest?.items||{}))if(rosterItemMatches(x,fid)&&normUser(x.user||x.targetUser)===u)items.push(x);return items}
  function formLabel(g){g=S(g).toLowerCase();return g==='fsags421'?'FSAGS 42.1':g==='fsags551'?'FSAGS 55.1':g==='fsags09'?'PVHK · KẾT SỔ':'FSAGS 42.3 / ĐIỀU HÀNH'}
  function injectWorkspace(fid){
    const body=document.getElementById('fwcBody'),head=body?.querySelector('.fwcWorkspaceHead');if(!body||!head)return;
    body.querySelectorAll('.v38ViewOnly,.v38MyOps').forEach(x=>x.remove());
    const mine=isMine(fid),pending=dataCache.pendingIds.has(fid);
    // Never allow claim on a flight that is only being viewed.
    if(!mine){
      body.querySelectorAll('button[onclick*="flightWorkspaceClaim"]').forEach(b=>b.style.display='none');
      const n=document.createElement('div');n.className='v38ViewOnly';n.innerHTML=`👁 <b>CHỈ XEM</b>${pending?' · HANDOVER ĐANG CHỜ':''}`;head.insertAdjacentElement('afterend',n);return;
    }
    const items=assignedItems(fid),buttons=[];
    for(const item of items){const aid=S(item.assignmentId);if(!aid)continue;buttons.push(`<button class="v38OpBtn green" onclick="v38OpenRosterAssignment('${esc(aid)}')">${esc(formLabel(item.formGroup))}${item.assignmentLeg?` · ${U(item.assignmentLeg)==='ARR'?'ĐẾN':'ĐI'}`:''}</button>`)}
    const r=role();
    if((r==='CBTT'||isAD())&&canFeature('FINAL'))buttons.push('<button class="v38OpBtn" onclick="v38OpenLegacyModule(\'FINAL\')">⚖ FINAL / CROSSCHECK</button>');
    if((r==='KH'||r==='CARGO'||isAD())&&canFeature('FSAGS208'))buttons.push('<button class="v38OpBtn orange" onclick="v38OpenLegacyModule(\'CARGO\')">📦 KHO HÀNG / FSAGS 208</button>');
    const opLeg=(items.length&&items.every(x=>U(x.assignmentLeg)==='ARR'))?'ARR':((items.length&&items.every(x=>U(x.assignmentLeg)==='DEP'))?'DEP':'');const opFlight=opLeg?S(items[0]?.assignmentFlight||(opLeg==='ARR'?items[0]?.arrFlight:items[0]?.depFlight)):'';
    const box=document.createElement('div');box.className='v38MyOps';box.innerHTML=`<div class="v38MyOpsTitle">NGHIỆP VỤ CỦA TÔI · ${esc(opFlight?`${opFlight} · ${opLeg==='ARR'?'CHUYẾN ĐẾN':'CHUYẾN ĐI'}`:flightName(dataCache.flights?.[fid]||{}))}</div><div class="v38MyOpsBtns">${buttons.join('')}</div>`;head.insertAdjacentElement('afterend',box);
  }

  root.v38OpenRosterAssignment=async function(aid){
    aid=S(aid);if(!aid)return;const item=dataCache.manifest?.items?.[aid];if(!item||normUser(item.user||item.targetUser)!==me())return alert('Assignment này không còn thuộc tài khoản hiện tại. Hãy tải lại MY FLIGHT.');
    let meta=null;try{meta=(root.readFlightSessionList?.()||[]).find(x=>S(x.rosterAssignmentId)===aid)}catch(_){}
    if(!meta){try{root.dailyRosterRestartMailbox?.();await new Promise(r=>setTimeout(r,700));meta=(root.readFlightSessionList?.()||[]).find(x=>S(x.rosterAssignmentId)===aid)}catch(_){} }
    if(!meta)return alert('Biểu mẫu roster chưa đồng bộ xuống thiết bị. Hãy chờ vài giây rồi bấm lại.');
    try{root.flightWorkspaceClose?.();root.switchFlightSession?.(meta.id)}catch(e){alert('Không mở được nghiệp vụ: '+S(e?.message||e))}
  };
  root.v38OpenLegacyModule=function(kind){
    kind=U(kind);try{root.flightWorkspaceClose?.();if(kind==='FINAL')return root.openFinalSheetManager?.();if(kind==='CARGO')return root.openKH208Manager?.();if(kind==='QUICK_TIME')return root.openQuickTimePanel?.()}catch(e){alert('Không mở được module: '+S(e?.message||e))}
  };

  function patchWorkspace(){
    if(typeof root.flightWorkspaceOpenList!=='function'||typeof root.flightWorkspaceOpenFlight!=='function')return false;
    if(!root.flightWorkspaceOpenList.__v38){
      const baseList=root.flightWorkspaceOpenList,baseFlight=root.flightWorkspaceOpenFlight,baseClaim=root.flightWorkspaceClaim;
      root.flightWorkspaceOpenList=function(d){d=S(d)||today();const r=baseList.apply(this,arguments);Promise.resolve(r).finally(()=>setTimeout(()=>decorateList(d),80));return r};root.flightWorkspaceOpenList.__v38=1;
      root.flightWorkspaceOpenFlight=function(fid){const r=baseFlight.apply(this,arguments);(async()=>{try{if(dataCache.date!==dateFromUi())await loadContext(dateFromUi())}catch(_){}setTimeout(()=>injectWorkspace(fid),50)})();return r};root.flightWorkspaceOpenFlight.__v38=1;
      if(typeof baseClaim==='function'){root.flightWorkspaceClaim=async function(fid,unit){try{if(dataCache.date!==dateFromUi())await loadContext(dateFromUi());if(!isMine(fid))return alert('Không được nhận nhiệm vụ: chuyến này không thuộc MY FLIGHT của tài khoản hiện tại. Tài khoản hiện tại không được phân công nhận chuyến này.');return await baseClaim.apply(this,arguments)}catch(e){alert(S(e?.message||e))}};root.flightWorkspaceClaim.__v38=1}
    }
    return true;
  }

  let loginSettledFor='';
  function sync(){
    ensureStyle();document.body.classList.toggle('v38-clean-workflow',logged());ensureCleanNav();patchWorkspace();
    const nav=document.getElementById('v38CleanNav');if(nav)nav.style.display=logged()?'flex':'none';
    const key=logged()?`${me()}|${today()}`:'';
    if(key&&key!==loginSettledFor){loginSettledFor=key;try{root.flightWorkspaceClose?.()}catch(_){}document.body.classList.add('v344-login-settling');setTimeout(()=>document.body.classList.remove('v344-login-settling'),850)}
    if(!logged())loginSettledFor='';
  }
  const baseApply=root.applyRoleUI;if(typeof baseApply==='function'&&!baseApply.__v38){root.applyRoleUI=function(){const r=baseApply.apply(this,arguments);setTimeout(sync,0);return r};root.applyRoleUI.__v38=1}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(sync,350),{once:true});else setTimeout(sync,350);
  window.addEventListener('pageshow',()=>setTimeout(sync,80),{passive:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(sync,80)},{passive:true});
  root.__SAGS_V38_BUILD=BUILD;
})(typeof window!=='undefined'?window:globalThis);

/* ===== END clean-workflow-v38.js ===== */

/* ===== BEGIN clean-ops-v310.js ===== */
/* E-REPORT/SAGS V3.10 · TASK EXPORT/SHARE + SHIFT HANDOVER
 * Clean workflow extension on top of V3.9.
 * - Each roster task can be exported/shared from its Flight Workspace.
 * - FINAL gets a native Share button next to Export PDF.
 * - Shift handover moves multiple current assignments as one controlled batch:
 *   A requests -> AD/department manager approves -> B accepts -> ownership changes atomically.
 */
(function(root){'use strict';
  const BUILD='V3.12-20260821-01';
  const MANIFEST='roster_manifests', MAIL='roster_mail', SESSION='roster_sessions', REVOKE='roster_revocations';
  const HANDOFF='roster_handoffs', SHIFT='shift_handoffs', SHIFT_MAIL='shift_handoff_mail', FLIGHTS='flight_records';
  const S=v=>String(v??'').trim(), U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return U(v)}};
  const now=()=>Date.now();
  const today=()=>{const d=new Date(),iso=x=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`,cur=iso(d),p=new Date(d);p.setDate(p.getDate()-1);const prev=iso(p),saved=S(sessionStorage.getItem('sagsV36FwcDate'));if(saved===cur||saved===prev)return saved;return d.getHours()<4?prev:cur};
  function session(){try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}}
  function profile(){return session().profile||root.currentUserProfile||{}}
  function role(){return U(session().role||profile().role)}
  function me(){return norm(profile().username||(role()==='AD'?'AD':''))}
  function actor(){const p=profile();return {principalId:S(p.uid||p.firebaseUid||p.authUid||(me()?'LEGACY:'+me():'LEGACY:'+role())),username:me(),name:S(p.name||p.fullName||p.username||me()),role:role(),departmentCode:S(p.departmentCode||p.systemDepartment||p.department),groupCode:S(p.groupCode||p.group)}}
  function ref(path){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase RTDB chưa sẵn sàng.');return root.sagsV470Ref(path)}
  async function catalog(force=false){try{return typeof root.v466GetUserCatalog==='function'?await root.v466GetUserCatalog(force):[]}catch(_){return []}}
  function depOf(p){return U(p?.departmentCode||p?.systemDepartment||p?.department||'')}
  function groupOf(p){return U(p?.groupCode||p?.group||'')}
  function sameUnit(a,b){if(!a||!b)return false;const ad=depOf(a),bd=depOf(b);if(ad&&bd)return ad===bd;const ag=groupOf(a),bg=groupOf(b);return !!ag&&ag===bg}
  const MANAGER_TITLES=new Set(['TRƯỞNG PHÒNG','PHÓ PHÒNG','ĐỘI TRƯỞNG','ĐỘI PHÓ','CA TRƯỞNG','CA PHÓ']);
  function isManager(p){return !!p&&p.active!==false&&MANAGER_TITLES.has(U(p.jobTitle))}
  function profileOf(items,u){u=norm(u);return (items||[]).find(x=>norm(x.username)===u)||null}
  function canApprove(batch,users){if(role()==='AD')return true;const p=profileOf(users,me());return isManager(p)&&!!U(batch.departmentCode)&&depOf(p)===U(batch.departmentCode)}
  function formLabel(g){g=U(g);return g==='FSAGS421'?'FSAGS 42.1':g==='FSAGS551'?'FSAGS 55.1':g==='FSAGS09'?'PVHK · KẾT SỔ':g==='LOADING208'?'FSAGS 208':'FSAGS 42.3'}
  function rosterUnit(item){const rk=U(item?.roleKey),src=U(item?.sourceColumn),form=U(item?.formGroup);if(rk==='PAX09'||src.includes('PAX_SUPR')||form==='FSAGS09')return 'PVHK';if(['COR','LD','BOTH'].includes(rk)||src.includes('GRND_COR')||src.includes('GRND_LD')||['FSAGS','FSAGS421','FSAGS551'].includes(form))return 'DH';return ''}
  async function opsAudit(event,detail,reason=''){try{const a=actor(),ctx={flightId:S(root.activeFlightSessionId||''),flightLabel:S(root.currentFlightSessionMeta?.()?.name||'')};await ref('ops_audit_v331').push({schema:1,event:S(event),systemTimestamp:root.firebase?.database?.ServerValue?.TIMESTAMP||now(),clientAtMs:now(),actor:a,flightId:ctx.flightId,flightLabel:ctx.flightLabel,reason:S(reason),detail:detail||{}})}catch(e){console.warn('V3.10 audit',e)}}

  /* ---------- TASK EXPORT / SHARE ---------- */
  async function currentManifest(date=today()){const s=await ref(`${MANIFEST}/${safe(date)}`).once('value');return s.val()||{}}
  async function assignmentMeta(aid){let m=null;try{m=(root.readFlightSessionList?.()||[]).find(x=>S(x.rosterAssignmentId)===S(aid))}catch(_){}if(!m){try{root.dailyRosterRestartMailbox?.();await new Promise(r=>setTimeout(r,650));m=(root.readFlightSessionList?.()||[]).find(x=>S(x.rosterAssignmentId)===S(aid))}catch(_){}}return m}
  function v312AutoFillNA(){
    try{
      if(typeof root.fillBlankNA!=='function')return 0;
      const count=Number(root.fillBlankNA({silent:true,source:'EXPORT'}))||0;
      if(count>0)void opsAudit('AUTO_FILL_NA_BEFORE_EXPORT',{count,flightSessionId:S(root.activeFlightSessionId||''),formGroup:S(root.activeFormGroup||'')});
      return count;
    }catch(e){console.warn('V3.12 auto N/A',e);return 0}
  }

  root.v310ExportAssignment=async function(aid){
    try{
      aid=S(aid);const date=S(document.getElementById('fwcDate')?.value)||today(),man=await currentManifest(date),item=man?.items?.[aid];
      if(!item||item.active===false||norm(item.user||item.targetUser)!==me())throw new Error('Công việc này không còn thuộc MY FLIGHT của tài khoản hiện tại.');
      const meta=await assignmentMeta(aid);if(!meta)throw new Error('Biểu mẫu chưa đồng bộ xuống thiết bị. Hãy mở công việc một lần rồi thử lại.');
      root.flightWorkspaceClose?.();root.switchFlightSession?.(meta.id);await new Promise(r=>setTimeout(r,180));
      if(typeof root.openExportChoiceMenu==='function')root.openExportChoiceMenu();else if(typeof openExportChoiceMenu==='function')openExportChoiceMenu();else throw new Error('Chức năng xuất PDF chưa sẵn sàng.');
      await opsAudit('TASK_EXPORT_OPENED',{assignmentId:aid,flightId:S(item.flightId),formGroup:S(item.formGroup)});
    }catch(e){alert('Không mở được XUẤT / CHIA SẺ: '+S(e?.message||e))}
  };
  root.v310ShareCurrentFinal=async function(){
    try{
      if(!['CBTT','AD'].includes(role()))throw new Error('Chỉ CBTT/AD được xuất/chia sẻ FINAL.');
      if(typeof ffBuildExportCanvas!=='function'||typeof canvasesToPdfFile!=='function')throw new Error('Engine PDF FINAL chưa sẵn sàng.');
      const rec=typeof currentFinalSheetRecord==='function'?currentFinalSheetRecord():null;
      const form=(typeof ffCurrent!=='undefined'&&ffCurrent)||rec?.form;if(!form)throw new Error('Chưa mở FINAL cần chia sẻ.');
      const data=typeof ffCurrentData==='function'?ffCurrentData(form):{};const canvas=await ffBuildExportCanvas(form,data);
      const ident=typeof ffBuildSendIdentity==='function'?ffBuildSendIdentity(form,data):{};
      const code=typeof ffFormCode==='function'?ffFormCode(form):'FINAL',rev=typeof ffCurrentRevisionNo==='function'?ffCurrentRevisionNo():1;
      const dt=ident.dateToken||(typeof ffTodayISO==='function'?ffTodayISO().replace(/-/g,''):today().replace(/-/g,''));
      const name=[code,ident.flightToken||'FINAL',dt,'V'+rev].filter(Boolean).join('_')+'.pdf';
      const file=await canvasesToPdfFile([canvas],name);
      if(typeof preparedPdfFile!=='undefined'){preparedPdfFile=file;preparedPdfName=name;try{v479ReleasePreparedUrl?.()}catch(_){};try{openExportModal?.('PDF FINAL đã sẵn sàng. Chọn GỬI PDF để mở Share Sheet và chọn ứng dụng cần gửi.');v479ShowPreparedButtons?.();}catch(_){}}
      else if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]})))await navigator.share({title:name.replace(/\.pdf$/i,''),files:[file]});
      else{const u=URL.createObjectURL(file),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000)}
      await opsAudit('FINAL_SHARE_PREPARED',{name,revision:rev,flightToken:ident.flightToken||''});
    }catch(e){if(e?.name!=='AbortError')alert('Không chia sẻ được FINAL: '+S(e?.message||e))}
  };
  let v312ExportRenderToken=0;
  async function injectTaskExports(fid){
    const token=++v312ExportRenderToken;
    const body=document.getElementById('fwcBody'),ops=body?.querySelector('.v38MyOps');if(!body||!ops)return;
    let box=body.querySelector('#v310TaskDocsSingleton');
    body.querySelectorAll('.v310TaskDocs').forEach(x=>{if(x!==box)x.remove()});
    if(!box){box=document.createElement('div');box.id='v310TaskDocsSingleton';box.className='v310TaskDocs';ops.insertAdjacentElement('afterend',box)}
    else if(box.previousElementSibling!==ops)ops.insertAdjacentElement('afterend',box);
    box.dataset.flightId=S(fid);
    box.innerHTML='<div class="v310DocsTitle">📤 XUẤT / CHIA SẺ TÀI LIỆU CỦA TÔI</div><div class="v310DocsSub">Đang tải tài liệu của chuyến...</div>';
    const date=S(document.getElementById('fwcDate')?.value)||today();let man={};try{man=await currentManifest(date)}catch(_){if(token===v312ExportRenderToken)box.remove();return}
    if(token!==v312ExportRenderToken||!document.body.contains(box)||box.dataset.flightId!==S(fid))return;
    const items=Object.values(man?.items||{}).filter(x=>x&&x.active!==false&&(S(x.flightId)||S(root.sagsV346ResolveRosterFlightId?.(date,x,{})))===S(fid)&&norm(x.user||x.targetUser)===me());
    const buttons=items.map(x=>`<button class="v310DocBtn" onclick="v310ExportAssignment('${esc(x.assignmentId)}')">📤 ${esc(formLabel(x.formGroup))}</button>`);
    if(['CBTT','AD'].includes(role()))buttons.push('<button class="v310DocBtn final" onclick="v38OpenLegacyModule(\'FINAL\')">⚖ MỞ FINAL · PDF/CHIA SẺ</button>');
    body.querySelectorAll('.v310TaskDocs').forEach(x=>{if(x!==box)x.remove()});
    box.innerHTML=`<div class="v310DocsTitle">📤 XUẤT / CHIA SẺ TÀI LIỆU CỦA TÔI</div><div class="v310DocsSub">Tạo PDF của đúng công việc/chuyến đang phụ trách. N/A chỉ được điền khi người dùng chủ động bấm <b>N/A · ĐIỀN CÁC Ô TRỐNG</b> trên biểu mẫu. Sau khi tạo PDF, chọn <b>GỬI PDF</b> để mở Share Sheet và chọn bất kỳ ứng dụng tương thích nào trên thiết bị.</div><div class="v310DocsBtns">${buttons.join('')||'<span>Chưa có tài liệu được gắn cho tài khoản này.</span>'}</div>`;
  }
  function patchAutoNAExportMenu(){ /* V3.20: export must never auto-fill N/A. */ return; }
  function injectFinalShare(){const exp=document.getElementById('ffExportBtn'),host=exp?.parentElement;if(!exp||!host)return;let b=document.getElementById('ffShareBtnV310');if(!b){b=document.createElement('button');b.id='ffShareBtnV310';b.className='finalHeaderBtn choose';b.textContent='CHIA SẺ';b.onclick=()=>root.v310ShareCurrentFinal();host.insertBefore(b,exp.nextSibling)}b.style.display=exp.style.display==='none'?'none':''}

  /* ---------- SHIFT HANDOVER ---------- */
  let shiftCache={date:'',manifest:{},flights:{},batches:{},users:[]},shiftTab='create',mailRef=null,mailCb=null;
  function batchId(){return `SHIFT_${safe(me())}_${now()}_${Math.random().toString(36).slice(2,7).toUpperCase()}`}
  function ensureUI(){
    if(!document.getElementById('v310Style')){const st=document.createElement('style');st.id='v310Style';st.textContent=`
      .v310DocBtn{border:0;border-radius:9px;padding:9px 11px;background:#0f766e;color:#fff;font:900 12px Arial;cursor:pointer}.v310DocBtn.final{background:#5b21b6}.v310TaskDocs{margin:0 0 12px;border:2px solid #0f766e;border-radius:13px;padding:11px;background:#f0fdfa}.v310DocsTitle{font:900 14px Arial;color:#0f5e58}.v310DocsSub{font:700 11px/1.45 Arial;color:#607383;margin:4px 0 8px}.v310DocsBtns{display:flex;gap:7px;flex-wrap:wrap}
      #v310ShiftModal{display:none;position:fixed;inset:0;z-index:19050;background:rgba(0,0,0,.58);align-items:center;justify-content:center;padding:10px;font-family:Arial,sans-serif}#v310ShiftModal.show{display:flex}.v310ShiftPanel{width:min(98vw,900px);max-height:94vh;overflow:auto;background:#fff;border-radius:16px;padding:14px;box-shadow:0 18px 50px rgba(0,0,0,.32)}.v310ShiftHead{display:flex;justify-content:space-between;gap:10px;align-items:start}.v310ShiftHead h3{margin:0;color:#0b4f91}.v310ShiftTabs{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}.v310ShiftTab,.v310ShiftBtn{border:0;border-radius:9px;padding:9px 11px;font-weight:900;cursor:pointer;background:#0b67b2;color:#fff}.v310ShiftTab.on{background:#173f60}.v310ShiftBtn.gray{background:#e9eef3;color:#31475a}.v310ShiftBtn.green{background:#15803d}.v310ShiftBtn.red{background:#b42318}.v310ShiftCard{border:1px solid #d8e2ea;border-radius:12px;padding:10px;margin:8px 0}.v310ShiftFlight{font-weight:900;color:#173f60}.v310ShiftMeta{font-size:12px;color:#607080;margin-top:4px}.v310ShiftAssign{display:flex;gap:8px;align-items:flex-start;padding:7px 0;border-top:1px solid #edf1f4}.v310ShiftAssign input{width:20px;height:20px;accent-color:#0b67b2}.v310ShiftForm{display:grid;grid-template-columns:1fr 1fr;gap:8px}.v310ShiftForm select,.v310ShiftForm textarea{width:100%;padding:9px;border:1px solid #ccd7df;border-radius:9px}.v310ShiftForm textarea{grid-column:1/-1;min-height:70px}.v310ShiftStatus{padding:9px 10px;border-radius:9px;background:#eef6ff;color:#244862;font-size:12px;margin:8px 0}.v310ShiftBatch{border:1px solid #d8e2ea;border-radius:12px;padding:10px;margin:8px 0}.v310ShiftBatch.pending{background:#fffaf0;border-color:#e0b46a}.v310ShiftBatch.approved{background:#f4fbf6;border-color:#79b98d}.v310ShiftButtons{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
      @media(max-width:620px){.v310DocsBtns,.v310ShiftForm{display:grid;grid-template-columns:1fr}.v310DocBtn{width:100%}.v310ShiftForm textarea{grid-column:auto}}
    `;document.head.appendChild(st)}
    if(document.getElementById('v310ShiftModal'))return;
    const m=document.createElement('div');m.id='v310ShiftModal';m.innerHTML=`<div class="v310ShiftPanel"><div class="v310ShiftHead"><div><h3>🔄 GIAO CA</h3><div class="v310ShiftMeta">Chuyển nhiều công việc đang phụ trách trong một lần. Chỉ chuyển quyền sau khi Quản lý/AD duyệt và người nhận bấm TIẾP NHẬN.</div></div><button class="v310ShiftBtn gray" onclick="v310ShiftClose()">ĐÓNG</button></div><div class="v310ShiftTabs"><button id="v310TabCreate" class="v310ShiftTab" onclick="v310ShiftTab('create')">GIAO CA</button><button id="v310TabApprove" class="v310ShiftTab" onclick="v310ShiftTab('approve')">CHỜ DUYỆT</button><button id="v310TabAccept" class="v310ShiftTab" onclick="v310ShiftTab('accept')">TIẾP NHẬN</button><button id="v310TabHistory" class="v310ShiftTab" onclick="v310ShiftTab('history')">LỊCH SỬ</button></div><div id="v310ShiftStatus" class="v310ShiftStatus"></div><div id="v310ShiftBody"></div></div>`;document.body.appendChild(m);
  }
  function stmsg(s){const e=document.getElementById('v310ShiftStatus');if(e)e.textContent=S(s)}
  async function loadShift(){const date=today(),[ma,fl,sh,us]=await Promise.all([ref(`${MANIFEST}/${safe(date)}`).once('value'),ref(`${FLIGHTS}/${safe(date)}`).once('value'),ref(`${SHIFT}/${safe(date)}`).once('value').catch(()=>({val:()=>({})})),catalog(false)]);shiftCache={date,manifest:ma.val()||{},flights:fl.val()||{},batches:sh.val?.()||{},users:us||[]};return shiftCache}
  function myAssignments(){return Object.values(shiftCache.manifest?.items||{}).filter(x=>x&&x.active!==false&&norm(x.user||x.targetUser)===me())}
  function activeBatchForAssignment(aid){return Object.values(shiftCache.batches||{}).find(b=>['PENDING_APPROVAL','APPROVED_WAITING_ACCEPT'].includes(U(b.status))&&(b.assignmentIds||[]).map(S).includes(S(aid)))||null}
  function candidateList(){const meP=profileOf(shiftCache.users,me());return (shiftCache.users||[]).filter(x=>x.active!==false&&norm(x.username)!==me()&&sameUnit(meP,x)).sort((a,b)=>S(a.name||a.username).localeCompare(S(b.name||b.username),'vi'))}
  function batchStatus(s){s=U(s);return s==='PENDING_APPROVAL'?'CHỜ DUYỆT':s==='APPROVED_WAITING_ACCEPT'?'ĐÃ DUYỆT · CHỜ TIẾP NHẬN':s==='COMPLETED'?'ĐÃ GIAO CA':s==='REJECTED'?'ĐÃ TỪ CHỐI':s==='CANCELLED'?'ĐÃ HỦY':s}
  function renderCreate(){const items=myAssignments(),groups={};for(const x of items){const k=S(x.flightId||x.flightRaw||x.flightName||x.assignmentId);(groups[k]||(groups[k]=[])).push(x)}const cands=candidateList();const cards=Object.entries(groups).map(([fid,arr])=>{const f=shiftCache.flights?.[fid]||{},name=S(f.depFlight||f.arrFlight||arr[0]?.flightRaw||arr[0]?.flightName||fid);return `<div class="v310ShiftCard"><div class="v310ShiftFlight">✈ ${esc(name)}</div><div class="v310ShiftMeta">STD ${esc(f.std||arr[0]?.std||'—')} · A/C ${esc(f.acReg||arr[0]?.acReg||'—')}</div>${arr.map(a=>{const busy=activeBatchForAssignment(a.assignmentId);return `<label class="v310ShiftAssign"><input class="v310ShiftCheck" type="checkbox" value="${esc(a.assignmentId)}" ${busy?'disabled':''} checked><span><b>${esc(formLabel(a.formGroup))}</b> · ${esc(a.sourceColumn||a.roleKey||'')} ${busy?`<br><span class="v310ShiftMeta">Đang có GIAO CA: ${esc(batchStatus(busy.status))}</span>`:''}</span></label>`}).join('')}</div>`}).join('');document.getElementById('v310ShiftBody').innerHTML=`<div class="v310ShiftForm"><select id="v310ShiftTo"><option value="">-- Chọn người nhận ca cùng đơn vị --</option>${cands.map(x=>`<option value="${esc(norm(x.username))}">${esc(x.name||x.username)} (${esc(x.username)})</option>`).join('')}</select><button class="v310ShiftBtn gray" onclick="document.querySelectorAll('.v310ShiftCheck:not(:disabled)').forEach(x=>x.checked=true)">CHỌN TẤT CẢ</button><textarea id="v310ShiftReason" placeholder="Ghi chú giao ca: việc đang dở, cảnh báo tồn, nội dung cần theo dõi..."></textarea></div>${cards||'<div class="v310ShiftCard">Không có công việc MY FLIGHT đang phụ trách để giao ca.</div>'}<button class="v310ShiftBtn green" onclick="v310ShiftSubmit()">GỬI BÀN GIAO CA</button>`;stmsg(`${items.length} công việc hiện thuộc tài khoản ${me()}. Chỉ chọn các việc cần ca sau tiếp tục.`)}
  function batchesFor(tab){const all=Object.values(shiftCache.batches||{}).sort((a,b)=>Number(b.updatedAtMs||b.requestedAtMs||0)-Number(a.updatedAtMs||a.requestedAtMs||0));if(tab==='approve')return all.filter(b=>U(b.status)==='PENDING_APPROVAL'&&canApprove(b,shiftCache.users));if(tab==='accept')return all.filter(b=>U(b.status)==='APPROVED_WAITING_ACCEPT'&&norm(b.toUser)===me());if(tab==='history')return all.filter(b=>norm(b.fromUser)===me()||norm(b.toUser)===me()||canApprove(b,shiftCache.users));return []}
  function renderBatches(tab){const arr=batchesFor(tab);document.getElementById('v310ShiftBody').innerHTML=arr.length?arr.map(b=>`<div class="v310ShiftBatch ${U(b.status)==='PENDING_APPROVAL'?'pending':U(b.status)==='APPROVED_WAITING_ACCEPT'?'approved':''}"><div class="v310ShiftFlight">${esc(b.fromName||b.fromUser)} → ${esc(b.toName||b.toUser)} · ${esc(batchStatus(b.status))}</div><div class="v310ShiftMeta">${(b.items||[]).map(x=>`${esc(x.flightRaw||x.flightName||x.flightId)} · ${esc(formLabel(x.formGroup))}`).join('<br>')}</div>${b.reason?`<div class="v310ShiftMeta"><b>Ghi chú:</b> ${esc(b.reason)}</div>`:''}<div class="v310ShiftButtons">${tab==='approve'&&U(b.status)==='PENDING_APPROVAL'?`<button class="v310ShiftBtn green" onclick="v310ShiftApprove('${esc(b.id)}')">DUYỆT CA</button><button class="v310ShiftBtn red" onclick="v310ShiftReject('${esc(b.id)}')">TỪ CHỐI</button>`:''}${tab==='accept'&&U(b.status)==='APPROVED_WAITING_ACCEPT'?`<button class="v310ShiftBtn green" onclick="v310ShiftAccept('${esc(b.id)}')">TIẾP NHẬN CA</button>`:''}</div></div>`).join(''):'<div class="v310ShiftCard">Không có mục nào.</div>';stmsg(`${arr.length} yêu cầu trong mục ${tab==='approve'?'CHỜ DUYỆT':tab==='accept'?'TIẾP NHẬN':'LỊCH SỬ'}.`)}
  async function renderShift(){await loadShift();['create','approve','accept','history'].forEach(k=>document.getElementById('v310Tab'+k[0].toUpperCase()+k.slice(1))?.classList.toggle('on',shiftTab===k));if(shiftTab==='create')renderCreate();else renderBatches(shiftTab)}
  root.v310ShiftOpen=async function(tab='create'){ensureUI();shiftTab=S(tab)||'create';document.getElementById('v310ShiftModal').classList.add('show');try{await renderShift()}catch(e){stmsg('Không tải được dữ liệu giao ca: '+S(e?.message||e))}};
  root.v310ShiftClose=()=>document.getElementById('v310ShiftModal')?.classList.remove('show');
  root.v310ShiftTab=async k=>{shiftTab=S(k);try{await renderShift()}catch(e){stmsg(S(e?.message||e))}};
  root.v310ShiftSubmit=async function(){try{await loadShift();const ids=[...document.querySelectorAll('.v310ShiftCheck:checked:not(:disabled)')].map(x=>S(x.value));if(!ids.length)throw new Error('Chưa chọn công việc cần giao ca.');const to=norm(document.getElementById('v310ShiftTo')?.value);if(!to)throw new Error('Chưa chọn người nhận ca.');const fromP=profileOf(shiftCache.users,me()),toP=profileOf(shiftCache.users,to);if(!fromP||!toP||toP.active===false||!sameUnit(fromP,toP))throw new Error('Người nhận phải ACTIVE và cùng phòng/đơn vị.');const live=await currentManifest(shiftCache.date),items=[];for(const id of ids){const x=live?.items?.[id];if(!x||x.active===false||norm(x.user||x.targetUser)!==me())throw new Error(`Phân công ${id} không còn thuộc tài khoản hiện tại.`);if(activeBatchForAssignment(id))throw new Error(`Phân công ${id} đã có giao ca đang xử lý.`);items.push({assignmentId:id,flightId:S(x.flightId),flightRaw:S(x.flightRaw),flightName:S(x.flightName),formGroup:S(x.formGroup),sourceColumn:S(x.sourceColumn),roleKey:S(x.roleKey),workspaceKey:S(x.workspaceKey||x.rosterWorkspaceKey),assignmentScope:S(x.assignmentScope||'BOTH')})}const reason=S(document.getElementById('v310ShiftReason')?.value),id=batchId(),t=now(),b={id,opDate:shiftCache.date,fromUser:me(),fromName:S(fromP.name||me()),toUser:to,toName:S(toP.name||to),departmentCode:depOf(fromP),groupCode:groupOf(fromP),assignmentIds:ids,items,reason,status:'PENDING_APPROVAL',requestedAtMs:t,updatedAtMs:t,requestedBy:actor(),schema:1,build:BUILD};const patch={[`${SHIFT}/${safe(shiftCache.date)}/${safe(id)}`]:b,[`${SHIFT_MAIL}/${safe(me())}/${safe(id)}`]:{id,opDate:shiftCache.date,status:b.status,updatedAtMs:t}};for(const p of shiftCache.users.filter(x=>U(x.role)==='AD'||(isManager(x)&&depOf(x)===depOf(fromP))))patch[`${SHIFT_MAIL}/${safe(norm(p.username))}/${safe(id)}`]={id,opDate:shiftCache.date,status:b.status,kind:'APPROVAL',updatedAtMs:t};patch[`${SHIFT_MAIL}/AD/${safe(id)}`]={id,opDate:shiftCache.date,status:b.status,kind:'APPROVAL',updatedAtMs:t};await ref('').update(patch);await opsAudit('SHIFT_HANDOVER_REQUESTED',{shiftBatchId:id,toUser:to,assignmentIds:ids,items},reason);alert(`Đã gửi GIAO CA ${items.length} công việc cho ${to}. Bạn vẫn là người phụ trách cho tới khi được duyệt và ${to} bấm TIẾP NHẬN.`);await renderShift()}catch(e){alert('Không gửi được GIAO CA: '+S(e?.message||e))}};
  async function getBatch(id){const s=await ref(`${SHIFT}/${safe(today())}/${safe(id)}`).once('value');return s.val()||null}
  root.v310ShiftApprove=async function(id){try{await loadShift();const b=await getBatch(id);if(!b||U(b.status)!=='PENDING_APPROVAL')throw new Error('Yêu cầu không còn chờ duyệt.');if(!canApprove(b,shiftCache.users))throw new Error('Bạn không có quyền duyệt giao ca của đơn vị này.');const a=actor(),t=now(),patch={};patch[`${SHIFT}/${safe(today())}/${safe(id)}/status`]='APPROVED_WAITING_ACCEPT';patch[`${SHIFT}/${safe(today())}/${safe(id)}/approvedAtMs`]=t;patch[`${SHIFT}/${safe(today())}/${safe(id)}/approvedBy`]=a.username;patch[`${SHIFT}/${safe(today())}/${safe(id)}/approvedByName`]=a.name;patch[`${SHIFT}/${safe(today())}/${safe(id)}/updatedAtMs`]=t;patch[`${SHIFT_MAIL}/${safe(b.toUser)}/${safe(id)}`]={id,opDate:today(),status:'APPROVED_WAITING_ACCEPT',kind:'ACCEPT',updatedAtMs:t};patch[`${SHIFT_MAIL}/${safe(b.fromUser)}/${safe(id)}`]={id,opDate:today(),status:'APPROVED_WAITING_ACCEPT',updatedAtMs:t};await ref('').update(patch);await opsAudit('SHIFT_HANDOVER_APPROVED',{shiftBatchId:id,fromUser:b.fromUser,toUser:b.toUser,assignmentIds:b.assignmentIds});alert(`Đã duyệt. ${b.toUser} phải bấm TIẾP NHẬN CA trước khi quyền được chuyển.`);await renderShift()}catch(e){alert('Không duyệt được: '+S(e?.message||e))}};
  root.v310ShiftReject=async function(id){try{await loadShift();const b=await getBatch(id);if(!b||U(b.status)!=='PENDING_APPROVAL')throw new Error('Yêu cầu không còn chờ duyệt.');if(!canApprove(b,shiftCache.users))throw new Error('Bạn không có quyền từ chối.');const reason=S(prompt('Lý do từ chối giao ca:','')||'');if(!reason)return;const a=actor(),t=now(),patch={};patch[`${SHIFT}/${safe(today())}/${safe(id)}/status`]='REJECTED';patch[`${SHIFT}/${safe(today())}/${safe(id)}/rejectReason`]=reason;patch[`${SHIFT}/${safe(today())}/${safe(id)}/rejectedAtMs`]=t;patch[`${SHIFT}/${safe(today())}/${safe(id)}/rejectedBy`]=a.username;patch[`${SHIFT}/${safe(today())}/${safe(id)}/updatedAtMs`]=t;patch[`${SHIFT_MAIL}/${safe(b.fromUser)}/${safe(id)}`]={id,opDate:today(),status:'REJECTED',updatedAtMs:t};await ref('').update(patch);await opsAudit('SHIFT_HANDOVER_REJECTED',{shiftBatchId:id},reason);await renderShift()}catch(e){alert(S(e?.message||e))}};
  async function mailPayload(user,aid,item,date){try{const s=await ref(`${MAIL}/${safe(user)}/items/${safe(aid)}`).once('value'),v=s.val();if(v)return v}catch(_){}return {engine:'daily-roster-v2',schema:2,assignmentId:aid,opDate:date,flightRaw:S(item.flightRaw),flightName:S(item.flightName),formGroup:S(item.formGroup),sourceColumn:S(item.sourceColumn),roleKey:S(item.roleKey),workspaceKey:S(item.workspaceKey||item.rosterWorkspaceKey),rosterWorkspaceKey:S(item.workspaceKey||item.rosterWorkspaceKey),assignmentScope:S(item.assignmentScope||'BOTH'),active:true}}
  root.v310ShiftAccept=async function(id){try{await loadShift();const b=await getBatch(id);if(!b||U(b.status)!=='APPROVED_WAITING_ACCEPT')throw new Error('Giao ca chưa được duyệt hoặc đã xử lý.');if(norm(b.toUser)!==me())throw new Error('Chỉ đúng người nhận ca mới được TIẾP NHẬN.');const man=await currentManifest(today()),t=now(),target=me(),patch={},changed=[];for(const aid of b.assignmentIds||[]){const item=man?.items?.[aid];if(!item)throw new Error(`Không tìm thấy assignment ${aid}.`);const old=norm(item.user||item.targetUser);if(old!==norm(b.fromUser))throw new Error(`${item.flightRaw||aid}: người phụ trách đã thay đổi thành ${old}; không áp dụng giao ca cũ.`);const payload=await mailPayload(old,aid,item,today()),nextPayload={...payload,targetUser:target,originalTargetUser:item.originalUser||payload.originalTargetUser||old,manualOverride:true,reassignedFrom:old,reassignedAtMs:t,reassignedBy:target,shiftBatchId:id,handoffApprovedBy:S(b.approvedBy),active:true},nextItem={...item,user:target,originalUser:item.originalUser||payload.originalTargetUser||old,manualOverride:true,lastShiftBatchId:id,lastHandoffAtMs:t};patch[`${MAIL}/${safe(old)}/items/${safe(aid)}`]=null;patch[`${MAIL}/${safe(target)}/items/${safe(aid)}`]=nextPayload;patch[`${REVOKE}/${safe(old)}/items/${safe(aid)}`]={assignmentId:aid,reason:'APPROVED_SHIFT_HANDOVER',toUser:target,atMs:t,by:target,shiftBatchId:id};patch[`${REVOKE}/${safe(target)}/items/${safe(aid)}`]=null;patch[`${MANIFEST}/${safe(today())}/items/${safe(aid)}`]=nextItem;patch[`${SESSION}/${safe(aid)}/ownerUser`]=target;patch[`${SESSION}/${safe(aid)}/reassignedAtMs`]=t;patch[`${SESSION}/${safe(aid)}/reassignedBy`]=target;patch[`${SESSION}/${safe(aid)}/shiftBatchId`]=id;const unit=rosterUnit(item);if(unit&&item.flightId)patch[`${FLIGHTS}/${safe(today())}/${safe(item.flightId)}/unitAssignments/${safe(unit)}`]={unit,username:target,name:S(profile().name||target),departmentCode:S(profile().departmentCode||profile().systemDepartment||profile().department),groupCode:S(profile().groupCode||profile().group),claimedAtMs:t,updatedAtMs:t,status:'ACTIVE',claimSource:'SHIFT_HANDOVER',shiftBatchId:id};const hid=`RH_SHIFT_${safe(aid)}_${t}`;patch[`${HANDOFF}/${safe(today())}/${safe(hid)}`]={id:hid,opDate:today(),assignmentId:aid,flightId:S(item.flightId),flightRaw:S(item.flightRaw),flightName:S(item.flightName),formGroup:S(item.formGroup),fromUser:old,toUser:target,status:'COMPLETED',requestedAtMs:Number(b.requestedAtMs||t),approvedAtMs:Number(b.approvedAtMs||t),approvedBy:S(b.approvedBy),acceptedAtMs:t,acceptedBy:target,shiftBatchId:id,reason:S(b.reason),schema:1};changed.push({assignmentId:aid,flightId:S(item.flightId),flightRaw:S(item.flightRaw),formGroup:S(item.formGroup),fromUser:old,toUser:target})}patch[`${SHIFT}/${safe(today())}/${safe(id)}/status`]='COMPLETED';patch[`${SHIFT}/${safe(today())}/${safe(id)}/acceptedAtMs`]=t;patch[`${SHIFT}/${safe(today())}/${safe(id)}/acceptedBy`]=target;patch[`${SHIFT}/${safe(today())}/${safe(id)}/acceptedByName`]=S(profile().name||target);patch[`${SHIFT}/${safe(today())}/${safe(id)}/updatedAtMs`]=t;patch[`${SHIFT_MAIL}/${safe(b.fromUser)}/${safe(id)}`]={id,opDate:today(),status:'COMPLETED',updatedAtMs:t};patch[`${SHIFT_MAIL}/${safe(target)}/${safe(id)}`]={id,opDate:today(),status:'COMPLETED',updatedAtMs:t};await ref('').update(patch);await opsAudit('SHIFT_HANDOVER_ACCEPTED',{shiftBatchId:id,changed},S(b.reason));try{root.dailyRosterRestartMailbox?.()}catch(_){}alert(`ĐÃ TIẾP NHẬN CA · ${changed.length} công việc đã chuyển sang ${target}. MY FLIGHT sẽ cập nhật theo người nhận mới.`);root.v310ShiftClose();setTimeout(()=>root.flightWorkspaceOpenList?.(today()),450)}catch(e){alert('Không tiếp nhận được ca: '+S(e?.message||e))}};

  function ensureNav(){ensureUI();try{document.getElementById('v310ShiftNav')?.remove()}catch(_){}injectFinalShare()}
  function startShiftMail(){try{if(mailRef&&mailCb)mailRef.off('child_added',mailCb)}catch(_){}mailRef=null;mailCb=null}
  function patchFlight(){if(typeof root.flightWorkspaceOpenFlight!=='function'||root.flightWorkspaceOpenFlight.__v310)return;const base=root.flightWorkspaceOpenFlight;root.flightWorkspaceOpenFlight=function(fid){const r=base.apply(this,arguments);setTimeout(()=>injectTaskExports(fid),180);return r};root.flightWorkspaceOpenFlight.__v310=1}
  function sync(){ensureNav();patchFlight();patchAutoNAExportMenu();injectFinalShare();startShiftMail()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(sync,500),{once:true});else setTimeout(sync,500);
  window.addEventListener('pageshow',()=>setTimeout(()=>{ensureNav();patchFlight();patchAutoNAExportMenu();injectFinalShare()},100),{passive:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(()=>{ensureNav();patchFlight();patchAutoNAExportMenu();injectFinalShare()},100)},{passive:true});
  const baseApply=root.applyRoleUI;if(typeof baseApply==='function'&&!baseApply.__v310){root.applyRoleUI=function(){const r=baseApply.apply(this,arguments);setTimeout(()=>{sync()},0);return r};root.applyRoleUI.__v310=1}
  root.__SAGS_V310_BUILD=BUILD;
})(typeof window!=='undefined'?window:globalThis);
/* ===== END clean-ops-v310.js ===== */

}
})();


/* ===== BEGIN contextual-quick-time-v313.js ===== */
/* E-REPORT/SAGS V3.13 · CONTEXTUAL QUICK TIME
 * NHẬP GIỜ NHANH is not a permanent legacy navigation button.
 * It appears only while an eligible assigned form is actually open:
 * FSAGS 42.3 / FSAGS 42.1 / FSAGS 09.
 */
(function(root){'use strict';
  const BUILD='V3.13-20260821-01';
  const firstInstall=!root.__SAGS_V313_QUICK_CONTEXT;
  const S=v=>String(v??'').trim();
  const U=v=>S(v).toUpperCase();
  function group(){try{return S(activeFormGroup).toLowerCase()}catch(_){return S(root.activeFormGroup).toLowerCase()}}
  function sessionId(){try{return S(activeFlightSessionId)}catch(_){return S(root.activeFlightSessionId)}}
  function currentRole(){
    try{return U(root.__sagsGetSession?.()?.role||root.__sagsGetSession?.()?.profile?.role||window.currentRole||root.currentRole)}
    catch(_){return U(root.__sagsGetSession?.()?.role||root.currentRole)}
  }
  function normalizedRole(){
    try{return currentRole().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/\s+/g,'')}catch(_){return currentRole().replace(/Đ/g,'D').replace(/\s+/g,'')}
  }
  function feature(name){try{return normalizedRole()==='AD'||(typeof v485Can==='function'&&v485Can(name))}catch(_){return normalizedRole()==='AD'}}
  function idleVisible(){
    const el=document.getElementById('roleHomeIdle');
    if(!el)return false;
    try{return getComputedStyle(el).display!=='none'}catch(_){return false}
  }
  function eligible(){
    const g=group(),r=normalizedRole();
    if(idleVisible())return false;
    if(g==='fsags'||g==='fsags421')return feature('QUICK_TIME')||r==='DH';
    if(g==='fsags09')return feature('FSAGS09')||r==='PVHK'||r==='AD';
    return false;
  }
  function label(){return '⏱ NHẬP NHANH'}
  function ensureStyle(){
    if(document.getElementById('v313QuickContextStyle'))return;
    const st=document.createElement('style');st.id='v313QuickContextStyle';st.textContent=`
#v313QuickContext{display:none;align-items:center;gap:7px;width:100%;box-sizing:border-box;padding:2px 0 0}
#v313QuickContext.show{display:flex}
#v313QuickContextBtn{min-height:42px;border:0;border-radius:10px;padding:9px 14px;background:#075b9e;color:#fff;font:900 13px Arial;box-shadow:0 2px 6px rgba(0,0,0,.16);cursor:pointer}
#v313QuickContextHint{font:800 10px/1.3 Arial;color:#45647d}
@media(max-width:620px){#v313QuickContext{display:none;grid-template-columns:1fr}#v313QuickContext.show{display:grid}#v313QuickContextBtn{width:100%;font-size:14px;min-height:46px}#v313QuickContextHint{text-align:center}}
@media print{#v313QuickContext{display:none!important}}
`;
    document.head.appendChild(st);
  }
  function ensure(){
    ensureStyle();
    const toolbar=document.querySelector('.toolbar');
    if(!toolbar)return null;
    let box=document.getElementById('v313QuickContext');
    if(!box){
      box=document.createElement('div');box.id='v313QuickContext';
      box.innerHTML='<button id="v313QuickContextBtn" type="button" title="Nhập nhanh">⏱ NHẬP NHANH</button><span id="v313QuickContextHint">Chỉ hiện khi đang mở biểu mẫu hỗ trợ.</span>';
      const nav=document.getElementById('v38CleanNav');
      if(nav?.parentNode===toolbar)nav.insertAdjacentElement('afterend',box);else toolbar.appendChild(box);
      document.getElementById('v313QuickContextBtn').onclick=()=>{
        if(!eligible()){refresh();return alert('NHẬP GIỜ NHANH chỉ dùng khi đang mở đúng FSAGS 42.3 / 42.1 / 09 và tài khoản có quyền thao tác.');}
        try{root.openQuickTimePanel?.()}catch(e){alert('Không mở được NHẬP GIỜ NHANH: '+S(e?.message||e))}
      };
    }
    return box;
  }
  function refresh(){
    const box=ensure();if(!box)return;
    const ok=eligible();box.classList.toggle('show',ok);
    const btn=document.getElementById('v313QuickContextBtn');if(btn)btn.textContent=label();
    const hint=document.getElementById('v313QuickContextHint');
    if(hint)hint.textContent=ok?`Đang mở ${group()==='fsags'?'FSAGS 42.3':group()==='fsags421'?'FSAGS 42.1':'FSAGS 09'} · nhập nhanh các mốc giờ của biểu mẫu này.`:'Chỉ hiện khi đang mở biểu mẫu hỗ trợ.';
  }
  function wrap(name){
    const fn=root[name];if(typeof fn!=='function'||fn.__v313QuickContext)return;
    const w=function(){const r=fn.apply(this,arguments);Promise.resolve(r).finally(()=>setTimeout(refresh,30));return r};
    w.__v313QuickContext=1;root[name]=w;
    try{if(name==='showFormGroup')showFormGroup=w;else if(name==='showRoleHomeIdle')showRoleHomeIdle=w;else if(name==='hideRoleHomeIdle')hideRoleHomeIdle=w;else if(name==='applyRoleUI')applyRoleUI=w;else if(name==='switchFlightSession')switchFlightSession=w}catch(_){}
  }
  ['showFormGroup','showRoleHomeIdle','hideRoleHomeIdle','applyRoleUI','switchFlightSession','selectFormGroup'].forEach(wrap);
  // Keep legacy button state logic alive for compatibility, but the legacy toolbar itself remains hidden in CLEAN workflow.
  const oldRefresh=root.quickTimeRefreshVisibility;
  if(typeof oldRefresh==='function'&&!oldRefresh.__v313QuickContext){
    root.quickTimeRefreshVisibility=function(){const r=oldRefresh.apply(this,arguments);setTimeout(refresh,0);return r};
    root.quickTimeRefreshVisibility.__v313QuickContext=1;
  }
  if(firstInstall){
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)root.v313QuickTimeRefresh?.()});
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>root.v313QuickTimeRefresh?.(),250),{once:true});else setTimeout(()=>root.v313QuickTimeRefresh?.(),250);
  }
  root.v313QuickTimeRefresh=refresh;
  root.__SAGS_V313_QUICK_CONTEXT=BUILD;
})(typeof window!=='undefined'?window:globalThis);
/* ===== END contextual-quick-time-v313.js ===== */

/* ===== BEGIN consolidated-ops-v320.js ===== */
/* E-REPORT/SAGS V3.20 · CONSOLIDATED OPS UPDATE
 * One consolidated operational update on top of V3.16.
 * - Daily Roster preview + explicit AD confirmation
 * - Operational-day rollover through midnight
 * - Flight Workspace summary/progress/docs/timeline/alerts
 * - Direct RAMP sheet transfer for shift continuation (no approval/accept step)
 * - Manual bulk N/A button; export never auto-fills N/A
 * - Quick-time interaction stabilization is completed in index.html
 */
(function(root){'use strict';
  const phase=(document.currentScript&&document.currentScript.dataset&&document.currentScript.dataset.phase)||'';
  if(phase!=='control'||root.__SAGS_V320_CONSOLIDATED)return;
  root.__SAGS_V320_CONSOLIDATED='V3.20-20260821-01';
  const S=v=>String(v??'').trim(), U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return U(v)}};
  const iso=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const yesterday=()=>{const d=new Date();d.setDate(d.getDate()-1);return iso(d)};
  function session(){try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}}
  function profile(){return session().profile||root.currentUserProfile||{}}
  function role(){return U(session().role||profile().role)}
  function me(){return norm(profile().username||(role()==='AD'?'AD':''))}
  function dbref(path){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase RTDB chưa sẵn sàng.');return root.sagsV470Ref(path)}
  function depOf(p){return U(p?.departmentCode||p?.systemDepartment||p?.department||'')}
  function groupOf(p){return U(p?.groupCode||p?.group||'')}
  function sameUnit(a,b){const ad=depOf(a),bd=depOf(b);if(ad&&bd)return ad===bd;const ag=groupOf(a),bg=groupOf(b);return !!ag&&ag===bg}
  function currentOpDate(){
    const stored=S(sessionStorage.getItem('sagsV36FwcDate'));
    const today=iso(),prev=yesterday();
    if(stored===today||stored===prev)return stored;
    return new Date().getHours()<=4?prev:today;
  }
  function selectedDate(){return S(document.getElementById('fwcDate')?.value)||currentOpDate()}
  function selectedFid(){return S(sessionStorage.getItem('sagsV36FwcSelected')||root.__v320SelectedFlight||'')}
  async function audit(event,detail){try{await dbref('ops_audit_v331').push({schema:1,event,systemTimestamp:root.firebase?.database?.ServerValue?.TIMESTAMP||Date.now(),clientAtMs:Date.now(),actor:{username:me(),name:S(profile().name||profile().fullName||me()),role:role(),departmentCode:depOf(profile()),groupCode:groupOf(profile())},detail:detail||{}})}catch(e){console.warn('V3.20 audit',e)}}

  function ensureStyle(){
    if(document.getElementById('v320Style'))return;
    const st=document.createElement('style');st.id='v320Style';st.textContent=`
#v320NaContext{display:none;width:100%;box-sizing:border-box;padding:2px 0 0;gap:7px;align-items:center}#v320NaContext.show{display:flex}#v320NaBtn{min-height:42px;border:0;border-radius:10px;padding:9px 14px;background:#475569;color:#fff;font:900 13px Arial;cursor:pointer}#v320NaHint{font:800 10px/1.3 Arial;color:#45647d}
.v320Core{display:grid;gap:10px;margin:10px 0 14px}.v320Card{border:1px solid #d7e2eb;border-radius:12px;background:#fff;padding:11px;box-sizing:border-box}.v320Title{font:900 14px Arial;color:#123f67;margin-bottom:7px}.v320Sub{font:700 11px/1.45 Arial;color:#607383}.v320Grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.v320Unit{border:1px solid #e1e8ee;border-radius:9px;padding:8px;background:#f8fafc}.v320Unit b{font:900 11px Arial;color:#263f55}.v320Unit span{display:block;margin-top:3px;font:800 10px Arial;color:#687a89}.v320Status{display:inline-flex!important;width:auto!important;border-radius:999px;padding:3px 8px;background:#e8f2fb;color:#145b91!important}.v320Timeline{display:grid;gap:6px}.v320Event{border-left:3px solid #8aa9c0;padding:5px 8px;background:#f8fafc;border-radius:0 8px 8px 0;font:700 11px/1.4 Arial;color:#455d70}.v320Alert{padding:8px;border-radius:8px;background:#fff4df;color:#84540a;font:800 11px/1.4 Arial}.v320RampBtn{border:0;border-radius:9px;padding:9px 11px;background:#0f766e;color:#fff;font:900 12px Arial;cursor:pointer}
#v320RampModal{display:none;position:fixed;inset:0;z-index:19050;background:rgba(0,0,0,.55);align-items:center;justify-content:center;padding:12px;box-sizing:border-box}#v320RampModal.show{display:flex}.v320ModalPanel{width:min(94vw,720px);max-height:90svh;overflow:auto;background:#fff;border-radius:15px;padding:14px;box-sizing:border-box}.v320ModalTop{display:flex;justify-content:space-between;gap:10px;align-items:center}.v320ModalTop h3{margin:0;color:#0b4f91}.v320Btn{border:0;border-radius:9px;padding:9px 12px;background:#0b67b2;color:#fff;font:900 12px Arial;cursor:pointer}.v320Btn.gray{background:#e8eef3;color:#31485a}.v320Btn.green{background:#15803d}.v320Select,.v320Input{width:100%;box-sizing:border-box;padding:9px;border:1px solid #cbd7e0;border-radius:9px;background:#fff}.v320ModalStatus{margin-top:8px;padding:8px;border-radius:8px;background:#eef6ff;color:#294c68;font:700 11px/1.45 Arial;white-space:pre-wrap}
@media(max-width:700px){#v320NaContext.show{display:grid}.v320Grid{grid-template-columns:1fr}.v320ModalPanel{max-height:92svh}.v320RampBtn{width:100%}}
@media print{#v320NaContext,.v320RampBtn,#v320RampModal{display:none!important}}
`;
    document.head.appendChild(st);
  }

  /* DAILY ROSTER: preview first, explicit confirmation only. */
  function prepareRosterUi(){
    const modal=document.getElementById('dailyRosterModal');if(!modal)return;
    const h=modal.querySelector('.drHead h3');if(h)h.textContent='📋 DAILY ROSTER · XEM TRƯỚC & XÁC NHẬN';
    const sub=modal.querySelector('.drHead .drSub');if(sub)sub.innerHTML='<b>Bước 1:</b> chọn file → hệ thống chỉ đọc và hiển thị PREVIEW. <b>Bước 2:</b> AD kiểm tra rồi bấm XÁC NHẬN TẠO CHUYẾN. Chưa xác nhận thì không ghi Flight Record/Assignment.';
    const b=document.getElementById('drPublishBtn');if(b){b.textContent='✓ XÁC NHẬN TẠO CHUYẾN';b.parentElement.style.display='flex';}
  }
  const baseRosterOpen=root.openDailyRosterManager;
  if(typeof baseRosterOpen==='function')root.openDailyRosterManager=function(){const r=baseRosterOpen.apply(this,arguments);setTimeout(prepareRosterUi,0);return r};
  const baseRosterLoad=root.dailyRosterLoadFile;
  if(typeof baseRosterLoad==='function')root.dailyRosterLoadFile=async function(file){
    if(!file)return false;
    root.openDailyRosterManager?.();prepareRosterUi();
    const inp=document.getElementById('drFile');
    if(inp&&inp.files?.[0]!==file){try{const dt=new DataTransfer();dt.items.add(file);inp.files=dt.files}catch(_){}}
    await root.dailyRosterReadPreview?.();prepareRosterUi();
    const stat=document.getElementById('drStatus');if(stat&&!stat.classList.contains('err'))stat.textContent='✓ ĐÃ ĐỌC DAILY ROSTER · CHƯA TẠO CHUYẾN. AD kiểm tra bảng PREVIEW rồi bấm XÁC NHẬN TẠO CHUYẾN.';
    return !!document.getElementById('drPublishBtn')&&!document.getElementById('drPublishBtn').disabled;
  };
  const baseRosterPublish=root.dailyRosterPublish;
  if(typeof baseRosterPublish==='function')root.dailyRosterPublish=async function(){
    prepareRosterUi();const ok=await baseRosterPublish.apply(this,arguments);
    if(ok&&!root.__SAGS_ROSTER_LAST_DELTA?.noChange)void audit('DAILY_ROSTER_CONFIRMED',{opDate:S(document.getElementById('drManageDate')?.value),sourceFile:S(document.getElementById('drFile')?.files?.[0]?.name),deltaWrites:Number(root.__SAGS_ROSTER_LAST_DELTA?.writes||0),deltaRemoves:Number(root.__SAGS_ROSTER_LAST_DELTA?.removes||0)});
    return ok;
  };
  root.flightWorkspacePickRoster=function(){if(role()!=='AD')return;root.openDailyRosterManager?.();setTimeout(()=>{prepareRosterUi();document.getElementById('drFile')?.click()},30)};

  /* OPERATIONAL DAY rollover: preserve previous operational day during the overnight window. */
  const baseOpenList=root.flightWorkspaceOpenList;
  if(typeof baseOpenList==='function'){
    const w=function(date){const d=S(date)||currentOpDate();try{sessionStorage.setItem('sagsV36FwcDate',d)}catch(_){}return baseOpenList.call(this,d)};
    w.__v38=baseOpenList.__v38||1;w.__v320=1;root.flightWorkspaceOpenList=w;
  }
  const navFlights=document.getElementById('v38NavFlights');if(navFlights)navFlights.onclick=()=>root.flightWorkspaceOpenList?.(currentOpDate());

  /* N/A is manual only. No silent/export path is allowed to fill it. */
  const originalFillNA=root.fillBlankNA;
  if(typeof originalFillNA==='function'){
    root.fillBlankNA=function(options){
      const auto=options&&typeof options==='object'&&(options.silent===true||U(options.source)==='EXPORT');
      if(auto)return 0;
      return originalFillNA.apply(this,arguments);
    };
    try{fillBlankNA=root.fillBlankNA}catch(_){}
  }
  function activeGroup(){try{return S(activeFormGroup)}catch(_){return S(root.activeFormGroup||'')}}
  function activeSid(){try{return S(activeFlightSessionId)}catch(_){return S(root.activeFlightSessionId||'')}}
  function formActive(){
    const idle=document.getElementById('roleHomeIdle'),g=activeGroup();
    return !!activeSid()&&!!g&&(!idle||getComputedStyle(idle).display==='none');
  }
  function ensureNaContext(){
    ensureStyle();const toolbar=document.querySelector('.toolbar');if(!toolbar)return null;
    let box=document.getElementById('v320NaContext');if(!box){box=document.createElement('div');box.id='v320NaContext';box.innerHTML='<button id="v320NaBtn" type="button" title="Điền N/A vào các ô trống">N/A Ô TRỐNG</button><span id="v320NaHint">Chỉ điền khi người dùng chủ động bấm.</span>';const q=document.getElementById('v313QuickContext');if(q?.parentNode===toolbar)q.insertAdjacentElement('afterend',box);else toolbar.appendChild(box);document.getElementById('v320NaBtn').onclick=()=>{if(!formActive())return; if(!confirm('Điền N/A cho các ô trống trong biểu mẫu hiện tại?\n\nDữ liệu đã nhập sẽ được giữ nguyên.'))return;try{root.fillBlankNA?.()}catch(e){alert('Không điền N/A được: '+S(e?.message||e))}}}return box;
  }
  function refreshNa(){const b=document.getElementById('v320NaContext');if(b){b.classList.remove('show');b.style.setProperty('display','none','important')}}

  /* FLIGHT WORKSPACE core view + direct RAMP transfer. */
  const UNITS=['DH','CBTT','PVHK','HLNG','CARGO','VSTB','VHTTB','KTTB','LNF'];
  const UNIT_LABEL={DH:'ĐH',CBTT:'CBTT',PVHK:'PVHK',HLNG:'HLNG',CARGO:'Cargo',VSTB:'VSTB',VHTTB:'VHTTB',KTTB:'KTTB',LNF:'LNF'};
  function deriveStatus(rec){const mods=rec?.modules||{},final=U(mods['FINAL']?.status),ramp=U(mods['RAMP']?.status),all=Object.values(mods);if(rec?.closedAtMs||rec?.doorClose||/CLOSED|ĐÓNG/.test(ramp))return 'CLOSED';if(/CROSSCHECK.*OK|HOÀN TẤT|FINALIZED|SENT|ĐÃ GỬI/.test(final))return 'FINALIZED';if(all.length||Object.keys(rec?.unitAssignments||{}).length)return 'IN OPERATION';return 'READY'}
  function unitStatus(rec,u){const a=rec?.unitAssignments?.[u]||rec?.unitAssignments?.[u==='CARGO'?'KH':u];const mods=rec?.modules||{};let m=null;if(u==='DH')m=mods['RAMP'];else if(u==='PVHK')m=mods['KẾT SỔ'];else if(u==='CBTT')m=mods['FINAL'];else if(u==='CARGO')m=mods['HÀNG HÓA'];if(m)return `${S(m.status||'ĐÃ CÓ')}${a?.username?' · '+S(a.name||a.username):''}`;return a?.username?`ĐANG PHỤ TRÁCH · ${S(a.name||a.username)}`:'CHƯA NHẬN'}
  function majorTimeline(rec){const arr=Object.values(rec?.timeline||{}).filter(Boolean).sort((a,b)=>Number(b.atMs||0)-Number(a.atMs||0));return arr.filter(x=>{const s=U(`${x.kind} ${x.status}`);return /KẾT SỔ|FINAL|CROSSCHECK|RAMP|HOÀN TẤT|SENT|GỬI|COMPLETE/.test(s)}).slice(0,8)}
  function fmtAt(ms){if(!Number(ms))return '';try{return new Date(Number(ms)).toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false})}catch(_){return ''}}
  async function getFlight(date,fid){return (await dbref(`flight_records/${safe(date)}/${safe(fid)}`).once('value')).val()||null}
  async function getManifest(date){return (await dbref(`roster_manifests/${safe(date)}`).once('value')).val()||{}}
  async function enhanceWorkspace(fid){
    fid=S(fid);if(!fid)return;root.__v320SelectedFlight=fid;try{sessionStorage.setItem('sagsV36FwcSelected',fid)}catch(_){}
    const body=document.getElementById('fwcBody');if(!body)return;body.querySelectorAll('.v320Core').forEach(x=>x.remove());
    const date=selectedDate();let rec=null,man={};try{[rec,man]=await Promise.all([getFlight(date,fid),getManifest(date)])}catch(e){console.warn('V3.20 workspace read',e);return}if(!rec)return;
    const head=body.querySelector('.fwcWorkspaceHead');if(!head)return;
    let status=head.querySelector('.v320Status');if(!status){status=document.createElement('span');status.className='v320Status';head.appendChild(status)}status.textContent=deriveStatus(rec);
    const myRamp=Object.values(man?.items||{}).filter(x=>x&&x.active!==false&&(S(x.flightId)||S(root.sagsV346ResolveRosterFlightId?.(date,x,{})))===fid&&norm(x.user||x.targetUser)===me()&&['FSAGS','FSAGS421','FSAGS551'].includes(U(x.formGroup)));
    const ops=body.querySelector('.v38MyOps');if(myRamp.length&&ops&&!ops.querySelector('.v320RampBtn')){const b=document.createElement('button');b.className='v320RampBtn';b.textContent='↪ CHUYỂN TỜ RAMP CA SAU';b.onclick=()=>root.v320OpenRampTransfer(fid);ops.querySelector('.v38MyOpsBtns')?.appendChild(b)}
    const tl=majorTimeline(rec),alerts=Object.values(rec?.alerts||{}).filter(x=>x&&x.active!==false).slice(0,6),mods=Object.entries(rec?.modules||{});
    const core=document.createElement('div');core.className='v320Core';core.innerHTML=`
      <div class="v320Card"><div class="v320Title">TIẾN ĐỘ CHUYẾN</div><div class="v320Grid">${UNITS.map(u=>`<div class="v320Unit"><b>${esc(UNIT_LABEL[u])}</b><span>${esc(unitStatus(rec,u))}</span></div>`).join('')}</div></div>
      <div class="v320Card"><div class="v320Title">HỒ SƠ CHUYẾN</div><div class="v320Sub">Flight ID: <b>${esc(fid)}</b> · ${mods.length?mods.map(([k,v])=>`${esc(k)}: ${esc(v?.status||'ĐÃ CÓ')}`).join(' · '):'Chưa phát sinh module nghiệp vụ.'}<br>Xuất/Chia sẻ chỉ dùng các nút của đúng nhiệm vụ được phân quyền phía trên.</div></div>
      <div class="v320Card"><div class="v320Title">TIMELINE · MỐC CHÍNH</div><div class="v320Timeline">${tl.length?tl.map(x=>`<div class="v320Event"><b>${esc(x.kind||'SỰ KIỆN')}</b> · ${esc(x.status||'')} ${fmtAt(x.atMs)?`· ${esc(fmtAt(x.atMs))}`:''}</div>`).join(''):'<div class="v320Sub">Chưa có mốc nghiệp vụ chính.</div>'}</div></div>
      <div class="v320Card"><div class="v320Title">CẢNH BÁO CỦA CHUYẾN</div>${alerts.length?alerts.map(x=>`<div class="v320Alert">${esc(x.title||x.kind||'CẢNH BÁO')} · ${esc(x.text||x.message||x.status||'')}</div>`).join(''):'<div class="v320Sub">Không có cảnh báo đang hoạt động được gắn vào Flight Record.</div>'}</div>`;
    const exportBox=body.querySelector('.v310TaskDocs');if(exportBox)exportBox.insertAdjacentElement('afterend',core);else (ops||head).insertAdjacentElement('afterend',core);
  }
  const baseOpenFlight=root.flightWorkspaceOpenFlight;
  if(typeof baseOpenFlight==='function'){
    const w=function(fid){const r=baseOpenFlight.apply(this,arguments);setTimeout(()=>enhanceWorkspace(fid),320);setTimeout(()=>enhanceWorkspace(fid),850);return r};
    w.__v38=baseOpenFlight.__v38||1;w.__v310=baseOpenFlight.__v310||1;w.__v320=1;root.flightWorkspaceOpenFlight=w;
  }

  function ensureRampModal(){if(document.getElementById('v320RampModal'))return;ensureStyle();const d=document.createElement('div');d.id='v320RampModal';d.innerHTML='<div class="v320ModalPanel"><div class="v320ModalTop"><h3>↪ CHUYỂN TỜ RAMP CA SAU</h3><button class="v320Btn gray" onclick="v320CloseRampTransfer()">ĐÓNG</button></div><div class="v320ModalStatus" id="v320RampInfo">Đang tải...</div><div style="margin-top:9px"><select class="v320Select" id="v320RampTo"><option value="">-- Chọn người ca sau cùng đơn vị --</option></select></div><div style="margin-top:10px"><button class="v320Btn green" id="v320RampGo" onclick="v320RampTransferNow()">CHUYỂN NGAY</button></div><div class="v320Sub" style="margin-top:8px">Không duyệt, không cần người nhận xác nhận. Dữ liệu TIME vẫn nằm trên cùng tờ RAMP; hệ thống chỉ đổi người tiếp tục nhập.</div></div>';document.body.appendChild(d)}
  let rampCtx={date:'',fid:'',items:[],users:[]};
  root.v320OpenRampTransfer=async function(fid){try{ensureRampModal();const date=selectedDate(),man=await getManifest(date),items=Object.values(man?.items||{}).filter(x=>x&&x.active!==false&&(S(x.flightId)||S(root.sagsV346ResolveRosterFlightId?.(date,x,{})))===S(fid)&&norm(x.user||x.targetUser)===me()&&['FSAGS','FSAGS421','FSAGS551'].includes(U(x.formGroup)));if(!items.length)throw new Error('Không có tờ RAMP đang thuộc tài khoản hiện tại trên chuyến này.');const users=typeof root.v466GetUserCatalog==='function'?await root.v466GetUserCatalog(true):[],mine=profile(),cands=(users||[]).filter(x=>x&&x.active!==false&&norm(x.username)!==me()&&sameUnit(mine,x));rampCtx={date,fid:S(fid),items,users:cands};document.getElementById('v320RampInfo').textContent=`${items.length} tờ/assignment RAMP · chuyến ${S(items[0]?.flightRaw||items[0]?.flightName||fid)} · ngày khai thác ${date}.`;document.getElementById('v320RampTo').innerHTML='<option value="">-- Chọn người ca sau cùng đơn vị --</option>'+cands.map(x=>`<option value="${esc(norm(x.username))}">${esc(x.name||x.fullName||x.username)} (${esc(x.username)})</option>`).join('');document.getElementById('v320RampModal').classList.add('show')}catch(e){alert('Không mở được chuyển tờ RAMP: '+S(e?.message||e))}};
  root.v320CloseRampTransfer=function(){document.getElementById('v320RampModal')?.classList.remove('show')};
  root.v320RampTransferNow=async function(){
    const to=norm(document.getElementById('v320RampTo')?.value);if(!to)return alert('Chọn người ca sau.');const target=rampCtx.users.find(x=>norm(x.username)===to);if(!target)return alert('Người nhận không còn hợp lệ/cùng đơn vị.');
    const btn=document.getElementById('v320RampGo');if(btn)btn.disabled=true;
    try{const t=Date.now(),patch={},from=me();for(const item of rampCtx.items){const aid=S(item.assignmentId);let payload={};try{payload=(await dbref(`roster_mail/${safe(from)}/items/${safe(aid)}`).once('value')).val()||{}}catch(_){}const nextPayload={...payload,...item,assignmentId:aid,targetUser:to,active:true,manualOverride:true,reassignedFrom:from,reassignedAtMs:t,reassignedBy:from,transferType:'RAMP_DIRECT_SHIFT'};const nextItem={...item,user:to,manualOverride:true,lastHandoffAtMs:t,lastHandoffBy:from,lastHandoffType:'RAMP_DIRECT_SHIFT'};patch[`roster_mail/${safe(from)}/items/${safe(aid)}`]=null;patch[`roster_mail/${safe(to)}/items/${safe(aid)}`]=nextPayload;patch[`roster_revocations/${safe(from)}/items/${safe(aid)}`]={assignmentId:aid,reason:'RAMP_DIRECT_TRANSFER',toUser:to,atMs:t,by:from};patch[`roster_revocations/${safe(to)}/items/${safe(aid)}`]=null;patch[`roster_manifests/${safe(rampCtx.date)}/items/${safe(aid)}`]=nextItem;patch[`roster_sessions/${safe(aid)}/ownerUser`]=to;patch[`roster_sessions/${safe(aid)}/reassignedAtMs`]=t;patch[`roster_sessions/${safe(aid)}/reassignedBy`]=from;patch[`roster_sessions/${safe(aid)}/handoffType`]='RAMP_DIRECT_SHIFT';const ev=`RAMP_SHIFT_${t}_${safe(aid)}`;patch[`flight_records/${safe(rampCtx.date)}/${safe(rampCtx.fid)}/rampTransferHistory/${safe(ev)}`]={eventId:ev,assignmentId:aid,fromUser:from,toUser:to,atMs:t,type:'RAMP_DIRECT_SHIFT'};patch[`flight_records/${safe(rampCtx.date)}/${safe(rampCtx.fid)}/unitAssignments/DH`]={unit:'DH',username:to,name:S(target.name||target.fullName||to),departmentCode:S(target.departmentCode||target.systemDepartment||target.department),groupCode:S(target.groupCode||target.group),updatedAtMs:t,status:'ACTIVE',claimSource:'RAMP_DIRECT_SHIFT'};}await dbref('').update(patch);await audit('RAMP_DIRECT_TRANSFER',{flightId:rampCtx.fid,opDate:rampCtx.date,fromUser:from,toUser:to,assignmentIds:rampCtx.items.map(x=>S(x.assignmentId))});try{root.dailyRosterRestartMailbox?.()}catch(_){}root.v320CloseRampTransfer();alert(`ĐÃ CHUYỂN TỜ RAMP · ${from} → ${to}. Không cần duyệt/xác nhận.`);setTimeout(()=>root.flightWorkspaceOpenList?.(rampCtx.date),350)}catch(e){alert('Không chuyển được tờ RAMP: '+S(e?.message||e))}finally{if(btn)btn.disabled=false}
  };

  function sync(){ensureStyle();prepareRosterUi();refreshNa();const nav=document.getElementById('v38NavFlights');if(nav)nav.onclick=()=>root.flightWorkspaceOpenList?.(currentOpDate())}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(sync,650),{once:true});else setTimeout(sync,650);
  const baseApply=root.applyRoleUI;if(typeof baseApply==='function'&&!baseApply.__v320){root.applyRoleUI=function(){const r=baseApply.apply(this,arguments);setTimeout(sync,20);return r};root.applyRoleUI.__v320=1;try{applyRoleUI=root.applyRoleUI}catch(_){}}
  ['showFormGroup','showRoleHomeIdle','hideRoleHomeIdle','switchFlightSession'].forEach(name=>{const fn=root[name];if(typeof fn!=='function'||fn.__v320)return;const w=function(){const r=fn.apply(this,arguments);Promise.resolve(r).finally(()=>setTimeout(refreshNa,35));return r};w.__v320=1;root[name]=w;try{if(name==='showFormGroup')showFormGroup=w;else if(name==='showRoleHomeIdle')showRoleHomeIdle=w;else if(name==='hideRoleHomeIdle')hideRoleHomeIdle=w;else if(name==='switchFlightSession')switchFlightSession=w}catch(_){}});
  setTimeout(sync,1200);
})(typeof window!=='undefined'?window:globalThis);
/* ===== END consolidated-ops-v320.js ===== */

/* V3.23 */



/* ===== BEGIN v324-direct-myflight-handover.js ===== */
(function(root){'use strict';
  const BUILD='V3.31-20260826-01';
  const S=v=>String(v??'').trim(), U=v=>S(v).toUpperCase();
  const norm=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return U(v)}};
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sess=()=>{try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}};
  const role=()=>U(sess().role||sess().profile?.role), profile=()=>sess().profile||{}, me=()=>norm(profile().username||(role()==='AD'?'AD':''));
  const dateNow=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const opDate=()=>S(sessionStorage.getItem('sagsV36FwcDate'))||S(document.getElementById('fwcDate')?.value)||dateNow();
  function db(path){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase RTDB chưa sẵn sàng.');return root.sagsV470Ref(path)}
  function multiKey(d=opDate()){return `sagsV323Multi:${me()||'UNKNOWN'}:${d}`}
  function multiSet(d=opDate()){try{return new Set(JSON.parse(sessionStorage.getItem(multiKey(d))||'[]').map(S).filter(Boolean))}catch(_){return new Set()}}
  function multiSave(set,d=opDate()){try{sessionStorage.setItem(multiKey(d),JSON.stringify([...set].filter(Boolean)))}catch(_){}}
  function multiAdd(fid,d=opDate()){const x=multiSet(d);x.add(S(fid));multiSave(x,d)}
  function multiRemove(fid,d=opDate()){const x=multiSet(d);x.delete(S(fid));multiSave(x,d)}
  async function manifest(d=opDate()){return (await db(`roster_manifests/${safe(d)}`).once('value')).val()||{}}
  async function sessionState(aid){
    try{
      const direct=(await db(`roster_sessions/${safe(aid)}`).once('value')).val()||{};
      let legacy=null;try{legacy=await root.rosterWorkspaceLegacyRead?.(aid)||null}catch(_){}
      if(!legacy)return direct;
      const out={...direct};
      for(const k of ['envelope','completionEnvelope','handoverEnvelope','rosterSeed'])if(!out[k]&&legacy?.[k])out[k]=clone(legacy[k]);
      return out;
    }catch(_){return {}}
  }
  function itemFlightId(man,item){const fid=S(item?.flightId)||S(root.sagsV346ResolveRosterFlightId?.(S(man?.opDate)||opDate(),item,{}));if(fid&&item&&!item.flightId)item.flightId=fid;return fid}
  function itemsOf(man){return Object.values(man?.items||{}).filter(x=>x&&x.active!==false).map(x=>{itemFlightId(man,x);return x})}
  function myItems(man,fid){const u=me();return itemsOf(man).filter(x=>itemFlightId(man,x)===S(fid)&&norm(x.user||x.targetUser)===u)}
  function laneKey(x){return [S(x?.flightId),U(x?.sourceColumn),U(x?.roleKey),U(x?.formGroup)].join('|')}
  function laneLegRank(x){const l=U(x?.assignmentLeg);return l==='ARR'?0:l==='DEP'?2:1}
  function coGroupId(x){return S(x?.coAssigneeGroupId)}
  function sameCoGroup(a,b){const ga=coGroupId(a),gb=coGroupId(b);return !!(ga&&gb&&ga===gb)}
  function lane(man,item){const k=laneKey(item),a=itemsOf(man).filter(x=>laneKey(x)===k);return a.map((x,i)=>({x,i,n:Number(x?.workPartOrder),leg:laneLegRank(x),co:Number(x?.coAssigneeRank)||9999})).sort((p,q)=>{if(p.leg!==q.leg)return p.leg-q.leg;const ph=Number.isFinite(p.n)&&p.n>0,qh=Number.isFinite(q.n)&&q.n>0;if(ph&&qh){const d=p.n-q.n;if(d)return d;const c=p.co-q.co;if(c)return c;return p.i-q.i}if(ph!==qh)return ph?-1:1;return p.co-q.co||p.i-q.i}).map(v=>v.x)}
  function coPeers(man,item){const gid=coGroupId(item);return gid?lane(man,item).filter(x=>S(x.assignmentId)!==S(item?.assignmentId)&&coGroupId(x)===gid):[]}
  function nextItem(man,item){const a=lane(man,item),i=a.findIndex(x=>S(x.assignmentId)===S(item?.assignmentId));if(i<0)return null;for(let j=i+1;j<a.length;j++)if(!sameCoGroup(a[j],item))return a[j];return null}
  function previousItem(man,item){const a=lane(man,item),i=a.findIndex(x=>S(x.assignmentId)===S(item?.assignmentId));if(i<0)return null;for(let j=i-1;j>=0;j--)if(!sameCoGroup(a[j],item))return a[j];return null}
  function firstItem(man,item){return !previousItem(man,item)}
  // V1.1.42: comma co-assignees are one work part. Completing one member completes/skips
  // the other peers in that same group, then handover continues to the next real work part.
  // The V1.1.38 duplicate-self rule is then applied only AFTER the current co-assignee group.
  function handoverSelection(man,item){
    const seq=lane(man,item),i=seq.findIndex(x=>S(x.assignmentId)===S(item?.assignmentId));
    if(i<0)return {next:null,skipped:[],coPeers:[]};
    const gid=coGroupId(item),peers=gid?seq.filter(x=>S(x.assignmentId)!==S(item?.assignmentId)&&coGroupId(x)===gid):[];
    let after=i+1;if(gid){for(let j=i+1;j<seq.length;j++){if(coGroupId(seq[j])===gid)after=j+1;else break}}
    if(after>=seq.length)return {next:null,skipped:[],coPeers:peers};
    const tail=seq.slice(after),from=norm(item?.user||item?.targetUser);
    const differentIndex=tail.findIndex(x=>norm(x?.user||x?.targetUser)!==from);
    if(differentIndex<0)return {next:tail[0]||null,skipped:[],coPeers:peers};
    return {next:tail[differentIndex]||null,skipped:tail.slice(0,differentIndex).filter(x=>norm(x?.user||x?.targetUser)===from),coPeers:peers};
  }
  async function previousCompleted(man,item){const prev=previousItem(man,item);if(!prev)return true;const pst=await sessionState(prev.assignmentId),pcs=U(pst.claimStatus),pws=U(pst.workPartStatus);if(pst.skippedNoEform===true||pst.autoSkippedByNextUser===true||pcs==='SKIPPED'||pws==='SKIPPED')return true;let pts='';try{pts=U(root.sagsTaskStatusDerive?.(pst,prev,man)||pst.taskStatusV333||pst.taskStatus)}catch(_){pts=U(pst.taskStatusV333||pst.taskStatus)}if(pts==='COMPLETED'||pcs==='PART_COMPLETED'||pcs==='COMPLETED'||pcs==='HANDED_OVER'||pws==='COMPLETED')return true;if(U(prev.formGroup)==='FINAL'&&S(prev.flightId)){try{const fr=(await db(`flight_records/${safe(S(man?.opDate)||opDate())}/${safe(prev.flightId)}/modules/FINAL`).once('value')).val()||{},fs=U(`${fr.status||''} ${fr.crosscheckStatus||''}`);if(/CROSSCHECK.*OK|COMPLETE|COMPLETED|HOÀN TẤT|HOAN TAT/.test(fs))return true}catch(_){}}return false}
  function rosterLabel(item){return S(item?.assignmentFlight||item?.flightName||item?.flightRaw||item?.depFlight||item?.arrFlight||item?.flightId)}
  function formLabel(g){g=U(g);return g==='FINAL'?'CBTT · FINAL':g==='FSAGS421'?'FSAGS 42.1':g==='FSAGS551'?'FSAGS 55.1':g==='FSAGS09'?'F/SAGS-CXR/09':g==='LOADING208'?'F/SAG-CXR/208':'FSAGS 42.3'}
  function localMeta(aid){try{return (root.readFlightSessionList?.()||[]).find(x=>S(x.rosterAssignmentId)===S(aid))||null}catch(_){return null}}
  function activeMeta(){try{return root.currentFlightSessionMeta?.()||null}catch(_){return null}}
  function clone(v){try{return JSON.parse(JSON.stringify(v))}catch(_){return {}}}
  function sanitizeEnvelope(env){env=env&&typeof env==='object'?env:{};const src=env.state&&typeof env.state==='object'?env.state:{},state={};for(const [k,v] of Object.entries(src)){if(/attachment/i.test(k))continue;try{const z=JSON.stringify(v);if(z.length<=180000)state[k]=JSON.parse(z)}catch(_){}}return {state,mainForm:S(env.mainForm||env.activeFormGroup||'fsags'),activeFormGroup:S(env.mainForm||env.activeFormGroup||'fsags'),currentPage:Number(env.currentPage)||1,scrollY:0,arrivalOp:S(env.arrivalOp||'passenger'),departureOp:S(env.departureOp||'passenger'),rosterSeed:clone(env.rosterSeed||{})}}
  function addAudit(type,detail){try{return db('ops_audit_v331').push({schema:1,event:type,systemTimestamp:root.firebase?.database?.ServerValue?.TIMESTAMP||Date.now(),clientAtMs:Date.now(),actor:{username:me(),name:S(profile().name||profile().fullName||me()),role:role()},flightId:S(detail?.flightId),flightLabel:S(detail?.flightLabel),detail:detail||{}})}catch(_){}}

  function ensureCss(){if(document.getElementById('sagsV324Style'))return;const st=document.createElement('style');st.id='sagsV324Style';st.textContent=`
  .v324ClaimBadge{display:inline-flex;align-items:center;border-radius:999px;padding:3px 7px;margin-left:5px;font:900 10px Arial;background:#e7f2ff;color:#07599d}.v324ClaimBadge.wait{background:#fff3cd;color:#855a00}.v324ClaimBadge.standby{background:#eaf2ff;color:#264f7d}.v324ClaimBadge.done{background:#e8f5ed;color:#17663b}.v324ClaimBadge.blocked{background:#fee2e2;color:#991b1b}.v324ClaimBadge.na{background:#eef2f7;color:#596b7a}.v324ClaimBadge.skipped{background:#f3f0ff;color:#5b3f91}
  #v324FormActions{grid-column:1/-1;display:none;gap:5px;min-width:0;width:100%;margin:0;padding:0}#v324FormActions.show{display:grid}#v324FormActions.one{grid-template-columns:1fr}#v324FormActions.two{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}#v324FormActions.three{grid-template-columns:minmax(0,.9fr) minmax(0,1.05fr) minmax(0,.95fr)}.v324FormAction{min-height:34px;border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:5px 8px;font:900 10.5px/1.1 Arial;box-shadow:none;touch-action:manipulation;white-space:normal}.v324Export{background:#e8f7f4;color:#086b62;border-color:#a9d9d2}.v324Handover{background:#fff2dd;color:#9a4d00;border-color:#ebc18e}.v324Qr{background:#e7f1ff;color:#064f9e;border-color:#9fc2ea}
  .fwcFlight .v324ReceiveBtn[disabled]{background:#e5eaee!important;color:#667785!important;cursor:not-allowed!important}.fwcFlight .v324ReceiveBtn.wait{background:#fff4d6!important;color:#7c5600!important}.fwcFlight .v324ReceiveBtn.standby{background:#edf4ff!important;color:#2b567f!important}.fwcFlight .v324ReceiveBtn.done{background:#eef2f5!important;color:#5b6c79!important}.fwcFlight .v324ReceiveBtn.blocked{background:#fee2e2!important;color:#991b1b!important}.fwcFlight .v324ReceiveBtn.na{background:#eef2f7!important;color:#596b7a!important}.fwcFlight .v324ReceiveBtn.takeover{background:#fff0dc!important;color:#8a4300!important;border-color:#e5b77e!important}.fwcFlight .v324ReceiveBtn.skipped{background:#f3f0ff!important;color:#5b3f91!important}
  @media(max-width:520px){#v324FormActions.three{grid-template-columns:minmax(0,.85fr) minmax(0,1fr) minmax(0,.9fr)}#v324FormActions.two{grid-template-columns:1fr 1fr}.v324FormAction{font-size:9.5px;padding:5px 4px}}
  `;document.head.appendChild(st)}

  async function activeCoOwner(man,item){
    const gid=coGroupId(item);if(!gid)return null;
    for(const peer of lane(man,item).filter(x=>coGroupId(x)===gid)){
      const pst=await sessionState(peer.assignmentId),pcs=U(pst.claimStatus),pts=U(pst.taskStatusV333||pst.taskStatus),pws=U(pst.workPartStatus);
      if(['PART_COMPLETED','COMPLETED','HANDED_OVER'].includes(pcs)||pts==='COMPLETED'||pws==='COMPLETED')continue;
      if(pcs==='CLAIMED'||pts==='IN_PROGRESS')return {user:norm(pst.claimedBy||pst.ownerUser||peer.user||peer.targetUser),assignmentId:S(peer.assignmentId),st:pst,item:peer};
    }
    return null;
  }
  // V1.1.45: người ở work part phía sau có thể NHẬN THAY khi work part trước
  // chưa từng được nhận/thực hiện E-FORM. Không ghi HOÀN THÀNH giả cho người trước;
  // assignment trước được đánh dấu SKIPPED · KHÔNG THỰC HIỆN E-FORM và có audit rõ ràng.
  function previousWorkPartMembers(man,item){
    const prev=previousItem(man,item);if(!prev)return [];
    const gid=coGroupId(prev);return gid?lane(man,prev).filter(x=>coGroupId(x)===gid):[prev];
  }
  function untouchedForTakeover(st){
    st=st&&typeof st==='object'?st:{};
    const cs=U(st.claimStatus),ts=U(st.taskStatusV333||st.taskStatus),ws=U(st.workPartStatus);
    if(st.skippedNoEform===true||st.autoSkippedByNextUser===true)return false;
    if(['PART_COMPLETED','COMPLETED','HANDED_OVER','SKIPPED'].includes(cs))return false;
    if(['COMPLETED','BLOCK','NOT_APPLICABLE'].includes(ts))return false;
    if(['IN_PROGRESS','COMPLETED','SKIPPED'].includes(ws))return false;
    if(Number(st.reopenedAtMs||st.completedAtMs||st.handoverQrClaimedAtMs||0)>0)return false;
    if(norm(st.completedBy||st.handoverQrClaimedBy))return false;
    // handoverEnvelope có thể được hệ thống tự chuyển tới assignment dù người đó chưa hề mở E-FORM.
    // Vì vậy chỉ completionEnvelope mới là bằng chứng mạnh của thao tác trước đó.
    if(st.completionEnvelope)return false;
    return true;
  }
  async function assertPreviousUntouched(man,item){
    const members=previousWorkPartMembers(man,item);if(!members.length)throw new Error('Không có phần công việc trước để bỏ qua.');
    const rows=[];
    for(const prev of members){const st=await sessionState(prev.assignmentId);rows.push({item:prev,st});if(!untouchedForTakeover(st)){const who=norm(st.claimedBy||st.coClaimedBy||st.completedBy||prev.user||prev.targetUser)||'người trước';throw new Error(`Không thể NHẬN THAY: phần trước của ${who} đã thực sự xử lý/hoàn tất E-FORM. Hãy dùng luồng bàn giao/tiếp tục để bảo toàn dữ liệu.`)}}
    return rows;
  }
  async function skipPreviousAndClaim(d,fid,item,man){
    const actor=me(),t=Date.now(),rows=await assertPreviousUntouched(man,item),patch={},skippedIds=[],skippedUsers=[];
    const currentAid=S(item.assignmentId);if(!currentAid)throw new Error('Không xác định được assignment cần nhận.');
    for(const row of rows){const prev=row.item,aid=S(prev.assignmentId),owner=norm(prev.user||prev.targetUser);if(!aid)continue;skippedIds.push(aid);if(owner)skippedUsers.push(owner);
      patch[`roster_sessions/${safe(aid)}/claimStatus`]='SKIPPED';
      patch[`roster_sessions/${safe(aid)}/workPartStatus`]='SKIPPED';
      patch[`roster_sessions/${safe(aid)}/taskStatusV333`]='COMPLETED';
      patch[`roster_sessions/${safe(aid)}/taskAvailabilityV333`]='DONE';
      patch[`roster_sessions/${safe(aid)}/taskStatusUpdatedAtMs`]=t;
      patch[`roster_sessions/${safe(aid)}/skippedNoEform`]=true;
      patch[`roster_sessions/${safe(aid)}/autoSkippedByNextUser`]=true;
      patch[`roster_sessions/${safe(aid)}/autoSkippedReason`]='PREVIOUS_DID_NOT_USE_EFORM';
      patch[`roster_sessions/${safe(aid)}/skippedAtMs`]=t;
      patch[`roster_sessions/${safe(aid)}/skippedBy`]=actor;
      patch[`roster_sessions/${safe(aid)}/skippedForAssignmentId`]=currentAid;
      patch[`roster_sessions/${safe(aid)}/updatedAtMs`]=t;
      const pfid=S(prev.flightId||fid);if(pfid){
        patch[`flight_records/${safe(d)}/${safe(pfid)}/taskStatus/${safe(aid)}`]={schema:1,engine:'TASK_STATUS_V333',assignmentId:aid,flightId:pfid,opDate:d,ownerUser:owner,sourceColumn:S(prev.sourceColumn),roleKey:S(prev.roleKey),formGroup:S(prev.formGroup),status:'COMPLETED',statusLabel:'BỎ QUA · KHÔNG E-FORM',availability:'DONE',skippedNoEform:true,skippedBy:actor,skippedAtMs:t,updatedAtMs:t};
      }
    }
    const prevGids=[...new Set(rows.map(r=>coGroupId(r.item)).filter(Boolean))];for(const gid of prevGids)patch[`roster_co_claims/${safe(d)}/${safe(gid)}`]={schema:1,groupId:gid,status:'SKIPPED',skippedNoEform:true,skippedBy:actor,skippedAtMs:t,opDate:d,flightId:S(fid)};
    const ev=`WORK_PART_TAKEOVER_${t}_${safe(currentAid)}`;patch[`flight_records/${safe(d)}/${safe(fid)}/workPartHistory/${safe(ev)}`]={eventId:ev,type:'WORK_PART_SKIPPED_BY_NEXT_USER',status:'SKIPPED',reason:'PREVIOUS_DID_NOT_USE_EFORM',skippedAssignmentIds:skippedIds,skippedUsers:[...new Set(skippedUsers)],nextAssignmentId:currentAid,nextUser:actor,atMs:t};
    // Re-check immediately before the multi-path write. This catches the normal race where
    // the previous operator presses NHẬN CHUYẾN while the successor is confirming takeover.
    await assertPreviousUntouched(man,item);
    await db('').update(patch);
    try{await addAudit('WORK_PART_SKIPPED_BY_NEXT_USER',{flightId:fid,flightLabel:rosterLabel(item),nextAssignmentId:currentAid,nextUser:actor,skippedAssignmentIds:skippedIds,skippedUsers:[...new Set(skippedUsers)],reason:'PREVIOUS_DID_NOT_USE_EFORM'})}catch(e){console.warn('V1.1.49 takeover audit',e)}
    await markClaim(d,fid,item,man);multiAdd(fid,d);await openAssignment(item,man);setTimeout(()=>decorateList(d),250);
    return true;
  }
  async function claimStateFor(item,man){
    const st=await sessionState(item.assignmentId),cs=U(st.claimStatus);let ts='';
    try{ts=U(root.sagsTaskStatusDerive?.(st,item,man)||st.taskStatusV333||st.taskStatus)}catch(_){ts=U(st.taskStatusV333||st.taskStatus)}
    if(st.skippedNoEform===true||st.autoSkippedByNextUser===true||cs==='SKIPPED')return {state:'SKIPPED',st,taskStatus:'COMPLETED'};
    if(ts==='BLOCK')return {state:'BLOCKED',st,taskStatus:ts};
    if(ts==='NOT_APPLICABLE')return {state:'NA',st,taskStatus:ts};
    if(ts==='COMPLETED'||cs==='PART_COMPLETED'||cs==='COMPLETED'||cs==='HANDED_OVER')return {state:st.autoSkippedCoAssignee===true?'CO_DONE':'DONE',st,taskStatus:'COMPLETED'};
    if((ts==='IN_PROGRESS'||cs==='CLAIMED')&&norm(st.claimedBy||st.ownerUser)===me())return {state:'CLAIMED',st,taskStatus:'IN_PROGRESS'};
    const coOwner=coGroupId(item)?(norm(st.coClaimedBy)?{user:norm(st.coClaimedBy),assignmentId:S(st.coClaimedAssignmentId)}:await activeCoOwner(man,item)):null;
    if(coOwner?.user&&coOwner.user!==me())return {state:'STANDBY',st,taskStatus:'UNCLAIMED',coOwner};
    // Thứ tự Daily Roster chỉ khóa giữa các WORK PART khác nhau. Các username cùng
    // coAssigneeGroupId (dấu phẩy) không chờ nhau và đều hiện MY FLIGHT ngay.
    if(!firstItem(man,item)&&!(await previousCompleted(man,item)))return {state:'WAIT',st,taskStatus:ts==='IN_PROGRESS'?'IN_PROGRESS':'UNCLAIMED'};
    return {state:'READY',st,taskStatus:'UNCLAIMED'}
  }

  // V1.1.38: one operator may own more than one assignment on the same flight
  // (e.g. CUONGNM1 = ARR and also first DEP). A flight card must not blindly use
  // mine[0], because RTDB object insertion order can expose DEP before ARR and then
  // falsely show WAITING_PREVIOUS. Choose the operator's actionable work instead:
  // current CLAIMED -> earliest READY -> DONE -> WAIT/BLOCK/NA. Within a state,
  // preserve the real lane sequence (ARR before DEP, then workPartOrder).
  async function preferredMyAssignment(man,mine){
    const rows=[];
    for(const item of (mine||[])){
      const cs=await claimStateFor(item,man);
      const seq=lane(man,item),pos=Math.max(0,seq.findIndex(x=>S(x.assignmentId)===S(item.assignmentId)));
      const leg=laneLegRank(item),ord=Number(item?.workPartOrder)||9999;
      rows.push({item,cs,pos,leg,ord});
    }
    const stateRank={CLAIMED:0,READY:1,DONE:2,CO_DONE:3,STANDBY:4,WAIT:5,SKIPPED:6,BLOCKED:7,NA:8};
    rows.sort((a,b)=>(stateRank[a.cs.state]??99)-(stateRank[b.cs.state]??99)||a.leg-b.leg||a.pos-b.pos||a.ord-b.ord);
    return rows[0]||null;
  }
  function applyLegLabel(card,mine){
    if(!card||!mine?.length)return;
    const legs=mine.map(x=>U(x.assignmentLeg)).filter(Boolean),leg=legs.length===mine.length&&new Set(legs).size===1?legs[0]:"";
    if(leg!=="ARR"&&leg!=="DEP")return;
    const item=mine.find(x=>U(x.assignmentLeg)===leg)||mine[0],
          arrNo=S(item.arrFlight),depNo=S(item.depFlight),
          pairLabel=arrNo&&depNo&&U(arrNo)!==U(depNo)?`${arrNo} / ${depNo}`:"",
          flight=S(item.assignmentFlight||(leg==="ARR"?arrNo:depNo));
    const title=card.querySelector('.fwcFlightTitle'),meta=card.querySelector('.fwcMeta');
    // V1.0.27: Flight Record is the visual identity. An assignment may be only ARR or DEP,
    // but MY FLIGHT must still show the complete paired flight when both legs exist.
    if(title)title.textContent=pairLabel||`${flight||rosterLabel(item)} · ${leg==="ARR"?"CHUYẾN ĐẾN":"CHUYẾN ĐI"}`;
    if(meta){
      const route=S(item.route),ac=S(item.acReg)||'—';
      if(pairLabel){
        const sta=S(item.sta)||'—',std=S(item.std)||'—';
        meta.innerHTML=`${esc(route)}${route?' · ':''}A/C ${esc(ac)} · STA ${esc(sta)} · <b>STD ${esc(std)}</b>`;
      }else{
        const time=leg==="ARR"?S(item.sta):S(item.std),timeLabel=leg==="ARR"?'STA':'STD';
        meta.textContent=`${route}${route?' · ':''}A/C ${ac} · ${timeLabel} ${time||'—'}`;
      }
    }
  }
  function v1196EnsurePushbackReopenStyle(){
    if(document.getElementById('v1196PushbackReopenStyle'))return;
    const st=document.createElement('style');st.id='v1196PushbackReopenStyle';st.textContent=`
      .v1196PushbackBadge{display:inline-flex;align-items:center;margin-left:6px;padding:3px 7px;border-radius:999px;background:#e8f6ee;color:#126b39;font:900 10px/1.2 Arial;vertical-align:middle}
      .v324ReceiveBtn.done{background:#0b5cab!important;color:#fff!important}
    `;document.head.appendChild(st);
  }
  async function decorateList(d=opDate()){
    v1196EnsurePushbackReopenStyle();
    const host=document.getElementById('fwcList');if(!host||role()==='AD')return;let man;try{man=await manifest(d)}catch(_){return}
    const u=me();for(const card of host.querySelectorAll('.fwcFlight')){
      const old=card.querySelector('button[onclick*="flightWorkspaceOpenFlight"],button.v324ReceiveBtn');let fid=S(card.dataset.v38Fid);if(!fid){const oc=S(old?.getAttribute('onclick')),m=oc.match(/flightWorkspaceOpenFlight\(['"]([^'"]+)['"]\)/);fid=m?.[1]||''}if(!fid||!old)continue;
      const mine=myItems(man,fid);if(!mine.length){if(!old.classList.contains('v324ReceiveBtn')){old.textContent='XEM';old.classList.add('gray')}continue}
      applyLegLabel(card,mine);
      const picked=await preferredMyAssignment(man,mine);if(!picked)continue;const primary=picked.item,cs=picked.cs;card.dataset.v1137PrimaryAssignment=S(primary.assignmentId);card.dataset.v1137PrimaryLeg=U(primary.assignmentLeg);old.classList.add('v324ReceiveBtn');old.onclick=null;old.removeAttribute('onclick');old.disabled=false;old.classList.remove('wait','standby','done','blocked','na','takeover','skipped');
      // V1.1.96: surface PUSHBACK correction directly on MY FLIGHT, not only inside
      // the separate local-session completed tab. This is the operator's normal entry point.
      const pbMeta=localMeta(primary.assignmentId);
      let pbSource=false,pbValue='';
      try{
        const pbEnv=pbMeta?root.readFlightSessionEnvelope?.(pbMeta.id)||{}:{};
        const g=U(primary.formGroup||pbMeta?.initialGroup||pbEnv?.mainForm||'');
        const st=(pbEnv?.state&&typeof pbEnv.state==='object')?pbEnv.state:
          (cs?.st?.envelope?.state&&typeof cs.st.envelope.state==='object'?cs.st.envelope.state:{});
        const rawPb=S(st.h24Start||st.f421_h24Start||cs?.st?.completedPushback||'');
        pbValue=rawPb;
        pbSource=['FSAGS','FSAGS423','FSAGS421'].includes(g)&&!!rawPb;
      }catch(_){}
      if(pbSource){
        old.textContent='MỞ LẠI · SỬA PUSHBACK';
        old.disabled=false;old.classList.add('done');
        old.onclick=()=>{if(pbMeta&&typeof root.dailyRosterReopenPushbackSession==='function')void root.dailyRosterReopenPushbackSession(pbMeta);else void root.v324ReceiveOrOpen(fid);};
        let pbBadge=card.querySelector('.v1196PushbackBadge');
        if(!pbBadge){pbBadge=document.createElement('span');pbBadge.className='v1196PushbackBadge';card.querySelector('.v38Flags,.fwcFlightTitle')?.appendChild?.(pbBadge);}
        if(pbBadge)pbBadge.textContent='PUSHBACK '+pbValue+' · CÓ THỂ SỬA';
      }
      else if(cs.state==='CLAIMED'){old.textContent='TIẾP TỤC';old.onclick=()=>root.v324ReceiveOrOpen(fid);}
      else if(cs.state==='STANDBY'){old.textContent='HỖ TRỢ · XEM';old.disabled=false;old.classList.add('standby');old.onclick=()=>root.flightWorkspaceOpenFlight?.(fid)}
      else if(cs.state==='DONE'){old.textContent='MỞ LẠI CHỈNH SỬA';old.disabled=false;old.classList.add('done');old.onclick=()=>root.v324ReceiveOrOpen(fid)}
      else if(cs.state==='CO_DONE'){old.textContent='HOÀN TẤT CÙNG NHÓM';old.disabled=true;old.classList.add('done')}
      else if(cs.state==='BLOCKED'){old.textContent='ĐANG BLOCK';old.disabled=true;old.classList.add('blocked')}
      else if(cs.state==='NA'){old.textContent='KHÔNG ÁP DỤNG';old.disabled=true;old.classList.add('na')}
      else if(cs.state==='SKIPPED'){old.textContent='KHÔNG E-FORM';old.disabled=true;old.classList.add('skipped')}
      else if(cs.state==='WAIT'){old.textContent='NHẬN THAY';old.disabled=false;old.classList.add('takeover');old.onclick=()=>root.v324TakeoverWaiting?.(fid)}
      else {old.textContent='NHẬN CHUYẾN';old.onclick=()=>root.v324ReceiveOrOpen(fid);}
      if(!pbSource)card.querySelector('.v1196PushbackBadge')?.remove();
      let b=card.querySelector('.v324ClaimBadge');if(!b){b=document.createElement('span');b.className='v324ClaimBadge';card.querySelector('.v38Flags,.fwcFlightTitle')?.appendChild?.(b)}if(b){b.className='v324ClaimBadge'+(cs.state==='WAIT'?' wait':cs.state==='STANDBY'?' standby':(cs.state==='DONE'||cs.state==='CO_DONE')?' done':cs.state==='SKIPPED'?' skipped':cs.state==='BLOCKED'?' blocked':cs.state==='NA'?' na':'');b.textContent=cs.state==='CLAIMED'?'ĐANG LÀM':cs.state==='STANDBY'?`HỖ TRỢ${cs.coOwner?.user?` · ${cs.coOwner.user}`:''}`:(cs.state==='DONE'||cs.state==='CO_DONE')?'HOÀN TẤT':cs.state==='SKIPPED'?'BỎ QUA':cs.state==='BLOCKED'?'BLOCK':cs.state==='NA'?'KHÔNG ÁP DỤNG':'CHƯA NHẬN';if(cs.state==='WAIT')b.title='Người trước chưa hoàn tất. Có thể bấm NHẬN THAY nếu phần trước chưa từng nhận/thực hiện E-FORM.';else if(cs.state==='STANDBY')b.title=`Cùng nhóm hỗ trợ; ${cs.coOwner?.user||'người khác'} đang giữ quyền chỉnh sửa`;else if(cs.state==='SKIPPED')b.title='Phần này được bỏ qua vì người phía sau nhận thay; không ghi nhận là đã thực hiện E-FORM.';else b.removeAttribute('title')}
    }
    const head=document.querySelector('#fwcModal .fwcHead h3');if(head)head.textContent='✈ CHUYẾN HÔM NAY · MY FLIGHT';const sub=document.querySelector('#fwcModal .fwcHead .fwcSub');if(sub)sub.remove();
  }

  function envelopeHasData(env){const st=env?.state&&typeof env.state==='object'?env.state:{};return Object.values(st).some(v=>{if(v===true)return true;if(v===false||v===null||v===undefined)return false;if(Array.isArray(v))return v.length>0;if(typeof v==='object')return Object.keys(v).length>0;return S(v)!==''})}
  async function resolveHandoverEnvelope(item,man){
    const aid=S(item?.assignmentId);if(!aid)return null;const shared=await sessionState(aid),candidates=[];
    const reopenedWorking=Number(shared?.reopenedAtMs||0)>0&&U(shared?.claimStatus)==='CLAIMED';
    if(reopenedWorking&&shared?.envelope&&typeof shared.envelope==='object')candidates.push({env:shared.envelope,at:Number(shared.envelopeUpdatedAtMs||shared.reopenRestoreAtMs||shared.reopenedAtMs||0),source:'REOPEN_WORKING',priority:6});
    if(shared?.handoverEnvelope&&typeof shared.handoverEnvelope==='object')candidates.push({env:shared.handoverEnvelope,at:Number(shared.handoverEnvelopeAtMs||shared.previousPartCompletedAtMs||0),source:'HANDOVER_SNAPSHOT',priority:3});
    const prev=previousItem(man,item);if(prev?.assignmentId){const pst=await sessionState(prev.assignmentId);if(pst?.completionEnvelope&&typeof pst.completionEnvelope==='object')candidates.push({env:pst.completionEnvelope,at:Number(pst.completedAtMs||pst.completionEnvelopeAtMs||0),source:'PREVIOUS_COMPLETION',priority:2});}
    if(shared?.envelope&&typeof shared.envelope==='object')candidates.push({env:shared.envelope,at:Number(shared.envelopeUpdatedAtMs||0),source:'SHARED_ENVELOPE',priority:1});
    // V1.1.31: empty/status-only envelopes are never allowed to beat an envelope that
    // actually contains form data. Generic session updatedAtMs is intentionally ignored.
    const usable=candidates.filter(x=>envelopeHasData(x.env));
    const pool=usable.length?usable:candidates;
    pool.sort((a,b)=>Number(b.priority||0)-Number(a.priority||0)||Number(b.at||0)-Number(a.at||0));
    return pool[0]||null;
  }
  async function syncSharedIntoLocal(item,meta,man){
    if(!meta)return false;
    try{
      const resolved=await resolveHandoverEnvelope(item,man);if(!resolved?.env)return false;
      let local={};try{local=root.readFlightSessionEnvelope?.(meta.id)||{}}catch(_){}
      const incomingAt=Number(resolved.at||0),appliedAt=Number(local?.rosterHandoverAppliedAtMs||0);
      const isImmutable=resolved.source==='HANDOVER_SNAPSHOT'||resolved.source==='PREVIOUS_COMPLETION';
      const incomingHasData=envelopeHasData(resolved.env),localHasData=envelopeHasData(local),localEditedAt=Number(meta?.updatedAt||0);
      // Never blank a real local form with an empty cloud/session payload.
      if(!incomingHasData)return false;
      // Mutable working envelopes may sync across devices, but an older server payload must
      // not replace edits already persisted locally after that content timestamp.
      if(!isImmutable&&localHasData&&incomingAt>0&&localEditedAt>incomingAt)return false;
      // Apply a handover snapshot exactly when it is new (or when local state was lost).
      // Once B has loaded A's snapshot and started editing, reopening the flight must keep
      // B's newer local work instead of restoring A's snapshot again.
      if(isImmutable&&appliedAt>=incomingAt&&envelopeHasData(local))return false;
      if(!isImmutable&&appliedAt&&incomingAt<=appliedAt)return false;
      const env=clone(resolved.env);
      env.rosterAssignmentId=S(item.assignmentId);
      env.mainForm=S(item.formGroup||env.mainForm||local.mainForm||'fsags');
      env.activeFormGroup=env.mainForm;
      env.currentPage=Number(env.currentPage)||Number(local.currentPage)||1;
      env.scrollY=0;
      env.rosterSharedAtMs=incomingAt||Date.now();
      env.rosterHandoverAppliedAtMs=Math.max(incomingAt,appliedAt);
      env.rosterHandoverSource=resolved.source;
      if(local?.rosterSeed&&!env.rosterSeed)env.rosterSeed=clone(local.rosterSeed);
      if(typeof root.flightSessionStorageKey==='function')localStorage.setItem(root.flightSessionStorageKey(meta.id),JSON.stringify(env));
      try{await db(`roster_sessions/${safe(item.assignmentId)}`).update({handoverConsumedAtMs:Date.now(),handoverConsumedBy:me(),handoverConsumedSource:resolved.source})}catch(_){}
      return true;
    }catch(e){console.warn('V1.1.20 shared handover load',e);return false}
  }
  async function openAssignment(item,man){
  if(U(item?.formGroup)==='FINAL'){try{root.flightWorkspaceClose?.()}catch(_){}if(typeof root.sagsV338OpenFinalForRoster!=='function')throw new Error('Biểu mẫu FINAL chưa sẵn sàng.');await root.sagsV338OpenFinalForRoster(item);return;}
  if(U(item?.formGroup)==='UNIT_TASK'){root.flightWorkspaceOpenFlight?.(S(item.flightId));return;}

  let meta=localMeta(item.assignmentId);
  if(!meta){
    // V1.0.29: Do not force user to understand local form cache.
    // Automatically refresh the assignment mailbox and wait for device sync.
    try{root.dailyRosterRestartMailbox?.()}catch(_){}
    for(let i=0;i<8&&!meta;i++){
      await new Promise(r=>setTimeout(r,500));
      meta=localMeta(item.assignmentId);
    }
  }
  if(!meta&&item?.manualCreatedV340===true&&typeof root.sagsV340EnsureLocalSession==='function'){
    meta=await root.sagsV340EnsureLocalSession(item);
  }
  if(!meta){
    // V1.0.30: final fallback. The assignment is valid from MY FLIGHT but the
    // local envelope was not generated yet. Create the local session from the
    // assignment payload instead of blocking the operator.
    try{
      if(typeof root.sagsV340EnsureLocalSession==='function'){
        meta=await root.sagsV340EnsureLocalSession(item);
      }
    }catch(e){console.warn('V1.0.30 ensure local fallback',e)}
  }
  if(!meta)throw new Error('Chưa khởi tạo được biểu mẫu chuyến. Vui lòng thử lại sau khi đồng bộ roster.');
  const sharedLoaded=await syncSharedIntoLocal(item,meta,man);
  // V1.1.31 hydration barrier: if local cache is empty but Firebase has a real snapshot,
  // restore it once more before rendering. This is finite (no timer/heartbeat) and avoids
  // a form being drawn during a transient mailbox/session race.
  try{
    const localNow=root.readFlightSessionEnvelope?.(meta.id)||{};
    if(!envelopeHasData(localNow)){
      const retry=await resolveHandoverEnvelope(item,man);
      if(retry?.env&&envelopeHasData(retry.env)&&typeof root.flightSessionStorageKey==='function'){
        const env=clone(retry.env);env.rosterAssignmentId=S(item.assignmentId);env.mainForm=S(item.formGroup||env.mainForm||meta.initialGroup||'fsags');env.activeFormGroup=env.mainForm;env.currentPage=Number(env.currentPage)||1;env.scrollY=0;env.rosterSharedAtMs=Number(retry.at||Date.now());env.rosterHandoverAppliedAtMs=Math.max(Number(env.rosterHandoverAppliedAtMs||0),Number(retry.at||0));env.rosterHandoverSource=retry.source;
        localStorage.setItem(root.flightSessionStorageKey(meta.id),JSON.stringify(env));
      }
    }
  }catch(e){console.warn('V1.1.31 hydration retry',e)}
  try{root.flightWorkspaceClose?.()}catch(_){}
  root.switchFlightSession?.(meta.id,true);
  setTimeout(syncFormActions,120)
}
  async function acquireCoGroupClaim(d,item,man,{allowCompleted=false}={}){
    const gid=coGroupId(item),u=me(),aid=S(item.assignmentId);if(!gid)return {gid:'',peers:[],claimedBy:u};
    const peers=[],allPeers=coPeers(man,item);let existing=null;
    // Migration safety: if a V1.1.41 client had already CLAIMED one peer before this
    // co-assignee lock existed, respect that live claim and do not allow a second editor.
    // Peers already COMPLETED (e.g. duplicate-self skip) are not returned for STANDBY patching.
    for(const peer of allPeers){const pst=await sessionState(peer.assignmentId),pcs=U(pst.claimStatus),pts=U(pst.taskStatusV333||pst.taskStatus),pws=U(pst.workPartStatus);if(['PART_COMPLETED','COMPLETED','HANDED_OVER'].includes(pcs)||pts==='COMPLETED'||pws==='COMPLETED')continue;peers.push(peer);if(!existing&&(pcs==='CLAIMED'||pts==='IN_PROGRESS'))existing={user:norm(pst.claimedBy||pst.ownerUser||peer.user||peer.targetUser),assignmentId:S(peer.assignmentId),st:pst,item:peer};}
    if(existing?.user&&existing.user!==u)throw new Error(`Phần việc này đang được ${existing.user} thực hiện. Bạn đang ở chế độ HỖ TRỢ.`);
    const lockRef=db(`roster_co_claims/${safe(d)}/${safe(gid)}`),t=Date.now();
    let result=null;
    try{result=await lockRef.transaction(cur=>{cur=cur&&typeof cur==='object'?cur:{};const status=U(cur.status),owner=norm(cur.claimedBy);if(status==='CLAIMED'&&owner&&owner!==u)return;if(status==='COMPLETED'&&!allowCompleted)return;return {schema:1,groupId:gid,status:'CLAIMED',claimedBy:u,claimedAssignmentId:aid,claimedAtMs:Number(cur.claimedAtMs||t)||t,updatedAtMs:t,opDate:S(d),flightId:S(item.flightId),formGroup:S(item.formGroup),sourceColumn:S(item.sourceColumn)};});}catch(e){throw new Error('Không khóa được nhóm hỗ trợ: '+S(e?.message||e))}
    if(!result?.committed){const v=result?.snapshot?.val?.()||{};throw new Error(`Phần việc này đang được ${norm(v.claimedBy)||'người khác'} thực hiện. Bạn đang ở chế độ HỖ TRỢ.`)}
    return {gid,peers,claimedBy:u};
  }
  async function markClaim(d,fid,item,man){
    const t=Date.now(),u=me(),p=profile(),aid=S(item.assignmentId),pre=await sessionState(aid);
    if(pre.skippedNoEform===true||pre.autoSkippedByNextUser===true||U(pre.claimStatus)==='SKIPPED')throw new Error('Phần công việc này đã được người phía sau NHẬN THAY vì chưa thực hiện E-FORM.');
    const co=await acquireCoGroupClaim(d,item,man||await manifest(d)),patch={};
    patch[`roster_sessions/${safe(aid)}/claimStatus`]='CLAIMED';patch[`roster_sessions/${safe(aid)}/taskStatusV333`]='IN_PROGRESS';patch[`roster_sessions/${safe(aid)}/taskAvailabilityV333`]='ACTIVE';patch[`roster_sessions/${safe(aid)}/taskStatusUpdatedAtMs`]=t;patch[`roster_sessions/${safe(aid)}/claimedAtMs`]=t;patch[`roster_sessions/${safe(aid)}/claimedBy`]=u;patch[`roster_sessions/${safe(aid)}/handoverReady`]=false;patch[`roster_sessions/${safe(aid)}/coClaimedBy`]=co.gid?u:null;patch[`roster_sessions/${safe(aid)}/coClaimedAssignmentId`]=co.gid?aid:null;patch[`roster_sessions/${safe(aid)}/updatedAtMs`]=t;
    for(const peer of co.peers||[]){const pid=S(peer.assignmentId);if(!pid)continue;patch[`roster_sessions/${safe(pid)}/claimStatus`]='STANDBY';patch[`roster_sessions/${safe(pid)}/taskStatusV333`]='UNCLAIMED';patch[`roster_sessions/${safe(pid)}/taskAvailabilityV333`]='STANDBY';patch[`roster_sessions/${safe(pid)}/taskStatusUpdatedAtMs`]=t;patch[`roster_sessions/${safe(pid)}/coClaimedBy`]=u;patch[`roster_sessions/${safe(pid)}/coClaimedAssignmentId`]=aid;patch[`roster_sessions/${safe(pid)}/coClaimedAtMs`]=t;patch[`roster_sessions/${safe(pid)}/updatedAtMs`]=t;}
    patch[`flight_records/${safe(d)}/${safe(fid)}/taskClaims/${safe(u)}/${safe(aid)}`]={assignmentId:aid,username:u,name:S(p.name||p.fullName||u),formGroup:S(item.formGroup),sourceColumn:S(item.sourceColumn),workPartOrder:Number(item.workPartOrder||1),workPartTotal:Number(item.workPartTotal||1),coAssigneeGroupId:co.gid||null,coAssigneeUsers:co.gid?[item,...(co.peers||[])].map(x=>norm(x.user||x.targetUser)).filter(Boolean):[],status:'CLAIMED',taskStatus:'IN_PROGRESS',claimedAtMs:t,updatedAtMs:t};
    try{await db('').update(patch)}catch(e){if(co.gid){try{await db(`roster_co_claims/${safe(d)}/${safe(co.gid)}`).transaction(cur=>norm(cur?.claimedBy)===u&&S(cur?.claimedAssignmentId)===aid?null:cur)}catch(_){}}throw e}
    await addAudit('MY_FLIGHT_CLAIMED',{flightId:fid,flightLabel:rosterLabel(item),assignmentId:aid,formGroup:S(item.formGroup),sourceColumn:S(item.sourceColumn),coAssigneeGroupId:co.gid||null,coAssigneePeers:(co.peers||[]).map(x=>norm(x.user||x.targetUser))});
  }
  async function restoreOwnCompletedEnvelopeForReopen(item,man,cs){
    const aid=S(item?.assignmentId);if(!aid)return null;
    const st=cs?.st||await sessionState(aid),candidates=[];
    if(st?.completionEnvelope&&typeof st.completionEnvelope==='object')candidates.push({env:st.completionEnvelope,source:'OWN_COMPLETION',at:Number(st.completedAtMs||st.updatedAtMs||0),priority:3});
    const nx=nextItem(man,item);
    if(nx?.assignmentId){
      try{
        const ns=await sessionState(nx.assignmentId);
        if(S(ns?.handoverFromAssignmentId)===aid&&ns?.handoverEnvelope&&typeof ns.handoverEnvelope==='object')candidates.push({env:ns.handoverEnvelope,source:'NEXT_HANDOVER_COPY',at:Number(ns.handoverEnvelopeAtMs||ns.previousPartCompletedAtMs||0),priority:2});
      }catch(_){}
    }
    const meta=localMeta(aid);
    if(meta){try{const local=root.readFlightSessionEnvelope?.(meta.id)||{};if(envelopeHasData(local))candidates.push({env:local,source:'LOCAL_FALLBACK',at:Number(meta.updatedAt||0),priority:1})}catch(_){} }
    candidates.sort((a,b)=>Number(b.priority||0)-Number(a.priority||0)||Number(b.at||0)-Number(a.at||0));
    const pick=candidates.find(x=>envelopeHasData(x.env));if(!pick)return null;
    const env=clone(pick.env);env.rosterAssignmentId=aid;env.mainForm=S(item?.formGroup||env.mainForm||meta?.initialGroup||'fsags');env.activeFormGroup=env.mainForm;env.currentPage=Number(env.currentPage)||1;env.scrollY=0;env.rosterReopenRestoredAtMs=Date.now();env.rosterReopenRestoreSource=pick.source;
    if(meta&&typeof root.flightSessionStorageKey==='function'){
      try{localStorage.setItem(root.flightSessionStorageKey(meta.id),JSON.stringify(env))}catch(_){}
    }
    return {env,source:pick.source,meta};
  }
  root.v324TakeoverWaiting=async function(fid){fid=S(fid);if(!fid)return;const d=opDate();try{const man=await manifest(d),mine=myItems(man,fid);if(!mine.length)throw new Error('Chuyến này không thuộc MY FLIGHT của tài khoản hiện tại.');const picked=await preferredMyAssignment(man,mine);if(!picked)throw new Error('Không xác định được phần công việc cần nhận thay.');const item=picked.item,cs=picked.cs;if(cs.state!=='WAIT')return root.v324ReceiveOrOpen?.(fid);const rows=await assertPreviousUntouched(man,item),users=[...new Set(rows.map(r=>norm(r.item.user||r.item.targetUser)).filter(Boolean))],who=users.join(', ')||'người trước';if(!confirm(`NHẬN THAY / BỎ QUA NGƯỜI TRƯỚC

${rosterLabel(item)} · ${formLabel(item.formGroup)}

${who} chưa nhận/thực hiện E-FORM.

Bạn có chắc muốn đánh dấu phần trước là “BỎ QUA · KHÔNG E-FORM” và nhận phần công việc của mình ngay?

Thao tác sẽ được ghi Audit.`))return;await skipPreviousAndClaim(d,fid,item,man);alert(`✓ ĐÃ NHẬN THAY.
Phần của ${who} được ghi “BỎ QUA · KHÔNG E-FORM”, không ghi HOÀN THÀNH giả.`)}catch(e){alert('Không nhận thay được: '+S(e?.message||e))}};

  root.v324ReceiveOrOpen=async function(fid){fid=S(fid);if(!fid)return;const d=opDate();try{const man=await manifest(d),mine=myItems(man,fid);if(!mine.length)throw new Error('Chuyến này không thuộc MY FLIGHT của tài khoản hiện tại.');const picked=await preferredMyAssignment(man,mine);if(!picked)throw new Error('Không xác định được phần công việc cần mở.');let item=picked.item,cs=picked.cs;if(cs.state==='STANDBY'){root.flightWorkspaceOpenFlight?.(fid);return}if(cs.state==='CO_DONE'){root.flightWorkspaceOpenFlight?.(fid);return}if(cs.state==='SKIPPED')throw new Error('Phần công việc này đã được người phía sau NHẬN THAY và được ghi BỎ QUA · KHÔNG E-FORM.');if(cs.state==='DONE'){if(!confirm(`MỞ LẠI CHỈNH SỬA\n\n${rosterLabel(item)} · ${formLabel(item.formGroup)}\n\nPhần công việc này đã HOÀN TẤT. Bạn có chắc muốn mở lại để chỉnh sửa?`))return;const t=Date.now(),u=me(),aid=S(item.assignmentId),patch={},co=await acquireCoGroupClaim(d,item,man,{allowCompleted:true});const restored=await restoreOwnCompletedEnvelopeForReopen(item,man,cs);if(restored?.env){patch[`roster_sessions/${safe(aid)}/envelope`]=sanitizeEnvelope(restored.env);patch[`roster_sessions/${safe(aid)}/reopenRestoreSource`]=S(restored.source);patch[`roster_sessions/${safe(aid)}/reopenRestoreAtMs`]=t;}patch[`roster_sessions/${safe(aid)}/claimStatus`]='CLAIMED';patch[`roster_sessions/${safe(aid)}/workPartStatus`]='IN_PROGRESS';patch[`roster_sessions/${safe(aid)}/taskStatusV333`]='IN_PROGRESS';patch[`roster_sessions/${safe(aid)}/taskStatusUpdatedAtMs`]=t;patch[`roster_sessions/${safe(aid)}/reopenedAtMs`]=t;patch[`roster_sessions/${safe(aid)}/reopenedBy`]=u;patch[`roster_sessions/${safe(aid)}/completedAtMs`]=null;patch[`roster_sessions/${safe(aid)}/completedBy`]=null;patch[`roster_sessions/${safe(aid)}/updatedAtMs`]=t;patch[`flight_records/${safe(d)}/${safe(fid)}/taskClaims/${safe(u)}/${safe(aid)}/status`]='CLAIMED';patch[`flight_records/${safe(d)}/${safe(fid)}/taskClaims/${safe(u)}/${safe(aid)}/taskStatus`]='IN_PROGRESS';patch[`flight_records/${safe(d)}/${safe(fid)}/taskClaims/${safe(u)}/${safe(aid)}/reopenedAtMs`]=t;patch[`flight_records/${safe(d)}/${safe(fid)}/taskClaims/${safe(u)}/${safe(aid)}/completedAtMs`]=null;patch[`roster_sessions/${safe(aid)}/coClaimedBy`]=co.gid?u:null;patch[`roster_sessions/${safe(aid)}/coClaimedAssignmentId`]=co.gid?aid:null;for(const peer of (co.peers||[])){const pid=S(peer.assignmentId);if(!pid)continue;patch[`roster_sessions/${safe(pid)}/claimStatus`]='STANDBY';patch[`roster_sessions/${safe(pid)}/workPartStatus`]='STANDBY';patch[`roster_sessions/${safe(pid)}/taskStatusV333`]='UNCLAIMED';patch[`roster_sessions/${safe(pid)}/taskAvailabilityV333`]='STANDBY';patch[`roster_sessions/${safe(pid)}/completedAtMs`]=null;patch[`roster_sessions/${safe(pid)}/completedBy`]=null;patch[`roster_sessions/${safe(pid)}/autoSkippedCoAssignee`]=false;patch[`roster_sessions/${safe(pid)}/coClaimedBy`]=u;patch[`roster_sessions/${safe(pid)}/coClaimedAssignmentId`]=aid;patch[`roster_sessions/${safe(pid)}/updatedAtMs`]=t;}const ev=`WORK_PART_REOPEN_${t}_${safe(aid)}`;patch[`flight_records/${safe(d)}/${safe(fid)}/workPartHistory/${safe(ev)}`]={eventId:ev,assignmentId:aid,fromUser:u,atMs:t,type:'WORK_PART_REOPENED',status:'IN_PROGRESS',formGroup:S(item.formGroup),sourceColumn:S(item.sourceColumn),restoreSource:S(restored?.source||'')};await db('').update(patch);await addAudit('WORK_PART_REOPENED',{flightId:fid,flightLabel:rosterLabel(item),assignmentId:aid,fromUser:u,formGroup:S(item.formGroup),sourceColumn:S(item.sourceColumn),restoreSource:S(restored?.source||'')});cs={state:'CLAIMED',st:{...(cs.st||{}),claimStatus:'CLAIMED',taskStatusV333:'IN_PROGRESS',envelope:restored?.env||cs.st?.envelope},taskStatus:'IN_PROGRESS'};}if(cs.state==='WAIT'){const prev=previousItem(man,item);throw new Error(`Phần công việc trước của ${norm(prev?.user||prev?.targetUser)||'chưa xác định'} chưa hoàn tất.`)}if(cs.state!=='CLAIMED'){await markClaim(d,fid,item,man);multiAdd(fid,d)}else multiAdd(fid,d);await openAssignment(item,man);setTimeout(()=>decorateList(d),300)}catch(e){alert('Không mở được MY FLIGHT: '+S(e?.message||e))}};

  async function currentRosterWorkContext(){const meta=activeMeta(),aid=S(meta?.rosterAssignmentId);if(!aid)return null;const d=S(meta.rosterOpDate)||opDate(),man=await manifest(d),item=itemsOf(man).find(x=>S(x.assignmentId)===aid);if(!item||norm(item.user||item.targetUser)!==me())return null;const st=await sessionState(aid),pending=st?.pendingRosterSuccessor&&typeof st.pendingRosterSuccessor==='object'?clone(st.pendingRosterSuccessor):null,sel=pending?{next:{...pending,pendingRoster:true,pendingAfterAssignmentId:aid},skipped:[],coPeers:coPeers(man,item)}:handoverSelection(man,item);return {d,man,item,next:sel.next||null,skippedSameUser:Array.isArray(sel.skipped)?sel.skipped:[],coAssigneePeers:Array.isArray(sel.coPeers)?sel.coPeers:[],meta,st}}
  async function currentHandoverContext(){const ctx=await currentRosterWorkContext();return ctx&&U(ctx.st?.claimStatus)==='CLAIMED'?ctx:null}
  async function currentCompletedContext(){const ctx=await currentRosterWorkContext();if(!ctx)return null;const a=U(ctx.st?.claimStatus),w=U(ctx.st?.workPartStatus),t=U(ctx.st?.taskStatusV333||ctx.st?.taskStatus);return (['PART_COMPLETED','COMPLETED','HANDED_OVER'].includes(a)||w==='COMPLETED'||t==='COMPLETED')?ctx:null}
  async function exportCurrentRosterQr(){
    try{
      let done=null;try{done=await currentCompletedContext()}catch(_){}
      if(!done){
        let active=null;try{active=await currentHandoverContext()}catch(_){}
        if(active){if(typeof root.v324ConfirmRosterHandover==='function'){await root.v324ConfirmRosterHandover();return true}alert('Chức năng hoàn tất chưa sẵn sàng.');return false}
        throw new Error('Không xác định được hồ sơ đã HOÀN TẤT.')
      }
      if(!done.next){alert('Không có người nhận tiếp theo theo Daily Roster.');return false}
      const env=sanitizeEnvelope(done.st?.completionEnvelope||root.readFlightSessionEnvelope?.(done.meta.id)||{});
      if(typeof root.sagsOpenOrCreateRosterQrFromCompletion!=='function')throw new Error('Chức năng QR chưa sẵn sàng.');
      return !!(await root.sagsOpenOrCreateRosterQrFromCompletion({
        d:done.d,item:done.item,next:done.next,meta:done.meta,envelope:env,
        completedAtMs:Number(done.st?.completedAtMs||Date.now()),
        fromUser:me(),toUser:norm(done.next.user||done.next.targetUser)
      }))
    }catch(e){alert('Không xuất được QR: '+S(e?.message||e));return false}
  }
  root.v1113ExportCurrentQr=exportCurrentRosterQr;

  function v1134NormRole(v){
    v=U(v);try{v=v.normalize('NFD').replace(/[\u0300-\u036f]/g,'')}catch(_){}
    v=v.replace(/Đ/g,'D').replace(/\s+/g,'');
    if(v==='DIEUHANH'||v==='DIEU HANH')v='DH';
    return v;
  }
  function v1134Session(){try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}}
  function v1134ActiveGroup(){try{return S(activeFormGroup).toLowerCase()}catch(_){return S(root.activeFormGroup).toLowerCase()}}
  function v1134QuickAllowed(){
    const g=v1134ActiveGroup(),sess=v1134Session(),profile=sess.profile||{},r=v1134NormRole(sess.role||profile.role||'');
    const ov=profile.featureOverridesV485&&typeof profile.featureOverridesV485==='object'?profile.featureOverridesV485:{};
    if(g==='fsags'||g==='fsags421'){
      if(typeof ov.QUICK_TIME==='boolean')return ov.QUICK_TIME;
      if(r==='AD'||r==='DH')return true;
      try{return typeof root.v485Can==='function'&&root.v485Can('QUICK_TIME',profile,sess.role)}catch(_){return false}
    }
    if(g==='fsags09'){
      if(typeof ov.FSAGS09==='boolean')return ov.FSAGS09;
      if(r==='AD'||r==='PVHK')return true;
      try{return typeof root.v485Can==='function'&&root.v485Can('FSAGS09',profile,sess.role)}catch(_){return false}
    }
    return false;
  }
  function v1134OpenQuickTime(){
    if(!v1134QuickAllowed())return alert('NHẬP NHANH chỉ dùng khi đang mở đúng biểu mẫu và tài khoản có quyền.');
    try{return root.openQuickTimePanel?.()}catch(e){alert('Không mở được NHẬP NHANH: '+S(e?.message||e))}
  }
  root.v1134QuickTimeAllowed=v1134QuickAllowed;

  async function syncFormActions(){
    ensureCss();const bar=document.querySelector('.toolbar');if(!bar)return;
    let row=document.getElementById('v324FormActions');
    if(!row){
      row=document.createElement('div');row.id='v324FormActions';
      row.innerHTML='<button id="v324ExportBtn" class="v324FormAction v324Export" type="button" title="Xuất / Chia sẻ">📤 XUẤT</button><button id="v324HandoverBtn" class="v324FormAction v324Handover" type="button" style="display:none" title="Hoàn tất phần của tôi">✓ HOÀN TẤT</button><button id="v1113QrFormBtn" class="v324FormAction v324Qr" type="button" style="display:none">▣ XUẤT QR</button><button id="v1134QuickTimeBtn" class="v324FormAction" type="button" style="display:none" title="Nhập nhanh các mốc giờ">⏱ NHẬP NHANH</button>';
      document.body.appendChild(row);
      document.getElementById('v324ExportBtn').onclick=()=>{if(typeof root.openExportChoiceMenu==='function')root.openExportChoiceMenu();else alert('Chức năng Xuất/Chia sẻ chưa sẵn sàng.')}
    }
    const hb=document.getElementById('v324HandoverBtn'),qb=document.getElementById('v1113QrFormBtn'),qt=document.getElementById('v1134QuickTimeBtn');
    if(hb)hb.style.display='none';if(qb)qb.style.display='none';
    if(qt){qt.style.display=v1134QuickAllowed()?'inline-flex':'none';qt.onclick=v1134OpenQuickTime;}
    /* old contextual QUICK_TIME container is no longer canonical; avoid duplicate/missing races */
    const legacyQuick=document.getElementById('v313QuickContext');if(legacyQuick)legacyQuick.style.setProperty('display','none','important');
    row.classList.remove('show','one','two','three');
    let ctx=null;try{ctx=await currentHandoverContext()}catch(_){}
    if(ctx){
      row.classList.add('show','two');
      if(hb){hb.style.display='block';hb.textContent='✓ HOÀN TẤT';hb.title=ctx.next?`Hoàn tất phần hiện tại; người tiếp theo là ${norm(ctx.next.user||ctx.next.targetUser)}`:'Hoàn tất phần công việc hiện tại';hb.setAttribute('aria-label','Hoàn tất phần của tôi');hb.onclick=()=>root.v324ConfirmRosterHandover?.()}
      if(qb){qb.style.display='block';qb.title='Xuất QR bàn giao sau khi HOÀN TẤT';qb.onclick=()=>root.v1113ExportCurrentQr?.()}
      return
    }
    let done=null;try{done=await currentCompletedContext()}catch(_){}
    if(done){
      row.classList.add('show','two');
      if(qb){qb.style.display='block';qb.title=done.next?`Xuất QR cho ${norm(done.next.user||done.next.targetUser)}`:'Xuất QR bàn giao';qb.onclick=()=>root.v1113ExportCurrentQr?.()}
      return
    }
    if(activeMeta()||v1134QuickAllowed())row.classList.add('show','one')
  }


  root.v324ConfirmRosterHandover=async function(){let ctx;try{ctx=await currentHandoverContext();if(!ctx)throw new Error('Không xác định được phần công việc đang thực hiện.');const from=me(),to=ctx.next?norm(ctx.next.user||ctx.next.targetUser):'';const nextText=to?`\nPhần công việc tiếp theo sẽ sẵn sàng cho ${to} theo Daily Roster.`:'\nĐây là phần cuối của assignment hiện tại.';if(!confirm(`HOÀN TẤT PHẦN CỦA TÔI\n\n${rosterLabel(ctx.item)} · ${formLabel(ctx.item.formGroup)}\n\nDữ liệu hiện tại sẽ được lưu lại và phần của ${from} được đánh dấu HOÀN TẤT.${nextText}`))return;try{document.activeElement?.blur?.()}catch(_){}await new Promise(r=>setTimeout(r,30));try{root.persist?.()}catch(_){}await new Promise(r=>setTimeout(r,100));let env={};try{env=root.readFlightSessionEnvelope?.(ctx.meta.id)||{}}catch(_){}env=sanitizeEnvelope(env);const t=Date.now(),aid=S(ctx.item.assignmentId),patch={};patch[`roster_sessions/${safe(aid)}/claimStatus`]='PART_COMPLETED';patch[`roster_sessions/${safe(aid)}/workPartStatus`]='COMPLETED';patch[`roster_sessions/${safe(aid)}/taskStatusV333`]='COMPLETED';patch[`roster_sessions/${safe(aid)}/taskStatusUpdatedAtMs`]=t;patch[`roster_sessions/${safe(aid)}/completedAtMs`]=t;patch[`roster_sessions/${safe(aid)}/completedBy`]=from;patch[`roster_sessions/${safe(aid)}/completionEnvelope`]=env;patch[`roster_sessions/${safe(aid)}/completionEnvelopeAtMs`]=t;patch[`roster_sessions/${safe(aid)}/updatedAtMs`]=t;patch[`roster_sessions/${safe(aid)}/coCompletedBy`]=coGroupId(ctx.item)?from:null;patch[`roster_sessions/${safe(aid)}/coCompletedAssignmentId`]=coGroupId(ctx.item)?aid:null;const coSkippedIds=[];for(const peerItem of (ctx.coAssigneePeers||[])){const pid=S(peerItem?.assignmentId);if(!pid||pid===aid)continue;coSkippedIds.push(pid);const peerUser=norm(peerItem?.user||peerItem?.targetUser);patch[`roster_sessions/${safe(pid)}/claimStatus`]='PART_COMPLETED';patch[`roster_sessions/${safe(pid)}/workPartStatus`]='SKIPPED';patch[`roster_sessions/${safe(pid)}/taskStatusV333`]='COMPLETED';patch[`roster_sessions/${safe(pid)}/taskAvailabilityV333`]='COMPLETED';patch[`roster_sessions/${safe(pid)}/taskStatusUpdatedAtMs`]=t;patch[`roster_sessions/${safe(pid)}/completedAtMs`]=t;patch[`roster_sessions/${safe(pid)}/completedBy`]=from;patch[`roster_sessions/${safe(pid)}/autoSkippedCoAssignee`]=true;patch[`roster_sessions/${safe(pid)}/autoSkippedReason`]='CO_ASSIGNEE_COMPLETED_BY_PEER';patch[`roster_sessions/${safe(pid)}/coCompletedBy`]=from;patch[`roster_sessions/${safe(pid)}/coCompletedAssignmentId`]=aid;patch[`roster_sessions/${safe(pid)}/completionEnvelope`]=env;patch[`roster_sessions/${safe(pid)}/completionEnvelopeAtMs`]=t;patch[`roster_sessions/${safe(pid)}/updatedAtMs`]=t;const pfid=S(peerItem?.flightId||ctx.item.flightId);if(pfid){patch[`flight_records/${safe(ctx.d)}/${safe(pfid)}/taskStatus/${safe(pid)}`]={schema:1,engine:'TASK_STATUS_V333',assignmentId:pid,flightId:pfid,opDate:ctx.d,ownerUser:peerUser,sourceColumn:S(peerItem?.sourceColumn),roleKey:S(peerItem?.roleKey),formGroup:S(peerItem?.formGroup),status:'COMPLETED',statusLabel:'HOÀN TẤT',availability:'COMPLETED',autoSkippedCoAssignee:true,completedBy:from,updatedAtMs:t};const pev=`WORK_PART_CO_SKIP_${t}_${safe(pid)}`;patch[`flight_records/${safe(ctx.d)}/${safe(pfid)}/workPartHistory/${safe(pev)}`]={eventId:pev,assignmentId:pid,completedByAssignmentId:aid,fromUser:from,ownerUser:peerUser,atMs:t,type:'CO_ASSIGNEE_COMPLETED_BY_PEER',status:'COMPLETED',formGroup:S(peerItem?.formGroup),sourceColumn:S(peerItem?.sourceColumn)};}}const gid=coGroupId(ctx.item);if(gid)patch[`roster_co_claims/${safe(ctx.d)}/${safe(gid)}`]={schema:1,groupId:gid,status:'COMPLETED',claimedBy:from,claimedAssignmentId:aid,completedAtMs:t,updatedAtMs:t,opDate:ctx.d,flightId:S(ctx.item.flightId),formGroup:S(ctx.item.formGroup),sourceColumn:S(ctx.item.sourceColumn)};const skippedIds=[];for(const skipItem of (ctx.skippedSameUser||[])){const skipAid=S(skipItem?.assignmentId);if(!skipAid||skipAid===aid)continue;skippedIds.push(skipAid);patch[`roster_sessions/${safe(skipAid)}/claimStatus`]='PART_COMPLETED';patch[`roster_sessions/${safe(skipAid)}/workPartStatus`]='SKIPPED';patch[`roster_sessions/${safe(skipAid)}/taskStatusV333`]='COMPLETED';patch[`roster_sessions/${safe(skipAid)}/taskStatusUpdatedAtMs`]=t;patch[`roster_sessions/${safe(skipAid)}/completedAtMs`]=t;patch[`roster_sessions/${safe(skipAid)}/completedBy`]=from;patch[`roster_sessions/${safe(skipAid)}/autoSkippedSameUser`]=true;patch[`roster_sessions/${safe(skipAid)}/autoSkippedReason`]='NEXT_DIFFERENT_ASSIGNEE';patch[`roster_sessions/${safe(skipAid)}/autoSkippedAfterAssignmentId`]=aid;patch[`roster_sessions/${safe(skipAid)}/completionEnvelope`]=env;patch[`roster_sessions/${safe(skipAid)}/completionEnvelopeAtMs`]=t;patch[`roster_sessions/${safe(skipAid)}/updatedAtMs`]=t;const sfid=S(skipItem?.flightId||ctx.item.flightId);if(sfid){patch[`flight_records/${safe(ctx.d)}/${safe(sfid)}/taskStatus/${safe(skipAid)}`]={schema:1,engine:'TASK_STATUS_V333',assignmentId:skipAid,flightId:sfid,opDate:ctx.d,ownerUser:from,sourceColumn:S(skipItem?.sourceColumn),roleKey:S(skipItem?.roleKey),formGroup:S(skipItem?.formGroup),status:'COMPLETED',statusLabel:'HOÀN TẤT',availability:'DONE',autoSkippedSameUser:true,autoSkippedReason:'NEXT_DIFFERENT_ASSIGNEE',updatedAtMs:t};const sev=`WORK_PART_SKIP_${t}_${safe(skipAid)}`;patch[`flight_records/${safe(ctx.d)}/${safe(sfid)}/workPartHistory/${safe(sev)}`]={eventId:sev,assignmentId:skipAid,skippedAfterAssignmentId:aid,fromUser:from,atMs:t,type:'WORK_PART_AUTO_SKIPPED',status:'COMPLETED',reason:'NEXT_DIFFERENT_ASSIGNEE',formGroup:S(skipItem?.formGroup),sourceColumn:S(skipItem?.sourceColumn)};}}let nextAid='';if(ctx.next){nextAid=S(ctx.next.assignmentId);if(ctx.next.pendingRoster===true){const activeNext={...clone(ctx.next),active:true,pendingRoster:false,activatedAfterAssignmentId:aid,activatedAtMs:t,activatedBy:from};const nextUser=norm(activeNext.user||activeNext.targetUser),nextFid=S(activeNext.flightId||ctx.item.flightId),nextDate=S(activeNext.opDate||ctx.d),srcFile=S(activeNext.pendingSourceFile||ctx.st?.pendingRosterSourceFile||'');delete activeNext.pendingSourceFile;patch[`roster_manifests/${safe(nextDate)}/items/${safe(nextAid)}`]=activeNext;patch[`roster_mail/${safe(nextUser)}/items/${safe(nextAid)}`]={engine:'DAILY_ROSTER_V1',schema:2,...activeNext,targetUser:nextUser,opDate:nextDate,date:S(activeNext.date||ctx.item.date),sourceFile:srcFile,publishedAtMs:t,publishedBy:from};patch[`roster_revocations/${safe(nextUser)}/items/${safe(nextAid)}`]=null;patch[`roster_sessions/${safe(aid)}/pendingRosterSuccessor`]=null;patch[`roster_sessions/${safe(aid)}/pendingRosterAppliedAtMs`]=t;patch[`roster_sessions/${safe(aid)}/pendingRosterAppliedTo`]=nextUser;if(nextFid){patch[`flight_records/${safe(nextDate)}/${safe(nextFid)}/assignments/${safe(nextAid)}`]={assignmentId:nextAid,user:nextUser,originalUser:S(activeNext.originalUser||nextUser),formGroup:S(activeNext.formGroup),sourceColumn:S(activeNext.sourceColumn),roleKey:S(activeNext.roleKey),assignmentLeg:S(activeNext.assignmentLeg),assignmentScope:S(activeNext.assignmentScope||'TURNAROUND'),workPartOrder:Number(activeNext.workPartOrder||1),workPartTotal:Number(activeNext.workPartTotal||1),workPartSequenceSource:S(activeNext.workPartSequenceSource||activeNext.sourceColumn),active:true,pendingActivated:true};patch[`flight_records/${safe(nextDate)}/${safe(nextFid)}/taskStatus/${safe(nextAid)}`]={schema:1,engine:'TASK_STATUS_V333',assignmentId:nextAid,flightId:nextFid,opDate:nextDate,ownerUser:nextUser,sourceColumn:S(activeNext.sourceColumn),roleKey:S(activeNext.roleKey),formGroup:S(activeNext.formGroup),status:'UNCLAIMED',statusLabel:'CHƯA NHẬN',availability:'READY',updatedAtMs:t};}}patch[`roster_sessions/${safe(nextAid)}/engine`]='daily-roster-v2';patch[`roster_sessions/${safe(nextAid)}/schema`]=1;patch[`roster_sessions/${safe(nextAid)}/assignmentId`]=nextAid;patch[`roster_sessions/${safe(nextAid)}/ownerUser`]=to;patch[`roster_sessions/${safe(nextAid)}/formGroup`]=S(ctx.next.formGroup||env.mainForm);patch[`roster_sessions/${safe(nextAid)}/envelope`]=env;patch[`roster_sessions/${safe(nextAid)}/envelopeUpdatedAtMs`]=t;patch[`roster_sessions/${safe(nextAid)}/handoverEnvelope`]=env;patch[`roster_sessions/${safe(nextAid)}/handoverEnvelopeAtMs`]=t;patch[`roster_sessions/${safe(nextAid)}/handoverFromAssignmentId`]=aid;patch[`roster_sessions/${safe(nextAid)}/handoverFromUser`]=from;patch[`roster_sessions/${safe(nextAid)}/workPartReady`]=true;patch[`roster_sessions/${safe(nextAid)}/handoverReady`]=true;patch[`roster_sessions/${safe(nextAid)}/previousPartUser`]=from;patch[`roster_sessions/${safe(nextAid)}/previousPartCompletedAtMs`]=t;patch[`roster_sessions/${safe(nextAid)}/claimStatus`]='READY';patch[`roster_sessions/${safe(nextAid)}/taskStatusV333`]='UNCLAIMED';patch[`roster_sessions/${safe(nextAid)}/taskStatusUpdatedAtMs`]=t;patch[`roster_sessions/${safe(nextAid)}/updatedAtMs`]=t;patch[`roster_sessions/${safe(nextAid)}/updatedBy`]=from;}const ev=`WORK_PART_${t}_${safe(aid)}`;patch[`flight_records/${safe(ctx.d)}/${safe(ctx.item.flightId)}/workPartHistory/${safe(ev)}`]={eventId:ev,assignmentId:aid,nextAssignmentId:nextAid||null,fromUser:from,nextUser:to||null,atMs:t,type:'WORK_PART_COMPLETED',status:'COMPLETED',draftSaved:true,formGroup:S(ctx.item.formGroup),sourceColumn:S(ctx.item.sourceColumn),skippedAssignmentIds:skippedIds,coAssigneeSkippedIds:coSkippedIds};patch[`flight_records/${safe(ctx.d)}/${safe(ctx.item.flightId)}/taskClaims/${safe(from)}/${safe(aid)}/status`]='PART_COMPLETED';patch[`flight_records/${safe(ctx.d)}/${safe(ctx.item.flightId)}/taskClaims/${safe(from)}/${safe(aid)}/taskStatus`]='COMPLETED';patch[`flight_records/${safe(ctx.d)}/${safe(ctx.item.flightId)}/taskClaims/${safe(from)}/${safe(aid)}/completedAtMs`]=t;patch[`flight_records/${safe(ctx.d)}/${safe(ctx.item.flightId)}/taskClaims/${safe(from)}/${safe(aid)}/nextUser`]=to||null;await db('').update(patch);let qrShown=false;if(ctx.next&&typeof root.sagsCreateRosterQrFromCompletion==='function'){try{qrShown=!!(await root.sagsCreateRosterQrFromCompletion({d:ctx.d,item:ctx.item,next:ctx.next,meta:ctx.meta,envelope:env,completedAtMs:t,fromUser:from,toUser:to}))}catch(qe){console.error('V1.1.20 QR creation after completion',qe);alert('Đã hoàn tất nhưng chưa tạo được QR: '+S(qe?.message||qe))}}multiRemove(ctx.item.flightId,ctx.d);await addAudit('WORK_PART_COMPLETED',{flightId:S(ctx.item.flightId),flightLabel:rosterLabel(ctx.item),assignmentId:aid,nextAssignmentId:nextAid||null,fromUser:from,nextUser:to||null,formGroup:S(ctx.item.formGroup),sourceColumn:S(ctx.item.sourceColumn),draftSaved:true,skippedAssignmentIds:skippedIds,coAssigneeSkippedIds:coSkippedIds});if(!qrShown)alert(to?`✓ ĐÃ HOÀN TẤT PHẦN CỦA TÔI.\nDữ liệu đã lưu; ${to} sẽ thấy phần tiếp theo trong MY FLIGHT.`:'✓ ĐÃ HOÀN TẤT PHẦN CỦA TÔI.\nDữ liệu hiện tại đã được lưu.');setTimeout(()=>syncFormActions(),120);setTimeout(()=>decorateList(ctx.d),250)}catch(e){alert('Không hoàn tất được phần công việc: '+S(e?.message||e))}};


  function patchList(){if(typeof root.flightWorkspaceOpenList==='function'&&!root.flightWorkspaceOpenList.__v324){const b=root.flightWorkspaceOpenList;const w=function(d){d=S(d)||opDate();const r=b.apply(this,arguments);Promise.resolve(r).finally(()=>{setTimeout(()=>decorateList(d),130);setTimeout(()=>decorateList(d),520)});return r};w.__v324=1;root.flightWorkspaceOpenList=w}}
  function patchMulti(){if(typeof root.sagsV36SwitchFlight==='function'&&!root.sagsV36SwitchFlight.__v324){const w=function(fid){root.sagsV36CloseMultitask?.();return root.v324ReceiveOrOpen?.(fid)};w.__v324=1;root.sagsV36SwitchFlight=w}}
  function patchFormHooks(){for(const name of ['switchFlightSession','showFormGroup','showRoleHomeIdle','hideRoleHomeIdle']){const fn=root[name];if(typeof fn!=='function'||fn.__v324)continue;const w=function(){const r=fn.apply(this,arguments);Promise.resolve(r).finally(()=>setTimeout(syncFormActions,70));return r};w.__v324=1;root[name]=w;try{if(name==='switchFlightSession')switchFlightSession=w;else if(name==='showFormGroup')showFormGroup=w;else if(name==='showRoleHomeIdle')showRoleHomeIdle=w;else if(name==='hideRoleHomeIdle')hideRoleHomeIdle=w}catch(_){}}}
  function install(){ensureCss();patchList();patchMulti();patchFormHooks();setTimeout(syncFormActions,120);}
  install();setTimeout(install,350);setTimeout(install,1200);
  root.__SAGS_V324_BUILD=BUILD;
})(typeof window!=='undefined'?window:globalThis);
/* ===== END v324-direct-myflight-handover.js ===== */


/* ===== BEGIN dynamic-permission-actions-v326.js ===== */
/* E-REPORT SAGS · V3.26 DYNAMIC PERMISSION ACTIONS
 * Extra permissions explicitly granted by AD surface as compact direct action buttons.
 * Context-only permissions (forms / Quick Time / Export) keep their controls inside the relevant flight/form.
 */
(function(root){
  'use strict';
  const BUILD='V3.26-20260821-01';
  const DIRECT=[
    {key:'DAILY_ROSTER',label:'📋 DAILY ROSTER',run:()=>root.openDailyRosterManager?.()},
    {key:'AC_LIMITS',label:'⚠ A/C LIMITS',run:()=>{if(typeof root.aclSimpleOpen==='function')return root.aclSimpleOpen();return root.aclOpenAdmin?.();}},
    {key:'FLEET',label:'🛫 FLEET',run:()=>root.openFleetManager?.()},
    {key:'FSAGS09',label:'PVHK · FSAGS 09',run:()=>root.openFS09SheetManager?.()},
    {key:'FSAGS208',label:'KH · FSAGS 208',run:()=>root.openKH208Manager?.()},
    {key:'FINAL',label:'FINAL',run:()=>root.openFinalSheetManager?.()}
  ];
  const S=v=>String(v??'').trim();
  const U=v=>S(v).toUpperCase();
  let toolbarObserver=null,navObserver=null,syncTimer=0;
  function profile(){try{return (typeof currentUserProfile!=='undefined'&&currentUserProfile)||root.currentUserProfile||{}}catch(_){return root.currentUserProfile||{}}}
  function role(){try{return U((typeof currentRole!=='undefined'&&currentRole)||profile().role||root.currentRole)}catch(_){return U(profile().role||root.currentRole)}}
  function defaultsFor(r){try{const fn=root.v485RoleDefaults||(typeof v485RoleDefaults==='function'?v485RoleDefaults:null);return typeof fn==='function'?(fn(r)||{}):{}}catch(_){return {}}}
  function ready(){const def=root.v485RoleDefaults||(typeof v485RoleDefaults==='function'?v485RoleDefaults:null);return !!document.querySelector('script[data-phase="control"][src*="app.js"]')&&typeof root.v485Can==='function'&&typeof def==='function'&&typeof root.applyRoleUI==='function';}
  function extras(){
    if(role()==='AD')return [];
    const o=profile().featureOverridesV485;
    if(!o||typeof o!=='object')return [];
    const d=defaultsFor(role());
    return DIRECT.filter(x=>o[x.key]===true&&!d[x.key]&&root.v485Can(x.key));
  }
  function css(){
    if(document.getElementById('v326GrantedPermissionStyle'))return;
    const st=document.createElement('style');st.id='v326GrantedPermissionStyle';st.textContent=`
body.v38-clean-workflow #v38CleanNav .v326GrantedPermission{background:#ecfdf7!important;color:#0f6b55!important;border-color:#a9dccd!important}
body.v38-clean-workflow #v38CleanNav .v326GrantedPermission:active{transform:translateY(1px)}
body.v38-clean-workflow #v38CleanNav .v326GrantedPermission::after{content:'+';display:inline-flex;align-items:center;justify-content:center;margin-left:5px;width:14px;height:14px;border-radius:99px;background:#0f766e;color:#fff;font:900 9px Arial}
`;
    document.head.appendChild(st);
  }
  function invoke(key){
    const a=DIRECT.find(x=>x.key===key);if(!a)return;
    if(!root.v485Can?.(key)){try{root.roleDenied?.('Quyền này đã bị thu hồi.');}catch(_){}schedule();return;}
    try{const r=a.run();if(r&&typeof r.catch==='function')r.catch(e=>alert('Không mở được chức năng: '+S(e?.message||e)));}catch(e){alert('Không mở được chức năng: '+S(e?.message||e));}
  }
  function schedule(){clearTimeout(syncTimer);syncTimer=setTimeout(sync,30);}
  function sync(){
    css();const nav=document.getElementById('v38CleanNav');if(!nav)return;
    const wanted=extras(),keys=new Set(wanted.map(x=>x.key));
    nav.querySelectorAll('[data-v326-feature]').forEach(b=>{if(!keys.has(b.dataset.v326Feature))b.remove();});
    const anchor=document.getElementById('v38NavAdmin')||nav.querySelector('.v38NavSpacer')||null;
    let cursor=anchor;
    for(const a of [...wanted].reverse()){
      let b=nav.querySelector(`[data-v326-feature="${a.key}"]`);
      if(!b){b=document.createElement('button');b.type='button';b.className='v38NavBtn v326GrantedPermission';b.dataset.v326Feature=a.key;b.title='Chức năng được AD cấp thêm';b.onclick=()=>invoke(a.key);}
      if(b.textContent!==a.label)b.textContent=a.label;
      if(cursor){if(b.nextElementSibling!==cursor)nav.insertBefore(b,cursor);}else if(b.parentNode!==nav||b!==nav.lastElementChild)nav.appendChild(b);
      cursor=b;
    }
    // Permission-dependent existing chips keep their native location.
    const shift=document.getElementById('v310ShiftNav');if(shift)shift.style.display=root.v485Can?.('HANDOVER')?'':'none';
    attachNavObserver(nav);
  }
  function attachNavObserver(nav){
    if(navObserver&&navObserver.__nav===nav)return;
    try{navObserver?.disconnect?.()}catch(_){}
    navObserver=new MutationObserver(()=>schedule());navObserver.__nav=nav;navObserver.observe(nav,{childList:true});
  }
  function install(){
    if(root.__SAGS_V326_PERMISSION_ACTIONS)return true;if(!ready())return false;
    root.__SAGS_V326_PERMISSION_ACTIONS=BUILD;css();
    const base=root.applyRoleUI;
    if(!base.__v326Wrapped){
      const wrapped=function(){const out=base.apply(this,arguments);schedule();return out;};wrapped.__v326Wrapped=true;wrapped.__v326Base=base;root.applyRoleUI=wrapped;try{applyRoleUI=wrapped}catch(_){}
    }
    const tb=document.querySelector('.toolbar.compact-main-toolbar')||document.querySelector('.toolbar');
    if(tb){toolbarObserver=new MutationObserver(()=>schedule());toolbarObserver.observe(tb,{childList:true,subtree:true});}
    root.sagsV326RefreshGrantedActions=sync;
    schedule();window.addEventListener('pageshow',schedule,{passive:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});return true;
  }
  let tries=0;const t=setInterval(()=>{if(install()||++tries>80)clearInterval(t)},100);
})(typeof window!=='undefined'?window:globalThis);
/* ===== END dynamic-permission-actions-v326.js ===== */

/* ===== BEGIN reassign-direct-handover-v327.js ===== */
/* E-REPORT SAGS · V3.27
 * - Add per-account permission PHÂN CÔNG LẠI CHUYẾN.
 * - Mobile reassign A -> B without modifying the original Daily Roster source.
 * - Retire the old batch GIAO CA approval flow from the CLEAN UI.
 * - Roster sequence handover inside the active form remains direct: current user confirms, draft is saved,
 *   next roster user receives READY and later presses NHẬN CHUYẾN.
 */
(function(root){
  'use strict';
  const BUILD='V3.27-20260821-01';
  const FEATURE='REASSIGN_FLIGHT';
  const S=v=>String(v??'').trim(), U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return U(v)}};
  function sess(){try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}}
  function profile(){return sess().profile||root.currentUserProfile||{}}
  function role(){return U(sess().role||profile().role)}
  function me(){return norm(profile().username||(role()==='AD'?'AD':''))}
  function opDate(){const x=S(sessionStorage.getItem('sagsV36FwcDate'))||S(document.getElementById('fwcDate')?.value);if(x)return x;const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function db(path){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase RTDB chưa sẵn sàng.');return root.sagsV470Ref(path)}
  async function userCatalog(force=false){try{return typeof root.v466GetUserCatalog==='function'?await root.v466GetUserCatalog(force):[]}catch(_){return []}}
  function unitParts(p){p=p||{};return {group:U(p.groupCode||p.group),dep:U(p.departmentCode||p.systemDepartment||p.department),unit:U(p.unit||p.workUnit),role:U(p.role)}}
  function sameUnit(a,b){if(!a||!b)return false;const x=unitParts(a),y=unitParts(b);if(x.group&&y.group)return x.group===y.group;if(x.dep&&y.dep)return x.dep===y.dep;if(x.unit&&y.unit)return x.unit===y.unit;return !!x.role&&x.role===y.role}
  function canReassign(){try{return role()==='AD'||!!root.v485Can?.(FEATURE)}catch(_){return role()==='AD'}}
  function canTouchAssignment(item,users){if(role()==='AD')return true;const actor=users.find(x=>norm(x.username)===me()),old=users.find(x=>norm(x.username)===norm(item?.user||item?.targetUser));return !!actor&&!!old&&sameUnit(actor,old)}
  function labelForm(g){g=U(g);return g==='FINAL'?'CBTT · FINAL':g==='FSAGS421'?'FSAGS 42.1':g==='FSAGS551'?'FSAGS 55.1':g==='FSAGS09'?'F/SAGS-CXR/09':g==='LOADING208'?'F/SAGS-CXR/208':'FSAGS 42.3'}
  async function audit(event,detail){try{const p=profile();await db('ops_audit_v331').push({schema:1,event,systemTimestamp:root.firebase?.database?.ServerValue?.TIMESTAMP||Date.now(),clientAtMs:Date.now(),actor:{username:me(),name:S(p.name||p.fullName||me()),role:role()},flightId:S(detail?.flightId),flightLabel:S(detail?.flightLabel),detail:detail||{}})}catch(e){console.info('V3.27 audit',e?.message||e)}}

  function installPermission(){
    try{
      if(typeof SAGS_FEATURES_V485!=='object'||!Array.isArray(V485_FEATURE_KEYS))return false;
      SAGS_FEATURES_V485[FEATURE]={label:'PHÂN CÔNG LẠI CHUYẾN',note:'Đổi người thực tế A → B trên Daily Roster đã xác nhận; giữ người kế hoạch gốc và Audit'};
      if(!V485_FEATURE_KEYS.includes(FEATURE))V485_FEATURE_KEYS.push(FEATURE);
      // Legacy batch handover (approve -> accept) is retired from the active permission list.
      const hi=V485_FEATURE_KEYS.indexOf('HANDOVER');if(hi>=0)V485_FEATURE_KEYS.splice(hi,1);
      try{delete SAGS_FEATURES_V485.HANDOVER}catch(_){}
      if(typeof root.v485Can==='function'&&!root.v485Can.__v327){
        const base=root.v485Can;
        const wrapped=function(feature){if(U(feature)==='HANDOVER')return false;return base.apply(this,arguments)};
        wrapped.__v327=true;wrapped.__v327Base=base;root.v485Can=wrapped;try{v485Can=wrapped}catch(_){}
      }
      return true;
    }catch(e){console.warn('V3.27 permission install',e);return false}
  }

  function ensureCss(){if(document.getElementById('sagsV327Style'))return;const st=document.createElement('style');st.id='sagsV327Style';st.textContent=`
#v310ShiftNav,#roleBtnHandover,#v310ShiftModal{display:none!important}
#v327ReassignModal{position:fixed;inset:0;z-index:10240;background:rgba(7,22,38,.62);display:none;align-items:center;justify-content:center;padding:10px;box-sizing:border-box;font-family:Arial,sans-serif}
#v327ReassignModal.show{display:flex}.v327Panel{width:min(96vw,760px);max-height:90vh;overflow:auto;background:#f8fbfe;border-radius:16px;padding:12px;box-shadow:0 18px 55px rgba(0,0,0,.3);color:#17324a}.v327Head{display:flex;gap:8px;align-items:flex-start;justify-content:space-between}.v327Head h3{margin:0;color:#0b4d8b;font:900 18px Arial}.v327Sub{font:700 11px/1.35 Arial;color:#63778b;margin-top:4px}.v327Tools{display:grid;grid-template-columns:145px 1fr auto;gap:6px;margin:10px 0}.v327Tools input,.v327Tools select{min-width:0;border:1px solid #cbd9e6;border-radius:9px;background:#fff;padding:8px;font:700 12px Arial;color:#17324a}.v327Btn{border:0;border-radius:9px;padding:8px 10px;font:900 11px Arial;cursor:pointer}.v327Btn.blue{background:#0b6aa9;color:#fff}.v327Btn.gray{background:#e8eef4;color:#27425a}.v327Btn.orange{background:#fff1df;color:#934a00;border:1px solid #e8bd87}.v327List{display:grid;gap:7px}.v327Card{background:#fff;border:1px solid #d8e2eb;border-radius:11px;padding:9px}.v327Top{display:flex;justify-content:space-between;gap:7px;align-items:flex-start}.v327Flight{font:900 14px Arial;color:#0b4d8b}.v327Meta{font:700 10.5px/1.35 Arial;color:#708196;margin-top:2px}.v327Assign{display:grid;grid-template-columns:minmax(0,1fr) minmax(145px,.85fr) auto;gap:6px;align-items:center;margin-top:7px;padding-top:7px;border-top:1px dashed #dde6ee}.v327Current{font:800 11px/1.35 Arial}.v327Current b{color:#9a4d00}.v327Assign select,.v327Assign input.v327ToInput{min-width:0;border:1px solid #cbd9e6;border-radius:8px;padding:7px;background:#fff;font:700 11px Arial;box-sizing:border-box;width:100%}
.v327Assign input.v327ToInput:focus{outline:2px solid rgba(11,106,169,.18);border-color:#0b6aa9}.v327Empty{padding:18px;text-align:center;color:#687b8f;font:800 12px Arial}.v327Status{margin:7px 0;padding:7px 9px;border-radius:8px;background:#eef7ff;color:#28587d;font:800 11px/1.35 Arial}.v327ReassignChip{background:#fff1df!important;color:#934a00!important;border-color:#e8bd87!important}
@media(max-width:560px){.v327Tools{grid-template-columns:120px 1fr}.v327Tools .v327Reload{grid-column:1/-1}.v327Assign{grid-template-columns:1fr auto}.v327Assign select,.v327Assign input.v327ToInput{grid-column:1/2}.v327Assign .v327Go{grid-column:2/3;grid-row:2}.v327Current{grid-column:1/-1}}
`;document.head.appendChild(st)}

  function ensureModal(){ensureCss();if(document.getElementById('v327ReassignModal'))return;const m=document.createElement('div');m.id='v327ReassignModal';m.innerHTML=`<div class="v327Panel"><div class="v327Head"><div><h3>🔁 PHÂN CÔNG LẠI CHUYẾN</h3><div class="v327Sub">Đổi người thực tế A → B trên điện thoại. Daily Roster gốc vẫn được giữ trong originalUser/Audit; không cần upload roster lại.</div></div><button class="v327Btn gray" onclick="v327CloseReassign()">ĐÓNG</button></div><div class="v327Tools"><input id="v327Date" type="date"><input id="v327Search" placeholder="Tìm Flight / người đang làm" oninput="v327RenderReassign()"><button class="v327Btn blue v327Reload" onclick="v327LoadReassign(true)">TẢI LẠI</button></div><div id="v327Status" class="v327Status">Đang tải...</div><div id="v327List" class="v327List"></div></div>`;document.body.appendChild(m)}
  let cache={date:'',manifest:null,users:[]};
  function setStatus(t,err=false){const e=document.getElementById('v327Status');if(!e)return;e.textContent=t||'';e.style.background=err?'#fff0f0':'#eef7ff';e.style.color=err?'#a32626':'#28587d'}
  function candidateUsers(item){const users=cache.users||[],oldU=norm(item.user||item.targetUser),old=users.find(x=>norm(x.username)===oldU),actor=users.find(x=>norm(x.username)===me());let list=users.filter(x=>x&&x.active!==false&&norm(x.username)&&norm(x.username)!==oldU);
    if(old)list=list.filter(x=>sameUnit(old,x));else if(role()!=='AD'&&actor)list=list.filter(x=>sameUnit(actor,x));
    return list.sort((a,b)=>S(a.name||a.fullName||a.username).localeCompare(S(b.name||b.fullName||b.username),'vi'))}
  function candidateOptions(item){return candidateUsers(item).map(x=>{const name=S(x.name||x.fullName||x.username),user=norm(x.username),code=S(x.employeeCode||x.staffCode||'');return `<option value="${esc(name)}" label="${esc([user,code].filter(Boolean).join(' · '))}"></option>`}).join('')}
  function resolveCandidate(item,raw){const q=S(raw);if(!q)return {user:null,error:'Nhập tên hoặc username người mới.'};const list=candidateUsers(item),nq=norm(q),uq=U(q);
    let hit=list.find(x=>norm(x.username)===nq);if(hit)return {user:hit};
    const exact=list.filter(x=>U(S(x.name||x.fullName||''))===uq);if(exact.length===1)return {user:exact[0]};if(exact.length>1)return {user:null,error:'Có nhiều người trùng tên. Hãy gõ username để chọn chính xác.'};
    const near=list.filter(x=>U([x.name,x.fullName,x.username,x.employeeCode,x.staffCode].filter(Boolean).join(' ')).includes(uq));if(near.length===1)return {user:near[0]};if(near.length>1)return {user:null,error:'Có nhiều kết quả phù hợp. Gõ thêm tên hoặc username.'};
    return {user:null,error:'Không tìm thấy người phù hợp cùng đơn vị.'}}
  function visibleItems(){const q=U(document.getElementById('v327Search')?.value),all=Object.values(cache.manifest?.items||{}).filter(x=>x&&x.active!==false&&canTouchAssignment(x,cache.users));return all.filter(x=>!q||U([x.flightRaw,x.flightName,x.arrFlight,x.depFlight,x.user,x.targetUser,x.sourceColumn,x.formGroup].join(' ')).includes(q)).sort((a,b)=>S(a.std).localeCompare(S(b.std))||S(a.flightRaw).localeCompare(S(b.flightRaw))||S(a.sourceColumn).localeCompare(S(b.sourceColumn)))}
  root.v327RenderReassign=function(){const host=document.getElementById('v327List');if(!host)return;const items=visibleItems(),groups=new Map();for(const x of items){const k=S(x.flightId||x.flightRaw||x.flightName||x.assignmentId);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x)}if(!items.length){host.innerHTML='<div class="v327Empty">Không có phân công phù hợp trong ngày này.</div>';return}host.innerHTML=[...groups.entries()].map(([fid,arr])=>{const a=arr[0],name=S(a.flightName||a.flightRaw||[a.arrFlight,a.depFlight].filter(Boolean).join(' / ')||fid);return `<div class="v327Card"><div class="v327Top"><div><div class="v327Flight">✈ ${esc(name)}</div><div class="v327Meta">STD ${esc(a.std||'—')} · STA ${esc(a.sta||'—')} · A/C ${esc(a.acReg||'—')}</div></div></div>${arr.map(x=>`<div class="v327Assign"><div class="v327Current"><b>${esc(norm(x.user||x.targetUser)||'—')}</b> · ${esc(x.sourceColumn||x.roleKey||'')} · ${esc(labelForm(x.formGroup))}${x.manualOverride?'<br><span class="v327Meta">Kế hoạch gốc: '+esc(norm(x.originalUser||x.originalTargetUser)||'—')+'</span>':''}</div><input class="v327ToInput" id="v327To_${esc(safe(x.assignmentId))}" list="v327DL_${esc(safe(x.assignmentId))}" placeholder="Gõ tên / username..." autocomplete="off"><datalist id="v327DL_${esc(safe(x.assignmentId))}">${candidateOptions(x)}</datalist><button class="v327Btn orange v327Go" onclick="v327Reassign('${esc(S(x.assignmentId))}')">ĐỔI NGƯỜI</button></div>`).join('')}</div>`}).join('')}
  root.v327LoadReassign=async function(force=false){if(!canReassign())return;ensureModal();const d=S(document.getElementById('v327Date')?.value)||opDate();try{setStatus('Đang tải phân công...');const [ms,users]=await Promise.all([db(`roster_manifests/${safe(d)}`).once('value'),userCatalog(force)]);cache={date:d,manifest:ms.val()||{},users:users||[]};root.v327RenderReassign();setStatus(`✓ ${visibleItems().length} phân công có thể quản lý · ${d}.`)}catch(e){setStatus('Không tải được: '+S(e?.message||e),true)}};
  root.v327OpenReassign=async function(){if(!canReassign())return root.roleDenied?.('Tài khoản chưa được AD cấp quyền PHÂN CÔNG LẠI CHUYẾN.');ensureModal();document.getElementById('v327Date').value=opDate();document.getElementById('v327ReassignModal').classList.add('show');await root.v327LoadReassign(false)};
  root.v327CloseReassign=function(){document.getElementById('v327ReassignModal')?.classList.remove('show')};
  root.v327Reassign=async function(aid){if(!canReassign())return;aid=S(aid);const item=cache.manifest?.items?.[aid];if(!item)return alert('Không tìm thấy assignment. Hãy tải lại.');const sel=document.getElementById(`v327To_${safe(aid)}`),picked=resolveCandidate(item,sel?.value),old=norm(item.user||item.targetUser);if(!picked.user)return alert(picked.error||'Chọn người mới.');const toP=picked.user,target=norm(toP.username);if(target===old)return alert('Người mới đang là người phụ trách hiện tại.');const oldP=cache.users.find(x=>norm(x.username)===old);if(!toP||toP.active===false)return alert('Tài khoản người mới không ACTIVE.');if(oldP&&!sameUnit(oldP,toP))return alert('Người mới phải cùng đơn vị với người đang được phân công.');if(!canTouchAssignment(item,cache.users))return alert('Tài khoản của bạn không được phân công lại assignment này.');if(!confirm(`ĐỔI NGƯỜI PHỤ TRÁCH\n\n${item.flightRaw||item.flightName||''} · ${labelForm(item.formGroup)}\n${old} → ${target}\n\nDaily Roster kế hoạch gốc vẫn được giữ. Người mới sẽ thấy chuyến trong MY FLIGHT và bấm NHẬN CHUYẾN.`))return;
    try{const d=cache.date||opDate(),t=Date.now(),actor=me(),gid=S(item.coAssigneeGroupId);let coLock=null;if(gid)try{coLock=(await db(`roster_co_claims/${safe(d)}/${safe(gid)}`).once('value')).val()||null}catch(_){}let payload=null;try{payload=(await db(`roster_mail/${safe(old)}/items/${safe(aid)}`).once('value')).val()}catch(_){}payload=payload||{engine:'daily-roster-v2',schema:2,assignmentId:aid,opDate:d,flightRaw:S(item.flightRaw),flightName:S(item.flightName),arrFlight:S(item.arrFlight),depFlight:S(item.depFlight),sta:S(item.sta),std:S(item.std),acReg:S(item.acReg),acType:S(item.acType),route:S(item.route),formGroup:S(item.formGroup),sourceColumn:S(item.sourceColumn),roleKey:S(item.roleKey),workPartOrder:Number(item.workPartOrder||1),workPartTotal:Number(item.workPartTotal||1),workPartSequenceSource:S(item.workPartSequenceSource||item.sourceColumn),active:true};
      const original=norm(item.originalUser||item.originalTargetUser||payload.originalTargetUser||old)||old;
      const nextPayload={...payload,targetUser:target,originalTargetUser:original,manualOverride:true,reassignedFrom:old,reassignedAtMs:t,reassignedBy:actor,active:true};
      const patch={};patch[`roster_mail/${safe(old)}/items/${safe(aid)}`]=null;patch[`roster_mail/${safe(target)}/items/${safe(aid)}`]=nextPayload;patch[`roster_revocations/${safe(old)}/items/${safe(aid)}`]={assignmentId:aid,reason:'MANUAL_REASSIGN',toUser:target,atMs:t,by:actor};patch[`roster_revocations/${safe(target)}/items/${safe(aid)}`]=null;patch[`roster_manifests/${safe(d)}/items/${safe(aid)}`]={...item,user:target,targetUser:target,originalUser:original,manualOverride:true,assignmentId:aid,lastReassignedAtMs:t,lastReassignedBy:actor,lastReassignedFrom:old};patch[`roster_sessions/${safe(aid)}/ownerUser`]=target;patch[`roster_sessions/${safe(aid)}/claimStatus`]='READY';patch[`roster_sessions/${safe(aid)}/taskStatusV333`]='UNCLAIMED';patch[`roster_sessions/${safe(aid)}/taskStatusUpdatedAtMs`]=t;patch[`roster_sessions/${safe(aid)}/handoverReady`]=true;patch[`roster_sessions/${safe(aid)}/reassignedFrom`]=old;patch[`roster_sessions/${safe(aid)}/reassignedAtMs`]=t;patch[`roster_sessions/${safe(aid)}/reassignedBy`]=actor;patch[`roster_sessions/${safe(aid)}/claimedBy`]=null;patch[`roster_sessions/${safe(aid)}/claimedAtMs`]=null;patch[`roster_sessions/${safe(aid)}/updatedAtMs`]=t;if(gid){const lockOwner=norm(coLock?.claimedBy),lockAid=S(coLock?.claimedAssignmentId),ownerMoved=U(coLock?.status)==='CLAIMED'&&(lockAid===aid||lockOwner===old);if(ownerMoved){patch[`roster_co_claims/${safe(d)}/${safe(gid)}`]=null;for(const peer of Object.values(cache.manifest?.items||{}).filter(x=>S(x?.coAssigneeGroupId)===gid)){const pid=S(peer.assignmentId);if(!pid||pid===aid)continue;patch[`roster_sessions/${safe(pid)}/coClaimedBy`]=null;patch[`roster_sessions/${safe(pid)}/coClaimedAssignmentId`]=null;patch[`roster_sessions/${safe(pid)}/claimStatus`]='READY';patch[`roster_sessions/${safe(pid)}/taskStatusV333`]='UNCLAIMED';patch[`roster_sessions/${safe(pid)}/taskAvailabilityV333`]='READY';patch[`roster_sessions/${safe(pid)}/updatedAtMs`]=t;}patch[`roster_sessions/${safe(aid)}/coClaimedBy`]=null;patch[`roster_sessions/${safe(aid)}/coClaimedAssignmentId`]=null;}else if(U(coLock?.status)==='CLAIMED'&&lockOwner){patch[`roster_sessions/${safe(aid)}/claimStatus`]='STANDBY';patch[`roster_sessions/${safe(aid)}/taskAvailabilityV333`]='STANDBY';patch[`roster_sessions/${safe(aid)}/coClaimedBy`]=lockOwner;patch[`roster_sessions/${safe(aid)}/coClaimedAssignmentId`]=lockAid||null;}}const ev=`REASSIGN_${t}_${safe(aid)}`;const fid=S(item.flightId);if(fid){patch[`flight_records/${safe(d)}/${safe(fid)}/assignmentOverrideHistory/${safe(ev)}`]={eventId:ev,type:'MANUAL_REASSIGN',assignmentId:aid,fromUser:old,toUser:target,originalUser:original,sourceColumn:S(item.sourceColumn),formGroup:S(item.formGroup),atMs:t,by:actor};patch[`flight_records/${safe(d)}/${safe(fid)}/taskClaims/${safe(old)}/${safe(aid)}/status`]='REASSIGNED';patch[`flight_records/${safe(d)}/${safe(fid)}/taskClaims/${safe(old)}/${safe(aid)}/reassignedAtMs`]=t;patch[`flight_records/${safe(d)}/${safe(fid)}/taskClaims/${safe(old)}/${safe(aid)}/reassignedTo`]=target;}
      await db('').update(patch);await audit('FLIGHT_ASSIGNMENT_REASSIGNED',{flightId:fid,flightLabel:S(item.flightName||item.flightRaw),assignmentId:aid,fromUser:old,toUser:target,originalUser:original,sourceColumn:S(item.sourceColumn),formGroup:S(item.formGroup)});alert(`✓ ĐÃ ĐỔI NGƯỜI: ${old} → ${target}.\n${target} sẽ thấy chuyến trong MY FLIGHT và bấm NHẬN CHUYẾN.`);await root.v327LoadReassign(true);try{root.dailyRosterRestartMailbox?.()}catch(_){}try{root.flightWorkspaceOpenList?.(d)}catch(_){}
    }catch(e){alert('Không đổi người được: '+S(e?.message||e))}}

  function syncNav(){ensureCss();const nav=document.getElementById('v38CleanNav');if(!nav)return;document.getElementById('v310ShiftNav')?.remove();const old=document.getElementById('roleBtnHandover');if(old)old.style.display='none';let b=document.getElementById('v327ReassignNav');if(!canReassign()){b?.remove();return}if(!b){b=document.createElement('button');b.id='v327ReassignNav';b.className='v38NavBtn v327ReassignChip';b.textContent='🔁 ĐỔI NGƯỜI';b.onclick=()=>root.v327OpenReassign();const admin=document.getElementById('v38NavAdmin');if(admin)nav.insertBefore(b,admin);else nav.appendChild(b)} }

  function disableLegacyHandover(){
    try{root.v310ShiftOpen=function(){alert('GIAO CA có duyệt đã ngừng dùng. Trong biểu mẫu chuyến, người đang làm bấm HOÀN TẤT PHẦN CỦA TÔI; dữ liệu được lưu và phần tiếp theo tự sẵn sàng theo Daily Roster.')}}catch(_){}
    try{if(typeof root.openHandoverMenu==='function')root.openHandoverMenu=function(){alert('Trong biểu mẫu chuyến, dùng HOÀN TẤT PHẦN CỦA TÔI để lưu phần hiện tại và mở phần tiếp theo theo Daily Roster.')}}catch(_){}
  }

  function install(){if(root.__SAGS_V327_INSTALLED===BUILD){syncNav();return true}if(!installPermission())return false;root.__SAGS_V327_INSTALLED=BUILD;ensureCss();ensureModal();disableLegacyHandover();syncNav();
    try{const base=root.applyRoleUI;if(typeof base==='function'&&!base.__v327){const w=function(){const r=base.apply(this,arguments);setTimeout(syncNav,20);return r};w.__v327=true;w.__v327Base=base;root.applyRoleUI=w;try{applyRoleUI=w}catch(_){} }}catch(_){}
    const mo=new MutationObserver(()=>syncNav()),host=document.getElementById('v38CleanNav')||document.querySelector('.toolbar.compact-main-toolbar')||document.body;try{mo.observe(host,{childList:true,subtree:true})}catch(_){}root.__SAGS_V327_NAV_OBSERVER=mo;
    return true}
  let tries=0;const timer=setInterval(()=>{if(install()||++tries>120)clearInterval(timer)},100);setTimeout(()=>install(),0);setTimeout(()=>install(),700);
})(typeof window!=='undefined'?window:globalThis);
/* ===== END reassign-direct-handover-v327.js ===== */


/* ===== BEGIN work-part-continuity-v330.js ===== */
(function(root){root.__SAGS_V330_BUILD='V3.30-20260821-02';})(typeof window!=='undefined'?window:globalThis);
/* ===== END work-part-continuity-v330.js ===== */

/* V3.31 · REMOVE UNUSED PILOT CONTROL */
(function(root){root.__SAGS_V331_BUILD='V3.31-20260821-01';})(typeof window!=='undefined'?window:globalThis);

/* E-REPORT/SAGS V3.32 · NEXT-DAY TIME (+) */
(function(root){root.__SAGS_V332_BUILD='V3.32-20260821-01';})(typeof window!=='undefined'?window:globalThis);


/* ===== BEGIN task-status-engine-v333.js ===== */
/* E-REPORT SAGS · V3.33 TASK STATUS STANDARD
 * One canonical task status set for every Daily Roster assignment:
 * UNCLAIMED / IN_PROGRESS / BLOCK / COMPLETED / NOT_APPLICABLE.
 * READY / WAITING_PREVIOUS are availability reasons, not extra task statuses.
 * Existing legacy claimStatus/workPartStatus remain for backward compatibility.
 */
(function(root){
  'use strict';
  const BUILD='V3.33-20260821-01';
  const STATUS=Object.freeze({UNCLAIMED:'UNCLAIMED',IN_PROGRESS:'IN_PROGRESS',BLOCK:'BLOCK',COMPLETED:'COMPLETED',NOT_APPLICABLE:'NOT_APPLICABLE'});
  const LABEL=Object.freeze({UNCLAIMED:'CHƯA NHẬN',IN_PROGRESS:'ĐANG LÀM',BLOCK:'BLOCK',COMPLETED:'HOÀN TẤT',NOT_APPLICABLE:'KHÔNG ÁP DỤNG'});
  const S=v=>String(v??'').trim(), U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const norm=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return U(v)}};
  function session(){try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}}
  function actor(){const x=session(),p=x.profile||{};return {username:norm(p.username||(U(x.role)==='AD'?'AD':'')),name:S(p.name||p.fullName||p.username),role:U(x.role||p.role)}}
  function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function opDate(){return S(sessionStorage.getItem('sagsV36FwcDate'))||S(document.getElementById('fwcDate')?.value)||today()}
  function db(path){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase RTDB chưa sẵn sàng.');return root.sagsV470Ref(path)}
  function normalize(v){const x=U(v).replace(/[\s-]+/g,'_');if(!x)return '';if(['UNCLAIMED','READY','WAIT','WAITING','WAITING_PREVIOUS','CHUA_NHAN','CHƯA_NHẬN'].includes(x))return STATUS.UNCLAIMED;if(['IN_PROGRESS','CLAIMED','ACTIVE','WORKING','DANG_LAM','ĐANG_LÀM'].includes(x))return STATUS.IN_PROGRESS;if(['BLOCK','BLOCKED','HOLD','ON_HOLD','PAUSED'].includes(x))return STATUS.BLOCK;if(['COMPLETED','PART_COMPLETED','DONE','HANDED_OVER','FINISHED','HOAN_TAT','HOÀN_TẤT'].includes(x))return STATUS.COMPLETED;if(['NOT_APPLICABLE','N/A','NA','NOT_APPLY','KHONG_AP_DUNG','KHÔNG_ÁP_DỤNG'].includes(x))return STATUS.NOT_APPLICABLE;return ''}
  function itemFlightId(man,x,date=''){const fid=S(x?.flightId)||S(root.sagsV346ResolveRosterFlightId?.(S(date||man?.opDate)||opDate(),x,{}));if(fid&&x&&!x.flightId)x.flightId=fid;return fid}
  function laneKey(x){return [S(x?.flightId),U(x?.sourceColumn),U(x?.roleKey),U(x?.formGroup)].join('|')}
  function activeItems(man){return Object.values(man?.items||{}).filter(x=>x&&x.active!==false).map(x=>{itemFlightId(man,x);return x})}
  function laneLegRank(x){const l=U(x?.assignmentLeg);return l==='ARR'?0:l==='DEP'?2:1}
  function coGroupId(x){return S(x?.coAssigneeGroupId)}
  function lane(man,item){const k=laneKey(item),a=activeItems(man).filter(x=>laneKey(x)===k);return a.map((x,i)=>({x,i,n:Number(x?.workPartOrder),leg:laneLegRank(x),co:Number(x?.coAssigneeRank)||9999})).sort((p,q)=>{if(p.leg!==q.leg)return p.leg-q.leg;const ph=Number.isFinite(p.n)&&p.n>0,qh=Number.isFinite(q.n)&&q.n>0;if(ph&&qh){const d=p.n-q.n;if(d)return d;const c=p.co-q.co;if(c)return c;return p.i-q.i}if(ph!==qh)return ph?-1:1;return p.co-q.co||p.i-q.i}).map(v=>v.x)}
  function previous(man,item){const a=lane(man,item),i=a.findIndex(x=>S(x.assignmentId)===S(item?.assignmentId)),gid=coGroupId(item);if(i<0)return null;for(let j=i-1;j>=0;j--)if(!(gid&&coGroupId(a[j])===gid))return a[j];return null}
  function derive(st,item,man,allSessions){st=st||{};const explicit=normalize(st.taskStatusV333||st.taskStatus);if(explicit===STATUS.BLOCK||explicit===STATUS.NOT_APPLICABLE)return explicit;const legacy=normalize(st.claimStatus||st.workPartStatus);if(legacy===STATUS.COMPLETED)return STATUS.COMPLETED;if(legacy===STATUS.IN_PROGRESS)return STATUS.IN_PROGRESS;if(explicit===STATUS.COMPLETED||explicit===STATUS.IN_PROGRESS)return explicit;return STATUS.UNCLAIMED}
  function availability(st,item,man,allSessions){const status=derive(st,item,man,allSessions);if(status===STATUS.COMPLETED)return 'COMPLETED';if(status===STATUS.BLOCK)return 'BLOCKED';if(status===STATUS.NOT_APPLICABLE)return 'NOT_APPLICABLE';const owner=norm(item?.user||item?.targetUser||st?.ownerUser),coOwner=norm(st?.coClaimedBy);if(coGroupId(item)&&coOwner&&owner&&coOwner!==owner)return 'STANDBY';const prev=previous(man,item);if(prev){const pst=(allSessions||{})[S(prev.assignmentId)]||{};if(derive(pst,prev,man,allSessions)!==STATUS.COMPLETED)return 'WAITING_PREVIOUS'}return status===STATUS.IN_PROGRESS?'ACTIVE':'READY'}
  function label(v){return LABEL[normalize(v)||v]||S(v)||LABEL.UNCLAIMED}
  function summary(item,st,man,allSessions,date){const status=derive(st,item,man,allSessions),avail=availability(st,item,man,allSessions),skipNoEform=st?.skippedNoEform===true||st?.autoSkippedByNextUser===true;return {schema:1,engine:'TASK_STATUS_V333',assignmentId:S(item.assignmentId),flightId:itemFlightId(man,item,date),opDate:S(date||item.opDate),flightName:S(item.flightName||item.flightRaw),ownerUser:norm(item.user||item.targetUser||st.ownerUser),sourceColumn:S(item.sourceColumn),roleKey:S(item.roleKey),formGroup:S(item.formGroup),assignmentScope:S(item.assignmentScope||'BOTH'),workPartOrder:Number(item.workPartOrder||1),workPartTotal:Number(item.workPartTotal||1),coAssigneeGroupId:S(item.coAssigneeGroupId),coAssigneeRank:Number(item.coAssigneeRank||1),coAssigneeTotal:Number(item.coAssigneeTotal||1),coClaimedBy:norm(st.coClaimedBy),status,statusLabel:skipNoEform?'BỎ QUA · KHÔNG E-FORM':LABEL[status],availability:avail,skippedNoEform:skipNoEform||null,skippedBy:skipNoEform?norm(st.skippedBy):null,skippedAtMs:skipNoEform?Number(st.skippedAtMs||0)||null:null,updatedAtMs:Number(st.taskStatusUpdatedAtMs||st.updatedAtMs||Date.now())||Date.now()}}
  function sameSummary(a,b){if(!a||!b)return false;for(const k of ['assignmentId','flightId','opDate','ownerUser','sourceColumn','roleKey','formGroup','assignmentScope','workPartOrder','workPartTotal','coAssigneeGroupId','coAssigneeRank','coAssigneeTotal','coClaimedBy','status','statusLabel','availability','skippedNoEform','skippedBy','skippedAtMs'])if(S(a[k])!==S(b[k]))return false;return true}
  async function syncDate(date=opDate(),force=false){date=S(date)||opDate();if(!date||typeof root.sagsV470Ref!=='function')return {ok:false,count:0};const mark=`sagsTaskStatusV333:${date}`;if(!force){try{if(sessionStorage.getItem(mark)===BUILD)return {ok:true,skipped:true,count:0}}catch(_){}}
    const [ms,ss,fs]=await Promise.all([db(`roster_manifests/${safe(date)}`).once('value'),db('roster_sessions').once('value'),db(`flight_records/${safe(date)}`).once('value')]);const man=ms.val()||{},sessions=ss.val()||{},flights=fs.val()||{},items=activeItems(man),patch={},now=Date.now();let changed=0;
    for(const item of items){const aid=S(item.assignmentId);if(!aid)continue;const st=sessions[aid]||{},sum=summary(item,st,man,sessions,date),fid=itemFlightId(man,item,date);if(S(st.taskStatusV333)!==sum.status){patch[`roster_sessions/${safe(aid)}/taskStatusV333`]=sum.status;patch[`roster_sessions/${safe(aid)}/taskStatusUpdatedAtMs`]=now;changed++}if(S(st.taskAvailabilityV333)!==sum.availability){patch[`roster_sessions/${safe(aid)}/taskAvailabilityV333`]=sum.availability;changed++}if(fid){const old=flights?.[fid]?.taskStatus?.[aid];if(!sameSummary(old,sum)){sum.updatedAtMs=now;patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}`]=sum;changed++}}
    }
    if(Object.keys(patch).length)await db('').update(patch);try{sessionStorage.setItem(mark,BUILD)}catch(_){}root.__SAGS_V333_LAST_SYNC={date,atMs:now,assignments:items.length,changes:changed};return {ok:true,count:items.length,changes:changed}
  }
  async function setExplicit(assignmentId,status,reason='',date=opDate()){const aid=S(assignmentId),st=normalize(status);if(!aid||![STATUS.BLOCK,STATUS.NOT_APPLICABLE].includes(st))throw new Error('Chỉ BLOCK hoặc NOT_APPLICABLE được đặt trực tiếp ở lớp chuẩn hóa này.');const t=Date.now(),a=actor();await db(`roster_sessions/${safe(aid)}`).update({taskStatusV333:st,taskStatusReason:S(reason),taskStatusUpdatedAtMs:t,taskStatusUpdatedBy:a.username});try{sessionStorage.removeItem(`sagsTaskStatusV333:${date}`)}catch(_){}await syncDate(date,true);return true}
  root.SAGS_TASK_STATUS_V333=STATUS;root.sagsTaskStatusNormalize=normalize;root.sagsTaskStatusLabel=label;root.sagsTaskStatusDerive=derive;root.sagsTaskStatusAvailability=availability;root.sagsTaskStatusSyncDate=syncDate;root.sagsTaskSetBlocked=(aid,reason,date)=>setExplicit(aid,STATUS.BLOCK,reason,date);root.sagsTaskSetNotApplicable=(aid,reason,date)=>setExplicit(aid,STATUS.NOT_APPLICABLE,reason,date);
  function wrap(name,after,tag){const fn=root[name];if(typeof fn!=='function'||fn[tag])return;const w=async function(){const r=await fn.apply(this,arguments);try{await after(r,arguments)}catch(e){console.info('V3.33 status sync',name,e?.message||e)}return r};w[tag]=true;w[`${tag}Base`]=fn;root[name]=w;try{if(name==='dailyRosterPublish')dailyRosterPublish=w;else if(name==='flightWorkspaceOpenList')flightWorkspaceOpenList=w}catch(_){}}
  function install(){if(root.__SAGS_V333_INSTALLED===BUILD)return true;root.__SAGS_V333_INSTALLED=BUILD;wrap('dailyRosterPublish',async r=>{if(r===true&&!root.__SAGS_ROSTER_LAST_DELTA?.noChange)await syncDate(S(document.getElementById('drManageDate')?.value)||opDate(),true)},'__v333');wrap('flightWorkspaceOpenList',async(_,args)=>{await syncDate(S(args?.[0])||opDate(),false)},'__v333');wrap('v324ReceiveOrOpen',async()=>{await syncDate(opDate(),true)},'__v333');wrap('v324ConfirmRosterHandover',async()=>{await syncDate(opDate(),true)},'__v333');wrap('v327Reassign',async()=>{await syncDate(opDate(),true)},'__v333');setTimeout(()=>syncDate(opDate(),false).catch(()=>{}),800);return true}
  install();setTimeout(install,350);setTimeout(install,1200);
})(typeof window!=='undefined'?window:globalThis);
/* ===== END task-status-engine-v333.js ===== */


/* ===== BEGIN strict-roster-sequence-v334.js ===== */
(function(root){
  root.__SAGS_V334_BUILD='V3.34-20260821-01';
})(typeof window!=='undefined'?window:globalThis);
/* ===== END strict-roster-sequence-v334.js ===== */


/* ===== BEGIN authoritative-roster-sync-v335.js ===== */
/* E-REPORT/SAGS V3.35 · AUTHORITATIVE DAILY ROSTER REPLACEMENT
 * The newest confirmed roster for an operational date is the only ACTIVE assignment set.
 * Stale authority is removed from mailbox, MY FLIGHT, sequence, claims and unit ownership.
 * Business form envelopes and historical/audit data are preserved.
 */
(function(root){'use strict';
  const BUILD='V3.35-20260821-01';
  const S=v=>String(v??'').trim(), U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const norm=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return U(v)}};
  const db=p=>{if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase RTDB chưa sẵn sàng.');return root.sagsV470Ref(p)};
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const opDate=()=>S(document.getElementById('drManageDate')?.value)||S(sessionStorage.getItem('sagsV36FwcDate'))||today();
  const activeItems=man=>Object.values(man?.items||{}).filter(x=>x&&x.active!==false&&!['ROSTER_REMOVED','ROSTER_REASSIGNED'].includes(U(x.rosterStatus)));
  const unitOf=item=>{const rk=U(item?.roleKey),src=U(item?.sourceColumn),fg=U(item?.formGroup);if(rk==='CBTT'||src.includes('GRND_LS')||fg==='FINAL')return 'CBTT';if(rk==='PAX09'||src.includes('PAX_SUPR')||fg==='FSAGS09')return 'PVHK';if(['COR','LD','BOTH'].includes(rk)||src.includes('GRND_COR')||src.includes('GRND_LD')||['FSAGS','FSAGS421','FSAGS551'].includes(fg))return 'DH';return ''};
  const sameFlight=(a,b)=>{const af=S(a?.flightId),bf=S(b?.flightId);if(af&&bf)return af===bf;const ar=U(a?.flightRaw||a?.flightName),br=U(b?.flightRaw||b?.flightName);return !!ar&&!!br&&ar===br};
  function iso(v){const x=S(v);let m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(x);if(m)return x;m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(x);if(m)return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;return ''}
  function sessionDate(st){const e=st?.envelope||{},q=e?.state||{},r=e?.rosterSeed||{};for(const x of [st?.opDate,st?.rosterOpDate,e?.rosterOpDate,q?.f421_date,q?.f551_date,q?.f09_date,q?.date,r?.f421_date,r?.f551_date,r?.f09_date,r?.date]){const d=iso(x);if(d)return d}return ''}
  function currentUsersForFlight(man,rec,unit){const out=[];for(const x of activeItems(man)){if(unitOf(x)!==unit||!sameFlight(x,rec))continue;const u=norm(x.user||x.targetUser);if(u&&!out.includes(u))out.push(u)}return out}
  async function readManifest(date){try{return (await db(`roster_manifests/${safe(date)}`).once('value')).val()||{}}catch(_){return {}}}
  function flightIdFor(date,item){let fid=S(item?.flightId);if(fid)return fid;try{if(typeof root.sagsFlightHubFlightId==='function')fid=S(root.sagsFlightHubFlightId(date,item?.arrFlight||'',item?.depFlight||'',item?.flightRaw||item?.flightName||''))}catch(_){}return fid}

  async function cleanup(date,oldMan,newMan,repair=false){
    const newItems=newMan?.items||{}, activeIds=new Set(Object.keys(newItems).filter(id=>newItems[id]&&newItems[id].active!==false));
    const [mailSnap,sessSnap,flightSnap]=await Promise.all([db('roster_mail').once('value').catch(()=>null),db('roster_sessions').once('value').catch(()=>null),db(`flight_records/${safe(date)}`).once('value').catch(()=>null)]);
    const allMail=mailSnap?.val?.()||{}, sessions=sessSnap?.val?.()||{}, flights=flightSnap?.val?.()||{};
    const stale=new Map();
    const add=(aid,item={})=>{aid=S(aid);if(!aid||activeIds.has(aid))return;stale.set(aid,{...(stale.get(aid)||{}),...item,assignmentId:aid})};
    for(const [aid,x] of Object.entries(oldMan?.items||{}))if(x&&!activeIds.has(aid))add(aid,x);
    for(const [aid,x] of Object.entries(newItems||{}))if(x&&(x.active===false||['ROSTER_REMOVED','ROSTER_REASSIGNED'].includes(U(x.rosterStatus))))add(aid,x);
    for(const [user,node] of Object.entries(allMail||{}))for(const [aid,x] of Object.entries(node?.items||{})){if(!x||S(x.opDate)!==date||activeIds.has(aid))continue;add(aid,{...x,user:norm(x.targetUser||user)})}
    for(const [fid,rec] of Object.entries(flights||{}))for(const [aid,x] of Object.entries(rec?.assignments||{}))if(!activeIds.has(aid))add(aid,{...x,flightId:S(rec?.flightId||fid),flightRaw:S(rec?.flightRaw),flightName:S(rec?.flightName)});
    for(const [key,st] of Object.entries(sessions||{})){const aid=S(st?.assignmentId||key);if(activeIds.has(aid))continue;if(stale.has(aid)||sessionDate(st)===date)add(aid,{ownerUser:norm(st?.ownerUser),sessionMatched:true})}

    const patch={},t=Date.now(),by=norm(root.currentUserProfile?.username||root.currentRole||'SYSTEM');
    for(const [aid,item] of stale){
      const oldUser=norm(item.user||item.targetUser||item.ownerUser||item.originalUser),fid=flightIdFor(date,item),unit=unitOf(item);
      // Latest roster is the only ACTIVE manifest. Remove stale/tombstone entries physically.
      patch[`roster_manifests/${safe(date)}/items/${safe(aid)}`]=null;
      // Remove every stale mailbox copy, not just the username stored in the old manifest.
      for(const [mailUser,node] of Object.entries(allMail||{})){if(node?.items?.[aid]&&S(node.items[aid]?.opDate)===date){patch[`roster_mail/${safe(mailUser)}/items/${safe(aid)}`]=null;patch[`roster_revocations/${safe(mailUser)}/items/${safe(aid)}`]={assignmentId:aid,reason:'ROSTER_REPLACED_BY_LATEST',atMs:t,by,opDate:date,sourceFile:S(newMan?.fileName)}}}
      if(oldUser)patch[`roster_revocations/${safe(oldUser)}/items/${safe(aid)}`]={assignmentId:aid,reason:'ROSTER_REPLACED_BY_LATEST',atMs:t,by,opDate:date,sourceFile:S(newMan?.fileName)};
      // Preserve envelope/draft and historical completion payload, but revoke ACTIVE authority.
      patch[`roster_sessions/${safe(aid)}/rosterActive`]=false;patch[`roster_sessions/${safe(aid)}/active`]=false;patch[`roster_sessions/${safe(aid)}/rosterStatus`]='ROSTER_REMOVED';patch[`roster_sessions/${safe(aid)}/rosterRemovedAtMs`]=t;patch[`roster_sessions/${safe(aid)}/rosterRemovedBy`]=by;patch[`roster_sessions/${safe(aid)}/rosterRemovedSourceFile`]=S(newMan?.fileName);patch[`roster_sessions/${safe(aid)}/handoverReady`]=false;patch[`roster_sessions/${safe(aid)}/workPartReady`]=false;patch[`roster_sessions/${safe(aid)}/taskAvailabilityV333`]='ROSTER_REMOVED';
      if(fid){patch[`flight_records/${safe(date)}/${safe(fid)}/assignments/${safe(aid)}`]=null;patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}`]=null;if(oldUser){patch[`flight_records/${safe(date)}/${safe(fid)}/taskClaims/${safe(oldUser)}/${safe(aid)}/status`]='ROSTER_REMOVED';patch[`flight_records/${safe(date)}/${safe(fid)}/taskClaims/${safe(oldUser)}/${safe(aid)}/taskStatus`]='ROSTER_REMOVED';patch[`flight_records/${safe(date)}/${safe(fid)}/taskClaims/${safe(oldUser)}/${safe(aid)}/rosterRemovedAtMs`]=t}const ev=`ROSTER_REPLACE_${t}_${safe(aid)}`;patch[`flight_records/${safe(date)}/${safe(fid)}/assignmentHistory/${safe(ev)}`]={eventId:ev,action:'ROSTER_ASSIGNMENT_REMOVED',assignmentId:aid,removedUser:oldUser,unit,atMs:t,by,sourceFile:S(newMan?.fileName)}}
    }
    // Current assignments are explicitly ACTIVE again if they existed historically.
    for(const [aid,item] of Object.entries(newItems)){if(!item||item.active===false)continue;patch[`roster_sessions/${safe(aid)}/rosterActive`]=true;patch[`roster_sessions/${safe(aid)}/active`]=true;patch[`roster_sessions/${safe(aid)}/rosterStatus`]='ACTIVE';patch[`roster_sessions/${safe(aid)}/rosterRemovedAtMs`]=null;patch[`roster_sessions/${safe(aid)}/rosterRemovedBy`]=null;patch[`roster_sessions/${safe(aid)}/rosterRemovedSourceFile`]=null}
    if(Object.keys(patch).length)await db('').update(patch);

    // Reconcile live unit owners against the newest manifest for every flight, including pre-V3.35 ghosts.
    let claims=0;const p2={};
    for(const [fid,rec] of Object.entries(flights||{})){for(const unit of ['DH','CBTT','PVHK']){const a=rec?.unitAssignments?.[unit],owner=norm(a?.username);if(!owner)continue;const allowed=currentUsersForFlight(newMan,{...rec,flightId:S(rec?.flightId||fid)},unit);if(allowed.includes(owner))continue;const ev=`ROSTER_OWNER_CLEAR_${t}_${safe(unit)}`;p2[`flight_records/${safe(date)}/${safe(fid)}/assignmentHistory/${safe(ev)}`]={eventId:ev,action:'INVALID_ROSTER_CLAIM_REMOVED',unit,removedUser:owner,rosterEligibleUsers:allowed,atMs:t,by:'SYSTEM_V3.35'};p2[`flight_records/${safe(date)}/${safe(fid)}/unitAssignments/${safe(unit)}`]=null;claims++}}
    if(Object.keys(p2).length)await db('').update(p2);
    root.__SAGS_V335_LAST={date,removed:stale.size,claims,repair,atMs:t};return {removed:stale.size,claims};
  }

  async function repairCurrent(date=opDate()){const man=await readManifest(date);if(!man?.publishedAtMs||!man?.items)return {removed:0,claims:0};return cleanup(date,{},man,true)}
  function install(){const fn=root.dailyRosterPublish;if(typeof fn!=='function'||fn.__v335)return false;const wrapped=async function(){const r=await fn.apply(this,arguments);if(r===true){const delta=root.__SAGS_ROSTER_LAST_DELTA||{};const dates=[...new Set([...Object.keys(delta.newManByDate||{}),...(delta.datesWithRemovals||[])].map(S).filter(Boolean))];let removed=0,claims=0;for(const date of dates){const oldMan=delta.oldManByDate?.[date]||{},newMan=delta.newManByDate?.[date]||await readManifest(date),c=await cleanup(date,oldMan,newMan,false);removed+=Number(c?.removed||0);claims+=Number(c?.claims||0)}if(dates.length)try{root.dailyRosterRestartMailbox?.()}catch(_){}const el=document.getElementById('drStatus');if(el&&removed)el.textContent+=`\nRoster mới đã thu hồi sạch ${removed} assignment cũ; dữ liệu E-FORM cũ được lưu lịch sử nhưng không còn ACTIVE.`;root.__SAGS_V335_LAST_DELTA_CLEANUP={dates,removed,claims,atMs:Date.now()}}return r};wrapped.__v335=1;root.dailyRosterPublish=wrapped;return true}
  install();setTimeout(install,350);setTimeout(install,1200);
  // V3.63: ghost repair không còn chạy trên mọi tài khoản/mọi lần mở app.
  // Chỉ AD chạy tối đa 1 lần/ngày trên thiết bị để tránh quét roster_mail + roster_sessions + flight_records lặp lại.
  setTimeout(()=>{try{const r=U(root.currentRole||root.currentUserProfile?.role),date=opDate(),mark=`sagsV335RepairDone:V1.1.80:${date}`;if(r!=='AD'||localStorage.getItem(mark)==='1')return;repairCurrent(date).then(c=>{try{localStorage.setItem(mark,'1')}catch(_){}if(c.removed||c.claims){try{root.dailyRosterRestartMailbox?.()}catch(_){}try{root.flightWorkspaceRefresh?.()}catch(_){}}}).catch(e=>console.info('V3.35 repair',e?.message||e))}catch(_){}},1800);
  root.sagsRosterAuthoritativeRepair=repairCurrent;
  root.__SAGS_V335_BUILD=BUILD;
})(typeof window!=='undefined'?window:globalThis);
/* ===== END authoritative-roster-sync-v335.js ===== */

/* ===== BEGIN manual-flight-v340.js ===== */
/* E-REPORT/SAGS V3.40 · SELF-SERVICE MANUAL FLIGHT
 * Every operational unit may create its own task when roster data is unavailable.
 * The creator always reuses an existing master Flight Record when either flight number matches.
 */
(function(root){'use strict';
  const phase=(document.currentScript&&document.currentScript.dataset&&document.currentScript.dataset.phase)||'';
  const BUILD='V3.42-20260821-01';
  if(phase!=='control'||root.__SAGS_V340_MANUAL_INSTALLED)return;
  root.__SAGS_V340_MANUAL_INSTALLED=BUILD;
  const S=v=>String(v??'').trim(),U=v=>S(v).toUpperCase(),safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normUser=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return U(v)}};
  const plain=v=>U(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D');
  const normFlight=v=>U(v).replace(/[^A-Z0-9]/g,'');
  const hash=v=>{let h=2166136261>>>0;for(const ch of String(v)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return h.toString(36).toUpperCase()};
  const canonicalFormGroup=v=>({FSAGS:'fsags',FSAGS421:'fsags421',FSAGS551:'fsags551',FSAGS09:'fsags09',FINAL:'final',UNIT_TASK:'unit_task'}[U(v)]||'');
  const UNITS={DH:'ĐH · ĐIỀU HÀNH',CBTT:'CBTT · CÂN BẰNG TRỌNG TẢI',PVHK:'PVHK · PHỤC VỤ HÀNH KHÁCH',HLNG:'HLNG · HÀNH LÝ NHÀ GA',CARGO:'KHO HÀNG · CARGO',VSTB:'VSTB · VỆ SINH TÀU BAY',VHTTB:'VHTTB · VẬN HÀNH TRANG THIẾT BỊ',KTTB:'KTTB · KỸ THUẬT THIẾT BỊ',LNF:'LNF · LOST & FOUND'};
  function session(){try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}}
  function profile(){return session().profile||root.currentUserProfile||{}}
  function role(){return U(session().role||profile().role)}
  function me(){return normUser(profile().username||(role()==='AD'?'AD':''))}
  function myName(){const p=profile();return S(p.name||p.fullName||p.displayName||p.username||me())}
  function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function db(path){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase RTDB chưa sẵn sàng.');return root.sagsV470Ref(path)}
  function unitForProfile(){
    const r=role(),direct={DH:'DH',FPL:'DH',CBTT:'CBTT',PVHK:'PVHK',KH:'CARGO',PVHLNG:'HLNG',PVHLSD:'HLNG',VSTB:'VSTB',VHTTB:'VHTTB',KTTB:'KTTB',LOSTFOUND:'LNF',LNF:'LNF'};
    if(direct[r])return direct[r];if(r==='AD')return '';
    const p=profile(),text=plain([p.role,p.roleCode,p.groupCode,p.departmentCode,p.systemDepartment,p.department,p.group,p.jobTitle].filter(Boolean).join(' '));
    const tests=[['CBTT',/(CBTT|CAN BANG TRONG TAI|LOAD CONTROL)/],['PVHK',/(PVHK|PHUC VU HANH KHACH)/],['HLNG',/(HLNG|PVHLNG|HANH LY NHA GA|PHUC VU HANH LY)/],['CARGO',/(KHO HANG|CARGO)/],['VSTB',/(VSTB|VE SINH TAU BAY)/],['VHTTB',/(VHTTB|VAN HANH TRANG THIET BI)/],['KTTB',/(KTTB|KY THUAT THIET BI)/],['LNF',/(LNF|LOST\s*&?\s*FOUND|LOST AND FOUND)/],['DH',/(^|\s)(DH|DIEU HANH|FPL)(\s|$)/]];
    for(const [k,re] of tests)if(re.test(text))return k;return '';
  }
  function formOptions(unit){
    if(unit==='CBTT')return (role()==='AD'||typeof root.v485Can!=='function'||root.v485Can('FINAL'))?[['final','FINAL / CROSSCHECK']]:[];
    if(unit==='PVHK')return (role()==='AD'||typeof root.v485Can!=='function'||root.v485Can('FSAGS09'))?[['fsags09','F/SAGS-CXR/09']]:[];
    if(unit==='DH'){
      const defs=[['fsags','F/SAGS 42.3','FSAGS423'],['fsags421','F/SAGS 42.1','FSAGS421'],['fsags551','F/SAGS 55.1','FSAGS551']];
      const out=defs.filter(x=>role()==='AD'||typeof root.v485Can!=='function'||root.v485Can(x[2])).map(x=>x.slice(0,2));
      return out;
    }
    return [['unit_task','CÔNG VIỆC ĐƠN VỊ']];
  }
  function itemUnit(item){const direct=U(item?.manualUnit);if(UNITS[direct])return direct;const fg=U(item?.formGroup),rk=U(item?.roleKey),src=U(item?.sourceColumn);if(fg==='FINAL'||rk==='CBTT'||src.includes('GRND_LS'))return 'CBTT';if(fg==='FSAGS09'||rk==='PAX09'||src.includes('PAX_SUPR'))return 'PVHK';if(['FSAGS','FSAGS421','FSAGS551'].includes(fg)||['COR','LD','BOTH'].includes(rk)||src.includes('GRND_COR')||src.includes('GRND_LD'))return 'DH';return ''}
  function timeValue(v){const s=U(v).replace(/\s+/g,'');if(!s)return '';if(!/^(?:[01]?\d|2[0-3]):?[0-5]\d\+?$/.test(s))throw new Error('Giờ phải theo HHMM hoặc HH:MM; có thể thêm dấu + cho ngày kế tiếp.');const plus=s.endsWith('+'),d=s.replace(/\D/g,'').padStart(4,'0');return d+(plus?'+':'')}
  function timeScore(v){const s=S(v),d=s.replace(/\D/g,'');if(d.length!==4)return 99999;return (s.includes('+')?1440:0)+Number(d.slice(0,2))*60+Number(d.slice(2))}
  function storedSort(v,fallback){const raw=S(v),n=raw===''?NaN:Number(raw);return Number.isFinite(n)?n:fallback}
  function manualTimeFields(rec,date){return {eta:S(rec?.eta),etd:S(rec?.etd),arrFlightDate:S(rec?.arrFlightDate||date),depFlightDate:S(rec?.depFlightDate||date),etaFlightDate:S(rec?.etaFlightDate||rec?.arrFlightDate||date),etdFlightDate:S(rec?.etdFlightDate||rec?.depFlightDate||date),staClock:S(rec?.staClock),stdClock:S(rec?.stdClock),etaClock:S(rec?.etaClock),etdClock:S(rec?.etdClock),staDayOffset:storedSort(rec?.staDayOffset,0),stdDayOffset:storedSort(rec?.stdDayOffset,0),etaDayOffset:storedSort(rec?.etaDayOffset,0),etdDayOffset:storedSort(rec?.etdDayOffset,0),staSortMinute:storedSort(rec?.staSortMinute,timeScore(rec?.sta)),stdSortMinute:storedSort(rec?.stdSortMinute,timeScore(rec?.std)),etaSortMinute:storedSort(rec?.etaSortMinute,999999),etdSortMinute:storedSort(rec?.etdSortMinute,999999)}}
  function displayDate(v){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(S(v));return m?`${m[3]}/${m[2]}/${m[1]}`:S(v)}
  function startPage(group){group=canonicalFormGroup(group);return group==='fsags421'?6:(group==='fsags551'?9:(group==='fsags09'?11:1))}
  function manualSeed(item,group){group=canonicalFormGroup(group);const date=displayDate(item?.opDate||item?.date),route=U(item?.route).split(/[-–—>/]+/).map(S).filter(Boolean),cxr=route.indexOf('CXR'),r1=S(item?.route1||(cxr>=0?route[cxr-1]:route[0])),r3=S(item?.route3||(cxr>=0?route[cxr+1]:route[route.length-1])),base={date,arr:S(item?.arrFlight),dep:S(item?.depFlight),sta:S(item?.sta),std:S(item?.std),reg:S(item?.acReg),type:S(item?.acType),r1,r3,bay:S(item?.bay)},out={};if(group==='fsags421')Object.assign(out,{f421_date:base.date,f421_fltBefore:base.arr,f421_fltAfter:base.dep,f421_sta:base.sta,f421_std:base.std,f421_regn:base.reg,f421_acType:base.type,f421_route1:base.r1,f421_route3:base.r3,f421_bayBefore:base.bay,f421_bayAfter:base.bay});else if(group==='fsags551')Object.assign(out,{f551_date:base.date,f551_fltBefore:base.arr,f551_fltAfter:base.dep,f551_sta:base.sta,f551_std:base.std,f551_regn:base.reg,f551_acType:base.type,f551_route1:base.r1,f551_route3:base.r3,f551_bay:base.bay});else if(group==='fsags09')Object.assign(out,{f09_date:base.date,f09_fltBefore:base.arr,f09_fltAfter:base.dep,f09_sta:base.sta,f09_std:base.std,f09_regn:base.reg,f09_acType:base.type,f09_route1:base.r1,f09_route3:base.r3,f09_parkingArr:base.bay,f09_parkingDep:base.bay});else Object.assign(out,{date:base.date,fltBefore:base.arr,fltAfter:base.dep,sta:base.sta,std:base.std,regn:base.reg,acType:base.type,route1:base.r1,route2:'CXR',route3:base.r3,bayBefore:base.bay,bayAfter:base.bay});for(const k of Object.keys(out))if(!S(out[k]))delete out[k];return out}
  async function ensureLocalSession(item){const group=canonicalFormGroup(item?.formGroup);if(!group||group==='final'||group==='unit_task')return null;if(typeof root.readFlightSessionList!=='function'||typeof root.writeFlightSessionList!=='function'||typeof root.flightSessionStorageKey!=='function')return null;const aid=S(item?.assignmentId);if(!aid)return null;const list=root.readFlightSessionList()||[];let meta=list.find(x=>S(x?.rosterAssignmentId)===aid)||null,id=S(meta?.id),now=Date.now();if(!id){id='roster-'+hash(aid);if(list.some(x=>S(x?.id)===id&&S(x?.rosterAssignmentId)!==aid))id+='-'+hash(S(item?.flightId)).slice(0,4);meta={id,name:S(item?.flightName||item?.flightRaw||[item?.arrFlight,item?.depFlight].filter(Boolean).join(' / ')||item?.flightId),customName:true,initialGroup:group,arrivalOp:'passenger',departureOp:'passenger',createdAt:now,updatedAt:now,rosterAssignmentId:aid,rosterFlightId:S(item?.flightId),rosterAutoReceived:true,rosterSourceColumn:S(item?.sourceColumn),rosterOpDate:S(item?.opDate),rosterOwner:me(),manualCreatedV340:true};list.push(meta)}else{meta.initialGroup=group;meta.rosterAssignmentId=aid;meta.rosterFlightId=S(item?.flightId||meta.rosterFlightId);meta.rosterAutoReceived=true;meta.rosterSourceColumn=S(item?.sourceColumn);meta.rosterOpDate=S(item?.opDate);meta.rosterOwner=me();meta.manualCreatedV340=true;meta.updatedAt=now}root.writeFlightSessionList(list);let env={};try{env=root.readFlightSessionEnvelope?.(id)||{}}catch(_){env={}}env.state=env.state&&typeof env.state==='object'?env.state:{};const seed=manualSeed(item,group),oldSeed=env.rosterSeed&&typeof env.rosterSeed==='object'?env.rosterSeed:{};for(const [k,v] of Object.entries(seed)){const cur=S(env.state[k]),old=S(oldSeed[k]);if(!cur||cur===old)env.state[k]=v}env.mainForm=group;env.activeFormGroup=group;env.currentPage=startPage(group);env.scrollY=0;env.arrivalOp=S(env.arrivalOp||'passenger');env.departureOp=S(env.departureOp||'passenger');env.rosterSeed=seed;env.rosterAssignmentId=aid;env.rosterFlightId=S(item?.flightId);env.rosterAutoReceived=true;env.rosterReceivedAtMs=Number(env.rosterReceivedAtMs||now);env.manualCreatedV340=true;localStorage.setItem(root.flightSessionStorageKey(id),JSON.stringify(env));return meta}
  root.sagsEnsureLocalSession=ensureLocalSession;
  root.sagsV340EnsureLocalSession=ensureLocalSession;
  function flightTokens(rec){const out=new Set();for(const v of [rec?.arrFlight,rec?.depFlight,rec?.flightRaw,rec?.flightName]){const raw=U(v);for(const m of raw.matchAll(/[A-Z0-9]{2,3}\s*\d{1,5}/g)){const x=normFlight(m[0]);if(x)out.add(x)}}return out}
  function matchesFlight(rec,wanted){const have=flightTokens(rec);return [...wanted].some(x=>have.has(x))}
  function field(id){return S(document.getElementById(id)?.value)}
  function ensureUi(){
    if(document.getElementById('v340ManualFlightModal'))return;
    const st=document.createElement('style');st.id='v340ManualFlightStyle';st.textContent=`
    #v340ManualFlightModal{position:fixed;inset:0;z-index:72050;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.58);padding:max(10px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left));box-sizing:border-box;font-family:Arial}#v340ManualFlightModal.show{display:flex}.v340Panel{width:min(96vw,720px);max-height:92dvh;overflow:auto;background:#fff;border-radius:16px;padding:14px;box-sizing:border-box;box-shadow:0 20px 60px rgba(0,0,0,.38)}.v340Head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.v340Head h3{margin:0;color:#174766}.v340Sub{margin-top:5px;color:#5d6e7b;font:700 12px/1.45 Arial}.v340Grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:12px}.v340Field{display:flex;flex-direction:column;gap:4px}.v340Field.wide{grid-column:1/-1}.v340Field label{font:900 11px Arial;color:#344f63}.v340Field input,.v340Field select{width:100%;box-sizing:border-box;border:1px solid #c5d2dc;border-radius:9px;padding:10px;background:#fff;font:800 14px Arial;color:#183f5e}.v340Field input:focus,.v340Field select:focus{outline:2px solid #79b6e5;border-color:#0b67b2}.v340Actions{display:flex;gap:8px;justify-content:flex-end;margin-top:13px}.v340Btn{border:0;border-radius:9px;padding:10px 13px;font:900 12px Arial;cursor:pointer;background:#0b67b2;color:#fff}.v340Btn.gray{background:#e9eef3;color:#334b5f}.v340Btn.green{background:#15803d}.v340Btn:disabled{opacity:.5}.v340Note{margin-top:10px;padding:9px;border-radius:9px;background:#eef7ff;color:#315169;font:700 11px/1.45 Arial}.v340CreateFlightBtn{background:#15803d!important;color:#fff!important}@media(max-width:620px){.v340Grid{grid-template-columns:1fr}.v340Field.wide{grid-column:1}.v340Actions{display:grid;grid-template-columns:1fr 1fr}.v340Btn{min-height:42px}}
    `;document.head.appendChild(st);
    const m=document.createElement('div');m.id='v340ManualFlightModal';m.innerHTML=`<div class="v340Panel"><div class="v340Head"><div><h3>＋ TẠO CHUYẾN THỦ CÔNG</h3></div><button class="v340Btn gray" onclick="sagsV340CloseManualFlight()">ĐÓNG</button></div><div class="v340Grid"><div class="v340Field"><label>NGÀY KHAI THÁC *</label><input id="v340Date" type="date"></div><div class="v340Field"><label>ĐƠN VỊ *</label><select id="v340Unit" onchange="sagsV340ManualUnitChanged()"></select></div><div class="v340Field"><label>FLIGHT ĐẾN</label><input id="v340Arr" autocomplete="off" placeholder="VD: VJ839"></div><div class="v340Field"><label>FLIGHT ĐI</label><input id="v340Dep" autocomplete="off" placeholder="VD: VJ838"></div><div class="v340Field"><label>STA</label><input id="v340Sta" inputmode="numeric" placeholder="HHMM hoặc HHMM+"></div><div class="v340Field"><label>STD</label><input id="v340Std" inputmode="numeric" placeholder="HHMM hoặc HHMM+"></div><div class="v340Field"><label>A/C REG</label><input id="v340Reg" autocomplete="off" placeholder="VD: VN-A123"></div><div class="v340Field"><label>A/C TYPE</label><input id="v340Type" autocomplete="off" placeholder="VD: A321 / A330"></div><div class="v340Field wide"><label>ROUTE</label><input id="v340Route" autocomplete="off" placeholder="VD: HAN-CXR-SGN"></div><div class="v340Field"><label>BAY</label><input id="v340Bay" autocomplete="off"></div><div class="v340Field"><label>NGHIỆP VỤ CỦA TÔI *</label><select id="v340Form"></select></div></div><div class="v340Actions"><button class="v340Btn gray" onclick="sagsV340CloseManualFlight()">HỦY</button><button id="v340CreateBtn" class="v340Btn green" onclick="sagsV340CreateManualFlight()">✓ TẠO CHUYẾN</button></div></div>`;document.body.appendChild(m);
  }
  root.sagsV340ManualUnitChanged=function(){const unit=U(document.getElementById('v340Unit')?.value),sel=document.getElementById('v340Form'),opts=formOptions(unit);if(sel)sel.innerHTML=opts.length?opts.map(([v,l])=>`<option value="${esc(v)}">${esc(l)}</option>`).join(''):'<option value="">CHƯA ĐƯỢC CẤP QUYỀN NGHIỆP VỤ</option>'};
  root.sagsV340OpenManualFlight=function(){
    ensureUi();const mine=unitForProfile();if(role()!=='AD'&&!mine)return alert('Tài khoản chưa xác định được đơn vị từ hồ sơ. AD cần kiểm tra Department/Group/Role trước khi tạo chuyến.');
    const unit=document.getElementById('v340Unit');unit.innerHTML=Object.entries(UNITS).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join('');unit.value=mine||'DH';unit.disabled=role()!=='AD';root.sagsV340ManualUnitChanged();document.getElementById('v340Date').value=S(document.getElementById('fwcDate')?.value)||S(sessionStorage.getItem('sagsV36FwcDate'))||today();for(const id of ['v340Arr','v340Dep','v340Sta','v340Std','v340Reg','v340Type','v340Route','v340Bay'])document.getElementById(id).value='';document.getElementById('v340ManualFlightModal').classList.add('show');setTimeout(()=>document.getElementById('v340Dep')?.focus(),60);
  };
  root.sagsV340CloseManualFlight=()=>document.getElementById('v340ManualFlightModal')?.classList.remove('show');
  root.sagsV340CreateManualFlight=async function(){
    const btn=document.getElementById('v340CreateBtn');if(btn)btn.disabled=true;
    try{
      const date=field('v340Date'),unit=U(field('v340Unit')),formGroup=canonicalFormGroup(field('v340Form')),arr=normFlight(field('v340Arr')),dep=normFlight(field('v340Dep')),sta=timeValue(field('v340Sta')),std=timeValue(field('v340Std')),acReg=U(field('v340Reg')),acType=U(field('v340Type')),route=U(field('v340Route')),bay=U(field('v340Bay')),user=me();
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('Chưa chọn ngày khai thác hợp lệ.');if(!UNITS[unit])throw new Error('Chưa xác định đúng đơn vị.');if(role()!=='AD'&&unit!==unitForProfile())throw new Error('Tài khoản chỉ được tự tạo công việc cho đúng đơn vị của mình.');if(!user)throw new Error('Không xác định được tài khoản đang đăng nhập.');if(!arr&&!dep)throw new Error('Cần nhập ít nhất Flight đến hoặc Flight đi.');const validFlight=x=>!x||(/^(?=[A-Z0-9]*[A-Z])[A-Z0-9]{2,3}\d{1,5}$/.test(x));if(!validFlight(arr)||!validFlight(dep))throw new Error('Flight phải gồm mã hãng và số chuyến, ví dụ VJ838 hoặc 9G123.');if(!formOptions(unit).some(x=>x[0]===formGroup))throw new Error('Nghiệp vụ không thuộc quyền/đơn vị của tài khoản.');
      const wanted=new Set([arr,dep].filter(Boolean)),flightRaw=[arr,dep].filter((x,i,a)=>x&&a.indexOf(x)===i).join(' / '),flightName=flightRaw;
      const [fs,ms]=await Promise.all([db(`flight_records/${safe(date)}`).once('value'),db(`roster_manifests/${safe(date)}`).once('value')]),flights=fs.val()||{},man=ms.val()||{};
      const hits=Object.entries(flights).filter(([,rec])=>rec&&matchesFlight(rec,wanted));if(hits.length>1)throw new Error('Flight đến/đi đang thuộc nhiều hồ sơ khác nhau. Hãy mở danh sách chuyến và kiểm tra trước khi tạo.');
      let fid='',rec=null,reusedFlight=false;if(hits.length){fid=S(hits[0][1]?.flightId||hits[0][0]);rec=hits[0][1]||{};reusedFlight=true}else{fid=typeof root.sagsFlightHubFlightId==='function'?S(root.sagsFlightHubFlightId(date,arr,dep,flightRaw)):`FLT_${hash(date+'|'+flightRaw)}`;rec=flights[fid]||{}}
      if(!fid)throw new Error('Không tạo được mã Flight Record.');
      const owner=rec?.unitAssignments?.[unit]||{},ownerUser=normUser(owner.username);if(ownerUser&&ownerUser!==user)throw new Error(`${UNITS[unit]} đã có người phụ trách ${S(owner.name||owner.username)}. Hãy dùng quy trình bàn giao/đổi người.`);
      const activeItems=Object.values(man?.items||{}).filter(x=>x&&x.active!==false),sameUnit=activeItems.filter(x=>(S(x.flightId)||S(root.sagsV346ResolveRosterFlightId?.(date,x,flights)))===fid&&itemUnit(x)===unit),other=sameUnit.find(x=>normUser(x.user||x.targetUser)!==user);if(other)throw new Error(`Chuyến đã được phân ${UNITS[unit]} cho ${normUser(other.user||other.targetUser)}. Không được tạo tay để vượt phân công hiện có.`);
      const existing=sameUnit.find(x=>normUser(x.user||x.targetUser)===user),createdAssignment=!existing,aid=S(existing?.assignmentId)||`MA40_${hash([date,fid,unit,user,formGroup].join('|'))}`;
      const routeParts=route.split(/[^A-Z0-9]+/).filter(Boolean),now=Date.now(),p=profile(),sourceColumn=`MANUAL_${unit}`,roleKey=`MANUAL_${unit}`;
      const itemBase=existing||{assignmentId:aid,user,originalUser:user,targetUser:user,flightId:fid,opDate:date,date:displayDate(date),flightRaw,flightName,arrFlight:arr,depFlight:dep,sta,std,acReg,acType,route,route1:routeParts[0]||'',route3:routeParts[routeParts.length-1]||'',bay,formGroup,sourceColumn,roleKey,workPartOrder:1,workPartTotal:1,workPartSequenceSource:sourceColumn,assignmentScope:'MANUAL_SELF',manualUnit:unit,manualCreatedV340:true,manualCreatedAtMs:now,manualCreatedBy:user,active:true},item={...itemBase,...manualTimeFields(itemBase,date)};
      const payload={...item,formGroup:canonicalFormGroup(item.formGroup)||formGroup,engine:'DAILY_ROSTER_V1',schema:2,targetUser:user,originalTargetUser:user,sourceFile:'MANUAL_V340',publishedAtMs:now,publishedBy:user,manualCreatedV340:true,active:true};
      const patch={},base=`flight_records/${safe(date)}/${safe(fid)}`;
      if(!rec?.flightId){Object.assign(patch,{[`${base}/flightId`]:fid,[`${base}/opDate`]:date,[`${base}/flightRaw`]:flightRaw,[`${base}/flightName`]:flightName,[`${base}/arrFlight`]:arr,[`${base}/depFlight`]:dep,[`${base}/sta`]:sta,[`${base}/std`]:std,[`${base}/eta`]:'',[`${base}/etd`]:'',[`${base}/arrFlightDate`]:date,[`${base}/depFlightDate`]:date,[`${base}/etaFlightDate`]:date,[`${base}/etdFlightDate`]:date,[`${base}/staDayOffset`]:0,[`${base}/stdDayOffset`]:0,[`${base}/etaDayOffset`]:0,[`${base}/etdDayOffset`]:0,[`${base}/staSortMinute`]:timeScore(sta),[`${base}/stdSortMinute`]:timeScore(std),[`${base}/etaSortMinute`]:999999,[`${base}/etdSortMinute`]:999999,[`${base}/acReg`]:acReg,[`${base}/acType`]:acType,[`${base}/route`]:route,[`${base}/bay`]:bay,[`${base}/createdFrom`]:'MANUAL_V340',[`${base}/createdAtMs`]:now})}
      else for(const [k,v] of Object.entries({arrFlight:arr,depFlight:dep,flightRaw,flightName,sta,std,acReg,acType,route,bay}))if(S(v)&&!S(rec?.[k]))patch[`${base}/${k}`]=v;
      patch[`${base}/updatedAtMs`]=now;patch[`${base}/manualActive`]=true;patch[`${base}/rosterActive`]=true;patch[`${base}/rosterStatus`]='ACTIVE';patch[`${base}/unitAssignments/${safe(unit)}`]=ownerUser?owner:{unit,username:user,name:myName(),departmentCode:S(p.departmentCode||p.systemDepartment||p.department),groupCode:S(p.groupCode||p.group),claimedAtMs:now,updatedAtMs:now,status:'ACTIVE',claimSource:'MANUAL_SELF_CREATE',manualCreatedV340:true};
      if(createdAssignment){patch[`roster_manifests/${safe(date)}/items/${safe(aid)}`]=item;patch[`roster_mail/${safe(user)}/items/${safe(aid)}`]=payload;patch[`roster_revocations/${safe(user)}/items/${safe(aid)}`]=null;patch[`roster_sessions/${safe(aid)}`]={engine:'daily-roster-v2',schema:1,assignmentId:aid,ownerUser:user,formGroup,claimStatus:'READY',taskStatusV333:'UNCLAIMED',taskAvailabilityV333:'READY',rosterActive:true,rosterStatus:'ACTIVE',manualCreatedV340:true,active:true,createdAtMs:now,updatedAtMs:now};patch[`${base}/assignments/${safe(aid)}`]={assignmentId:aid,user,originalUser:user,formGroup,sourceColumn,roleKey,assignmentScope:'MANUAL_SELF',workPartOrder:1,workPartTotal:1,workPartSequenceSource:sourceColumn,manualUnit:unit,manualCreatedV340:true,active:true};patch[`${base}/taskStatus/${safe(aid)}`]={schema:1,engine:'TASK_STATUS_V333',assignmentId:aid,flightId:fid,opDate:date,flightName,ownerUser:user,sourceColumn,roleKey,formGroup,assignmentScope:'MANUAL_SELF',workPartOrder:1,workPartTotal:1,status:'UNCLAIMED',statusLabel:'CHƯA NHẬN',availability:'READY',updatedAtMs:now}}
      if(!man?.opDate){patch[`roster_manifests/${safe(date)}/engine`]='daily-roster-v2';patch[`roster_manifests/${safe(date)}/schema`]=2;patch[`roster_manifests/${safe(date)}/opDate`]=date}patch[`roster_manifests/${safe(date)}/manualUpdatedAtMs`]=now;patch[`roster_manifests/${safe(date)}/manualUpdatedBy`]=user;
      const ev=`MANUAL_CREATE_${now}_${safe(aid)}`;patch[`${base}/assignmentHistory/${safe(ev)}`]={eventId:ev,action:createdAssignment?'MANUAL_ASSIGNMENT_CREATED':'MANUAL_ASSIGNMENT_REUSED',assignmentId:aid,unit,user,formGroup,reusedFlight,atMs:now,by:user,build:BUILD};
      await db('').update(patch);try{await ensureLocalSession({...item,...payload})}catch(e){console.info('V3.41 manual local session',e?.message||e)}try{root.dailyRosterRestartMailbox?.()}catch(_){}if(U(item.formGroup)==='FINAL'&&typeof root.sagsV340EnsureFinalForRoster==='function')await root.sagsV340EnsureFinalForRoster({...payload,...item},{open:false});try{await root.sagsTaskStatusSyncDate?.(date,true)}catch(_){}
      root.sagsV340CloseManualFlight();if(document.getElementById('fwcModal')?.classList.contains('show'))await root.flightWorkspaceRefresh?.();alert(`${createdAssignment?'✓ ĐÃ TẠO CÔNG VIỆC THỦ CÔNG':'✓ ĐÃ DÙNG LẠI PHÂN CÔNG HIỆN CÓ'}\n\n${flightName} · ${UNITS[unit]}\n${reusedFlight?'Dùng chung Flight Record đã có.':'Đã tạo một Flight Record mới.'}\nKhông tạo chuyến trùng. Bấm CHUYẾN khi muốn mở danh sách.`);
    }catch(e){alert('Không tạo được chuyến thủ công: '+S(e?.message||e))}finally{if(btn)btn.disabled=false}
  };
  async function repairMyManualAssignments(){
    const user=me();if(!user)return 0;let raw={};try{raw=(await db(`roster_mail/${safe(user)}/items`).once('value')).val()||{}}catch(_){return 0}const patch={};let repaired=0;
    for(const [key,rec0] of Object.entries(raw)){if(!rec0||rec0.manualCreatedV340!==true)continue;const rec={...rec0,assignmentId:S(rec0.assignmentId||key)},group=canonicalFormGroup(rec.formGroup);if(!group)continue;const date=S(rec.opDate),aid=S(rec.assignmentId),timeFixed=manualTimeFields(rec,date),fixed={...rec,...timeFixed,formGroup:group,engine:'DAILY_ROSTER_V1',date:displayDate(rec.date||date)};if(S(rec.engine)!=='DAILY_ROSTER_V1')patch[`roster_mail/${safe(user)}/items/${safe(key)}/engine`]='DAILY_ROSTER_V1';if(S(rec.formGroup)!==group)patch[`roster_mail/${safe(user)}/items/${safe(key)}/formGroup`]=group;for(const [fieldName,value] of Object.entries(timeFixed))patch[`roster_mail/${safe(user)}/items/${safe(key)}/${fieldName}`]=value;if(date&&aid){patch[`roster_manifests/${safe(date)}/items/${safe(aid)}/formGroup`]=group;for(const [fieldName,value] of Object.entries(timeFixed))patch[`roster_manifests/${safe(date)}/items/${safe(aid)}/${fieldName}`]=value;patch[`roster_sessions/${safe(aid)}/formGroup`]=group;if(rec.flightId){patch[`flight_records/${safe(date)}/${safe(rec.flightId)}/assignments/${safe(aid)}/formGroup`]=group;patch[`flight_records/${safe(date)}/${safe(rec.flightId)}/taskStatus/${safe(aid)}/formGroup`]=group;for(const fieldName of ['eta','etd','etaFlightDate','etdFlightDate','etaClock','etdClock','etaDayOffset','etdDayOffset','etaSortMinute','etdSortMinute'])patch[`flight_records/${safe(date)}/${safe(rec.flightId)}/${fieldName}`]=timeFixed[fieldName]}}try{await ensureLocalSession(fixed)}catch(e){console.info('V3.41 repair local session',e?.message||e)}repaired++}
    if(Object.keys(patch).length)try{await db('').update(patch)}catch(e){console.info('V3.41 repair manual mailbox',e?.message||e)}if(repaired)try{root.dailyRosterRestartMailbox?.()}catch(_){}return repaired;
  }
  root.sagsV340EnsureLocalSession=ensureLocalSession;
  root.sagsV341RepairManualAssignments=repairMyManualAssignments;
  function injectButton(){const tools=document.querySelector('#fwcBody .fwcTools');if(!tools||document.getElementById('v340CreateFlightBtn'))return;const can=role()==='AD'||!!unitForProfile();if(!can)return;const b=document.createElement('button');b.id='v340CreateFlightBtn';b.className='fwcBtn v340CreateFlightBtn';b.textContent='＋ TẠO CHUYẾN THỦ CÔNG';b.onclick=()=>root.sagsV340OpenManualFlight();tools.appendChild(b)}
  function install(){ensureUi();const fn=root.flightWorkspaceOpenList;if(typeof fn==='function'&&!fn.__v340){const w=function(){const r=fn.apply(this,arguments);Promise.resolve(r).finally(()=>{setTimeout(injectButton,40);setTimeout(injectButton,420)});return r};w.__v340=true;w.__v340Base=fn;root.flightWorkspaceOpenList=w;try{flightWorkspaceOpenList=w}catch(_){}}setTimeout(injectButton,80)}
  install();setTimeout(install,400);setTimeout(install,1300);setTimeout(()=>repairMyManualAssignments().catch(e=>console.info('V3.41 manual repair',e?.message||e)),500);
  root.__SAGS_V340_MANUAL_TEST__={normFlight,flightTokens,matchesFlight,itemUnit,timeValue,timeScore,unitForProfile,canonicalFormGroup,displayDate,manualSeed,startPage};
})(typeof window!=='undefined'?window:globalThis);
/* ===== END manual-flight-v340.js ===== */

/* V3.51 · COMPACT MOBILE TOOLBAR */
(function(root){const phase=document.currentScript?.dataset?.phase||'';if(phase!=='control')return;root.__SAGS_V351_BUILD='V3.51-20260822-01';})(typeof window!=='undefined'?window:globalThis);

/* V3.53 · DAILY ROSTER UPDATE PATH FIX */
(function(root){const phase=document.currentScript?.dataset?.phase||'';if(phase!=='control')return;root.__SAGS_V353_BUILD='V3.53-20260822-01';})(typeof window!=='undefined'?window:globalThis);


/* ===== V3.93 BUNDLE PHASE postcontrol ===== */
if((document.currentScript?.dataset?.phase||'')==='postcontrol'){
/* ===== BUNDLED action-center-v342.js · V3.93 ===== */
/* E-REPORT/SAGS V3.52 · Firebase-efficient unified document center
 * One persistent place for unfinished approvals, handoffs, crosscheck, R&S and manual-flight recovery.
 * Realtime refresh is event-driven. SLA clocks are display-only and never write heartbeats.
 */
(function(root){
"use strict";
if(root.__SAGS_V342_ACTION_CENTER_LOADED)return;
root.__SAGS_V342_ACTION_CENTER_LOADED=true;

const BUILD="V3.52-20260822-01";
// Reset requested on 22/08/2026: old work rows remain in the flight dossier,
// but they must never return to CẦN XỬ LÝ, its badge or reminder clocks.
const ACTION_RESET_AT_MS=1787361345000;
const ACTION_RESET_LABEL="08:15 22/08/2026";
const S=v=>String(v??"").trim();
const U=v=>S(v).toUpperCase();
const esc=v=>S(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safe=v=>S(v).replace(/[^A-Za-z0-9_-]/g,"_");
const norm=v=>{try{return typeof root.normalizePersonalUsername==="function"?root.normalizePersonalUsername(v):S(v).toLowerCase()}catch(_){return S(v).toLowerCase()}};
const now=()=>Date.now();
const profile=()=>{try{return typeof currentUserProfile!=="undefined"?currentUserProfile:(root.currentUserProfile||null)}catch(_){return root.currentUserProfile||null}};
const role=()=>{try{return U((typeof currentRole!=="undefined"?currentRole:root.currentRole)||profile()?.role||"")}catch(_){return ""}};
const me=()=>{try{return norm(profile()?.username||(role()==="AD"?"AD":""))}catch(_){return ""}};
const handoverCollection=()=>{try{return typeof HANDOVER_COLLECTION!=="undefined"?HANDOVER_COLLECTION:"sags_handovers"}catch(_){return "sags_handovers"}};
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};
const dbref=p=>{if(typeof root.sagsV470Ref!=="function")throw new Error("RTDB chưa sẵn sàng.");return root.sagsV470Ref(p)};
const state={user:"",tab:"all",items:[],sources:{approval:[],cross:[],rs:[],manual:[]},loadedAt:{},pendingSources:new Set(),pendingAll:false,errors:[],loading:false,connected:null,lastRefresh:0,refreshTimer:0,unsubs:[]};
const SOURCE_TTL_MS=45*1000;

function cacheKey(){return "sags_v352_action_cache_"+safe(me()||"anonymous")}
function clearLegacyCache(){try{localStorage.removeItem("sags_v342_action_cache_"+safe(me()||"anonymous"))}catch(_){}}
function itemAtMs(x){return Number(x?.createdAtMs||x?.eventAtMs||x?.updatedAtMs||0)}
function afterReset(x){return itemAtMs(x)>=ACTION_RESET_AT_MS}
function loadCache(){try{const x=JSON.parse(localStorage.getItem(cacheKey())||"{}"),saved=Number(x.savedAtMs||0);state.items=(Array.isArray(x.items)?x.items:[]).filter(v=>v.source!=="CLOSEOUT"&&afterReset(v));state.lastRefresh=saved;state.sources.approval=state.items.filter(v=>v.source==="APPROVAL");state.sources.handoff=state.items.filter(v=>v.source==="HANDOFF");state.sources.cross=state.items.filter(v=>v.source==="CROSS");state.sources.rs=state.items.filter(v=>v.source==="RS");state.sources.manual=state.items.filter(v=>v.source==="MANUAL");for(const key of Object.keys(state.sources))state.loadedAt[key]=saved}catch(_){state.items=[]}}
function saveCache(){try{localStorage.setItem(cacheKey(),JSON.stringify({savedAtMs:state.lastRefresh||now(),items:state.items.slice(0,120)}))}catch(_){}}
function localSessionCount(){try{return Array.isArray(root.readFlightSessionList?.())?root.readFlightSessionList().length:0}catch(_){return 0}}

function ensureUi(){
  if(!document.getElementById("v342Style")){
    const st=document.createElement("style");st.id="v342Style";st.textContent=`
      #roleBtnActionCenter{position:relative!important;order:-120!important;flex:0 0 auto!important;background:#b42318!important;color:#fff!important;border-color:#b42318!important}
      body.v38-clean-workflow #v38CleanNav #roleBtnActionCenter{background:#b42318!important;color:#fff!important;border-color:#8f1d15!important;order:-120!important}
      #v342Badge{position:absolute;right:3px;top:2px;min-width:19px;height:19px;border-radius:999px;background:#fff;color:#b42318;border:2px solid #b42318;font:900 10px/15px Arial;text-align:center;padding:0 3px;box-sizing:border-box}
      body.v342ActionReady #roleBtnApprovalQueue{display:none!important}
      #v342Modal{position:fixed;inset:0;z-index:31020;display:none;align-items:center;justify-content:center;background:rgba(4,18,31,.76);padding:10px;box-sizing:border-box;font-family:Arial,sans-serif}#v342Modal.show{display:flex}
      .v342Panel{width:min(98vw,920px);max-height:95dvh;overflow:auto;background:#f7f9fb;border-radius:18px;box-shadow:0 24px 64px rgba(0,0,0,.48);color:#17324a}
      .v342Head{position:sticky;top:0;z-index:2;display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:13px 14px;background:#17324a;color:#fff;border-radius:18px 18px 0 0}.v342Title{font:900 20px/1.2 Arial}.v342Sub{margin-top:4px;color:#d6e4ef;font:700 11px/1.35 Arial}.v342Close{border:0;border-radius:9px;background:#fff;color:#17324a;padding:8px 11px;font-weight:900}
      .v342Sync{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin:10px 12px 0;padding:9px 10px;border-radius:10px;background:#e9f7ee;color:#17643a;font:800 12px/1.35 Arial}.v342Sync.offline{background:#fff0f0;color:#9b1c1c}.v342Sync.connecting{background:#fff7df;color:#795500}.v342Sync button{border:0;border-radius:8px;padding:7px 9px;background:#17324a;color:#fff;font-weight:900}
      .v342Summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:9px 12px}.v342Metric{background:#fff;border:1px solid #dbe4ec;border-radius:10px;padding:8px;text-align:center}.v342Metric b{display:block;color:#0b5a96;font-size:20px}.v342Metric span{font:800 10px Arial;color:#63788a}
      .v342Tabs{display:flex;gap:6px;overflow:auto;padding:0 12px 9px;scrollbar-width:none}.v342Tabs::-webkit-scrollbar{display:none}.v342Tab{flex:0 0 auto;border:1px solid #c9d7e1;border-radius:999px;background:#fff;color:#29485f;padding:7px 10px;font:900 11px Arial}.v342Tab.on{background:#0b67b2;border-color:#0b67b2;color:#fff}.v342Tab .n{display:inline-flex;min-width:18px;justify-content:center;margin-left:3px;border-radius:999px;background:#e8eef4;color:#29485f;padding:1px 5px}.v342Tab.on .n{background:#fff;color:#0b67b2}
      .v342Status{margin:0 12px 8px;color:#607486;font:700 11px/1.4 Arial}.v342List{display:grid;gap:8px;padding:0 12px 14px}.v342Card{background:#fff;border:1px solid #d7e2eb;border-left:5px solid #0b67b2;border-radius:12px;padding:10px}.v342Card.approval{border-left-color:#b42318}.v342Card.returned{border-left-color:#c2410c}.v342Card.waiting{border-left-color:#64748b}.v342Card.overdue{border-color:#f04438;border-left-color:#b42318;background:#fff7f6}.v342Top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.v342CardTitle{font:900 15px/1.3 Arial;color:#173e61}.v342Pill{flex:0 0 auto;border-radius:999px;padding:4px 7px;background:#eef5fb;color:#205477;font:900 9px Arial}.v342Pill.red{background:#fee4e2;color:#b42318}.v342Flight{margin-top:4px;color:#0b67b2;font:900 13px/1.35 Arial}.v342Meta{margin-top:6px;color:#617486;font:700 11px/1.45 Arial}.v342Reason{margin-top:6px;padding:7px 8px;border-radius:8px;background:#fff4e5;color:#7a2e0e;font:800 11px/1.4 Arial}.v342Actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.v342Btn{border:0;border-radius:9px;min-height:38px;padding:8px 10px;font:900 11px Arial}.v342Primary{background:#0b67b2;color:#fff}.v342Danger{background:#b42318;color:#fff}.v342Secondary{background:#e8eef4;color:#29445b}.v342Empty{padding:22px;text-align:center;background:#fff;border:1px dashed #cbd8e2;border-radius:12px;color:#65798b;font:800 13px/1.5 Arial}.v342Help{margin:0 12px 14px;padding:9px 10px;border-radius:10px;background:#eef5fb;color:#456176;font:700 11px/1.45 Arial}
      @media(max-width:620px){.v342Panel{width:100%;max-height:96dvh}.v342Summary{grid-template-columns:repeat(2,minmax(0,1fr))}.v342Head{padding-top:max(13px,env(safe-area-inset-top))}.v342Actions .v342Btn{flex:1 1 135px}}
    `;document.head.appendChild(st);
  }
  if(!document.getElementById("v342Modal")){
    const m=document.createElement("div");m.id="v342Modal";m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.innerHTML=`<div class="v342Panel"><div class="v342Head"><div><div class="v342Title">🔔 CẦN XỬ LÝ</div></div><button class="v342Close" onclick="sagsV342Close()">ĐÓNG</button></div><div id="v342Sync" class="v342Sync"><span id="v342SyncText">Đang kiểm tra kết nối…</span><button onclick="sagsV342RetrySync()">THỬ ĐỒNG BỘ LẠI</button></div><div id="v342Summary" class="v342Summary"></div><div id="v342Tabs" class="v342Tabs"></div><div id="v342Status" class="v342Status"></div><div id="v342List" class="v342List"></div><div class="v342Help">CẦN XỬ LÝ đã bắt đầu lại từ <b>${ACTION_RESET_LABEL}</b>. Hồ sơ cũ không bị xóa và vẫn xem tại <b>CHUYẾN → FLIGHT WORKSPACE → 📁 HỒ SƠ</b>.</div></div>`;document.body.appendChild(m);m.addEventListener("click",e=>{if(e.target===m)root.sagsV342Close()});
  }
  ensureButton();document.body.classList.add("v342ActionReady");
}

function ensureButton(){const b=document.getElementById("roleBtnActionCenter");if(b)try{b.remove()}catch(_){b.style.display="none"}return null}
function watchToolbar(){try{state.navObserver?.disconnect?.()}catch(_){}state.navObserver=null;state.navObserved=null;ensureButton()}

function activeItem(x){return ["mine","approval","returned"].includes(x.bucket)}
function overdue(x){return activeItem(x)&&Number(x.dueAtMs||0)>0&&Number(x.dueAtMs)<=now()}
function tabItems(){const a=state.items;if(state.tab==="all")return a.filter(activeItem);if(state.tab==="overdue")return a.filter(overdue);return a.filter(x=>x.bucket===state.tab)}
function ageLabel(ms){ms=Number(ms||0);if(!ms)return "";const d=Math.max(0,now()-ms),m=Math.floor(d/60000);if(m<1)return "Vừa cập nhật";if(m<60)return `Chờ ${m} phút`;const h=Math.floor(m/60);if(h<48)return `Chờ ${h} giờ ${m%60} phút`;return `Chờ ${Math.floor(h/24)} ngày`}
function dueLabel(x){const d=Number(x.dueAtMs||0);if(!d)return "";const left=d-now();if(left<=0)return "⚠ QUÁ MỐC NHẮC";const m=Math.ceil(left/60000);return m<60?`Còn ${m} phút tới mốc nhắc`:`Còn ${Math.ceil(m/60)} giờ tới mốc nhắc`}
function statusLabel(x){const m={PENDING:"CHỜ DUYỆT",CLAIMED:"ĐANG KIỂM TRA",RETURNED:"BỊ TRẢ LẠI",APPROVED_SENT:"ĐÃ DUYỆT",PENDING_APPROVAL:"CHỜ DUYỆT",APPROVED_WAITING_ACCEPT:"CHỜ TIẾP NHẬN",COMPLETED:"HOÀN TẤT",RECEIVED:"ĐÃ NHẬN",REJECTED:"TỪ CHỐI",WAIT_DH_START:"CHỜ ĐH",DH_CHECKING:"ĐH ĐANG CHECK",WAIT_CBTT_START:"CHỜ CBTT",CBTT_CHECKING:"CBTT ĐANG CHECK",DH_RECORD_ERROR:"CHECK LẠI",FINAL_CONTENT_ERROR:"FINAL CẦN UPDATE",SUPERSEDED:"ĐÃ THAY THẾ"};return m[U(x.status)]||S(x.status||x.bucket).replaceAll("_"," ")}
function counts(){return {action:state.items.filter(activeItem).length,approval:state.items.filter(x=>x.bucket==="approval").length,waiting:state.items.filter(x=>x.bucket==="waiting").length,overdue:state.items.filter(overdue).length}}
function updateBadge(){ensureButton();const b=document.getElementById("v342Badge"),n=counts().action;if(!b)return;b.textContent=n>99?"99+":String(n);b.style.display=n?"inline-block":"none"}
function renderSync(){const box=document.getElementById("v342Sync"),text=document.getElementById("v342SyncText");if(!box||!text)return;box.className="v342Sync";if(navigator.onLine===false){box.classList.add("offline");text.textContent=`MẤT MẠNG · ${localSessionCount()} tờ đang được giữ trên thiết bị`;return}if(state.connected===false||state.connected===null){box.classList.add("connecting");text.textContent=`ĐANG KẾT NỐI CLOUD · ${localSessionCount()} tờ cục bộ vẫn an toàn`;return}text.textContent=`ĐÃ KẾT NỐI CLOUD · ${localSessionCount()} tờ cục bộ · cập nhật ${state.lastRefresh?new Date(state.lastRefresh).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"}):"—"}`}
function render(){ensureUi();const c=counts(),sum=document.getElementById("v342Summary"),tabs=document.getElementById("v342Tabs"),list=document.getElementById("v342List"),status=document.getElementById("v342Status");if(sum)sum.innerHTML=`<div class="v342Metric"><b>${c.action}</b><span>CẦN TÔI XỬ LÝ</span></div><div class="v342Metric"><b>${c.approval}</b><span>CHỜ DUYỆT</span></div><div class="v342Metric"><b>${c.waiting}</b><span>CHỜ NGƯỜI KHÁC</span></div><div class="v342Metric"><b>${c.overdue}</b><span>QUÁ MỐC NHẮC</span></div>`;const defs=[["all","CỦA TÔI",c.action],["approval","CHỜ DUYỆT",c.approval],["waiting","CHỜ NGƯỜI KHÁC",c.waiting],["returned","BỊ TRẢ LẠI",state.items.filter(x=>x.bucket==="returned").length],["overdue","QUÁ MỐC",c.overdue]];if(tabs)tabs.innerHTML=defs.map(x=>`<button class="v342Tab ${state.tab===x[0]?"on":""}" onclick="sagsV342Tab('${x[0]}')">${x[1]} <span class="n">${x[2]}</span></button>`).join("");const arr=tabItems().sort((a,b)=>(overdue(b)?1:0)-(overdue(a)?1:0)||Number(b.updatedAtMs||b.createdAtMs||0)-Number(a.updatedAtMs||a.createdAtMs||0)).slice(0,80);if(status)status.textContent=state.loading?"Đang đồng bộ các hàng công việc…":`${arr.length} mục trong tab · ${state.errors.length?"Một số nguồn tạm chưa tải được: "+state.errors.join(", "):"Dữ liệu đã gom theo trạng thái mới nhất"}`;if(list)list.innerHTML=arr.length?arr.map(cardHtml).join(""):`<div class="v342Empty">Không có công việc trong mục này.<br>Thông báo đã đóng vẫn sẽ xuất hiện tại đây nếu nghiệp vụ chưa hoàn tất.</div>`;renderSync();updateBadge()}
function cardHtml(x){const ov=overdue(x),cl=ov?"overdue":x.bucket,who=[x.author&&`Từ: ${x.author}`,x.target&&`Đến: ${x.target}`,x.claimName&&`Đang nhận: ${x.claimName}`].filter(Boolean).join(" · "),time=[ageLabel(x.updatedAtMs||x.createdAtMs),dueLabel(x)].filter(Boolean).join(" · "),flight=S(x.flight||x.flightToken),id=encodeURIComponent(x.id);return `<div class="v342Card ${cl}"><div class="v342Top"><div class="v342CardTitle">${esc(x.title)}</div><span class="v342Pill ${ov||x.bucket==="returned"?"red":""}">${esc(ov?"QUÁ MỐC":statusLabel(x))}</span></div>${flight?`<div class="v342Flight">✈ ${esc(flight)}</div>`:""}<div class="v342Meta">${esc([who,time].filter(Boolean).join(" · "))}</div>${x.reason?`<div class="v342Reason">${esc(x.reason)}</div>`:""}<div class="v342Actions"><button class="v342Btn ${x.bucket==="approval"||x.bucket==="returned"||ov?"v342Danger":"v342Primary"}" onclick="sagsV342OpenItem('${id}')">${esc(x.nextAction||"MỞ VÀ XỬ LÝ")}</button>${x.flightId||x.flightToken?`<button class="v342Btn v342Secondary" onclick="sagsV342OpenFlight('${id}')">MỞ FLIGHT COCKPIT</button>`:""}</div></div>`}

async function loadApproval(){return typeof root.sagsV339GetActionItems==="function"?await root.sagsV339GetActionItems():[]}
async function loadCross(){if(typeof root.sagsV470Ref!=="function")return[];const snap=await dbref("cross_state").orderByChild("updatedAtMs").startAt(ACTION_RESET_AT_MS).limitToLast(80).once("value"),raw=snap.val()||{},latest=new Map();for(const [id,v0] of Object.entries(raw)){const v={...v0,packageId:S(v0?.packageId||id)},key=S(v.parentDocId||v.packageId),old=latest.get(key);if(!old||Number(v.revisionNo||0)>Number(old.revisionNo||0)||Number(v.revisionNo||0)===Number(old.revisionNo||0)&&Number(v.updatedAtMs||0)>Number(old.updatedAtMs||0))latest.set(key,v)}const r=role(),u=me(),out=[],terminal=new Set(["COMPLETED","MISMATCH","SUPERSEDED"]);for(const v of latest.values()){const st=U(v.status),target=norm(v.targetUser),updated=Number(v.updatedAtMs||v.eventAtMs||0),created=Number(v.createdAtMs||v.eventAtMs||updated),recent=now()-updated<36*60*60*1000;if(created<ACTION_RESET_AT_MS||!recent&&!terminal.has(st))continue;let bucket="",next="MỞ CROSSCHECK";if(r==="AD"){if(["WAIT_DH_START","DH_RECORD_ERROR","WAIT_CBTT_START","CBTT_CHECKING","DH_CHECKING"].includes(st))bucket=st==="DH_CHECKING"?"waiting":"mine";else if(st==="FINAL_CONTENT_ERROR")bucket="returned";else if(terminal.has(st))bucket="history"}else if(r==="DH"){if(["WAIT_DH_START","DH_RECORD_ERROR"].includes(st))bucket="mine";else if(["DH_CHECKING","WAIT_CBTT_START","CBTT_CHECKING","FINAL_CONTENT_ERROR"].includes(st))bucket="waiting";else if(terminal.has(st))bucket="history"}else if(r==="CBTT"&&(!target||target===u)){if(["WAIT_CBTT_START","CBTT_CHECKING"].includes(st))bucket="mine";else if(st==="FINAL_CONTENT_ERROR")bucket="returned";else if(["WAIT_DH_START","DH_CHECKING","DH_RECORD_ERROR"].includes(st))bucket="waiting";else if(terminal.has(st))bucket="history"}if(!bucket)continue;let due=0;if(st==="WAIT_DH_START"||st==="DH_RECORD_ERROR")due=updated+10*60*1000;if(st==="WAIT_CBTT_START")due=updated+5*60*1000;if(st==="FINAL_CONTENT_ERROR")next="MỞ FINAL ĐỂ UPDATE";else if(st==="WAIT_DH_START"||st==="DH_RECORD_ERROR")next="MỞ FINAL ĐỂ CHECK";else if(st==="WAIT_CBTT_START"||st==="CBTT_CHECKING")next="MỞ ẢNH ĐỂ CHECK";out.push({id:`CROSS:${S(v.parentDocId||v.packageId)}`,source:"CROSS",sourceId:S(v.packageId),parentDocId:S(v.parentDocId),title:`CROSSCHECK FINAL LẦN ${Math.max(1,Number(v.revisionNo||1))}`,flight:S(v.identity?.flightToken||v.identity?.flightRaw),flightToken:S(v.identity?.flightToken||v.identity?.flightRaw),opDate:S(v.identity?.dateToken||v.identity?.date),status:st,bucket,nextAction:next,createdAtMs:created,updatedAtMs:updated,dueAtMs:due,revisionNo:Number(v.revisionNo||1),attemptNo:Number(v.attemptNo||1)})}return out}
async function loadRs(){if(root.__SAGS_READ_SIGN_ENABLED===false||typeof root.sagsV470Ref!=="function")return[];const u=me();if(!u)return[];const snap=await dbref(`rs_mail/${safe(u)}/items`).once("value"),items=snap.val()||{},out=[];for(const [id,t] of Object.entries(items)){const m=t?.completion?.[u]||{},done=!!(m.signedAtMs&&m.confirmedAtMs),sent=Number(t?.sentAtMs||t?.updatedAtMs||0);out.push({id:`RS:${id}`,source:"RS",sourceId:S(t?.id||id),title:S(t?.title||"READ & SIGN"),status:done?"COMPLETED":"PENDING",bucket:done?"history":"mine",nextAction:done?"XEM READ & SIGN":"MỞ VÀ KÝ",createdAtMs:sent,updatedAtMs:Number(t?.updatedAtMs||sent),dueAtMs:done?0:sent+4*24*60*60*1000})}return out}
async function loadManual(){const u=me();if(!u||typeof root.sagsV470Ref!=="function")return[];const snap=await dbref(`roster_mail/${safe(u)}/items`).once("value"),items=snap.val()||{},sessions=(()=>{try{return root.readFlightSessionList?.()||[]}catch(_){return[]}})(),local=new Set(sessions.map(x=>S(x.rosterAssignmentId))),needsLocal=new Set(["FSAGS423","FSAGS421","FSAGS551","FSAGS09"]),out=[];for(const [id,x] of Object.entries(items)){if(!x||x.active===false||x.manualCreatedV340!==true)continue;const group=U(x.formGroup),missingCore=!S(x.flightId)||!S(x.opDate)||!group,missingLocal=needsLocal.has(group)&&!local.has(S(x.assignmentId||id));if(!missingCore&&!missingLocal)continue;out.push({id:`MANUAL:${S(x.assignmentId||id)}`,source:"MANUAL",sourceId:S(x.assignmentId||id),title:missingCore?"CHUYẾN TẠO TAY THIẾU DỮ LIỆU":"BIỂU MẪU CHƯA ĐỒNG BỘ",flight:S(x.flightRaw||x.flightName),flightId:S(x.flightId),flightToken:S(x.flightRaw||x.flightName),opDate:S(x.opDate||today()),status:"SYNC_REQUIRED",bucket:"mine",nextAction:"ĐỒNG BỘ VÀ MỞ LẠI",reason:missingCore?"Thiếu khóa chuyến/ngày/đơn vị; cần kiểm tra lại dữ liệu tạo tay.":"Assignment đã có nhưng chưa thấy tờ biểu mẫu cục bộ trên thiết bị.",createdAtMs:Number(x.manualCreatedAtMs||x.createdAtMs||0),updatedAtMs:Number(x.updatedAtMs||x.manualCreatedAtMs||0)})}return out}
const LOADERS={approval:loadApproval,cross:loadCross,rs:loadRs,manual:loadManual};
const WORK_SOURCES=["approval","cross","rs","manual"];
function sourceKeys(keys){const a=Array.isArray(keys)?keys:[keys];return [...new Set(a.map(S).filter(k=>typeof LOADERS[k]==="function"))]}
function mergeSources(){const merged=new Map();for(const x of Object.values(state.sources).flat()){if(!x?.id||!afterReset(x))continue;const old=merged.get(x.id);if(!old||Number(x.updatedAtMs||0)>=Number(old.updatedAtMs||0))merged.set(x.id,x)}state.items=[...merged.values()]}
async function refresh(force=false,onlyKeys=null){if(!me())return[];const requested=sourceKeys(onlyKeys==null?Object.keys(LOADERS):onlyKeys);if(state.loading){for(const key of requested)state.pendingSources.add(key);if(onlyKeys==null)state.pendingAll=true;return state.items}const at=now(),selected=requested.filter(key=>force||!Number(state.loadedAt[key])||at-Number(state.loadedAt[key])>=SOURCE_TTL_MS);if(!selected.length){render();return state.items}state.loading=true;state.errors=state.errors.filter(x=>!selected.includes(x));render();const results=await Promise.allSettled(selected.map(key=>LOADERS[key]()));results.forEach((r,i)=>{const key=selected[i];state.loadedAt[key]=now();if(r.status==="fulfilled")state.sources[key]=Array.isArray(r.value)?r.value:[];else state.errors.push(key)});mergeSources();state.lastRefresh=now();state.loading=false;saveCache();render();const pendingAll=state.pendingAll,pending=sourceKeys([...state.pendingSources]);state.pendingAll=false;state.pendingSources.clear();if(pendingAll||pending.length)setTimeout(()=>refresh(false,pendingAll?Object.keys(LOADERS):pending).catch(()=>{}),0);return state.items}
function scheduleRefresh(ms=250,sources=WORK_SOURCES){for(const key of sourceKeys(sources)){state.loadedAt[key]=0;state.pendingSources.add(key)}clearTimeout(state.refreshTimer);state.refreshTimer=setTimeout(()=>{const keys=sourceKeys([...state.pendingSources]);state.pendingSources.clear();refresh(false,keys).catch(e=>{state.loading=false;state.errors.push(S(e?.message||e));render()})},ms)}
function stopRealtime(){for(const f of state.unsubs.splice(0))try{f()}catch(_){}}
function watch(ref,source,event="value"){const cb=()=>scheduleRefresh(350,source);ref.on(event,cb);state.unsubs.push(()=>ref.off(event,cb))}
function startRealtime(){
  // V1.1.41: CẦN XỬ LÝ is intentionally hidden from the toolbar. Do not keep four
  // duplicate RTDB subscriptions alive in the background. If this legacy panel is
  // opened programmatically, its existing refresh() loaders still fetch on demand.
  stopRealtime();state.connected=navigator.onLine!==false;renderSync();
}

async function openCross(x){root.sagsV342Close();if(U(x.status)==="FINAL_CONTENT_ERROR"&&["CBTT","AD"].includes(role()))return root.openFinalSheetManager?.();if(x.sourceId&&["CBTT","AD"].includes(role()))try{const s=await root.initHandoverFirebase().collection(handoverCollection()).doc(x.sourceId).get({source:"server"});if(s.exists){const p={...(s.data()||{}),packageId:s.id};if(p.dhPhoto&&typeof root.cxCleanRenderPair==="function")return root.cxCleanRenderPair(p)}}catch(_){}try{const list=root.readFinalSheetList?.()||[],rec=list.find(r=>S(r.receivedDocId||r.sentDocId)===S(x.parentDocId));if(rec&&typeof root.openFinalSheetRecord==="function")return root.openFinalSheetRecord(rec.id)}catch(_){}if(x.flightToken&&typeof root.sagsV36OpenFlightByToken==="function"&&await root.sagsV36OpenFlightByToken(x.flightToken))return;root.openFinalSheetManager?.()}
async function openFlight(x){root.sagsV342Close();if(x.flightId&&typeof root.flightWorkspaceOpenList==="function"){await root.flightWorkspaceOpenList(x.opDate||today());setTimeout(()=>root.flightWorkspaceOpenFlight?.(x.flightId),140);return}if(x.flightToken&&typeof root.sagsV36OpenFlightByToken==="function"&&await root.sagsV36OpenFlightByToken(x.flightToken))return;root.flightWorkspaceOpenList?.(x.opDate||today())}

root.sagsV342Open=function(){ensureUi();state.tab="all";document.getElementById("v342Modal")?.classList.add("show");render();refresh(false,WORK_SOURCES).catch(e=>{state.loading=false;state.errors.push(S(e?.message||e));render()})};
root.sagsV342Close=function(){document.getElementById("v342Modal")?.classList.remove("show")};
root.sagsV342Tab=function(t){state.tab=S(t)||"all";render()};
root.sagsV342Refresh=()=>refresh(true,WORK_SOURCES);
root.sagsV342MarkSourceDirty=function(source){for(const key of sourceKeys(source)){state.loadedAt[key]=0;state.pendingSources.add(key)}};
root.sagsV342OpenItem=async function(encoded){const id=decodeURIComponent(S(encoded)),x=state.items.find(v=>v.id===id);if(!x)return alert("Công việc đã thay đổi hoặc không còn tồn tại. Hãy tải lại CẦN XỬ LÝ.");try{if(x.source==="APPROVAL"){root.sagsV342Close();if(x.bucket==="returned")return await root.sagsV339OpenReturnedRequest?.(x.sourceId);return await root.sagsV339OpenApprovalRequest?.(x.sourceId)}if(x.source==="CROSS")return await openCross(x);if(x.source==="RS"){root.sagsV342Close();return await root.openReadSignTask?.(x.sourceId)}if(x.source==="MANUAL"){const ok=await root.sagsV342RetrySync(true);if(!ok)return;if(typeof root.v324ReceiveOrOpen==="function")return root.v324ReceiveOrOpen(x.sourceId);return openFlight(x)}}catch(e){alert("Không mở được công việc: "+S(e?.message||e))}};
root.sagsV342OpenFlight=function(encoded){const id=decodeURIComponent(S(encoded)),x=state.items.find(v=>v.id===id);if(x)openFlight(x).catch(e=>alert("Không mở được chuyến: "+S(e?.message||e)))};
root.sagsV342RetrySync=async function(silent=false){if(navigator.onLine===false){if(!silent)alert("Thiết bị đang mất mạng. Dữ liệu cục bộ vẫn được giữ; hãy thử lại khi có kết nối.");return false}const text=document.getElementById("v342SyncText");if(text)text.textContent="ĐANG THỬ ĐỒNG BỘ LẠI…";try{await root.sagsV341RepairManualAssignments?.();try{root.dailyRosterRestartMailbox?.()}catch(_){}if(root.__SAGS_READ_SIGN_ENABLED!==false)await root.rsLoadTasksOnce?.(true);await refresh(true,WORK_SOURCES);if(!silent)alert("✓ Đã kiểm tra kết nối và đồng bộ lại các nguồn công việc.");return true}catch(e){if(!silent)alert("Chưa đồng bộ lại được: "+S(e?.message||e));return false}};

function install(){ensureUi();ensureButton();watchToolbar();const u=me();if(u!==state.user){state.user=u;state.sources={approval:[],cross:[],rs:[],manual:[]};state.loadedAt={};state.pendingSources.clear();state.pendingAll=false;clearLegacyCache();loadCache();startRealtime();scheduleRefresh(450,WORK_SOURCES)}else{updateBadge();renderSync()}}
const baseApply=root.applyRoleUI;if(typeof baseApply==="function"&&!baseApply.__v342){const w=function(){const r=baseApply.apply(this,arguments);setTimeout(install,30);return r};w.__v342=true;w.__v342Base=baseApply;root.applyRoleUI=w;try{applyRoleUI=w}catch(_){}}
window.addEventListener("online",()=>{state.connected=null;renderSync();scheduleRefresh(200,WORK_SOURCES)},{passive:true});window.addEventListener("offline",()=>{state.connected=false;renderSync()},{passive:true});window.addEventListener("pageshow",()=>setTimeout(install,180),{passive:true});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(install,450),{once:true});else setTimeout(install,450);
setInterval(()=>{if(state.items.length){render();updateBadge()}},60000);
root.__SAGS_V342_BUILD=BUILD;
root.__SAGS_V342_TEST__={ACTION_RESET_AT_MS,ACTION_RESET_LABEL,itemAtMs,afterReset,activeItem,overdue,statusLabel,ageLabel,dueLabel,loadCross,loadManual,loadRs,sourceKeys,WORK_SOURCES};
})(typeof window!=="undefined"?window:globalThis);


/* ===== BUNDLED flight-workspace-documents-v350.js · V3.93 ===== */
/* E-REPORT/SAGS V3.51 · Flight dossier shortcuts.
 * Every shortcut opens the same shared flight_records dossier. This module
 * never creates a second document store and never adds a Firebase listener.
 */
(function(root){
"use strict";
if(root.__SAGS_V350_WORKSPACE_DOCUMENTS_LOADED)return;
root.__SAGS_V350_WORKSPACE_DOCUMENTS_LOADED=true;

const BUILD="V3.51-20260822-01";
const S=v=>String(v??"").trim();
const view={date:"",fid:"",label:""};

function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function hasFlightToken(v){return /(?:^|[^A-Z0-9])[A-Z0-9]{2,3}\s*[- ]?\s*\d{1,5}(?:[^A-Z0-9]|$)/i.test(S(v))}
function currentHint(){try{const modal=document.getElementById("finalFormsModal"),r=root.currentFinalSheetRecord?.();if(modal&&getComputedStyle(modal).display!=="none"&&r&&(r.flightId||hasFlightToken(r.flightToken||r.name)))return true}catch(_){}try{const m=root.currentFlightSessionMeta?.(),st=(typeof state!=="undefined"&&state)||root.state||{};return !!(S(m?.rosterFlightId||m?.flightId)||hasFlightToken([m?.name,st.fltBefore,st.fltAfter,st.f421_fltBefore,st.f421_fltAfter,st.f551_fltBefore,st.f551_fltAfter,st.f09_fltBefore,st.f09_fltAfter].filter(Boolean).join(" / ")))}catch(_){return false}}
function workspaceDate(){return S(document.getElementById("fwcDate")?.value||view.date||sessionStorage.getItem("sagsV36FwcDate")||today())}
function parseFid(button){const code=S(button?.getAttribute("onclick")),m=code.match(/flightWorkspaceOpenFlight\(['"]([^'"]+)['"]\)/);return S(m?.[1])}

function ensureStyle(){if(document.getElementById("v350DossierShortcutStyle"))return;const st=document.createElement("style");st.id="v350DossierShortcutStyle";st.textContent=`
  .v350DossierBtn{background:#0f766e!important;color:#fff!important;border-color:#0b5f59!important}
  .v350CardActions{display:grid;gap:6px;align-self:stretch}.v350CardActions>.fwcBtn{width:100%}
  #roleBtnCurrentFlightDossier{order:-118!important;flex:0 0 auto!important;background:#0f766e!important;color:#fff!important;border-color:#0b5f59!important}
  #v350CurrentFlightDossierNav{background:#eafaf6!important;color:#0f6b5d!important;border-color:#a9ddd3!important}
  #v350Fs09DossierBtn{position:absolute;top:5.2%;left:1.8%;z-index:29;min-height:38px;padding:7px 10px;border:0;border-radius:9px;background:#0f766e;color:#fff;font:900 11px Arial,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.25)}
  @media(max-width:620px){#roleBtnCurrentFlightDossier{font-size:10px!important}#v350Fs09DossierBtn{font-size:10px}}
`;document.head.appendChild(st)}

root.sagsV350OpenFlightDossier=function(date,fid,label=""){if(typeof root.sagsV338OpenDossier!=="function")return alert("HỒ SƠ CHUYẾN chưa sẵn sàng.");return root.sagsV338OpenDossier(S(date)||today(),S(fid),S(label),false)};

function injectWorkspaceButtons(){const body=document.getElementById("fwcBody");if(!body)return;const date=workspaceDate();for(const card of body.querySelectorAll(".fwcFlight")){if(card.querySelector(".v350CardDossierBtn"))continue;const open=card.querySelector('button[onclick*="flightWorkspaceOpenFlight"]'),fid=parseFid(open);if(!fid||!open)continue;const label=S(card.querySelector(".fwcFlightTitle")?.textContent),actions=document.createElement("div");actions.className="v350CardActions";open.replaceWith(actions);actions.appendChild(open);const b=document.createElement("button");b.type="button";b.className="fwcBtn v350DossierBtn v350CardDossierBtn";b.textContent="📁 HỒ SƠ";b.title="Hồ sơ chuyến bay này";b.onclick=()=>root.sagsV350OpenFlightDossier(date,fid,label);actions.appendChild(b)}const back=body.querySelector(".fwcBack");if(back&&view.fid&&!back.querySelector(".v350DetailDossierBtn")){const b=document.createElement("button");b.type="button";b.className="fwcBtn v350DossierBtn v350DetailDossierBtn";b.textContent="📁 HỒ SƠ CHUYẾN BAY NÀY";b.onclick=()=>root.sagsV350OpenFlightDossier(view.date||date,view.fid,view.label);back.appendChild(b)}}

function injectFormShortcuts(){ensureStyle();const visible=currentHint();document.getElementById("roleBtnCurrentFlightDossier")?.remove();document.getElementById("v350CurrentFlightDossierNav")?.remove();const finalBtn=document.getElementById("v338FinalDossierBtn");if(finalBtn){finalBtn.title="Hồ sơ chuyến bay này";finalBtn.setAttribute("aria-label","Hồ sơ chuyến bay này")}const page=document.getElementById("page11");if(page&&!document.getElementById("v350Fs09DossierBtn")){const b=document.createElement("button");b.id="v350Fs09DossierBtn";b.type="button";b.textContent="📁 HỒ SƠ";b.title="Hồ sơ chuyến bay này";b.onclick=()=>root.sagsV338OpenCurrentDossier?.();page.appendChild(b)}const fs=document.getElementById("v350Fs09DossierBtn");if(fs)fs.style.display=visible?"block":"none"}

function wrapWorkspace(){const list=root.flightWorkspaceOpenList;if(typeof list==="function"&&!list.__v350dossier){const w=function(date){view.date=S(date)||workspaceDate();view.fid="";view.label="";const r=list.apply(this,arguments);Promise.resolve(r).finally(()=>{setTimeout(injectWorkspaceButtons,40);setTimeout(injectWorkspaceButtons,420)});return r};w.__v350dossier=true;w.__v350dossierBase=list;root.flightWorkspaceOpenList=w;try{flightWorkspaceOpenList=w}catch(_){}}const open=root.flightWorkspaceOpenFlight;if(typeof open==="function"&&!open.__v350dossier){const w=function(fid){view.date=workspaceDate();view.fid=S(fid);view.label=S(document.querySelector(`.fwcFlight button[onclick*="${S(fid)}"]`)?.closest(".fwcFlight")?.querySelector(".fwcFlightTitle")?.textContent);const r=open.apply(this,arguments);setTimeout(injectWorkspaceButtons,40);return r};w.__v350dossier=true;w.__v350dossierBase=open;root.flightWorkspaceOpenFlight=w;try{flightWorkspaceOpenFlight=w}catch(_){}}}

function install(){ensureStyle();wrapWorkspace();injectWorkspaceButtons();injectFormShortcuts()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(install,700),{once:true});else setTimeout(install,700);
setInterval(injectFormShortcuts,5000);
root.addEventListener("pageshow",()=>setTimeout(install,220),{passive:true});
root.__SAGS_V350_WORKSPACE_DOCUMENTS_BUILD=BUILD;
})(typeof window!=="undefined"?window:globalThis);


/* V1.1.63: legacy compact-toolbar-v351 presentation module removed. */

/* ===== BUNDLED closeout-final-autofill-v344.js · V3.93 ===== */
/* E-REPORT/SAGS V3.55 · Approved PVHK closeout -> durable CBTT FINAL autofill
 * The approved closeout is indexed by DATE + departure FLIGHT + A/C REG so CBTT can
 * recover it after login/offline gaps. Matching FINAL records are created or
 * resolved when the carrier/template is known, then populated without
 * overwriting operator edits or a FINAL that was already sent.
 */
(function(root){
"use strict";
if(root.__SAGS_V344_CLOSEOUT_FINAL_LOADED)return;
root.__SAGS_V344_CLOSEOUT_FINAL_LOADED=true;

const BUILD="V3.59-20260822-01";
const INDEX_ROOT="closeout_by_flight_v344";
const IDENTITY_ROOT="closeout_by_identity_v355";
const EVENTS_ROOT="closeout_events_v348";
const INBOX_KEY="sagsCloseoutInboxV121";
const S=v=>String(v??"").trim();
const U=v=>S(v).toUpperCase();
const flight=v=>U(v).replace(/[^A-Z0-9]/g,"");
const reg=v=>U(v).replace(/[^A-Z0-9]/g,"");
const num=v=>{const s=S(v).replace(",", ".");if(!s)return null;const n=Number(s);return Number.isFinite(n)?n:null};
const clone=v=>{try{return typeof root.cloneSafe==="function"?root.cloneSafe(v):JSON.parse(JSON.stringify(v))}catch(_){return v}};
const role=()=>{try{return U((typeof currentRole!=="undefined"?currentRole:root.currentRole)||"")}catch(_){return U(root.currentRole)}};
const profile=()=>{try{return (typeof currentUserProfile!=="undefined"?currentUserProfile:root.currentUserProfile)||null}catch(_){return root.currentUserProfile||null}};
const me=()=>{try{return typeof root.normalizePersonalUsername==="function"?root.normalizePersonalUsername(profile()?.username||""):S(profile()?.username).toLowerCase()}catch(_){return S(profile()?.username).toLowerCase()}};
const activeId=()=>{try{return typeof activeFinalSheetId!=="undefined"?S(activeFinalSheetId):S(root.activeFinalSheetId)}catch(_){return S(root.activeFinalSheetId)}};
const collectionName=()=>{try{return typeof HANDOVER_COLLECTION!=="undefined"?HANDOVER_COLLECTION:"sags_handovers"}catch(_){return "sags_handovers"}};
const dateToken=v=>{try{return typeof root.ffDateToken==="function"?root.ffDateToken(v):(typeof root.paxNormDate==="function"?root.paxNormDate(v):S(v).replace(/\D/g,""))}catch(_){return S(v).replace(/\D/g,"")}};
const ownedKey=k=>{try{return typeof root.sagsOwnedKey==="function"?root.sagsOwnedKey(k):k}catch(_){return k}};
const safe=v=>{try{return typeof root.sagsV470Safe==="function"?root.sagsV470Safe(S(v)):S(v).replace(/[.#$\[\]\/]/g,"_")}catch(_){return S(v).replace(/[.#$\[\]\/]/g,"_")}};

function readInbox(){try{return JSON.parse(localStorage.getItem(ownedKey(INBOX_KEY))||"{}")||{}}catch(_){return{}}}
function writeInbox(x){try{localStorage.setItem(ownedKey(INBOX_KEY),JSON.stringify(x||{}))}catch(_){}}
function payloadDate(p){return dateToken(p?.identity?.dateToken||p?.f09?.f09_date)}
function payloadReg(p){return reg(p?.identity?.acRegToken||p?.f09?.f09_regn)}
function flightTokens(v){
  if(Array.isArray(v))return [...new Set(v.flatMap(flightTokens))];
  const raw=U(v);if(!raw)return[];const out=[];let prefix="";
  for(const part0 of raw.replace(/[\/|,;]+/g," ").split(/\s+/).filter(Boolean)){
    const part=part0.replace(/[^A-Z0-9]/g,"");let m=/^([A-Z0-9]{2,3}?)(\d{1,5})$/.exec(part);
    if(m&&/[A-Z]/.test(m[1])){prefix=m[1];out.push(prefix+m[2]);continue}
    if(/^[A-Z0-9]{2,3}$/.test(part)&&/[A-Z]/.test(part)){prefix=part;continue}
    m=/^(\d{1,5})$/.exec(part);if(m&&prefix)out.push(prefix+m[1]);
  }
  if(!out.length){const one=flight(raw);if(/^[A-Z0-9]{2,3}\d{1,5}$/.test(one)&&/[A-Z]/.test(one.slice(0,-1)))out.push(one)}
  return [...new Set(out.map(flight).filter(Boolean))]
}
function lastFlight(v){const x=flightTokens(v);return x[x.length-1]||""}
function allPayloadFlights(p){const i=p?.identity||{},f=p?.f09||{};return flightTokens([i.flights,i.flightToken,i.flight,p?.flightName,f.f09_fltBefore,f.f09_fltAfter])}
function targetFlights(p){const i=p?.identity||{},f=p?.f09||{},dep=lastFlight(f.f09_fltAfter||i.depFlight||p?.depFlight);if(dep)return[dep];const fs=flightTokens(i.flights);if(fs.length)return[fs[fs.length-1]];const all=allPayloadFlights(p);return all.length?[all[all.length-1]]:[]}
function payloadRevision(p){return Math.max(1,Number(p?.closeoutNo||p?.revisionNo||1)||1)}
function payloadKey(p){return payloadDate(p)+"|"+(targetFlights(p)[0]||"")+"|"+payloadReg(p)}
function cachePayload(p){if(!p)return;const box=readInbox(),no=payloadRevision(p),dt=payloadDate(p),rg=payloadReg(p);for(const f of targetFlights(p)){if(!dt||!f||!rg)continue;const key=dt+"|"+f+"|"+rg,old=box[key]||{},versions=Array.isArray(old.versions)?old.versions.filter(x=>payloadRevision(x)!==no):[];versions.push(clone(p));versions.sort((a,b)=>payloadRevision(a)-payloadRevision(b)||Number(a?.submittedAtMs||0)-Number(b?.submittedAtMs||0));const latest=versions[versions.length-1]||clone(p);box[key]={latest,versions:versions.slice(-5),updatedAtMs:Number(latest?.submittedAtMs||Date.now())}}writeInbox(box)}

function readRecordData(rec){let all={};try{all=JSON.parse(localStorage.getItem(root.finalSheetDataKey(rec.id))||"{}")||{}}catch(_){}const form=S(rec?.form);return {all,data:form&&all?.[form]&&typeof all[form]==="object"?all[form]:{}}}
function recordIdentity(rec,data){const primaryDate=dateToken(data?.date),dates=primaryDate?[primaryDate]:[rec?.dateToken,rec?.depFlightDate,rec?.opDate,rec?.date].map(dateToken).filter(Boolean),primaryFlights=flightTokens(data?.flight),flights=primaryFlights.length?primaryFlights:flightTokens([rec?.flightToken,rec?.depFlight,rec?.flightRaw,rec?.flightName]);return {dateToken:dates[0]||"",dateTokens:[...new Set(dates)],flight:flights[flights.length-1]||"",flights,reg:reg(data?.acreg||rec?.acRegToken)}}
function tripMatches(rec,data,p){const a=recordIdentity(rec,data),dt=payloadDate(p),fs=targetFlights(p);return !!(dt&&fs.length&&a.dateTokens.includes(dt)&&a.flights.some(x=>fs.includes(x)))}
function matches(rec,data,p){if(!tripMatches(rec,data,p))return false;const a=recordIdentity(rec,data),pr=payloadReg(p);return !!(a.reg&&pr&&a.reg===pr)}
function fieldMap(form){if(form==="VUfinal.png")return {adl:"adult",chd:"child",inf:"infant",bagPcs:"bagpcs",bagKg:"bagkg"};if(form==="9Gfinal.png")return {adl:"adult",chd:"child",inf:"infant",bagPcs:"bagpcs",bagKg:"bagw"};if(form==="VJfinal2.png")return {adl:"adlq",chd:"chdq",inf:"infq",bagPcs:"bagq",bagKg:"bagw"};if(form==="VJfinal.png")return {adl:"adultq",chd:"childq",inf:"infantq",bagPcs:"bagq",bagKg:"bagw"};return null}
function payloadValues(p){const f=p?.f09||{};return {adl:num(f.f09_finalADL),chd:num(f.f09_finalCHD),inf:num(f.f09_finalINF),bagPcs:num(f.f09_finalBagP),bagKg:num(f.f09_finalBagW)}}
function hasSentFinal(rec){return !!(S(rec?.sentDocId)||Number(rec?.sentAtMs||rec?.finalSubmittedAtMs||0)>0||(Array.isArray(rec?.sentFinalHistory)&&rec.sentFinalHistory.length))}
function applyFormulas(form,data){try{root.ffAutoPaxWeights?.(form,data)}catch(_){}try{root.ffApplyVJFormulas?.(form,data)}catch(_){}if(form==="VUfinal.png")try{root.ffApplyVUFormulas?.(data)}catch(_){}if(form==="9Gfinal.png")try{root.ffApply9GLoadFormulas?.(data)}catch(_){}return data}
function carrier(p){const f=targetFlights(p)[0]||"";return f.startsWith("VU")?"VU":f.startsWith("9G")?"9G":(f.startsWith("VJ")||f.startsWith("VZ"))?"VJ":""}
function aircraftType(p){const f=p?.f09||{},r=reg(p?.identity?.acRegToken||f.f09_regn);let t=U(f.f09_acType||f.f09_actype||p?.identity?.acType||p?.acType);if(!t&&r)try{t=U(root.sagsFleetConfigByReg?.(r))}catch(_){}if(!t&&r)try{const k=typeof root.sagsNormalizeRegKey==="function"?root.sagsNormalizeRegKey(r):r;t=U(root.sagsDynamicFleetCache?.()?.byReg?.[k]?.acType||root.sagsDynamicFleetCache?.()?.byReg?.[k]?.type)}catch(_){}return t}
function formForPayload(p){const c=carrier(p);if(c==="VU")return "VUfinal.png";if(c==="9G")return "9Gfinal.png";if(c!=="VJ")return "";const t=aircraftType(p);if(/330|A330|WIDE|THÂN\s*RỘNG/.test(t))return "VJfinal2.png";if(/320|321|A320|A321|32N/.test(t))return "VJfinal.png";return ""}
function formLabel(form){try{return root.finalFormLabelFromFile?.(form)||({"VUfinal.png":"VIETRAVEL","9Gfinal.png":"SUN PHUQUOC","VJfinal2.png":"VJ TÀU THÂN RỘNG","VJfinal.png":"VIETJET"}[form]||"FINAL")}catch(_){return "FINAL"}}
function identitySeed(p,form){const f=p?.f09||{},dt=payloadDate(p),date=/^\d{8}$/.test(dt)?dt.slice(0,4)+"-"+dt.slice(4,6)+"-"+dt.slice(6,8):S(f.f09_date),flt=targetFlights(p)[0]||"",acreg=U(p?.identity?.acRegToken||f.f09_regn),type=aircraftType(p),from=U(f.f09_route1||"CXR"),to=U(f.f09_route3);if(form==="VUfinal.png")return {flight:flt,sector1:from||"CXR",sector2:to,date,acreg};if(form==="9Gfinal.png")return {departure:from||"CXR",arrival:to,flight:flt,acreg,date};if(form==="VJfinal2.png")return {flight:flt,from:from||"CXR",to,actype:type,acreg,date};return {flight:flt,sector:to?((from||"CXR")+"-"+to):"",acreg,date}}

function ensureFinalRecord(list,p){const dt=payloadDate(p),flt=targetFlights(p)[0]||"",rg=payloadReg(p);if(!dt||!flt||!rg)return {record:null,created:false,resolved:false,missingIdentity:true};const exact=list.filter(r=>{const x=readRecordData(r);return matches(r,x.data,p)}),sameTrip=list.filter(r=>{const x=readRecordData(r);return tripMatches(r,x.data,p)});let rec=exact.find(r=>S(r.id)===activeId())||exact.find(r=>!hasSentFinal(r))||exact[0]||list.find(r=>S(r.closeoutAutoKeyV344)===dt+"|"+flt+"|"+rg),created=false,resolved=false;const form=formForPayload(p),now=Date.now();
  if(!rec&&sameTrip.length)return {record:null,created:false,resolved:false,identityMismatch:true};
  if(!rec){if(typeof root.makeFinalSheetId!=="function")return {record:null,created:false,resolved:false};rec={id:root.makeFinalSheetId(),name:flt+(form?" · "+formLabel(form):" · CHỜ MẪU"),form:form||"",airline:form?formLabel(form):"CHỜ MẪU",flightSessionId:"",dateToken:dt,flightToken:flt,acRegToken:rg,createdAt:now,updatedAt:now,autoCreatedFromCloseoutV344:true,closeoutAutoKeyV344:dt+"|"+flt+"|"+rg};list.push(rec);created=true}
  if(!S(rec.form)&&form){rec.form=form;rec.airline=formLabel(form);rec.name=flt+" · "+rec.airline;rec.templatePendingV340=false;delete rec.templatePendingReason;rec.templateResolvedAtMs=now;resolved=true}
  if(!S(rec.form)){rec.templatePendingV340=true;rec.templatePendingReason="WAITING_AC_TYPE_OR_SUPPORTED_CARRIER";rec.ksPendingPayloadKeyV344=payloadKey(p);rec.ksPendingRevisionV344=payloadRevision(p);rec.updatedAt=now;return {record:rec,created,resolved}}
  const {all,data}=readRecordData(rec),seed=identitySeed(p,rec.form);for(const [k,v] of Object.entries(seed))if(S(v)&&!S(data[k]))data[k]=v;all[rec.form]=data;try{localStorage.setItem(root.finalSheetDataKey(rec.id),JSON.stringify(all))}catch(_){}rec.dateToken=dt;rec.flightToken=flt;if(!S(rec.acRegToken))rec.acRegToken=rg;rec.updatedAt=now;return {record:rec,created,resolved}}

function applyRecord(rec,p){const {all,data}=readRecordData(rec);if(!matches(rec,data,p))return {matched:false,changed:false,conflicts:[]};const map=fieldMap(rec.form);if(!map){rec.ksPendingPayloadKeyV344=payloadKey(p);rec.ksPendingRevisionV344=payloadRevision(p);return {matched:true,changed:false,conflicts:[],pendingTemplate:true}}
  const no=payloadRevision(p),last=Number(rec.ksAutofillRevisionV344||rec.ksAutofillRevisionV343||0),locked=hasSentFinal(rec)&&no>last,source=payloadValues(p),previous=(rec.ksAutofillValuesV344&&typeof rec.ksAutofillValuesV344==="object")?{...rec.ksAutofillValuesV344}:((rec.ksAutofillValuesV343&&typeof rec.ksAutofillValuesV343==="object")?{...rec.ksAutofillValuesV343}:{}),written={},conflicts=[];
  for(const [name,key] of Object.entries(map)){const raw=source[name];if(raw===null)continue;const next=String(raw),cur=S(data[key]),prev=S(previous[key]);if(locked){if(cur!==next)conflicts.push(key);continue}if(!cur||(prev&&cur===prev)){if(cur!==next){data[key]=next;written[key]=next}else if(prev)written[key]=next}else if(cur!==next)conflicts.push(key)}
  const seed=identitySeed(p,rec.form);for(const [key,next0] of Object.entries(seed)){const next=S(next0),cur=S(data[key]);if(next&&!cur&&!locked){data[key]=next;written[key]=next}}
  const changed=Object.keys(written).length>0;if(changed){applyFormulas(rec.form,data);all[rec.form]=data;localStorage.setItem(root.finalSheetDataKey(rec.id),JSON.stringify(all))}
  rec.ksAutofillRevisionV344=Math.max(last,no);rec.ksAutofillAtMsV344=Date.now();rec.ksAutofillSourceDocIdV344=S(p?.internalApprovalRequestId||p?.canonicalDocId||"");rec.ksAutofillValuesV344={...previous,...written};delete rec.ksPendingPayloadKeyV344;
  if(conflicts.length||locked){rec.ksPendingRevisionV121=no;rec.ksPendingAtMsV121=Number(p?.submittedAtMs||Date.now())}else{delete rec.ksPendingRevisionV121;delete rec.ksPendingAtMsV121;delete rec.ksPendingChangesV121}rec.updatedAt=Date.now();return {matched:true,changed,conflicts,locked,written:Object.keys(written),sourceCount:Object.values(source).filter(x=>x!==null).length}}

const activeRefreshTimers=new Map();
function refreshActive(rec,result){if(!result.changed||activeId()!==S(rec.id))return;const id=S(rec.id),started=Date.now();clearTimeout(activeRefreshTimers.get(id));const run=()=>{if(activeId()!==id){activeRefreshTimers.delete(id);return}const focused=document.activeElement?.closest?.("#finalFormFields");if(focused&&Date.now()-started<30000){activeRefreshTimers.set(id,setTimeout(run,400));return}if(focused){activeRefreshTimers.delete(id);return}try{root.renderFinalFields?.(rec.form);root.v121RefreshValidation?.()}catch(_){}activeRefreshTimers.delete(id)};activeRefreshTimers.set(id,setTimeout(run,60))}
function applyAll(p,{notify=true,createMissing=true}={}){if(!p||!["CBTT","AD"].includes(role()))return {matched:0,changed:0,conflicts:0,created:0,pending:0,locked:0,missingSource:0,missingIdentity:0,identityMismatch:0};cachePayload(p);let list=[];try{list=root.readFinalSheetList?.()||[]}catch(_){return {matched:0,changed:0,conflicts:0,created:0,pending:0,locked:0,missingSource:0,missingIdentity:0,identityMismatch:0}}let created=0,missingIdentity=0,identityMismatch=0;if(createMissing){const e=ensureFinalRecord(list,p);if(e.created)created++;if(e.missingIdentity)missingIdentity++;if(e.identityMismatch)identityMismatch++}
  let matched=0,changed=0,conflicts=0,locked=0,missingSource=0;const pendingIds=new Set();for(const rec of list){const r=applyRecord(rec,p);if(!r.matched)continue;matched++;if(r.changed)changed++;if(r.pendingTemplate)pendingIds.add(S(rec.id));conflicts+=r.conflicts.length;if(r.locked)locked++;if(r.sourceCount===0)missingSource++;refreshActive(rec,r)}const pending=pendingIds.size;if(matched||created)try{root.writeFinalSheetList?.(list)}catch(_){}
  const result={matched,changed,conflicts,created,pending,locked,missingSource,missingIdentity,identityMismatch};
  if(notify){let msg="";if(changed)msg=`✓ KẾT SỔ LẦN ${payloadRevision(p)} ĐÃ TỰ ĐIỀN VÀO FINAL.`;else if(missingIdentity)msg="⚠ KẾT SỔ THIẾU NGÀY, CHUYẾN ĐI HOẶC A/C REG · KHÔNG GHÉP FINAL.";else if(identityMismatch)msg="⚠ FINAL CÙNG NGÀY + CHUYẾN NHƯNG A/C REG KHÔNG TRÙNG · KHÔNG TỰ ĐIỀN.";else if(pending)msg="✓ ĐÃ NHẬN KẾT SỔ · FINAL ĐANG CHỜ XÁC ĐỊNH ĐÚNG MẪU.";else if(locked)msg="⚠ ĐÃ NHẬN KẾT SỔ · FINAL NÀY ĐÃ GỬI, KHÔNG TỰ GHI ĐÈ.";else if(conflicts)msg="⚠ ĐÃ NHẬN KẾT SỔ · FINAL CÓ SỐ ĐÃ NHẬP TAY, CẦN KIỂM TRA.";else if(missingSource)msg="⚠ ĐÃ NHẬN KẾT SỔ NHƯNG NGUỒN CHƯA CÓ ADL/CHD/INF/BAG ĐỂ ĐIỀN.";else if(!matched)msg="⚠ CHƯA GHÉP ĐƯỢC FINAL TRÙNG NGÀY + CHUYẾN ĐI + A/C REG.";else if(created)msg="✓ ĐÃ TẠO FINAL TƯƠNG ỨNG.";if(msg)try{root.showToast?.(msg)}catch(_){}}
  try{root.__SAGS_V355_LAST_AUTOFILL={atMs:Date.now(),dateToken:payloadDate(p),flightToken:targetFlights(p)[0]||"",acRegToken:payloadReg(p),revisionNo:payloadRevision(p),...result}}catch(_){}return result}

function cachedForRecord(rec){const {data}=readRecordData(rec),id=recordIdentity(rec,data);if(!id.reg)return null;const box=readInbox();for(const dt of id.dateTokens)for(const flt of id.flights){const exact=box?.[dt+"|"+flt+"|"+id.reg]?.latest;if(exact&&payloadReg(exact)===id.reg)return exact;const legacy=box?.[dt+"|"+flt]?.latest;if(legacy&&payloadReg(legacy)===id.reg)return legacy}return null}
async function durableForRecord(rec){if(typeof root.sagsV470Ref!=="function")return null;const {data}=readRecordData(rec),id=recordIdentity(rec,data);if(!id.reg)return null;for(const dt of id.dateTokens)for(const flt of id.flights){let snap=await root.sagsV470Ref(`${IDENTITY_ROOT}/${safe(dt)}/${safe(flt)}/${safe(id.reg)}`).once("value"),v=snap.val?.()||null,p=v?.payload||v||null;if(p&&payloadReg(p)===id.reg)return p;snap=await root.sagsV470Ref(`${INDEX_ROOT}/${safe(dt)}/${safe(flt)}`).once("value");v=snap.val?.()||null;p=v?.payload||v||null;if(p&&payloadReg(p)===id.reg)return p}return null}
async function firestoreForRecord(rec){const {data}=readRecordData(rec),id=recordIdentity(rec,data);if(!id.dateToken||!id.flight||!id.reg||typeof root.initHandoverFirebase!=="function")return null;const db=root.initHandoverFirebase(),arr=[];if(typeof root.fs09MakeMatchKey==="function"){const key=root.fs09MakeMatchKey(id.dateToken,id.flight,id.reg,"CXR");if(key){const snap=await db.collection(collectionName()).where("matchKeys","array-contains",key).limit(12).get();snap.forEach(doc=>{const d=doc.data()||{};if(U(d.kind)==="FSAGS09_CLOSEOUT"&&payloadReg(d)===id.reg)arr.push(d)})}}
  if(!arr.length){const snap=await db.collection(collectionName()).where("kind","==","fsags09_closeout").limit(80).get();snap.forEach(doc=>{const d=doc.data()||{};if(payloadDate(d)===id.dateToken&&targetFlights(d).includes(id.flight)&&payloadReg(d)===id.reg)arr.push(d)})}return arr.sort((a,b)=>payloadRevision(b)-payloadRevision(a)||Number(b?.submittedAtMs||0)-Number(a?.submittedAtMs||0))[0]||null}
async function syncRecord(id,{notify=true}={}){const rec=(root.readFinalSheetList?.()||[]).find(x=>S(x.id)===S(id));if(!rec)return false;let found=false;const cached=cachedForRecord(rec);if(cached){applyAll(cached,{notify,createMissing:false});found=true}try{const d=await durableForRecord(rec);if(d){applyAll(d,{notify,createMissing:false});found=true;return true}}catch(e){console.info("V3.59 durable closeout RTDB",e?.message||e)}/* V3.59 READ FIX: tuyệt đối không fallback Firestore query tự động. Trước đây mỗi sync FINAL có thể đọc 12 + 80 docs; khi bootstrap/sửa identity sẽ nhân lên rất lớn. Firestore canonical chỉ dùng khi thao tác nghiệp vụ thực sự cần, không dùng để tự đồng bộ nền. */return found}
async function syncAll({notify=false}={}){if(!["CBTT","AD"].includes(role()))return 0;const list=root.readFinalSheetList?.()||[],seen=new Set();let n=0;for(const rec of list){const {data}=readRecordData(rec),id=recordIdentity(rec,data),k=id.dateToken+"|"+id.flight+"|"+id.reg;if(!id.dateToken||!id.flight||!id.reg||seen.has(k))continue;seen.add(k);if(await syncRecord(rec.id,{notify}))n++}return n}
function rosterDepartureFlight(x){return lastFlight(x?.depFlight||x?.flightToken)||lastFlight(x?.flightRaw||x?.flightName)||lastFlight(x?.arrFlight)}
async function syncAssignedCloseouts({notify=false}={}){if(role()!=="CBTT"||!me()||typeof root.sagsV470Ref!=="function")return 0;let items={};try{items=(await root.sagsV470Ref(`roster_mail/${safe(me())}/items`).once("value")).val?.()||{}}catch(e){console.info("V3.55 assigned FINAL mailbox",e?.message||e);return 0}const wanted=new Map();for(const x of Object.values(items)){if(!x||x.active===false||U(x.formGroup)!=="FINAL")continue;const dt=dateToken(x.depFlightDate||x.opDate||x.date),flt=rosterDepartureFlight(x),rg=reg(x.acReg||x.acRegToken||x.regn);if(dt&&flt&&rg)wanted.set(dt+"|"+flt+"|"+rg,{dt,flt,rg})}let n=0;for(const {dt,flt,rg} of wanted.values())try{let snap=await root.sagsV470Ref(`${IDENTITY_ROOT}/${safe(dt)}/${safe(flt)}/${safe(rg)}`).once("value"),v=snap.val?.()||null,p=v?.payload||v||null;if(!p){snap=await root.sagsV470Ref(`${INDEX_ROOT}/${safe(dt)}/${safe(flt)}`).once("value");v=snap.val?.()||null;p=v?.payload||v||null}if(p&&payloadReg(p)===rg){applyAll(p,{notify,createMissing:true});n++}}catch(e){console.info("V3.55 assigned closeout",dt,flt,rg,e?.message||e)}return n}
async function bootstrapSync({notify=false}={}){await syncAssignedCloseouts({notify});return await syncAll({notify})}

root.sagsV344PersistApprovedCloseout=async function(p,docId=""){if(!p||typeof root.sagsV470Ref!=="function")return false;const dt=payloadDate(p),fs=targetFlights(p),rg=payloadReg(p);if(!dt||!fs.length||!rg)return false;const patch={},at=Date.now();for(const f of fs){const node={schema:3,docId:S(docId),dateToken:dt,flightToken:f,acRegToken:rg,revisionNo:payloadRevision(p),approvedAtMs:Number(p?.internalApprovedAtMs||at),updatedAtMs:at,payload:clone(p)};patch[`${IDENTITY_ROOT}/${safe(dt)}/${safe(f)}/${safe(rg)}`]=node;patch[`${INDEX_ROOT}/${safe(dt)}/${safe(f)}`]=node}await root.sagsV470Ref("").update(patch);return true};
root.sagsV348PublishApprovedCloseout=async function(p,docId="",meta={}){
  if(!p||typeof root.sagsV470Ref!=="function")return false;
  const dt=payloadDate(p),fs=targetFlights(p),rg=payloadReg(p),revision=payloadRevision(p);
  if(!dt||!fs.length||!rg||!S(docId))return false;
  const at=Number(meta?.eventAtMs||Date.now()),eventId=S(meta?.eventId||`${docId}|R${revision}|${at}`);
  const signal={
    kind:"sags_closeout_signal_v348",schema:1,eventId,eventAtMs:at,docId:S(docId),
    closeoutNo:revision,revisionNo:revision,dateToken:dt,flights:fs,
    matchKeys:Array.isArray(p?.matchKeys)?p.matchKeys.slice():(Array.isArray(p?.identity?.matchKeys)?p.identity.matchKeys.slice():[]),
    acRegToken:rg,
    sourceDeviceId:S(meta?.sourceDeviceId||p?.sourceDeviceId),
    sourceSessionId:S(p?.sourceSessionId),
    sourceUser:S(meta?.sourceUser||p?.submittedBy?.username),
    sourceRole:U(meta?.sourceRole||p?.submittedBy?.role||"PVHK"),
    approvedBy:clone(p?.internalApprovedBy||null),approvedAtMs:Number(p?.internalApprovedAtMs||at),
    targetRoles:["DH","CBTT","AD"],payload:clone(p),build:BUILD
  };
  const patch={},eventNode=safe(`${docId}_R${String(revision).padStart(3,"0")}`);
  patch[`${EVENTS_ROOT}/${eventNode}`]=signal;
  patch[`closeouts/${safe(docId)}`]={
    kind:"sags_closeout_pointer_v348",docId:S(docId),eventId,eventAtMs:at,
    submittedAtMs:Number(p?.submittedAtMs||at),closeoutNo:revision,
    matchKeys:signal.matchKeys,dateToken:dt,flights:fs,acRegToken:signal.acRegToken,
    sourceDeviceId:signal.sourceDeviceId,sourceSessionId:signal.sourceSessionId,build:BUILD
  };
  if(meta?.includeLatest!==false)patch["closeout/latest"]=signal;
  for(const f of fs){const node={schema:3,docId:S(docId),dateToken:dt,flightToken:f,acRegToken:rg,revisionNo:revision,approvedAtMs:signal.approvedAtMs,updatedAtMs:at,payload:clone(p)};patch[`${IDENTITY_ROOT}/${safe(dt)}/${safe(f)}/${safe(rg)}`]=node;patch[`${INDEX_ROOT}/${safe(dt)}/${safe(f)}`]=node}
  await root.sagsV470Ref("").update(patch);
  try{applyAll(p,{notify:true,createMissing:true})}catch(_){}
  return true;
};
root.sagsV344ApplyCloseoutToFinals=(p,o)=>Promise.resolve(applyAll(p,o));
root.sagsV343ApplyCloseoutToFinals=root.sagsV344ApplyCloseoutToFinals;
root.sagsV344SyncFinalRecord=(id,o)=>syncRecord(id,o);
root.sagsV343SyncFinalRecord=root.sagsV344SyncFinalRecord;
root.sagsV344SyncAllFinals=o=>syncAll(o);
root.sagsV344SyncAssignedCloseouts=o=>syncAssignedCloseouts(o);

let syncTimer=0;function scheduleActiveSync(){clearTimeout(syncTimer);syncTimer=setTimeout(()=>{const id=activeId();if(id)syncRecord(id,{notify:true})},360)}
function installHooks(){const open=root.openFinalSheetRecord;if(typeof open==="function"&&!open.__v344){const w=function(id){const out=open.apply(this,arguments);setTimeout(()=>syncRecord(id,{notify:true}),120);return out};w.__v344=true;root.openFinalSheetRecord=w;try{openFinalSheetRecord=w}catch(_){}}
  const manager=root.openFinalSheetManager;if(typeof manager==="function"&&!manager.__v344){const w=function(){const out=manager.apply(this,arguments);setTimeout(()=>bootstrapSync({notify:false}).then(()=>root.renderFinalSheetManager?.()),120);return out};w.__v344=true;root.openFinalSheetManager=w;try{openFinalSheetManager=w}catch(_){}}
  const save=root.ffSaveField;if(typeof save==="function"&&!save.__v344){const w=function(form,key,val){const out=save.apply(this,arguments);if(["date","flight","acreg"].includes(S(key)))scheduleActiveSync();return out};w.__v344=true;root.ffSaveField=w;try{ffSaveField=w}catch(_){}}
  const ensure=root.sagsV340EnsureFinalForRoster;if(typeof ensure==="function"&&!ensure.__v344){const w=async function(){const out=await ensure.apply(this,arguments);if(out?.record?.id)setTimeout(()=>syncRecord(out.record.id,{notify:true}),80);return out};w.__v344=true;root.sagsV340EnsureFinalForRoster=w}}
function installSignalMirrorHook(){
  const base=root.sagsV470Ref;if(typeof base!=="function"||base.__v344CloseoutMirror)return false;
  const w=function(path=""){
    const ref=base.apply(this,arguments);
    if(S(path)===`${INDEX_ROOT}`||S(path).startsWith(`${INDEX_ROOT}/`)||S(path)===IDENTITY_ROOT||S(path).startsWith(`${IDENTITY_ROOT}/`)||S(path)===EVENTS_ROOT||S(path).startsWith(`${EVENTS_ROOT}/`))return ref;
    if(S(path)==="closeout/latest"&&ref&&typeof ref.set==="function"&&!ref.set.__v344CloseoutMirror){
      const set=ref.set.bind(ref),setWrap=async function(value){
        const out=await set(value),p=value?.payload||null;
        if(p)try{
          await root.sagsV348PublishApprovedCloseout(p,S(value?.docId),{
            eventAtMs:Number(value?.eventAtMs||Date.now()),eventId:S(value?.eventId),
            sourceDeviceId:S(value?.sourceDeviceId),sourceUser:S(value?.sourceUser),
            sourceRole:S(value?.sourceRole),includeLatest:false
          });
        }catch(e){console.info("V3.55 publish approved closeout",e?.message||e)}
        return out;
      };
      setWrap.__v344CloseoutMirror=true;ref.set=setWrap;
    }
    return ref;
  };
  w.__v344CloseoutMirror=true;w.__v344CloseoutMirrorBase=base;root.sagsV470Ref=w;try{sagsV470Ref=w}catch(_){}return true;
}
function install(){installSignalMirrorHook();installHooks();/* V3.59 READ FIX: không quét toàn bộ danh sách FINAL lúc khởi động. Chỉ đồng bộ roster được giao qua RTDB; FINAL đang mở sẽ sync khi người dùng mở record. */setTimeout(()=>syncAssignedCloseouts({notify:false}),700)}
install();
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(install,80),{once:true});else setTimeout(install,80);root.addEventListener("pageshow",()=>setTimeout(install,180),{passive:true});root.addEventListener("online",()=>setTimeout(()=>bootstrapSync({notify:false}),300),{passive:true});
root.__SAGS_V344_BUILD=BUILD;
root.__SAGS_V344_TEST__={payloadDate,payloadReg,allPayloadFlights,targetFlights,flightTokens,lastFlight,payloadValues,fieldMap,formForPayload,tripMatches,matches,recordIdentity,applyRecord,ensureFinalRecord,payloadKey,hasSentFinal,rosterDepartureFlight};
})(typeof window!=="undefined"?window:globalThis);

}


/* ===== V3.93 BUNDLE PHASE layout ===== */
if((document.currentScript?.dataset?.phase||'')==='layout'){
/* ===== BUNDLED form-layout.js · V3.93 ===== */
/* SAGS shared form layout · generated by AD · do not edit by hand */
window.SAGS_PUBLISHED_FORM_LAYOUT={
  "schema": 5,
  "build": "V1.1.50",
  "publishedAt": 1787549082647,
  "forms": {
    "FSAGS423": {
      "group": "fsags",
      "name": "FSAGS42.3",
      "pages": [
        1,
        2
      ]
    },
    "FSAGS421": {
      "group": "fsags421",
      "name": "FSAGS42.1",
      "pages": [
        6,
        7
      ]
    },
    "FSAGS551": {
      "group": "fsags551",
      "name": "FSAGS55.1",
      "pages": [
        9,
        10
      ]
    },
    "FSAGS09": {
      "group": "fsags09",
      "name": "FSAGS09",
      "pages": [
        11,
        12
      ]
    },
    "FSAGS208": {
      "group": "loading208",
      "name": "FSAGS208",
      "pages": [
        13
      ]
    },
    "BBBT": {
      "group": "bbbt",
      "name": "BBBT",
      "pages": [
        4
      ]
    }
  },
  "fields": {
    "1:arrRemarks": {
      "dx": 41,
      "dy": 10,
      "fs": 23,
      "hx": -28,
      "hy": -2,
      "hw": 90,
      "hh": 0
    },
    "1:acType": {
      "hw": 76,
      "hh": 4,
      "hx": -42,
      "hy": 1,
      "fs": 23
    },
    "1:regn": {
      "hw": 82,
      "hh": 4,
      "hx": -35,
      "hy": 0,
      "fs": 23
    },
    "1:date": {
      "hw": 64,
      "hh": 4,
      "hx": -27,
      "hy": 0,
      "fs": 23
    },
    "1:yBag": {
      "hx": 0,
      "hy": -2,
      "hw": 20,
      "hh": -2,
      "fs": 23
    },
    "1:arrMail": {
      "hx": -1,
      "hy": -3,
      "hw": 26,
      "hh": 0,
      "fs": 23
    },
    "1:priorityBag": {
      "hx": -4,
      "hy": -3,
      "hw": 12,
      "hh": 0,
      "fs": 23
    },
    "1:arrCargo": {
      "hx": 0,
      "hy": -2,
      "fs": 23
    },
    "1:arrSpecial": {
      "hx": -32,
      "hy": -2,
      "hw": 66,
      "hh": 0,
      "fs": 23
    },
    "1:transit": {
      "fs": 23
    },
    "1:topSTCH": {
      "hx": 18,
      "hy": 2,
      "hw": 6,
      "hh": -8,
      "fs": 23,
      "dx": 0,
      "dy": 6
    },
    "1:topVIP": {
      "hx": 24,
      "hy": 2,
      "hw": -12,
      "hh": -6,
      "fs": 23,
      "dx": 0,
      "dy": 6
    },
    "1:topINAD": {
      "hw": -12,
      "hh": -10,
      "hx": 8,
      "hy": 2,
      "dx": 0,
      "dy": 6,
      "fs": 23
    },
    "1:topUM": {
      "hw": 0,
      "hh": -12,
      "hx": 3,
      "hy": 2,
      "fs": 23,
      "dx": 0,
      "dy": 6
    },
    "1:topWCHR": {
      "hw": 0,
      "hh": -10,
      "hx": -14,
      "hy": 3,
      "dx": -2,
      "dy": 6,
      "fs": 23
    },
    "1:lirNotoc": {
      "hw": 200,
      "hh": 24,
      "hx": -93,
      "hy": -16,
      "dx": 0,
      "dy": -1,
      "fs": 23
    },
    "1:othersTop": {
      "dx": 47,
      "dy": 6,
      "fs": 23,
      "hx": -46,
      "hy": -1,
      "hw": 26,
      "hh": -4
    },
    "1:conveyorBefore": {
      "fs": 23,
      "dx": 0,
      "dy": 0
    },
    "1:offloadBagStart": {
      "hx": 15,
      "hy": 0,
      "hw": -12,
      "hh": 0,
      "dx": 5,
      "dy": 0,
      "fs": 23
    },
    "1:offloadCargoStart": {
      "hx": 16,
      "hy": 0,
      "hw": -10,
      "hh": 0,
      "dx": 5,
      "dy": 3,
      "fs": 23
    },
    "1:arrDelayMins": {
      "dx": 4,
      "dy": 0,
      "hx": 6,
      "hy": 0,
      "fs": 23
    },
    "1:h8Finish": {
      "hx": 0,
      "hy": 1,
      "dx": 0,
      "dy": 3,
      "fs": 23
    },
    "1:h8Start": {
      "hw": 14,
      "hh": 4,
      "hx": 1,
      "hy": 1,
      "dx": 0,
      "dy": 3,
      "fs": 23
    },
    "1:offloadInfo": {
      "fs": 23
    },
    "1:b1INF": {
      "fs": 23,
      "dx": 0,
      "dy": 3
    },
    "1:b1CHD": {
      "fs": 23,
      "dx": 0,
      "dy": 3
    },
    "1:b1ADL": {
      "fs": 23,
      "dx": 0,
      "dy": 3
    },
    "1:b2INF": {
      "fs": 23,
      "dx": 0,
      "dy": 3
    },
    "1:b2CHD": {
      "fs": 23,
      "dx": 0,
      "dy": 3
    },
    "1:b2ADL": {
      "fs": 23,
      "dx": 0,
      "dy": 4
    },
    "1:b3INF": {
      "fs": 23,
      "dx": 3,
      "dy": 4
    },
    "1:b3CHD": {
      "fs": 23,
      "dx": 3,
      "dy": 4
    },
    "1:b3ADL": {
      "fs": 23,
      "dx": 3,
      "dy": 4
    },
    "1:lmcDetails": {
      "hx": 1,
      "hy": -14,
      "hw": 4,
      "hh": 28,
      "fs": 23,
      "dx": 0,
      "dy": 0
    },
    "1:bottomVIP": {
      "dx": 0,
      "dy": 6,
      "fs": 23
    },
    "1:bottomSTCH": {
      "dx": 0,
      "dy": 7,
      "fs": 23
    },
    "1:bottomINAD": {
      "dx": 0,
      "dy": 7,
      "fs": 23
    },
    "1:bottomUM": {
      "fs": 23,
      "dx": 0,
      "dy": 7
    },
    "1:bottomWCHR": {
      "dx": 0,
      "dy": 7,
      "fs": 23
    },
    "1:depDelayMins": {
      "dx": 0,
      "dy": 7,
      "fs": 23,
      "hw": -4,
      "hh": 0,
      "hx": -3,
      "hy": 0
    },
    "1:depDelayReason": {
      "dx": 56.7,
      "dy": 7.6,
      "fs": 23,
      "hx": 31,
      "hy": 0
    },
    "1:depRemarks": {
      "dx": 32.2,
      "dy": 10,
      "fs": 23,
      "hx": 11,
      "hy": 0,
      "hw": 0,
      "hh": -16
    },
    "2:continuation": {
      "dx": -1.1,
      "dy": 0.2,
      "hw": 0,
      "hh": 16,
      "hx": 0,
      "hy": 21,
      "lines": {
        "0": {
          "align": "left",
          "dx": 0,
          "dy": -6,
          "fs": 23,
          "italic": true
        },
        "1": {
          "align": "left",
          "dx": 0,
          "dy": -8,
          "fs": 23,
          "italic": true
        },
        "2": {
          "align": "left",
          "dx": 0,
          "dy": -7,
          "fs": 23,
          "italic": true
        },
        "3": {
          "align": "left",
          "fs": 23,
          "dx": 0,
          "dy": -3,
          "italic": true
        }
      },
      "fs": 23
    },
    "2:airComments": {
      "hw": 0,
      "hh": -34,
      "hx": 1.1,
      "hy": 20,
      "lines": {
        "0": {
          "align": "left",
          "dx": 0,
          "dy": -6,
          "fs": 23,
          "italic": true
        },
        "1": {
          "dx": 0,
          "dy": -6,
          "align": "left",
          "fs": 23,
          "italic": true
        },
        "2": {
          "align": "left",
          "fs": 23,
          "dx": 0,
          "dy": -6,
          "italic": true
        },
        "3": {
          "align": "left",
          "fs": 23,
          "dx": 0,
          "dy": -5,
          "italic": true
        },
        "4": {
          "align": "left",
          "fs": 23,
          "dx": -1,
          "dy": -5,
          "italic": true
        },
        "5": {
          "fs": 23,
          "dx": 0,
          "dy": 1,
          "align": "left"
        }
      },
      "fs": 23
    },
    "2:representativeName": {
      "dx": 15.5,
      "dy": 6.5,
      "hw": -4,
      "hh": -8,
      "hx": 4,
      "hy": -2,
      "fs": 23,
      "align": "left",
      "dw": 12,
      "dh": 0
    },
    "2:coordArrName": {
      "hw": 54,
      "hh": 0,
      "hx": -37.8,
      "hy": -3.3,
      "fs": 23,
      "dx": 10.3,
      "dy": -0.6,
      "align": "center",
      "dw": -36,
      "dh": 0
    },
    "2:coordDepName": {
      "hw": 76,
      "hh": 0,
      "hx": -24.4,
      "hy": 0,
      "fs": 23,
      "align": "center",
      "dx": 15,
      "dy": -0.3,
      "dw": -14,
      "dh": 0
    },
    "1:estimatedBag": {
      "fs": 21,
      "dx": 102.5,
      "dy": -2.6,
      "dw": -81
    },
    "1:bayBefore": {
      "dx": 3,
      "dy": -1,
      "fs": 23
    },
    "1:redName": {
      "align": "left",
      "dx": 7,
      "dy": 2,
      "hx": -15,
      "hy": 0,
      "fs": 23
    },
    "1:passengerStepAfter": {
      "fs": 23,
      "dx": 0,
      "dy": 0
    },
    "1:porterBefore": {
      "fs": 23,
      "dx": -4,
      "dy": 0
    },
    "1:operatorBefore": {
      "fs": 23,
      "dx": -2,
      "dy": 0
    },
    "1:porterAfter": {
      "fs": 23,
      "dx": 0,
      "dy": 1
    },
    "1:operatorAfter": {
      "dx": 0,
      "dy": 1,
      "fs": 23
    },
    "6:f421_depPaxTTL": {
      "dx": 0,
      "dy": 4,
      "fs": 23
    },
    "6:f421_depPaxC": {
      "dx": 0,
      "dy": 4,
      "fs": 23
    },
    "6:f421_depPaxY": {
      "dx": 0,
      "dy": 4,
      "fs": 23
    },
    "6:f421_depPaxI": {
      "dx": 1,
      "dy": 4,
      "fs": 23
    },
    "6:f421_arrPaxTTL": {
      "dx": 0,
      "dy": 4,
      "fs": 23
    },
    "6:f421_arrPaxC": {
      "dx": 0,
      "dy": 4,
      "fs": 23
    },
    "6:f421_arrPaxY": {
      "dx": -0.1,
      "dy": 4,
      "fs": 23
    },
    "6:f421_arrPaxI": {
      "dx": 0,
      "dy": 4,
      "fs": 23
    },
    "6:f421_route1": {
      "dx": 0,
      "dy": 3,
      "fs": 23
    },
    "6:f421_route2": {
      "dx": 0,
      "dy": 3,
      "fs": 23
    },
    "6:f421_route3": {
      "dx": 0,
      "dy": 4,
      "fs": 23
    },
    "6:f421_bookingF": {
      "dx": 0,
      "dy": 4,
      "fs": 23
    },
    "6:f421_bookingC": {
      "dx": -3,
      "dy": 3,
      "fs": 23,
      "align": "left"
    },
    "6:f421_bookingY": {
      "dx": 0,
      "dy": 4,
      "fs": 23
    },
    "6:f421_std": {
      "fs": 23,
      "dx": -11,
      "dy": 4
    },
    "6:f421_sta": {
      "dx": -11,
      "dy": 3,
      "fs": 23
    },
    "6:f421_eta": {
      "fs": 23,
      "dx": 0,
      "dy": 5
    },
    "6:f421_etd": {
      "fs": 23,
      "dx": -4,
      "dy": 6
    },
    "6:f421_othersTop": {
      "lines": {
        "0": {
          "dx": -3,
          "dy": -13,
          "fs": 23
        }
      },
      "fs": 23
    },
    "6:f421_othersTop2": {
      "fs": 23,
      "dx": 0,
      "dy": -4
    },
    "6:f421_topWCHR": {
      "dx": 2,
      "dy": 2,
      "fs": 23
    },
    "6:f421_topUM": {
      "dx": 2,
      "dy": 2,
      "fs": 23
    },
    "6:f421_topINAD": {
      "dx": 2,
      "dy": 2,
      "fs": 23
    },
    "6:f421_topSTCH": {
      "dx": 2,
      "dy": 2,
      "fs": 23
    },
    "6:f421_topVIP": {
      "dx": 2,
      "dy": 2,
      "fs": 23
    },
    "6:f421_h8Start": {
      "dx": 0,
      "dy": 3,
      "fs": 23
    },
    "6:f421_h8Finish": {
      "dx": 0,
      "dy": 3,
      "fs": 23
    },
    "6:f421_h7Start": {
      "dx": 0,
      "dy": 3,
      "fs": 23
    },
    "6:f421_h6Start": {
      "dx": 0,
      "dy": 3,
      "fs": 23
    },
    "6:f421_h5Start": {
      "dx": 0,
      "dy": 3,
      "fs": 23
    },
    "6:f421_arrRemarks": {
      "lines": {
        "0": {
          "fs": 23,
          "dx": 0,
          "dy": -13
        },
        "1": {
          "dx": 0,
          "dy": -14
        }
      },
      "fs": 23
    },
    "6:f421_h9Start": {
      "dx": 0,
      "dy": 2,
      "fs": 23
    },
    "6:f421_h9Finish": {
      "dx": 0,
      "dy": 2,
      "fs": 23
    },
    "6:f421_h10Start": {
      "dx": 0,
      "dy": 2,
      "fs": 23
    },
    "6:f421_h10Finish": {
      "dx": 0,
      "dy": 2,
      "fs": 23
    },
    "6:f421_h11Start": {
      "dx": 0,
      "dy": 2,
      "fs": 23
    },
    "6:f421_h11Finish": {
      "dx": 0,
      "dy": 2,
      "fs": 23
    },
    "6:f421_h12Start": {
      "dx": 0,
      "dy": 2,
      "fs": 23
    },
    "6:f421_h13Start": {
      "dx": 0,
      "dy": 2,
      "fs": 23
    },
    "6:f421_h14Start": {
      "dx": 0,
      "dy": 2,
      "fs": 23
    },
    "6:f421_h15Start": {
      "dx": 0,
      "dy": 2,
      "fs": 23
    },
    "6:f421_h16Start": {
      "dx": 0,
      "dy": 2,
      "fs": 23
    },
    "6:f421_h17Start": {
      "dx": 0,
      "dy": 2,
      "fs": 23
    },
    "6:f421_h17Finish": {
      "dx": 0,
      "dy": 2,
      "fs": 23
    },
    "6:f421_h18Start": {
      "dx": 0,
      "dy": 2,
      "fs": 23
    },
    "6:f421_h19Start": {
      "dx": 0,
      "dy": 2,
      "fs": 23
    },
    "6:f421_h20Start": {
      "dx": 0,
      "dy": 2,
      "fs": 23
    },
    "6:f421_h21Start": {
      "dx": 0,
      "dy": 2,
      "fs": 23
    },
    "6:f421_h22Start": {
      "dx": 0,
      "dy": 2,
      "fs": 23
    },
    "6:f421_h23Start": {
      "dx": 0,
      "dy": 2,
      "fs": 23
    },
    "6:f421_h24Start": {
      "dx": -1.2,
      "dy": 2,
      "fs": 23
    },
    "6:f421_b1TotalBags": {
      "dx": 0,
      "dy": 17.1,
      "fs": 23
    },
    "6:f421_b2TotalBags": {
      "dx": 0,
      "dy": 16.7,
      "fs": 23
    },
    "6:f421_b3TotalBags": {
      "dx": 2.2,
      "dy": 16.7,
      "fs": 23
    },
    "6:f421_b1ADL": {
      "fs": 23,
      "dx": -3,
      "dy": -2
    },
    "6:f421_b1TOTAL": {
      "fs": 23
    },
    "6:f421_boardTime1": {
      "fs": 23
    },
    "6:f421_b2INF": {
      "fs": 23,
      "dx": -5,
      "dy": -2
    },
    "6:f421_lmcDetails": {
      "lines": {
        "0": {
          "dx": 0,
          "dy": -26,
          "fs": 23
        },
        "1": {
          "dx": 0,
          "dy": -28,
          "fs": 23
        },
        "2": {
          "dx": 0,
          "dy": -3,
          "fs": 23
        },
        "3": {
          "dx": 0,
          "dy": -28,
          "fs": 23
        }
      },
      "fs": 23
    },
    "6:f421_bottomINAD": {
      "dx": 5,
      "dy": 0,
      "fs": 23
    },
    "6:f421_bottomSTCH": {
      "dx": 11,
      "dy": 0,
      "fs": 23
    },
    "6:f421_bottomVIP": {
      "dx": 25,
      "dy": 0,
      "fs": 23
    },
    "6:f421_bottomUM": {
      "dx": 6,
      "dy": 0,
      "fs": 23
    },
    "6:f421_bottomWCHR": {
      "dx": 6,
      "dy": 0,
      "fs": 23
    },
    "6:f421_depDelayMins": {
      "dx": 6,
      "dy": 1,
      "fs": 23
    },
    "6:f421_depDelayReason": {
      "dx": 5,
      "dy": 1,
      "fs": 23
    },
    "7:f421_continuation": {
      "lines": {
        "0": {
          "dx": 0,
          "dy": -14,
          "fs": 23,
          "italic": true
        },
        "1": {
          "dx": 0,
          "dy": -14,
          "fs": 23,
          "italic": true
        },
        "2": {
          "dx": 0,
          "dy": -14,
          "fs": 23,
          "italic": true
        },
        "3": {
          "dx": 0,
          "dy": -13,
          "fs": 23,
          "italic": true
        },
        "4": {
          "dx": -1.1,
          "dy": -11,
          "fs": 23,
          "italic": true
        },
        "5": {
          "dx": 0.1,
          "dy": -11.1,
          "fs": 23,
          "italic": true
        }
      },
      "fs": 23
    },
    "7:f421_representativeName": {
      "dx": 142,
      "dy": -4,
      "fs": 23,
      "hx": -55.5,
      "hy": -12.3,
      "hw": 114,
      "hh": 10
    },
    "7:f421_coordArrName": {
      "hx": -48.1,
      "hy": -8.2,
      "hw": 106,
      "hh": 0,
      "dx": 138,
      "dy": -4,
      "fs": 23,
      "align": "center"
    },
    "7:f421_coordDepName": {
      "hx": -49.9,
      "hy": -7.8,
      "hw": 98,
      "hh": 0,
      "dx": 119,
      "dy": -4,
      "fs": 23,
      "align": "center"
    },
    "9:f551_date": {
      "dx": 8,
      "dy": 3,
      "fs": 23,
      "hx": 0,
      "hy": 4
    },
    "9:f551_fltBefore": {
      "dx": 21,
      "dy": 3,
      "fs": 23,
      "hx": 0,
      "hy": 4
    },
    "9:f551_fltAfter": {
      "fs": 23,
      "dx": 0,
      "dy": 6,
      "hx": -1.1,
      "hy": 2.9
    },
    "9:f551_regn": {
      "hx": 0,
      "hy": 4,
      "dx": 0,
      "dy": 6,
      "fs": 23
    },
    "9:f551_route1": {
      "dx": 0,
      "dy": 6,
      "hx": 0,
      "hy": 4,
      "fs": 23
    },
    "9:f551_route3": {
      "dx": 0,
      "dy": 5,
      "hx": 0,
      "hy": 4,
      "fs": 23
    },
    "10:f551_handlingNotes": {
      "lines": {
        "0": {
          "fs": 23,
          "dx": -2.7,
          "dy": -4.1,
          "italic": true
        },
        "1": {
          "dx": -3.6,
          "dy": 7.5,
          "fs": 23,
          "italic": true
        },
        "2": {
          "dx": -3.1,
          "dy": 20.8,
          "fs": 23,
          "italic": true
        },
        "3": {
          "dx": -3.1,
          "dy": 35.2,
          "fs": 23,
          "italic": true
        },
        "4": {
          "dx": -3.7,
          "dy": 48.8,
          "fs": 23
        },
        "5": {
          "dx": 60.4,
          "dy": 304.4,
          "fs": 23,
          "hidden": true
        },
        "6": {
          "fs": 23,
          "dx": -3.9,
          "dy": 30.9,
          "hidden": true
        }
      },
      "fs": 23
    },
    "10:f551_airlineComment": {
      "lines": {
        "0": {
          "fs": 23,
          "dx": 0,
          "dy": -5,
          "italic": true
        },
        "1": {
          "dx": 0,
          "dy": 9,
          "fs": 23,
          "italic": true
        },
        "2": {
          "dx": 0,
          "dy": 21,
          "fs": 23,
          "italic": true
        },
        "3": {
          "dx": 0,
          "dy": 27,
          "fs": 23,
          "hidden": true
        }
      },
      "fs": 23
    },
    "10:f551_loadingStaffName": {
      "dx": 23.3,
      "dy": 7.9,
      "hx": 60,
      "hy": -1.1,
      "hw": 0,
      "hh": 18,
      "fs": 23
    },
    "10:f551_engineerName": {
      "hw": 0,
      "hh": 18,
      "fs": 23,
      "dx": 0,
      "dy": 8
    },
    "4:bbbtDuty1": {
      "dx": 58.2,
      "dy": 5,
      "align": "center",
      "fs": 23,
      "dw": -97.5
    },
    "4:bbbtDetail": {
      "lines": {
        "0": {
          "dx": 0.2,
          "dy": -25.8,
          "fs": 23
        },
        "1": {
          "dx": -0.7,
          "dy": -23.2,
          "fs": 23
        },
        "2": {
          "dx": -1.1,
          "dy": -21.8,
          "fs": 23
        },
        "3": {
          "dx": -0.8,
          "dy": -18.7,
          "fs": 23
        },
        "4": {
          "dx": -1.1,
          "dy": -16.3,
          "fs": 23
        },
        "5": {
          "dx": -1.2,
          "dy": -14.3,
          "fs": 23
        }
      },
      "fs": 23
    },
    "4:bbbtFoundWhileOtherText": {
      "dx": -4.4,
      "dy": 7.8,
      "align": "center",
      "fs": 23,
      "dw": 10
    },
    "4:bbbtDamageOtherText": {
      "hx": -20.8,
      "hy": -25.6,
      "lines": {
        "0": {
          "dx": -60.3,
          "dy": -9.2,
          "weight": "700",
          "align": "left",
          "fs": 23,
          "dw": 132.5
        },
        "1": {
          "dx": 23.5,
          "dy": -48.9,
          "fs": 23
        }
      },
      "fs": 23,
      "hw": 47.6
    },
    "4:bbbtHandlingOtherText": {
      "hx": -72.9,
      "hy": 15,
      "hw": 93.8,
      "hh": -2.5,
      "dx": -27.2,
      "dy": 13,
      "dw": -2.5,
      "weight": "700",
      "fs": 18.2,
      "align": "center"
    },
    "4:bbbtComment": {
      "lines": {
        "0": {
          "dx": 0,
          "dy": 6,
          "fs": 19
        },
        "1": {
          "dx": 0,
          "dy": 8,
          "fs": 19
        }
      },
      "hw": -36,
      "hh": -20,
      "hx": 0,
      "hy": 6.7,
      "fs": 23
    },
    "11:f09_date": {
      "dx": -5,
      "dy": 10,
      "fs": 23
    },
    "11:f09_fltAfter": {
      "dx": 0,
      "dy": -1,
      "fs": 23
    },
    "11:f09_fltBefore": {
      "dx": 0,
      "dy": -1,
      "fs": 23
    },
    "11:f09_counters": {
      "dx": 6,
      "dy": -1,
      "fs": 23
    },
    "11:f09_webCki": {
      "dx": 5,
      "dy": 0,
      "fs": 23
    },
    "11:f09_depUM": {
      "dx": 5,
      "dy": 0,
      "fs": 23
    },
    "11:f09_depWCH": {
      "dx": 15,
      "dy": -3,
      "fs": 27
    },
    "11:f09_spml": {
      "dx": 10,
      "dy": -2,
      "fs": 27
    },
    "11:f09_transferFrom": {
      "dx": 10,
      "dy": -2,
      "fs": 27
    },
    "11:f09_depNTL": {
      "dx": 8,
      "dy": -2,
      "fs": 25
    },
    "11:f09_fqtv": {
      "dx": 5,
      "dy": -2,
      "fs": 26
    },
    "11:f09_mon_briefRemark": {
      "dx": 10,
      "dy": 0,
      "fs": 23
    },
    "11:f09_mon_counterOpenRemark": {
      "dx": 10,
      "dy": 0,
      "fs": 23
    },
    "11:f09_mon_gateProcRemark": {
      "dx": 9,
      "dy": 0,
      "fs": 23
    },
    "11:f09_mon_checkAtaGateRemark": {
      "dx": 9,
      "dy": 0,
      "fs": 23
    },
    "11:f09_mon_preCloseRemark": {
      "dx": 10,
      "dy": 0,
      "fs": 23
    },
    "11:f09_mon_flightCloseRemark": {
      "dx": 10,
      "dy": 0,
      "fs": 23
    },
    "11:f09_mon_boardingRemark": {
      "dx": 10,
      "dy": 0,
      "fs": 23
    },
    "11:f09_mon_postMsgRemark": {
      "dx": 9,
      "dy": 0,
      "fs": 23
    },
    "11:f09_mon_checkAtaGateActual": {
      "dx": 0,
      "dy": 5,
      "fs": 23
    },
    "12:f09_totalExb": {
      "dx": 8,
      "dy": -2,
      "fs": 25
    },
    "12:f09_crewBagP": {
      "dx": 15,
      "dy": -3,
      "fs": 27
    },
    "12:f09_crewBagW": {
      "dx": 21,
      "dy": -3,
      "fs": 27
    },
    "12:f09_priorityP": {
      "dx": 21,
      "dy": -3,
      "fs": 27
    },
    "12:f09_priorityW": {
      "dx": 16,
      "dy": -3,
      "fs": 27
    },
    "12:f09_comatW": {
      "dx": 9.9,
      "dy": -2,
      "fs": 25
    },
    "12:f09_comatP": {
      "dx": 8,
      "dy": -2,
      "fs": 25
    },
    "12:f09_fimMco": {
      "dx": 13,
      "dy": -2,
      "fs": 25
    },
    "12:f09_extraCrewSeat": {
      "dx": 10,
      "dy": -2,
      "fs": 27
    },
    "12:f09_zone": {
      "dx": 34,
      "dy": -2,
      "fs": 28
    },
    "12:f09_siUM": {
      "dx": 21,
      "dy": -1,
      "fs": 24
    },
    "12:f09_siWCH": {
      "dx": 18,
      "dy": -1,
      "fs": 24
    },
    "12:f09_siSPML": {
      "dx": 19,
      "dy": -1,
      "fs": 24
    },
    "12:f09_siINAD": {
      "dx": 21,
      "dy": -1,
      "fs": 24
    },
    "12:f09_siOTHS": {
      "dx": 19.9,
      "dy": -2.1,
      "fs": 24
    },
    "12:f09_fqtv2": {
      "fs": 27,
      "dx": 5,
      "dy": -2
    },
    "12:f09_extraCrewTotal": {
      "fs": 27,
      "dx": 7,
      "dy": -2
    },
    "13:f208_flightNo": {
      "fs": 31
    },
    "13:f208_date": {
      "fs": 24,
      "dx": 8,
      "dy": 0
    },
    "13:f208_acType": {
      "dx": 12,
      "dy": 0,
      "fs": 25
    },
    "13:f208_etd": {
      "dx": 5,
      "dy": 0
    },
    "13:f208_route": {
      "fs": 25,
      "dx": 5,
      "dy": 5
    },
    "13:f208_awb1": {
      "dx": 0,
      "dy": 2
    },
    "13:f208_awb2": {
      "dx": 0,
      "dy": 2
    },
    "13:f208_awb3": {
      "dx": 0,
      "dy": 1.1
    },
    "13:f208_awb4": {
      "dx": 0,
      "dy": 1.6
    },
    "13:f208_awb5": {
      "dx": 0,
      "dy": 4.7
    },
    "13:f208_awb6": {
      "dx": 0,
      "dy": 4.3
    },
    "13:f208_awb7": {
      "dx": -0.9,
      "dy": 3.4
    },
    "13:f208_totalPieces1": {
      "dx": 0,
      "dy": 1.3
    },
    "13:f208_totalPieces2": {
      "dx": -0.9,
      "dy": 2
    },
    "13:f208_totalPieces3": {
      "dx": 0,
      "dy": 2.8
    },
    "13:f208_totalPieces4": {
      "dx": 0,
      "dy": 3.6
    },
    "13:f208_totalPieces5": {
      "dx": 0.9,
      "dy": 2
    },
    "13:f208_totalPieces6": {
      "dx": 1.1,
      "dy": 4.8
    },
    "13:f208_totalPieces7": {
      "dx": 1,
      "dy": 3.7
    },
    "13:f208_dest7": {
      "dx": 3.7,
      "dy": 12.3
    },
    "13:f208_dest6": {
      "dx": 0.9,
      "dy": 16
    },
    "13:f208_dest5": {
      "dx": 1.8,
      "dy": 10.4
    },
    "13:f208_dest4": {
      "dx": 3.7,
      "dy": 8.6
    },
    "13:f208_dest3": {
      "dx": 0,
      "dy": -1.2
    },
    "13:f208_dest2": {
      "dx": 0,
      "dy": 3.6
    },
    "13:f208_dest1": {
      "dx": 0,
      "dy": 1.2
    },
    "13:f208_uld1": {
      "fs": 29,
      "dx": -2.5,
      "dy": 0,
      "dw": 76.6
    },
    "13:f208_uld2": {
      "fs": 30,
      "dx": -0.9,
      "dy": 0,
      "dw": 72.4
    },
    "13:f208_uld3": {
      "dx": -1,
      "dy": 0,
      "fs": 30,
      "dw": 74.9
    },
    "13:f208_uld4": {
      "fs": 29,
      "dx": 0.6,
      "dy": 0,
      "dw": 73.2,
      "dh": 0
    },
    "13:f208_uld5": {
      "fs": 30,
      "dx": -1.5,
      "dy": 0,
      "dw": 69.9
    },
    "13:f208_liningQty": {
      "dx": 17.1,
      "dy": -9.4,
      "fs": 22,
      "dh": 11.6
    },
    "13:f208_strapQty": {
      "dx": 16.9,
      "dy": -9.5,
      "fs": 22,
      "dh": 18.2
    },
    "13:f208_waterproofQty": {
      "dx": 17.4,
      "dy": -13.8,
      "fs": 22,
      "dh": 13.3
    },
    "13:f208_nylonQty": {
      "dx": 16.7,
      "dy": -9.9,
      "fs": 22,
      "dh": 16.7
    },
    "4:bbbtDuty2": {
      "align": "center",
      "fs": 23,
      "dx": 40,
      "dy": 5,
      "dw": -37.5
    },
    "4:bbbtDuty3": {
      "align": "center",
      "fs": 23,
      "dx": 36.3,
      "dy": 4,
      "dw": -34.9
    },
    "4:bbbtPerson1": {
      "align": "center",
      "fs": 23,
      "dx": 0,
      "dy": 5,
      "dw": -7.6
    },
    "4:bbbtPerson2": {
      "align": "center",
      "dx": -3.8,
      "dy": 5,
      "fs": 23,
      "dw": 30.1
    },
    "4:bbbtPerson3": {
      "align": "center",
      "dw": 28.9,
      "dh": 0,
      "fs": 23,
      "dx": -2.5,
      "dy": 4
    },
    "1:fltBefore": {
      "fs": 23
    },
    "1:fltAfter": {
      "fs": 23
    },
    "1:route1": {
      "fs": 23
    },
    "1:route2": {
      "fs": 23
    },
    "1:route3": {
      "fs": 23
    },
    "1:sta": {
      "fs": 23
    },
    "1:eta": {
      "fs": 23
    },
    "1:std": {
      "fs": 23
    },
    "1:etd": {
      "fs": 23
    },
    "1:depCargo": {
      "fs": 23,
      "dx": 0,
      "dy": -1
    },
    "1:depMail": {
      "fs": 23,
      "dx": 0,
      "dy": -1
    },
    "1:depSpecial": {
      "fs": 23,
      "dx": 0,
      "dy": -1
    },
    "1:b1TOTAL": {
      "fs": 23
    },
    "1:b2TOTAL": {
      "fs": 23
    },
    "1:b3TOTAL": {
      "fs": 23
    },
    "1:b1TotalBags": {
      "fs": 23
    },
    "1:b2TotalBags": {
      "fs": 23
    },
    "1:b3TotalBags": {
      "fs": 23
    },
    "2:bag0pcs": {
      "fs": 23
    },
    "2:bag0dest": {
      "fs": 23
    },
    "2:bag0tag": {
      "fs": 23
    },
    "2:bag0uldNo": {
      "fs": 23
    },
    "2:bag0uldPos": {
      "fs": 23
    },
    "2:bag0pos": {
      "fs": 23
    },
    "2:bag1pcs": {
      "fs": 23
    },
    "2:bag1dest": {
      "fs": 23
    },
    "2:bag1tag": {
      "fs": 23
    },
    "2:bag1uldNo": {
      "fs": 23
    },
    "2:bag1uldPos": {
      "fs": 23
    },
    "2:bag1pos": {
      "fs": 23
    },
    "2:bag2pcs": {
      "fs": 23
    },
    "2:bag2dest": {
      "fs": 23
    },
    "2:bag2tag": {
      "fs": 23
    },
    "2:bag2uldNo": {
      "fs": 23
    },
    "2:bag2uldPos": {
      "fs": 23
    },
    "2:bag2pos": {
      "fs": 23
    },
    "2:bag3pcs": {
      "fs": 23
    },
    "2:bag3dest": {
      "fs": 23
    },
    "2:bag3tag": {
      "fs": 23
    },
    "2:bag3uldNo": {
      "fs": 23
    },
    "2:bag3uldPos": {
      "fs": 23
    },
    "2:bag3pos": {
      "fs": 23
    },
    "2:bag4pcs": {
      "fs": 23
    },
    "2:bag4dest": {
      "fs": 23
    },
    "2:bag4tag": {
      "fs": 23
    },
    "2:bag4uldNo": {
      "fs": 23
    },
    "2:bag4uldPos": {
      "fs": 23
    },
    "2:bag4pos": {
      "fs": 23
    },
    "2:bag5pcs": {
      "fs": 23
    },
    "2:bag5dest": {
      "fs": 23
    },
    "2:bag5tag": {
      "fs": 23
    },
    "2:bag5uldNo": {
      "fs": 23
    },
    "2:bag5uldPos": {
      "fs": 23
    },
    "2:bag5pos": {
      "fs": 23
    },
    "1:bayAfter": {
      "fs": 23
    },
    "1:arrPaxTTL": {
      "fs": 23
    },
    "1:arrPaxC": {
      "fs": 23
    },
    "1:arrPaxY": {
      "fs": 23
    },
    "1:arrPaxI": {
      "fs": 23
    },
    "1:bookingF": {
      "fs": 23,
      "dx": 7,
      "dy": 0
    },
    "1:bookingC": {
      "fs": 23
    },
    "1:bookingY": {
      "fs": 23
    },
    "1:depPaxTTL": {
      "fs": 23
    },
    "1:depPaxC": {
      "fs": 23
    },
    "1:depPaxY": {
      "fs": 23
    },
    "1:depPaxI": {
      "fs": 23
    },
    "1:passengerStepBefore": {
      "fs": 23
    },
    "1:conveyorAfter": {
      "fs": 23
    },
    "1:tractorBefore": {
      "fs": 23
    },
    "1:tractorAfter": {
      "fs": 23
    },
    "1:h5Start": {
      "fs": 23
    },
    "1:h6Start": {
      "fs": 23
    },
    "1:h7Start": {
      "fs": 23
    },
    "1:h9Start": {
      "fs": 23
    },
    "1:h10Start": {
      "fs": 23
    },
    "1:h11Start": {
      "fs": 23
    },
    "1:h12Start": {
      "fs": 23
    },
    "1:h13Start": {
      "fs": 23
    },
    "1:h14Start": {
      "fs": 23
    },
    "1:h15Start": {
      "fs": 23
    },
    "1:h16Start": {
      "fs": 23
    },
    "1:h17Start": {
      "fs": 23
    },
    "1:h18Start": {
      "fs": 23
    },
    "1:h19Start": {
      "fs": 23
    },
    "1:h20Start": {
      "fs": 23
    },
    "1:h21Start": {
      "fs": 23
    },
    "1:h9Finish": {
      "fs": 23
    },
    "1:h10Finish": {
      "fs": 23
    },
    "1:h11Finish": {
      "fs": 23
    },
    "1:h17Finish": {
      "fs": 23
    },
    "1:h22Start": {
      "fs": 23
    },
    "1:h23Start": {
      "fs": 23
    },
    "1:h24Start": {
      "fs": 23
    },
    "1:offloadBagFinish": {
      "fs": 23
    },
    "1:offloadCargoFinish": {
      "fs": 23
    },
    "1:onloadCargoStart": {
      "fs": 23
    },
    "1:onloadCargoFinish": {
      "fs": 23
    },
    "1:onloadBagStart": {
      "fs": 23
    },
    "1:onloadBagFinish": {
      "fs": 23
    },
    "1:onloadCargoMailTime": {
      "fs": 23
    },
    "1:checkInClosedTime": {
      "fs": 23
    },
    "1:boardTime1": {
      "fs": 23
    },
    "1:boardTime2": {
      "fs": 23
    },
    "1:boardTime3": {
      "fs": 23
    },
    "2:bag0notified": {
      "fs": 23
    },
    "2:bag0completed": {
      "fs": 23
    },
    "2:bag0reload": {
      "fs": 23
    },
    "2:bag1notified": {
      "fs": 23
    },
    "2:bag1completed": {
      "fs": 23
    },
    "2:bag1reload": {
      "fs": 23
    },
    "2:bag2notified": {
      "fs": 23
    },
    "2:bag2completed": {
      "fs": 23
    },
    "2:bag2reload": {
      "fs": 23
    },
    "2:bag3notified": {
      "fs": 23
    },
    "2:bag3completed": {
      "fs": 23
    },
    "2:bag3reload": {
      "fs": 23
    },
    "2:bag4notified": {
      "fs": 23
    },
    "2:bag4completed": {
      "fs": 23
    },
    "2:bag4reload": {
      "fs": 23
    },
    "2:bag5notified": {
      "fs": 23
    },
    "2:bag5completed": {
      "fs": 23
    },
    "2:bag5reload": {
      "fs": 23
    },
    "6:f421_date": {
      "dx": 0,
      "dy": 4,
      "fs": 23
    },
    "6:f421_fltBefore": {
      "dx": 0,
      "dy": 3,
      "fs": 23
    },
    "6:f421_fltAfter": {
      "dx": 0,
      "dy": 3,
      "fs": 23
    },
    "6:f421_acType": {
      "dx": 0,
      "dy": 3,
      "fs": 23
    },
    "6:f421_regn": {
      "dx": 0,
      "dy": 3,
      "fs": 23
    },
    "6:f421_arrDelayMins": {
      "fs": 23
    },
    "6:f421_b2TOTAL": {
      "fs": 23
    },
    "6:f421_b3TOTAL": {
      "fs": 23
    },
    "6:f421_depRemarks": {
      "fs": 23,
      "lines": {
        "0": {
          "dx": 0,
          "dy": -13
        },
        "1": {
          "dx": 0,
          "dy": -13
        },
        "2": {
          "dx": 0,
          "dy": -12
        },
        "3": {
          "dx": 0,
          "dy": -12
        }
      }
    },
    "7:f421_continuation2": {
      "fs": 23
    },
    "7:f421_offDest1": {
      "fs": 23
    },
    "7:f421_offTag1": {
      "fs": 23
    },
    "7:f421_offUld1": {
      "fs": 23
    },
    "7:f421_offReloadPos1": {
      "fs": 23
    },
    "7:f421_offDest2": {
      "fs": 23
    },
    "7:f421_offTag2": {
      "fs": 23
    },
    "7:f421_offUld2": {
      "fs": 23
    },
    "7:f421_offReloadPos2": {
      "fs": 23
    },
    "7:f421_offDest3": {
      "fs": 23
    },
    "7:f421_offTag3": {
      "fs": 23
    },
    "7:f421_offUld3": {
      "fs": 23
    },
    "7:f421_offReloadPos3": {
      "fs": 23
    },
    "7:f421_offDest4": {
      "fs": 23
    },
    "7:f421_offTag4": {
      "fs": 23
    },
    "7:f421_offUld4": {
      "fs": 23
    },
    "7:f421_offReloadPos4": {
      "fs": 23
    },
    "7:f421_offDest5": {
      "fs": 23
    },
    "7:f421_offTag5": {
      "fs": 23
    },
    "7:f421_offUld5": {
      "fs": 23
    },
    "7:f421_offReloadPos5": {
      "fs": 23
    },
    "7:f421_offDest6": {
      "fs": 23
    },
    "7:f421_offTag6": {
      "fs": 23
    },
    "7:f421_offUld6": {
      "fs": 23
    },
    "7:f421_offReloadPos6": {
      "fs": 23
    },
    "6:f421_bayBefore": {
      "fs": 23
    },
    "6:f421_bayAfter": {
      "fs": 23
    },
    "6:f421_boardTime2": {
      "fs": 23
    },
    "6:f421_boardTime3": {
      "fs": 23
    },
    "6:f421_b1CHD": {
      "fs": 23,
      "dx": -5,
      "dy": -2
    },
    "6:f421_b1INF": {
      "fs": 23,
      "dx": -5,
      "dy": -2
    },
    "6:f421_b2ADL": {
      "fs": 23,
      "dx": -5,
      "dy": -2
    },
    "6:f421_b2CHD": {
      "fs": 23,
      "dx": -5,
      "dy": -2
    },
    "6:f421_b3ADL": {
      "fs": 23,
      "dx": -7,
      "dy": -2
    },
    "6:f421_b3CHD": {
      "fs": 23,
      "dx": -7,
      "dy": -2
    },
    "6:f421_b3INF": {
      "fs": 23,
      "dx": -6,
      "dy": -2
    },
    "7:f421_offPcs1": {
      "fs": 23
    },
    "7:f421_offNotified1": {
      "fs": 23
    },
    "7:f421_offCompleted1": {
      "fs": 23
    },
    "7:f421_offReloadTime1": {
      "fs": 23
    },
    "7:f421_offPcs2": {
      "fs": 23
    },
    "7:f421_offNotified2": {
      "fs": 23
    },
    "7:f421_offCompleted2": {
      "fs": 23
    },
    "7:f421_offReloadTime2": {
      "fs": 23
    },
    "7:f421_offPcs3": {
      "fs": 23
    },
    "7:f421_offNotified3": {
      "fs": 23
    },
    "7:f421_offCompleted3": {
      "fs": 23
    },
    "7:f421_offReloadTime3": {
      "fs": 23
    },
    "7:f421_offPcs4": {
      "fs": 23
    },
    "7:f421_offNotified4": {
      "fs": 23
    },
    "7:f421_offCompleted4": {
      "fs": 23
    },
    "7:f421_offReloadTime4": {
      "fs": 23
    },
    "7:f421_offPcs5": {
      "fs": 23
    },
    "7:f421_offNotified5": {
      "fs": 23
    },
    "7:f421_offCompleted5": {
      "fs": 23
    },
    "7:f421_offReloadTime5": {
      "fs": 23
    },
    "7:f421_offPcs6": {
      "fs": 23
    },
    "7:f421_offNotified6": {
      "fs": 23
    },
    "7:f421_offCompleted6": {
      "fs": 23
    },
    "7:f421_offReloadTime6": {
      "fs": 23
    },
    "9:f551_acType": {
      "fs": 23
    },
    "9:f551_bay": {
      "fs": 23
    },
    "9:f551_arrFCBag": {
      "fs": 23
    },
    "9:f551_arrYBag": {
      "fs": 23
    },
    "9:f551_arrCargo": {
      "fs": 23
    },
    "9:f551_arrMail": {
      "fs": 23
    },
    "9:f551_arrSpecial": {
      "fs": 23
    },
    "9:f551_transit_bag": {
      "fs": 23
    },
    "9:f551_actual_bag": {
      "fs": 23
    },
    "9:f551_transit_cargo": {
      "fs": 23
    },
    "9:f551_actual_cargo": {
      "fs": 23
    },
    "9:f551_transit_mail": {
      "fs": 23
    },
    "9:f551_actual_mail": {
      "fs": 23
    },
    "9:f551_depCargo": {
      "fs": 23
    },
    "9:f551_depMail": {
      "fs": 23
    },
    "9:f551_depSpecial": {
      "fs": 23
    },
    "9:f551_estimatedBag": {
      "fs": 23
    },
    "9:f551_briefing": {
      "fs": 23
    },
    "9:f551_driver1": {
      "fs": 23
    },
    "9:f551_driver2": {
      "fs": 23
    },
    "9:f551_porter1": {
      "fs": 23
    },
    "9:f551_porter2": {
      "fs": 23
    },
    "9:f551_step1": {
      "fs": 23
    },
    "9:f551_step2": {
      "fs": 23
    },
    "9:f551_belt1": {
      "fs": 23
    },
    "9:f551_belt2": {
      "fs": 23
    },
    "9:f551_tractor1": {
      "fs": 23
    },
    "9:f551_tractor2": {
      "fs": 23
    },
    "9:f551_loader1": {
      "fs": 23
    },
    "9:f551_loader2": {
      "fs": 23
    },
    "9:f551_inFCRemark": {
      "fs": 23
    },
    "9:f551_inYRemark": {
      "fs": 23
    },
    "9:f551_inCargoRemark": {
      "fs": 23
    },
    "10:f551_outCargoMailSideRemark": {
      "fs": 23
    },
    "10:f551_outCargoULDRemark": {
      "fs": 23
    },
    "10:f551_outBagULDRemark": {
      "fs": 23
    },
    "10:f551_confirmPlannerRemark": {
      "fs": 23
    },
    "10:f551_confirmBagSectionRemark": {
      "fs": 23
    },
    "10:f551_cargoDoorsClosedRemark": {
      "fs": 23
    },
    "10:f551_offDest1": {
      "fs": 23
    },
    "10:f551_offTag1": {
      "fs": 23
    },
    "10:f551_offUld1": {
      "fs": 23
    },
    "10:f551_offReloadPos1": {
      "fs": 23
    },
    "10:f551_offDest2": {
      "fs": 23
    },
    "10:f551_offTag2": {
      "fs": 23
    },
    "10:f551_offUld2": {
      "fs": 23
    },
    "10:f551_offReloadPos2": {
      "fs": 23
    },
    "10:f551_offDest3": {
      "fs": 23
    },
    "10:f551_offTag3": {
      "fs": 23
    },
    "10:f551_offUld3": {
      "fs": 23
    },
    "10:f551_offReloadPos3": {
      "fs": 23
    },
    "10:f551_offDest4": {
      "fs": 23
    },
    "10:f551_offTag4": {
      "fs": 23
    },
    "10:f551_offUld4": {
      "fs": 23
    },
    "10:f551_offReloadPos4": {
      "fs": 23
    },
    "10:f551_offDest5": {
      "fs": 23
    },
    "10:f551_offTag5": {
      "fs": 23
    },
    "10:f551_offUld5": {
      "fs": 23
    },
    "10:f551_offReloadPos5": {
      "fs": 23
    },
    "10:f551_reasonText": {
      "fs": 23
    },
    "9:f551_sta": {
      "fs": 23
    },
    "9:f551_eta": {
      "fs": 23
    },
    "9:f551_ata1": {
      "fs": 23
    },
    "9:f551_ata2": {
      "fs": 23
    },
    "9:f551_std": {
      "fs": 23
    },
    "9:f551_etd": {
      "fs": 23
    },
    "9:f551_atd1": {
      "fs": 23
    },
    "9:f551_atd2": {
      "fs": 23
    },
    "9:f551_lirNotoc": {
      "fs": 23
    },
    "10:f551_confirmPlannerPlanned": {
      "fs": 23
    },
    "10:f551_confirmPlannerActual": {
      "fs": 23
    },
    "10:f551_confirmBagSectionPlanned": {
      "fs": 23
    },
    "10:f551_confirmBagSectionActual": {
      "fs": 23
    },
    "10:f551_cargoDoorsClosedPlanned": {
      "fs": 23
    },
    "10:f551_cargoDoorsClosedActual": {
      "fs": 23
    },
    "10:f551_offPcs1": {
      "fs": 23
    },
    "10:f551_offNotified1": {
      "fs": 23
    },
    "10:f551_offCompleted1": {
      "fs": 23
    },
    "10:f551_offReloadTime1": {
      "fs": 23
    },
    "10:f551_offPcs2": {
      "fs": 23
    },
    "10:f551_offNotified2": {
      "fs": 23
    },
    "10:f551_offCompleted2": {
      "fs": 23
    },
    "10:f551_offReloadTime2": {
      "fs": 23
    },
    "10:f551_offPcs3": {
      "fs": 23
    },
    "10:f551_offNotified3": {
      "fs": 23
    },
    "10:f551_offCompleted3": {
      "fs": 23
    },
    "10:f551_offReloadTime3": {
      "fs": 23
    },
    "10:f551_offPcs4": {
      "fs": 23
    },
    "10:f551_offNotified4": {
      "fs": 23
    },
    "10:f551_offCompleted4": {
      "fs": 23
    },
    "10:f551_offReloadTime4": {
      "fs": 23
    },
    "10:f551_offPcs5": {
      "fs": 23
    },
    "10:f551_offNotified5": {
      "fs": 23
    },
    "10:f551_offCompleted5": {
      "fs": 23
    },
    "10:f551_offReloadTime5": {
      "fs": 23
    },
    "9:f551_inFCPlannedBefore": {
      "fs": 23
    },
    "9:f551_inFCPlannedAfter": {
      "fs": 23
    },
    "9:f551_inFCActualBefore": {
      "fs": 23
    },
    "9:f551_inFCActualAfter": {
      "fs": 23
    },
    "9:f551_inYPlannedBefore": {
      "fs": 23
    },
    "9:f551_inYPlannedAfter": {
      "fs": 23
    },
    "9:f551_inYActualBefore": {
      "fs": 23
    },
    "9:f551_inYActualAfter": {
      "fs": 23
    },
    "9:f551_inCargoPlannedBefore": {
      "fs": 23
    },
    "9:f551_inCargoPlannedAfter": {
      "fs": 23
    },
    "9:f551_inCargoActualBefore": {
      "fs": 23
    },
    "9:f551_inCargoActualAfter": {
      "fs": 23
    },
    "10:f551_outCargoMailSidePlannedBefore": {
      "fs": 23
    },
    "10:f551_outCargoMailSidePlannedAfter": {
      "fs": 23
    },
    "10:f551_outCargoMailSideActualBefore": {
      "fs": 23
    },
    "10:f551_outCargoMailSideActualAfter": {
      "fs": 23
    },
    "10:f551_outCargoULDPlannedBefore": {
      "fs": 23
    },
    "10:f551_outCargoULDPlannedAfter": {
      "fs": 23
    },
    "10:f551_outCargoULDActualBefore": {
      "fs": 23
    },
    "10:f551_outCargoULDActualAfter": {
      "fs": 23
    },
    "10:f551_outBagULDPlannedBefore": {
      "fs": 23
    },
    "10:f551_outBagULDPlannedAfter": {
      "fs": 23
    },
    "10:f551_outBagULDActualBefore": {
      "fs": 23
    },
    "10:f551_outBagULDActualAfter": {
      "fs": 23
    },
    "4:bbbtFlight": {
      "fs": 23
    },
    "4:bbbtRegn": {
      "fs": 23
    },
    "4:bbbtAcType": {
      "fs": 23
    },
    "4:bbbtDateText": {
      "fs": 23
    },
    "4:bbbtRoute": {
      "fs": 23,
      "dx": 66.3,
      "dw": -132.5
    },
    "4:bbbtFoundOtherText": {
      "fs": 23
    },
    "4:bbbtReportAt": {
      "fs": 23
    },
    "11:f09_acType": {
      "fs": 23
    },
    "11:f09_regn": {
      "fs": 23
    },
    "11:f09_route1": {
      "fs": 23
    },
    "11:f09_route3": {
      "fs": 23
    },
    "11:f09_parkingArr": {
      "fs": 23
    },
    "11:f09_gateArr": {
      "fs": 23
    },
    "11:f09_arrUM": {
      "fs": 23
    },
    "11:f09_arrWCH": {
      "fs": 23
    },
    "11:f09_transferTo": {
      "fs": 23
    },
    "11:f09_transitTo": {
      "fs": 23
    },
    "11:f09_arrNTL": {
      "fs": 23
    },
    "11:f09_parkingDep": {
      "fs": 23
    },
    "11:f09_gateDep": {
      "fs": 23
    },
    "11:f09_briefingContent": {
      "fs": 23
    },
    "11:f09_supA1": {
      "fs": 23
    },
    "11:f09_supB1": {
      "fs": 23
    },
    "11:f09_supC1": {
      "fs": 23
    },
    "11:f09_supD1": {
      "fs": 23
    },
    "11:f09_supA2": {
      "fs": 23
    },
    "11:f09_supB2": {
      "fs": 23
    },
    "11:f09_supC2": {
      "fs": 23
    },
    "11:f09_supD2": {
      "fs": 23
    },
    "11:f09_supA3": {
      "fs": 23
    },
    "11:f09_supB3": {
      "fs": 23
    },
    "11:f09_supC3": {
      "fs": 23
    },
    "11:f09_supD3": {
      "fs": 23
    },
    "11:f09_supA4": {
      "fs": 23
    },
    "11:f09_supB4": {
      "fs": 23
    },
    "11:f09_supC4": {
      "fs": 23
    },
    "11:f09_supD4": {
      "fs": 23
    },
    "11:f09_supA5": {
      "fs": 23
    },
    "11:f09_supB5": {
      "fs": 23
    },
    "11:f09_supC5": {
      "fs": 23
    },
    "11:f09_supD5": {
      "fs": 23
    },
    "12:f09_oversize": {
      "fs": 26,
      "dx": 0,
      "dy": -2
    },
    "12:f09_handlingNotes": {
      "fs": 23
    },
    "12:f09_repComments": {
      "fs": 23
    },
    "11:f09_supA1_2": {
      "fs": 23
    },
    "11:f09_supB1_2": {
      "fs": 23
    },
    "11:f09_supC1_2": {
      "fs": 23
    },
    "11:f09_supD1_2": {
      "fs": 23
    },
    "11:f09_supA2_2": {
      "fs": 23
    },
    "11:f09_supB2_2": {
      "fs": 23
    },
    "11:f09_supC2_2": {
      "fs": 23
    },
    "11:f09_supD2_2": {
      "fs": 23
    },
    "11:f09_supA3_2": {
      "fs": 23
    },
    "11:f09_supB3_2": {
      "fs": 23
    },
    "11:f09_supC3_2": {
      "fs": 23
    },
    "11:f09_supD3_2": {
      "fs": 23
    },
    "11:f09_supA4_2": {
      "fs": 23
    },
    "11:f09_supB4_2": {
      "fs": 23
    },
    "11:f09_supC4_2": {
      "fs": 23
    },
    "11:f09_supD4_2": {
      "fs": 23
    },
    "11:f09_supA5_2": {
      "fs": 23
    },
    "11:f09_supB5_2": {
      "fs": 23
    },
    "11:f09_supC5_2": {
      "fs": 23
    },
    "11:f09_supD5_2": {
      "fs": 23
    },
    "11:f09_sta": {
      "fs": 23,
      "dx": 0,
      "dy": 9
    },
    "11:f09_eta": {
      "fs": 23,
      "dx": 0,
      "dy": 9
    },
    "11:f09_ata": {
      "fs": 23,
      "dx": 0,
      "dy": 9
    },
    "11:f09_lateDuration": {
      "fs": 23
    },
    "11:f09_paxTTL": {
      "fs": 23
    },
    "11:f09_paxF": {
      "fs": 23
    },
    "11:f09_paxC": {
      "fs": 23
    },
    "11:f09_paxY": {
      "fs": 23
    },
    "11:f09_paxI": {
      "fs": 23
    },
    "11:f09_std": {
      "fs": 18,
      "dx": -4,
      "dy": 10
    },
    "11:f09_etd": {
      "fs": 17,
      "dx": -3,
      "dy": 10
    },
    "11:f09_atd": {
      "fs": 17,
      "dx": -3,
      "dy": 10
    },
    "11:f09_configF": {
      "fs": 24,
      "dx": 16,
      "dy": 1
    },
    "11:f09_configC": {
      "fs": 24,
      "dx": 16,
      "dy": 1
    },
    "11:f09_configY": {
      "fs": 24,
      "dx": 16,
      "dy": 1
    },
    "11:f09_booking": {
      "fs": 24,
      "dx": 16,
      "dy": 1
    },
    "11:f09_bookF": {
      "fs": 24,
      "dx": 16,
      "dy": 1
    },
    "11:f09_bookC": {
      "fs": 24,
      "dx": 16,
      "dy": 1
    },
    "11:f09_bookY": {
      "fs": 24,
      "dx": 16,
      "dy": 1
    },
    "11:f09_bookI": {
      "fs": 24,
      "dx": 16,
      "dy": 1
    },
    "11:f09_mon_briefPlan": {
      "fs": 23
    },
    "11:f09_mon_briefActual": {
      "fs": 23
    },
    "11:f09_mon_counterOpenPlan": {
      "fs": 23
    },
    "11:f09_mon_counterOpenActual": {
      "fs": 23
    },
    "11:f09_mon_gateProcPlan": {
      "fs": 23
    },
    "11:f09_mon_gateProcActual": {
      "fs": 23
    },
    "11:f09_mon_checkAtaGatePlan": {
      "fs": 23
    },
    "11:f09_mon_preClosePlan": {
      "fs": 23
    },
    "11:f09_mon_preCloseActual": {
      "fs": 23
    },
    "11:f09_mon_flightClosePlan": {
      "fs": 23
    },
    "11:f09_mon_flightCloseActual": {
      "fs": 23
    },
    "11:f09_mon_boardingPlan": {
      "fs": 23
    },
    "11:f09_mon_boardingActualStart": {
      "fs": 23
    },
    "11:f09_mon_boardingActualFinish": {
      "fs": 23
    },
    "11:f09_mon_postMsgPlan": {
      "fs": 23
    },
    "11:f09_mon_postMsgActual": {
      "fs": 23
    },
    "12:f09_ckiTTL": {
      "fs": 23
    },
    "12:f09_ckiADL": {
      "fs": 23
    },
    "12:f09_ckiCHD": {
      "fs": 23
    },
    "12:f09_ckiINF": {
      "fs": 23
    },
    "12:f09_ckiF": {
      "fs": 23
    },
    "12:f09_ckiC": {
      "fs": 23
    },
    "12:f09_ckiJMP": {
      "fs": 23
    },
    "12:f09_ckiBagP": {
      "fs": 23
    },
    "12:f09_ckiBagW": {
      "fs": 23
    },
    "12:f09_transferTTL": {
      "fs": 23
    },
    "12:f09_transferADL": {
      "fs": 23
    },
    "12:f09_transferCHD": {
      "fs": 23
    },
    "12:f09_transferINF": {
      "fs": 23
    },
    "12:f09_transferF": {
      "fs": 23
    },
    "12:f09_transferC": {
      "fs": 23
    },
    "12:f09_transferJMP": {
      "fs": 23
    },
    "12:f09_transferBagP": {
      "fs": 23
    },
    "12:f09_transferBagW": {
      "fs": 23
    },
    "12:f09_transitTTL": {
      "fs": 23
    },
    "12:f09_transitADL": {
      "fs": 23
    },
    "12:f09_transitCHD": {
      "fs": 23
    },
    "12:f09_transitINF": {
      "fs": 23
    },
    "12:f09_transitF": {
      "fs": 23
    },
    "12:f09_transitC": {
      "fs": 23
    },
    "12:f09_transitJMP": {
      "fs": 23
    },
    "12:f09_transitBagP": {
      "fs": 23
    },
    "12:f09_transitBagW": {
      "fs": 23
    },
    "12:f09_totalTTL": {
      "fs": 23
    },
    "12:f09_totalADL": {
      "fs": 23
    },
    "12:f09_totalCHD": {
      "fs": 23
    },
    "12:f09_totalINF": {
      "fs": 23
    },
    "12:f09_totalF": {
      "fs": 23
    },
    "12:f09_totalC": {
      "fs": 23
    },
    "12:f09_totalJMP": {
      "fs": 23
    },
    "12:f09_totalBagP": {
      "fs": 23
    },
    "12:f09_totalBagW": {
      "fs": 23
    },
    "12:f09_lmcTTL": {
      "fs": 23
    },
    "12:f09_lmcADL": {
      "fs": 23
    },
    "12:f09_lmcCHD": {
      "fs": 23
    },
    "12:f09_lmcINF": {
      "fs": 23
    },
    "12:f09_lmcF": {
      "fs": 23
    },
    "12:f09_lmcC": {
      "fs": 23
    },
    "12:f09_lmcJMP": {
      "fs": 23
    },
    "12:f09_lmcBagP": {
      "fs": 23
    },
    "12:f09_lmcBagW": {
      "fs": 23
    },
    "12:f09_finalTTL": {
      "fs": 23
    },
    "12:f09_finalADL": {
      "fs": 23
    },
    "12:f09_finalCHD": {
      "fs": 23
    },
    "12:f09_finalINF": {
      "fs": 23
    },
    "12:f09_finalF": {
      "fs": 23
    },
    "12:f09_finalC": {
      "fs": 23
    },
    "12:f09_finalJMP": {
      "fs": 23
    },
    "12:f09_finalBagP": {
      "fs": 23
    },
    "12:f09_finalBagW": {
      "fs": 23
    },
    "13:f208_priority1": {
      "dx": 33.7,
      "dy": 0,
      "fs": 27
    },
    "13:f208_priority2": {
      "dx": 34.7,
      "dy": 4.2,
      "fs": 27
    },
    "13:f208_priority3": {
      "dx": 32.7,
      "dy": 0,
      "fs": 27
    },
    "13:f208_priority4": {
      "dx": 30.6,
      "dy": 4.1,
      "fs": 27
    },
    "13:f208_priority5": {
      "dx": 26.4,
      "dy": 0,
      "fs": 27
    },
    "13:f208_g5Pieces_r1": {
      "dx": 2,
      "dy": 0
    },
    "13:f208_g5Pieces_r2": {
      "dx": 2,
      "dy": 0
    },
    "13:f208_g5Pieces_r3": {
      "dx": 2,
      "dy": 0
    },
    "13:f208_g5Pieces_r4": {
      "dx": 2,
      "dy": 0
    },
    "13:f208_g5Pieces_r5": {
      "dx": 2,
      "dy": 0
    },
    "13:f208_g5Pieces_r6": {
      "dx": 2,
      "dy": 0
    },
    "13:f208_g5Pieces_r7": {
      "dx": 2,
      "dy": 0
    },
    "13:f208_grossPieces5": {
      "dx": 2,
      "dy": 0,
      "fs": 22
    },
    "13:f208_g5Weight_r1": {},
    "13:f208_grossPieces1": {
      "fs": 22
    },
    "13:f208_grossWeight1": {
      "fs": 22
    },
    "13:f208_grossPieces2": {
      "fs": 22
    },
    "13:f208_grossWeight2": {
      "fs": 22
    },
    "13:f208_grossPieces3": {
      "fs": 22
    },
    "13:f208_grossWeight3": {
      "fs": 22
    },
    "13:f208_grossPieces4": {
      "fs": 22
    },
    "13:f208_grossWeight4": {
      "fs": 22
    },
    "13:f208_grossWeight5": {
      "fs": 22
    },
    "13:f208_totalPieces": {
      "fs": 22
    },
    "13:f208_totalWeight": {
      "fs": 22
    },
    "13:f208_netWeight1": {
      "fs": 22
    },
    "13:f208_netWeight2": {
      "fs": 22
    },
    "13:f208_netWeight3": {
      "fs": 22
    },
    "13:f208_netWeight4": {
      "fs": 22
    },
    "13:f208_netWeight5": {
      "fs": 22
    },
    "13:f208_tareWeight1": {
      "fs": 22,
      "dx": 0,
      "dy": 1
    },
    "13:f208_tareWeight2": {
      "fs": 22,
      "dx": 0,
      "dy": 1
    },
    "13:f208_tareWeight3": {
      "fs": 22,
      "dx": 0,
      "dy": 1
    },
    "13:f208_tareWeight4": {
      "fs": 22,
      "dx": 0,
      "dy": 1
    },
    "13:f208_tareWeight5": {
      "fs": 22,
      "dx": 0,
      "dy": 1
    },
    "13:f208_remark": {
      "lines": {
        "0": {
          "dx": -369.7,
          "dw": -738.8,
          "dy": 27.9,
          "dh": 57.4,
          "align": "center"
        },
        "1": {
          "dx": -217.6,
          "dy": 8.6,
          "dh": 59.3,
          "dw": -740.6,
          "align": "center"
        },
        "2": {
          "dx": 87.3,
          "dw": -744.8,
          "dy": -19.9,
          "dh": 62.3
        },
        "3": {
          "dx": -64.8,
          "dw": -740.6,
          "dy": -26.9,
          "dh": 64.8
        }
      },
      "hx": -369.6,
      "hw": -749.1,
      "hy": 3.4,
      "extraZones": [
        {
          "hx": -213.9,
          "hy": 3.4,
          "hw": -744.1,
          "hh": 0,
          "dx": 232.9,
          "dy": 3.3,
          "dw": -754.1,
          "dh": 0,
          "fs": 0,
          "align": "left",
          "weight": "700",
          "italic": false,
          "underline": false,
          "hidden": true,
          "dataId": "xzmt6p6f75ru6lmh"
        },
        {
          "hx": -62.5,
          "hy": -1.6,
          "hw": -744.1,
          "hh": 0,
          "dx": 232.9,
          "dy": 3.3,
          "dw": -754.1,
          "dh": 0,
          "fs": 0,
          "align": "left",
          "weight": "700",
          "italic": false,
          "underline": false,
          "hidden": true,
          "dataId": "xzmt6p8cn8qwti31"
        },
        {
          "hx": 88.2,
          "hy": 1.8,
          "hw": -744.1,
          "hh": 0,
          "dx": 232.9,
          "dy": 3.3,
          "dw": -754.1,
          "dh": 0,
          "fs": 0,
          "align": "left",
          "weight": "700",
          "italic": false,
          "underline": false,
          "hidden": true,
          "dataId": "xzmt6p8k8kn1xxxo"
        },
        {
          "hx": 235.5,
          "hy": 5.2,
          "hw": -744.1,
          "hh": 0,
          "dx": 232.9,
          "dy": 3.3,
          "dw": -754.1,
          "dh": 0,
          "fs": 0,
          "align": "left",
          "weight": "700",
          "italic": false,
          "underline": false,
          "hidden": true,
          "dataId": "xzmt6p8tecfz31pb"
        }
      ],
      "dx": 0,
      "dy": 4
    }
  }
};

}


/* ===== V3.93 BUNDLE PHASE performance ===== */
if((document.currentScript?.dataset?.phase||'')==='performance'){
/* ===== BUNDLED performance-v390.js · V3.93 ===== */
/* E-REPORT/SAGS V3.90 PERFORMANCE
   Safe reductions only:
   - coalesce concurrent exact Firestore document reads
   - cache AD account-manager refresh briefly and invalidate on USER__ writes
   - suppress identical SYS_USER_CATALOG writes
   No operational FINAL/CROSSCHECK/flight query result is persisted or served stale.
*/
(function(root){
"use strict";
if(root.__SAGS_PERF_V390)return;root.__SAGS_PERF_V390=true;
const BUILD="V3.90-20260823-01";
const ACCOUNT_REFRESH_TTL=2*60*1000;
let accountDirty=true,accountLoadedAt=0,accountPromise=null;
const inflight=new Map();

function pathOf(ref){try{return String(ref?.path||"");}catch(_){return "";}}
function markAccountDirty(path){
  if(/(?:^|\/)USER__[^/]+$/i.test(String(path||""))){
    accountDirty=true;accountLoadedAt=0;
    try{root.personalUserCatalogMemV466.at=0;}catch(_){}
  }
}
function installFirestoreCoalesce(){
  try{
    if(typeof root.initHandoverFirebase!=="function")return false;
    const db=root.initHandoverFirebase(),probe=db.collection(root.HANDOVER_COLLECTION||"sags_handovers").doc("__PERF_PROBE__");
    const proto=Object.getPrototypeOf(probe);
    if(!proto||typeof proto.get!=="function")return false;
    if(!proto.get.__v390Perf){
      const getBase=proto.get;
      const getWrap=function(...args){
        const path=pathOf(this),source=String(args?.[0]?.source||"default");
        // Server-explicit reads are authoritative. Coalesce only while the same request is still in flight.
        const key=path+"|"+source;
        if(path&&inflight.has(key))return inflight.get(key);
        const p=Promise.resolve().then(()=>getBase.apply(this,args));
        if(path){
          inflight.set(key,p);
          p.finally(()=>{if(inflight.get(key)===p)inflight.delete(key);});
        }
        return p;
      };
      Object.defineProperty(getWrap,"__v390Perf",{value:true});
      proto.get=getWrap;
    }
    for(const name of ["set","update","delete"]){
      if(typeof proto[name]!=="function"||proto[name].__v390PerfWrite)continue;
      const base=proto[name];
      const wrap=function(...args){
        markAccountDirty(pathOf(this));
        return base.apply(this,args);
      };
      Object.defineProperty(wrap,"__v390PerfWrite",{value:true});
      proto[name]=wrap;
    }
    return true;
  }catch(e){console.info("V3.90 Firestore coalesce",e?.message||e);return false;}
}

function installAccountManagerCache(){
  try{
    const base=root.refreshAccountManager || (typeof refreshAccountManager==="function"?refreshAccountManager:null);
    if(typeof base!=="function"||base.__v390Perf)return false;
    const wrap=async function(force=false){
      if(root.currentRole!=="AD")return base.apply(this,arguments);
      const now=Date.now();
      if(!force&&!accountDirty&&accountLoadedAt&&now-accountLoadedAt<ACCOUNT_REFRESH_TTL){
        try{if(typeof root.v116RenderAccountManagerList==="function")root.v116RenderAccountManagerList();}catch(_){}
        return;
      }
      if(accountPromise&&!force)return accountPromise;
      accountPromise=Promise.resolve(base.call(this,force)).then(r=>{
        accountDirty=false;accountLoadedAt=Date.now();return r;
      }).finally(()=>{accountPromise=null;});
      return accountPromise;
    };
    wrap.__v390Perf=true;wrap.__v390Base=base;
    root.refreshAccountManager=wrap;
    try{refreshAccountManager=wrap;}catch(_){}
    return true;
  }catch(e){console.info("V3.90 account cache",e?.message||e);return false;}
}

function stableCatalog(items){
  try{
    return JSON.stringify((Array.isArray(items)?items:[]).map(x=>({
      id:String(x?.id||""),username:String(x?.username||""),employeeCode:String(x?.employeeCode||""),
      name:String(x?.name||""),role:String(x?.role||""),jobTitle:String(x?.jobTitle||""),
      unit:String(x?.unit||x?.workUnit||""),active:x?.active!==false,updatedAtMs:Number(x?.updatedAtMs||0)
    })).sort((a,b)=>a.username.localeCompare(b.username)));
  }catch(_){return "";}
}
function hashFast(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
function installCatalogWriteDedup(){
  try{
    const base=root.v466PublishUserCatalogFromItems || (typeof v466PublishUserCatalogFromItems==="function"?v466PublishUserCatalogFromItems:null);
    if(typeof base!=="function"||base.__v390Perf)return false;
    const wrap=async function(items){
      const sig=hashFast(stableCatalog(items));
      const key="sagsPerfUserCatalogSigV390";
      let old="";try{old=localStorage.getItem(key)||"";}catch(_){}
      if(sig&&old===sig){
        try{if(typeof root.v466UserCatalogSaveLocal==="function")root.v466UserCatalogSaveLocal(items);}catch(_){}
        return true;
      }
      const ok=await base.apply(this,arguments);
      if(ok&&sig)try{localStorage.setItem(key,sig);}catch(_){}
      return ok;
    };
    wrap.__v390Perf=true;wrap.__v390Base=base;
    root.v466PublishUserCatalogFromItems=wrap;
    try{v466PublishUserCatalogFromItems=wrap;}catch(_){}
    return true;
  }catch(e){console.info("V3.90 catalog dedup",e?.message||e);return false;}
}

function install(){
  installFirestoreCoalesce();
  installCatalogWriteDedup();
  installAccountManagerCache();
}
setTimeout(install,900);
root.addEventListener("pageshow",()=>setTimeout(install,80),{passive:true});
root.__SAGS_PERF_V390_INFO={build:BUILD,accountRefreshTtlMs:ACCOUNT_REFRESH_TTL,docGetCoalescing:true,catalogWriteDedup:true};
})(window);

}

/* V1.0.29: MY FLIGHT auto form sync retry */

/* SAGS local QR encoder. QRCode for JavaScript © 2009 Kazuhiko Arase, MIT License.
   Adapted from qrcode-terminal vendor/QRCode for offline browser rendering. */
(function(root){'use strict';if(root.SAGS_QR_MATRIX)return;const mods={},cache={};
mods['QRMode']=function(module,exports,require){
module.exports = {
    MODE_NUMBER :       1 << 0,
    MODE_ALPHA_NUM :    1 << 1,
    MODE_8BIT_BYTE :    1 << 2,
    MODE_KANJI :        1 << 3
};

};
mods['QRErrorCorrectLevel']=function(module,exports,require){
module.exports = {
	L : 1,
	M : 0,
	Q : 3,
	H : 2
};


};
mods['QRMaskPattern']=function(module,exports,require){
module.exports = {
	PATTERN000 : 0,
	PATTERN001 : 1,
	PATTERN010 : 2,
	PATTERN011 : 3,
	PATTERN100 : 4,
	PATTERN101 : 5,
	PATTERN110 : 6,
	PATTERN111 : 7
};

};
mods['QRMath']=function(module,exports,require){
var QRMath = {

	glog : function(n) {
	
		if (n < 1) {
			throw new Error("glog(" + n + ")");
		}
		
		return QRMath.LOG_TABLE[n];
	},
	
	gexp : function(n) {
	
		while (n < 0) {
			n += 255;
		}
	
		while (n >= 256) {
			n -= 255;
		}
	
		return QRMath.EXP_TABLE[n];
	},
	
	EXP_TABLE : new Array(256),
	
	LOG_TABLE : new Array(256)

};
	
for (var i = 0; i < 8; i++) {
	QRMath.EXP_TABLE[i] = 1 << i;
}
for (var i = 8; i < 256; i++) {
	QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4]
		^ QRMath.EXP_TABLE[i - 5]
		^ QRMath.EXP_TABLE[i - 6]
		^ QRMath.EXP_TABLE[i - 8];
}
for (var i = 0; i < 255; i++) {
	QRMath.LOG_TABLE[QRMath.EXP_TABLE[i] ] = i;
}

module.exports = QRMath;

};
mods['QRPolynomial']=function(module,exports,require){
var QRMath = require('QRMath');

function QRPolynomial(num, shift) {
	if (num.length === undefined) {
		throw new Error(num.length + "/" + shift);
	}

	var offset = 0;

	while (offset < num.length && num[offset] === 0) {
		offset++;
	}

	this.num = new Array(num.length - offset + shift);
	for (var i = 0; i < num.length - offset; i++) {
		this.num[i] = num[i + offset];
	}
}

QRPolynomial.prototype = {

	get : function(index) {
		return this.num[index];
	},
	
	getLength : function() {
		return this.num.length;
	},
	
	multiply : function(e) {
	
		var num = new Array(this.getLength() + e.getLength() - 1);
	
		for (var i = 0; i < this.getLength(); i++) {
			for (var j = 0; j < e.getLength(); j++) {
				num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i) ) + QRMath.glog(e.get(j) ) );
			}
		}
	
		return new QRPolynomial(num, 0);
	},
	
	mod : function(e) {
	
		if (this.getLength() - e.getLength() < 0) {
			return this;
		}
	
		var ratio = QRMath.glog(this.get(0) ) - QRMath.glog(e.get(0) );
	
		var num = new Array(this.getLength() );
		
		for (var i = 0; i < this.getLength(); i++) {
			num[i] = this.get(i);
		}
		
		for (var x = 0; x < e.getLength(); x++) {
			num[x] ^= QRMath.gexp(QRMath.glog(e.get(x) ) + ratio);
		}
	
		// recursive call
		return new QRPolynomial(num, 0).mod(e);
	}
};

module.exports = QRPolynomial;

};
mods['QRBitBuffer']=function(module,exports,require){
function QRBitBuffer() {
	this.buffer = [];
	this.length = 0;
}

QRBitBuffer.prototype = {

	get : function(index) {
		var bufIndex = Math.floor(index / 8);
		return ( (this.buffer[bufIndex] >>> (7 - index % 8) ) & 1) == 1;
	},
	
	put : function(num, length) {
		for (var i = 0; i < length; i++) {
			this.putBit( ( (num >>> (length - i - 1) ) & 1) == 1);
		}
	},
	
	getLengthInBits : function() {
		return this.length;
	},
	
	putBit : function(bit) {
	
		var bufIndex = Math.floor(this.length / 8);
		if (this.buffer.length <= bufIndex) {
			this.buffer.push(0);
		}
	
		if (bit) {
			this.buffer[bufIndex] |= (0x80 >>> (this.length % 8) );
		}
	
		this.length++;
	}
};

module.exports = QRBitBuffer;

};
mods['QR8bitByte']=function(module,exports,require){
var QRMode = require('QRMode');

function QR8bitByte(data) {
	this.mode = QRMode.MODE_8BIT_BYTE;
	this.data = data;
}

QR8bitByte.prototype = {

	getLength : function() {
		return this.data.length;
	},
	
	write : function(buffer) {
		for (var i = 0; i < this.data.length; i++) {
			// not JIS ...
			buffer.put(this.data.charCodeAt(i), 8);
		}
	}
};

module.exports = QR8bitByte;

};
mods['QRRSBlock']=function(module,exports,require){
var QRErrorCorrectLevel = require('QRErrorCorrectLevel');

function QRRSBlock(totalCount, dataCount) {
	this.totalCount = totalCount;
	this.dataCount  = dataCount;
}

QRRSBlock.RS_BLOCK_TABLE = [

	// L
	// M
	// Q
	// H

	// 1
	[1, 26, 19],
	[1, 26, 16],
	[1, 26, 13],
	[1, 26, 9],
	
	// 2
	[1, 44, 34],
	[1, 44, 28],
	[1, 44, 22],
	[1, 44, 16],

	// 3
	[1, 70, 55],
	[1, 70, 44],
	[2, 35, 17],
	[2, 35, 13],

	// 4		
	[1, 100, 80],
	[2, 50, 32],
	[2, 50, 24],
	[4, 25, 9],
	
	// 5
	[1, 134, 108],
	[2, 67, 43],
	[2, 33, 15, 2, 34, 16],
	[2, 33, 11, 2, 34, 12],
	
	// 6
	[2, 86, 68],
	[4, 43, 27],
	[4, 43, 19],
	[4, 43, 15],
	
	// 7		
	[2, 98, 78],
	[4, 49, 31],
	[2, 32, 14, 4, 33, 15],
	[4, 39, 13, 1, 40, 14],
	
	// 8
	[2, 121, 97],
	[2, 60, 38, 2, 61, 39],
	[4, 40, 18, 2, 41, 19],
	[4, 40, 14, 2, 41, 15],
	
	// 9
	[2, 146, 116],
	[3, 58, 36, 2, 59, 37],
	[4, 36, 16, 4, 37, 17],
	[4, 36, 12, 4, 37, 13],
	
	// 10		
	[2, 86, 68, 2, 87, 69],
	[4, 69, 43, 1, 70, 44],
	[6, 43, 19, 2, 44, 20],
	[6, 43, 15, 2, 44, 16],

	// 11
	[4, 101, 81],
	[1, 80, 50, 4, 81, 51],
	[4, 50, 22, 4, 51, 23],
	[3, 36, 12, 8, 37, 13],

	// 12
	[2, 116, 92, 2, 117, 93],
	[6, 58, 36, 2, 59, 37],
	[4, 46, 20, 6, 47, 21],
	[7, 42, 14, 4, 43, 15],

	// 13
	[4, 133, 107],
	[8, 59, 37, 1, 60, 38],
	[8, 44, 20, 4, 45, 21],
	[12, 33, 11, 4, 34, 12],

	// 14
	[3, 145, 115, 1, 146, 116],
	[4, 64, 40, 5, 65, 41],
	[11, 36, 16, 5, 37, 17],
	[11, 36, 12, 5, 37, 13],

	// 15
	[5, 109, 87, 1, 110, 88],
	[5, 65, 41, 5, 66, 42],
	[5, 54, 24, 7, 55, 25],
	[11, 36, 12],

	// 16
	[5, 122, 98, 1, 123, 99],
	[7, 73, 45, 3, 74, 46],
	[15, 43, 19, 2, 44, 20],
	[3, 45, 15, 13, 46, 16],

	// 17
	[1, 135, 107, 5, 136, 108],
	[10, 74, 46, 1, 75, 47],
	[1, 50, 22, 15, 51, 23],
	[2, 42, 14, 17, 43, 15],

	// 18
	[5, 150, 120, 1, 151, 121],
	[9, 69, 43, 4, 70, 44],
	[17, 50, 22, 1, 51, 23],
	[2, 42, 14, 19, 43, 15],

	// 19
	[3, 141, 113, 4, 142, 114],
	[3, 70, 44, 11, 71, 45],
	[17, 47, 21, 4, 48, 22],
	[9, 39, 13, 16, 40, 14],

	// 20
	[3, 135, 107, 5, 136, 108],
	[3, 67, 41, 13, 68, 42],
	[15, 54, 24, 5, 55, 25],
	[15, 43, 15, 10, 44, 16],

	// 21
	[4, 144, 116, 4, 145, 117],
	[17, 68, 42],
	[17, 50, 22, 6, 51, 23],
	[19, 46, 16, 6, 47, 17],

	// 22
	[2, 139, 111, 7, 140, 112],
	[17, 74, 46],
	[7, 54, 24, 16, 55, 25],
	[34, 37, 13],

	// 23
	[4, 151, 121, 5, 152, 122],
	[4, 75, 47, 14, 76, 48],
	[11, 54, 24, 14, 55, 25],
	[16, 45, 15, 14, 46, 16],

	// 24
	[6, 147, 117, 4, 148, 118],
	[6, 73, 45, 14, 74, 46],
	[11, 54, 24, 16, 55, 25],
	[30, 46, 16, 2, 47, 17],

	// 25
	[8, 132, 106, 4, 133, 107],
	[8, 75, 47, 13, 76, 48],
	[7, 54, 24, 22, 55, 25],
	[22, 45, 15, 13, 46, 16],

	// 26
	[10, 142, 114, 2, 143, 115],
	[19, 74, 46, 4, 75, 47],
	[28, 50, 22, 6, 51, 23],
	[33, 46, 16, 4, 47, 17],

	// 27
	[8, 152, 122, 4, 153, 123],
	[22, 73, 45, 3, 74, 46],
	[8, 53, 23, 26, 54, 24],
	[12, 45, 15, 28, 46, 16],

	// 28
	[3, 147, 117, 10, 148, 118],
	[3, 73, 45, 23, 74, 46],
	[4, 54, 24, 31, 55, 25],
	[11, 45, 15, 31, 46, 16],

	// 29
	[7, 146, 116, 7, 147, 117],
	[21, 73, 45, 7, 74, 46],
	[1, 53, 23, 37, 54, 24],
	[19, 45, 15, 26, 46, 16],

	// 30
	[5, 145, 115, 10, 146, 116],
	[19, 75, 47, 10, 76, 48],
	[15, 54, 24, 25, 55, 25],
	[23, 45, 15, 25, 46, 16],

	// 31
	[13, 145, 115, 3, 146, 116],
	[2, 74, 46, 29, 75, 47],
	[42, 54, 24, 1, 55, 25],
	[23, 45, 15, 28, 46, 16],

	// 32
	[17, 145, 115],
	[10, 74, 46, 23, 75, 47],
	[10, 54, 24, 35, 55, 25],
	[19, 45, 15, 35, 46, 16],

	// 33
	[17, 145, 115, 1, 146, 116],
	[14, 74, 46, 21, 75, 47],
	[29, 54, 24, 19, 55, 25],
	[11, 45, 15, 46, 46, 16],

	// 34
	[13, 145, 115, 6, 146, 116],
	[14, 74, 46, 23, 75, 47],
	[44, 54, 24, 7, 55, 25],
	[59, 46, 16, 1, 47, 17],

	// 35
	[12, 151, 121, 7, 152, 122],
	[12, 75, 47, 26, 76, 48],
	[39, 54, 24, 14, 55, 25],
	[22, 45, 15, 41, 46, 16],

	// 36
	[6, 151, 121, 14, 152, 122],
	[6, 75, 47, 34, 76, 48],
	[46, 54, 24, 10, 55, 25],
	[2, 45, 15, 64, 46, 16],

	// 37
	[17, 152, 122, 4, 153, 123],
	[29, 74, 46, 14, 75, 47],
	[49, 54, 24, 10, 55, 25],
	[24, 45, 15, 46, 46, 16],

	// 38
	[4, 152, 122, 18, 153, 123],
	[13, 74, 46, 32, 75, 47],
	[48, 54, 24, 14, 55, 25],
	[42, 45, 15, 32, 46, 16],

	// 39
	[20, 147, 117, 4, 148, 118],
	[40, 75, 47, 7, 76, 48],
	[43, 54, 24, 22, 55, 25],
	[10, 45, 15, 67, 46, 16],

	// 40
	[19, 148, 118, 6, 149, 119],
	[18, 75, 47, 31, 76, 48],
	[34, 54, 24, 34, 55, 25],
	[20, 45, 15, 61, 46, 16]
];

QRRSBlock.getRSBlocks = function(typeNumber, errorCorrectLevel) {
	
	var rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
	
	if (rsBlock === undefined) {
		throw new Error("bad rs block @ typeNumber:" + typeNumber + "/errorCorrectLevel:" + errorCorrectLevel);
	}

	var length = rsBlock.length / 3;
	
	var list = [];
	
	for (var i = 0; i < length; i++) {

		var count = rsBlock[i * 3 + 0];
		var totalCount = rsBlock[i * 3 + 1];
		var dataCount  = rsBlock[i * 3 + 2];

		for (var j = 0; j < count; j++) {
			list.push(new QRRSBlock(totalCount, dataCount) );	
		}
	}
	
	return list;
};

QRRSBlock.getRsBlockTable = function(typeNumber, errorCorrectLevel) {

	switch(errorCorrectLevel) {
	case QRErrorCorrectLevel.L :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
	case QRErrorCorrectLevel.M :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
	case QRErrorCorrectLevel.Q :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
	case QRErrorCorrectLevel.H :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
	default :
		return undefined;
	}
};

module.exports = QRRSBlock;

};
mods['QRUtil']=function(module,exports,require){
var QRMode = require('QRMode');
var QRPolynomial = require('QRPolynomial');
var QRMath = require('QRMath');
var QRMaskPattern = require('QRMaskPattern');

var QRUtil = {

    PATTERN_POSITION_TABLE : [
        [],
        [6, 18],
        [6, 22],
        [6, 26],
        [6, 30],
        [6, 34],
        [6, 22, 38],
        [6, 24, 42],
        [6, 26, 46],
        [6, 28, 50],
        [6, 30, 54],        
        [6, 32, 58],
        [6, 34, 62],
        [6, 26, 46, 66],
        [6, 26, 48, 70],
        [6, 26, 50, 74],
        [6, 30, 54, 78],
        [6, 30, 56, 82],
        [6, 30, 58, 86],
        [6, 34, 62, 90],
        [6, 28, 50, 72, 94],
        [6, 26, 50, 74, 98],
        [6, 30, 54, 78, 102],
        [6, 28, 54, 80, 106],
        [6, 32, 58, 84, 110],
        [6, 30, 58, 86, 114],
        [6, 34, 62, 90, 118],
        [6, 26, 50, 74, 98, 122],
        [6, 30, 54, 78, 102, 126],
        [6, 26, 52, 78, 104, 130],
        [6, 30, 56, 82, 108, 134],
        [6, 34, 60, 86, 112, 138],
        [6, 30, 58, 86, 114, 142],
        [6, 34, 62, 90, 118, 146],
        [6, 30, 54, 78, 102, 126, 150],
        [6, 24, 50, 76, 102, 128, 154],
        [6, 28, 54, 80, 106, 132, 158],
        [6, 32, 58, 84, 110, 136, 162],
        [6, 26, 54, 82, 110, 138, 166],
        [6, 30, 58, 86, 114, 142, 170]
    ],

    G15 : (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
    G18 : (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0),
    G15_MASK : (1 << 14) | (1 << 12) | (1 << 10)    | (1 << 4) | (1 << 1),

    getBCHTypeInfo : function(data) {
        var d = data << 10;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
            d ^= (QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) ) );    
        }
        return ( (data << 10) | d) ^ QRUtil.G15_MASK;
    },

    getBCHTypeNumber : function(data) {
        var d = data << 12;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
            d ^= (QRUtil.G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) ) );    
        }
        return (data << 12) | d;
    },

    getBCHDigit : function(data) {

        var digit = 0;

        while (data !== 0) {
            digit++;
            data >>>= 1;
        }

        return digit;
    },

    getPatternPosition : function(typeNumber) {
        return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1];
    },

    getMask : function(maskPattern, i, j) {
        
        switch (maskPattern) {
            
        case QRMaskPattern.PATTERN000 : return (i + j) % 2 === 0;
        case QRMaskPattern.PATTERN001 : return i % 2 === 0;
        case QRMaskPattern.PATTERN010 : return j % 3 === 0;
        case QRMaskPattern.PATTERN011 : return (i + j) % 3 === 0;
        case QRMaskPattern.PATTERN100 : return (Math.floor(i / 2) + Math.floor(j / 3) ) % 2 === 0;
        case QRMaskPattern.PATTERN101 : return (i * j) % 2 + (i * j) % 3 === 0;
        case QRMaskPattern.PATTERN110 : return ( (i * j) % 2 + (i * j) % 3) % 2 === 0;
        case QRMaskPattern.PATTERN111 : return ( (i * j) % 3 + (i + j) % 2) % 2 === 0;

        default :
            throw new Error("bad maskPattern:" + maskPattern);
        }
    },

    getErrorCorrectPolynomial : function(errorCorrectLength) {

        var a = new QRPolynomial([1], 0);

        for (var i = 0; i < errorCorrectLength; i++) {
            a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0) );
        }

        return a;
    },

    getLengthInBits : function(mode, type) {

        if (1 <= type && type < 10) {

            // 1 - 9

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 10;
            case QRMode.MODE_ALPHA_NUM  : return 9;
            case QRMode.MODE_8BIT_BYTE  : return 8;
            case QRMode.MODE_KANJI      : return 8;
            default :
                throw new Error("mode:" + mode);
            }

        } else if (type < 27) {

            // 10 - 26

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 12;
            case QRMode.MODE_ALPHA_NUM  : return 11;
            case QRMode.MODE_8BIT_BYTE  : return 16;
            case QRMode.MODE_KANJI      : return 10;
            default :
                throw new Error("mode:" + mode);
            }

        } else if (type < 41) {

            // 27 - 40

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 14;
            case QRMode.MODE_ALPHA_NUM  : return 13;
            case QRMode.MODE_8BIT_BYTE  : return 16;
            case QRMode.MODE_KANJI      : return 12;
            default :
                throw new Error("mode:" + mode);
            }

        } else {
            throw new Error("type:" + type);
        }
    },

    getLostPoint : function(qrCode) {
        
        var moduleCount = qrCode.getModuleCount();
        var lostPoint = 0;
        var row = 0; 
        var col = 0;

        
        // LEVEL1
        
        for (row = 0; row < moduleCount; row++) {

            for (col = 0; col < moduleCount; col++) {

                var sameCount = 0;
                var dark = qrCode.isDark(row, col);

                for (var r = -1; r <= 1; r++) {

                    if (row + r < 0 || moduleCount <= row + r) {
                        continue;
                    }

                    for (var c = -1; c <= 1; c++) {

                        if (col + c < 0 || moduleCount <= col + c) {
                            continue;
                        }

                        if (r === 0 && c === 0) {
                            continue;
                        }

                        if (dark === qrCode.isDark(row + r, col + c) ) {
                            sameCount++;
                        }
                    }
                }

                if (sameCount > 5) {
                    lostPoint += (3 + sameCount - 5);
                }
            }
        }

        // LEVEL2

        for (row = 0; row < moduleCount - 1; row++) {
            for (col = 0; col < moduleCount - 1; col++) {
                var count = 0;
                if (qrCode.isDark(row,     col    ) ) count++;
                if (qrCode.isDark(row + 1, col    ) ) count++;
                if (qrCode.isDark(row,     col + 1) ) count++;
                if (qrCode.isDark(row + 1, col + 1) ) count++;
                if (count === 0 || count === 4) {
                    lostPoint += 3;
                }
            }
        }

        // LEVEL3

        for (row = 0; row < moduleCount; row++) {
            for (col = 0; col < moduleCount - 6; col++) {
                if (qrCode.isDark(row, col) && 
                        !qrCode.isDark(row, col + 1) && 
                         qrCode.isDark(row, col + 2) && 
                         qrCode.isDark(row, col + 3) && 
                         qrCode.isDark(row, col + 4) && 
                        !qrCode.isDark(row, col + 5) && 
                         qrCode.isDark(row, col + 6) ) {
                    lostPoint += 40;
                }
            }
        }

        for (col = 0; col < moduleCount; col++) {
            for (row = 0; row < moduleCount - 6; row++) {
                if (qrCode.isDark(row, col) &&
                        !qrCode.isDark(row + 1, col) &&
                         qrCode.isDark(row + 2, col) &&
                         qrCode.isDark(row + 3, col) &&
                         qrCode.isDark(row + 4, col) &&
                        !qrCode.isDark(row + 5, col) &&
                         qrCode.isDark(row + 6, col) ) {
                    lostPoint += 40;
                }
            }
        }

        // LEVEL4
        
        var darkCount = 0;

        for (col = 0; col < moduleCount; col++) {
            for (row = 0; row < moduleCount; row++) {
                if (qrCode.isDark(row, col) ) {
                    darkCount++;
                }
            }
        }
        
        var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
        lostPoint += ratio * 10;

        return lostPoint;       
    }

};

module.exports = QRUtil;

};
mods['QRCode']=function(module,exports,require){
//---------------------------------------------------------------------
// QRCode for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//   http://www.opensource.org/licenses/mit-license.php
//
// The word "QR Code" is registered trademark of 
// DENSO WAVE INCORPORATED
//   http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------
// Modified to work in node for this project (and some refactoring)
//---------------------------------------------------------------------

var QR8bitByte = require('QR8bitByte');
var QRUtil = require('QRUtil');
var QRPolynomial = require('QRPolynomial');
var QRRSBlock = require('QRRSBlock');
var QRBitBuffer = require('QRBitBuffer');

function QRCode(typeNumber, errorCorrectLevel) {
	this.typeNumber = typeNumber;
	this.errorCorrectLevel = errorCorrectLevel;
	this.modules = null;
	this.moduleCount = 0;
	this.dataCache = null;
	this.dataList = [];
}

QRCode.prototype = {
	
	addData : function(data) {
		var newData = new QR8bitByte(data);
		this.dataList.push(newData);
		this.dataCache = null;
	},
	
	isDark : function(row, col) {
		if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
			throw new Error(row + "," + col);
		}
		return this.modules[row][col];
	},

	getModuleCount : function() {
		return this.moduleCount;
	},
	
	make : function() {
		// Calculate automatically typeNumber if provided is < 1
		if (this.typeNumber < 1 ){
			var typeNumber = 1;
			for (typeNumber = 1; typeNumber < 40; typeNumber++) {
				var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, this.errorCorrectLevel);

				var buffer = new QRBitBuffer();
				var totalDataCount = 0;
				for (var i = 0; i < rsBlocks.length; i++) {
					totalDataCount += rsBlocks[i].dataCount;
				}

				for (var x = 0; x < this.dataList.length; x++) {
					var data = this.dataList[x];
					buffer.put(data.mode, 4);
					buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber) );
					data.write(buffer);
				}
				if (buffer.getLengthInBits() <= totalDataCount * 8)
					break;
			}
			this.typeNumber = typeNumber;
		}
		this.makeImpl(false, this.getBestMaskPattern() );
	},
	
	makeImpl : function(test, maskPattern) {
		
		this.moduleCount = this.typeNumber * 4 + 17;
		this.modules = new Array(this.moduleCount);
		
		for (var row = 0; row < this.moduleCount; row++) {
			
			this.modules[row] = new Array(this.moduleCount);
			
			for (var col = 0; col < this.moduleCount; col++) {
				this.modules[row][col] = null;//(col + row) % 3;
			}
		}
	
		this.setupPositionProbePattern(0, 0);
		this.setupPositionProbePattern(this.moduleCount - 7, 0);
		this.setupPositionProbePattern(0, this.moduleCount - 7);
		this.setupPositionAdjustPattern();
		this.setupTimingPattern();
		this.setupTypeInfo(test, maskPattern);
		
		if (this.typeNumber >= 7) {
			this.setupTypeNumber(test);
		}
	
		if (this.dataCache === null) {
			this.dataCache = QRCode.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
		}
	
		this.mapData(this.dataCache, maskPattern);
	},

	setupPositionProbePattern : function(row, col)  {
		
		for (var r = -1; r <= 7; r++) {
			
			if (row + r <= -1 || this.moduleCount <= row + r) continue;
			
			for (var c = -1; c <= 7; c++) {
				
				if (col + c <= -1 || this.moduleCount <= col + c) continue;
				
				if ( (0 <= r && r <= 6 && (c === 0 || c === 6) ) || 
                     (0 <= c && c <= 6 && (r === 0 || r === 6) ) || 
                     (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
					this.modules[row + r][col + c] = true;
				} else {
					this.modules[row + r][col + c] = false;
				}
			}		
		}		
	},
	
	getBestMaskPattern : function() {
	
		var minLostPoint = 0;
		var pattern = 0;
	
		for (var i = 0; i < 8; i++) {
			
			this.makeImpl(true, i);
	
			var lostPoint = QRUtil.getLostPoint(this);
	
			if (i === 0 || minLostPoint >  lostPoint) {
				minLostPoint = lostPoint;
				pattern = i;
			}
		}
	
		return pattern;
	},
	
	createMovieClip : function(target_mc, instance_name, depth) {
	
		var qr_mc = target_mc.createEmptyMovieClip(instance_name, depth);
		var cs = 1;
	
		this.make();

		for (var row = 0; row < this.modules.length; row++) {
			
			var y = row * cs;
			
			for (var col = 0; col < this.modules[row].length; col++) {
	
				var x = col * cs;
				var dark = this.modules[row][col];
			
				if (dark) {
					qr_mc.beginFill(0, 100);
					qr_mc.moveTo(x, y);
					qr_mc.lineTo(x + cs, y);
					qr_mc.lineTo(x + cs, y + cs);
					qr_mc.lineTo(x, y + cs);
					qr_mc.endFill();
				}
			}
		}
		
		return qr_mc;
	},

	setupTimingPattern : function() {
		
		for (var r = 8; r < this.moduleCount - 8; r++) {
			if (this.modules[r][6] !== null) {
				continue;
			}
			this.modules[r][6] = (r % 2 === 0);
		}
	
		for (var c = 8; c < this.moduleCount - 8; c++) {
			if (this.modules[6][c] !== null) {
				continue;
			}
			this.modules[6][c] = (c % 2 === 0);
		}
	},
	
	setupPositionAdjustPattern : function() {
	
		var pos = QRUtil.getPatternPosition(this.typeNumber);
		
		for (var i = 0; i < pos.length; i++) {
		
			for (var j = 0; j < pos.length; j++) {
			
				var row = pos[i];
				var col = pos[j];
				
				if (this.modules[row][col] !== null) {
					continue;
				}
				
				for (var r = -2; r <= 2; r++) {
				
					for (var c = -2; c <= 2; c++) {
					
						if (Math.abs(r) === 2 || 
                            Math.abs(c) === 2 ||
                            (r === 0 && c === 0) ) {
							this.modules[row + r][col + c] = true;
						} else {
							this.modules[row + r][col + c] = false;
						}
					}
				}
			}
		}
	},
	
	setupTypeNumber : function(test) {
	
		var bits = QRUtil.getBCHTypeNumber(this.typeNumber);
        var mod;
	
		for (var i = 0; i < 18; i++) {
			mod = (!test && ( (bits >> i) & 1) === 1);
			this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
		}
	
		for (var x = 0; x < 18; x++) {
			mod = (!test && ( (bits >> x) & 1) === 1);
			this.modules[x % 3 + this.moduleCount - 8 - 3][Math.floor(x / 3)] = mod;
		}
	},
	
	setupTypeInfo : function(test, maskPattern) {
	
		var data = (this.errorCorrectLevel << 3) | maskPattern;
		var bits = QRUtil.getBCHTypeInfo(data);
        var mod;
	
		// vertical		
		for (var v = 0; v < 15; v++) {
	
			mod = (!test && ( (bits >> v) & 1) === 1);
	
			if (v < 6) {
				this.modules[v][8] = mod;
			} else if (v < 8) {
				this.modules[v + 1][8] = mod;
			} else {
				this.modules[this.moduleCount - 15 + v][8] = mod;
			}
		}
	
		// horizontal
		for (var h = 0; h < 15; h++) {
	
			mod = (!test && ( (bits >> h) & 1) === 1);
			
			if (h < 8) {
				this.modules[8][this.moduleCount - h - 1] = mod;
			} else if (h < 9) {
				this.modules[8][15 - h - 1 + 1] = mod;
			} else {
				this.modules[8][15 - h - 1] = mod;
			}
		}
	
		// fixed module
		this.modules[this.moduleCount - 8][8] = (!test);
	
	},
	
	mapData : function(data, maskPattern) {
		
		var inc = -1;
		var row = this.moduleCount - 1;
		var bitIndex = 7;
		var byteIndex = 0;
		
		for (var col = this.moduleCount - 1; col > 0; col -= 2) {
	
			if (col === 6) col--;
	
			while (true) {
	
				for (var c = 0; c < 2; c++) {
					
					if (this.modules[row][col - c] === null) {
						
						var dark = false;
	
						if (byteIndex < data.length) {
							dark = ( ( (data[byteIndex] >>> bitIndex) & 1) === 1);
						}
	
						var mask = QRUtil.getMask(maskPattern, row, col - c);
	
						if (mask) {
							dark = !dark;
						}
						
						this.modules[row][col - c] = dark;
						bitIndex--;
	
						if (bitIndex === -1) {
							byteIndex++;
							bitIndex = 7;
						}
					}
				}
								
				row += inc;
	
				if (row < 0 || this.moduleCount <= row) {
					row -= inc;
					inc = -inc;
					break;
				}
			}
		}
		
	}

};

QRCode.PAD0 = 0xEC;
QRCode.PAD1 = 0x11;

QRCode.createData = function(typeNumber, errorCorrectLevel, dataList) {
	
	var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
	
	var buffer = new QRBitBuffer();
	
	for (var i = 0; i < dataList.length; i++) {
		var data = dataList[i];
		buffer.put(data.mode, 4);
		buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber) );
		data.write(buffer);
	}

	// calc num max data.
	var totalDataCount = 0;
	for (var x = 0; x < rsBlocks.length; x++) {
		totalDataCount += rsBlocks[x].dataCount;
	}

	if (buffer.getLengthInBits() > totalDataCount * 8) {
		throw new Error("code length overflow. (" + 
            buffer.getLengthInBits() + 
            ">" +  
            totalDataCount * 8 + 
            ")");
	}

	// end code
	if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
		buffer.put(0, 4);
	}

	// padding
	while (buffer.getLengthInBits() % 8 !== 0) {
		buffer.putBit(false);
	}

	// padding
	while (true) {
		
		if (buffer.getLengthInBits() >= totalDataCount * 8) {
			break;
		}
		buffer.put(QRCode.PAD0, 8);
		
		if (buffer.getLengthInBits() >= totalDataCount * 8) {
			break;
		}
		buffer.put(QRCode.PAD1, 8);
	}

	return QRCode.createBytes(buffer, rsBlocks);
};

QRCode.createBytes = function(buffer, rsBlocks) {

	var offset = 0;
	
	var maxDcCount = 0;
	var maxEcCount = 0;
	
	var dcdata = new Array(rsBlocks.length);
	var ecdata = new Array(rsBlocks.length);
	
	for (var r = 0; r < rsBlocks.length; r++) {

		var dcCount = rsBlocks[r].dataCount;
		var ecCount = rsBlocks[r].totalCount - dcCount;

		maxDcCount = Math.max(maxDcCount, dcCount);
		maxEcCount = Math.max(maxEcCount, ecCount);
		
		dcdata[r] = new Array(dcCount);
		
		for (var i = 0; i < dcdata[r].length; i++) {
			dcdata[r][i] = 0xff & buffer.buffer[i + offset];
		}
		offset += dcCount;
		
		var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
		var rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);

		var modPoly = rawPoly.mod(rsPoly);
		ecdata[r] = new Array(rsPoly.getLength() - 1);
		for (var x = 0; x < ecdata[r].length; x++) {
            var modIndex = x + modPoly.getLength() - ecdata[r].length;
			ecdata[r][x] = (modIndex >= 0)? modPoly.get(modIndex) : 0;
		}

	}
	
	var totalCodeCount = 0;
	for (var y = 0; y < rsBlocks.length; y++) {
		totalCodeCount += rsBlocks[y].totalCount;
	}

	var data = new Array(totalCodeCount);
	var index = 0;

	for (var z = 0; z < maxDcCount; z++) {
		for (var s = 0; s < rsBlocks.length; s++) {
			if (z < dcdata[s].length) {
				data[index++] = dcdata[s][z];
			}
		}
	}

	for (var xx = 0; xx < maxEcCount; xx++) {
		for (var t = 0; t < rsBlocks.length; t++) {
			if (xx < ecdata[t].length) {
				data[index++] = ecdata[t][xx];
			}
		}
	}

	return data;

};

module.exports = QRCode;

};
function req(name){if(cache[name])return cache[name].exports;if(!mods[name])throw new Error('QR module '+name+' missing');const m={exports:{}};cache[name]=m;mods[name](m,m.exports,req);return m.exports;}
root.SAGS_QR_MATRIX=function(text){const QRCode=req('QRCode'),Level=req('QRErrorCorrectLevel');const q=new QRCode(-1,Level.L);q.addData(String(text||''));q.make();return q.modules.map(r=>r.map(Boolean));};
})(typeof window!=='undefined'?window:globalThis);
/* ===== V1.1.20 · QR ROSTER HANDOVER · FORM BUTTON + LEGACY HANDOFF REMOVAL =====
   QR is a locator only. Metadata is stored under the already-used roster_sessions path,
   and the recipient is revalidated against the current Daily Roster before opening. */
(function(root){'use strict';
  if((document.currentScript?.dataset?.phase||'')!=='performance')return;
  if(root.__SAGS_V1113_QR_HANDOVER)return;root.__SAGS_V1113_QR_HANDOVER='V1.1.50';
  const S=v=>String(v??'').trim(),U=v=>S(v).toUpperCase();
  const norm=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return U(v)}};
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(_){return {}}};
  const sess=()=>{try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}};
  const me=()=>{const x=sess();return norm(x.profile?.username||(U(x.role)==='AD'?'AD':''))};
  const profile=()=>sess().profile||{};
  const db=p=>{if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase chưa sẵn sàng.');return root.sagsV470Ref(p)};
  const dateNow=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const opDate=()=>S(sessionStorage.getItem('sagsV36FwcDate'))||S(document.getElementById('fwcDate')?.value)||dateNow();
  function itemsOf(man){return Object.values(man?.items||{}).filter(x=>x&&x.active!==false)}
  function randHex(bytes=16){const a=new Uint8Array(bytes);crypto.getRandomValues(a);return [...a].map(x=>x.toString(16).padStart(2,'0')).join('')}
  async function sha256(text){const b=new TextEncoder().encode(S(text)),h=await crypto.subtle.digest('SHA-256',b);return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')}
  function addAudit(event,detail){try{return db('ops_audit_v331').push({schema:1,event,systemTimestamp:root.firebase?.database?.ServerValue?.TIMESTAMP||Date.now(),clientAtMs:Date.now(),actor:{username:me(),name:S(profile().name||profile().fullName||me()),role:S(sess().role)},flightId:S(detail?.flightId),flightLabel:S(detail?.flightLabel),detail:detail||{}})}catch(_){}}
  function cleanUrl(){try{const u=new URL(location.href);u.searchParams.delete('sagsHandover');u.searchParams.delete('sagsToken');u.searchParams.delete('sagsTo');history.replaceState(history.state,'',u.pathname+(u.search||'')+(u.hash||''))}catch(_){}}
  function qrLink(id,token,toAid){const u=new URL(location.href);u.hash='';u.search='';u.searchParams.set('sagsHandover',id);u.searchParams.set('sagsToken',token);u.searchParams.set('sagsTo',toAid);return u.toString()}
  function qrLocalKey(){return 'sagsQrHandoverLast:'+safe(me()||'ANON')}
  function saveLocalQr(info){try{localStorage.setItem(qrLocalKey(),JSON.stringify(info||{}))}catch(_){}}
  function readLocalQr(){try{const x=JSON.parse(localStorage.getItem(qrLocalKey())||'null');return x&&typeof x==='object'?x:null}catch(_){return null}}
  function clearLocalQr(){try{localStorage.removeItem(qrLocalKey())}catch(_){}}
  function ensureUi(){if(document.getElementById('v1111QrStyle'))return;const st=document.createElement('style');st.id='v1111QrStyle';st.textContent=`
#v1111QrModal,#v1111QrScanModal{position:fixed;inset:0;z-index:2147482500;background:rgba(4,20,31,.78);display:none;align-items:center;justify-content:center;padding:14px;padding-top:max(14px,env(safe-area-inset-top));padding-bottom:max(14px,env(safe-area-inset-bottom))}#v1111QrModal.show,#v1111QrScanModal.show{display:flex}
#v1111QrPanel,#v1111QrScanPanel{width:min(390px,96vw);background:#fff;border-radius:17px;padding:14px;box-shadow:0 18px 60px rgba(0,0,0,.38);text-align:center;color:#123d62}
#v1111QrPanel h3,#v1111QrScanPanel h3{margin:0 0 7px;font:900 18px Arial}#v1111QrTarget{font:900 13px Arial;margin-bottom:9px}#v1111QrCanvas{display:block;margin:0 auto;background:#fff;border:7px solid #fff;max-width:100%;height:auto}
#v1111QrActions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:11px}#v1111QrActions button,#v1111QrScanActions button{min-height:42px;border:0;border-radius:10px;font:900 12px Arial}#v1111QrShare{background:#0f766e;color:#fff}#v1111QrClose{background:#e8eef3;color:#123d62}
#v1111QrScanView{position:relative;width:100%;aspect-ratio:3/4;max-height:64vh;background:#06141d;border-radius:13px;overflow:hidden}#v1111QrVideo{width:100%;height:100%;object-fit:cover;background:#06141d}#v1111QrScanFrame{position:absolute;left:50%;top:50%;width:66%;aspect-ratio:1;transform:translate(-50%,-50%);border:3px solid #fff;border-radius:16px;box-shadow:0 0 0 999px rgba(0,0,0,.20)}#v1111QrScanFrame:before,#v1111QrScanFrame:after{content:'';position:absolute;inset:-4px;border-radius:18px;pointer-events:none}#v1111QrScanFrame:before{border-top:4px solid #19a974;border-bottom:4px solid #19a974}#v1111QrScanFrame:after{border-left:4px solid #19a974;border-right:4px solid #19a974}
#v1111QrScanStatus{min-height:18px;margin:9px 0 3px;font:900 12px Arial;color:#31556f}#v1111QrScanActions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin-top:9px}#v1111QrTorch{background:#fff3cd;color:#6b4e00}#v1111QrPick{background:#e6f3ff;color:#0b5c90}#v1111QrScanClose{background:#e8eef3;color:#123d62}#v1111QrHiddenCanvas{display:none}
@media(max-width:620px){#v1111QrScanPanel{width:100%;max-width:430px;padding:10px}#v1111QrScanView{max-height:68dvh}}
`;document.head.appendChild(st);
    const d=document.createElement('div');d.id='v1111QrModal';d.innerHTML=`<div id="v1111QrPanel"><h3>BÀN GIAO QR</h3><div id="v1111QrTarget"></div><canvas id="v1111QrCanvas"></canvas><div id="v1111QrActions"><button id="v1111QrShare" type="button">CHIA SẺ</button><button id="v1111QrClose" type="button">ĐÓNG</button></div></div>`;document.body.appendChild(d);
    document.getElementById('v1111QrClose').onclick=()=>d.classList.remove('show');document.getElementById('v1111QrShare').onclick=async()=>{const url=S(root.__SAGS_V1111_LAST_QR_URL);if(!url)return;try{if(navigator.share)await navigator.share({title:'SAGS · TIẾP TỤC HỒ SƠ',url});else{await navigator.clipboard.writeText(url);alert('Đã sao chép link QR.')}}catch(_){}};
    const q=document.createElement('div');q.id='v1111QrScanModal';q.innerHTML=`<div id="v1111QrScanPanel"><h3>QUÉT QR</h3><div id="v1111QrScanView"><video id="v1111QrVideo" playsinline muted></video><div id="v1111QrScanFrame"></div></div><div id="v1111QrScanStatus">Đưa QR vào khung</div><canvas id="v1111QrHiddenCanvas"></canvas><input id="v1111QrFile" type="file" accept="image/*" capture="environment" hidden><div id="v1111QrScanActions"><button id="v1111QrTorch" type="button">ĐÈN</button><button id="v1111QrPick" type="button">ẢNH QR</button><button id="v1111QrScanClose" type="button">ĐÓNG</button></div></div>`;document.body.appendChild(q);
    document.getElementById('v1111QrScanClose').onclick=()=>stopScanner(true);document.getElementById('v1111QrPick').onclick=()=>document.getElementById('v1111QrFile')?.click();document.getElementById('v1111QrFile').onchange=e=>decodePickedFile(e.target.files?.[0]);document.getElementById('v1111QrTorch').onclick=toggleTorch;
  }
  function drawQr(text){ensureUi();const matrix=root.SAGS_QR_MATRIX?.(text);if(!matrix?.length)throw new Error('Không tạo được QR.');const c=document.getElementById('v1111QrCanvas'),quiet=4,n=matrix.length+quiet*2,scale=Math.max(4,Math.floor(300/n)),size=n*scale;c.width=size;c.height=size;const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.fillStyle='#fff';x.fillRect(0,0,size,size);x.fillStyle='#000';for(let r=0;r<matrix.length;r++)for(let col=0;col<matrix.length;col++)if(matrix[r][col])x.fillRect((col+quiet)*scale,(r+quiet)*scale,scale,scale)}
  function showQr(url,target){ensureUi();root.__SAGS_V1111_LAST_QR_URL=url;document.getElementById('v1111QrTarget').textContent='NGƯỜI NHẬN: '+S(target);drawQr(url);document.getElementById('v1111QrModal').classList.add('show')}
  root.sagsCreateRosterQrFromCompletion=async function(payload){const p=payload||{},next=p.next||{};const toAid=S(next.assignmentId),fromAid=S(p.item?.assignmentId);if(!toAid||!fromAid||!S(p.d))return false;const to=norm(next.user||next.targetUser||p.toUser),from=me();if(!to||!from)return false;const env=clone(p.envelope||{}),id='HQ'+randHex(12),token=randHex(16),tokenHash=await sha256(token),t=Date.now(),fid=S(p.item?.flightId||next.flightId),flightLabel=S(p.item?.flightName||p.item?.flightRaw||p.item?.assignmentFlight||fid);const rec={kind:'SAGS_ROSTER_QR_HANDOVER_V2',schema:2,handoverId:id,tokenHash,status:'READY',opDate:S(p.d),flightId:fid,flightLabel,fromAssignmentId:fromAid,toAssignmentId:toAid,fromUser:from,toUser:to,createdAtMs:t,expiresAtMs:t+18*60*60*1000};const ev=`QR_HANDOVER_CREATED_${t}_${safe(fromAid)}`,patch={};patch[`roster_sessions/${safe(toAid)}/handoverEnvelope`]=env;patch[`roster_sessions/${safe(toAid)}/handoverEnvelopeAtMs`]=Number(p.completedAtMs||t);patch[`roster_sessions/${safe(toAid)}/handoverFromAssignmentId`]=fromAid;patch[`roster_sessions/${safe(toAid)}/handoverFromUser`]=from;patch[`roster_sessions/${safe(toAid)}/handoverQr`]=rec;patch[`roster_sessions/${safe(toAid)}/handoverQrId`]=id;patch[`roster_sessions/${safe(toAid)}/handoverQrReady`]=true;patch[`roster_sessions/${safe(toAid)}/handoverQrCreatedAtMs`]=t;patch[`flight_records/${safe(p.d)}/${safe(fid)}/workPartHistory/${safe(ev)}`]={eventId:ev,type:'QR_HANDOVER_CREATED',handoverId:id,assignmentId:fromAid,nextAssignmentId:toAid,fromUser:from,nextUser:to,atMs:t,status:'READY'};await db('').update(patch);await addAudit('QR_HANDOVER_CREATED',{flightId:fid,flightLabel,handoverId:id,assignmentId:fromAid,nextAssignmentId:toAid,nextUser:to});const url=qrLink(id,token,toAid);saveLocalQr({id,token,toAid,fromAid,url,toUser:to,fromUser:from,flightId:fid,opDate:S(p.d),expiresAtMs:rec.expiresAtMs,createdAtMs:t});showQr(url,to);return true};
  async function openLastQr(expectedFromAid=''){ensureUi();const x=readLocalQr();if(!x?.id||!x?.token||!x?.toAid)return false;if(expectedFromAid&&S(x.fromAid)!==S(expectedFromAid))return false;if(Number(x.expiresAtMs||0)&&Date.now()>Number(x.expiresAtMs)){clearLocalQr();return false}try{const st=(await db(`roster_sessions/${safe(x.toAid)}`).once('value')).val()||{},rec=st.handoverQr||null;if(!rec||S(rec.handoverId)!==S(x.id)){clearLocalQr();return false}if(norm(rec.fromUser)!==me()){clearLocalQr();return false}if(U(rec.status)==='CLAIMED'||rec.claimedBy){alert('Hồ sơ đã được nhận.');return true}const url=qrLink(x.id,x.token,x.toAid);showQr(url,S(rec.toUser||x.toUser));return true}catch(e){console.warn('Open last QR',e);return false}}
  root.sagsOpenOrCreateRosterQrFromCompletion=async function(payload){const fromAid=S(payload?.item?.assignmentId);if(fromAid&&await openLastQr(fromAid))return true;return !!(await root.sagsCreateRosterQrFromCompletion?.(payload))};
  function parseQrPayload(raw){try{const u=new URL(S(raw),location.href),id=S(u.searchParams.get('sagsHandover')),token=S(u.searchParams.get('sagsToken')),toAid=S(u.searchParams.get('sagsTo'));return id&&token&&toAid?{id,token,toAid}:null}catch(_){return null}}
  let scanStream=null,scanTrack=null,scanTimer=0,scanBusy=false,torchOn=false,qrLibPromise=null,nativeDetector=null;
  function scanStatus(text,bad=false){const el=document.getElementById('v1111QrScanStatus');if(el){el.textContent=S(text);el.style.color=bad?'#b42318':'#31556f'}}
  function loadJsQr(){if(typeof root.jsQR==='function')return Promise.resolve(root.jsQR);if(qrLibPromise)return qrLibPromise;qrLibPromise=new Promise((resolve,reject)=>{const old=document.getElementById('sagsJsQrLib');if(old){old.addEventListener('load',()=>resolve(root.jsQR),{once:true});old.addEventListener('error',()=>reject(new Error('Không tải được bộ đọc QR.')),{once:true});return}const s=document.createElement('script');s.id='sagsJsQrLib';s.async=true;s.src='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';s.onload=()=>typeof root.jsQR==='function'?resolve(root.jsQR):reject(new Error('Bộ đọc QR chưa sẵn sàng.'));s.onerror=()=>reject(new Error('Không tải được bộ đọc QR.'));document.head.appendChild(s)}).catch(e=>{qrLibPromise=null;throw e});return qrLibPromise}
  async function prepareNativeDetector(){if(nativeDetector!==null)return nativeDetector||null;nativeDetector=false;try{if(typeof root.BarcodeDetector==='function'){const fm=typeof root.BarcodeDetector.getSupportedFormats==='function'?await root.BarcodeDetector.getSupportedFormats():['qr_code'];if(!fm||fm.includes('qr_code'))nativeDetector=new root.BarcodeDetector({formats:['qr_code']})}}catch(_){nativeDetector=false}return nativeDetector||null}
  function stopScanner(hide=true){if(scanTimer){cancelAnimationFrame(scanTimer);scanTimer=0}scanBusy=false;try{scanStream?.getTracks?.().forEach(t=>t.stop())}catch(_){}scanStream=null;scanTrack=null;torchOn=false;const v=document.getElementById('v1111QrVideo');if(v){try{v.pause()}catch(_){}v.srcObject=null}const tb=document.getElementById('v1111QrTorch');if(tb)tb.textContent='ĐÈN';if(hide)document.getElementById('v1111QrScanModal')?.classList.remove('show')}
  async function handleScanned(raw){if(scanBusy)return;const p=parseQrPayload(raw);if(!p){scanBusy=true;scanStatus('Không phải QR bàn giao SAGS.',true);setTimeout(()=>{scanBusy=false;scanStatus('Đưa QR vào khung')},900);return}scanBusy=true;stopScanner(true);try{const u=new URL(location.href);u.searchParams.set('sagsHandover',p.id);u.searchParams.set('sagsToken',p.token);u.searchParams.set('sagsTo',p.toAid);history.replaceState(history.state,'',u.pathname+u.search+u.hash);await consumeUrl()}catch(e){alert('Không xử lý được QR: '+S(e?.message||e))}finally{scanBusy=false}}
  async function scanFrame(){if(!scanStream)return;const v=document.getElementById('v1111QrVideo');if(!v||v.readyState<2){scanTimer=requestAnimationFrame(scanFrame);return}try{const native=await prepareNativeDetector();if(native){const codes=await native.detect(v);if(codes?.[0]?.rawValue){await handleScanned(codes[0].rawValue);return}}else if(typeof root.jsQR==='function'){const c=document.getElementById('v1111QrHiddenCanvas'),w=Math.min(900,v.videoWidth||0),h=Math.max(1,Math.round((v.videoHeight||1)*(w/Math.max(1,v.videoWidth||1))));if(w>0){c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(v,0,0,w,h);const img=x.getImageData(0,0,w,h),code=root.jsQR(img.data,w,h,{inversionAttempts:'attemptBoth'});if(code?.data){await handleScanned(code.data);return}}}}catch(_){}if(scanStream)scanTimer=requestAnimationFrame(scanFrame)}
  async function openScanner(){ensureUi();stopScanner(false);document.getElementById('v1111QrScanModal')?.classList.add('show');scanStatus('Đang mở camera…');try{if(!navigator.mediaDevices?.getUserMedia)throw new Error('Thiết bị không hỗ trợ camera trong trình duyệt.');const native=await prepareNativeDetector();if(!native)loadJsQr().catch(()=>{});scanStream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:1280}}});scanTrack=scanStream.getVideoTracks?.()[0]||null;const v=document.getElementById('v1111QrVideo');v.srcObject=scanStream;await v.play();const caps=scanTrack?.getCapabilities?.()||{};const tb=document.getElementById('v1111QrTorch');if(tb)tb.style.visibility=caps.torch?'visible':'hidden';scanStatus('Đưa QR vào khung');scanTimer=requestAnimationFrame(scanFrame)}catch(e){stopScanner(false);document.getElementById('v1111QrScanModal')?.classList.add('show');scanStatus(S(e?.message||'Không mở được camera.'),true);try{await loadJsQr()}catch(_){}}}
  async function toggleTorch(){try{if(!scanTrack)return;const caps=scanTrack.getCapabilities?.()||{};if(!caps.torch)return;torchOn=!torchOn;await scanTrack.applyConstraints({advanced:[{torch:torchOn}]});const b=document.getElementById('v1111QrTorch');if(b)b.textContent=torchOn?'TẮT ĐÈN':'ĐÈN'}catch(_){}}
  async function decodePickedFile(file){if(!file)return;scanStatus('Đang đọc ảnh…');try{await loadJsQr();const bmp=await createImageBitmap(file),c=document.getElementById('v1111QrHiddenCanvas'),max=1600,ratio=Math.min(1,max/Math.max(bmp.width,bmp.height)),w=Math.max(1,Math.round(bmp.width*ratio)),h=Math.max(1,Math.round(bmp.height*ratio));c.width=w;c.height=h;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(bmp,0,0,w,h);bmp.close?.();const img=ctx.getImageData(0,0,w,h),code=root.jsQR(img.data,w,h,{inversionAttempts:'attemptBoth'});if(!code?.data)throw new Error('Không tìm thấy QR trong ảnh.');await handleScanned(code.data)}catch(e){scanStatus(S(e?.message||e),true)}finally{const f=document.getElementById('v1111QrFile');if(f)f.value=''}}
  root.sagsOpenQrScanner=openScanner;root.sagsOpenLastHandoverQr=()=>openLastQr('');
  root.addEventListener('pagehide',()=>stopScanner(false),{passive:true});document.addEventListener('visibilitychange',()=>{if(document.hidden)stopScanner(false)},{passive:true});
  let consuming=false,lastParam='';
  async function rejectQr(msg,rec,id){try{await addAudit('QR_HANDOVER_REJECTED',{flightId:S(rec?.flightId),flightLabel:S(rec?.flightLabel),handoverId:S(id),assignedUser:S(rec?.toUser),scannedBy:me(),reason:S(msg)})}catch(_){}cleanUrl();alert(msg);return false}
  function qrSessionDone(st){const cs=U(st?.claimStatus),ws=U(st?.workPartStatus),ts=U(st?.taskStatusV333||st?.taskStatus);return ['PART_COMPLETED','COMPLETED','HANDED_OVER'].includes(cs)||ws==='COMPLETED'||ts==='COMPLETED'}
  async function acquireQrCoClaim(d,item,man,uMe){const gid=S(item?.coAssigneeGroupId),aid=S(item?.assignmentId);if(!gid)return {gid:'',peers:[]};const peers=[];for(const peer of itemsOf(man).filter(x=>S(x?.coAssigneeGroupId)===gid&&S(x?.assignmentId)!==aid)){const pid=S(peer?.assignmentId);if(!pid)continue;const pst=(await db(`roster_sessions/${safe(pid)}`).once('value')).val()||{};if(qrSessionDone(pst))continue;const pcs=U(pst.claimStatus),pts=U(pst.taskStatusV333||pst.taskStatus),owner=norm(pst.claimedBy||pst.coClaimedBy||pst.ownerUser||peer.user||peer.targetUser);if((pcs==='CLAIMED'||pts==='IN_PROGRESS')&&owner&&owner!==uMe)throw new Error(`Phần việc này đã được ${owner} nhận. Bạn đang ở chế độ HỖ TRỢ.`);peers.push(peer)}const ref=db(`roster_co_claims/${safe(d)}/${safe(gid)}`),t=Date.now();const tx=await ref.transaction(cur=>{cur=cur&&typeof cur==='object'?cur:{};const status=U(cur.status),owner=norm(cur.claimedBy);if(status==='COMPLETED')return;if(status==='CLAIMED'&&owner&&owner!==uMe)return;return {schema:1,groupId:gid,status:'CLAIMED',claimedBy:uMe,claimedAssignmentId:aid,claimedAtMs:Number(cur.claimedAtMs||t)||t,updatedAtMs:t,opDate:S(d),flightId:S(item.flightId),formGroup:S(item.formGroup),sourceColumn:S(item.sourceColumn),claimSource:'QR_ROSTER_HANDOVER'};},undefined,false);if(!tx?.committed){const v=tx?.snapshot?.val?.()||{},owner=norm(v.claimedBy);throw new Error(U(v.status)==='COMPLETED'?'Nhóm hỗ trợ này đã hoàn tất.':`Phần việc này đã được ${owner||'người khác'} nhận. Bạn đang ở chế độ HỖ TRỢ.`)}return {gid,peers}}
  async function releaseQrCoClaim(d,item,uMe){const gid=S(item?.coAssigneeGroupId),aid=S(item?.assignmentId);if(!gid)return;try{await db(`roster_co_claims/${safe(d)}/${safe(gid)}`).transaction(cur=>{const owner=norm(cur?.claimedBy),caid=S(cur?.claimedAssignmentId);return U(cur?.status)==='CLAIMED'&&owner===uMe&&caid===aid?null:cur},undefined,false)}catch(_){}}
  async function consumeUrl(){if(consuming)return false;let u;try{u=new URL(location.href)}catch(_){return false}const id=S(u.searchParams.get('sagsHandover')),token=S(u.searchParams.get('sagsToken')),toAid=S(u.searchParams.get('sagsTo'));if(!id||!token||!toAid)return false;const sig=id+'|'+token+'|'+toAid;if(sig===lastParam)return false;if(!me())return false;consuming=true;lastParam=sig;try{let targetState=(await db(`roster_sessions/${safe(toAid)}`).once('value')).val()||{},rec=targetState.handoverQr||null;if(!rec||S(rec.handoverId)!==id)return await rejectQr('QR không còn hiệu lực.',rec,id);if(S(rec.tokenHash)!==await sha256(token))return await rejectQr('QR không hợp lệ.',rec,id);if(Number(rec.expiresAtMs||0)&&Date.now()>Number(rec.expiresAtMs))return await rejectQr('QR đã hết hạn.',rec,id);const d=S(rec.opDate),man=(await db(`roster_manifests/${safe(d)}`).once('value')).val()||{},item=itemsOf(man).find(x=>S(x.assignmentId)===toAid);if(!item||item.active===false)return await rejectQr('Phân công này không còn hiệu lực.',rec,id);const assigned=norm(item.user||item.targetUser),uMe=me();if(assigned!==uMe||norm(rec.toUser)!==uMe)return await rejectQr('Bạn không được phân công nhận chuyến này.',rec,id);if(S(item.flightId)!==S(rec.flightId))return await rejectQr('QR không khớp chuyến được phân công.',rec,id);const from=(await db(`roster_sessions/${safe(rec.fromAssignmentId)}`).once('value')).val()||{},fs=U(from.claimStatus),ws=U(from.workPartStatus),ts=U(from.taskStatusV333||from.taskStatus);if(!['PART_COMPLETED','COMPLETED','HANDED_OVER'].includes(fs)&&ws!=='COMPLETED'&&ts!=='COMPLETED')return await rejectQr('Phần công việc trước chưa hoàn tất.',rec,id);
    if(qrSessionDone(targetState))return await rejectQr('Phần công việc này đã hoàn tất.',rec,id);const priorClaim=targetState.handoverQrClaim||{},priorBy=norm(priorClaim.claimedBy||rec.claimedBy);if(priorBy&&priorBy!==uMe)return await rejectQr('Hồ sơ đã được người được phân công khác nhận.',rec,id);let co={gid:'',peers:[]};try{co=await acquireQrCoClaim(d,item,man,uMe)}catch(e){return await rejectQr(S(e?.message||e),rec,id)}if(!priorBy){const claimRef=db(`roster_sessions/${safe(toAid)}/handoverQrClaim`),claimResult=await claimRef.transaction(cur=>{const by=norm(cur?.claimedBy);if(by&&by!==uMe)return;return by?cur:{claimedBy:uMe,claimedAtMs:Date.now()}},undefined,false),claim=claimResult?.snapshot?.val?.()||{};if(norm(claim.claimedBy)!==uMe){await releaseQrCoClaim(d,item,uMe);return await rejectQr('Hồ sơ đã được người được phân công khác nhận.',rec,id)}targetState.handoverQrClaim=claim}
    const t=Date.now(),claimAt=Number(targetState.handoverQrClaim?.claimedAtMs||rec.claimedAtMs||t),patch={};patch[`roster_sessions/${safe(toAid)}/handoverQr/status`]='CLAIMED';patch[`roster_sessions/${safe(toAid)}/handoverQr/claimedBy`]=uMe;patch[`roster_sessions/${safe(toAid)}/handoverQr/claimedAtMs`]=claimAt;patch[`roster_sessions/${safe(toAid)}/handoverQrReady`]=false;patch[`roster_sessions/${safe(toAid)}/handoverQrClaimedAtMs`]=claimAt;patch[`roster_sessions/${safe(toAid)}/handoverQrClaimedBy`]=uMe;patch[`roster_sessions/${safe(toAid)}/workPartReady`]=true;patch[`roster_sessions/${safe(toAid)}/handoverReady`]=true;if(U(targetState.claimStatus)!=='CLAIMED')patch[`roster_sessions/${safe(toAid)}/claimStatus`]='CLAIMED';patch[`roster_sessions/${safe(toAid)}/taskStatusV333`]='IN_PROGRESS';patch[`roster_sessions/${safe(toAid)}/taskAvailabilityV333`]='ACTIVE';patch[`roster_sessions/${safe(toAid)}/taskStatusUpdatedAtMs`]=t;patch[`roster_sessions/${safe(toAid)}/claimedAtMs`]=Number(targetState.claimedAtMs||t);patch[`roster_sessions/${safe(toAid)}/claimedBy`]=uMe;patch[`roster_sessions/${safe(toAid)}/coClaimedBy`]=co.gid?uMe:null;patch[`roster_sessions/${safe(toAid)}/coClaimedAssignmentId`]=co.gid?toAid:null;patch[`roster_sessions/${safe(toAid)}/updatedAtMs`]=t;for(const peer of (co.peers||[])){const pid=S(peer?.assignmentId);if(!pid)continue;patch[`roster_sessions/${safe(pid)}/claimStatus`]='STANDBY';patch[`roster_sessions/${safe(pid)}/taskStatusV333`]='UNCLAIMED';patch[`roster_sessions/${safe(pid)}/taskAvailabilityV333`]='STANDBY';patch[`roster_sessions/${safe(pid)}/taskStatusUpdatedAtMs`]=t;patch[`roster_sessions/${safe(pid)}/coClaimedBy`]=uMe;patch[`roster_sessions/${safe(pid)}/coClaimedAssignmentId`]=toAid;patch[`roster_sessions/${safe(pid)}/coClaimedAtMs`]=t;patch[`roster_sessions/${safe(pid)}/updatedAtMs`]=t;}const ev=`QR_HANDOVER_CLAIMED_${t}_${safe(toAid)}`;patch[`flight_records/${safe(d)}/${safe(rec.flightId)}/workPartHistory/${safe(ev)}`]={eventId:ev,type:'QR_HANDOVER_CLAIMED',handoverId:id,assignmentId:toAid,fromAssignmentId:S(rec.fromAssignmentId),fromUser:S(rec.fromUser),toUser:uMe,atMs:t,status:'CLAIMED',coAssigneeGroupId:co.gid||null};patch[`flight_records/${safe(d)}/${safe(rec.flightId)}/taskClaims/${safe(uMe)}/${safe(toAid)}`]={assignmentId:toAid,username:uMe,name:S(profile().name||profile().fullName||uMe),formGroup:S(item.formGroup),sourceColumn:S(item.sourceColumn),workPartOrder:Number(item.workPartOrder||1),workPartTotal:Number(item.workPartTotal||1),coAssigneeGroupId:co.gid||null,coAssigneeUsers:co.gid?[item,...(co.peers||[])].map(x=>norm(x.user||x.targetUser)).filter(Boolean):[],status:'CLAIMED',taskStatus:'IN_PROGRESS',claimedAtMs:Number(targetState.claimedAtMs||t),updatedAtMs:t,handoverQrId:id};try{await db('').update(patch)}catch(e){await releaseQrCoClaim(d,item,uMe);throw e}
    sessionStorage.setItem('sagsV36FwcDate',d);let meta=null;try{meta=(root.readFlightSessionList?.()||[]).find(x=>S(x.rosterAssignmentId)===toAid)||null}catch(_){}if(!meta&&typeof root.sagsV340EnsureLocalSession==='function')meta=await root.sagsV340EnsureLocalSession(item);if(!meta){try{root.dailyRosterRestartMailbox?.()}catch(_){}for(let i=0;i<10&&!meta;i++){await new Promise(r=>setTimeout(r,300));try{meta=(root.readFlightSessionList?.()||[]).find(x=>S(x.rosterAssignmentId)===toAid)||null}catch(_){}}}if(!meta)throw new Error('Chưa tạo được biểu mẫu cho chuyến được phân công.');targetState=(await db(`roster_sessions/${safe(toAid)}`).once('value')).val()||targetState;const shared=clone(targetState.handoverEnvelope||targetState.envelope||{});if(!shared||typeof shared!=='object')throw new Error('Không tìm thấy dữ liệu bàn giao.');shared.mainForm=S(meta.initialGroup||item.formGroup||shared.mainForm||'fsags');shared.activeFormGroup=shared.mainForm;shared.currentPage=shared.mainForm==='fsags421'?6:(shared.mainForm==='fsags551'?9:(shared.mainForm==='fsags09'?11:1));shared.scrollY=0;shared.rosterAssignmentId=toAid;shared.rosterHandoverAppliedAtMs=t;shared.rosterHandoverSource='QR_ROSTER_HANDOVER';shared.qrHandoverAppliedId=id;shared.qrHandoverAppliedAtMs=t;localStorage.setItem(root.flightSessionStorageKey(meta.id),JSON.stringify(shared));await addAudit('QR_HANDOVER_CLAIMED',{flightId:S(rec.flightId),flightLabel:S(rec.flightLabel),handoverId:id,assignmentId:toAid,fromUser:S(rec.fromUser),toUser:uMe});cleanUrl();try{root.flightWorkspaceClose?.()}catch(_){}root.switchFlightSession?.(meta.id,true);setTimeout(()=>{try{root.showToast?.('Đã nhận hồ sơ bằng QR.')}catch(_){}},150);return true
  }catch(e){console.error('V1.1.20 consume QR handover',e);cleanUrl();alert('Không nhận được hồ sơ QR: '+S(e?.message||e));return false}finally{consuming=false}}
  root.sagsConsumeRosterQrHandover=consumeUrl;
  function scheduleConsume(){setTimeout(()=>consumeUrl(),140);setTimeout(()=>consumeUrl(),850);setTimeout(()=>consumeUrl(),1900)}
  const baseApply=root.applyRoleUI;if(typeof baseApply==='function'&&!baseApply.__v1111qr){const w=function(){const r=baseApply.apply(this,arguments);Promise.resolve(r).finally(scheduleConsume);return r};w.__v1111qr=1;root.applyRoleUI=w;try{applyRoleUI=w}catch(_){}}
  root.addEventListener('pageshow',scheduleConsume,{passive:true});root.addEventListener('focus',scheduleConsume,{passive:true});scheduleConsume();
})(typeof window!=='undefined'?window:globalThis);




/* V1.1.63: duplicate legacy account UI modules removed. */
/* V1.1.35: QUICK TIME visibility consolidated into contextual-quick-time-v313.js base logic. */


/* ===== E-REPORT/SAGS V1.1.79 · GLOBAL ACTION POPUP STANDARD ===== */
(function(root){
  "use strict";
  if(root.__SAGS_V1178_POPUP_STANDARD)return;
  root.__SAGS_V1178_POPUP_STANDARD=true;

  const S=v=>String(v??"").trim();
  const $=id=>document.getElementById(id);
  const queue=[];
  const queuedSignatures=new Set();
  let active=null;

  function autoType(text){
    const t=S(text).toLowerCase();
    if(/thất bại|không (đọc|lưu|đồng bộ|tải|chuyển|tạo|gửi|mở|xóa|cập nhật)|lỗi|error|failed/.test(t))return "error";
    if(/chưa|cảnh báo|bắt buộc|trùng|không có thay đổi|không phát sinh|không hợp lệ/.test(t))return "warning";
    if(/✓|✅|đã |thành công|hợp lệ|hoàn tất|đồng bộ/.test(t))return "success";
    return "info";
  }
  function normalize(input,type,title){
    let cfg=input&&typeof input==="object"?{...input}:{message:S(input),type:S(type)||"auto",title:S(title)};
    cfg.message=S(cfg.message);cfg.title=S(cfg.title);cfg.type=S(cfg.type)||"auto";
    if(cfg.type==="auto")cfg.type=autoType(`${cfg.title} ${cfg.message}`);
    if(!["success","warning","error","info"].includes(cfg.type))cfg.type="info";
    return cfg;
  }
  function signature(cfg){return `${cfg.type}|${S(cfg.title)}|${S(cfg.message)}`.slice(0,1200)}
  function ensurePopup(){
    let wrap=$("sagsActionPopup");if(wrap)return wrap;
    wrap=document.createElement("div");wrap.id="sagsActionPopup";wrap.setAttribute("aria-hidden","true");
    wrap.style.cssText="position:fixed;z-index:19990;inset:0;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.58);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);";
    wrap.innerHTML=`
      <div id="sagsActionPopupCard" style="width:min(92vw,540px);background:#fff;border-radius:22px;padding:22px 18px 18px;box-shadow:0 28px 85px rgba(0,0,0,.40);text-align:center;">
        <div id="sagsActionPopupIcon" style="font-size:50px;line-height:1;margin-bottom:12px;">ℹ️</div>
        <div id="sagsActionPopupTitle" style="font:900 22px/1.22 Arial;color:#143b62;margin-bottom:9px;">THÔNG BÁO</div>
        <div id="sagsActionPopupMessage" style="font:800 14px/1.5 Arial;color:#566e86;white-space:pre-wrap;word-break:break-word;max-height:48vh;overflow:auto;"></div>
        <button id="sagsActionPopupOk" type="button" style="margin-top:19px;min-width:150px;min-height:47px;border:0;border-radius:13px;background:#0c67c8;color:#fff;font:900 15px Arial;">OK</button>
      </div>`;
    document.body.appendChild(wrap);
    const close=()=>{
      if(!active)return;
      wrap.style.display="none";wrap.setAttribute("aria-hidden","true");
      active=null;
      setTimeout(showNext,70);
    };
    $("sagsActionPopupOk").onclick=close;
    wrap.addEventListener("click",e=>{if(e.target===wrap)close()});
    return wrap;
  }
  function showNext(){
    if(active||!queue.length)return;
    const item=queue.shift();queuedSignatures.delete(item.sig);active=item;
    const cfg=item.cfg,wrap=ensurePopup(),icon=$("sagsActionPopupIcon"),ttl=$("sagsActionPopupTitle"),body=$("sagsActionPopupMessage"),ok=$("sagsActionPopupOk");
    const map={
      success:{icon:"✅",title:"THÀNH CÔNG",color:"#087443"},
      warning:{icon:"⚠️",title:"CẢNH BÁO",color:"#9a5d00"},
      error:{icon:"❌",title:"THAO TÁC THẤT BẠI",color:"#b42318"},
      info:{icon:"ℹ️",title:"THÔNG BÁO",color:"#0c67c8"}
    };
    const st=map[cfg.type]||map.info;
    icon.textContent=cfg.icon||st.icon;ttl.textContent=cfg.title||st.title;ttl.style.color=st.color;ok.style.background=st.color;body.textContent=cfg.message;
    wrap.style.display="flex";wrap.setAttribute("aria-hidden","false");
    try{ok.focus({preventScroll:true})}catch(_){}
  }
  root.sagsActionPopup=function(input,type,title){
    const cfg=normalize(input,type,title),sig=signature(cfg);
    if(active?.sig===sig||queuedSignatures.has(sig))return false;
    queue.push({cfg,sig});queuedSignatures.add(sig);showNext();return true;
  };
  root.sagsActionPopupFromStatus=function(text,title){
    const msg=S(text);if(!msg)return false;
    return root.sagsActionPopup({type:"auto",title:S(title),message:msg});
  };

  // Canonical global toast alias. Callers that used showToast now receive the same large popup.
  function installToastAlias(){
    const current=root.showToast;
    if(current?.__v1178PopupAlias)return;
    const alias=function(message){
      const msg=S(message);if(!msg)return;
      return root.sagsActionPopup({type:"auto",title:"THÔNG BÁO",message:msg});
    };
    alias.__v1178PopupAlias=true;alias.__v1178Base=current;
    root.showToast=alias;
    try{showToast=alias}catch(_){}
  }

  function rosterStatus(){return S($("drStatus")?.textContent)}
  function rosterPopupFromStatus(title,msg){
    const text=S(msg)||rosterStatus()||"Thao tác DAILY ROSTER đã kết thúc.";
    root.sagsActionPopup({type:"auto",title,message:text});
  }
  function rosterDeltaMessage(d){
    d=d||{};
    const clean=root.__SAGS_V335_LAST_DELTA_CLEANUP||{};return `Cập nhật/thêm: ${Number(d.writes||0)}\nKhông đổi: ${Number(d.unchanged||0)}\nThu hồi assignment cũ theo roster mới: ${Number(d.removes||0)}\nTrong đó chỉ mới NHẬN CHUYẾN: ${Number(d.claimOnlyReplaced||0)}\nTrong đó đã có dữ liệu E-FORM (dữ liệu được giữ lịch sử): ${Number(d.editedReplaced||0)}\nCleanup ghost/tombstone: ${Number(clean.removed||0)}${Number(d.removedFlights||0)?`\nChuyến cũ không còn roster: ${Number(d.removedFlights||0)}`:""}`;
  }

  function installRosterPopupBridge(){
    const load=root.dailyRosterLoadFile;
    if(typeof load==="function"&&!load.__v1178Popup){
      const wrapped=async function(file){
        if(!file){root.sagsActionPopup({type:"warning",title:"CHƯA CHỌN FILE",message:"Hãy chọn file DAILY ROSTER trước khi tiếp tục."});return false}
        root.__SAGS_V1178_ROSTER_FILE_FLOW=Number(root.__SAGS_V1178_ROSTER_FILE_FLOW||0)+1;
        try{
          const result=await load.apply(this,arguments),msg=rosterStatus(),d=root.__SAGS_ROSTER_LAST_DELTA||{};
          if(result){
            root.sagsActionPopup({type:d.noChange?"warning":"success",title:d.noChange?"DAILY ROSTER KHÔNG CÓ THAY ĐỔI":"ĐÃ ĐỒNG BỘ DAILY ROSTER",message:d.noChange?(msg||`Không có dữ liệu mới cần ghi. Đã bỏ qua ${Number(d.unchanged||0)} phân công không đổi.`):rosterDeltaMessage(d)});
          }else{
            root.sagsActionPopup({type:"auto",title:"DAILY ROSTER",message:msg||"Chưa thể tạo chuyến từ file đã chọn. Hãy kiểm tra dữ liệu/preview."});
          }
          return result;
        }catch(e){
          root.sagsActionPopup({type:"error",title:"KHÔNG ĐỌC/ĐỒNG BỘ ĐƯỢC DAILY ROSTER",message:S(e?.message||e)});throw e;
        }finally{
          root.__SAGS_V1178_ROSTER_FILE_FLOW=Math.max(0,Number(root.__SAGS_V1178_ROSTER_FILE_FLOW||1)-1);
        }
      };
      wrapped.__v1178Popup=true;wrapped.__v1178Base=load;root.dailyRosterLoadFile=wrapped;
      try{dailyRosterLoadFile=wrapped}catch(_){}
    }

    const pub=root.dailyRosterPublish;
    if(typeof pub==="function"&&!pub.__v1178Popup){
      const wrapped=async function(){
        root.__SAGS_V1178_ROSTER_PUBLISH_FLOW=Number(root.__SAGS_V1178_ROSTER_PUBLISH_FLOW||0)+1;
        try{
          const result=await pub.apply(this,arguments);
          if(Number(root.__SAGS_V1178_ROSTER_FILE_FLOW||0)>0)return result;
          const d=root.__SAGS_ROSTER_LAST_DELTA||{},msg=rosterStatus();
          if(result){
            root.sagsActionPopup({type:d.noChange?"warning":"success",title:d.noChange?"DAILY ROSTER KHÔNG CÓ THAY ĐỔI":"ĐÃ ĐỒNG BỘ DAILY ROSTER",message:d.noChange?(msg||`Không có dữ liệu mới cần ghi. Đã bỏ qua ${Number(d.unchanged||0)} phân công không đổi.`):rosterDeltaMessage(d)});
          }else rosterPopupFromStatus("CHƯA ĐỒNG BỘ DAILY ROSTER",msg);
          return result;
        }catch(e){
          if(Number(root.__SAGS_V1178_ROSTER_FILE_FLOW||0)<=0)root.sagsActionPopup({type:"error",title:"KHÔNG ĐỒNG BỘ ĐƯỢC DAILY ROSTER",message:S(e?.message||e)});
          throw e;
        }finally{
          root.__SAGS_V1178_ROSTER_PUBLISH_FLOW=Math.max(0,Number(root.__SAGS_V1178_ROSTER_PUBLISH_FLOW||1)-1);
        }
      };
      wrapped.__v1178Popup=true;wrapped.__v1178Base=pub;root.dailyRosterPublish=wrapped;
      try{dailyRosterPublish=wrapped}catch(_){}
    }

    const loadAssignments=root.dailyRosterLoadAssignments;
    if(typeof loadAssignments==="function"&&!loadAssignments.__v1178Popup){
      const wrapped=async function(){
        try{
          const r=await loadAssignments.apply(this,arguments);
          if(Number(root.__SAGS_V1178_ROSTER_FILE_FLOW||0)<=0&&Number(root.__SAGS_V1178_ROSTER_PUBLISH_FLOW||0)<=0&&Number(root.__SAGS_V1178_ROSTER_MANAGE_FLOW||0)<=0){
            rosterPopupFromStatus("PHÂN CÔNG DAILY ROSTER",rosterStatus()||"Đã tải danh sách phân công.");
          }
          return r;
        }catch(e){
          if(Number(root.__SAGS_V1178_ROSTER_MANAGE_FLOW||0)<=0)root.sagsActionPopup({type:"error",title:"KHÔNG TẢI ĐƯỢC PHÂN CÔNG",message:S(e?.message||e)});
          throw e;
        }
      };
      wrapped.__v1178Popup=true;wrapped.__v1178Base=loadAssignments;root.dailyRosterLoadAssignments=wrapped;
      try{dailyRosterLoadAssignments=wrapped}catch(_){}
    }

    for(const name of ["dailyRosterReassign","dailyRosterResetToRoster"]){
      const fn=root[name];if(typeof fn!=="function"||fn.__v1178Popup)continue;
      const wrapped=async function(){
        const before=rosterStatus();
        root.__SAGS_V1178_ROSTER_MANAGE_FLOW=Number(root.__SAGS_V1178_ROSTER_MANAGE_FLOW||0)+1;
        try{
          const r=await fn.apply(this,arguments),after=rosterStatus();
          if(after&&after!==before){
            root.sagsActionPopup({type:"auto",title:name==="dailyRosterReassign"?"CẬP NHẬT NGƯỜI PHỤ TRÁCH":"KHÔI PHỤC THEO ROSTER",message:after});
          }
          return r;
        }catch(e){
          root.sagsActionPopup({type:"error",title:"THAO TÁC DAILY ROSTER THẤT BẠI",message:S(e?.message||e)});throw e;
        }finally{
          root.__SAGS_V1178_ROSTER_MANAGE_FLOW=Math.max(0,Number(root.__SAGS_V1178_ROSTER_MANAGE_FLOW||1)-1);
        }
      };
      wrapped.__v1178Popup=true;wrapped.__v1178Base=fn;root[name]=wrapped;
      try{
        if(name==="dailyRosterReassign")dailyRosterReassign=wrapped;
        else if(name==="dailyRosterResetToRoster")dailyRosterResetToRoster=wrapped;
      }catch(_){}
    }
  }

  function install(){
    installToastAlias();
    installRosterPopupBridge();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(install,0),{once:true});else setTimeout(install,0);
  setTimeout(install,900);setTimeout(install,2400);setTimeout(install,4200);
})(typeof window!=="undefined"?window:globalThis);


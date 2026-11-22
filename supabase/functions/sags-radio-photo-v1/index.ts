/*
 * E-REPORT-SAGS: private, original radio-photo vault.
 * IMPORTANT: verify_jwt=false at Supabase gateway ONLY because we validate
 * Firebase RS256 JWTs with Google's current JWKS, issuer, audience, timestamps.
 * Every GET/PUT must also be individually authorized by Firestore Security Rules
 * via the same Firebase ID token. No anonymous, service-role, public object access.
 *
 * Upload photo AFTER a signed Firebase custody event has committed.
 * Quota: 700 MiB radio bucket ceiling / 900 MiB aggregate project soft ceiling.
 * When the next photo would exceed the budget, remove the OLDEST entire VN day
 * of THIS bucket; preserve the current day and previous day. Never touch the
 * separate standby bucket, signatures, events or backup history in Firebase.
 */
const PROJECT="e-report-sags";
const BUCKET="sags-radio-originals-v1";
const MIB=1024*1024;
const RADIO_CAP=700*MIB;
const PROJECT_CAP=900*MIB;
const RECLAIM_HEADROOM=64*MIB;
const MAX_UPLOAD=8*MIB;
const MIN_UPLOAD=12000;
const FUNCTIONS_ALLOWED_ORIGINS=new Set([
 "https://sagsdieuhanh-gif.github.io",
 "https://e-report-sags.vercel.app",
 "http://localhost:3000",
 "http://localhost:5173"
]);
const jwksUrl="https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
let jwksCache=null,jwksExpiry=0;
function cors(req){
 const origin=req.headers.get("Origin")||"";
 return {
  "Access-Control-Allow-Origin":FUNCTIONS_ALLOWED_ORIGINS.has(origin)?origin:"null",
  "Vary":"Origin",
  "Access-Control-Allow-Methods":"GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":"authorization,content-type,x-client-info",
  "Access-Control-Max-Age":"600",
  "Cache-Control":"private, no-store"
 };
}
function reply(req,status,code,message,more={}){
 return new Response(JSON.stringify({ok:false,code,message,...more}),{
  status,headers:{...cors(req),"Content-Type":"application/json;charset=utf-8"}
 });
}
function json(req,payload,status=200){
 return new Response(JSON.stringify(payload),{
  status,headers:{...cors(req),"Content-Type":"application/json;charset=utf-8"}
 });
}
function b64url(value){
 const padded=value.replace(/-/g,"+").replace(/_/g,"/");
 const raw=atob(padded+"=".repeat((4-padded.length%4)%4));
 return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
function parseJwtPart(token){
 return JSON.parse(new TextDecoder().decode(b64url(token)));
}
async function verifyFirebase(token){
 if(typeof token!=="string"||token.length<100||token.length>12000)throw Error("bad-token");
 const pieces=token.split(".");
 if(pieces.length!==3)throw Error("bad-token");
 const head=parseJwtPart(pieces[0]),body=parseJwtPart(pieces[1]);
 const now=Math.floor(Date.now()/1000);
 if(head.alg!=="RS256"||typeof head.kid!=="string"||head.kid.length>200||
   body.aud!==PROJECT||body.iss!=="https://securetoken.google.com/"+PROJECT||
   typeof body.sub!=="string"||body.sub.length<1||body.sub.length>200||
   typeof body.exp!=="number"||body.exp<=now||
   typeof body.iat!=="number"||body.iat>now+30||body.iat<now-86400||
   typeof body.auth_time!=="number"||body.auth_time>now+30||
   !body.firebase||typeof body.firebase!=="object")throw Error("invalid-firebase-claims");
 if(!jwksCache||Date.now()>=jwksExpiry||!jwksCache.keys.some(x=>x.kid===head.kid)){
  const resp=await fetch(jwksUrl,{headers:{"Accept":"application/json"}});
  if(!resp.ok)throw Error("jwks-unavailable");
  const payload=await resp.json();
  if(!Array.isArray(payload.keys))throw Error("bad-jwks");
  jwksCache=payload;jwksExpiry=Date.now()+30*60*1000;
 }
 const jwk=jwksCache.keys.find(x=>x.kid===head.kid&&x.kty==="RSA");
 if(!jwk)throw Error("unknown-key");
 const key=await crypto.subtle.importKey("jwk",jwk,
   {name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
 const sig=b64url(pieces[2]);
 const valid=await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,sig,
   new TextEncoder().encode(pieces[0]+"."+pieces[1]));
 if(!valid)throw Error("bad-signature");
 return {uid:body.sub,raw:token};
}
function eventIdOk(id){
 return typeof id==="string"&&/^[A-Za-z0-9_-]{5,150}$/.test(id);
}
async function authorizeEvent(identity,eventId){
 // Firebase ID-token Cloud Firestore REST checks the same Firestore Rules
 // governing user/AD view permissions; do not elevate via a Google IAM token.
 const url="https://firestore.googleapis.com/v1/projects/"+PROJECT+
  "/databases/(default)/documents/sags_radio_events_v1/"+encodeURIComponent(eventId);
 const response=await fetch(url,{headers:{"Authorization":"Bearer "+identity.raw,
  "Accept":"application/json"}});
 if(response.status===403||response.status===401)return null;
 if(response.status===404)return null;
 if(!response.ok)throw Error("firestore-unavailable");
 const data=await response.json(),f=data.fields||{};
 const ev={
  actorUid:f.actorUid?.stringValue||"",
  deviceCode:f.deviceCode?.stringValue||"",
  action:f.action?.stringValue||"",
  signature:f.signature?.stringValue||"",
  signedAt:f.at?.timestampValue||""
 };
 if(!ev.actorUid||!ev.deviceCode||!ev.signature||ev.signature.length<120||
  !["ISSUE","RETURN","SWAP_OUT","SWAP_IN","REPORT"].includes(ev.action)||
  !Number.isFinite(Date.parse(ev.signedAt)))return null;
 return ev;
}
function adminKey(){
 const legacy=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(legacy)return legacy;
 const keys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");
 return typeof keys.default==="string"?keys.default:"";
}
function adminHeaders(extra={}){
 const key=adminKey();
 if(!key)throw Error("supabase-admin-secret-not-configured");
 const headers={"apikey":key,...extra};
 if(key.split(".").length===3)headers.Authorization="Bearer "+key;
 return headers;
}
function baseUrl(){
 const url=Deno.env.get("SUPABASE_URL")||"";
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url))
  throw Error("supabase-project-url-not-configured");
 return url.replace(/\/$/,"");
}
function pathUrl(path){return baseUrl()+path}
async function adminCall(method,path,data,extra={}){
 const opts={method,headers:adminHeaders({
   ...(data!==undefined?{"Content-Type":"application/json"}:{}),...extra
 })};
 if(data!==undefined)opts.body=JSON.stringify(data);
 const resp=await fetch(pathUrl(path),opts);
 const raw=await resp.text();
 if(!resp.ok){
  const err=new Error("storage-request-failed");
  err.status=resp.status;throw err;
 }
 if(!raw)return null;
 try{return JSON.parse(raw)}catch{return raw}
}
const ledger="sags_radio_photo_ledger_v1";
async function readLedger(eventId){
 const path="/rest/v1/"+ledger+"?select=event_id,actor_uid,device_code,action,signed_at,signed_day,file_path,sha256,bytes,state,purged_at"+
  "&event_id=eq."+encodeURIComponent(eventId);
 const rows=await adminCall("GET",path);
 if(!Array.isArray(rows))throw Error("ledger-unavailable");
 return rows[0]||null;
}
async function usage(){
 const rows=await adminCall("POST","/rest/v1/rpc/sags_radio_photo_usage_v1",{});
 const u=Array.isArray(rows)?rows[0]:rows;
 if(!u)throw Error("storage-usage-unavailable");
 const radio=Number(u.radio_used_bytes),other=Number(u.other_used_bytes);
 if(!Number.isFinite(radio)||radio<0||!Number.isFinite(other)||other<0)
  throw Error("storage-usage-invalid");
 return {radio,other,cap:Math.max(0,Math.min(RADIO_CAP,PROJECT_CAP-other))};
}
function dateVN(date){
 const parts=Object.fromEntries(new Intl.DateTimeFormat("en-US",{
  timeZone:"Asia/Ho_Chi_Minh",year:"numeric",month:"2-digit",day:"2-digit"
 }).formatToParts(date).map(x=>[x.type,x.value]));
 return parts.year+"-"+parts.month+"-"+parts.day;
}
function priorDay(day){return new Date(Date.parse(day+"T00:00:00Z")-86400000).toISOString().slice(0,10)}
async function acquire(holder){
 const r=await adminCall("POST","/rest/v1/rpc/sags_radio_photo_lock_acquire_v1",
  {p_holder:holder});
 return r===true;
}
async function release(holder){
 await adminCall("POST","/rest/v1/rpc/sags_radio_photo_lock_release_v1",{p_holder:holder});
}
async function oldestDayBefore(day){
 const path="/rest/v1/"+ledger+"?select=signed_day&state=eq.LIVE"+
  "&signed_day=lt."+day+"&order=signed_day.asc&limit=1";
 const rows=await adminCall("GET",path);
 return rows?.[0]?.signed_day||null;
}
async function candidatesForDay(day){
 const path="/rest/v1/"+ledger+"?select=event_id,file_path,bytes,signed_day&state=eq.LIVE"+
  "&signed_day=eq."+day+"&order=signed_at.asc&limit=70";
 const rows=await adminCall("GET",path);
 if(!Array.isArray(rows))throw Error("ledger-query-error");
 return rows;
}
async function deletePhotoRow(row){
 // Supabase requires Storage API deletion, NEVER SQL DELETE storage.objects.
 await adminCall("DELETE","/storage/v1/object/"+BUCKET,{prefixes:[row.file_path]});
 const timestamp=new Date().toISOString();
 await adminCall("PATCH","/rest/v1/"+ledger+"?event_id=eq."+encodeURIComponent(row.event_id)+
  "&state=eq.LIVE",{state:"PURGED",purged_at:timestamp,purge_reason:"BUCKET_QUOTA"},
  {"Prefer":"return=minimal"});
 await adminCall("POST","/rest/v1/sags_radio_photo_cleanup_audit_v1",
  {event_id:row.event_id,file_path:row.file_path,signed_day:row.signed_day,
   bytes:row.bytes,reason:"BUCKET_QUOTA"},
  {"Prefer":"return=minimal"});
}
async function reclaimFor(nextBytes){
 let before=await usage();
 if(before.radio+nextBytes<=before.cap)return {freed:0,days:[]};
 // Keep at least the current calendar day and its previous day.
 const today=dateVN(new Date()),cutoff=priorDay(today);
 const target=Math.max(0,before.cap-RECLAIM_HEADROOM-nextBytes);
 const days=[],start=before.radio;
 for(let pass=0;pass<70;pass++){
  const day=await oldestDayBefore(cutoff);
  if(!day)break;
  let count=0;
  // A DAY is the unit of eviction. Do not stop halfway through one day
  // after reaching the target, unless the service fails (fail closed).
  for(let page=0;page<200;page++){
   const rows=await candidatesForDay(day);
   if(rows.length===0)break;
   for(const row of rows){await deletePhotoRow(row);count++}
   if(rows.length<70)break;
  }
  if(!count)throw Error("quota-day-no-progress");
  days.push(day);
  const after=await usage();
  if(after.radio<=target&&after.radio+nextBytes<=after.cap)return {freed:start-after.radio,days};
 }
 const after=await usage();
 if(after.radio+nextBytes>after.cap)throw Error("recent-photo-retention-or-project-storage-limit");
 return {freed:start-after.radio,days};
}
function shaHex(bytes){
 return crypto.subtle.digest("SHA-256",bytes).then(buffer=>
  [...new Uint8Array(buffer)].map(x=>x.toString(16).padStart(2,"0")).join(""));
}
async function saveOriginal(req,identity){
 const form=await req.formData();
 const eventId=form.get("eventId"),blob=form.get("image");
 if(!eventIdOk(eventId)||!(blob instanceof Blob)||
    blob.type!=="image/jpeg"||blob.size<MIN_UPLOAD||blob.size>MAX_UPLOAD)
  return reply(req,400,"BAD_IMAGE","Ảnh phải là JPEG thực tế, dung lượng 12 KB–8 MB.");
 const ev=await authorizeEvent(identity,eventId);
 if(!ev||ev.actorUid!==identity.uid)
  return reply(req,403,"EVENT_DENIED","Không thể xác minh quyền và sự kiện ký nhận Firebase.");
 const existing=await readLedger(eventId);
 const bytes=new Uint8Array(await blob.arrayBuffer());
 if(bytes[0]!==255||bytes[1]!==216||bytes[bytes.length-2]!==255||bytes[bytes.length-1]!==217)
  return reply(req,400,"BAD_JPEG","Ảnh JPEG không hợp lệ.");
 const digest=await shaHex(bytes);
 if(existing){
  if(existing.actor_uid!==identity.uid)return reply(req,403,"EVENT_DENIED","Không có quyền.");
  if(existing.state==="PURGED")return reply(req,410,"PHOTO_PURGED","Ảnh gốc đã được tự dọn khi kho gần đầy, không được ghi đè chứng cứ cũ.");
  if(existing.sha256===digest)return json(req,{ok:true,status:"EXISTS",eventId});
  return reply(req,409,"PHOTO_IMMUTABLE","Ảnh của sự kiện đã lưu và không thể sửa đổi.");
 }
 const holder=crypto.randomUUID();
 if(!await acquire(holder))return reply(req,429,"UPLOAD_BUSY","Kho ảnh đang xử lý lượt khác, sẽ thử lại.",{retryAfterSec:5});
 try{
  const latest=await readLedger(eventId);
  if(latest)return reply(req,409,"PHOTO_IMMUTABLE","Đã có ảnh gắn với sự kiện.");
  const reclaimed=await reclaimFor(blob.size);
  const time=new Date(ev.signedAt);
  const day=dateVN(time);
  const filePath=day.replace(/-/g,"/")+"/"+eventId+"-"+digest+".jpg";
  const url="/storage/v1/object/"+BUCKET+"/"+filePath;
  const uploaded=await fetch(pathUrl(url),{method:"POST",
   headers:adminHeaders({"Content-Type":"image/jpeg","x-upsert":"false",
     "Cache-Control":"private, max-age=0"}),
   body:bytes});
  if(!uploaded.ok){
   if(![400,409].includes(uploaded.status))throw Error("private-photo-storage-upload-failed");
   // A previous upload might have succeeded but the ledger insert was
   // interrupted. The deterministic FULL SHA-256 path lets a retry repair
   // the ledger without overwriting or deleting an immutable original.
   const info=await fetch(pathUrl("/storage/v1/object/info/"+BUCKET+"/"+filePath),
     {headers:adminHeaders()});
   if(!info.ok)throw Error("private-photo-collision-or-upload-failed");
   const details=await info.json();
   const storedSize=Number(details.metadata?.size??details.size);
   if(storedSize!==bytes.length)throw Error("private-photo-existing-size-mismatch");
  }
  // Store the signed Firebase timestamp (not local upload time) and an
  // immutable content checksum; tombstone remains after quota eviction.
  await adminCall("POST","/rest/v1/"+ledger,
   {event_id:eventId,actor_uid:identity.uid,device_code:ev.deviceCode,
    action:ev.action,signed_at:time.toISOString(),signed_day:day,
    file_path:filePath,bytes:blob.size,sha256:digest,state:"LIVE"},
   {"Prefer":"return=minimal"});
  return json(req,{ok:true,status:"STORED",eventId,bytes:blob.size,
   signedDay:day,cleanedDays:reclaimed.days});
 }catch(error){
  console.error("Photo archive failed:",String(error?.message||error).slice(0,100));
  return reply(req,503,"ARCHIVE_FAILED","Chưa lưu được ảnh gốc. Giữ bản ảnh trên thiết bị để đồng bộ lại.");
 }finally{
  await release(holder).catch(()=>{});
 }
}
async function serveOriginal(req,identity,eventId){
 if(!eventIdOk(eventId))return reply(req,400,"BAD_EVENT","Mã sự kiện không hợp lệ.");
 const ev=await authorizeEvent(identity,eventId);
 if(!ev)return reply(req,403,"EVENT_DENIED","Không thể xác minh quyền xem sự kiện Firebase.");
 const row=await readLedger(eventId);
 if(!row)return reply(req,404,"NO_ORIGINAL","Sự kiện này chưa có ảnh gốc trên Supabase.");
 if(row.actor_uid!==ev.actorUid||row.device_code!==ev.deviceCode||row.action!==ev.action)
  return reply(req,403,"MISMATCH","Bằng chứng không khớp sự kiện Firebase.");
 if(row.state==="PURGED")return reply(req,410,"AUTO_PURGED",
  "Ảnh gốc đã được tự dọn theo ngày khi gần đầy. Ảnh ký nhận trong Firebase vẫn được giữ.",
  {purgedAt:row.purged_at});
 const path="/storage/v1/object/authenticated/"+BUCKET+"/"+row.file_path;
 const picture=await fetch(pathUrl(path),{headers:adminHeaders()});
 if(!picture.ok)return reply(req,503,"FILE_UNAVAILABLE","Kho ảnh đang không thể trả ảnh; ảnh ký nhận Firebase vẫn có.");
 if(Number(picture.headers.get("Content-Length")||0)>MAX_UPLOAD)
  return reply(req,503,"BAD_SIZE","Ảnh trong kho vượt giới hạn.");
 return new Response(picture.body,{status:200,
  headers:{...cors(req),"Content-Type":"image/jpeg","X-SAGS-Photo-Source":"supabase-private-original",
   "X-SAGS-Signed-Day":row.signed_day}});
}
Deno.serve(async req=>{
 if(req.method==="OPTIONS"){
  if(!FUNCTIONS_ALLOWED_ORIGINS.has(req.headers.get("Origin")||""))
   return reply(req,403,"ORIGIN_DENIED","Nguồn truy cập không được phép.");
  return new Response(null,{status:204,headers:cors(req)});
 }
 const origin=req.headers.get("Origin")||"";
 if(origin&&!FUNCTIONS_ALLOWED_ORIGINS.has(origin))
  return reply(req,403,"ORIGIN_DENIED","Nguồn truy cập không được phép.");
 if(!["GET","POST"].includes(req.method))
  return reply(req,405,"METHOD_DENIED","Phương thức không hỗ trợ.");
 const bearer=req.headers.get("Authorization")||"";
 if(!/^Bearer [A-Za-z0-9_.-]+$/.test(bearer))
  return reply(req,401,"AUTH_REQUIRED","Cần đăng nhập Firebase để xem hoặc lưu ảnh.");
 let identity;
 try{identity=await verifyFirebase(bearer.slice(7))}
 catch{return reply(req,401,"AUTH_INVALID","Không thể xác thực phiên đăng nhập Firebase.");}
 try{
  if(req.method==="GET")return await serveOriginal(req,identity,
   new URL(req.url).searchParams.get("eventId"));
  if(!(req.headers.get("Content-Type")||"").startsWith("multipart/form-data"))
   return reply(req,415,"MULTIPART_REQUIRED","Cần gửi ảnh bằng FormData.");
  return await saveOriginal(req,identity);
 }catch(error){
  console.error("Photo API error:",String(error?.message||error).slice(0,100));
  return reply(req,503,"SERVICE_UNAVAILABLE","Kho ảnh tạm thời không sẵn sàng. Chứng từ Firebase không bị ảnh hưởng.");
 }
});

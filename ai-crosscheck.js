import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { initializeAppCheck, ReCaptchaEnterpriseProvider, getToken } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app-check.js";
import { getAI, getGenerativeModel, GoogleAIBackend, Schema } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-ai.js";

const AI_VERSION="E_REPORT_AI_CROSSCHECK_V1_6_HYBRID_FAST";
const FAST_MODEL="gemini-3.5-flash-lite";
const ACCURATE_MODEL="gemini-3.6-flash";
const FAST_TIMEOUT_MS=40000;
const ACCURATE_TIMEOUT_MS=55000;
let aiApp=null, appCheckInstance=null, models=null, activeConfig=null, activeModelNames={fast:FAST_MODEL,accurate:ACCURATE_MODEL}, configLoadedAt=0;
const inFlight=new Map();

function el(id){return document.getElementById(id)}
function role(){try{return String(window.sagsAiGetRole?.()||"")}catch(e){return ""}}
function escapeHtmlLocal(v){return String(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}
function setPanel(state,text,issues=[],confidence=null){
  const panel=el("cxAiPanel"),badge=el("cxAiBadge"),txt=el("cxAiText"),iss=el("cxAiIssues"),conf=el("cxAiConfidence"),cfg=el("cxAiConfigBtn"),diag=el("cxAiDiagBtn");
  if(!panel)return;
  if(cfg)cfg.style.display=(role()==="AD")?"inline-flex":"none";if(diag)diag.style.display=(role()==="AD")?"inline-flex":"none";
  const map={IDLE:["CHƯA CHẠY","#e2e8f0","#475569"],READY:["AI SẴN SÀNG","#dcfce7","#166534"],RUNNING:["ĐANG ĐỐI CHIẾU","#dbeafe","#1d4ed8"],MATCH:["KHỚP","#dcfce7","#166534"],REVIEW:["CẦN KIỂM TRA","#ffedd5","#9a3412"],UNREADABLE:["KHÔNG ĐỌC ĐƯỢC","#fee2e2","#991b1b"],ERROR:["AI CHƯA SẴN SÀNG","#fee2e2","#991b1b"]};
  const m=map[state]||map.IDLE;
  if(badge){badge.textContent=m[0];badge.style.background=m[1];badge.style.color=m[2];}
  if(txt)txt.textContent=text||"AI đọc ảnh CHECK và đối chiếu trực tiếp với dữ liệu FINAL điện tử.";
  if(conf)conf.textContent=(confidence===null||confidence===undefined)?"":`Độ tin cậy: ${Math.round(Number(confidence)||0)}%`;
  if(iss){
    const arr=Array.isArray(issues)?issues:[];
    iss.style.display=arr.length?"block":"none";
    iss.innerHTML=arr.map((x,i)=>{
      const field=String(x?.field||`Sai lệch ${i+1}`),paper=String(x?.paperValue??""),finalv=String(x?.finalValue??""),reason=String(x?.reason||"");
      return `<div style="margin:3px 0"><b>${escapeHtmlLocal(field)}</b>${paper||finalv?` · Giấy: <b>${escapeHtmlLocal(paper||"?")}</b> · FINAL: <b>${escapeHtmlLocal(finalv||"?")}</b>`:""}${reason?`<br><span>${escapeHtmlLocal(reason)}</span>`:""}</div>`;
    }).join("");
  }
}

async function loadConfig(force=false){
  if(!force&&activeConfig&&Date.now()-configLoadedAt<120000)return activeConfig;
  if(typeof window.sagsAiLoadConfig!=="function")throw new Error("Bridge cấu hình AI chưa sẵn sàng.");
  activeConfig=await window.sagsAiLoadConfig();configLoadedAt=Date.now();
  return activeConfig;
}
function resolveModelNames(cfg){
  const legacy=String(cfg?.model||"").trim();
  const fast=String(cfg?.fastModel||"").trim() || (/flash-lite/i.test(legacy)?legacy:FAST_MODEL);
  const accurate=String(cfg?.accurateModel||"").trim() || ((legacy&&!/flash-lite/i.test(legacy))?legacy:ACCURATE_MODEL);
  return {fast:fast||FAST_MODEL,accurate:accurate||ACCURATE_MODEL};
}
function resultSchema(){
  return Schema.object({properties:{
    status:Schema.enumString({enum:["MATCH","REVIEW","UNREADABLE"]}),
    confidence:Schema.number(),
    summary:Schema.string(),
    flightMatch:Schema.boolean(),
    regMatch:Schema.boolean(),
    revisionSuspicion:Schema.boolean(),
    criticalUnreadable:Schema.boolean(),
    differences:Schema.array({maxItems:10,items:Schema.object({properties:{field:Schema.string(),paperValue:Schema.string(),finalValue:Schema.string(),severity:Schema.enumString({enum:["LOW","MEDIUM","HIGH"]}),reason:Schema.string()}})}),
    observations:Schema.array({maxItems:4,items:Schema.string()})
  }});
}
async function initModels(force=false){
  const cfg=await loadConfig(force);
  if(!cfg?.enabled)throw new Error("AI CROSSCHECK chưa được AD bật.");
  const siteKey=String(cfg.appCheckSiteKey||"").trim();
  if(!siteKey)throw new Error("Chưa có App Check site key. AD bấm CẤU HÌNH AI.");
  if(models&&!force)return models;
  const conf=window.SAGS_FIREBASE_CONFIG;
  if(!conf?.projectId)throw new Error("Không tìm thấy Firebase config.");
  if(String(conf.projectId)!=="e-report-sags")throw new Error("AI chỉ được phép dùng Firebase project e-report-sags.");
  if(!conf.apiKey||!conf.appId)throw new Error("firebase-config.js chưa có đủ Web App config của e-report-sags (thiếu apiKey/appId).");
  const list=getApps();aiApp=list.find(a=>a.name==="SAGS_AI")||initializeApp(conf,"SAGS_AI");
  if(!appCheckInstance){
    try{appCheckInstance=initializeAppCheck(aiApp,{provider:new ReCaptchaEnterpriseProvider(siteKey),isTokenAutoRefreshEnabled:true});}
    catch(e){if(!/already|initialized/i.test(String(e?.message||e)))throw taggedError("APP_CHECK_INIT",e);}
  }
  const ai=getAI(aiApp,{backend:new GoogleAIBackend()});
  activeModelNames=resolveModelNames(cfg);
  const schema=resultSchema();
  models={
    fast:getGenerativeModel(ai,{model:activeModelNames.fast,generationConfig:{responseMimeType:"application/json",responseSchema:schema,maxOutputTokens:2300}},{timeout:FAST_TIMEOUT_MS}),
    accurate:getGenerativeModel(ai,{model:activeModelNames.accurate,generationConfig:{responseMimeType:"application/json",responseSchema:schema,maxOutputTokens:2700}},{timeout:ACCURATE_TIMEOUT_MS})
  };
  return models;
}

function dataUrlPart(url){
  const m=String(url||"").match(/^data:([^;]+);base64,(.+)$/s);if(!m)throw new Error("Ảnh không hợp lệ.");
  return {inlineData:{mimeType:m[1],data:m[2]}};
}
function loadImage(url){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error("Không đọc được ảnh."));im.src=url;});}
async function normalizeImageDataUrl(url,maxDim=1400,quality=.72){
  const raw=String(url||"");if(!/^data:image\//i.test(raw))throw new Error("Ảnh CHECK không hợp lệ.");
  const im=await loadImage(raw),scale=Math.min(1,maxDim/Math.max(im.naturalWidth||im.width,im.naturalHeight||im.height));
  if(scale>=.999 && /^data:image\/jpe?g/i.test(raw) && raw.length<1_500_000)return raw;
  const w=Math.max(1,Math.round((im.naturalWidth||im.width)*scale)),h=Math.max(1,Math.round((im.naturalHeight||im.height)*scale));
  const c=document.createElement("canvas");c.width=w;c.height=h;const ctx=c.getContext("2d",{alpha:false});ctx.fillStyle="#fff";ctx.fillRect(0,0,w,h);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";ctx.drawImage(im,0,0,w,h);return c.toDataURL("image/jpeg",quality);
}
function safeValue(v,depth=0){
  if(depth>4)return null;
  if(v===null||v===undefined)return v;
  if(typeof v==="string"){if(/^data:/i.test(v)||v.length>1600)return undefined;return v.length>260?v.slice(0,260):v;}
  if(typeof v==="number"||typeof v==="boolean")return v;
  if(Array.isArray(v))return v.slice(0,50).map(x=>safeValue(x,depth+1)).filter(x=>x!==undefined);
  if(typeof v==="object"){
    const out={};for(const [k,val] of Object.entries(v)){
      if(/password|passhash|salt|token|signature|photo|image|dataurl|base64|attachment|canvas/i.test(k))continue;
      const x=safeValue(val,depth+1);if(x!==undefined)out[k]=x;
    }return out;
  }
  return undefined;
}
function finalReference(pkg){
  return safeValue({identity:pkg.identity||{},revisionNo:pkg.revisionNo,attemptNo:pkg.attemptNo,form:pkg.finalSnapshot?.form||"",finalData:pkg.finalSnapshot?.data||{}});
}
function promptFor(pkg,{compact=false,verify=false}={}){
  const clean=finalReference(pkg);
  const short=compact?"Tối đa 6 differences, 2 observations; summary tối đa 160 ký tự; reason mỗi difference tối đa 90 ký tự.":"Tối đa 10 differences, 4 observations; summary tối đa 220 ký tự; reason mỗi difference tối đa 120 ký tự.";
  const verifyText=verify?"Đây là lượt XÁC MINH SÂU vì lượt FAST có độ tin cậy thấp/ảnh khó đọc/sai lệch quan trọng. Hãy kiểm tra kỹ các con số trước khi kết luận.\n":"";
  return `Bạn là AI CROSSCHECK FINAL trong khai thác hàng không. ${verifyText}INPUT IMAGE = ảnh bản giấy CHECK do ĐH gửi. Không có ảnh FINAL vì FINAL điện tử đã được cung cấp dưới dạng JSON có cấu trúc bên dưới.\n\nNHIỆM VỤ:\n1) Đọc trực tiếp ảnh giấy CHECK.\n2) Đối chiếu những trường đọc được với FINAL JSON.\n3) Chỉ báo sai lệch thực sự; không đoán chữ/số bị mờ và không bịa trường không có.\n4) Ưu tiên kiểm tra: số chuyến/ngày/A-C REG; PAX/crew/class totals; baggage/cargo/ULD/weight; loading zones/positions; remarks nếu nhìn rõ.\n\nKẾT LUẬN:\n- MATCH: các thông tin quan trọng đọc được khớp.\n- REVIEW: có ít nhất một sai lệch, dấu hiệu nhầm revision, hoặc chi tiết đáng ngờ.\n- UNREADABLE: ảnh mờ/cắt mất vùng quan trọng, không đủ cơ sở.\n- confidence 0..100.\n- differences chỉ chứa sai lệch đọc được từ ảnh so với FINAL JSON.\n- Không tự sửa dữ liệu và không tự phê duyệt nghiệp vụ.\n- ${short}\n- Chỉ trả JSON đúng schema, không markdown/code fence/chữ ngoài JSON.\n\nFINAL JSON THAM CHIẾU:\n${JSON.stringify(clean)}`;
}

function cleanJsonText(text){let s=String(text||"").trim();return s.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/i,"").trim();}
function parseAiJson(text){
  const s=cleanJsonText(text);if(!s)throw taggedError("AI_EMPTY_RESPONSE",new Error("AI không trả nội dung JSON."));
  try{return JSON.parse(s);}catch(_){
    const a=s.indexOf("{"),b=s.lastIndexOf("}");if(a>=0&&b>a){try{return JSON.parse(s.slice(a,b+1));}catch(__){}}
    const e=new Error("AI trả kết quả không đúng JSON.");e.aiRaw=s.slice(0,1600);throw taggedError("AI_JSON_INVALID",e);
  }
}
function responseMeta(response){
  const c=Array.isArray(response?.candidates)?response.candidates[0]:null,u=response?.usageMetadata||{};
  return {finishReason:String(c?.finishReason||""),finishMessage:String(c?.finishMessage||""),candidateTokenCount:Number(c?.tokenCount||0),promptTokenCount:Number(u?.promptTokenCount||0),candidatesTokenCount:Number(u?.candidatesTokenCount||0),totalTokenCount:Number(u?.totalTokenCount||0)};
}
function isTimeoutError(e){const x=compactErrorText(e).toLowerCase();return e?.name==="AbortError"||/timeout has expired|timed? out|deadline exceeded|aborterror/.test(x);}
async function generateAndParse(mdl,modelName,pkg,paperUrl,{compact=false,verify=false}={}){
  let out;
  try{out=await mdl.generateContent([promptFor(pkg,{compact,verify}),dataUrlPart(paperUrl)]);}
  catch(e){const err=taggedError(isTimeoutError(e)?"AI_TIMEOUT":"GENERATE_CONTENT",e);err.aiModel=modelName;throw err;}
  const meta=responseMeta(out?.response);let text="";
  try{text=out?.response?.text?.()||"";}catch(e){const err=taggedError("AI_RESPONSE_TEXT",e);err.aiMeta=meta;err.aiModel=modelName;throw err;}
  if(String(meta.finishReason).toUpperCase()==="MAX_TOKENS"){
    const e=new Error(`AI dừng vì MAX_TOKENS trước khi hoàn tất kết quả.${meta.finishMessage?" "+meta.finishMessage:""}`);e.aiMeta=meta;e.aiRaw=String(text).slice(0,1600);e.aiModel=modelName;throw taggedError("AI_OUTPUT_TRUNCATED",e);
  }
  try{return {parsed:parseAiJson(text),meta,text,modelName};}catch(e){e.aiMeta=meta;e.aiRaw=e.aiRaw||String(text).slice(0,1600);e.aiModel=modelName;throw e;}
}
function shouldRetryOutputError(e){return ["AI_OUTPUT_TRUNCATED","AI_JSON_INVALID","AI_EMPTY_RESPONSE"].includes(String(e?.sagsStage||""));}
async function runModelWithJsonRetry(mdl,modelName,pkg,paperUrl,{verify=false}={}){
  try{const x=await generateAndParse(mdl,modelName,pkg,paperUrl,{compact:false,verify});return {...x,retryUsed:false};}
  catch(e){if(!shouldRetryOutputError(e))throw e;console.warn("AI output chưa hoàn chỉnh, tự thử lại JSON rút gọn",modelName,e);const x=await generateAndParse(mdl,modelName,pkg,paperUrl,{compact:true,verify});return {...x,retryUsed:true};}
}
function normalizedStatus(parsed){const allowed=new Set(["MATCH","REVIEW","UNREADABLE"]),x=String(parsed?.status||"REVIEW").toUpperCase();return allowed.has(x)?x:"REVIEW";}
function needsAccurateVerification(parsed){
  const status=normalizedStatus(parsed),confidence=Math.max(0,Math.min(100,Number(parsed?.confidence)||0)),diffs=Array.isArray(parsed?.differences)?parsed.differences:[];
  if(status==="UNREADABLE"||confidence<78||parsed?.revisionSuspicion||parsed?.criticalUnreadable)return true;
  if(diffs.some(x=>String(x?.severity||"").toUpperCase()==="HIGH"))return true;
  if(status==="REVIEW"&&confidence<90)return true;
  return false;
}

function compactErrorText(e){
  const parts=[],add=v=>{const s=String(v??"").trim();if(s&&!parts.includes(s))parts.push(s)};
  add(e?.message);add(e?.code);add(e?.name);add(e?.status);add(e?.statusText);try{add(e?.customData&&JSON.stringify(e.customData));}catch(_){}try{add(e?.cause?.message||e?.cause);}catch(_){}try{if(e?.aiMeta)add("AI_META="+JSON.stringify(e.aiMeta));}catch(_){}try{if(e?.aiRaw)add("AI_RAW="+String(e.aiRaw).slice(0,1200));}catch(_){}if(e?.aiModel)add("MODEL="+e.aiModel);add(e);return parts.join(" | ").replace(/\s+/g," ").slice(0,3000);
}
function taggedError(stage,e){const err=(e instanceof Error)?e:new Error(String(e||"Lỗi không xác định"));try{err.sagsStage=stage||err.sagsStage||"";}catch(_){}return err;}
function masked(v,left=8,right=5){const s=String(v||"");if(!s)return "(trống)";if(s.length<=left+right+3)return s;return s.slice(0,left)+"…"+s.slice(-right);}
function classifyAiError(e,stage=""){
  const raw=compactErrorText(e),x=raw.toLowerCase(),st=String(stage||e?.sagsStage||"").toUpperCase(),conf=window.SAGS_FIREBASE_CONFIG||{};
  const names=activeModelNames||{fast:FAST_MODEL,accurate:ACCURATE_MODEL};
  const env=`Project: ${conf.projectId||"?"} · AppID: ${masked(conf.appId,10,6)} · API key: ${masked(conf.apiKey,10,6)} · FAST: ${names.fast} · FALLBACK: ${names.accurate} · Host: ${location.hostname||"?"}`;
  let d={code:"AI-UNKNOWN",where:st||"AI CROSSCHECK",summary:"AI chưa chạy được.",action:"Xem chi tiết kỹ thuật bên dưới.",raw,env};
  if(st==="AI_TIMEOUT"||/timeout has expired|timed? out|deadline exceeded|aborterror/.test(x)){
    d={...d,code:"AI-TIMEOUT",where:"GENERATE_CONTENT",summary:"AI xử lý quá thời gian cho phép nên V1.6 đã dừng request.",action:`FAST giới hạn ${FAST_TIMEOUT_MS/1000} giây; lượt xác minh sâu giới hạn ${ACCURATE_TIMEOUT_MS/1000} giây. Bấm AI CHECK LẠI nếu mạng ổn định.`};
  }else if(st==="AI_OUTPUT_TRUNCATED"||/max_tokens|dừng vì max_tokens/.test(x)){
    d={...d,code:"AI-OUTPUT-TRUNCATED",where:"GENERATE_CONTENT → output",summary:"Kết quả AI bị dừng trước khi hoàn tất JSON.",action:"V1.6 tự thử lại 01 lần bằng JSON rút gọn. Nếu vẫn lỗi, bấm AI CHECK LẠI."};
  }else if(st==="AI_JSON_INVALID"||/không đúng json/.test(x)){
    d={...d,code:"AI-JSON-INVALID",where:"GENERATE_CONTENT → parse JSON",summary:"AI đã trả dữ liệu nhưng JSON chưa hoàn chỉnh/hợp lệ.",action:"V1.6 tự thử lại 01 lần với output ngắn hơn; xem Chi tiết kỹ thuật nếu lỗi lặp lại."};
  }else if(st==="AI_EMPTY_RESPONSE"){
    d={...d,code:"AI-EMPTY-RESPONSE",where:"GENERATE_CONTENT → response",summary:"AI không trả nội dung kết quả.",action:"Hệ thống tự thử lại 01 lần; nếu còn lỗi, bấm AI CHECK LẠI."};
  }else if(/api_key_invalid|api key not valid/.test(x)){
    d={...d,code:"AI-400-API_KEY_INVALID",where:"firebase-config.js → apiKey",summary:"API key Firebase Web không hợp lệ hoặc không đúng Web App E-REPORT.",action:"Kiểm tra Web App config của project e-report-sags."};
  }else if(/requests? from referer|referer .*blocked|api key.*referer|http referrer/.test(x)){
    d={...d,code:"AI-403-API_KEY_REFERRER",where:"Google Cloud → Browser API key → Application restrictions",summary:"API key bị chặn theo website/referrer.",action:"Cho phép domain GitHub Pages đang chạy E-REPORT trong Website restrictions."};
  }else if(/exchangeRecaptchaEnterpriseToken|appcheck\/fetch-status-error|unable to obtain a valid app check token|firebaseappcheck\.googleapis\.com|appcheck.*400|appcheck.*403/i.test(raw)){
    d={...d,code:"AI-APP_CHECK_TOKEN",where:"Firebase App Check → reCAPTCHA Enterprise",summary:"Không lấy được App Check token.",action:"Kiểm tra Site Key reCAPTCHA Enterprise và domain GitHub Pages."};
  }else if(/permission[_ -]?denied|missing or insufficient permissions|unauthenticated|unauthorized/.test(x)){
    d={...d,code:"AI-PERMISSION_DENIED",where:"Firebase/Google API permission",summary:"Request bị từ chối quyền.",action:"Mở Network/Console để xem đúng service bị từ chối."};
  }else if(/model.*not found|not found.*model|404|not_found/.test(x)){
    d={...d,code:"AI-404-MODEL",where:"Firebase AI Logic → model",summary:"Model Gemini không tồn tại/không được hỗ trợ cho provider hiện tại.",action:`FAST=${names.fast}; FALLBACK=${names.accurate}.`};
  }else if(/quota|resource[_ -]?exhausted|429|rate limit/.test(x)){
    d={...d,code:"AI-429-QUOTA",where:"Firebase AI Logic / Gemini quota",summary:"Đã chạm quota hoặc rate limit.",action:"Chờ quota hồi phục rồi thử lại."};
  }else if(/billing|failed[_ -]?precondition/.test(x)){
    d={...d,code:"AI-BILLING-PRECONDITION",where:"Firebase AI Logic project configuration",summary:"Project chưa đáp ứng điều kiện API/billing.",action:"Kiểm tra Firebase AI Logic setup theo thông báo kỹ thuật."};
  }else if(/network|failed to fetch|load failed|offline|internet disconnected/.test(x)){
    d={...d,code:"AI-NETWORK",where:"Kết nối mạng / trình duyệt",summary:"Không kết nối được tới Firebase AI Logic.",action:"Kiểm tra mạng, VPN/proxy/ad-blocker rồi thử lại."};
  }else if(/403|forbidden/.test(x)){
    d={...d,code:"AI-403-FORBIDDEN",where:st||"Firebase AI Logic / App Check",summary:"Google/Firebase trả 403 Forbidden.",action:"Xem Chi tiết kỹ thuật để xác định API key restriction hay App Check."};
  }
  return d;
}
function showAiDiagnostic(e,stage=""){
  const d=classifyAiError(e,stage);setPanel("ERROR",`${d.code} · LỖI TẠI: ${d.where}\n${d.summary}`);const iss=el("cxAiIssues");
  if(iss){iss.style.display="block";iss.innerHTML=`<div style="padding:7px;border-radius:8px;background:#fff7ed;border:1px solid #fed7aa;color:#7c2d12"><div><b>MÃ LỖI:</b> ${escapeHtmlLocal(d.code)}</div><div><b>VỊ TRÍ:</b> ${escapeHtmlLocal(d.where)}</div><div style="margin-top:4px"><b>CẦN LÀM:</b> ${escapeHtmlLocal(d.action)}</div><div style="margin-top:4px;color:#475569"><b>MÔI TRƯỜNG:</b> ${escapeHtmlLocal(d.env)}</div><details style="margin-top:5px"><summary style="cursor:pointer"><b>Chi tiết kỹ thuật</b></summary><div style="margin-top:4px;word-break:break-word;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${escapeHtmlLocal(d.raw||"(không có)")}</div></details></div>`;}
  return d;
}

async function run(pkg,{force=false}={}){
  if(!pkg?.packageId||!pkg?.dhPhoto||!pkg?.finalSnapshot)throw new Error("Thiếu gói CROSSCHECK để AI phân tích.");
  if(pkg.aiCrosscheck&&!force){render(pkg.aiCrosscheck,pkg);return pkg.aiCrosscheck;}
  const key=String(pkg.packageId);if(inFlight.has(key))return inFlight.get(key);
  const p=(async()=>{
    const started=performance.now();let stage="AI đang khởi tạo…";
    const tick=()=>setPanel("RUNNING",`${stage} · ${Math.max(0,Math.round((performance.now()-started)/1000))} giây`);const timer=setInterval(tick,1000);tick();
    try{
      const tInit=performance.now(),mdl=await initModels(false),initMs=performance.now()-tInit;
      stage="AI đang tối ưu 1 ảnh CHECK…";tick();const tImage=performance.now(),paperUrl=await normalizeImageDataUrl(pkg.dhPhoto),imageMs=performance.now()-tImage;
      stage=`AI FAST (${activeModelNames.fast}) đang đọc ảnh CHECK…`;tick();const tFast=performance.now();
      const fast=await runModelWithJsonRetry(mdl.fast,activeModelNames.fast,pkg,paperUrl,{verify:false});const fastMs=performance.now()-tFast;
      let chosen=fast,accurateMs=0,fallbackUsed=false,fallbackError="";
      if(activeModelNames.accurate!==activeModelNames.fast&&needsAccurateVerification(fast.parsed)){
        fallbackUsed=true;stage=`AI đang xác minh sâu (${activeModelNames.accurate})…`;tick();const tAcc=performance.now();
        try{chosen=await runModelWithJsonRetry(mdl.accurate,activeModelNames.accurate,pkg,paperUrl,{verify:true});accurateMs=performance.now()-tAcc;}
        catch(e){accurateMs=performance.now()-tAcc;fallbackError=compactErrorText(e).slice(0,700);console.warn("AI accurate fallback failed; giữ kết quả FAST",e);chosen=fast;}
      }
      const parsed=chosen.parsed,meta=chosen.meta||{},status=normalizedStatus(parsed),usedAccurate=chosen!==fast;
      const observations=Array.isArray(parsed.observations)?parsed.observations.slice(0,4):[];
      if(fallbackUsed&&!usedAccurate&&fallbackError)observations.push("Lượt xác minh sâu không hoàn tất; hệ thống giữ kết quả AI FAST.");
      const result={aiVersion:AI_VERSION,aiMode:usedAccurate?"ACCURATE_VERIFY":"FAST",model:String(chosen.modelName||activeModelNames.fast),fastModel:activeModelNames.fast,accurateModel:activeModelNames.accurate,status,confidence:Math.max(0,Math.min(100,Number(parsed.confidence)||0)),summary:String(parsed.summary||"").slice(0,500),flightMatch:!!parsed.flightMatch,regMatch:!!parsed.regMatch,revisionSuspicion:!!parsed.revisionSuspicion,criticalUnreadable:!!parsed.criticalUnreadable,differences:Array.isArray(parsed.differences)?parsed.differences.slice(0,10):[],observations:observations.slice(0,5),aiRetryUsed:!!chosen.retryUsed,aiFallbackUsed:fallbackUsed,aiFallbackSucceeded:usedAccurate,fallbackError,finishReason:String(meta.finishReason||""),outputTokenCount:Number(meta.candidatesTokenCount||meta.candidateTokenCount||0),totalTokenCount:Number(meta.totalTokenCount||0),timingMs:{init:Math.round(initMs),image:Math.round(imageMs),fast:Math.round(fastMs),accurate:Math.round(accurateMs),total:Math.round(performance.now()-started)},analyzedAtMs:Date.now()};
      stage="Đang lưu kết quả AI…";tick();await window.sagsAiSaveResult?.(pkg.packageId,result);window.sagsAiApplyResult?.(pkg.packageId,result);window.sagsAiRecordActivity?.(result,pkg);render(result,pkg);return result;
    }finally{clearInterval(timer);}
  })().catch(e=>{console.error("AI CROSSCHECK",e);showAiDiagnostic(e,e?.sagsStage||"GENERATE_CONTENT");throw e;}).finally(()=>inFlight.delete(key));
  inFlight.set(key,p);return p;
}
function friendlyError(e){const d=classifyAiError(e,e?.sagsStage||"");return `${d.code} · ${d.where} · ${d.summary}`;}
function render(result,pkg){
  if(!result){setPanel("IDLE","AI sẽ tự chạy khi CBTT mở ảnh CHECK.");return;}
  const st=String(result.status||"REVIEW"),obs=Array.isArray(result.observations)?result.observations:[],secs=Number(result?.timingMs?.total||0)>0?` · ${Math.max(.1,Number(result.timingMs.total)/1000).toFixed(1)} giây`:"",mode=String(result.aiMode||"")==="ACCURATE_VERIFY"?" · XÁC MINH 3.6":" · FAST";
  const text=String(result.summary||"")+(result.revisionSuspicion?" · ⚠️ Nghi nhầm revision.":"")+(result.criticalUnreadable?" · ⚠️ Có vùng quan trọng không đọc được.":"")+mode+secs;
  setPanel(st,text,result.differences||[],result.confidence);
  const iss=el("cxAiIssues");if(iss&&obs.length){const extra=obs.slice(0,5).map(x=>`<div style="margin:2px 0;color:#475569">• ${escapeHtmlLocal(x)}</div>`).join("");iss.style.display="block";iss.innerHTML+=(iss.innerHTML?"<hr style='border:0;border-top:1px solid #e2e8f0;margin:6px 0'>":"")+extra;}
}

window.sagsAiCrosscheckRun=run;
window.sagsAiCrosscheckRender=render;
window.sagsAiCrosscheckEnsure=async pkg=>{try{if(pkg?.aiCrosscheck)return render(pkg.aiCrosscheck,pkg);await run(pkg);}catch(e){}};
window.sagsAiCrosscheckRetryCurrent=async()=>{const pkg=window.sagsAiGetCurrentPackage?.();if(!pkg)return;try{await run(pkg,{force:true});}catch(e){}};
window.sagsAiRunDiagnostics=async()=>{
  if(role()!=="AD")return alert("Chỉ AD được chạy chẩn đoán AI.");
  try{
    setPanel("RUNNING","Đang chẩn đoán CONFIG → APP CHECK → AI FAST…");const cfg=await loadConfig(true),conf=window.SAGS_FIREBASE_CONFIG||{};
    if(String(conf.projectId||"")!=="e-report-sags")throw taggedError("CONFIG_PROJECT",new Error(`Sai projectId: ${conf.projectId||"(trống)"}`));
    if(!conf.apiKey||!conf.appId)throw taggedError("CONFIG_FIREBASE",new Error("Thiếu apiKey/appId trong firebase-config.js."));
    if(!String(cfg?.appCheckSiteKey||"").trim())throw taggedError("CONFIG_APP_CHECK",new Error("Chưa có reCAPTCHA Enterprise Site Key."));
    const mdl=await initModels(true);if(!appCheckInstance)throw taggedError("APP_CHECK_INIT",new Error("App Check chưa khởi tạo."));try{await getToken(appCheckInstance,true);}catch(e){throw taggedError("APP_CHECK_TOKEN",e);}
    try{const out=await mdl.fast.generateContent('Trả JSON hợp lệ với status="MATCH", confidence=100, summary="DIAGNOSTIC_OK", flightMatch=true, regMatch=true, revisionSuspicion=false, criticalUnreadable=false, differences=[], observations=["DIAGNOSTIC_OK"].');const meta=responseMeta(out?.response),text=out?.response?.text?.()||"";if(String(meta.finishReason).toUpperCase()==="MAX_TOKENS")throw taggedError("AI_OUTPUT_TRUNCATED",Object.assign(new Error("Diagnostic bị MAX_TOKENS."),{aiMeta:meta,aiRaw:text}));parseAiJson(text);}catch(e){throw taggedError(e?.sagsStage||"FIREBASE_AI_LOGIC",e);}
    setPanel("READY",`CHẨN ĐOÁN OK · FAST ${activeModelNames.fast} · FALLBACK ${activeModelNames.accurate}`);const iss=el("cxAiIssues");if(iss){iss.style.display="block";iss.innerHTML=`<div style="padding:7px;border-radius:8px;background:#f0fdf4;border:1px solid #bbf7d0;color:#166534"><b>✓ CONFIG OK</b><br><b>✓ APP CHECK TOKEN OK</b><br><b>✓ FIREBASE AI LOGIC OK</b><br><b>✓ AI FAST ${escapeHtmlLocal(activeModelNames.fast)} OK</b><br><span style="color:#475569">Fallback khi cần: ${escapeHtmlLocal(activeModelNames.accurate)} · Host: ${escapeHtmlLocal(location.hostname||"")}</span></div>`;}
  }catch(e){console.error("AI DIAGNOSTIC",e);showAiDiagnostic(e,e?.sagsStage||"DIAGNOSTIC");}
};
window.sagsAiConfigure=async()=>{
  if(role()!=="AD")return alert("Chỉ AD được cấu hình AI.");
  let old=null;try{old=await loadConfig(true);}catch(e){}const names=resolveModelNames(old||{});
  const site=prompt("Dán reCAPTCHA Enterprise site key của Web App trong Firebase App Check:",String(old?.appCheckSiteKey||""));if(site===null)return;
  const fast=prompt("Model AI FAST (khuyên dùng gemini-3.5-flash-lite):",names.fast);if(fast===null)return;
  const accurate=prompt("Model xác minh sâu/fallback (khuyên dùng gemini-3.6-flash):",names.accurate);if(accurate===null)return;
  try{await window.sagsAiSaveConfig?.({enabled:true,appCheckSiteKey:site.trim(),model:(fast.trim()||FAST_MODEL),fastModel:(fast.trim()||FAST_MODEL),accurateModel:(accurate.trim()||ACCURATE_MODEL)});activeConfig=null;models=null;await loadConfig(true);alert("Đã lưu cấu hình AI V1.6. Mặc định chạy FAST; chỉ xác minh sâu khi cần.");}catch(e){alert("Không lưu được cấu hình AI: "+String(e?.message||e));}
};
setTimeout(()=>{try{const cfg=el("cxAiConfigBtn"),diag=el("cxAiDiagBtn");if(cfg)cfg.style.display=(role()==="AD")?"inline-flex":"none";if(diag)diag.style.display=(role()==="AD")?"inline-flex":"none";}catch(e){}},500);

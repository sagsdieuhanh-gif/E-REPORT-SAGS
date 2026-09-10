/* E-REPORT/SAGS V4.2.31 · WORKSPACE MISMATCH SAFE FIX */
const CACHE_NAME="sags-v4.2.31-workspace-mismatch-fix";
const BUILD="V4.2.31-WORKSPACE-MISMATCH-FIX";
const DISPLAY_VERSION="V4.2.31";

const PATCH_V21="./v2.1-runtime-patch.js";
const PATCH_V22="./v2.2-runtime-patch.js";
const PATCH_V222="./v2.2.2-runtime-patch.js";
const PATCH_V225="./v2.2.5-runtime-patch.js";
const PATCH_V226="./v2.2.6-runtime-patch.js";
const PATCH_V227="./v2.2.7-runtime-patch.js";
const PATCH_V229="./v2.2.9-runtime-patch.js";
const PATCH_V2210="./v2.2.10-runtime-patch.js";
const PATCH_V2211="./v2.2.11-runtime-patch.js";
const PATCH_V2212="./v2.2.12-runtime-patch.js";
const PATCH_V2213="./v2.2.13-runtime-patch.js";
const PATCH_V2214="./v2.2.14-runtime-patch.js";
const PATCH_V2215="./v2.2.15-runtime-patch.js";
const PATCH_V2216="./v2.2.16-runtime-patch.js";
const PATCH_V2217="./v2.2.17-runtime-patch.js";

const FRESH_SUFFIXES=[
  "/shift-report-core.js","/shift-report.js","/shift-report.css","/quick-incident.js","/quick-incident.css",
  "/version.json","/manifest.webmanifest","/index.html","/app.js","/ai.js",
  "/ui.css","/ui.js","/ios-export.js","/report.css","/report.js","/theme.css",
  "/daily-roster.js","/v2.1-runtime-patch.js","/v2.2-runtime-patch.js",
  "/v2.2.2-runtime-patch.js","/v2.2.5-runtime-patch.js",
  "/v2.2.6-runtime-patch.js","/v2.2.7-runtime-patch.js",
  "/v2.2.9-runtime-patch.js","/v2.2.10-runtime-patch.js",
  "/v2.2.11-runtime-patch.js","/v2.2.12-runtime-patch.js",
  "/v2.2.13-runtime-patch.js","/v2.2.14-runtime-patch.js",
  "/v2.2.15-runtime-patch.js","/v2.2.16-runtime-patch.js","/v2.2.17-runtime-patch.js"
];

function isFreshPath(pathname){return FRESH_SUFFIXES.some(x=>pathname.endsWith(x));}
async function fetchNoStore(path){
  return fetch(path,{cache:"no-store",headers:{"Cache-Control":"no-cache","Pragma":"no-cache"}});
}
async function safePut(cache,key,response){
  try{if(response&&response.ok)await cache.put(key,response.clone())}
  catch(e){console.info("V4.2.31 cache put skipped",key,e?.name||e?.message||e)}
}
function stripRetiredScripts(out){
  return String(out||"")
    .replace(/<script\b[^>]*\bv2\.2\.1-runtime-patch\.js(?:\?[^"'>\s]*)?[^>]*>\s*<\/script>\s*/gi,"")
    .replace(/<script\b[^>]*\bv2\.2\.3-runtime-patch\.js(?:\?[^"'>\s]*)?[^>]*>\s*<\/script>\s*/gi,"")
    .replace(/<script\b[^>]*\bv2\.2\.4-runtime-patch\.js(?:\?[^"'>\s]*)?[^>]*>\s*<\/script>\s*/gi,"");
}
function injectScript(out,file){
  if(out.includes(file))return out;
  const tag=`<script src="./${file}?v=${encodeURIComponent(DISPLAY_VERSION)}"></script>`;
  if(/<\/body>/i.test(out))return out.replace(/<\/body>/i,`${tag}\n</body>`);
  return out+`\n${tag}\n`;
}
function patchIndexHtml(html){
  let out=stripRetiredScripts(String(html||""));
  out=out.replace(/(const\s+APP_BUILD_VERSION\s*=\s*)["'][^"']+["'](\s*;?)/,`$1"${BUILD}"$2`);
  out=out.replace(/(const\s+APP_DISPLAY_VERSION\s*=\s*)["'][^"']+["'](\s*;?)/,`$1"${DISPLAY_VERSION}"$2`);
  out=injectScript(out,"v2.1-runtime-patch.js");
  out=injectScript(out,"v2.2-runtime-patch.js");
  out=injectScript(out,"v2.2.2-runtime-patch.js");
  out=injectScript(out,"v2.2.5-runtime-patch.js");
  out=injectScript(out,"v2.2.6-runtime-patch.js");
  out=injectScript(out,"v2.2.7-runtime-patch.js");
  out=injectScript(out,"v2.2.9-runtime-patch.js");
  out=injectScript(out,"v2.2.10-runtime-patch.js");
  out=injectScript(out,"v2.2.11-runtime-patch.js");
  out=injectScript(out,"v2.2.12-runtime-patch.js");
  out=injectScript(out,"v2.2.13-runtime-patch.js");
  out=injectScript(out,"v2.2.14-runtime-patch.js");
  out=injectScript(out,"v2.2.15-runtime-patch.js");
  out=injectScript(out,"v2.2.16-runtime-patch.js");
  out=injectScript(out,"v2.2.17-runtime-patch.js");
  return out;
}
async function validateRelease(){
  const vr=await fetchNoStore("./version.json?swcheck="+Date.now());
  if(!vr.ok)throw new Error("version.json HTTP "+vr.status);
  const vd=await vr.clone().json();
  if(String(vd?.build||"").trim()!==BUILD)throw new Error("version.json BUILD mismatch");
  if(String(vd?.displayVersion||vd?.version||"").trim()!==DISPLAY_VERSION)throw new Error("version.json VERSION mismatch");

  const checks=[
    ["./shift-report-core.js","V4.2.24"],
    ["./shift-report.js","V4.2.24-SHIFT-REPORT"],
    ["./quick-incident.js","V4.2.23-VOICE-PHOTO"],
    ["./report.js","V4.2.30"],
    [PATCH_V22,"V2.2-ARRDEP-CHOICE-LOCALFIRST"],
    [PATCH_V222,"V2.2.2-DEP-RECEIVE-AFTER-ARR"],
    [PATCH_V225,"V2.2.5-SIGNATURE-EXPORT-STORAGE-FIX-R2"],
    [PATCH_V226,"V2.2.6-SIGNATURE-LEGACY-QUOTA-FIX"],
    [PATCH_V227,"V2.2.7-SIGNATURE-STORAGE-RECOVERY"],
    [PATCH_V229,"V2.2.9-PDF-EXPORT-COMPLETE-SHARE-FIX"],
    [PATCH_V2210,"V2.2.10-INDEPENDENT-DEP-SAME-WORKSPACE"],
    [PATCH_V2211,"V2.2.11-AI-LIMIT-CLEANING-MULTI-IMAGE"],
    [PATCH_V2212,"V2.2.12-AI-APP-CHECK-PC-MYFLIGHT-FIX"],
    [PATCH_V2213,"V2.2.13-CLEANING-SAVE-MANAGER"],
    [PATCH_V2214,"V2.2.14-COMPACT-LIMIT-CLEANING-STA-STD"],
    [PATCH_V2215,"V2.2.15-DATE-FIRST-LIMIT-CLEANING"],
    [PATCH_V2216,"V2.2.16-DATAHUB-COMBINED-LIMIT-CLEANING-ICON"],
    [PATCH_V2217,"V2.2.19-REMOVE-LITERAL-NEWLINES"]
  ];
  for(const [path,marker] of checks){
    const r=await fetchNoStore(path+"?swcheck="+Date.now());
    if(!r.ok)throw new Error(path+" HTTP "+r.status);
    const text=await r.text();
    if(!text.includes(marker))throw new Error(path+" marker mismatch");
  }
  const ir=await fetchNoStore("./index.html?swcheck="+Date.now());
  if(!ir.ok)throw new Error("index.html HTTP "+ir.status);
}


function patchShiftReportWorkspaceMismatch(response){
  if(!response||!response.ok)return response;
  return response.text().then(text=>{
    let out=String(text||"");
    let changed=false;

    // A stale/reused workspaceKey must never stop the whole Shift Report.
    // Do NOT consume envelope data from a workspace whose flightId belongs to another flight.
    const mismatchRe=/if\(w\?\.flightId\s*&&\s*S\(w\.flightId\)\s*!==\s*S\(r\.flightId\)\)\s*throw Error\('Workspace không khớp flightId: '\s*\+\s*r\.flightId\);/;
    if(mismatchRe.test(out)){
      out=out.replace(
        mismatchRe,
        "if(w?.flightId&&S(w.flightId)!==S(r.flightId)){r._workspaceMismatch=r._workspaceMismatch||[];r._workspaceMismatch.push({workspaceKey:wk,workspaceFlightId:S(w.flightId),recordFlightId:S(r.flightId)});console.warn('BÁO CÁO CA · bỏ qua workspace không khớp',wk,w.flightId,r.flightId);continue;}"
      );
      changed=true;
    }

    // Tell the operator that stale links were skipped, while allowing aggregation to finish.
    const doneNeedle="render();saveLocal();status('Đã tổng hợp '+model.relevant.length+' hồ sơ liên quan. Rà soát số liệu và sự việc trước khi chốt.')";
    if(out.includes(doneNeedle)){
      out=out.replace(
        doneNeedle,
        "render();saveLocal();const mismatchCount=records.reduce((n,x)=>n+((x._workspaceMismatch||[]).length),0);status('Đã tổng hợp '+model.relevant.length+' hồ sơ liên quan.'+(mismatchCount?' Đã bỏ qua '+mismatchCount+' workspace liên kết sai chuyến; dữ liệu của workspace sai không được sử dụng.':'')+' Rà soát số liệu và sự việc trước khi chốt.')"
      );
      changed=true;
    }

    if(!changed)console.warn("V4.2.31: không tìm thấy mẫu workspace mismatch cần vá trong shift-report.js");
    const headers=new Headers(response.headers);
    headers.delete("content-length");
    headers.delete("content-encoding");
    headers.set("Content-Type","application/javascript; charset=utf-8");
    headers.set("Cache-Control","no-cache");
    return new Response(out,{
      status:response.status,
      statusText:response.statusText,
      headers
    });
  });
}

self.addEventListener("install",event=>{event.waitUntil(validateRelease())});
self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k).catch(()=>false)));
    await caches.open(CACHE_NAME);
    await self.clients.claim();
  })());
});
self.addEventListener("message",event=>{
  if(event.data&&event.data.type==="SKIP_WAITING")self.skipWaiting();
});
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  const nav=event.request.mode==="navigate";
  const isVersion=url.pathname.endsWith("/version.json");

  if(isVersion){
    event.respondWith((async()=>{
      const c=await caches.open(CACHE_NAME);
      try{
        const n=await fetch(event.request,{cache:"no-store"});
        await safePut(c,"./version.json",n);
        return n;
      }catch(_){
        return (await c.match("./version.json"))||new Response("OFFLINE",{status:503});
      }
    })());
    return;
  }

  if(nav){
    event.respondWith((async()=>{
      const c=await caches.open(CACHE_NAME);
      try{
        const n=await fetch(event.request,{cache:"no-store"});
        if(n&&n.ok){
          const html=patchIndexHtml(await n.clone().text());
          const p=new Response(html,{
            status:n.status,statusText:n.statusText,
            headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-cache"}
          });
          await safePut(c,"./index.html",p);
          return p;
        }
        return n;
      }catch(_){
        return (await c.match("./index.html"))||new Response("OFFLINE",{status:503});
      }
    })());
    return;
  }

  if(isFreshPath(url.pathname)){
    event.respondWith((async()=>{
      const c=await caches.open(CACHE_NAME);
      try{
        let r=await fetch(event.request,{cache:"no-store"});
        if(url.pathname.endsWith("/shift-report.js")){
          r=await patchShiftReportWorkspaceMismatch(r);
        }
        await safePut(c,event.request,r);
        return r;
      }catch(_){
        const hit=await c.match(event.request);
        if(hit)return hit;
        const canonical=await c.match("./"+url.pathname.split("/").pop());
        return canonical||new Response("OFFLINE",{status:503});
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const c=await caches.open(CACHE_NAME);
    const hit=await c.match(event.request);
    if(hit)return hit;
    try{
      const r=await fetch(event.request);
      await safePut(c,event.request,r);
      return r;
    }catch(_){
      return new Response("OFFLINE",{status:503});
    }
  })());
});

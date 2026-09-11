/* E-REPORT/SAGS V4.2.42 · AD FSAGS BBBT COORD */
const CACHE_NAME="sags-v4.2.42-ad-fsags-bbbt-coord";
const BUILD="V4.2.42-AD-FSAGS-BBBT-COORD";
const DISPLAY_VERSION="V4.2.42";

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
const PATCH_V2218="./v2.2.18-runtime-patch.js";

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
  "/v2.2.15-runtime-patch.js","/v2.2.16-runtime-patch.js","/v2.2.17-runtime-patch.js","/v2.2.18-runtime-patch.js","/fsags-display-coordinates.json"
];

function isFreshPath(pathname){return FRESH_SUFFIXES.some(x=>pathname.endsWith(x));}
async function fetchNoStore(path){
  return fetch(path,{cache:"no-store",headers:{"Cache-Control":"no-cache","Pragma":"no-cache"}});
}
async function safePut(cache,key,response){
  try{if(response&&response.ok)await cache.put(key,response.clone())}
  catch(e){console.info("V4.2.42 cache put skipped",key,e?.name||e?.message||e)}
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
  out=injectScript(out,"v2.2.18-runtime-patch.js");
  return out;
}
async function validateRelease(){
  const vr=await fetchNoStore("./version.json?swcheck="+Date.now());
  if(!vr.ok)throw new Error("version.json HTTP "+vr.status);
  const vd=await vr.clone().json();
  if(String(vd?.build||"").trim()!==BUILD)throw new Error("version.json BUILD mismatch");
  if(String(vd?.displayVersion||vd?.version||"").trim()!==DISPLAY_VERSION)throw new Error("version.json VERSION mismatch");

  const pr=await fetchNoStore(PATCH_V2218+"?swcheck="+Date.now());
  if(!pr.ok)throw new Error(PATCH_V2218+" HTTP "+pr.status);
  const pt=await pr.text();
  if(!pt.includes("V2.2.18-AD-FSAGS-BBBT-COORD"))throw new Error(PATCH_V2218+" marker mismatch");

  const cr=await fetchNoStore("./fsags-display-coordinates.json?swcheck="+Date.now());
  if(!cr.ok)throw new Error("fsags-display-coordinates.json HTTP "+cr.status);
  const cj=await cr.clone().json();
  if(Number(cj?.schema)!==2||!cj?.pages)throw new Error("fsags-display-coordinates.json invalid");

  const ir=await fetchNoStore("./index.html?swcheck="+Date.now());
  if(!ir.ok)throw new Error("index.html HTTP "+ir.status);
}


function patchShiftReportTimeFirst(response){
  if(!response||!response.ok)return response;
  return response.text().then(text=>{
    let out=String(text||"");
    let changed=false;

    /*
      TIME-FIRST strategy:
      1) Read flight_records only as source candidates.
      2) Pre-filter by report time / nearby operational time BEFORE reading workspaces.
      3) Read only workspace keys of those candidates.
      4) Accept a workspace only when workspace.flightId === flight_record.flightId.
      5) C.aggregate still performs the final exact [from,to) calculation.
    */
    const workspaceBlock=/const cache=new Map\(\);await batch\(records,async r=>\{[\s\S]*?\}\);\nif\(\$\('srArchive'\)\.checked\)/;

    if(workspaceBlock.test(out)){
      const replacement=`const candidateFrom=from-24*3600000,candidateTo=to+12*3600000,reportStartDay=C.day(from),reportEndDay=C.day(to-1);
const preTimeCandidate=r=>{try{const n=C.normalize(r,overrides[S(r.opDate)+'/'+S(r.flightId)]||{}),times=[n.sta,n.std,n.etd,n.on,n.door,n.pb].filter(Number.isFinite),op=S(r.opDate),dayMatch=op>=reportStartDay&&op<=reportEndDay,nearTime=times.some(t=>t>=candidateFrom&&t<candidateTo),carried=Number.isFinite(n.on)&&n.on<from&&(!Number.isFinite(n.pb)||n.pb>=from),unknown=dayMatch&&(!n.legs.length||n.legs.some(l=>!Number.isFinite(l.plan)));return nearTime||carried||unknown}catch(_){const op=S(r.opDate);return op>=reportStartDay&&op<=reportEndDay}};
const allSourceRecords=records,timeCandidates=records.filter(preTimeCandidate);let timeFilteredOut=allSourceRecords.length-timeCandidates.length,workspaceRejected=0;records=timeCandidates;
status('Đã lọc theo thời gian. Đang đọc workspace đúng chuyến…');
const cache=new Map();await batch(records,async r=>{const assignments=Object.values(r.assignments||{}).filter(a=>['FSAGS','FSAGS421','FSAGS423'].includes(U(a.formGroup))||/GRND_COR/.test(U(a.sourceColumn))),keys=[r.modules?.RAMP?.workspaceKey,...assignments.map(a=>a.workspaceKey||a.rosterWorkspaceKey)].filter(Boolean);let best=null;const candidates=[];for(const wk of [...new Set(keys)]){if(!cache.has(wk))cache.set(wk,db('roster_flight_workspaces/'+safe(wk)).once('value'));const w=(await cache.get(wk)).val();if(!w||S(w.flightId)!==S(r.flightId)){workspaceRejected++;continue}if(w?.envelope?.state)candidates.push({...w,_wk:wk});if(w?.envelope?.state&&(!best||Number(w.envelopeUpdatedAtMs||w.updatedAtMs)>Number(best.envelopeUpdatedAtMs||best.updatedAtMs)))best=w}if(best){r._ramp=times(best.envelope.state);for(const key of ['chockOn','doorClose','pushback']){const compatible=candidates.filter(w=>{const scopes=assignments.filter(a=>(a.workspaceKey||a.rosterWorkspaceKey)===w._wk).map(a=>U(a.assignmentScope||'BOTH'));return !scopes.length||scopes.some(s=>s==='BOTH'||(key==='chockOn'?!s.includes('DEP'):!s.includes('ARR')))}).sort((a,b)=>Number(b.envelopeUpdatedAtMs||b.updatedAtMs)-Number(a.envelopeUpdatedAtMs||a.updatedAtMs));if(compatible.length)r._ramp[key]=times(compatible[0].envelope.state)[key]}r._source='Biểu mẫu chung · '+S(best.workspaceKey);r.route1=r.route1||best.envelope.state.route1||best.envelope.state.f421_route1;r.route3=r.route3||best.envelope.state.route3||best.envelope.state.f421_route3}});
if($('srArchive').checked)`;
      out=out.replace(workspaceBlock,replacement);
      changed=true;
    }

    // Archive records are also time-prefiltered before being added to aggregation input.
    const archivePush="const old=await root.sagsShiftReadArchive(d,records);records.push(...old)";
    if(out.includes(archivePush)){
      out=out.replace(
        archivePush,
        "const old=await root.sagsShiftReadArchive(d,records),oldCandidates=old.filter(preTimeCandidate);timeFilteredOut+=old.length-oldCandidates.length;records.push(...oldCandidates)"
      );
      changed=true;
    }

    // Persist diagnostic strategy in coverage without changing report calculation.
    const coverageNeedle="model.coverage={from:sourceFrom,to:endDay,archive:$('srArchive').checked};";
    if(out.includes(coverageNeedle)){
      out=out.replace(
        coverageNeedle,
        "model.coverage={from:sourceFrom,to:endDay,archive:$('srArchive').checked,strategy:'TIME_FIRST',timeFilteredOut,workspaceRejected};"
      );
      changed=true;
    }

    // Clear status tells operator exactly what happened.
    const doneNeedle="render();saveLocal();status('Đã tổng hợp '+model.relevant.length+' hồ sơ liên quan. Rà soát số liệu và sự việc trước khi chốt.')";
    if(out.includes(doneNeedle)){
      out=out.replace(
        doneNeedle,
        "render();saveLocal();status('Đã tổng hợp theo thời gian: '+model.relevant.length+' hồ sơ liên quan.'+(timeFilteredOut?' Đã loại '+timeFilteredOut+' hồ sơ ngoài cửa sổ trước khi đọc workspace.':'')+(workspaceRejected?' Đã bỏ '+workspaceRejected+' workspace không thuộc đúng flightId.':'')+' Rà soát số liệu và sự việc trước khi chốt.')"
      );
      changed=true;
    }

    if(!changed)console.warn("V4.2.35: không tìm thấy mẫu TIME-FIRST cần vá trong shift-report.js");

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


function patchShiftReportCoreStrict(response){
  if(!response||!response.ok)return response;
  return response.text().then(text=>{
    let out=String(text||"");
    let changed=0;

    // 1) Deduplicate current + archive at FLIGHT level.
    // Same flightId/opDate must produce only one normalized flight.
    const allNeedle="const all=records.map(r=>normalize(r,overrides[S(r.opDate)+'/'+S(r.flightId)]||{}));";
    if(out.includes(allNeedle)){
      out=out.replace(allNeedle,
        "const normalized=records.map(r=>normalize(r,overrides[S(r.opDate)+'/'+S(r.flightId)]||{})),flightMap=new Map(),score=f=>[f.on,f.door,f.pb,f.sta,f.std,f.etd].filter(Number.isFinite).length+f.legs.reduce((n,l)=>n+(Number.isFinite(l.plan)?1:0)+(Number.isFinite(l.actual)?2:0)+(Number.isFinite(l.door)?1:0),0)+Object.keys(f.assignments||{}).length*.01;for(const f of normalized){const old=flightMap.get(f.id);if(!old){flightMap.set(f.id,f);continue}const keep=score(f)>score(old)?f:old,other=keep===f?old:f;keep.assignments={...(other.assignments||{}),...(keep.assignments||{})};keep.warnings=[...new Set([...(other.warnings||[]),...(keep.warnings||[])])];flightMap.set(f.id,keep)}const all=[...flightMap.values()];"
      );
      changed++;
    }

    // 2) Strict shift relevance:
    // - exact planned/actual/door time in [from,to), OR
    // - carry-over only from immediately previous shift.
    // Remove same-day records with no usable time from the exported appendix/totals.
    const relevantRe=/const relevant=flights\.filter\(f=>f\.legs\.some\(l=>planned\(l\.plan\)\|\|inside\(l\.actual\)\|\|inside\(l\.door\)\)\|\|\(\(!f\.legs\.length\|\|f\.legs\.some\(l=>!Number\.isFinite\(l\.plan\)&&!Number\.isFinite\(l\.actual\)\)\)&&f\.opDate>=day\(from\)&&f\.opDate<=day\(to-1\)\)\|\|\(Number\.isFinite\(f\.on\)&&f\.on<cutoff&&\(!Number\.isFinite\(f\.pb\)\|\|f\.pb>=from\)\)\);/;
    if(relevantRe.test(out)){
      out=out.replace(relevantRe,
        "const startDay=day(from),startClock=local(from).slice(11),carryFrom=startClock==='08:15'?parse(addDay(startDay,-1)+'T18:15'):startClock==='18:15'?parse(startDay+'T08:15'):from-14*3600000;const relevant=flights.filter(f=>f.legs.some(l=>planned(l.plan)||inside(l.actual)||inside(l.door))||(Number.isFinite(f.on)&&f.on>=carryFrom&&f.on<from&&(!Number.isFinite(f.pb)||f.pb>=from)));"
      );
      changed++;
    }

    // 3) Stronger leg dedupe. Prefer stable flightId+direction.
    const legNeedle="const legMap=new Map(),duplicateWarnings=[];for(const l of relevant.flatMap(f=>f.legs)){const stamp=Number.isFinite(l.plan)?day(l.plan):l.opDate,key=[l.dir,l.num,stamp].join('|');if(legMap.has(key)){duplicateWarnings.push(l.num+': hồ sơ trùng lượt, chỉ tính một lần');continue}legMap.set(key,l)}";
    if(out.includes(legNeedle)){
      out=out.replace(legNeedle,
        "const legMap=new Map(),duplicateWarnings=[];for(const l of relevant.flatMap(f=>f.legs)){const stamp=Number.isFinite(l.plan)?day(l.plan):Number.isFinite(l.actual)?day(l.actual):l.opDate,key=l.flightId?[l.flightId,l.dir].join('|'):[l.dir,l.num,stamp].join('|');if(legMap.has(key)){duplicateWarnings.push(l.num+': hồ sơ trùng lượt, chỉ tính một lần');const old=legMap.get(key),oldScore=(Number.isFinite(old.actual)?2:0)+(Number.isFinite(old.plan)?1:0)+(Number.isFinite(old.door)?1:0),newScore=(Number.isFinite(l.actual)?2:0)+(Number.isFinite(l.plan)?1:0)+(Number.isFinite(l.door)?1:0);if(newScore>oldScore)legMap.set(key,l);continue}legMap.set(key,l)}"
      );
      changed++;
    }

    // 4) Unassigned counter must describe only flights relevant to this shift.
    const unassignedNeedle="unassigned:all.filter(f=>!Object.values(f.assignments).some(a=>a.active!==false)).length";
    if(out.includes(unassignedNeedle)){
      out=out.replace(unassignedNeedle,
        "unassigned:relevant.filter(f=>!Object.values(f.assignments).some(a=>a.active!==false)).length"
      );
      changed++;
    }

    if(changed<3)console.warn("V4.2.42: strict core patch applied partially",changed);

    out="/* SAGS V4.2.35-STRICT-SHIFT-DEDUP · runtime patched */\n"+out;
    const headers=new Headers(response.headers);
    headers.delete("content-length");
    headers.delete("content-encoding");
    headers.set("Content-Type","application/javascript; charset=utf-8");
    headers.set("Cache-Control","no-cache");
    return new Response(out,{status:response.status,statusText:response.statusText,headers});
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
          r=await patchShiftReportTimeFirst(r);
        }
        if(url.pathname.endsWith("/shift-report-core.js")){
          r=await patchShiftReportCoreStrict(r);
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

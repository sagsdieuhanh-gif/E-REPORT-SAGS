/* E-REPORT SAGS V5.0.3B-HF2 · REPAIR 20260922-01 · IMMUTABLE EXECUTABLE PATHS / PINNED VERIFIED SHELL
   Base: V4.8.10B Layered PDF + HF1–HF4. Never mix navigation HTML with a different runtime.
*/
'use strict';
const BUILD='V6.3.38-20260926-GRNDLS-CLEAN-HEADER-ASSET-01';
const DISPLAY_VERSION='V6.3.38';
const CACHE_NAME='sags-app-shell-v6338-grndls-clean-header-asset-01';
const META_CACHE_NAME='sags-app-meta-v6338-grndls-clean-header-asset-01';
const ASSET_MANIFEST_URL='./asset-manifest.json';
const SAGS_BOOTSTRAP=['./index.html','./app.v503.js','./app.bundle.css','./runtime.v503hf2.bundle.js','./daily-roster.v502.js','./self-accept.v502.js','./cbtt-open-forms.v2.js','./admin-reset.v503hf2.js','./roster-lite.v5.js','./carrier-notebook.v1.js','./quick-entry.v1.js','./tvj-gof-035.v630.js','./tvj-gof-035.v631.js','./tvj-gof-035.v632.js','./grnd-ls-checklists.v6326.js','./stability.v6.js','./stability.v6-core.js','./mobile-draft-recovery.v1.js','./indexeddb-flight-store.v1.js','./cross-browser-entry.v1.js','./ui-preferences.v1.js','./new-ui-v1.css','./service-worker.js','./version.json'];
const HOME= new URL('./index.html',self.registration.scope).href;
const SCOPE_PATH=new URL(self.registration.scope).pathname;
function scopeUrl(path){return new URL(path,self.registration.scope).href}
function canonicalUrl(input){const source=typeof input==='string'?input:(input?.href||input?.url);const u=new URL(source,self.location.href);u.search='';u.hash='';return u.href}
async function fetchFresh(path){const u=scopeUrl(path);const r=await fetch(u+'?__sags_release='+encodeURIComponent(BUILD)+'&t='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error(path+' HTTP '+r.status);return r}
async function checksum(response,meta,path){
 if(!meta||!meta.sha256||!Number.isSafeInteger(meta.bytes))throw new Error('Missing manifest checksum '+path);
 const b=await response.clone().arrayBuffer();if(b.byteLength!==meta.bytes)throw new Error('Size mismatch '+path);
 const digest=await crypto.subtle.digest('SHA-256',b);const hash=[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
 if(hash!==meta.sha256)throw new Error('SHA-256 mismatch '+path);
}
async function assertReleaseMarker(response,path){
 if(path!=='./index.html')return true;
 const text=await response.clone().text();
 if(!text.includes('const APP_BUILD_VERSION="'+BUILD+'"')||!text.includes('const APP_DISPLAY_VERSION="'+DISPLAY_VERSION+'"'))throw new Error('Index release marker mismatch');
 return true;
}
async function readManifest(){try{const c=await caches.open(META_CACHE_NAME),r=await c.match(scopeUrl(ASSET_MANIFEST_URL));return r?await r.json():null}catch(_){return null}}
async function getReleaseManifest(){
 const [vr,mr]=await Promise.all([fetchFresh('./version.json'),fetchFresh(ASSET_MANIFEST_URL)]);
 const [v,m]=await Promise.all([vr.clone().json(),mr.json()]);
 if(v?.build!==BUILD||m?.build!==BUILD||m?.version!==DISPLAY_VERSION||!m.assets)throw new Error('Version/manifest not synchronized');
 for(const p of SAGS_BOOTSTRAP)if(!m.assets[p]&&p!=='./service-worker.js'&&p!=='./version.json')throw new Error('Missing bootstrap metadata '+p);
 return {manifest:m,versionResponse:vr};
}
let sagsVerifiedBootstrapKey='',sagsVerifiedBootstrapReady=false,sagsVerifiedBootstrapPromise=null;
function sagsBootstrapVerificationKey(manifest){
 return BUILD+'|'+SAGS_BOOTSTRAP.map(path=>path+':'+String(manifest?.assets?.[path]?.sha256||'')+':'+String(manifest?.assets?.[path]?.bytes||'')).join('|');
}
// V6.1.42: old immutable release caches remain available. Reuse only bytes that
// match the NEW manifest, never trust a filename or old manifest alone.
// Do not copy unchanged binaries into the new CacheStorage: this saves phone
// storage as well as network traffic and never touches local drafts/IndexedDB.
async function sagsPriorShellNames(){
 return (await caches.keys()).filter(name=>name!==CACHE_NAME&&name.startsWith('sags-app-shell-'));
}
async function sagsPriorAsset(path,meta,names,check=true){
 if(check&&(!meta||!meta.sha256||!Number.isSafeInteger(meta.bytes)))return null;
 const key=scopeUrl(path),prior=names||await sagsPriorShellNames();
 for(const name of prior){
  try{
   const store=await caches.open(name),r=await store.match(key);
   if(!r)continue;
   if(check)await checksum(r,meta,path);
   return r;
  }catch(e){console.warn('Ignoring damaged old cached asset',path,name,e?.message||e)}
 }
 return null;
}
async function verifyBootstrapPresence(){
 const c=await caches.open(CACHE_NAME);
 for(const path of SAGS_BOOTSTRAP)if(!await c.match(scopeUrl(path)))throw new Error('Missing staged bootstrap '+path);
 return true;
}
function markBootstrapVerified(manifest){
 sagsVerifiedBootstrapKey=sagsBootstrapVerificationKey(manifest);
 sagsVerifiedBootstrapReady=true;
}
async function verifyStaged(manifest){
 const c=await caches.open(CACHE_NAME);
 for(const path of SAGS_BOOTSTRAP){
  const r=await c.match(scopeUrl(path));if(!r)throw new Error('Missing verified bootstrap '+path);
  if(path!=='./service-worker.js'&&path!=='./version.json')await checksum(r,manifest.assets[path],path);
  await assertReleaseMarker(r,path);
 }
 return true;
}
async function ensureBootstrapVerified(manifest,{force=false}={}){
 const key=sagsBootstrapVerificationKey(manifest);
 if(!force&&sagsVerifiedBootstrapReady&&sagsVerifiedBootstrapKey===key){
  try{await verifyBootstrapPresence();return true}catch(_){sagsVerifiedBootstrapReady=false;sagsVerifiedBootstrapKey=''}
 }
 if(!force&&sagsVerifiedBootstrapPromise&&sagsVerifiedBootstrapKey===key)return sagsVerifiedBootstrapPromise;
 sagsVerifiedBootstrapKey=key;
 const run=(async()=>{await verifyStaged(manifest);markBootstrapVerified(manifest);return true})();
 sagsVerifiedBootstrapPromise=run;
 try{return await run}finally{if(sagsVerifiedBootstrapPromise===run)sagsVerifiedBootstrapPromise=null}
}
async function stageRelease(){
 // Recovery release: fetch the current navigation shell directly and activate.
 // Do not let stale manifest/checksum metadata keep an old worker installed forever.
 const c=await caches.open(CACHE_NAME);
 const indexResponse=await fetchFresh('./index.html');
 if(!indexResponse.ok)throw new Error('index.html HTTP '+indexResponse.status);
 await c.put(HOME,indexResponse.clone());
 try{
  const [vr,mr]=await Promise.all([fetchFresh('./version.json'),fetchFresh(ASSET_MANIFEST_URL)]);
  const m=await mr.clone().json();
  await c.put(scopeUrl('./version.json'),vr.clone());
  const mc=await caches.open(META_CACHE_NAME);
  await mc.put(scopeUrl(ASSET_MANIFEST_URL),mr.clone());
  // V6.3.26: pin the canonical form registry and the two original PDF-rendered
  // checklist pages in the new cache. These are data/form assets, not executable shell.
  try{
   const fr=await fetchFresh('./forms.registry.json');
   await c.put(scopeUrl('./forms.registry.json'),fr.clone());
  }catch(e){console.warn('V6.3.33 forms registry fetch',e?.message||e)}
  for(const p of ['./FSAGS54-page-01.png','./FSAGS94-page-01.png']){
   try{const ir=await fetchFresh(p);if(ir.ok)await c.put(scopeUrl(p),ir.clone())}
   catch(e){console.warn('V6.3.33 checklist image fetch',p,e?.message||e)}
  }
  if(m?.assets){
   const prior=await sagsPriorShellNames();
   for(const path of SAGS_BOOTSTRAP){
    if(path==='./index.html'||path==='./service-worker.js'||path==='./version.json')continue;
    // V6.3.33 recovery: app.v503.js and FSAGS54 interaction metadata changed. Fetch it
    // directly so stale manifest checksums cannot make a phone reuse the V6.3.22 bundle.
    if(path==='./app.v503.js'||path==='./grnd-ls-checklists.v6326.js'||path==='./cbtt-open-forms.v2.js'){
      try{const fresh=await fetchFresh(path);if(fresh.ok)await c.put(scopeUrl(path),fresh.clone())}catch(e){console.warn('V6.3.33 executable fetch',path,e?.message||e)}
      continue;
    }
    const meta=m.assets[path]; if(!meta)continue;
    let asset=await sagsPriorAsset(path,meta,prior);
    if(!asset){try{const fresh=await fetchFresh(path);await checksum(fresh,meta,path);asset=fresh}catch(_){}}
    if(asset)await c.put(scopeUrl(path),asset.clone());
   }
  }
 }catch(e){console.warn('Recovery staging metadata warning',e?.message||e)}
 return true;
}
async function networkMetadata(request,event,immutable=false){
 const c=await caches.open(CACHE_NAME),key=canonicalUrl(request);
 try{const r=await fetch(request,{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);
  // Version/manifest are fresh metadata, NOT executable-cache content. Caching a
  // future version.json into the current build's pinned cache would break its checksum.
  event.waitUntil((async()=>{try{if(!immutable)await c.put(key,r.clone());await reportNetworkRx(event.clientId,request.url,r)}catch(_){}})());return r;
 }catch(_){
  if(immutable&&key===scopeUrl(ASSET_MANIFEST_URL)){
   const pinned=await readManifest();if(pinned)return new Response(JSON.stringify(pinned),{headers:{'Content-Type':'application/json'}});
  }
  return await c.match(key)||new Response('OFFLINE',{status:503});
 }
}
async function verifyCurrentAssets(){
 const m=await readManifest();if(!m||m.build!==BUILD)throw new Error('No staged V5 manifest');
 const c=await caches.open(CACHE_NAME);
 const prior=await sagsPriorShellNames();
 for(const p of SAGS_BOOTSTRAP){
  let r=await c.match(scopeUrl(p));let good=false;
  if(r){try{await checksum(r,m.assets[p],p);good=true}catch(_){}}
  if(!good&&await sagsPriorAsset(p,m.assets[p],prior))good=true;
  if(!good){r=await fetchFresh(p);await checksum(r,m.assets[p],p);await c.put(scopeUrl(p),r.clone())}
 }
 // Explicit diagnostics fully hash all cached bytes, including prior releases.
 await verifyBootstrapPresence();markBootstrapVerified(m);
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 await stageRelease();
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 await self.clients.claim();
 const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
 const canonical=scopeUrl('./');
 for(const client of clients){
  try{client.postMessage({type:'SAGS_UPDATE_ACTIVATED',build:BUILD})}catch(_){}
  try{
   const u=new URL(client.url);
   if(u.origin===self.location.origin&&u.pathname.startsWith(SCOPE_PATH)){
    await client.navigate(canonical);
   }
  }catch(_){}
 }
})()));
self.addEventListener('message',event=>{
 if(event.data?.type==='SAGS_QUERY_BUILD'){
  event.waitUntil((async()=>{
   let formsSha256=null;
   try{formsSha256=(await readManifest())?.assets?.['./forms.registry.json']?.sha256||null}catch(_){}
   try{event.ports?.[0]?.postMessage({build:BUILD,ready:true,formsSha256})}catch(_){}
  })());return;
 }
 if(event.data?.type==='SKIP_WAITING'){
  event.waitUntil((async()=>{const m=await readManifest();if(m?.build!==BUILD)throw new Error('Unverified V5 build');await ensureBootstrapVerified(m);await self.skipWaiting()})());return;
 }
 if(event.data?.type==='SAGS_CHECK_ASSETS')event.waitUntil(verifyCurrentAssets().catch(e=>console.warn('E-REPORT V5 asset check failed',e)));
});
async function latestServerBuild(timeoutMs=2600){
 let timer=0;
 try{
  const ac=new AbortController();timer=setTimeout(()=>ac.abort(),timeoutMs);
  const r=await fetch(scopeUrl('./version.json')+'?__sags_nav_gate=1&t='+Date.now(),{cache:'no-store',signal:ac.signal,headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}});
  if(!r.ok)return '';const v=await r.json();return String(v?.build||'').trim();
 }catch(_){return ''}finally{clearTimeout(timer)}
}
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);
 if(url.origin!==self.location.origin||!url.pathname.startsWith(SCOPE_PATH))return;
 const path='./'+url.pathname.slice(SCOPE_PATH.length);
 const meta=path==='./version.json'||path===ASSET_MANIFEST_URL;
 const formsMeta=path==='./forms.registry.json';
 const checklistImage=path==='./FSAGS54-page-01.png'||path==='./FSAGS94-page-01.png';
 const carrierMeta=path==='./carrier-guide-version.json';
 const carrierRefresh=path==='./carrier-service-guide.json'&&url.searchParams.has('csgv');
 if((path==='./version.json'||path===ASSET_MANIFEST_URL)&&url.searchParams.has('__sags_strict')){
  event.respondWith(fetch(req,{cache:'no-store'}).catch(()=>new Response('OFFLINE - UPDATE CHECK REQUIRED',{status:503})));return;
 }
 if(formsMeta||checklistImage){event.respondWith(networkMetadata(req,event,false));return}
 if(meta||carrierMeta||carrierRefresh){event.respondWith(networkMetadata(req,event,meta));return}
 if(req.mode==='navigate'&&(url.pathname===SCOPE_PATH||path==='./index.html')){
  event.respondWith((async()=>{
   // Recovery navigation: fetch the canonical URL itself (not index.html with a
   // synthetic query) so GitHub Pages returns the normal document semantics.
   try{
    const canonical=scopeUrl('./');
    const fresh=await fetch(canonical,{cache:'no-store',headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}});
    if(fresh.ok){
     const c=await caches.open(CACHE_NAME);await c.put(HOME,fresh.clone());
     return new Response(await fresh.clone().arrayBuffer(),{status:fresh.status,statusText:fresh.statusText,headers:fresh.headers});
    }
   }catch(e){console.warn('Recovery navigation network fetch failed',e?.message||e)}
   const c=await caches.open(CACHE_NAME),r=await c.match(HOME);
   return r||new Response('APP SHELL NOT READY',{status:503});
  })());return;
 }
 if(req.mode==='navigate')return;
 event.respondWith(verifiedAsset(req,event,path,canonicalUrl(url)));
});

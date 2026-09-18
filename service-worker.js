/* E-REPORT SAGS V5.0B · IMMUTABLE EXECUTABLE PATHS / PINNED VERIFIED SHELL
   Base: V4.8.10B Layered PDF + HF1–HF4. Never mix navigation HTML with a different runtime.
*/
'use strict';
const BUILD='V5.0B-LAYERED-PDF-ATOMIC-SHELL';
const DISPLAY_VERSION='V5.0B';
const CACHE_NAME='sags-app-shell-v5.0b-atomic';
const META_CACHE_NAME='sags-app-meta-v5.0b-atomic';
const ASSET_MANIFEST_URL='./asset-manifest.json';
const SAGS_BOOTSTRAP=['./index.html','./app.v5.js','./app.bundle.css','./runtime.v5.bundle.js','./daily-roster.v5.js','./handover-multi.v5.js','./self-handover.v5.js','./roster-lite.v5.js','./features.v5.bundle.js','./pinned-flight.js','./service-worker.js','./version.json'];
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
async function readManifest(){try{const c=await caches.open(META_CACHE_NAME),r=await c.match(scopeUrl(ASSET_MANIFEST_URL));return r?await r.json():null}catch(_){return null}}
async function getReleaseManifest(){
 const [vr,mr]=await Promise.all([fetchFresh('./version.json'),fetchFresh(ASSET_MANIFEST_URL)]);
 const [v,m]=await Promise.all([vr.json(),mr.json()]);
 if(v?.build!==BUILD||m?.build!==BUILD||m?.version!==DISPLAY_VERSION||!m.assets)throw new Error('Version/manifest not synchronized');
 for(const p of SAGS_BOOTSTRAP)if(!m.assets[p])throw new Error('Missing bootstrap metadata '+p);
 return m;
}
async function verifyStaged(manifest){
 const c=await caches.open(CACHE_NAME);
 for(const path of SAGS_BOOTSTRAP){const r=await c.match(scopeUrl(path));if(!r)throw new Error('Missing staged bootstrap '+path);await checksum(r,manifest.assets[path],path)}
}
async function stageRelease(){
 try{
  const m=await getReleaseManifest();const c=await caches.open(CACHE_NAME);
  // Only put a file into the next build cache AFTER verifying the exact bytes.
  for(const path of SAGS_BOOTSTRAP){const r=await fetchFresh(path);await checksum(r,m.assets[path],path);await c.put(scopeUrl(path),r.clone())}
  await verifyStaged(m);
  const mc=await caches.open(META_CACHE_NAME);
  await mc.put(scopeUrl(ASSET_MANIFEST_URL),new Response(JSON.stringify(m),{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}}));
 }catch(e){
  console.error('E-REPORT V5 stage aborted; previous release retained',e);
  await Promise.all([caches.delete(CACHE_NAME),caches.delete(META_CACHE_NAME)]);
  throw e;
 }
}
async function reportNetworkRx(id,url,r){try{if(!id||!r?.ok)return;let n=Number(r.headers.get('content-length'))||0;if(!n)n=(await r.clone().blob()).size||0;const c=await self.clients.get(id);if(c&&n)c.postMessage({type:'SAGS_NET_RX',bytes:n,url:String(url||''),atMs:Date.now()})}catch(_){}}
async function verifiedAsset(request,event,path,key){
 const c=await caches.open(CACHE_NAME),hit=await c.match(key);
 if(hit)return hit;
 try{
  const r=await fetch(request,{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);
  const m=await readManifest();if(!m||m.build!==BUILD)throw new Error('No verified release manifest');
  if(m.assets[path])await checksum(r,m.assets[path],path);
  event.waitUntil((async()=>{try{await c.put(key,r.clone());await reportNetworkRx(event.clientId,request.url,r)}catch(_){}})());
  return r;
 }catch(e){console.warn('E-REPORT V5 asset unavailable',path,e?.message||e);return new Response('RELEASE ASSET NOT READY',{status:503})}
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
 for(const p of SAGS_BOOTSTRAP){let r=await c.match(scopeUrl(p));try{if(!r)throw Error('Not cached');await checksum(r,m.assets[p],p)}catch(_){r=await fetchFresh(p);await checksum(r,m.assets[p],p);await c.put(scopeUrl(p),r.clone())}}
 await verifyStaged(m);
}
self.addEventListener('install',event=>event.waitUntil(stageRelease()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const m=await readManifest();if(!m||m.build!==BUILD)throw new Error('Missing verified V5 release');
 await verifyStaged(m);
 // Do not delete older build caches while older tabs may still be using them.
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{
 if(event.data?.type==='SAGS_QUERY_BUILD'){
  event.waitUntil((async()=>{let ready=false;try{const m=await readManifest();if(m?.build===BUILD){await verifyStaged(m);ready=true}}catch(e){console.warn('E-REPORT V5 readiness check failed',e?.message||e)}
   try{event.ports?.[0]?.postMessage({build:BUILD,ready})}catch(_){}})());return;
 }
 if(event.data?.type==='SKIP_WAITING'){
  event.waitUntil((async()=>{const m=await readManifest();if(m?.build!==BUILD)throw new Error('Unverified V5 build');await verifyStaged(m);await self.skipWaiting()})());return;
 }
 if(event.data?.type==='SAGS_CHECK_ASSETS')event.waitUntil(verifyCurrentAssets().catch(e=>console.warn('E-REPORT V5 asset check failed',e)));
});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);
 if(url.origin!==self.location.origin||!url.pathname.startsWith(SCOPE_PATH))return;
 const path='./'+url.pathname.slice(SCOPE_PATH.length);
 const meta=path==='./version.json'||path===ASSET_MANIFEST_URL;
 const carrierMeta=path==='./carrier-guide-version.json';
 const carrierRefresh=path==='./carrier-service-guide.json'&&url.searchParams.has('csgv');
 if(meta||carrierMeta||carrierRefresh){event.respondWith(networkMetadata(req,event,meta));return}
 if(req.mode==='navigate'&&(url.pathname===SCOPE_PATH||path==='./index.html')){
  // PINNING IS KEY: NEVER fetch a newer index while this older worker serves old scripts.
  event.respondWith((async()=>{const c=await caches.open(CACHE_NAME),r=await c.match(HOME);return r||new Response('APP SHELL NOT READY',{status:503})})());return;
 }
 if(req.mode==='navigate')return;
 event.respondWith(verifiedAsset(req,event,path,canonicalUrl(url)));
});

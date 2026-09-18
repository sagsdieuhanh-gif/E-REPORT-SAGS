/* E-REPORT SAGS · V4.8.10B-HF4 · verified, staged updates; keep previous cache until safe. */
'use strict';
const BUILD='V4.8.10B-HF4-SELF-ACCEPT-SHIFT';
const DISPLAY_VERSION='V4.8.10B-HF4';
const CACHE_NAME='sags-app-shell-v4.8.10b-hf4';
const META_CACHE_NAME='sags-app-meta-v4.8.10b-hf4';
const ASSET_MANIFEST_URL='./asset-manifest.json';
const SAGS_BOOTSTRAP=['./index.html','./app.js','./runtime.bundle.js','./daily-roster.js','./roster-lite.js','./handover-multi.js','./self-handover.js','./features.bundle.js','./service-worker.js'];
function scopeUrl(path){return new URL(path,self.registration.scope).href}
function canonicalUrl(input){const url=new URL(typeof input==='string'?input:input.url,self.location.href);url.search='';url.hash='';return url.href}
async function fetchFresh(path){const u=scopeUrl(path),sep=u.includes('?')?'&':'?';const r=await fetch(u+sep+'__sags_build='+encodeURIComponent(DISPLAY_VERSION)+'&t='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error(path+' HTTP '+r.status);return r}
async function fetchJson(path){return (await fetchFresh(path)).json()}
async function checksum(response,meta,path){
  if(!meta||!meta.sha256||!Number.isSafeInteger(meta.bytes))throw new Error('Manifest thiếu checksum: '+path);
  const b=await response.clone().arrayBuffer();if(b.byteLength!==meta.bytes)throw new Error('Sai kích thước '+path);
  const h=await crypto.subtle.digest('SHA-256',b);const sha=[...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('');
  if(sha!==meta.sha256)throw new Error('Sai SHA-256 '+path);
}
async function readManifest(){try{const c=await caches.open(META_CACHE_NAME),r=await c.match(scopeUrl(ASSET_MANIFEST_URL));return r?await r.json():null}catch(_){return null}}
async function storeManifest(m){const c=await caches.open(META_CACHE_NAME);await c.put(scopeUrl(ASSET_MANIFEST_URL),new Response(JSON.stringify(m),{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}}))}
async function readyManifest(){const [v,m]=await Promise.all([fetchJson('./version.json'),fetchJson(ASSET_MANIFEST_URL)]);if(v?.build!==BUILD||m?.build!==BUILD||!m.assets)throw new Error('Bản phát hành chưa đồng bộ index/runtime/version/manifest');return m}
async function verifyStaged(m){const c=await caches.open(CACHE_NAME);for(const path of SAGS_BOOTSTRAP){const hit=await c.match(scopeUrl(path));if(!hit)throw new Error('Thiếu file đã kiểm chứng '+path);await checksum(hit,m.assets[path],path)}}
async function stageRelease(){
  let m;
  try{
    m=await readyManifest();const cache=await caches.open(CACHE_NAME);
    // Do not replace the running worker until all executable files are on the
    // server, independently verified, and available in this build's cache.
    for(const path of SAGS_BOOTSTRAP){const response=await fetchFresh(path);await checksum(response,m.assets[path],path);await cache.put(scopeUrl(path),response.clone())}
    await verifyStaged(m);await storeManifest(m);
  }catch(e){console.error('E-REPORT: chưa thể cài bản chưa đồng bộ',e);await Promise.all([caches.delete(CACHE_NAME),caches.delete(META_CACHE_NAME)]);throw e}
}
async function cleanupOldCaches(){const keys=await caches.keys();await Promise.all(keys.filter(k=>k!==CACHE_NAME&&k!==META_CACHE_NAME&&(/^(sags-app-shell-|sags-app-meta-|sags-v|sags-cache)/.test(k))).map(k=>caches.delete(k).catch(()=>false)))}
async function syncChangedAssets(){
  const m=await readyManifest(),cache=await caches.open(CACHE_NAME),failed=[];
  for(const [path,meta] of Object.entries(m.assets)){
    if(!SAGS_BOOTSTRAP.includes(path))continue;
    try{const old=await cache.match(scopeUrl(path));if(old){await checksum(old,meta,path);continue}const r=await fetchFresh(path);await checksum(r,meta,path);await cache.put(scopeUrl(path),r.clone())}catch(e){failed.push(path);console.warn('E-REPORT cache validation failed',path,e?.message||e)}
  }
  if(!failed.length)await storeManifest(m);return failed;
}
async function reportNetworkRx(clientId,url,response){try{if(!response?.ok||!clientId)return;let bytes=Number(response.headers.get('content-length'))||0;if(!bytes)bytes=(await response.clone().blob()).size||0;const client=await self.clients.get(clientId);if(client&&bytes)client.postMessage({type:'SAGS_NET_RX',bytes,url:String(url||''),atMs:Date.now()})}catch(_){}}
async function networkOrCached(request,event,cacheKey,verifyPath=null){
  const c=await caches.open(CACHE_NAME);
  try{
    const r=await fetch(request,{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);
    if(verifyPath){const m=await readManifest();if(!m||m.build!==BUILD)throw Error('manifest chưa sẵn sàng');await checksum(r,m.assets[verifyPath],verifyPath)}
    event.waitUntil((async()=>{try{await c.put(cacheKey,r.clone());await reportNetworkRx(event.clientId,request.url,r)}catch(_){}})());
    return r;
  }catch(_){return await c.match(cacheKey)||new Response('OFFLINE / RELEASE NOT READY',{status:503})}
}
self.addEventListener('install',event=>{event.waitUntil(stageRelease())});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const m=await readManifest();if(!m||m.build!==BUILD)return;try{await verifyStaged(m)}catch(e){console.error('E-REPORT staged cache invalid',e);return}await cleanupOldCaches();await self.clients.claim()})())});
self.addEventListener('message',event=>{
  if(event.data?.type==='SAGS_QUERY_BUILD'){try{event.ports?.[0]?.postMessage({build:BUILD,ready:true})}catch(_){}return}
  if(event.data?.type==='SKIP_WAITING'){event.waitUntil((async()=>{const m=await readManifest();if(!m||m.build!==BUILD)throw Error('Build chưa được xác minh');await verifyStaged(m);await self.skipWaiting()})());return}
  if(event.data?.type==='SAGS_CHECK_ASSETS')event.waitUntil(syncChangedAssets().catch(e=>console.warn('E-REPORT asset check',e)));
});
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;const u=new URL(req.url);if(u.origin!==self.location.origin)return;
  const meta=u.pathname.endsWith('/version.json')||u.pathname.endsWith('/asset-manifest.json');
  const carrierMeta=u.pathname.endsWith('/carrier-guide-version.json');
  const carrierRefresh=u.pathname.endsWith('/carrier-service-guide.json')&&u.searchParams.has('csgv');
  if(meta||carrierMeta||carrierRefresh){event.respondWith(networkOrCached(req,event,canonicalUrl(u)));return}
  if(req.mode==='navigate'){
    // Never deliver a partly-deployed older index with this worker's newer JS.
    // A verified previous index in this build cache is safer until CDN settles.
    event.respondWith(networkOrCached(req,event,scopeUrl('./index.html'),'./index.html'));return;
  }
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME),key=canonicalUrl(u),hit=await cache.match(key);
    if(hit)return hit;
    const path='./'+u.pathname.slice(new URL(self.registration.scope).pathname.length);
    return networkOrCached(req,event,key,SAGS_BOOTSTRAP.includes(path)?path:null);
  })());
});

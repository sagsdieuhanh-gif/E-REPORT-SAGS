/* E-REPORT SAGS V6.4.88 · AIRLINE GLASS UI + VERSION SYNC + RTDB DATA SAVER + CORE STABILITY PRESERVED · IMMUTABLE EXECUTABLE PATHS / PINNED VERIFIED SHELL
   Base: V4.8.10B Layered PDF + HF1–HF4. Never mix navigation HTML with a different runtime.
*/
'use strict';
const BUILD='V6.4.88-20261003-AUTO-CACHE-CLEANUP-01';
const DISPLAY_VERSION='V6.4.88';
const CACHE_NAME='sags-app-shell-v688-auto-cache-cleanup-01';
const META_CACHE_NAME='sags-app-meta-v688-auto-cache-cleanup-01';
const ASSET_MANIFEST_URL='./asset-manifest.json';
const MUTABLE_METADATA=new Set(['./forms/forms.registry.json','./data/form-configuration.json']);
const SAGS_BOOTSTRAP=["./index.html","./app/boot/01-sags-v620-unified-form-migration.js","./app/boot/02-sags-v611-update-alert-position.js","./app/generated/boot-group-1.js","./app/boot/05-legacy.js","./app/boot/06-legacy.js","./app/boot/07-legacy.js","./app/boot/08-v412-kh208-script.js","./app/boot/09-v454AccountProfileOverrides.js","./app/boot/10-v470-hybrid-core.js","./app/boot/11-v476-core.js","./app/boot/12-v484SystemDepartmentRoles.js","./app/boot/13-v485FeaturePermissions.js","./app/boot/14-v18CanonicalAccountHierarchy.js","./app/boot/15-v116-account-name-search.js","./app/modules/feature-loader.v1.js","./app/generated/core-shared.js","./app/generated/core-archive.js","./app/generated/boot-group-2.js","./app/generated/core-tools.js","./app/boot/18-v173-quick-time.js","./app/boot/19-v183-fs09-quick.js","./app/generated/boot-group-3.js","./app/boot/22-v1121-ios-time-footer-script.js","./app/boot/23-v1122-roster-sign-script.js","./app/generated/boot-group-4.js","./app/generated/core-flight.js","./app/generated/core-control.js","./app/generated/core-postcontrol.js","./app/modules/admin-reset.v503hf2.js","./app/generated/core-performance.js","./app/modules/firebase-read-coalescer.v1.js","./app/modules/daily-roster.v502.js","./app/modules/self-accept.v502.js","./app/boot/26-v644SafeStorageCleanup.js","./app/generated/runtime-1.js","./app/generated/runtime-2.js","./app/generated/runtime-3.js","./app/generated/runtime-4.js","./app/generated/runtime-5.js","./app/generated/boot-group-5.js","./app/modules/quick-entry.v1.js","./app/modules/ui-preferences.v1.js","./app/modules/stability.v6.js","./app/modules/cross-browser-entry.v1.js","./app/modules/roster-lite.v5.js","./app/boot/30-sags-v6120-all-form-render-standard.js","./app/modules/tvj-gof-035.v630.js","./app/modules/tvj-gof-035.v631.js","./app/modules/tvj-gof-035.v632.js","./app/boot/31-sags-grnd-ls-v621.js","./app/modules/fsags54-94.v622.js","./app/modules/form-registry-runtime.v647.js","./app/modules/form-registry-runtime.v6419.js","./app/modules/airline-form-policy.v1.js","./app/modules/workflow-cleanup.v6444.js","./app/modules/fsags208-workspace.v1.js","./app/styles/app.bundle.css","./app/styles/new-ui-v1.css","./app/styles/boot-01-legacy.css","./app/styles/boot-02-legacy.css","./app/styles/boot-03-legacy.css","./app/styles/boot-04-sags-login-bg-v640.css","./app/styles/boot-05-sags-role-home-v642.css","./app/styles/boot-06-v110-role-backgrounds.css","./app/styles/boot-07-v15-r002-serial-mask.css","./app/styles/boot-08-v114-final-paper-check-style.css","./app/styles/boot-09-sags-personal-account-test-style.css","./app/styles/boot-10-v139-fleet-manager-style.css","./app/styles/boot-11-v49-loading208-style.css","./app/styles/boot-12-v411-activity-detail-style.css","./app/styles/boot-13-v417-ad-control-center-style.css","./app/styles/boot-14-v412-kh208-style.css","./app/styles/boot-15-v476-style.css","./app/styles/boot-16-v482-responsive-ui-style.css","./app/styles/boot-17-v377AdminFormToolsStyle.css","./app/styles/boot-18-sags-v115-clean-ui.css","./app/styles/boot-19-v502RosterDirectStyle.css","./app/styles/boot-20-v503hf1AdControlResetStyle.css","./app/styles/boot-21-legacy.css","./app/styles/boot-22-sags-v611-update-alert-style.css","./app/styles/boot-23-v1-restore-final-send-button.css","./app/styles/boot-24-v1-final-header-layout.css","./app/styles/boot-25-v1-final-actions-unified.css","./app/styles/boot-26-v2-7-mobile-final-toolbar-fix.css","./app/styles/boot-27-v484-system-dept-style.css","./app/styles/boot-28-v485-feature-permission-style.css","./app/styles/boot-29-v18-account-hierarchy-style.css","./app/styles/boot-30-v178-fs09-quick-premium-style.css","./app/styles/boot-31-v183-fs09-closeout-quick-style.css","./app/styles/boot-32-v161-progress-v2-style.css","./app/styles/boot-33-v1121-ios-time-footer-style.css","./app/styles/boot-34-v1122-roster-sign-style.css","./app/styles/boot-35-v1134-quick-time-direct-style.css","./service-worker.js","./version.json","./data/airline-form-catalog.json","./app/modules/stability.v6-core.js","./app/modules/mobile-draft-recovery.v1.js","./app/modules/indexeddb-flight-store.v1.js"];
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
async function assertIndexReleaseStamp(response){
 const text=await response.clone().text();
 const buildOk=text.includes('name="sags-release-build" content="'+BUILD+'"')||text.includes('name="sags-release-build" content="'+BUILD+'"')||text.includes('const APP_BUILD_VERSION="'+BUILD+'"')||text.includes("const APP_BUILD_VERSION='"+BUILD+"'");
 const versionOk=text.includes('name="sags-release-version" content="'+DISPLAY_VERSION+'"')||text.includes('name="sags-release-version" content="'+DISPLAY_VERSION+'"')||text.includes('const APP_DISPLAY_VERSION="'+DISPLAY_VERSION+'"')||text.includes("const APP_DISPLAY_VERSION='"+DISPLAY_VERSION+"'");
 const loginOk=text.includes('id="loginReleaseVersion">'+DISPLAY_VERSION+'<')||text.includes("id='loginReleaseVersion'>"+DISPLAY_VERSION+"<");
 const runtimeOk=text.includes('app/generated/runtime-1.js?v='+BUILD);
 if(!buildOk||!versionOk||!loginOk||!runtimeOk)throw new Error('index.html release stamp mismatch for '+BUILD);
 return true;
}
async function verifyReleaseContract(manifest){
 const c=await caches.open(CACHE_NAME),prior=await sagsPriorShellNames();
 let r=await c.match(scopeUrl('./index.html'));
 if(!r)r=await sagsPriorAsset('./index.html',manifest?.assets?.['./index.html'],prior);
 if(!r)throw new Error('Missing release index.html');
 await checksum(r,manifest?.assets?.['./index.html'],'./index.html');
 await assertIndexReleaseStamp(r);
 return true;
}
async function getReleaseManifest(){
 const [vr,mr]=await Promise.all([fetchFresh('./version.json'),fetchFresh(ASSET_MANIFEST_URL)]);
 const [v,m]=await Promise.all([vr.clone().json(),mr.json()]);
 if(v?.build!==BUILD||m?.build!==BUILD||m?.version!==DISPLAY_VERSION||!m.assets)throw new Error('Version/manifest not synchronized');
 for(const p of SAGS_BOOTSTRAP)if(!m.assets[p])throw new Error('Missing bootstrap metadata '+p);
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
 const c=await caches.open(CACHE_NAME),prior=await sagsPriorShellNames();
 for(const path of SAGS_BOOTSTRAP){
  if(await c.match(scopeUrl(path)))continue;
  if(!await sagsPriorAsset(path,null,prior,false))throw new Error('Missing staged bootstrap '+path);
 }
 return true;
}
function markBootstrapVerified(manifest){
 sagsVerifiedBootstrapKey=sagsBootstrapVerificationKey(manifest);
 sagsVerifiedBootstrapReady=true;
}
async function verifyStaged(manifest){
 const c=await caches.open(CACHE_NAME),prior=await sagsPriorShellNames();
 for(const path of SAGS_BOOTSTRAP){
  const r=await c.match(scopeUrl(path));
  if(r){await checksum(r,manifest.assets[path],path);continue}
  if(!await sagsPriorAsset(path,manifest.assets[path],prior))throw new Error('Missing verified bootstrap '+path);
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
 const run=(async()=>{await verifyStaged(manifest);await verifyReleaseContract(manifest);markBootstrapVerified(manifest);return true})();
 sagsVerifiedBootstrapPromise=run;
 try{return await run}finally{if(sagsVerifiedBootstrapPromise===run)sagsVerifiedBootstrapPromise=null}
}
async function stageRelease(){
 try{
  const {manifest:m,versionResponse}=await getReleaseManifest();const c=await caches.open(CACHE_NAME);
  // Check local cached bytes against the NEW manifest before deciding to fetch.
  // An unchanged asset stays in its prior cache; no network OR duplicate cache copy.
  // A missing/modified/corrupt asset is downloaded and checked before insertion.
  // Drain the three bounded workers before abort so no write can revive bad data.
  const prior=await sagsPriorShellNames();
  const queue=SAGS_BOOTSTRAP.slice();let failure=null;
  await Promise.all(Array.from({length:3},async()=>{
    while(queue.length&&!failure){
      const path=queue.shift();
      try{
       const existing=await c.match(scopeUrl(path));
       if(existing){try{await checksum(existing,m.assets[path],path);continue}catch(_){}}
       if(await sagsPriorAsset(path,m.assets[path],prior))continue;
       const r=path==='./version.json'?versionResponse.clone():await fetchFresh(path);
       await checksum(r,m.assets[path],path);await c.put(scopeUrl(path),r.clone());
      }catch(e){if(!failure)failure=e}
    }
  }));
  if(failure)throw failure;
  // All 18 assets were byte/SHA-256 verified above; assert they remain present.
  await verifyBootstrapPresence();
  await verifyReleaseContract(m);
  markBootstrapVerified(m);
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
  const m=await readManifest();if(!m||m.build!==BUILD)throw new Error('No verified release manifest');
  // Covers all other unchanged manifest assets too (e.g. PDF backgrounds).
  // Return verified old bytes directly instead of duplicating them on the phone.
  if(m.assets[path]){
   const old=await sagsPriorAsset(path,m.assets[path]);
   if(old)return old;
  }
  const r=await fetch(request,{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);
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
 const prior=await sagsPriorShellNames();
 for(const p of SAGS_BOOTSTRAP){
  let r=await c.match(scopeUrl(p));let good=false;
  if(r){try{await checksum(r,m.assets[p],p);good=true}catch(_){}}
  if(!good&&await sagsPriorAsset(p,m.assets[p],prior))good=true;
  if(!good){r=await fetchFresh(p);await checksum(r,m.assets[p],p);await c.put(scopeUrl(p),r.clone())}
 }
 // Explicit diagnostics fully hash all cached bytes, including prior releases.
 await verifyBootstrapPresence();await verifyReleaseContract(m);markBootstrapVerified(m);
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 await stageRelease();
 // Wait for a deliberate user action. No automatic skipWaiting or forced navigation.
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const m=await readManifest();if(!m||m.build!==BUILD)throw new Error('Missing verified V5 release');
 await ensureBootstrapVerified(m);
 // Do not delete older build caches or claim other tabs. They can finish their work.
 // Activation happens only after a user explicitly selects "Cập nhật ngay".
})()));
async function safeCleanupOldReleaseCaches(){
 // Never touch localStorage, IndexedDB, drafts, flight data or mutable form registry.
 // Before deleting an old release cache, MOVE every immutable byte still needed by
 // the current manifest into the current cache, one asset at a time. This avoids
 // both broken current releases and a large temporary storage spike.
 const m=await readManifest();if(!m||m.build!==BUILD)throw new Error('Current release is not verified');
 await ensureBootstrapVerified(m);
 const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
 if(windows.length>1)return {ok:true,skipped:true,reason:'multiple-open-app-windows',deleted:[],moved:0};
 const names=await caches.keys();
 const prior=names.filter(name=>name!==CACHE_NAME&&name.startsWith('sags-app-shell-'));
 const current=await caches.open(CACHE_NAME);let moved=0,fetched=0;
 for(const [path,meta] of Object.entries(m.assets||{})){
  if(MUTABLE_METADATA.has(path))continue;
  const key=scopeUrl(path);let hit=await current.match(key),good=false;
  if(hit){try{await checksum(hit,meta,path);good=true}catch(_){try{await current.delete(key)}catch(__){}}}
  if(good)continue;
  let restored=false;
  for(const name of prior){
   try{
    const old=await caches.open(name),r=await old.match(key);if(!r)continue;
    await checksum(r,meta,path);
    await current.put(key,r.clone());
    // Delete the source entry only after the destination write succeeded.
    await old.delete(key);moved++;restored=true;break;
   }catch(e){console.warn('Safe cleanup ignored stale cache asset',path,name,e?.message||e)}
  }
  if(!restored){const r=await fetchFresh(path);await checksum(r,meta,path);await current.put(key,r.clone());fetched++;}
 }
 // Current release must now be standalone before any whole-cache deletion.
 for(const [path,meta] of Object.entries(m.assets||{})){
  if(MUTABLE_METADATA.has(path))continue;
  const r=await current.match(scopeUrl(path));if(!r)throw new Error('Standalone cache missing '+path);await checksum(r,meta,path);
 }
 const deleted=[];
 for(const name of await caches.keys()){
  const ours=name.startsWith('sags-app-shell-')||name.startsWith('sags-app-meta-');
  if(!ours||name===CACHE_NAME||name===META_CACHE_NAME)continue;
  try{if(await caches.delete(name))deleted.push(name)}catch(_){ }
 }
 return {ok:true,skipped:false,deleted,moved,fetched};
}
self.addEventListener('message',event=>{
 if(event.data?.type==='SAGS_SAFE_CLEANUP'){
  event.waitUntil((async()=>{try{const out=await safeCleanupOldReleaseCaches();event.ports?.[0]?.postMessage(out)}catch(e){console.warn('E-REPORT safe cleanup failed',e?.message||e);try{event.ports?.[0]?.postMessage({ok:false,error:String(e?.message||e)})}catch(_){}}})());return;
 }
 if(event.data?.type==='SAGS_QUERY_BUILD'){
  event.waitUntil((async()=>{let ready=false;try{const m=await readManifest();if(m?.build===BUILD){await ensureBootstrapVerified(m);ready=true}}catch(e){console.warn('E-REPORT V5 readiness check failed',e?.message||e)}
   try{event.ports?.[0]?.postMessage({build:BUILD,ready})}catch(_){}})());return;
 }
 if(event.data?.type==='SKIP_WAITING'){
  event.waitUntil((async()=>{const m=await readManifest();if(m?.build!==BUILD)throw new Error('Unverified V5 build');await ensureBootstrapVerified(m);await self.skipWaiting()})());return;
 }
 if(event.data?.type==='SAGS_CHECK_ASSETS')event.waitUntil(verifyCurrentAssets().catch(e=>console.warn('E-REPORT V5 asset check failed',e)));
});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);
 if(url.origin!==self.location.origin||!url.pathname.startsWith(SCOPE_PATH))return;
 const path='./'+url.pathname.slice(SCOPE_PATH.length);
 const meta=path==='./version.json'||path===ASSET_MANIFEST_URL;
 const carrierMeta=path==='./data/carrier-guide-version.json';
 const carrierRefresh=path==='./data/carrier-service-guide.json'&&url.searchParams.has('csgv');
 if(path==='./index.html'&&(url.searchParams.has('__sags_contract')||url.searchParams.has('__repair'))){event.respondWith(fetch(req,{cache:'no-store'}).catch(()=>new Response('OFFLINE - RELEASE CONTRACT REQUIRED',{status:503})));return}
 if((path==='./version.json'||path===ASSET_MANIFEST_URL||path==='./forms/forms.registry.json')&&url.searchParams.has('__sags_strict')){
  event.respondWith(fetch(req,{cache:'no-store'}).catch(()=>new Response('OFFLINE - UPDATE CHECK REQUIRED',{status:503})));return;
 }
 if(path==='./data/form-configuration.json'){event.respondWith(networkMetadata(req,event));return}
 if(meta||carrierMeta||carrierRefresh){event.respondWith(networkMetadata(req,event,meta));return}
 if(path==='./forms/forms.registry.json'){event.respondWith(fetch(req,{cache:'no-store'}).then(r=>r.ok?r:new Response('FORM REGISTRY UNAVAILABLE',{status:r.status})).catch(()=>new Response('FORM REGISTRY UNAVAILABLE',{status:503})));return}
 if(req.mode==='navigate'&&(url.pathname===SCOPE_PATH||path==='./index.html')){
  // Keep the active release pinned, but never strand the user on a blank 503.
  // If the verified shell is missing/corrupt, route to the network-only repair
  // page. repair.html unregisters stale workers/caches and re-opens only after
  // version + manifest + index agree on one build.
  event.respondWith((async()=>{
   const c=await caches.open(CACHE_NAME),r=await c.match(HOME);if(r)return r;
   const m=await readManifest();
   const old=m?.build===BUILD?await sagsPriorAsset('./index.html',m.assets?.['./index.html']):null;
   if(old)return old;
   const repair=new URL('./repair.html',self.registration.scope);
   repair.searchParams.set('auto','1');
   repair.searchParams.set('source','shell-not-ready');
   repair.searchParams.set('target',BUILD);
   return Response.redirect(repair.href,302);
  })());return;
 }
 if(req.mode==='navigate')return;
 event.respondWith(verifiedAsset(req,event,path,canonicalUrl(url)));
});

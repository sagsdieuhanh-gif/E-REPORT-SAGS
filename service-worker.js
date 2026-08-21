const CACHE_NAME="sags-v3-37-cbtt-grnd-ls-20260821-01";
const BUILD="V3.37-20260821-01";
const APP_SHELL=[
  "./9Gfinal.png",
  "./CBTT.png",
  "./KTTB.png",
  "./LNF.png",
  "./PVHK.png",
  "./PVHLNG.png",
  "./VHTTB.png",
  "./VJfinal.png",
  "./VJfinal2.png",
  "./VUfinal.png",
  "./ai.js",
  "./alert-crosscheck-complete.mp3",
  "./alert-ket-so-moi.mp3",
  "./alert-ket-so-thay-doi.mp3",
  "./alert-mva.mp3",
  "./alert-mvt.mp3",
  "./alert-pushback-missing.mp3",
  "./app.js",
  "./apple-touch-icon.png",
  "./favicon-16.png",
  "./favicon-32.png",
  "./fsags13-official-continuation.png",
  "./fsags13-official-page1.png",
  "./icon-192.png",
  "./icon-512.png",
  "./index.html",
  "./ket-so.wav",
  "./login-bg.jpg",
  "./login-logo-10years.png",
  "./manifest.webmanifest",
  "./page1.png",
  "./page10.png",
  "./page11.png",
  "./page12.png",
  "./page13.png",
  "./page2.png",
  "./page4.png",
  "./page6.png",
  "./page7.png",
  "./page9.png",
  "./rns-ke-continuation.png",
  "./rns-ke-page1.png",
  "./rns-lj-continuation.png",
  "./rns-lj-page1.png",
  "./rns-tw-page1.png",
  "./rns-tw-participants.png",
  "./sags-logo.png",
  "./version.json",
  "./ĐH.png"
];
self.addEventListener("install",event=>{event.waitUntil((async()=>{const cache=await caches.open(CACHE_NAME);const results=await Promise.allSettled(APP_SHELL.map(async path=>{const u=new URL(path,self.location.href);u.searchParams.set("__swbuild",BUILD);const res=await fetch(new Request(u.toString(),{cache:"reload"}));if(!res.ok)throw new Error("Precache failed: "+path+" HTTP "+res.status);await cache.put(path,res.clone());return path;}));const failed=results.filter(r=>r.status==="rejected");if(failed.length)console.warn("SAGS precache partial failure",failed.map(r=>String(r.reason?.message||r.reason)));})());});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener("message",event=>{if(event.data&&event.data.type==="SKIP_WAITING")self.skipWaiting();});
self.addEventListener("fetch",event=>{
 if(event.request.method!=="GET")return;const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;
 const fresh=event.request.mode==="navigate"||["/version.json","/manifest.webmanifest","/index.html","/app.js","/ai.js"].some(x=>url.pathname.endsWith(x));
 if(fresh){event.respondWith((async()=>{try{const r=await fetch(event.request,{cache:"no-store"});if(r&&r.ok){const copy=r.clone();caches.open(CACHE_NAME).then(c=>c.put(event.request,copy)).catch(()=>{});}return r;}catch(_){return await caches.match(event.request)||(event.request.mode==="navigate"?await caches.match("./index.html"):undefined);}})());return;}
 event.respondWith(caches.match(event.request).then(c=>c||fetch(event.request).then(r=>{if(r&&r.ok){const copy=r.clone();caches.open(CACHE_NAME).then(cc=>cc.put(event.request,copy)).catch(()=>{});}return r;})));
});

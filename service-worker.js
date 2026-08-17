const CACHE_NAME="sags-v1-4-20260818-02";
const APP_SHELL=[
  "./index.html",
  "./version.json",
  "./firebase-config.js",
  "./v488-archive.js",
  "./ai-crosscheck.js",
  "./alert-mva.mp3",
  "./alert-mvt.mp3",
  "./alert-pushback-missing.mp3",
  "./alert-read-sign.mp3",
  "./9Gfinal.png",
  "./VJfinal.png",
  "./VJfinal2.png",
  "./VUfinal.png",
  "./apple-touch-icon.png",
  "./favicon-16.png",
  "./favicon-32.png",
  "./icon-192.png",
  "./icon-512.png",
  "./login-bg.jpg",
  "./login-logo-10years.png",
  "./page1.png",
  "./page2.png",
  "./page4.png",
  "./page6.png",
  "./page7.png",
  "./page9.png",
  "./page10.png",
  "./page11.png",
  "./page12.png",
  "./page13.png",
  "./sags-logo.png",
  "./fsags13-official-page1.png",
  "./fsags13-official-page2.png",
  "./fsags13-official-continuation.png",
  "./rns-lj-page1.png",
  "./rns-lj-continuation.png",
  "./rns-tw-page1.png",
  "./rns-tw-participants.png",
  "./rns-ke-page1.png",
  "./rns-ke-continuation.png"
];

self.addEventListener("install", event => {
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL.map(async path=>{
      const u=new URL(path,self.location.href);
      u.searchParams.set("__swbuild","V1.4-20260818-02");
      const req=new Request(u.toString(),{cache:"reload"});
      const res=await fetch(req);
      if(!res.ok) throw new Error("Precache failed: "+path+" HTTP "+res.status);
      await cache.put(path,res.clone());
    }));
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if(event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  if(event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if(url.origin !== self.location.origin) return;

  const isNavigation = event.request.mode === "navigate";
  const isFreshFile = url.pathname.endsWith("/version.json") ||
                      url.pathname.endsWith("/firebase-config.js") ||
                      url.pathname.endsWith("/index.html") ||
                      isNavigation;

  if(isFreshFile){
    event.respondWith(
      fetch(event.request, {cache:"no-store"})
        .then(response => {
          if(response && response.ok){
            const copy=response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(()=>{});
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then(cached =>
            cached || caches.match("./index.html")
          )
        )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if(cached) return cached;
      return fetch(event.request).then(response => {
        if(response && response.ok){
          const copy=response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(()=>{});
        }
        return response;
      });
    })
  );
});

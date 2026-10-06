/* E-REPORT/SAGS V2.0 · three-layer draft protection bootstrap.
 * localStorage stays the immediate recovery source; IndexedDB mirrors field drafts immediately;
 * roster-bound drafts synchronize safely to RTDB when online.
 */
(function(root){
  'use strict';
  if(root.__SAGS_MOBILE_DRAFT_LOADER__)return;
  root.__SAGS_MOBILE_DRAFT_LOADER__=true;
  const script=document.currentScript;
  const base=new URL('.',script?.src||location.href);
  const core=new URL('stability.v6-core.js?v=V2.0',base).href;
  const addon=new URL('mobile-draft-recovery.v1.js?v=V2.0',base).href;
  const idb=new URL('indexeddb-flight-store.v1.js?v=V2.0',base).href;
  const cloud=new URL('cloud-draft-sync.v2.js?v=V2.0',base).href;
  function load(url,done){
    const el=document.createElement('script');el.src=url;el.async=false;
    if(done)el.onload=done;
    el.onerror=()=>console.error('E-REPORT support script failed to load:',url);
    document.head.appendChild(el);
  }
  if(document.readyState==='loading'&&script&&!script.async&&!script.defer){
    document.write('<script src="'+core+'"><\/script><script src="'+addon+'"><\/script><script src="'+idb+'"><\/script><script src="'+cloud+'"><\/script>');
  }else{
    load(core,()=>load(addon,()=>load(idb,()=>load(cloud))));
  }
})(window);

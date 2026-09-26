/* E-REPORT/SAGS V6.2.6 · stability bootstrap + IndexedDB shadow storage.
 * Existing localStorage remains authoritative; IndexedDB is a verified shadow copy only.
 */
(function(root){
  'use strict';
  if(root.__SAGS_MOBILE_DRAFT_LOADER__)return;
  root.__SAGS_MOBILE_DRAFT_LOADER__=true;
  const script=document.currentScript;
  const base=new URL('.',script?.src||location.href);
  const core=new URL('stability.v6-core.js?v=20260922-02',base).href;
  const addon=new URL('mobile-draft-recovery.v1.js?v=20260922-02',base).href;
  const idb=new URL('indexeddb-flight-store.v1.js?v=20260924-01',base).href;
  function load(url,done){
    const el=document.createElement('script');el.src=url;el.async=false;
    if(done)el.onload=done;
    el.onerror=()=>console.error('E-REPORT support script failed to load:',url);
    document.head.appendChild(el);
  }
  if(document.readyState==='loading'&&script&&!script.async&&!script.defer){
    document.write('<script src="'+core+'"><\/script><script src="'+addon+'"><\/script><script src="'+idb+'"><\/script>');
  }else{
    load(core,()=>load(addon,()=>load(idb)));
  }
})(window);

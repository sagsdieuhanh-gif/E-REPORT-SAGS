/* E-REPORT/SAGS · IndexedDB flight shadow storage V1
 * Production shadow mode: existing localStorage remains the source of truth.
 * This module copies flight-session data into IndexedDB, verifies read-back,
 * and reports storage usage. It never deletes or overwrites localStorage data.
 */
(function(root){
  'use strict';
  if(root.__SAGS_INDEXEDDB_FLIGHT_STORE_V1__)return;
  root.__SAGS_INDEXEDDB_FLIGHT_STORE_V1__=true;

  const DB_NAME='sags-ereport-device-v1';
  const DB_VERSION=1;
  const STORE_LISTS='sessionLists';
  const STORE_ENVELOPES='flightEnvelopes';
  const STORE_META='meta';
  const $=id=>document.getElementById(id);
  const S=v=>String(v??'').trim();
  const utf8Bytes=s=>{let n=0;for(const ch of String(s)){const cp=ch.codePointAt(0);n+=cp<=0x7f?1:cp<=0x7ff?2:cp<=0xffff?3:4;}return n;};
  const json=v=>JSON.stringify(v??null);
  const bytes=s=>utf8Bytes(String(s));
  const safe=v=>S(v).toUpperCase().replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,64)||'NO_ACCOUNT';
  const clone=v=>JSON.parse(JSON.stringify(v));
  let mirrorTimer=0,mirrorRunning=false,lastMirrorAt=0,lastMirrorResult=null,hookInstalled=false;

  function accountScope(){
    try{
      const session=root.__sagsGetSession?.()||{};
      return safe(root.currentUserProfile?.username||session.profile?.username||session.username||'NO_ACCOUNT');
    }catch(_){return 'NO_ACCOUNT';}
  }
  function loggedIn(){return accountScope()!=='NO_ACCOUNT'&&typeof root.readFlightSessionList==='function'&&typeof root.readFlightSessionEnvelope==='function';}

  function req(request){
    return new Promise((resolve,reject)=>{
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error('IndexedDB request failed'));
    });
  }
  function txDone(tx){
    return new Promise((resolve,reject)=>{
      tx.oncomplete=()=>resolve(true);
      tx.onabort=()=>reject(tx.error||new Error('IndexedDB transaction aborted'));
      tx.onerror=()=>reject(tx.error||new Error('IndexedDB transaction failed'));
    });
  }
  function openDb(){
    if(!root.indexedDB)return Promise.reject(new Error('IndexedDB không khả dụng trên trình duyệt này.'));
    return new Promise((resolve,reject)=>{
      const request=root.indexedDB.open(DB_NAME,DB_VERSION);
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains(STORE_LISTS))db.createObjectStore(STORE_LISTS,{keyPath:'scope'});
        if(!db.objectStoreNames.contains(STORE_ENVELOPES)){
          const store=db.createObjectStore(STORE_ENVELOPES,{keyPath:'key'});
          store.createIndex('scope','scope',{unique:false});
          store.createIndex('sessionId','sessionId',{unique:false});
        }
        if(!db.objectStoreNames.contains(STORE_META))db.createObjectStore(STORE_META,{keyPath:'key'});
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error('Không mở được IndexedDB.'));
      request.onblocked=()=>reject(new Error('IndexedDB đang bị một tab khác khóa nâng cấp.'));
    });
  }

  async function putSessionList(list,scope=accountScope()){
    const payload=json(Array.isArray(list)?list:[]),record={scope,payload,bytes:bytes(payload),mirroredAtMs:Date.now()};
    const db=await openDb();
    try{
      const tx=db.transaction([STORE_LISTS],'readwrite');
      tx.objectStore(STORE_LISTS).put(record);
      await txDone(tx);
      return {scope,bytes:record.bytes,count:Array.isArray(list)?list.length:0};
    }finally{db.close();}
  }
  async function getSessionList(scope=accountScope()){
    const db=await openDb();
    try{
      const tx=db.transaction([STORE_LISTS],'readonly');
      const rec=await req(tx.objectStore(STORE_LISTS).get(scope));
      await txDone(tx);
      return rec?JSON.parse(rec.payload):null;
    }finally{db.close();}
  }
  async function putEnvelope(sessionId,envelope,scope=accountScope()){
    sessionId=S(sessionId);if(!sessionId)throw new Error('Thiếu sessionId.');
    const payload=json(envelope||{}),key=scope+'::'+sessionId;
    const record={key,scope,sessionId,payload,bytes:bytes(payload),mirroredAtMs:Date.now()};
    const db=await openDb();
    try{
      const tx=db.transaction([STORE_ENVELOPES],'readwrite');
      tx.objectStore(STORE_ENVELOPES).put(record);
      await txDone(tx);
      return {key,bytes:record.bytes};
    }finally{db.close();}
  }
  async function getEnvelope(sessionId,scope=accountScope()){
    sessionId=S(sessionId);if(!sessionId)return null;
    const db=await openDb();
    try{
      const tx=db.transaction([STORE_ENVELOPES],'readonly');
      const rec=await req(tx.objectStore(STORE_ENVELOPES).get(scope+'::'+sessionId));
      await txDone(tx);
      return rec?JSON.parse(rec.payload):null;
    }finally{db.close();}
  }
  async function listEnvelopeMeta(scope=accountScope()){
    const db=await openDb();
    try{
      const tx=db.transaction([STORE_ENVELOPES],'readonly'),store=tx.objectStore(STORE_ENVELOPES),index=store.index('scope');
      const rows=await req(index.getAll(scope));
      await txDone(tx);
      return (rows||[]).map(x=>({sessionId:x.sessionId,bytes:Number(x.bytes||0),mirroredAtMs:Number(x.mirroredAtMs||0)}));
    }finally{db.close();}
  }

  async function mirrorCurrentLocalStorage(){
    if(!loggedIn())throw new Error('Chưa đăng nhập hoặc chưa tải đủ flight session.');
    const scope=accountScope(),list=clone(root.readFlightSessionList()||[]),errors=[];
    await putSessionList(list,scope);
    let mirrored=0,totalBytes=0;
    for(const meta of list){
      const id=S(meta?.id);if(!id)continue;
      try{
        const env=clone(root.readFlightSessionEnvelope(id)||{});
        const out=await putEnvelope(id,env,scope);
        const verify=await getEnvelope(id,scope);
        if(json(verify)!==json(env))throw new Error('Read-back không khớp');
        mirrored++;totalBytes+=out.bytes;
      }catch(error){errors.push({sessionId:id,error:S(error?.message||error)});}
    }
    const verifyList=await getSessionList(scope);
    const listVerified=json(verifyList)===json(list);
    return {scope,sessionCount:list.length,mirrored,totalBytes,listVerified,errors,deletedLocalStorage:false};
  }

  function categoryForKey(key){
    const k=S(key).toLowerCase();
    if(/flight|session|workspace|roster/.test(k))return 'flight/session';
    if(/draft|uncommitted|recovery/.test(k))return 'draft/recovery';
    if(/attach|image|photo|signature|pdf/.test(k))return 'attachment/media';
    if(/auth|login|account|profile|role/.test(k))return 'auth/profile';
    if(/cache|version|update|manifest/.test(k))return 'cache/update';
    return 'other';
  }
  function inventoryLocalStorage(){
    const top=[],groups={};let totalBytes=0;
    try{
      for(let i=0;i<root.localStorage.length;i++){
        const key=root.localStorage.key(i)||'',value=root.localStorage.getItem(key)||'',size=bytes(key)+bytes(value),category=categoryForKey(key);
        totalBytes+=size;groups[category]=(groups[category]||0)+size;top.push({key,bytes:size,category});
      }
    }catch(error){return {ok:false,error:S(error?.message||error),totalBytes,groups,top:[]};}
    top.sort((a,b)=>b.bytes-a.bytes);
    return {ok:true,totalBytes,groups,top:top.slice(0,20)};
  }
  async function storageEstimate(){
    try{
      if(!root.navigator?.storage?.estimate)return {supported:false};
      const x=await root.navigator.storage.estimate();
      return {supported:true,usage:Number(x.usage||0),quota:Number(x.quota||0),percent:x.quota?Number(x.usage||0)/Number(x.quota)*100:null};
    }catch(error){return {supported:false,error:S(error?.message||error)};}
  }
  async function report(){
    const [idbRows,estimate]=await Promise.all([listEnvelopeMeta().catch(()=>[]),storageEstimate()]);
    const local=inventoryLocalStorage();
    return {build:S(root.__SAGS_RELEASE_BUILD__||'IDB-SHADOW'),scope:accountScope(),localStorage:local,indexedDb:{sessions:idbRows,totalBytes:idbRows.reduce((n,x)=>n+x.bytes,0)},storageEstimate:estimate,lastMirrorResult};
  }

  async function mirrorNow(reason='auto'){
    if(mirrorRunning||!loggedIn())return {skipped:true,reason};
    mirrorRunning=true;
    try{
      const out=await mirrorCurrentLocalStorage();
      out.reason=reason;out.atMs=Date.now();lastMirrorResult=out;lastMirrorAt=out.atMs;
      if(!out.listVerified||out.errors.length)console.warn('E-REPORT IndexedDB shadow verify',out);
      return out;
    }catch(error){
      lastMirrorResult={reason,atMs:Date.now(),error:S(error?.message||error)};
      console.warn('E-REPORT IndexedDB shadow mirror failed',error);
      return lastMirrorResult;
    }finally{mirrorRunning=false;}
  }
  function scheduleMirror(reason='change',delay=700){
    clearTimeout(mirrorTimer);
    mirrorTimer=setTimeout(()=>{mirrorTimer=0;void mirrorNow(reason);},Math.max(0,Number(delay)||0));
  }
  function installShadowWriteHook(){
    if(hookInstalled)return true;
    const original=root.writeFlightSessionList;
    if(typeof original!=='function'||original.__sagsIdbShadow)return false;
    const wrapped=function(list){
      const result=original.apply(this,arguments);
      scheduleMirror('session-list-write',250);
      return result;
    };
    wrapped.__sagsIdbShadow=true;wrapped.__sagsOriginal=original;root.writeFlightSessionList=wrapped;hookInstalled=true;
    return true;
  }

  function fmtMb(n){return (Number(n||0)/1048576).toFixed(2)+' MB';}
  async function showStorageReport(){
    const r=await report(),local=r.localStorage||{},idb=r.indexedDb||{},est=r.storageEstimate||{};
    const groups=Object.entries(local.groups||{}).sort((a,b)=>b[1]-a[1]).map(([k,v])=>'• '+k+': '+fmtMb(v)).join('\n');
    const verify=lastMirrorResult?.listVerified&&!lastMirrorResult?.errors?.length?'✓ bản sao IndexedDB đã đọc kiểm tra':'Đang chờ/kiểm tra bản sao IndexedDB';
    alert(
      'DUNG LƯỢNG E-REPORT TRÊN THIẾT BỊ NÀY\n\n'+
      'localStorage: '+fmtMb(local.totalBytes)+'\n'+
      (groups?groups+'\n':'')+
      'IndexedDB shadow: '+fmtMb(idb.totalBytes)+' · '+(idb.sessions?.length||0)+' chuyến\n'+
      (est.supported?'Tổng storage của origin: '+fmtMb(est.usage)+' / '+fmtMb(est.quota)+'\n':'')+
      '\n'+verify+'\n\nBản sao IndexedDB chỉ dùng để phục hồi an toàn; KHÔNG tự xóa dữ liệu cũ.'
    );
  }
  function ensureUi(){
    if($('sagsIdbStorageBtn')||!document.body)return;
    const b=document.createElement('button');b.type='button';b.id='sagsIdbStorageBtn';b.textContent='💾 BỘ NHỚ';
    b.style.cssText='position:fixed;left:10px;bottom:calc(76px + env(safe-area-inset-bottom));z-index:9799;border:1px solid #93c5fd;background:#eff6ff;color:#1e40af;border-radius:999px;padding:7px 10px;font:800 10px/1.2 Arial;box-shadow:0 3px 12px #0002';
    b.title='Xem dung lượng lưu E-REPORT trên thiết bị này';
    b.addEventListener('click',()=>void showStorageReport());
    document.body.appendChild(b);
  }
  function start(){
    const attempt=()=>{installShadowWriteHook();ensureUi();if(loggedIn())scheduleMirror('startup',800);};
    attempt();setTimeout(attempt,1200);setTimeout(attempt,3500);
    root.addEventListener?.('pageshow',()=>{attempt();scheduleMirror('pageshow',900)},{passive:true});
    document.addEventListener?.('visibilitychange',()=>{if(document.visibilityState==='hidden')scheduleMirror('visibility-hidden',0)});
    setInterval(()=>{installShadowWriteHook();if(loggedIn()&&Date.now()-lastMirrorAt>30000)scheduleMirror('periodic',0)},30000);
  }

  root.sagsIndexedDbFlightStoreV1={
    DB_NAME,DB_VERSION,accountScope,openDb,putSessionList,getSessionList,putEnvelope,getEnvelope,
    listEnvelopeMeta,mirrorCurrentLocalStorage,inventoryLocalStorage,storageEstimate,report,mirrorNow,
    scheduleMirror,installShadowWriteHook,showStorageReport
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(typeof window!=='undefined'?window:globalThis);

/* E-REPORT-SAGS original camera-proof retry queue. Lazy loaded by radio custody.
 * Independent Firebase signed custody is ALWAYS authoritative.
 * No Supabase secret, public Storage URL, or unsigned proof is ever stored. */
(function(root){
 'use strict';
 if(root.SAGSRadioPhotoVaultV1)return;
 const URL='https://wggirxzdcfnxyjgjvpgh.supabase.co/functions/v1/sags-radio-photo-v1';
 const DB='sags-radio-original-queue-v1',STORE='queue';
 let dbPromise=null,syncInFlight=null;
 const purged=new Map();
 function authUser(){return root.firebase?.auth?.()?.currentUser||null}
 function validId(value){return typeof value==='string'&&/^[A-Za-z0-9_-]{5,150}$/.test(value)}
 function database(){
  if(!root.indexedDB)return Promise.reject(Error('IndexedDB không khả dụng trên thiết bị.'));
  if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
   const req=root.indexedDB.open(DB,1);
   req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))
    req.result.createObjectStore(STORE,{keyPath:'eventId'})};
   req.onsuccess=()=>resolve(req.result);
   req.onerror=()=>reject(req.error||Error('Không mở được kho ảnh gốc'));
   req.onblocked=()=>reject(Error('Kho ảnh gốc đang mở ở tab khác'));
  }).catch(e=>{dbPromise=null;throw e});
  return dbPromise;
 }
 async function putLocal(eventId,uid,image){
  if(!validId(eventId)||typeof uid!=='string'||!uid||
      !(image instanceof Blob)||image.type!=='image/jpeg'||
      image.size<12000||image.size>8388608)throw Error('Ảnh gốc hoặc mã sự kiện không hợp lệ.');
  const db=await database();
  return new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,'readwrite');
   tx.objectStore(STORE).put({eventId,uid,image,queuedAt:Date.now(),failures:0});
   tx.oncomplete=()=>resolve(true);
   tx.onerror=()=>reject(tx.error||Error('Không thể lưu ảnh gốc lên thiết bị'));
   tx.onabort=()=>reject(tx.error||Error('Lưu ảnh gốc đã bị hủy'));
  });
 }
 async function removeLocal(eventId){
  const db=await database();
  return new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,'readwrite');
   tx.objectStore(STORE).delete(eventId);
   tx.oncomplete=()=>resolve();
   tx.onerror=()=>reject(tx.error||Error('Không thể xóa ảnh đã đồng bộ'));
  });
 }
 async function listLocal(uid){
  const db=await database();
  return new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).getAll();
   req.onsuccess=()=>resolve((req.result||[]).filter(r=>r.uid===uid)
      .sort((a,b)=>a.queuedAt-b.queuedAt));
   req.onerror=()=>reject(req.error||Error('Không xem được ảnh chờ đồng bộ'));
  });
 }
 function timeoutSignal(ms){
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),ms);
  return {signal:ctl.signal,clear:()=>clearTimeout(timer)};
 }
 async function send(record){
  const user=authUser();
  if(!user||user.uid!==record.uid)throw Error('Tài khoản chụp ảnh không còn đăng nhập.');
  if(root.navigator?.onLine===false)throw Error('Thiết bị ngoại tuyến.');
  const token=await user.getIdToken();
  const form=new FormData();
  form.append('eventId',record.eventId);
  form.append('image',record.image,'radio-original.jpg');
  const ctl=timeoutSignal(16000);
  let response;
  try{response=await fetch(URL,{method:'POST',headers:{Authorization:'Bearer '+token},
   body:form,signal:ctl.signal,cache:'no-store'})}finally{ctl.clear()}
  let result={};try{result=await response.json()}catch(_){}
  if(response.status===410&&result.code==='PHOTO_PURGED'){
   await removeLocal(record.eventId);purged.set(record.eventId,result);
   return {status:'PURGED'};
  }
  if(!response.ok||result.ok!==true)throw Error(
   result?.message||('Không lưu được ảnh rõ trên Supabase ('+response.status+').'));
  await removeLocal(record.eventId);
  return {status:result.status||'STORED'};
 }
 async function flush(maxCount=4){
  if(syncInFlight)return syncInFlight;
  syncInFlight=(async()=>{
   const user=authUser();
   if(!user||root.navigator?.onLine===false)return {uploaded:0,pending:0};
   const rows=await listLocal(user.uid),selected=rows.slice(0,Math.min(6,Math.max(1,maxCount)));
   let uploaded=0,failed=0,purgedCount=0;
   for(const row of selected){
    if(authUser()?.uid!==row.uid)break;
    try{const r=await send(row);if(r.status==='PURGED')purgedCount++;else uploaded++}
    catch(e){failed++;console.info('Ảnh gốc chờ đồng bộ:',String(e?.message||e).slice(0,130))}
   }
   return {uploaded,failed,purged:purgedCount,pending:Math.max(0,rows.length-uploaded-purgedCount)};
  })().finally(()=>{syncInFlight=null});
  return syncInFlight;
 }
 const viewed=new Map();
 async function read(eventId){
  if(!validId(eventId))return {status:'NO_ORIGINAL'};
  const user=authUser();if(!user||root.navigator?.onLine===false)return {status:'UNAVAILABLE'};
  const cacheKey=user.uid+'|'+eventId;
  const cached=viewed.get(cacheKey);if(cached)return {status:'STORED',data:cached};
  const token=await user.getIdToken();
  const ctl=timeoutSignal(12000);
  let response;
  try{response=await fetch(URL+'?eventId='+encodeURIComponent(eventId),
    {headers:{Authorization:'Bearer '+token},cache:'no-store',signal:ctl.signal})}
  catch(e){return {status:'UNAVAILABLE'}}
  finally{ctl.clear()}
  if(response.status===404)return {status:'NO_ORIGINAL'};
  if(response.status===410){
   let payload={};try{payload=await response.json()}catch(_){}
   purged.set(eventId,payload);return {status:'PURGED',purgedAt:payload.purgedAt||null};
  }
  if(!response.ok||!(response.headers.get('Content-Type')||'').startsWith('image/jpeg'))
   return {status:'UNAVAILABLE'};
  const blob=await response.blob();
  if(blob.size<12000||blob.size>8388608)return {status:'UNAVAILABLE'};
  const data=await new Promise((resolve,reject)=>{
   const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));
   reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);
  });
  if(!data.startsWith('data:image/jpeg;base64,'))return {status:'UNAVAILABLE'};
  viewed.set(cacheKey,data);
  if(viewed.size>4)viewed.delete(viewed.keys().next().value);
  return {status:'STORED',data};
 }
 root.SAGSRadioPhotoVaultV1={
  queue:putLocal,flush,read,isPurged:id=>purged.has(id),
  purgedAt:id=>purged.get(id)?.purgedAt||null,
  pending:async()=>{const u=authUser();return u?(await listLocal(u.uid)).length:0}
 };
 root.addEventListener?.('online',()=>{void flush().catch(()=>{})});
})(window);

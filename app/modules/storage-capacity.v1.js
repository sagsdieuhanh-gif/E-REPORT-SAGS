/* Lossless localStorage capacity recovery. Embedded with its codec BEFORE boot.
 * The original storage key and logical value never change. No flight is deleted.
 * First conversion requires the current SW to confirm this is the only app window. */
(function(root){
 'use strict';
 if(root.SAGSStorageCapacity||typeof Storage==='undefined')return;
 const proto=Storage.prototype,get=proto.getItem,set=proto.setItem;
 const MAGIC='~SAGS-LZ1~',codec=root.LZString;
 if(!codec)throw Error('Storage codec unavailable');
 const allowed=/^(?:sagsFlightSessionV1:|sagsV22LocalCheckpoint::|sagsFS09StandaloneV11:|sagsKH208SheetV1:|sagsFinalSheetDataV10:|sagsV61Uncommitted:|sagsCrosscheckV3Cache|sagsDynamicFleetCacheV1|sags_ac_limits_catalog_cache_v1|sags_aircraft_cleaning_cache_v2211|sags_v\d+_action_cache_|rampFullTestV17Data)/;
 const cache=new Map();let cachedChars=0,enabled=false,checking=null,migrating=false;
 let converted=0,savedChars=0,lastError='',clientCount=null;
 function isLocal(store){try{return store===root.localStorage}catch(_){return false}}
 function quota(e){return /QuotaExceeded|NS_ERROR_DOM_QUOTA_REACHED/i.test(String(e?.name))||/quota|storage.*exceed/i.test(String(e?.message))}
 function checksum(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16)}
 function remember(k,raw,value){
  const old=cache.get(k);if(old){cachedChars-=old.value.length;cache.delete(k)}
  if(value.length>1000000)return;
  while(cache.size>=4||cachedChars+value.length>1000000){const key=cache.keys().next().value;if(key===undefined)break;cachedChars-=cache.get(key).value.length;cache.delete(key)}
  cache.set(k,{raw,value});cachedChars+=value.length;
 }
 function unpack(raw){
  if(typeof raw!=='string'||!raw.startsWith(MAGIC))return raw;
  const a=raw.indexOf(':',MAGIC.length),b=raw.indexOf(':',a+1);
  const length=Number.parseInt(raw.slice(MAGIC.length,a),16),hash=raw.slice(a+1,b);
  if(a<0||b<0||!Number.isSafeInteger(length)||length<0||length>32000000)throw Error('SAGS_STORAGE_DAMAGED');
  const value=codec.decompressFromUTF16(raw.slice(b+1));
  if(typeof value!=='string'||value.length!==length||checksum(value)!==hash)throw Error('SAGS_STORAGE_DAMAGED');
  return value;
 }
 function pack(value){
  if(value.length<1024)return value;
  const encoded=MAGIC+value.length.toString(16)+':'+checksum(value)+':'+codec.compressToUTF16(value);
  if(encoded.length>=value.length*.9)return value;
  if(unpack(encoded)!==value)throw Error('SAGS_STORAGE_CODEC_VERIFY');
  return encoded;
 }
 proto.getItem=function(key){
  const raw=get.call(this,key);if(!isLocal(this)||!allowed.test(String(key))||typeof raw!=='string'||!raw.startsWith(MAGIC))return raw;
  const k=String(key),hit=cache.get(k);if(hit?.raw===raw)return hit.value;
  try{const value=unpack(raw);remember(k,raw,value);return value}catch(e){lastError=String(e.message);throw e}
 };
 function candidates(){
  const rows=[];for(let i=0;i<root.localStorage.length;i++){const key=root.localStorage.key(i);if(!allowed.test(key))continue;const raw=get.call(root.localStorage,key);if(raw&&raw.length>=1024&&!raw.startsWith(MAGIC))rows.push({key,size:raw.length})}
  return rows.sort((a,b)=>b.size-a.size);
 }
 function compactOne(key){
  if(!enabled)return false;
  const raw=get.call(root.localStorage,key);if(!raw||raw.startsWith(MAGIC)||!allowed.test(key))return false;
  const encoded=pack(raw);if(encoded===raw)return false;
  // No asynchronous gap between reading, verifying and replacing this exact value.
  set.call(root.localStorage,key,encoded);
  if(get.call(root.localStorage,key)!==encoded)throw Error('SAGS_STORAGE_WRITE_VERIFY');
  remember(key,encoded,raw);converted++;savedChars+=raw.length-encoded.length;return true;
 }
 proto.setItem=function(key,value){
  if(!isLocal(this))return set.call(this,key,value);
  const k=String(key),v=String(value),previous=get.call(this,k);
  // A damaged record must not be silently replaced by an empty/default envelope.
  const packedBefore=allowed.test(k)&&previous?.startsWith(MAGIC);
  const hit=cache.get(k);
  // A cache hit is the exact raw record already decoded and checksummed.
  // Another tab/corruption changes raw bytes and must still be verified.
  if(packedBefore&&hit?.raw!==previous)unpack(previous);
  const encoded=hit?.raw===previous&&hit.value===v?previous:(enabled||packedBefore)&&allowed.test(k)?pack(v):v;
  try{set.call(this,k,encoded)}catch(e){
   if(!enabled||!quota(e))throw e;
   // A shrinking overwrite is atomic and does not need a second storage copy.
   for(const row of candidates().slice(0,8)){if(row.key===k)continue;try{compactOne(row.key)}catch(_){} }
   set.call(this,k,encoded);
  }
  if(get.call(this,k)!==encoded)throw Error('SAGS_STORAGE_WRITE_VERIFY');
  if(allowed.test(k))remember(k,encoded,v);
 };
 async function compact(){
  if(!enabled||migrating)return false;migrating=true;
  try{for(const row of candidates()){compactOne(row.key);await new Promise(r=>setTimeout(r,0))}lastError='';return true}
  catch(e){lastError=String(e?.message||e);return false}finally{migrating=false}
 }
 function checkClients(){
  if(checking)return checking;
  checking=(async()=>{
   const reg=await root.navigator?.serviceWorker?.getRegistration?.();
   const controller=root.navigator?.serviceWorker?.controller||reg?.active;
   if(!controller){lastError='WAIT_FOR_SERVICE_WORKER';return false;}
   const result=await new Promise(resolve=>{
    const channel=new MessageChannel();let finished=false;
    const finish=x=>{if(finished)return;finished=true;clearTimeout(timer);channel.port1.close();resolve(x)};
    const timer=setTimeout(()=>finish(null),3000);
    channel.port1.onmessage=e=>finish(e.data);
    try{controller.postMessage({type:'SAGS_STORAGE_CLIENT_COUNT'},[channel.port2])}catch(_){finish(null)}
   });
   clientCount=result?.ok===true?Number(result.count):null;
   enabled=clientCount===1;
   if(!enabled){lastError=clientCount>1?'CLOSE_OTHER_APP_WINDOWS':'WAIT_FOR_SERVICE_WORKER';return false;}
   await compact();
   try{root.sagsV61Draft?.retryFailed?.();root.dispatchEvent(new CustomEvent('sags:storage-capacity-ready'))}catch(_){}
   return true;
  })().finally(()=>{checking=null});return checking;
 }
 root.SAGSStorageCapacity=Object.freeze({check:checkClients,compact,status:()=>({enabled,clientCount,converted,savedChars,lastError,cacheChars:cachedChars})});
 // Count all windows first; never auto-convert while another old shell may be running.
 root.navigator?.serviceWorker?.addEventListener?.('controllerchange',checkClients);
 root.addEventListener('pageshow',checkClients);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void checkClients()});
 void checkClients();
})(window);

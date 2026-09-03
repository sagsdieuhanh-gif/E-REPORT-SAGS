/* E-REPORT/SAGS V2.2.7 · SIGNATURE STORAGE RECOVERY
 * BUILD: V2.2.7-SIGNATURE-STORAGE-RECOVERY
 * Base: V2.2.6 + V2.2.5 R2 + V2.2.2 ARR/DEP
 *
 * This patch handles the remaining quota case proved on real devices:
 * canonical sagsFlightSessionV1:* itself can exceed localStorage quota.
 *
 * Fix strategy:
 * 1) All future legacy 1600x420 signature PNG outputs are transparently stored
 *    at 640x168 (same aspect ratio, transparent PNG).
 * 2) Existing 1600x420 signature PNGs inside ALL local flight sessions,
 *    checkpoints, and legacy state are migrated to the compact size.
 * 3) MY FLIGHT waits for the safe local signature migration before opening a
 *    new assignment, so old sessions can release quota first.
 * 4) Export also waits for migration, then keeps the V2.2.5 pre-export behavior.
 * 5) No unrelated localStorage keys are deleted. No signature is removed:
 *    old signatures are resized and retained.
 */
(function(root){
  'use strict';

  const BUILD='V2.2.7-SIGNATURE-STORAGE-RECOVERY';
  const TARGET_W=640;
  const TARGET_H=168; // exact same ratio as 1600x420
  const OLD_W=1600;
  const OLD_H=420;

  if(root.__SAGS_V227_SIGNATURE_STORAGE===BUILD)return;
  root.__SAGS_V227_SIGNATURE_STORAGE=BUILD;

  const S=v=>String(v??'').trim();
  const nativeToDataURL=(typeof HTMLCanvasElement!=='undefined')
    ?HTMLCanvasElement.prototype.toDataURL
    :null;

  let sourceCompacted=0;
  let migratedSignatures=0;
  let migratedKeys=0;
  let migrationErrors=0;
  let lastMigrationAtMs=0;
  let lastMigrationReason='';
  let migrationPromise=null;
  let receivePatched=false;
  let exportPatched=false;

  function isSignatureCanvas(c){
    return !!c
      &&Number(c.width)===OLD_W
      &&Number(c.height)===OLD_H;
  }

  // FUTURE SIGNATURES:
  // Both handwritten signature save and imported signature image currently
  // serialize a transparent 1600x420 PNG. Store the same visual at 640x168.
  if(nativeToDataURL){
    const wrappedToDataURL=function(type,quality){
      const mime=S(type).toLowerCase();
      if(isSignatureCanvas(this)&&(!mime||mime==='image/png')){
        try{
          const c=document.createElement('canvas');
          c.width=TARGET_W;
          c.height=TARGET_H;
          const ctx=c.getContext('2d');
          if(ctx){
            ctx.imageSmoothingEnabled=true;
            ctx.imageSmoothingQuality='high';
            ctx.clearRect(0,0,TARGET_W,TARGET_H);
            ctx.drawImage(this,0,0,OLD_W,OLD_H,0,0,TARGET_W,TARGET_H);
            const out=nativeToDataURL.call(c,'image/png');
            const original=nativeToDataURL.call(this,'image/png');
            // Only use compact copy when it is actually smaller.
            if(out&&out.length<original.length){
              sourceCompacted++;
              return out;
            }
            return original;
          }
        }catch(e){
          console.info('V2.2.7 signature source compact skipped',e?.message||e);
        }
      }
      return nativeToDataURL.call(this,type,quality);
    };
    wrappedToDataURL.__sagsV227=1;
    HTMLCanvasElement.prototype.toDataURL=wrappedToDataURL;
  }

  function pngDimensions(dataUrl){
    try{
      if(typeof dataUrl!=='string'||!dataUrl.startsWith('data:image/png;base64,'))return null;
      const b64=dataUrl.slice(dataUrl.indexOf(',')+1);
      // 32 decoded bytes are enough for PNG signature + IHDR width/height.
      const raw=atob(b64.slice(0,48));
      if(raw.length<24)return null;
      const u=i=>raw.charCodeAt(i)&255;
      if(u(0)!==137||u(1)!==80||u(2)!==78||u(3)!==71)return null;
      const width=((u(16)<<24)>>>0)+(u(17)<<16)+(u(18)<<8)+u(19);
      const height=((u(20)<<24)>>>0)+(u(21)<<16)+(u(22)<<8)+u(23);
      return {width,height};
    }catch(_){
      return null;
    }
  }

  function isOldSignatureDataUrl(v){
    const d=pngDimensions(v);
    return !!d&&d.width===OLD_W&&d.height===OLD_H;
  }

  async function resizeOldSignature(dataUrl){
    if(!isOldSignatureDataUrl(dataUrl)||!nativeToDataURL)return dataUrl;
    try{
      const img=new Image();
      img.decoding='async';
      await new Promise((resolve,reject)=>{
        img.onload=()=>resolve();
        img.onerror=()=>reject(new Error('signature image decode failed'));
        img.src=dataUrl;
      });
      const c=document.createElement('canvas');
      c.width=TARGET_W;
      c.height=TARGET_H;
      const ctx=c.getContext('2d');
      if(!ctx)return dataUrl;
      ctx.imageSmoothingEnabled=true;
      ctx.imageSmoothingQuality='high';
      ctx.clearRect(0,0,TARGET_W,TARGET_H);
      ctx.drawImage(img,0,0,OLD_W,OLD_H,0,0,TARGET_W,TARGET_H);
      const out=nativeToDataURL.call(c,'image/png');
      // Never replace with a larger representation.
      if(out&&out.length<dataUrl.length){
        migratedSignatures++;
        return out;
      }
      return dataUrl;
    }catch(e){
      migrationErrors++;
      console.info('V2.2.7 old signature resize skipped',e?.message||e);
      return dataUrl;
    }
  }

  async function compactNode(node){
    if(typeof node==='string'){
      return isOldSignatureDataUrl(node)?await resizeOldSignature(node):node;
    }
    if(Array.isArray(node)){
      let changed=false;
      const out=[];
      for(const v of node){
        const nv=await compactNode(v);
        if(nv!==v)changed=true;
        out.push(nv);
      }
      return changed?out:node;
    }
    if(node&&typeof node==='object'){
      let changed=false;
      const out={};
      for(const [k,v] of Object.entries(node)){
        const nv=await compactNode(v);
        if(nv!==v)changed=true;
        out[k]=nv;
      }
      return changed?out:node;
    }
    return node;
  }

  function relevantLocalKey(k){
    const x=S(k);
    return x.includes('sagsFlightSessionV1:')
      ||x.includes('sagsV22LocalCheckpoint::')
      ||x.includes('rampFullTestV17Data');
  }

  function physicalKeys(){
    const keys=[];
    try{
      for(let i=0;i<root.localStorage.length;i++){
        const k=root.localStorage.key(i);
        if(k&&relevantLocalKey(k))keys.push(k);
      }
    }catch(_){}
    return keys;
  }

  async function compactKey(k){
    let raw='';
    try{raw=root.localStorage.getItem(k)||''}catch(_){}
    if(!raw||!raw.includes('data:image/png;base64,'))return false;

    let obj;
    try{obj=JSON.parse(raw)}catch(_){return false;}

    const beforeCount=migratedSignatures;
    const compact=await compactNode(obj);
    if(migratedSignatures===beforeCount||compact===obj)return false;

    let next='';
    try{next=JSON.stringify(compact)}catch(_){return false;}
    if(!next||next.length>=raw.length)return false;

    try{
      // V2.2.6 storage wrapper stays active and performs its own safe duplicate
      // cleanup before canonical session writes.
      root.localStorage.setItem(k,next);
      migratedKeys++;
      return true;
    }catch(e){
      migrationErrors++;
      console.warn('V2.2.7 compact key failed',k,e);
      return false;
    }
  }

  function hasCanonicalSession(){
    try{
      for(let i=0;i<root.localStorage.length;i++){
        const k=root.localStorage.key(i);
        if(k&&k.includes('sagsFlightSessionV1:')&&(root.localStorage.getItem(k)||''))return true;
      }
    }catch(_){}
    return false;
  }

  function removeRedundantLegacyOnly(){
    // V2.2.6 already does this. Repeat narrowly here for devices that loaded
    // an old key after startup. Never remove it if no canonical session exists.
    if(!hasCanonicalSession())return;
    const keys=physicalKeys().filter(k=>k.includes('rampFullTestV17Data'));
    for(const k of keys){
      try{root.localStorage.removeItem(k)}catch(_){}
    }
  }

  async function migrateAll(reason='manual'){
    if(migrationPromise)return migrationPromise;
    migrationPromise=(async()=>{
      lastMigrationReason=reason;
      try{
        removeRedundantLegacyOnly();
        const keys=physicalKeys();
        for(const k of keys){
          await compactKey(k);
          // Yield between sessions so older phones remain responsive.
          await new Promise(r=>setTimeout(r,0));
        }
        removeRedundantLegacyOnly();
        lastMigrationAtMs=Date.now();
        return true;
      }finally{
        migrationPromise=null;
      }
    })();
    return migrationPromise;
  }

  function patchReceive(){
    const base=root.v324ReceiveOrOpen;
    if(typeof base!=='function'||base.__v227StorageRecovery)return false;
    const wrapped=async function(){
      await migrateAll('before-my-flight');
      return base.apply(this,arguments);
    };
    wrapped.__v227StorageRecovery=1;
    wrapped.__v227Base=base;
    root.v324ReceiveOrOpen=wrapped;
    try{v324ReceiveOrOpen=wrapped}catch(_){}
    receivePatched=true;
    return true;
  }

  function patchExport(){
    const base=root.openExportChoiceMenu;
    if(typeof base!=='function'||base.__v227StorageRecovery)return false;
    const wrapped=async function(){
      await migrateAll('before-export');
      return base.apply(this,arguments);
    };
    wrapped.__v227StorageRecovery=1;
    wrapped.__v227Base=base;
    root.openExportChoiceMenu=wrapped;
    try{openExportChoiceMenu=wrapped}catch(_){}
    exportPatched=true;
    return true;
  }

  function install(){
    patchReceive();
    patchExport();
  }

  // Startup recovery for devices already carrying large historical signatures.
  setTimeout(()=>{void migrateAll('startup')},180);
  install();
  setTimeout(install,300);
  setTimeout(install,900);
  setTimeout(install,1800);
  setTimeout(install,3200);
  window.addEventListener('pageshow',()=>{
    setTimeout(install,60);
    setTimeout(()=>{void migrateAll('pageshow')},120);
  },{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden){
      setTimeout(install,60);
      setTimeout(()=>{void migrateAll('resume')},120);
    }
  },{passive:true});

  root.sagsV227StorageRecovery=()=>migrateAll('manual');

  root.sagsV227StorageDiagnostics=async function(){
    let canonicalCount=0,canonicalChars=0,checkpointCount=0,checkpointChars=0,oldSignatureCount=0;
    try{
      for(const k of physicalKeys()){
        const raw=root.localStorage.getItem(k)||'';
        if(k.includes('sagsFlightSessionV1:')){canonicalCount++;canonicalChars+=raw.length}
        if(k.includes('sagsV22LocalCheckpoint::')){checkpointCount++;checkpointChars+=raw.length}
        if(raw.includes('data:image/png;base64,')){
          try{
            const obj=JSON.parse(raw);
            const walk=x=>{
              if(typeof x==='string'){if(isOldSignatureDataUrl(x))oldSignatureCount++;return}
              if(Array.isArray(x)){x.forEach(walk);return}
              if(x&&typeof x==='object')Object.values(x).forEach(walk);
            };
            walk(obj);
          }catch(_){}
        }
      }
    }catch(_){}

    let estimate=null;
    try{
      if(navigator.storage?.estimate)estimate=await navigator.storage.estimate();
    }catch(_){}

    return {
      build:BUILD,
      signatureStoredSize:`${TARGET_W}x${TARGET_H}`,
      canonicalCount,canonicalChars,
      checkpointCount,checkpointChars,
      oldSignatureCount,
      sourceCompacted,migratedSignatures,migratedKeys,migrationErrors,
      lastMigrationAtMs,lastMigrationReason,
      receivePatched,exportPatched,
      storageEstimate:estimate,
      v226:typeof root.sagsV226StorageDiagnostics==='function'
        ?root.sagsV226StorageDiagnostics()
        :null
    };
  };
})(typeof window!=='undefined'?window:globalThis);

/* Bound Firebase reads while opening a flight. Never bypass claims or storage guards. */
(function(root){
 'use strict';
 if(root.SAGSRosterOpenGuard)return;
 const READ_MS=12000;
 let active=null,sequence=0,receiveInstalled=false;
 function notice(text){
  let el=document.getElementById('sagsRosterOpenStatus');
  if(!el&&document.body){
   el=document.createElement('div');el.id='sagsRosterOpenStatus';
   el.setAttribute('role','status');el.setAttribute('aria-live','polite');
   el.style.cssText='position:fixed;bottom:90px;left:12px;right:12px;z-index:2147483646;padding:12px;border:2px solid #26d6df;border-radius:10px;background:#072332;color:#fff;font:700 14px/1.4 Arial;pointer-events:none';
   document.body.appendChild(el);
  }
  if(el){el.textContent=text||'';el.hidden=!text;}
 }
 function fail(ctx,error){
  if(!ctx.error)ctx.error=error;
  return ctx.error;
 }
 function boundedRead(ref,args,ctx){
  if(ctx.error)return Promise.reject(ctx.error);
  // The opening flow uses promise-based once('value'). Callback-based listeners
  // retain the SDK contract and are not modified by this adapter.
  if(args.length>1)return ref.once(...args);
  ctx.phase='ĐANG TẢI DỮ LIỆU CHUYẾN';notice(ctx.phase+'…');
  return new Promise((resolve,reject)=>{
   let settled=false,detach=()=>{};
   const finish=(error,value)=>{
    if(settled)return;settled=true;clearTimeout(timer);detach();
    if(error)reject(fail(ctx,error));else resolve(value);
   };
   const timer=setTimeout(()=>{
    const error=new Error('Firebase chưa trả dữ liệu chuyến sau 12 giây. Kiểm tra kết nối rồi bấm mở lại. Dữ liệu trên máy được giữ nguyên.');
    error.code='SAGS_ROSTER_READ_TIMEOUT';finish(error);
   },READ_MS);
   try{
    if(typeof ref.on==='function'&&typeof ref.off==='function'){
     const success=value=>finish(null,value),failure=error=>finish(error);
     detach=()=>{try{ref.off(args[0],success)}catch(_){}};
     ref.on(args[0],success,failure);
    }else Promise.resolve(ref.once(...args)).then(value=>finish(null,value),error=>finish(error));
   }
   catch(error){finish(error);}
  });
 }
 const queryMethods=new Set(['child','orderByChild','orderByKey','orderByValue','orderByPriority','startAt','startAfter','endAt','endBefore','equalTo','limitToFirst','limitToLast']);
 const writes=new Set(['set','update','remove','push','transaction']);
 function wrapRef(ref){
  if(!ref||typeof ref!=='object')return ref;
  return new Proxy(ref,{get(target,key){
   const value=Reflect.get(target,key,target);
   if(typeof value!=='function')return value;
   if(key==='once')return (...args)=>active?boundedRead(target,args,active):value.apply(target,args);
   if(queryMethods.has(key))return (...args)=>wrapRef(value.apply(target,args));
   if(writes.has(key))return (...args)=>{
    // Some legacy readers catch errors and return {}. A failed read MUST NOT
    // become permission to claim/reopen or overwrite a flight with empty data.
    if(active?.error)throw active.error;
    if(active){active.phase='ĐANG CHỜ FIREBASE XÁC NHẬN';notice(active.phase+'…');}
    return value.apply(target,args);
   };
   return value.bind(target);
  }});
 }
 function install(){
  const ref=root.sagsV470Ref;
  if(typeof ref==='function'&&!ref.__sagsOpenGuard){
   const wrapped=function(){return wrapRef(ref.apply(this,arguments));};
   Object.assign(wrapped,ref);wrapped.__sagsOpenGuard=true;root.sagsV470Ref=wrapped;
  }
  const base=root.v324ReceiveOrOpen;
  if(receiveInstalled||typeof base!=='function'||base.__sagsOpenGuard)return;
  const wrapped=function(){
   if(active){notice(active.phase+'… YÊU CẦU TRƯỚC VẪN ĐANG XỬ LÝ.');return active.promise;}
   const ctx={id:++sequence,error:null,phase:'ĐANG MỞ CHUYẾN',promise:null};active=ctx;
   notice(ctx.phase+'…');
   // Await confirmed writes; do not time them out and let a late write surprise
   // a retry. Long writes remain visibly pending and duplicate clicks are joined.
   const slow=setTimeout(()=>{if(active===ctx)notice(ctx.phase+'… KẾT NỐI CHẬM, CHƯA NHẬN XÁC NHẬN. KHÔNG XÓA DỮ LIỆU TRÌNH DUYỆT.');},15000);
   ctx.promise=Promise.resolve().then(()=>base.apply(this,arguments)).catch(error=>{
    fail(ctx,error);alert('KHÔNG MỞ ĐƯỢC CHUYẾN: '+String(error?.message||error));return false;
   }).finally(()=>{clearTimeout(slow);if(active===ctx){active=null;notice('');}});
   return ctx.promise;
  };
  Object.assign(wrapped,base);wrapped.__sagsOpenGuard=true;wrapped.__sagsOriginal=base;
  root.v324ReceiveOrOpen=wrapped;receiveInstalled=true;
 }
 root.SAGSRosterOpenGuard={install,status:()=>({pending:!!active,phase:active?.phase||'',errorCode:active?.error?.code||''})};
 // Install after existing roster/DEP wrappers, without replacing their behavior.
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
 setTimeout(install,1800);
})(window);

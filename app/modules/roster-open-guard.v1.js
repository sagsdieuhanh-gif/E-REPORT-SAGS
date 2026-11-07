/* Bound Firebase reads while opening a flight. Never bypass claims or storage guards. */
(function(root){
 'use strict';
 if(root.SAGSRosterOpenGuard)return;
 const READ_MS=12000,RADIOS='sags_radio_devices_v1';
 function gateError(code,message,cause){
  const e=new Error(message);e.code=code;if(cause)e.cause=cause;return e;
 }
 async function requireRadio(){
  // Never grant access from the listener cache, localStorage, IndexedDB or an
  // offline snapshot. Flight claim remains untouched until Firestore confirms.
  if(root.navigator?.onLine===false)throw gateError('SAGS_RADIO_UNVERIFIED','Đang mất mạng. Không thể kiểm tra ký nhận bộ đàm trên Firebase; dữ liệu report đã lưu vẫn được giữ nguyên.');
  const uid=root.firebase?.auth?.()?.currentUser?.uid;
  if(!uid)throw gateError('SAGS_RADIO_UNVERIFIED','Chưa xác minh tài khoản Firebase. Đăng nhập lại rồi kiểm tra bộ đàm trước khi mở chuyến.');
  const db=root.firebase?.firestore?.();
  if(!db)throw gateError('SAGS_RADIO_UNVERIFIED','Chưa kết nối Firestore để kiểm tra bộ đàm. Không thể mở report.');
  let snapshot;
  try{
   snapshot=await db.collection(RADIOS).where('holderUid','==',uid).get({source:'server'});
  }catch(e){throw gateError('SAGS_RADIO_UNVERIFIED','Không xác minh được bộ đàm với Firebase. Kiểm tra kết nối rồi thử mở chuyến lại.',e)}
  if(snapshot?.metadata?.fromCache||!Array.isArray(snapshot?.docs))throw gateError('SAGS_RADIO_UNVERIFIED','Dữ liệu bộ đàm chưa được Firebase xác nhận trực tuyến; chưa thể mở chuyến.');
  if(root.firebase?.auth?.()?.currentUser?.uid!==uid)throw gateError('SAGS_RADIO_UNVERIFIED','Tài khoản đăng nhập đã thay đổi. Vui lòng mở lại công việc.');
  const held=snapshot.docs.filter(doc=>doc?.data?.()?.status==='OUT'&&doc.data().holderUid===uid);
  if(!held.length)throw gateError('SAGS_RADIO_REQUIRED','BẮT BUỘC KÝ NHẬN BỘ ĐÀM: Bạn chưa có bộ đàm đang giữ trên Firebase. Hãy chụp ảnh, ký nhận và lưu thành công trước khi mở chuyến làm report.');
  if(held.length!==1)throw gateError('SAGS_RADIO_MULTIPLE','Tài khoản đang ghi nhận giữ nhiều hơn một bộ đàm. Vui lòng liên hệ AD đối soát và trả máy thừa trước khi làm report.');
  return {uid,deviceCode:held[0].id};
 }
 function showRadioBlocked(error){
  const msg=String(error?.message||'Bạn cần ký nhận bộ đàm trước khi mở report.');
  const canSign=error?.code==='SAGS_RADIO_REQUIRED';
  if(!document.body||typeof document.createElement!=='function'){root.alert?.(msg);return}
  let node=document.getElementById('sagsRadioRequiredDialog');
  if(!node){
   node=document.createElement('div');node.id='sagsRadioRequiredDialog';
   node.style.cssText='position:fixed;inset:0;z-index:2147483646;background:rgba(1,16,26,.76);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box';
   node.innerHTML='<div role="alertdialog" aria-modal="true" aria-labelledby="sagsRadioRequiredTitle" style="width:min(100%,420px);padding:22px 18px;border:1px solid #4f9ead;border-radius:16px;background:#082b40;color:#f1fbff;font:14px/1.5 system-ui,-apple-system,sans-serif;box-shadow:0 24px 80px #001e31"><strong id="sagsRadioRequiredTitle" style="font-size:18px;display:block;margin-bottom:10px">📻 Yêu cầu ký nhận bộ đàm</strong><p id="sagsRadioRequiredText" style="margin:0 0 18px;white-space:pre-line"></p><div style="display:flex;gap:9px;flex-wrap:wrap"><button data-radio-required-open type="button" style="flex:1;min-height:44px;border:0;border-radius:9px;background:#70dfd5;color:#073044;font-weight:800">Ký nhận bộ đàm</button><button data-radio-required-close type="button" style="flex:1;min-height:44px;border:1px solid #688da0;border-radius:9px;background:#143c52;color:#fff;font-weight:700">Đóng</button></div><small style="display:block;margin-top:12px;color:#b8d4df">Sau khi lưu ký nhận thành công, quay lại My Flight và mở chuyến. Không xóa hoặc làm mới dữ liệu report đang nhập.</small></div>';
   document.body.appendChild(node);
   node.querySelector('[data-radio-required-close]')?.addEventListener('click',()=>{node.style.display='none'});
   node.querySelector('[data-radio-required-open]')?.addEventListener('click',()=>{
    node.style.display='none';
    if(typeof root.SAGSAviationOpenRadio==='function')root.SAGSAviationOpenRadio();
    else if(typeof root.SAGSRadioCustodyV1?.open==='function')root.SAGSRadioCustodyV1.open();
    else root.alert?.('Vào menu Ký nhận bộ đàm, ký và lưu thành công trước khi mở chuyến.');
   });
  }
  const p=node.querySelector?.('#sagsRadioRequiredText');if(p)p.textContent=msg;
  const button=node.querySelector?.('[data-radio-required-open]');if(button)button.hidden=!canSign;
  node.style.display='flex';
 }

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
 function installTakeover(){
  // Legacy NHẬN THAY writes SKIPPED/claim metadata before it calls ReceiveOrOpen.
  // It must pass the same Firebase check before any handover side effects.
  const previous=root.v324TakeoverWaiting;
  if(typeof previous!=='function'||previous.__sagsRadioGate)return;
  const wrapped=async function(){
   try{await requireRadio()}catch(e){
    if(String(e?.code||'').startsWith('SAGS_RADIO_'))showRadioBlocked(e);
    else root.alert?.('Không xác minh được bộ đàm: '+String(e?.message||e));
    return false;
   }
   return previous.apply(this,arguments);
  };
  wrapped.__sagsRadioGate=true;wrapped.__sagsOriginal=previous;
  root.v324TakeoverWaiting=wrapped;
 }
 function install(){
  installTakeover();
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
   ctx.promise=Promise.resolve().then(async()=>{
    ctx.phase='ĐANG KIỂM TRA KÝ NHẬN BỘ ĐÀM';notice(ctx.phase+'…');
    await requireRadio();
    ctx.phase='ĐANG MỞ CHUYẾN';notice(ctx.phase+'…');
    return base.apply(this,arguments);
   }).catch(error=>{
    fail(ctx,error);
    if(String(error?.code||'').startsWith('SAGS_RADIO_'))showRadioBlocked(error);
    else root.alert?.('KHÔNG MỞ ĐƯỢC CHUYẾN: '+String(error?.message||error));
    return false;
   }).finally(()=>{clearTimeout(slow);if(active===ctx){active=null;notice('');}});
   return ctx.promise;
  };
  Object.assign(wrapped,base);wrapped.__sagsOpenGuard=true;wrapped.__sagsOriginal=base;
  root.v324ReceiveOrOpen=wrapped;receiveInstalled=true;
 }
 root.SAGSRosterOpenGuard={install,requireRadio,showRadioBlocked,status:()=>({pending:!!active,phase:active?.phase||'',errorCode:active?.error?.code||''})};
 // Install after existing roster/DEP wrappers, without replacing their behavior.
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
 setTimeout(install,1800);
})(window);

/* Signed radio work preflight; lazy-loaded only on report entry. */
(function(root){
'use strict';
if(root.SAGSRadioWorkGate)return;
const RADIOS='sags_radio_devices_v1';
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


root.SAGSRadioWorkGate=Object.freeze({requireRadio,showRadioBlocked});
})(window);

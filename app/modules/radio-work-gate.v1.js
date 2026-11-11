/* Signed radio work preflight; lazy-loaded only on report entry. */
(function(root){
'use strict';
if(root.SAGSRadioWorkGate)return;
const RADIOS='sags_radio_devices_v1';
 const VN_ZONE='Asia/Ho_Chi_Minh';
 const WORKDAY_CUTOFF_HOUR=4;
 function radioWorkdayKey(ms){
  if(!Number.isFinite(ms)||ms<=0)throw gateError('SAGS_RADIO_UNVERIFIED','Thiếu thời điểm ký nhận bộ đàm đã xác minh; liên hệ AD để đối soát.');
  const entries=new Intl.DateTimeFormat('en-GB',{
   timeZone:VN_ZONE,year:'numeric',month:'2-digit',day:'2-digit',
   hour:'2-digit',hourCycle:'h23'
  }).formatToParts(new Date(ms));
  const part=key=>Number(entries.find(e=>e.type===key)?.value);
  const year=part('year'),month=part('month'),day=part('day'),hour=part('hour');
  if(!year||!month||!day||!Number.isFinite(hour))throw gateError('SAGS_RADIO_UNVERIFIED','Không xác định được ngày làm việc Việt Nam.');
  // A late evening shift crossing midnight is still one workday until 04:00 VN.
  return new Date(Date.UTC(year,month-1,day-(hour<WORKDAY_CUTOFF_HOUR?1:0))).toISOString().slice(0,10);
 }
 function radioTimestampMs(v){
  if(v&&typeof v.toMillis==='function')return Number(v.toMillis());
  if(v&&Number.isFinite(v.seconds))return v.seconds*1000;
  return NaN;
 }
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
  const device=held[0],details=device.data(),receivedMs=radioTimestampMs(details?.updatedAt);
  const now=Date.now();
  if(!Number.isFinite(receivedMs)||receivedMs>now+5*60000)
   throw gateError('SAGS_RADIO_UNVERIFIED','Không xác minh được giờ nhận bộ đàm trên Firebase. Liên hệ AD kiểm tra lịch sử nhận/trả; không mở report.');
  const issuedDay=radioWorkdayKey(receivedMs),currentDay=radioWorkdayKey(now);
  if(issuedDay<currentDay)
   throw gateError('SAGS_RADIO_OVERDUE','CHƯA TRẢ BỘ ĐÀM CA TRƯỚC: Tài khoản còn giữ '+device.id+' từ ngày làm việc '+issuedDay+'. Bạn bị chặn nhận/mở chuyến mới. Hãy vào Ký nhận bộ đàm để CHỤP ẢNH, KÝ TRẢ và lưu lên Firebase; sau đó ký nhận máy cho ca mới. Ca tối qua 0 giờ chỉ tính sang ngày mới sau 04:00 (giờ Việt Nam).');
  return {uid,deviceCode:device.id,issuedDay,workday:currentDay};
 }
 function showRadioBlocked(error){
  const msg=String(error?.message||'Bạn cần ký nhận bộ đàm trước khi mở report.');
  const canSign=['SAGS_RADIO_REQUIRED','SAGS_RADIO_OVERDUE'].includes(error?.code);
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
  const title=node.querySelector?.('#sagsRadioRequiredTitle');
  if(title)title.textContent=error?.code==='SAGS_RADIO_OVERDUE'?'📻 Chưa trả bộ đàm ca trước':'📻 Yêu cầu ký nhận bộ đàm';
  const p=node.querySelector?.('#sagsRadioRequiredText');if(p)p.textContent=msg;
  const button=node.querySelector?.('[data-radio-required-open]');if(button){button.hidden=!canSign;button.textContent=error?.code==='SAGS_RADIO_OVERDUE'?'Trả bộ đàm ca trước':'Ký nhận bộ đàm';}
  node.style.display='flex';
 }


root.SAGSRadioWorkGate=Object.freeze({requireRadio,showRadioBlocked});
})(window);

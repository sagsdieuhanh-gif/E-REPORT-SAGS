/* E-REPORT-SAGS V1.2: operator-facing, large non-repeating draft recovery alerts.
 * Never infer cloud success from navigator.onLine; core emits 'synced' only
 * after strict IndexedDB pending verification following Firebase transactions.
 */
(function(root){
  'use strict';
  if(root.__SAGS_DRAFT_SYNC_POPUP_V1__)return;
  root.__SAGS_DRAFT_SYNC_POPUP_V1__=true;
  const ID='sagsDraftSyncPopup';
  const $=id=>document.getElementById(id);
  const MESSAGES={
    offline:{
      icon:'📡',tone:'warning',title:'MẤT KẾT NỐI INTERNET',
      lead:'Chưa thể xác nhận lưu lên máy chủ.',
      body:'Bạn có thể tiếp tục nhập biểu mẫu đã mở. Hệ thống sẽ lưu nháp trên thiết bị nếu bộ nhớ còn hoạt động, rồi tự đồng bộ khi có mạng.',
      action:'ĐÃ HIỂU · TIẾP TỤC NHẬP'
    },
    'local-saved':{
      icon:'💾',tone:'warning',title:'ĐÃ LƯU NHÁP TRÊN THIẾT BỊ',
      lead:'IndexedDB đã xác nhận bản nháp trên máy.',
      body:'Internet chưa kết nối. Dữ liệu này chưa được xác nhận trên Firebase. Không xóa dữ liệu trình duyệt hoặc gỡ ứng dụng.',
      action:'TIẾP TỤC NHẬP'
    },
    reconnecting:{
      icon:'🔄',tone:'info',title:'ĐÃ CÓ INTERNET TRỞ LẠI',
      lead:'Đang kiểm tra các bản nháp chờ đồng bộ…',
      body:'E-REPORT tự khôi phục và đối chiếu dữ liệu. Không cần mở Cài đặt hoặc bấm Đồng bộ ngay.',
      action:'TIẾP TỤC LÀM VIỆC'
    },
    syncing:{
      icon:'☁️',tone:'info',title:'ĐANG TỰ ĐỒNG BỘ FIREBASE',
      lead:'Hệ thống đang gửi các bản nháp chưa đồng bộ.',
      body:'Hãy giữ ứng dụng mở khi có thể. Chưa được coi là đã lưu trên máy chủ cho đến khi nhận xác nhận.',
      action:'TIẾP TỤC LÀM VIỆC'
    },
    synced:{
      icon:'✅',tone:'success',title:'ĐỒNG BỘ THÀNH CÔNG',
      lead:'Máy chủ đã xử lý các bản nháp đang chờ.',
      body:'Hàng đợi lưu nháp được kiểm tra và không còn mục chờ. Đây là xác nhận đồng bộ nháp, không phải xác nhận Hoàn tất, Ký hoặc Gửi biểu mẫu.',
      action:'ĐÃ HIỂU'
    },
    connected:{
      icon:'✅',tone:'success',title:'ĐÃ KẾT NỐI INTERNET',
      lead:'Không có bản nháp chờ đồng bộ trong hàng đợi.',
      body:'Bạn có thể tiếp tục công việc. Trạng thái này không đồng nghĩa biểu mẫu đã được Hoàn tất hoặc ký xác nhận.',
      action:'ĐÃ HIỂU'
    },
    failed:{
      icon:'⚠️',tone:'danger',title:'CHƯA THỂ ĐỒNG BỘ FIREBASE',
      lead:'Máy chủ chưa xác nhận toàn bộ dữ liệu chờ đồng bộ.',
      body:'Hệ thống giữ các bản nháp trên thiết bị và sẽ thử lại khi có điều kiện. Không xóa dữ liệu trình duyệt, không đăng xuất để khắc phục lỗi.',
      action:'ĐÃ HIỂU · GIỮ BẢN NHÁP'
    },
    'local-failed':{
      icon:'🚨',tone:'danger',title:'KHÔNG XÁC NHẬN ĐƯỢC BẢN LƯU TRÊN MÁY',
      lead:'IndexedDB chưa lưu thành công bản nháp dự phòng.',
      body:'Giữ nguyên màn hình và thông báo quản trị. Không xóa cache dữ liệu, không gỡ ứng dụng. Kiểm tra lại trạng thái lưu trước khi rời trang.',
      action:'ĐÃ HIỂU'
    }
  };
  let lastPhase='',lastScope='',lastShown=0,closeTimer=0;
  function ensure(){
    let modal=$(ID);if(modal)return modal;
    if(!document.body)return null;
    const style=document.createElement('style');
    style.id='sagsDraftSyncPopupStyle';
    style.textContent=`
#sagsDraftSyncPopup{position:fixed!important;inset:0!important;z-index:2147482200!important;display:flex!important;align-items:center!important;justify-content:center!important;box-sizing:border-box!important;padding:max(14px,env(safe-area-inset-top)) 14px max(14px,env(safe-area-inset-bottom))!important;background:rgba(3,16,29,.75)!important;backdrop-filter:blur(4px);font-family:Arial,sans-serif!important;overscroll-behavior:contain}
#sagsDraftSyncPopup[hidden]{display:none!important}
#sagsDraftSyncPopup .sds-panel{box-sizing:border-box!important;width:min(100%,540px)!important;max-height:min(88dvh,640px)!important;overflow:auto!important;background:#fff!important;color:#16324c!important;border:1px solid #bad0df!important;border-radius:20px!important;box-shadow:0 24px 75px rgba(0,0,0,.44)!important;padding:0!important}
#sagsDraftSyncPopup .sds-head{display:flex!important;align-items:center!important;gap:15px!important;padding:22px 24px 17px!important;background:#143651!important;color:#fff!important}
#sagsDraftSyncPopup .sds-icon{display:grid!important;place-items:center!important;flex:0 0 60px!important;width:60px!important;height:60px!important;border-radius:17px!important;background:rgba(255,255,255,.14)!important;font-size:33px!important;line-height:1!important}
#sagsDraftSyncPopup .sds-kicker{display:block!important;color:#b5d0e3!important;font-size:12px!important;letter-spacing:1.4px!important;font-weight:900!important;margin-bottom:6px!important}
#sagsDraftSyncPopup .sds-title{font:900 clamp(19px,3.8vw,24px)/1.22 Arial,sans-serif!important;color:#fff!important;-webkit-text-fill-color:#fff!important;margin:0!important;overflow-wrap:anywhere!important}
#sagsDraftSyncPopup .sds-body{padding:23px 25px 18px!important}
#sagsDraftSyncPopup .sds-lead{font:900 clamp(16px,3.4vw,19px)/1.4 Arial,sans-serif!important;color:#16324c!important;-webkit-text-fill-color:#16324c!important;margin:0 0 12px!important}
#sagsDraftSyncPopup .sds-detail{font:500 15px/1.6 Arial,sans-serif!important;color:#40586d!important;-webkit-text-fill-color:#40586d!important;margin:0!important}
#sagsDraftSyncPopup .sds-foot{display:flex!important;flex-wrap:wrap!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;border-top:1px solid #e1e9f0!important;padding:17px 24px 21px!important}
#sagsDraftSyncPopup .sds-note{font:700 12px/1.4 Arial,sans-serif!important;color:#6b7e8b!important;-webkit-text-fill-color:#6b7e8b!important}
#sagsDraftSyncPopup .sds-close{cursor:pointer!important;min-height:46px!important;max-width:100%!important;border:0!important;border-radius:11px!important;padding:12px 19px!important;background:#16639a!important;color:#fff!important;-webkit-text-fill-color:#fff!important;font:900 13px/1.3 Arial,sans-serif!important;white-space:normal!important}
#sagsDraftSyncPopup[data-tone="warning"] .sds-head{background:#865100!important}
#sagsDraftSyncPopup[data-tone="danger"] .sds-head{background:#922d29!important}
#sagsDraftSyncPopup[data-tone="success"] .sds-head{background:#136448!important}
#sagsDraftSyncPopup[data-tone="warning"] .sds-close{background:#865100!important}
#sagsDraftSyncPopup[data-tone="danger"] .sds-close{background:#922d29!important}
#sagsDraftSyncPopup[data-tone="success"] .sds-close{background:#136448!important}
@media(max-width:520px){#sagsDraftSyncPopup{padding:10px!important}#sagsDraftSyncPopup .sds-head{padding:19px 17px 15px!important;gap:11px!important}#sagsDraftSyncPopup .sds-icon{width:50px!important;height:50px!important;flex-basis:50px!important;font-size:28px!important}#sagsDraftSyncPopup .sds-body{padding:20px 18px!important}#sagsDraftSyncPopup .sds-foot{padding:14px 18px 18px!important}#sagsDraftSyncPopup .sds-close{width:100%!important}}
`;
    document.head.appendChild(style);
    modal=document.createElement('div');
    modal.id=ID;modal.hidden=true;
    modal.setAttribute('role','alertdialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-labelledby','sdsTitle');
    modal.setAttribute('aria-describedby','sdsDetail');
    modal.innerHTML='<section class="sds-panel"><header class="sds-head"><span class="sds-icon" id="sdsIcon" aria-hidden="true">📡</span><div><small class="sds-kicker">E-REPORT · AN TOÀN DỮ LIỆU</small><h2 id="sdsTitle" class="sds-title"></h2></div></header><div class="sds-body"><p id="sdsLead" class="sds-lead"></p><p id="sdsDetail" class="sds-detail"></p></div><footer class="sds-foot"><small class="sds-note">Dữ liệu nháp khác với xác nhận hoàn tất chuyến</small><button id="sdsClose" class="sds-close" type="button"></button></footer></section>';
    document.body.appendChild(modal);
    $('sdsClose').addEventListener('click',close);
    modal.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close()}});
    return modal;
  }
  function close(){
    clearTimeout(closeTimer);closeTimer=0;
    const modal=$(ID);if(modal)modal.hidden=true;
  }
  function show(phase,detail={}){
    const spec=MESSAGES[phase],scope=String(detail.scope||'');
    if(!spec||!scope)return false;
    // No per-keystroke popups: local protection silently updates an existing
    // offline alert, and repeat failures or duplicate network events are deduped.
    const modal=ensure();if(!modal)return false;
    if(phase==='local-saved'&&(modal.hidden||modal.dataset.phase!=='offline'))return false;
    const now=Date.now();
    if(phase===lastPhase&&scope===lastScope&&now-lastShown<4000)return false;
    lastPhase=phase;lastScope=scope;lastShown=now;
    clearTimeout(closeTimer);closeTimer=0;
    modal.dataset.tone=spec.tone;modal.dataset.phase=phase;
    $('sdsIcon').textContent=spec.icon;
    $('sdsTitle').textContent=spec.title;
    $('sdsLead').textContent=spec.lead;
    $('sdsDetail').textContent=spec.body;
    $('sdsClose').textContent=spec.action;
    modal.hidden=false;
    // Keep critical failure and offline notices visible until acknowledged.
    // Only noncritical successful completion closes automatically.
    if(phase==='synced'||phase==='connected')closeTimer=setTimeout(close,6500);
    return true;
  }
  root.addEventListener?.('sags:draft-sync-notice',e=>{
    if(document.hidden)return;
    const detail=e?.detail||{};
    show(String(detail.phase||''),detail);
  });
  root.SAGSDraftSyncPopup={show,close};
})(typeof window!=='undefined'?window:globalThis);

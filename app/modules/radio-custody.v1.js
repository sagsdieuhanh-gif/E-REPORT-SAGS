/* E-REPORT SAGS – radio custody (standalone feature, Firebase Firestore).
   Requires Firebase Firestore production rules to be deployed before enabling real signing.
   All custody writes are atomic and server-timestamped. NO local success simulation. */
(function(root){
'use strict';
if(root.SAGSRadioCustodyV1)return;
const COLLECTION='sags_radio_devices_v1',EVENTS='sags_radio_events_v1',PROOFS='sags_radio_proofs_v22';
// Firestore limit is 1 MiB per document; retain headroom for metadata.
const HIGH_PROOF_LIMIT=700000,COMPAT_PROOF_LIMIT=235000,proofCache=new Map();
const INIT=['DH01','DH02','DH03','DH04','DH05','DH06','DH07','DH08','DH09','DH10','DH11','TBDH02'];
const REASONS=[
 ['BATTERY_EMPTY','Hết pin'],['BATTERY_WEAK','Pin yếu, tụt nhanh'],['WEAK_SIGNAL','Sóng yếu / mất sóng'],
 ['INTERMITTENT','Chập chờn, tự tắt/bật'],['AUDIO','Loa rè / âm thanh nhỏ'],
 ['MIC','Micro không phát tiếng'],['PTT','Nút bấm PTT bị lỗi'],
 ['CHARGING','Không sạc được'],['DAMAGED','Hư hỏng thân máy / rơi vỡ'],
 ['LOST','Thất lạc'],['OTHER','Lý do khác (ghi cụ thể)']
];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=id=>document.getElementById(id),S=x=>String(x??'').trim();
const label=code=>code?.startsWith('TBDH')?'TBĐH '+code.slice(4):'ĐH '+S(code).replace(/^DH/,'');
const VN='Asia/Ho_Chi_Minh',fmt=d=>new Intl.DateTimeFormat('vi-VN',{timeZone:VN,dateStyle:'short',timeStyle:'short'}).format(d);
const REASON_TEXT=Object.fromEntries(REASONS);
const RETURN_REASONS=Object.freeze({
 END_SHIFT:'Hết ca',
 HANDOVER:'Bàn giao ca tiếp theo',
 STOP_USE:'Không tiếp tục sử dụng',
 OTHER:'Lý do khác'
});
// Advisory shift in Vietnam time: AM 08:30–19:00; PM 19:01–08:29 next day.
const STATUSES={READY:'Sẵn sàng',OUT:'Đang sử dụng',CHARGING:'Đang sạc / có cảnh báo (vẫn được nhận)',FAULT:'Đã ghi nhận lỗi (vẫn được nhận)',LOST:'Thất lạc'};
const radioIssueable=d=>!!d&&['READY','CHARGING','FAULT'].includes(d.status)&&!d.holderUid&&d.faultCode!=='LOST';
const hasRadioWarning=d=>!!d.faultCode||['CHARGING','FAULT','LOST'].includes(d.status);
// Battery is no longer collected at signing. Preserve the most recently
// recorded value or the explicit fault code; UNKNOWN on never-checked legacy
// devices is normalized to the schema-compatible GOOD on issue/return only.
// This is a compatibility fallback, not a claim that staff measured the battery.
function radioBatteryForWrite(device){
 if(device?.faultCode==='BATTERY_EMPTY')return 'EMPTY';
 if(device?.faultCode==='BATTERY_WEAK')return 'LOW';
 const previous=S(device?.battery);
 return ['FULL','GOOD','LOW','EMPTY'].includes(previous)?previous:'GOOD';
}
function radioBatteryForFaultReport(device,reason){
 if(reason==='BATTERY_EMPTY')return 'EMPTY';
 if(reason==='BATTERY_WEAK')return 'LOW';
 return device?.battery||'UNKNOWN';
}

const radioHeldSince=d=>d.heldSince||d.updatedAt;
const ACTS={INIT:'Khởi tạo',ISSUE:'Nhận máy',RETURN:'Trả máy',REPORT:'Báo sự cố',SWAP_OUT:'Đổi – trả máy cũ',SWAP_IN:'Đổi – nhận máy mới',RELEASE:'Đã xử lý thông tin lỗi'};
let unsubs=[],devices=[],events=[],busy=false,connected=false,choice=null,mode='ISSUE',canvasDirty=false,strokes=[],drawing=false,dateFilter='all';
// Staff see only available radios, or exactly the devices they currently hold.
// Full inventory remains an explicit admin-only view, never the default signing list.
let adminAllDevices=false,radioOnlyUnreturned=false,radioLiveClock=null;
let cameraStream=null,cameraToken=0,cameraLeg='old',photos={old:null,new:null},historyStop=null,historyVerified=false;
const radioScriptUrl=document.currentScript?.src;
// Supabase original-photo helper is lazy: no extra download on the main menu.
let radioVaultLoading=null;
function loadRadioPhotoVault(){
 if(root.SAGSRadioPhotoVaultV1)return Promise.resolve(root.SAGSRadioPhotoVaultV1);
 if(!radioVaultLoading)radioVaultLoading=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  const url=new URL('./radio-photo-vault.v1.js',radioScriptUrl||root.location.href);
  url.searchParams.set('v','20261122-ORIGINAL-32');
  script.src=url.toString();script.async=true;
  // Never strand a successful Firebase custody transaction waiting forever
  // for an optional Supabase script on weak iPhone connectivity.
  const timer=setTimeout(()=>reject(Error('Kho ảnh rõ tải chậm; Firebase vẫn đã ký nhận')),8000);
  script.onload=()=>{clearTimeout(timer);root.SAGSRadioPhotoVaultV1?resolve(root.SAGSRadioPhotoVaultV1):reject(Error('Kho ảnh Supabase chưa được khởi tạo'))};
  script.onerror=()=>{clearTimeout(timer);reject(Error('Không tải được mô-đun lưu ảnh rõ'))};
  document.head.appendChild(script);
 }).catch(e=>{radioVaultLoading=null;throw e});
 return radioVaultLoading;
}

const DRAFT_MAX_PHOTO_BYTES=24*1024*1024;
const DRAFT_FIELDS=['radioReturnReason','radioDetail','radioShift'];
const CAPTURE_EXIF_OPTIONS={ifd0:false,gps:false,exif:{pick:['DateTimeOriginal','OffsetTimeOriginal']},reviveValues:false};
let nativeDraft=null,nativeDraftDb=null,signingUid='';
let reportReady=false,reportLoading=false,reportEvents=[],reportDate='',reportShift='AM',reportToken=0,reportVerified=false;
let reportMode='SHIFT',reportFrom='',reportTo='',reportAsOfMs=0;
const REPORT_LIMIT=301,RANGE_BATCH_SIZE=200,RANGE_MAX_EVENTS=2400,RANGE_MAX_DAYS=31;
let rosterRef=null,rosterCb=null,rosterRows=[],rosterAccounts=new Map(),rosterAudit=[],rosterReady=false,rosterBusy=false,rosterDate='',rosterTime=0,rosterGen=0,rosterTimer=null;
function session(){try{return root.__sagsGetSession?.()||{}}catch(_){return{}}}
function currentUser(){const u=root.firebase?.auth?.().currentUser,s=session(),p=s.profile||root.currentUserProfile||{};return {uid:u?.uid||'',name:S(p.fullName||p.name||p.displayName||p.username||u?.displayName||u?.email||'Nhân viên'),role:S(s.role||p.role||root.currentRole).toUpperCase()}}
function isAdmin(u){return ['ADMIN','AD'].includes(u?.role)}
function canMonitor(u){return isAdmin(u)||u?.role==='RADIO_MANAGER'}
function fs(){if(!root.firebase?.apps?.length||!root.firebase?.firestore)throw Error('Chưa khởi tạo kết nối Firebase.');return root.firebase.firestore()}
function fv(){return root.firebase.firestore.FieldValue.serverTimestamp()}
function errText(e){if(String(e?.code||'').includes('permission-denied'))return 'FIREBASE TỪ CHỐI GIAO DỊCH'+(choice?.code?' '+label(choice.code):' BỘ ĐÀM')+': có thể do dữ liệu hoặc quyền ghi của máy này chưa đáp ứng quy tắc. Kiểm tra trạng thái máy, UID người giữ, pin và thông tin lỗi. Ảnh và chữ ký nháp trên thiết bị không bị tự xóa.';if(!navigator.onLine)return 'Mất kết nối. Không ghi nhận nhận/trả khi ngoại tuyến.';return S(e?.message||e||'Có lỗi, thử lại.')}
function notify(s,fail=false){
 for(const id of ['radioMessage','radioActionMessage']){
  const e=$(id);if(e){e.textContent=s;e.dataset.error=fail?'1':'0'}
 }
}
function setBusy(v){busy=!!v;for(const e of document.querySelectorAll('#sagsRadioPanel button,#sagsRadioPanel select,#sagsRadioPanel input,#sagsRadioPanel textarea'))e.disabled=busy||(e.id==='radioShift'&&mode!=='ISSUE');if($('radioPhotoArea'))updatePhotoUI()}
function tpl(){
 if($('sagsRadioPanel'))return;
 const p=document.createElement('section');p.id='sagsRadioPanel';p.className='sagsRadioPanel';p.hidden=true;p.setAttribute('role','dialog');p.setAttribute('aria-modal','true');p.setAttribute('aria-label','Quản lý ký nhận bộ đàm');
 p.innerHTML='<div class="radioShell"><header class="radioHeader"><div><h2>📻 Ký nhận bộ đàm</h2></div><button id="radioClose" aria-label="Đóng" type="button">✕</button></header>'+
 '<div id="radioMessage" role="status" aria-live="polite"></div>'+
 '<div class="radioStats" id="radioStats"></div>'+ 
 '<section id="radioOverdueAlert" class="radioOverdueAlert" role="status" aria-live="polite" hidden></section>'+
 '<details id="radioAdminDisclosure" class="radioAdminDisclosure" hidden><summary>Quản trị bộ đàm · Giám sát & đối soát ca</summary><section id="radioAdminOverview" class="radioAdminOverview" hidden><div class="radioAdminHeading"><div><small>QUẢN TRỊ THIẾT BỊ · TRẠNG THÁI TRỰC TUYẾN</small><h3>Giám sát bàn giao bộ đàm</h3><p>Người giữ máy, máy cần xử lý và đối soát theo ca ở một nơi.</p></div><button type="button" data-radio-go="summary" class="radioPrimary">Báo cáo ngày / ca</button></div><div id="radioAdminDashboard" class="radioAdminDashboard"></div><div id="radioRosterMonitor" class="radioRosterMonitor"><div class="radioRosterHeader"><b>📋 Đối chiếu roster và ký nhận</b><div class="radioRosterFilters"><label>Ngày<input type="date" id="radioRosterDate"></label><label>Ca<select id="radioRosterShift"><option value="AM">Sáng</option><option value="PM">Tối</option></select></label><button id="radioRosterReload" type="button">↻ Kiểm tra</button></div></div><div id="radioRosterAlert" role="status" aria-live="polite"></div></div></section></details>'+
 '<div class="radioTabs"><button type="button" data-radio-tab="devices" class="selected">Ký nhận / Trả máy</button><button type="button" data-radio-tab="history">Lịch sử ký nhận</button><button type="button" data-radio-tab="summary">Tổng hợp</button></div>'+
 '<section id="radioReportControl" class="radioReportControl" hidden><div class="radioReportTitle"><strong>📅 Báo cáo ký nhận bộ đàm</strong><small>Chọn phạm vi → Tải dữ liệu Firebase → Xuất PDF có hoặc không kèm ảnh</small></div><label class="radioReportModeWrap" id="radioReportModeWrap" hidden>Phạm vi báo cáo (AD)<select id="radioReportMode"><option value="SHIFT">Một ngày / một ca</option><option value="RANGE">Khoảng ngày / cả ca sáng và tối</option></select></label><div class="radioReportInputs" id="radioShiftInputs"><label>Ngày cần báo cáo<input id="radioReportDate" type="date"></label><label>Ca trực<select id="radioReportShift"><option value="AM">Ca sáng (AM)</option><option value="PM">Ca tối (PM)</option></select></label><button type="button" id="radioReportLoad" class="radioPrimary">🔎 Tải báo cáo ca</button><button type="button" id="radioReportReset">Lịch sử gần đây</button></div><div class="radioReportInputs radioRangeInputs" id="radioRangeInputs" hidden><div class="radioRangePresets"><button type="button" data-radio-range-preset="7">7 ngày qua</button><button type="button" data-radio-range-preset="30">30 ngày qua</button><button type="button" data-radio-range-preset="month">Tháng này</button></div><label>Từ ngày<input id="radioRangeFrom" type="date"></label><label>Đến ngày<input id="radioRangeTo" type="date"></label><button type="button" id="radioRangeLoad" class="radioPrimary">🔎 Tải toàn bộ ca trong khoảng</button><button type="button" id="radioRangeReset">Lịch sử gần đây</button><small class="radioRangeNote">Tính cả 2 ca mỗi ngày; ca tối kết thúc 08:29 hôm sau. Tối đa 31 ngày mỗi lần.</small></div><div id="radioPdfChoice" class="radioPdfChoice" hidden><label><input type="checkbox" id="radioPdfIncludePhotos"><span>Kèm ảnh chụp và chữ ký trong PDF</span></label><small>AD / Quản lý bộ đàm: Bật để xuất báo cáo kèm ảnh từng lần nhận/trả.</small></div><p id="radioReportState" class="radioReportState" role="status" aria-live="polite">Chọn ngày và ca để lấy đúng dữ liệu, không giới hạn ở lịch sử gần nhất.</p><small>Ca sáng 08:30–19:00; ca tối 19:01–08:29 hôm sau (giờ Việt Nam). Giờ ký nhận do Firebase xác nhận; báo cáo theo ca sử dụng đã chọn, kể cả nhận trước giờ vào ca. Các bản ghi cũ chưa được xác minh ca phải đối soát riêng.</small></section>'+ 
 '<section id="radioDevicesTab"><div class="radioTools radioDeviceTools"><strong id="radioDevicesTitle">Máy còn trống</strong><div class="radioDeviceToolActions"><button type="button" id="radioOnlyUnreturned" hidden aria-pressed="false">🚩 Chỉ xem chưa trả</button><button type="button" id="radioAdminAll" hidden aria-pressed="false">Quản lý tất cả (AD)</button><button type="button" id="radioSeed" hidden>+ Khởi tạo máy</button></div></div><div id="radioDraftControls" class="radioTools" hidden><span>Ảnh và chữ ký đang lưu trên máy, chờ xác nhận Firebase.</span><button type="button" id="radioResumeDraft">Tiếp tục ký nhận/trả</button><button type="button" id="radioDiscardDraft">Bỏ bản nháp</button></div><div id="radioDeviceList" class="radioDeviceList"></div></section>'+
 '<section id="radioHistoryTab" hidden><div class="radioTools"><span>Danh sách sự kiện của ca đã chọn (AD) hoặc lịch sử cá nhân</span><button type="button" id="radioExport" class="radioPrimary">📄 Xuất PDF ca</button></div><div class="radioHistoryFilters"><label>Mã máy<select id="radioHistoryDevice"><option value="">Tất cả máy</option></select></label><label>Thao tác<select id="radioHistoryAction"><option value="">Tất cả</option><option value="ISSUE">Nhận máy</option><option value="RETURN">Trả máy</option><option value="SWAP_OUT">Đổi máy</option><option value="REPORT">Báo lỗi</option></select></label><label>Tìm kiếm<input id="radioHistorySearch" type="search" placeholder="Tên, UID hoặc ghi chú" autocomplete="off"></label></div><div id="radioHistoryMeta" class="radioHistoryMeta"></div><div id="radioHistoryList"></div></section>'+
 '<section id="radioSummaryTab" hidden><div class="radioTools"><span>Tổng hợp ca trực · theo ngày đã chọn</span><button type="button" id="radioSummaryExport" class="radioPrimary">📄 Xuất PDF ca</button></div><div id="radioSummary"></div><p class="radioHint">Tổng hợp dữ liệu đã tải trên màn hình; không gửi email.</p></section>'+
 '<section id="radioAction" class="radioAction" hidden><div class="radioActionHeader"><h3 id="radioActionTitle">Ký nhận</h3><button type="button" id="radioActionCancel">✕</button></div><div class="radioFields"><label>Mã máy<input id="radioActionCode" readonly></label><label>Người thực hiện<input id="radioPerson" readonly></label><label>Ca trực nhận máy<select id="radioShift"><option value="">— Chọn ca sử dụng —</option><option value="AM">Ca sáng · 08:30–19:00</option><option value="PM">Ca tối · 19:01–08:29 hôm sau</option></select><small id="radioShiftHint">Xác nhận ca sẽ sử dụng máy; giờ ký nhận thực tế vẫn lấy từ Firebase. Có thể nhận trước giờ vào ca.</small></label><label id="radioReasonWrap">Lý do<select id="radioReason">'+REASONS.map(([v,n])=>'<option value="'+v+'">'+esc(n)+'</option>').join('')+'</select></label><label id="radioReturnReasonWrap" hidden>Lý do trả<select id="radioReturnReason"><option value="END_SHIFT">Hết ca</option><option value="HANDOVER">Bàn giao ca tiếp theo</option><option value="STOP_USE">Không tiếp tục sử dụng</option><option value="OTHER">Lý do khác (ghi cụ thể)</option></select></label><label id="radioSwapWrap">Máy thay thế<select id="radioSwapTarget"></select></label><label class="wide">Ghi chú hiện trạng<textarea id="radioDetail" rows="2" placeholder="Ghi cụ thể hiện tượng, thời gian, vị trí..."></textarea></label></div><section id="radioPhotoArea" class="radioPhotoArea" hidden><div class="radioPhotoHeading"><strong id="radioPhotoStep">1 · Ảnh bộ đàm thực tế</strong><small>Camera trực tiếp · không chọn thư viện</small></div><div class="radioCameraView"><input id="radioNativeCamera" type="file" accept="image/*" capture="environment" hidden><video id="radioCameraVideo" playsinline autoplay muted></video><img id="radioCameraPhoto" alt="Ảnh chụp mã máy và thời gian" hidden></div><div id="radioPhotoChips" class="radioPhotoChips"></div><div class="radioPhotoActions"><button id="radioTakePhoto" type="button" class="radioPrimary">📷 Chụp ảnh</button><button id="radioRetakePhoto" type="button" hidden>Chụp lại</button><button id="radioInspectPhoto" type="button" hidden>🔎 Phóng to kiểm tra ảnh</button><button id="radioRetryPhoto" type="button" hidden>Mở camera</button></div><small class="radioHint">Giờ trên ảnh là giờ của điện thoại; Firebase ghi riêng thời điểm xác nhận trên máy chủ.</small></section><div id="radioSigWrap"><p>Chữ ký xác nhận của tài khoản đang đăng nhập</p><canvas id="radioSignature" width="540" height="150" aria-label="Ký bằng ngón tay hoặc chuột"></canvas><button type="button" id="radioClearSignature">Xóa nét ký</button></div><p id="radioActionMessage" class="radioActionMessage" role="status" aria-live="polite"></p><div class="radioActions"><button type="button" id="radioCancel">Hủy</button><button class="radioPrimary" type="button" id="radioConfirm">Xác nhận và lưu lịch sử</button></div></section>'+
 '<div class="radioProofViewer" id="radioProofViewer" hidden><div><header><strong id="radioProofName">Ảnh và chữ ký</strong><button type="button" id="radioProofClose">✕</button><button id="radioProofZoom" type="button">🔎 Phóng to</button></header><div class="radioProofScroll"><img id="radioProofImage" alt="Bằng chứng ảnh có giờ và chữ ký"></div><p id="radioProofQuality"></p><p id="radioProofTimestamp"></p></div></div><footer>Giờ trên ảnh do thiết bị cung cấp; giờ xác nhận chính thức theo Firebase.</footer></div>';
 document.body.appendChild(p);
 $('radioClose').onclick=close;$('radioActionCancel').onclick=cancel;$('radioCancel').onclick=cancel;
 $('radioConfirm').onclick=()=>void submit();
 $('radioClearSignature').onclick=()=>{clearSignature();queueDraftSave()};
 $('radioResumeDraft').onclick=()=>void resumeNativeDraft();
 $('radioDiscardDraft').onclick=()=>void discardNativeDraft();
 $('radioNativeCamera').onchange=e=>{
  const file=e.target.files?.[0];e.target.value='';
  if(file)void acceptNativePhoto(file);
 };
 for(const id of DRAFT_FIELDS){$(id).addEventListener('input',queueDraftSave);if(id==='radioShift')$(id).addEventListener('change',queueDraftSave)}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)queueDraftSave()});
 $('radioTakePhoto').onclick=()=>nativeMode()?openNativeCamera():takePhoto();$('radioRetakePhoto').onclick=()=>void retakePhoto();$('radioInspectPhoto').onclick=inspectCapturedPhoto;$('radioRetryPhoto').onclick=()=>void startCamera(cameraLeg);$('radioProofClose').onclick=closeProof;
 $('radioProofViewer').onclick=e=>{if(e.target.id==='radioProofViewer')closeProof()};
  $('radioProofZoom').onclick=()=>{const box=$('radioProofViewer');box.classList.toggle('radioProofZoomed');$('radioProofZoom').textContent=box.classList.contains('radioProofZoomed')?'↩ Thu vừa':'🔎 Phóng to'};
 $('radioSeed').onclick=()=>void seed();
 $('radioAdminAll').onclick=()=>{
  if(!canMonitor(currentUser()))return;
  adminAllDevices=!adminAllDevices;if(adminAllDevices)radioOnlyUnreturned=false;render();
 };
 $('radioOnlyUnreturned').onclick=()=>{
  if(!isAdmin(currentUser()))return;
  radioOnlyUnreturned=!radioOnlyUnreturned;if(radioOnlyUnreturned)adminAllDevices=false;render();
 };
 $('radioOverdueAlert').onclick=e=>{if(!e.target.closest('[data-radio-overdue-show]')||!isAdmin(currentUser()))return;
  radioOnlyUnreturned=true;adminAllDevices=false;tab('devices');render();$('radioDeviceList')?.scrollIntoView({behavior:'smooth',block:'start'});
 };
 $('radioReportDate').value=radioShiftAt(Date.now()).day;$('radioReportShift').value=shift();
 $('radioRangeTo').value=vnDateKey(new Date());$('radioRangeFrom').value=radioDayAdd($('radioRangeTo').value,-6);
 $('radioReportModeWrap').hidden=!isAdmin(currentUser());
 $('radioReportMode').onchange=()=>{clearShiftReport();syncRadioReportMode();renderHistory();renderSummary()};
 $('radioRangeLoad').onclick=()=>void loadRangeReport();
 $('radioRangeReset').onclick=()=>{clearShiftReport();renderHistory();renderSummary()};
 for(const el of p.querySelectorAll('[data-radio-range-preset]'))el.onclick=()=>{applyRadioRangePreset(el.dataset.radioRangePreset);clearShiftReport();renderHistory();renderSummary()};
 for(const id of ['radioRangeFrom','radioRangeTo'])$(id).addEventListener('change',()=>{clearShiftReport();renderHistory();renderSummary()});
 syncRadioReportMode();
  $('radioRosterDate').value=radioShiftAt(Date.now()).day;$('radioRosterShift').value=shift();
  $('radioRosterReload').onclick=()=>void refreshRosterAudit();
  for(const id of ['radioRosterDate','radioRosterShift'])$(id).onchange=watchRoster;
 $('radioReportLoad').onclick=()=>void loadShiftReport();
 $('radioReportReset').onclick=()=>{clearShiftReport();renderHistory();renderSummary()};
 for(const id of ['radioReportDate','radioReportShift'])$(id).addEventListener('change',()=>{clearShiftReport();renderHistory();renderSummary()});
 $('radioExport').onclick=()=>void exportPdf();$('radioSummaryExport').onclick=()=>void exportPdf();
 ['radioHistoryDevice','radioHistoryAction'].forEach(id=>{$(id).onchange=renderHistory});$('radioHistorySearch').oninput=renderHistory;
 p.querySelectorAll('[data-radio-tab]').forEach(b=>b.onclick=()=>tab(b.dataset.radioTab));
 const c=$('radioSignature');c.style.touchAction='none';
 const down=e=>{if(busy)return;drawing=true;canvasDirty=true;strokes.push([]);try{c.setPointerCapture?.(e.pointerId)}catch(_){}mark(e)};
 const move=e=>{if(drawing)mark(e)};const up=()=>{if(drawing){drawing=false;queueDraftSave()}};
 c.addEventListener('pointerdown',down);c.addEventListener('pointermove',move);c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up);
 // Older iOS WebKit versions lack reliable PointerEvent support.
 if(!root.PointerEvent){
  const mapped=e=>({clientX:e.touches[0]?.clientX,clientY:e.touches[0]?.clientY});
  c.addEventListener('touchstart',e=>{if(!e.touches.length)return;e.preventDefault();down(mapped(e))},{passive:false});
  c.addEventListener('touchmove',e=>{if(!e.touches.length)return;e.preventDefault();move(mapped(e))},{passive:false});
  c.addEventListener('touchend',up,{passive:true});c.addEventListener('touchcancel',up,{passive:true});
 }
 p.addEventListener('click',e=>{const go=e.target.closest('[data-radio-go]');if(go){tab(go.dataset.radioGo);$('radioReportControl')?.scrollIntoView({behavior:'smooth',block:'start'});return}const b=e.target.closest('[data-radio-act]');if(b)start(b.dataset.radioAct,b.dataset.radioCode);const el=e.target.closest('[data-radio-proof]');if(el)viewProof(el.dataset.radioProof)});
 $('radioSwapTarget').onchange=()=>{if(mode==='SWAP_OUT'&&choice){photos.new=null;clearSignature();updatePhotoUI();void startCamera('new')}};
}

function nativeMode(action=mode){
 return ['ISSUE','RETURN'].includes(action)&&
  (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent||'')||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1));
}
function openNativeCamera(){
 if(busy||!choice||currentUser().uid!==signingUid)return;
 $('radioNativeCamera').click();
}
function offsetText(date){
 const minutes=-date.getTimezoneOffset(),abs=Math.abs(minutes);
 return (minutes<0?'-':'+')+String(Math.floor(abs/60)).padStart(2,'0')+':'+String(abs%60).padStart(2,'0');
}
function captureClock(tags,receivedAt){
 const stamp=String(tags?.DateTimeOriginal||'').match(/^(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d):(\d\d)$/);
 if(stamp){
  const [,year,month,day,hour,minute,second]=stamp;
  const iso=year+'-'+month+'-'+day+'T'+hour+':'+minute+':'+second;
  const localDate=new Date(iso);
  const offset=String(tags.OffsetTimeOriginal||'').trim();
  const explicit=/^[+-](?:0\d|1[0-4]):[0-5]\d$/.test(offset);
  const at=explicit?Date.parse(iso+offset):localDate.getTime();
  if(at>0)return {at,source:explicit?'EXIF':'EXIF-offset-thiết-bị',offset:explicit?offset:offsetText(localDate)};
 }
 return {at:receivedAt,source:'picker-return',offset:offsetText(new Date(receivedAt))};
}
async function readCaptureClock(file,receivedAt){
 try{
  const exif=await import(new URL('../vendor/exifr-lite-7.1.3.js',radioScriptUrl));
  const tags=await exif.parse(file,CAPTURE_EXIF_OPTIONS);
  return captureClock(tags,receivedAt);
 }catch(error){
  console.info('Radio capture metadata unavailable',error?.name||'Error');
  return captureClock(null,receivedAt);
 }
}
function shotStamp(photo){
 return formatShotTime(new Date(photo.at))+' VN · '+(photo.clock.source==='picker-return'?'ƯỚC TÍNH':'GIỜ THIẾT BỊ');
}
async function decodeNativePhoto(file,clock,code){
 const preview=URL.createObjectURL(file);
 try{
  const image=new Image();
  image.style.imageOrientation='from-image';
  await new Promise((resolve,reject)=>{
   image.onload=resolve;
   image.onerror=()=>reject(Error('Không giải mã được ảnh từ camera. Hãy dùng camera mặc định và thử chụp lại ở định dạng JPEG (iPhone: Cài đặt → Camera → Định dạng → Tương thích nhất).'));
   image.src=preview;
  });
  image.onload=null;image.onerror=null;
  if(!image.naturalWidth||!image.naturalHeight)throw Error('Ảnh camera chưa có dữ liệu.');
  return {file,image,preview,clock,at:clock.at,code,captureWidth:image.naturalWidth,captureHeight:image.naturalHeight};
 }catch(e){URL.revokeObjectURL(preview);throw e}
}
function setNativePhoto(photo){
 if(photos.old?.file)URL.revokeObjectURL(photos.old.preview);
 photos.old=photo;
 const image=$('radioCameraPhoto');image.src=photo.preview;image.hidden=false;
 updatePhotoUI();
 notify('Ảnh '+photo.captureWidth+'×'+photo.captureHeight+' px · '+shotStamp(photo)+
  ' · CHƯA XÁC MINH. Ảnh đã lưu trên máy. Kiểm tra mã máy rồi ký.');
}
async function acceptNativePhoto(file){
 if(busy||!choice||!nativeMode()||currentUser().uid!==signingUid)return;
 const receivedAt=Date.now();
 if(!file.size)return notify('Camera chưa trả về ảnh hợp lệ. Hãy chụp lại.',true);
 setBusy(true);
 let decoded;
 try{
  let clock;
  if(file.size>DRAFT_MAX_PHOTO_BYTES){
   clock=await readCaptureClock(file,receivedAt);
   file=await normalizeLargeDraftPhoto(file,clock,choice.code);
  }
  // Store the source before decoding on the first shot, so a tab killed
  // during image decode can reopen the same camera file.
  if(!nativeDraft){
   const draft={id:fs().collection(EVENTS).doc().id,uid:signingUid,code:choice.code,action:mode,
    deviceVersion:choice.version,receivedAt,clock:clock||null};
   await saveNativeDraft(file,draft);
   nativeDraft=draft;
  }
  clock=clock||await readCaptureClock(file,receivedAt);
  decoded=await decodeNativePhoto(file,clock,choice.code);
  const next={...nativeDraft,receivedAt,clock};
  delete next.shift;
  await saveNativeDraft(file,next,[]);
  nativeDraft=next;
  clearSignature();setNativePhoto(decoded);decoded=null;
 }catch(e){notify(S(e?.message||e),true)}
 finally{if(decoded)URL.revokeObjectURL(decoded.preview);setBusy(false)}
}
async function normalizeLargeDraftPhoto(file,clock,code){
 const photo=await decodeNativePhoto(file,clock,code),canvas=document.createElement('canvas');
 try{
  const scale=Math.min(1,2048/Math.max(photo.captureWidth,photo.captureHeight));
  canvas.width=Math.max(1,Math.round(photo.captureWidth*scale));
  canvas.height=Math.max(1,Math.round(photo.captureHeight*scale));
  const ctx=canvas.getContext('2d',{alpha:false,colorSpace:'srgb'});
  ctx.imageSmoothingQuality='high';
  ctx.drawImage(photo.image,0,0,canvas.width,canvas.height);
  // Lossless normalization is only needed when the original cannot fit in the draft.
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  if(!blob||blob.size>DRAFT_MAX_PHOTO_BYTES)throw Error('Không thể tối ưu ảnh quá lớn để lưu nháp. Hãy tắt ProRAW rồi chụp lại.');
  return blob;
 }finally{canvas.width=1;canvas.height=1;URL.revokeObjectURL(photo.preview)}
}
function draftError(error){
 console.warn('Radio draft storage',error?.name||'Error');
 return 'Không lưu/đọc được bản nháp. Kiểm tra dung lượng và quyền lưu dữ liệu của Safari rồi thử lại.';
}
function radioNativeDraftDb(){
 if(!nativeDraftDb)nativeDraftDb=new Promise((resolve,reject)=>{
  const request=root.indexedDB.open('sags-radio-handover-drafts',1);
  request.onupgradeneeded=()=>{
   request.result.createObjectStore('drafts',{keyPath:'uid'});
   request.result.createObjectStore('files');
  };
  request.onsuccess=()=>{
   const db=request.result;
   db.onversionchange=()=>{db.close();nativeDraftDb=null};
   resolve(db);
  };
  request.onerror=()=>reject(request.error);
  request.onblocked=()=>reject(Error('Kho bản nháp đang mở ở tab khác.'));
 }).catch(e=>{nativeDraftDb=null;throw e});
 return nativeDraftDb;
}
async function nativeDraftTransaction(mode,work){
 const db=await radioNativeDraftDb();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(['drafts','files'],mode);
  let result,error;
  tx.oncomplete=()=>resolve(result);
  tx.onabort=()=>reject(error||tx.error||Error('Giao dịch bản nháp bị hủy.'));
  work(tx.objectStore('drafts'),tx.objectStore('files'),value=>{result=value},e=>{error=e;tx.abort()});
 });
}
function readNativeDraft(uid,includeFile=false){
 return nativeDraftTransaction('readonly',(drafts,files,done)=>{
  const request=drafts.get(uid);
  request.onsuccess=()=>{
   const draft=request.result;
   if(!includeFile||!draft){done(draft);return}
   const raw=files.get(draft.id);
   raw.onsuccess=()=>done({...draft,file:raw.result});
  };
 });
}
async function saveNativeDraft(file,draft=nativeDraft,ink=strokes){
 if(!draft||currentUser().uid!==draft.uid)throw Error('Phiên ký nhận đã thay đổi.');
 const snapshot={...draft,fields:Object.fromEntries(DRAFT_FIELDS.map(id=>[id,$(id).value])),
  strokes:ink.map(points=>points.map(point=>[...point]))};
 try{
  await nativeDraftTransaction('readwrite',(drafts,files,done,abort)=>{
   const request=drafts.get(snapshot.uid);
   request.onsuccess=()=>{
    const old=request.result;
    if((old&&old.id!==snapshot.id)||(!old&&!file)){
     abort(Error('Bản nháp đã thay đổi ở tab khác.'));
     return;
    }
    drafts.put(snapshot);
    if(file)files.put(file,snapshot.id);
   };
  });
 }catch(e){throw Error(draftError(e))}
}
function queueDraftSave(){
 if(nativeDraft&&!busy)void saveNativeDraft().catch(e=>notify(e.message,true));
}
function removeNativeDraft(uid,id){
 return nativeDraftTransaction('readwrite',(drafts,files)=>{
  const request=drafts.get(uid);
  request.onsuccess=()=>{
   if(request.result?.id!==id)return;
   drafts.delete(uid);files.delete(id);
  };
 });
}
async function showNativeDraft(){
 const uid=currentUser().uid,controls=$('radioDraftControls');
 if(controls)controls.hidden=true;
 if(!controls||!uid||!nativeMode('ISSUE'))return;
 try{
  const draft=await readNativeDraft(uid);
  if(currentUser().uid===uid)controls.hidden=!draft||!!choice;
 }catch(e){console.warn('Radio pending draft unavailable',e?.name)}
}
async function nativeReceiptExists(draft){
 try{
  const snap=await fs().collection(EVENTS).doc(draft.id).get({source:'server'});
  const e=snap.data();
  return snap.exists&&e.actorUid===draft.uid&&e.deviceCode===draft.code&&e.action===draft.action&&!!e.at?.toMillis?.();
 }catch(e){
  // The read rule also denies a missing event to non-admin staff.
  if(String(e?.code||'').includes('permission-denied'))return false;
  throw e;
 }
}
async function finishNativeDraft(message){
 await removeNativeDraft(nativeDraft.uid,nativeDraft.id).catch(e=>console.warn('Radio draft cleanup',e));
 cancel();notify(message);
}
async function resumeNativeDraft(){
 if(busy||!currentUser().uid)return;
 const user=currentUser();setBusy(true);
 try{
  const saved=await readNativeDraft(user.uid,true);
  if(!saved||user.uid!==currentUser().uid)return;
  const {file,...draft}=saved;
  const d=devices.find(x=>x.code===draft.code)||{code:draft.code,version:draft.deviceVersion};
  showSigningForm(draft.action,d,user);nativeDraft=draft;
  if(['AM','PM'].includes(S(draft.shift)))$('radioShift').value=draft.shift;
  $('radioDraftControls').hidden=true;
  for(const id of DRAFT_FIELDS)if(typeof draft.fields?.[id]==='string')$(id).value=draft.fields[id];
  const c=$('radioSignature');
  for(const points of draft.strokes){
   const line=[];strokes.push(line);
   for(const [x,y] of points){line.push([x,y]);paintSignature(c,line,x,y)}
  }
  canvasDirty=strokes.some(points=>points.length>=2);
  if(connected&&navigator.onLine){
   try{if(await nativeReceiptExists(draft)){await finishNativeDraft('✓ Lượt ký này đã được xác nhận trên Firebase.');return}}
   catch(e){console.info('Radio draft receipt check unavailable',e?.code||e?.name)}
  }
  const clock=draft.clock||await readCaptureClock(file,draft.receivedAt);
  setNativePhoto(await decodeNativePhoto(file,clock,draft.code));
  nativeDraft.clock=clock;
 }catch(e){notify(S(e?.message||e),true)}
 finally{setBusy(false);void showNativeDraft()}
}
async function discardNativeDraft(){
 if(busy)return;
 const uid=currentUser().uid;
 if(!uid||!root.confirm('Bỏ ảnh, chữ ký và thông tin ký nhận/trả đang lưu trên máy?'))return;
 setBusy(true);
 try{
  const draft=await readNativeDraft(uid);
  if(draft&&currentUser().uid===uid)await removeNativeDraft(uid,draft.id);
  cancel();notify('Đã bỏ bản nháp trên máy.');
 }catch(e){notify(draftError(e),true)}
 finally{setBusy(false);void showNativeDraft()}
}
function nativeProofPlan(longest,compact,format){
 const steps=compact?(format==='png'?[[640,1],[400,1],[256,1],[160,1],[96,1],[64,1],[48,1]]:
  [[640,.82],[512,.72],[400,.62],[320,.55],[256,.48],[160,.42],[96,.35],[64,.35],[48,.3]]):
  // Preserve source detail when fitting iPhone proof within the Firebase cap.
  // Every attempt is encoded directly from the untouched full-size camera image.
  [[Math.min(longest,2560),.94],[2240,.88],[2048,.84],[1920,.82],
   [1600,.85],[1440,.82],[1280,.80],[1024,.72]];
 return steps.map(([edge,quality])=>[Math.min(edge,longest),quality]);
}
function drawNativeProof(canvas,photo,edge,compact){
 const ratio=edge/Math.max(photo.captureWidth,photo.captureHeight);
 const width=Math.max(1,Math.round(photo.captureWidth*ratio)),height=Math.max(1,Math.round(photo.captureHeight*ratio));
 const footer=Math.max(26,Math.round(width*.12)),inkHeight=Math.max(22,Math.round(width*.18));
 canvas.width=width;canvas.height=height+footer+inkHeight;
 const ctx=canvas.getContext('2d',{alpha:false,colorSpace:'srgb'});
 if(!ctx)throw Error('Safari không tạo được ảnh màu.');
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(photo.image,0,0,width,height);
 ctx.fillStyle='#041926';ctx.fillRect(0,height,width,footer);
 ctx.fillStyle='#fff';ctx.textBaseline='middle';
 const left=Math.max(2,Math.round(width*.025));
 ctx.font='bold '+Math.max(compact?7:14,Math.round(width*.03))+'px Arial';
 ctx.fillText('SAGS · '+label(photo.code)+' · '+(mode==='ISSUE'?'NHẬN':'TRẢ'),left,height+footer*.22,width-2*left);
 ctx.fillText(shotStamp(photo),left,height+footer*.52,width-2*left);
 ctx.fillText('CHƯA XÁC MINH',left,height+footer*.81,width-2*left);
 ctx.fillStyle='#e9f4f8';ctx.fillRect(0,height+footer,width,inkHeight);
 const ink=$('radioSignature'),inkWidth=Math.min(width-2*left,ink.width*inkHeight/ink.height);
 const inkDrawHeight=inkWidth*ink.height/ink.width;
 ctx.drawImage(ink,left,height+footer+(inkHeight-inkDrawHeight)/2,inkWidth,inkDrawHeight);
}
function proofBlobData(blob){
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(reader.result);
  reader.onerror=()=>reject(reader.error);
  reader.readAsDataURL(blob);
 });
}
async function encodeNativeProof(maxLength,compact=false,format='jpeg'){
 const photo=photos.old,mime='image/'+format,prefix='data:'+mime+';base64,';
 const canvas=document.createElement('canvas');
 let lastEdge=0;
 try{
  for(const [edge,quality] of nativeProofPlan(Math.max(photo.captureWidth,photo.captureHeight),compact,format)){
   if(edge!==lastEdge){drawNativeProof(canvas,photo,edge,compact);lastEdge=edge}
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,mime,quality));
   if(blob?.type===mime){
    const length=prefix.length+4*Math.ceil(blob.size/3);
    if(length<=maxLength&&length>120)return await proofBlobData(blob);
   }
  }
 }finally{canvas.width=1;canvas.height=1}
 const error=Error('Ảnh vượt giới hạn Firebase sau khi đã tự tối ưu. Hãy thử lưu lại; bản nháp vẫn còn trên máy.');
 error.code='radio-photo-size';throw error;
}

// Render one high-quality independent original from the same capture that was
// signed for Firebase. No upscaling and no cascading JPEG recompression.
async function originalRadioPhotoBlob(leg){
 const photo=photos[leg];if(!photo)throw Error('Không có ảnh camera gốc');
 const canvas=document.createElement('canvas');
 try{
  const source=photo.image||photo.canvas;
  if(!source)throw Error('Không tìm thấy ảnh camera để lưu bản rõ');
  const longest=Math.max(photo.captureWidth||source.width,photo.captureHeight||source.height);
  for(const [edge,quality] of [[Math.min(2560,longest),.89],[Math.min(2048,longest),.86],[Math.min(1600,longest),.83]]){
   if(photo.image){drawNativeProof(canvas,photo,edge,false)}
   else{
    const ratio=Math.min(1,edge/Math.max(source.width,source.height));
    const w=Math.max(1,Math.round(source.width*ratio)),h=Math.max(1,Math.round(source.height*ratio));
    const inkHeight=Math.max(42,Math.round(w*.14));
    canvas.width=w;canvas.height=h+inkHeight;
    const ctx=canvas.getContext('2d',{alpha:false,colorSpace:'srgb'});
    if(!ctx)throw Error('Không thể mã hóa ảnh màu');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    ctx.drawImage(source,0,0,w,h);
    ctx.fillStyle='#e9f4f8';ctx.fillRect(0,h,w,inkHeight);
    ctx.fillStyle='#193c4e';ctx.font='bold '+Math.max(14,Math.round(w*.018))+'px Arial';
    ctx.fillText('CHỮ KÝ XÁC NHẬN',Math.round(w*.025),h+inkHeight*.21);
    ctx.drawImage($('radioSignature'),Math.round(w*.025),h+inkHeight*.25,
      Math.round(w*.9),Math.round(inkHeight*.68));
   }
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
   if(blob?.type==='image/jpeg'&&blob.size>=12000&&blob.size<=8388608)return blob;
  }
  throw Error('Ảnh vẫn vượt quá 8 MB, giữ nguyên bằng chứng Firebase');
 }finally{canvas.width=1;canvas.height=1}
}
function needsPhoto(action){return ['ISSUE','RETURN','SWAP_OUT','REPORT'].includes(action)}
function stopCamera(){
 ++cameraToken;if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null}
 const v=$('radioCameraVideo');if(v){v.pause();v.srcObject=null}
}
function resetCamera(){
 stopCamera();if(photos.old?.file)URL.revokeObjectURL(photos.old.preview);photos={old:null,new:null};cameraLeg='old';
 const img=$('radioCameraPhoto');if(img){img.hidden=true;img.removeAttribute('src')}
 const list=$('radioPhotoChips');if(list)list.replaceChildren();
}
function photosReady(){return !!photos.old&&(mode!=='SWAP_OUT'||!!photos.new)}
function updatePhotoUI(){
 const area=$('radioPhotoArea');if(!area)return;const needs=needsPhoto(mode),complete=photosReady();
 area.hidden=!needs;$('radioSigWrap').hidden=mode==='RELEASE'||(needs&&!complete);
 $('radioConfirm').disabled=busy||(needs&&!complete);
 $('radioTakePhoto').hidden=!needs||complete;$('radioTakePhoto').disabled=busy||(!nativeMode()&&!cameraStream);
 $('radioRetakePhoto').hidden=!needs||!photos.old;
 $('radioInspectPhoto').hidden=!needs||!photos.old;
 $('radioRetryPhoto').hidden=!needs||complete||nativeMode();
 $('radioPhotoStep').textContent=mode==='SWAP_OUT'?(photos.old?'2 · Chụp máy thay thế':'1 · Chụp máy cũ'):'1 · Chụp bộ đàm thực tế';
 const list=$('radioPhotoChips');list.replaceChildren();
 for(const leg of ['old','new']){
  const x=photos[leg];if(!x)continue;
  const item=document.createElement('div');item.className='radioPhotoChip';
  const image=document.createElement('img');image.src=x.preview;image.alt='Ảnh '+x.code;
  const title=document.createElement('span');title.textContent=label(x.code);
  item.append(image,title);list.append(item);
 }
}
async function startCamera(leg){
 if(!choice||!needsPhoto(mode))return;
 stopCamera();cameraLeg=leg;const v=$('radioCameraVideo');v.hidden=false;
 $('radioCameraPhoto').hidden=true;$('radioPhotoArea').hidden=false;
 $('radioTakePhoto').disabled=true;notify('Đang yêu cầu quyền camera...');const token=cameraToken;
 if(!navigator.mediaDevices?.getUserMedia){notify('Camera trực tiếp không hỗ trợ ở trình duyệt này. Hãy dùng HTTPS trên Chrome, Edge hoặc Safari.',true);updatePhotoUI();return}
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:2560},height:{ideal:1440}}});
  if(token!==cameraToken||!choice){stream.getTracks().forEach(t=>t.stop());return}
  cameraStream=stream;v.srcObject=stream;await v.play();
   try{const t=stream.getVideoTracks?.()[0],m=t?.getCapabilities?.()?.focusMode;if(Array.isArray(m)&&m.includes('continuous'))void t.applyConstraints({advanced:[{focusMode:'continuous'}]}).catch(()=>{});}catch(_){}
  if(token!==cameraToken)return;
  updatePhotoUI();notify('Chụp rõ mã số và thân bộ đàm, sau đó ký xác nhận.');
 }catch(e){
  if(token!==cameraToken)return;
  stopCamera();updatePhotoUI();
  notify('Không mở được camera ('+S(e?.name||'lỗi')+'). Vào quyền trang để cho phép camera rồi thử lại. Không thể ký khi thiếu ảnh.',true);
 }
}
function formatShotTime(d){return new Intl.DateTimeFormat('vi-VN',{timeZone:VN,day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(d)}
function takePhoto(){
 if(!choice||!cameraStream||busy)return notify('Camera chưa hoạt động. Bấm Mở camera và thử lại.',true);
 const v=$('radioCameraVideo');if(v.readyState<2||!v.videoWidth||!v.videoHeight)return notify('Camera chưa có hình.',true);
 const code=cameraLeg==='new'?$('radioSwapTarget').value:choice.code;if(!code)return notify('Chọn bộ đàm thay thế.',true);
 // Safari can supply a portrait 720x1280 or a lower-resolution live stream.
 // Never upscale/crop it into a fixed 1280x720 landscape canvas: doing so
 // used to leave huge dark bars and blur serial numbers on iPhones.
 const sensorW=v.videoWidth,sensorH=v.videoHeight,scale=Math.min(1,2048/Math.max(sensorW,sensorH));
 const width=Math.max(1,Math.round(sensorW*scale)),height=Math.max(1,Math.round(sensorH*scale));
 const stampH=Math.max(84,Math.min(144,Math.round(width*.125)));
 const c=document.createElement('canvas');c.width=width;c.height=height+stampH;
 const ctx=c.getContext('2d',{alpha:false});
 if(!ctx)return notify('Trình duyệt không tạo được ảnh camera.',true);
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);
 ctx.drawImage(v,0,0,width,height); // Natural aspect ratio; no brightness or colour quantization
 const operation=cameraLeg==='new'?'SWAP_IN':mode,at=new Date(),size=Math.max(14,Math.round(width*.029));
 ctx.fillStyle='#041926';ctx.fillRect(0,height,width,stampH);
 ctx.fillStyle='#fff';ctx.textBaseline='middle';ctx.font='bold '+size+'px Arial';
 ctx.fillText('SAGS · '+label(code)+' · '+(['ISSUE','SWAP_IN'].includes(operation)?'NHẬN':['RETURN','SWAP_OUT'].includes(operation)?'TRẢ':'BÁO LỖI'),Math.round(width*.02),height+stampH*.33);
 ctx.font='bold '+Math.max(12,Math.round(size*.8))+'px Arial';ctx.fillStyle='#9ee5eb';
 ctx.fillText(formatShotTime(at)+' · giờ thiết bị (VN)',Math.round(width*.02),height+stampH*.76);
 const preview=c.toDataURL('image/jpeg',.94);
 if(!preview.startsWith('data:image/jpeg;base64,'))return notify('iPhone không mã hóa được ảnh JPEG rõ nét. Chụp lại hoặc mở Safari để thử lại.',true);
 photos[cameraLeg]={canvas:c,preview,code,at:at.getTime(),captureWidth:width,captureHeight:height};
 stopCamera();updatePhotoUI();
 if(mode==='SWAP_OUT'&&cameraLeg==='old'){
  notify('Đã chụp máy cũ '+width+'×'+height+' px. Tiếp tục chụp máy mới.');
  void startCamera('new');
 }else{
  v.hidden=true;const image=$('radioCameraPhoto');
  image.src=photos[cameraLeg].preview;image.hidden=false;
  notify('Ảnh camera '+width+'×'+height+' px, không chỉnh màu. Kiểm tra rõ mã máy; bấm Chụp lại nếu chưa rõ, rồi ký.');
  $('radioSigWrap').scrollIntoView({behavior:'smooth',block:'nearest'});
 }
}
function inspectCapturedPhoto(){
 const pic=photos[cameraLeg]||photos.new||photos.old;
 if(!pic)return notify('Chưa có ảnh để kiểm tra. Hãy chụp ảnh bộ đàm trước.',true);
 const box=$('radioProofViewer');
 $('radioProofName').textContent='Kiểm tra độ nét trước khi ký · '+label(pic.code);
 $('radioProofImage').src=pic.preview;
 box.classList.remove('radioProofZoomed');$('radioProofZoom').textContent='🔎 Phóng to';
 $('radioProofQuality').textContent='Ảnh chụp '+pic.captureWidth+' × '+pic.captureHeight+' px, giữ màu thực tế. Phóng to để đọc mã máy; nếu mờ hãy đóng và bấm Chụp lại.';
 $('radioProofTimestamp').textContent=pic.file?
  shotStamp(pic)+' · CHƯA XÁC MINH · Ảnh đã lưu trên máy, đang chờ xác nhận Firebase.':
  'Giờ trên ảnh là giờ thiết bị. Ảnh chưa được lưu lên Firebase; chỉ ký khi đã kiểm tra rõ nét.';
 box.hidden=false;
}
async function retakePhoto(){
 if(!choice||busy)return;
 if(nativeMode()){openNativeCamera();return}
 clearSignature();
 if(mode==='SWAP_OUT'&&photos.new){photos.new=null;updatePhotoUI();await startCamera('new')}
 else{photos={old:null,new:null};updatePhotoUI();await startCamera('old')}
}
function webpCanvasEncoderSupported(){
 const c=document.createElement('canvas');c.width=1;c.height=1;
 try{return c.toDataURL('image/webp',.5).startsWith('data:image/webp;base64,')}
 catch(_){return false}
}
// Emergency-safe encoding: a valid live photo must NEVER prevent the user from
// signing merely because full-resolution evidence exceeds the Firebase budget.
function encodeProof(leg,maxLength,requestedFormat='auto',compact=false){
 const photo=photos[leg];if(!photo?.canvas)throw Error('Chưa chụp ảnh trực tiếp.');
 const source=photo.canvas,sourceW=source.width||640,sourceH=source.height||480;
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{alpha:false});
 if(!ctx)throw Error('Trình duyệt không xử lý được ảnh. Vui lòng chụp lại.');
 const format=requestedFormat==='png'?'png':requestedFormat==='jpeg'?'jpeg':webpCanvasEncoderSupported()?'webp':'jpeg';
 const mime='image/'+format,prefix='data:'+mime+';base64,';
 const longest=Math.max(sourceW,sourceH);
 // The full-resolution archive MUST NOT start at 1280px when the camera
 // provided a sharper 2048px image. The 44KB receipt remains lightweight.
 // All size attempts are drawn from the same original canvas, never cascaded.
 const targets=compact?[640,512,400,320,256,192,160,128,96,72,48]:
  [2048,1920,1800,1600,1440,1280,1120,1024,900,800,640,480,360,280,200,160];
 const qualities=compact?[.82,.65,.5,.35,.25]:[.94,.88,.82,.74,.65,.55];
 const attempted=new Set();
 for(const longestSide of targets){
  const scale=Math.min(1,longestSide/longest),width=Math.max(1,Math.round(sourceW*scale));
  if(attempted.has(width))continue;
  attempted.add(width);
  const pictureHeight=Math.max(1,Math.round(sourceH*scale));
  const signatureHeight=Math.max(compact?24:36,Math.round(width*(compact?.19:.15)));
  canvas.width=width;canvas.height=pictureHeight+signatureHeight;
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(source,0,0,width,pictureHeight);
  ctx.fillStyle='#e9f4f8';ctx.fillRect(0,pictureHeight,width,signatureHeight);
  ctx.fillStyle='#193c4e';ctx.font='bold '+Math.max(8,Math.round(width*.018))+'px Arial';
  ctx.fillText('CHỮ KÝ XÁC NHẬN',Math.round(width*.025),pictureHeight+signatureHeight*.22);
  ctx.drawImage($('radioSignature'),Math.round(width*.025),pictureHeight+signatureHeight*.25,
   Math.round(width*.9),Math.round(signatureHeight*.68));
  for(const quality of format==='png'?[1]:qualities){
   let data='';
   try{data=canvas.toDataURL(mime,quality)}catch(_){continue}
   if(data.startsWith(prefix)&&data.length>120&&data.length<=maxLength)return data;
  }
 }
 throw Error('Không thể tạo ảnh ký nhận nằm trong giới hạn lưu trữ, kể cả khi đã tự giảm độ phân giải.');
}
function combineFullProof(leg,maxLength=HIGH_PROOF_LIMIT){
 return encodeProof(leg,maxLength,'auto',false);
}
function combineProof(leg,requestedFormat='auto'){
 try{return encodeProof(leg,44000,requestedFormat,true)}
 catch(error){
  // A particular Safari/WebP encoder can fail even after downsizing.
  if(requestedFormat==='auto')return encodeProof(leg,44000,'jpeg',true);
  throw error;
 }
}
// Optional device-only backup when production Firestore Rules have not been
// deployed. This is NOT an authoritative receipt or server-verified evidence.
let localProofDbPromise=null;
const localProofIds=new Set();
function localProofKey(uid,code,action,at){return String(uid)+'|'+String(code)+'|'+String(action)+'|'+String(at)}
function radioProofDb(){
 if(!root.indexedDB)return Promise.reject(Error('IndexedDB không khả dụng'));
 if(!localProofDbPromise)localProofDbPromise=new Promise((resolve,reject)=>{
  let req;try{req=root.indexedDB.open('sags-radio-photo-local-v22',1)}catch(e){reject(e);return}
  req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('photos'))db.createObjectStore('photos',{keyPath:'key'})};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||Error('Không mở được kho ảnh'));
  req.onblocked=()=>reject(Error('Kho ảnh đang mở ở tab khác'));
 }).catch(e=>{localProofDbPromise=null;throw e});
 return localProofDbPromise;
}
async function saveLocalFullProof(uid,code,action,photo,image){
 if(!photo?.at||typeof image!=='string'||image.length>HIGH_PROOF_LIMIT||!/^data:image\/(webp|jpeg);base64,/.test(image))return false;
 const db=await radioProofDb();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('photos','readwrite');
  tx.objectStore('photos').put({key:localProofKey(uid,code,action,photo.at),
   uid,deviceCode:code,action,capturedAtMs:photo.at,storedAtMs:Date.now(),image});
  tx.oncomplete=()=>resolve(true);
  tx.onerror=()=>reject(tx.error||Error('Không lưu được ảnh trên máy'));
  tx.onabort=()=>reject(tx.error||Error('Lưu ảnh trên máy bị hủy'));
 });
}
async function readLocalFullProof(e){
 const user=currentUser(),at=photoAudit(e).deviceMs;
 if(!at||!user.uid||user.uid!==e.actorUid)return '';
 try{
  const db=await radioProofDb(),key=localProofKey(user.uid,e.deviceCode,e.action,at);
  return await new Promise(resolve=>{
   const tx=db.transaction('photos','readonly'),req=tx.objectStore('photos').get(key);
   req.onsuccess=()=>{
    const item=req.result;
    resolve(item?.uid===user.uid&&item?.capturedAtMs===at&&
     typeof item.image==='string'&&/^data:image\/(webp|jpeg);base64,/.test(item.image)?item.image:'');
   };
   req.onerror=()=>resolve('');tx.onabort=()=>resolve('');
  });
 }catch(_){return ''}
}
async function highProofData(e,allowLocal=false){
 if(!e?.id||!e.signature)return e?.signature||'';
 // Only attempt cloud-original fetch for captures taken since its launch;
 // old Firebase events never had an independently archived source file.
 if(navigator.onLine&&e.at?.toMillis?.()>=Date.parse('2026-11-22T00:00:00+07:00')){
  try{
   const vault=await loadRadioPhotoVault();
   const cloud=await vault.read(e.id);
   if(cloud.status==='STORED'&&cloud.data)return cloud.data;
  }catch(error){console.info('Ảnh gốc Supabase chưa sẵn sàng',String(error?.message||error).slice(0,120))}
 }

 const local=allowLocal?await readLocalFullProof(e):'';
 const cached=proofCache.get(e.id);
 if(cached){
  if(local&&local.length>cached.length){localProofIds.add(e.id);return local}
  localProofIds.delete(e.id);return cached
 }
 if(navigator.onLine){
  try{
   const snap=await fs().collection(PROOFS).doc(e.id).get({source:'server'});
   if(snap.metadata?.fromCache)throw Error('Ảnh gốc chưa được Firebase xác nhận.');
   const d=snap.data();
   if(snap.exists&&d?.eventId===e.id&&d?.actorUid===e.actorUid&&d?.deviceCode===e.deviceCode&&
    typeof d.image==='string'&&/^data:image\/(webp|jpeg);base64,/.test(d.image)&&d.image.length<=HIGH_PROOF_LIMIT){
    proofCache.set(e.id,d.image);localProofIds.delete(e.id);
    if(proofCache.size>8)proofCache.delete(proofCache.keys().next().value);
    if(local&&local.length>d.image.length){localProofIds.add(e.id);return local}
    return d.image;
   }
  }catch(error){
   // No global permission-denied flag: an old event must not prevent newer
   // events from loading their correctly authorized full-colour server proof.
   console.info('Radio full-colour proof unavailable',String(error?.code||error?.message||error));
  }
 }
 if(local){localProofIds.add(e.id);return local}
 return e.signature;
}
let proofViewToken=0;
async function viewProof(id){
 let e=(reportReady?reportEvents:events).find(x=>x.id===id);
 if(!e)return notify('Không tìm thấy sự kiện trong lịch sử đang hiển thị. Hãy tải lại lịch sử.',true);
 try{e=await hydrateRangeEvidence(e)}catch(error){return notify('Không thể xem bằng chứng: '+S(error?.message||error),true)}
 if(!e.signature||!/^data:image\/(webp|png|jpeg);base64,/.test(e.signature))return notify('Không có dữ liệu ảnh hợp lệ cho lượt ký này.',true);
 const token=++proofViewToken,box=$('radioProofViewer');
 $('radioProofName').textContent=label(e.deviceCode)+' · '+(ACTS[e.action]||e.action);
 $('radioProofImage').src=e.signature;box.classList.remove('radioProofZoomed');$('radioProofZoom').textContent='🔎 Phóng to';
 $('radioProofQuality').textContent='Đang kiểm tra ảnh chất lượng cao từ Firebase…';
 const check=photoAudit(e);
 $('radioProofTimestamp').textContent='Giờ Firebase: '+(check.serverMs?fmt(new Date(check.serverMs)):'Chưa xác minh')+' · Giờ thiết bị: '+(check.deviceMs?fmt(new Date(check.deviceMs)):'xem trực tiếp trên ảnh')+' · '+check.status+(check.delta!==null?' ('+check.delta+' phút)':'');
 box.hidden=false;
 const data=await highProofData(e,true);
 if(token!==proofViewToken||box.hidden)return;
 $('radioProofImage').src=data;
 $('radioProofQuality').textContent=data===e.signature?
  (root.SAGSRadioPhotoVaultV1?.isPurged(e.id)?'⚠ Ảnh gốc đã tự dọn khi kho gần đầy; ảnh nén Firebase vẫn còn.':'⚠ Chỉ còn ảnh đã nén trên Firebase; không thể khôi phục độ nét đã mất.'):
  root.SAGSRadioPhotoVaultV1?.isOriginal(e.id)?'✓ Ảnh gốc rõ nét từ Supabase, quyền xem xác thực qua Firebase.':
  localProofIds.has(e.id)?
   '📱 Ảnh rõ được lưu tạm trong điện thoại này, CHƯA xác minh trên Firebase. AD ở máy khác vẫn thấy bản nén.':
   '✓ Ảnh rõ đã được xác minh trên Firebase, có thể phóng to đọc mã máy.';
}
function closeProof(){
 ++proofViewToken;const el=$('radioProofViewer');if(el){el.hidden=true;el.classList.remove('radioProofZoomed')}
 const img=$('radioProofImage');if(img)img.removeAttribute('src');
}
function mark(e){const c=$('radioSignature'),r=c.getBoundingClientRect(),x=Math.max(0,Math.min(c.width,Math.round((e.clientX-r.left)*c.width/r.width))),y=Math.max(0,Math.min(c.height,Math.round((e.clientY-r.top)*c.height/r.height)));const points=strokes.at(-1);if(!points||points.length>350)return;points.push([x,y]);paintSignature(c,points,x,y)}
function paintSignature(c,points,x,y){const ctx=c.getContext('2d');ctx.strokeStyle='#123f66';ctx.lineWidth=2.8;ctx.lineCap='round';if(points.length===1){ctx.fillStyle='#123f66';ctx.beginPath();ctx.arc(x,y,1.4,0,Math.PI*2);ctx.fill()}else{const prev=points[points.length-2];ctx.beginPath();ctx.moveTo(prev[0],prev[1]);ctx.lineTo(x,y);ctx.stroke()}}
function clearSignature(){strokes=[];canvasDirty=false;const c=$('radioSignature');if(c)c.getContext('2d').clearRect(0,0,c.width,c.height)}
function signature(){if(!canvasDirty||!strokes.some(a=>a.length>=2))throw Error('Vui lòng ký xác nhận trực tiếp trên màn hình.');const c=$('radioSignature');let v=c.toDataURL('image/webp',0.45);if(!v.startsWith('data:image/webp;base64,')){v=c.toDataURL('image/png')}if(v.length>45000)throw Error('Chữ ký quá lớn. Xóa và ký lại nét ngắn gọn.');return v}
function tab(t){for(const id of ['devices','history','summary']){$('radio'+id[0].toUpperCase()+id.slice(1)+'Tab').hidden=id!==t;const btn=document.querySelector('[data-radio-tab="'+id+'"]');btn?.classList.toggle('selected',t===id)}$('radioPdfChoice').hidden=!canMonitor(currentUser())||t==='devices';$('radioReportControl').hidden=!isAdmin(currentUser())||t==='devices';cancel();if(t==='history'||t==='summary')subscribeHistory();else stopHistory();if(t==='summary')renderSummary()}
function close(){
 if(busy)return;
 // Re-open on the employee-focused view even after AD inspected all devices.
 adminAllDevices=false;radioOnlyUnreturned=false;
 if(radioLiveClock){clearInterval(radioLiveClock);radioLiveClock=null}
 if($('radioAdminDisclosure'))$('radioAdminDisclosure').open=false;
 stopRosterWatch();
 try{closeProof()}catch(e){console.warn('Radio photo viewer close',e)}
 try{stopHistory()}catch(e){console.warn('Radio history close',e)}
 clearShiftReport();
 const el=$('sagsRadioPanel');if(el)el.hidden=true;
 for(const fn of unsubs)try{fn()}catch(e){console.warn('Radio unsubscribe',e)}
 unsubs=[];connected=false;
 try{cancel()}catch(e){console.warn('Radio form cleanup',e)}
 root.dispatchEvent(new Event('sags:ui-ready'));
}
function cancel(){
 resetCamera();choice=null;nativeDraft=null;signingUid='';drawing=false;$('radioAction').hidden=true;clearSignature();
 void showNativeDraft();
}
function radioShiftAt(ms){
 const date=new Date(ms),p=Object.fromEntries(
  new Intl.DateTimeFormat('en-GB',{timeZone:VN,hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
   .formatToParts(date).map(x=>[x.type,x.value]));
 const minute=Number(p.hour)*60+Number(p.minute),am=minute>=510&&minute<=1140;
 const calendarDay=vnDateKey(date);
 const day=minute<510?new Date(Date.parse(calendarDay+'T00:00:00Z')-86400000).toISOString().slice(0,10):calendarDay;
 return {day,shift:am?'AM':'PM',key:day+'/'+(am?'AM':'PM')};
}
function shiftBounds(day,which){
 const start=new Date(day+'T'+(which==='AM'?'08:30:00':'19:01:00')+'+07:00');
 const end=new Date(start.getTime()+(which==='AM'?631:809)*60000);
 return {start,end,startMs:start.getTime(),endMs:end.getTime()};
}
function shift(){return radioShiftAt(Date.now()).shift}
// The physical receipt timestamp never determines which duty the radio is for.
// Early evening receipts may belong to either shift. Keep the historical official
// shift boundaries separate from the user-confirmed custody shift.
function radioCustodyDuty(ms,selected){
 const clock=radioShiftAt(ms),which=['AM','PM'].includes(S(selected))?S(selected):clock.shift;
 if(which===clock.shift)return clock;
 const day=vnDateKey(new Date(ms)),minute=Number(new Intl.DateTimeFormat('en-GB',{timeZone:VN,hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
  .formatToParts(new Date(ms)).find(p=>p.type==='hour')?.value||0)*60+
  Number(new Intl.DateTimeFormat('en-GB',{timeZone:VN,minute:'2-digit'}).formatToParts(new Date(ms)).find(p=>p.type==='minute')?.value||0);
 const dutyDay=which==='PM'&&minute<510?radioDayAdd(day,-1):day;
 return {day:dutyDay,shift:which,key:dutyDay+'/'+which};
}
function radioCustodyDue(ms,selected){
 if(!ms)return 0;
 const duty=radioCustodyDuty(ms,selected);
 return shiftBounds(duty.day,duty.shift).endMs;
}
function radioPreselectShift(ms=Date.now()){
 const part=new Intl.DateTimeFormat('en-GB',{timeZone:VN,hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
  .formatToParts(new Date(ms));
 const hm=Object.fromEntries(part.map(p=>[p.type,p.value]));
 const minute=Number(hm.hour)*60+Number(hm.minute);
 // The handover period is intentionally not a hard cutoff: user selects.
 return minute>=16*60&&minute<=19*60?'':radioShiftAt(ms).shift;
}
function heldBy(uid){return devices.filter(d=>d.status==='OUT'&&d.holderUid===uid)}
// Visibility is intentionally separate from Firestore custody authorization.
// READY, CHARGING and FAULT with no holder remain available, but LOST never does.
function radioVisibleDevices(list,uid,admin=false,showAll=false){
 if(admin&&showAll)return list;
 const mine=list.filter(d=>d.status==='OUT'&&d.holderUid===uid&&!!uid);
 return mine.length?mine:list.filter(radioIssueable);
}
async function start(action,code){
 if(busy)return;
 const u=currentUser(),d=devices.find(x=>x.code===code);
 if(!u.uid||!d)return notify('Cần đăng nhập và chọn máy hợp lệ.',true);
 if(!connected||!navigator.onLine)return notify('Chưa kết nối Firebase. Không thể ký nhận khi chưa đồng bộ trạng thái máy.',true);
 if(action==='ISSUE'&&heldBy(u.uid).length)return notify('Bạn đang giữ '+heldBy(u.uid).map(x=>label(x.code)).join(', ')+'. Phải ký trả máy đang giữ trước khi nhận máy khác.',true);
 if(action==='SWAP_OUT'&&heldBy(u.uid).some(x=>x.code!==code))return notify('Bạn đang giữ bộ đàm khác. Phải trả máy đó trước khi đổi máy.',true);
 if(action==='RELEASE'&&!isAdmin(u))return notify('Chỉ AD được xác nhận đã xử lý thông tin lỗi.',true);
 if(['RETURN','SWAP_OUT'].includes(action)&&d.holderUid!==u.uid&&!isAdmin(u))return notify('Máy đang được người khác sử dụng; chỉ chủ máy hoặc AD được trả.',true);
 if(nativeMode(action)){
  setBusy(true);
  try{
   const pending=await readNativeDraft(u.uid);
   if(pending){notify('Còn bản nháp chưa đồng bộ. Chọn Tiếp tục ký nhận/trả hoặc Bỏ bản nháp.',true);return}
  }catch(e){notify(draftError(e),true);return}
  finally{setBusy(false)}
  if(currentUser().uid!==u.uid||$('sagsRadioPanel').hidden)return;
 }
 if(!showSigningForm(action,d,u))return;
 if(needsPhoto(action)&&!nativeMode(action))void startCamera('old');
}
function showSigningForm(action,d,u){
 const code=d.code;
 resetCamera();mode=action;choice=d;nativeDraft=null;signingUid=u.uid;clearSignature();
 $('radioActionCode').value=label(code);$('radioPerson').value=u.name+' · '+u.uid.slice(0,8);
 $('radioShift').value=action==='ISSUE'?radioPreselectShift():['AM','PM'].includes(S(d.shift))?S(d.shift):shift();
 $('radioShift').disabled=action!=='ISSUE';
 $('radioShiftHint').textContent=action==='ISSUE'?'Chọn ca thực sự sử dụng máy. Nhận trước giờ vào ca vẫn thuộc ca đã chọn; giờ ký ghi từ Firebase.':'Ca của lượt nhận ban đầu được giữ nguyên khi trả hoặc đổi máy.';
 $('radioReason').value='BATTERY_EMPTY';$('radioReason').querySelector('option[value=LOST]').disabled=action==='SWAP_OUT';$('radioReturnReason').value='END_SHIFT';$('radioDetail').value='';
 $('radioActionTitle').textContent=(action==='RELEASE'?'AD xác nhận đã xử lý thông tin lỗi':ACTS[action]||'Báo cáo')+' · '+label(code);
 $('radioDetail').placeholder=action==='RELEASE'?
  'Ghi kết quả kiểm tra: pin, sóng phát/thu, loa, mic/PTT; máy thất lạc phải xác nhận thu hồi.':
  'Ghi cụ thể hiện tượng, thời gian, vị trí…';
 $('radioReasonWrap').hidden=!['REPORT','SWAP_OUT'].includes(action);$('radioReturnReasonWrap').hidden=action!=='RETURN';
 $('radioSwapWrap').hidden=action!=='SWAP_OUT';
 $('radioSigWrap').hidden=action==='RELEASE'||needsPhoto(action);
 const available=devices.filter(x=>radioIssueable(x)&&x.code!==code);
 $('radioSwapTarget').innerHTML=available.map(x=>'<option value="'+esc(x.code)+'">'+esc(label(x.code)+(hasRadioWarning(x)?' · Có cảnh báo':''))+'</option>').join('');
 if(action==='SWAP_OUT'&&!available.length){
  notify('Không còn bộ đàm khác có thể đổi. Kiểm tra máy chưa được giao và thử lại.',true);
  return false;
 }
 $('radioCameraVideo').hidden=nativeMode(action);
 $('radioAction').hidden=false;updatePhotoUI();$('radioAction').scrollIntoView({behavior:'smooth',block:'start'});
 return true;
}
function badge(state){return '<span class="radioStatus radioStatus-'+state+'">'+(STATUSES[state]||state)+'</span>'}

function rosterLogin(v){return S(v).normalize('NFKC').toUpperCase().replace(/\s+/g,'')}
function rosterDutyShift(x){
 const direct=S(x.dutyShift||x.workShift||x.rosterShift||x.shiftCode||x.shift).toUpperCase();
 if(['AM','SANG','SÁNG','MORNING'].includes(direct))return 'AM';
 if(['PM','TOI','TỐI','EVENING','CHIEU','CHIỀU'].includes(direct))return 'PM';
 // A flight STA/STD is not a staff-duty shift. Ambiguous 16:00–19:00
 // handover starts cannot be inferred without an explicit roster shift.
 for(const key of ['dutyStart','shiftStart','startShift']){
  const m=S(x[key]).match(/^([01]?\d|2[0-3]):?([0-5]\d)(?:\+\d+)?$/);
  if(m){
   const minute=Number(m[1])*60+Number(m[2]);
   if(minute>=16*60&&minute<=19*60)return '';
   return minute>=510&&minute<=1140?'AM':'PM';
  }
 }
 return '';
}
function reconcileRoster(items,users,machines,history,day,which,now=Date.now()){
 const roster=new Set(),undated=new Set(),issued=new Set(),bounds=shiftBounds(day,which),
 start=bounds.startMs,end=bounds.endMs;
 for(const x of items){
  if(!x||x.active===false||x.duplicateInactive===true||!S(x.flightId||x.flightRaw||x.flightName))continue;
  const names=S(x.user||x.targetUser).split(/[\/;,]+/).map(rosterLogin).filter(Boolean),sh=rosterDutyShift(x);
  for(const n of names){if(sh===which)roster.add(n);else if(!sh)undated.add(n)}
 }
 for(const x of history){const ms=x.at?.toMillis?.();if(ms&&['ISSUE','SWAP_IN'].includes(x.action)&&radioCustodyDuty(ms,x.shift).key===day+'/'+which)issued.add(S(x.personUid));}
 const result={total:roster.size,missing:[],unreturned:[],holding:[],completed:[],unmapped:[],upcoming:[],undated:[...undated].filter(x=>!roster.has(x))};
 for(const name of roster){
  const uid=users.get(name),held=uid?machines.filter(d=>d.status==='OUT'&&d.holderUid===uid):[];
  if(!uid)result.unmapped.push(name);
  else if(held.length){
   const summary=name+' · '+held.map(d=>label(d.code)).join(', ');
   if(now>=end&&held.some(d=>radioHeldSince(d)?.toMillis?.()&&radioCustodyDuty(radioHeldSince(d).toMillis(),d.shift).key===day+'/'+which))result.unreturned.push(summary);else result.holding.push(summary);
  }else if(issued.has(uid))result.completed.push(name);
  else if(now<start)result.upcoming.push(name);
  else result.missing.push(name);
 }
 return result;
}
function renderRosterAlert(){
 const el=$('radioRosterAlert');if(!el||!canMonitor(currentUser()))return;
 if(rosterBusy){el.textContent='Đang đối chiếu dữ liệu máy chủ…';return}
 if(!rosterReady){el.textContent='Chưa xác minh roster, tài khoản và lịch sử. Không báo thiếu khi chưa đủ dữ liệu.';return}
 const day=S($('radioRosterDate').value),which=S($('radioRosterShift').value),
  r=reconcileRoster(rosterRows,rosterAccounts,devices,rosterAudit,day,which),
  cards=[['Có tên trong roster',r.total],['Chưa nhận',r.missing.length],['Chưa trả (hết ca)',r.unreturned.length],['Đang giữ',r.holding.length],['Đã nhận và xử lý',r.completed.length],['Chưa rõ tài khoản',r.unmapped.length]],
  sections=[['Chưa nhận',r.missing],['Chưa trả',r.unreturned],['Đang giữ',r.holding],['Chưa rõ tài khoản',r.unmapped]];
 el.innerHTML='<div class="radioRosterStats">'+cards.map(([t,n])=>'<div><b>'+n+'</b><span>'+esc(t)+'</span></div>').join('')+'</div>'+
 '<p class="radioRosterCaption">'+esc(day)+' · Ca '+(which==='AM'?'sáng':'tối')+(rosterTime?' · Đổ roster gần nhất: '+esc(fmt(new Date(rosterTime))):'')+'</p>'+
 sections.map(([t,n])=>n.length?'<div class="radioRosterGroup"><strong>'+esc(t)+' ('+n.length+')</strong><p>'+n.map(esc).join(' · ')+'</p></div>':'').join('')+
 (r.undated.length?'<p class="radioRosterWarning">⚠ '+r.undated.length+' tên chưa rõ giờ/ca, không tính vào AM/PM để tránh báo sai.</p>':'')+
 '<p class="radioAdminFoot">Roster tích lũy: mỗi người chỉ đếm một lần trong một ca. Chưa nhận = chưa có lượt nhận trong ca và hiện không giữ máy. Chưa trả = hết ca mà vẫn giữ máy của ca đó. Người đã nhận rồi trả không bị báo thiếu.</p>';
}
function stopRosterWatch(){
 ++rosterGen;if(rosterTimer)clearTimeout(rosterTimer);rosterTimer=null;
 if(rosterRef&&rosterCb)try{rosterRef.off('value',rosterCb)}catch(_){}
 rosterRef=null;rosterCb=null;rosterDate='';rosterReady=false;rosterBusy=false;
}
function queueRosterAudit(ms=1000){
 if(!rosterDate||!isAdmin(currentUser()))return;
 if(rosterTimer)clearTimeout(rosterTimer);
 rosterTimer=setTimeout(()=>{rosterTimer=null;void refreshRosterAudit()},ms);
}
function watchRoster(){
 stopRosterWatch();
 if(!isAdmin(currentUser())||$('sagsRadioPanel')?.hidden)return;
 const day=S($('radioRosterDate')?.value);
 if(!/^\d{4}-\d\d-\d\d$/.test(day)||!['AM','PM'].includes(S($('radioRosterShift')?.value))||typeof root.sagsV470Ref!=='function')return renderRosterAlert();
 try{
  rosterDate=day;const gen=rosterGen;rosterRef=root.sagsV470Ref('roster_manifests/'+day);
  rosterCb=snap=>{
   if(gen!==rosterGen)return;
   const packet=snap.val()||{};rosterRows=Object.values(packet.items||{});
   rosterTime=Number(packet.updatedAtMs||packet.publishedAtMs||Math.max(0,...rosterRows.map(x=>Number(x?.updatedAtMs||x?.importedAtMs||0))))||0;
   rosterReady=false;queueRosterAudit(200);
  };
  rosterRef.on('value',rosterCb,()=>{rosterReady=false;renderRosterAlert()});
 }catch(_){rosterReady=false;renderRosterAlert()}
}
async function refreshRosterAudit(){
 if(!isAdmin(currentUser())||!rosterDate||!connected||!navigator.onLine)return renderRosterAlert();
 if(rosterBusy){queueRosterAudit(1700);return}
 const day=rosterDate,gen=rosterGen;rosterBusy=true;rosterReady=false;renderRosterAlert();
 try{
  const {start,end}=radioReportFetchBounds(day,S($('radioRosterShift').value));
  const [u,e]=await Promise.all([
   fs().collection('users').get({source:'server'}),
   fs().collection(EVENTS).where('at','>=',start).where('at','<',end).orderBy('at','asc').limit(REPORT_LIMIT).get({source:'server'})
  ]);
  if(gen!==rosterGen||!isAdmin(currentUser()))return;
  if(e.docs.length>=REPORT_LIMIT)throw Error('Trên 300 sự kiện: không đối chiếu với dữ liệu thiếu.');
  rosterAccounts=new Map(u.docs.filter(d=>d.data().active!==false).map(d=>[rosterLogin(d.data().username),d.id]));
  const selectedShift=S($('radioRosterShift').value);
  rosterAudit=e.docs.map(d=>d.data()).filter(x=>radioReportEventDuty(x).key===day+'/'+selectedShift);rosterReady=true;
 }catch(e){if(gen!==rosterGen)return;rosterReady=false;notify('Không đối chiếu được roster: '+errText(e),true)}
 finally{if(gen===rosterGen){rosterBusy=false;renderRosterAlert()}}
}
function renderAdminOverview(){
 const panel=$('radioAdminOverview'),target=$('radioAdminDashboard');
 if(!panel||!target)return;
 const admin=canMonitor(currentUser());panel.hidden=!admin;
 const roster=$('radioRosterMonitor');
 if(roster){roster.hidden=!isAdmin(currentUser());roster.style.display=isAdmin(currentUser())?'':'none';}
 if(!admin){target.replaceChildren();return}
 const now=Date.now(),holds=devices.filter(d=>d.status==='OUT'),
  needs=devices.filter(hasRadioWarning),
  overdue=holds.filter(d=>{const at=radioHeldSince(d)?.toMillis?.()||0;return !!at&&now>=radioCustodyDue(at,d.shift)});
 const hour=d=>radioHeldSince(d)?.toDate?.()?fmt(radioHeldSince(d).toDate()):'Đang đồng bộ';
 const holdItems=holds.length?holds.map(d=>{
  const late=overdue.includes(d);
  return '<li><div><strong>'+esc(label(d.code))+'</strong><span>'+esc(d.holderName||d.holderUid||'Chưa rõ người giữ')+'</span><small>'+esc(d.shift==='AM'?'Ca sáng':d.shift==='PM'?'Ca tối':'Chưa rõ ca')+' · Nhận/đổi gần nhất: '+esc(hour(d))+'</small></div>'+(late?'<em class="radioAdminWarn">Chưa trả ca trước</em>':'<em class="radioAdminNormal">Đang giữ</em>')+'</li>'
 }).join(''):'<li class="radioAdminEmpty">Không có máy đang được ghi nhận sử dụng.</li>';
 const needItems=needs.length?needs.map(d=>'<li><div><strong>'+esc(label(d.code))+'</strong><span>'+esc(STATUSES[d.status]||d.status)+'</span><small>'+esc(REASON_TEXT[d.faultCode]||d.faultDetail||'Cần xác nhận tình trạng thực tế')+'</small></div><em class="radioAdminWarn">Theo dõi</em></li>').join(''):'<li class="radioAdminEmpty">Không có máy lỗi, mất hoặc đang sạc.</li>';
 target.innerHTML='<div class="radioAdminHighlights"><div><strong>'+holds.length+'</strong><span>Đang có người giữ</span></div><div><strong>'+overdue.length+'</strong><span>Chưa trả sau chuyển ca</span></div><div><strong>'+needs.length+'</strong><span>Có thông tin cần theo dõi</span></div></div>'+
  '<div class="radioAdminColumns"><div class="radioAdminPanel"><h4>Người đang giữ máy <small>'+holds.length+' máy</small></h4><ul>'+holdItems+'</ul></div>'+
  '<div class="radioAdminPanel"><h4>Máy cần theo dõi <small>'+needs.length+' máy</small></h4><ul>'+needItems+'</ul></div></div>'+
  '<p class="radioAdminFoot"><b>Ghi nhận thông tin:</b> bộ đàm có báo lỗi vẫn được nhận, trả, đổi và sử dụng; lỗi chỉ phục vụ theo dõi, thống kê. Máy thất lạc (LOST) cần xác minh có máy thực tế trước khi bàn giao. AD xác nhận đã xử lý ghi nhận, không phải mở khóa cấp phát.</p>'+
 '<p class="radioAdminFoot">Nhắc nhở ký trả bộ đàm khi chuyển ca (không khóa nhận/mở chuyến): ca sáng kết thúc 19:00, ca tối kết thúc 08:29 hôm sau (giờ Việt Nam).</p>';
}

function renderOverdueAlert(nowMs=Date.now()){
 const el=$('radioOverdueAlert');if(!el)return;
 if(!isAdmin(currentUser())){el.hidden=true;el.replaceChildren();return}
 el.hidden=false;
 if(!connected||!navigator.onLine){
  el.innerHTML='<p class="radioLiveNotice">⚠ Chưa xác minh trạng thái bộ đàm trực tuyến; không kết luận đã trả hay chưa trả.</p>';return;
 }
 const all=radioLiveCustody(devices,nowMs),overdue=all.filter(d=>d.overdue);
 const lines=overdue.slice(0,5).map(d=>'<li><strong>'+esc(d.personName)+'</strong> · '+
  esc(label(d.deviceCode))+' · quá '+esc(radioDelayText(nowMs-d.dueMs))+
  ' <small>(nhận '+(d.receivedAtMs?esc(fmt(new Date(d.receivedAtMs))):'chưa rõ giờ')+')</small></li>').join('');
 el.innerHTML='<div class="radioLiveTop"><div><strong>'+(
  overdue.length?'🚩 '+overdue.length+' máy đã quá ca chưa trả':'✓ Không có máy quá ca chưa trả')+
  '</strong><small>'+all.length+' máy đang được giữ · cập nhật từ Firebase khi thay đổi và tự tính lại thời gian mỗi phút</small></div>'+
  '<button type="button" data-radio-overdue-show>Chỉ xem chưa trả ('+all.length+')</button></div>'+
  (overdue.length?'<ol class="radioLiveOverdueList">'+lines+'</ol>'+
   (overdue.length>5?'<small class="radioLiveNotice">Còn '+(overdue.length-5)+' máy quá ca, bấm để xem đầy đủ.</small>':''):'');
}

function render(){
 if(!$('radioDeviceList'))return;
 const u=currentUser(),admin=canMonitor(u),administrator=isAdmin(u),held=heldBy(u.uid),
  free=devices.filter(radioIssueable),allDevices=admin&&adminAllDevices,
  active=administrator&&radioOnlyUnreturned,liveHolds=active?radioLiveCustody(devices):[],
  visible=active?liveHolds.map(x=>devices.find(d=>d.code===x.deviceCode)).filter(Boolean):radioVisibleDevices(devices,u.uid,admin,adminAllDevices);
 $('radioSeed').hidden=!connected||!administrator||INIT.every(code=>devices.some(x=>x.code===code));
 const adminToggle=$('radioAdminAll');adminToggle.hidden=!admin;
 const pendingToggle=$('radioOnlyUnreturned');pendingToggle.hidden=!administrator;
 pendingToggle.setAttribute('aria-pressed',String(active));
 pendingToggle.textContent=active?'✓ Đang xem máy chưa trả ('+liveHolds.length+')':'🚩 Chỉ xem chưa trả ('+devices.filter(d=>d.status==='OUT').length+')';
 adminToggle.textContent=allDevices?'Ẩn danh mục đầy đủ':'Xem toàn bộ máy';
 adminToggle.setAttribute('aria-pressed',String(allDevices));
 const adminDisclosure=$('radioAdminDisclosure');if(adminDisclosure)adminDisclosure.hidden=!admin;
 const title=$('radioDevicesTitle');
 title.textContent=active?'Những máy chưa trả · '+liveHolds.length+' máy':allDevices?'Danh mục quản lý · '+devices.length+' máy':
  held.length?'Máy tôi đang sử dụng · '+held.length+' máy':
  'Máy còn trống · '+free.length+' máy';
 $('radioStats').innerHTML=
  '<div><strong>'+free.length+'</strong><small>Máy còn trống</small></div>'+
  '<div><strong>'+held.length+'</strong><small>Tôi đang giữ</small></div>';
 renderAdminOverview();renderRosterAlert();renderOverdueAlert();
 const list=$('radioDeviceList');
 list.classList.toggle('radioManageAll',!!(allDevices||active));
 list.innerHTML=!connected?
  '<p class="radioEmpty">Đang xác nhận Firebase. Cần kết nối trực tuyến để ký nhận hoặc trả máy.</p>':
  visible.length?visible.map(d=>{
   const mine=d.status==='OUT'&&d.holderUid===u.uid,buttons=[];
   if(radioIssueable(d)&&!held.length)buttons.push(['ISSUE','Ký nhận máy']);
   if(radioIssueable(d)&&!held.length)buttons.push(['REPORT','Báo lỗi']);
   if(d.status==='OUT'&&(mine||administrator&&(allDevices||active)))
    buttons.push(['RETURN','Ký trả máy'],['SWAP_OUT','Đổi máy'],['REPORT','Báo lỗi']);
   if(administrator&&allDevices&&hasRadioWarning(d))
    buttons.push(['RELEASE',d.status==='LOST'||d.faultCode==='LOST'?'Xác nhận tìm thấy':'Xác nhận đã xử lý']);
   const nowMs=Date.now(),heldAtMs=radioHeldSince(d)?.toMillis?.()||0;
   const {dueMs=0}=liveHolds.find(x=>x.deviceCode===d.code)||{};
   const overText=active&&heldAtMs?(dueMs&&nowMs>=dueMs?' · <strong class="radioOverdue">QUÁ CA '+esc(radioDelayText(nowMs-dueMs))+'</strong>':' · Đang trong ca')+( ' · Nhận: '+esc(fmt(new Date(heldAtMs)))):'';
   const status=(d.status==='OUT'?'Đang giữ: '+esc(d.holderName||d.holderUid?.slice(0,8)||'—')+overText:'')+
    (d.faultCode?' · Lỗi ghi nhận: '+esc(REASON_TEXT[d.faultCode]||d.faultCode):'')+
    (d.faultDetail?' · '+esc(d.faultDetail):'');
   return '<article class="radioDevice'+(mine?' radioDeviceMine':'')+'"><div><strong>'+
    esc(label(d.code))+'</strong>'+badge(d.status)+(status?'<small>'+status+'</small>':'')+
    '</div><div class="radioButtons">'+buttons.map(([a,n])=>
     '<button type="button" data-radio-act="'+a+'" data-radio-code="'+esc(d.code)+'">'+n+'</button>'
    ).join('')+'</div></article>';
  }).join(''):
  '<p class="radioEmpty">'+(held.length?'Chưa tìm thấy bộ đàm đang giữ. Hãy tải lại trạng thái.':
   active?'Không có máy nào đang được giữ.':allDevices?'Chưa có bộ đàm. AD hãy khởi tạo danh mục.':
   devices.length?'Hiện không có bộ đàm nào còn trống để ký nhận.':'Chưa có danh mục máy; AD cần khởi tạo.')+'</p>';
 renderHistory();if(!$('radioSummaryTab')?.hidden)renderSummary();
}
function vnDateKey(date){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:VN,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).map(x=>[x.type,x.value]));
 return parts.year+'-'+parts.month+'-'+parts.day;
}
function radioDayAdd(day,offset){return new Date(Date.parse(day+'T00:00:00Z')+offset*86400000).toISOString().slice(0,10)}
function radioValidDay(day){return /^\d{4}-\d\d-\d\d$/.test(day)&&!Number.isNaN(Date.parse(day+'T00:00:00Z'))&&radioDayAdd(day,0)===day}
function radioRangeBounds(from,to){
 const start=shiftBounds(from,'AM').start,end=shiftBounds(radioDayAdd(to,1),'AM').start;
 return {start,end,startMs:start.getTime(),endMs:end.getTime()};
}
function syncRadioReportMode(){
 const range=isAdmin(currentUser())&&$('radioReportMode')?.value==='RANGE';
 $('radioReportModeWrap').hidden=!isAdmin(currentUser());
 $('radioShiftInputs').hidden=range;$('radioRangeInputs').hidden=!range;
}
function applyRadioRangePreset(preset){
 const today=vnDateKey(new Date());
 $('radioRangeTo').value=today;
 $('radioRangeFrom').value=preset==='month'?today.slice(0,8)+'01':radioDayAdd(today,preset==='30'?-29:-6);
}
// Query a broad civil-date window; then classify every receipt by the explicitly
// confirmed duty rather than discarding night-duty receipts signed before 19:01.
// Keep shiftBounds() unchanged: 08:30/19:01 remain the official duty boundaries.
function radioReportFetchBounds(day,which){
 const start=new Date(day+'T00:00:00+07:00');
 const end=new Date(radioDayAdd(day,1)+'T'+(which==='PM'?'08:30:00':'00:00:00')+'+07:00');
 return {start,end,startMs:start.getTime(),endMs:end.getTime()};
}
function radioReportEventDuty(e){
 const at=e?.at?.toMillis?.()||0;
 return at?radioCustodyDuty(at,e.shift):{key:''};
}
function reportScope(){
 return reportMode==='RANGE'
  ?reportFrom+' – '+reportTo+' · cả ca sáng/tối (giờ VN)'
  :reportDate+' · '+(reportShift==='AM'?'Ca sáng 08:30–19:00':'Ca tối 19:01–08:29 hôm sau')+' (giờ VN)';
}
function reportFileToken(){return reportMode==='RANGE'?reportFrom+'-DEN-'+reportTo:reportDate+'-'+reportShift}
function clearShiftReport(){
 reportToken++;reportReady=false;reportLoading=false;reportVerified=false;reportEvents=[];reportDate='';reportShift='AM';reportMode='SHIFT';reportFrom='';reportTo='';reportAsOfMs=0;
 const x=$('radioReportState');if(x)x.textContent='Chọn phạm vi rồi tải báo cáo từ Firebase để xác minh đủ dữ liệu.';
 for(const id of ['radioReportLoad','radioRangeLoad']){const b=$(id);if(b)b.disabled=false;}
}
async function loadShiftReport(){
 if(!canMonitor(currentUser()))return notify('Chỉ AD và Quản lý bộ đàm được tải báo cáo toàn bộ ca.',true);
 if(reportLoading||!connected||!navigator.onLine)return notify('Cần mạng và Firebase trực tuyến để tải báo cáo theo ca.',true);
 const day=S($('radioReportDate')?.value),shift=S($('radioReportShift')?.value);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!['AM','PM'].includes(shift)||new Date(day+'T00:00:00+07:00').toString()==='Invalid Date')return notify('Chọn đúng ngày và ca để tải.',true);
 const today=vnDateKey(new Date());if(day>today)return notify('Không thể xuất báo cáo cho ngày trong tương lai.',true);
 const token=++reportToken;reportLoading=true;reportReady=false;reportVerified=false;reportEvents=[];
 $('radioReportLoad').disabled=true;$('radioReportState').textContent='Đang lấy dữ liệu ngày '+day+' từ Firebase. Không sử dụng dữ liệu cache…';
 try{
  const {start,end}=radioReportFetchBounds(day,shift),db=fs();
  const rows=await db.collection(EVENTS).where('at','>=',start).where('at','<',end).orderBy('at','asc').limit(REPORT_LIMIT).get({source:'server'});
  if(token!==reportToken||!canMonitor(currentUser()))return;
  if(rows.docs.length>=REPORT_LIMIT)throw Error('Ca có trên 300 sự kiện. Không xuất báo cáo thiếu dữ liệu; cần chia nhỏ hoặc xuất từ máy chủ.');
  reportEvents=rows.docs.map(d=>({id:d.id,...d.data()})).filter(e=>radioReportEventDuty(e).key===day+'/'+shift)
   .sort((a,b)=>(b.at?.toMillis?.()||0)-(a.at?.toMillis?.()||0));
  reportDate=day;reportShift=shift;reportMode='SHIFT';reportFrom='';reportTo='';reportAsOfMs=Date.now();reportReady=true;reportVerified=true;
  $('radioHistoryDevice').value='';$('radioHistoryAction').value='';$('radioHistorySearch').value='';
  const count=reportEvents.length; // server-verified timestamp + explicitly confirmed duty
  $('radioReportState').textContent='✓ '+reportScope()+': '+count+' sự kiện thuộc ca đã đăng ký (bao gồm nhận máy sớm).';
  notify('Đã tải đủ '+count+' sự kiện của '+reportScope()+'. Chọn kèm ảnh (AD) nếu cần đối chiếu.',false);
 }catch(e){
  if(token!==reportToken)return;
  reportEvents=[];reportReady=false;reportVerified=false;reportDate='';reportAsOfMs=0;
  $('radioReportState').textContent='⚠ Không lấy được báo cáo: '+S(e?.message||e);
  notify('Chưa thể xuất báo cáo ca: '+errText(e),true);
 }finally{
  if(token===reportToken){reportLoading=false;$('radioReportLoad').disabled=false;renderHistory();renderSummary()}
 }
}

async function loadRangeReport(){
 if(!isAdmin(currentUser()))return notify('Chỉ AD được xuất báo cáo bộ đàm theo khoảng ngày.',true);
 if(reportLoading||!connected||!navigator.onLine)return notify('Cần mạng và Firebase trực tuyến để tải khoảng ngày.',true);
 const from=S($('radioRangeFrom')?.value),to=S($('radioRangeTo')?.value),today=vnDateKey(new Date());
 if(!radioValidDay(from)||!radioValidDay(to)||from>to)return notify('Chọn Từ ngày và Đến ngày hợp lệ, theo thứ tự tăng dần.',true);
 if(to>today)return notify('Không được chọn ngày kết thúc ở tương lai.',true);
 const days=(Date.parse(to+'T00:00:00Z')-Date.parse(from+'T00:00:00Z'))/86400000+1;
 if(days>RANGE_MAX_DAYS)return notify('Mỗi lần chọn tối đa 31 ngày. Hãy chia thành hai báo cáo.',true);
 const token=++reportToken;reportLoading=true;reportReady=false;reportVerified=false;reportEvents=[];
 $('radioRangeLoad').disabled=true;$('radioReportState').textContent='Đang tải '+days+' ngày / '+(days*2)+' ca từ Firebase…';
 try{
  const {start,end,startMs,endMs}=radioRangeBounds(from,to),db=fs(),all=[];
  let cursor=null;
  while(true){
   let query=db.collection(EVENTS).where('at','>=',start).where('at','<',end).orderBy('at','asc').limit(RANGE_BATCH_SIZE);
   if(cursor)query=query.startAfter(cursor);
   const page=await query.get({source:'server'});
   if(token!==reportToken||!isAdmin(currentUser()))return;
   if(page.metadata?.fromCache)throw Error('Firebase trả dữ liệu cache; báo cáo chưa được xác minh trực tuyến.');
   for(const doc of page.docs){
    const data=doc.data(),at=data.at?.toMillis?.()||0;
    if(!at||at<startMs||at>=endMs)throw Error('Phát hiện sự kiện thiếu giờ xác nhận Firebase.');
    // Keep compact history in memory: fetch photo evidence only when requested.
    all.push({id:doc.id,...data,hasSignature:!!data.signature,signature:''});
   }
   if(all.length>RANGE_MAX_EVENTS)throw Error('Khoảng này vượt 2.400 sự kiện; hãy chia nhỏ ngày để không xuất thiếu dữ liệu.');
   $('radioReportState').textContent='Đang tải khoảng ngày: '+all.length+' sự kiện đã xác minh…';
   if(page.docs.length<RANGE_BATCH_SIZE)break;
   cursor=page.docs[page.docs.length-1];
  }
  if(token!==reportToken||!isAdmin(currentUser()))return;
  reportEvents=all.reverse();reportMode='RANGE';reportFrom=from;reportTo=to;reportDate='';reportAsOfMs=Date.now();reportReady=true;reportVerified=true;
  $('radioHistoryDevice').value='';$('radioHistoryAction').value='';$('radioHistorySearch').value='';
  $('radioReportState').textContent='✓ Đã tải đủ '+all.length+' sự kiện từ '+from+' đến '+to+' ('+(days*2)+' ca, Firebase trực tuyến).';
  notify('Đã xác minh '+all.length+' sự kiện trong '+days+' ngày. Có thể xuất PDF không ảnh hoặc kèm ảnh.',false);
 }catch(e){
  if(token!==reportToken)return;
  reportEvents=[];reportReady=false;reportVerified=false;reportMode='SHIFT';reportFrom='';reportTo='';reportAsOfMs=0;
  $('radioReportState').textContent='⚠ Không thể tải đủ khoảng ngày: '+S(e?.message||e);
  notify('Không xuất báo cáo thiếu dữ liệu: '+errText(e),true);
 }finally{
  if(token===reportToken){reportLoading=false;$('radioRangeLoad').disabled=false;renderHistory();renderSummary()}
 }
}
async function hydrateRangeEvidence(e){
 if(reportMode!=='RANGE'||!e?.hasSignature||e.signature)return e;
 const snap=await fs().collection(EVENTS).doc(e.id).get({source:'server'});
 if(!snap.exists||snap.metadata?.fromCache)throw Error('Chưa xác minh được ảnh/chữ ký sự kiện '+e.id+' từ Firebase.');
 const data=snap.data()||{};
 if(data.actorUid!==e.actorUid||data.deviceCode!==e.deviceCode||data.at?.toMillis?.()!==e.at?.toMillis?.())
  throw Error('Thông tin sự kiện đã thay đổi: '+e.id+'. Vui lòng tải báo cáo lại.');
 return {...e,signature:data.signature||''};
}
function filteredHistory(){
 const now=Date.now(),device=S($('radioHistoryDevice')?.value),action=S($('radioHistoryAction')?.value),search=S($('radioHistorySearch')?.value).toLocaleLowerCase('vi-VN');
 const date=d=>new Intl.DateTimeFormat('en-CA',{timeZone:VN,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
 return (reportReady?reportEvents:events).filter(e=>{
  const at=e.at?.toMillis?.()||0;
  if(reportReady){
   if(reportMode==='RANGE'){const {startMs,endMs}=radioRangeBounds(reportFrom,reportTo);if(!at||at<startMs||at>=endMs)return false}
   else if(!at||radioReportEventDuty(e).key!==reportDate+'/'+reportShift)return false;
  }
  if(!reportReady&&dateFilter==='today'&&(!at||date(new Date(at))!==date(new Date(now))))return false;
  if(!reportReady&&dateFilter==='week'&&(!at||at<now-7*86400000))return false;
  if(device&&e.deviceCode!==device)return false;
  if(action&&e.action!==action)return false;
  if(search&&![e.actorName,e.actorUid,e.deviceCode,e.details,ACTS[e.action],REASON_TEXT[e.reasonCode]].join(' ').toLocaleLowerCase('vi-VN').includes(search))return false;
  return true;
 });
}
function renderHistory(){
 const wrap=$('radioHistoryList');if(!wrap)return;
 const sel=$('radioHistoryDevice'),codes=[...new Set((reportReady?reportEvents:events).map(e=>e.deviceCode).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi',{numeric:true})),key=codes.join('|');
 if(sel&&sel.dataset.codes!==key){const old=sel.value;sel.innerHTML='<option value="">Tất cả máy</option>'+codes.map(x=>'<option value="'+esc(x)+'">'+esc(label(x))+'</option>').join('');sel.value=codes.includes(old)?old:'';sel.dataset.codes=key}
 const rows=filteredHistory(),meta=$('radioHistoryMeta');
 if(meta)meta.textContent=rows.length+' sự kiện phù hợp | '+rows.filter(e=>!!e.signature||e.hasSignature).length+' có ảnh/chữ ký | '+rows.filter(e=>/^data:image\/png;base64,/.test(S(e.signature))).length+' ảnh PNG dự phòng (có thể mờ; AD cần xác minh quy tắc JPEG trên Firebase) | '+(reportReady?reportScope()+' · Đã kiểm tra máy chủ':events.length>=120?'Lịch sử gần đây, không dùng làm báo cáo đầy đủ theo ngày.':'Lịch sử theo quyền tài khoản.');
 if(!rows.length){wrap.innerHTML='<p class="radioEmpty">Không có lịch sử phù hợp bộ lọc.</p>';return;}
 wrap.innerHTML=(rows.length>160?'<p class="radioHint">Hiển thị 160/'+rows.length+' sự kiện mới nhất; PDF xuất đầy đủ theo bộ lọc.</p>':'')+'<div class="radioAudit"><div class="radioAuditHead"><span>Thời gian</span><span>Máy / sự kiện</span><span>Người thực hiện</span><span>Trạng thái / ghi chú</span><span>Bằng chứng</span></div>'+
 rows.slice(0,160).map(e=>{
  const kind=['REPORT','SWAP_OUT'].includes(e.action)?'warning':['ISSUE','SWAP_IN'].includes(e.action)?'issued':e.action==='RETURN'?'returned':'neutral';
  const note=[e.beforeStatus&&e.afterStatus?(STATUSES[e.beforeStatus]||e.beforeStatus)+' → '+(STATUSES[e.afterStatus]||e.afterStatus):'',REASON_TEXT[e.reasonCode]||'',e.details||''].filter(Boolean).join(' · ');
  return '<article class="radioAuditRow"><div><small>THỜI GIAN</small><b>'+esc(e.at?.toDate?.()?fmt(e.at.toDate()):'Đang đồng bộ')+'</b></div><div><small>THIẾT BỊ</small><strong>'+esc(label(e.deviceCode))+'</strong><span class="radioActionBadge radioActionBadge-'+kind+'">'+esc(ACTS[e.action]||e.action)+'</span></div><div><small>NGƯỜI KÝ</small><b>'+esc(e.actorName||e.actorUid||'—')+'</b><span class="radioDetailText">'+esc(e.shift||'—')+'</span></div><div><small>TRẠNG THÁI / GHI CHÚ</small><span class="radioDetailText">'+esc(note||'Không có ghi chú')+'</span></div><div><small>BẰNG CHỨNG</small>'+((e.signature||e.hasSignature)?'<button type="button" class="radioViewProof" data-radio-proof="'+esc(e.id)+'">📷 Xem ảnh / chữ ký</button>':'<span class="radioDetailText">Không có ảnh</span>')+'</div></article>';
 }).join('')+'</div>';
}
function radioShiftDeviceMatrix(rows){
 const period=typeof reportMode!=='undefined'&&reportMode==='RANGE';
 const byCode=new Map();
 for(const e of [...rows].reverse()){
  const code=S(e.deviceCode);if(!code)continue;
  let item=byCode.get(code);
  if(!item){item={code,received:0,returned:0,swap:0,fault:0,last:'',who:''};byCode.set(code,item)}
  if(['ISSUE','SWAP_IN'].includes(e.action))item.received++;
  if(['RETURN','SWAP_OUT'].includes(e.action))item.returned++;
  if(e.action==='SWAP_OUT')item.swap++;
  if(e.action==='REPORT')item.fault++;
  item.last=ACTS[e.action]||e.action;
  item.who=e.actorName||e.actorUid||'';
 }
 if(!byCode.size)return '<div class="radioAdminMatrix"><h4>Đối soát theo thiết bị</h4><p class="radioHint">Không phát sinh sự kiện trong phạm vi này.</p></div>';
 const items=[...byCode.values()].sort((a,b)=>a.code.localeCompare(b.code,'vi',{numeric:true}));
 return '<div class="radioAdminMatrix"><h4>'+ (period?'Đối soát theo từng máy trong khoảng':'Đối soát theo từng máy trong ca')+'</h4><p class="radioHint">Số nhận/trả là lượt phát sinh '+(period?'trong khoảng đã chọn':'trong ca đã chọn')+', không phải số máy còn giữ ở hiện tại.</p>'+
 '<div class="radioAdminMatrixScroll"><table><thead><tr><th>Máy</th><th>Nhận</th><th>Trả</th><th>Đổi / lỗi</th><th>Thao tác cuối · người thực hiện</th></tr></thead><tbody>'+
 items.map(d=>'<tr><th>'+esc(label(d.code))+'</th><td>'+d.received+'</td><td>'+d.returned+'</td><td>'+d.swap+' / '+d.fault+'</td><td>'+esc(d.last)+' · '+esc(d.who||'—')+'</td></tr>').join('')+'</tbody></table></div></div>';
}

function radioRangeDailyMatrix(rows){
 const byShift=new Map();
 for(let day=reportFrom;day<=reportTo;day=radioDayAdd(day,1))
  for(const shift of ['AM','PM'])byShift.set(day+'/'+shift,{day,shift,issue:0,returned:0,swap:0,fault:0});
 for(const e of rows){
  const at=e.at?.toMillis?.()||0;if(!at)continue;
  const {day,shift,key}=radioCustodyDuty(at,e.shift),v=byShift.get(key);
  if(!v)continue;
  if(e.action==='ISSUE')v.issue++;
  if(e.action==='RETURN')v.returned++;
  if(e.action==='SWAP_OUT')v.swap++;
  if(e.action==='REPORT')v.fault++;
 }
 return '<div class="radioAdminMatrix"><h4>Chi tiết từng ngày và ca</h4><div class="radioAdminMatrixScroll"><table><thead><tr><th>Ngày</th><th>Ca</th><th>Nhận</th><th>Trả</th><th>Đổi</th><th>Báo lỗi</th></tr></thead><tbody>'+
  [...byShift.values()].map(v=>'<tr><td>'+v.day+'</td><td>'+(v.shift==='AM'?'Sáng':'Tối')+'</td><td>'+v.issue+'</td><td>'+v.returned+'</td><td>'+v.swap+'</td><td>'+v.fault+'</td></tr>').join('')+
  '</tbody></table></div></div>';
}

// Reconcile immutable custody events by device, not by subtracting total ISSUE and RETURN:
// an AD may sign a RETURN on behalf of the original holder and SWAP_OUT closes a device.
// The result is an historical snapshot at cutoff, never a claim that a past holder
// is still holding the device today. Missing prior-period ISSUE must remain explicit.
function radioReconcileCustody(rows,cutoffMs){
 const items=[...rows].filter(e=>e&&e.at?.toMillis?.()&&S(e.deviceCode)).sort((a,b)=>
  a.at.toMillis()-b.at.toMillis()||Number(a.deviceVersion||0)-Number(b.deviceVersion||0)||S(a.id).localeCompare(S(b.id)));
 const openByDevice=new Map(),late=[],orphanReturns=[],handoverGaps=[];
 for(const e of items){
  const code=S(e.deviceCode),time=e.at.toMillis(),action=S(e.action);
  if(time>cutoffMs)continue;
  if(action==='ISSUE'||action==='SWAP_IN'){
   const previous=openByDevice.get(code);
   if(previous)handoverGaps.push(previous);
   const duty=radioCustodyDuty(time,e.shift),due=radioCustodyDue(time,e.shift);
   openByDevice.set(code,{id:e.id||'',deviceCode:code,personUid:S(e.personUid||e.actorUid),
    personName:S(e.personName||e.actorName||e.personUid||e.actorUid)||'Chưa rõ người nhận',
    receivedAtMs:time,dueMs:due,shiftDay:duty.day,shift:duty.shift,action});
  }else if(action==='RETURN'||action==='SWAP_OUT'){
   const prev=openByDevice.get(code);
   if(!prev){orphanReturns.push(e);continue}
   const receiver=S(e.personUid),consistent=!receiver||!prev.personUid||receiver===prev.personUid;
   if(!consistent)handoverGaps.push({...prev,reason:'Người trả không khớp người giữ theo sự kiện'});
   if(time>=prev.dueMs)late.push({...prev,returnedAtMs:time,returnedBy:S(e.actorName||e.actorUid||''),
    returnAction:action,matchedHolder:consistent});
   openByDevice.delete(code);
  }
 }
 const outstanding=[...openByDevice.values()].map(e=>({...e,overdue:cutoffMs>=e.dueMs,
  ageMinutes:Math.max(0,Math.floor((cutoffMs-e.receivedAtMs)/60000))}))
  .sort((a,b)=>Number(b.overdue)-Number(a.overdue)||a.receivedAtMs-b.receivedAtMs);
 late.sort((a,b)=>b.returnedAtMs-a.returnedAtMs);
 return {outstanding,late,orphanReturns,handoverGaps,cutoffMs};
}
function radioReportCutoffMs(){
 if(!reportReady)return 0;
 const endMs=reportMode==='RANGE'?radioRangeBounds(reportFrom,reportTo).endMs:shiftBounds(reportDate,reportShift).endMs;
 return Math.min(endMs,reportAsOfMs||Date.now());
}
function radioDelayText(ms){const minutes=Math.max(0,Math.floor(ms/60000));return minutes>=60?Math.floor(minutes/60)+' giờ '+String(minutes%60).padStart(2,'0')+' phút':minutes+' phút'}
function radioLiveCustody(list,nowMs=Date.now()){
 return list.filter(d=>d.status==='OUT').map(d=>{
  const heldAtMs=radioHeldSince(d)?.toMillis?.()||0;
  const dueMs=heldAtMs?(()=>{return radioCustodyDue(heldAtMs,d.shift)})():0;
  return {deviceCode:S(d.code),personName:S(d.holderName||d.holderUid||'Chưa rõ người giữ'),
   personUid:S(d.holderUid),receivedAtMs:heldAtMs,dueMs,overdue:!!dueMs&&nowMs>=dueMs};
 }).sort((a,b)=>Number(b.overdue)-Number(a.overdue)||a.receivedAtMs-b.receivedAtMs);
}

function radioStaffStatistics(rows,cutoffMs){
 const sorted=[...rows].filter(e=>e?.at?.toMillis?.()&&S(e.deviceCode)&&e.at.toMillis()<=cutoffMs)
  .sort((a,b)=>a.at.toMillis()-b.at.toMillis()||Number(a.deviceVersion||0)-Number(b.deviceVersion||0)||S(a.id).localeCompare(S(b.id)));
 const byPerson=new Map(),open=new Map();let unmatchedReturns=0,duplicateReceipts=0;
 const member=e=>{
  const uid=S(e.personUid||e.actorUid),name=S(e.personName||e.actorName)||uid||'Chưa xác định';
  const key=uid||'name:'+name.toLocaleLowerCase('vi-VN');
  if(!byPerson.has(key))byPerson.set(key,{uid,name,received:0,returnedOnTime:0,returnedLate:0,unreturned:0,overdue:0,swappedIn:0});
  const m=byPerson.get(key);
  if(name&&m.name==='Chưa xác định')m.name=name;
  return m;
 };
 for(const e of sorted){
  const code=S(e.deviceCode),action=S(e.action),at=e.at.toMillis();
  if(action==='ISSUE'||action==='SWAP_IN'){
   const staff=member(e);
   staff.received++;if(action==='SWAP_IN')staff.swappedIn++;
   if(open.has(code)){duplicateReceipts++;continue}
   open.set(code,{staff,at,dueMs:radioCustodyDue(at,e.shift)});
  }else if(action==='RETURN'||action==='SWAP_OUT'){
   const prev=open.get(code);
   if(!prev){unmatchedReturns++;continue}
   if(at<prev.dueMs)prev.staff.returnedOnTime++;
   else prev.staff.returnedLate++;
   open.delete(code);
  }
 }
 for(const o of open.values()){
  o.staff.unreturned++;
  if(cutoffMs>=o.dueMs)o.staff.overdue++;
 }
 return {staff:[...byPerson.values()].sort((a,b)=>b.overdue-a.overdue||b.unreturned-a.unreturned||
  b.returnedLate-a.returnedLate||b.received-a.received||a.name.localeCompare(b.name,'vi')),
  unmatchedReturns,duplicateReceipts};
}
function radioStaffStatisticsHtml(rows){
 const {staff,unmatchedReturns,duplicateReceipts}=radioStaffStatistics(rows,radioReportCutoffMs());
 const out=staff.length?'<div class="radioAdminMatrixScroll"><table><thead><tr>'+
  ['Nhân viên','Lượt nhận','Trả đúng ca','Trả muộn','Chưa trả tại mốc chốt','Quá ca'].map(x=>'<th>'+x+'</th>').join('')+
  '</tr></thead><tbody>'+staff.map(x=>'<tr'+(x.overdue?' class="radioOutstandingAlert"':'')+'><td>'+esc(x.name)+'</td>'+
   [x.received,x.returnedOnTime,x.returnedLate,x.unreturned,x.overdue].map(n=>'<td>'+n+'</td>').join('')+'</tr>').join('')+
  '</tbody></table></div>':'<p class="radioHint">Không phát sinh lượt nhận trong phạm vi đã tải.</p>';
 return '<section class="radioStaffReport"><h4>👥 Thống kê theo nhân viên · '+staff.length+' người</h4>'+out+
  '<p class="radioHint">Lượt nhận tính cả nhận sau đổi máy; trả đúng/muộn được ghép theo mã máy và tính cho người đã nhận, kể cả AD ký trả hộ. Chưa trả chỉ tính các lượt nhận trong kỳ. Không suy đoán người nhận từ kỳ trước.</p>'+
  ((unmatchedReturns||duplicateReceipts)?'<p class="radioOutstandingWarn">Cần đối soát thêm: '+unmatchedReturns+
   ' lượt trả không có lượt nhận trong kỳ, '+duplicateReceipts+' lượt nhận trùng máy.</p>':'')+'</section>';
}

function radioOutstandingSummaryHtml(rows){
 const cutoffMs=radioReportCutoffMs(),result=radioReconcileCustody(rows,cutoffMs);
 const live=radioLiveCustody(devices),table=(headers,items,empty,render)=>{
  if(!items.length)return '<p class="radioHint">'+empty+'</p>';
  return '<div class="radioAdminMatrixScroll"><table><thead><tr>'+headers.map(h=>'<th>'+h+'</th>').join('')+
   '</tr></thead><tbody>'+items.map(render).join('')+'</tbody></table></div>';
 };
 const when=ms=>ms?fmt(new Date(ms)):'Không rõ giờ';
 const overdue=result.outstanding.filter(x=>x.overdue);
 return '<section class="radioOutstandingBox"><div class="radioOutstandingHeading"><h4>🚩 Đối soát chưa trả · toàn bộ kỳ</h4>'+
  '<small>Chốt theo giờ Firebase: '+esc(when(cutoffMs))+' · Không căn cứ vào bộ lọc tìm kiếm lịch sử</small></div>'+
  '<div class="radioOutstandingCards">'+
  [['Chưa có lượt trả tại mốc chốt',result.outstanding.length],['Quá giờ kết thúc ca',overdue.length],
   ['Đã trả muộn trong kỳ',result.late.length],['Hiện đang giữ (mới nhất)',live.length]].map(([name,count])=>
   '<div><strong>'+count+'</strong><small>'+esc(name)+'</small></div>').join('')+'</div>'+
  '<h4>1 · Lượt nhận chưa thấy trả tại mốc chốt</h4>'+
  table(['Người nhận','Máy','Thời điểm nhận','Hạn kết thúc ca','Đối soát'],result.outstanding,
   'Không còn lượt nhận nào chưa được ghi trả tại mốc chốt của phạm vi đã tải.',
   x=>'<tr class="'+(x.overdue?'radioOutstandingAlert':'')+'"><td>'+esc(x.personName)+'</td><td>'+esc(label(x.deviceCode))+
    '</td><td>'+esc(when(x.receivedAtMs))+'</td><td>'+esc(when(x.dueMs))+'</td><td>'+
    (x.overdue?'CẦN KIỂM TRA · quá '+radioDelayText(cutoffMs-x.dueMs):'Đang trong ca')+'</td></tr>')+
  '<p class="radioHint">Chỉ đối chiếu lượt nhận phát sinh trong phạm vi đã chọn. Người nhận trước ngày bắt đầu không được tự suy đoán; một lượt trả sau mốc chốt có thể xuất hiện trong báo cáo kỳ tiếp theo.</p>'+
  '<h4>2 · Người đang giữ máy theo trạng thái Firebase mới nhất</h4>'+
  table(['Người giữ','Máy','Giữ từ','Tình trạng'],live,
   'Hiện chưa có máy nào ở trạng thái đang sử dụng.',
   x=>'<tr class="'+(x.overdue?'radioOutstandingAlert':'')+'"><td>'+esc(x.personName)+'</td><td>'+
    esc(label(x.deviceCode))+'</td><td>'+esc(when(x.receivedAtMs))+'</td><td>'+
    (x.overdue?'QUÁ CA '+radioDelayText(Date.now()-x.dueMs):x.dueMs?'Đang trong ca':'Chưa đủ giờ để đối chiếu')+'</td></tr>')+
  '<p class="radioHint">Đây là trạng thái hiện tại, độc lập với mốc chốt báo cáo lịch sử; có thể thay đổi khi nhân viên ký trả.</p>'+
  '<h4>3 · Lượt trả muộn đã ghi nhận trong kỳ</h4>'+
  table(['Người nhận','Máy','Đến hạn','Đã trả'],result.late.slice(0,25),
   'Không phát sinh lượt trả muộn trong dữ liệu đã tải.',
   x=>'<tr><td>'+esc(x.personName)+'</td><td>'+esc(label(x.deviceCode))+'</td><td>'+
    esc(when(x.dueMs))+'</td><td>'+esc(when(x.returnedAtMs))+'</td></tr>')+
  (result.late.length>25?'<p class="radioHint">Hiển thị 25/'+result.late.length+' lượt trả muộn mới nhất; tổng đã tính đủ.</p>':'')+
  (result.handoverGaps.length?'<p class="radioOutstandingWarn">⚠ '+result.handoverGaps.length+
   ' chuỗi bàn giao có sự kiện tiếp theo chưa khớp; cần kiểm tra lịch sử.</p>':'')+
  '</section>';
}

function renderSummary(){
 if(canMonitor(currentUser())&&!reportReady){
  $('radioSummary').innerHTML='<p class="radioEmpty">Để xem báo cáo chính xác: chọn ngày/ca hoặc khoảng ngày (AD), rồi bấm TẢI BÁO CÁO. Không dùng lịch sử gần đây để suy ra ca cũ.</p>';return;
 }
 if(reportReady){
  const rows=reportEvents,n=rows.filter(x=>x.action==='ISSUE').length,r=rows.filter(x=>x.action==='RETURN').length,
   swaps=rows.filter(x=>x.action==='SWAP_OUT').length,errors=rows.filter(x=>x.action==='REPORT').length;
  $('radioSummary').innerHTML='<h4>Đối soát '+esc(reportScope())+'</h4><div class="radioReportGrid">'+
   [['Nhận máy',n],['Trả máy',r],['Đổi máy',swaps],['Báo lỗi',errors]].map(x=>'<div><strong>'+x[1]+'</strong><small>'+x[0]+'</small></div>').join('')+
   '</div>'+radioOutstandingSummaryHtml(rows)+radioStaffStatisticsHtml(rows)+(reportMode==='RANGE'?radioRangeDailyMatrix(rows):'')+radioShiftDeviceMatrix(rows,reportMode==='RANGE')+'<p class="radioHint">Tổng '+rows.length+' sự kiện theo bộ lọc. Số lượt không phải số máy hiện còn giữ; trạng thái hiện tại không dùng để suy ra lịch sử ca trước.</p>';
  return;
 }
 const n=events.filter(x=>['SWAP_OUT'].includes(x.action)).length,issues=events.filter(x=>['REPORT','SWAP_OUT'].includes(x.action)||(x.action==='RETURN'&&x.reasonCode==='BATTERY_WEAK')),pending=devices.filter(hasRadioWarning);
 const now=Date.now(),using=devices.filter(x=>x.status==='OUT'),overdue=using.filter(x=>radioHeldSince(x)?.toMillis?.()&&radioShiftAt(radioHeldSince(x).toMillis()).key!==radioShiftAt(now).key);
 const admin=canMonitor(currentUser()),holds=using.map(x=>'<p>'+esc(label(x.code))+' · '+esc(x.holderName||'Không rõ người nhận')+(overdue.includes(x)?' <strong class="radioOverdue">CHƯA TRẢ CA TRƯỚC</strong>':'')+'</p>').join('');
 $('radioSummary').innerHTML='<div class="radioReportGrid"><div><strong>'+n+'</strong><small>Lần đổi máy (lịch sử gần đây)</small></div><div><strong>'+issues.length+'</strong><small>Lần ghi nhận vấn đề</small></div><div><strong>'+pending.length+'</strong><small>Máy cần theo dõi</small></div>'+(admin?'<div><strong>'+overdue.length+'</strong><small>Chưa trả ca trước</small></div>':'')+'</div><h4>Cần kiểm tra</h4>'+(pending.length?pending.map(d=>'<p>'+esc(label(d.code))+' · '+esc(STATUSES[d.status])+' · '+esc(REASON_TEXT[d.faultCode]||'')+'</p>').join(''):'<p>Không có cảnh báo đang theo dõi.</p>')+(admin?'<h4>Đang sử dụng / đối soát người giữ</h4>'+(using.length?holds:'<p>Tất cả máy đã được trả hoặc chưa cấp.</p>'):'')+'<p class="radioHint">Ca sáng hết 19:00, ca tối hết 08:29 hôm sau; có thể tiếp tục mở chuyến và bàn giao sau mốc chuyển ca. Giờ máy chủ Firebase là thời điểm ghi nhận.</p><p class="radioHint">Báo cáo này chỉ tổng hợp sự kiện đã tải. Báo cáo ngày/tuần chính thức được tính trên máy chủ, không dựa vào giới hạn 120 mục.</p>';
}
function evidenceDetails(details,captureMs,clock){
 if(!Number.isFinite(captureMs)||captureMs<=0)return details;
 const capture=' | Ảnh thiết bị UTC: '+new Date(captureMs).toISOString();
 const metadata=clock?' | VN: Asia/Ho_Chi_Minh | '+clock.source+' '+(clock.offset||'')+' | CHƯA XÁC MINH':'';
 return S(details).slice(0,Math.min(450,500-capture.length-metadata.length))+capture+metadata;
}
function photoAudit(e){
 const serverMs=e?.at?.toMillis?.()||0;
 const match=S(e?.details).match(/Ảnh thiết bị UTC: (\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z)(?: \| VN: Asia\/Ho_Chi_Minh \| (EXIF|EXIF-offset-thiết-bị|picker-return) [+-]\d\d:\d\d \| CHƯA XÁC MINH)?$/);
 const deviceMs=match?Date.parse(match[1]):NaN;
 const estimated=match?.[2]==='picker-return',unverified=!!match?.[2];
 const delta=serverMs&&Number.isFinite(deviceMs)?Math.round(Math.abs(serverMs-deviceMs)/60000):null;
 return {serverMs,deviceMs:Number.isFinite(deviceMs)?deviceMs:null,delta,
  estimated,unverified,status:estimated?'GIỜ ƯỚC TÍNH KHI NHẬN ẢNH':unverified?(delta>10?'GIỜ THIẾT BỊ CHƯA XÁC MINH · LỆCH TRÊN 10 PHÚT':'GIỜ THIẾT BỊ CHƯA XÁC MINH'):!serverMs?'CHƯA CÓ GIỜ MÁY CHỦ':!match?'ẢNH CŨ: CẦN ĐỐI CHIẾU BẰNG MẮT':delta>10?'CẢNH BÁO: LỆCH TRÊN 10 PHÚT':'GIỜ THIẾT BỊ GẦN GIỜ GHI FIREBASE'};
}
function eventData(action,device,after,user,shiftVal,reason,details,sig,related='',swapId=''){
 return {schemaVersion:1,action,deviceCode:device.code,actorUid:user.uid,actorName:user.name,
 personUid:['ISSUE','SWAP_IN'].includes(action)?user.uid:(device.holderUid||''),personName:['ISSUE','SWAP_IN'].includes(action)?user.name:(device.holderName||''),
 shift:shiftVal,reasonCode:reason,details:details.slice(0,500),signature:sig,
 beforeStatus:device.status,afterStatus:after.status,deviceVersion:device.version+1,
 relatedDeviceCode:related,swapId,at:fv()};
}
function updateDevice(tx,ref,device,action,after,options){
 const evRef=options.eventId?fs().collection(EVENTS).doc(options.eventId):fs().collection(EVENTS).doc(),ev=eventData(action,device,after,options.user,options.shift,options.reason,options.details,options.sig,options.related,options.swapId);
 tx.set(evRef,ev);
 // A single transaction commits both the compact receipt and high-quality proof.
 if(options.fullProof){
  tx.set(fs().collection(PROOFS).doc(evRef.id),{
   schemaVersion:2,eventId:evRef.id,actorUid:options.user.uid,
   deviceCode:device.code,action,capturedAtMs:options.photoAt,image:options.fullProof
  });
 }
 const heldSince=after.status!=='OUT'?null:device.status==='OUT'?radioHeldSince(device):fv();
 tx.update(ref,{...after,heldSince,version:device.version+1,lastEventId:evRef.id,updatedAt:fv()});
 return evRef.id;
}
async function transactionInventory(tx,db,primary,secondary=''){
 // All currently registered devices are transactionally read before any write.
 // Concurrent sign-ins on different radios share read dependencies, so the
 // second transaction retries and observes the newly held machine.
 const codes=[...new Set([...INIT,...devices.map(d=>d.code),primary,secondary].filter(Boolean))];
 const snaps=await Promise.all(codes.map(code=>tx.get(db.collection(COLLECTION).doc(code))));
 return new Map(codes.map((code,i)=>[code,snaps[i].data()||null]));
}
function assertSingleHolder(inventory,uid,exclude=''){
 const other=[...inventory].filter(([code,d])=>code!==exclude&&d?.status==='OUT'&&d.holderUid===uid).map(([code])=>label(code));
 if(other.length)throw Error('Tài khoản đang giữ '+other.join(', ')+'. Phải trả trước khi nhận thêm bộ đàm.');
}
async function submit(){
 if(busy||!choice)return;const user=currentUser();if(!user.uid)return notify('Phiên đăng nhập đã hết hạn.',true);
 const code=choice.code,reason=$('radioReason').value,rawDetail=S($('radioDetail').value),returnReason=$('radioReturnReason').value,
  shiftVal=mode==='ISSUE'?S($('radioShift').value):['AM','PM'].includes(S(choice.shift))?S(choice.shift):shift();
 if(!['AM','PM'].includes(shiftVal))return notify('Vui lòng chọn CA SÁNG hoặc CA TỐI trước khi ký nhận máy.',true);
 $('radioShift').value=shiftVal; // custody duty explicitly selected on ISSUE, inherited from device on RETURN/SWAP_OUT
 if(mode==='RETURN'&&returnReason==='OTHER'&&rawDetail.length<10)return notify('Lý do trả khác cần mô tả ít nhất 10 ký tự.',true);
 const details=mode==='RETURN'?('Lý do trả: '+(RETURN_REASONS[returnReason]||RETURN_REASONS.END_SHIFT)+(rawDetail?' · '+rawDetail:'')):rawDetail;
 if(mode==='SWAP_OUT'&&reason==='LOST')return notify('Máy thất lạc cần được báo riêng, không thể đổi máy đang báo mất.',true);
 if(['REPORT','SWAP_OUT'].includes(mode)&&(reason==='OTHER'||reason==='LOST')&&details.length<10)return notify('Vui lòng mô tả lý do cụ thể (từ 10 ký tự).',true);
 if(mode==='RELEASE'){
  if(details.length<20)return notify('AD phải ghi kết quả kiểm tra ít nhất 20 ký tự: pin, sóng, loa, mic/PTT và tình trạng thực tế.',true);
  if(!root.confirm('XÁC NHẬN ĐÃ XỬ LÝ THÔNG TIN LỖI CHO '+label(code)+'?\n\nChỉ cập nhật ghi nhận, KHÔNG phải mở khóa sử dụng. Máy báo mất phải xác minh đã tìm thấy thực tế.\n\nKết quả lưu trong lịch sử Firebase.'))return notify('Chưa xác nhận cập nhật thông tin lỗi.',true);
 }
 let sig='',sigNew='',hiOld='',hiNew='',serverOld='',serverNew='',usedLegacyPng=false,usedCompactOnly=false,usedCompatibleProof=false;try{if(mode!=='RELEASE'){signature();if(needsPhoto(mode)){if(!photosReady())throw Error('Phải chụp ảnh bằng camera trước khi ký.');if((!nativeDraft&&Date.now()-photos.old.at>600000)||(mode==='SWAP_OUT'&&Date.now()-photos.new.at>600000))throw Error('Ảnh quá 10 phút, vui lòng chụp lại.')}}}catch(e){return notify(e.message,true)}
 if(nativeMode()&&(!nativeDraft||nativeDraft.uid!==user.uid))return notify('Phiên ký nhận đã thay đổi. Hãy mở lại bản nháp của tài khoản này.',true);
 if(!connected)return notify('Chưa xác nhận kết nối Firebase. Không thể ghi nhận.',true);
 if(!navigator.onLine)return notify('Đang ngoại tuyến: không cho phép nhận/trả vì có thể xảy ra nhận trùng máy.',true);
 setBusy(true);
 notify('Đang xử lý ảnh chụp và chữ ký để ghi Firebase…');
 try{
  if(nativeDraft){nativeDraft.shift=shiftVal;await saveNativeDraft()}
  await new Promise(resolve=>requestAnimationFrame(resolve));
  if(nativeDraft){
   if(await nativeReceiptExists(nativeDraft)){
    await finishNativeDraft('✓ Lượt ký này đã được xác nhận trên Firebase.');
    return;
   }
   try{hiOld=await encodeNativeProof(HIGH_PROOF_LIMIT)}
   catch(e){if(e.code!=='radio-photo-size')throw e}
   sig=hiOld&&hiOld.length<=44000?hiOld:await encodeNativeProof(44000,true);
   // A tiny but complete photo can fit directly in the event. Firestore
   // requires full-proof documents to have more than 12k characters.
   if(hiOld.length<=12000)hiOld='';
   serverOld=hiOld;
  }else if(mode!=='RELEASE'){
   if(needsPhoto(mode)){
    // Compact signed camera evidence is mandatory and encoded FIRST.
    // Full-resolution proof is best-effort: oversized photos must not block
    // accepting/returning a radio or initiating a flight after signing.
    sig=combineProof('old');
    if(mode==='SWAP_OUT')sigNew=combineProof('new');
    try{
     hiOld=combineFullProof('old');
     if(mode==='SWAP_OUT')hiNew=combineFullProof('new');
     serverOld=hiOld;serverNew=hiNew;
    }catch(fullPhotoError){
     hiOld='';hiNew='';serverOld='';serverNew='';
     usedCompactOnly=true;
     console.warn('Radio full photo too large; compact signed proof retained',fullPhotoError?.message||fullPhotoError);
    }
   }else sig=signature();
  }
  notify('Đang xác nhận với Firebase, vui lòng không bấm lại…');
 const savedPhotoEventIds={};
 const writeRadioTransaction=async(withFull=true)=>{
 const db=fs(),ref=db.collection(COLLECTION).doc(code);
 if(mode==='SWAP_OUT'){
  const other=$('radioSwapTarget').value,ref2=db.collection(COLLECTION).doc(other),swapId=db.collection(EVENTS).doc().id;
  await db.runTransaction(async tx=>{
   const inventory=await transactionInventory(tx,db,code,other),a=inventory.get(code),b=inventory.get(other);
    assertSingleHolder(inventory,user.uid,code);
   if(!a||a.status!=='OUT'||(!isAdmin(user)&&a.holderUid!==user.uid))throw Error('Máy cũ không còn hợp lệ để đổi.');
   if(!radioIssueable(b))throw Error('Máy thay thế đang được giữ hoặc báo mất. Vui lòng chọn máy khác.');
   const oldNew={status:'READY',holderUid:'',holderName:'',shift:'',faultCode:reason,faultDetail:details,battery:radioBatteryForFaultReport(a,reason)};
   savedPhotoEventIds.old=updateDevice(tx,ref,a,'SWAP_OUT',oldNew,{user,shift:shiftVal,reason,details:evidenceDetails(details,photos.old?.at),sig,related:other,swapId,fullProof:withFull?serverOld:'',photoAt:photos.old?.at});
   const newNew={status:'OUT',holderUid:user.uid,holderName:user.name,shift:shiftVal,faultCode:b.faultCode||'',faultDetail:b.faultDetail||'',battery:radioBatteryForWrite(b)};
   savedPhotoEventIds.new=updateDevice(tx,ref2,b,'SWAP_IN',newNew,{user,shift:shiftVal,reason,details:evidenceDetails(details,photos.new?.at),sig:sigNew,related:code,swapId,fullProof:withFull?serverNew:'',photoAt:photos.new?.at});
  });
 }else{
  await db.runTransaction(async tx=>{
   const inventory=await transactionInventory(tx,db,code),d=inventory.get(code);if(!d)throw Error('Không tìm thấy mã máy.');
   if(nativeDraft){
    if(d.lastEventId===nativeDraft.id&&d.version===nativeDraft.deviceVersion+1)return;
    if(d.version!==nativeDraft.deviceVersion)throw Error('Thiết bị đã có giao dịch khác. Kiểm tra lịch sử trước khi tiếp tục.');
   }
   let after,action=mode,reasonCode=reason;
   if(mode==='ISSUE'){assertSingleHolder(inventory,user.uid);if(!radioIssueable(d))throw Error('Máy đang được giữ hoặc báo mất.');after={status:'OUT',holderUid:user.uid,holderName:user.name,shift:shiftVal,faultCode:d.faultCode||'',faultDetail:d.faultDetail||'',battery:radioBatteryForWrite(d)};reasonCode='';}
   else if(mode==='RETURN'){
    if(d.status!=='OUT'||(d.holderUid!==user.uid&&!isAdmin(user)))throw Error('Chỉ người đang giữ máy hoặc AD được trả.');
    const battery=radioBatteryForWrite(d),low=battery==='EMPTY'||battery==='LOW',fault=d.faultCode||(low?'BATTERY_WEAK':'');
    /* Preserve existing fault evidence. Firestore RETURN rules only permit an auto-added
     battery note if the resulting fault is BATTERY_WEAK; for any other legacy fault,
     changing empty faultDetail is a permission-denied write (e.g. one DH10 record). */
    const faultDetail=d.faultDetail||(low&&fault==='BATTERY_WEAK'?'Pin yếu/hết pin đã được ghi nhận trước đó':'');
    after={status:'READY',holderUid:'',holderName:'',shift:'',faultCode:fault,faultDetail,battery};reasonCode=low?'BATTERY_WEAK':'';}
   else if(mode==='REPORT'){
    if(d.status==='LOST'||d.faultCode==='LOST')throw Error('Máy đang báo thất lạc, phải xác minh thu hồi trước khi ghi nhận tiếp.');
    if(d.status==='OUT'&&d.holderUid!==user.uid&&!isAdmin(user))throw Error('Chỉ người giữ hoặc AD được báo lỗi máy đang dùng.');
    after=reason==='LOST'?{status:'LOST',holderUid:'',holderName:'',shift:'',faultCode:reason,faultDetail:details,battery:radioBatteryForFaultReport(d,reason)}:
     {status:d.status,holderUid:d.holderUid,holderName:d.holderName,shift:d.shift,faultCode:reason,faultDetail:details,battery:radioBatteryForFaultReport(d,reason)};}
   else if(mode==='RELEASE'){if(!isAdmin(user)||!hasRadioWarning(d))throw Error('Không có thông tin lỗi cần xác nhận.');
    after={status:d.status==='OUT'?'OUT':'READY',holderUid:d.status==='OUT'?d.holderUid:'',holderName:d.status==='OUT'?d.holderName:'',shift:d.status==='OUT'?d.shift:'',faultCode:'',faultDetail:'',battery:d.battery};reasonCode='';}
   else throw Error('Tác vụ không được hỗ trợ.');
   savedPhotoEventIds.old=updateDevice(tx,ref,d,action,after,{user,shift:shiftVal,reason:reasonCode,details:evidenceDetails(details,photos.old?.at,photos.old?.clock),sig,related:'',swapId:'',fullProof:withFull?serverOld:'',photoAt:photos.old?.at,eventId:nativeDraft?.id});
  });
 }

 };
 // Downgrade on Firestore photo-size or Rules rejections only. Keep every
 // receipt/device write atomic; do not hide network failures.
 const mayDowngradePhoto=e=>{
  const code=String(e?.code||''),message=String(e?.message||'');
  return code.includes('permission-denied')||code.includes('resource-exhausted')||
   (code.includes('invalid-argument')&&/image|photo|too large|size|bytes|exceeds/i.test(message));
 };
 const writeCompactReceipt=async()=>{
  try{await writeRadioTransaction(false)}
  catch(legacyError){
   if(!String(legacyError?.code||'').includes('permission-denied')||
       !/^data:image\/jpeg;base64,/.test(sig))throw legacyError;
   notify('Firebase chưa cho phép ảnh JPEG. Đang nén PNG nhỏ hơn để lưu ký nhận…');
   await new Promise(resolve=>requestAnimationFrame(resolve));
   sig=nativeDraft?await encodeNativeProof(44000,true,'png'):combineProof('old','png');usedLegacyPng=true;
   if(mode==='SWAP_OUT')sigNew=combineProof('new','png');
   await writeRadioTransaction(false);
  }
 };
 if(mode==='RELEASE'){
  await writeRadioTransaction(false);
 }else if(!hiOld){
  // The full-colour image was too heavy or not encodable. The signed compact
  // camera frame still has the real image, timestamp, and ink signature.
  usedCompactOnly=true;
  await writeCompactReceipt();
 }else{
  try{await writeRadioTransaction(true)}
  catch(error){
   if(!mayDowngradePhoto(error))throw error;
   // Older V2.2 server rules may accept only 235k full-colour proofs.
   let canTryCompatible=!nativeDraft||hiOld.length>COMPAT_PROOF_LIMIT;
   try{
    if(nativeDraft&&canTryCompatible)serverOld=await encodeNativeProof(COMPAT_PROOF_LIMIT);
    if(!nativeDraft)serverOld=combineFullProof('old',COMPAT_PROOF_LIMIT);
    if(mode==='SWAP_OUT')serverNew=combineFullProof('new',COMPAT_PROOF_LIMIT);
   }catch(compactFullError){
    canTryCompatible=false;
    console.info('Large full-colour proof exceeds compatibility cap',compactFullError?.message||compactFullError);
   }
   if(canTryCompatible){
    try{await writeRadioTransaction(true);usedCompatibleProof=true}
    catch(compatibleError){
     if(!mayDowngradePhoto(compatibleError))throw compatibleError;
    }
   }
   if(!usedCompatibleProof){usedCompactOnly=true;await writeCompactReceipt()}
  }
 }
 let localBackupOk=!!hiOld;
 if((usedCompactOnly||usedCompatibleProof)&&hiOld){
  try{
   const tasks=[saveLocalFullProof(user.uid,code,mode,photos.old,hiOld)];
   if(mode==='SWAP_OUT')tasks.push(saveLocalFullProof(user.uid,$('radioSwapTarget').value,'SWAP_IN',photos.new,hiNew));
   localBackupOk=(await Promise.all(tasks)).every(Boolean);
  }catch(error){localBackupOk=false;console.warn('Radio local photo backup failed',error?.message||error)}
 }
 // Firebase transaction is ALREADY committed. Store the real signed, high-res
 // photo locally before starting optional Supabase upload. Failure to archive
 // must never retroactively pretend a Firebase signed event was unsuccessful.
 let originalQueued=0,originalQueueFailed=0;
 if(mode!=='RELEASE'&&needsPhoto(mode)){
  try{
   const vault=await loadRadioPhotoVault();
   const legs=mode==='SWAP_OUT'?['old','new']:['old'];
   for(const leg of legs){
    const eventId=savedPhotoEventIds[leg]||(leg==='old'?nativeDraft?.id:'');
    if(!eventId){originalQueueFailed++;continue}
    try{
     const fullBlob=await originalRadioPhotoBlob(leg);
     await vault.queue(eventId,user.uid,fullBlob);
     originalQueued++;
    }catch(archiveError){
     originalQueueFailed++;
     console.warn('Radio original cannot be queued:',String(archiveError?.message||archiveError).slice(0,150));
    }
   }
   if(originalQueued){
    void vault.flush(4).then(out=>{
     if(out?.uploaded)notify('✓ Đã đồng bộ '+out.uploaded+' ảnh rõ lên Supabase, AD có thể xem và xuất PDF.');
     else if(out?.failed)notify('Ảnh gốc đang chờ đồng bộ lại; ảnh ký nhận trên Firebase vẫn an toàn.');
    }).catch(e=>console.warn('Radio original sync pending',String(e?.message||e).slice(0,100)));
   }
  }catch(archiveError){
   originalQueueFailed++;
   console.warn('Radio original vault not available:',String(archiveError?.message||archiveError).slice(0,150));
  }
 }
 if(canMonitor(user))queueRosterAudit(150);
 if(nativeDraft)await removeNativeDraft(nativeDraft.uid,nativeDraft.id).catch(e=>console.warn('Radio draft cleanup',e));
 if(originalQueued){
  cancel();notify('✓ Đã ký nhận, lưu ảnh và chữ ký trên Firebase. '+
   'Ảnh gốc sắc nét đã lưu vào hàng chờ trên điện thoại và đang đồng bộ lên Supabase.'+
   (originalQueueFailed?' Một ảnh gốc khác chưa được lưu hàng chờ; kiểm tra lại nguồn ảnh.':''));
 }else if(originalQueueFailed){
  cancel();notify('✓ Ký nhận Firebase thành công nhưng CHƯA lưu được ảnh gốc lên Supabase. '+
   'Ảnh ký nhận Firebase vẫn còn; kiểm tra bộ nhớ thiết bị và mạng trước khi thử lại.',true);
 }else{
  cancel();notify(mode==='RELEASE'?'✓ Đã ghi nhận kết quả kiểm tra bộ đàm trên Firebase.':usedCompactOnly?
  '✓ Đã ký nhận và lưu ảnh tự nén lên Firebase.'+
  (hiOld?(localBackupOk?' Bản rõ hơn chỉ lưu trên điện thoại chụp; AD thiết bị khác xem ảnh nén.':' AD thiết bị khác chỉ xem được ảnh nén.')+
   ' Cần cập nhật Firestore Rules để lưu ảnh rõ trên máy chủ.':
   ' Ảnh quá lớn đã được thu nhỏ tự động để không cản trở nhận/trả bộ đàm.')+
  (usedLegacyPng?' (Chế độ PNG tương thích).':''):
  usedCompatibleProof?
   'Đã ký nhận. Firebase chỉ nhận ảnh tương thích 235KB.'+
   (localBackupOk?' Ảnh rõ hơn được giữ trên điện thoại chụp.':' Không thể giữ bản rõ hơn trên điện thoại.')+
   ' Cần nâng Firestore Rules để AD xem ảnh rõ hơn.':
   '✓ Đã lưu ảnh chất lượng cao, giữ màu trên Firebase cùng chữ ký và giờ máy chủ.');
 }
 }catch(e){notify(nativeDraft?
  errText(e)+' Bản nháp ảnh và chữ ký vẫn lưu trên máy. Mở lại để thử lưu khi kết nối ổn định.':
  errText(e),true)}finally{setBusy(false)}
}
async function seed(){
 if(busy)return;
 const user=currentUser();if(!isAdmin(user))return notify('Chỉ AD được khởi tạo.',true);
 if(!connected)return notify('Chưa đồng bộ Firebase. Không thể khởi tạo.',true);
 if(!navigator.onLine)return notify('Cần có mạng để kiểm kê bộ đàm.',true);
 if(!root.confirm('Khởi tạo các mã máy còn thiếu theo sổ giấy? Các máy đã có sẽ giữ nguyên.'))return;
 setBusy(true);let created=0;
 try{
  const db=fs();
  // Separate two-document transactions avoid the Firestore getAfter limit
  // of a single multi-asset batch. Safe to re-run after partial failures.
  for(const code of INIT){
   const ref=db.collection(COLLECTION).doc(code),evRef=db.collection(EVENTS).doc();
   const changed=await db.runTransaction(async tx=>{
    const snap=await tx.get(ref);
    if(snap.exists)return false;
    tx.set(ref,{schemaVersion:1,code,label:label(code),status:'READY',holderUid:'',holderName:'',shift:'',faultCode:'',faultDetail:'',battery:'UNKNOWN',version:0,lastEventId:evRef.id,updatedAt:fv()});
    tx.set(evRef,{schemaVersion:1,action:'INIT',deviceCode:code,actorUid:user.uid,actorName:user.name,personUid:'',personName:'',shift:'',reasonCode:'',details:'Khởi tạo từ sổ giấy; chưa xác minh pin.',signature:'',beforeStatus:'',afterStatus:'READY',deviceVersion:0,relatedDeviceCode:'',swapId:'',at:fv()});
    return true;
   });
   if(changed)created++;
  }
  notify('Đã bổ sung '+created+' mã máy; các máy đã tồn tại được giữ nguyên.');
 }catch(e){notify('Đã tạo '+created+' máy trước khi dừng. Có thể thử lại để hoàn thành. '+errText(e),true)}
 finally{setBusy(false)}
}
function pdfWrap(ctx,value,width){
 let words=S(value).split(/\s+/),lines=[],current='';
 for(const word of words){const next=current?current+' '+word:word;if(current&&ctx.measureText(next).width>width){lines.push(current);current=word;if(lines.length===2)break}else current=next}
 if(lines.length<2&&current)lines.push(current);return lines.slice(0,2);
}
function radioReportCounts(rows){
 return {issue:rows.filter(e=>e.action==='ISSUE').length,
  returned:rows.filter(e=>e.action==='RETURN').length,
  swap:rows.filter(e=>e.action==='SWAP_OUT').length,
  fault:rows.filter(e=>e.action==='REPORT').length};
}
function pdfPage(rows,index,total,scope,withPhotos=false,totals=null){
 const cv=document.createElement('canvas');cv.width=1200;cv.height=1698;const x=cv.getContext('2d');
 x.fillStyle='#fff';x.fillRect(0,0,1200,1698);
 x.fillStyle='#0b354d';x.fillRect(0,0,1200,19);x.fillStyle='#00818d';x.fillRect(0,19,1200,5);
 x.fillStyle='#0b354d';x.font='bold 27px Arial';x.fillText('SAGS  |  E-REPORT',47,72);
 x.font='bold 35px Arial';x.fillText('BÁO CÁO KÝ NHẬN - TRẢ BỘ ĐÀM',47,140);
 x.fillStyle='#446173';x.font='19px Arial';x.fillText('Ngày xuất: '+fmt(new Date())+'  |  Người xuất: '+currentUser().name,47,177);
 x.fillText('Phạm vi: '+scope+'  |  Sự kiện đã xác minh theo bộ lọc',47,209);
 if(totals){
  x.fillStyle='#0d5665';x.font='bold 18px Arial';
  x.fillText('NHẬN '+totals.issue+'   •   TRẢ '+totals.returned+'   •   ĐỔI '+totals.swap+'   •   BÁO LỖI '+totals.fault,47,235);
 }
 const widths=[175,115,155,190,150,315],titles=['THỜI GIAN','THIẾT BỊ','THAO TÁC','NGƯỜI KÝ','TRẠNG THÁI','GHI CHÚ / ẢNH'];
 let y=258,pos=46;x.fillStyle='#133e55';x.fillRect(46,y,1100,52);x.fillStyle='#fff';x.font='bold 16px Arial';
 titles.forEach((v,i)=>{x.fillText(v,pos+8,y+32);pos+=widths[i]});y+=52;
 rows.forEach((e,i)=>{
  x.fillStyle=i%2?'#fff':'#eef5f8';x.fillRect(46,y,1100,66);
  x.strokeStyle='#d5e4e9';x.beginPath();x.moveTo(46,y+66);x.lineTo(1146,y+66);x.stroke();
  const values=[e.at?.toDate?.()?fmt(e.at.toDate()):'Chưa đồng bộ',label(e.deviceCode),ACTS[e.action]||e.action,e.actorName||e.actorUid||'',(STATUSES[e.beforeStatus]||'')+' → '+(STATUSES[e.afterStatus]||''),[REASON_TEXT[e.reasonCode]||'',e.details||'',e.signature?'Có ảnh/chữ ký':''].filter(Boolean).join(' · ')];
  let left=46;x.fillStyle='#17394b';x.font='17px Arial';
  values.forEach((v,j)=>{pdfWrap(x,v,widths[j]-18).forEach((line,k)=>x.fillText(line,left+8,y+26+22*k));left+=widths[j]});y+=66;
 });
 x.fillStyle='#456175';x.font='16px Arial';x.fillText('Dữ liệu từ Firebase, đối chiếu thời gian máy chủ. Chỉ xuất lịch sử đã tải.',47,1615);
 x.fillText(withPhotos?'Ảnh và chữ ký nằm trong phụ lục bằng chứng kèm theo.':'Không kèm ảnh; chọn Kèm ảnh khi xuất để xem bằng chứng.',47,1642);
 x.textAlign='right';x.fillText('Trang '+index+'/'+total,1150,1642);
 return cv;
}


function radioPdfStaffPageCount(rows,cutoffMs){return Math.ceil(radioStaffStatistics(rows,cutoffMs).staff.length/23)}
function radioPdfStaffPages(rows,scope,cutoffMs,firstPage,totalPages){
 const stats=radioStaffStatistics(rows,cutoffMs),pages=[];
 for(let i=0;i<stats.staff.length;i+=23){
  const cv=document.createElement('canvas');cv.width=1200;cv.height=1698;
  const x=cv.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,1200,1698);
  x.fillStyle='#0b354d';x.fillRect(0,0,1200,20);x.fillStyle='#00818d';x.fillRect(0,20,1200,5);
  x.fillStyle='#0b354d';x.font='bold 27px Arial';x.fillText('SAGS  |  E-REPORT',47,75);
  x.font='bold 34px Arial';x.fillText('THỐNG KÊ NHẬN / TRẢ THEO NHÂN VIÊN',47,139,1090);
  x.fillStyle='#446173';x.font='19px Arial';
  x.fillText('Phạm vi: '+scope,47,180,1090);
  x.fillText('Mốc chốt lịch sử: '+fmt(new Date(cutoffMs)),47,209,1090);
  const widths=[335,132,150,142,170,165],head=['NHÂN VIÊN','NHẬN','ĐÚNG CA','TRẢ MUỘN','CHƯA TRẢ','QUÁ CA'];
  let y=250,left=46;x.fillStyle='#133e55';x.fillRect(46,y,1094,53);x.fillStyle='#fff';x.font='bold 18px Arial';
  head.forEach((v,j)=>{x.fillText(v,left+8,y+34,widths[j]-15);left+=widths[j]});y+=53;
  stats.staff.slice(i,i+23).forEach((r,j)=>{
   x.fillStyle=r.overdue?'#fff0ec':j%2?'#fff':'#eef5f8';x.fillRect(46,y,1094,53);
   x.fillStyle=r.overdue?'#a12724':'#17394b';x.font='bold 18px Arial';
   let px=46;
   [r.name,r.received,r.returnedOnTime,r.returnedLate,r.unreturned,r.overdue].forEach((value,k)=>{
    x.fillText(String(value),px+8,y+33,widths[k]-15);px+=widths[k];
   });y+=53;
  });
  x.fillStyle='#446173';x.font='17px Arial';
  x.fillText('Nhận bao gồm SWAP_IN. Trả theo người nhận, kể cả AD ký trả hộ.',46,1575,1095);
  x.fillText('Không ghép lượt trả với người nhận nằm ngoài kỳ báo cáo.',46,1605,1095);
  x.textAlign='right';x.fillText('Trang '+(firstPage+pages.length)+'/'+totalPages,1150,1648);
  pages.push(cv);
 }
 return pages;
}

function radioPdfOverviewPages(rows,scope,inventory,cutoffMs,detailPages=0,photoPages=0){
 const audit=radioReconcileCustody(rows,cutoffMs),live=radioLiveCustody(inventory);
 const sections=[
  {title:'CHƯA CÓ LƯỢT TRẢ TẠI MỐC CHỐT',rows:audit.outstanding,short:8},
  {title:'NGƯỜI HIỆN ĐANG GIỮ MÁY',rows:live,short:6},
  {title:'ĐÃ GHI NHẬN TRẢ MUỘN',rows:audit.late,short:3}
 ];
 const extra=[];
 for(const section of sections){
  const remaining=section.rows.slice(section.short);
  for(let i=0;i<remaining.length;i+=24)extra.push({title:section.title,rows:remaining.slice(i,i+24)});
 }
 const total=1+extra.length+detailPages+photoPages;
 const base=()=>{
  const cv=document.createElement('canvas');cv.width=1200;cv.height=1698;
  const x=cv.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,1200,1698);
  x.fillStyle='#0b354d';x.fillRect(0,0,1200,20);x.fillStyle='#00818d';x.fillRect(0,20,1200,5);
  return {cv,x};
 };
 const heading=(x,title,index)=>{
  x.fillStyle='#0b354d';x.font='bold 27px Arial';x.fillText('SAGS  |  E-REPORT',47,75);
  x.font='bold 34px Arial';x.fillText(title,47,139,1090);
  x.fillStyle='#446173';x.font='18px Arial';
  x.fillText('Phạm vi: '+scope,47,178,1090);
  x.fillText('Mốc chốt lịch sử: '+fmt(new Date(cutoffMs))+'  |  Người xuất: '+currentUser().name,47,209,1090);
  x.textAlign='right';x.fillText('Trang '+index+'/'+total,1150,1649);x.textAlign='left';
 };
 const row=(x,y,item,kind,index)=>{
  const alert=(kind!=='late'&&item.overdue);
  x.fillStyle=alert?'#fff0ec':index%2?'#fff':'#eff5f8';x.fillRect(46,y,1100,43);
  x.fillStyle=alert?'#a12724':'#17394b';x.font='bold 18px Arial';
  x.fillText(item.personName||'Chưa rõ người nhận',57,y+28,310);
  x.font='18px Arial';x.fillText(label(item.deviceCode),390,y+28,135);
  x.fillText(item.receivedAtMs?fmt(new Date(item.receivedAtMs)):'Chưa xác minh',540,y+28,240);
  const status=kind==='late'?'Đã trả muộn '+radioDelayText(item.returnedAtMs-item.dueMs):
   item.overdue?'QUÁ CA '+radioDelayText((kind==='live'?Date.now():cutoffMs)-item.dueMs):item.dueMs?'Chưa hết ca':'Chưa rõ hạn';
  x.fillStyle=alert?'#a12724':'#315365';x.font=alert?'bold 17px Arial':'17px Arial';
  x.fillText(status,795,y+28,340);
 };
 const tableHeader=(x,title,y)=>{
  x.fillStyle='#0b354d';x.font='bold 22px Arial';x.fillText(title,47,y,1100);
  x.fillStyle='#133e55';x.fillRect(46,y+11,1100,38);x.fillStyle='#fff';x.font='bold 15px Arial';
  for(const [t,left] of [['NGƯỜI NHẬN / GIỮ',57],['MÃ MÁY',390],['THỜI ĐIỂM NHẬN',540],['TRẠNG THÁI ĐỐI SOÁT',795]])x.fillText(t,left,y+37);
  return y+49;
 };
 const {cv,x}=base();heading(x,'ĐỐI SOÁT BỘ ĐÀM · NHẬN / TRẢ',1);
 const cards=[
  ['CHƯA TRẢ TẠI MỐC CHỐT',audit.outstanding.length],
  ['QUÁ CA TẠI MỐC CHỐT',audit.outstanding.filter(e=>e.overdue).length],
  ['ĐÃ TRẢ MUỘN',audit.late.length],['HIỆN ĐANG GIỮ',live.length]
 ];
 cards.forEach(([name,count],i)=>{
  const left=46+i*279;
  x.fillStyle=count&&i<2?'#fce9e6':'#ebf5f8';x.fillRect(left,235,266,97);
  x.fillStyle=count&&i<2?'#a12724':'#0b4860';x.font='bold 40px Arial';x.fillText(String(count),left+15,283);
  x.font='bold 14px Arial';x.fillText(name,left+14,311,244);
 });
 let y=367;
 for(let sectionIndex=0;sectionIndex<sections.length;sectionIndex++){
  const section=sections[sectionIndex];
  y=tableHeader(x,String(sectionIndex+1)+' · '+section.title,y);
  const subset=section.rows.slice(0,section.short);
  if(!subset.length){x.fillStyle='#456175';x.font='italic 16px Arial';x.fillText('Không phát sinh trong phạm vi đối soát.',58,y+29);y+=43}
  else{for(let i=0;i<subset.length;i++){row(x,y,subset[i],sectionIndex===2?'late':sectionIndex===1?'live':'open',i);y+=43}}
  if(section.rows.length>subset.length){
   x.fillStyle='#9b3d25';x.font='bold 15px Arial';
   x.fillText('Còn '+(section.rows.length-subset.length)+' trường hợp · xem các trang phụ đối soát.',58,y+22);
   y+=29;
  }
  y+=39;
 }
 x.fillStyle='#456175';x.font='16px Arial';
 x.fillText('Chưa trả = lượt nhận trong kỳ chưa thấy RETURN / SWAP_OUT trước mốc chốt; không mặc định là mất máy.',47,1497,1095);
 x.fillText('Trạng thái đang giữ lấy từ danh mục Firebase mới nhất, không phải ảnh chụp lịch sử.',47,1528,1095);
 x.fillText('Các lượt nhận trước kỳ không được suy đoán; trả sau mốc chốt thuộc kỳ sau.',47,1558,1095);
 if(audit.orphanReturns.length){x.fillText('Lượt trả có lượt nhận trước kỳ hoặc thiếu dữ liệu nhận: '+audit.orphanReturns.length,47,1584,1095)}
 if(audit.handoverGaps.length){
  x.fillStyle='#a12724';x.font='bold 17px Arial';
  x.fillText('CẦN KIỂM TRA: '+audit.handoverGaps.length+' chuỗi giao nhận chưa khớp dữ liệu.',47,1617,1095);
 }
 const pages=[cv];
 extra.forEach((part,i)=>{
  const {cv:next,x:ctx}=base();heading(ctx,'PHỤ LỤC · '+part.title,i+2);
  let py=tableHeader(ctx,part.title,261);
  part.rows.forEach((item,j)=>{row(ctx,py,item,part.title.startsWith('ĐÃ GHI')?'late':'open',j);py+=49});
  ctx.fillStyle='#456175';ctx.font='16px Arial';
  ctx.fillText('Danh sách tiếp nối trang đầu · mọi trường hợp đều được liệt kê, không cắt bỏ dữ liệu.',46,1606,1100);
  pages.push(next);
 });
 return {pages,count:pages.length,audit,live};
}

function pdfBuild(canvases){
 const photoStart=3+canvases.length*3,max=photoStart-1+canvases.filter(c=>c.proofJpeg).length;
 const ofs=Array(max+1).fill(0),chunks=[];let pos=0,nextPhoto=photoStart;
 const add=v=>{chunks.push(v);pos+=typeof v==='string'?v.length:v.byteLength};
 const object=(id,v)=>{ofs[id]=pos;add(id+' 0 obj\n'+v+'\nendobj\n')};
 add('%PDF-1.4\n');object(1,'<< /Type /Catalog /Pages 2 0 R >>');
 object(2,'<< /Type /Pages /Kids ['+canvases.map((_,i)=>(3+3*i)+' 0 R').join(' ')+'] /Count '+canvases.length+' >>');
 const jpegObject=(id,width,height,data)=>{
  const jpg=Uint8Array.from(atob(data.split(',')[1]),x=>x.charCodeAt(0));
  ofs[id]=pos;
  add(id+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+width+' /Height '+height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpg.length+' >>\nstream\n');
  add(jpg);add('\nendstream\nendobj\n');
 };
 canvases.forEach((c,i)=>{
  const id=3+i*3,content=id+1,img=id+2,proof=c.proofJpeg,photoId=proof?nextPhoto++:0;
  let cmd='q\n595 0 0 842 0 0 cm\n/Im1 Do\nQ\n';
  if(proof){
   const a=(n,total,extent)=>(n*extent/total).toFixed(4);
   cmd+='q\n'+a(proof.w,900,595)+' 0 0 '+a(proof.h,1273,842)+' '+
    a(proof.x,900,595)+' '+a(1273-proof.y-proof.h,1273,842)+' cm\n/Im2 Do\nQ\n';
  }
  const resources='/Im1 '+img+' 0 R'+(proof?' /Im2 '+photoId+' 0 R':'');
  object(id,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << '+resources+' >> >> /Contents '+content+' 0 R >>');
  object(content,'<< /Length '+cmd.length+' >>\nstream\n'+cmd+'endstream');
  jpegObject(img,c.width,c.height,c.toDataURL('image/jpeg',0.82));
  if(proof)jpegObject(photoId,proof.width,proof.height,proof.data);
  c.width=1;c.height=1;
 });
 const start=pos;add('xref\n0 '+(max+1)+'\n0000000000 65535 f \n');
 for(let i=1;i<=max;i++)add(String(ofs[i]).padStart(10,'0')+' 00000 n \n');
 add('trailer\n<< /Size '+(max+1)+' /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF');
 return new Blob(chunks,{type:'application/pdf'});
}
function proofImage(data){
 return new Promise((resolve,reject)=>{
  if(!/^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(S(data)))return reject(Error('Không có ảnh bằng chứng hợp lệ'));
  const img=new Image(),timer=setTimeout(()=>{img.onload=null;img.onerror=null;reject(Error('Tải ảnh quá thời gian'))},5000);
  img.onload=()=>{clearTimeout(timer);resolve(img)};
  img.onerror=()=>{clearTimeout(timer);reject(Error('Không giải mã được ảnh bằng chứng'))};
  img.src=data;
 });
}
async function photoPdfPage(e,index,total,fullProof=''){
 // On PC generate a denser raster so PDF zoom retains camera serial details.
 // Keep the original footprint on iOS to avoid Safari memory pressure.
 const factor=/iPhone|iPad|iPod/.test(navigator.userAgent||'')?1:1.6;
 const cv=document.createElement('canvas');cv.width=Math.round(900*factor);cv.height=Math.round(1273*factor);
 const x=cv.getContext('2d',{colorSpace:'srgb'}),audit=photoAudit(e),hasProof=!!e.signature;
 if(factor!==1)x.scale(factor,factor);
 x.fillStyle='#fff';x.fillRect(0,0,900,1273);
 x.fillStyle='#082e45';x.fillRect(0,0,900,16);
 x.fillStyle='#143d54';x.font='bold 23px Arial';x.fillText('SAGS | BẰNG CHỨNG KÝ NHẬN BỘ ĐÀM',35,65);
 x.font='bold 25px Arial';x.fillText(label(e.deviceCode)+' · '+(ACTS[e.action]||e.action),35,112);
 x.fillStyle='#365b70';x.font='17px Arial';
 x.fillText('Người thực hiện: '+S(e.actorName||e.actorUid||'—').slice(0,65),35,153);
 x.fillText('UID: '+S(e.actorUid||'—').slice(0,70)+'  |  Ca: '+S(e.shift||'—'),35,182);
 x.fillText('Sự kiện Firebase (VN): '+(audit.serverMs?fmt(new Date(audit.serverMs)):'CHƯA XÁC MINH'),35,219);
 x.fillText((audit.estimated?'Giờ nhận ảnh ước tính (VN): ':'Ảnh theo giờ thiết bị (VN): ')+(audit.deviceMs?fmt(new Date(audit.deviceMs)):'XEM GIỜ IN TRÊN ẢNH'),35,249);
 x.fillStyle=audit.delta>10?'#ad2626':'#235c65';x.font='bold 18px Arial';
 x.fillText(audit.status+(audit.delta!==null?' · chênh lệch khoảng '+audit.delta+' phút':''),35,284);
 x.fillStyle='#d2e1e8';x.fillRect(35,310,830,755);
 let photoSource='KHÔNG CÓ ẢNH';
 if(hasProof){
  try{
   const actualProof=fullProof||await highProofData(e);
   const originalAvailable=actualProof!==e.signature;
   const img=await proofImage(actualProof),ratio=Math.min(810/img.width,730/img.height);
   photoSource=(root.SAGSRadioPhotoVaultV1?.isOriginal(e.id)?'Ảnh gốc Supabase (đã xác minh Firebase)':originalAvailable?(Math.max(img.width,img.height)>=1280?'Ảnh lưu riêng trên Firebase':'Ảnh Firebase độ phân giải thấp'):root.SAGSRadioPhotoVaultV1?.isPurged(e.id)?'Ảnh gốc đã tự dọn · còn ảnh nén Firebase':'CHỈ CÓ ẢNH KÝ NHẬN NÉN')+' · '+img.width+'×'+img.height+' px';
   const w=img.width*ratio,h=img.height*ratio,left=450-w/2,top=687-h/2;
   // Preserve smaller JPEG proofs byte-for-byte. For large photos, only the
   // PDF attachment is resized/re-encoded: Firebase/Supabase originals stay
   // untouched and remain available in the full-resolution evidence viewer.
   const directJpeg=img.src.startsWith('data:image/jpeg;base64,');
   const reencode=!directJpeg||img.src.length>700000;
   if(!reencode){
    cv.proofJpeg={data:img.src,width:img.width,height:img.height,x:left,y:top,w,h};
   }else{
    let hi=null;
    try{
     const maxEdge=Math.max(img.naturalWidth||img.width,img.naturalHeight||img.height);
     const ratio=Math.min(1,1800/maxEdge);
     hi=document.createElement('canvas');
     hi.width=Math.max(1,Math.round(img.width*ratio));
     hi.height=Math.max(1,Math.round(img.height*ratio));
     const hctx=hi.getContext('2d',{alpha:false,colorSpace:'srgb'});
     if(!hctx)throw Error('Cannot decode high-resolution proof');
     hctx.fillStyle='#fff';hctx.fillRect(0,0,hi.width,hi.height);
     hctx.imageSmoothingEnabled=true;hctx.imageSmoothingQuality='high';
     hctx.drawImage(img,0,0,hi.width,hi.height);
     const jpeg=hi.toDataURL('image/jpeg',.84);
     if(!jpeg.startsWith('data:image/jpeg;base64,')||jpeg.length<120)throw Error('JPEG export unavailable');
     // Do not substitute a larger or invalid PDF image for the original JPEG.
     if(directJpeg&&jpeg.length>=img.src.length)throw Error('PDF version did not shrink');
     cv.proofJpeg={data:jpeg,width:hi.width,height:hi.height,x:left,y:top,w,h};
    }catch(error){
     if(directJpeg)cv.proofJpeg={data:img.src,width:img.width,height:img.height,x:left,y:top,w,h};
     else x.drawImage(img,left,top,w,h);
    }finally{if(hi){hi.width=1;hi.height=1}}
   }
  }catch(_){x.fillStyle='#aa2727';x.font='bold 20px Arial';x.fillText('ẢNH LỖI / KHÔNG ĐỌC ĐƯỢC',70,690)}
 }else{x.fillStyle='#744f2a';x.font='bold 21px Arial';x.fillText('SỰ KIỆN KHÔNG CÓ ẢNH',70,690)}
 // This line is outside the embedded photograph, so it cannot obscure serials.
 // A 44KB receipt is evidence of signing, never a high-resolution device photo.
 x.fillStyle=photoSource.startsWith('Ảnh lưu riêng')||photoSource.startsWith('Ảnh gốc Supabase')?'#235c65':'#ad2626';x.font='bold 16px Arial';
 x.fillText('Nguồn: '+photoSource,35,1086,830);
 x.fillStyle='#24475b';x.font='16px Arial';x.fillText('ID bất biến: '+S(e.id||'—').slice(0,85),35,1104);
 x.font='15px Arial';pdfWrap(x,e.details||'Không có ghi chú',815).forEach((line,i)=>x.fillText(line,35,1140+22*i));
 x.fillStyle='#667b87';x.font='13px Arial';
 x.fillText('Ảnh gồm hình camera và chữ ký. Giờ ảnh do thiết bị cung cấp, không phải đồng hồ máy chủ.',35,1202);
 x.fillText('Ảnh PDF tối ưu dung lượng; ảnh gốc rõ nét giữ riêng trên máy chủ khi khả dụng.',35,1225);
 x.fillText('Trang '+index+'/'+total+' · chỉ những sự kiện đã tải theo bộ lọc',35,1248);
 return cv;
}
function pdfStoredPage(cv){
 const width=cv.width,height=cv.height,proofJpeg=cv.proofJpeg;
 const jpeg=cv.toDataURL('image/jpeg',0.9);
 cv.width=1;cv.height=1;
 return {width,height,proofJpeg,toDataURL:()=>jpeg};
}
async function exportPhotoPdf(){
 if(!canMonitor(currentUser()))return notify('Chỉ AD và Quản lý bộ đàm được xuất lịch sử kèm ảnh.',true);
 if(!connected||!navigator.onLine||!canMonitor(currentUser())||!reportReady||!reportVerified)return notify('Cần chọn ngày, ca và bấm Tải báo cáo ca từ Firebase trước khi xuất ảnh.',true);
 const rows=reportEvents;
 // PDF is always the complete verified scope; history search/device/action controls only affect on-screen rows.
 if(rows.some(e=>!e.at?.toMillis?.()))return notify('Lịch sử có sự kiện chưa xác minh giờ Firebase. Hãy đồng bộ lại.',true);
 const a=$('radioExport'),b=$('radioSummaryExport');
 if(a?.disabled||b?.disabled)return;
 const photoMax=/iPhone|iPad|iPod/.test(navigator.userAgent||'')?40:/Android/.test(navigator.userAgent||'')?80:180;
 if(rows.length>photoMax)return notify('PDF kèm ảnh có '+rows.length+' sự kiện, vượt giới hạn '+photoMax+' trên thiết bị. Hãy chia nhỏ khoảng ngày hoặc chọn PDF không ảnh; không xuất thiếu bằng chứng.',true);
 if(a)a.disabled=true;if(b)b.disabled=true;
 const proofCount=rows.filter(e=>/^data:image\/(webp|png|jpeg);base64,/.test(S(e.signature))).length;
 notify('Đang tạo PDF có bảng tổng hợp và '+rows.length+' trang đối chiếu ảnh/chữ ký…');
 try{
  const scope=reportScope();
  const summaryPages=Math.ceil(rows.length/19),cutoffMs=radioReportCutoffMs(),staffPages=radioPdfStaffPageCount(rows,cutoffMs),
   overview=radioPdfOverviewPages(rows,scope,devices,cutoffMs,staffPages+summaryPages,rows.length),
   allPages=overview.count+staffPages+summaryPages+rows.length,stored=overview.pages.map(pdfStoredPage),totals=radioReportCounts(rows);
  for(const page of radioPdfStaffPages(rows,scope,cutoffMs,overview.count+1,allPages))stored.push(pdfStoredPage(page));
  const compactOnly=[];let originalCount=0,missingCount=0,supabaseCount=0,purgedCount=0;
  for(let i=0;i<rows.length;i+=19){
   stored.push(pdfStoredPage(pdfPage(rows.slice(i,i+19),stored.length+1,allPages,scope,true,totals)));
  }
  // Limit concurrent Firebase image loads to four to control mobile memory.
  for(let i=0;i<rows.length;i+=4){
   await new Promise(done=>requestAnimationFrame(done));
   if(reportMode==='RANGE'){
    const hydrated=await Promise.all(rows.slice(i,i+4).map(e=>hydrateRangeEvidence(e)));
    for(let j=0;j<hydrated.length;j++)rows[i+j]=hydrated[j];
   }
   const batch=rows.slice(i,i+4),full=await Promise.all(batch.map(e=>highProofData(e)));
   for(let j=0;j<batch.length;j++){
    if(!batch[j].signature)missingCount++;
    else if(full[j]===batch[j].signature){compactOnly.push(label(batch[j].deviceCode)+' · '+(ACTS[batch[j].action]||batch[j].action));if(root.SAGSRadioPhotoVaultV1?.isPurged(batch[j].id))purgedCount++}
    else {originalCount++;if(root.SAGSRadioPhotoVaultV1?.isOriginal(batch[j].id))supabaseCount++}
    stored.push(pdfStoredPage(await photoPdfPage(batch[j],overview.count+staffPages+summaryPages+i+j+1,allPages,full[j])));
   }
  }
  if(!canMonitor(currentUser()))throw Error('Tài khoản không còn quyền quản lý báo cáo bộ đàm');
  if(compactOnly.length){
   const examples=compactOnly.slice(0,5).join('; ');
   const question='CẢNH BÁO CHẤT LƯỢNG ẢNH BỘ ĐÀM\n\n'+
    compactOnly.length+' lượt chỉ còn ảnh ký nhận đã nén, không có ảnh gốc rõ còn lưu trên máy chủ. '+
    'PDF không thể khôi phục số máy/tem đã mất nét từ bản nén.\n\n'+
    'Ví dụ: '+examples+(compactOnly.length>5?'…':'')+'\n\n'+
    'Có '+originalCount+' ảnh rõ trên máy chủ (Supabase: '+supabaseCount+'), '+purgedCount+' ảnh đã tự dọn, '+missingCount+' sự kiện không có ảnh. '+
    'Bạn có muốn tiếp tục xuất PDF và ghi rõ nguồn ảnh ở từng trang?';
   if(!root.confirm(question)){notify('Đã hủy xuất PDF kèm ảnh mờ. Kiểm tra Firebase/Supabase hoặc chọn báo cáo không ảnh.');return}
  }
  const blob=pdfBuild(stored),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download='SAGS-BO-DAM-'+reportFileToken()+'-KEM-ANH.pdf';
  document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  notify('Đã xuất PDF ca '+reportScope()+': '+rows.length+' sự kiện, '+originalCount+' ảnh rõ (Supabase: '+supabaseCount+'), '+purgedCount+' ảnh gốc đã tự dọn, '+compactOnly.length+' chỉ có ảnh nén, '+missingCount+' không có ảnh.');
 }catch(e){notify('Không xuất được PDF kèm ảnh: '+S(e?.message||e),true)}
 finally{if(a)a.disabled=false;if(b)b.disabled=false}
}
async function exportPdf(){
 if(canMonitor(currentUser())&&(!reportReady||!reportVerified))return notify('Chọn ngày/ca hoặc khoảng ngày → Tải báo cáo Firebase → Xuất PDF. Không xuất từ lịch sử gần đây.',true);
 if($('radioPdfIncludePhotos')?.checked&&canMonitor(currentUser()))return exportPhotoPdf();
 const rows=canMonitor(currentUser())?reportEvents:filteredHistory();
 if(!rows.length&&!canMonitor(currentUser()))return notify('Không có sự kiện để xuất PDF.',true);
 const a=$('radioExport'),b=$('radioSummaryExport');if(a?.disabled||b?.disabled)return;
 if(a)a.disabled=true;if(b)b.disabled=true;notify('Đang tạo báo cáo PDF...');
 try{
  await new Promise(done=>requestAnimationFrame(done));
  const scope=canMonitor(currentUser())?reportScope():'Lịch sử cá nhân đã tải',pages=[];
  for(let i=0;i<rows.length;i+=19)pages.push(rows.slice(i,i+19));
  const totals=radioReportCounts(rows),monitor=canMonitor(currentUser()),cutoffMs=monitor?radioReportCutoffMs():0,
   staffPages=monitor?radioPdfStaffPageCount(rows,cutoffMs):0,overview=monitor?
   radioPdfOverviewPages(rows,scope,devices,cutoffMs,staffPages+pages.length,0):null,
   stored=overview?overview.pages.map(pdfStoredPage):[],totalPages=stored.length+staffPages+pages.length;
  if(monitor)for(const page of radioPdfStaffPages(rows,scope,cutoffMs,overview.count+1,totalPages))stored.push(pdfStoredPage(page));
  for(let i=0;i<pages.length;i++){stored.push(pdfStoredPage(pdfPage(pages[i],i+(overview?.count||0)+staffPages+1,totalPages,scope,false,totals)));if(i%12===11)await new Promise(done=>requestAnimationFrame(done));}
  const blob=pdfBuild(stored),href=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=href;link.download='SAGS-BO-DAM-'+(reportReady?reportFileToken():new Date().toISOString().slice(0,10))+'-BAO-CAO.pdf';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(href),60000);
  notify('Đã xuất PDF '+rows.length+' sự kiện theo '+scope+'.');
 }catch(e){notify('Không xuất được PDF: '+S(e.message||e),true)}
 finally{if(a)a.disabled=false;if(b)b.disabled=false}
}
function stopHistory(){
 if(historyStop){historyStop();historyStop=null}
 historyVerified=false;events=[];if($('radioHistoryList'))renderHistory();
 if($('radioSummary'))renderSummary();
}
function subscribeHistory(){
 if(historyStop||!connected||!navigator.onLine||!currentUser().uid)return;
 const u=currentUser(),db=fs();
 // Avoid downloading up to 120 compressed photographs at every application launch.
 // Fetch only when the user explicitly opens history or summary.
 const historyLimit=/iPad|iPhone|iPod/.test(navigator.userAgent||'')?45:120;
 const query=canMonitor(u)?db.collection(EVENTS).orderBy('at','desc').limit(historyLimit):db.collection(EVENTS).where('actorUid','==',u.uid).limit(historyLimit);
 historyStop=query.onSnapshot(s=>{
  historyVerified=!s.metadata.fromCache&&navigator.onLine;
  events=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.at?.toMillis?.()||0)-(a.at?.toMillis?.()||0));
  renderHistory();renderSummary();
 },e=>{historyVerified=false;events=[];renderHistory();renderSummary();notify(errText(e),true)});
}
async function open(){
 if(busy){$('sagsRadioPanel').hidden=false;return}
 tpl();const u=currentUser();$('radioPdfChoice').hidden=true;$('radioDraftControls').hidden=true;if(!u.uid){$('sagsRadioPanel').hidden=false;notify('Đang chờ xác thực Firebase. Kiểm tra đăng nhập hoặc mở lại sau khi kết nối.',true);return}
 $('sagsRadioPanel').hidden=false;notify('Đang tải danh mục thiết bị…');tab('devices');
 if(!radioLiveClock)radioLiveClock=setInterval(()=>{
  if($('sagsRadioPanel')?.hidden||document.hidden||!isAdmin(currentUser()))return;
  renderOverdueAlert();if(radioOnlyUnreturned)render();
  if(!$('radioSummaryTab')?.hidden&&reportReady)renderSummary();
 },60000);if(canMonitor(u)&&!rosterDate)watchRoster();
 // Resume immutable high-res originals left in IndexedDB if Safari closed
 // during upload. Firebase signed transactions are never replayed here.
 void loadRadioPhotoVault().then(v=>v.flush(4)).then(out=>{
  if(out?.uploaded)notify('✓ Đã đồng bộ '+out.uploaded+' ảnh rõ còn chờ từ thiết bị lên Supabase.');
 }).catch(e=>console.info('Kho ảnh gốc chưa sẵn sàng',String(e?.message||e).slice(0,100)));
 if(unsubs.length)return;
 connected=false;devices=[];events=[];render();
 try{
  const db=fs();
  unsubs.push(db.collection(COLLECTION).onSnapshot({includeMetadataChanges:true},s=>{connected=!s.metadata.fromCache&&navigator.onLine;devices=s.docs.map(d=>({code:d.id,...d.data()})).sort((a,b)=>a.code.localeCompare(b.code,'vi',{numeric:true}));render();if(connected&&rosterDate)queueRosterAudit();notify(connected?(devices.length?'Đã kết nối Firebase – có thể ký nhận.':'Đã kết nối Firebase – AD cần khởi tạo danh mục máy.'):'Đang xem bản lưu cục bộ; cần kết nối Firebase để ký nhận.',!connected)},e=>{connected=false;devices=[];events=[];render();notify(errText(e),true)}));
  // Heavy photographic history is fetched only when its tab is opened.
 }catch(e){notify(errText(e),true)}
}
root.SAGSRadioCustodyV1=Object.freeze({open,close,reasons:REASONS.map(([code,name])=>({code,name})),collection:COLLECTION,eventsCollection:EVENTS});
})(window);

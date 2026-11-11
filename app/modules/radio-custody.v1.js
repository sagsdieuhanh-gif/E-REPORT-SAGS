/* E-REPORT SAGS – radio custody (standalone feature, Firebase Firestore).
   Requires Firebase Firestore production rules to be deployed before enabling real signing.
   All custody writes are atomic and server-timestamped. NO local success simulation. */
(function(root){
'use strict';
if(root.SAGSRadioCustodyV1)return;
const COLLECTION='sags_radio_devices_v1',EVENTS='sags_radio_events_v1',PROOFS='sags_radio_proofs_v22';
const HIGH_PROOF_LIMIT=235000,proofCache=new Map();
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
const OVERDUE_MS=12*60*60*1000;
const STATUSES={READY:'Sẵn sàng',OUT:'Đang sử dụng',CHARGING:'Đang sạc',FAULT:'Cần kiểm tra / khóa cấp',LOST:'Thất lạc'};
const ACTS={INIT:'Khởi tạo',ISSUE:'Nhận máy',RETURN:'Trả máy',REPORT:'Báo sự cố',SWAP_OUT:'Đổi – trả máy cũ',SWAP_IN:'Đổi – nhận máy mới',RELEASE:'Mở lại / sạc xong'};
let unsubs=[],devices=[],events=[],busy=false,connected=false,choice=null,mode='ISSUE',canvasDirty=false,strokes=[],drawing=false,dateFilter='all';
let cameraStream=null,cameraToken=0,cameraLeg='old',photos={old:null,new:null},historyStop=null,historyVerified=false;
let reportReady=false,reportLoading=false,reportEvents=[],reportDate='',reportShift='AM',reportToken=0,reportVerified=false;
const REPORT_LIMIT=301;
let rosterRef=null,rosterCb=null,rosterRows=[],rosterAccounts=new Map(),rosterAudit=[],rosterReady=false,rosterBusy=false,rosterDate='',rosterTime=0,rosterGen=0,rosterTimer=null;
function session(){try{return root.__sagsGetSession?.()||{}}catch(_){return{}}}
function currentUser(){const u=root.firebase?.auth?.().currentUser,s=session(),p=s.profile||root.currentUserProfile||{};return {uid:u?.uid||'',name:S(p.fullName||p.name||p.displayName||p.username||u?.displayName||u?.email||'Nhân viên'),role:S(s.role||p.role||root.currentRole).toUpperCase()}}
function isAdmin(u){return ['ADMIN','AD'].includes(u?.role)}
function fs(){if(!root.firebase?.apps?.length||!root.firebase?.firestore)throw Error('Chưa khởi tạo kết nối Firebase.');return root.firebase.firestore()}
function fv(){return root.firebase.firestore.FieldValue.serverTimestamp()}
function errText(e){if(String(e?.code||'').includes('permission-denied'))return 'CHƯA KÍCH HOẠT KÝ NHẬN: Firebase chưa cấp quyền truy cập bộ đàm. AD cần triển khai Firestore Rules đã kiểm thử. Không có dữ liệu nào được ghi.';if(!navigator.onLine)return 'Mất kết nối. Không ghi nhận nhận/trả khi ngoại tuyến.';return S(e?.message||e||'Có lỗi, thử lại.')}
function notify(s,fail=false){
 for(const id of ['radioMessage','radioActionMessage']){
  const e=$(id);if(e){e.textContent=s;e.dataset.error=fail?'1':'0'}
 }
}
function setBusy(v){busy=!!v;for(const e of document.querySelectorAll('#sagsRadioPanel button,#sagsRadioPanel select,#sagsRadioPanel input,#sagsRadioPanel textarea'))e.disabled=busy;if($('radioPhotoArea'))updatePhotoUI()}
function tpl(){
 if($('sagsRadioPanel'))return;
 const p=document.createElement('section');p.id='sagsRadioPanel';p.className='sagsRadioPanel';p.hidden=true;p.setAttribute('role','dialog');p.setAttribute('aria-modal','true');p.setAttribute('aria-label','Quản lý ký nhận bộ đàm');
 p.innerHTML='<div class="radioShell"><header class="radioHeader"><div><small>QUẢN LÝ THIẾT BỊ · SAGS</small><h2>📻 Ký nhận bộ đàm</h2><p>Nhận · trả · đổi máy · báo lỗi · lịch sử</p></div><button id="radioClose" aria-label="Đóng" type="button">✕</button></header>'+
 '<div id="radioMessage" role="status" aria-live="polite"></div>'+
 '<div class="radioStats" id="radioStats"></div>'+
 '<section id="radioAdminOverview" class="radioAdminOverview" hidden><div class="radioAdminHeading"><div><small>QUẢN TRỊ THIẾT BỊ · TRẠNG THÁI TRỰC TUYẾN</small><h3>Giám sát bàn giao bộ đàm</h3><p>Người giữ máy, máy cần xử lý và đối soát theo ca ở một nơi.</p></div><button type="button" data-radio-go="summary" class="radioPrimary">Báo cáo ngày / ca</button></div><div id="radioAdminDashboard" class="radioAdminDashboard"></div><div class="radioRosterMonitor"><div class="radioRosterHeader"><b>📋 Đối chiếu roster và ký nhận</b><div class="radioRosterFilters"><label>Ngày<input type="date" id="radioRosterDate"></label><label>Ca<select id="radioRosterShift"><option value="AM">Sáng</option><option value="PM">Tối</option></select></label><button id="radioRosterReload" type="button">↻ Kiểm tra</button></div></div><div id="radioRosterAlert" role="status" aria-live="polite"></div></div></section>'+
 '<div class="radioTabs"><button type="button" data-radio-tab="devices" class="selected">Danh sách máy</button><button type="button" data-radio-tab="history">Lịch sử ký nhận</button><button type="button" data-radio-tab="summary">Tổng hợp</button></div>'+
 '<section id="radioReportControl" class="radioReportControl" hidden><div class="radioReportTitle"><strong>📅 Báo cáo ký nhận theo ngày và ca</strong><small>1. Chọn ngày và ca → 2. Tải dữ liệu → 3. Chọn ảnh nếu cần → 4. Xuất PDF</small></div><div class="radioReportInputs"><label>Ngày cần báo cáo<input id="radioReportDate" type="date"></label><label>Ca trực<select id="radioReportShift"><option value="AM">Ca sáng (AM)</option><option value="PM">Ca tối (PM)</option></select></label><button type="button" id="radioReportLoad" class="radioPrimary">🔎 Tải báo cáo ca</button><button type="button" id="radioReportReset">Lịch sử gần đây</button></div><div id="radioPdfChoice" class="radioPdfChoice" hidden><label><input type="checkbox" id="radioPdfIncludePhotos"><span>Kèm ảnh chụp và chữ ký trong PDF</span></label><small>AD: Bật để xuất bảng tổng hợp kèm ảnh từng lần nhận/trả; tắt để xuất báo cáo gọn không có ảnh.</small></div><p id="radioReportState" class="radioReportState" role="status" aria-live="polite">Chọn ngày và ca để lấy đúng dữ liệu, không giới hạn ở lịch sử gần nhất.</p><small>Ca báo cáo tính theo ca AM/PM được ghi tại thời điểm ký nhận. Ngày tính theo giờ Việt Nam (UTC+7). Dữ liệu đã ghi không tự đổi ca.</small></section>'+ 
 '<section id="radioDevicesTab"><div class="radioTools"><span>Trạng thái từng máy cập nhật từ Firebase</span><button type="button" id="radioSeed" hidden>+ Khởi tạo danh mục từ giấy</button></div><div id="radioDeviceList" class="radioDeviceList"></div></section>'+
 '<section id="radioHistoryTab" hidden><div class="radioTools"><span>Danh sách sự kiện của ca đã chọn (AD) hoặc lịch sử cá nhân</span><button type="button" id="radioExport" class="radioPrimary">📄 Xuất PDF ca</button></div><div class="radioHistoryFilters"><label>Mã máy<select id="radioHistoryDevice"><option value="">Tất cả máy</option></select></label><label>Thao tác<select id="radioHistoryAction"><option value="">Tất cả</option><option value="ISSUE">Nhận máy</option><option value="RETURN">Trả máy</option><option value="SWAP_OUT">Đổi máy</option><option value="REPORT">Báo lỗi</option></select></label><label>Tìm kiếm<input id="radioHistorySearch" type="search" placeholder="Tên, UID hoặc ghi chú" autocomplete="off"></label></div><div id="radioHistoryMeta" class="radioHistoryMeta"></div><div id="radioHistoryList"></div></section>'+
 '<section id="radioSummaryTab" hidden><div class="radioTools"><span>Tổng hợp ca trực · theo ngày đã chọn</span><button type="button" id="radioSummaryExport" class="radioPrimary">📄 Xuất PDF ca</button></div><div id="radioSummary"></div><p class="radioHint">Tổng hợp dữ liệu đã tải trên màn hình; không gửi email.</p></section>'+
 '<section id="radioAction" class="radioAction" hidden><div class="radioActionHeader"><h3 id="radioActionTitle">Ký nhận</h3><button type="button" id="radioActionCancel">✕</button></div><div class="radioFields"><label>Mã máy<input id="radioActionCode" readonly></label><label>Người thực hiện<input id="radioPerson" readonly></label><label>Ca làm việc<select id="radioShift"><option value="AM">Ca sáng</option><option value="PM">Ca chiều</option></select></label><label id="radioBatteryWrap">Pin lúc nhận/trả<select id="radioBattery"><option value="UNKNOWN">Chưa xác định</option><option value="FULL">Đầy</option><option value="GOOD">Đủ dùng</option><option value="LOW">Yếu</option><option value="EMPTY">Hết pin</option></select></label><label id="radioReasonWrap">Lý do<select id="radioReason">'+REASONS.map(([v,n])=>'<option value="'+v+'">'+esc(n)+'</option>').join('')+'</select></label><label id="radioReturnReasonWrap" hidden>Lý do trả<select id="radioReturnReason"><option value="END_SHIFT">Hết ca</option><option value="HANDOVER">Bàn giao ca tiếp theo</option><option value="STOP_USE">Không tiếp tục sử dụng</option><option value="OTHER">Lý do khác (ghi cụ thể)</option></select></label><label id="radioSwapWrap">Máy thay thế<select id="radioSwapTarget"></select></label><label id="radioSwapBatteryWrap" hidden>Pin máy thay thế<select id="radioSwapBattery"><option value="UNKNOWN">Chọn pin máy thay thế</option><option value="FULL">Đầy</option><option value="GOOD">Đủ dùng</option><option value="LOW">Yếu</option><option value="EMPTY">Hết pin</option></select></label><label class="wide">Ghi chú hiện trạng<textarea id="radioDetail" rows="2" placeholder="Ghi cụ thể hiện tượng, thời gian, vị trí..."></textarea></label></div><section id="radioPhotoArea" class="radioPhotoArea" hidden><div class="radioPhotoHeading"><strong id="radioPhotoStep">1 · Ảnh bộ đàm thực tế</strong><small>Camera trực tiếp · không chọn thư viện</small></div><div class="radioCameraView"><video id="radioCameraVideo" playsinline autoplay muted></video><img id="radioCameraPhoto" alt="Ảnh chụp mã máy và thời gian" hidden></div><div id="radioPhotoChips" class="radioPhotoChips"></div><div class="radioPhotoActions"><button id="radioTakePhoto" type="button" class="radioPrimary">📷 Chụp ảnh</button><button id="radioRetakePhoto" type="button" hidden>Chụp lại</button><button id="radioRetryPhoto" type="button" hidden>Mở camera</button></div><small class="radioHint">Giờ trên ảnh là giờ của điện thoại; Firebase ghi riêng thời điểm xác nhận trên máy chủ.</small></section><div id="radioSigWrap"><p>Chữ ký xác nhận của tài khoản đang đăng nhập</p><canvas id="radioSignature" width="540" height="150" aria-label="Ký bằng ngón tay hoặc chuột"></canvas><button type="button" id="radioClearSignature">Xóa nét ký</button></div><p id="radioActionMessage" class="radioActionMessage" role="status" aria-live="polite"></p><div class="radioActions"><button type="button" id="radioCancel">Hủy</button><button class="radioPrimary" type="button" id="radioConfirm">Xác nhận và lưu lịch sử</button></div></section>'+
 '<div class="radioProofViewer" id="radioProofViewer" hidden><div><header><strong id="radioProofName">Ảnh và chữ ký</strong><button type="button" id="radioProofClose">✕</button><button id="radioProofZoom" type="button">🔎 Phóng to</button></header><div class="radioProofScroll"><img id="radioProofImage" alt="Bằng chứng ảnh có giờ và chữ ký"></div><p id="radioProofQuality"></p><p id="radioProofTimestamp"></p></div></div><footer>Giờ trên ảnh do thiết bị cung cấp; giờ xác nhận chính thức theo Firebase.</footer></div>';
 document.body.appendChild(p);
 $('radioClose').onclick=close;$('radioActionCancel').onclick=cancel;$('radioCancel').onclick=cancel;
 $('radioConfirm').onclick=()=>void submit();$('radioClearSignature').onclick=()=>clearSignature();
 $('radioTakePhoto').onclick=takePhoto;$('radioRetakePhoto').onclick=()=>void retakePhoto();$('radioRetryPhoto').onclick=()=>void startCamera(cameraLeg);$('radioProofClose').onclick=closeProof;
 $('radioProofViewer').onclick=e=>{if(e.target.id==='radioProofViewer')closeProof()};
  $('radioProofZoom').onclick=()=>{const box=$('radioProofViewer');box.classList.toggle('radioProofZoomed');$('radioProofZoom').textContent=box.classList.contains('radioProofZoomed')?'↩ Thu vừa':'🔎 Phóng to'};
 $('radioSeed').onclick=()=>void seed();
 $('radioReportDate').value=vnDateKey(new Date());
  $('radioRosterDate').value=vnDateKey(new Date());$('radioRosterShift').value=shift();
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
 const move=e=>{if(drawing)mark(e)};const up=()=>{drawing=false};
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

function needsPhoto(action){return ['ISSUE','RETURN','SWAP_OUT','REPORT'].includes(action)}
function stopCamera(){
 ++cameraToken;if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null}
 const v=$('radioCameraVideo');if(v){v.pause();v.srcObject=null}
}
function resetCamera(){
 stopCamera();photos={old:null,new:null};cameraLeg='old';
 const img=$('radioCameraPhoto');if(img){img.hidden=true;img.removeAttribute('src')}
 const list=$('radioPhotoChips');if(list)list.replaceChildren();
}
function photosReady(){return !!photos.old&&(mode!=='SWAP_OUT'||!!photos.new)}
function updatePhotoUI(){
 const area=$('radioPhotoArea');if(!area)return;const needs=needsPhoto(mode),complete=photosReady();
 area.hidden=!needs;$('radioSigWrap').hidden=mode==='RELEASE'||(needs&&!complete);
 $('radioConfirm').disabled=busy||(needs&&!complete);
 $('radioTakePhoto').hidden=!needs||complete;$('radioTakePhoto').disabled=busy||!cameraStream;
 $('radioRetakePhoto').hidden=!needs||!photos.old;
 $('radioRetryPhoto').hidden=!needs||complete;
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
  const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}}});
  if(token!==cameraToken||!choice){stream.getTracks().forEach(t=>t.stop());return}
  cameraStream=stream;v.srcObject=stream;await v.play();
  if(token!==cameraToken){stopCamera();return}
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
 const sensorW=v.videoWidth,sensorH=v.videoHeight,scale=Math.min(1,1600/Math.max(sensorW,sensorH));
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
async function retakePhoto(){
 if(!choice)return;
 clearSignature();
 if(mode==='SWAP_OUT'&&photos.new){photos.new=null;updatePhotoUI();await startCamera('new')}
 else{photos={old:null,new:null};updatePhotoUI();await startCamera('old')}
}
function webpCanvasEncoderSupported(){
 const c=document.createElement('canvas');c.width=1;c.height=1;
 try{return c.toDataURL('image/webp',.5).startsWith('data:image/webp;base64,')}
 catch(_){return false}
}
function combineFullProof(leg){
 const photo=photos[leg];if(!photo)throw Error('Chưa chụp ảnh trực tiếp để tạo bằng chứng rõ nét.');
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{alpha:false});
 if(!ctx)throw Error('Không đọc được ảnh camera.');
 const webp=webpCanvasEncoderSupported(),mime=webp?'image/webp':'image/jpeg';
 const sw=photo.canvas.width,sh=photo.canvas.height;
 // Match the actual portrait/landscape source; never invent pixels by upscaling.
 const widths=[1,.9,.8,.72,.64,.56,.5].map(v=>Math.max(1,Math.round(sw*v)))
  .filter((v,i,a)=>a.indexOf(v)===i);
 for(const width of widths){
  const ph=Math.round(width*sh/sw),signatureH=Math.max(70,Math.round(width*.15));
  canvas.width=width;canvas.height=ph+signatureH;
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.fillStyle='#fff';ctx.fillRect(0,0,width,canvas.height);
  ctx.drawImage(photo.canvas,0,0,width,ph);
  ctx.fillStyle='#e9f4f8';ctx.fillRect(0,ph,width,signatureH);
  ctx.fillStyle='#123a4e';ctx.font='bold '+Math.max(11,Math.round(width*.018))+'px Arial';
  ctx.fillText('CHỮ KÝ XÁC NHẬN',Math.round(width*.025),ph+signatureH*.22);
  ctx.drawImage($('radioSignature'),Math.round(width*.025),ph+Math.round(signatureH*.25),Math.round(width*.9),Math.round(signatureH*.68));
  for(const q of webp?[.94,.9,.86,.81,.76,.7]:[.95,.92,.88,.84,.8,.74]){
   const data=canvas.toDataURL(mime,q);
   if(data.startsWith('data:'+mime+';base64,')&&data.length>120&&data.length<=HIGH_PROOF_LIMIT)return data;
  }
 }
 throw Error('Ảnh vượt giới hạn 235KB của bằng chứng Firebase. Hãy chụp lại gần máy, đủ sáng và ít hậu cảnh.');
}
function combineProof(leg,requestedFormat='auto'){
 const photo=photos[leg];if(!photo)throw Error('Chưa chụp ảnh trực tiếp.');
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 const mode=requestedFormat==='png'?'png':webpCanvasEncoderSupported()?'webp':'jpeg';
 const maxLength=44000;
 const widths=mode==='png'?[640,600,560,512,448,384,320,280,240,208,176]:[640,600,560,512,480,448,416,384,352];
 function drawPage(width){
  const ph=Math.round(width*photo.canvas.height/photo.canvas.width),sh=Math.round(width*.19);
  canvas.width=width;canvas.height=ph+sh;
  ctx.fillStyle='#fff';ctx.fillRect(0,0,width,canvas.height);
  ctx.drawImage(photo.canvas,0,0,width,ph);
  ctx.fillStyle='#e7f3f9';ctx.fillRect(0,ph,width,sh);
  ctx.fillStyle='#193c4e';ctx.font='bold '+Math.max(9,Math.round(width*14/640))+'px Arial';
  ctx.fillText('CHỮ KÝ XÁC NHẬN',Math.round(width*.025),ph+Math.round(width*.025));
  ctx.drawImage($('radioSignature'),Math.round(width*.03),ph+Math.round(width*.035),Math.round(width*.85),Math.round(sh*.72));
 }
 for(const width of widths){
  drawPage(width);
  if(mode==='png'){
   // Lossless RGB PNG fallback for older Firestore rules: reduce dimensions
   // only, never quantize channels or turn real camera colour into posterized blocks.
   const value=canvas.toDataURL('image/png');
   if(value.startsWith('data:image/png;base64,')&&value.length>120&&value.length<=maxLength)return value;
  }else{
   const mime=mode==='webp'?'image/webp':'image/jpeg';
   const prefix='data:'+mime+';base64,';
   const qualities=mode==='webp'?[.85,.78,.7,.62,.54,.46,.38,.3]:[.88,.82,.76,.7,.64,.58,.52,.46,.4];
   for(const quality of qualities){
    const value=canvas.toDataURL(mime,quality);
    if(value.startsWith(prefix)&&value.length>120&&value.length<=maxLength)return value;
   }
  }
 }
 throw Error('Ảnh quá lớn trong giới hạn lưu trữ. Vui lòng chụp rõ mã bộ đàm, giảm chi tiết nền rồi thử lại; chưa ghi nhận lượt ký.');
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
 const cached=proofCache.get(e.id);
 if(cached){localProofIds.delete(e.id);return cached}
 if(navigator.onLine){
  try{
   const snap=await fs().collection(PROOFS).doc(e.id).get({source:'server'});
   if(snap.metadata?.fromCache)throw Error('Ảnh gốc chưa được Firebase xác nhận.');
   const d=snap.data();
   if(snap.exists&&d?.eventId===e.id&&d?.actorUid===e.actorUid&&d?.deviceCode===e.deviceCode&&
    typeof d.image==='string'&&/^data:image\/(webp|jpeg);base64,/.test(d.image)&&d.image.length<=HIGH_PROOF_LIMIT){
    proofCache.set(e.id,d.image);localProofIds.delete(e.id);
    if(proofCache.size>8)proofCache.delete(proofCache.keys().next().value);
    return d.image;
   }
  }catch(error){
   // No global permission-denied flag: an old event must not prevent newer
   // events from loading their correctly authorized full-colour server proof.
   console.info('Radio full-colour proof unavailable',String(error?.code||error?.message||error));
  }
 }
 if(allowLocal){
  const local=await readLocalFullProof(e);
  if(local){localProofIds.add(e.id);return local}
 }
 return e.signature;
}
let proofViewToken=0;
async function viewProof(id){
 const e=(reportReady?reportEvents:events).find(x=>x.id===id);
 if(!e)return notify('Không tìm thấy sự kiện trong lịch sử đang hiển thị. Hãy tải lại lịch sử.',true);
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
  '⚠ Chỉ có ảnh đã nén trên Firebase. Ảnh cũ không thể khôi phục độ nét đã mất.':
  localProofIds.has(e.id)?
   '📱 Ảnh rõ được lưu tạm trong điện thoại này, CHƯA xác minh trên Firebase. AD ở máy khác vẫn thấy bản nén.':
   '✓ Ảnh rõ đã được xác minh trên Firebase, có thể phóng to đọc mã máy.';
}
function closeProof(){
 ++proofViewToken;const el=$('radioProofViewer');if(el){el.hidden=true;el.classList.remove('radioProofZoomed')}
 const img=$('radioProofImage');if(img)img.removeAttribute('src');
}
function mark(e){const c=$('radioSignature'),r=c.getBoundingClientRect(),x=Math.max(0,Math.min(c.width,Math.round((e.clientX-r.left)*c.width/r.width))),y=Math.max(0,Math.min(c.height,Math.round((e.clientY-r.top)*c.height/r.height)));const points=strokes.at(-1);if(!points||points.length>350)return;points.push([x,y]);const ctx=c.getContext('2d');ctx.strokeStyle='#123f66';ctx.lineWidth=2.8;ctx.lineCap='round';if(points.length===1){ctx.fillStyle='#123f66';ctx.beginPath();ctx.arc(x,y,1.4,0,Math.PI*2);ctx.fill()}else{const prev=points[points.length-2];ctx.beginPath();ctx.moveTo(prev[0],prev[1]);ctx.lineTo(x,y);ctx.stroke()}}
function clearSignature(){strokes=[];canvasDirty=false;const c=$('radioSignature');if(c)c.getContext('2d').clearRect(0,0,c.width,c.height)}
function signature(){if(!canvasDirty||!strokes.some(a=>a.length>=2))throw Error('Vui lòng ký xác nhận trực tiếp trên màn hình.');const c=$('radioSignature');let v=c.toDataURL('image/webp',0.45);if(!v.startsWith('data:image/webp;base64,')){v=c.toDataURL('image/png')}if(v.length>45000)throw Error('Chữ ký quá lớn. Xóa và ký lại nét ngắn gọn.');return v}
function tab(t){for(const id of ['devices','history','summary']){$('radio'+id[0].toUpperCase()+id.slice(1)+'Tab').hidden=id!==t;const btn=document.querySelector('[data-radio-tab="'+id+'"]');btn?.classList.toggle('selected',t===id)}$('radioPdfChoice').hidden=!isAdmin(currentUser())||t==='devices';$('radioReportControl').hidden=!isAdmin(currentUser())||t==='devices';cancel();if(t==='history'||t==='summary')subscribeHistory();else stopHistory();if(t==='summary')renderSummary()}
function close(){
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
function cancel(){resetCamera();choice=null;$('radioAction').hidden=true;clearSignature()}
function shift(){const h=Number(new Intl.DateTimeFormat('en-GB',{timeZone:VN,hour:'2-digit',hourCycle:'h23'}).format(new Date()));return h<12?'AM':'PM'}
function heldBy(uid){return devices.filter(d=>d.status==='OUT'&&d.holderUid===uid)}
function start(action,code){
 const u=currentUser(),d=devices.find(x=>x.code===code);
 if(!u.uid||!d)return notify('Cần đăng nhập và chọn máy hợp lệ.',true);
 if(!connected||!navigator.onLine)return notify('Chưa kết nối Firebase. Không thể ký nhận khi chưa đồng bộ trạng thái máy.',true);
 if(action==='ISSUE'&&heldBy(u.uid).length)return notify('Bạn đang giữ '+heldBy(u.uid).map(x=>label(x.code)).join(', ')+'. Phải ký trả máy đang giữ trước khi nhận máy khác.',true);
 if(action==='SWAP_OUT'&&heldBy(u.uid).some(x=>x.code!==code))return notify('Bạn đang giữ bộ đàm khác. Phải trả máy đó trước khi đổi máy.',true);
 if(action==='RELEASE'&&!isAdmin(u))return notify('Chỉ AD được đưa máy trở lại sử dụng.',true);
 if(['RETURN','SWAP_OUT'].includes(action)&&d.holderUid!==u.uid&&!isAdmin(u))return notify('Máy đang được người khác sử dụng; chỉ chủ máy hoặc AD được trả.',true);
 resetCamera();mode=action;choice=d;clearSignature();
 $('radioActionCode').value=label(code);$('radioPerson').value=u.name+' · '+u.uid.slice(0,8);
 $('radioShift').value=shift();$('radioReason').value='BATTERY_EMPTY';$('radioReturnReason').value='END_SHIFT';$('radioBattery').value='UNKNOWN';$('radioSwapBattery').value='UNKNOWN';$('radioDetail').value='';
 $('radioActionTitle').textContent=(action==='RELEASE'?'AD kiểm tra và xác nhận mở cấp lại':ACTS[action]||'Báo cáo')+' · '+label(code);
 $('radioDetail').placeholder=action==='RELEASE'?
  'Ghi kết quả kiểm tra: pin, sóng phát/thu, loa, mic/PTT; máy thất lạc phải xác nhận thu hồi.':
  'Ghi cụ thể hiện tượng, thời gian, vị trí…';
 $('radioReasonWrap').hidden=!['REPORT','SWAP_OUT'].includes(action);$('radioReturnReasonWrap').hidden=action!=='RETURN';
 $('radioBatteryWrap').hidden=action==='RELEASE';
 $('radioSwapWrap').hidden=action!=='SWAP_OUT';$('radioSwapBatteryWrap').hidden=action!=='SWAP_OUT';
 $('radioSigWrap').hidden=action==='RELEASE'||needsPhoto(action);
 const available=devices.filter(x=>x.status==='READY'&&x.code!==code);
 $('radioSwapTarget').innerHTML=available.map(x=>'<option value="'+esc(x.code)+'">'+esc(label(x.code))+'</option>').join('');
 if(action==='SWAP_OUT'&&!available.length)return notify('Không có máy sẵn sàng để đổi. Báo lỗi và liên hệ AD.',true);
 $('radioAction').hidden=false;updatePhotoUI();$('radioAction').scrollIntoView({behavior:'smooth',block:'start'});if(needsPhoto(action))void startCamera('old');
}
function badge(state){return '<span class="radioStatus radioStatus-'+state+'">'+(STATUSES[state]||state)+'</span>'}

function rosterLogin(v){return S(v).normalize('NFKC').toUpperCase().replace(/\s+/g,'')}
function rosterDutyShift(x){
 const direct=S(x.dutyShift||x.workShift||x.rosterShift||x.shiftCode||x.shift).toUpperCase();
 if(['AM','SANG','SÁNG','MORNING'].includes(direct))return 'AM';
 if(['PM','TOI','TỐI','EVENING','CHIEU','CHIỀU'].includes(direct))return 'PM';
 for(const key of ['dutyStart','shiftStart','startShift','sta','std']){
  const m=S(x[key]).match(/^([01]?\d|2[0-3]):?([0-5]\d)(?:\+\d+)?$/);
  if(m)return Number(m[1])<12?'AM':'PM';
 }
 return '';
}
function reconcileRoster(items,users,machines,history,day,which,now=Date.now()){
 const roster=new Set(),undated=new Set(),issued=new Set(),
 start=Date.parse(day+'T'+(which==='AM'?'00:00:00':'12:00:00')+'+07:00'),
 end=start+43200000;
 for(const x of items){
  if(!x||x.active===false||x.duplicateInactive===true||!S(x.flightId||x.flightRaw||x.flightName))continue;
  const names=S(x.user||x.targetUser).split(/[\/;,]+/).map(rosterLogin).filter(Boolean),sh=rosterDutyShift(x);
  for(const n of names){if(sh===which)roster.add(n);else if(!sh)undated.add(n)}
 }
 for(const x of history)if(x.shift===which&&['ISSUE','SWAP_IN'].includes(x.action))issued.add(S(x.personUid));
 const result={total:roster.size,missing:[],unreturned:[],holding:[],completed:[],unmapped:[],upcoming:[],undated:[...undated].filter(x=>!roster.has(x))};
 for(const name of roster){
  const uid=users.get(name),held=uid?machines.filter(d=>d.status==='OUT'&&d.holderUid===uid):[];
  if(!uid)result.unmapped.push(name);
  else if(held.length){
   const summary=name+' · '+held.map(d=>label(d.code)).join(', ');
   if(now>=end&&held.some(d=>d.shift===which&&d.updatedAt?.toDate?.()&&vnDateKey(d.updatedAt.toDate())===day))result.unreturned.push(summary);else result.holding.push(summary);
  }else if(issued.has(uid))result.completed.push(name);
  else if(now<start)result.upcoming.push(name);
  else result.missing.push(name);
 }
 return result;
}
function renderRosterAlert(){
 const el=$('radioRosterAlert');if(!el||!isAdmin(currentUser()))return;
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
  const start=new Date(day+'T00:00:00+07:00'),end=new Date(start.getTime()+86400000);
  const [u,e]=await Promise.all([
   fs().collection('users').get({source:'server'}),
   fs().collection(EVENTS).where('at','>=',start).where('at','<',end).orderBy('at','asc').limit(REPORT_LIMIT).get({source:'server'})
  ]);
  if(gen!==rosterGen||!isAdmin(currentUser()))return;
  if(e.docs.length>=REPORT_LIMIT)throw Error('Trên 300 sự kiện: không đối chiếu với dữ liệu thiếu.');
  rosterAccounts=new Map(u.docs.filter(d=>d.data().active!==false).map(d=>[rosterLogin(d.data().username),d.id]));
  rosterAudit=e.docs.map(d=>d.data());rosterReady=true;
 }catch(e){if(gen!==rosterGen)return;rosterReady=false;notify('Không đối chiếu được roster: '+errText(e),true)}
 finally{if(gen===rosterGen){rosterBusy=false;renderRosterAlert()}}
}
function renderAdminOverview(){
 const panel=$('radioAdminOverview'),target=$('radioAdminDashboard');
 if(!panel||!target)return;
 const admin=isAdmin(currentUser());panel.hidden=!admin;
 if(!admin){target.replaceChildren();return}
 const now=Date.now(),holds=devices.filter(d=>d.status==='OUT'),
  needs=devices.filter(d=>['CHARGING','FAULT','LOST'].includes(d.status)),
  overdue=holds.filter(d=>d.updatedAt?.toMillis?.()&&now-d.updatedAt.toMillis()>=OVERDUE_MS);
 const hour=d=>d.updatedAt?.toDate?.()?fmt(d.updatedAt.toDate()):'Đang đồng bộ';
 const holdItems=holds.length?holds.map(d=>{
  const late=overdue.includes(d);
  return '<li><div><strong>'+esc(label(d.code))+'</strong><span>'+esc(d.holderName||d.holderUid||'Chưa rõ người giữ')+'</span><small>'+esc(d.shift==='AM'?'Ca sáng':d.shift==='PM'?'Ca tối':'Chưa rõ ca')+' · Nhận/đổi gần nhất: '+esc(hour(d))+'</small></div>'+(late?'<em class="radioAdminWarn">Cần kiểm tra 12h+</em>':'<em class="radioAdminNormal">Đang giữ</em>')+'</li>'
 }).join(''):'<li class="radioAdminEmpty">Không có máy đang được ghi nhận sử dụng.</li>';
 const needItems=needs.length?needs.map(d=>'<li><div><strong>'+esc(label(d.code))+'</strong><span>'+esc(STATUSES[d.status]||d.status)+'</span><small>'+esc(REASON_TEXT[d.faultCode]||d.faultDetail||'Cần xác nhận tình trạng thực tế')+'</small></div><em class="radioAdminWarn">Theo dõi</em></li>').join(''):'<li class="radioAdminEmpty">Không có máy lỗi, mất hoặc đang sạc.</li>';
 target.innerHTML='<div class="radioAdminHighlights"><div><strong>'+holds.length+'</strong><span>Đang có người giữ</span></div><div><strong>'+overdue.length+'</strong><span>Cần kiểm tra trên 12h</span></div><div><strong>'+needs.length+'</strong><span>Đang sạc / lỗi / mất</span></div></div>'+
  '<div class="radioAdminColumns"><div class="radioAdminPanel"><h4>Người đang giữ máy <small>'+holds.length+' máy</small></h4><ul>'+holdItems+'</ul></div>'+
  '<div class="radioAdminPanel"><h4>Máy cần theo dõi <small>'+needs.length+' máy</small></h4><ul>'+needItems+'</ul></div></div>'+
  '<p class="radioAdminFoot"><b>Máy cần kiểm tra:</b> máy lỗi (FAULT) cách ly, không cấp phát; máy pin yếu (CHARGING) sạc rồi thử lại; máy mất (LOST) phải xác minh thu hồi. Chỉ AD sau khi kiểm tra pin, sóng, loa, mic/PTT và ghi kết quả mới được chọn “Đã kiểm tra / mở lại”.</p>'+
 '<p class="radioAdminFoot">Cảnh báo 12 giờ là mốc kiểm tra. Từ 04:00 ngày làm việc tiếp theo (giờ Việt Nam), người chưa ký trả bộ đàm ca trước không được nhận/mở chuyến report.</p>';
}
function render(){
 if(!$('radioDeviceList'))return;
 const u=currentUser(),held=heldBy(u.uid);$('radioSeed').hidden=!connected||!isAdmin(u)||INIT.every(code=>devices.some(x=>x.code===code));
 const counts=Object.fromEntries(Object.keys(STATUSES).map(k=>[k,devices.filter(x=>x.status===k).length]));
 $('radioStats').innerHTML='<div><strong>'+devices.length+'</strong><small>Tổng thiết bị</small></div><div><strong>'+counts.READY+'</strong><small>Sẵn sàng</small></div><div><strong>'+counts.OUT+'</strong><small>Đang giữ</small></div><div><strong>'+counts.CHARGING+'</strong><small>Đang sạc</small></div><div><strong>'+counts.FAULT+counts.LOST+'</strong><small>Lỗi / mất</small></div>';
 renderAdminOverview();renderRosterAlert();
 $('radioDeviceList').innerHTML=devices.length?devices.map(d=>{
  const mine=d.holderUid===u.uid,admin=isAdmin(u),buttons=[];
  if(connected&&d.status==='READY'){if(!held.length)buttons.push(['ISSUE','Ký nhận']);buttons.push(['REPORT','Báo lỗi'])}
  if(connected&&d.status==='OUT'&&(mine||admin))buttons.push(['RETURN','Trả máy'],['SWAP_OUT','Đổi máy'],['REPORT','Báo lỗi']);
  if(connected&&['FAULT','CHARGING','LOST'].includes(d.status)&&admin)buttons.push(['RELEASE','Đã kiểm tra / mở lại']);
  const status=d.status==='OUT'?'Đang giữ: '+esc(d.holderName||d.holderUid.slice(0,8)):(d.faultCode?('Lý do: '+esc(REASON_TEXT[d.faultCode]||d.faultCode)):'');
  return '<article class="radioDevice"><div><strong>'+esc(label(d.code))+'</strong>'+badge(d.status)+'<small>'+status+'</small></div><div class="radioButtons">'+buttons.map(([a,n])=>'<button type="button" data-radio-act="'+a+'" data-radio-code="'+esc(d.code)+'">'+n+'</button>').join('')+'</div></article>'
 }).join(''):'<p class="radioEmpty">'+(connected?'Chưa có mã máy. AD hãy khởi tạo danh mục bộ đàm từ sổ giấy.':'Chưa xác nhận kết nối Firebase. Không thể ký nhận cho đến khi kích hoạt.')+'</p>';
 if(held.length&&!isAdmin(u))$('radioDeviceList').insertAdjacentHTML('afterbegin','<p class="radioHeldNotice">📻 Bạn đang giữ '+esc(held.map(x=>label(x.code)).join(', '))+'. Hãy ký trả trước khi nhận máy khác; thao tác Đổi máy được thực hiện đồng thời.</p>');
 renderHistory();if(!$('radioSummaryTab')?.hidden)renderSummary();
}
function vnDateKey(date){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:VN,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).map(x=>[x.type,x.value]));
 return parts.year+'-'+parts.month+'-'+parts.day;
}
function reportScope(){return reportDate+' · '+(reportShift==='AM'?'Ca sáng':'Ca tối')+' (giờ VN)'}
function clearShiftReport(){
 reportToken++;reportReady=false;reportLoading=false;reportVerified=false;reportEvents=[];reportDate='';reportShift='AM';
 const x=$('radioReportState');if(x)x.textContent='Chọn ngày và ca, bấm Tải báo cáo ca để lấy đúng lịch sử Firebase.';
 const b=$('radioReportLoad');if(b)b.disabled=false;
}
async function loadShiftReport(){
 if(!isAdmin(currentUser()))return notify('Báo cáo đầy đủ theo ngày/ca dành cho tài khoản AD.',true);
 if(reportLoading||!connected||!navigator.onLine)return notify('Cần mạng và Firebase trực tuyến để tải báo cáo theo ca.',true);
 const day=S($('radioReportDate')?.value),shift=S($('radioReportShift')?.value);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!['AM','PM'].includes(shift)||new Date(day+'T00:00:00+07:00').toString()==='Invalid Date')return notify('Chọn đúng ngày và ca để tải.',true);
 const today=vnDateKey(new Date());if(day>today)return notify('Không thể xuất báo cáo cho ngày trong tương lai.',true);
 const token=++reportToken;reportLoading=true;reportReady=false;reportVerified=false;reportEvents=[];
 $('radioReportLoad').disabled=true;$('radioReportState').textContent='Đang lấy dữ liệu ngày '+day+' từ Firebase. Không sử dụng dữ liệu cache…';
 try{
  const start=new Date(day+'T00:00:00+07:00'),end=new Date(start.getTime()+86400000),db=fs();
  const rows=await db.collection(EVENTS).where('at','>=',start).where('at','<',end).orderBy('at','asc').limit(REPORT_LIMIT).get({source:'server'});
  if(token!==reportToken||!isAdmin(currentUser()))return;
  if(rows.docs.length>=REPORT_LIMIT)throw Error('Ngày có trên 300 sự kiện. Không xuất báo cáo thiếu dữ liệu; cần chia nhỏ hoặc xuất từ máy chủ.');
  reportEvents=rows.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.at?.toMillis?.()||0)-(a.at?.toMillis?.()||0));
  reportDate=day;reportShift=shift;reportReady=true;reportVerified=true;
  $('radioHistoryDevice').value='';$('radioHistoryAction').value='';$('radioHistorySearch').value='';
  const count=reportEvents.filter(e=>e.shift===shift).length;
  $('radioReportState').textContent='✓ '+reportScope()+': '+count+' sự kiện · '+reportEvents.length+' sự kiện cả ngày đã kiểm tra trực tuyến.';
  notify('Đã tải đủ '+count+' sự kiện của '+reportScope()+'. Chọn kèm ảnh (AD) nếu cần đối chiếu.',false);
 }catch(e){
  if(token!==reportToken)return;
  reportEvents=[];reportReady=false;reportVerified=false;reportDate='';
  $('radioReportState').textContent='⚠ Không lấy được báo cáo: '+S(e?.message||e);
  notify('Chưa thể xuất báo cáo ca: '+errText(e),true);
 }finally{
  if(token===reportToken){reportLoading=false;$('radioReportLoad').disabled=false;renderHistory();renderSummary()}
 }
}
function filteredHistory(){
 const now=Date.now(),device=S($('radioHistoryDevice')?.value),action=S($('radioHistoryAction')?.value),search=S($('radioHistorySearch')?.value).toLocaleLowerCase('vi-VN');
 const date=d=>new Intl.DateTimeFormat('en-CA',{timeZone:VN,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
 return (reportReady?reportEvents:events).filter(e=>{
  if(reportReady&&e.shift!==reportShift)return false;
  const at=e.at?.toMillis?.()||0;
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
 if(meta)meta.textContent=rows.length+' sự kiện phù hợp | '+rows.filter(e=>!!e.signature).length+' có ảnh/chữ ký | '+rows.filter(e=>/^data:image\/png;base64,/.test(S(e.signature))).length+' ảnh PNG dự phòng (có thể mờ; AD cần xác minh quy tắc JPEG trên Firebase) | '+(reportReady?reportScope()+' · Đã kiểm tra máy chủ':events.length>=120?'Lịch sử gần đây, không dùng làm báo cáo đầy đủ theo ngày.':'Lịch sử theo quyền tài khoản.');
 if(!rows.length){wrap.innerHTML='<p class="radioEmpty">Không có lịch sử phù hợp bộ lọc.</p>';return;}
 wrap.innerHTML='<div class="radioAudit"><div class="radioAuditHead"><span>Thời gian</span><span>Máy / sự kiện</span><span>Người thực hiện</span><span>Trạng thái / ghi chú</span><span>Bằng chứng</span></div>'+
 rows.map(e=>{
  const kind=['REPORT','SWAP_OUT'].includes(e.action)?'warning':['ISSUE','SWAP_IN'].includes(e.action)?'issued':e.action==='RETURN'?'returned':'neutral';
  const note=[e.beforeStatus&&e.afterStatus?(STATUSES[e.beforeStatus]||e.beforeStatus)+' → '+(STATUSES[e.afterStatus]||e.afterStatus):'',REASON_TEXT[e.reasonCode]||'',e.details||''].filter(Boolean).join(' · ');
  return '<article class="radioAuditRow"><div><small>THỜI GIAN</small><b>'+esc(e.at?.toDate?.()?fmt(e.at.toDate()):'Đang đồng bộ')+'</b></div><div><small>THIẾT BỊ</small><strong>'+esc(label(e.deviceCode))+'</strong><span class="radioActionBadge radioActionBadge-'+kind+'">'+esc(ACTS[e.action]||e.action)+'</span></div><div><small>NGƯỜI KÝ</small><b>'+esc(e.actorName||e.actorUid||'—')+'</b><span class="radioDetailText">'+esc(e.shift||'—')+'</span></div><div><small>TRẠNG THÁI / GHI CHÚ</small><span class="radioDetailText">'+esc(note||'Không có ghi chú')+'</span></div><div><small>BẰNG CHỨNG</small>'+(e.signature?'<button type="button" class="radioViewProof" data-radio-proof="'+esc(e.id)+'">📷 Xem ảnh / chữ ký</button>':'<span class="radioDetailText">Không có ảnh</span>')+'</div></article>';
 }).join('')+'</div>';
}
function radioShiftDeviceMatrix(rows){
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
 return '<div class="radioAdminMatrix"><h4>Đối soát theo từng máy trong ca</h4><p class="radioHint">Số nhận/trả là lượt phát sinh trong ca đã chọn, không phải số máy còn giữ ở hiện tại.</p>'+
 '<div class="radioAdminMatrixScroll"><table><thead><tr><th>Máy</th><th>Nhận</th><th>Trả</th><th>Đổi / lỗi</th><th>Thao tác cuối · người thực hiện</th></tr></thead><tbody>'+
 items.map(d=>'<tr><th>'+esc(label(d.code))+'</th><td>'+d.received+'</td><td>'+d.returned+'</td><td>'+d.swap+' / '+d.fault+'</td><td>'+esc(d.last)+' · '+esc(d.who||'—')+'</td></tr>').join('')+'</tbody></table></div></div>';
}
function renderSummary(){
 if(isAdmin(currentUser())&&!reportReady){
  $('radioSummary').innerHTML='<p class="radioEmpty">Để xem báo cáo ca chính xác: chọn NGÀY và CA ở phía trên, rồi bấm TẢI BÁO CÁO CA. Không dùng dữ liệu gần đây để suy ra lịch sử ca trước.</p>';return;
 }
 if(reportReady){
  const rows=filteredHistory(),n=rows.filter(x=>x.action==='ISSUE').length,r=rows.filter(x=>x.action==='RETURN').length,
   swaps=rows.filter(x=>x.action==='SWAP_OUT').length,errors=rows.filter(x=>x.action==='REPORT').length;
  $('radioSummary').innerHTML='<h4>Đối soát '+esc(reportScope())+'</h4><div class="radioReportGrid">'+
   [['Nhận máy',n],['Trả máy',r],['Đổi máy',swaps],['Báo lỗi',errors]].map(x=>'<div><strong>'+x[1]+'</strong><small>'+x[0]+'</small></div>').join('')+
   '</div>'+radioShiftDeviceMatrix(rows)+'<p class="radioHint">Tổng '+rows.length+' sự kiện theo bộ lọc. Số lượt không phải số máy hiện còn giữ; trạng thái hiện tại không dùng để suy ra lịch sử ca trước.</p>';
  return;
 }
 const n=events.filter(x=>['SWAP_OUT'].includes(x.action)).length,issues=events.filter(x=>['REPORT','SWAP_OUT'].includes(x.action)),pending=devices.filter(x=>['FAULT','CHARGING','LOST'].includes(x.status));
 const now=Date.now(),using=devices.filter(x=>x.status==='OUT'),overdue=using.filter(x=>x.updatedAt?.toMillis?.()&&now-x.updatedAt.toMillis()>=OVERDUE_MS);
 const admin=isAdmin(currentUser()),holds=using.map(x=>'<p>'+esc(label(x.code))+' · '+esc(x.holderName||'Không rõ người nhận')+(overdue.includes(x)?' <strong class="radioOverdue">ĐANG GIỮ TRÊN 12 GIỜ</strong>':'')+'</p>').join('');
 $('radioSummary').innerHTML='<div class="radioReportGrid"><div><strong>'+n+'</strong><small>Lần đổi máy (lịch sử gần đây)</small></div><div><strong>'+issues.length+'</strong><small>Lần ghi nhận vấn đề</small></div><div><strong>'+pending.length+'</strong><small>Máy cần xử lý ngay</small></div>'+(admin?'<div><strong>'+overdue.length+'</strong><small>Máy giữ trên 12 giờ</small></div>':'')+'</div><h4>Cần kiểm tra</h4>'+(pending.length?pending.map(d=>'<p>'+esc(label(d.code))+' · '+esc(STATUSES[d.status])+' · '+esc(REASON_TEXT[d.faultCode]||'')+'</p>').join(''):'<p>Không có máy đang treo trạng thái lỗi/sạc.</p>')+(admin?'<h4>Đang sử dụng / đối soát người giữ</h4>'+(using.length?holds:'<p>Tất cả máy đã được trả hoặc chưa cấp.</p>'):'')+'<p class="radioHint">Cảnh báo giữ trên 12 giờ là ngưỡng kiểm tra, không kết luận nhân viên hết ca. Giờ máy chủ Firebase là thời điểm ghi nhận.</p><p class="radioHint">Báo cáo này chỉ tổng hợp sự kiện đã tải. Báo cáo ngày/tuần chính thức được tính trên máy chủ, không dựa vào giới hạn 120 mục.</p>';
}
function evidenceDetails(details,captureMs){
 if(!Number.isFinite(captureMs)||captureMs<=0)return details;
 return (S(details).slice(0,450)+' | Ảnh thiết bị UTC: '+new Date(captureMs).toISOString()).slice(0,500);
}
function photoAudit(e){
 const serverMs=e?.at?.toMillis?.()||0;
 const match=S(e?.details).match(/Ảnh thiết bị UTC: (\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z)/);
 const deviceMs=match?Date.parse(match[1]):NaN;
 const delta=serverMs&&Number.isFinite(deviceMs)?Math.round(Math.abs(serverMs-deviceMs)/60000):null;
 return {serverMs,deviceMs:Number.isFinite(deviceMs)?deviceMs:null,delta,
  status:!serverMs?'CHƯA CÓ GIỜ MÁY CHỦ':!match?'ẢNH CŨ: CẦN ĐỐI CHIẾU BẰNG MẮT':delta>10?'CẢNH BÁO: LỆCH TRÊN 10 PHÚT':'GIỜ THIẾT BỊ GẦN GIỜ GHI FIREBASE'};
}
function eventData(action,device,after,user,shiftVal,reason,details,sig,related='',swapId=''){
 return {schemaVersion:1,action,deviceCode:device.code,actorUid:user.uid,actorName:user.name,
 personUid:['ISSUE','SWAP_IN'].includes(action)?user.uid:(device.holderUid||''),personName:['ISSUE','SWAP_IN'].includes(action)?user.name:(device.holderName||''),
 shift:shiftVal,reasonCode:reason,details:details.slice(0,500),signature:sig,
 beforeStatus:device.status,afterStatus:after.status,deviceVersion:device.version+1,
 relatedDeviceCode:related,swapId,at:fv()};
}
function updateDevice(tx,ref,device,action,after,options){
 const evRef=fs().collection(EVENTS).doc(),ev=eventData(action,device,after,options.user,options.shift,options.reason,options.details,options.sig,options.related,options.swapId);
 tx.set(evRef,ev);
 // A single transaction commits both the compact receipt and high-quality proof.
 if(options.fullProof){
  tx.set(fs().collection(PROOFS).doc(evRef.id),{
   schemaVersion:2,eventId:evRef.id,actorUid:options.user.uid,
   deviceCode:device.code,action,capturedAtMs:options.photoAt,image:options.fullProof
  });
 }
 tx.update(ref,{...after,version:device.version+1,lastEventId:evRef.id,updatedAt:fv()});
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
 const code=choice.code,reason=$('radioReason').value,rawDetail=S($('radioDetail').value),returnReason=$('radioReturnReason').value,shiftVal=$('radioShift').value,bat=$('radioBattery').value,swapBattery=$('radioSwapBattery').value;
 if(mode==='RETURN'&&returnReason==='OTHER'&&rawDetail.length<10)return notify('Lý do trả khác cần mô tả ít nhất 10 ký tự.',true);
 const details=mode==='RETURN'?('Lý do trả: '+(RETURN_REASONS[returnReason]||RETURN_REASONS.END_SHIFT)+(rawDetail?' · '+rawDetail:'')):rawDetail;
 if(['REPORT','SWAP_OUT'].includes(mode)&&(reason==='OTHER'||reason==='LOST')&&details.length<10)return notify('Vui lòng mô tả lý do cụ thể (từ 10 ký tự).',true);
 if(mode==='RELEASE'){
  if(details.length<20)return notify('AD phải ghi kết quả kiểm tra ít nhất 20 ký tự: pin, sóng, loa, mic/PTT và tình trạng thực tế.',true);
  if(!root.confirm('XÁC NHẬN ĐÃ KIỂM TRA TRỰC TIẾP '+label(code)+'?\n\nMáy chỉ được mở cấp lại sau khi pin, sóng phát/thu, loa và mic/PTT hoạt động tốt. Máy đã báo mất phải được thu hồi.\n\nKết quả đã ghi sẽ được lưu trên Firebase.'))return notify('Chưa xác nhận kiểm tra. Máy vẫn khóa cấp phát.',true);
 }
 let sig='',sigNew='',hiOld='',hiNew='',usedLegacyPng=false,usedCompactOnly=false;try{if(mode!=='RELEASE'){signature();if(needsPhoto(mode)){if(!photosReady())throw Error('Phải chụp ảnh bằng camera trước khi ký.');if(Date.now()-photos.old.at>600000||(mode==='SWAP_OUT'&&Date.now()-photos.new.at>600000))throw Error('Ảnh quá 10 phút, vui lòng chụp lại.')}}}catch(e){return notify(e.message,true)}
 if(['ISSUE','RETURN'].includes(mode)&&bat==='UNKNOWN')return notify('Vui lòng kiểm tra mức pin trước khi nhận hoặc trả máy.',true);
 if(mode==='ISSUE'&&['LOW','EMPTY'].includes(bat))return notify('Máy pin yếu/hết pin không được cấp phát. Báo lỗi pin để đưa máy về trạng thái chờ sạc.',true);
 if(mode==='SWAP_OUT'&&!['FULL','GOOD'].includes(swapBattery))return notify('Vui lòng kiểm tra máy thay thế có pin Đầy hoặc Đủ dùng trước khi đổi.',true);
 if(!connected)return notify('Chưa xác nhận kết nối Firebase. Không thể ghi nhận.',true);
 if(!navigator.onLine)return notify('Đang ngoại tuyến: không cho phép nhận/trả vì có thể xảy ra nhận trùng máy.',true);
 setBusy(true);
 notify('Đang xử lý ảnh chụp và chữ ký để ghi Firebase…');
 try{
  await new Promise(resolve=>requestAnimationFrame(resolve));
  if(mode!=='RELEASE'){
   if(needsPhoto(mode)){
    hiOld=combineFullProof('old');sig=combineProof('old');
    if(mode==='SWAP_OUT'){hiNew=combineFullProof('new');sigNew=combineProof('new')}
   }else sig=signature();
  }
  notify('Đang xác nhận với Firebase, vui lòng không bấm lại…');
 const writeRadioTransaction=async(withFull=true)=>{
 const db=fs(),ref=db.collection(COLLECTION).doc(code);
 if(mode==='SWAP_OUT'){
  const other=$('radioSwapTarget').value,ref2=db.collection(COLLECTION).doc(other),swapId=db.collection(EVENTS).doc().id;
  await db.runTransaction(async tx=>{
   const inventory=await transactionInventory(tx,db,code,other),a=inventory.get(code),b=inventory.get(other);
    assertSingleHolder(inventory,user.uid,code);
   if(!a||a.status!=='OUT'||(!isAdmin(user)&&a.holderUid!==user.uid))throw Error('Máy cũ không còn hợp lệ để đổi.');
   if(!b||b.status!=='READY')throw Error('Máy thay thế vừa có người nhận. Vui lòng chọn máy khác.');
   const oldNew={status:['BATTERY_EMPTY','BATTERY_WEAK'].includes(reason)?'CHARGING':'FAULT',holderUid:'',holderName:'',shift:'',faultCode:reason,faultDetail:details,battery:bat};
   updateDevice(tx,ref,a,'SWAP_OUT',oldNew,{user,shift:shiftVal,reason,details:evidenceDetails(details,photos.old?.at),sig,related:other,swapId,fullProof:withFull?hiOld:'',photoAt:photos.old?.at});
   const newNew={status:'OUT',holderUid:user.uid,holderName:user.name,shift:shiftVal,faultCode:'',faultDetail:'',battery:swapBattery};
   updateDevice(tx,ref2,b,'SWAP_IN',newNew,{user,shift:shiftVal,reason,details:evidenceDetails(details,photos.new?.at),sig:sigNew,related:code,swapId,fullProof:withFull?hiNew:'',photoAt:photos.new?.at});
  });
 }else{
  await db.runTransaction(async tx=>{
   const inventory=await transactionInventory(tx,db,code),d=inventory.get(code);if(!d)throw Error('Không tìm thấy mã máy.');
   let after,action=mode,reasonCode=reason;
   if(mode==='ISSUE'){assertSingleHolder(inventory,user.uid);if(d.status!=='READY')throw Error('Máy đã được nhận hoặc chưa sẵn sàng.');after={status:'OUT',holderUid:user.uid,holderName:user.name,shift:shiftVal,faultCode:'',faultDetail:'',battery:bat};reasonCode='';}
   else if(mode==='RETURN'){
    if(d.status!=='OUT'||(d.holderUid!==user.uid&&!isAdmin(user)))throw Error('Chỉ người đang giữ máy hoặc AD được trả.');
    const f=bat==='EMPTY'||bat==='LOW';after={status:f?'CHARGING':'READY',holderUid:'',holderName:'',shift:'',faultCode:f?'BATTERY_WEAK':'',faultDetail:f?details:'',battery:bat};reasonCode=f?'BATTERY_WEAK':'';}
   else if(mode==='REPORT'){
    if(d.status!=='OUT'&&d.status!=='READY')throw Error('Không thể ghi sự cố trên trạng thái hiện tại.');
    if(d.status==='OUT'&&d.holderUid!==user.uid&&!isAdmin(user))throw Error('Chỉ người giữ hoặc AD được báo lỗi máy đang dùng.');
    after={status:reason==='LOST'?'LOST':['BATTERY_EMPTY','BATTERY_WEAK'].includes(reason)?'CHARGING':'FAULT',holderUid:'',holderName:'',shift:'',faultCode:reason,faultDetail:details,battery:bat};}
   else if(mode==='RELEASE'){if(!isAdmin(user)||!['FAULT','CHARGING','LOST'].includes(d.status))throw Error('Chỉ AD mới có thể xác nhận máy đủ điều kiện sử dụng.');after={status:'READY',holderUid:'',holderName:'',shift:'',faultCode:'',faultDetail:'',battery:'GOOD'};reasonCode='';}
   else throw Error('Tác vụ không được hỗ trợ.');
   updateDevice(tx,ref,d,action,after,{user,shift:shiftVal,reason:reasonCode,details:evidenceDetails(details,photos.old?.at),sig,related:'',swapId:'',fullProof:withFull?hiOld:'',photoAt:photos.old?.at});
  });
 }

 };
 try{await writeRadioTransaction(true)}
 catch(error){
  // Rules not yet deployed? Keep the original atomic signing flow alive.
  if(!String(error?.code||'').includes('permission-denied')||!hiOld)throw error;
  usedCompactOnly=true;
  try{await writeRadioTransaction(false)}
  catch(legacyError){
   if(!String(legacyError?.code||'').includes('permission-denied')||
    !/^data:image\/jpeg;base64,/.test(sig))throw legacyError;
   notify('Firebase chưa cho phép JPEG. Đang dùng ảnh PNG tương thích…');
   await new Promise(resolve=>requestAnimationFrame(resolve));
   sig=combineProof('old','png');usedLegacyPng=true;
   if(mode==='SWAP_OUT')sigNew=combineProof('new','png');
   await writeRadioTransaction(false);
  }
 }
 let localBackupOk=true;
 if(usedCompactOnly&&hiOld){
  try{
   const tasks=[saveLocalFullProof(user.uid,code,mode,photos.old,hiOld)];
   if(mode==='SWAP_OUT')tasks.push(saveLocalFullProof(user.uid,$('radioSwapTarget').value,'SWAP_IN',photos.new,hiNew));
   localBackupOk=(await Promise.all(tasks)).every(Boolean);
  }catch(error){localBackupOk=false;console.warn('Radio local photo backup failed',error?.message||error)}
 }
 if(isAdmin(user))queueRosterAudit(150);
  cancel();notify(usedCompactOnly?
 'Đã lưu ký nhận lên Firebase nhưng CHƯA lưu được ảnh rõ nét trên máy chủ'+(usedLegacyPng?' (PNG bị giảm kích thước).':'.')+
 (localBackupOk?' Ảnh rõ lưu tạm trên điện thoại này; AD máy khác chưa xem rõ.':' Không lưu được ảnh rõ trên thiết bị.')+
 ' AD cần triển khai Firestore Rules V2.2.':
 '✓ Đã lưu ảnh bộ đàm V2.2 rõ nét, đúng màu và chữ ký với giờ Firebase.');
 }catch(e){notify(errText(e),true)}finally{setBusy(false)}
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
function pdfBuild(canvases){
 const max=2+canvases.length*3,ofs=Array(max+1).fill(0),chunks=[];let pos=0;
 const add=v=>{chunks.push(v);pos+=typeof v==='string'?v.length:v.byteLength};
 const object=(id,v)=>{ofs[id]=pos;add(id+' 0 obj\n'+v+'\nendobj\n')};
 add('%PDF-1.4\n');object(1,'<< /Type /Catalog /Pages 2 0 R >>');
 object(2,'<< /Type /Pages /Kids ['+canvases.map((_,i)=>(3+3*i)+' 0 R').join(' ')+'] /Count '+canvases.length+' >>');
 canvases.forEach((c,i)=>{
  const id=3+i*3,content=id+1,img=id+2,cmd='q\n595 0 0 842 0 0 cm\n/Im1 Do\nQ\n';
  object(id,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im1 '+img+' 0 R >> >> /Contents '+content+' 0 R >>');
  object(content,'<< /Length '+cmd.length+' >>\nstream\n'+cmd+'endstream');
  const jpg=Uint8Array.from(atob(c.toDataURL('image/jpeg',0.82).split(',')[1]),x=>x.charCodeAt(0));
  ofs[img]=pos;add(img+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+c.width+' /Height '+c.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpg.length+' >>\nstream\n');add(jpg);add('\nendstream\nendobj\n');c.width=1;c.height=1;
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
 const cv=document.createElement('canvas');cv.width=900;cv.height=1273;
 const x=cv.getContext('2d'),audit=photoAudit(e),hasProof=!!e.signature;
 x.fillStyle='#fff';x.fillRect(0,0,900,1273);
 x.fillStyle='#082e45';x.fillRect(0,0,900,16);
 x.fillStyle='#143d54';x.font='bold 23px Arial';x.fillText('SAGS | BẰNG CHỨNG KÝ NHẬN BỘ ĐÀM',35,65);
 x.font='bold 25px Arial';x.fillText(label(e.deviceCode)+' · '+(ACTS[e.action]||e.action),35,112);
 x.fillStyle='#365b70';x.font='17px Arial';
 x.fillText('Người thực hiện: '+S(e.actorName||e.actorUid||'—').slice(0,65),35,153);
 x.fillText('UID: '+S(e.actorUid||'—').slice(0,70)+'  |  Ca: '+S(e.shift||'—'),35,182);
 x.fillText('Sự kiện Firebase (VN): '+(audit.serverMs?fmt(new Date(audit.serverMs)):'CHƯA XÁC MINH'),35,219);
 x.fillText('Ảnh theo giờ thiết bị (VN): '+(audit.deviceMs?fmt(new Date(audit.deviceMs)):'XEM GIỜ IN TRÊN ẢNH'),35,249);
 x.fillStyle=audit.delta>10?'#ad2626':'#235c65';x.font='bold 18px Arial';
 x.fillText(audit.status+(audit.delta!==null?' · chênh lệch khoảng '+audit.delta+' phút':''),35,284);
 x.fillStyle='#d2e1e8';x.fillRect(35,310,830,755);
 if(hasProof){
  try{const img=await proofImage(fullProof||await highProofData(e));const ratio=Math.min(810/img.width,730/img.height);
   const w=img.width*ratio,h=img.height*ratio;x.drawImage(img,450-w/2,687-h/2,w,h);
  }catch(_){x.fillStyle='#aa2727';x.font='bold 20px Arial';x.fillText('ẢNH LỖI / KHÔNG ĐỌC ĐƯỢC',70,690)}
 }else{x.fillStyle='#744f2a';x.font='bold 21px Arial';x.fillText('SỰ KIỆN KHÔNG CÓ ẢNH',70,690)}
 x.fillStyle='#24475b';x.font='16px Arial';x.fillText('ID bất biến: '+S(e.id||'—').slice(0,85),35,1104);
 x.font='15px Arial';pdfWrap(x,e.details||'Không có ghi chú',815).forEach((line,i)=>x.fillText(line,35,1140+22*i));
 x.fillStyle='#667b87';x.font='13px Arial';
 x.fillText('Ảnh gồm hình camera và chữ ký. Giờ ảnh do thiết bị cung cấp, không phải đồng hồ máy chủ.',35,1202);
 x.fillText('Đối chiếu trực quan ảnh thực tế; không coi timestamp trên ảnh là bằng chứng độc lập.',35,1225);
 x.fillText('Trang '+index+'/'+total+' · chỉ những sự kiện đã tải theo bộ lọc',35,1248);
 return cv;
}
function pdfStoredPage(cv){
 const width=cv.width,height=cv.height;
 const jpeg=cv.toDataURL('image/jpeg',0.9);
 cv.width=1;cv.height=1;
 return {width,height,toDataURL:()=>jpeg};
}
async function exportPhotoPdf(){
 if(!isAdmin(currentUser()))return notify('Chỉ tài khoản AD được xuất lịch sử kèm ảnh.',true);
 if(!connected||!navigator.onLine||!isAdmin(currentUser())||!reportReady||!reportVerified)return notify('AD cần chọn ngày, ca và bấm Tải báo cáo ca từ Firebase trước khi xuất ảnh.',true);
 const rows=filteredHistory();
 if(!rows.length)return notify('Không có lịch sử phù hợp bộ lọc.',true);
 if(rows.some(e=>!e.at?.toMillis?.()))return notify('Lịch sử có sự kiện chưa xác minh giờ Firebase. Hãy đồng bộ lại.',true);
 const a=$('radioExport'),b=$('radioSummaryExport');
 if(a?.disabled||b?.disabled)return;
 if(/iPhone|iPad|iPod/.test(navigator.userAgent||'')&&rows.length>40)return notify('Báo cáo kèm quá 40 ảnh trên iPhone có thể khiến Safari tải lại. Chọn PDF không ảnh hoặc xuất kèm ảnh trên PC để đủ dữ liệu.',true);
 if(a)a.disabled=true;if(b)b.disabled=true;
 const proofCount=rows.filter(e=>/^data:image\/(webp|png|jpeg);base64,/.test(S(e.signature))).length;
 notify('Đang tạo PDF có bảng tổng hợp và '+rows.length+' trang đối chiếu ảnh/chữ ký…');
 try{
  const scope=reportScope();
  const summaryPages=Math.ceil(rows.length/19),allPages=summaryPages+rows.length,stored=[],totals=radioReportCounts(rows);
  for(let i=0;i<rows.length;i+=19){
   stored.push(pdfStoredPage(pdfPage(rows.slice(i,i+19),stored.length+1,allPages,scope,true,totals)));
  }
  // Limit concurrent Firebase image loads to four to control mobile memory.
  for(let i=0;i<rows.length;i+=4){
   await new Promise(done=>requestAnimationFrame(done));
   const batch=rows.slice(i,i+4),full=await Promise.all(batch.map(e=>highProofData(e)));
   for(let j=0;j<batch.length;j++)
    stored.push(pdfStoredPage(await photoPdfPage(batch[j],summaryPages+i+j+1,allPages,full[j])));
  }
  if(!isAdmin(currentUser()))throw Error('Tài khoản không còn quyền AD');
  const blob=pdfBuild(stored),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download='SAGS-BO-DAM-'+reportDate+'-'+reportShift+'-KEM-ANH.pdf';
  document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  notify('Đã xuất PDF ca '+reportScope()+': '+rows.length+' sự kiện, '+proofCount+' có ảnh, '+(rows.length-proofCount)+' không có ảnh.');
 }catch(e){notify('Không xuất được PDF kèm ảnh: '+S(e?.message||e),true)}
 finally{if(a)a.disabled=false;if(b)b.disabled=false}
}
async function exportPdf(){
 if(isAdmin(currentUser())&&(!reportReady||!reportVerified))return notify('Chọn ngày và ca → Tải báo cáo ca → Xuất PDF. Không xuất từ lịch sử gần đây.',true);
 if($('radioPdfIncludePhotos')?.checked&&isAdmin(currentUser()))return exportPhotoPdf();
 const rows=filteredHistory();if(!rows.length)return notify('Không có sự kiện để xuất PDF.',true);
 const a=$('radioExport'),b=$('radioSummaryExport');if(a?.disabled||b?.disabled)return;
 if(a)a.disabled=true;if(b)b.disabled=true;notify('Đang tạo báo cáo PDF...');
 try{
  await new Promise(done=>requestAnimationFrame(done));
  const scope=isAdmin(currentUser())?reportScope():'Lịch sử cá nhân đã tải',pages=[];
  for(let i=0;i<rows.length;i+=19)pages.push(rows.slice(i,i+19));
  const totals=radioReportCounts(rows),blob=pdfBuild(pages.map((v,i)=>pdfPage(v,i+1,pages.length,scope,false,totals))),href=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=href;link.download='SAGS-BO-DAM-'+(reportReady?reportDate+'-'+reportShift:new Date().toISOString().slice(0,10))+'-BAO-CAO.pdf';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(href),60000);
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
 const query=isAdmin(u)?db.collection(EVENTS).orderBy('at','desc').limit(historyLimit):db.collection(EVENTS).where('actorUid','==',u.uid).limit(historyLimit);
 historyStop=query.onSnapshot(s=>{
  historyVerified=!s.metadata.fromCache&&navigator.onLine;
  events=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.at?.toMillis?.()||0)-(a.at?.toMillis?.()||0));
  renderHistory();renderSummary();
 },e=>{historyVerified=false;events=[];renderHistory();renderSummary();notify(errText(e),true)});
}
async function open(){
 tpl();const u=currentUser();$('radioPdfChoice').hidden=true;if(!u.uid){$('sagsRadioPanel').hidden=false;notify('Đang chờ xác thực Firebase. Kiểm tra đăng nhập hoặc mở lại sau khi kết nối.',true);return}
 $('sagsRadioPanel').hidden=false;notify('Đang tải danh mục thiết bị…');tab('devices');if(isAdmin(u)&&!rosterDate)watchRoster();
 if(unsubs.length)return;
 connected=false;devices=[];events=[];render();
 try{
  const db=fs();
  unsubs.push(db.collection(COLLECTION).onSnapshot(s=>{connected=!s.metadata.fromCache&&navigator.onLine;devices=s.docs.map(d=>({code:d.id,...d.data()})).sort((a,b)=>a.code.localeCompare(b.code,'vi',{numeric:true}));render();if(connected&&rosterDate)queueRosterAudit();notify(connected?(devices.length?'Đã kết nối Firebase – có thể ký nhận.':'Đã kết nối Firebase – AD cần khởi tạo danh mục máy.'):'Đang xem bản lưu cục bộ; cần kết nối Firebase để ký nhận.',!connected)},e=>{connected=false;devices=[];events=[];render();notify(errText(e),true)}));
  // Heavy photographic history is fetched only when its tab is opened.
 }catch(e){notify(errText(e),true)}
}
root.SAGSRadioCustodyV1=Object.freeze({open,close,reasons:REASONS.map(([code,name])=>({code,name})),collection:COLLECTION,eventsCollection:EVENTS});
})(window);

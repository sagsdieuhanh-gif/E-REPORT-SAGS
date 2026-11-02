/* E-REPORT SAGS – radio custody (standalone feature, Firebase Firestore).
   Requires Firebase Firestore production rules to be deployed before enabling real signing.
   All custody writes are atomic and server-timestamped. NO local success simulation. */
(function(root){
'use strict';
if(root.SAGSRadioCustodyV1)return;
const COLLECTION='sags_radio_devices_v1',EVENTS='sags_radio_events_v1';
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
const STATUSES={READY:'Sẵn sàng',OUT:'Đang sử dụng',CHARGING:'Đang sạc',FAULT:'Ngừng cấp / lỗi',LOST:'Thất lạc'};
const ACTS={INIT:'Khởi tạo',ISSUE:'Nhận máy',RETURN:'Trả máy',REPORT:'Báo sự cố',SWAP_OUT:'Đổi – trả máy cũ',SWAP_IN:'Đổi – nhận máy mới',RELEASE:'Mở lại / sạc xong'};
let unsubs=[],devices=[],events=[],busy=false,connected=false,choice=null,mode='ISSUE',canvasDirty=false,strokes=[],drawing=false,dateFilter='all';
let cameraStream=null,cameraToken=0,cameraLeg='old',photos={old:null,new:null},historyStop=null;
function session(){try{return root.__sagsGetSession?.()||{}}catch(_){return{}}}
function currentUser(){const u=root.firebase?.auth?.().currentUser,s=session(),p=s.profile||root.currentUserProfile||{};return {uid:u?.uid||'',name:S(p.fullName||p.name||p.displayName||p.username||u?.displayName||u?.email||'Nhân viên'),role:S(s.role||p.role||root.currentRole).toUpperCase()}}
function isAdmin(u){return ['ADMIN','AD'].includes(u?.role)}
function fs(){if(!root.firebase?.apps?.length||!root.firebase?.firestore)throw Error('Chưa khởi tạo kết nối Firebase.');return root.firebase.firestore()}
function fv(){return root.firebase.firestore.FieldValue.serverTimestamp()}
function errText(e){if(String(e?.code||'').includes('permission-denied'))return 'CHƯA KÍCH HOẠT KÝ NHẬN: Firebase chưa cấp quyền truy cập bộ đàm. AD cần triển khai Firestore Rules đã kiểm thử. Không có dữ liệu nào được ghi.';if(!navigator.onLine)return 'Mất kết nối. Không ghi nhận nhận/trả khi ngoại tuyến.';return S(e?.message||e||'Có lỗi, thử lại.')}
function notify(s,fail=false){const e=$('radioMessage');if(e){e.textContent=s;e.dataset.error=fail?'1':'0'}}
function setBusy(v){busy=!!v;for(const e of document.querySelectorAll('#sagsRadioPanel button,#sagsRadioPanel select,#sagsRadioPanel input,#sagsRadioPanel textarea'))e.disabled=busy;if($('radioPhotoArea'))updatePhotoUI()}
function tpl(){
 if($('sagsRadioPanel'))return;
 const p=document.createElement('section');p.id='sagsRadioPanel';p.className='sagsRadioPanel';p.hidden=true;p.setAttribute('role','dialog');p.setAttribute('aria-modal','true');p.setAttribute('aria-label','Quản lý ký nhận bộ đàm');
 p.innerHTML='<div class="radioShell"><header class="radioHeader"><div><small>QUẢN LÝ THIẾT BỊ · SAGS</small><h2>📻 Ký nhận bộ đàm</h2><p>Nhận · trả · đổi máy · báo lỗi · lịch sử</p></div><button id="radioClose" aria-label="Đóng" type="button">✕</button></header>'+
 '<div id="radioMessage" role="status" aria-live="polite"></div>'+
 '<div class="radioStats" id="radioStats"></div>'+
 '<div class="radioTabs"><button type="button" data-radio-tab="devices" class="selected">Danh sách máy</button><button type="button" data-radio-tab="history">Lịch sử ký nhận</button><button type="button" data-radio-tab="summary">Tổng hợp</button></div>'+
 '<section id="radioDevicesTab"><div class="radioTools"><span>Trạng thái từng máy cập nhật từ Firebase</span><button type="button" id="radioSeed" hidden>+ Khởi tạo danh mục từ giấy</button></div><div id="radioDeviceList" class="radioDeviceList"></div></section>'+
 '<section id="radioHistoryTab" hidden><div class="radioTools"><label>Tra cứu <select id="radioDateFilter"><option value="all">Gần đây</option><option value="today">Hôm nay</option><option value="week">7 ngày</option></select></label><button type="button" id="radioExport" class="radioPrimary">📄 Xuất PDF</button></div><div class="radioHistoryFilters"><label>Mã máy<select id="radioHistoryDevice"><option value="">Tất cả máy</option></select></label><label>Thao tác<select id="radioHistoryAction"><option value="">Tất cả</option><option value="ISSUE">Nhận máy</option><option value="RETURN">Trả máy</option><option value="SWAP_OUT">Đổi máy</option><option value="REPORT">Báo lỗi</option></select></label><label>Tìm kiếm<input id="radioHistorySearch" type="search" placeholder="Tên, UID hoặc ghi chú" autocomplete="off"></label></div><div id="radioHistoryMeta" class="radioHistoryMeta"></div><div id="radioHistoryList"></div></section>'+
 '<section id="radioSummaryTab" hidden><div class="radioTools"><span>Tổng hợp theo dữ liệu đã tải</span><button type="button" id="radioSummaryExport" class="radioPrimary">📄 Xuất PDF</button></div><div id="radioSummary"></div><p class="radioHint">Tổng hợp dữ liệu đã tải trên màn hình; không gửi email.</p></section>'+
 '<section id="radioAction" class="radioAction" hidden><div class="radioActionHeader"><h3 id="radioActionTitle">Ký nhận</h3><button type="button" id="radioActionCancel">✕</button></div><div class="radioFields"><label>Mã máy<input id="radioActionCode" readonly></label><label>Người thực hiện<input id="radioPerson" readonly></label><label>Ca làm việc<select id="radioShift"><option value="AM">Ca sáng</option><option value="PM">Ca chiều</option></select></label><label id="radioBatteryWrap">Pin lúc nhận/trả<select id="radioBattery"><option value="UNKNOWN">Chưa xác định</option><option value="FULL">Đầy</option><option value="GOOD">Đủ dùng</option><option value="LOW">Yếu</option><option value="EMPTY">Hết pin</option></select></label><label id="radioReasonWrap">Lý do<select id="radioReason">'+REASONS.map(([v,n])=>'<option value="'+v+'">'+esc(n)+'</option>').join('')+'</select></label><label id="radioSwapWrap">Máy thay thế<select id="radioSwapTarget"></select></label><label id="radioSwapBatteryWrap" hidden>Pin máy thay thế<select id="radioSwapBattery"><option value="UNKNOWN">Chọn pin máy thay thế</option><option value="FULL">Đầy</option><option value="GOOD">Đủ dùng</option><option value="LOW">Yếu</option><option value="EMPTY">Hết pin</option></select></label><label class="wide">Ghi chú hiện trạng<textarea id="radioDetail" rows="2" placeholder="Ghi cụ thể hiện tượng, thời gian, vị trí..."></textarea></label></div><section id="radioPhotoArea" class="radioPhotoArea" hidden><div class="radioPhotoHeading"><strong id="radioPhotoStep">1 · Ảnh bộ đàm thực tế</strong><small>Camera trực tiếp · không chọn thư viện</small></div><div class="radioCameraView"><video id="radioCameraVideo" playsinline autoplay muted></video><img id="radioCameraPhoto" alt="Ảnh chụp mã máy và thời gian" hidden></div><div id="radioPhotoChips" class="radioPhotoChips"></div><div class="radioPhotoActions"><button id="radioTakePhoto" type="button" class="radioPrimary">📷 Chụp ảnh</button><button id="radioRetakePhoto" type="button" hidden>Chụp lại</button><button id="radioRetryPhoto" type="button" hidden>Mở camera</button></div><small class="radioHint">Giờ trên ảnh là giờ của điện thoại; Firebase ghi riêng thời điểm xác nhận trên máy chủ.</small></section><div id="radioSigWrap"><p>Chữ ký xác nhận của tài khoản đang đăng nhập</p><canvas id="radioSignature" width="540" height="150" aria-label="Ký bằng ngón tay hoặc chuột"></canvas><button type="button" id="radioClearSignature">Xóa nét ký</button></div><div class="radioActions"><button type="button" id="radioCancel">Hủy</button><button class="radioPrimary" type="button" id="radioConfirm">Xác nhận và lưu lịch sử</button></div></section>'+
 '<div class="radioProofViewer" id="radioProofViewer" hidden><div><header><strong id="radioProofName">Ảnh và chữ ký</strong><button type="button" id="radioProofClose">✕</button></header><img id="radioProofImage" alt="Bằng chứng ảnh có giờ và chữ ký"><p id="radioProofTimestamp"></p></div></div><footer>Giờ trên ảnh do thiết bị cung cấp; giờ xác nhận chính thức theo Firebase.</footer></div>';
 document.body.appendChild(p);
 $('radioClose').onclick=close;$('radioActionCancel').onclick=cancel;$('radioCancel').onclick=cancel;
 $('radioConfirm').onclick=()=>void submit();$('radioClearSignature').onclick=()=>clearSignature();
 $('radioTakePhoto').onclick=takePhoto;$('radioRetakePhoto').onclick=()=>void retakePhoto();$('radioRetryPhoto').onclick=()=>void startCamera(cameraLeg);$('radioProofClose').onclick=closeProof;
 $('radioProofViewer').onclick=e=>{if(e.target.id==='radioProofViewer')closeProof()};
 $('radioSeed').onclick=()=>void seed();$('radioDateFilter').onchange=e=>{dateFilter=e.target.value;renderHistory()};
 $('radioExport').onclick=()=>void exportPdf();$('radioSummaryExport').onclick=()=>void exportPdf();
 ['radioHistoryDevice','radioHistoryAction'].forEach(id=>{$(id).onchange=renderHistory});$('radioHistorySearch').oninput=renderHistory;
 p.querySelectorAll('[data-radio-tab]').forEach(b=>b.onclick=()=>tab(b.dataset.radioTab));
 const c=$('radioSignature');c.style.touchAction='none';
 const down=e=>{if(busy)return;drawing=true;canvasDirty=true;strokes.push([]);c.setPointerCapture?.(e.pointerId);mark(e)};
 const move=e=>{if(drawing)mark(e)};const up=()=>{drawing=false};
 c.addEventListener('pointerdown',down);c.addEventListener('pointermove',move);c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up);
 p.addEventListener('click',e=>{const b=e.target.closest('[data-radio-act]');if(b)start(b.dataset.radioAct,b.dataset.radioCode);const el=e.target.closest('[data-radio-proof]');if(el)viewProof(el.dataset.radioProof)});
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
  const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});
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
 const v=$('radioCameraVideo');if(v.readyState<2||!v.videoWidth)return notify('Camera chưa có hình.',true);
 const code=cameraLeg==='new'?$('radioSwapTarget').value:choice.code;if(!code)return notify('Chọn bộ đàm thay thế.',true);
 const c=document.createElement('canvas');c.width=640;c.height=430;
 const ctx=c.getContext('2d');ctx.fillStyle='#071827';ctx.fillRect(0,0,640,430);
 const scale=Math.min(640/v.videoWidth,345/v.videoHeight),dw=v.videoWidth*scale,dh=v.videoHeight*scale;
 ctx.drawImage(v,(640-dw)/2,(345-dh)/2,dw,dh);
 const operation=cameraLeg==='new'?'SWAP_IN':mode,at=new Date();
 ctx.fillStyle='#041926';ctx.fillRect(0,345,640,85);
 ctx.fillStyle='#fff';ctx.textBaseline='middle';ctx.font='bold 23px Arial';
 ctx.fillText('SAGS · '+label(code)+' · '+(['ISSUE','SWAP_IN'].includes(operation)?'NHẬN':['RETURN','SWAP_OUT'].includes(operation)?'TRẢ':'BÁO LỖI'),15,374);
 ctx.font='bold 17px Arial';ctx.fillStyle='#9ee5eb';
 ctx.fillText(formatShotTime(at)+'  ·  giờ thiết bị (VN)',15,407);
 photos[cameraLeg]={canvas:c,preview:c.toDataURL('image/webp',.5),code,at:at.getTime()};
 stopCamera();updatePhotoUI();
 if(mode==='SWAP_OUT'&&cameraLeg==='old'){notify('Đã chụp máy cũ. Tiếp tục chụp máy mới.');void startCamera('new')}
 else{
  v.hidden=true;const preview=$('radioCameraPhoto');
  preview.src=photos[cameraLeg].preview;preview.hidden=false;
  notify('Đã chụp ảnh có giờ. Ký ở ô bên dưới rồi xác nhận để lưu Firebase.');
  $('radioSigWrap').scrollIntoView({behavior:'smooth',block:'nearest'});
 }
}
async function retakePhoto(){
 if(!choice)return;
 clearSignature();
 if(mode==='SWAP_OUT'&&photos.new){photos.new=null;updatePhotoUI();await startCamera('new')}
 else{photos={old:null,new:null};updatePhotoUI();await startCamera('old')}
}
function combineProof(leg){
 const photo=photos[leg];if(!photo)throw Error('Chưa chụp ảnh trực tiếp.');
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
 // Same authenticated, immutable Firestore event field as the previous signature.
 // Preserve 45K character rules limit, keeping flight data and old events intact.
 for(const width of [640,560,512,448,384]){
  const ph=Math.round(width*430/640),sh=Math.round(width*130/640);
  canvas.width=width;canvas.height=ph+sh;ctx.fillStyle='#fff';ctx.fillRect(0,0,width,canvas.height);
  ctx.drawImage(photo.canvas,0,0,width,ph);
  ctx.fillStyle='#e7f3f9';ctx.fillRect(0,ph,width,sh);ctx.fillStyle='#193c4e';
  ctx.font='bold '+Math.max(9,Math.round(width*14/640))+'px Arial';
  ctx.fillText('CHỮ KÝ XÁC NHẬN',Math.round(width*.025),ph+Math.round(width*.025));
  ctx.drawImage($('radioSignature'),Math.round(width*.03),ph+Math.round(width*.035),Math.round(width*.85),Math.round(sh*.72));
  for(const quality of [.7,.55,.4,.3,.2]){
   const value=canvas.toDataURL('image/webp',quality);
   if(value.startsWith('data:image/webp;base64,')&&value.length>120&&value.length<=44000)return value;
  }
 }
 throw Error('Ảnh quá nhiều chi tiết để lưu rõ trong giới hạn hiện tại. Chụp gần mã máy, nền ít chi tiết và thử lại.');
}
function viewProof(id){
 const e=events.find(x=>x.id===id);if(!e?.signature||!/^data:image\/(webp|png);base64,/.test(e.signature))return;
 $('radioProofName').textContent=label(e.deviceCode)+' · '+(ACTS[e.action]||e.action);
 $('radioProofImage').src=e.signature;
 $('radioProofTimestamp').textContent='Thời gian xác nhận Firebase: '+(e.at?.toDate?.()?fmt(e.at.toDate()):'Đang đồng bộ');
 $('radioProofViewer').hidden=false;
}
function closeProof(){const el=$('radioProofViewer');if(el)el.hidden=true;const img=$('radioProofImage');if(img)img.removeAttribute('src')}
function mark(e){const c=$('radioSignature'),r=c.getBoundingClientRect(),x=Math.max(0,Math.min(c.width,Math.round((e.clientX-r.left)*c.width/r.width))),y=Math.max(0,Math.min(c.height,Math.round((e.clientY-r.top)*c.height/r.height)));const points=strokes.at(-1);if(!points||points.length>350)return;points.push([x,y]);const ctx=c.getContext('2d');ctx.strokeStyle='#123f66';ctx.lineWidth=2.8;ctx.lineCap='round';if(points.length===1){ctx.fillStyle='#123f66';ctx.beginPath();ctx.arc(x,y,1.4,0,Math.PI*2);ctx.fill()}else{const prev=points[points.length-2];ctx.beginPath();ctx.moveTo(prev[0],prev[1]);ctx.lineTo(x,y);ctx.stroke()}}
function clearSignature(){strokes=[];canvasDirty=false;const c=$('radioSignature');if(c)c.getContext('2d').clearRect(0,0,c.width,c.height)}
function signature(){if(!canvasDirty||!strokes.some(a=>a.length>=2))throw Error('Vui lòng ký xác nhận trực tiếp trên màn hình.');const c=$('radioSignature');let v=c.toDataURL('image/webp',0.45);if(!v.startsWith('data:image/webp;base64,')){v=c.toDataURL('image/png')}if(v.length>45000)throw Error('Chữ ký quá lớn. Xóa và ký lại nét ngắn gọn.');return v}
function tab(t){for(const id of ['devices','history','summary']){$('radio'+id[0].toUpperCase()+id.slice(1)+'Tab').hidden=id!==t;const btn=document.querySelector('[data-radio-tab="'+id+'"]');btn?.classList.toggle('selected',t===id)}cancel();if(t==='history'||t==='summary')subscribeHistory();else stopHistory();if(t==='summary')renderSummary()}
function close(){closeProof();stopHistory();const el=$('sagsRadioPanel');if(el)el.hidden=true;unsubs.forEach(fn=>fn());unsubs=[];connected=false;cancel();root.dispatchEvent(new Event('sags:ui-ready'));}
function cancel(){resetCamera();choice=null;$('radioAction').hidden=true;clearSignature()}
function shift(){const h=Number(new Intl.DateTimeFormat('en-GB',{timeZone:VN,hour:'2-digit',hourCycle:'h23'}).format(new Date()));return h<12?'AM':'PM'}
function start(action,code){
 const u=currentUser(),d=devices.find(x=>x.code===code);
 if(!u.uid||!d)return notify('Cần đăng nhập và chọn máy hợp lệ.',true);
 if(!connected||!navigator.onLine)return notify('Chưa kết nối Firebase. Không thể ký nhận khi chưa đồng bộ trạng thái máy.',true);
 if(action==='RELEASE'&&!isAdmin(u))return notify('Chỉ AD được đưa máy trở lại sử dụng.',true);
 if(['RETURN','SWAP_OUT'].includes(action)&&d.holderUid!==u.uid&&!isAdmin(u))return notify('Máy đang được người khác sử dụng; chỉ chủ máy hoặc AD được trả.',true);
 resetCamera();mode=action;choice=d;clearSignature();
 $('radioActionCode').value=label(code);$('radioPerson').value=u.name+' · '+u.uid.slice(0,8);
 $('radioShift').value=shift();$('radioReason').value='BATTERY_EMPTY';$('radioBattery').value='UNKNOWN';$('radioSwapBattery').value='UNKNOWN';$('radioDetail').value='';
 $('radioActionTitle').textContent=(ACTS[action]||'Báo cáo')+' · '+label(code);
 $('radioReasonWrap').hidden=action==='ISSUE';
 $('radioBatteryWrap').hidden=action==='RELEASE';
 $('radioSwapWrap').hidden=action!=='SWAP_OUT';$('radioSwapBatteryWrap').hidden=action!=='SWAP_OUT';
 $('radioSigWrap').hidden=action==='RELEASE'||needsPhoto(action);
 const available=devices.filter(x=>x.status==='READY'&&x.code!==code);
 $('radioSwapTarget').innerHTML=available.map(x=>'<option value="'+esc(x.code)+'">'+esc(label(x.code))+'</option>').join('');
 if(action==='SWAP_OUT'&&!available.length)return notify('Không có máy sẵn sàng để đổi. Báo lỗi và liên hệ AD.',true);
 $('radioAction').hidden=false;updatePhotoUI();$('radioAction').scrollIntoView({behavior:'smooth',block:'start'});if(needsPhoto(action))void startCamera('old');
}
function badge(state){return '<span class="radioStatus radioStatus-'+state+'">'+(STATUSES[state]||state)+'</span>'}
function render(){
 if(!$('radioDeviceList'))return;
 const u=currentUser();$('radioSeed').hidden=!connected||!isAdmin(u)||INIT.every(code=>devices.some(x=>x.code===code));
 const counts=Object.fromEntries(Object.keys(STATUSES).map(k=>[k,devices.filter(x=>x.status===k).length]));
 $('radioStats').innerHTML='<div><strong>'+devices.length+'</strong><small>Tổng thiết bị</small></div><div><strong>'+counts.READY+'</strong><small>Sẵn sàng</small></div><div><strong>'+counts.OUT+'</strong><small>Đang giữ</small></div><div><strong>'+counts.CHARGING+'</strong><small>Đang sạc</small></div><div><strong>'+counts.FAULT+counts.LOST+'</strong><small>Lỗi / mất</small></div>';
 $('radioDeviceList').innerHTML=devices.length?devices.map(d=>{
  const mine=d.holderUid===u.uid,admin=isAdmin(u),buttons=[];
  if(connected&&d.status==='READY')buttons.push(['ISSUE','Ký nhận'],['REPORT','Báo lỗi']);
  if(connected&&d.status==='OUT'&&(mine||admin))buttons.push(['RETURN','Trả máy'],['SWAP_OUT','Đổi máy'],['REPORT','Báo lỗi']);
  if(connected&&['FAULT','CHARGING','LOST'].includes(d.status)&&admin)buttons.push(['RELEASE','Đã kiểm tra / mở lại']);
  const status=d.status==='OUT'?'Đang giữ: '+esc(d.holderName||d.holderUid.slice(0,8)):(d.faultCode?('Lý do: '+esc(REASON_TEXT[d.faultCode]||d.faultCode)):'');
  return '<article class="radioDevice"><div><strong>'+esc(label(d.code))+'</strong>'+badge(d.status)+'<small>'+status+'</small></div><div class="radioButtons">'+buttons.map(([a,n])=>'<button type="button" data-radio-act="'+a+'" data-radio-code="'+esc(d.code)+'">'+n+'</button>').join('')+'</div></article>'
 }).join(''):'<p class="radioEmpty">'+(connected?'Chưa có mã máy. AD hãy khởi tạo danh mục bộ đàm từ sổ giấy.':'Chưa xác nhận kết nối Firebase. Không thể ký nhận cho đến khi kích hoạt.')+'</p>';
 renderHistory();
}
function filteredHistory(){
 const now=Date.now(),device=S($('radioHistoryDevice')?.value),action=S($('radioHistoryAction')?.value),search=S($('radioHistorySearch')?.value).toLocaleLowerCase('vi-VN');
 const date=d=>new Intl.DateTimeFormat('en-CA',{timeZone:VN,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
 return events.filter(e=>{
  const at=e.at?.toMillis?.()||0;
  if(dateFilter==='today'&&(!at||date(new Date(at))!==date(new Date(now))))return false;
  if(dateFilter==='week'&&(!at||at<now-7*86400000))return false;
  if(device&&e.deviceCode!==device)return false;
  if(action&&e.action!==action)return false;
  if(search&&![e.actorName,e.actorUid,e.deviceCode,e.details,ACTS[e.action],REASON_TEXT[e.reasonCode]].join(' ').toLocaleLowerCase('vi-VN').includes(search))return false;
  return true;
 });
}
function renderHistory(){
 const wrap=$('radioHistoryList');if(!wrap)return;
 const sel=$('radioHistoryDevice'),codes=[...new Set(events.map(e=>e.deviceCode).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi',{numeric:true})),key=codes.join('|');
 if(sel&&sel.dataset.codes!==key){const old=sel.value;sel.innerHTML='<option value="">Tất cả máy</option>'+codes.map(x=>'<option value="'+esc(x)+'">'+esc(label(x))+'</option>').join('');sel.value=codes.includes(old)?old:'';sel.dataset.codes=key}
 const rows=filteredHistory(),meta=$('radioHistoryMeta');
 if(meta)meta.textContent=rows.length+' sự kiện phù hợp | '+(events.length>=120?'Chỉ có 120 sự kiện gần nhất được tải từ Firebase.':'Dữ liệu theo quyền tài khoản.');
 if(!rows.length){wrap.innerHTML='<p class="radioEmpty">Không có lịch sử phù hợp bộ lọc.</p>';return;}
 wrap.innerHTML='<div class="radioAudit"><div class="radioAuditHead"><span>Thời gian</span><span>Máy / sự kiện</span><span>Người thực hiện</span><span>Trạng thái / ghi chú</span><span>Bằng chứng</span></div>'+
 rows.map(e=>{
  const kind=['REPORT','SWAP_OUT'].includes(e.action)?'warning':['ISSUE','SWAP_IN'].includes(e.action)?'issued':e.action==='RETURN'?'returned':'neutral';
  const note=[e.beforeStatus&&e.afterStatus?(STATUSES[e.beforeStatus]||e.beforeStatus)+' → '+(STATUSES[e.afterStatus]||e.afterStatus):'',REASON_TEXT[e.reasonCode]||'',e.details||''].filter(Boolean).join(' · ');
  return '<article class="radioAuditRow"><div><small>THỜI GIAN</small><b>'+esc(e.at?.toDate?.()?fmt(e.at.toDate()):'Đang đồng bộ')+'</b></div><div><small>THIẾT BỊ</small><strong>'+esc(label(e.deviceCode))+'</strong><span class="radioActionBadge radioActionBadge-'+kind+'">'+esc(ACTS[e.action]||e.action)+'</span></div><div><small>NGƯỜI KÝ</small><b>'+esc(e.actorName||e.actorUid||'—')+'</b><span class="radioDetailText">'+esc(e.shift||'—')+'</span></div><div><small>TRẠNG THÁI / GHI CHÚ</small><span class="radioDetailText">'+esc(note||'Không có ghi chú')+'</span></div><div><small>BẰNG CHỨNG</small>'+(e.signature?'<button type="button" class="radioViewProof" data-radio-proof="'+esc(e.id)+'">📷 Xem ảnh / chữ ký</button>':'<span class="radioDetailText">Không có ảnh</span>')+'</div></article>';
 }).join('')+'</div>';
}
function renderSummary(){
 const n=events.filter(x=>['SWAP_OUT'].includes(x.action)).length,issues=events.filter(x=>['REPORT','SWAP_OUT'].includes(x.action)),pending=devices.filter(x=>['FAULT','CHARGING','LOST'].includes(x.status));
 $('radioSummary').innerHTML='<div class="radioReportGrid"><div><strong>'+n+'</strong><small>Lần đổi máy (lịch sử gần đây)</small></div><div><strong>'+issues.length+'</strong><small>Lần ghi nhận vấn đề</small></div><div><strong>'+pending.length+'</strong><small>Máy cần xử lý ngay</small></div></div><h4>Cần kiểm tra</h4>'+(pending.length?pending.map(d=>'<p>'+esc(label(d.code))+' · '+esc(STATUSES[d.status])+' · '+esc(REASON_TEXT[d.faultCode]||'')+'</p>').join(''):'<p>Không có máy đang treo trạng thái lỗi/sạc.</p>')+'<p class="radioHint">Báo cáo này chỉ tổng hợp sự kiện đã tải. Báo cáo ngày/tuần chính thức được tính trên máy chủ, không dựa vào giới hạn 120 mục.</p>';
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
 tx.update(ref,{...after,version:device.version+1,lastEventId:evRef.id,updatedAt:fv()});
}
async function submit(){
 if(busy||!choice)return;const user=currentUser();if(!user.uid)return notify('Phiên đăng nhập đã hết hạn.',true);
 const code=choice.code,reason=$('radioReason').value,details=S($('radioDetail').value),shiftVal=$('radioShift').value,bat=$('radioBattery').value,swapBattery=$('radioSwapBattery').value;
 if(['REPORT','SWAP_OUT'].includes(mode)&&(reason==='OTHER'||reason==='LOST')&&details.length<10)return notify('Vui lòng mô tả lý do cụ thể (từ 10 ký tự).',true);
 if(mode==='RELEASE'&&details.length<10)return notify('AD phải ghi kết quả kiểm tra/sửa chữa (ít nhất 10 ký tự).',true);
 let sig='',sigNew='';try{if(mode!=='RELEASE'){signature();if(needsPhoto(mode)){if(!photosReady())throw Error('Phải chụp ảnh bằng camera trước khi ký.');if(Date.now()-photos.old.at>600000||(mode==='SWAP_OUT'&&Date.now()-photos.new.at>600000))throw Error('Ảnh quá 10 phút, vui lòng chụp lại.');sig=combineProof('old');if(mode==='SWAP_OUT')sigNew=combineProof('new')}else sig=signature()}}catch(e){return notify(e.message,true)}
 if(['ISSUE','RETURN'].includes(mode)&&bat==='UNKNOWN')return notify('Vui lòng kiểm tra mức pin trước khi nhận hoặc trả máy.',true);
 if(mode==='ISSUE'&&['LOW','EMPTY'].includes(bat))return notify('Máy pin yếu/hết pin không được cấp phát. Báo lỗi pin để đưa máy về trạng thái chờ sạc.',true);
 if(mode==='SWAP_OUT'&&!['FULL','GOOD'].includes(swapBattery))return notify('Vui lòng kiểm tra máy thay thế có pin Đầy hoặc Đủ dùng trước khi đổi.',true);
 if(!connected)return notify('Chưa xác nhận kết nối Firebase. Không thể ghi nhận.',true);
 if(!navigator.onLine)return notify('Đang ngoại tuyến: không cho phép nhận/trả vì có thể xảy ra nhận trùng máy.',true);
 setBusy(true);
 try{
 const db=fs(),ref=db.collection(COLLECTION).doc(code);
 if(mode==='SWAP_OUT'){
  const other=$('radioSwapTarget').value,ref2=db.collection(COLLECTION).doc(other),swapId=db.collection(EVENTS).doc().id;
  await db.runTransaction(async tx=>{
   const rows=await Promise.all([tx.get(ref),tx.get(ref2)]),a=rows[0].data(),b=rows[1].data();
   if(!a||a.status!=='OUT'||(!isAdmin(user)&&a.holderUid!==user.uid))throw Error('Máy cũ không còn hợp lệ để đổi.');
   if(!b||b.status!=='READY')throw Error('Máy thay thế vừa có người nhận. Vui lòng chọn máy khác.');
   const oldNew={status:['BATTERY_EMPTY','BATTERY_WEAK'].includes(reason)?'CHARGING':'FAULT',holderUid:'',holderName:'',shift:'',faultCode:reason,faultDetail:details,battery:bat};
   updateDevice(tx,ref,a,'SWAP_OUT',oldNew,{user,shift:shiftVal,reason,details,sig,related:other,swapId});
   const newNew={status:'OUT',holderUid:user.uid,holderName:user.name,shift:shiftVal,faultCode:'',faultDetail:'',battery:swapBattery};
   updateDevice(tx,ref2,b,'SWAP_IN',newNew,{user,shift:shiftVal,reason,details,sig:sigNew,related:code,swapId});
  });
 }else{
  await db.runTransaction(async tx=>{
   const snap=await tx.get(ref),d=snap.data();if(!d)throw Error('Không tìm thấy mã máy.');
   let after,action=mode,reasonCode=reason;
   if(mode==='ISSUE'){if(d.status!=='READY')throw Error('Máy đã được nhận hoặc chưa sẵn sàng.');after={status:'OUT',holderUid:user.uid,holderName:user.name,shift:shiftVal,faultCode:'',faultDetail:'',battery:bat};reasonCode='';}
   else if(mode==='RETURN'){
    if(d.status!=='OUT'||(d.holderUid!==user.uid&&!isAdmin(user)))throw Error('Chỉ người đang giữ máy hoặc AD được trả.');
    const f=bat==='EMPTY'||bat==='LOW';after={status:f?'CHARGING':'READY',holderUid:'',holderName:'',shift:'',faultCode:f?'BATTERY_WEAK':'',faultDetail:details,battery:bat};reasonCode=f?'BATTERY_WEAK':'';}
   else if(mode==='REPORT'){
    if(d.status!=='OUT'&&d.status!=='READY')throw Error('Không thể ghi sự cố trên trạng thái hiện tại.');
    if(d.status==='OUT'&&d.holderUid!==user.uid&&!isAdmin(user))throw Error('Chỉ người giữ hoặc AD được báo lỗi máy đang dùng.');
    after={status:reason==='LOST'?'LOST':['BATTERY_EMPTY','BATTERY_WEAK'].includes(reason)?'CHARGING':'FAULT',holderUid:'',holderName:'',shift:'',faultCode:reason,faultDetail:details,battery:bat};}
   else if(mode==='RELEASE'){if(!isAdmin(user)||!['FAULT','CHARGING','LOST'].includes(d.status))throw Error('Chỉ AD mới có thể xác nhận máy đủ điều kiện sử dụng.');after={status:'READY',holderUid:'',holderName:'',shift:'',faultCode:'',faultDetail:'',battery:'GOOD'};reasonCode='';}
   else throw Error('Tác vụ không được hỗ trợ.');
   updateDevice(tx,ref,d,action,after,{user,shift:shiftVal,reason:reasonCode,details,sig,related:'',swapId:''});
  });
 }
 cancel();notify('Đã ghi nhận lên Firebase với thời gian máy chủ và lưu sự kiện lịch sử.');
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
function pdfPage(rows,index,total,scope){
 const cv=document.createElement('canvas');cv.width=1200;cv.height=1698;const x=cv.getContext('2d');
 x.fillStyle='#fff';x.fillRect(0,0,1200,1698);
 x.fillStyle='#0b354d';x.fillRect(0,0,1200,19);x.fillStyle='#00818d';x.fillRect(0,19,1200,5);
 x.fillStyle='#0b354d';x.font='bold 27px Arial';x.fillText('SAGS  |  E-REPORT',47,72);
 x.font='bold 35px Arial';x.fillText('BÁO CÁO KÝ NHẬN - TRẢ BỘ ĐÀM',47,140);
 x.fillStyle='#446173';x.font='19px Arial';x.fillText('Ngày xuất: '+fmt(new Date())+'  |  Người xuất: '+currentUser().name,47,177);
 x.fillText('Phạm vi: '+scope+'  |  Tối đa 120 sự kiện mới nhất theo quyền tài khoản',47,209);
 const widths=[175,115,155,190,150,315],titles=['THỜI GIAN','THIẾT BỊ','THAO TÁC','NGƯỜI KÝ','TRẠNG THÁI','GHI CHÚ / ẢNH'];
 let y=250,pos=46;x.fillStyle='#133e55';x.fillRect(46,y,1100,52);x.fillStyle='#fff';x.font='bold 16px Arial';
 titles.forEach((v,i)=>{x.fillText(v,pos+8,y+32);pos+=widths[i]});y+=52;
 rows.forEach((e,i)=>{
  x.fillStyle=i%2?'#fff':'#eef5f8';x.fillRect(46,y,1100,66);
  x.strokeStyle='#d5e4e9';x.beginPath();x.moveTo(46,y+66);x.lineTo(1146,y+66);x.stroke();
  const values=[e.at?.toDate?.()?fmt(e.at.toDate()):'Chưa đồng bộ',label(e.deviceCode),ACTS[e.action]||e.action,e.actorName||e.actorUid||'',(STATUSES[e.beforeStatus]||'')+' → '+(STATUSES[e.afterStatus]||''),[REASON_TEXT[e.reasonCode]||'',e.details||'',e.signature?'Có ảnh/chữ ký':''].filter(Boolean).join(' · ')];
  let left=46;x.fillStyle='#17394b';x.font='17px Arial';
  values.forEach((v,j)=>{pdfWrap(x,v,widths[j]-18).forEach((line,k)=>x.fillText(line,left+8,y+26+22*k));left+=widths[j]});y+=66;
 });
 x.fillStyle='#456175';x.font='16px Arial';x.fillText('Dữ liệu từ Firebase, đối chiếu thời gian máy chủ. Chỉ xuất lịch sử đã tải.',47,1615);
 x.fillText('Ảnh và chữ ký không nhúng vào PDF. Mở lịch sử E-REPORT để kiểm tra bằng chứng.',47,1642);
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
async function exportPdf(){
 const rows=filteredHistory();if(!rows.length)return notify('Không có sự kiện để xuất PDF.',true);
 const a=$('radioExport'),b=$('radioSummaryExport');if(a?.disabled||b?.disabled)return;
 if(a)a.disabled=true;if(b)b.disabled=true;notify('Đang tạo báo cáo PDF...');
 try{
  await new Promise(done=>requestAnimationFrame(done));
  const scope=dateFilter==='today'?'Hôm nay':dateFilter==='week'?'7 ngày':'120 sự kiện gần nhất',pages=[];
  for(let i=0;i<rows.length;i+=19)pages.push(rows.slice(i,i+19));
  const blob=pdfBuild(pages.map((v,i)=>pdfPage(v,i+1,pages.length,scope))),href=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=href;link.download='SAGS-BO-DAM-'+new Date().toISOString().slice(0,10)+'.pdf';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(href),60000);
  notify('Đã xuất PDF '+rows.length+' sự kiện theo bộ lọc; tối đa 120 sự kiện đã tải.');
 }catch(e){notify('Không xuất được PDF: '+S(e.message||e),true)}
 finally{if(a)a.disabled=false;if(b)b.disabled=false}
}
function stopHistory(){
 if(historyStop){historyStop();historyStop=null}
 events=[];if($('radioHistoryList'))renderHistory();
 if($('radioSummary'))renderSummary();
}
function subscribeHistory(){
 if(historyStop||!connected||!navigator.onLine||!currentUser().uid)return;
 const u=currentUser(),db=fs();
 // Avoid downloading up to 120 compressed photographs at every application launch.
 // Fetch only when the user explicitly opens history or summary.
 const query=isAdmin(u)?db.collection(EVENTS).orderBy('at','desc').limit(120):db.collection(EVENTS).where('actorUid','==',u.uid).limit(120);
 historyStop=query.onSnapshot(s=>{
  events=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.at?.toMillis?.()||0)-(a.at?.toMillis?.()||0));
  renderHistory();renderSummary();
 },e=>{events=[];renderHistory();renderSummary();notify(errText(e),true)});
}
async function open(){
 tpl();const u=currentUser();if(!u.uid){notify('Cần đăng nhập tài khoản E-REPORT.',true);return}
 $('sagsRadioPanel').hidden=false;notify('Đang tải danh mục thiết bị…');tab('devices');
 if(unsubs.length)return;
 connected=false;devices=[];events=[];render();
 try{
  const db=fs();
  unsubs.push(db.collection(COLLECTION).onSnapshot(s=>{connected=!s.metadata.fromCache&&navigator.onLine;devices=s.docs.map(d=>({code:d.id,...d.data()})).sort((a,b)=>a.code.localeCompare(b.code,'vi',{numeric:true}));render();notify(connected?(devices.length?'Đã kết nối Firebase – có thể ký nhận.':'Đã kết nối Firebase – AD cần khởi tạo danh mục máy.'):'Đang xem bản lưu cục bộ; cần kết nối Firebase để ký nhận.',!connected)},e=>{connected=false;devices=[];events=[];render();notify(errText(e),true)}));
  // Heavy photographic history is fetched only when its tab is opened.
 }catch(e){notify(errText(e),true)}
}
root.SAGSRadioCustodyV1=Object.freeze({open,close,reasons:REASONS.map(([code,name])=>({code,name})),collection:COLLECTION,eventsCollection:EVENTS});
})(window);

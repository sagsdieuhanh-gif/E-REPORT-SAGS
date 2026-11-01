/* E-REPORT SAGS – radio custody (standalone feature, Firebase Firestore).
   Requires firebase/radio-firestore.rules to be deployed before enabling.
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
let unsubs=[],devices=[],events=[],busy=false,choice=null,mode='ISSUE',canvasDirty=false,strokes=[],drawing=false,selectedShift='AM',dateFilter='all';
function session(){try{return root.__sagsGetSession?.()||{}}catch(_){return{}}}
function currentUser(){const u=root.firebase?.auth?.().currentUser,s=session(),p=s.profile||root.currentUserProfile||{};return {uid:u?.uid||'',name:S(p.fullName||p.name||p.displayName||p.username||u?.displayName||u?.email||'Nhân viên'),role:S(s.role||p.role||root.currentRole).toUpperCase()}}
function isAdmin(u){return ['ADMIN','AD'].includes(u?.role)}
function fs(){if(!root.firebase?.apps?.length||!root.firebase?.firestore)throw Error('Chưa khởi tạo kết nối Firebase.');return root.firebase.firestore()}
function fv(){return root.firebase.firestore.FieldValue.serverTimestamp()}
function errText(e){if(String(e?.code||'').includes('permission-denied'))return 'Firebase chưa được cấp quyền cho quản lý bộ đàm. AD cần triển khai quy tắc Firestore riêng của tính năng này.';if(!navigator.onLine)return 'Mất kết nối. Không ghi nhận nhận/trả khi ngoại tuyến.';return S(e?.message||e||'Có lỗi, thử lại.')}
function notify(s,fail=false){const e=$('radioMessage');if(e){e.textContent=s;e.dataset.error=fail?'1':'0'}}
function setBusy(v){busy=!!v;for(const e of document.querySelectorAll('#sagsRadioPanel button,#sagsRadioPanel select,#sagsRadioPanel input,#sagsRadioPanel textarea'))e.disabled=busy}
function tpl(){
 if($('sagsRadioPanel'))return;
 const p=document.createElement('section');p.id='sagsRadioPanel';p.className='sagsRadioPanel';p.hidden=true;p.setAttribute('role','dialog');p.setAttribute('aria-modal','true');p.setAttribute('aria-label','Quản lý ký nhận bộ đàm');
 p.innerHTML='<div class="radioShell"><header class="radioHeader"><div><small>QUẢN LÝ THIẾT BỊ · SAGS</small><h2>📻 Ký nhận bộ đàm</h2><p>Nhận · trả · đổi máy · báo lỗi · lịch sử</p></div><button id="radioClose" aria-label="Đóng" type="button">✕</button></header>'+
 '<div id="radioMessage" role="status" aria-live="polite"></div>'+
 '<div class="radioStats" id="radioStats"></div>'+
 '<div class="radioTabs"><button type="button" data-radio-tab="devices" class="selected">Danh sách máy</button><button type="button" data-radio-tab="history">Lịch sử ký nhận</button><button type="button" data-radio-tab="summary">Báo cáo</button></div>'+
 '<section id="radioDevicesTab"><div class="radioTools"><span>Trạng thái từng máy cập nhật từ Firebase</span><button type="button" id="radioSeed" hidden>+ Khởi tạo danh mục từ giấy</button></div><div id="radioDeviceList" class="radioDeviceList"></div></section>'+
 '<section id="radioHistoryTab" hidden><div class="radioTools"><label>Tra cứu <select id="radioDateFilter"><option value="all">Gần đây</option><option value="today">Hôm nay</option><option value="week">7 ngày</option></select></label><button type="button" id="radioExport">Xuất CSV</button></div><div id="radioHistoryList"></div></section>'+
 '<section id="radioSummaryTab" hidden><div id="radioSummary"></div><p class="radioHint">Báo cáo gửi tự động qua máy chủ chỉ hoạt động sau khi AD kết nối Firebase Admin và SMTP. Trạng thái email không được xác nhận từ trình duyệt.</p></section>'+
 '<section id="radioAction" class="radioAction" hidden><div class="radioActionHeader"><h3 id="radioActionTitle">Ký nhận</h3><button type="button" id="radioActionCancel">✕</button></div><div class="radioFields"><label>Mã máy<input id="radioActionCode" readonly></label><label>Người thực hiện<input id="radioPerson" readonly></label><label>Ca làm việc<select id="radioShift"><option value="AM">Ca sáng</option><option value="PM">Ca chiều</option></select></label><label id="radioBatteryWrap">Pin lúc nhận/trả<select id="radioBattery"><option value="UNKNOWN">Chưa xác định</option><option value="FULL">Đầy</option><option value="GOOD">Đủ dùng</option><option value="LOW">Yếu</option><option value="EMPTY">Hết pin</option></select></label><label id="radioReasonWrap">Lý do<select id="radioReason">'+REASONS.map(([v,n])=>'<option value="'+v+'">'+esc(n)+'</option>').join('')+'</select></label><label id="radioSwapWrap">Máy thay thế<select id="radioSwapTarget"></select></label><label class="wide">Ghi chú hiện trạng<textarea id="radioDetail" rows="2" placeholder="Ghi cụ thể hiện tượng, thời gian, vị trí..."></textarea></label></div><div id="radioSigWrap"><p>Chữ ký xác nhận của tài khoản đang đăng nhập</p><canvas id="radioSignature" width="540" height="150" aria-label="Ký bằng ngón tay hoặc chuột"></canvas><button type="button" id="radioClearSignature">Xóa nét ký</button></div><div class="radioActions"><button type="button" id="radioCancel">Hủy</button><button class="radioPrimary" type="button" id="radioConfirm">Xác nhận và lưu lịch sử</button></div></section>'+
 '<footer>Thời điểm xác nhận và nhật ký ghi theo máy chủ Firebase. Không lưu thành công giả khi mất mạng.</footer></div>';
 document.body.appendChild(p);
 $('radioClose').onclick=close;$('radioActionCancel').onclick=cancel;$('radioCancel').onclick=cancel;
 $('radioConfirm').onclick=()=>void submit();$('radioClearSignature').onclick=()=>clearSignature();
 $('radioSeed').onclick=()=>void seed();$('radioDateFilter').onchange=e=>{dateFilter=e.target.value;renderHistory()};
 $('radioExport').onclick=exportCsv;
 p.querySelectorAll('[data-radio-tab]').forEach(b=>b.onclick=()=>tab(b.dataset.radioTab));
 const c=$('radioSignature');c.style.touchAction='none';
 const down=e=>{if(busy)return;drawing=true;canvasDirty=true;strokes.push([]);c.setPointerCapture?.(e.pointerId);mark(e)};
 const move=e=>{if(drawing)mark(e)};const up=()=>{drawing=false};
 c.addEventListener('pointerdown',down);c.addEventListener('pointermove',move);c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up);
 p.addEventListener('click',e=>{const b=e.target.closest('[data-radio-act]');if(b)start(b.dataset.radioAct,b.dataset.radioCode)});
}
function mark(e){const c=$('radioSignature'),r=c.getBoundingClientRect(),x=Math.max(0,Math.min(c.width,Math.round((e.clientX-r.left)*c.width/r.width))),y=Math.max(0,Math.min(c.height,Math.round((e.clientY-r.top)*c.height/r.height)));const points=strokes.at(-1);if(!points||points.length>350)return;points.push([x,y]);const ctx=c.getContext('2d');ctx.strokeStyle='#123f66';ctx.lineWidth=2.8;ctx.lineCap='round';if(points.length===1){ctx.fillStyle='#123f66';ctx.beginPath();ctx.arc(x,y,1.4,0,Math.PI*2);ctx.fill()}else{const prev=points[points.length-2];ctx.beginPath();ctx.moveTo(prev[0],prev[1]);ctx.lineTo(x,y);ctx.stroke()}}
function clearSignature(){strokes=[];canvasDirty=false;const c=$('radioSignature');if(c)c.getContext('2d').clearRect(0,0,c.width,c.height)}
function signature(){if(!canvasDirty||!strokes.some(a=>a.length>=2))throw Error('Vui lòng ký xác nhận trực tiếp trên màn hình.');const v=$('radioSignature').toDataURL('image/webp',0.45);if(v.length>45000)throw Error('Chữ ký quá lớn. Xóa và ký lại nét ngắn gọn.');return v}
function tab(t){for(const id of ['devices','history','summary']){$('radio'+id[0].toUpperCase()+id.slice(1)+'Tab').hidden=id!==t;const btn=document.querySelector('[data-radio-tab="'+id+'"]');btn?.classList.toggle('selected',t===id)}cancel();if(t==='summary')renderSummary()}
function close(){const el=$('sagsRadioPanel');if(el)el.hidden=true;unsubs.forEach(fn=>fn());unsubs=[];cancel();root.dispatchEvent(new Event('sags:ui-ready'));}
function cancel(){choice=null;$('radioAction').hidden=true;clearSignature()}
function shift(){const h=Number(new Intl.DateTimeFormat('en-GB',{timeZone:VN,hour:'2-digit',hourCycle:'h23'}).format(new Date()));return h<12?'AM':'PM'}
function start(action,code){
 const u=currentUser(),d=devices.find(x=>x.code===code);
 if(!u.uid||!d)return notify('Cần đăng nhập và chọn máy hợp lệ.',true);
 if(action==='RELEASE'&&!isAdmin(u))return notify('Chỉ AD được đưa máy trở lại sử dụng.',true);
 if(['RETURN','SWAP_OUT'].includes(action)&&d.holderUid!==u.uid&&!isAdmin(u))return notify('Máy đang được người khác sử dụng; chỉ chủ máy hoặc AD được trả.',true);
 mode=action;choice=d;clearSignature();
 $('radioActionCode').value=label(code);$('radioPerson').value=u.name+' · '+u.uid.slice(0,8);
 $('radioShift').value=shift();$('radioReason').value='BATTERY_EMPTY';$('radioBattery').value='UNKNOWN';$('radioDetail').value='';
 $('radioActionTitle').textContent=(ACTS[action]||'Báo cáo')+' · '+label(code);
 $('radioReasonWrap').hidden=action==='ISSUE';
 $('radioBatteryWrap').hidden=action==='RELEASE';
 $('radioSwapWrap').hidden=action!=='SWAP_OUT';
 $('radioSigWrap').hidden=action==='RELEASE';
 const available=devices.filter(x=>x.status==='READY'&&x.code!==code);
 $('radioSwapTarget').innerHTML=available.map(x=>'<option value="'+esc(x.code)+'">'+esc(label(x.code))+'</option>').join('');
 if(action==='SWAP_OUT'&&!available.length)return notify('Không có máy sẵn sàng để đổi. Báo lỗi và liên hệ AD.',true);
 $('radioAction').hidden=false;$('radioAction').scrollIntoView({behavior:'smooth',block:'start'});
}
function badge(state){return '<span class="radioStatus radioStatus-'+state+'">'+(STATUSES[state]||state)+'</span>'}
function render(){
 if(!$('radioDeviceList'))return;
 const u=currentUser();$('radioSeed').hidden=!isAdmin(u)||INIT.every(code=>devices.some(x=>x.code===code));
 const counts=Object.fromEntries(Object.keys(STATUSES).map(k=>[k,devices.filter(x=>x.status===k).length]));
 $('radioStats').innerHTML='<div><strong>'+devices.length+'</strong><small>Tổng thiết bị</small></div><div><strong>'+counts.READY+'</strong><small>Sẵn sàng</small></div><div><strong>'+counts.OUT+'</strong><small>Đang giữ</small></div><div><strong>'+counts.CHARGING+'</strong><small>Đang sạc</small></div><div><strong>'+counts.FAULT+counts.LOST+'</strong><small>Lỗi / mất</small></div>';
 $('radioDeviceList').innerHTML=devices.length?devices.map(d=>{
  const mine=d.holderUid===u.uid,admin=isAdmin(u),buttons=[];
  if(d.status==='READY')buttons.push(['ISSUE','Ký nhận'],['REPORT','Báo lỗi']);
  if(d.status==='OUT'&&(mine||admin))buttons.push(['RETURN','Trả máy'],['SWAP_OUT','Đổi máy'],['REPORT','Báo lỗi']);
  if(['FAULT','CHARGING','LOST'].includes(d.status)&&admin)buttons.push(['RELEASE','Đã kiểm tra / mở lại']);
  const status=d.status==='OUT'?'Đang giữ: '+esc(d.holderName||d.holderUid.slice(0,8)):(d.faultCode?('Lý do: '+esc(REASON_TEXT[d.faultCode]||d.faultCode)):'');
  return '<article class="radioDevice"><div><strong>'+esc(label(d.code))+'</strong>'+badge(d.status)+'<small>'+status+'</small></div><div class="radioButtons">'+buttons.map(([a,n])=>'<button type="button" data-radio-act="'+a+'" data-radio-code="'+esc(d.code)+'">'+n+'</button>').join('')+'</div></article>'
 }).join(''):'<p class="radioEmpty">Chưa khởi tạo danh mục bộ đàm. AD có thể khởi tạo mã theo sổ giấy.</p>';
 renderHistory();
}
function renderHistory(){
 const wrap=$('radioHistoryList');if(!wrap)return;const now=Date.now(),limit=dateFilter==='today'?24*3600000:dateFilter==='week'?7*24*3600000:Infinity;
 const list=events.filter(e=>(now-(e.at?.toMillis?.()||now))<=limit);
 wrap.innerHTML=list.length?list.slice(0,120).map(e=>'<div class="radioEvent"><b>'+esc(label(e.deviceCode))+' · '+esc(ACTS[e.action]||e.action)+'</b><span>'+esc(e.actorName||e.actorUid)+' · '+(e.at?.toDate?.()?fmt(e.at.toDate()):'Đang đồng bộ')+'</span><small>'+esc(REASON_TEXT[e.reasonCode]||'')+(e.details?' · '+esc(e.details):'')+'</small></div>').join(''):'<p class="radioEmpty">Chưa có lịch sử trong phạm vi đang xem.</p>';
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
 const code=choice.code,reason=$('radioReason').value,details=S($('radioDetail').value),shiftVal=$('radioShift').value,bat=$('radioBattery').value;
 if(['REPORT','SWAP_OUT'].includes(mode)&&(reason==='OTHER'||reason==='LOST')&&details.length<10)return notify('Vui lòng mô tả lý do cụ thể (từ 10 ký tự).',true);
 if(mode==='RELEASE'&&details.length<10)return notify('AD phải ghi kết quả kiểm tra/sửa chữa (ít nhất 10 ký tự).',true);
 let sig='';try{if(mode!=='RELEASE')sig=signature()}catch(e){return notify(e.message,true)}
 if(['ISSUE','RETURN'].includes(mode)&&bat==='UNKNOWN')return notify('Vui lòng kiểm tra mức pin trước khi nhận hoặc trả máy.',true);
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
   const newNew={status:'OUT',holderUid:user.uid,holderName:user.name,shift:shiftVal,faultCode:'',faultDetail:'',battery:bat};
   updateDevice(tx,ref2,b,'SWAP_IN',newNew,{user,shift:shiftVal,reason,details,sig,related:code,swapId});
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
function exportCsv(){
 if(!events.length)return notify('Không có lịch sử để xuất CSV.',true);
 const cols=['Thời gian','Mã máy','Thao tác','Người thực hiện','UID','Ca','Tình trạng cũ','Tình trạng mới','Lý do','Diễn giải','Máy liên quan'];
 const cell=x=>'"'+String(x??'').replace(/"/g,'""').replace(/^[=+\-@\t\r]/,"'")+'"';
 const rows=events.map(e=>[e.at?.toDate?.()?fmt(e.at.toDate()):'',label(e.deviceCode),ACTS[e.action]||e.action,e.actorName,e.actorUid,e.shift,e.beforeStatus,e.afterStatus,REASON_TEXT[e.reasonCode]||'',e.details,e.relatedDeviceCode]);
 const csv='\ufeff'+[cols,...rows].map(row=>row.map(cell).join(',')).join('\r\n');
 const href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=href;a.download='SAGS-BO-DAM-LICH-SU-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
}
async function open(){
 tpl();const u=currentUser();if(!u.uid){notify('Cần đăng nhập tài khoản E-REPORT.',true);return}
 $('sagsRadioPanel').hidden=false;notify('Đang tải danh mục thiết bị…');tab('devices');
 if(unsubs.length)return;
 try{
  const db=fs();
  unsubs.push(db.collection(COLLECTION).onSnapshot(s=>{devices=s.docs.map(d=>({code:d.id,...d.data()})).sort((a,b)=>a.code.localeCompare(b.code,'vi',{numeric:true}));render();notify(devices.length?'Danh mục đang được đồng bộ trực tuyến.':'Chưa có dữ liệu máy; AD cần khởi tạo.')},e=>notify(errText(e),true)));
  const eventQuery=isAdmin(u)?db.collection(EVENTS).orderBy('at','desc').limit(120):db.collection(EVENTS).where('actorUid','==',u.uid).limit(120);
  unsubs.push(eventQuery.onSnapshot(s=>{events=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.at?.toMillis?.()||0)-(a.at?.toMillis?.()||0));renderHistory();renderSummary()},e=>notify(errText(e),true)));
 }catch(e){notify(errText(e),true)}
}
root.SAGSRadioCustodyV1=Object.freeze({open,close,reasons:REASONS.map(([code,name])=>({code,name})),collection:COLLECTION,eventsCollection:EVENTS});
})(window);

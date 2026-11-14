/* MH AS/RM/F27 - dedicated SAGS My Flight form, isolated from legacy ramp templates. */
(function(root){
'use strict';
if(root.SAGSMHF27)return;
const ID='mhf27',S=v=>String(v??'').trim(),U=v=>S(v).toUpperCase();
const $=id=>document.getElementById(id);
const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=v=>S(v).replace(/[.#$\[\]/]/g,'_');
let spec=null,current=null,model=null,lastServer=0,syncing=false,dirty=false,saveTimer=null,dbPromise=null,signKey='';
function username(){return U(root.currentUserProfile?.username||root.__sagsGetSession?.()?.profile?.username)}
function authUid(){return S(root.firebase?.auth?.()?.currentUser?.uid)}
function offline(){return !navigator.onLine||!root.sagsV470Ref}
function key(){return 'sags:mh:f27:'+authUid()+':'+clean(current?.date)+':'+clean(current?.item?.assignmentId)}
function normalize(raw){
 const x=raw&&typeof raw==='object'?raw:{};
 return {headers:x.headers&&typeof x.headers==='object'?x.headers:{},
  answers:x.answers&&typeof x.answers==='object'?x.answers:{},
  signers:x.signers&&typeof x.signers==='object'?x.signers:{},
  remarks:S(x.remarks),revision:Number(x.revision)||0,
  updatedAtMs:Number(x.updatedAtMs)||0,completedAtMs:Number(x.completedAtMs)||0};
}
function readLocal(){try{return normalize(JSON.parse(localStorage.getItem(key())||'null'))}catch(_){return normalize(null)}}
function openDb(){
 if(!root.indexedDB)return Promise.reject(Error('IndexedDB unavailable'));
 if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
  const req=root.indexedDB.open('sags-mh-f27-drafts-v1',1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('drafts'))req.result.createObjectStore('drafts')};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 }).catch(e=>{dbPromise=null;throw e});
 return dbPromise;
}
function writeIdb(){
 if(!current||!model)return;
 openDb().then(db=>new Promise(resolve=>{
  const tx=db.transaction('drafts','readwrite');tx.objectStore('drafts').put(JSON.parse(JSON.stringify(model)),key());
  tx.oncomplete=resolve;tx.onerror=resolve;
 })).catch(e=>console.warn('MH F27 IndexedDB',e?.message||e));
}
function saveLocal(){
 if(!current||!model)return;
 model.updatedAtMs=Date.now();dirty=true;
 try{localStorage.setItem(key(),JSON.stringify(model))}catch(e){console.warn('MH F27 localStorage',e?.message||e)}
 writeIdb();
 const el=$('mhF27Status');if(el)el.textContent='Đã lưu nháp trên thiết bị · chưa xác nhận máy chủ';
 clearTimeout(saveTimer);
 saveTimer=setTimeout(()=>{void saveServer(false)},900);
}
async function owns(){
 if(!current||!authUid()||offline())throw Error('Cần mạng và tài khoản Firebase để xác minh quyền biểu mẫu.');
 const aid=clean(current.item.assignmentId),mail='roster_mail/'+clean(username())+'/items/'+aid;
 const s=await root.sagsV470Ref(mail).once('value'),row=s.val();
 if(!row||row.active===false||U(row.formGroup)!=='MHF27'||S(row.flightId)!==S(current.item.flightId)||S(row.opDate||row.date)!==current.date||
   U(row.targetUser||row.user)!==username())
  throw Error('Phân công MH F27 đã đổi hoặc không còn thuộc tài khoản. Không ghi đè dữ liệu.');
 return row;
}
async function saveServer(force=false){
 if(!current||!model||syncing||(!dirty&&!force))return false;
 if(offline()){const x=$('mhF27Status');if(x)x.textContent='Đã lưu nháp trên thiết bị · cần có mạng để đồng bộ';return false}
 syncing=true;const x=$('mhF27Status');if(x)x.textContent='Đang đồng bộ nháp MH lên Firebase…';
 try{
  await owns();
  const aid=clean(current.item.assignmentId),ref=root.sagsV470Ref('roster_sessions/'+aid+'/mhF27');
  const copy=JSON.parse(JSON.stringify(model)),stamp=Date.now();let conflict=false;
  const result=await ref.transaction(prev=>{
   if(prev&&Number(prev.updatedAtMs)>lastServer&&prev.updatedByUid!==authUid()){
    conflict=true;return;
   }
   return {...copy,updatedByUid:authUid(),updatedBy:username(),
    updatedAtMs:stamp,revision:Math.max(Number(prev?.revision)||0,copy.revision)+1};
  },undefined,false);
  if(!result?.committed){if(conflict)throw Error('Dữ liệu trên Firebase đã được sửa từ thiết bị khác. Nháp trên máy được giữ nguyên; cần đối chiếu trước khi ghi đè.');throw Error('Firebase chưa xác nhận lưu.');}
  lastServer=stamp;model.revision=Number(result.snapshot.val()?.revision)||model.revision;
  dirty=false;try{localStorage.setItem(key(),JSON.stringify(model))}catch(_){}
  const status=model.completedAtMs?'COMPLETED':'IN_PROGRESS',base='roster_sessions/'+aid;
  await root.sagsV470Ref('').update({
   [base+'/taskStatusV333']:status,
   [base+'/claimStatus']:status,
   [base+'/claimedBy']:username(),
   [base+'/claimedAtMs']:Number(result.snapshot.val()?.claimedAtMs)||stamp,
   [base+'/updatedAtMs']:stamp,
   ...(model.completedAtMs?{[base+'/completedAtMs']:model.completedAtMs,[base+'/completedBy']:username()}:{}),
   ['flight_hub/'+clean(current.date)+'/'+clean(current.item.flightId)+'/modules/MHF27']:{
    status,assignmentId:aid,updatedAtMs:stamp,operator:username(),completedAtMs:model.completedAtMs||0}
  });
  if(x)x.textContent='✓ Đã lưu lên Firebase · '+new Date().toLocaleTimeString('vi-VN');
  return true;
 }catch(e){if(x)x.textContent='⚠ Chưa đồng bộ Firebase: '+S(e?.message||e);return false}
 finally{syncing=false}
}
function styles(){
 if($('mhF27Css'))return;
 const link=document.createElement('link');link.rel='stylesheet';link.id='mhF27Css';link.href='./app/styles/mh-f27.v1.css';document.head.appendChild(link);
}
function phaseName(id){return spec?.phases?.find(p=>p.id===id)?.title||id}
function allCount(){return spec.items.length}
function countDone(){return spec.items.filter(r=>['YES','NO','NA'].includes(model.answers[r.key]?.value)).length}
function summary(){const out={YES:0,NO:0,NA:0,EMPTY:0};for(const i of spec.items){const v=model.answers[i.key]?.value;out[v]!==undefined?out[v]++:out.EMPTY++}return out}
function headerSeed(h){
 const item=current.item;
 const assign={date:current.date,arrivalFlightNo:S(item.arrFlight),departureFlightNo:S(item.depFlight),
  aircraftRegistration:S(item.acReg),aircraftType:S(item.acType),station:'CXR',parkingBay:S(item.bay||item.parkingBay)};
 for(const [k,v]of Object.entries(assign))if(!S(h[k])&&v)h[k]=v;
}
function shell(){
 styles();let p=$('mhF27Layer');if(p)return p;
 p=document.createElement('div');p.id='mhF27Layer';p.className='mhF27Layer';p.hidden=true;
 p.innerHTML='<div class="mhF27Card" role="dialog" aria-modal="true" aria-label="Malaysia Airlines safety walkabout checklist">'+
 '<header class="mhF27Head"><div class="mhF27Title"><small>MALAYSIA AIRLINES · MH</small><strong>360 DEGREE SAFETY WALKABOUT CHECKLIST</strong><span>AS/RM/F27 · Issue 1 Revision 4 · Effective 30 April 2026</span></div><button type="button" data-mh-act="close" aria-label="Đóng biểu mẫu">×</button></header>'+
 '<nav class="mhF27Nav" id="mhF27Nav"></nav><div class="mhF27Progress"><strong id="mhF27Progress">0/54</strong><span id="mhF27Status">Đang tải bản làm việc…</span></div>'+
 '<main class="mhF27Body" id="mhF27Body"></main>'+
 '<footer class="mhF27Footer"><button type="button" data-mh-act="save">Lưu nháp</button><button type="button" data-mh-act="pdf">Xuất PDF</button><button type="button" data-mh-act="complete" class="mhF27Primary">Hoàn tất</button></footer>'+
 '</div><div class="mhF27SignOverlay" id="mhF27SignOverlay" hidden><div class="mhF27SignDialog"><strong id="mhF27SignTitle">Ký xác nhận</strong><p>Vui lòng ký trực tiếp trên màn hình.</p><canvas width="560" height="180" id="mhF27SignCanvas"></canvas><div><button type="button" data-mh-act="clear-sign">Xóa nét ký</button><button type="button" data-mh-act="cancel-sign">Hủy</button><button type="button" data-mh-act="save-sign" class="mhF27Primary">Lưu chữ ký</button></div></div></div>';
 document.body.appendChild(p);
 p.addEventListener('input',e=>{
  const k=e.target.dataset.mhHead,remark=e.target.dataset.mhRemark,person=e.target.dataset.mhSigner;
  if(k){model.headers[k]=e.target.value;saveLocal()}
  else if(remark){const row=model.answers[remark]||{};model.answers[remark]={...row,remarks:e.target.value};saveLocal()}
  else if(person){const [who,field]=person.split(':');model.signers[who]={...(model.signers[who]||{}),[field]:e.target.value};saveLocal()}
  else if(e.target.id==='mhF27Remarks'){model.remarks=e.target.value;saveLocal()}
 });
 p.addEventListener('change',e=>{
  if(e.target.dataset.mhChoice){
   const row=model.answers[e.target.dataset.mhChoice]||{},value=e.target.value;
   model.answers[e.target.dataset.mhChoice]={...row,value,atMs:Date.now(),by:username()};
   saveLocal();renderNav();renderPhase(current.phase);
  }
 });
 p.addEventListener('click',e=>{
  const btn=e.target.closest('[data-mh-act]');
  if(!btn)return;const action=btn.dataset.mhAct;
  if(action==='phase'){current.phase=btn.dataset.phase;renderPhase(current.phase);renderNav();return}
  if(action==='close'){close();return}
  if(action==='save'){void saveServer(true);return}
  if(action==='complete'){void complete();return}
  if(action==='pdf'){void exportPdf();return}
  if(action==='sign'){startSign(btn.dataset.signer);return}
  if(action==='clear-sign'){clearInk();return}
  if(action==='cancel-sign'){hideSign();return}
  if(action==='save-sign'){finishSign();return}
 });
 initPad();
 return p;
}
function renderNav(){
 const n=$('mhF27Nav');if(!n)return;
 n.innerHTML=['0',...spec.phases.map(x=>x.id),'A'].map(id=>{
  const title=id==='0'?'THÔNG TIN':id==='A'?'XÁC NHẬN':'P.'+id;
  const done=id==='0'?spec.headerFields.filter(f=>S(model.headers[f.key])).length:
   id==='A'?Object.values(model.signers).filter(x=>x.image).length:
    spec.items.filter(i=>i.phase===id&&model.answers[i.key]?.value).length;
  const all=id==='0'?spec.headerFields.length:id==='A'?2:spec.items.filter(i=>i.phase===id).length;
  return '<button type="button" data-mh-act="phase" data-phase="'+id+'" class="'+(current.phase===id?'active':'')+'">'+title+' <small>'+done+'/'+all+'</small></button>';
 }).join('');
 $('mhF27Progress').textContent=countDone()+'/'+allCount()+' mục đã kiểm tra';
}
function fieldForm(){
 return '<div class="mhF27Intro"><strong>Thông tin chuyến bay</strong><p>Điền thông tin MH và đối chiếu với hồ sơ chuyến. Nội dung ghi theo mẫu AS/RM/F27.</p></div>'+
 '<div class="mhF27Fields">'+spec.headerFields.map(f=>'<label><span>'+esc(f.label)+'</span><input data-mh-head="'+esc(f.key)+'" autocomplete="off" value="'+esc(model.headers[f.key]||'')+'"></label>').join('')+'</div>'+
 '<div class="mhF27Reminder"><b>IMPORTANT REMINDER</b><p>HAZARD REPORT must be raised immediately for identified hazards, irregularities, non-compliance, incidents and damage. Notify LAE/Technician of aircraft defects. No GSE shall enter ERA during FOD checks.</p><b>How to record</b><p>YES = conforms, NO = non-conformance/incomplete, N/A = not applicable. For NO or N/A, enter a meaningful remark and any corrective action.</p></div>';
}
function phaseForm(id){
 const items=spec.items.filter(i=>i.phase===id);
 return '<div class="mhF27Intro"><strong>P.'+id+' · '+esc(phaseName(id))+'</strong><p>Reference to the latest Malaysia Airlines GOM.</p></div>'+
 items.map(i=>{
  const value=S(model.answers[i.key]?.value),remark=S(model.answers[i.key]?.remarks);
  return '<article class="mhF27Item"><div class="mhF27ItemTop"><strong>'+esc(i.key)+'</strong><span>ICP: '+esc(i.inCharge)+'</span></div>'+
   '<p>'+esc(i.activity).replace(/\n/g,'<br>')+'</p><div class="mhF27Checks">'+
   ['YES','NO','NA'].map(v=>'<label class="'+(value===v?'selected ':'')+v.toLowerCase()+'"><input type="radio" name="mh_'+esc(i.key)+'" data-mh-choice="'+esc(i.key)+'" value="'+v+'" '+(value===v?'checked':'')+'><span>'+({'YES':'Yes','NO':'No','NA':'N/A'}[v])+'</span></label>').join('')+
   '</div><label class="mhF27Remark"><span>Remarks '+(value==='NO'||value==='NA'?'(bắt buộc)':'')+'</span><textarea rows="2" data-mh-remark="'+esc(i.key)+'" placeholder="Nêu lý do / hành động khắc phục khi No hoặc N/A">'+esc(remark)+'</textarea></label></article>';
 }).join('');
}
function signForm(){
 const overview=summary();
 return '<div class="mhF27Intro"><strong>P.7 · Chứng nhận / Sign-off</strong><p>Ground Handler Personnel certifies all checks performed. Station Head certifies information verified.</p></div>'+
 '<div class="mhF27Sum">YES: '+overview.YES+' · NO: '+overview.NO+' · N/A: '+overview.NA+' · CHƯA KIỂM TRA: '+overview.EMPTY+'</div>'+
 '<label class="mhF27Remark"><span>Remarks chung</span><textarea id="mhF27Remarks" rows="4">'+esc(model.remarks)+'</textarea></label>'+
 spec.signers.map(person=>{
  const v=model.signers[person.key]||{};
  return '<section class="mhF27Signer"><strong>'+esc(person.title)+'</strong><label>Name<input data-mh-signer="'+person.key+':name" value="'+esc(v.name||'')+'"></label><label>Designation<input data-mh-signer="'+person.key+':designation" value="'+esc(v.designation||'')+'"></label>'+
  (v.image?'<img alt="Chữ ký đã lưu" src="'+esc(v.image)+'"><small>Đã ký: '+new Date(v.atMs||0).toLocaleString('vi-VN')+' · '+esc(v.signedBy||'')+'</small>':'<p>Chưa có chữ ký trực tiếp.</p>')+
  '<button type="button" data-mh-act="sign" data-signer="'+person.key+'">'+(v.image?'Ký lại':'Ký xác nhận')+'</button></section>';
 }).join('')+
 '<div class="mhF27Appendices"><strong>Phụ lục minh họa theo tài liệu MH</strong>'+spec.appendix.map(a=>'<p>'+esc(a.title)+': '+esc(a.details)+'</p>').join('')+
 '<p class="mhF27Warning">Hình minh họa kỹ thuật phải được đối chiếu với phụ lục bản gốc do Malaysia Airlines ban hành; bản điện tử không tự thay đổi vị trí cọc tiêu/chèn bánh.</p></div>';
}
function renderPhase(id){
 const el=$('mhF27Body');if(!el)return;
 const keepScroll=el.scrollTop;
 el.innerHTML=id==='0'?fieldForm():id==='A'?signForm():phaseForm(id);
 el.scrollTop=0;renderNav();
}
function initPad(){
 const c=$('mhF27SignCanvas');c.style.touchAction='none';let draw=false,last=null;
 const point=e=>{const rect=c.getBoundingClientRect();return [(e.clientX-rect.left)*c.width/rect.width,(e.clientY-rect.top)*c.height/rect.height]};
 const start=e=>{draw=true;last=point(e);c.setPointerCapture?.(e.pointerId);const x=c.getContext('2d');x.strokeStyle='#17354e';x.lineWidth=3;x.lineCap='round';x.beginPath();x.moveTo(...last);x.lineTo(last[0]+.1,last[1]+.1);x.stroke()};
 c.addEventListener('pointerdown',start);
 c.addEventListener('pointermove',e=>{if(!draw)return;const p=point(e),x=c.getContext('2d');x.beginPath();x.moveTo(...last);x.lineTo(...p);x.stroke();last=p});
 for(const t of ['pointerup','pointercancel'])c.addEventListener(t,()=>{draw=false});
 c.dataset.dirty='0';c.addEventListener('pointerdown',()=>{c.dataset.dirty='1'});
}
function clearInk(){const c=$('mhF27SignCanvas');c.getContext('2d').clearRect(0,0,c.width,c.height);c.dataset.dirty='0'}
function startSign(who){signKey=who;$('mhF27SignTitle').textContent='Ký · '+(who==='stationHead'?'Station Head':'Ground Handler Personnel');clearInk();$('mhF27SignOverlay').hidden=false}
function hideSign(){$('mhF27SignOverlay').hidden=true;signKey=''}
function finishSign(){
 const c=$('mhF27SignCanvas'),info=model.signers[signKey]||{};
 if(c.dataset.dirty!=='1'||!S(info.name)||!S(info.designation)){alert('Cần điền tên, chức danh và ký trực tiếp.');return}
 const image=c.toDataURL('image/png');
 if(image.length>60000){alert('Chữ ký quá lớn, hãy ký lại nét gọn hơn.');return}
 model.signers[signKey]={...info,image,atMs:Date.now(),signedBy:username(),uid:authUid()};
 saveLocal();hideSign();renderPhase('A');
}
function issues(){
 const errs=[];
 for(const i of spec.items){const v=model.answers[i.key]?.value;
  if(!['YES','NO','NA'].includes(v))errs.push(i.key+' chưa đánh dấu');
  else if(['NO','NA'].includes(v)&&S(model.answers[i.key]?.remarks).length<5)errs.push(i.key+' thiếu Remarks');
 }
 for(const s of spec.signers){const a=model.signers[s.key];if(!a?.image||!S(a.name)||!S(a.designation))errs.push('Chưa ký '+s.title)}
 return errs;
}
async function complete(){
 const errors=issues();if(errors.length){alert('Biểu mẫu MH chưa đủ điều kiện hoàn tất:\n'+errors.slice(0,12).join('\n')+(errors.length>12?'\n...và '+(errors.length-12)+' mục nữa':''));return}
 if(!root.confirm('Xác nhận hoàn tất MH AS/RM/F27 sau khi đã đối chiếu toàn bộ nội dung và hai chữ ký?'))return;
 const old=model.completedAtMs;model.completedAtMs=Date.now();saveLocal();
 const ok=await saveServer(true);
 if(ok){alert('Đã hoàn tất và đồng bộ MH AS/RM/F27 lên Firebase.');root.dispatchEvent(new Event('sags:personal-roster-updated'))}
 else{model.completedAtMs=old||0;saveLocal();alert('Chưa xác nhận được hoàn tất trên Firebase. Bản nháp vẫn còn trên thiết bị.')}
}
function close(){
 clearTimeout(saveTimer);if(dirty)void saveServer(true);
 const el=$('mhF27Layer');if(el)el.hidden=true;
 hideSign();current=null;model=null;lastServer=0;dirty=false;
 root.dispatchEvent(new Event('sags:ui-ready'));
}
async function open(options){
 const item=options?.item||{},date=S(options?.date||item.opDate||item.date);
 if(!/^20\d{2}-\d{2}-\d{2}$/.test(date)||!S(item.assignmentId)||U(item.formGroup)!=='MHF27')
  throw Error('Thiếu phân công AS/RM/F27 hợp lệ.');
 if(!authUid()||offline())throw Error('Cần đăng nhập và kết nối mạng để mở form MH an toàn.');
 if(root.sagsAirlineFormPolicy?.allowed?.(item,'mhf27')===false)throw Error('MH F27 chỉ áp dụng cho hãng MH.');
 if(typeof root.SAGSRosterOpenGuard?.requireRadio==='function')await root.SAGSRosterOpenGuard.requireRadio();
 if(!spec){const r=await fetch('./data/mh-f27-checklist.json',{cache:'no-cache'});if(!r.ok)throw Error('Không tải được mẫu Malaysia Airlines.');spec=await r.json()}
 if(spec.carrier!=='MH'||spec.items?.length!==54)throw Error('Dữ liệu mẫu MH F27 không hợp lệ hoặc bị thiếu.');
 current={item,date,phase:'0'};await owns();
 const saved=readLocal();
 let remote=null;
 try{remote=(await root.sagsV470Ref('roster_sessions/'+clean(item.assignmentId)+'/mhF27').once('value')).val()}catch(e){console.warn('MH F27 server',e?.message||e)}
 lastServer=Number(remote?.updatedAtMs)||0;
 model=normalize(remote&&lastServer>=saved.updatedAtMs?remote:saved);
 headerSeed(model.headers);
 if(!model.signers.groundHandler)model.signers.groundHandler={name:S(root.currentUserProfile?.fullName||root.currentUserProfile?.name||''),designation:S(root.currentUserProfile?.jobTitle||'')};
 dirty=!!(saved.updatedAtMs>lastServer);
 const p=shell();p.hidden=false;renderNav();renderPhase('0');
 if(dirty){$('mhF27Status').textContent='Đã khôi phục nháp mới hơn từ thiết bị này · cần đồng bộ';void saveServer(true)}
 else $('mhF27Status').textContent=lastServer?'✓ Đã khôi phục bản Firebase':'Mẫu MH mới · chưa có dữ liệu';
 return true;
}
function wrap(ctx,text,maxWidth,fontSize=15){
 ctx.font=fontSize+'px Arial';const rows=[];
 for(const block of S(text).split('\n')){let line='';for(const word of block.split(/\s+/)){
  const next=line?line+' '+word:word;
  if(line&&ctx.measureText(next).width>maxWidth){rows.push(line);line=word}else line=next;
 }if(line)rows.push(line)}
 return rows;
}
function pageCanvas(index,total){
 const c=document.createElement('canvas');c.width=1200;c.height=1698;
 const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,1200,1698);
 x.fillStyle='#112f4d';x.fillRect(35,35,1130,12);x.fillStyle='#f5f9fc';x.fillRect(35,47,1130,86);
 x.fillStyle='#112f4d';x.font='bold 27px Arial';x.fillText('REF: AS/RM/F27',50,88);
 x.font='bold 24px Arial';x.fillText('360 DEGREE SAFETY WALKABOUT CHECKLIST',284,88);
 x.font='bold 19px Arial';x.fillText('MALAYSIA AIRLINES',930,120);
 x.fillStyle='#415770';x.font='17px Arial';x.fillText('Issue 1 Revision 4  ·  Effective 30 April 2026  ·  Internal Use',50,162);
 x.strokeStyle='#d0dce7';x.beginPath();x.moveTo(50,1600);x.lineTo(1150,1600);x.stroke();
 x.fillStyle='#476077';x.font='16px Arial';x.fillText('Issued by Regulatory Management / Airport Services Department',50,1640);
 x.textAlign='right';x.fillText('SAGS digital entry  ·  Page '+index+' of '+total,1150,1640);x.textAlign='left';
 return {c,x,y:190};
}
function pdfTableHead(x,y){
 x.fillStyle='#d6e5f3';x.fillRect(55,y,1090,48);x.fillStyle='#16364b';x.font='bold 17px Arial';
 for(const [t,p] of [['Key',67],['Safety Walkabout Activities',143],['ICP',805],['Yes',887],['No',945],['N/A',990],['Remarks',1045]])x.fillText(t,p,y+30);
 return y+48;
}
function pdfRows(x,items,y,lastY=1550){
 y=pdfTableHead(x,y);
 for(const row of items){
  const selected=S(model.answers[row.key]?.value),remark=S(model.answers[row.key]?.remarks);
  const lines=wrap(x,row.activity,650,15),remarkLines=wrap(x,remark,135,14);
  const height=Math.max(60,(lines.length+1)*22,remarkLines.length*20+24);
  if(y+height>lastY){x.fillStyle='#b51e35';x.font='bold 14px Arial';x.fillText('Continued on next export page - source text preserved in app.',70,lastY-10);break}
  x.fillStyle=Number(row.key.split('.')[0])%2?'#fff':'#f8fbfd';x.fillRect(55,y,1090,height);
  x.strokeStyle='#cddae5';x.strokeRect(55,y,1090,height);
  for(const col of [129,797,877,934,982,1030]){x.beginPath();x.moveTo(col,y);x.lineTo(col,y+height);x.stroke()}
  x.fillStyle='#15364c';x.font='bold 19px Arial';x.fillText(row.key,65,y+28);
  x.font='bold 14px Arial';wrap(x,row.inCharge,73,14).slice(0,3).forEach((t,n)=>x.fillText(t,803,y+24+n*18));
  x.font='15px Arial';lines.forEach((t,n)=>x.fillText(t,138,y+24+n*21));
  x.font='bold 21px Arial';if(selected){const px=selected==='YES'?899:selected==='NO'?950:997;x.fillText('X',px,y+29)}
  x.font='14px Arial';remarkLines.slice(0,Math.floor((height-10)/20)).forEach((t,n)=>x.fillText(t,1038,y+23+n*19));
  y+=height;
 }
 return y;
}
function pdfBuild(canvases){
 const offsets=[],chunks=[];let pos=0;
 const add=v=>{chunks.push(v);pos+=typeof v==='string'?v.length:v.byteLength};
 const obj=(n,text)=>{offsets[n]=pos;add(n+' 0 obj\n'+text+'\nendobj\n')};
 const image=(n,c)=>{
  const jpg=Uint8Array.from(atob(c.toDataURL('image/jpeg',.87).split(',')[1]),b=>b.charCodeAt(0));
  offsets[n]=pos;add(n+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+c.width+' /Height '+c.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpg.length+' >>\nstream\n');add(jpg);add('\nendstream\nendobj\n');
 };
 add('%PDF-1.4\n');obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
 obj(2,'<< /Type /Pages /Kids ['+canvases.map((_,i)=>(3+i*3)+' 0 R').join(' ')+'] /Count '+canvases.length+' >>');
 canvases.forEach((c,i)=>{
  const n=3+i*3,cmd='q\n595 0 0 842 0 0 cm\n/Im1 Do\nQ\n';
  obj(n,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im1 '+(n+2)+' 0 R >> >> /Contents '+(n+1)+' 0 R >>');
  obj(n+1,'<< /Length '+cmd.length+' >>\nstream\n'+cmd+'endstream');image(n+2,c);
  c.width=1;c.height=1;
 });
 const end=pos,max=2+canvases.length*3;add('xref\n0 '+(max+1)+'\n0000000000 65535 f \n');
 for(let n=1;n<=max;n++)add(String(offsets[n]||0).padStart(10,'0')+' 00000 n \n');
 add('trailer\n<< /Size '+(max+1)+' /Root 1 0 R >>\nstartxref\n'+end+'\n%%EOF');
 return new Blob(chunks,{type:'application/pdf'});
}
async function exportPdf(){
 if(!current||!model)return;
 if(dirty&&navigator.onLine){const ok=await saveServer(true);if(!ok&&!root.confirm('Dữ liệu chưa đồng bộ Firebase. Vẫn xuất bản PDF nháp trên thiết bị này?'))return}
 try{
  const printPages=[
   spec.items.filter(x=>['1.1','1.2','1.3'].includes(x.key)),
   spec.items.filter(x=>['1.4','1.5','1.6'].includes(x.key)||x.phase==='2'&&Number(x.key.split('.')[1])<=10),
   spec.items.filter(x=>x.phase==='2'&&Number(x.key.split('.')[1])>10||x.phase==='3'&&Number(x.key.split('.')[1])<=4),
   spec.items.filter(x=>x.phase==='3'&&Number(x.key.split('.')[1])>4||x.phase==='4'||x.phase==='5'),
   spec.items.filter(x=>x.phase==='6'),
   spec.items.filter(x=>x.phase==='7')
  ];
  const total=9,canvases=[];
  for(let i=0;i<printPages.length;i++){
   const pg=pageCanvas(i+1,total),x=pg.x;let y=pg.y;
   if(i===0){
    x.fillStyle='#15364c';x.font='bold 21px Arial';x.fillText('Flight / Aircraft details',60,y+20);y+=42;
    const keys=spec.headerFields;for(let j=0;j<keys.length;j+=3){
     const part=keys.slice(j,j+3);
     for(let k=0;k<part.length;k++){
      const f=part[k],left=60+k*360;
      x.fillStyle='#e7eff5';x.fillRect(left,y,342,45);
      x.fillStyle='#273e55';x.font='bold 14px Arial';x.fillText(f.label,left+8,y+17);
      x.font='16px Arial';x.fillText(S(model.headers[f.key]).slice(0,37),left+8,y+37);
     }y+=48;
    }
    x.font='bold 18px Arial';x.fillStyle='#123d54';x.fillText('IMPORTANT REMINDER · STOP unsafe acts · report hazards immediately',60,y+26);y+=48;
   }else{x.fillStyle='#163b58';x.font='bold 22px Arial';x.fillText('MH AS/RM/F27 · Checklist phases',60,y+25);y+=52}
   pdfRows(x,printPages[i],y,1540);
   if(i===5){
    x.font='16px Arial';x.fillStyle='#193b56';x.fillText('Certification:',65,1135);
    for(let j=0;j<2;j++){const who=spec.signers[j],a=model.signers[who.key]||{};
     x.font='bold 16px Arial';x.fillText(who.title,65+j*545,1180);
     x.font='15px Arial';x.fillText('Name: '+S(a.name),65+j*545,1215);
     x.fillText('Designation: '+S(a.designation),65+j*545,1245);
     x.fillText('Signed by: '+S(a.signedBy),65+j*545,1275);
    }
   }
   canvases.push(pg.c);
  }
  for(let i=0;i<spec.appendix.length;i++){
   const a=spec.appendix[i],pg=pageCanvas(i+7,total),x=pg.x;
   x.fillStyle='#18354c';x.font='bold 27px Arial';x.fillText(a.title.toUpperCase(),65,245);
   x.font='20px Arial';wrap(x,a.details,1030,20).forEach((t,n)=>x.fillText(t,65,317+n*33));
   x.strokeStyle='#c9dbe9';x.strokeRect(80,470,1040,835);
   x.fillStyle='#edf4f8';x.fillRect(81,471,1038,833);
   x.fillStyle='#173e5b';x.font='bold 24px Arial';x.fillText('OFFICIAL MH ILLUSTRATION REFERENCE',130,650);
   x.font='20px Arial';wrap(x,'For operational placement/positioning, use the exact Appendix '+(i+1)+' illustration in the approved Malaysia Airlines AS/RM/F27 source. This E-REPORT export does not replace the airline-approved technical drawing.',890,20).forEach((t,n)=>x.fillText(t,130,708+n*38));
   canvases.push(pg.c);
  }
  const pdf=pdfBuild(canvases),url=URL.createObjectURL(pdf),a=document.createElement('a');
  a.href=url;a.download='MH_AS-RM-F27_'+clean(current.date)+'_'+clean(current.item.flightId)+'.pdf';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),45000);
  $('mhF27Status').textContent='Đã tạo PDF · '+total+' trang';
 }catch(e){alert('Không xuất được PDF MH: '+S(e?.message||e))}
}
root.SAGSMHF27=Object.freeze({open,close,formId:ID});
})(window);

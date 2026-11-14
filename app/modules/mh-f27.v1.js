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
async function readIdb(){
 try{const db=await openDb();return await new Promise(resolve=>{
  const tx=db.transaction('drafts','readonly'),req=tx.objectStore('drafts').get(key());
  req.onsuccess=()=>resolve(normalize(req.result));req.onerror=()=>resolve(normalize(null));
 });}catch(_){return normalize(null)}
}
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
   if(prev&&Number(prev.updatedAtMs)>lastServer){
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
   ...(model.completedAtMs?{[base+'/completedAtMs']:model.completedAtMs,[base+'/completedBy']:username()}:{})
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
function invalidateSignoff(){
 if(!model)return;
 model.completedAtMs=0;
 // A signature must not certify checks that were changed after signing.
 for(const signer of Object.values(model.signers||{})){
  if(!signer?.image)continue;
  delete signer.image;delete signer.atMs;delete signer.signedBy;delete signer.uid;
 }
}
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
  if(k){invalidateSignoff();model.headers[k]=e.target.value;saveLocal()}
  else if(remark){invalidateSignoff();const row=model.answers[remark]||{};model.answers[remark]={...row,remarks:e.target.value};saveLocal()}
  else if(person){const [who,field]=person.split(':');const old=model.signers[who]||{};model.signers[who]={...old,[field]:e.target.value,image:''};invalidateSignoff();saveLocal()}
  else if(e.target.id==='mhF27Remarks'){invalidateSignoff();model.remarks=e.target.value;saveLocal()}
 });
 p.addEventListener('change',e=>{
  if(e.target.dataset.mhChoice){
   const row=model.answers[e.target.dataset.mhChoice]||{},value=e.target.value;
   invalidateSignoff();model.answers[e.target.dataset.mhChoice]={...row,value,atMs:Date.now(),by:username()};
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
async function close(){
 clearTimeout(saveTimer);
 if(dirty&&navigator.onLine)await saveServer(true);
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
 const local=readLocal(),indexed=await readIdb();
 const saved=indexed.updatedAtMs>local.updatedAtMs?indexed:local;
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

/* PDF export: overlay values onto the actual nine-page AS/RM/F27.
 * Coordinates are PDF points measured against the user-supplied Issue 1 Revision 4 source.
 * DO NOT redraw the form, logo, headings, tables, or three airline safety appendices.
 */
const MH_F27_PDF_SOURCE='./assets/mh/AS_RM_F27_Iss1Rev4_2026-04-30.pdf';
const MH_F27_SOURCE_BYTES=547484;
const MH_F27_ROWS=Object.freeze({"1.1":[1,431.95,471.91],"1.2":[1,471.91,617.62],"1.3":[1,617.62,703.9],"1.4":[2,89.06,116.06],"1.5":[2,116.06,156.62],"1.6":[2,156.62,196.7],"2.1":[2,196.7,263.21],"2.2":[2,263.21,278.93],"2.3":[2,278.93,323.93],"2.4":[2,323.93,339.65],"2.5":[2,339.65,392.93],"2.6":[2,392.93,432.91],"2.7":[2,432.91,591.79],"2.8":[2,591.79,618.58],"2.9":[2,618.58,654.58],"2.10":[2,654.58,681.46],"2.11":[3,89.06,115.7],"2.12":[3,115.7,150.74],"2.13":[3,150.74,201.02],"2.14":[3,201.02,227.9],"3.1":[3,227.9,386.69],"3.2":[3,386.69,413.69],"3.3":[3,413.69,453.79],"3.4":[3,453.79,706.06],"3.5":[4,231.38,260.57],"3.6":[4,260.57,300.65],"3.7":[4,300.65,313.73],"3.8":[4,313.73,326.69],"4.1":[4,326.69,526.63],"5.1":[4,526.63,579.91],"5.2":[4,579.91,595.63],"5.3":[4,595.63,622.54],"5.4":[4,622.54,646.54],"6.1":[5,89.06,115.7],"6.2":[5,115.7,142.7],"6.3":[5,142.7,182.78],"6.4":[5,182.78,209.66],"6.5":[5,209.66,225.38],"6.6":[5,225.38,265.61],"6.7":[5,265.61,292.37],"6.8":[5,292.37,315.77],"6.9":[5,315.77,342.65],"6.10":[5,342.65,395.93],"6.11":[5,395.93,430.87],"6.12":[5,430.87,457.63],"6.13":[5,457.63,484.51],"6.14":[5,484.51,511.51],"6.15":[5,511.51,538.39],"6.16":[5,538.39,565.27],"6.17":[5,565.27,580.99],"6.18":[5,580.99,603.1],"7.1":[6,65.52,189.98],"7.2":[6,189.98,255.05],"7.3":[6,255.05,356.21]});
const MH_F27_HEADER=[
 ['aircraftRegistration','aircraftType','date'],
 ['station','parkingBay','trc'],
 ['arrivalFlightNo','departureFlightNo','rampOfficer'],
 ['arrivalSector','departureSector','gseOperator1'],
 ['staEtaAta','stdEtdAtd','gseOperator2'],
 ['arrivalPHLead','departurePHLead','gseOperator3']
];
const MH_F27_HEADER_TOPS=[66,80.76,95.66,110.54,125.54,140.42];
let pdfLibLoading=null,pdfExporting=false;
function loadLibraryScript(url){
 return new Promise((resolve,reject)=>{
  const s=document.createElement('script');
  s.async=true;s.src=url;s.onload=resolve;s.onerror=()=>reject(Error('Không thể tải PDF library '+url));
  document.head.appendChild(s);
 });
}
async function loadPdfLibrary(){
 if(root.PDFLib?.PDFDocument)return root.PDFLib;
 if(!pdfLibLoading)pdfLibLoading=(async()=>{
  for(const url of [
   'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
   'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'
  ]){
   try{await loadLibraryScript(url);if(root.PDFLib?.PDFDocument)return root.PDFLib}
   catch(e){console.warn('MH F27 PDF library',e?.message||e)}
  }
  throw Error('Không tải được thư viện ghi PDF. Vui lòng kiểm tra kết nối và xuất lại; không sử dụng PDF tự vẽ thay thế.');
 })().catch(e=>{pdfLibLoading=null;throw e});
 return pdfLibLoading;
}
function pdfText(ctx,val,x,y,width,height,initial=7.6){
 const txt=S(val).replace(/\s+/g,' ');
 if(!txt)return;
 ctx.save();ctx.beginPath();ctx.rect(x,y,width,height);ctx.clip();
 ctx.fillStyle='#111';ctx.textBaseline='middle';
 let font=initial;
 do{ctx.font=font+'px Arial, sans-serif';if(ctx.measureText(txt).width<=width-2)break;font-=.3}while(font>4.2);
 ctx.fillText(txt,x+1,y+height/2);
 ctx.restore();
}
function pdfLines(ctx,raw,maxWidth){
 const result=[];
 for(const paragraph of S(raw).split(/\r?\n/)){
  if(!paragraph.trim()){result.push('');continue}
  let line='';
  for(const rawWord of paragraph.trim().split(/\s+/)){
   let word=rawWord;
   while(word&&ctx.measureText(word).width>maxWidth){
    let n=1;while(n<word.length&&ctx.measureText(word.slice(0,n+1)).width<=maxWidth)n++;
    if(line){result.push(line);line=''}
    result.push(word.slice(0,n));word=word.slice(n);
   }
   if(!word)continue;
   const next=line?line+' '+word:word;
   if(line&&ctx.measureText(next).width>maxWidth){result.push(line);line=word}
   else line=next;
  }
  result.push(line);
 }
 return result;
}
function pdfRemarks(ctx,raw,key,x,y,width,height,overflows){
 if(!S(raw))return;
 const small=height<20,fs=small?5.2:6,lh=small?6.2:7.6;
 ctx.save();ctx.beginPath();ctx.rect(x,y,width,height);ctx.clip();
 ctx.fillStyle='#111';ctx.font=fs+'px Arial, sans-serif';ctx.textBaseline='top';
 const all=pdfLines(ctx,raw,width-3),capacity=Math.max(1,Math.floor((height-4)/lh));
 for(let i=0;i<Math.min(all.length,capacity);i++)ctx.fillText(all[i],x+1,y+2+i*lh);
 ctx.restore();
 if(all.length>capacity)overflows.push({key,text:S(raw)});
}
function newOverlayCanvas(w,h){
 const canvas=document.createElement('canvas'),scale=2;
 canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);
 const ctx=canvas.getContext('2d',{alpha:true});
 if(!ctx)throw Error('Thiết bị không tạo được lớp chữ PDF.');
 ctx.scale(scale,scale);
 return {canvas,ctx};
}
function checkRowsForPage(ctx,pageNum,snapshot,overflows){
 for(const [key,pos]of Object.entries(MH_F27_ROWS)){
  const [page,top,bottom]=pos;
  if(page!==pageNum)continue;
  const row=snapshot.answers?.[key]||{},v=S(row.value);
  if(v==='YES'||v==='NO'||v==='NA'){
   const x=v==='YES'?459:v==='NO'?484:506.5;
   const centerY=(bottom-top)>45?top+13:(top+bottom)/2;
   ctx.save();ctx.fillStyle='#101010';ctx.font='bold '+(v==='NA'?7.1:10)+'px Arial, sans-serif';
   ctx.textAlign='center';ctx.textBaseline='middle';
   ctx.fillText(v==='YES'?'✓':v==='NO'?'X':'N/A',x,centerY);
   ctx.restore();
  }
  pdfRemarks(ctx,row.remarks,key,521.6,top+1,57.2,bottom-top-2,overflows);
 }
}
function checkHeader(ctx,snapshot){
 const xs=[161,352.5,508.5],widths=[69.8,69.5,70.5];
 for(let row=0;row<MH_F27_HEADER.length;row++){
  const top=MH_F27_HEADER_TOPS[row],height=row===5?16.8:14.3;
  for(let col=0;col<3;col++){
   const key=MH_F27_HEADER[row][col];
   pdfText(ctx,snapshot.headers?.[key],xs[col],top,widths[col],height,7.8);
  }
 }
 pdfText(ctx,snapshot.headers?.additionalDetails,161,158.05,419,15.2,7.8);
}
function signatureImage(data){
 return new Promise((resolve,reject)=>{
  if(!S(data))return resolve(null);
  if(!/^data:image\/png;base64,/.test(S(data)))return reject(Error('Chữ ký MH không đúng định dạng PNG.'));
  const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Không giải mã được chữ ký MH để xuất PDF.'));img.src=data;
 });
}
async function checkSignatures(ctx,snapshot,overflows){
 pdfRemarks(ctx,snapshot.remarks,'Remarks chung',39,369,117,144,overflows);
 for(const [key,x]of [['groundHandler',167],['stationHead',383]]){
  const s=snapshot.signers?.[key]||{};
  const im=await signatureImage(s.image);
  if(im){
   const ratio=Math.min(179/im.width,16/im.height);
   ctx.drawImage(im,x,430,im.width*ratio,im.height*ratio);
  }
  pdfText(ctx,s.name,x,461,183,11,7.5);
  pdfText(ctx,s.designation,x,489,183,15,7.5);
 }
}
function pdfContinuationPage(doc,PDFLib,overflows,w,h){
 if(!overflows.length)return 0;
 // A spill page is only created when the tiny original Remarks cells cannot
 // hold all content. The approved nine source pages remain visually unmodified.
 let count=0,page=null,ctx=null,canvas=null,y=0;
 const flush=async()=>{};
 const pages=[];
 for(const row of overflows){
  if(!ctx||y>h-100){
   if(ctx)pages.push({page,canvas});
   page=doc.addPage([w,h]);({ctx,canvas}=newOverlayCanvas(w,h));
   ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
   ctx.fillStyle='#1b344c';ctx.font='bold 13px Arial';ctx.fillText('MH AS/RM/F27 - REMARKS CONTINUATION',38,45);
   ctx.fillStyle='#333';ctx.font='8px Arial';ctx.fillText('Additional entries only. The first 9 pages are the official MH checklist.',38,62);
   y=85;count++;
  }
  ctx.fillStyle='#111';ctx.font='bold 9px Arial';ctx.fillText(row.key+':',38,y);
  ctx.font='8px Arial';
  const lines=pdfLines(ctx,row.text,w-96);
  const maxPossible=Math.max(1,Math.floor((h-y-50)/11));
  for(let i=0;i<Math.min(lines.length,maxPossible);i++)ctx.fillText(lines[i],83,y+i*11);
  y+=Math.min(lines.length,maxPossible)*11+20;
  // Lengthy notes must never be dropped: create more continuation entries.
  if(lines.length>maxPossible)overflows.push({key:row.key+' (continued)',text:lines.slice(maxPossible).join(' ')});
 }
 if(ctx)pages.push({page,canvas});
 return Promise.all(pages.map(async e=>{
  const image=await doc.embedPng(e.canvas.toDataURL('image/png'));
  e.page.drawImage(image,{x:0,y:0,width:w,height:h});
  e.canvas.width=1;e.canvas.height=1;
 })).then(()=>count);
}
async function exportPdf(){
 if(!current||!model||pdfExporting)return;
 const button=$('mhF27Layer')?.querySelector('[data-mh-act="pdf"]');
 pdfExporting=true;if(button)button.disabled=true;
 const status=$('mhF27Status');
 try{
  if(dirty&&navigator.onLine){
   const saved=await saveServer(true);
   if(!saved&&!root.confirm('Dữ liệu chưa đồng bộ Firebase. Vẫn xuất PDF nháp trên thiết bị này?'))return;
  }
  const snapshot=JSON.parse(JSON.stringify(model));
  const flight={date:current.date,id:S(current.item.flightId)};
  if(status)status.textContent='Đang lấy PDF gốc của Malaysia Airlines…';
  const [lib,response]=await Promise.all([
   loadPdfLibrary(),
   fetch(MH_F27_PDF_SOURCE,{cache:'no-store'})
  ]);
  if(!response.ok)throw Error('Không tải được PDF nguồn MH (HTTP '+response.status+').');
  const raw=await response.arrayBuffer();
  if(raw.byteLength!==MH_F27_SOURCE_BYTES)throw Error('PDF nguồn MH không đúng phiên bản đã duyệt.');
  const pdf=await lib.PDFDocument.load(raw);
  if(pdf.getPageCount()!==9)throw Error('PDF MH gốc phải có đúng 9 trang.');
  const first=pdf.getPage(0),w=first.getWidth(),h=first.getHeight();
  if(Math.abs(w-615.48)>.5||Math.abs(h-792)>.5)
   throw Error('Kích thước trang PDF MH không đúng tài liệu gốc.');
  const overflows=[];
  for(let n=1;n<=6;n++){
   if(status)status.textContent='Đang điền dữ liệu lên bản gốc · trang '+n+'/9';
   const pg=pdf.getPage(n-1),sz=pg.getSize();
   if(Math.abs(sz.width-w)>.1||Math.abs(sz.height-h)>.1)
    throw Error('Một trang PDF MH có kích thước khác tài liệu gốc.');
   const {canvas,ctx}=newOverlayCanvas(w,h);
   if(n===1)checkHeader(ctx,snapshot);
   checkRowsForPage(ctx,n,snapshot,overflows);
   if(n===6)await checkSignatures(ctx,snapshot,overflows);
   const png=await pdf.embedPng(canvas.toDataURL('image/png'));
   pg.drawImage(png,{x:0,y:0,width:w,height:h});
   canvas.width=1;canvas.height=1;
   await new Promise(resolve=>root.requestAnimationFrame?root.requestAnimationFrame(resolve):setTimeout(resolve,0));
  }
  const extra=await pdfContinuationPage(pdf,lib,overflows,w,h);
  if(status)status.textContent='Đang kết xuất PDF gốc…';
  const bytes=await pdf.save({useObjectStreams:true});
  const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
  const a=document.createElement('a');
  a.href=url;a.download='MH_AS-RM-F27_'+clean(flight.date)+'_'+clean(flight.id)+'.pdf';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
  if(status)status.textContent='✓ Đã xuất PDF theo đúng '+(9+extra)+' trang (9 trang gốc'+(extra?' + '+extra+' trang ghi chú':'')+')';
 }catch(e){
  if(status)status.textContent='⚠ Lỗi xuất MH F27: '+S(e?.message||e);
  alert('Không thể xuất PDF MH theo mẫu gốc: '+S(e?.message||e));
 }finally{
  pdfExporting=false;if(button)button.disabled=false;
 }
}
root.SAGSMHF27=Object.freeze({open,close,formId:ID,pdfSourcePath:MH_F27_PDF_SOURCE,pdfRows:MH_F27_ROWS});
})(window);

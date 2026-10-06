/* E-REPORT SAGS V6.4.99 · DOSSIER NOTIFICATIONS + UPPERCASE FORMS
   Event-driven only: no polling and no DOM-wide MutationObserver. */
(function(root){
'use strict';
const BUILD='V6.4.99-20261005-PERFORMANCE-01';
if(root.__SAGS_V6497_DOSSIER_ENH__===BUILD)return;
root.__SAGS_V6497_DOSSIER_ENH__=BUILD;

const S=v=>String(v??'').trim();
const U=v=>S(v).toLocaleUpperCase('vi-VN');
const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
const esc=v=>S(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const norm=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}};
const session=()=>{try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return{role:root.currentRole||'',profile:root.currentUserProfile||{}}}};
const profile=()=>session().profile||root.currentUserProfile||{};
const role=()=>U(session().role||profile().role||root.currentRole);
const me=()=>norm(profile().username||root.currentUserProfile?.username||(role()==='AD'?'AD':''));
function opDate(){const picked=S(document.getElementById('fwcDate')?.value)||S(sessionStorage.getItem('sagsV36FwcDate'));if(picked)return picked;const d=new Date();if(d.getHours()<4)d.setDate(d.getDate()-1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function authenticated(){return document.body.classList.contains('v157-authenticated')&&!!me()}

/* -------------------- UPPERCASE FORM DATA -------------------- */
function currentState(){try{return typeof state!=='undefined'&&state&&typeof state==='object'?state:(root.state&&typeof root.state==='object'?root.state:null)}catch(_){return root.state&&typeof root.state==='object'?root.state:null}}
function currentFields(){try{return typeof fields!=='undefined'&&Array.isArray(fields)?fields:(Array.isArray(root.fields)?root.fields:[])}catch(_){return Array.isArray(root.fields)?root.fields:[]}}
function isTextField(f){
 const t=U(f?.type).replace(/[\s_-]+/g,'');
 if(['CHECK','CHECKBOX','NUMBER','TIME','TIMENOW','DATE','DATEAUTO','SIGNATURE','IMAGE','PHOTO','FILE'].includes(t))return false;
 const k=U(f?.key);
 if(/SIGNATURE|ATTACH|IMAGE|PHOTO|FILE|PDF|CANVAS|BASE64/.test(k))return false;
 return true;
}
function upperText(v){return typeof v==='string'&&!/^(?:data:|blob:|https?:)/i.test(v)?v.toLocaleUpperCase('vi-VN'):v}
function uppercaseFormState(){
 const st=currentState(),fs=currentFields();if(!st)return false;
 let changed=false;const typed=new Map();
 for(const f of fs){const k=S(f?.key);if(k)typed.set(k,f);if(!k||!isTextField(f)||typeof st[k]!=='string')continue;const up=upperText(st[k]);if(up!==st[k]){st[k]=up;changed=true}}
 // Registry/dynamic forms may expose state before their field objects are mounted.
 // Cover their textual keys as well while explicitly excluding binary/signature data.
 for(const [k,v] of Object.entries(st)){
  if(typeof v!=='string'||typed.has(k)||!/^(?:f\d+_|tvj|bbbt|fsags|final_)/i.test(k))continue;
  if(/signature|attach|image|photo|file|pdf|canvas|base64/i.test(k))continue;
  const up=upperText(v);if(up!==v){st[k]=up;changed=true}
 }
 return changed;
}
function isFormEditor(el){
 if(!el||!el.matches?.('input,textarea'))return false;
 const type=U(el.type||'TEXT');
 if(['PASSWORD','EMAIL','URL','NUMBER','DATE','TIME','FILE','SEARCH'].includes(type))return false;
 return !!el.closest?.('#entry,#quickTimeModal,#fs09QuickModal,#kh208ManagerModal,#kh208SheetModal,#finalFormFields,.sheet,.form-page,.sagsFormWorkspace')||
        el.matches?.('.quickTimeInput,.fs09qDataInput,.fs09qTextArea,[data-form-field],[data-key]');
}
function uppercaseEditor(el){
 if(!isFormEditor(el))return false;
 const old=String(el.value??''),up=old.toLocaleUpperCase('vi-VN');if(old===up)return false;
 let a=null,b=null;try{a=el.selectionStart;b=el.selectionEnd}catch(_){}
 el.value=up;
 try{if(a!==null&&b!==null)el.setSelectionRange(a,b)}catch(_){}
 return true;
}
function uppercaseVisibleEditors(){document.querySelectorAll('#entryText,.quickTimeInput,.fs09qDataInput,.fs09qTextArea,#kh208ManagerModal input[type="text"],#kh208ManagerModal textarea,#finalFormFields input[type="text"],#finalFormFields textarea,[data-form-field]').forEach(uppercaseEditor)}
function uppercaseRecord(obj){
 if(!obj||typeof obj!=='object')return obj;
 for(const [k,v] of Object.entries(obj)){if(typeof v!=='string'||/signature|attach|image|photo|file|pdf|canvas|base64|url/i.test(k))continue;obj[k]=upperText(v)}
 return obj;
}
function beforeFormAction(){uppercaseVisibleEditors();uppercaseFormState()}
function wrapFinalData(){
 let base=null;try{base=typeof ffCurrentData==='function'?ffCurrentData:root.ffCurrentData}catch(_){base=root.ffCurrentData}
 if(typeof base!=='function'||base.__sagsUppercaseV6497)return;
 const fn=function(){return uppercaseRecord(base.apply(this,arguments))};fn.__sagsUppercaseV6497=1;fn.__base=base;root.ffCurrentData=fn;try{ffCurrentData=fn}catch(_){}
}
function wrapSync(name){
 const base=root[name];if(typeof base!=='function'||base.__sagsUppercaseV6497)return;
 const boundary=!['draw','persist'].includes(name);
 const fn=function(){if(boundary)beforeFormAction();const out=base.apply(this,arguments);if(boundary)uppercaseFormState();return out};fn.__sagsUppercaseV6497=1;fn.__base=base;root[name]=fn;
 try{if(name==='draw')draw=fn;else if(name==='persist')persist=fn;else if(name==='commitEntry')commitEntry=fn;else if(name==='qteSaveCompact')qteSaveCompact=fn;else if(name==='fs09qSave')fs09qSave=fn;else if(name==='sendReport')sendReport=fn;else if(name==='sendKH208Sheet')sendKH208Sheet=fn;else if(name==='saveKH208Local')saveKH208Local=fn}catch(_){}
}
function installUppercase(){
 wrapFinalData();
 if(!document.getElementById('sagsV6497UppercaseStyle')){
  const st=document.createElement('style');st.id='sagsV6497UppercaseStyle';st.textContent=
   '#entryText,.quickTimeInput,.fs09qDataInput,.fs09qTextArea,#kh208ManagerModal input[type="text"],#kh208ManagerModal textarea,#finalFormFields input[type="text"],#finalFormFields textarea,[data-form-field]{text-transform:uppercase!important}';
  document.head.appendChild(st);
 }
 ['draw','persist','commitEntry','qteSaveCompact','fs09qSave','sendReport','sendKH208Sheet','saveKH208Local','sags5494ExportCurrentPdf'].forEach(wrapSync);
 document.addEventListener('input',e=>{if(!e.isComposing)uppercaseEditor(e.target)},true);
 document.addEventListener('change',e=>{if(uppercaseEditor(e.target))uppercaseFormState()},true);
 document.addEventListener('blur',e=>{if(uppercaseEditor(e.target))uppercaseFormState()},true);
 root.addEventListener('beforeprint',beforeFormAction,{passive:true});
 beforeFormAction();try{root.draw?.()}catch(_){}
}

/* -------------------- FLIGHT-DOSSIER BELL -------------------- */
const STORE_PREFIX='sags:dossier-notice:v6497:';
let subscriptions=new Map(),noticeItems=[],noticeUser='',contextKey='',sinceBase=0,maxEventAt=0,processed=new Set(),refreshJob=null;
function currentUnit(){
 const r=role(),p=profile(),txt=U([r,p.systemDepartment,p.departmentCode,p.department,p.groupCode,p.group,p.jobTitle].filter(Boolean).join(' '));
 if(r==='KH'||r==='CARGO'||/KHO HÀNG|KHO HANG|CARGO/.test(txt))return'KH';
 if(r==='CBTT'||/CBTT|CÂN BẰNG|CAN BANG/.test(txt))return'CBTT';
 if(r==='PVHK'||/PVHK|PHỤC VỤ HÀNH KHÁCH|PHUC VU HANH KHACH/.test(txt))return'PVHK';
 if(r==='DH'||r==='ĐH'||/ĐIỀU HÀNH|DIEU HANH/.test(txt))return'DH';
 if(r==='AD'||r==='ADMIN')return'AD';
 return r||'';
}
function kindUnit(kind){
 const k=U(kind);
 if(/FSAGS208|HÀNG HÓA|HANG HOA|ULD|MVT|MVA|CARGO/.test(k))return'KH';
 if(/KẾT SỔ|KET SO|FSAGS09|CLOSEOUT|PVHK/.test(k))return'PVHK';
 if(/FINAL|FSAGS54|FSAGS94|CLC|CBTT/.test(k))return'CBTT';
 if(/FSAGS42|FSAGS421|FSAGS423|FSAGS551|RAMP/.test(k))return'DH';
 return'';
}
function niceKind(kind){
 const k=U(kind);
 if(k==='KET_SO'||k==='CLOSEOUT')return'KẾT SỔ';
 if(k==='FSAGS208')return'FSAGS 208';
 if(k==='FSAGS54')return'FSAGS 54';
 if(k==='FSAGS94'||k==='CLC_CHECKLIST')return'FSAGS 94';
 return k||'TÀI LIỆU';
}
function moduleTime(mod){return Number(mod?.lastSentAtMs||mod?.sentAtMs||mod?.updatedAtMs||mod?.completedAtMs||mod?.createdAtMs||0)}
function moduleSender(mod){return norm(mod?.lastSentBy?.username||mod?.sentBy?.username||mod?.updatedBy||mod?.submittedBy?.username||'')}
function significant(kind,mod){
 const k=U(kind||mod?.kind),st=U(mod?.status),rev=Number(mod?.revisionNo||mod?.published?.revisionNo||0);
 if(!k||k==='RAMP')return false;
 if(k==='FSAGS208')return rev>0&&st==='SENT';
 if(/KẾT SỔ|KET_SO|CLOSEOUT|FINAL/.test(k))return /ĐÃ CÓ|DA CO|SENT|AVAILABLE|PUBLISHED|APPROVED|HOÀN TẤT|HOAN TAT|COMPLETED/.test(st)||rev>0;
 return /SENT|AVAILABLE|PUBLISHED|APPROVED|ĐÃ CÓ|DA CO|HOÀN TẤT|HOAN TAT|COMPLETED|ĐÃ GỬI|DA GUI/.test(st);
}
function storeKey(user){return STORE_PREFIX+'items:'+safe(user)}
function waterKey(user,date){return STORE_PREFIX+'water:'+safe(user)+':'+safe(date)}
function loadNotices(user){try{const a=JSON.parse(localStorage.getItem(storeKey(user))||'[]');return Array.isArray(a)?a.slice(0,60):[]}catch(_){return[]}}
function saveNotices(){if(!noticeUser)return;try{localStorage.setItem(storeKey(noticeUser),JSON.stringify(noticeItems.slice(0,60)))}catch(_){}}
function readWater(user,date){try{return Number(localStorage.getItem(waterKey(user,date))||0)}catch(_){return 0}}
function writeWater(user,date,at){try{localStorage.setItem(waterKey(user,date),String(Math.max(0,Number(at)||0)))}catch(_){}}
function setupContext(user,date){
 const key=user+'|'+date;if(contextKey===key)return;
 contextKey=key;noticeUser=user;noticeItems=loadNotices(user);processed=new Set(noticeItems.map(x=>S(x.sig)).filter(Boolean));
 let w=readWater(user,date);if(!w){w=Date.now();writeWater(user,date,w)}
 sinceBase=w;maxEventAt=w;
}
function stopSubscriptions(){for(const x of subscriptions.values()){try{x.ref.off('child_added',x.added);x.ref.off('child_changed',x.changed)}catch(_){}}subscriptions.clear()}
function flightLabel(item){return S(item?.flightName||item?.flightRaw||item?.assignmentFlight||[item?.arrFlight,item?.depFlight].filter(Boolean).join(' / ')||item?.flightId||'CHUYẾN')}
function formatAt(ms){try{return new Intl.DateTimeFormat('vi-VN',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',hour12:false}).format(new Date(Number(ms)))}catch(_){return''}}
function ensureBadge(btn){
 if(!btn)return null;let b=btn.querySelector('.v6497NoticeBadge');if(!b){b=document.createElement('span');b.className='v6497NoticeBadge';btn.appendChild(b)}return b;
}
function updateBadge(){
 const unread=noticeItems.filter(x=>!x.read).length;
 document.querySelectorAll('#v6494AviationHome [data-v6494-key="notice"]').forEach(btn=>{btn.classList.toggle('has-unread',unread>0);const b=ensureBadge(btn);if(b){b.textContent=unread>99?'99+':String(unread);b.hidden=!unread}});
 const top=document.querySelector('#v6494AviationHome .v6494Notice');if(top){const b=ensureBadge(top);if(b){b.textContent=unread>99?'99+':String(unread);b.hidden=!unread}}
}
function ensureNoticeUi(){
 if(!document.getElementById('sagsV6497NoticeStyle')){
  const st=document.createElement('style');st.id='sagsV6497NoticeStyle';st.textContent=
  '.v6494Notice,.v6494Bottom [data-v6494-key="notice"]{position:relative!important}.v6497NoticeBadge{position:absolute;top:2px;right:2px;min-width:17px;height:17px;padding:0 4px;border-radius:9px;background:#e15353;color:#fff;font:800 9px/17px Inter,Arial;text-align:center;border:2px solid #06131f;box-sizing:border-box}.v6497NoticeBadge[hidden]{display:none!important}'+
  '#v6497NoticeModal{position:fixed;inset:0;z-index:61000;display:none;align-items:flex-start;justify-content:flex-end;padding:70px 16px 16px;background:rgba(1,8,14,.58)}#v6497NoticeModal.show{display:flex}#v6497NoticePanel{width:min(430px,calc(100vw - 24px));max-height:min(720px,calc(100dvh - 90px));display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(100,190,220,.24);border-radius:13px;background:#071824;color:#f2f7fa;box-shadow:0 20px 55px #0008;font:13px/1.4 Inter,Arial}#v6497NoticeHead{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 14px;border-bottom:1px solid rgba(100,190,220,.18)}#v6497NoticeHead b{font-size:15px}#v6497NoticeHead button{width:40px;height:40px;border:1px solid rgba(100,190,220,.18);border-radius:9px;background:#0b2435;color:#dcebf1;font-size:20px}#v6497NoticeList{overflow:auto;padding:8px}.v6497NoticeItem{width:100%;display:block;text-align:left;margin:0 0 7px;padding:11px;border:1px solid rgba(100,190,220,.16);border-radius:10px;background:#0a1f2e;color:#eaf5f8}.v6497NoticeItem.unread{border-color:rgba(33,212,232,.42);background:#0b2b3d}.v6497NoticeItem strong{display:block;color:#f7fbfd;font-size:12px}.v6497NoticeItem span{display:block;margin-top:4px;color:#8fa7b7;font-size:10px}.v6497NoticeEmpty{padding:28px 12px;text-align:center;color:#7895a7}'+
  '@media(max-width:767px){#v6497NoticeModal{align-items:flex-end;padding:0;background:rgba(1,8,14,.66)}#v6497NoticePanel{width:100vw;max-height:78dvh;border-radius:14px 14px 0 0;border-bottom:0;padding-bottom:env(safe-area-inset-bottom)}}';
  document.head.appendChild(st);
 }
 let m=document.getElementById('v6497NoticeModal');if(m)return m;
 m=document.createElement('div');m.id='v6497NoticeModal';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.innerHTML='<div id="v6497NoticePanel"><div id="v6497NoticeHead"><div><b>THÔNG BÁO HỒ SƠ CHUYẾN</b><div style="color:#7895a7;font-size:10px;margin-top:2px">Chỉ các chuyến được phân công cho tài khoản này</div></div><button type="button" id="v6497NoticeClose" aria-label="Đóng">×</button></div><div id="v6497NoticeList"></div></div>';
 document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('show')});m.querySelector('#v6497NoticeClose').onclick=()=>m.classList.remove('show');
 m.querySelector('#v6497NoticeList').addEventListener('click',e=>{const b=e.target.closest('[data-notice-id]');if(!b)return;const n=noticeItems.find(x=>x.id===b.dataset.noticeId);if(!n)return;m.classList.remove('show');openDossier(n)});
 return m;
}
function renderNotices(){
 const list=ensureNoticeUi().querySelector('#v6497NoticeList'),items=noticeItems.slice().sort((a,b)=>Number(b.at)-Number(a.at));
 if(!items.length){list.innerHTML='<div class="v6497NoticeEmpty">CHƯA CÓ THÔNG BÁO HỒ SƠ CHUYẾN</div>';return}
 list.innerHTML=items.map(n=>'<button type="button" class="v6497NoticeItem '+(!n.read?'unread':'')+'" data-notice-id="'+S(n.id).replace(/"/g,'')+'"><strong>'+esc(n.unit)+' ĐÃ GỬI '+esc(n.kind)+' · '+esc(n.flight)+'</strong><span>'+esc(n.status)+(n.sender?' · '+esc(n.sender):'')+' · '+esc(formatAt(n.at))+'</span></button>').join('');
}
function openDossier(n){
 try{if(typeof root.sagsV338OpenDossier==='function'){root.sagsV338OpenDossier(n.date,n.fid);return}}catch(_){}
 try{const r=root.flightWorkspaceOpenList?.(n.date);Promise.resolve(r).finally(()=>setTimeout(()=>root.flightWorkspaceOpenFlight?.(n.fid),180))}catch(_){}
}
function addNotice({date,fid,flight,kind,mod}){
 const at=moduleTime(mod);if(!at||at<sinceBase)return;
 const sender=moduleSender(mod),sig=[date,fid,U(kind),Number(mod?.revisionNo||mod?.published?.revisionNo||0),at,sender].join('|');
 if(processed.has(sig))return;processed.add(sig);
 if(at>maxEventAt){maxEventAt=at;writeWater(noticeUser,date,Math.max(sinceBase,maxEventAt-5000))}
 if(!significant(kind,mod))return;
 const unit=kindUnit(kind);if(sender&&sender===me())return;if(unit&&unit===currentUnit())return;
 const n={id:'N_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7),sig,at,date,fid,flight,kind:niceKind(kind),unit:unit==='DH'?'ĐH':(unit||'BỘ PHẬN'),sender:sender||'',status:U(mod?.status||'ĐÃ GỬI'),read:false};
 noticeItems.unshift(n);noticeItems=noticeItems.slice(0,60);saveNotices();updateBadge();
 try{root.showToast?.(n.unit+' ĐÃ GỬI '+n.kind+' · '+n.flight)}catch(_){}
}
function subscribeFlight(date,fid,label){
 const key=date+'|'+fid;if(subscriptions.has(key)||typeof root.sagsV470Ref!=='function')return;
 const ref=root.sagsV470Ref('flight_records/'+safe(date)+'/'+safe(fid)+'/modules');
 const handle=snap=>{const mod=snap?.val?.()||{},kind=S(snap?.key||mod.kind);addNotice({date,fid,flight:label,kind,mod})};
 const added=s=>handle(s),changed=s=>handle(s);
 try{ref.on('child_added',added);ref.on('child_changed',changed);subscriptions.set(key,{ref,added,changed,date,fid})}catch(e){console.info('Dossier notice subscribe',e?.message||e)}
}
async function refreshSubscriptions(){
 if(refreshJob)return refreshJob;
 refreshJob=(async()=>{
  const user=me(),date=opDate();
  if(!authenticated()||!user||role()==='AD'||typeof root.sagsV478ManifestForWorker!=='function'){stopSubscriptions();updateBadge();return}
  setupContext(user,date);
  let man;try{man=await root.sagsV478ManifestForWorker(date)}catch(_){updateBadge();return}
  const byFlight=new Map();
  for(const item of Object.values(man?.items||{})){const fid=S(item?.flightId);if(fid&&!byFlight.has(fid))byFlight.set(fid,item)}
  for(const [key,x] of [...subscriptions])if(x.date!==date||!byFlight.has(x.fid)){try{x.ref.off('child_added',x.added);x.ref.off('child_changed',x.changed)}catch(_){}subscriptions.delete(key)}
  for(const [fid,item] of byFlight)subscribeFlight(date,fid,flightLabel(item));
  updateBadge();
 })().finally(()=>{refreshJob=null});
 return refreshJob;
}
root.sagsFlightNoticeRefresh=refreshSubscriptions;
root.sagsFlightNoticeOpen=async function(){
 ensureNoticeUi();await refreshSubscriptions();noticeItems=noticeItems.map(x=>({...x,read:true}));saveNotices();updateBadge();renderNotices();ensureNoticeUi().classList.add('show');
};

/* Install without adding another global observer or timer. */
function install(){
 installUppercase();ensureNoticeUi();updateBadge();
 ['sags:login','sags:rolechange','sags:profilechange','sags:ui-ready','sags:personal-roster-updated'].forEach(name=>root.addEventListener?.(name,()=>{void refreshSubscriptions()}));
 root.addEventListener?.('sags:logout',()=>{stopSubscriptions()});
 document.addEventListener('click',e=>{if(e.target?.closest?.('#v157LogoutBtn,[data-v6494-account="logout"]'))setTimeout(stopSubscriptions,0);if(e.target?.closest?.('#roleLoginSubmit')){setTimeout(()=>{void refreshSubscriptions()},600);setTimeout(()=>{void refreshSubscriptions()},1800)}},true);
 root.addEventListener('pageshow',()=>{void refreshSubscriptions()},{passive:true});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refreshSubscriptions()},{passive:true});
 root.addEventListener('beforeunload',stopSubscriptions,{once:true});
 setTimeout(()=>{void refreshSubscriptions()},700);setTimeout(()=>{void refreshSubscriptions()},2200);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})(window);

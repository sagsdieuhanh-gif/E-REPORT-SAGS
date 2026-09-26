/* E-REPORT SAGS V4.7.8: one server-filtered mailbox subscription per user and selected day.
 * Form envelopes are NEVER included in this list or its on-device cache.
 * Admin continues using the original daily roster / flight hub view.
 */
(function(root){
'use strict';
const S=v=>String(v??'').trim(),U=v=>S(v).toUpperCase();
const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
const fields=['assignmentId','targetUser','user','opDate','date','flightId','flightRaw','flightName','arrFlight','depFlight','sta','std','eta','etd','staSortMinute','stdSortMinute','route','acReg','acType','bay','formGroup','sourceColumn','roleKey','assignmentLeg','assignmentFlight','assignmentTime','assignmentScope','workPartOrder','workPartTotal','coAssigneeGroupId','coAssigneeMode','coAssigneeRank','coAssigneeTotal','workspaceKey','rosterWorkspaceKey','rosterWorkSlotKey','publishedAtMs','updatedAtMs','reassignedAtMs','originalTargetUser','manualOverride','active','duplicateInactive','claimStatus','workPartStatus','taskStatusV333','taskAvailabilityV333','completedPushback','pushbackEditReopened','claimedBy','ownerUser'];
const norm=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}};
const session=()=>{try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}};
const role=()=>U(session().role||session().profile?.role);
const me=()=>norm(session().profile?.username||root.currentUserProfile?.username||(role()==='AD'?'AD':''));
function dateNow(){const d=new Date();if(d.getHours()<4)d.setDate(d.getDate()-1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
const date=()=>S(document.getElementById('fwcDate')?.value)||S(sessionStorage.getItem('sagsV36FwcDate'))||dateNow();
const cacheKey=(u,d)=>'sags:mail-day:v478:'+safe(u)+':'+safe(d);
function compact(raw,u,d){const out={};for(const [id,v] of Object.entries(raw||{})){
  if(!v||typeof v!=='object'||Array.isArray(v))continue;
  if(norm(v.targetUser||v.user)!==u||S(v.opDate)!==d)continue;
  const x={};for(const k of fields){const z=v[k];if(typeof z==='string')x[k]=z.slice(0,250);else if(typeof z==='boolean'||typeof z==='number')x[k]=z;}
  x.assignmentId=S(x.assignmentId||id);x.targetUser=u;x.user=u;
  if(x.assignmentId&&x.flightId)out[id]=x;
}return out}
let live={user:'',date:'',ref:null,handler:null,items:{},loaded:false,local:false,promise:null,resolve:null,reject:null};
let repaint=0;
function visible(){const m=document.getElementById('fwcModal');return !!m?.classList.contains('show')&&!!document.getElementById('fwcList')}
function repaintSoon(){if(role()==='AD'||!visible())return;clearTimeout(repaint);repaint=setTimeout(()=>{if(visible())root.__SAGS_DAILY_ROSTER_FINAL_V1199?.renderPersonal?.(date())},420)}
function teardown(){if(live.ref&&live.handler)try{live.ref.off('value',live.handler)}catch(_){};clearTimeout(repaint);live={user:'',date:'',ref:null,handler:null,items:{},loaded:false,local:false,promise:null,resolve:null,reject:null}}
function localRead(user,d){try{const o=JSON.parse(localStorage.getItem(cacheKey(user,d))||'null');if(o?.user===user&&o.date===d&&o.items&&typeof o.items==='object')return compact(o.items,user,d)}catch(_){}return null}
function persistLocal(){try{localStorage.setItem(cacheKey(live.user,live.date),JSON.stringify({user:live.user,date:live.date,atMs:Date.now(),items:live.items}))}catch(_) {}}
function waitMailbox(pending,owner,d){
  // Show only a previously downloaded personal/day list if Firebase is offline.
  return Promise.race([pending,new Promise((resolve,reject)=>setTimeout(()=>{
    if(live.user!==owner||live.date!==d)return reject(new Error('Đã đổi tài khoản hoặc ngày, hãy mở lại MY FLIGHT.'));
    if(live.local)return resolve(live.items);
    reject(new Error('Chưa tải được phân công cá nhân; kiểm tra mạng rồi thử lại.'));
  },4000))]);
}
async function ensureMailbox(d){
  d=S(d)||dateNow();const u=me();if(!u||role()==='AD')throw new Error('Chưa xác định được tài khoản nhận phân công.');
  if(live.user!==u||live.date!==d){teardown();live.user=u;live.date=d;const cached=localRead(u,d);if(cached){live.items=cached;live.local=true}}
  if(live.loaded)return live.items;
  if(live.promise)return waitMailbox(live.promise,u,d);
  if(typeof root.sagsV470Ref!=='function'){
    if(live.local)return live.items;
    throw new Error('Chưa kết nối Firebase. Không tải roster cả ngày để thay thế.');
  }
  const owner=u,day=d;live.promise=new Promise((resolve,reject)=>{live.resolve=resolve;live.reject=reject});const pending=live.promise;
  try{
    // IMPORTANT: RTDB rules should index roster_mail/$uid/items on opDate.
    // equalTo restricts the payload to this account's ONE requested operation date.
    const ref=root.sagsV470Ref(`roster_mail/${safe(owner)}/items`).orderByChild('opDate').equalTo(day);
    live.ref=ref;const handler=snap=>{
      if(live.user!==owner||live.date!==day)return;
      const next=compact(snap?.val?.()||{},owner,day),changed=JSON.stringify(next)!==JSON.stringify(live.items);
      live.items=next;live.loaded=true;live.local=false;persistLocal();
      if(live.resolve){live.resolve(next);live.resolve=null;live.reject=null;live.promise=null}
      if(changed){root.sagsV477InvalidateQueueStatus?.();repaintSoon()}
    };
    live.handler=handler;ref.on('value',handler,e=>{
      if(live.user!==owner||live.date!==day)return;
      if(live.reject&&!live.local)live.reject(e||new Error('Không đọc được hộp phân công.'));
      else if(live.resolve)live.resolve(live.items);
      live.promise=null;live.resolve=null;live.reject=null;
    });
  }catch(e){live.promise=null;live.resolve=null;live.reject=null;if(live.local)return live.items;throw e}
  return waitMailbox(pending,owner,day);
}
root.sagsV478ManifestForWorker=async function(opDate){
  const d=S(opDate)||dateNow(),u=me(),all=await ensureMailbox(d),items={};
  for(const [id,item] of Object.entries(all)){
    if(S(item.opDate)!==d||item.active===false||item.duplicateInactive===true)continue;
    items[id]={...item,user:u,targetUser:u};
  }
  return {opDate:d,items,mailboxLite:true,fromDeviceCache:live.local};
};
root.sagsV477ManifestForWorker=root.sagsV478ManifestForWorker;
root.sagsV478MailboxStats=()=>({user:live.user,date:live.date,loaded:live.loaded,local:live.local,items:Object.keys(live.items).length,query:'opDate == selected day'});
function ensureHomeButton(modal){
  if(!modal)return;
  const head=modal.querySelector('.fwcHead');if(!head)return;
  let home=head.querySelector('#v479MyFlightHome');
  if(!home){
    home=document.createElement('button');home.id='v479MyFlightHome';
    home.type='button';home.className='fwcBtn gray';home.textContent='⌂ TRANG CHỦ';
    const close=head.querySelector('#v477Close')||Array.from(head.querySelectorAll('button')).find(b=>/ĐÓNG/i.test(b.textContent||''));
    head.insertBefore(home,close||null);
  }
  home.onclick=()=>{
    if(typeof root.sagsV479GoHome==='function')root.sagsV479GoHome();
    else{root.flightWorkspaceClose?.();root.showRoleHomeIdle?.();}
  };
  if(!document.getElementById('v479MyFlightHomeStyle')){
    const css=document.createElement('style');css.id='v479MyFlightHomeStyle';
    css.textContent='#v479MyFlightHome{min-height:40px;white-space:nowrap;flex-shrink:0}'+
      '@media(max-width:620px){#fwcModal .fwcHead{flex-wrap:wrap}#fwcModal .fwcHead>div:first-child{flex:1 1 100%}}';
    document.head.appendChild(css);
  }
}
function ensureModal(){
  let modal=document.getElementById('fwcModal');if(modal){ensureHomeButton(modal);return modal;}
  modal=document.createElement('div');modal.id='fwcModal';modal.className='';
  modal.innerHTML='<div class="fwcPanel"><div class="fwcHead"><h3>✈ MY FLIGHT</h3><button class="fwcBtn gray" type="button" id="v477Close">ĐÓNG</button></div><div id="fwcBody"></div></div>';
  document.body.appendChild(modal);document.getElementById('v477Close').onclick=()=>root.flightWorkspaceClose?.();ensureHomeButton(modal);return modal;
}
function drawShell(d){
  const modal=ensureModal();modal.classList.add('show');
  const host=document.getElementById('fwcBody');if(!host)return false;
  host.innerHTML='<div class="fwcTools"><input id="fwcDate" type="date"><button class="fwcBtn" id="v477Refresh" type="button">LÀM MỚI</button></div><div class="fwcStatus" id="fwcStatus" role="status">Đang đọc hộp phân công của bạn…</div><div id="fwcList" class="v1199Queue"></div>';
  const inp=document.getElementById('fwcDate');inp.value=d;inp.onchange=()=>root.flightWorkspaceOpenList?.(inp.value);
  document.getElementById('v477Refresh').onclick=()=>root.flightWorkspaceRefresh?.();
  try{sessionStorage.setItem('sagsV36FwcDate',d)}catch(_){}
  return true;
}
const baseOpen=root.flightWorkspaceOpenList,baseRefresh=root.flightWorkspaceRefresh;
async function openLite(requestedDate){
  if(role()==='AD'){const result=baseOpen?.call(root,requestedDate);ensureHomeButton(document.getElementById('fwcModal'));return result;}
  const d=S(requestedDate)||dateNow();if(!drawShell(d))return false;
  try{
    const man=await root.sagsV478ManifestForWorker(d);
    const status=document.getElementById('fwcStatus');
    if(status)status.textContent=man.fromDeviceCache?'Đang ngoại tuyến · danh sách phân công đã lưu trên máy; chỉ mở form khi kết nối cho phép.':'MY FLIGHT · chỉ nhận nhiệm vụ của tài khoản và ngày đang chọn';
    await root.__SAGS_DAILY_ROSTER_FINAL_V1199?.renderPersonal?.(d);
    return true;
  }catch(e){const el=document.getElementById('fwcStatus');if(el)el.textContent='Không đọc được MY FLIGHT: '+S(e?.message||e);return false}
}
openLite.__v477MailboxLite=true;
async function refreshLite(){
  if(role()==='AD')return baseRefresh?.call(root);
  root.sagsV477InvalidateQueueStatus?.();if(live.ref){try{const snap=await live.ref.once('value');if(live.handler)live.handler(snap)}catch(_){}}return openLite(date());
}
refreshLite.__v477MailboxLite=true;
function install(){
  if(root.flightWorkspaceOpenList!==openLite)root.flightWorkspaceOpenList=openLite;
  if(root.flightWorkspaceRefresh!==refreshLite)root.flightWorkspaceRefresh=refreshLite;
  const b=document.getElementById('roleBtnRosterFlights');if(b&&role()!=='AD')b.onclick=()=>openLite(dateNow());
}
install();setTimeout(install,1800);setTimeout(install,3600);
root.addEventListener?.('pageshow',install,{passive:true});
root.sagsV477MailboxStats=root.sagsV478MailboxStats;
})(typeof window!=='undefined'?window:globalThis);

/* E-REPORT SAGS V4.7.7: worker MY FLIGHT reads only the worker's mailbox.
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
const cacheKey=u=>'sags:roster-mail-lite:v477:'+safe(u);
function compact(raw,u){const out={};for(const [id,v] of Object.entries(raw||{})){
  if(!v||typeof v!=='object'||Array.isArray(v))continue;
  const target=norm(v.targetUser||v.user);if(target!==u)continue;
  const x={};for(const k of fields){const z=v[k];if(typeof z==='string')x[k]=z.slice(0,250);else if(typeof z==='boolean'||typeof z==='number')x[k]=z;}
  x.assignmentId=S(x.assignmentId||id);x.targetUser=u;x.user=u;
  if(x.assignmentId&&x.opDate&&x.flightId)out[id]=x;
}return out}
let live={user:'',ref:null,handler:null,items:{},loaded:false,local:false,promise:null,resolve:null,reject:null};
let repaint=0;
function visible(){const m=document.getElementById('fwcModal');return !!m?.classList.contains('show')&&!!document.getElementById('fwcList')}
function repaintSoon(){if(role()==='AD'||!visible())return;clearTimeout(repaint);repaint=setTimeout(()=>{if(visible())root.__SAGS_DAILY_ROSTER_FINAL_V1199?.renderPersonal?.(date())},240)}
function teardown(){if(live.ref&&live.handler)try{live.ref.off('value',live.handler)}catch(_){};clearTimeout(repaint);live={user:'',ref:null,handler:null,items:{},loaded:false,local:false,promise:null,resolve:null,reject:null}}
function localRead(user){try{const o=JSON.parse(localStorage.getItem(cacheKey(user))||'null');if(o?.user===user&&o.items&&typeof o.items==='object')return compact(o.items,user)}catch(_){}return null}
function persistLocal(){try{localStorage.setItem(cacheKey(live.user),JSON.stringify({user:live.user,atMs:Date.now(),items:live.items}))}catch(_){}}
function waitMailbox(pending,owner){
  // A pending RTDB listener must never make a later MY FLIGHT tap wait forever.
  // Keep one listener alive, but apply a new short timeout on every open.
  const timeout=new Promise((resolve,reject)=>setTimeout(()=>{
    if(live.user!==owner)return reject(new Error('Đã chuyển tài khoản, hãy mở lại MY FLIGHT.'));
    if(live.local)return resolve(live.items);
    reject(new Error('Chưa tải được hộp phân công; kiểm tra mạng rồi thử lại.'));
  },4500));
  return Promise.race([pending,timeout]);
}
async function ensureMailbox(){
  const u=me();if(!u||role()==='AD')throw new Error('Chưa xác định được tài khoản nhận phân công.');
  if(live.user!==u){teardown();live.user=u;const local=localRead(u);if(local){live.items=local;live.local=true}}
  if(live.loaded)return live.items;
  if(live.promise)return waitMailbox(live.promise,u);
  if(typeof root.sagsV470Ref!=='function'){
    if(live.local)return live.items;
    throw new Error('Chưa kết nối được Firebase. Không tải toàn bộ roster để thay thế.');
  }
  const owner=u;live.promise=new Promise((resolve,reject)=>{live.resolve=resolve;live.reject=reject});
  const pending=live.promise;
  try{
    const ref=root.sagsV470Ref(`roster_mail/${safe(owner)}/items`);live.ref=ref;
    const handler=snap=>{
      if(live.user!==owner)return;
      const next=compact(snap?.val?.()||{},owner),changed=JSON.stringify(next)!==JSON.stringify(live.items);
      live.items=next;live.loaded=true;live.local=false;persistLocal();
      if(live.resolve){live.resolve(next);live.resolve=null;live.reject=null;live.promise=null}
      if(changed){root.sagsV477InvalidateQueueStatus?.();repaintSoon()}
    };
    live.handler=handler;
    ref.on('value',handler,e=>{
      if(live.user!==owner)return;
      if(live.reject&&!live.local)live.reject(e||new Error('Không đọc được hộp phân công.'));
      else if(live.resolve)live.resolve(live.items);
      live.promise=null;live.resolve=null;live.reject=null;
    });
  }catch(e){live.promise=null;live.resolve=null;live.reject=null;if(live.local)return live.items;throw e}
  // RTDB can wait indefinitely while the device is offline. Only use this user's
  // *small* previously saved mailbox in that case; never fall back to a full-day read.
  return waitMailbox(pending,owner);
}
root.sagsV477ManifestForWorker=async function(opDate){
  const u=me(),all=await ensureMailbox(),items={};
  for(const [id,item] of Object.entries(all)){
    if(S(item.opDate)!==S(opDate)||item.active===false||item.duplicateInactive===true)continue;
    items[id]={...item,user:u,targetUser:u};
  }
  return {opDate:S(opDate),items,mailboxLite:true,fromDeviceCache:live.local};
};
function ensureModal(){
  let modal=document.getElementById('fwcModal');if(modal)return modal;
  modal=document.createElement('div');modal.id='fwcModal';modal.className='';
  modal.innerHTML='<div class="fwcPanel"><div class="fwcHead"><h3>✈ MY FLIGHT</h3><button class="fwcBtn gray" type="button" id="v477Close">ĐÓNG</button></div><div id="fwcBody"></div></div>';
  document.body.appendChild(modal);document.getElementById('v477Close').onclick=()=>root.flightWorkspaceClose?.();return modal;
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
  if(role()==='AD')return baseOpen?.call(root,requestedDate);
  const d=S(requestedDate)||dateNow();if(!drawShell(d))return false;
  try{
    const man=await root.sagsV477ManifestForWorker(d);
    const status=document.getElementById('fwcStatus');
    if(status)status.textContent=man.fromDeviceCache?'Đang ngoại tuyến · danh sách phân công đã lưu trên máy; chỉ mở form khi kết nối cho phép.':'MY FLIGHT · chỉ tải phân công của tài khoản này';
    await root.__SAGS_DAILY_ROSTER_FINAL_V1199?.renderPersonal?.(d);
    return true;
  }catch(e){const el=document.getElementById('fwcStatus');if(el)el.textContent='Không đọc được MY FLIGHT: '+S(e?.message||e);return false}
}
openLite.__v477MailboxLite=true;
async function refreshLite(){
  if(role()==='AD')return baseRefresh?.call(root);
  root.sagsV477InvalidateQueueStatus?.();return openLite(date());
}
refreshLite.__v477MailboxLite=true;
function install(){
  if(root.flightWorkspaceOpenList!==openLite)root.flightWorkspaceOpenList=openLite;
  if(root.flightWorkspaceRefresh!==refreshLite)root.flightWorkspaceRefresh=refreshLite;
  const b=document.getElementById('roleBtnRosterFlights');if(b&&role()!=='AD')b.onclick=()=>openLite(dateNow());
}
install();setTimeout(install,1800);setTimeout(install,3600);
root.addEventListener?.('pageshow',install,{passive:true});
root.sagsV477MailboxStats=()=>({user:live.user,loaded:live.loaded,local:live.local,items:Object.keys(live.items).length});
})(typeof window!=='undefined'?window:globalThis);

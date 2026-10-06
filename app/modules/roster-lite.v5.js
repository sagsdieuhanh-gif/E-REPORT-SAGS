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
const role=()=>U(session().role||session().profile?.role);const isCargoRole=()=>{const s=session(),p=s.profile||{},text=U([role(),p.role,p.roleCode,p.groupCode,p.departmentCode,p.systemDepartment,p.department,p.group,p.jobTitle].filter(Boolean).join(" "));return["KH","CARGO"].includes(role())||/(KHO HÀNG|KHO HANG|CARGO)/.test(text)};
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
      live.items=next;live.loaded=true;live.local=false;if(changed)persistLocal();
      if(live.resolve){live.resolve(next);live.resolve=null;live.reject=null;live.promise=null}
      if(changed){root.sagsV477InvalidateQueueStatus?.();repaintSoon();try{root.dispatchEvent(new CustomEvent('sags:personal-roster-updated',{detail:{opDate:day,user:owner}}))}catch(_){}}
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
root.sagsV478GetAssignmentFast=function(aid,opDate){
  const d=S(opDate)||dateNow(),u=me(),id=S(aid);
  if(!id||!u||live.user!==u||live.date!==d||!live.loaded||live.local)return null;
  const item=live.items[id];
  if(!item||item.active===false||item.duplicateInactive===true||norm(item.targetUser||item.user)!==u||S(item.opDate)!==d)return null;
  return {...item,user:u,targetUser:u};
};
function ensureHomeButton(modal){
  if(!modal)return;
  const head=modal.querySelector('.fwcHead');if(!head)return;
  let home=head.querySelector('#v479MyFlightHome');
  if(!home){
    home=document.createElement('button');home.id='v479MyFlightHome';
    home.type='button';home.className='fwcBtn gray';home.textContent='← QUAY LẠI';
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
  modal.innerHTML='<div class="fwcPanel"><div class="fwcHead"><h3>MY FLIGHT</h3><button class="fwcBtn gray" type="button" id="v477Close">ĐÓNG</button></div><div id="fwcBody"></div></div>';
  document.body.appendChild(modal);document.getElementById('v477Close').onclick=()=>root.flightWorkspaceClose?.();ensureHomeButton(modal);return modal;
}
function normalizeFlightDossierCards(){
 if(typeof root.sagsV338OpenDossier!=='function')return;
 const list=document.getElementById('fwcList');if(!list)return;
 for(const card of list.querySelectorAll('.fwcFlight')){
  const b=card.querySelector('button[onclick*="flightWorkspaceOpenFlight"]');if(!b)continue;
  const code=S(b.getAttribute('onclick')),match=code.match(/flightWorkspaceOpenFlight\(['"]([^'"]+)['"]\)/);if(!match)continue;const fid=match[1];
  if(b.textContent!=='HỒ SƠ CHUYẾN')b.textContent='HỒ SƠ CHUYẾN';b.onclick=()=>root.sagsV338OpenDossier(date(),fid);
  card.querySelectorAll('.v350CardDossierBtn').forEach(x=>x.remove());
 }
}
function normalizeFlightSearch(v){return String(v||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'')}
function filterFlightCards(){
  const input=document.getElementById('sagsFlightSearch'),list=document.getElementById('fwcList');if(!input||!list)return 0;
  const q=normalizeFlightSearch(input.value);let visible=0;
  for(const card of list.querySelectorAll('.fwcFlight,.v1199Card')){
    const title=card.querySelector('.fwcFlightTitle,.v1199Title');
    const hay=normalizeFlightSearch(title?.textContent||card.textContent||'');
    card.hidden=!!q&&!hay.includes(q);if(!card.hidden)visible++;
  }
  return visible;
}
function applyFlightSearch(){
  const input=document.getElementById('sagsFlightSearch'),list=document.getElementById('fwcList');if(!input||!list)return;
  const q=normalizeFlightSearch(input.value),canonical=list.classList.contains('v478CanonicalQueue');
  if(canonical){
    const tabs=list.querySelector(':scope > .v478RoleTabs'),owner=list.querySelector(':scope > .v478RoleOwner');
    if(tabs)tabs.hidden=!!q;if(owner)owner.hidden=!!q;
    if(!q){v478ApplyRoleFilter();return}
  }
  const visible=filterFlightCards();
  if(canonical){
    const empty=list.querySelector('.v478RoleEmpty');
    if(empty){empty.hidden=visible>0;empty.textContent='Không tìm thấy chuyến phù hợp.'}
  }
}
document.addEventListener('input',e=>{if(e.target?.id==='sagsFlightSearch')applyFlightSearch()},true);
document.addEventListener('search',e=>{if(e.target?.id==='sagsFlightSearch')applyFlightSearch()},true);
let flightFilterFrame=0,flightListObserver=null;
function installFlightListObserver(){
  const host=document.getElementById('fwcBody');if(!host)return;
  if(flightListObserver&&flightListObserver.__host===host)return;
  try{flightListObserver&&flightListObserver.disconnect()}catch(_){}
  flightListObserver=new MutationObserver(records=>{
    if(!records.some(x=>x.type==='childList'))return;
    if(flightFilterFrame)return;
    flightFilterFrame=requestAnimationFrame(()=>{flightFilterFrame=0;normalizeFlightDossierCards();applyFlightSearch()});
  });
  flightListObserver.__host=host;flightListObserver.observe(host,{childList:true,subtree:true});
}
function drawShell(d){
  const modal=ensureModal();modal.hidden=false;modal.style.removeProperty('display');modal.classList.add('show');root.sagsOverlayLayout?.refresh();
  const host=document.getElementById('fwcBody');if(!host)return false;installFlightListObserver();
  host.innerHTML='<div class="fwcTools"><input id="fwcDate" type="date"><input id="sagsFlightSearch" type="search" placeholder="Tìm chuyến" aria-label="Tìm số hiệu chuyến bay" autocomplete="off"><button class="fwcBtn" id="v477Refresh" type="button" aria-label="Làm mới danh sách" title="Làm mới">↻</button></div><div class="fwcStatus" id="fwcStatus" role="status">Đang tải công việc…</div><div id="fwcList" class="v1199Queue"></div>';
  const inp=document.getElementById('fwcDate');inp.value=d;inp.onchange=()=>root.flightWorkspaceOpenList?.(inp.value);
  document.getElementById('v477Refresh').onclick=()=>root.flightWorkspaceRefresh?.();
  try{sessionStorage.setItem('sagsV36FwcDate',d)}catch(_){}
  return true;
}
let v478RoleTab='pending';
function ensureCanonicalRoleViewStyle(){
  if(document.getElementById('v478CanonicalRoleViewStyle'))return;
  const st=document.createElement('style');st.id='v478CanonicalRoleViewStyle';
  st.textContent=`
#fwcList.v478CanonicalQueue{display:block!important}
#fwcList.v478CanonicalQueue>.v1199Tabs{display:grid!important;grid-template-columns:1fr 1fr!important;gap:7px!important;margin:8px 0 9px!important}
#fwcList.v478CanonicalQueue>.v1199OwnerNote{margin:0 2px 8px!important}
#fwcList.v478CanonicalQueue>.v1199FlightGrid.v478RoleGrid{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))!important;gap:12px!important}
#fwcList.v478CanonicalQueue .v478CanonicalRoleCard[hidden]{display:none!important}\n#fwcList.v478CanonicalQueue .v478CanonicalRoleCard{display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:0!important;min-width:0!important;border:1px solid #d4dee8!important;border-radius:12px!important;background:#fff!important;padding:11px!important;margin:0!important;box-shadow:0 2px 7px rgba(0,0,0,.04)!important}
#fwcList.v478CanonicalQueue .v478CanonicalRoleCard:hover{background:#fff!important}
#fwcList.v478CanonicalQueue .v478CanonicalRoleCard .fwcFlightTitle{font:900 17px Arial!important;color:#0b4f91!important}
#fwcList.v478CanonicalQueue .v478CanonicalRoleCard .fwcMeta{font:12px/1.45 Arial!important;color:#5d6f80!important;margin-top:4px!important}
#fwcList.v478CanonicalQueue .v478CanonicalRoleCard .v478TechMeta,
#fwcList.v478CanonicalQueue .v478CanonicalRoleCard .fwcDeptStatuses{display:none!important}
#fwcList.v478CanonicalQueue .v478RoleModuleWrap{display:block!important;min-width:0!important}
#fwcList.v478CanonicalQueue .v478RoleModules{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important;margin:9px 0!important;max-width:none!important}
#fwcList.v478CanonicalQueue .v478RoleModules .fwcBadge{display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;gap:3px!important;min-height:54px!important;padding:8px!important;border:1px solid #cbdbe6!important;border-radius:10px!important;background:#eef4f9!important;color:#314a61!important;font:800 10px/1.25 Arial!important;white-space:normal!important;text-align:left!important}
#fwcList.v478CanonicalQueue .v478RoleModules .fwcBadge b{display:block!important;color:inherit!important;font:900 11px/1.15 Arial!important}
#fwcList.v478CanonicalQueue .v478RoleModules .fwcBadge small{display:block!important;color:inherit!important;opacity:.82!important;font:800 9px/1.25 Arial!important;overflow-wrap:anywhere!important}
#fwcList.v478CanonicalQueue .v478RoleModules .fwcBadge.done{border-color:#4c9c76!important;background:#e7f6ed!important;color:#14633a!important}
#fwcList.v478CanonicalQueue .v478RoleModules .fwcBadge.working{border-color:#6aaed8!important;background:#eaf6ff!important;color:#135c86!important}
#fwcList.v478CanonicalQueue .v478RoleModules .fwcBadge.warn{border-color:#e4bd72!important;background:#fff7e6!important;color:#8a4b00!important}
#fwcList.v478CanonicalQueue .v478RoleActions{display:grid!important;grid-template-columns:1fr!important;gap:7px!important;margin-top:auto!important}
#fwcList.v478CanonicalQueue .v478RoleActions>.fwcBtn{width:100%!important;min-height:42px!important;margin:0!important;border-radius:9px!important}
@media(max-width:720px){
 #fwcList.v478CanonicalQueue>.v1199FlightGrid.v478RoleGrid{grid-template-columns:1fr!important;gap:8px!important}
 #fwcList.v478CanonicalQueue .v478CanonicalRoleCard{padding:10px!important}
 #fwcList.v478CanonicalQueue .v478RoleModules{grid-template-columns:repeat(2,minmax(0,1fr))!important}
}
`;document.head.appendChild(st);
}
function v478CardState(card){
  const states=Array.from(card.querySelectorAll('.fwcDeptStatus'));
  return states.length&&states.every(x=>x.classList.contains('done')||x.classList.contains('na'))?'completed':'pending';
}
function v478ApplyRoleFilter(){
  const list=document.getElementById('fwcList');if(!list?.classList.contains('v478CanonicalQueue'))return;
  let pending=0,completed=0;
  const cards=Array.from(list.querySelectorAll('.v478CanonicalRoleCard'));
  for(const card of cards){
    const state=card.dataset.v478State||v478CardState(card);card.dataset.v478State=state;
    state==='completed'?completed++:pending++;
    card.hidden=v478RoleTab==='completed'?state!=='completed':state==='completed';
  }
  list.querySelectorAll('[data-v478-tab]').forEach(btn=>{
    const active=btn.dataset.v478Tab===v478RoleTab;btn.classList.toggle('active',active);
    btn.setAttribute('aria-pressed',active?'true':'false');
    const count=btn.querySelector('.v1199Count');if(count)count.textContent=btn.dataset.v478Tab==='completed'?completed:pending;
  });
  const empty=list.querySelector('.v478RoleEmpty');
  if(empty){empty.hidden=cards.some(card=>!card.hidden);if(!empty.hidden)empty.textContent='Không có chuyến trong trạng thái này.'}
}function v478EnsureTabs(list){
  let tabs=list.querySelector(':scope > .v478RoleTabs');
  if(!tabs){
    tabs=document.createElement('div');tabs.className='v1199Tabs v478RoleTabs';
    tabs.innerHTML='<button type="button" class="v1199Tab" data-v478-tab="pending">ĐANG LÀM <span class="v1199Count">0</span></button><button type="button" class="v1199Tab" data-v478-tab="completed">CHUYẾN ĐÃ HOÀN TẤT <span class="v1199Count">0</span></button>';
    tabs.querySelectorAll('[data-v478-tab]').forEach(btn=>btn.onclick=()=>{v478RoleTab=btn.dataset.v478Tab==='completed'?'completed':'pending';v478ApplyRoleFilter()});
    list.prepend(tabs);
  }
  let note=list.querySelector(':scope > .v478RoleOwner');
  if(!note){note=document.createElement('div');note.className='v1199OwnerNote v478RoleOwner';tabs.after(note)}
  return note;
}
function canonicalizeRoleView(d){
  const modal=ensureModal();ensureHomeButton(modal);ensureCanonicalRoleViewStyle();
  const host=document.getElementById('fwcBody');if(!host)return false;
  const existingDate=S(host.querySelector('#fwcDate')?.value)||S(d)||dateNow();
  const h=modal.querySelector('.fwcHead h3');if(h)h.textContent='MY FLIGHT';
  const sub=modal.querySelector('.fwcHead .fwcSub');if(sub)sub.textContent=`Công việc của tôi · ${existingDate}`;
  const tools=host.querySelector('.fwcTools');
  if(tools){
    if(tools.dataset.v478Canonical!=='1'){
      tools.innerHTML='<input id="fwcDate" type="date"><input id="sagsFlightSearch" type="search" placeholder="Tìm chuyến" aria-label="Tìm số hiệu chuyến bay" autocomplete="off"><button class="fwcBtn" id="v477Refresh" type="button" aria-label="Làm mới danh sách" title="Làm mới">↻</button>';
      tools.dataset.v478Canonical='1';
    }
    const inp=tools.querySelector('#fwcDate');if(inp){inp.value=existingDate;inp.onchange=()=>root.flightWorkspaceOpenList?.(inp.value)}
    const refresh=tools.querySelector('#v477Refresh');if(refresh)refresh.onclick=()=>root.flightWorkspaceRefresh?.();
  }
  const status=document.getElementById('fwcStatus');
  if(status){status.textContent='Công việc theo quyền tài khoản';status.style.display='block'}
  const list=document.getElementById('fwcList');
  if(!list)return false;
  list.classList.add('v1199Queue','v478CanonicalQueue');
  const cards=Array.from(list.querySelectorAll('.fwcFlight'));
  let grid=list.querySelector(':scope > .v1199FlightGrid.v478RoleGrid');
  if(!grid){grid=document.createElement('div');grid.className='v1199FlightGrid v478RoleGrid';list.appendChild(grid)}
  for(const card of cards){
    if(card.parentElement!==grid)grid.appendChild(card);
    card.classList.add('v1199Card','v478CanonicalRoleCard');
    card.dataset.v478State=v478CardState(card);
    const title=card.querySelector('.fwcFlightTitle');if(title)title.classList.add('v1199Title');
    const metas=card.querySelectorAll('.fwcMeta');metas.forEach(x=>x.classList.add('v1199Meta'));if(metas[1])metas[1].classList.add('v478TechMeta');
    const badges=card.querySelector('.fwcBadges');
    if(badges){badges.classList.add('v478RoleModules');const wrap=badges.parentElement;if(wrap)wrap.classList.add('v478RoleModuleWrap')}
    let actions=card.querySelector(':scope > .v478RoleActions');
    if(!actions){actions=document.createElement('div');actions.className='v1199FlightActions v478RoleActions';Array.from(card.children).filter(x=>x.tagName==='BUTTON').forEach(x=>actions.appendChild(x));card.appendChild(actions)}
    actions.querySelectorAll('.fwcBtn').forEach(btn=>btn.classList.add('v1199Action'));
  }
  normalizeFlightDossierCards();
  grid.querySelectorAll('.v478RoleActions>.fwcBtn').forEach(btn=>btn.textContent='HỒ SƠ CHUYẾN');
  list.querySelectorAll('.fwcEmpty').forEach(x=>x.classList.add('v1199Empty'));
  let empty=list.querySelector(':scope > .v478RoleEmpty');
  if(!empty){empty=list.querySelector(':scope > .fwcEmpty');if(empty)empty.classList.add('v478RoleEmpty');else{empty=document.createElement('div');empty.className='v1199Empty v478RoleEmpty';list.appendChild(empty)}}
  if(!empty.textContent)empty.textContent='Không có chuyến trong trạng thái này.';
  const note=v478EnsureTabs(list);note.textContent=`${me()||role()} · ${existingDate} · ${cards.length} chuyến`;
  applyFlightSearch();root.sagsOverlayLayout?.refresh();
  return true;
}
function scheduleCanonicalRoleView(d){[0,120,450,900,1900].forEach(ms=>setTimeout(()=>{if(visible())canonicalizeRoleView(d)},ms))}
const baseOpen=root.flightWorkspaceOpenList,baseRefresh=root.flightWorkspaceRefresh;
async function openLite(requestedDate){
  const d=S(requestedDate)||dateNow();
  if(role()==='AD'||isCargoRole()){
    const result=await baseOpen?.call(root,d);scheduleCanonicalRoleView(d);return result;
  }
  if(!drawShell(d))return false;
  try{
    const man=await root.sagsV478ManifestForWorker(d);
    const status=document.getElementById('fwcStatus');
    if(status)status.textContent=man.fromDeviceCache?'Ngoại tuyến · đang dùng danh sách đã lưu trên máy.':'Công việc được phân theo Daily Roster';
    let renderer=root.__SAGS_DAILY_ROSTER_FINAL_V1199?.renderPersonal;
    for(let i=0;typeof renderer!=='function'&&i<20;i++){await new Promise(r=>setTimeout(r,50));renderer=root.__SAGS_DAILY_ROSTER_FINAL_V1199?.renderPersonal}
    if(typeof renderer!=='function')throw new Error('MY FLIGHT renderer mới chưa sẵn sàng; không dùng giao diện legacy.');
    await renderer(d);return true;
  }catch(e){console.warn('My Flight read failed',e);const el=document.getElementById('fwcStatus');if(el)el.textContent='Không tải được dữ liệu. Kiểm tra kết nối và bấm Làm mới để thử lại.';return false}
}
openLite.__v477MailboxLite=true;
async function refreshLite(){
  if(role()==='AD'||isCargoRole()){
    const d=date(),result=await baseRefresh?.call(root);scheduleCanonicalRoleView(d);return result;
  }
  // A live mailbox is already current: reopening/refreshing must not download it again.
  if(live.loaded&&live.ref){root.sagsV477InvalidateQueueStatus?.();return openLite(date());}
  root.sagsV477InvalidateQueueStatus?.();if(live.ref){try{const snap=await live.ref.once('value');if(live.handler)live.handler(snap)}catch(_){}}return openLite(date());
}
refreshLite.__v477MailboxLite=true;
function renderCanonicalIfVisible(){if(!visible())return;if(role()==='AD'||isCargoRole()){canonicalizeRoleView(date());return}const renderer=root.__SAGS_DAILY_ROSTER_FINAL_V1199?.renderPersonal;if(typeof renderer==='function')Promise.resolve(renderer(date())).catch(e=>console.warn('Canonical MY FLIGHT render',e?.message||e))}
function install(){installFlightListObserver();if(root.flightWorkspaceOpenList!==openLite)root.flightWorkspaceOpenList=openLite;if(root.flightWorkspaceRefresh!==refreshLite)root.flightWorkspaceRefresh=refreshLite;const b=document.getElementById('roleBtnRosterFlights');if(b){b.textContent='MY FLIGHT';b.onclick=()=>openLite(dateNow())}}
function assertCanonical(){if(live.user&&(me()!==live.user||role()==='AD'||isCargoRole()))teardown();install();renderCanonicalIfVisible()}
root.sagsV478OpenMyFlightLite=openLite;root.sagsV478RefreshMyFlightLite=refreshLite;root.sagsV478InstallCanonicalMyFlight=assertCanonical;
const baseApplyRoleUI=root.applyRoleUI;if(typeof baseApplyRoleUI==='function'&&!baseApplyRoleUI.__v6424MyFlightAuthority){const wrapped=function(){const out=baseApplyRoleUI.apply(this,arguments);[0,120,500,1400].forEach(ms=>setTimeout(assertCanonical,ms));return out};wrapped.__v6424MyFlightAuthority=true;wrapped.__v6424Base=baseApplyRoleUI;root.applyRoleUI=wrapped;try{applyRoleUI=wrapped}catch(_){}}
install();setTimeout(assertCanonical,350);setTimeout(assertCanonical,1100);setTimeout(assertCanonical,3600);root.addEventListener?.('pageshow',()=>setTimeout(assertCanonical,60),{passive:true});root.addEventListener?.('focus',()=>setTimeout(assertCanonical,60),{passive:true});document.addEventListener?.('visibilitychange',()=>{if(!document.hidden)setTimeout(assertCanonical,80)},{passive:true});
root.sagsV477MailboxStats=root.sagsV478MailboxStats;
})(typeof window!=='undefined'?window:globalThis);

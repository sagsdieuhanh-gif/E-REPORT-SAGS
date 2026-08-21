/* E-REPORT/SAGS V3.8 · CLEAN WORKFLOW UI
 * Clean shell on top of V3.7 Pilot Control.
 * Flow: Login -> Flight list -> MY FLIGHT filter -> Flight Workspace -> assigned operational module.
 * Legacy operational functions remain as engines, but old role-specific toolbar/menu entry points are hidden.
 */
(function(root){'use strict';
  const BUILD='V3.8-20260821-01';
  const ROOT='flight_records', MANIFEST='roster_manifests', HANDOFF='roster_handoffs';
  const S=v=>String(v??'').trim(), U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normUser=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}};
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  function session(){try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}}
  function profile(){return session().profile||root.currentUserProfile||{}}
  function role(){return U(session().role||profile().role)}
  function me(){const p=profile();return normUser(p.username||(role()==='AD'?'AD':''))}
  function logged(){return !!role()&&!!me()}
  function isAD(){return role()==='AD'}
  function dbref(path){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase RTDB chưa sẵn sàng.');return root.sagsV470Ref(path)}
  function canFeature(k){try{return isAD()||typeof root.v485Can!=='function'||!!root.v485Can(k)}catch(_){return isAD()}}
  function dateFromUi(){return S(document.getElementById('fwcDate')?.value)||S(sessionStorage.getItem('sagsV36FwcDate'))||today()}
  function flightIdFromCard(card){const s=S(card?.querySelector('button[onclick*="flightWorkspaceOpenFlight"]')?.getAttribute('onclick'));return s.match(/flightWorkspaceOpenFlight\(['"]([^'"]+)['"]\)/)?.[1]||''}
  function flightName(rec){return S(rec?.depFlight||rec?.arrFlight||rec?.flightName||rec?.flightRaw||rec?.flightId)}
  function rosterItemMatches(item,fid){return item&&item.active!==false&&S(item.flightId)===S(fid)}
  function myFilterKey(){return `sagsV38MyFlight:${me()||'ANON'}`}
  function myOnlyDefault(){try{const v=sessionStorage.getItem(myFilterKey());if(v==='0'||v==='1')return v==='1'}catch(_){}return !isAD()}
  function setMyOnly(v){try{sessionStorage.setItem(myFilterKey(),v?'1':'0')}catch(_){} }

  let dataCache={date:'',flights:{},manifest:{},handoffs:{},myIds:new Set(),pendingIds:new Set()};
  async function loadContext(date){
    date=S(date)||today();
    const [fs,ms,hs]=await Promise.all([
      dbref(`${ROOT}/${safe(date)}`).once('value'),
      dbref(`${MANIFEST}/${safe(date)}`).once('value'),
      dbref(`${HANDOFF}/${safe(date)}`).once('value').catch(()=>({val:()=>({})}))
    ]);
    const flights=fs.val()||{},manifest=ms.val()||{},handoffs=hs.val?.()||{},u=me(),myIds=new Set(),pendingIds=new Set();
    for(const rec of Object.values(flights))for(const a of Object.values(rec?.unitAssignments||{}))if(normUser(a?.username)===u)myIds.add(S(rec.flightId));
    for(const item of Object.values(manifest?.items||{}))if(item?.active!==false&&normUser(item.user||item.targetUser)===u&&S(item.flightId))myIds.add(S(item.flightId));
    for(const h of Object.values(handoffs||{})){
      if(U(h?.status)!=='APPROVED_WAITING_ACCEPT'||normUser(h?.toUser)!==u)continue;
      const item=manifest?.items?.[h.assignmentId];if(item?.flightId)pendingIds.add(S(item.flightId));
    }
    dataCache={date,flights,manifest,handoffs,myIds,pendingIds};return dataCache;
  }
  function isMine(fid){return dataCache.myIds.has(S(fid))}

  function ensureStyle(){if(document.getElementById('v38CleanStyle'))return;const st=document.createElement('style');st.id='v38CleanStyle';st.textContent=`
body.v38-clean-workflow .toolbar-row.main-actions{display:none!important}
body.v38-clean-workflow .toolbar{gap:6px!important;padding-bottom:6px!important}
#v38CleanNav{display:none;gap:6px;flex-wrap:wrap;width:100%;align-items:center;padding-top:4px}
body.v38-clean-workflow #v38CleanNav{display:flex}
.v38NavBtn{border:0;border-radius:10px;min-height:38px;padding:8px 12px;background:#0b67b2;color:#fff;font:900 12px Arial;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.10)}
.v38NavBtn.purple{background:#5b21b6}.v38NavBtn.gray{background:#e9eef3;color:#30475b}.v38NavBtn.admin{background:#7c2d12}.v38NavBtn.rs{background:#0f766e}.v38NavSpacer{flex:1}
#v38FlowHint{font:800 10px/1.25 Arial;color:#526777;white-space:nowrap;align-self:center;padding:0 4px}
.v38MyToggle{display:inline-flex;align-items:center;gap:7px;border:2px solid #0b67b2;border-radius:10px;padding:7px 10px;background:#eef7ff;color:#0b4f91;font:900 12px Arial;cursor:pointer;user-select:none}.v38MyToggle input{width:19px;height:19px;accent-color:#0b67b2;margin:0}.v38MyToggle.on{background:#0b67b2;color:#fff}
.v38ListHint{font:800 11px Arial;color:#5d7080;padding:4px 0}.v38Flag{display:inline-flex;align-items:center;border-radius:999px;padding:3px 7px;margin-right:5px;font:900 10px Arial}.v38Flag.my{background:#dff6e8;color:#126b39}.v38Flag.view{background:#edf2f6;color:#566877}.v38Flag.hand{background:#fff1cb;color:#855a00}
.v38ViewOnly{margin:0 0 10px;padding:10px 12px;border:2px solid #e0a400;border-radius:11px;background:#fff9df;color:#705100;font:900 12px/1.45 Arial}
.v38MyOps{margin:0 0 12px;border:2px solid #0b67b2;border-radius:13px;padding:11px;background:#f4faff}.v38MyOpsTitle{font:900 15px Arial;color:#0b4f91;margin-bottom:4px}.v38MyOpsSub{font:700 11px/1.4 Arial;color:#607383;margin-bottom:8px}.v38MyOpsBtns{display:flex;gap:7px;flex-wrap:wrap}.v38OpBtn{border:0;border-radius:9px;padding:9px 11px;background:#0b67b2;color:#fff;font:900 12px Arial;cursor:pointer}.v38OpBtn.green{background:#15803d}.v38OpBtn.orange{background:#b45309}.v38OpBtn.gray{background:#e8eef3;color:#31485a}.v38OpBtn:disabled{opacity:.5}
body.v38-clean-workflow #roleHomeIdle{pointer-events:none}
@media(max-width:620px){#v38CleanNav{display:grid!important;grid-template-columns:1fr 1fr}.v38NavBtn{width:100%;padding:8px 7px;font-size:11px}.v38NavSpacer,#v38FlowHint{display:none}.v38MyOpsBtns{display:grid;grid-template-columns:1fr}.v38OpBtn{width:100%}}
`;document.head.appendChild(st)}

  function ensureCleanNav(){
    ensureStyle();const bar=document.querySelector('.toolbar');if(!bar)return;
    let nav=document.getElementById('v38CleanNav');if(!nav){nav=document.createElement('div');nav.id='v38CleanNav';bar.appendChild(nav)}
    const rsAvailable=typeof root.openReadSignManager==='function';
    nav.innerHTML=`<button class="v38NavBtn" id="v38NavFlights">✈ CHUYẾN HÔM NAY</button><button class="v38NavBtn purple" id="v38NavMulti">⇄ MULTITASK</button>${rsAvailable?'<button class="v38NavBtn rs" id="v38NavRS">READ & SIGN</button>':''}<span class="v38NavSpacer"></span><span id="v38FlowHint">FLIGHT WORKSPACE · V3.8</span>${isAD()?'<button class="v38NavBtn admin" id="v38NavAdmin">⚙ QUẢN LÝ</button>':''}`;
    document.getElementById('v38NavFlights').onclick=()=>root.flightWorkspaceOpenList?.(today());
    document.getElementById('v38NavMulti').onclick=()=>root.sagsV36OpenMultitask?.();
    const rs=document.getElementById('v38NavRS');if(rs)rs.onclick=()=>root.openReadSignManager?.();
    const ad=document.getElementById('v38NavAdmin');if(ad)ad.onclick=()=>root.adminHubOpen?.();
  }

  async function decorateList(date){
    const host=document.getElementById('fwcList');if(!host)return;date=S(date)||dateFromUi();
    try{await loadContext(date)}catch(e){console.warn('V3.8 list context',e);return}
    const tools=document.querySelector('#fwcBody .fwcTools');
    if(tools&&!document.getElementById('v38MyFlightToggle')){
      const wrap=document.createElement('label');wrap.id='v38MyFlightLabel';wrap.className='v38MyToggle';wrap.innerHTML='<input id="v38MyFlightToggle" type="checkbox"> MY FLIGHT';tools.insertBefore(wrap,tools.firstChild);
      const hint=document.createElement('div');hint.id='v38ListHint';hint.className='v38ListHint';tools.insertAdjacentElement('afterend',hint);
      document.getElementById('v38MyFlightToggle').onchange=e=>{setMyOnly(!!e.target.checked);applyListFilter()};
    }
    const tog=document.getElementById('v38MyFlightToggle');if(tog)tog.checked=myOnlyDefault();
    for(const card of host.querySelectorAll('.fwcFlight')){
      const fid=flightIdFromCard(card);if(!fid)continue;card.dataset.v38Fid=fid;
      let flags=card.querySelector('.v38Flags');if(!flags){flags=document.createElement('div');flags.className='v38Flags';card.querySelector('.fwcFlightTitle')?.insertAdjacentElement('beforebegin',flags)}
      const mine=isMine(fid),pending=dataCache.pendingIds.has(fid);flags.innerHTML=`${mine?'<span class="v38Flag my">MY</span>':'<span class="v38Flag view">VIEW</span>'}${pending?'<span class="v38Flag hand">HANDOVER</span>':''}`;
    }
    applyListFilter();
  }
  function applyListFilter(){
    const only=!!document.getElementById('v38MyFlightToggle')?.checked;setMyOnly(only);const lab=document.getElementById('v38MyFlightLabel');lab?.classList.toggle('on',only);
    let shown=0,total=0,myCount=0;for(const card of document.querySelectorAll('#fwcList .fwcFlight')){total++;const mine=isMine(card.dataset.v38Fid);if(mine)myCount++;const show=!only||mine;card.style.display=show?'grid':'none';if(show)shown++}
    const h=document.getElementById('v38ListHint');if(h)h.textContent=only?`MY FLIGHT: ${shown} chuyến được phân/đang phụ trách · bỏ tích để xem mở rộng ${total} chuyến.`:`ĐANG XEM MỞ RỘNG: ${shown} chuyến · ${myCount} chuyến có badge MY. Chuyến VIEW không được tự nhận nhiệm vụ.`;
    const status=document.getElementById('fwcStatus');if(status){if(only)status.textContent=shown?`✓ MY FLIGHT · ${shown} chuyến được phân/đang phụ trách.`:'Tài khoản hiện tại chưa có chuyến được Daily Roster phân hoặc đã tiếp nhận hợp lệ.';else status.textContent=`✓ DANH SÁCH MỞ RỘNG · ${shown} chuyến · MY ${myCount}. Chuyến VIEW không được tự nhận nhiệm vụ.`;}
  }

  function assignedItems(fid){const u=me(),items=[];for(const x of Object.values(dataCache.manifest?.items||{}))if(rosterItemMatches(x,fid)&&normUser(x.user||x.targetUser)===u)items.push(x);return items}
  function formLabel(g){g=S(g).toLowerCase();return g==='fsags421'?'FSAGS 42.1':g==='fsags551'?'FSAGS 55.1':g==='fsags09'?'PVHK · KẾT SỔ':'FSAGS 42.3 / ĐIỀU HÀNH'}
  function injectWorkspace(fid){
    const body=document.getElementById('fwcBody'),head=body?.querySelector('.fwcWorkspaceHead');if(!body||!head)return;
    body.querySelectorAll('.v38ViewOnly,.v38MyOps').forEach(x=>x.remove());
    const mine=isMine(fid),pending=dataCache.pendingIds.has(fid);
    // Never allow claim on a flight that is only being viewed.
    if(!mine){
      body.querySelectorAll('button[onclick*="flightWorkspaceClaim"]').forEach(b=>b.style.display='none');
      const n=document.createElement('div');n.className='v38ViewOnly';n.innerHTML=`👁 <b>CHỈ VIEW</b> · Chuyến này không được phân cho tài khoản ${esc(me()||'hiện tại')}. Không được NHẬN/INPUT/VERIFY/APPROVE chỉ vì đang xem.${pending?' <b>Đang có HANDOVER chờ bạn tiếp nhận.</b>':''}`;head.insertAdjacentElement('afterend',n);return;
    }
    const items=assignedItems(fid),buttons=[];
    for(const item of items){const aid=S(item.assignmentId);if(!aid)continue;buttons.push(`<button class="v38OpBtn green" onclick="v38OpenRosterAssignment('${esc(aid)}')">${esc(formLabel(item.formGroup))}</button>`)}
    const r=role();
    if((r==='CBTT'||isAD())&&canFeature('FINAL'))buttons.push('<button class="v38OpBtn" onclick="v38OpenLegacyModule(\'FINAL\')">⚖ FINAL / CROSSCHECK</button>');
    if((r==='KH'||r==='CARGO'||isAD())&&canFeature('FSAGS208'))buttons.push('<button class="v38OpBtn orange" onclick="v38OpenLegacyModule(\'CARGO\')">📦 KHO HÀNG / FSAGS 208</button>');
    if((r==='DH'||isAD())&&canFeature('QUICK_TIME'))buttons.push('<button class="v38OpBtn gray" onclick="v38OpenLegacyModule(\'QUICK_TIME\')">⏱ NHẬP GIỜ</button>');
    const box=document.createElement('div');box.className='v38MyOps';box.innerHTML=`<div class="v38MyOpsTitle">NGHIỆP VỤ CỦA TÔI · ${esc(flightName(dataCache.flights?.[fid]||{}))}</div><div class="v38MyOpsSub">Chỉ các chức năng gắn với chuyến/assignment hiện tại được đưa ra đây. Các nút chức năng cũ ngoài Flight Workspace đã bị loại khỏi luồng.</div><div class="v38MyOpsBtns">${buttons.join('')||'<span class="v38ListHint">Chuyến thuộc MY FLIGHT nhưng chưa có module thao tác trực tiếp được cấu hình cho tài khoản này.</span>'}</div>`;head.insertAdjacentElement('afterend',box);
  }

  root.v38OpenRosterAssignment=async function(aid){
    aid=S(aid);if(!aid)return;const item=dataCache.manifest?.items?.[aid];if(!item||normUser(item.user||item.targetUser)!==me())return alert('Assignment này không còn thuộc tài khoản hiện tại. Hãy tải lại MY FLIGHT.');
    let meta=null;try{meta=(root.readFlightSessionList?.()||[]).find(x=>S(x.rosterAssignmentId)===aid)}catch(_){}
    if(!meta){try{root.dailyRosterRestartMailbox?.();await new Promise(r=>setTimeout(r,700));meta=(root.readFlightSessionList?.()||[]).find(x=>S(x.rosterAssignmentId)===aid)}catch(_){} }
    if(!meta)return alert('Biểu mẫu roster chưa đồng bộ xuống thiết bị. Hãy chờ vài giây rồi bấm lại.');
    try{root.flightWorkspaceClose?.();root.switchFlightSession?.(meta.id)}catch(e){alert('Không mở được nghiệp vụ: '+S(e?.message||e))}
  };
  root.v38OpenLegacyModule=function(kind){
    kind=U(kind);try{root.flightWorkspaceClose?.();if(kind==='FINAL')return root.openFinalSheetManager?.();if(kind==='CARGO')return root.openKH208Manager?.();if(kind==='QUICK_TIME')return root.openQuickTimePanel?.()}catch(e){alert('Không mở được module: '+S(e?.message||e))}
  };

  function patchWorkspace(){
    if(typeof root.flightWorkspaceOpenList!=='function'||typeof root.flightWorkspaceOpenFlight!=='function')return false;
    if(!root.flightWorkspaceOpenList.__v38){
      const baseList=root.flightWorkspaceOpenList,baseFlight=root.flightWorkspaceOpenFlight,baseClaim=root.flightWorkspaceClaim;
      root.flightWorkspaceOpenList=function(d){d=S(d)||today();const r=baseList.apply(this,arguments);Promise.resolve(r).finally(()=>setTimeout(()=>decorateList(d),80));return r};root.flightWorkspaceOpenList.__v38=1;
      root.flightWorkspaceOpenFlight=function(fid){const r=baseFlight.apply(this,arguments);(async()=>{try{if(dataCache.date!==dateFromUi())await loadContext(dateFromUi())}catch(_){}setTimeout(()=>injectWorkspace(fid),50)})();return r};root.flightWorkspaceOpenFlight.__v38=1;
      if(typeof baseClaim==='function'){root.flightWorkspaceClaim=async function(fid,unit){try{if(dataCache.date!==dateFromUi())await loadContext(dateFromUi());if(!isMine(fid))return alert('Không được nhận nhiệm vụ: chuyến này không thuộc MY FLIGHT của tài khoản hiện tại. Muốn đổi người phải qua BÀN GIAO → DUYỆT → TIẾP NHẬN.');return await baseClaim.apply(this,arguments)}catch(e){alert(S(e?.message||e))}};root.flightWorkspaceClaim.__v38=1}
    }
    return true;
  }

  let autoOpenedFor='';
  function sync(){
    ensureStyle();document.body.classList.toggle('v38-clean-workflow',logged());ensureCleanNav();patchWorkspace();
    const nav=document.getElementById('v38CleanNav');if(nav)nav.style.display=logged()?'flex':'none';
    const key=logged()?`${me()}|${today()}`:'';
    if(key&&key!==autoOpenedFor){autoOpenedFor=key;setTimeout(()=>{if(!document.querySelector('.sagsAdminModal[style*="display: flex"],#pilotControlV37.show,#fwcModal.show'))root.flightWorkspaceOpenList?.(today())},650)}
    if(!logged())autoOpenedFor='';
  }
  const baseApply=root.applyRoleUI;if(typeof baseApply==='function'&&!baseApply.__v38){root.applyRoleUI=function(){const r=baseApply.apply(this,arguments);setTimeout(sync,0);return r};root.applyRoleUI.__v38=1}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(sync,350),{once:true});else setTimeout(sync,350);
  setInterval(sync,2200);
  root.__SAGS_V38_BUILD=BUILD;
  root.__SAGS_V38_HDSD='V3.8 CLEAN WORKFLOW: ẩn toàn bộ toolbar nghiệp vụ cũ. Login mở CHUYẾN HÔM NAY. MY FLIGHT mặc định bật cho nhân viên và chỉ hiện chuyến Daily Roster phân/đã tiếp nhận; bỏ tích để xem danh sách mở rộng với badge VIEW. Chuyến VIEW không được nhận việc. Nghiệp vụ chỉ mở từ đúng Flight Workspace/assignment; Multitask chỉ lấy MY FLIGHT. AD dùng QUẢN LÝ/PILOT CONTROL qua Admin Hub.';
})(typeof window!=='undefined'?window:globalThis);

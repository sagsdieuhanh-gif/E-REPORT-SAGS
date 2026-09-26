/* E-REPORT SAGS · FSAGS54/FSAGS94 CBTT OPEN SHARED · lazy fast path
 * V6.3.33-20260926-CBTT-54-94-DIRECT-EXPORT-BULK-01
 * - loaded exactly once, outside multiphase app.v503.js
 * - no roster/network read on login or home render
 * - original CBTT home remains untouched; search opens only by user action
 */
(function(root){'use strict';
  if(root.__SAGS_CBTT_OPEN_FORMS_V2)return;
  root.__SAGS_CBTT_OPEN_FORMS_V2='V6.3.33-20260926-CBTT-54-94-DIRECT-EXPORT-BULK-01';
  const OPEN='cbtt_open_forms',MAN='roster_manifests',SESSION='roster_sessions';
  const S=v=>String(v??'').trim(),U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const esc=v=>S(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const norm=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return U(v)}};
  const hash=s=>{let h=2166136261>>>0;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return h.toString(36).toUpperCase()};
  const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(_){return v}};
  const G=name=>{try{return root[name]||eval(name)}catch(_){return root[name]}};
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  function sess(){try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}}
  function profile(){return sess().profile||root.currentUserProfile||{}}
  function role(){return U(sess().role||profile().role)}
  function me(){return norm(profile().username||(role()==='AD'?'AD':''))}
  function profileText(){const p=profile();return U([role(),p.roleCode,p.groupCode,p.departmentCode,p.systemDepartment,p.department,p.group,p.jobTitle].filter(Boolean).join(' '))}
  function isCbtt(){return role()==='CBTT'||/(CBTT|CÂN BẰNG TRỌNG TẢI|CAN BANG TRONG TAI|LOAD CONTROL)/.test(profileText())}
  function allowed(){return role()==='AD'||isCbtt()}
  function db(path){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase RTDB chưa sẵn sàng.');return root.sagsV470Ref(path)}
  function formCode(v){const g=U(v).replace(/[\s-]+/g,'_');if(g==='FSAGS54'||g==='LOADCONTROL_CHECKLIST'||g==='FSAGS54_LOADCONTROL'||g==='FSAGS54_LOAD_CONTROL')return 'FSAGS54';if(g==='CLC_CHECKLIST'||g==='FSAGS94'||g==='FSAGS94_CLC')return 'FSAGS94';return ''}
  function formGroup(code){return code==='FSAGS54'?'FSAGS54':'clc_checklist'}
  function startPage(code){return code==='FSAGS54'?16:17}
  function flightIdentity(x){return S(x?.flightId)||U(x?.flightRaw||x?.flightName||[x?.arrFlight,x?.depFlight].filter(Boolean).join('/')).replace(/[^A-Z0-9]/g,'')||'UNKNOWN'}
  function sharedAid(date,item,code){return 'CBTTOPEN_'+hash([S(date),flightIdentity(item),code].join('|'))}
  function rowKey(date,item){return 'FLT_'+hash([S(date),flightIdentity(item)].join('|'))}
  function operationalDate(){const x=S(sessionStorage.getItem('sagsV36FwcDate'));return /^\d{4}-\d{2}-\d{2}$/.test(x)?x:today()}
  function seed(row){return {date:S(row.dateDisplay||row.date||row.opDate),flightRaw:S(row.flightRaw),flightName:S(row.flightName),arrFlight:S(row.arrFlight),depFlight:S(row.depFlight),sta:S(row.sta),std:S(row.std),eta:S(row.eta),etd:S(row.etd),acReg:S(row.acReg),acType:S(row.acType),route:S(row.route),route1:S(row.route1),route2:'CXR',route3:S(row.route3),bay:S(row.bay)}}
  function buildIndex(man,date){
    const out={},items=Object.values(man?.items||{});
    for(const item of items){
      if(!item||item.active===false||U(item.rosterStatus)==='ROSTER_REMOVED'||U(item.rosterStatus)==='ROSTER_REASSIGNED')continue;
      const code=formCode(item.formGroup);if(!code)continue;
      const k=rowKey(date,item),base=out[k]||{key:k,opDate:S(date),dateDisplay:S(item.date),flightId:S(item.flightId),flightRaw:S(item.flightRaw),flightName:S(item.flightName)||[S(item.arrFlight),S(item.depFlight)].filter(Boolean).join(' / ')||S(item.flightRaw),arrFlight:S(item.arrFlight),depFlight:S(item.depFlight),sta:S(item.sta),std:S(item.std),eta:S(item.eta),etd:S(item.etd),acReg:S(item.acReg),acType:S(item.acType),route:S(item.route),route1:S(item.route1),route3:S(item.route3),bay:S(item.bay),forms:{}};
      base.forms[code]={formCode:code,formGroup:formGroup(code),sharedAssignmentId:sharedAid(date,item,code),sourceAssignmentId:S(item.assignmentId),sourceColumn:S(item.sourceColumn),openShared:true,claimMode:'OPEN_SHARED'};
      out[k]=base;
    }
    return {schema:2,engine:'CBTT_OPEN_FORMS_V2',opDate:S(date),updatedAtMs:Date.now(),items:out};
  }
  async function writeIndex(date,man){const idx=buildIndex(man,date);idx.updatedBy=me();await db(`${OPEN}/${safe(date)}`).set(idx);cache={date:S(date),idx,at:Date.now()};return idx}
  async function syncLastPublish(){if(role()!=='AD')return false;const maps=root.__SAGS_ROSTER_LAST_DELTA?.newManByDate||{},dates=Object.keys(maps);for(const d of dates)await writeIndex(d,maps[d]);return dates.length>0}
  function wrapPublish(){
    const fn=root.dailyRosterPublish;if(typeof fn!=='function'||fn.__cbttOpenSharedV2)return;
    const w=async function(){const ok=await fn.apply(this,arguments);if(ok===true)try{await syncLastPublish()}catch(e){console.warn('CBTT OPEN index',e?.message||e)}return ok};
    w.__cbttOpenSharedV2=true;w.__cbttOpenBase=fn;root.dailyRosterPublish=w;try{dailyRosterPublish=w}catch(_){}
  }

  let cache={date:'',idx:null,at:0},inflight=null;
  async function loadIndex(date,force=false){
    date=S(date)||today();
    if(!force&&cache.date===date&&cache.idx&&Date.now()-cache.at<60000)return cache.idx;
    if(!force&&inflight?.date===date)return inflight.promise;
    const promise=(async()=>{
      let idx=null;
      try{idx=(await db(`${OPEN}/${safe(date)}`).once('value')).val()||null}catch(_){}
      if(!idx?.items||!Object.keys(idx.items).length){
        try{const man=(await db(`${MAN}/${safe(date)}`).once('value')).val()||null;if(man)idx=buildIndex(man,date)}catch(_){}
      }
      idx=idx||{schema:2,opDate:date,items:{}};
      cache={date,idx,at:Date.now()};return idx;
    })();
    inflight={date,promise};
    try{return await promise}finally{if(inflight?.promise===promise)inflight=null}
  }

  function ensureUi(){
    let modal=document.getElementById('cbttOpenFormsModal');
    if(modal)return modal;
    const st=document.createElement('style');st.id='cbttOpenFormsV2Style';st.textContent=`
#cbttOpenFormsModal{position:fixed;inset:0;z-index:26050;display:none;align-items:flex-end;justify-content:center;background:rgba(5,22,40,.62);padding:10px max(10px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left));box-sizing:border-box;font-family:Arial,sans-serif}
#cbttOpenFormsModal.show{display:flex}.cbttOpenBox{width:min(100%,720px);max-height:min(86dvh,760px);overflow:hidden;display:flex;flex-direction:column;background:#fff;border-radius:18px;box-shadow:0 18px 55px #001b3650;color:#173b5f}
.cbttOpenHead{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid #d9e3eb}.cbttOpenHead b{flex:1;font:900 16px Arial}.cbttOpenClose{width:38px;height:38px;border:0;border-radius:9px;background:#edf3f7;color:#24455f;font:900 20px Arial}
.cbttOpenTools{display:grid;grid-template-columns:138px minmax(0,1fr) 86px;gap:8px;padding:12px}.cbttOpenTools input,.cbttOpenTools button{box-sizing:border-box;min-height:44px;border-radius:10px}.cbttOpenTools input{border:1px solid #b7cad9;background:#fff;padding:8px 10px;font:800 14px Arial;color:#173b5f}.cbttOpenTools button{border:0;background:#0b67b2;color:#fff;font:900 12px Arial}
#cbttOpenStatus{padding:0 14px 8px;color:#63798b;font:800 11px/1.35 Arial}.cbttOpenList{overflow:auto;-webkit-overflow-scrolling:touch;padding:0 12px 12px;display:grid;gap:8px}
.cbttOpenCard{border:1px solid #d7e2ea;border-radius:12px;padding:10px;background:#fff}.cbttOpenFlight{font:900 15px Arial;color:#123f70}.cbttOpenMeta{margin-top:4px;font:700 11px/1.4 Arial;color:#687b8b}.cbttOpenBtns{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}.cbttOpenBtn{min-height:43px;border:0;border-radius:9px;background:#285ca8;color:#fff;font:900 12px Arial}.cbttOpenBtn.alt{background:#0f766e}.cbttOpenBtn:disabled{background:#d7e0e8;color:#71808d}.cbttOpenEmpty{padding:18px 10px;border:1px dashed #c8d4df;border-radius:11px;text-align:center;color:#657788;font:800 12px/1.45 Arial}
#roleBtnCbttOpenForms{font-weight:900}
@media(max-width:620px){#cbttOpenFormsModal{padding:0;align-items:flex-end}.cbttOpenBox{width:100%;max-height:88dvh;border-radius:18px 18px 0 0}.cbttOpenTools{grid-template-columns:1fr 82px}.cbttOpenTools #cbttOpenDate{grid-column:1/-1}.cbttOpenBtns{grid-template-columns:1fr}}
`;document.head.appendChild(st);
    modal=document.createElement('div');modal.id='cbttOpenFormsModal';modal.innerHTML=`<div class="cbttOpenBox"><div class="cbttOpenHead"><b>FSAGS54 / FSAGS94 · OPEN SHARED</b><button class="cbttOpenClose" type="button" aria-label="Đóng">×</button></div><div class="cbttOpenTools"><input id="cbttOpenDate" type="date"><input id="cbttOpenSearch" type="search" inputmode="search" autocomplete="off" placeholder="Số chuyến, VD VJ605"><button id="cbttOpenGo" type="button">TÌM</button></div><div id="cbttOpenStatus">Nhập số chuyến rồi bấm TÌM. Không tải roster nền khi đăng nhập.</div><div id="cbttOpenList" class="cbttOpenList"></div></div>`;
    document.body.appendChild(modal);
    modal.querySelector('#cbttOpenDate').value=operationalDate();
    modal.querySelector('.cbttOpenClose').onclick=()=>closeModal();
    modal.addEventListener('pointerdown',e=>{if(e.target===modal)closeModal()});
    modal.querySelector('#cbttOpenGo').onclick=()=>void search(true);
    modal.querySelector('#cbttOpenSearch').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();void search(true)}};
    modal.querySelector('#cbttOpenSearch').oninput=()=>{if(cache.idx)void search(false)};
    return modal;
  }
  function syncButton(){
    const bar=document.querySelector('.toolbar-row.main-actions');if(!bar)return;
    let b=document.getElementById('roleBtnCbttOpenForms');
    if(!b){b=document.createElement('button');b.id='roleBtnCbttOpenForms';b.type='button';b.textContent='FSAGS54/94';b.title='Tìm nhanh FSAGS54 / FSAGS94';b.onclick=()=>openModal();const anchor=document.getElementById('finalFormsQuickBtn');anchor?bar.insertBefore(b,anchor):bar.appendChild(b)}
    b.style.display=isCbtt()?'':'none';
  }
  function openModal(){if(!allowed())return;const m=ensureUi();syncButton();m.classList.add('show');const d=m.querySelector('#cbttOpenDate');if(d&&!d.value)d.value=operationalDate()}
  function closeModal(){document.getElementById('cbttOpenFormsModal')?.classList.remove('show')}
  function matches(row,q){if(!q)return false;const k=U(q).replace(/[^A-Z0-9]/g,'');if(!k)return false;const hay=[row.flightRaw,row.flightName,row.arrFlight,row.depFlight,row.acReg,row.route].map(x=>U(x).replace(/[^A-Z0-9]/g,'')).join('|');return hay.includes(k)}
  function paint(idx,date,q){
    const m=ensureUi(),status=m.querySelector('#cbttOpenStatus'),list=m.querySelector('#cbttOpenList');
    const rows=Object.values(idx?.items||{}).filter(x=>matches(x,q)).sort((a,b)=>String(a.std||a.sta||'9999').localeCompare(String(b.std||b.sta||'9999'))||S(a.flightName).localeCompare(S(b.flightName),'vi'));
    status.textContent=`${date} · ${rows.length} chuyến khớp “${q}” · dùng chung, không khóa người khác.`;
    if(!rows.length){list.innerHTML='<div class="cbttOpenEmpty">Không tìm thấy chuyến có FSAGS54/FSAGS94.</div>';return}
    list.innerHTML=rows.slice(0,20).map(row=>{const f54=row.forms?.FSAGS54,f94=row.forms?.FSAGS94,meta=[row.route,row.acReg?`A/C ${row.acReg}`:'',row.sta?`STA ${row.sta}`:'',row.std?`STD ${row.std}`:''].filter(Boolean).join(' · ');return `<div class="cbttOpenCard"><div class="cbttOpenFlight">${esc(row.flightName||row.flightRaw||row.flightId||'CHUYẾN')}</div><div class="cbttOpenMeta">${esc(meta)}</div><div class="cbttOpenBtns"><button class="cbttOpenBtn" ${f54?'':'disabled'} onclick="sagsCbttOpenSharedForm('${esc(date)}','${esc(row.key)}','FSAGS54')">MỞ FSAGS54</button><button class="cbttOpenBtn alt" ${f94?'':'disabled'} onclick="sagsCbttOpenSharedForm('${esc(date)}','${esc(row.key)}','FSAGS94')">MỞ FSAGS94</button></div></div>`}).join('');
  }
  async function search(force=false){
    const m=ensureUi(),date=S(m.querySelector('#cbttOpenDate')?.value)||operationalDate(),q=S(m.querySelector('#cbttOpenSearch')?.value),status=m.querySelector('#cbttOpenStatus'),list=m.querySelector('#cbttOpenList');
    if(!q){status.textContent='Nhập số chuyến rồi bấm TÌM.';list.innerHTML='';return}
    if(!force&&cache.date===date&&cache.idx){paint(cache.idx,date,q);return}
    status.textContent='Đang tìm chuyến…';list.innerHTML='';
    try{paint(await loadIndex(date,force),date,q)}catch(e){status.textContent='Không tải được chuyến: '+S(e?.message||e)}
  }

  async function openShared(date,key,code){
    if(!allowed())return alert('Chỉ tài khoản CBTT hoặc AD được mở FSAGS54/FSAGS94 dùng chung.');
    code=formCode(code);if(!code)return false;
    try{
      const idx=await loadIndex(date,false),row=idx.items?.[key],cfg=row?.forms?.[code];if(!row||!cfg)throw new Error('Không tìm thấy biểu mẫu '+code+' của chuyến này.');
      const aid=S(cfg.sharedAssignmentId)||sharedAid(date,row,code),group=formGroup(code),page=startPage(code),localId='cbttopen-'+hash(aid),now=Date.now();
      let remote=null;try{remote=(await db(`${SESSION}/${safe(aid)}`).once('value')).val()||null}catch(_){}
      const readList=G('readFlightSessionList'),writeList=G('writeFlightSessionList'),storageKey=G('flightSessionStorageKey'),switchSession=G('switchFlightSession'),showGroup=G('showFormGroup');
      if(typeof readList!=='function'||typeof writeList!=='function'||typeof storageKey!=='function'||typeof switchSession!=='function')throw new Error('Bộ quản lý chuyến chưa sẵn sàng.');
      const list=readList()||[];let meta=list.find(x=>S(x.id)===localId||S(x.rosterAssignmentId)===aid);if(!meta){meta={id:localId};list.push(meta)}
      Object.assign(meta,{name:S(row.flightName||row.flightRaw||row.flightId)+' · '+code,customName:true,initialGroup:group,arrivalOp:'passenger',departureOp:'passenger',createdAt:Number(meta.createdAt||now),updatedAt:now,rosterAssignmentId:aid,rosterFlightId:S(row.flightId),rosterAutoReceived:true,rosterSourceColumn:'Grnd_Ls',rosterOpDate:S(date),rosterOwner:'CBTT_SHARED',rosterFormGroup:group,rosterOpenShared:true,rosterClaimMode:'OPEN_SHARED'});writeList(list);
      const readEnv=G('readFlightSessionEnvelope');let local={};try{local=typeof readEnv==='function'?(readEnv(localId)||{}):{}}catch(_){}
      let env=remote?.envelope&&typeof remote.envelope==='object'?clone(remote.envelope):clone(local||{});env=env&&typeof env==='object'?env:{};env.state=env.state&&typeof env.state==='object'?env.state:{};
      env.mainForm=group;env.activeFormGroup=group;env.currentPage=page;env.scrollY=0;env.arrivalOp='passenger';env.departureOp='passenger';env.rosterAssignmentId=aid;env.rosterFlightId=S(row.flightId);env.rosterOpDate=S(date);env.rosterFormGroup=group;env.rosterOpenShared=true;env.rosterClaimMode='OPEN_SHARED';env.rosterSharedAtMs=Number(remote?.envelopeUpdatedAtMs||0);env.rosterSeed={...(env.rosterSeed||{}),...seed(row)};
      localStorage.setItem(storageKey(localId),JSON.stringify(env));
      try{await db(`${SESSION}/${safe(aid)}`).update({engine:'CBTT_OPEN_SHARED_V2',schema:2,assignmentId:aid,formGroup:group,flightId:S(row.flightId),opDate:S(date),openShared:true,claimMode:'OPEN_SHARED',rosterActive:true,lastOpenedAtMs:now,lastOpenedBy:me(),updatedAtMs:now})}catch(_){}
      closeModal();try{root.flightWorkspaceClose?.()}catch(_){}try{root.hideRoleHomeIdle?.()}catch(_){}
      await switchSession(localId,true);
      const nativeOpen=code==='FSAGS54'?root.sagsOpenGrndLs54:root.sagsOpenGrndLs94;
      if(typeof nativeOpen==='function')nativeOpen();else if(typeof showGroup==='function')showGroup(group,true);
      try{if(typeof currentPage!=='undefined')currentPage=page}catch(_){}
      requestAnimationFrame(()=>{try{root.scrollTo?.({top:0,left:0,behavior:'auto'})}catch(_){}});
      return true;
    }catch(e){alert('Không mở được '+code+': '+S(e?.message||e));return false}
  }
  root.sagsCbttOpenSharedForm=openShared;root.sagsCbttRefreshOpenForms=()=>search(true);root.sagsOpenCbttFormsSearch=openModal;

  function wrapLegacyReceive(){
    const base=root.v324ReceiveOrOpen;if(typeof base!=='function'||base.__cbttOpenSharedV2)return;
    const w=async function(fid,requestedAid='',requestedDate=''){const aid=S(requestedAid),date=/^\d{4}-\d{2}-\d{2}$/.test(S(requestedDate))?S(requestedDate):operationalDate();if(allowed()&&aid){try{const mine=(await db(`roster_mail/${safe(me())}/items/${safe(aid)}`).once('value')).val()||null,code=formCode(mine?.formGroup);if(code){const idx=await loadIndex(date,false),row=Object.values(idx.items||{}).find(x=>S(x.flightId)===S(fid)&&x.forms?.[code]);if(row)return openShared(date,row.key,code)}}catch(e){console.info('CBTT OPEN shared legacy fallback',e?.message||e)}}return base.apply(this,arguments)};
    w.__cbttOpenSharedV2=true;w.__cbttOpenBase=base;root.v324ReceiveOrOpen=w;
  }
  function wrapRoleUi(){
    const fn=root.applyRoleUI;if(typeof fn!=='function'||fn.__cbttOpenUiV2)return;
    const w=function(){const out=fn.apply(this,arguments);setTimeout(syncButton,0);return out};w.__cbttOpenUiV2=true;w.__cbttOpenBase=fn;root.applyRoleUI=w;try{applyRoleUI=w}catch(_){}
  }
  function install(){wrapPublish();wrapLegacyReceive();wrapRoleUi();syncButton()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  setTimeout(install,500);setTimeout(syncButton,1800);
  window.addEventListener('pageshow',syncButton,{passive:true});
})(typeof window!=='undefined'?window:globalThis);

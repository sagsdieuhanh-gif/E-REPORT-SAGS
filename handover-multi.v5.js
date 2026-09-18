/* E-REPORT SAGS · V4.8.10B-HF3 · Multi-owner handover, one receiving user.
 * Enhances the existing authorized ĐỔI NGƯỜI UI without replacing it.
 * Never merges assignment IDs or overwrites stored form envelopes.
 */
(function(root){
  'use strict';
  if(root.__SAGS_HF3_MULTI_HANDOVER)return;
  root.__SAGS_HF3_MULTI_HANDOVER=true;
  const S=x=>String(x??'').trim(), U=x=>S(x).toUpperCase();
  const safe=x=>S(x).replace(/[.#$\[\]\/]/g,'_');
  const norm=x=>{try{return root.normalizePersonalUsername(x)}catch(_){return U(x).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}};
  const esc=x=>S(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sess=()=>{try{return root.__sagsGetSession?.()||{role:root.currentRole,profile:root.currentUserProfile}}catch(_){return {role:root.currentRole,profile:root.currentUserProfile}}};
  const role=()=>U(sess().role||sess().profile?.role);
  const me=()=>norm(sess().profile?.username||(role()==='AD'?'AD':''));
  const db=x=>{if(typeof root.sagsV470Ref!=='function')throw Error('Firebase RTDB chưa sẵn sàng.');return root.sagsV470Ref(x)};
  const canManage=()=>role()==='AD'||!!root.v485Can?.('REASSIGN_FLIGHT');
  const unit=p=>({group:U(p?.groupCode||p?.group),dep:U(p?.departmentCode||p?.systemDepartment||p?.department),work:U(p?.unit||p?.workUnit),role:U(p?.role)});
  function sameUnit(a,b){if(!a||!b)return false;const x=unit(a),y=unit(b);if(x.group&&y.group)return x.group===y.group;if(x.dep&&y.dep)return x.dep===y.dep;if(x.work&&y.work)return x.work===y.work;return !!x.role&&x.role===y.role}
  let users=[],busy=false;
  async function catalog(){users=await root.v466GetUserCatalog?.(false)||[];return users}
  function ownerEligible(item, to){const old=users.find(x=>norm(x.username)===norm(item.user||item.targetUser)),actor=users.find(x=>norm(x.username)===me());return (!old||sameUnit(old,to))&&(role()==='AD'||!!actor&&!!old&&sameUnit(actor,old))}
  function assignmentId(row){const s=row.querySelector('.v327Go')?.getAttribute('onclick')||'';return s.match(/v327Reassign\(['"]([^'"]+)['"]\)/)?.[1]||''}
  function ensureStyle(){if(document.getElementById('sagsHF3ShiftCss'))return;const st=document.createElement('style');st.id='sagsHF3ShiftCss';st.textContent='.v327Batch{margin:10px 0;padding:10px;border:1px solid #b1cce6;border-radius:11px;background:#edf6ff}.v327BatchTitle{font:800 13px Arial;color:#123f73;margin-bottom:7px}.v327BatchLine{display:flex;gap:7px;flex-wrap:wrap;align-items:center}.v327BatchLine input{flex:1 1 155px;min-width:0;padding:9px;border:1px solid #91b2d3;border-radius:8px;font:14px Arial}.v327BatchLine button{padding:10px 12px;border:0;border-radius:8px;background:#23519a;color:#fff;font:800 12px Arial;cursor:pointer}.v327BatchLine button:disabled{opacity:.5}.v327MultiPick{display:flex;gap:5px;align-items:center;font:800 11px Arial;color:#23519a;white-space:nowrap}.v327MultiPick input{width:16px;height:16px}@media(max-width:560px){.v327BatchLine button{width:100%}}';document.head.appendChild(st)}
  function enhance(){if(!canManage())return;const host=document.getElementById('v327List');if(!host)return;ensureStyle();for(const card of host.querySelectorAll('.v327Card')){
    if(card.querySelector('.v327Batch'))continue;
    const rows=[...card.querySelectorAll('.v327Assign')].map(row=>({row,aid:assignmentId(row)})).filter(x=>x.aid);
    if(rows.length<2)continue;
    const block=document.createElement('div');block.className='v327Batch';
    block.innerHTML='<div class="v327BatchTitle">⇄ GIAO NHIỀU VIỆC CHO MỘT NGƯỜI · GIỮ NGUYÊN HỒ SƠ</div><div class="v327BatchLine"><input class="v327BatchTo" list="" placeholder="Nhập username người nhận (C)" autocomplete="off"><button class="v327BatchGo" type="button">CHUYỂN CÁC VIỆC ĐÃ CHỌN</button></div><div style="font:11px/1.4 Arial;color:#45617b;margin-top:6px">Có thể chọn 42.1 của A và 55.1 của B. Mẫu và dữ liệu của hai người vẫn tách riêng.</div>';
    const input=block.querySelector('.v327BatchTo'),dl=document.createElement('datalist');dl.id='v327BatchDL_'+Math.random().toString(36).slice(2);input.setAttribute('list',dl.id);block.appendChild(dl);
    input.addEventListener('focus',()=>{catalog().then(list=>{dl.innerHTML=list.filter(x=>x&&x.active!==false).map(x=>`<option value="${esc(norm(x.username))}" label="${esc(S(x.name||x.fullName||x.username))}"></option>`).join('')}).catch(()=>{})},{once:true});
    const chosen=[];
    for(const {row,aid} of rows){const label=document.createElement('label');label.className='v327MultiPick';const cb=document.createElement('input');cb.type='checkbox';cb.checked=/42\.1|55\.1/.test(row.querySelector('.v327Current')?.textContent||'');cb.dataset.aid=aid;label.append(cb,document.createTextNode('Chọn giao ca'));row.appendChild(label);chosen.push(cb)}
    block.querySelector('.v327BatchGo').addEventListener('click',()=>{void transfer(chosen.filter(x=>x.checked).map(x=>x.dataset.aid),input.value,block.querySelector('.v327BatchGo'))});
    card.appendChild(block);
  }}
  async function transfer(ids,rawTarget,button){
    if(busy)return;
    if(!canManage())return alert('Bạn chưa có quyền phân công lại chuyến.');
    ids=[...new Set(ids.map(S).filter(Boolean))];
    if(ids.length<2)return alert('Chọn ít nhất 2 phần việc của cùng chuyến (ví dụ 42.1 và 55.1).');
    const target=norm(rawTarget);
    if(!target)return alert('Nhập username người nhận ca.');
    busy=true;if(button)button.disabled=true;
    try{
      const day=S(document.getElementById('v327Date')?.value);
      if(!/^\d{4}-\d\d-\d\d$/.test(day))throw Error('Chọn đúng ngày phân công trước khi chuyển.');
      await catalog();const to=users.find(x=>norm(x.username)===target&&x.active!==false);
      if(!to)throw Error('Không tìm thấy tài khoản ACTIVE. Nhập chính xác username người nhận.');
      const manifest=(await db(`roster_manifests/${safe(day)}`).once('value')).val()||{};
      const items=ids.map(id=>manifest.items?.[id]);
      if(items.some(x=>!x||x.active===false))throw Error('Phân công đã thay đổi. Tải lại danh sách trước khi giao ca.');
      const flights=new Set(items.map(x=>S(x.flightId||x.flightRaw||x.flightName)));
      if(flights.size!==1)throw Error('Chỉ giao nhiều phần việc của cùng một chuyến trong một lần.');
      for(const item of items){if(norm(item.user||item.targetUser)===target)throw Error('Một phần việc đã thuộc người nhận. Bỏ chọn rồi thử lại.');if(!ownerEligible(item,to))throw Error('Người nhận và người giao phải cùng đơn vị; tài khoản của bạn phải có quyền đối với cả hai việc.');}
      const fetched=await Promise.all(items.map(async item=>{
        const aid=S(item.assignmentId),old=norm(item.user||item.targetUser);
        const [mailSnap,sessionSnap,lockSnap]=await Promise.all([
          db(`roster_mail/${safe(old)}/items/${safe(aid)}`).once('value'),
          db(`roster_sessions/${safe(aid)}`).once('value'),
          item.coAssigneeGroupId?db(`roster_co_claims/${safe(day)}/${safe(item.coAssigneeGroupId)}`).once('value'):Promise.resolve(null)
        ]);
        return {item,aid,old,mail:mailSnap?.val?.()||{},session:sessionSnap?.val?.()||{},lock:lockSnap?.val?.()||null};
      }));
      if(fetched.some(x=>U(x.lock?.status)==='CLAIMED'))throw Error('Có nhóm đồng phụ trách đang giữ quyền làm việc. Hãy xử lý nhóm đang nhận trước khi chuyển nhiều việc.');
      const lines=fetched.map(x=>`${x.old} · ${U(x.item.formGroup)==='FSAGS421'?'42.1':U(x.item.formGroup)==='FSAGS551'?'55.1':S(x.item.formGroup)} → ${target}`);
      if(!root.confirm(`GIAO CA ${fetched.length} PHẦN VIỆC\n\n${lines.join('\n')}\n\nGiữ nguyên dữ liệu từng biểu mẫu. Tiếp tục?`))return;
      const t=Date.now(),patch={};
      for(const x of fetched){
        const {item,aid,old,mail,session}=x,original=norm(item.originalUser||item.originalTargetUser||mail.originalTargetUser||old)||old;
        const status=U(session.taskStatusV333||session.taskStatus||session.workPartStatus||session.claimStatus);
        const completed=!!session.completedPushback||session.skippedNoEform===true||session.autoSkippedByNextUser===true||['COMPLETED','PART_COMPLETED','HANDED_OVER','SKIPPED','NOT_APPLICABLE'].includes(status);
        const state=completed?S(session.taskStatusV333||'COMPLETED'):'UNCLAIMED',availability=completed?S(session.taskAvailabilityV333||'COMPLETED'):'READY';
        const next={...mail,...item,assignmentId:aid,opDate:day,user:target,targetUser:target,originalUser:original,originalTargetUser:original,manualOverride:true,reassignedFrom:old,reassignedAtMs:t,reassignedBy:me(),active:true,claimStatus:completed?S(session.claimStatus||'COMPLETED'):'UNCLAIMED',workPartStatus:completed?S(session.workPartStatus||'COMPLETED'):'UNCLAIMED',taskStatusV333:state,taskAvailabilityV333:availability,updatedAtMs:t,workspaceKey:S(item.workspaceKey||item.rosterWorkspaceKey||mail.workspaceKey)};
        patch[`roster_mail/${safe(old)}/items/${safe(aid)}`]=null;
        patch[`roster_mail/${safe(target)}/items/${safe(aid)}`]=next;
        patch[`roster_revocations/${safe(old)}/items/${safe(aid)}`]={assignmentId:aid,reason:'MULTI_HANDOVER',toUser:target,atMs:t,by:me()};
        patch[`roster_revocations/${safe(target)}/items/${safe(aid)}`]=null;
        patch[`roster_manifests/${safe(day)}/items/${safe(aid)}`]={...item,user:target,targetUser:target,originalUser:original,manualOverride:true,reassignedFrom:old,reassignedAtMs:t,lastReassignedAtMs:t,lastReassignedBy:me()};
        const s=`roster_sessions/${safe(aid)}`;
        patch[`${s}/ownerUser`]=target;patch[`${s}/reassignedFrom`]=old;patch[`${s}/reassignedAtMs`]=t;patch[`${s}/reassignedBy`]=me();patch[`${s}/claimedBy`]=null;patch[`${s}/claimedAtMs`]=null;patch[`${s}/coClaimedBy`]=null;patch[`${s}/coClaimedAssignmentId`]=null;patch[`${s}/handoverReady`]=true;patch[`${s}/updatedAtMs`]=t;
        if(!completed){patch[`${s}/claimStatus`]='UNCLAIMED';patch[`${s}/workPartStatus`]='UNCLAIMED';patch[`${s}/taskStatusV333`]='UNCLAIMED';patch[`${s}/taskAvailabilityV333`]='READY';}
        const fid=S(item.flightId),base=`flight_records/${safe(day)}/${safe(fid)}`;
        if(fid){const ev=`MULTI_${t}_${safe(aid)}`;
          patch[`${base}/assignmentOverrideHistory/${safe(ev)}`]={eventId:ev,type:'MULTI_HANDOVER',assignmentId:aid,fromUser:old,toUser:target,formGroup:S(item.formGroup),atMs:t,by:me()};
          patch[`${base}/taskClaims/${safe(old)}/${safe(aid)}/status`]='REASSIGNED';patch[`${base}/taskClaims/${safe(old)}/${safe(aid)}/reassignedAtMs`]=t;patch[`${base}/taskClaims/${safe(old)}/${safe(aid)}/reassignedTo`]=target;
          patch[`${base}/taskStatus/${safe(aid)}/ownerUser`]=target;patch[`${base}/taskStatus/${safe(aid)}/updatedAtMs`]=t;
        }
      }
      // All selected assignment/mailbox owner changes are ONE RTDB multipath update.
      // No form envelope, signatures, PDF or workspace state is deleted or overwritten.
      await db('').update(patch);
      try{await db('ops_audit_v331').push({event:'MULTI_HANDOVER',clientAtMs:t,actor:{username:me(),role:role()},opDate:day,toUser:target,assignmentIds:ids,fromUsers:fetched.map(x=>x.old)})}catch(e){console.warn('Multi handover audit nonblocking',e)}
      alert(`✓ Đã giao ${fetched.length} phần việc cho ${target}.\n${target} mở MY FLIGHT để nhận từng biểu mẫu.`);
      await root.v327LoadReassign?.(true);
    }catch(e){console.error('Multi-owner handover failed',e);alert('Không giao ca được: '+S(e?.message||e));}
    finally{busy=false;if(button?.isConnected)button.disabled=false;}
  }
  root.sagsHF3TransferAssignments=transfer;
  function install(){if(typeof root.v327RenderReassign!=='function')return false;if(root.v327RenderReassign.__hf3)return true;const orig=root.v327RenderReassign;const wrapped=function(){const out=orig.apply(this,arguments);enhance();return out};wrapped.__hf3=true;root.v327RenderReassign=wrapped;enhance();return true}
  if(!install()){let tries=0;const t=setInterval(()=>{if(install()||++tries>60)clearInterval(t)},150)}
})(typeof window!=='undefined'?window:globalThis);

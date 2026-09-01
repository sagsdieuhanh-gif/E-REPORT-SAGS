/* E-REPORT/SAGS V2.2.2 · DEP RECEIVE AFTER ARR COMPLETED
 * BUILD: V2.2.2-DEP-RECEIVE-AFTER-ARR
 * Base: V2.2-ARRDEP-CHOICE-LOCALFIRST
 *
 * Purpose:
 * - Keep V2.2 as the only ARR/DEP base.
 * - After ARR is truly COMPLETED, notify/refresh the DEP owner's mailbox.
 * - The DEP owner can claim DEP immediately without being stuck at WAITING_PREVIOUS.
 * - First DEP open offers CONTINUE CURRENT SHEET or CREATE NEW DEP SHEET.
 * - NEW DEP keeps only flight identity/schedule baseline and cannot be hydrated back to ARR data.
 * - One active DEP instance per flight/form; stale locks are released safely.
 */
(function(root){
  'use strict';

  const BUILD='V2.2.2-DEP-RECEIVE-AFTER-ARR';
  if(root.__SAGS_V222_DEP_RECEIVE_FIX===BUILD)return;
  root.__SAGS_V222_DEP_RECEIVE_FIX=BUILD;

  const S=v=>String(v??'').trim();
  const U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(_){return null}};
  const norm=v=>{
    try{
      return typeof root.normalizePersonalUsername==='function'
        ? root.normalizePersonalUsername(v)
        : U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40);
    }catch(_){
      return U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40);
    }
  };

  function profile(){
    try{return root.__sagsGetSession?.()?.profile||root.currentUserProfile||{}}
    catch(_){return root.currentUserProfile||{}}
  }
  function me(){const p=profile();return norm(p.username||p.userName||p.code||'')}
  function today(){
    const d=new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function activeMeta(){try{return root.currentFlightSessionMeta?.()||null}catch(_){return null}}
  function opDate(){
    return S(document.getElementById('fwcDate')?.value)
      ||S(sessionStorage.getItem('sagsV36FwcDate'))
      ||S(activeMeta()?.rosterOpDate)
      ||today();
  }
  function db(path=''){
    if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase chưa sẵn sàng.');
    return root.sagsV470Ref(path);
  }
  async function once(path){return (await db(path).once('value')).val()}
  async function manifest(date){return (await once(`roster_manifests/${safe(date)}`).catch(()=>null))||{}}
  function items(man){
    const x=man?.items;
    return (Array.isArray(x)?x:Object.values(x||{})).filter(v=>v&&v.active!==false&&!v.duplicateInactive);
  }
  function fidOf(man,x,date=''){
    const fid=S(x?.flightId)||S(root.sagsV346ResolveRosterFlightId?.(S(date||man?.opDate)||opDate(),x,{}));
    if(fid&&x&&!x.flightId)x.flightId=fid;
    return fid;
  }
  function isArr(x){return U(x?.assignmentLeg)==='ARR'}
  function isDep(x){return U(x?.assignmentLeg)==='DEP'}
  function canonicalForm(x){
    const g=U(x?.formGroup||x);
    if(g==='FSAGS'||g==='FSAGS423')return 'FSAGS423';
    return g||'FORM';
  }
  function sourceFamily(x){
    const src=U(x?.sourceColumn),rk=U(x?.roleKey),fg=U(x?.formGroup);
    if(rk==='CBTT'||src.includes('GRND_LS')||fg==='FINAL')return 'GRND_LS';
    if(rk==='PAX09'||src.includes('PAX_SUPR')||fg==='FSAGS09')return 'PAX_SUPR';
    if((rk==='LD'||fg==='FSAGS551'||src==='GRND_LD')&&!src.includes('GRND_COR'))return 'GRND_LD';
    if(['COR','BOTH'].includes(rk)||src.includes('GRND_COR')||['FSAGS','FSAGS423','FSAGS421'].includes(fg))return 'GRND_COR';
    return src||rk||fg||'ROSTER';
  }
  function sameWorkFamily(a,b){
    return canonicalForm(a)===canonicalForm(b)&&sourceFamily(a)===sourceFamily(b);
  }
  async function sessionState(aid){
    return (await once(`roster_sessions/${safe(aid)}`).catch(()=>null))||{};
  }
  function completed(st){
    const cs=U(st?.claimStatus),ws=U(st?.workPartStatus),ts=U(st?.taskStatusV333||st?.taskStatus);
    return !!st?.completionEnvelope
      ||Number(st?.completedAtMs||st?.completionEnvelopeAtMs||0)>0
      ||['PART_COMPLETED','COMPLETED','HANDED_OVER'].includes(cs)
      ||ws==='COMPLETED'
      ||ts==='COMPLETED';
  }
  function activelyClaimed(st){
    const cs=U(st?.claimStatus),ts=U(st?.taskStatusV333||st?.taskStatus),ws=U(st?.workPartStatus);
    return cs==='CLAIMED'||ts==='IN_PROGRESS'||ws==='IN_PROGRESS';
  }

  function cleanEnvelope(env){
    const x=env&&typeof env==='object'?env:{};
    const src=x.state&&typeof x.state==='object'?x.state:{},state={};
    for(const [k,v] of Object.entries(src)){
      if(/attachment/i.test(k))continue;
      try{
        const z=JSON.stringify(v);
        if(z.length<=180000)state[k]=JSON.parse(z);
      }catch(_){}
    }
    return {
      state,
      mainForm:S(x.mainForm||x.activeFormGroup||'fsags'),
      activeFormGroup:S(x.activeFormGroup||x.mainForm||'fsags'),
      currentPage:Number(x.currentPage)||1,
      scrollY:0,
      arrivalOp:S(x.arrivalOp||'passenger'),
      departureOp:S(x.departureOp||'passenger'),
      rosterSeed:clone(x.rosterSeed||{})||{}
    };
  }
  function identityKey(raw){
    const k=S(raw)
      .replace(/^f(?:423|421|551|09)_/i,'')
      .replace(/[^a-z0-9]/gi,'')
      .toLowerCase();
    return /^(fltbefore|fltafter|flightbefore|flightafter|flight|flightno|flightnumber|fltno|arrflight|depflight|route|route1|route2|route3|acreg|aircraftreg|registration|aircraft|flightdate|opdate|date|std|etd|sta|eta|bay|gate)$/.test(k);
  }
  function depBaseline(src,dep,arr){
    src=cleanEnvelope(src);
    const state={},seed={};
    for(const [k,v] of Object.entries(src.state||{}))if(identityKey(k))state[k]=clone(v);
    for(const [k,v] of Object.entries(src.rosterSeed||{}))if(identityKey(k))seed[k]=clone(v);
    return {
      state,rosterSeed:seed,
      mainForm:S(dep?.formGroup||src.mainForm||'fsags'),
      activeFormGroup:S(dep?.formGroup||src.activeFormGroup||src.mainForm||'fsags'),
      currentPage:1,scrollY:0,
      arrivalOp:S(src.arrivalOp||'passenger'),
      departureOp:S(src.departureOp||'passenger'),
      rosterAssignmentId:S(dep?.assignmentId),
      v22Phase:'DEP',
      v22DepNewSheet:true,
      v222DepNewSheet:true,
      v222SourceArrAssignmentId:S(arr?.assignmentId),
      v222CreatedAtMs:Date.now()
    };
  }

  async function findArrPredecessor(date,man,dep,depSt){
    const depAid=S(dep?.assignmentId),fid=fidOf(man,dep,date);
    if(!depAid||!fid)return null;

    const explicit=S(depSt?.handoverFromAssignmentId);
    if(explicit){
      const item=items(man).find(x=>S(x.assignmentId)===explicit)||null;
      if(item){
        const st=await sessionState(explicit);
        if(completed(st))return {item,st,reason:'HANDOVER_FROM'};
      }
    }

    const rec=(await once(`flight_records/${safe(date)}/${safe(fid)}`).catch(()=>null))||{};
    const hist=Object.values(rec?.workPartHistory||{}).filter(Boolean)
      .sort((a,b)=>Number(b?.atMs||0)-Number(a?.atMs||0));
    const ev=hist.find(x=>
      S(x?.nextAssignmentId)===depAid
      &&U(x?.type)==='WORK_PART_COMPLETED'
      &&U(x?.status)==='COMPLETED'
    );
    if(ev?.assignmentId){
      const item=items(man).find(x=>S(x.assignmentId)===S(ev.assignmentId))||null;
      if(item){
        const st=await sessionState(ev.assignmentId);
        if(completed(st))return {item,st,reason:'WORK_HISTORY'};
      }
    }

    const arrs=items(man).filter(x=>
      isArr(x)
      &&fidOf(man,x,date)===fid
      &&canonicalForm(x)===canonicalForm(dep)
    );
    const rows=[];
    for(const item of arrs){
      const st=await sessionState(item.assignmentId);
      if(!completed(st))continue;
      let score=0;
      if(sameWorkFamily(item,dep))score+=100;
      if(sourceFamily(item)===sourceFamily(dep))score+=25;
      const ao=Number(item.workPartOrder||0),dd=Number(dep.workPartOrder||0);
      if(ao&&dd&&ao<=dd)score+=15;
      score+=Math.min(9,Math.floor(Number(st.completedAtMs||0)/1e12));
      rows.push({item,st,score,reason:'COMPLETED_ARR'});
    }
    rows.sort((a,b)=>b.score-a.score||Number(b.st?.completedAtMs||0)-Number(a.st?.completedAtMs||0));
    return rows[0]||null;
  }

  function ensureChoiceUi(){
    let m=document.getElementById('v222DepChoiceModal');
    if(m)return m;
    const st=document.createElement('style');
    st.id='v222DepChoiceStyle';
    st.textContent=`
      #v222DepChoiceModal{position:fixed;inset:0;z-index:26950;background:rgba(0,0,0,.60);display:none;align-items:center;justify-content:center;padding:14px;box-sizing:border-box;font-family:Arial,sans-serif}
      #v222DepChoiceModal .box{width:min(94vw,450px);background:#fff;border-radius:17px;padding:16px;box-shadow:0 18px 55px rgba(0,0,0,.36);color:#17324d}
      #v222DepChoiceModal h3{margin:0 0 8px;color:#064f9e;font-size:19px}
      #v222DepChoiceModal p{font-size:13px;line-height:1.45;margin:7px 0;color:#425466}
      #v222DepChoiceModal .actions{display:grid;gap:9px;margin-top:13px}
      #v222DepChoiceModal button{border:0;border-radius:11px;padding:13px 10px;font:900 13px Arial}
      #v222Continue{background:#e8f4ff;color:#07599d}
      #v222New{background:#eaf7ef;color:#17663b}
      #v222Later{background:#eef1f4;color:#5b6874}`;
    document.head.appendChild(st);
    m=document.createElement('div');
    m.id='v222DepChoiceModal';
    m.innerHTML=`<div class="box"><h3>DEP ĐÃ SẴN SÀNG</h3><p>Phần ARR trước đã <b>HOÀN TẤT</b>. Chọn cách thực hiện DEP:</p><div class="actions"><button id="v222Continue" type="button">TIẾP TỤC TỜ HIỆN TẠI</button><button id="v222New" type="button">TẠO TỜ DEP MỚI</button><button id="v222Later" type="button">ĐỂ SAU</button></div><p><b>TỜ DEP MỚI</b> chỉ giữ thông tin nhận dạng/lịch chuyến cơ bản. Dữ liệu khai thác ARR vẫn nằm nguyên trong snapshot ARR đã hoàn tất.</p></div>`;
    document.body.appendChild(m);
    return m;
  }
  function chooseDep(){
    const m=ensureChoiceUi();
    m.style.display='flex';
    return new Promise(resolve=>{
      const finish=v=>{
        m.style.display='none';
        for(const id of ['v222Continue','v222New','v222Later']){
          const b=document.getElementById(id);if(b)b.onclick=null;
        }
        resolve(v);
      };
      document.getElementById('v222Continue').onclick=()=>finish('CONTINUE');
      document.getElementById('v222New').onclick=()=>finish('NEW_DEP');
      document.getElementById('v222Later').onclick=()=>finish('CANCEL');
    });
  }

  async function releaseStaleDepLock(date,man,dep){
    const fid=fidOf(man,dep,date),form=canonicalForm(dep);
    if(!fid)return;
    const path=`flight_records/${safe(date)}/${safe(fid)}/forms/${safe(form)}/activeDepInstance`;
    let cur=null;try{cur=(await db(path).once('value')).val()||null}catch(_){}
    if(!cur||S(cur.assignmentId)===S(dep.assignmentId))return;
    const oldAid=S(cur.assignmentId),oldItem=items(man).find(x=>S(x.assignmentId)===oldAid)||null;
    const oldSt=oldAid?await sessionState(oldAid):{};
    const stale=!oldItem||completed(oldSt)||!activelyClaimed(oldSt);
    if(stale){
      try{await db(path).transaction(x=>S(x?.assignmentId)===oldAid?null:x)}catch(_){}
    }
  }

  async function ensureDepInstance(date,man,dep,mode,arr){
    await releaseStaleDepLock(date,man,dep);
    const fid=fidOf(man,dep,date),form=canonicalForm(dep),aid=S(dep.assignmentId);
    if(!fid||!aid)throw new Error('Không xác định được hồ sơ DEP.');
    const base=`flight_records/${safe(date)}/${safe(fid)}/forms/${safe(form)}`;
    const instanceId=`DEP_${safe(aid)}_${mode==='NEW_DEP'?'NEW':'CONT'}`;
    const now=Date.now(),ref=db(`${base}/activeDepInstance`);
    const tx=await ref.transaction(cur=>{
      if(cur&&U(cur.status)==='ACTIVE'&&S(cur.assignmentId)!==aid)return;
      return {
        schema:3,engine:BUILD,instanceId,assignmentId:aid,mode,status:'ACTIVE',
        ownerUser:me(),sourceArrAssignmentId:S(arr?.assignmentId),
        createdAtMs:Number(cur?.createdAtMs||now)||now,updatedAtMs:now
      };
    });
    if(tx&&tx.committed===false){
      const v=tx.snapshot?.val?.()||{};
      throw new Error(`Đang có tờ DEP khác được xử lý bởi ${norm(v.ownerUser)||'người khác'}.`);
    }
    const lock=tx?.snapshot?.val?.()||{
      schema:3,engine:BUILD,instanceId,assignmentId:aid,mode,status:'ACTIVE',
      ownerUser:me(),sourceArrAssignmentId:S(arr?.assignmentId),createdAtMs:now,updatedAtMs:now
    };
    await db(`${base}/instances/${safe(instanceId)}`).update(lock);
    return {instanceId,base};
  }

  function localMeta(aid){
    try{return (root.readFlightSessionList?.()||[]).find(x=>S(x?.rosterAssignmentId)===S(aid))||null}catch(_){return null}
  }
  function writeLocalEnvelope(aid,env){
    try{
      const lm=localMeta(aid);
      if(lm?.id&&typeof root.flightSessionStorageKey==='function'){
        localStorage.setItem(root.flightSessionStorageKey(lm.id),JSON.stringify(env));
      }
    }catch(e){console.info('V2.2.2 local DEP save',e?.message||e)}
  }

  async function prepareNewDep(date,man,dep,depSt,arrInfo){
    const arr=arrInfo.item,arrSt=arrInfo.st;
    const inst=await ensureDepInstance(date,man,dep,'NEW_DEP',arr);
    const src=arrSt?.completionEnvelope||depSt?.handoverEnvelope||arrSt?.envelope||depSt?.envelope||{};
    const env=depBaseline(src,dep,arr);
    env.v22FormInstanceId=inst.instanceId;
    env.v222FormInstanceId=inst.instanceId;

    const now=Date.now(),aid=S(dep.assignmentId),fid=fidOf(man,dep,date);
    const wk=S(dep.workspaceKey||dep.rosterWorkspaceKey),patch={};
    patch[`roster_sessions/${safe(aid)}/envelope`]=env;
    patch[`roster_sessions/${safe(aid)}/envelopeUpdatedAtMs`]=now;
    patch[`roster_sessions/${safe(aid)}/handoverEnvelope`]=env;
    patch[`roster_sessions/${safe(aid)}/handoverEnvelopeAtMs`]=now;
    patch[`roster_sessions/${safe(aid)}/handoverFromAssignmentId`]=S(arr.assignmentId);
    patch[`roster_sessions/${safe(aid)}/handoverFromUser`]=norm(arrSt.completedBy||arr.user||arr.targetUser);
    patch[`roster_sessions/${safe(aid)}/previousPartCompletedAtMs`]=Number(arrSt.completedAtMs||arrSt.completionEnvelopeAtMs||now);
    patch[`roster_sessions/${safe(aid)}/workPartReady`]=true;
    patch[`roster_sessions/${safe(aid)}/handoverReady`]=true;
    patch[`roster_sessions/${safe(aid)}/v22DepChoice`]='NEW_DEP';
    patch[`roster_sessions/${safe(aid)}/v22DepChoiceAtMs`]=now;
    patch[`roster_sessions/${safe(aid)}/v22DepChoiceBy`]=me();
    patch[`roster_sessions/${safe(aid)}/v22FormInstanceId`]=inst.instanceId;
    patch[`roster_sessions/${safe(aid)}/v22FormInstanceMode`]='NEW_DEP';
    patch[`roster_sessions/${safe(aid)}/v22DepNewSheet`]=true;
    patch[`roster_sessions/${safe(aid)}/v222PreparedAtMs`]=now;
    patch[`roster_sessions/${safe(aid)}/v222PreparedBy`]=me();

    if(wk){
      patch[`roster_flight_workspaces/${safe(wk)}/envelope`]=cleanEnvelope(env);
      patch[`roster_flight_workspaces/${safe(wk)}/envelopeUpdatedAtMs`]=now;
      patch[`roster_flight_workspaces/${safe(wk)}/updatedAtMs`]=now;
      patch[`roster_flight_workspaces/${safe(wk)}/updatedBy`]=me();
      patch[`roster_flight_workspaces/${safe(wk)}/v222Phase`]='DEP';
      patch[`roster_flight_workspaces/${safe(wk)}/v222DepAssignmentId`]=aid;
    }
    if(fid){
      patch[`flight_records/${safe(date)}/${safe(fid)}/forms/${safe(canonicalForm(dep))}/v222LastDepAssignmentId`]=aid;
      patch[`flight_records/${safe(date)}/${safe(fid)}/forms/${safe(canonicalForm(dep))}/v222LastDepCreatedAtMs`]=now;
    }
    await db('').update(patch);
    writeLocalEnvelope(aid,env);
    return env;
  }

  async function prepareContinue(date,man,dep,depSt,arrInfo){
    const arr=arrInfo.item,arrSt=arrInfo.st;
    const inst=await ensureDepInstance(date,man,dep,'CONTINUE',arr);
    const now=Date.now(),aid=S(dep.assignmentId),patch={};
    const src=depSt?.envelope||depSt?.handoverEnvelope||arrSt?.completionEnvelope||arrSt?.envelope||null;
    if(src&&!depSt?.envelope){
      patch[`roster_sessions/${safe(aid)}/envelope`]=cleanEnvelope(src);
      patch[`roster_sessions/${safe(aid)}/envelopeUpdatedAtMs`]=now;
    }
    patch[`roster_sessions/${safe(aid)}/v22DepChoice`]='CONTINUE';
    patch[`roster_sessions/${safe(aid)}/v22DepChoiceAtMs`]=now;
    patch[`roster_sessions/${safe(aid)}/v22DepChoiceBy`]=me();
    patch[`roster_sessions/${safe(aid)}/v22FormInstanceId`]=inst.instanceId;
    patch[`roster_sessions/${safe(aid)}/v22FormInstanceMode`]='CONTINUE_CURRENT';
    patch[`roster_sessions/${safe(aid)}/handoverFromAssignmentId`]=S(arr.assignmentId);
    patch[`roster_sessions/${safe(aid)}/handoverFromUser`]=norm(arrSt.completedBy||arr.user||arr.targetUser);
    patch[`roster_sessions/${safe(aid)}/previousPartCompletedAtMs`]=Number(arrSt.completedAtMs||arrSt.completionEnvelopeAtMs||now);
    patch[`roster_sessions/${safe(aid)}/v222PreparedAtMs`]=now;
    patch[`roster_sessions/${safe(aid)}/v222PreparedBy`]=me();
    await db('').update(patch);
  }

  async function depCandidate(date,man,fid){
    const u=me(),rows=[];
    for(const dep of items(man)){
      if(!isDep(dep)||fidOf(man,dep,date)!==S(fid)||norm(dep.user||dep.targetUser)!==u)continue;
      const st=await sessionState(dep.assignmentId);
      if(completed(st))continue;
      const arr=await findArrPredecessor(date,man,dep,st);
      if(arr)rows.push({dep,st,arr});
    }
    rows.sort((a,b)=>Number(a.dep.workPartOrder||999)-Number(b.dep.workPartOrder||999));
    return rows[0]||null;
  }

  async function notifyDepReady(date,man,arrItem,arrSt){
    if(!arrItem||!isArr(arrItem)||!completed(arrSt))return false;
    const fid=fidOf(man,arrItem,date);if(!fid)return false;
    const deps=items(man).filter(x=>
      isDep(x)
      &&fidOf(man,x,date)===fid
      &&canonicalForm(x)===canonicalForm(arrItem)
    );
    if(!deps.length)return false;
    const same=deps.filter(x=>sameWorkFamily(x,arrItem));
    const pool=(same.length?same:deps).sort((a,b)=>Number(a.workPartOrder||999)-Number(b.workPartOrder||999));

    let dep=null,depSt=null;
    for(const x of pool){
      const s=await sessionState(x.assignmentId);
      if(completed(s))continue;
      dep=x;depSt=s;break;
    }
    if(!dep)return false;

    const now=Date.now(),aid=S(dep.assignmentId),depUser=norm(dep.user||dep.targetUser),patch={};
    const env=arrSt.completionEnvelope||arrSt.envelope||{};
    patch[`roster_sessions/${safe(aid)}/ownerUser`]=depUser;
    patch[`roster_sessions/${safe(aid)}/handoverFromAssignmentId`]=S(arrItem.assignmentId);
    patch[`roster_sessions/${safe(aid)}/handoverFromUser`]=norm(arrSt.completedBy||arrItem.user||arrItem.targetUser);
    patch[`roster_sessions/${safe(aid)}/previousPartCompletedAtMs`]=Number(arrSt.completedAtMs||arrSt.completionEnvelopeAtMs||now);
    patch[`roster_sessions/${safe(aid)}/workPartReady`]=true;
    patch[`roster_sessions/${safe(aid)}/handoverReady`]=true;
    patch[`roster_sessions/${safe(aid)}/claimStatus`]='READY';
    patch[`roster_sessions/${safe(aid)}/taskStatusV333`]='UNCLAIMED';
    patch[`roster_sessions/${safe(aid)}/taskAvailabilityV333`]='READY';
    patch[`roster_sessions/${safe(aid)}/taskStatusUpdatedAtMs`]=now;
    patch[`roster_sessions/${safe(aid)}/v222ArrReadyAtMs`]=now;
    patch[`roster_sessions/${safe(aid)}/v222ArrReadyFromAssignmentId`]=S(arrItem.assignmentId);
    if(env&&Object.keys(env).length){
      patch[`roster_sessions/${safe(aid)}/handoverEnvelope`]=cleanEnvelope(env);
      patch[`roster_sessions/${safe(aid)}/handoverEnvelopeAtMs`]=now;
    }

    // Important: touch the DEP owner's mailbox so a logged-in second device/account
    // receives child_changed and refreshes MY FLIGHT immediately.
    if(depUser){
      patch[`roster_mail/${safe(depUser)}/items/${safe(aid)}/handoverReady`]=true;
      patch[`roster_mail/${safe(depUser)}/items/${safe(aid)}/previousPartCompletedAtMs`]=Number(arrSt.completedAtMs||arrSt.completionEnvelopeAtMs||now);
      patch[`roster_mail/${safe(depUser)}/items/${safe(aid)}/readyAtMs`]=now;
      patch[`roster_mail/${safe(depUser)}/items/${safe(aid)}/v222ArrReadyFromAssignmentId`]=S(arrItem.assignmentId);
    }

    patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/status`]='UNCLAIMED';
    patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/statusLabel`]='CHƯA NHẬN';
    patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/availability`]='READY';
    patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/ownerUser`]=depUser;
    patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/updatedAtMs`]=now;

    await db('').update(patch);
    return true;
  }

  async function claimDepDirect(date,man,cand){
    const dep=cand.dep,arr=cand.arr.item,aid=S(dep.assignmentId),fid=fidOf(man,dep,date),u=me();
    if(!aid||!fid||norm(dep.user||dep.targetUser)!==u)throw new Error('DEP không thuộc tài khoản hiện tại.');
    const proof=await findArrPredecessor(date,man,dep,await sessionState(aid));
    if(!proof||!completed(proof.st))throw new Error('ARR trước chưa có dấu HOÀN TẤT hợp lệ.');

    const gid=S(dep.coAssigneeGroupId),patch={},now=Date.now();
    if(gid){
      const lockRef=db(`roster_co_claims/${safe(date)}/${safe(gid)}`);
      const tx=await lockRef.transaction(cur=>{
        const owner=norm(cur?.claimedBy),status=U(cur?.status),curAid=S(cur?.claimedAssignmentId);
        if(status==='CLAIMED'&&owner&&owner!==u)return;
        return {
          schema:1,groupId:gid,status:'CLAIMED',claimedBy:u,claimedAssignmentId:aid,
          claimedAtMs:Number(cur?.claimedAtMs||now)||now,updatedAtMs:now,
          opDate:date,flightId:fid,formGroup:S(dep.formGroup),sourceColumn:S(dep.sourceColumn),
          claimSource:'V2.2.2_DEP_AFTER_ARR'
        };
      });
      if(tx&&tx.committed===false){
        const x=tx.snapshot?.val?.()||{};
        throw new Error(`DEP đang được ${norm(x.claimedBy)||'người khác'} xử lý.`);
      }
      const peers=items(man).filter(x=>S(x.coAssigneeGroupId)===gid&&S(x.assignmentId)!==aid);
      for(const p of peers){
        const pid=S(p.assignmentId);if(!pid)continue;
        patch[`roster_sessions/${safe(pid)}/claimStatus`]='STANDBY';
        patch[`roster_sessions/${safe(pid)}/taskStatusV333`]='UNCLAIMED';
        patch[`roster_sessions/${safe(pid)}/taskAvailabilityV333`]='STANDBY';
        patch[`roster_sessions/${safe(pid)}/coClaimedBy`]=u;
        patch[`roster_sessions/${safe(pid)}/coClaimedAssignmentId`]=aid;
        patch[`roster_sessions/${safe(pid)}/updatedAtMs`]=now;
      }
      patch[`roster_sessions/${safe(aid)}/coClaimedBy`]=u;
      patch[`roster_sessions/${safe(aid)}/coClaimedAssignmentId`]=aid;
    }

    patch[`roster_sessions/${safe(aid)}/ownerUser`]=u;
    patch[`roster_sessions/${safe(aid)}/claimStatus`]='CLAIMED';
    patch[`roster_sessions/${safe(aid)}/workPartStatus`]='IN_PROGRESS';
    patch[`roster_sessions/${safe(aid)}/taskStatusV333`]='IN_PROGRESS';
    patch[`roster_sessions/${safe(aid)}/taskAvailabilityV333`]='ACTIVE';
    patch[`roster_sessions/${safe(aid)}/taskStatusUpdatedAtMs`]=now;
    patch[`roster_sessions/${safe(aid)}/claimedAtMs`]=now;
    patch[`roster_sessions/${safe(aid)}/claimedBy`]=u;
    patch[`roster_sessions/${safe(aid)}/handoverReady`]=false;
    patch[`roster_sessions/${safe(aid)}/workPartReady`]=true;
    patch[`roster_sessions/${safe(aid)}/v222DirectClaimAtMs`]=now;
    patch[`roster_sessions/${safe(aid)}/v222DirectClaimFromArrAssignmentId`]=S(arr.assignmentId);
    patch[`roster_sessions/${safe(aid)}/updatedAtMs`]=now;

    patch[`flight_records/${safe(date)}/${safe(fid)}/taskClaims/${safe(u)}/${safe(aid)}`]={
      assignmentId:aid,username:u,name:S(profile().name||profile().fullName||u),
      formGroup:S(dep.formGroup),sourceColumn:S(dep.sourceColumn),
      workPartOrder:Number(dep.workPartOrder||1),workPartTotal:Number(dep.workPartTotal||1),
      coAssigneeGroupId:gid||null,status:'CLAIMED',taskStatus:'IN_PROGRESS',
      claimedAtMs:now,updatedAtMs:now,claimSource:'V2.2.2_DEP_AFTER_ARR'
    };
    patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/status`]='IN_PROGRESS';
    patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/statusLabel`]='ĐANG LÀM';
    patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/availability`]='ACTIVE';
    patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/ownerUser`]=u;
    patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/updatedAtMs`]=now;

    await db('').update(patch);
    return true;
  }

  async function prepareAndClaimBeforeOpen(fid){
    const date=opDate(),man=await manifest(date),cand=await depCandidate(date,man,fid);
    if(!cand)return {handled:false};

    const st=await sessionState(cand.dep.assignmentId);
    let choice=U(st.v22DepChoice);
    if(!['NEW_DEP','CONTINUE'].includes(choice)){
      choice=await chooseDep();
      if(choice==='CANCEL')return {handled:true,cancel:true};
      if(choice==='NEW_DEP')await prepareNewDep(date,man,cand.dep,st,cand.arr);
      else await prepareContinue(date,man,cand.dep,st,cand.arr);
    }else if(choice==='NEW_DEP'){
      const current=await sessionState(cand.dep.assignmentId);
      const good=current?.v22DepNewSheet===true
        &&(current?.envelope?.v22DepNewSheet===true||current?.envelope?.v222DepNewSheet===true);
      if(!good)await prepareNewDep(date,man,cand.dep,current,cand.arr);
    }

    const latest=await sessionState(cand.dep.assignmentId);
    if(!activelyClaimed(latest)){
      await claimDepDirect(date,man,cand);
    }
    return {handled:true,mode:choice,aid:S(cand.dep.assignmentId)};
  }

  function captureArr(){
    const meta=activeMeta(),aid=S(meta?.rosterAssignmentId);
    if(!aid)return null;
    return {aid,date:S(meta?.rosterOpDate)||opDate()};
  }
  async function arrContext(x){
    if(!x)return null;
    const man=await manifest(x.date),item=items(man).find(v=>S(v.assignmentId)===x.aid)||null;
    return item?{...x,man,item}:null;
  }

  function patchReceive(){
    const base=root.v324ReceiveOrOpen;
    if(typeof base!=='function'||base.__v222DepReceive)return false;
    const wrapped=async function(fid){
      try{
        const prep=await prepareAndClaimBeforeOpen(S(fid));
        if(prep?.cancel)return false;
      }catch(e){
        alert('Không nhận được DEP: '+S(e?.message||e));
        return false;
      }
      const r=await base.apply(this,arguments);

      // Re-apply the exact NEW DEP envelope after all older wrappers have finished.
      setTimeout(async()=>{
        try{
          const meta=activeMeta(),aid=S(meta?.rosterAssignmentId);
          if(!aid)return;
          const st=await sessionState(aid);
          if(U(st?.v22DepChoice)==='NEW_DEP'&&st?.envelope?.v22DepNewSheet===true){
            writeLocalEnvelope(aid,st.envelope);
          }
        }catch(_){}
      },100);
      return r;
    };
    wrapped.__v222DepReceive=1;
    wrapped.__v222Base=base;
    root.v324ReceiveOrOpen=wrapped;
    try{v324ReceiveOrOpen=wrapped}catch(_){}
    return true;
  }

  function patchComplete(){
    const base=root.v324ConfirmRosterHandover;
    if(typeof base!=='function'||base.__v222DepReceive)return false;
    const wrapped=async function(){
      let before=null;
      try{before=await arrContext(captureArr())}catch(_){}
      const r=await base.apply(this,arguments);
      try{
        if(before?.item&&isArr(before.item)){
          const after=await sessionState(before.aid);
          if(completed(after)){
            const fresh=await manifest(before.date);
            await notifyDepReady(before.date,fresh,before.item,after);
          }
        }
      }catch(e){console.warn('V2.2.2 ARR->DEP ready notify',e)}
      return r;
    };
    wrapped.__v222DepReceive=1;
    wrapped.__v222Base=base;
    root.v324ConfirmRosterHandover=wrapped;
    try{v324ConfirmRosterHandover=wrapped}catch(_){}
    return true;
  }

  function install(){
    patchReceive();
    patchComplete();
  }
  install();
  setTimeout(install,250);
  setTimeout(install,700);
  setTimeout(install,1500);
  setTimeout(install,3000);
  window.addEventListener('pageshow',()=>setTimeout(install,80),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(install,80)},{passive:true});

  root.sagsV222DepDiagnostics=async function(fid='') {
    const date=opDate(),man=await manifest(date),f=S(fid);
    const candidates=[];
    for(const dep of items(man)){
      if(!isDep(dep)||norm(dep.user||dep.targetUser)!==me()||(f&&fidOf(man,dep,date)!==f))continue;
      const st=await sessionState(dep.assignmentId),arr=await findArrPredecessor(date,man,dep,st);
      candidates.push({
        aid:S(dep.assignmentId),fid:fidOf(man,dep,date),user:norm(dep.user||dep.targetUser),
        claimStatus:S(st.claimStatus),taskStatus:S(st.taskStatusV333),
        availability:S(st.taskAvailabilityV333),choice:S(st.v22DepChoice),
        arrAid:S(arr?.item?.assignmentId),arrDone:!!arr&&completed(arr.st)
      });
    }
    return {
      build:BUILD,
      baseV22:root.__SAGS_V22_RUNTIME_PATCH||'',
      date,user:me(),
      receivePatched:!!root.v324ReceiveOrOpen?.__v222DepReceive,
      completePatched:!!root.v324ConfirmRosterHandover?.__v222DepReceive,
      candidates
    };
  };
})(typeof window!=='undefined'?window:globalThis);

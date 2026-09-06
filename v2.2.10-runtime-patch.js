/* E-REPORT/SAGS V2.2.10 · INDEPENDENT DEP / SAME FLIGHT WORKSPACE
 * BUILD: V2.2.10-INDEPENDENT-DEP-SAME-WORKSPACE
 * Base production: V2.2.9 + V2.2.2 ARR/DEP
 *
 * Business rule:
 * - ONE FLIGHT = ONE flight_records/{date}/{flightId} workspace remains unchanged.
 * - ARR and DEP are separate form instances/tasks inside that SAME flight workspace.
 * - If ARR is completed: keep the existing V2.2.2 handover flow.
 * - If ARR is not received / not completed / missing: the assigned DEP operator may
 *   receive DEP immediately. The system auto-creates an INDEPENDENT DEP sheet.
 * - Independent DEP is departure-only: do not copy ARR operational data.
 * - If ARR is completed later, it must NOT reset/overwrite an already active
 *   independent DEP instance.
 * - One active DEP instance per flight/form remains enforced with RTDB transaction.
 *
 * No heartbeat. No separate flight record. No change to FINAL/CROSSCHECK/KẾT SỔ.
 */
(function(root){
  'use strict';

  const BUILD='V2.2.10-INDEPENDENT-DEP-SAME-WORKSPACE';
  if(root.__SAGS_V2210_INDEPENDENT_DEP===BUILD)return;
  root.__SAGS_V2210_INDEPENDENT_DEP=BUILD;

  const S=v=>String(v??'').trim();
  const U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(_){return null}};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  let receivePatched=false;
  let listPatched=false;
  let completePatched=false;
  let independentClaims=0;
  let eligibilityUpdates=0;
  let lateArrRepairs=0;
  let lastAction='';
  let lastAtMs=0;

  function profile(){
    try{return root.__sagsGetSession?.()?.profile||root.currentUserProfile||{}}
    catch(_){return root.currentUserProfile||{}}
  }
  function norm(v){
    try{
      return typeof root.normalizePersonalUsername==='function'
        ? root.normalizePersonalUsername(v)
        : U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40);
    }catch(_){
      return U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40);
    }
  }
  function me(){
    const p=profile();
    return norm(p.username||p.userName||p.code||'');
  }
  function today(){
    const d=new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function opDate(){
    try{
      return S(document.getElementById('fwcDate')?.value)
        ||S(sessionStorage.getItem('sagsV36FwcDate'))
        ||S(root.currentFlightSessionMeta?.()?.rosterOpDate)
        ||today();
    }catch(_){return today()}
  }
  function db(path=''){
    if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase chưa sẵn sàng.');
    return root.sagsV470Ref(path);
  }
  async function once(path){
    return (await db(path).once('value')).val();
  }
  async function manifest(date){
    return (await once(`roster_manifests/${safe(date)}`).catch(()=>null))||{};
  }
  function items(man){
    const x=man?.items;
    return (Array.isArray(x)?x:Object.values(x||{}))
      .filter(v=>v&&v.active!==false&&!v.duplicateInactive&&!['ROSTER_REMOVED','ROSTER_REASSIGNED'].includes(U(v.rosterStatus)));
  }
  function fidOf(man,item,date=''){
    let fid=S(item?.flightId);
    if(!fid){
      try{fid=S(root.sagsV346ResolveRosterFlightId?.(S(date||man?.opDate)||opDate(),item,{}))}catch(_){}
    }
    if(fid&&item&&!item.flightId)item.flightId=fid;
    return fid;
  }
  function isArr(x){return U(x?.assignmentLeg)==='ARR'}
  function isDep(x){return U(x?.assignmentLeg)==='DEP'}
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
  async function sessionState(aid){
    return (await once(`roster_sessions/${safe(aid)}`).catch(()=>null))||{};
  }

  function canonicalRecordForm(x){
    const g=U(x?.formGroup||x);
    if(g==='FSAGS'||g==='FSAGS423')return 'FSAGS423';
    return g||'FORM';
  }
  function localGroup(x){
    const g=U(x?.formGroup||x);
    if(g==='FSAGS'||g==='FSAGS423')return 'fsags';
    if(g==='FSAGS421')return 'fsags421';
    if(g==='FSAGS551')return 'fsags551';
    if(g==='FSAGS09')return 'fsags09';
    if(g==='LOADING208')return 'loading208';
    return S(x?.formGroup||x).toLowerCase()||'fsags';
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
    return canonicalRecordForm(a)===canonicalRecordForm(b)&&sourceFamily(a)===sourceFamily(b);
  }

  function routeParts(item){
    const raw=U(item?.route||item?.sector||'');
    const parts=raw.split(/[-–—>\/]+/).map(S).filter(Boolean);
    const cxr=parts.indexOf('CXR');
    return {
      origin:S(item?.route1||(cxr>0?parts[cxr-1]:parts[0])),
      destination:S(item?.route3||(cxr>=0&&cxr<parts.length-1?parts[cxr+1]:parts[parts.length-1]))
    };
  }
  function displayDate(v){
    const x=S(v);
    let m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(x);
    if(m)return `${m[3]}/${m[2]}/${m[1]}`;
    return x;
  }
  function startPage(g){
    return g==='fsags421'?6:(g==='fsags551'?9:(g==='fsags09'?11:(g==='loading208'?13:1)));
  }

  /* Departure-only baseline.
   * IMPORTANT: no fltBefore / STA / ARR route / ARR bay is written.
   */
  function depOnlySeed(item){
    const g=localGroup(item),r=routeParts(item);
    const base={
      date:displayDate(item?.opDate||item?.date||opDate()),
      dep:S(item?.depFlight||item?.flightAfter||item?.departureFlight),
      std:S(item?.std||item?.stdClock),
      etd:S(item?.etd||item?.etdClock),
      reg:S(item?.acReg||item?.regn||item?.registration),
      type:S(item?.acType||item?.aircraftType),
      dest:S(item?.route3||r.destination),
      bay:S(item?.bayAfter||item?.depBay||item?.bay)
    };
    const out={};

    if(g==='fsags421'){
      Object.assign(out,{
        f421_date:base.date,
        f421_fltAfter:base.dep,
        f421_std:base.std,
        f421_etd:base.etd,
        f421_regn:base.reg,
        f421_acType:base.type,
        f421_route3:base.dest,
        f421_bayAfter:base.bay
      });
    }else if(g==='fsags551'){
      Object.assign(out,{
        f551_date:base.date,
        f551_fltAfter:base.dep,
        f551_std:base.std,
        f551_etd:base.etd,
        f551_regn:base.reg,
        f551_acType:base.type,
        f551_route3:base.dest,
        f551_bay:base.bay
      });
    }else if(g==='fsags09'){
      Object.assign(out,{
        f09_date:base.date,
        f09_fltAfter:base.dep,
        f09_std:base.std,
        f09_etd:base.etd,
        f09_regn:base.reg,
        f09_acType:base.type,
        f09_route3:base.dest,
        f09_parkingDep:base.bay
      });
    }else{
      Object.assign(out,{
        date:base.date,
        fltAfter:base.dep,
        std:base.std,
        etd:base.etd,
        regn:base.reg,
        acType:base.type,
        route2:'CXR',
        route3:base.dest,
        bayAfter:base.bay
      });
    }
    for(const k of Object.keys(out))if(!S(out[k]))delete out[k];
    return out;
  }

  function independentEnvelope(dep,fid,reason){
    const g=localGroup(dep),seed=depOnlySeed(dep),now=Date.now();
    return {
      state:{...seed},
      rosterSeed:{...seed},
      mainForm:g,
      activeFormGroup:g,
      currentPage:startPage(g),
      scrollY:0,
      arrivalOp:'passenger',
      departureOp:'passenger',
      rosterAssignmentId:S(dep?.assignmentId),
      rosterFlightId:S(fid),
      v22Phase:'DEP',
      v22DepNewSheet:true,
      v222DepNewSheet:true,
      v2210IndependentDep:true,
      v2210IndependentReason:S(reason),
      v2210DepartureOnly:true,
      v2210CreatedAtMs:now
    };
  }

  async function predecessorInfo(date,man,dep){
    const fid=fidOf(man,dep,date),depOrder=Number(dep?.workPartOrder||999);
    if(!fid)return {exists:false,done:false,item:null,st:null,reason:'NO_FLIGHT_ID'};

    let arrs=items(man).filter(x=>
      isArr(x)
      &&fidOf(man,x,date)===fid
      &&canonicalRecordForm(x)===canonicalRecordForm(dep)
    );
    const exact=arrs.filter(x=>sameWorkFamily(x,dep));
    if(exact.length)arrs=exact;

    if(!arrs.length)return {exists:false,done:false,item:null,st:null,reason:'NO_ARR_ASSIGNMENT'};

    const rows=[];
    for(const item of arrs){
      const st=await sessionState(item.assignmentId);
      let score=0;
      if(sameWorkFamily(item,dep))score+=100;
      const ao=Number(item.workPartOrder||0);
      if(ao&&ao<=depOrder)score+=30;
      if(completed(st))score+=1000;
      if(activelyClaimed(st))score+=10;
      rows.push({item,st,score});
    }
    rows.sort((a,b)=>b.score-a.score||Number(b.item.workPartOrder||0)-Number(a.item.workPartOrder||0));
    const done=rows.find(x=>completed(x.st));
    if(done)return {exists:true,done:true,item:done.item,st:done.st,reason:'ARR_COMPLETED'};

    const best=rows[0];
    return {
      exists:true,
      done:false,
      item:best?.item||null,
      st:best?.st||null,
      reason:activelyClaimed(best?.st)?'ARR_IN_PROGRESS':'ARR_NOT_COMPLETED'
    };
  }

  async function acquireCoClaim(date,man,dep,fid){
    const gid=S(dep?.coAssigneeGroupId),u=me(),aid=S(dep?.assignmentId),now=Date.now();
    if(!gid)return {gid:'',peers:[]};

    const ref=db(`roster_co_claims/${safe(date)}/${safe(gid)}`);
    const tx=await ref.transaction(cur=>{
      const owner=norm(cur?.claimedBy),status=U(cur?.status);
      if(status==='CLAIMED'&&owner&&owner!==u)return;
      return {
        schema:1,
        groupId:gid,
        status:'CLAIMED',
        claimedBy:u,
        claimedAssignmentId:aid,
        claimedAtMs:Number(cur?.claimedAtMs||now)||now,
        updatedAtMs:now,
        opDate:date,
        flightId:fid,
        formGroup:S(dep.formGroup),
        sourceColumn:S(dep.sourceColumn),
        claimSource:'V2.2.10_INDEPENDENT_DEP'
      };
    });
    if(tx&&tx.committed===false){
      const cur=tx.snapshot?.val?.()||{};
      throw new Error(`DEP đang được ${norm(cur.claimedBy)||'người khác'} xử lý.`);
    }
    const peers=items(man).filter(x=>S(x.coAssigneeGroupId)===gid&&S(x.assignmentId)!==aid);
    return {gid,peers};
  }

  async function acquireDepInstance(date,man,dep,fid,reason){
    const form=canonicalRecordForm(dep),aid=S(dep.assignmentId),u=me(),now=Date.now();
    const base=`flight_records/${safe(date)}/${safe(fid)}/forms/${safe(form)}`;
    const instanceId=`DEP_${safe(aid)}_INDEPENDENT`;
    const ref=db(`${base}/activeDepInstance`);

    const tx=await ref.transaction(cur=>{
      const curAid=S(cur?.assignmentId),status=U(cur?.status);
      if(status==='ACTIVE'&&curAid&&curAid!==aid)return;
      return {
        schema:4,
        engine:BUILD,
        instanceId,
        assignmentId:aid,
        mode:'INDEPENDENT_DEP',
        status:'ACTIVE',
        ownerUser:u,
        sourceArrAssignmentId:null,
        independentReason:S(reason),
        createdAtMs:Number(cur?.createdAtMs||now)||now,
        updatedAtMs:now
      };
    });
    if(tx&&tx.committed===false){
      const cur=tx.snapshot?.val?.()||{};
      throw new Error(`Đang có tờ DEP khác hoạt động (${S(cur.instanceId)||'không xác định'}).`);
    }

    await db(`${base}/instances/${safe(instanceId)}`).update({
      schema:4,
      engine:BUILD,
      instanceId,
      phase:'DEP',
      mode:'INDEPENDENT_DEP',
      status:'ACTIVE',
      assignmentId:aid,
      ownerUser:u,
      sourceArrAssignmentId:null,
      independentReason:S(reason),
      departureOnly:true,
      flightId:fid,
      createdAtMs:now,
      updatedAtMs:now
    });
    return {instanceId,base};
  }

  async function markIndependentEligible(date,fidFilter=''){
    const man=await manifest(date),u=me(),patch={},now=Date.now();
    let changed=0;
    for(const dep of items(man)){
      const fid=fidOf(man,dep,date);
      if(!isDep(dep)||!fid||norm(dep.user||dep.targetUser)!==u)continue;
      if(fidFilter&&fid!==S(fidFilter))continue;

      const aid=S(dep.assignmentId),st=await sessionState(aid);
      if(!aid||completed(st)||st?.v2210IndependentDep===true||activelyClaimed(st))continue;

      const pred=await predecessorInfo(date,man,dep);
      if(pred.done)continue;

      patch[`roster_sessions/${safe(aid)}/workPartReady`]=true;
      patch[`roster_sessions/${safe(aid)}/handoverReady`]=false;
      patch[`roster_sessions/${safe(aid)}/claimStatus`]='READY';
      patch[`roster_sessions/${safe(aid)}/taskStatusV333`]='UNCLAIMED';
      patch[`roster_sessions/${safe(aid)}/taskAvailabilityV333`]='READY';
      patch[`roster_sessions/${safe(aid)}/taskStatusUpdatedAtMs`]=now;
      patch[`roster_sessions/${safe(aid)}/v2210IndependentEligible`]=true;
      patch[`roster_sessions/${safe(aid)}/v2210IndependentReason`]=pred.reason;
      patch[`roster_sessions/${safe(aid)}/v2210EligibleAtMs`]=now;

      patch[`roster_mail/${safe(u)}/items/${safe(aid)}/workPartReady`]=true;
      patch[`roster_mail/${safe(u)}/items/${safe(aid)}/handoverReady`]=false;
      patch[`roster_mail/${safe(u)}/items/${safe(aid)}/taskAvailabilityV333`]='READY';
      patch[`roster_mail/${safe(u)}/items/${safe(aid)}/v2210IndependentEligible`]=true;
      patch[`roster_mail/${safe(u)}/items/${safe(aid)}/v2210IndependentReason`]=pred.reason;
      patch[`roster_mail/${safe(u)}/items/${safe(aid)}/readyAtMs`]=now;

      patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/status`]='UNCLAIMED';
      patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/statusLabel`]='CHƯA NHẬN';
      patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/availability`]='READY';
      patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/independentDepEligible`]=true;
      patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/updatedAtMs`]=now;
      changed++;
    }
    if(changed){
      await db('').update(patch);
      eligibilityUpdates+=changed;
      lastAction=`MARK_READY:${changed}`;
      lastAtMs=Date.now();
    }
    return changed;
  }

  async function independentCandidate(fid){
    const date=opDate(),man=await manifest(date),u=me(),rows=[];
    for(const dep of items(man)){
      if(!isDep(dep)||fidOf(man,dep,date)!==S(fid)||norm(dep.user||dep.targetUser)!==u)continue;
      const st=await sessionState(dep.assignmentId);
      if(completed(st))continue;

      // Once independent DEP exists, keep using it even if ARR is completed later.
      if(st?.v2210IndependentDep===true){
        rows.push({date,man,dep,st,pred:{exists:true,done:false,item:null,st:null,reason:S(st.v2210IndependentReason)||'INDEPENDENT_ALREADY_ACTIVE'},existing:true});
        continue;
      }

      const pred=await predecessorInfo(date,man,dep);
      if(!pred.done)rows.push({date,man,dep,st,pred,existing:false});
    }
    rows.sort((a,b)=>Number(a.dep.workPartOrder||999)-Number(b.dep.workPartOrder||999));
    return rows[0]||null;
  }

  async function ensureLocalAndOpen(dep,env){
    let meta=null;
    try{
      if(typeof root.sagsEnsureLocalSession==='function')meta=await root.sagsEnsureLocalSession(dep);
      else if(typeof root.sagsV340EnsureLocalSession==='function')meta=await root.sagsV340EnsureLocalSession(dep);
    }catch(e){console.info('V2.2.10 ensure local session',e?.message||e)}

    if(!meta){
      try{
        root.dailyRosterRestartMailbox?.();
        await sleep(450);
        meta=(root.readFlightSessionList?.()||[]).find(x=>S(x?.rosterAssignmentId)===S(dep.assignmentId))||null;
      }catch(_){}
    }
    if(!meta?.id)throw new Error('Biểu mẫu DEP chưa đồng bộ xuống thiết bị.');

    try{
      if(typeof root.flightSessionStorageKey==='function'){
        localStorage.setItem(root.flightSessionStorageKey(meta.id),JSON.stringify(env));
      }
    }catch(e){
      throw new Error('Không lưu được tờ DEP trên máy: '+S(e?.message||e));
    }

    try{root.flightWorkspaceClose?.()}catch(_){}
    if(typeof root.switchFlightSession!=='function')throw new Error('Không mở được workspace DEP.');
    root.switchFlightSession(meta.id,true);
    return meta;
  }

  async function claimIndependent(cand){
    const {date,man,dep,pred}=cand;
    const aid=S(dep.assignmentId),fid=fidOf(man,dep,date),u=me(),now=Date.now();
    if(!aid||!fid||norm(dep.user||dep.targetUser)!==u)throw new Error('DEP không thuộc tài khoản hiện tại.');

    let st=await sessionState(aid);
    if(st?.v2210IndependentDep===true&&activelyClaimed(st)){
      const env=st.envelope&&typeof st.envelope==='object'
        ?clone(st.envelope)
        :independentEnvelope(dep,fid,S(st.v2210IndependentReason)||pred.reason);
      return {env,existing:true};
    }

    const instance=await acquireDepInstance(date,man,dep,fid,pred.reason);
    const co=await acquireCoClaim(date,man,dep,fid);
    const env=independentEnvelope(dep,fid,pred.reason);
    env.v22FormInstanceId=instance.instanceId;
    env.v22FormInstanceMode='INDEPENDENT_DEP';

    const ref=db(`roster_sessions/${safe(aid)}`);
    const tx=await ref.transaction(cur=>{
      cur=cur&&typeof cur==='object'?cur:{};
      if(completed(cur))return;
      const owner=norm(cur.claimedBy||cur.ownerUser);
      if(activelyClaimed(cur)&&owner&&owner!==u)return;
      return {
        ...cur,
        ownerUser:u,
        claimedBy:u,
        claimedAtMs:Number(cur.claimedAtMs||now)||now,
        claimStatus:'CLAIMED',
        workPartStatus:'IN_PROGRESS',
        taskStatusV333:'IN_PROGRESS',
        taskAvailabilityV333:'ACTIVE',
        taskStatusUpdatedAtMs:now,
        workPartReady:true,
        handoverReady:false,

        envelope:env,
        envelopeUpdatedAtMs:now,
        rosterSeed:{...env.rosterSeed},

        v22DepChoice:'NEW_DEP',
        v22DepChoiceAtMs:Number(cur.v22DepChoiceAtMs||now)||now,
        v22DepChoiceBy:u,
        v22DepNewSheet:true,
        v22FormInstanceId:instance.instanceId,
        v22FormInstanceMode:'INDEPENDENT_DEP',

        v2210IndependentEligible:true,
        v2210IndependentDep:true,
        v2210IndependentReason:pred.reason,
        v2210DepartureOnly:true,
        v2210IndependentClaimAtMs:now,
        v2210IndependentClaimBy:u,
        updatedAtMs:now
      };
    });
    if(tx&&tx.committed===false){
      const cur=tx.snapshot?.val?.()||{};
      if(completed(cur))throw new Error('DEP đã được hoàn tất.');
      throw new Error(`DEP đang được ${norm(cur.claimedBy||cur.ownerUser)||'người khác'} xử lý.`);
    }

    const patch={};
    for(const p of co.peers||[]){
      const pid=S(p.assignmentId);if(!pid)continue;
      patch[`roster_sessions/${safe(pid)}/claimStatus`]='STANDBY';
      patch[`roster_sessions/${safe(pid)}/taskStatusV333`]='UNCLAIMED';
      patch[`roster_sessions/${safe(pid)}/taskAvailabilityV333`]='STANDBY';
      patch[`roster_sessions/${safe(pid)}/coClaimedBy`]=u;
      patch[`roster_sessions/${safe(pid)}/coClaimedAssignmentId`]=aid;
      patch[`roster_sessions/${safe(pid)}/updatedAtMs`]=now;
    }

    if(co.gid){
      patch[`roster_sessions/${safe(aid)}/coClaimedBy`]=u;
      patch[`roster_sessions/${safe(aid)}/coClaimedAssignmentId`]=aid;
    }

    patch[`roster_mail/${safe(u)}/items/${safe(aid)}/workPartReady`]=true;
    patch[`roster_mail/${safe(u)}/items/${safe(aid)}/handoverReady`]=false;
    patch[`roster_mail/${safe(u)}/items/${safe(aid)}/claimStatus`]='CLAIMED';
    patch[`roster_mail/${safe(u)}/items/${safe(aid)}/taskStatusV333`]='IN_PROGRESS';
    patch[`roster_mail/${safe(u)}/items/${safe(aid)}/taskAvailabilityV333`]='ACTIVE';
    patch[`roster_mail/${safe(u)}/items/${safe(aid)}/v2210IndependentDep`]=true;
    patch[`roster_mail/${safe(u)}/items/${safe(aid)}/v2210IndependentReason`]=pred.reason;
    patch[`roster_mail/${safe(u)}/items/${safe(aid)}/updatedAtMs`]=now;

    patch[`flight_records/${safe(date)}/${safe(fid)}/taskClaims/${safe(u)}/${safe(aid)}`]={
      assignmentId:aid,
      username:u,
      name:S(profile().name||profile().fullName||u),
      formGroup:S(dep.formGroup),
      sourceColumn:S(dep.sourceColumn),
      workPartOrder:Number(dep.workPartOrder||1),
      workPartTotal:Number(dep.workPartTotal||1),
      coAssigneeGroupId:co.gid||null,
      status:'CLAIMED',
      taskStatus:'IN_PROGRESS',
      claimedAtMs:now,
      updatedAtMs:now,
      claimSource:'V2.2.10_INDEPENDENT_DEP',
      independentDep:true,
      independentReason:pred.reason
    };
    patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/status`]='IN_PROGRESS';
    patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/statusLabel`]='ĐANG LÀM';
    patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/availability`]='ACTIVE';
    patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/independentDep`]=true;
    patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/independentReason`]=pred.reason;
    patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/updatedAtMs`]=now;

    // Same ONE flight workspace. This is a work-part event, not the global Audit log.
    const eventId=`DEP_INDEPENDENT_${safe(aid)}_${now}`;
    patch[`flight_records/${safe(date)}/${safe(fid)}/workPartHistory/${safe(eventId)}`]={
      schema:1,
      type:'DEP_INDEPENDENT_CLAIMED',
      status:'IN_PROGRESS',
      assignmentId:aid,
      formGroup:S(dep.formGroup),
      username:u,
      reason:pred.reason,
      predecessorAssignmentId:S(pred?.item?.assignmentId),
      atMs:now
    };

    await db('').update(patch);

    independentClaims++;
    lastAction=`CLAIM:${aid}:${pred.reason}`;
    lastAtMs=Date.now();
    return {env,existing:false};
  }

  async function repairIndependentAfterLateArr(date,fid){
    const man=await manifest(date),patch={},now=Date.now();
    let count=0;

    for(const dep of items(man)){
      if(!isDep(dep)||fidOf(man,dep,date)!==S(fid))continue;
      const aid=S(dep.assignmentId),st=await sessionState(aid);
      if(!aid||st?.v2210IndependentDep!==true||completed(st))continue;

      const owner=norm(st.claimedBy||st.ownerUser||dep.user||dep.targetUser);
      if(!owner)continue;

      // V2.2.2 may publish late ARR handover as READY. Reassert the already-active
      // independent DEP without touching its working envelope.
      patch[`roster_sessions/${safe(aid)}/claimStatus`]='CLAIMED';
      patch[`roster_sessions/${safe(aid)}/workPartStatus`]='IN_PROGRESS';
      patch[`roster_sessions/${safe(aid)}/taskStatusV333`]='IN_PROGRESS';
      patch[`roster_sessions/${safe(aid)}/taskAvailabilityV333`]='ACTIVE';
      patch[`roster_sessions/${safe(aid)}/workPartReady`]=true;
      patch[`roster_sessions/${safe(aid)}/handoverReady`]=false;
      patch[`roster_sessions/${safe(aid)}/handoverEnvelope`]=null;
      patch[`roster_sessions/${safe(aid)}/handoverEnvelopeAtMs`]=null;
      patch[`roster_sessions/${safe(aid)}/handoverFromAssignmentId`]=null;
      patch[`roster_sessions/${safe(aid)}/handoverFromUser`]=null;
      patch[`roster_sessions/${safe(aid)}/previousPartCompletedAtMs`]=null;
      patch[`roster_sessions/${safe(aid)}/v2210LateArrProtectedAtMs`]=now;
      patch[`roster_sessions/${safe(aid)}/updatedAtMs`]=now;

      patch[`roster_mail/${safe(owner)}/items/${safe(aid)}/handoverReady`]=false;
      patch[`roster_mail/${safe(owner)}/items/${safe(aid)}/workPartReady`]=true;
      patch[`roster_mail/${safe(owner)}/items/${safe(aid)}/claimStatus`]='CLAIMED';
      patch[`roster_mail/${safe(owner)}/items/${safe(aid)}/taskStatusV333`]='IN_PROGRESS';
      patch[`roster_mail/${safe(owner)}/items/${safe(aid)}/taskAvailabilityV333`]='ACTIVE';
      patch[`roster_mail/${safe(owner)}/items/${safe(aid)}/updatedAtMs`]=now;

      patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/status`]='IN_PROGRESS';
      patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/statusLabel`]='ĐANG LÀM';
      patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/availability`]='ACTIVE';
      patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/independentDep`]=true;
      patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/updatedAtMs`]=now;
      count++;
    }

    if(count){
      await db('').update(patch);
      lateArrRepairs+=count;
      lastAction=`LATE_ARR_PROTECT:${count}`;
      lastAtMs=Date.now();
    }
    return count;
  }

  function currentArrContext(){
    try{
      const meta=root.currentFlightSessionMeta?.()||null;
      const aid=S(meta?.rosterAssignmentId),fid=S(meta?.rosterFlightId),date=S(meta?.rosterOpDate)||opDate();
      return aid&&fid?{aid,fid,date}:null;
    }catch(_){return null}
  }

  function patchReceive(){
    const base=root.v324ReceiveOrOpen;
    if(typeof base!=='function')return false;
    if(base.__v2210IndependentDep){receivePatched=true;return true}

    const wrapped=async function(fid){
      try{
        const cand=await independentCandidate(S(fid));
        if(cand){
          const result=await claimIndependent(cand);
          await ensureLocalAndOpen(cand.dep,result.env);
          independentClaims+=result.existing?0:0;
          return true;
        }
      }catch(e){
        alert('Không nhận được DEP độc lập: '+S(e?.message||e));
        return false;
      }
      return base.apply(this,arguments);
    };
    wrapped.__v2210IndependentDep=1;
    wrapped.__v2210Base=base;
    root.v324ReceiveOrOpen=wrapped;
    try{v324ReceiveOrOpen=wrapped}catch(_){}
    receivePatched=true;
    return true;
  }

  function patchList(){
    const base=root.flightWorkspaceOpenList;
    if(typeof base!=='function')return false;
    if(base.__v2210IndependentDep){listPatched=true;return true}

    let listRun=null;
    const wrapped=async function(d){
      const date=S(d)||opDate(),self=this,args=arguments;
      if(listRun)return listRun;
      listRun=(async()=>{
        try{await markIndependentEligible(date)}catch(e){console.info('V2.2.10 MY FLIGHT independent eligibility',e?.message||e)}
        return base.apply(self,args);
      })();
      try{return await listRun}finally{listRun=null}
    };
    wrapped.__v2210IndependentDep=1;
    wrapped.__v2210Base=base;
    root.flightWorkspaceOpenList=wrapped;
    listPatched=true;
    return true;
  }

  function patchComplete(){
    const base=root.v324ConfirmRosterHandover;
    if(typeof base!=='function')return false;
    if(base.__v2210IndependentDep){completePatched=true;return true}

    const wrapped=async function(){
      const before=currentArrContext();
      const r=await base.apply(this,arguments);
      if(before){
        setTimeout(()=>{
          repairIndependentAfterLateArr(before.date,before.fid).catch(e=>
            console.info('V2.2.10 late ARR protection',e?.message||e)
          );
        },80);
        setTimeout(()=>{
          repairIndependentAfterLateArr(before.date,before.fid).catch(()=>{});
        },500);
      }
      return r;
    };
    wrapped.__v2210IndependentDep=1;
    wrapped.__v2210Base=base;
    root.v324ConfirmRosterHandover=wrapped;
    try{v324ConfirmRosterHandover=wrapped}catch(_){}
    completePatched=true;
    return true;
  }

  function install(){
    patchReceive();
    patchList();
    patchComplete();
  }

  install();
  setTimeout(install,250);
  setTimeout(install,800);
  setTimeout(install,1600);
  setTimeout(install,3200);

  window.addEventListener('pageshow',()=>{
    setTimeout(install,70);
    setTimeout(()=>markIndependentEligible(opDate()).catch(()=>{}),180);
  },{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden){
      setTimeout(install,70);
      // Event-driven refresh only. No heartbeat.
      setTimeout(()=>markIndependentEligible(opDate()).catch(()=>{}),180);
    }
  },{passive:true});

  root.sagsV2210DepDiagnostics=async function(fid=''){
    const date=opDate(),man=await manifest(date),f=S(fid),u=me(),rows=[];
    for(const dep of items(man)){
      const flightId=fidOf(man,dep,date);
      if(!isDep(dep)||norm(dep.user||dep.targetUser)!==u||(f&&flightId!==f))continue;
      const st=await sessionState(dep.assignmentId),pred=await predecessorInfo(date,man,dep);
      rows.push({
        assignmentId:S(dep.assignmentId),
        flightId,
        formGroup:S(dep.formGroup),
        workPartOrder:Number(dep.workPartOrder||0),
        claimStatus:S(st.claimStatus),
        taskStatus:S(st.taskStatusV333),
        availability:S(st.taskAvailabilityV333),
        predecessorExists:pred.exists,
        predecessorDone:pred.done,
        predecessorAssignmentId:S(pred?.item?.assignmentId),
        predecessorStatus:S(pred?.st?.claimStatus||pred?.st?.taskStatusV333),
        independentEligible:st?.v2210IndependentEligible===true,
        independentDep:st?.v2210IndependentDep===true,
        independentReason:S(st?.v2210IndependentReason),
        departureOnly:st?.v2210DepartureOnly===true,
        workspacePath:`flight_records/${date}/${flightId}`
      });
    }
    return {
      build:BUILD,
      oneFlightOneWorkspace:true,
      date,
      user:u,
      receivePatched:!!root.v324ReceiveOrOpen?.__v2210IndependentDep,
      listPatched:!!root.flightWorkspaceOpenList?.__v2210IndependentDep,
      completePatched:!!root.v324ConfirmRosterHandover?.__v2210IndependentDep,
      independentClaims,
      eligibilityUpdates,
      lateArrRepairs,
      lastAction,
      lastAtMs,
      rows
    };
  };
})(typeof window!=='undefined'?window:globalThis);

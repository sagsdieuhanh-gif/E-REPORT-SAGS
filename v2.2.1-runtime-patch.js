/* E-REPORT/SAGS V2.2.1 · ARR -> DEP NEXT USER FIX
 * BUILD: V2.2.1-ARRDEP-NEXT-DEP-FIX
 * Base: V2.2-ARRDEP-CHOICE-LOCALFIRST
 *
 * Mục tiêu:
 * - Giữ nguyên V2.2 làm nền.
 * - Khi ARR đã HOÀN TẤT, DEP của người sau phải nhận đúng dấu bàn giao.
 * - Khi người sau mở chuyến DEP lần đầu, luôn có lựa chọn TIẾP TỤC / TẠO TỜ DEP MỚI.
 * - TẠO TỜ DEP MỚI phải thật sự mở một envelope DEP mới, không bị shared workspace kéo lại dữ liệu ARR.
 * - Sửa được cả trường hợp V2.2 trước đó đã ghi NEW_DEP nhưng envelope bị trả về tờ ARR.
 */
(function(root){
  'use strict';
  const BUILD='V2.2.1-ARRDEP-NEXT-DEP-FIX';
  if(root.__SAGS_V221_ARRDEP_FIX===BUILD)return;
  root.__SAGS_V221_ARRDEP_FIX=BUILD;

  const S=v=>String(v??'').trim();
  const U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(_){return null}};
  const normUser=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}};

  function profile(){try{return root.__sagsGetSession?.()?.profile||root.currentUserProfile||{}}catch(_){return root.currentUserProfile||{}}}
  function me(){const p=profile();return normUser(p.username||p.userName||p.code||'')}
  function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function activeMeta(){try{return root.currentFlightSessionMeta?.()||null}catch(_){return null}}
  function opDate(){return S(document.getElementById('fwcDate')?.value)||S(sessionStorage.getItem('sagsV36FwcDate'))||S(activeMeta()?.rosterOpDate)||today()}
  function db(path=''){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase chưa sẵn sàng.');return root.sagsV470Ref(path)}
  async function once(path){return (await db(path).once('value')).val()}
  async function manifest(date){return (await once(`roster_manifests/${safe(date)}`).catch(()=>null))||{}}
  function allItems(man){const it=man?.items;return (Array.isArray(it)?it:Object.values(it||{})).filter(Boolean)}
  function activeItems(man){return allItems(man).filter(x=>x.active!==false&&!x.duplicateInactive)}
  function fidOf(man,x,date=''){const fid=S(x?.flightId)||S(root.sagsV346ResolveRosterFlightId?.(S(date||man?.opDate)||opDate(),x,{}));if(fid&&x&&!x.flightId)x.flightId=fid;return fid}

  function canonicalForm(x){const g=U(x?.formGroup||x);if(g==='FSAGS'||g==='FSAGS423')return 'FSAGS423';return g||'FORM'}
  function sourceFamily(x){
    const src=U(x?.sourceColumn),rk=U(x?.roleKey),fg=U(x?.formGroup);
    if(rk==='CBTT'||src.includes('GRND_LS')||fg==='FINAL')return 'GRND_LS';
    if(rk==='PAX09'||src.includes('PAX_SUPR')||fg==='FSAGS09')return 'PAX_SUPR';
    if((rk==='LD'||fg==='FSAGS551'||src==='GRND_LD')&&!src.includes('GRND_COR'))return 'GRND_LD';
    if(['COR','BOTH'].includes(rk)||src.includes('GRND_COR')||['FSAGS','FSAGS423','FSAGS421'].includes(fg))return 'GRND_COR';
    return src||rk||fg||'ROSTER';
  }
  function sameWorkFamily(a,b){return canonicalForm(a)===canonicalForm(b)&&sourceFamily(a)===sourceFamily(b)}
  function isArr(x){return U(x?.assignmentLeg)==='ARR'}
  function isDep(x){return U(x?.assignmentLeg)==='DEP'}
  function done(st){
    const c=U(st?.claimStatus),w=U(st?.workPartStatus),t=U(st?.taskStatusV333||st?.taskStatus);
    return !!st?.completionEnvelope||Number(st?.completedAtMs||st?.completionEnvelopeAtMs||0)>0||['PART_COMPLETED','COMPLETED','HANDED_OVER'].includes(c)||w==='COMPLETED'||t==='COMPLETED';
  }
  function cleanEnvelope(env){
    const x=env&&typeof env==='object'?env:{},src=x.state&&typeof x.state==='object'?x.state:{},state={};
    for(const [k,v] of Object.entries(src)){if(/attachment/i.test(k))continue;try{const z=JSON.stringify(v);if(z.length<=180000)state[k]=JSON.parse(z)}catch(_){}}
    return {state,mainForm:S(x.mainForm||x.activeFormGroup||'fsags'),activeFormGroup:S(x.mainForm||x.activeFormGroup||'fsags'),currentPage:Number(x.currentPage)||1,scrollY:0,arrivalOp:S(x.arrivalOp||'passenger'),departureOp:S(x.departureOp||'passenger'),rosterSeed:clone(x.rosterSeed||{})||{}};
  }
  function identityKey(raw){
    let k=S(raw).replace(/^f(?:423|421|551|09)_/i,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
    return /^(fltbefore|fltafter|flightbefore|flightafter|flight|flightno|flightnumber|fltno|arrflight|depflight|route|route1|route2|route3|acreg|aircraftreg|registration|aircraft|flightdate|opdate|date|std|etd|sta|eta|bay|gate)$/.test(k);
  }
  function baselineEnvelope(src,item,prev){
    src=cleanEnvelope(src);const state={},seed={};
    for(const [k,v] of Object.entries(src.state||{}))if(identityKey(k))state[k]=clone(v);
    for(const [k,v] of Object.entries(src.rosterSeed||{}))if(identityKey(k))seed[k]=clone(v);
    return {
      state,rosterSeed:seed,
      mainForm:S(item?.formGroup||src.mainForm||'fsags'),activeFormGroup:S(item?.formGroup||src.activeFormGroup||src.mainForm||'fsags'),
      currentPage:1,scrollY:0,arrivalOp:S(src.arrivalOp||'passenger'),departureOp:S(src.departureOp||'passenger'),
      rosterAssignmentId:S(item?.assignmentId),v22Phase:'DEP',v22DepNewSheet:true,
      v221DepNewSheet:true,v221SourceArrAssignmentId:S(prev?.assignmentId),v221CreatedAtMs:Date.now()
    };
  }

  async function sessionState(aid){return (await once(`roster_sessions/${safe(aid)}`).catch(()=>null))||{}}
  async function flightRecord(date,fid){return (await once(`flight_records/${safe(date)}/${safe(fid)}`).catch(()=>null))||{}}

  async function findArrPredecessor(date,man,dep,depSt){
    const depAid=S(dep?.assignmentId),fid=fidOf(man,dep,date);if(!depAid||!fid)return null;
    const explicit=S(depSt?.handoverFromAssignmentId);
    if(explicit){const item=allItems(man).find(x=>S(x.assignmentId)===explicit)||null;if(item){const st=await sessionState(explicit);if(done(st))return {item,st,reason:'HANDOVER_FROM'}}}

    const rec=await flightRecord(date,fid);
    const history=Object.values(rec?.workPartHistory||{}).filter(Boolean).sort((a,b)=>Number(b?.atMs||0)-Number(a?.atMs||0));
    const h=history.find(ev=>S(ev?.nextAssignmentId)===depAid&&U(ev?.type)==='WORK_PART_COMPLETED'&&U(ev?.status)==='COMPLETED');
    if(h?.assignmentId){const item=allItems(man).find(x=>S(x.assignmentId)===S(h.assignmentId))||null;if(item){const st=await sessionState(h.assignmentId);if(done(st))return {item,st,reason:'WORK_HISTORY'}}}

    const arrs=activeItems(man).filter(x=>isArr(x)&&S(x.assignmentId)!==depAid&&fidOf(man,x,date)===fid&&canonicalForm(x)===canonicalForm(dep));
    const candidates=[];
    for(const item of arrs){const st=await sessionState(item.assignmentId);if(!done(st))continue;let score=0;if(sameWorkFamily(item,dep))score+=100;if(sourceFamily(item)===sourceFamily(dep))score+=30;const ao=Number(item.workPartOrder||0),dd=Number(dep.workPartOrder||0);if(ao&&dd&&ao<dd)score+=20;score+=Math.min(10,Number(st.completedAtMs||0)/1e13);candidates.push({item,st,score,reason:'COMPLETED_ARR'})}
    candidates.sort((a,b)=>b.score-a.score||Number(b.st?.completedAtMs||0)-Number(a.st?.completedAtMs||0));
    return candidates[0]||null;
  }

  function ensureChoiceUi(){
    let m=document.getElementById('v221DepChoiceModal');if(m)return m;
    const st=document.createElement('style');st.id='v221DepChoiceStyle';st.textContent=`
      #v221DepChoiceModal{position:fixed;inset:0;z-index:26850;background:rgba(0,0,0,.6);display:none;align-items:center;justify-content:center;padding:14px;box-sizing:border-box;font-family:Arial,sans-serif}
      #v221DepChoiceModal .v221box{width:min(94vw,450px);background:#fff;border-radius:17px;padding:16px;box-shadow:0 18px 55px rgba(0,0,0,.36);color:#17324d}
      #v221DepChoiceModal h3{margin:0 0 8px;color:#064f9e;font-size:19px}#v221DepChoiceModal p{font-size:13px;line-height:1.45;margin:7px 0;color:#425466}
      #v221DepChoiceModal .v221actions{display:grid;gap:9px;margin-top:13px}#v221DepChoiceModal button{border:0;border-radius:11px;padding:13px 10px;font:900 13px Arial}
      #v221Continue{background:#e8f4ff;color:#07599d}#v221New{background:#eaf7ef;color:#17663b}#v221Later{background:#eef1f4;color:#5b6874}`;
    document.head.appendChild(st);m=document.createElement('div');m.id='v221DepChoiceModal';m.innerHTML=`<div class="v221box"><h3>PHẦN DEP ĐÃ SẴN SÀNG</h3><p>Phần ARR trước đã <b>HOÀN TẤT</b>. Chọn cách làm DEP:</p><div class="v221actions"><button id="v221Continue" type="button">TIẾP TỤC TỜ HIỆN TẠI</button><button id="v221New" type="button">TẠO TỜ DEP MỚI</button><button id="v221Later" type="button">ĐỂ SAU</button></div><p><b>TỜ DEP MỚI</b> chỉ giữ thông tin nhận dạng/lịch chuyến cần thiết; dữ liệu khai thác ARR vẫn được giữ nguyên trong snapshot hoàn tất của ARR.</p></div>`;document.body.appendChild(m);return m;
  }
  function chooseDep(){
    const m=ensureChoiceUi();m.style.display='flex';return new Promise(resolve=>{
      const doneChoice=v=>{m.style.display='none';for(const id of ['v221Continue','v221New','v221Later']){const b=document.getElementById(id);if(b)b.onclick=null}resolve(v)};
      document.getElementById('v221Continue').onclick=()=>doneChoice('CONTINUE');document.getElementById('v221New').onclick=()=>doneChoice('NEW_DEP');document.getElementById('v221Later').onclick=()=>doneChoice('CANCEL');
    });
  }

  async function ensureDepInstance(date,dep,mode,arr){
    const fid=S(fidOf(await manifest(date),dep,date)),form=canonicalForm(dep),aid=S(dep.assignmentId),path=`flight_records/${safe(date)}/${safe(fid)}/forms/${safe(form)}`,now=Date.now();
    const instanceId=`DEP_${safe(aid)}_${mode==='NEW_DEP'?'NEW':'CONT'}`;
    let current=null;try{current=(await db(`${path}/activeDepInstance`).once('value')).val()||null}catch(_){}
    if(current&&U(current.status)==='ACTIVE'&&S(current.assignmentId)!==aid){const old=await sessionState(current.assignmentId);if(!done(old))throw new Error(`Đang có tờ DEP khác hoạt động (${S(current.instanceId)||S(current.assignmentId)}).`)}
    const lock={schema:2,engine:BUILD,instanceId,assignmentId:aid,mode,status:'ACTIVE',ownerUser:me(),sourceArrAssignmentId:S(arr?.assignmentId),createdAtMs:Number(current?.createdAtMs||now)||now,updatedAtMs:now};
    await db(`${path}/activeDepInstance`).set(lock);await db(`${path}/instances/${safe(instanceId)}`).update(lock);return {instanceId,path};
  }
  function localMeta(aid){try{return (root.readFlightSessionList?.()||[]).find(x=>S(x?.rosterAssignmentId)===S(aid))||null}catch(_){return null}}
  function writeLocalEnvelope(aid,env){
    try{const lm=localMeta(aid);if(lm?.id&&typeof root.flightSessionStorageKey==='function')localStorage.setItem(root.flightSessionStorageKey(lm.id),JSON.stringify(env))}catch(e){console.info('V2.2.1 local DEP envelope',e?.message||e)}
  }
  async function prepareNewDep(date,man,dep,depSt,arrInfo){
    const arr=arrInfo?.item||null,arrSt=arrInfo?.st||{};const inst=await ensureDepInstance(date,dep,'NEW_DEP',arr),now=Date.now();
    const src=arrSt?.completionEnvelope||depSt?.handoverEnvelope||arrSt?.envelope||depSt?.envelope||{};const env=baselineEnvelope(src,dep,arr);env.v22FormInstanceId=inst.instanceId;env.v221FormInstanceId=inst.instanceId;
    const patch={};const aid=S(dep.assignmentId),fid=fidOf(man,dep,date),wk=S(dep.workspaceKey||dep.rosterWorkspaceKey);
    patch[`roster_sessions/${safe(aid)}/envelope`]=env;patch[`roster_sessions/${safe(aid)}/envelopeUpdatedAtMs`]=now;patch[`roster_sessions/${safe(aid)}/handoverEnvelope`]=env;patch[`roster_sessions/${safe(aid)}/handoverEnvelopeAtMs`]=now;
    patch[`roster_sessions/${safe(aid)}/handoverFromAssignmentId`]=S(arr?.assignmentId);patch[`roster_sessions/${safe(aid)}/handoverFromUser`]=normUser(arrSt?.completedBy||arr?.user||arr?.targetUser);
    patch[`roster_sessions/${safe(aid)}/previousPartCompletedAtMs`]=Number(arrSt?.completedAtMs||arrSt?.completionEnvelopeAtMs||now);patch[`roster_sessions/${safe(aid)}/workPartReady`]=true;patch[`roster_sessions/${safe(aid)}/handoverReady`]=true;
    patch[`roster_sessions/${safe(aid)}/v22DepChoice`]='NEW_DEP';patch[`roster_sessions/${safe(aid)}/v22DepChoiceAtMs`]=now;patch[`roster_sessions/${safe(aid)}/v22DepChoiceBy`]=me();patch[`roster_sessions/${safe(aid)}/v22FormInstanceId`]=inst.instanceId;patch[`roster_sessions/${safe(aid)}/v22FormInstanceMode`]='NEW_DEP';patch[`roster_sessions/${safe(aid)}/v22DepNewSheet`]=true;
    patch[`roster_sessions/${safe(aid)}/v221RepairBuild`]=BUILD;patch[`roster_sessions/${safe(aid)}/v221PreparedAtMs`]=now;patch[`roster_sessions/${safe(aid)}/v221PreparedBy`]=me();
    if(wk){patch[`roster_flight_workspaces/${safe(wk)}/envelope`]=cleanEnvelope(env);patch[`roster_flight_workspaces/${safe(wk)}/envelopeUpdatedAtMs`]=now;patch[`roster_flight_workspaces/${safe(wk)}/updatedAtMs`]=now;patch[`roster_flight_workspaces/${safe(wk)}/updatedBy`]=me();patch[`roster_flight_workspaces/${safe(wk)}/v221Phase`]='DEP';patch[`roster_flight_workspaces/${safe(wk)}/v221DepAssignmentId`]=aid;}
    if(fid){patch[`flight_records/${safe(date)}/${safe(fid)}/forms/${safe(canonicalForm(dep))}/v221LastDepAssignmentId`]=aid;patch[`flight_records/${safe(date)}/${safe(fid)}/forms/${safe(canonicalForm(dep))}/v221LastDepCreatedAtMs`]=now;}
    await db('').update(patch);writeLocalEnvelope(aid,env);root.__SAGS_V221_LAST_DEP={mode:'NEW_DEP',date,aid,fid,arrAid:S(arr?.assignmentId),atMs:now};return env;
  }
  async function prepareContinue(date,man,dep,depSt,arrInfo){
    const arr=arrInfo?.item||null,arrSt=arrInfo?.st||{};const inst=await ensureDepInstance(date,dep,'CONTINUE',arr),now=Date.now(),aid=S(dep.assignmentId),patch={};
    patch[`roster_sessions/${safe(aid)}/v22DepChoice`]='CONTINUE';patch[`roster_sessions/${safe(aid)}/v22DepChoiceAtMs`]=now;patch[`roster_sessions/${safe(aid)}/v22DepChoiceBy`]=me();patch[`roster_sessions/${safe(aid)}/v22FormInstanceId`]=inst.instanceId;patch[`roster_sessions/${safe(aid)}/v22FormInstanceMode`]='CONTINUE_CURRENT';
    patch[`roster_sessions/${safe(aid)}/handoverFromAssignmentId`]=S(arr?.assignmentId);patch[`roster_sessions/${safe(aid)}/handoverFromUser`]=normUser(arrSt?.completedBy||arr?.user||arr?.targetUser);patch[`roster_sessions/${safe(aid)}/previousPartCompletedAtMs`]=Number(arrSt?.completedAtMs||arrSt?.completionEnvelopeAtMs||now);patch[`roster_sessions/${safe(aid)}/v221PreparedAtMs`]=now;patch[`roster_sessions/${safe(aid)}/v221PreparedBy`]=me();
    await db('').update(patch);root.__SAGS_V221_LAST_DEP={mode:'CONTINUE',date,aid,fid:fidOf(man,dep,date),arrAid:S(arr?.assignmentId),atMs:now};
  }

  async function depCandidate(date,man,fid){
    const user=me(),deps=activeItems(man).filter(x=>isDep(x)&&fidOf(man,x,date)===S(fid)&&normUser(x.user||x.targetUser)===user);
    const rows=[];for(const dep of deps){const st=await sessionState(dep.assignmentId);if(done(st))continue;const arr=await findArrPredecessor(date,man,dep,st);if(arr)rows.push({dep,st,arr})}
    rows.sort((a,b)=>Number(a.dep.workPartOrder||999)-Number(b.dep.workPartOrder||999));return rows[0]||null;
  }

  async function prepareBeforeOpen(fid){
    const date=opDate(),man=await manifest(date),cand=await depCandidate(date,man,fid);if(!cand)return {handled:false};
    const {dep,st,arr}=cand,choice=U(st.v22DepChoice);
    if(choice==='NEW_DEP'){
      const good=st?.v22DepNewSheet===true&&(st?.envelope?.v22DepNewSheet===true||st?.envelope?.v221DepNewSheet===true);
      if(!good){await prepareNewDep(date,man,dep,st,arr);return {handled:true,repaired:true,mode:'NEW_DEP'}}
      return {handled:true,mode:'NEW_DEP'};
    }
    if(choice==='CONTINUE')return {handled:true,mode:'CONTINUE'};
    const selected=await chooseDep();if(selected==='CANCEL')return {handled:true,cancel:true};
    if(selected==='NEW_DEP')await prepareNewDep(date,man,dep,st,arr);else await prepareContinue(date,man,dep,st,arr);
    return {handled:true,mode:selected};
  }

  async function linkArrToDepAfterComplete(before){
    if(!before?.aid||!before?.item||!isArr(before.item))return false;
    const after=await sessionState(before.aid);if(!done(after))return false;
    const date=before.date,man=await manifest(date),fid=fidOf(man,before.item,date);if(!fid)return false;
    const deps=activeItems(man).filter(x=>isDep(x)&&fidOf(man,x,date)===fid&&canonicalForm(x)===canonicalForm(before.item));
    if(!deps.length)return false;
    const same=deps.filter(x=>sameWorkFamily(x,before.item)),pool=same.length?same:deps;
    pool.sort((a,b)=>Number(a.workPartOrder||999)-Number(b.workPartOrder||999));
    let dep=null,depSt=null;for(const x of pool){const st=await sessionState(x.assignmentId);if(done(st))continue;dep=x;depSt=st;break}if(!dep)return false;
    const aid=S(dep.assignmentId),now=Date.now(),env=after.completionEnvelope||after.envelope||{},patch={};
    if(!S(depSt?.handoverFromAssignmentId))patch[`roster_sessions/${safe(aid)}/handoverFromAssignmentId`]=before.aid;
    patch[`roster_sessions/${safe(aid)}/handoverFromUser`]=normUser(after.completedBy||before.item.user||before.item.targetUser);patch[`roster_sessions/${safe(aid)}/previousPartCompletedAtMs`]=Number(after.completedAtMs||after.completionEnvelopeAtMs||now);patch[`roster_sessions/${safe(aid)}/workPartReady`]=true;patch[`roster_sessions/${safe(aid)}/handoverReady`]=true;
    if(env&&Object.keys(env).length){patch[`roster_sessions/${safe(aid)}/handoverEnvelope`]=cleanEnvelope(env);patch[`roster_sessions/${safe(aid)}/handoverEnvelopeAtMs`]=now}
    if(!S(depSt?.claimStatus)||['UNCLAIMED','WAIT','WAITING','READY'].includes(U(depSt?.claimStatus)))patch[`roster_sessions/${safe(aid)}/claimStatus`]='READY';
    if(!S(depSt?.taskStatusV333)||['UNCLAIMED','WAIT','WAITING'].includes(U(depSt?.taskStatusV333)))patch[`roster_sessions/${safe(aid)}/taskStatusV333`]='UNCLAIMED';
    patch[`roster_sessions/${safe(aid)}/v221ArrReadyAtMs`]=now;patch[`roster_sessions/${safe(aid)}/v221ArrReadyFromAssignmentId`]=before.aid;patch[`roster_sessions/${safe(aid)}/v221ArrReadyBuild`]=BUILD;
    await db('').update(patch);return true;
  }

  function captureArrContext(){
    const meta=activeMeta(),aid=S(meta?.rosterAssignmentId);if(!aid)return null;return {meta,aid,date:S(meta?.rosterOpDate)||opDate()};
  }
  async function fillArrItem(ctx){if(!ctx)return null;const man=await manifest(ctx.date),item=allItems(man).find(x=>S(x.assignmentId)===ctx.aid)||null;return item?{...ctx,item}:null}

  function patchReceive(){
    const base=root.v324ReceiveOrOpen;if(typeof base!=='function'||base.__v221ArrDepFix)return false;
    const wrapped=async function(fid){
      try{const prep=await prepareBeforeOpen(S(fid));if(prep?.cancel)return false}catch(e){alert('Không chuẩn bị được phần DEP: '+S(e?.message||e));return false}
      const r=await base.apply(this,arguments);
      // Sau khi core mở session, nếu NEW_DEP thì ép lại local envelope một lần để tránh wrapper shared-workspace cũ trả về ARR.
      setTimeout(async()=>{try{const meta=activeMeta(),aid=S(meta?.rosterAssignmentId);if(!aid)return;const st=await sessionState(aid);if(U(st?.v22DepChoice)!=='NEW_DEP'||!st?.envelope?.v22DepNewSheet)return;const lm=localMeta(aid);if(lm?.id)writeLocalEnvelope(aid,st.envelope)}catch(_){}},90);
      return r;
    };
    wrapped.__v221ArrDepFix=1;wrapped.__v221Base=base;root.v324ReceiveOrOpen=wrapped;try{v324ReceiveOrOpen=wrapped}catch(_){}return true;
  }
  function patchComplete(){
    const base=root.v324ConfirmRosterHandover;if(typeof base!=='function'||base.__v221ArrDepFix)return false;
    const wrapped=async function(){let before=null;try{before=await fillArrItem(captureArrContext())}catch(_){}const r=await base.apply(this,arguments);try{await linkArrToDepAfterComplete(before)}catch(e){console.warn('V2.2.1 ARR->DEP link',e)}return r};
    wrapped.__v221ArrDepFix=1;wrapped.__v221Base=base;root.v324ConfirmRosterHandover=wrapped;try{v324ConfirmRosterHandover=wrapped}catch(_){}return true;
  }
  function install(){patchReceive();patchComplete()}
  install();setTimeout(install,300);setTimeout(install,900);setTimeout(install,1600);setTimeout(install,3000);
  window.addEventListener('pageshow',()=>setTimeout(install,80),{passive:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(install,80)},{passive:true});

  root.sagsV221ArrDepDiagnostics=async function(){
    const date=opDate(),meta=activeMeta(),aid=S(meta?.rosterAssignmentId),st=aid?await sessionState(aid):{};
    return {build:BUILD,baseV22:root.__SAGS_V22_RUNTIME_PATCH||'',date,activeAssignmentId:aid,activeChoice:S(st?.v22DepChoice),activeNewDep:!!st?.envelope?.v22DepNewSheet,lastDep:root.__SAGS_V221_LAST_DEP||null,receivePatched:!!root.v324ReceiveOrOpen?.__v221ArrDepFix,completePatched:!!root.v324ConfirmRosterHandover?.__v221ArrDepFix};
  };
})(typeof window!=='undefined'?window:globalThis);

/* E-REPORT/SAGS V2.2 · ARR/DEP CHOICE + LOCAL-FIRST AUTOSAVE
 * BUILD: V2.2-ARRDEP-CHOICE-LOCALFIRST
 *
 * Runtime-only patch: no manual app.js edit required.
 * - First DEP open after an ARR handover: CONTINUE CURRENT SHEET or CREATE NEW DEP SHEET.
 * - NEW DEP keeps only common flight identity/schedule fields; ARR operational entries stay in ARR completion snapshot.
 * - One active DEP form instance per flight/form.
 * - Local-first autosave + background/pagehide checkpoint + pending cloud sync recovery.
 */
(function(root){
  'use strict';
  const BUILD='V2.2-ARRDEP-CHOICE-LOCALFIRST';
  if(root.__SAGS_V22_RUNTIME_PATCH===BUILD)return;
  root.__SAGS_V22_RUNTIME_PATCH=BUILD;

  const S=v=>String(v??'').trim();
  const U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(_){return null}};
  const normUser=v=>U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_');
  const ownedKey=k=>{try{return typeof root.sagsOwnedKey==='function'?root.sagsOwnedKey(k):k}catch(_){return k}};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  function session(){try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}}
  function me(){const p=session()?.profile||root.currentUserProfile||{};return normUser(p.username||p.userName||p.code||'')}
  function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function opDate(){return S(document.getElementById('fwcDate')?.value)||S(sessionStorage.getItem('sagsV36FwcDate'))||S(activeMeta()?.rosterOpDate)||today()}
  function activeMeta(){try{return root.currentFlightSessionMeta?.()||null}catch(_){return null}}
  function listMeta(aid){try{return (root.readFlightSessionList?.()||[]).find(x=>S(x.rosterAssignmentId)===S(aid))||null}catch(_){return null}}
  function db(path=''){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase chưa sẵn sàng.');return root.sagsV470Ref(path)}
  async function once(path){return (await db(path).once('value')).val()}
  async function manifest(date){return (await once(`roster_manifests/${safe(date)}`))||{}}
  function itemsOf(man){const it=man?.items;return Array.isArray(it)?it.filter(Boolean):Object.values(it||{}).filter(Boolean)}

  function canonicalForm(v){v=U(v);if(v==='FSAGS'||v==='FSAGS423')return 'FSAGS423';return v||'FORM'}
  function sameLane(a,b){
    if(S(a?.flightId)!==S(b?.flightId))return false;
    if(canonicalForm(a?.formGroup)!==canonicalForm(b?.formGroup))return false;
    const as=U(a?.sourceColumn),bs=U(b?.sourceColumn);
    if(as&&bs&&as!==bs)return false;
    const ar=U(a?.roleKey),br=U(b?.roleKey);
    if(!as&&!bs&&ar&&br&&ar!==br)return false;
    return true;
  }
  function depSourceArr(man,item,st){
    const explicit=S(st?.handoverFromAssignmentId);
    if(explicit){const x=itemsOf(man).find(v=>S(v.assignmentId)===explicit);if(x)return x}
    const pool=itemsOf(man).filter(x=>S(x.assignmentId)!==S(item?.assignmentId)&&sameLane(x,item)&&U(x.assignmentLeg)==='ARR');
    pool.sort((a,b)=>Number(b.workPartOrder||0)-Number(a.workPartOrder||0));
    return pool[0]||null;
  }
  function completed(st){const c=U(st?.claimStatus),w=U(st?.workPartStatus),t=U(st?.taskStatusV333||st?.taskStatus);return !!st?.completionEnvelope||['PART_COMPLETED','COMPLETED','HANDED_OVER'].includes(c)||w==='COMPLETED'||t==='COMPLETED'}
  function currentEnvelope(meta){try{return root.readFlightSessionEnvelope?.(meta?.id)||null}catch(_){return null}}

  /* ---------- DEP choice ---------- */
  function ensureChoiceUi(){
    if(document.getElementById('v22DepChoiceModal'))return;
    const st=document.createElement('style');st.id='v22DepChoiceStyle';st.textContent=`
      #v22DepChoiceModal{position:fixed;inset:0;z-index:26000;background:rgba(0,0,0,.58);display:none;align-items:center;justify-content:center;padding:14px;box-sizing:border-box;font-family:Arial,sans-serif}
      #v22DepChoiceModal .box{width:min(94vw,440px);background:#fff;border-radius:16px;padding:16px;box-shadow:0 18px 50px rgba(0,0,0,.35);color:#17324d}
      #v22DepChoiceModal h3{margin:0 0 8px;color:#064f9e;font-size:18px}#v22DepChoiceModal p{font-size:13px;line-height:1.45;margin:7px 0;color:#425466}
      #v22DepChoiceModal .actions{display:grid;gap:8px;margin-top:13px}#v22DepChoiceModal button{border:0;border-radius:11px;padding:12px 10px;font:800 13px Arial}
      #v22DepChoiceContinue{background:#e8f4ff;color:#07599d}#v22DepChoiceNew{background:#eaf7ef;color:#17663b}#v22DepChoiceCancel{background:#eef1f4;color:#5b6874}
      #v22DepBadge{position:fixed;right:10px;bottom:max(10px,env(safe-area-inset-bottom));z-index:15000;display:none;padding:5px 8px;border-radius:999px;background:#eaf7ef;color:#17663b;border:1px solid #b8dec7;font:900 10px Arial;box-shadow:0 2px 7px rgba(0,0,0,.12)}
      #v22SaveBadge{position:fixed;left:10px;bottom:max(10px,env(safe-area-inset-bottom));z-index:15000;display:none;padding:5px 8px;border-radius:999px;background:#eef4f8;color:#526777;border:1px solid #ccd9e3;font:800 10px Arial;box-shadow:0 2px 7px rgba(0,0,0,.1)}
    `;document.head.appendChild(st);
    const m=document.createElement('div');m.id='v22DepChoiceModal';m.innerHTML=`<div class="box"><h3>PHẦN DEP</h3><p>Phần ARR trước đã hoàn tất. Chọn cách thực hiện DEP:</p><div class="actions"><button id="v22DepChoiceContinue" type="button">TIẾP TỤC TỜ HIỆN TẠI</button><button id="v22DepChoiceNew" type="button">TẠO TỜ DEP MỚI</button><button id="v22DepChoiceCancel" type="button">ĐỂ SAU</button></div><p><b>Tờ DEP mới</b> chỉ giữ thông tin nhận dạng/lịch chuyến cơ bản; dữ liệu khai thác ARR không bị sao chép sang DEP.</p></div>`;document.body.appendChild(m);
    const dep=document.createElement('div');dep.id='v22DepBadge';document.body.appendChild(dep);
    const save=document.createElement('div');save.id='v22SaveBadge';document.body.appendChild(save);
  }
  function chooseDep(){
    ensureChoiceUi();const m=document.getElementById('v22DepChoiceModal');m.style.display='flex';
    return new Promise(resolve=>{
      const done=v=>{m.style.display='none';for(const id of ['v22DepChoiceContinue','v22DepChoiceNew','v22DepChoiceCancel'])document.getElementById(id).onclick=null;resolve(v)};
      document.getElementById('v22DepChoiceContinue').onclick=()=>done('CONTINUE');
      document.getElementById('v22DepChoiceNew').onclick=()=>done('NEW_DEP');
      document.getElementById('v22DepChoiceCancel').onclick=()=>done('CANCEL');
    });
  }
  function identityKey(raw){
    let k=S(raw).replace(/^f(?:421|551|09)_/i,'');
    k=k.replace(/[^a-z0-9]/gi,'').toLowerCase();
    return /^(fltbefore|fltafter|flightbefore|flightafter|flightno|flightnumber|route1|route2|route3|acreg|aircraftreg|registration|flightdate|opdate|date|std|etd|sta|eta)$/.test(k);
  }
  function baselineEnvelope(src,item,prev){
    src=src&&typeof src==='object'?src:{};const state={},seed={};
    for(const [k,v] of Object.entries(src.state&&typeof src.state==='object'?src.state:{}))if(identityKey(k))state[k]=clone(v);
    for(const [k,v] of Object.entries(src.rosterSeed&&typeof src.rosterSeed==='object'?src.rosterSeed:{}))if(identityKey(k))seed[k]=clone(v);
    return {
      state,rosterSeed:seed,
      mainForm:S(item?.formGroup||src.mainForm||src.activeFormGroup||'fsags'),
      activeFormGroup:S(item?.formGroup||src.mainForm||src.activeFormGroup||'fsags'),
      currentPage:1,scrollY:0,
      arrivalOp:S(src.arrivalOp||'passenger'),departureOp:S(src.departureOp||'passenger'),
      rosterAssignmentId:S(item?.assignmentId),
      v22Phase:'DEP',v22DepNewSheet:true,v22SourceArrAssignmentId:S(prev?.assignmentId),v22CreatedAtMs:Date.now()
    };
  }
  function depInstanceId(item,mode){return `DEP_${safe(S(item?.assignmentId)||Date.now())}_${mode==='NEW_DEP'?'NEW':'CONT'}`}
  async function acquireDepInstance(date,item,mode,prev){
    const fid=S(item?.flightId),form=canonicalForm(item?.formGroup),aid=S(item?.assignmentId),instanceId=depInstanceId(item,mode),path=`flight_records/${safe(date)}/${safe(fid)}/forms/${safe(form)}`;
    const lockRef=db(`${path}/activeDepInstance`),now=Date.now();
    let tx=null;
    try{tx=await lockRef.transaction(cur=>{
      if(cur&&U(cur.status)==='ACTIVE'&&S(cur.assignmentId)!==aid)return;
      return {schema:1,instanceId,assignmentId:aid,mode,status:'ACTIVE',ownerUser:me(),createdAtMs:Number(cur?.createdAtMs||now)||now,updatedAtMs:now};
    })}catch(e){throw new Error('Không khóa được tờ DEP: '+S(e?.message||e))}
    if(tx&&tx.committed===false){const v=tx.snapshot?.val?.()||{};throw new Error(`Đang có một tờ DEP khác hoạt động (${S(v.instanceId)||'không xác định'}).`)}
    await db(`${path}/instances/${safe(instanceId)}`).update({schema:1,instanceId,phase:'DEP',mode,status:'ACTIVE',assignmentId:aid,sourceArrAssignmentId:S(prev?.assignmentId),ownerUser:me(),createdAtMs:now,updatedAtMs:now});
    return {instanceId,path};
  }
  async function recordContinue(date,item,prev,st){
    const inst=await acquireDepInstance(date,item,'CONTINUE',prev),now=Date.now();
    await db(`roster_sessions/${safe(item.assignmentId)}`).update({v22DepChoice:'CONTINUE',v22DepChoiceAtMs:now,v22DepChoiceBy:me(),v22FormInstanceId:inst.instanceId,v22FormInstanceMode:'CONTINUE_CURRENT'});
    return inst;
  }
  async function prepareNewDep(date,item,prev,st){
    const inst=await acquireDepInstance(date,item,'NEW_DEP',prev),now=Date.now();
    let src=st?.handoverEnvelope||st?.envelope||null;
    if(!src&&prev?.assignmentId){try{const ps=await once(`roster_sessions/${safe(prev.assignmentId)}`);src=ps?.completionEnvelope||ps?.envelope||null}catch(_){}}
    const env=baselineEnvelope(src||{},item,prev);env.v22FormInstanceId=inst.instanceId;
    await db(`roster_sessions/${safe(item.assignmentId)}`).update({
      envelope:env,envelopeUpdatedAtMs:now,handoverEnvelope:env,handoverEnvelopeAtMs:now,
      v22DepChoice:'NEW_DEP',v22DepChoiceAtMs:now,v22DepChoiceBy:me(),v22FormInstanceId:inst.instanceId,v22FormInstanceMode:'NEW_DEP',v22DepNewSheet:true
    });
    const lm=listMeta(item.assignmentId);if(lm?.id&&typeof root.flightSessionStorageKey==='function')try{localStorage.setItem(root.flightSessionStorageKey(lm.id),JSON.stringify(env))}catch(_){}
    return inst;
  }
  function showDepBadge(meta){
    ensureChoiceUi();const b=document.getElementById('v22DepBadge');if(!meta?.id){b.style.display='none';return}
    const env=currentEnvelope(meta)||{},isDep=U(env.v22Phase)==='DEP'||env.v22DepNewSheet===true;
    if(isDep){b.textContent=env.v22DepNewSheet?'DEP ✓ · TỜ MỚI':'DEP ✓';b.style.display='block'}else b.style.display='none';
  }

  let receivePatched=false,completePatched=false;
  function patchReceive(){
    if(receivePatched)return true;const base=root.v324ReceiveOrOpen;if(typeof base!=='function')return false;
    if(base.__v22DepChoice){receivePatched=true;return true}
    const wrapped=async function(fid){
      const date=opDate();
      try{
        const man=await manifest(date),mine=itemsOf(man).filter(x=>S(x.flightId)===S(fid)&&normUser(x.user||x.targetUser)===me());
        const dep=mine.find(x=>U(x.assignmentLeg)==='DEP');
        if(dep){
          const st=(await once(`roster_sessions/${safe(dep.assignmentId)}`))||{};
          const prev=depSourceArr(man,dep,st);let prevSt=null;
          if(prev?.assignmentId)try{prevSt=await once(`roster_sessions/${safe(prev.assignmentId)}`)}catch(_){}
          const hasHandover=!!(st?.handoverEnvelope||st?.handoverFromAssignmentId||(prevSt&&completed(prevSt)));
          if(hasHandover&&!S(st?.v22DepChoice)){
            const choice=await chooseDep();if(choice==='CANCEL')return;
            if(choice==='NEW_DEP')await prepareNewDep(date,dep,prev,st);else await recordContinue(date,dep,prev,st);
          }
        }
      }catch(e){alert('Không chuẩn bị được phần DEP: '+S(e?.message||e));return}
      const r=await base.apply(this,arguments);setTimeout(()=>showDepBadge(activeMeta()),120);return r;
    };
    wrapped.__v22DepChoice=1;root.v324ReceiveOrOpen=wrapped;receivePatched=true;return true;
  }
  function patchComplete(){
    if(completePatched)return true;const base=root.v324ConfirmRosterHandover;if(typeof base!=='function')return false;
    if(base.__v22DepComplete){completePatched=true;return true}
    const wrapped=async function(){
      const meta=activeMeta(),aid=S(meta?.rosterAssignmentId),date=S(meta?.rosterOpDate)||opDate();let before=null;
      if(aid)try{before=await once(`roster_sessions/${safe(aid)}`)}catch(_){}
      const r=await base.apply(this,arguments);
      if(aid&&S(before?.v22FormInstanceId)){
        try{
          const after=(await once(`roster_sessions/${safe(aid)}`))||{};
          if(completed(after)){
            const man=await manifest(date),item=itemsOf(man).find(x=>S(x.assignmentId)===aid),fid=S(item?.flightId),form=canonicalForm(item?.formGroup),iid=S(before.v22FormInstanceId),path=`flight_records/${safe(date)}/${safe(fid)}/forms/${safe(form)}`;
            if(fid&&iid){await db(`${path}/instances/${safe(iid)}`).update({status:'COMPLETED',completedAtMs:Date.now(),completedBy:me(),updatedAtMs:Date.now()});try{await db(`${path}/activeDepInstance`).transaction(cur=>S(cur?.instanceId)===iid?null:cur)}catch(_){}}
          }
        }catch(e){console.warn('V2.2 DEP instance completion',e)}
      }
      return r;
    };
    wrapped.__v22DepComplete=1;root.v324ConfirmRosterHandover=wrapped;completePatched=true;return true;
  }
  function installBusinessHooks(){patchReceive();patchComplete();setTimeout(()=>showDepBadge(activeMeta()),100)}

  /* ---------- Local-first autosave ---------- */
  let saveTimer=0,lastSavedAtMs=0,lastReason='',saveCount=0,lastCloudSyncAtMs=0,lastCloudError='';
  function primaryKey(id){try{return typeof root.flightSessionStorageKey==='function'?root.flightSessionStorageKey(id):''}catch(_){return ''}}
  function checkpointKey(id){return ownedKey(`sagsV22LocalCheckpoint::${S(id)}`)}
  function readCheckpoint(id){try{return JSON.parse(localStorage.getItem(checkpointKey(id))||'null')}catch(_){return null}}
  function useful(env){if(!env||typeof env!=='object')return false;const st=env.state&&typeof env.state==='object'?env.state:{};return Object.values(st).some(v=>v!==null&&v!==undefined&&String(v).trim()!=='')||!!S(env.rosterAssignmentId)||!!S(env.mainForm)}
  function cloudEnvelope(env){
    env=env&&typeof env==='object'?env:{};const state={};
    for(const [k,v] of Object.entries(env.state&&typeof env.state==='object'?env.state:{})){if(/attachment/i.test(k))continue;try{const z=JSON.stringify(v);if(z.length<=180000)state[k]=JSON.parse(z)}catch(_){}}
    return {...clone(env),state,scrollY:Number(env.scrollY)||0};
  }
  function setSaveBadge(text,pending){ensureChoiceUi();const b=document.getElementById('v22SaveBadge');if(!activeMeta()?.id){b.style.display='none';return}b.textContent=text;b.style.display='block';b.style.background=pending?'#fff4dd':'#eef4f8';b.style.color=pending?'#8a5700':'#526777';clearTimeout(setSaveBadge._t);setSaveBadge._t=setTimeout(()=>{try{b.style.display='none'}catch(_){}},2600)}
  function writeCheckpoint(meta,env,reason){
    const now=Date.now(),copy=clone(env)||{};copy.v22LocalRevision=now;copy.v22LocalSavedAtMs=now;copy.v22LocalSaveReason=S(reason);if(meta?.rosterAssignmentId&&!copy.rosterAssignmentId)copy.rosterAssignmentId=S(meta.rosterAssignmentId);
    const pk=primaryKey(meta?.id);try{if(pk)localStorage.setItem(pk,JSON.stringify(copy))}catch(e){console.warn('V2.2 primary local save',e)}
    const cp={schema:2,build:BUILD,sessionId:S(meta?.id),rosterAssignmentId:S(meta?.rosterAssignmentId||copy.rosterAssignmentId),atMs:now,localRevision:now,reason:S(reason),pendingSync:!!meta?.rosterAssignmentId,envelope:copy};
    try{localStorage.setItem(checkpointKey(meta?.id),JSON.stringify(cp))}catch(e){console.warn('V2.2 checkpoint save',e)}return cp;
  }
  function markSynced(cp){const x=readCheckpoint(cp?.sessionId);if(!x||Number(x.localRevision)!==Number(cp.localRevision))return;x.pendingSync=false;x.syncedAtMs=Date.now();try{localStorage.setItem(checkpointKey(cp.sessionId),JSON.stringify(x))}catch(_){}}
  async function flushCloud(cp,meta){
    if(!cp?.pendingSync||!cp?.envelope)return false;const aid=S(cp.rosterAssignmentId||meta?.rosterAssignmentId);if(!aid)return false;
    try{
      const ref=db(`roster_sessions/${safe(aid)}`),snap=await ref.once('value'),remote=snap.val()||{},localRev=Number(cp.localRevision||cp.atMs||0),remoteRev=Number(remote.v22LocalRevision||remote.envelope?.v22LocalRevision||0);
      if(remoteRev>localRev){lastCloudError='Cloud revision mới hơn local; không ghi đè.';return false}
      const now=Date.now(),env=cloudEnvelope(cp.envelope);await ref.update({envelope:env,envelopeUpdatedAtMs:now,updatedAtMs:now,v22LocalRevision:localRev,v22LocalSyncAtMs:now});lastCloudSyncAtMs=now;lastCloudError='';markSynced(cp);setSaveBadge('✓ ĐÃ LƯU',false);return true;
    }catch(e){lastCloudError=S(e?.message||e);setSaveBadge('⏳ ĐÃ LƯU TRÊN MÁY',true);console.warn('V2.2 pending sync',e);return false}
  }
  function persistNow(reason='event'){
    clearTimeout(saveTimer);const meta=activeMeta();if(!meta?.id)return false;
    try{if(typeof root.persist==='function')root.persist()}catch(e){console.warn('V2.2 base persist',e)}
    const env=currentEnvelope(meta);if(!env)return false;const cp=writeCheckpoint(meta,env,reason);lastSavedAtMs=cp.atMs;lastReason=S(reason);saveCount++;setSaveBadge(cp.pendingSync?'⏳ ĐÃ LƯU TRÊN MÁY':'✓ ĐÃ LƯU',cp.pendingSync);Promise.resolve(flushCloud(cp,meta)).catch(()=>{});return true;
  }
  function scheduleSave(reason='input',delay=100){clearTimeout(saveTimer);saveTimer=setTimeout(()=>persistNow(reason),Math.max(0,Number(delay)||0))}
  async function restoreIfNewer(){
    const meta=activeMeta();if(!meta?.id)return false;const cp=readCheckpoint(meta.id);if(!cp?.envelope)return false;const ca=S(cp.rosterAssignmentId||cp.envelope?.rosterAssignmentId),ma=S(meta.rosterAssignmentId);if(ca&&ma&&ca!==ma)return false;
    const cur=currentEnvelope(meta),cr=Number(cur?.v22LocalRevision||cur?.v22LocalSavedAtMs||0),lr=Number(cp.localRevision||cp.atMs||0);let restored=false;
    if(!useful(cur)||lr>cr){const pk=primaryKey(meta.id);try{if(pk)localStorage.setItem(pk,JSON.stringify(cp.envelope));restored=true}catch(_){}}
    if(cp.pendingSync)await flushCloud(cp,meta);return restored;
  }

  document.addEventListener('input',()=>scheduleSave('input',100),true);
  document.addEventListener('change',()=>scheduleSave('change',0),true);
  document.addEventListener('blur',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(e?.target?.tagName))scheduleSave('blur',0)},true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)persistNow('visibility-hidden');else setTimeout(()=>restoreIfNewer().catch(()=>{}),30)},{passive:true});
  window.addEventListener('pagehide',()=>persistNow('pagehide'),{capture:true});
  window.addEventListener('pageshow',()=>setTimeout(()=>{restoreIfNewer().catch(()=>{});installBusinessHooks()},60),{passive:true});
  window.addEventListener('online',()=>setTimeout(()=>restoreIfNewer().catch(()=>{}),80),{passive:true});
  try{document.addEventListener('freeze',()=>persistNow('freeze'),{capture:true})}catch(_){}

  root.sagsV22SaveNow=reason=>persistNow(reason||'manual');
  root.sagsV22RestoreLocal=()=>restoreIfNewer();
  root.sagsV22AutosaveDiagnostics=()=>{const meta=activeMeta(),cp=meta?.id?readCheckpoint(meta.id):null;return {build:BUILD,lastSavedAtMs,lastReason,saveCount,lastCloudSyncAtMs,lastCloudError,activeSessionId:S(meta?.id),rosterAssignmentId:S(meta?.rosterAssignmentId),checkpointAtMs:Number(cp?.atMs||0),pendingSync:!!cp?.pendingSync}};

  ensureChoiceUi();installBusinessHooks();
  let tries=0;const retry=setInterval(()=>{installBusinessHooks();if(receivePatched&&completePatched||++tries>40)clearInterval(retry)},250);
  setTimeout(()=>restoreIfNewer().catch(()=>{}),800);
})(typeof window!=='undefined'?window:globalThis);

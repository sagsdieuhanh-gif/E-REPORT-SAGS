/* E-REPORT/SAGS V1.1.102 DAILY ROSTER FINAL · RTDB PATH FIX
 * - Same-day roster imports are cumulative MERGE updates.
 * - One canonical work-slot/workspace identity across manifest/mailbox/session/Flight Record.
 * - ARR/DEP assignments of the same roster duty share a sanitized working workspace.
 * - Direct roster reassignment synchronizes Manifest/Mailbox/Session/Flight Record owner metadata.
 * - PUSHBACK source is h24Start/f421_h24Start for 42.3/42.1; 55.1 only consumes shared status.
 */
(function(root){
'use strict';
const BUILD='V1.1.102-OFFICIAL-20260830-DAILY-ROSTER-FINAL-PATCH-GUARD';
const DISPLAY='V1.1.102';
const MANIFEST='roster_manifests',MAIL='roster_mail',SESSION='roster_sessions',STATUS='roster_flight_status',WORKSPACE='roster_flight_workspaces',FLIGHTS='flight_records';
const MAP_KEY='sags_roster_workspace_map_v1197';
const S=v=>String(v??'').trim(),U=v=>S(v).toUpperCase();
const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
const normUser=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}};
const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(_){return v}};
const hash=s=>{let h=2166136261>>>0;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return h.toString(36).toUpperCase()};
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function opDate(){return S(document.getElementById('fwcDate')?.value)||S(sessionStorage.getItem('sagsV36FwcDate'))||today()}
function flightTokens(x){const out=new Set(),add=v=>{for(const m of U(v).matchAll(/[A-Z0-9]{2,3}\s*\d{1,5}/g)){const k=m[0].replace(/[^A-Z0-9]/g,'');if(k)out.add(k)}};add(x?.arrFlight);add(x?.depFlight);add(x?.flightRaw);add(x?.flightName);return [...out].sort()}
function slotSource(x){const src=U(x?.sourceColumn),rk=U(x?.roleKey),fg=U(x?.formGroup);if(rk==='CBTT'||src.includes('GRND_LS')||fg==='FINAL')return 'GRND_LS';if(rk==='PAX09'||src.includes('PAX_SUPR')||fg==='FSAGS09')return 'PAX_SUPR';if((rk==='LD'||fg==='FSAGS551'||src==='GRND_LD')&&!src.includes('GRND_COR'))return 'GRND_LD';if(['COR','BOTH'].includes(rk)||src.includes('GRND_COR')||['FSAGS','FSAGS423','FSAGS421'].includes(fg))return 'GRND_COR';return src||rk||fg||'ROSTER'}
function canonicalForm(x){const g=U(x?.formGroup||x);if(g==='FSAGS423'||g==='FSAGS')return 'FSAGS423';if(g==='FSAGS421')return 'FSAGS421';if(g==='FSAGS551')return 'FSAGS551';if(g==='FSAGS09')return 'FSAGS09';if(g==='FINAL')return 'FINAL';return g||'FORM'}
function unitFor(x){const s=slotSource(x);return s==='GRND_LS'?'CBTT':s==='PAX_SUPR'?'PVHK':['GRND_COR','GRND_LD'].includes(s)?'DH':''}
function flightIdentity(x){const f=flightTokens(x);return f.join('/')||U(x?.flightId||x?.flightRaw||x?.flightName).replace(/[^A-Z0-9]/g,'')||'UNKNOWN'}
function workspaceKey(date,x){return `RW97_${hash([S(date),flightIdentity(x),slotSource(x),canonicalForm(x)].join('|'))}`}
function workSlotKey(date,x){return [S(date),flightIdentity(x),slotSource(x),U(x?.assignmentLeg)||'TURN',Number(x?.workPartOrder||1)].join('|')}
let workspaceMap={};try{workspaceMap=JSON.parse(localStorage.getItem(MAP_KEY)||'{}')||{}}catch(_){workspaceMap={}}
function saveMap(){try{localStorage.setItem(MAP_KEY,JSON.stringify(workspaceMap))}catch(_){}}
function rememberWorkspace(item,date=''){const aid=S(item?.assignmentId),wk=S(item?.workspaceKey||item?.rosterWorkspaceKey)||workspaceKey(date||item?.opDate,item);if(!aid||!wk)return null;workspaceMap[aid]={workspaceKey:wk,scope:S(item?.assignmentScope||'TURNAROUND'),opDate:S(date||item?.opDate),flightId:S(item?.flightId),formGroup:S(item?.formGroup),sourceColumn:S(item?.sourceColumn),atMs:Date.now()};saveMap();return workspaceMap[aid]}
function meaningfulEnvelope(env){const st=env?.state&&typeof env.state==='object'?env.state:{};return Object.entries(st).some(([k,v])=>{if(/attachment/i.test(k))return false;if(v===true)return true;if(v===false||v===null||v===undefined)return false;if(Array.isArray(v))return v.length>0;if(typeof v==='object')return Object.keys(v).length>0;return S(v)!==''})}
function sanitizeEnvelope(env){const x=env&&typeof env==='object'?env:{},src=x.state&&typeof x.state==='object'?x.state:{},state={};for(const [k,v] of Object.entries(src)){if(/attachment/i.test(k))continue;try{const j=JSON.stringify(v);if(j.length<=180000)state[k]=JSON.parse(j)}catch(_){}}return {state,mainForm:S(x.mainForm||x.activeFormGroup||'fsags'),activeFormGroup:S(x.mainForm||x.activeFormGroup||'fsags'),currentPage:Number(x.currentPage)||1,scrollY:0,arrivalOp:S(x.arrivalOp||'passenger'),departureOp:S(x.departureOp||'passenger'),rosterSeed:clone(x.rosterSeed||{})}}
function mergeSeedSafe(target,source){target=clone(target)||{};source=source||{};target.state=target.state&&typeof target.state==='object'?target.state:{};const src=source.state&&typeof source.state==='object'?source.state:{};const seed=target.rosterSeed&&typeof target.rosterSeed==='object'?target.rosterSeed:{};for(const [k,v] of Object.entries(src)){if(/attachment/i.test(k))continue;const cur=target.state[k],old=seed[k];const blank=cur===null||cur===undefined||S(cur)==='';let sameSeed=false;try{sameSeed=(k in seed)&&JSON.stringify(cur)===JSON.stringify(old)}catch(_){sameSeed=S(cur)===S(old)}if(blank||sameSeed)target.state[k]=clone(v)}return target}

/* ---------- Root RTDB patch normalization ---------- */
// V1.1.102: Firebase RTDB rejects one update() when the same patch contains
// both an ancestor path and one of its descendants. Older Daily Roster code can
// write assignments/{id} while the clean layer adds assignments/{id}/active.
// Collapse descendant writes into the ancestor object before sending to RTDB.
function collapseUpdatePathConflicts(patch){
  if(!patch||typeof patch!=='object'||Array.isArray(patch))return patch;
  const out={...patch};
  const setDeep=(obj,parts,value)=>{let cur=obj;for(let i=0;i<parts.length-1;i++){const k=parts[i];if(!cur[k]||typeof cur[k]!=='object'||Array.isArray(cur[k]))cur[k]={};cur=cur[k]}cur[parts[parts.length-1]]=value};
  const parents=Object.keys(out).sort((a,b)=>a.split('/').length-b.split('/').length);
  for(const p of parents){
    if(!Object.prototype.hasOwnProperty.call(out,p))continue;
    const base=out[p];
    if(!base||typeof base!=='object'||Array.isArray(base))continue;
    const prefix=p+'/';
    for(const d of Object.keys(out)){
      if(d===p||!d.startsWith(prefix))continue;
      const rel=d.slice(prefix.length).split('/').filter(Boolean);if(!rel.length)continue;
      setDeep(base,rel,out[d]);delete out[d];
    }
  }
  return out;
}
function installRefClean(){
  if(root.__SAGS_V11102_REF_CLEAN)return true;
  const prev=root.sagsV470Ref;if(typeof prev!=='function')return false;
  root.__SAGS_V11102_REF_CLEAN=true;
  root.sagsV470Ref=function(path=''){
    const p=S(path),ref=prev(p);
    // Capture workspace metadata from the actual child_added/child_changed mailbox stream.
    if(/^roster_mail\/[^/]+\/items$/.test(p)&&ref&&typeof ref.on==='function'&&!ref.__v1198mail){
      const bon=ref.on.bind(ref),boff=typeof ref.off==='function'?ref.off.bind(ref):null,cbMap=new Map();
      ref.on=function(event,cb,...rest){if(['child_added','child_changed'].includes(event)&&typeof cb==='function'){const w=snap=>{try{const v=snap?.val?.();if(v)rememberWorkspace(v,v.opDate)}catch(_){}return cb(snap)};cbMap.set(cb,w);return bon(event,w,...rest)}return bon(event,cb,...rest)};
      if(boff)ref.off=function(event,cb){const w=cbMap.get(cb)||cb;const r=boff(event,w);if(cb)cbMap.delete(cb);return r};
      ref.__v1198mail=true;
    }
    if(p!==''||!ref||typeof ref.update!=='function')return ref;
    const baseUpdate=ref.update.bind(ref);
    ref.update=async function(patch){
      if(!patch||typeof patch!=='object'||Array.isArray(patch))return baseUpdate(collapseUpdatePathConflicts(patch));
      // Any parent-manifest write becomes cumulative by construction, so older wrappers
      // cannot accidentally turn a later roster batch into REPLACE_SAME_DAY.
      for(const k of Object.keys(patch)){
        const m=/^roster_manifests\/([^/]+)$/.exec(k);if(!m||!patch[k]?.items)continue;
        let old={};try{old=(await prev(`${MANIFEST}/${m[1]}`).once('value')).val()||{}}catch(_){old={}}
        patch[k]={...old,...patch[k],items:{...(old.items||{}),...(patch[k].items||{})},cumulative:true,cumulativeMode:'MERGE_UPDATE',syncMode:'MERGE_UPDATE_SAME_DAY',dailyRosterCleanBuild:DISPLAY};
      }
      // Normalize item-level writes used by the current daily-roster publisher.
      const itemRows=[];
      for(const [k,v0] of Object.entries(patch)){
        const m=/^roster_manifests\/([^/]+)\/items\/([^/]+)$/.exec(k);if(!m||!v0||typeof v0!=='object')continue;
        const date=m[1],aid=m[2],v={...v0};v.assignmentId=S(v.assignmentId||aid);v.user=normUser(v.user||v.targetUser);v.originalUser=normUser(v.originalUser||v.originalTargetUser||v.user);v.workspaceKey=S(v.workspaceKey||v.rosterWorkspaceKey)||workspaceKey(date,v);v.rosterWorkspaceKey=v.workspaceKey;v.rosterWorkSlotKey=workSlotKey(date,v);v.dailyRosterCleanBuild=DISPLAY;patch[k]=v;rememberWorkspace(v,date);itemRows.push({date,aid,item:v});
        const mailPrefix=`${MAIL}/`;
        for(const mk of Object.keys(patch)){
          const mm=new RegExp(`^${mailPrefix.replace('/','\\/')}([^/]+)\\/items\\/${aid.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')}$`).exec(mk);if(!mm||!patch[mk]||typeof patch[mk]!=='object')continue;patch[mk]={...patch[mk],flightId:S(v.flightId||patch[mk].flightId),workspaceKey:v.workspaceKey,rosterWorkspaceKey:v.workspaceKey,rosterWorkSlotKey:v.rosterWorkSlotKey,assignmentScope:S(v.assignmentScope||patch[mk].assignmentScope||'TURNAROUND'),dailyRosterCleanBuild:DISPLAY};rememberWorkspace(patch[mk],date);
        }
      }
      // Keep Flight Record assignment-owner metadata in the same atomic update.
      const t=Date.now();
      for(const {date,aid,item} of itemRows){const fid=S(item.flightId);if(!fid)continue;const u=normUser(item.user||item.targetUser),unit=unitFor(item),base=`${FLIGHTS}/${safe(date)}/${safe(fid)}`;patch[`${base}/assignments/${safe(aid)}/assignmentId`]=aid;patch[`${base}/assignments/${safe(aid)}/user`]=u;patch[`${base}/assignments/${safe(aid)}/originalUser`]=normUser(item.originalUser||item.originalTargetUser||u);patch[`${base}/assignments/${safe(aid)}/formGroup`]=S(item.formGroup);patch[`${base}/assignments/${safe(aid)}/sourceColumn`]=S(item.sourceColumn);patch[`${base}/assignments/${safe(aid)}/roleKey`]=S(item.roleKey);patch[`${base}/assignments/${safe(aid)}/workspaceKey`]=S(item.workspaceKey);patch[`${base}/assignments/${safe(aid)}/assignmentScope`]=S(item.assignmentScope||'TURNAROUND');patch[`${base}/assignments/${safe(aid)}/active`]=item.active!==false;patch[`${base}/taskStatus/${safe(aid)}/ownerUser`]=u;patch[`${base}/taskStatus/${safe(aid)}/workspaceKey`]=S(item.workspaceKey);patch[`${base}/taskStatus/${safe(aid)}/updatedAtMs`]=t;
        if(unit&&u){let fromUser='';for(const [mk,mv] of Object.entries(patch)){if(mk.startsWith(`${MAIL}/`)&&mk.endsWith(`/items/${aid}`)&&mv&&typeof mv==='object'&&S(mv.reassignedFrom)){fromUser=normUser(mv.reassignedFrom);break}}if(fromUser){try{const ua=(await prev(`${FLIGHTS}/${safe(date)}/${safe(fid)}/unitAssignments/${safe(unit)}`).once('value')).val()||null;if(ua?.username&&normUser(ua.username)===fromUser){patch[`${base}/unitAssignments/${safe(unit)}/username`]=u;patch[`${base}/unitAssignments/${safe(unit)}/name`]=u;patch[`${base}/unitAssignments/${safe(unit)}/updatedAtMs`]=t;patch[`${base}/unitAssignments/${safe(unit)}/claimSource`]='ROSTER_REASSIGN_SYNC';}}catch(_){}}}
      }
      return baseUpdate(collapseUpdatePathConflicts(patch));
    };
    return ref;
  };
  return true;
}

/* ---------- Shared workspace continuity ---------- */
const wsTimers=new Map();
const wsBaselines=new Map();
const wsBaselineLoads=new Map();
function jsonSame(a,b){try{return JSON.stringify(a)===JSON.stringify(b)}catch(_){return a===b}}
function rememberWsBaseline(wk,env){if(!wk)return;const clean=sanitizeEnvelope(env||{});wsBaselines.set(wk,clean);wsTimers.set(wk,JSON.stringify(clean))}
async function loadWsBaseline(wk){
  if(wsBaselines.has(wk))return wsBaselines.get(wk);
  if(wsBaselineLoads.has(wk))return wsBaselineLoads.get(wk);
  const job=(async()=>{let env={};try{env=(await root.sagsV470Ref(`${WORKSPACE}/${safe(wk)}/envelope`).once('value')).val()||{}}catch(_){}const clean=sanitizeEnvelope(env);wsBaselines.set(wk,clean);return clean})();
  wsBaselineLoads.set(wk,job);try{return await job}finally{wsBaselineLoads.delete(wk)}
}
function workspaceDelta(prev,next){
  prev=prev&&typeof prev==='object'?prev:{state:{}};next=next&&typeof next==='object'?next:{state:{}};
  const patch={},a=prev.state&&typeof prev.state==='object'?prev.state:{},b=next.state&&typeof next.state==='object'?next.state:{};
  for(const k of new Set([...Object.keys(a),...Object.keys(b)]))if(!jsonSame(a[k],b[k]))patch[`envelope/state/${safe(k)}`]=Object.prototype.hasOwnProperty.call(b,k)?clone(b[k]):null;
  for(const k of ['mainForm','activeFormGroup','currentPage','scrollY','arrivalOp','departureOp','rosterSeed'])if(!jsonSame(prev[k],next[k]))patch[`envelope/${k}`]=clone(next[k]);
  return patch;
}
async function writeWorkspaceForActive(delay=420){
  clearTimeout(writeWorkspaceForActive._t);writeWorkspaceForActive._t=setTimeout(async()=>{try{
    const meta=root.currentFlightSessionMeta?.();if(!meta?.rosterAssignmentId||typeof root.sagsV470Ref!=='function')return;
    const aid=S(meta.rosterAssignmentId),info=workspaceMap[aid]||null;if(!info?.workspaceKey)return;
    const env=root.readFlightSessionEnvelope?.(meta.id);if(!env||!meaningfulEnvelope(env))return;
    const clean=sanitizeEnvelope(env),sig=JSON.stringify(clean);if(wsTimers.get(info.workspaceKey)===sig)return;
    const prev=await loadWsBaseline(info.workspaceKey),delta=workspaceDelta(prev,clean);if(!Object.keys(delta).length){rememberWsBaseline(info.workspaceKey,clean);return}
    const now=Date.now();Object.assign(delta,{schema:2,engine:'DAILY_ROSTER_DELTA_V11105',workspaceKey:info.workspaceKey,opDate:S(info.opDate||meta.rosterOpDate),flightId:S(info.flightId||meta.rosterFlightId),formGroup:S(info.formGroup||meta.initialGroup),sourceColumn:S(info.sourceColumn||meta.rosterSourceColumn),envelopeUpdatedAtMs:now,updatedAtMs:now,updatedBy:normUser(root.currentUserProfile?.username||'')});
    await root.sagsV470Ref(`${WORKSPACE}/${safe(info.workspaceKey)}`).update(delta);rememberWsBaseline(info.workspaceKey,clean);
  }catch(e){console.info('V1.1.105 workspace delta sync',e?.message||e)}},delay)
}
// V4.7.7: NEVER scan every assignment on a flight or copy a workspace into
// another person's session just because they have the same flight number.
// Only the explicitly selected assignment may be hydrated, on actual open.
async function hydrateWorkspaceForFlight(date,fid,aid){
  aid=S(aid);date=S(date);if(!aid||!date||typeof root.sagsV470Ref!=='function')return 0;
  // Fresh per-assignment mailbox check; stale on-device workspace mapping alone
  // must never authorize a read or an automatic copy after reassignment.
  let item=null;
  try{const user=normUser(root.currentUserProfile?.username||''),snap=await root.sagsV470Ref(`${MAIL}/${safe(user)}/items/${safe(aid)}`).once('value');item=snap.val()}
  catch(_){return 0}
  if(!item||item.active===false||normUser(item.targetUser||item.user)!==normUser(root.currentUserProfile?.username||'')||S(item.flightId)!==S(fid)||S(item.opDate)!==date)return 0;
  const info=rememberWorkspace(item,date);
  const wk=S(info?.workspaceKey);if(!wk||S(info.opDate)!==date||S(info.flightId)!==S(fid))return 0;
  let source=null;
  try{source=(await root.sagsV470Ref(`${WORKSPACE}/${safe(wk)}/envelope`).once('value')).val()||null}catch(_){return 0}
  if(!source||!meaningfulEnvelope(source))return 0;
  const clean=sanitizeEnvelope(source),target=root.sagsV470Ref(`${SESSION}/${safe(aid)}/envelope`);
  // A transaction prevents the initial hydration from overwriting another device's
  // saved work (or a form that the receiver already started editing).
  if(typeof target.transaction!=='function')return 0;
  const result=await target.transaction(current=>{
    if(current&&meaningfulEnvelope(current))return;
    return mergeSeedSafe(current||{state:{},mainForm:S(info.formGroup||'fsags'),activeFormGroup:S(info.formGroup||'fsags')},clean);
  },undefined,false);
  if(result?.committed){rememberWsBaseline(wk,clean);return 1}
  return 0;
}
function installWorkspaceApi(){const legacyInfo=root.rosterWorkspaceInfo,legacyRead=root.rosterWorkspaceLegacyRead;root.rosterWorkspaceInfo=function(aid){const hit=workspaceMap[S(aid)];if(hit)return clone(hit);try{return legacyInfo?.(aid)||null}catch(_){return null}};root.rosterWorkspaceLegacyRead=async function(aid){const hit=workspaceMap[S(aid)];if(hit?.workspaceKey&&typeof root.sagsV470Ref==='function')try{return (await root.sagsV470Ref(`${WORKSPACE}/${safe(hit.workspaceKey)}`).once('value')).val()||null}catch(_){}try{return await legacyRead?.(aid)||null}catch(_){return null}}}

/* ---------- PUSHBACK canonicalization ---------- */
function pushbackValue(st){return S(st?.h24Start||st?.f421_h24Start||st?.h24||st?.f421_h24)}
function rampSummary(st={}){return {chockOn:S(st.h5Start||st.f421_h5Start||st.h5||st.f421_h5),boardingCall:S(st.h14Start||st.f421_h14Start),boardingFinish:S(st.f421_h17Finish||st.h17Finish),doorClose:S(st.h21Start||st.f421_h21Start||st.h21||st.f421_h21),chockOff:S(st.h22Start||st.f421_h22Start||st.h22||st.f421_h22),pushback:pushbackValue(st)}}
function sourceGroup(meta,env){const g=U(meta?.initialGroup||env?.mainForm||env?.activeFormGroup||'');return ['FSAGS','FSAGS423','FSAGS421'].includes(g)}
function flightSignature(meta,env){const st=env?.state&&typeof env.state==='object'?env.state:{},parts=[S(st.fltBefore||st.f421_fltBefore),S(st.fltAfter||st.f421_fltAfter)].map(x=>U(x).replace(/[^A-Z0-9]/g,'')).filter(Boolean);if(parts.length)return parts.join('_');const a=U(meta?.name||'').match(/[A-Z0-9]{2,3}\s*\d{1,5}/g)||[];return a.length?a.map(x=>x.replace(/\s+/g,'')).join('_'):U(meta?.name||meta?.id||'').replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'')}
let lastPbSig='',pbTimer=0,lastRampSyncSig='',rampSyncInFlight=false;
async function syncPushbackFromActive(){
  try{
    const meta=root.currentFlightSessionMeta?.();if(!meta?.rosterAssignmentId)return;
    const env=root.readFlightSessionEnvelope?.(meta.id)||{};if(!sourceGroup(meta,env))return;
    const st=env.state&&typeof env.state==='object'?env.state:{},date=S(meta.rosterOpDate||env.rosterOpDate||opDate()),sig=flightSignature(meta,env);
    if(!date||!sig)return;
    if(typeof root.sagsV470Ref!=='function')return; // Do not mark an offline attempt as synced.
    const aid=S(meta.rosterAssignmentId),fid=S(meta.rosterFlightId||workspaceMap[aid]?.flightId);
    // Hub consumers still receive the complete state when it CHANGES. Avoid
    // redundant writes after no-op persist, page switches and repeated hooks.
    const syncSig=JSON.stringify([date,sig,aid,fid,S(meta.id),S(meta.name),normUser(root.currentUserProfile?.username||''),S(workspaceMap[aid]?.workspaceKey),st]);
    if(syncSig===lastRampSyncSig)return;
    if(rampSyncInFlight){clearTimeout(pbTimer);pbTimer=setTimeout(syncPushbackFromActive,350);return;}
    rampSyncInFlight=true;
    try{
      const pb=pushbackValue(st),key='RF_'+hash(date+'|'+sig),ps=JSON.stringify([date,key,!!pb,pb]);
      const payload={engine:'DAILY_ROSTER_V1',schema:2,cleanBuild:DISPLAY,opDate:date,tripKey:key,flightLabel:S(meta.name||sig.replace(/_/g,' / ')),flightSignature:sig,completed:!!pb,pushback:pb||null,completedAtMs:pb?Date.now():null,updatedAtMs:Date.now(),updatedBy:normUser(root.currentUserProfile?.username||'')};
      if(ps!==lastPbSig&&typeof root.sagsV470Ref==='function'){
        await root.sagsV470Ref(`${STATUS}/${safe(date)}/${safe(key)}`).set(payload);
        lastPbSig=ps; // Never suppress a retry after a failed write.
      }
      if(typeof root.sagsV470Ref==='function'){
        const sp={completedPushback:pb||null,pushbackSourceField:st.h24Start?'h24Start':st.f421_h24Start?'f421_h24Start':st.h24?'h24':'f421_h24',pushbackSyncedAtMs:Date.now()};
        if(pb){sp.pushbackEditReopened=false;sp.pushbackEditReopenedAtMs=null;}
        await root.sagsV470Ref(`${SESSION}/${safe(aid)}`).update(sp);
      }
      if(typeof root.sagsFlightHubLink==='function')await root.sagsFlightHubLink('RAMP',{state:clone(st)},{opDate:date,sessionId:S(meta.id),assignmentId:aid,workspaceKey:S(workspaceMap[aid]?.workspaceKey),sourcePath:workspaceMap[aid]?.workspaceKey?`${WORKSPACE}/${safe(workspaceMap[aid].workspaceKey)}`:'',chockOn:S(st.h5Start||st.f421_h5Start||st.h5||st.f421_h5),doorClose:S(st.h21Start||st.f421_h21Start||st.h21||st.f421_h21),chockOff:S(st.h22Start||st.f421_h22Start||st.h22||st.f421_h22),pushback:pb,cargoOffload:S(st.offloadCargoFinish||st.f421_offloadCargoFinish),cargoOnload:S(st.onloadCargoFinish||st.f421_onloadCargoFinish),status:pb?'PUSHBACK':(S(st.h21Start||st.f421_h21Start||st.h21||st.f421_h21)?'DOOR CLOSE':'ĐANG KHAI THÁC')});
      if(fid&&typeof root.sagsV470Ref==='function'){
        const base=`${FLIGHTS}/${safe(date)}/${safe(fid)}`,rs=rampSummary(st);
        await root.sagsV470Ref(`${base}/modules/RAMP`).update({kind:'RAMP',status:pb?'PUSHBACK':(rs.doorClose?'DOOR CLOSE':'ĐANG KHAI THÁC'),chockOn:rs.chockOn||null,boardingCall:rs.boardingCall||null,boardingFinish:rs.boardingFinish||null,doorClose:rs.doorClose||null,chockOff:rs.chockOff||null,pushback:rs.pushback||null,assignmentId:aid,sessionId:S(meta.id),updatedAtMs:Date.now(),updatedBy:normUser(root.currentUserProfile?.username||''),cleanBuild:'V1.1.105'});
      }
      lastRampSyncSig=syncSig;
    }finally{rampSyncInFlight=false;}
  }catch(e){console.info('V1.1.99 pushback sync',e?.message||e)}
}
function installRampSync(){root.sagsFlightHubSyncCurrentRamp=function(){clearTimeout(pbTimer);pbTimer=setTimeout(()=>syncPushbackFromActive(),260)}}

/* ---------- Entry-point hooks ---------- */
function wrapAsync(name,before,after,tag){const fn=root[name];if(typeof fn!=='function'||fn[tag])return false;const w=async function(){try{if(before)await before(arguments)}catch(e){console.info('V1.1.99 before',name,e?.message||e)}const r=await fn.apply(this,arguments);try{if(after)await after(r,arguments)}catch(e){console.info('V1.1.99 after',name,e?.message||e)}return r};w[tag]=1;w[tag+'Base']=fn;root[name]=w;try{if(name==='dailyRosterPublish')dailyRosterPublish=w;else if(name==='v324ReceiveOrOpen')v324ReceiveOrOpen=w}catch(_){}return true}
function installHooks(){
  const basePersist=root.persist;if(typeof basePersist==='function'&&!basePersist.__v1198){root.persist=function(){const r=basePersist.apply(this,arguments);writeWorkspaceForActive();clearTimeout(root.__v1198PbPersist);root.__v1198PbPersist=setTimeout(syncPushbackFromActive,260);return r};root.persist.__v1198=1}
  wrapAsync('dailyRosterPublish',null,async r=>{if(r===true){try{const d=S(document.getElementById('drManageDate')?.value)||opDate();await root.sagsTaskStatusSyncDate?.(d,true)}catch(_){}}},'__v1198');
  wrapAsync('v324ReceiveOrOpen',async args=>{const fid=S(args?.[0]),aid=S(args?.[1]),date=S(args?.[2])||opDate();if(fid&&aid)await hydrateWorkspaceForFlight(date,fid,aid)},async()=>{setTimeout(writeWorkspaceForActive,120)},'__v1198');
  wrapAsync('dailyRosterReassign',null,async()=>{try{await root.sagsTaskStatusSyncDate?.(S(document.getElementById('drManageDate')?.value)||opDate(),true)}catch(_){}},'__v1198');
  wrapAsync('dailyRosterResetToRoster',null,async()=>{try{await root.sagsTaskStatusSyncDate?.(S(document.getElementById('drManageDate')?.value)||opDate(),true)}catch(_){}},'__v1198');
}
function install(){installRefClean();installWorkspaceApi();installRampSync();installHooks();root.__SAGS_DAILY_ROSTER_CLEAN_V1199={build:BUILD,display:DISPLAY,workspaceKey,workSlotKey,hydrateWorkspaceForFlight,syncPushbackFromActive};}
install();setTimeout(install,350);setTimeout(install,1100);
})(typeof window!=='undefined'?window:globalThis);


/* ---------- V1.1.99 PERSONAL DAILY ROSTER QUEUE ----------
 * Replaces the worker-facing MY FLIGHT list with exactly two buckets:
 * CHƯA HOÀN THÀNH / ĐÃ HOÀN THÀNH.
 * Only active assignments owned by the signed-in username are rendered.
 * Duplicate roster tickets are collapsed by canonical work-slot before display.
 * AD publishing also marks true duplicate manifest/mailbox assignments inactive.
 */
(function(root){
'use strict';
const BUILD='V1.1.102-OFFICIAL-20260830-DAILY-ROSTER-FINAL-PATCH-GUARD';
const S=v=>String(v??'').trim(),U=v=>S(v).toUpperCase(),safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
const norm=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}};
const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function session(){try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}}
function role(){const x=session(),p=x.profile||{};return U(x.role||p.role)}
function me(){const x=session(),p=x.profile||{};return norm(p.username||(role()==='AD'?'AD':''))}
function opDate(){const saved=S(document.getElementById('fwcDate')?.value)||S(sessionStorage.getItem('sagsV36FwcDate'));if(saved)return saved;const d=new Date(),x=new Date(d);if(d.getHours()<4)x.setDate(x.getDate()-1);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`}
function db(path){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase RTDB chưa sẵn sàng.');return root.sagsV470Ref(path)}
function flightParts(x){const clean=v=>U(v).replace(/\s+/g,'').replace(/[^A-Z0-9+\-]/g,'');let a=clean(x?.arrFlight),d=clean(x?.depFlight);if(a||d)return [a,d].filter(Boolean);const raw=clean(x?.flightRaw||x?.flightName||x?.assignmentFlight);return raw?[raw]:[clean(x?.flightId)||'UNKNOWN']}
function flightKey(x){return flightParts(x).join('|')}
function flightLabel(x){const a=S(x?.arrFlight),d=S(x?.depFlight);if(a&&d&&U(a)!==U(d))return `${a} / ${d}`;return S(x?.flightName||x?.flightRaw||x?.assignmentFlight||d||a||x?.flightId||'CHUYẾN')}
function sourceKey(x){const src=U(x?.sourceColumn),rk=U(x?.roleKey),fg=U(x?.formGroup);if(rk==='CBTT'||src.includes('GRND_LS')||fg==='FINAL')return 'GRND_LS';if(rk==='PAX09'||src.includes('PAX_SUPR')||fg==='FSAGS09')return 'PAX_SUPR';if((rk==='LD'||fg==='FSAGS551'||src==='GRND_LD')&&!src.includes('GRND_COR'))return 'GRND_LD';if(['COR','BOTH'].includes(rk)||src.includes('GRND_COR')||['FSAGS','FSAGS423','FSAGS421'].includes(fg))return 'GRND_COR';return src||rk||fg||'ROSTER'}
function canonicalForm(x){const g=U(x?.formGroup);if(g==='FSAGS'||g==='FSAGS423')return 'FSAGS423';return g||'FORM'}
function coKey(x){const total=Number(x?.coAssigneeTotal||1)||1;if(total>1){const gid=S(x?.coAssigneeGroupId);const rank=Number(x?.coAssigneeRank||0)||0;return gid?`CO:${gid}:${rank}`:`COUSER:${norm(x?.user||x?.targetUser)}`}return 'SINGLE'}
function slotKey(date,x){return [S(date),flightKey(x),sourceKey(x),canonicalForm(x),U(x?.assignmentLeg)||'TURN',Number(x?.workPartOrder||1),coKey(x)].join('|')}
function recency(x){return Number(x?.updatedAtMs||x?.publishedAtMs||x?.assignedAtMs||x?.createdAtMs||x?.importedAtMs||0)||0}
function dedupeItems(date,items){const best=new Map(),dupes=[];for(const x of (items||[])){if(!x||x.active===false)continue;const k=slotKey(date,x),old=best.get(k);if(!old){best.set(k,x);continue}const a=recency(old),b=recency(x);let keep=old,drop=x;if(b>a||(b===a&&S(x.assignmentId)>S(old.assignmentId))){keep=x;drop=old;best.set(k,x)}dupes.push({key:k,keep,drop})}return {items:[...best.values()],dupes}}
function formLabel(x){const g=canonicalForm(x),src=sourceKey(x);if(g==='FSAGS423')return '42.3';if(g==='FSAGS421')return '42.1';if(g==='FSAGS551')return '55.1';if(g==='FSAGS09')return 'KẾT SỔ';if(g==='FINAL')return 'BẢNG TẢI CUỐI CÙNG';return src==='GRND_COR'?'ĐIỀU HÀNH':src==='GRND_LD'?'ĐIỀU HÀNH':src==='GRND_LS'?'CÂN BẰNG TRỌNG TẢI':src==='PAX_SUPR'?'PHỤC VỤ HÀNH KHÁCH':g}
function pbOf(st){const e=st?.envelope?.state||{},c=st?.completionEnvelope?.state||{};return S(st?.completedPushback||e.h24Start||e.f421_h24Start||c.h24Start||c.f421_h24Start)}
function isPushbackSource(x){return ['FSAGS','FSAGS423','FSAGS421'].includes(U(x?.formGroup))}
function normalizedTask(st){return U(st?.taskStatusV333||st?.taskStatus||st?.workPartStatus||st?.claimStatus).replace(/[\s-]+/g,'_')}
function itemCompleted(item,st){if(st?.pushbackEditReopened===true||st?.pushbackEditMode===true)return false;const t=normalizedTask(st);if(st?.skippedNoEform===true||st?.autoSkippedByNextUser===true||['COMPLETED','PART_COMPLETED','HANDED_OVER','NOT_APPLICABLE','SKIPPED'].includes(t))return true;if(isPushbackSource(item)&&!!pbOf(st))return true;return false}
function itemWorking(item,st){
  const t=normalizedTask(st);if(!['IN_PROGRESS','CLAIMED','ACTIVE','WORKING'].includes(t))return false;
  const claimant=norm(st?.claimedBy);if(claimant)return claimant===me();
  const owner=norm(st?.ownerUser),claimedAt=Number(st?.claimedAtMs||0),reassignedAt=Number(st?.reassignedAtMs||0);
  return !!claimedAt&&claimedAt>reassignedAt&&owner===me()
}
async function clearStaleClaimIfNeeded(item){
  const aid=S(item?.assignmentId);if(!aid||!ownedActive(item))return false;
  const st=await readState(aid,true),t=normalizedTask(st),progress=['IN_PROGRESS','CLAIMED','ACTIVE','WORKING'].includes(t)||U(st?.claimStatus)==='CLAIMED';if(!progress)return false;
  const claimant=norm(st?.claimedBy),owner=norm(st?.ownerUser),claimedAt=Number(st?.claimedAtMs||0),reassignedAt=Number(st?.reassignedAtMs||0);
  const stale=(claimant&&claimant!==me())||(!claimant&&owner&&owner!==me())||(!claimant&&reassignedAt>0&&reassignedAt>=claimedAt);
  if(!stale)return false;
  await db(`roster_sessions/${safe(aid)}`).update({ownerUser:me(),claimStatus:'UNCLAIMED',workPartStatus:'UNCLAIMED',taskStatusV333:'UNCLAIMED',taskAvailabilityV333:'READY',claimedBy:null,claimedAtMs:null,coClaimedBy:null,coClaimedAssignmentId:null,staleClaimResetAtMs:Date.now(),staleClaimResetForUser:me(),updatedAtMs:Date.now()});
  return true
}
function timeScore(x){const raw=S(x?.std||x?.sta),plus=/\+\s*$/.test(raw),s=raw.replace(/\D/g,'');if(s.length<3)return 99999;return (plus?1440:0)+Number(s.slice(0,-2))*60+Number(s.slice(-2))}
async function readManifest(date){if(role()!=='AD'){if(typeof root.sagsV477ManifestForWorker!=='function')throw new Error('Hộp phân công đang khởi tạo; vui lòng đợi hoặc bấm UPDATE.');return await root.sagsV477ManifestForWorker(date)}return (await db(`roster_manifests/${safe(date)}`).once('value')).val()||{}}
const QUEUE_STATUS_FIELDS=['claimStatus','workPartStatus','taskStatusV333','taskStatus','ownerUser','claimedBy','claimedAtMs','reassignedAtMs','skippedNoEform','autoSkippedByNextUser','pushbackEditReopened','pushbackEditMode','completedPushback'];
const queueStatusCache=new Map();
root.sagsV477InvalidateQueueStatus=function(){queueStatusCache.clear()};
async function readState(aid,force=false){
  // Only status leaves, never the entire session/envelope/signatures.
  aid=S(aid);if(!aid)return {};
  const k=me()+'|'+aid,old=queueStatusCache.get(k);
  if(!force&&old&&Date.now()-old.at<30000)return old.promise;
  const promise=(async()=>{const out={};await Promise.all(QUEUE_STATUS_FIELDS.map(async field=>{
    try{const val=(await db(`roster_sessions/${safe(aid)}/${field}`).once('value')).val();if(val!==null&&val!==undefined)out[field]=val}catch(_){}
  }));return out})();queueStatusCache.set(k,{at:Date.now(),promise});
  try{return await promise}catch(e){queueStatusCache.delete(k);throw e}
}
function groupTasks(rows){const map=new Map();for(const r of rows){const k=flightKey(r.item);if(!map.has(k))map.set(k,{key:k,items:[],states:[],sort:timeScore(r.item)});const g=map.get(k);g.items.push(r.item);g.states.push(r.st);g.sort=Math.min(g.sort,timeScore(r.item))}return [...map.values()].map(g=>{g.completed=g.items.every((x,i)=>itemCompleted(x,g.states[i]));g.working=g.items.some((x,i)=>!itemCompleted(x,g.states[i])&&itemWorking(x,g.states[i]));const candidates=g.items.map((x,i)=>({item:x,st:g.states[i],done:itemCompleted(x,g.states[i]),working:itemWorking(x,g.states[i]),ord:Number(x?.workPartOrder||1),leg:U(x?.assignmentLeg)==='ARR'?0:U(x?.assignmentLeg)==='DEP'?2:1,rec:recency(x)})).sort((a,b)=>(a.done?1:0)-(b.done?1:0)||(b.working?1:0)-(a.working?1:0)||a.leg-b.leg||a.ord-b.ord||a.rec-b.rec);let pick=candidates[0];if(g.completed){const pb=candidates.find(c=>isPushbackSource(c.item));if(pb)pick=pb;}g.primary=pick?.item||g.items[0];g.primaryState=pick?.st||g.states[0];g.pushback=g.items.map((x,i)=>isPushbackSource(x)?pbOf(g.states[i]):'').find(Boolean)||'';return g}).sort((a,b)=>a.sort-b.sort||flightLabel(a.primary).localeCompare(flightLabel(b.primary),'vi'))}
let activeTab='pending',renderToken=0,baseOpen=null,baseRefresh=null,currentQueueDate='';
function queueDate(preferred=''){
  const d=S(preferred)||S(document.getElementById('fwcDate')?.value)||S(currentQueueDate)||S(sessionStorage.getItem('sagsV36FwcDate'))||opDate();
  return d;
}
function syncQueueDate(date){
  const d=S(date);if(!d)return '';
  currentQueueDate=d;
  try{sessionStorage.setItem('sagsV36FwcDate',d)}catch(_){}
  const inp=document.getElementById('fwcDate');if(inp&&inp.value!==d)inp.value=d;
  return d;
}
function ownedActive(item){return !!(item&&item.active!==false&&norm(item.user||item.targetUser)===me())}
function resolveOwnedItem(man,aid,fid,completed=false){
  let item=man?.items?.[aid];if(ownedActive(item))return item;
  const rows=Object.values(man?.items||{}).filter(x=>ownedActive(x)&&(!fid||S(x.flightId)===S(fid)));
  if(!rows.length)return null;
  rows.sort((a,b)=>{
    if(completed){const ap=isPushbackSource(a)?0:1,bp=isPushbackSource(b)?0:1;if(ap!==bp)return ap-bp;}
    const al=U(a?.assignmentLeg)==='ARR'?0:U(a?.assignmentLeg)==='DEP'?2:1,bl=U(b?.assignmentLeg)==='ARR'?0:U(b?.assignmentLeg)==='DEP'?2:1;
    return al-bl||(Number(a?.workPartOrder||1)-Number(b?.workPartOrder||1))||recency(b)-recency(a);
  });
  return rows[0]||null;
}
function installStyle(){if(document.getElementById('v1199PersonalQueueStyle'))return;const st=document.createElement('style');st.id='v1199PersonalQueueStyle';st.textContent=`
#fwcList.v1199Queue{display:block!important}.v1199Tabs{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:8px 0 11px}.v1199Tab{min-height:44px;border:0;border-radius:10px;background:#e9eef3;color:#29445d;font:900 12px Arial}.v1199Tab.active{background:#0b5cab;color:#fff}.v1199Count{display:inline-flex;min-width:23px;height:23px;align-items:center;justify-content:center;margin-left:5px;padding:0 5px;border-radius:99px;background:#fff;color:#0b5cab}.v1199Card{border:1px solid #d4dee8;border-radius:12px;background:#fff;padding:11px;margin:8px 0;box-shadow:0 2px 7px rgba(0,0,0,.04)}.v1199Title{font:900 17px Arial;color:#0b4f91}.v1199Meta{font:12px/1.45 Arial;color:#5d6f80;margin-top:4px}.v1199Tasks{display:flex;gap:5px;flex-wrap:wrap;margin:8px 0}.v1199Task{padding:4px 7px;border-radius:999px;background:#eef4f9;color:#314a61;font:800 10px Arial}.v1199Task.done{background:#e8f6ee;color:#14713d}.v1199TaskBtn{flex:1 1 115px;min-height:44px;border:1px solid #8eb7df;border-radius:9px;background:#e9f3ff;color:#064b85;font:900 12px Arial;cursor:pointer}.v1199TaskBtn.done{background:#e8f6ee;color:#14713d;border-color:#a4d7b8}.v1199TaskBtn:disabled,.v1199Action:disabled{opacity:.55;cursor:wait}.v1199Action{width:100%;min-height:42px;border:0;border-radius:9px;background:#0b67b2;color:#fff;font:900 12px Arial}.v1199Action.reopen{background:#0b5cab}.v1199Empty{padding:22px 12px;border:1px dashed #c7d1db;border-radius:11px;background:#fafcfe;text-align:center;color:#607080;font:800 12px/1.5 Arial}.v1199OwnerNote{font:800 11px Arial;color:#52677b;margin:3px 0 8px}
`;document.head.appendChild(st)}
function setHeader(date){const h=document.querySelector('#fwcModal .fwcHead h3');if(h)h.textContent='✓ CÔNG VIỆC HÔM NAY';const sub=document.querySelector('#fwcModal .fwcHead .fwcSub');if(sub)sub.textContent=`Chỉ hiển thị công việc DAILY ROSTER được phân cho ${me()||'tài khoản hiện tại'} · ${date}`;const b=document.getElementById('roleBtnRosterFlights');if(b&&role()!=='AD')b.textContent='✓ CÔNG VIỆC HÔM NAY'}
function taskPills(g,date){return g.items.map((x,i)=>{
  const done=itemCompleted(x,g.states[i]),label=formLabel(x),aid=S(x.assignmentId);
  return `<button type="button" class="v1199TaskBtn ${done?'done':''}" data-task-aid="${esc(aid)}" data-task-fid="${esc(S(x.flightId))}" data-task-date="${esc(S(date))}" data-task-completed="${done?'1':'0'}" aria-label="${esc(done?'Mở lại':'Mở')} FSAGS ${esc(label)}">${done?'↺ MỞ LẠI':'➜ MỞ'} ${esc(label)}${done?' ✓':''}</button>`;
}).join('')}
function cardHtml(g,date){
  const x=g.primary,route=S(x?.route),ac=S(x?.acReg)||'—',sta=S(x?.sta)||'—',std=S(x?.std)||'—';
  const action=g.completed?(isPushbackSource(x)||g.items.some(isPushbackSource)?'MỞ LẠI · SỬA PUSHBACK':'MỞ LẠI CHỈNH SỬA'):(g.working?'TIẾP TỤC':'NHẬN CHUYẾN');
  // Multi-duty flights get a separate actionable button for every assignment.
  // The old one-button route selected a form by guesswork and could fail silently.
  const actions=g.items.length>1?'':`<button type="button" class="v1199Action ${g.completed?'reopen':''}" data-aid="${esc(S(x.assignmentId))}" data-fid="${esc(S(x.flightId))}" data-completed="${g.completed?'1':'0'}" data-opdate="${esc(S(date))}">${esc(action)}</button>`;
  return `<div class="v1199Card" data-fkey="${esc(g.key)}"><div class="v1199Title">${esc(flightLabel(x))}</div><div class="v1199Meta">${esc(route)}${route?' · ':''}A/C ${esc(ac)} · STA ${esc(sta)} · STD ${esc(std)}</div><div class="v1199Tasks">${taskPills(g,date)}</div>${g.pushback?`<div class="v1199OwnerNote">PUSHBACK ${esc(g.pushback)}</div>`:''}${actions}<button type="button" class="v478PinPick" data-pin-key="${esc(g.key)}" style="margin-top:7px;min-height:38px;padding:7px 12px;border:1px solid #8ab4dc;border-radius:9px;background:#f1f8ff;color:#124c81;font:800 12px Arial">📌 GHIM CHUYẾN TRÊN MÁY</button></div>`;
}
async function renderPersonal(date=opDate()){
  if(role()==='AD'||!me())return;date=syncQueueDate(queueDate(date));const token=++renderToken;installStyle();setHeader(date);const host=document.getElementById('fwcList');if(!host)return;const hadQueue=host.classList.contains('v1199Queue');host.classList.add('v1199Queue');if(!hadQueue&&!host.children.length)host.innerHTML='<div class="v1199Empty">Đang tải công việc được phân…</div>';
  try{const man=await readManifest(date),all=Object.values(man?.items||{}).filter(x=>x&&x.active!==false&&norm(x.user||x.targetUser)===me()),dd=dedupeItems(date,all),states=await Promise.all(dd.items.map(x=>readState(x.assignmentId)));if(token!==renderToken)return;const groups=groupTasks(dd.items.map((item,i)=>({item,st:states[i]}))),pending=groups.filter(x=>!x.completed),done=groups.filter(x=>x.completed),show=activeTab==='completed'?done:pending,next=`<div class="v1199Tabs"><button class="v1199Tab ${activeTab==='pending'?'active':''}" onclick="v1199QueueTab('pending')">CHƯA HOÀN THÀNH <span class="v1199Count">${pending.length}</span></button><button class="v1199Tab ${activeTab==='completed'?'active':''}" onclick="v1199QueueTab('completed')">ĐÃ HOÀN THÀNH <span class="v1199Count">${done.length}</span></button></div><div class="v1199OwnerNote">${esc(me())} · ${esc(date)} · ${groups.length} chuyến được phân · đã loại ${dd.dupes.length} vé/bản ghi trùng khỏi màn hình</div>${show.length?show.map(g=>cardHtml(g,date)).join(''):`<div class="v1199Empty">${activeTab==='completed'?'Chưa có chuyến được phân cho tài khoản này đã hoàn thành.':'Không còn chuyến được phân cho tài khoản này cần làm.'}</div>`}`;if(host.innerHTML!==next){host.innerHTML=next;host.querySelectorAll('.v1199Action').forEach(btn=>btn.onclick=()=>openTask(btn.dataset.aid,btn.dataset.fid,btn.dataset.completed==='1',btn.dataset.opdate,false,btn));
    host.querySelectorAll('.v1199TaskBtn').forEach(btn=>btn.onclick=()=>openTask(btn.dataset.taskAid,btn.dataset.taskFid,btn.dataset.taskCompleted==='1',btn.dataset.taskDate,true,btn));
    host.querySelectorAll('.v478PinPick').forEach(btn=>btn.onclick=()=>{const found=groups.find(g=>g.key===btn.dataset.pinKey);if(found)root.sagsV478PinItems?.(found.items,date)})}setHeader(date)}catch(e){if(token===renderToken){const next=`<div class="v1199Empty">Không tải được công việc DAILY ROSTER: ${esc(e?.message||e)}</div>`;if(host.innerHTML!==next)host.innerHTML=next}}}
async function reopenPushback(item,date){const aid=S(item?.assignmentId),fid=S(item?.flightId);if(!aid)throw new Error('Thiếu assignmentId.');if(!confirm(`MỞ LẠI CHỈNH SỬA PUSHBACK\n\n${flightLabel(item)} · ${formLabel(item)}\n\nChuyến sẽ chuyển ngay về CHƯA HOÀN THÀNH trong lúc chỉnh sửa. Giờ PUSHBACK cũ vẫn được giữ trong biểu mẫu để sửa.`))return false;const t=Date.now(),u=me(),patch={};patch[`roster_sessions/${safe(aid)}/pushbackEditReopened`]=true;patch[`roster_sessions/${safe(aid)}/pushbackEditReopenedAtMs`]=t;patch[`roster_sessions/${safe(aid)}/completedPushback`]=null;patch[`roster_sessions/${safe(aid)}/claimStatus`]='CLAIMED';patch[`roster_sessions/${safe(aid)}/workPartStatus`]='IN_PROGRESS';patch[`roster_sessions/${safe(aid)}/taskStatusV333`]='IN_PROGRESS';patch[`roster_sessions/${safe(aid)}/completedAtMs`]=null;patch[`roster_sessions/${safe(aid)}/completedBy`]=null;patch[`roster_sessions/${safe(aid)}/updatedAtMs`]=t;if(fid){patch[`flight_records/${safe(date)}/${safe(fid)}/taskClaims/${safe(u)}/${safe(aid)}/status`]='CLAIMED';patch[`flight_records/${safe(date)}/${safe(fid)}/taskClaims/${safe(u)}/${safe(aid)}/taskStatus`]='IN_PROGRESS';patch[`flight_records/${safe(date)}/${safe(fid)}/taskClaims/${safe(u)}/${safe(aid)}/reopenedAtMs`]=t}await db('').update(patch);setTimeout(()=>renderPersonal(date),60);await root.v324ReceiveOrOpen?.(fid,aid,date);return true}
const openingTasks=new Set();
async function openTask(aid,fid,completed,cardDate='',exact=false,button=null){
  const date=syncQueueDate(queueDate(cardDate)),key=date+'|'+S(aid||fid);
  if(openingTasks.has(key))return;
  openingTasks.add(key);queueStatusCache.delete(me()+'|'+S(aid));if(button)button.disabled=true;
  try{
    const man=await readManifest(date);
    const item=exact?(man?.items?.[aid]||null):resolveOwnedItem(man,aid,fid,completed);
    if(!item||!ownedActive(item)||exact&&S(item.flightId)!==S(fid)){
      alert(`Phân công của bạn ngày ${date} vừa thay đổi hoặc không còn hiệu lực. Hệ thống sẽ tải lại danh sách, không mở nhầm form khác.`);
      return void renderPersonal(date);
    }
    const realFid=S(item.flightId||fid);
    if(completed&&isPushbackSource(item))return void await reopenPushback(item,date);
    if(!completed)try{await clearStaleClaimIfNeeded(item)}catch(e){
      console.warn('Không xác minh được claim cũ',e);
      throw new Error('Chưa kiểm tra được trạng thái phân công sau khi đổi người. Vui lòng thử lại khi có mạng; không ghi đè dữ liệu cũ.');
    }
    if(typeof root.v324ReceiveOrOpen!=='function')throw new Error('Bộ nhận chuyến chưa tải xong. Bấm UPDATE rồi mở lại.');
    const opened=await root.v324ReceiveOrOpen(realFid,S(item.assignmentId),date);
    if(opened!==false){const active=root.currentFlightSessionMeta?.();if(S(active?.rosterAssignmentId)===S(item.assignmentId))root.sagsV478RecordPinned?.(item,date)}
  }catch(e){console.error('Mở công việc roster thất bại',e);alert('Không mở được công việc '+date+': '+S(e?.message||e));}
  finally{openingTasks.delete(key);if(button?.isConnected)button.disabled=false;}
}
root.v1199QueueTab=function(tab){activeTab=tab==='completed'?'completed':'pending';void renderPersonal(queueDate(currentQueueDate))};

async function cleanupDuplicates(date=opDate()){
  if(role()!=='AD')return {ok:false,reason:'AD_ONLY',removed:0};const man=await readManifest(date),rows=Object.values(man?.items||{}).filter(x=>x&&x.active!==false),dd=dedupeItems(date,rows);if(!dd.dupes.length)return {ok:true,removed:0};const patch={},seen=new Set();for(const d of dd.dupes){const x=d.drop,aid=S(x?.assignmentId),u=norm(x?.user||x?.targetUser);if(!aid||seen.has(aid))continue;seen.add(aid);patch[`roster_manifests/${safe(date)}/items/${safe(aid)}/active`]=false;patch[`roster_manifests/${safe(date)}/items/${safe(aid)}/duplicateInactive`]=true;patch[`roster_manifests/${safe(date)}/items/${safe(aid)}/duplicateOf`]=S(d.keep?.assignmentId);patch[`roster_manifests/${safe(date)}/items/${safe(aid)}/duplicateCleanedAtMs`]=Date.now();if(u){patch[`roster_mail/${safe(u)}/items/${safe(aid)}/active`]=false;patch[`roster_mail/${safe(u)}/items/${safe(aid)}/duplicateInactive`]=true;patch[`roster_mail/${safe(u)}/items/${safe(aid)}/duplicateOf`]=S(d.keep?.assignmentId)}}patch[`roster_manifests/${safe(date)}/duplicateCleanBuild`]='V1.1.102';patch[`roster_manifests/${safe(date)}/duplicateCleanedAtMs`]=Date.now();patch[`roster_manifests/${safe(date)}/duplicateCleanedCount`]=seen.size;await db('').update(patch);return {ok:true,removed:seen.size}}
root.dailyRosterDeduplicateCurrent=cleanupDuplicates;
function wrapPublish(){const fn=root.dailyRosterPublish;if(typeof fn!=='function'||fn.__v1199Dedup)return;const w=async function(){const r=await fn.apply(this,arguments);if(r===true)try{await cleanupDuplicates(S(document.getElementById('drManageDate')?.value)||opDate())}catch(e){console.info('V1.1.99 dedup',e?.message||e)}return r};w.__v1199Dedup=1;root.dailyRosterPublish=w;try{dailyRosterPublish=w}catch(_){}}
function wrapWorkspace(){if(!baseOpen&&typeof root.flightWorkspaceOpenList==='function'){baseOpen=root.flightWorkspaceOpenList;root.flightWorkspaceOpenList=async function(date){const d=syncQueueDate(queueDate(S(date)||opDate())),r=await baseOpen.call(this,d);if(role()!=='AD')setTimeout(()=>renderPersonal(d),80);return r}}
  if(!baseRefresh&&typeof root.flightWorkspaceRefresh==='function'){baseRefresh=root.flightWorkspaceRefresh;root.flightWorkspaceRefresh=async function(){const d=syncQueueDate(queueDate(S(document.getElementById('fwcDate')?.value)||currentQueueDate||opDate())),r=await baseRefresh.call(this);if(role()!=='AD')setTimeout(()=>renderPersonal(d),100);return r}}
}
function install(){wrapPublish();wrapWorkspace();installStyle();if(role()==='AD')setTimeout(()=>cleanupDuplicates(opDate()).catch(()=>{}),800);const b=document.getElementById('roleBtnRosterFlights');if(b&&role()!=='AD')b.textContent='✓ CÔNG VIỆC HÔM NAY'}
install();setTimeout(install,350);setTimeout(install,1100);window.addEventListener('pageshow',()=>setTimeout(install,100),{passive:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(install,100)},{passive:true});
root.sagsV478OpenExactAssignment=(aid,fid,date)=>openTask(aid,fid,false,date,true);
root.__SAGS_DAILY_ROSTER_FINAL_V1199={build:BUILD,dedupeItems,slotKey,flightKey,itemCompleted,itemWorking,clearStaleClaimIfNeeded,groupTasks,cleanupDuplicates,renderPersonal,queueDate,syncQueueDate,resolveOwnedItem};
})(typeof window!=='undefined'?window:globalThis);
/* === IT PUBLIC 6-TIME SYNC · FREE RTDB REST · IT GET 120s === */
(function(root){
'use strict';

const B='it_public';
const F='flight_records';
const W='roster_flight_workspaces';

const S=v=>String(v??'').trim();
const U=v=>S(v).toUpperCase();
const TV=v=>{
  const x=S(v);
  return /^(?:N\/?A|NIL|-)$/i.test(x) ? '' : x;
};

const safe=v=>
  S(v)
    .replace(/[.#$\[\]\/]/g,'_')
    .replace(/\s+/g,'_')
    .replace(/_+/g,'_')
    .replace(/^_+|_+$/g,'') || 'UNKNOWN';

function day(){
  try{
    return new Intl.DateTimeFormat('en-CA',{
      timeZone:'Asia/Ho_Chi_Minh',
      year:'numeric',
      month:'2-digit',
      day:'2-digit'
    }).format(new Date());
  }catch(_){
    return new Date().toISOString().slice(0,10);
  }
}

function date(v){
  v=S(v);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : day();
}

function p(st,ks){
  for(const k of ks){
    const v=TV(st?.[k]);
    if(v) return v;
  }
  return '';
}

/*
  CHỈ XUẤT 6 MỐC CHO IT
  Không xuất BOARDING_START.
*/
function t(st={},r={}){
  return {
    CHOCK_ON:
      p(st,[
        'h5Start',
        'f421_h5Start',
        'h5',
        'f421_h5'
      ]) || TV(r.chockOn),

    BOARDING_CALL:
      p(st,[
        'h14Start',
        'f421_h14Start'
      ]) || TV(r.boardingCall),

    BOARDING_FINISH:
      p(st,[
        'f421_h17Finish',
        'h17Finish'
      ]) || TV(r.boardingFinish),

    DOOR_CLOSE:
      p(st,[
        'h21Start',
        'f421_h21Start',
        'h21',
        'f421_h21'
      ]) || TV(r.doorClose),

    CHOCK_OFF:
      p(st,[
        'h22Start',
        'f421_h22Start',
        'h22',
        'f421_h22'
      ]) || TV(r.chockOff),

    PUSHBACK:
      p(st,[
        'h24Start',
        'f421_h24Start',
        'h24',
        'f421_h24'
      ]) || TV(r.pushback)
  };
}

function pair(st={},rec={},fallback=''){
  let a=U(
    st.fltBefore ||
    st.f421_fltBefore ||
    rec.arrFlight
  ).replace(/[^A-Z0-9]/g,'');

  let d=U(
    st.fltAfter ||
    st.f421_fltAfter ||
    rec.depFlight
  ).replace(/[^A-Z0-9]/g,'');

  if(a || d){
    return safe([a,d].filter(Boolean).join('_'));
  }

  const raw=U(
    rec.flightName ||
    rec.flightRaw ||
    fallback
  );

  const fs=[
    ...raw.matchAll(/[A-Z0-9]{2,3}\s*\d{1,5}/g)
  ].map(m=>m[0].replace(/[^A-Z0-9]/g,''));

  return safe(fs.join('_') || fallback);
}

function auth(){
  try{
    return !!root.firebase?.auth?.().currentUser;
  }catch(_){
    return false;
  }
}

function pub(path){
  try{
    return root.firebase
      ?.database
      ?.()
      .ref(`${B}/${path}`) || null;
  }catch(_){
    return null;
  }
}

function score(x){
  return Object.values(x||{}).filter(Boolean).length;
}

function wsState(x){
  if(
    x?.envelope?.state &&
    typeof x.envelope.state==='object'
  ){
    return x.envelope.state;
  }

  if(
    x?.state &&
    typeof x.state==='object'
  ){
    return x.state;
  }

  return {};
}

/*
  Ưu tiên workspace RAMP/ĐH phù hợp với flight record.
*/
function wsKeys(rec={}){
  const out=[];

  const add=x=>{
    x=S(x);
    if(x && !out.includes(x)){
      out.push(x);
    }
  };

  add(rec?.modules?.RAMP?.workspaceKey);

  Object.values(rec.assignments||{})
    .filter(a=>a && a.active!==false)
    .sort((a,b)=>{
      const q=x=>{
        let n=0;

        const s=U(x?.sourceColumn);
        const f=U(x?.formGroup);
        const r=U(x?.roleKey);

        if(s.includes('GRND_COR')) n+=100;

        if(
          f==='FSAGS423' ||
          f==='FSAGS'
        ){
          n+=95;
        }

        if(f==='FSAGS421'){
          n+=90;
        }

        if(
          r==='COR' ||
          r==='BOTH'
        ){
          n+=85;
        }

        return n;
      };

      return q(b)-q(a);
    })
    .forEach(a=>{
      add(
        a.workspaceKey ||
        a.rosterWorkspaceKey
      );
    });

  return out.slice(0,4);
}

/*
  Đọc workspace tốt nhất của chuyến để lấy đủ mốc.
*/
async function best(rec={}){
  let st={};

  const ramp=rec?.modules?.RAMP || {};

  let n=score(
    t(st,ramp)
  );

  if(
    typeof root.sagsV470Ref!=='function'
  ){
    return st;
  }

  for(const k of wsKeys(rec)){
    try{
      const x=(
        await root
          .sagsV470Ref(
            `${W}/${safe(k)}`
          )
          .once('value')
      ).val() || {};

      const s=wsState(x);

      const m=score(
        t(s,ramp)
      );

      if(m>n){
        st=s;
        n=m;
      }

      if(n===6){
        break;
      }

    }catch(_){}
  }

  return st;
}

let timer=0;
let last='';

/*
  Đồng bộ ngay chuyến đang mở.
*/
async function current(){
  try{
    if(!auth()){
      return false;
    }

    const m=
      root.currentFlightSessionMeta?.();

    if(!m?.id){
      return false;
    }

    const e=
      root.readFlightSessionEnvelope?.(m.id)
      || {};

    const st=
      e.state &&
      typeof e.state==='object'
        ? e.state
        : {};

    const d=date(
      m.rosterOpDate ||
      e.rosterOpDate ||
      document
        .getElementById('fwcDate')
        ?.value
    );

    const k=pair(
      st,
      {},
      m.rosterFlightId ||
      m.name ||
      m.id
    );

    const v=t(st,{});

    const sig=
      JSON.stringify([
        d,
        k,
        v
      ]);

    if(sig===last){
      return true;
    }

    const r=
      pub(`${d}/${k}`);

    if(!r){
      return false;
    }

    await r.set(v);

    last=sig;

    return true;

  }catch(e){
    console.info(
      'V1.1.105 it_public current',
      e?.message || e
    );

    return false;
  }
}

function later(ms=120){
  clearTimeout(timer);

  timer=setTimeout(
    current,
    ms
  );
}

let busy=false;

/*
  Đồng bộ/backfill toàn bộ chuyến của một ngày từ compact RAMP summary.
  Không đọc roster_flight_workspaces ở luồng này.
*/
async function all(d=day()){
  if(
    busy ||
    !auth() ||
    typeof root.sagsV470Ref!=='function'
  ){
    return false;
  }

  busy=true;

  try{
    d=date(d);

    const rows=(
      await root
        .sagsV470Ref(
          `${F}/${safe(d)}`
        )
        .once('value')
    ).val() || {};

    const out={};

    for(
      const [id,rec0]
      of Object.entries(rows)
    ){
      const rec=rec0 || {};

      // V1.1.105 data saver: daily backfill reads only the compact RAMP summary
      // already stored inside the flight record. Never download full workspaces here.
      const ramp=rec?.modules?.RAMP || {};
      const key=pair({},rec,id);
      const times=t({},ramp);

      if(
        !Object.prototype.hasOwnProperty.call(out,key) ||
        score(times)>score(out[key])
      ){
        out[key]=times;
      }
    }

    const r=pub(d);

    if(r){
      await r.set(out);
    }

    return true;

  }catch(e){
    console.info(
      'V1.1.105 it_public date',
      e?.message || e
    );

    return false;

  }finally{
    busy=false;
  }
}

/*
  Gắn vào các luồng hiện hữu của app.
*/
function wrap(){

  const f=root.persist;

  if(
    typeof f==='function' &&
    !f.__it104
  ){
    const w=function(){
      const r=
        f.apply(this,arguments);

      later();

      return r;
    };

    w.__it104=1;

    root.persist=w;

    try{
      persist=w;
    }catch(_){}
  }


  const o=root.v324ReceiveOrOpen;

  if(
    typeof o==='function' &&
    !o.__it104
  ){
    const w=async function(){
      const r=
        await o.apply(
          this,
          arguments
        );

      later(180);

      return r;
    };

    w.__it104=1;

    root.v324ReceiveOrOpen=w;

    try{
      v324ReceiveOrOpen=w;
    }catch(_){}
  }


  const p0=
    root.dailyRosterPublish;

  if(
    typeof p0==='function' &&
    !p0.__it104
  ){
    const w=async function(){
      const r=
        await p0.apply(
          this,
          arguments
        );

      if(r===true){
        all(
          document
            .getElementById(
              'drManageDate'
            )
            ?.value ||
          day()
        );
      }

      return r;
    };

    w.__it104=1;

    root.dailyRosterPublish=w;

    try{
      dailyRosterPublish=w;
    }catch(_){}
  }
}

function install(){
  wrap();

  root.__SAGS_IT_PUBLIC_V11104={
    pollSeconds:120,

    syncCurrent:current,

    syncDate:all,

    url:d=>
      `https://e-report-sags-default-rtdb.asia-southeast1.firebasedatabase.app/it_public/${date(d)}.json`
  };
}

install();

setTimeout(
  install,
  400
);

setTimeout(
  install,
  1400
);

/*
  Sau khi Firebase Authentication xác nhận đã đăng nhập,
  backfill ngày hiện tại.
*/
try{
  root.firebase
    ?.auth
    ?.()
    .onAuthStateChanged(u=>{
      if(u){
        // V1.1.105: do not scan every flight/workspace on user login.
        // The active flight publishes its six compact IT milestones by itself.
        setTimeout(current,700);
      }
    });
}catch(_){}

/*
  Khi quay trở lại app/tab, đảm bảo hook vẫn hoạt động.
*/
root.addEventListener(
  'pageshow',
  ()=>{
    wrap();
    later(180);
  },
  {
    passive:true
  }
);

})(
  typeof window!=='undefined'
    ? window
    : globalThis
);
/* === END IT PUBLIC 6-TIME SYNC · FREE RTDB REST === */

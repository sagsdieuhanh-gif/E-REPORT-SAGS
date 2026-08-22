/* E-REPORT/SAGS V3.55 · Approved PVHK closeout -> durable CBTT FINAL autofill
 * The approved closeout is indexed by DATE + departure FLIGHT + A/C REG so CBTT can
 * recover it after login/offline gaps. Matching FINAL records are created or
 * resolved when the carrier/template is known, then populated without
 * overwriting operator edits or a FINAL that was already sent.
 */
(function(root){
"use strict";
if(root.__SAGS_V344_CLOSEOUT_FINAL_LOADED)return;
root.__SAGS_V344_CLOSEOUT_FINAL_LOADED=true;

const BUILD="V3.59-20260822-01";
const INDEX_ROOT="closeout_by_flight_v344";
const IDENTITY_ROOT="closeout_by_identity_v355";
const EVENTS_ROOT="closeout_events_v348";
const INBOX_KEY="sagsCloseoutInboxV121";
const S=v=>String(v??"").trim();
const U=v=>S(v).toUpperCase();
const flight=v=>U(v).replace(/[^A-Z0-9]/g,"");
const reg=v=>U(v).replace(/[^A-Z0-9]/g,"");
const num=v=>{const s=S(v).replace(",", ".");if(!s)return null;const n=Number(s);return Number.isFinite(n)?n:null};
const clone=v=>{try{return typeof root.cloneSafe==="function"?root.cloneSafe(v):JSON.parse(JSON.stringify(v))}catch(_){return v}};
const role=()=>{try{return U((typeof currentRole!=="undefined"?currentRole:root.currentRole)||"")}catch(_){return U(root.currentRole)}};
const profile=()=>{try{return (typeof currentUserProfile!=="undefined"?currentUserProfile:root.currentUserProfile)||null}catch(_){return root.currentUserProfile||null}};
const me=()=>{try{return typeof root.normalizePersonalUsername==="function"?root.normalizePersonalUsername(profile()?.username||""):S(profile()?.username).toLowerCase()}catch(_){return S(profile()?.username).toLowerCase()}};
const activeId=()=>{try{return typeof activeFinalSheetId!=="undefined"?S(activeFinalSheetId):S(root.activeFinalSheetId)}catch(_){return S(root.activeFinalSheetId)}};
const collectionName=()=>{try{return typeof HANDOVER_COLLECTION!=="undefined"?HANDOVER_COLLECTION:"sags_handovers"}catch(_){return "sags_handovers"}};
const dateToken=v=>{try{return typeof root.ffDateToken==="function"?root.ffDateToken(v):(typeof root.paxNormDate==="function"?root.paxNormDate(v):S(v).replace(/\D/g,""))}catch(_){return S(v).replace(/\D/g,"")}};
const ownedKey=k=>{try{return typeof root.sagsOwnedKey==="function"?root.sagsOwnedKey(k):k}catch(_){return k}};
const safe=v=>{try{return typeof root.sagsV470Safe==="function"?root.sagsV470Safe(S(v)):S(v).replace(/[.#$\[\]\/]/g,"_")}catch(_){return S(v).replace(/[.#$\[\]\/]/g,"_")}};

function readInbox(){try{return JSON.parse(localStorage.getItem(ownedKey(INBOX_KEY))||"{}")||{}}catch(_){return{}}}
function writeInbox(x){try{localStorage.setItem(ownedKey(INBOX_KEY),JSON.stringify(x||{}))}catch(_){}}
function payloadDate(p){return dateToken(p?.identity?.dateToken||p?.f09?.f09_date)}
function payloadReg(p){return reg(p?.identity?.acRegToken||p?.f09?.f09_regn)}
function flightTokens(v){
  if(Array.isArray(v))return [...new Set(v.flatMap(flightTokens))];
  const raw=U(v);if(!raw)return[];const out=[];let prefix="";
  for(const part0 of raw.replace(/[\/|,;]+/g," ").split(/\s+/).filter(Boolean)){
    const part=part0.replace(/[^A-Z0-9]/g,"");let m=/^([A-Z0-9]{2,3}?)(\d{1,5})$/.exec(part);
    if(m&&/[A-Z]/.test(m[1])){prefix=m[1];out.push(prefix+m[2]);continue}
    if(/^[A-Z0-9]{2,3}$/.test(part)&&/[A-Z]/.test(part)){prefix=part;continue}
    m=/^(\d{1,5})$/.exec(part);if(m&&prefix)out.push(prefix+m[1]);
  }
  if(!out.length){const one=flight(raw);if(/^[A-Z0-9]{2,3}\d{1,5}$/.test(one)&&/[A-Z]/.test(one.slice(0,-1)))out.push(one)}
  return [...new Set(out.map(flight).filter(Boolean))]
}
function lastFlight(v){const x=flightTokens(v);return x[x.length-1]||""}
function allPayloadFlights(p){const i=p?.identity||{},f=p?.f09||{};return flightTokens([i.flights,i.flightToken,i.flight,p?.flightName,f.f09_fltBefore,f.f09_fltAfter])}
function targetFlights(p){const i=p?.identity||{},f=p?.f09||{},dep=lastFlight(f.f09_fltAfter||i.depFlight||p?.depFlight);if(dep)return[dep];const fs=flightTokens(i.flights);if(fs.length)return[fs[fs.length-1]];const all=allPayloadFlights(p);return all.length?[all[all.length-1]]:[]}
function payloadRevision(p){return Math.max(1,Number(p?.closeoutNo||p?.revisionNo||1)||1)}
function payloadKey(p){return payloadDate(p)+"|"+(targetFlights(p)[0]||"")+"|"+payloadReg(p)}
function cachePayload(p){if(!p)return;const box=readInbox(),no=payloadRevision(p),dt=payloadDate(p),rg=payloadReg(p);for(const f of targetFlights(p)){if(!dt||!f||!rg)continue;const key=dt+"|"+f+"|"+rg,old=box[key]||{},versions=Array.isArray(old.versions)?old.versions.filter(x=>payloadRevision(x)!==no):[];versions.push(clone(p));versions.sort((a,b)=>payloadRevision(a)-payloadRevision(b)||Number(a?.submittedAtMs||0)-Number(b?.submittedAtMs||0));const latest=versions[versions.length-1]||clone(p);box[key]={latest,versions:versions.slice(-5),updatedAtMs:Number(latest?.submittedAtMs||Date.now())}}writeInbox(box)}

function readRecordData(rec){let all={};try{all=JSON.parse(localStorage.getItem(root.finalSheetDataKey(rec.id))||"{}")||{}}catch(_){}const form=S(rec?.form);return {all,data:form&&all?.[form]&&typeof all[form]==="object"?all[form]:{}}}
function recordIdentity(rec,data){const primaryDate=dateToken(data?.date),dates=primaryDate?[primaryDate]:[rec?.dateToken,rec?.depFlightDate,rec?.opDate,rec?.date].map(dateToken).filter(Boolean),primaryFlights=flightTokens(data?.flight),flights=primaryFlights.length?primaryFlights:flightTokens([rec?.flightToken,rec?.depFlight,rec?.flightRaw,rec?.flightName]);return {dateToken:dates[0]||"",dateTokens:[...new Set(dates)],flight:flights[flights.length-1]||"",flights,reg:reg(data?.acreg||rec?.acRegToken)}}
function tripMatches(rec,data,p){const a=recordIdentity(rec,data),dt=payloadDate(p),fs=targetFlights(p);return !!(dt&&fs.length&&a.dateTokens.includes(dt)&&a.flights.some(x=>fs.includes(x)))}
function matches(rec,data,p){if(!tripMatches(rec,data,p))return false;const a=recordIdentity(rec,data),pr=payloadReg(p);return !!(a.reg&&pr&&a.reg===pr)}
function fieldMap(form){if(form==="VUfinal.png")return {adl:"adult",chd:"child",inf:"infant",bagPcs:"bagpcs",bagKg:"bagkg"};if(form==="9Gfinal.png")return {adl:"adult",chd:"child",inf:"infant",bagPcs:"bagpcs",bagKg:"bagw"};if(form==="VJfinal2.png")return {adl:"adlq",chd:"chdq",inf:"infq",bagPcs:"bagq",bagKg:"bagw"};if(form==="VJfinal.png")return {adl:"adultq",chd:"childq",inf:"infantq",bagPcs:"bagq",bagKg:"bagw"};return null}
function payloadValues(p){const f=p?.f09||{};return {adl:num(f.f09_finalADL),chd:num(f.f09_finalCHD),inf:num(f.f09_finalINF),bagPcs:num(f.f09_finalBagP),bagKg:num(f.f09_finalBagW)}}
function hasSentFinal(rec){return !!(S(rec?.sentDocId)||Number(rec?.sentAtMs||rec?.finalSubmittedAtMs||0)>0||(Array.isArray(rec?.sentFinalHistory)&&rec.sentFinalHistory.length))}
function applyFormulas(form,data){try{root.ffAutoPaxWeights?.(form,data)}catch(_){}try{root.ffApplyVJFormulas?.(form,data)}catch(_){}if(form==="VUfinal.png")try{root.ffApplyVUFormulas?.(data)}catch(_){}if(form==="9Gfinal.png")try{root.ffApply9GLoadFormulas?.(data)}catch(_){}return data}
function carrier(p){const f=targetFlights(p)[0]||"";return f.startsWith("VU")?"VU":f.startsWith("9G")?"9G":(f.startsWith("VJ")||f.startsWith("VZ"))?"VJ":""}
function aircraftType(p){const f=p?.f09||{},r=reg(p?.identity?.acRegToken||f.f09_regn);let t=U(f.f09_acType||f.f09_actype||p?.identity?.acType||p?.acType);if(!t&&r)try{t=U(root.sagsFleetConfigByReg?.(r))}catch(_){}if(!t&&r)try{const k=typeof root.sagsNormalizeRegKey==="function"?root.sagsNormalizeRegKey(r):r;t=U(root.sagsDynamicFleetCache?.()?.byReg?.[k]?.acType||root.sagsDynamicFleetCache?.()?.byReg?.[k]?.type)}catch(_){}return t}
function formForPayload(p){const c=carrier(p);if(c==="VU")return "VUfinal.png";if(c==="9G")return "9Gfinal.png";if(c!=="VJ")return "";const t=aircraftType(p);if(/330|A330|WIDE|THÂN\s*RỘNG/.test(t))return "VJfinal2.png";if(/320|321|A320|A321|32N/.test(t))return "VJfinal.png";return ""}
function formLabel(form){try{return root.finalFormLabelFromFile?.(form)||({"VUfinal.png":"VIETRAVEL","9Gfinal.png":"SUN PHUQUOC","VJfinal2.png":"VJ TÀU THÂN RỘNG","VJfinal.png":"VIETJET"}[form]||"FINAL")}catch(_){return "FINAL"}}
function identitySeed(p,form){const f=p?.f09||{},dt=payloadDate(p),date=/^\d{8}$/.test(dt)?dt.slice(0,4)+"-"+dt.slice(4,6)+"-"+dt.slice(6,8):S(f.f09_date),flt=targetFlights(p)[0]||"",acreg=U(p?.identity?.acRegToken||f.f09_regn),type=aircraftType(p),from=U(f.f09_route1||"CXR"),to=U(f.f09_route3);if(form==="VUfinal.png")return {flight:flt,sector1:from||"CXR",sector2:to,date,acreg};if(form==="9Gfinal.png")return {departure:from||"CXR",arrival:to,flight:flt,acreg,date};if(form==="VJfinal2.png")return {flight:flt,from:from||"CXR",to,actype:type,acreg,date};return {flight:flt,sector:to?((from||"CXR")+"-"+to):"",acreg,date}}

function ensureFinalRecord(list,p){const dt=payloadDate(p),flt=targetFlights(p)[0]||"",rg=payloadReg(p);if(!dt||!flt||!rg)return {record:null,created:false,resolved:false,missingIdentity:true};const exact=list.filter(r=>{const x=readRecordData(r);return matches(r,x.data,p)}),sameTrip=list.filter(r=>{const x=readRecordData(r);return tripMatches(r,x.data,p)});let rec=exact.find(r=>S(r.id)===activeId())||exact.find(r=>!hasSentFinal(r))||exact[0]||list.find(r=>S(r.closeoutAutoKeyV344)===dt+"|"+flt+"|"+rg),created=false,resolved=false;const form=formForPayload(p),now=Date.now();
  if(!rec&&sameTrip.length)return {record:null,created:false,resolved:false,identityMismatch:true};
  if(!rec){if(typeof root.makeFinalSheetId!=="function")return {record:null,created:false,resolved:false};rec={id:root.makeFinalSheetId(),name:flt+(form?" · "+formLabel(form):" · CHỜ MẪU"),form:form||"",airline:form?formLabel(form):"CHỜ MẪU",flightSessionId:"",dateToken:dt,flightToken:flt,acRegToken:rg,createdAt:now,updatedAt:now,autoCreatedFromCloseoutV344:true,closeoutAutoKeyV344:dt+"|"+flt+"|"+rg};list.push(rec);created=true}
  if(!S(rec.form)&&form){rec.form=form;rec.airline=formLabel(form);rec.name=flt+" · "+rec.airline;rec.templatePendingV340=false;delete rec.templatePendingReason;rec.templateResolvedAtMs=now;resolved=true}
  if(!S(rec.form)){rec.templatePendingV340=true;rec.templatePendingReason="WAITING_AC_TYPE_OR_SUPPORTED_CARRIER";rec.ksPendingPayloadKeyV344=payloadKey(p);rec.ksPendingRevisionV344=payloadRevision(p);rec.updatedAt=now;return {record:rec,created,resolved}}
  const {all,data}=readRecordData(rec),seed=identitySeed(p,rec.form);for(const [k,v] of Object.entries(seed))if(S(v)&&!S(data[k]))data[k]=v;all[rec.form]=data;try{localStorage.setItem(root.finalSheetDataKey(rec.id),JSON.stringify(all))}catch(_){}rec.dateToken=dt;rec.flightToken=flt;if(!S(rec.acRegToken))rec.acRegToken=rg;rec.updatedAt=now;return {record:rec,created,resolved}}

function applyRecord(rec,p){const {all,data}=readRecordData(rec);if(!matches(rec,data,p))return {matched:false,changed:false,conflicts:[]};const map=fieldMap(rec.form);if(!map){rec.ksPendingPayloadKeyV344=payloadKey(p);rec.ksPendingRevisionV344=payloadRevision(p);return {matched:true,changed:false,conflicts:[],pendingTemplate:true}}
  const no=payloadRevision(p),last=Number(rec.ksAutofillRevisionV344||rec.ksAutofillRevisionV343||0),locked=hasSentFinal(rec)&&no>last,source=payloadValues(p),previous=(rec.ksAutofillValuesV344&&typeof rec.ksAutofillValuesV344==="object")?{...rec.ksAutofillValuesV344}:((rec.ksAutofillValuesV343&&typeof rec.ksAutofillValuesV343==="object")?{...rec.ksAutofillValuesV343}:{}),written={},conflicts=[];
  for(const [name,key] of Object.entries(map)){const raw=source[name];if(raw===null)continue;const next=String(raw),cur=S(data[key]),prev=S(previous[key]);if(locked){if(cur!==next)conflicts.push(key);continue}if(!cur||(prev&&cur===prev)){if(cur!==next){data[key]=next;written[key]=next}else if(prev)written[key]=next}else if(cur!==next)conflicts.push(key)}
  const seed=identitySeed(p,rec.form);for(const [key,next0] of Object.entries(seed)){const next=S(next0),cur=S(data[key]);if(next&&!cur&&!locked){data[key]=next;written[key]=next}}
  const changed=Object.keys(written).length>0;if(changed){applyFormulas(rec.form,data);all[rec.form]=data;localStorage.setItem(root.finalSheetDataKey(rec.id),JSON.stringify(all))}
  rec.ksAutofillRevisionV344=Math.max(last,no);rec.ksAutofillAtMsV344=Date.now();rec.ksAutofillSourceDocIdV344=S(p?.internalApprovalRequestId||p?.canonicalDocId||"");rec.ksAutofillValuesV344={...previous,...written};delete rec.ksPendingPayloadKeyV344;
  if(conflicts.length||locked){rec.ksPendingRevisionV121=no;rec.ksPendingAtMsV121=Number(p?.submittedAtMs||Date.now())}else{delete rec.ksPendingRevisionV121;delete rec.ksPendingAtMsV121;delete rec.ksPendingChangesV121}rec.updatedAt=Date.now();return {matched:true,changed,conflicts,locked,written:Object.keys(written),sourceCount:Object.values(source).filter(x=>x!==null).length}}

const activeRefreshTimers=new Map();
function refreshActive(rec,result){if(!result.changed||activeId()!==S(rec.id))return;const id=S(rec.id),started=Date.now();clearTimeout(activeRefreshTimers.get(id));const run=()=>{if(activeId()!==id){activeRefreshTimers.delete(id);return}const focused=document.activeElement?.closest?.("#finalFormFields");if(focused&&Date.now()-started<30000){activeRefreshTimers.set(id,setTimeout(run,400));return}if(focused){activeRefreshTimers.delete(id);return}try{root.renderFinalFields?.(rec.form);root.v121RefreshValidation?.()}catch(_){}activeRefreshTimers.delete(id)};activeRefreshTimers.set(id,setTimeout(run,60))}
function applyAll(p,{notify=true,createMissing=true}={}){if(!p||!["CBTT","AD"].includes(role()))return {matched:0,changed:0,conflicts:0,created:0,pending:0,locked:0,missingSource:0,missingIdentity:0,identityMismatch:0};cachePayload(p);let list=[];try{list=root.readFinalSheetList?.()||[]}catch(_){return {matched:0,changed:0,conflicts:0,created:0,pending:0,locked:0,missingSource:0,missingIdentity:0,identityMismatch:0}}let created=0,missingIdentity=0,identityMismatch=0;if(createMissing){const e=ensureFinalRecord(list,p);if(e.created)created++;if(e.missingIdentity)missingIdentity++;if(e.identityMismatch)identityMismatch++}
  let matched=0,changed=0,conflicts=0,locked=0,missingSource=0;const pendingIds=new Set();for(const rec of list){const r=applyRecord(rec,p);if(!r.matched)continue;matched++;if(r.changed)changed++;if(r.pendingTemplate)pendingIds.add(S(rec.id));conflicts+=r.conflicts.length;if(r.locked)locked++;if(r.sourceCount===0)missingSource++;refreshActive(rec,r)}const pending=pendingIds.size;if(matched||created)try{root.writeFinalSheetList?.(list)}catch(_){}
  const result={matched,changed,conflicts,created,pending,locked,missingSource,missingIdentity,identityMismatch};
  if(notify){let msg="";if(changed)msg=`✓ KẾT SỔ LẦN ${payloadRevision(p)} ĐÃ TỰ ĐIỀN VÀO FINAL.`;else if(missingIdentity)msg="⚠ KẾT SỔ THIẾU NGÀY, CHUYẾN ĐI HOẶC A/C REG · KHÔNG GHÉP FINAL.";else if(identityMismatch)msg="⚠ FINAL CÙNG NGÀY + CHUYẾN NHƯNG A/C REG KHÔNG TRÙNG · KHÔNG TỰ ĐIỀN.";else if(pending)msg="✓ ĐÃ NHẬN KẾT SỔ · FINAL ĐANG CHỜ XÁC ĐỊNH ĐÚNG MẪU.";else if(locked)msg="⚠ ĐÃ NHẬN KẾT SỔ · FINAL NÀY ĐÃ GỬI, KHÔNG TỰ GHI ĐÈ.";else if(conflicts)msg="⚠ ĐÃ NHẬN KẾT SỔ · FINAL CÓ SỐ ĐÃ NHẬP TAY, CẦN KIỂM TRA.";else if(missingSource)msg="⚠ ĐÃ NHẬN KẾT SỔ NHƯNG NGUỒN CHƯA CÓ ADL/CHD/INF/BAG ĐỂ ĐIỀN.";else if(!matched)msg="⚠ CHƯA GHÉP ĐƯỢC FINAL TRÙNG NGÀY + CHUYẾN ĐI + A/C REG.";else if(created)msg="✓ ĐÃ TẠO FINAL TƯƠNG ỨNG.";if(msg)try{root.showToast?.(msg)}catch(_){}}
  try{root.__SAGS_V355_LAST_AUTOFILL={atMs:Date.now(),dateToken:payloadDate(p),flightToken:targetFlights(p)[0]||"",acRegToken:payloadReg(p),revisionNo:payloadRevision(p),...result}}catch(_){}return result}

function cachedForRecord(rec){const {data}=readRecordData(rec),id=recordIdentity(rec,data);if(!id.reg)return null;const box=readInbox();for(const dt of id.dateTokens)for(const flt of id.flights){const exact=box?.[dt+"|"+flt+"|"+id.reg]?.latest;if(exact&&payloadReg(exact)===id.reg)return exact;const legacy=box?.[dt+"|"+flt]?.latest;if(legacy&&payloadReg(legacy)===id.reg)return legacy}return null}
async function durableForRecord(rec){if(typeof root.sagsV470Ref!=="function")return null;const {data}=readRecordData(rec),id=recordIdentity(rec,data);if(!id.reg)return null;for(const dt of id.dateTokens)for(const flt of id.flights){let snap=await root.sagsV470Ref(`${IDENTITY_ROOT}/${safe(dt)}/${safe(flt)}/${safe(id.reg)}`).once("value"),v=snap.val?.()||null,p=v?.payload||v||null;if(p&&payloadReg(p)===id.reg)return p;snap=await root.sagsV470Ref(`${INDEX_ROOT}/${safe(dt)}/${safe(flt)}`).once("value");v=snap.val?.()||null;p=v?.payload||v||null;if(p&&payloadReg(p)===id.reg)return p}return null}
async function firestoreForRecord(rec){const {data}=readRecordData(rec),id=recordIdentity(rec,data);if(!id.dateToken||!id.flight||!id.reg||typeof root.initHandoverFirebase!=="function")return null;const db=root.initHandoverFirebase(),arr=[];if(typeof root.fs09MakeMatchKey==="function"){const key=root.fs09MakeMatchKey(id.dateToken,id.flight,id.reg,"CXR");if(key){const snap=await db.collection(collectionName()).where("matchKeys","array-contains",key).limit(12).get();snap.forEach(doc=>{const d=doc.data()||{};if(U(d.kind)==="FSAGS09_CLOSEOUT"&&payloadReg(d)===id.reg)arr.push(d)})}}
  if(!arr.length){const snap=await db.collection(collectionName()).where("kind","==","fsags09_closeout").limit(80).get();snap.forEach(doc=>{const d=doc.data()||{};if(payloadDate(d)===id.dateToken&&targetFlights(d).includes(id.flight)&&payloadReg(d)===id.reg)arr.push(d)})}return arr.sort((a,b)=>payloadRevision(b)-payloadRevision(a)||Number(b?.submittedAtMs||0)-Number(a?.submittedAtMs||0))[0]||null}
async function syncRecord(id,{notify=true}={}){const rec=(root.readFinalSheetList?.()||[]).find(x=>S(x.id)===S(id));if(!rec)return false;let found=false;const cached=cachedForRecord(rec);if(cached){applyAll(cached,{notify,createMissing:false});found=true}try{const d=await durableForRecord(rec);if(d){applyAll(d,{notify,createMissing:false});found=true;return true}}catch(e){console.info("V3.59 durable closeout RTDB",e?.message||e)}/* V3.59 READ FIX: tuyệt đối không fallback Firestore query tự động. Trước đây mỗi sync FINAL có thể đọc 12 + 80 docs; khi bootstrap/sửa identity sẽ nhân lên rất lớn. Firestore canonical chỉ dùng khi thao tác nghiệp vụ thực sự cần, không dùng để tự đồng bộ nền. */return found}
async function syncAll({notify=false}={}){if(!["CBTT","AD"].includes(role()))return 0;const list=root.readFinalSheetList?.()||[],seen=new Set();let n=0;for(const rec of list){const {data}=readRecordData(rec),id=recordIdentity(rec,data),k=id.dateToken+"|"+id.flight+"|"+id.reg;if(!id.dateToken||!id.flight||!id.reg||seen.has(k))continue;seen.add(k);if(await syncRecord(rec.id,{notify}))n++}return n}
function rosterDepartureFlight(x){return lastFlight(x?.depFlight||x?.flightToken)||lastFlight(x?.flightRaw||x?.flightName)||lastFlight(x?.arrFlight)}
async function syncAssignedCloseouts({notify=false}={}){if(role()!=="CBTT"||!me()||typeof root.sagsV470Ref!=="function")return 0;let items={};try{items=(await root.sagsV470Ref(`roster_mail/${safe(me())}/items`).once("value")).val?.()||{}}catch(e){console.info("V3.55 assigned FINAL mailbox",e?.message||e);return 0}const wanted=new Map();for(const x of Object.values(items)){if(!x||x.active===false||U(x.formGroup)!=="FINAL")continue;const dt=dateToken(x.depFlightDate||x.opDate||x.date),flt=rosterDepartureFlight(x),rg=reg(x.acReg||x.acRegToken||x.regn);if(dt&&flt&&rg)wanted.set(dt+"|"+flt+"|"+rg,{dt,flt,rg})}let n=0;for(const {dt,flt,rg} of wanted.values())try{let snap=await root.sagsV470Ref(`${IDENTITY_ROOT}/${safe(dt)}/${safe(flt)}/${safe(rg)}`).once("value"),v=snap.val?.()||null,p=v?.payload||v||null;if(!p){snap=await root.sagsV470Ref(`${INDEX_ROOT}/${safe(dt)}/${safe(flt)}`).once("value");v=snap.val?.()||null;p=v?.payload||v||null}if(p&&payloadReg(p)===rg){applyAll(p,{notify,createMissing:true});n++}}catch(e){console.info("V3.55 assigned closeout",dt,flt,rg,e?.message||e)}return n}
async function bootstrapSync({notify=false}={}){await syncAssignedCloseouts({notify});return await syncAll({notify})}

root.sagsV344PersistApprovedCloseout=async function(p,docId=""){if(!p||typeof root.sagsV470Ref!=="function")return false;const dt=payloadDate(p),fs=targetFlights(p),rg=payloadReg(p);if(!dt||!fs.length||!rg)return false;const patch={},at=Date.now();for(const f of fs){const node={schema:3,docId:S(docId),dateToken:dt,flightToken:f,acRegToken:rg,revisionNo:payloadRevision(p),approvedAtMs:Number(p?.internalApprovedAtMs||at),updatedAtMs:at,payload:clone(p)};patch[`${IDENTITY_ROOT}/${safe(dt)}/${safe(f)}/${safe(rg)}`]=node;patch[`${INDEX_ROOT}/${safe(dt)}/${safe(f)}`]=node}await root.sagsV470Ref("").update(patch);return true};
root.sagsV348PublishApprovedCloseout=async function(p,docId="",meta={}){
  if(!p||typeof root.sagsV470Ref!=="function")return false;
  const dt=payloadDate(p),fs=targetFlights(p),rg=payloadReg(p),revision=payloadRevision(p);
  if(!dt||!fs.length||!rg||!S(docId))return false;
  const at=Number(meta?.eventAtMs||Date.now()),eventId=S(meta?.eventId||`${docId}|R${revision}|${at}`);
  const signal={
    kind:"sags_closeout_signal_v348",schema:1,eventId,eventAtMs:at,docId:S(docId),
    closeoutNo:revision,revisionNo:revision,dateToken:dt,flights:fs,
    matchKeys:Array.isArray(p?.matchKeys)?p.matchKeys.slice():(Array.isArray(p?.identity?.matchKeys)?p.identity.matchKeys.slice():[]),
    acRegToken:rg,
    sourceDeviceId:S(meta?.sourceDeviceId||p?.sourceDeviceId),
    sourceSessionId:S(p?.sourceSessionId),
    sourceUser:S(meta?.sourceUser||p?.submittedBy?.username),
    sourceRole:U(meta?.sourceRole||p?.submittedBy?.role||"PVHK"),
    approvedBy:clone(p?.internalApprovedBy||null),approvedAtMs:Number(p?.internalApprovedAtMs||at),
    targetRoles:["DH","CBTT","AD"],payload:clone(p),build:BUILD
  };
  const patch={},eventNode=safe(`${docId}_R${String(revision).padStart(3,"0")}`);
  patch[`${EVENTS_ROOT}/${eventNode}`]=signal;
  patch[`closeouts/${safe(docId)}`]={
    kind:"sags_closeout_pointer_v348",docId:S(docId),eventId,eventAtMs:at,
    submittedAtMs:Number(p?.submittedAtMs||at),closeoutNo:revision,
    matchKeys:signal.matchKeys,dateToken:dt,flights:fs,acRegToken:signal.acRegToken,
    sourceDeviceId:signal.sourceDeviceId,sourceSessionId:signal.sourceSessionId,build:BUILD
  };
  if(meta?.includeLatest!==false)patch["closeout/latest"]=signal;
  for(const f of fs){const node={schema:3,docId:S(docId),dateToken:dt,flightToken:f,acRegToken:rg,revisionNo:revision,approvedAtMs:signal.approvedAtMs,updatedAtMs:at,payload:clone(p)};patch[`${IDENTITY_ROOT}/${safe(dt)}/${safe(f)}/${safe(rg)}`]=node;patch[`${INDEX_ROOT}/${safe(dt)}/${safe(f)}`]=node}
  await root.sagsV470Ref("").update(patch);
  try{applyAll(p,{notify:true,createMissing:true})}catch(_){}
  return true;
};
root.sagsV344ApplyCloseoutToFinals=(p,o)=>Promise.resolve(applyAll(p,o));
root.sagsV343ApplyCloseoutToFinals=root.sagsV344ApplyCloseoutToFinals;
root.sagsV344SyncFinalRecord=(id,o)=>syncRecord(id,o);
root.sagsV343SyncFinalRecord=root.sagsV344SyncFinalRecord;
root.sagsV344SyncAllFinals=o=>syncAll(o);
root.sagsV344SyncAssignedCloseouts=o=>syncAssignedCloseouts(o);

let syncTimer=0;function scheduleActiveSync(){clearTimeout(syncTimer);syncTimer=setTimeout(()=>{const id=activeId();if(id)syncRecord(id,{notify:true})},360)}
function installHooks(){const open=root.openFinalSheetRecord;if(typeof open==="function"&&!open.__v344){const w=function(id){const out=open.apply(this,arguments);setTimeout(()=>syncRecord(id,{notify:true}),120);return out};w.__v344=true;root.openFinalSheetRecord=w;try{openFinalSheetRecord=w}catch(_){}}
  const manager=root.openFinalSheetManager;if(typeof manager==="function"&&!manager.__v344){const w=function(){const out=manager.apply(this,arguments);setTimeout(()=>bootstrapSync({notify:false}).then(()=>root.renderFinalSheetManager?.()),120);return out};w.__v344=true;root.openFinalSheetManager=w;try{openFinalSheetManager=w}catch(_){}}
  const save=root.ffSaveField;if(typeof save==="function"&&!save.__v344){const w=function(form,key,val){const out=save.apply(this,arguments);if(["date","flight","acreg"].includes(S(key)))scheduleActiveSync();return out};w.__v344=true;root.ffSaveField=w;try{ffSaveField=w}catch(_){}}
  const ensure=root.sagsV340EnsureFinalForRoster;if(typeof ensure==="function"&&!ensure.__v344){const w=async function(){const out=await ensure.apply(this,arguments);if(out?.record?.id)setTimeout(()=>syncRecord(out.record.id,{notify:true}),80);return out};w.__v344=true;root.sagsV340EnsureFinalForRoster=w}}
function installSignalMirrorHook(){
  const base=root.sagsV470Ref;if(typeof base!=="function"||base.__v344CloseoutMirror)return false;
  const w=function(path=""){
    const ref=base.apply(this,arguments);
    if(S(path)===`${INDEX_ROOT}`||S(path).startsWith(`${INDEX_ROOT}/`)||S(path)===IDENTITY_ROOT||S(path).startsWith(`${IDENTITY_ROOT}/`)||S(path)===EVENTS_ROOT||S(path).startsWith(`${EVENTS_ROOT}/`))return ref;
    if(S(path)==="closeout/latest"&&ref&&typeof ref.set==="function"&&!ref.set.__v344CloseoutMirror){
      const set=ref.set.bind(ref),setWrap=async function(value){
        const out=await set(value),p=value?.payload||null;
        if(p)try{
          await root.sagsV348PublishApprovedCloseout(p,S(value?.docId),{
            eventAtMs:Number(value?.eventAtMs||Date.now()),eventId:S(value?.eventId),
            sourceDeviceId:S(value?.sourceDeviceId),sourceUser:S(value?.sourceUser),
            sourceRole:S(value?.sourceRole),includeLatest:false
          });
        }catch(e){console.info("V3.55 publish approved closeout",e?.message||e)}
        return out;
      };
      setWrap.__v344CloseoutMirror=true;ref.set=setWrap;
    }
    return ref;
  };
  w.__v344CloseoutMirror=true;w.__v344CloseoutMirrorBase=base;root.sagsV470Ref=w;try{sagsV470Ref=w}catch(_){}return true;
}
function install(){installSignalMirrorHook();installHooks();/* V3.59 READ FIX: không quét toàn bộ danh sách FINAL lúc khởi động. Chỉ đồng bộ roster được giao qua RTDB; FINAL đang mở sẽ sync khi người dùng mở record. */setTimeout(()=>syncAssignedCloseouts({notify:false}),700)}
install();
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(install,80),{once:true});else setTimeout(install,80);root.addEventListener("pageshow",()=>setTimeout(install,180),{passive:true});root.addEventListener("online",()=>setTimeout(()=>bootstrapSync({notify:false}),300),{passive:true});
root.__SAGS_V344_BUILD=BUILD;
root.__SAGS_V344_HDSD="V3.55: KẾT SỔ chỉ ghép FINAL khi trùng đủ ngày khai thác + chuyến đi + A/C Reg. A/C Type không phải khóa ghép và không bắt buộc nhập; hệ thống chỉ tra Fleet theo Reg để chọn mẫu VJ khi cần tạo tờ mới.";
root.__SAGS_V344_TEST__={payloadDate,payloadReg,allPayloadFlights,targetFlights,flightTokens,lastFlight,payloadValues,fieldMap,formForPayload,tripMatches,matches,recordIdentity,applyRecord,ensureFinalRecord,payloadKey,hasSentFinal,rosterDepartureFlight};
})(typeof window!=="undefined"?window:globalThis);

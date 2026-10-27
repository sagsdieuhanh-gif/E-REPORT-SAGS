(()=>{'use strict';if(window.__TVJ632)return;window.__TVJ632='V6.3.17-20260925-VZ-NA-IMMEDIATE-19';
const G='tvjgof035',P=15,W=1241,H=1755,F='tvj_gof_035',X='vz_';let form=null,tab=0,draft={},sections=[[],[],[]],lastFocusedKey='';
const DAMAGE_KEY='vz_damageFound';
 const NIL='NIL',isNil=v=>/^(?:NIL|N\/A)$/i.test(S(v)),isSlash=v=>S(v)==='/';
const S=v=>String(v??'').trim(),E=v=>S(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// Only TVJ: if no selection exists, NOTOC defaults to NO. Existing YES wins.
function defaultNotocNo(flags){if(!flags)return false;const y=X+'notocYes',n=X+'notocNo';if(flags[y]){if(flags[n]){flags[n]=false;return true}return false}if(!flags[n]){flags[n]=true;return true}return false}
const active=()=>{try{const g=S(typeof activeFormGroup!=='undefined'?activeFormGroup:window.activeFormGroup).toLowerCase();if(g)return g===G}catch(_){}try{const sid=S(typeof activeFlightSessionId!=='undefined'?activeFlightSessionId:window.activeFlightSessionId);if(!sid||typeof readFlightSessionEnvelope!=='function')return false;const env=readFlightSessionEnvelope(sid)||{},g=S(env.activeFormGroup||env.mainForm).toLowerCase();return g===G}catch(_){return false}};
async function load(){if(form)return form;try{form=window.sagsV450GetFormRegistry?.()?.forms?.find(x=>S(x.id)===F)||null}catch(_){}if(!form){const pending=window.__SAGS_TVJ_GOF_REGISTRY_PENDING||(window.__SAGS_TVJ_GOF_REGISTRY_PENDING=fetch('./forms/forms.registry.json?t='+Date.now(),{cache:'no-store'}).then(r=>{if(r.ok===false)throw new Error('TVJ registry HTTP '+r.status);return r.json()}).catch(e=>{window.__SAGS_TVJ_GOF_REGISTRY_PENDING=null;throw e}));const j=await pending;form=(j.forms||[]).find(x=>S(x.id)===F)}return form}
function rt(t){t=S(t).toLowerCase();return t==='checkbox'?'check':t==='time'?'time':t==='date'?'date':t==='number'?'number':t==='textarea'?'textarea':'text'}
function bindOf(q){return S(q.bind||X+q.key)}
function accountProfile(){try{return window.__sagsGetSession?.()?.profile||window.currentUserProfile||{}}catch(_){return window.currentUserProfile||{}}}
function accountStaffId(p){let raw=S(p?.employeeCode||p?.staffCode||p?.employeeId||p?.staffId||p?.employeeNo||p?.staffNo).toUpperCase();if(!raw)return '';raw=raw.replace(/^CXR[\s_-]*/,'').replace(/\s+/g,'');return raw?'CXR-'+raw:''}
function seedAccountIdentity(doPersist=true){try{if(typeof state!=='object'||!state)return false;const p=accountProfile(),name=S(p?.name||p?.fullName||p?.displayName||p?.username),staff=accountStaffId(p);let changed=false;const put=(k,v)=>{if(v&&S(state[k])!==v){state[k]=v;changed=true}};put('acuStart_copy',name);put('Name_copy',staff);put(X+'staffName',name);put(X+'staffId',staff);for(const q of form?.fields||[]){const key=S(q.key).toUpperCase();if(key!=='NAME'&&key!=='STAFF_ID')continue;put(bindOf(q),key==='NAME'?name:staff)}if(changed&&doPersist){try{persist()}catch(_){}try{draw()}catch(_){}}return changed}catch(_){return false}}
// Mapping verified against the PRINTED TVJ-GOF-035 REV06 rectangles, not approximate Y slices.
// The header + 12 printed operation rectangles contain 128 fields. Four registry fields
// (FOD x2, Name/Staff ID x2) cannot be confirmed in the supplied image: preserve
// them in a clearly labeled review section; do not claim they belong to any box.
// A stable explicit key map prevents splitting sub-boxes (e.g. NOTOC inside Departure).
const TVJ_REGIONS=[
 {
  "id": "header",
  "title": "THÔNG TIN CHUYẾN",
  "keys": [
   "flightNumber",
   "acRegistration",
   "station",
   "date",
   "routing",
   "acTypeA320",
   "acTypeA321",
   "acTypeB7378",
   "parkingPosition",
   "sta",
   "eta",
   "ata",
   "std",
   "etd",
   "atd"
  ]
 },
 {
  "id": "arrival",
  "title": "ARRIVAL FLIGHT",
  "keys": [
   "arrCoordinatorStandby",
   "totalPaxLdm",
   "arrBaggagePcs",
   "arrBaggageKgs",
   "arrBaggageLoadedIn",
   "arrCargoPcs",
   "arrCargoKgs",
   "arrCargoLoadedIn"
  ]
 },
 {
  "id": "departure",
  "title": "DEPARTURE FLIGHT · FINAL CARGO / NOTOC",
  "keys": [
   "depCoordinatorStandby",
   "finalCargoPcs",
   "finalCargoKgs",
   "notocYes",
   "notocNo",
   "wheelchairBattery",
   "dangerousGoodsCargo",
   "flightCrewArrive"
  ]
 },
 {
  "id": "bag_unload",
  "title": "BAGGAGE UNLOADING",
  "keys": [
   "baggageUnloadStart",
   "baggageUnloadFinish",
   "baggageUnloadFirstCart",
   "baggageUnloadFirstTractor",
   "baggageUnloadLastCart",
   "baggageUnloadLastTractor",
   "baggageUnloadCartNo"
  ]
 },
 {
  "id": "bag_load",
  "title": "BAGGAGE LOADING",
  "keys": [
   "baggageLoadStart",
   "baggageLoadFinish",
   "baggageLoadFirstCart",
   "baggageLoadFirstTractor",
   "baggageLoadLastCart",
   "baggageLoadLastTractor",
   "baggageLoadCartNo"
  ]
 },
 {
  "id": "cargo_unload",
  "title": "CARGO UNLOADING",
  "keys": [
   "cargoUnloadStart",
   "cargoUnloadFinish",
   "cargoUnloadFirstCart",
   "cargoUnloadFirstTractor",
   "cargoUnloadLastCart",
   "cargoUnloadLastTractor",
   "cargoUnloadCartNo"
  ]
 },
 {
  "id": "cargo_load",
  "title": "CARGO LOADING",
  "keys": [
   "cargoLoadStart",
   "cargoLoadFinish",
   "cargoLoadFirstCart",
   "cargoLoadFirstTractor",
   "cargoLoadLastCart",
   "cargoLoadLastTractor",
   "cargoLoadCartNo",
   "cargoDocumentsReceived"
  ]
 },
 {
  "id": "equipment",
  "title": "EQUIPMENT / MANPOWER",
  "keys": [
   "loaderRampStaffTotal",
   "loaderRampStaffTime",
   "conveyorStandbyTotal",
   "conveyorStandbyTime",
   "passengerStepStandbyTotal",
   "passengerStepStandbyTime"
  ]
 },
 {
  "id": "final",
  "title": "FINAL FIGURE · PASSENGER / BAGGAGE",
  "keys": [
   "finalTotalPax",
   "checkinClosed",
   "finalAdult",
   "finalChild",
   "finalInfant",
   "zone0A",
   "zone0B",
   "zone0C",
   "psaBaggagePcs",
   "psaBaggageKgs",
   "actualLoadedBaggagePcs"
  ]
 },
 {
  "id": "irregular",
  "title": "IRREGULARITIES / DELAY / DAMAGE REPORT",
  "keys": [
   "irregularityReport"
  ]
 },
 {
  "id": "offloaded",
  "title": "OFFLOADED · PASSENGER / BAGGAGE",
  "keys": [
   "offloadStandbyTime",
   "offloadConfirmTime",
   "offloadTotalPax",
   "offloadBagPcs",
   "offloadBagKgs",
   "offloadBagTags",
   "offloadTractorNo",
   "offloadDeliveryTime"
  ]
 },
 {
  "id": "inspection",
  "title": "A/C COMPARTMENT VISUAL INSPECTION",
  "keys": [
   "fwdCompartmentChecked",
   "fwdCompartmentTime",
   "fwdDividerNet",
   "fwdDividerNetTime",
   "fwdAllRestraints",
   "fwdAllRestraintsTime",
   "fwdPlacard",
   "fwdPlacardTime",
   "aftCompartmentChecked",
   "aftCompartmentTime",
   "aftDividerNet",
   "aftDividerNetTime",
   "aftAllRestraints",
   "aftAllRestraintsTime",
   "aftPlacard",
   "aftPlacardTime",
   "loadingWithinLimit",
   "loadingWithinLimitTime",
   "noDamageFound",
   "noDamageFoundTime",
   "damageFound",
   "damageFoundTime"
  ]
 },
 {
  "id": "departure_service",
  "title": "LIR / GROUND SERVICES",
  "keys": [
   "lirPresent",
   "lirComplete",
   "refuelingStart",
   "refuelingComplete",
   "boardingComplete",
   "cabinDoorClosed",
   "cargoCompartmentClosed",
   "pushbackTruckStandby",
   "potableWaterStart",
   "potableWaterComplete",
   "lavatoryStart",
   "lavatoryComplete",
   "brakeCoolingStart",
   "brakeCoolingComplete",
   "gpuStart",
   "gpuComplete",
   "asuStart",
   "asuComplete",
   "acuStart",
   "acuComplete"
  ]
 },
 {
  "id": "unverified",
  "title": "⚠ CẦN ĐỐI CHIẾU · FOD / NAME / STAFF ID",
  "keys": [
   "fodInspectionChecked",
   "fodInspectionTime",
   "Name",
   "STAFF_ID"
  ],
  "provisional": true
 }
];
// Canonical TVJ field order for both the 14-area quick wizard and the native
// Save/Next editor. The registry's printed rectangles own region membership.
// Never derive groups from string stems: "vz_" fields would otherwise become
// 128 isolated groups, disabling Next after ARR BAGGAGE PCS.
const TVJ_ENTRY_FIELD_MAP_V2539=new Map();
for(const region of TVJ_REGIONS){
 region.keys.forEach((key,order)=>{
  const bind=key==='Name'?'acuStart_copy':key==='STAFF_ID'?'Name_copy':X+key;
  if(TVJ_ENTRY_FIELD_MAP_V2539.has(bind))throw Error('TVJ duplicate entry field '+bind);
  TVJ_ENTRY_FIELD_MAP_V2539.set(bind,Object.freeze({id:region.id,title:region.title,order,provisional:!!region.provisional}));
 });
}
window.sagsTvjEntryRegionV2539=key=>TVJ_ENTRY_FIELD_MAP_V2539.get(S(key))||null;
let regionLabels=TVJ_REGIONS.map(r=>r.title);
function sectionOf(q){
 const k=S(q?.key);
 return TVJ_REGIONS.findIndex(r=>r.keys.includes(k));
}
function buildSections(){
 sections=TVJ_REGIONS.map(()=>[]);
 regionLabels=TVJ_REGIONS.map(r=>r.title);
 const byKey=new Map((form?.fields||[]).map(q=>[S(q.key),q]));
 const claimed=new Set();
 for(let i=0;i<TVJ_REGIONS.length;i++){
  for(const k of TVJ_REGIONS[i].keys){
   const q=byKey.get(k);
   if(!q)continue;
   const bind=bindOf(q);
   if(!bind||claimed.has(bind))continue;
   claimed.add(bind);
   sections[i].push({k:bind,label:S(q.label||q.key||bind),type:rt(q.type),key:k});
  }
 }
 // Newly introduced registry fields remain accessible, but are never guessed into
 // a printed rectangle. These entries stay in the clearly marked review section.
 const unverified=TVJ_REGIONS.findIndex(r=>r.provisional);
 const leftovers=(form?.fields||[]).filter(q=>!claimed.has(bindOf(q)));
 for(const q of leftovers){
  const bind=bindOf(q);if(!bind||claimed.has(bind))continue;
  claimed.add(bind);
  sections[unverified].push({k:bind,label:S(q.label||q.key||bind),type:rt(q.type),key:S(q.key)});
 }
 if(leftovers.length)console.warn('TVJ fields require rectangle verification:',leftovers.map(q=>q.key));
}
// Legacy N/A is converted only for the TVJ form's own bound fields.
function migrateTvjNil(){
 if(!active()||!form||typeof state!=='object'||!state)return false;
 let changed=false;
 for(const q of form.fields||[]){
  const key=S(q.key).toUpperCase();
  if((rt(q.type)==='check'&&key!=='DAMAGEFOUND')||key==='NAME'||key==='STAFF_ID'||key==='STAFFID')continue;
  const k=bindOf(q);
  if(S(state[k]).toUpperCase()==='N/A'){state[k]=NIL;changed=true}
 }
 return changed;
}
function ensureStyle(){if(document.getElementById('tvj632QuickStyle'))return;const st=document.createElement('style');st.id='tvj632QuickStyle';st.textContent='.vz632ChoiceCell{display:flex;gap:8px;flex-wrap:wrap}.vz632ChoiceCell .vz632Toggle{flex:1;min-width:90px}.vz632DamageOverlay{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,19,33,.7)}.vz632DamageDialog{width:min(100%,370px);padding:20px;border-radius:16px;background:#f5f9fe;color:#17324a;box-shadow:0 16px 46px #061b30aa;font:600 14px system-ui,Arial,sans-serif}.vz632DamageDialog h3{margin:0 0 8px;font-size:18px}.vz632DamageDialog p{margin:0 0 16px;line-height:1.5}.vz632DamageActions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.vz632DamageActions button{min-height:48px;border:1px solid #96b0c5;border-radius:10px;background:#edf4fa;color:#17324a;font:800 16px system-ui,Arial,sans-serif}.vz632DamageActions button.on{background:#16734a;border-color:#16734a;color:#fff}.vz632DamageCancel{margin-top:12px;width:100%;min-height:42px;background:transparent;border:0;color:#3e647f;font-weight:700}.vz632RegionReview{padding:10px 12px;margin:6px 0 12px;background:#fff3dc;border:1px solid #d9a851;border-radius:10px;color:#654312;font:600 12px/1.5 system-ui,Arial,sans-serif}.vz632Toggle{width:100%;min-height:38px;border:1px solid #aebdca;border-radius:8px;background:#eef3f7;color:#30465a;font:900 13px Arial}.vz632Toggle.on{background:#1f7a4c;border-color:#1f7a4c;color:#fff}.quickTimeRow.vz632Wide{grid-template-columns:1fr!important}.quickTimeRow.vz632Wide .quickTimeInput{min-height:100px;resize:vertical;line-height:1.35}.quickTimePageTitle .vz632Count{font-weight:700;opacity:.75;margin-left:6px}.vz632RegionSelect{display:block;width:100%;min-height:44px;padding:9px 12px;margin:0 0 12px;border:1px solid #799db8;border-radius:10px;color:#173c57;background:#f0f7fd;font:700 13px system-ui,Arial,sans-serif;box-sizing:border-box}.vz632RegionHelp{font:12px/1.45 system-ui,Arial,sans-serif;color:#36526b;margin:0 0 10px}.quickTimePageTitle{overflow-wrap:anywhere}#qteTab0:disabled,#qteTab2:disabled{opacity:.45;cursor:not-allowed}@media(max-width:640px){.vz632RegionSelect{font-size:14px;min-height:48px}.quickTimePageTitle{font-size:14px}}';document.head.appendChild(st)}
// Never preload the 1MB form registry or inspect all rendered fields on non-TVJ
// flights. Some shared visibility/role callbacks fire repeatedly on both PC/mobile.
let ensurePending=null,preparedForm=null,preparedFieldArray=null,preparedLength=-1;
async function ensure(){
 if(!active())return;
 if(ensurePending)return ensurePending;
 ensurePending=(async()=>{
  const z=await load();if(!z||!active())return;form=z;
  let geometryChanged=false;
  const hasValidMap=preparedForm===z&&preparedFieldArray===fields&&preparedLength===fields.length&&sections.length>0;
  if(!hasValidMap){
   // Create one index instead of scanning the full runtime field array 128 times.
   const current=new Map();
   for(const entry of fields)if(+entry.page===P)current.set(S(entry.key),entry);
   for(const q of z.fields||[]){
    const k=bindOf(q),o=current.get(k);
    if(o){if(o.__formManagerCustomV463){delete o.__formManagerCustomV463;geometryChanged=true}o.__tvj632=1;continue}
    const a=+q.x*W,b=+q.y*H,c=Math.max(3,+q.w*W),d=Math.max(3,+q.h*H),t=rt(q.type),runtime=t==='check'?'check':t==='time'?'timeNow':t==='date'?'dateAuto':t==='number'?'number':'text';
    add(P,k,a,b,c,d,runtime,S(q.label||q.key),{vx:a,vy:b,vw:c,vh:d,font:+q.fontSize||16,align:S(q.align||'center'),valign:S(q.valign||'middle'),multiline:t==='textarea'||+q.rowCount>1,inputMode:(t==='number'||t==='time')?'numeric':'text',filter:t==='number'?'number':t==='time'?'time':null,leftValue:S(q.align).toLowerCase()==='left'});
    const installed=fields[fields.length-1];installed.__tvj632=1;current.set(k,installed);geometryChanged=true;
   }
   buildSections();
   preparedForm=z;preparedFieldArray=fields;preparedLength=fields.length;
  }
  ensureStyle();
  if(!active())return;
  // Aggregate migration + account identity into at most ONE save and ONE draw.
  const migrated=migrateTvjNil();
  const identityChanged=seedAccountIdentity(false);
  const notocChanged=defaultNotocNo(state);
  if(migrated||identityChanged||notocChanged)try{persist()}catch(_){}
  if(geometryChanged||migrated||identityChanged||notocChanged)try{draw()}catch(_){}
 })();
 try{return await ensurePending}finally{ensurePending=null}
}
function toolbar(){try{document.getElementById('tvjQuickBtn')?.remove();document.getElementById('tvjQuickModal')?.remove()}catch(_){}}
function norm(v){v=S(v);if(isNil(v))return NIL;let d=v.replace(/\D/g,'').slice(0,4);if(!d)return '';if(d.length===3)d='0'+d;if(d.length!==4||+d.slice(0,2)>23||+d.slice(2)>59)return null;return d.slice(0,2)+':'+d.slice(2)}
// TVJ only: '/' marks an optional operation as not applicable, never identity/header.
const NON_SLASH_KEYS=new Set(['DATE','FLIGHTNUMBER','ACREGISTRATION','STATION','ROUTING','PARKINGPOSITION','NAME','STAFF_ID']);
function slashEligible(f){
 return !!f&&f.type!=='check'&&f.type!=='textarea'&&!NON_SLASH_KEYS.has(S(f.key).toUpperCase());
}
function defaultSlashOnNext(key){
 const f=(sections[tab]||[]).find(x=>x.k===key);
 if(!slashEligible(f)||S(draft[key]))return false;
 draft[key]='/';
 for(const el of document.querySelectorAll?.('#quickTimeBody .quickTimeInput')||[])if(S(el.dataset?.vzk)===key){el.value='/';break}
 return true;
}
window.vz632Focus=e=>{lastFocusedKey=S(e?.dataset?.vzk)};
window.vz632Blur=(input,event)=>{
 const next=event?.relatedTarget;
 if(next?.classList?.contains('quickTimeInput'))defaultSlashOnNext(S(input?.dataset?.vzk));
};
window.vz632Next=(input,event)=>{
 if(event?.key!=='Enter'||input?.tagName==='TEXTAREA'||event.shiftKey)return;
 event.preventDefault();
 defaultSlashOnNext(S(input?.dataset?.vzk));
 // Keyboard Next must traverse ALL controls in the same printed rectangle,
 // including checkboxes. Only the LAST control advances to the next rectangle.
 const nodes=Array.from(document.querySelectorAll?.('#quickTimeBody .quickTimeRows .quickTimeInput,#quickTimeBody .quickTimeRows .vz632Toggle')||[]);
 const i=nodes.indexOf(input);
 if(i>=0&&nodes[i+1]){nodes[i+1].focus();nodes[i+1].select?.()}
 else if(tab<sections.length-1)moveRegion(tab+1,true);
 else input.blur?.();
};

function init(){draft={};for(const a of sections)for(const f of a)draft[f.k]=f.type==='check'?(f.k===DAMAGE_KEY&&isNil(state?.[f.k])?NIL:!!state?.[f.k]):(isNil(state?.[f.k])?NIL:S(state?.[f.k]));defaultNotocNo(draft)}
function now(){try{return S(nowHHMM()).replace(':','')}catch(_){const d=new Date();return String(d.getHours()).padStart(2,'0')+String(d.getMinutes()).padStart(2,'0')}}
function cell(f){const k=E(f.k),t=f.type;if(t==='check'&&f.k===DAMAGE_KEY){const v=draft[f.k];return '<div class="quickTimeSingleCell vz632ChoiceCell"><button type="button" class="vz632Toggle '+(v===true?'on':'')+'" aria-pressed="'+(v===true)+'" data-vzk="'+k+'" data-choice="check" onclick="vz632Toggle(this)">✓ TÍCH</button><button type="button" class="vz632Toggle '+(isNil(v)?'on':'')+'" aria-pressed="'+isNil(v)+'" data-vzk="'+k+'" data-choice="nil" onclick="vz632Toggle(this)">NIL</button></div>'}if(t==='check')return '<div class="quickTimeSingleCell"><button type="button" class="vz632Toggle '+(draft[f.k]?'on':'')+'" data-vzk="'+k+'" onclick="vz632Toggle(this)">'+(draft[f.k]?'✓ ĐÃ CHỌN':'— CHƯA CHỌN')+'</button></div>';if(t==='textarea')return '<div class="quickTimeSingleCell"><textarea class="quickTimeInput" data-vzk="'+k+'" data-vzt="textarea" onfocus="vz632Focus(this)" onkeydown="vz632Next(this,event)" onblur="vz632Blur(this,event)" oninput="vz632Input(this)">'+E(draft[f.k])+'</textarea></div>';return '<div class="quickTimeSingleCell"><input class="quickTimeInput" data-vzk="'+k+'" data-vzt="'+E(t)+'" '+('type="text" inputmode="text" enterkeyhint="next"')+' value="'+E(draft[f.k])+'" placeholder="'+(t==='time'?'----':'')+'" onfocus="vz632Focus(this)" onkeydown="vz632Next(this,event)" onblur="vz632Blur(this,event)" oninput="vz632Input(this)">'+(t==='time'?'<button class="quickTimeNow" type="button" data-vzk="'+k+'" onclick="vz632Now(this)">◷</button>':'')+'</div>'}
function render(){
 const body=document.getElementById('quickTimeBody');if(!body)return;
 tab=Math.max(0,Math.min(sections.length-1,tab));
 const title=regionLabels[tab]||'TRƯỜNG BỔ SUNG',rows=sections[tab]||[],total=sections.length;
 const flight=[S(state?.vz_flightNumber)||'VZ',S(state?.vz_date)].filter(Boolean).join(' · ');
 document.getElementById('quickTimeTitle').textContent='NHẬP NHANH VZ · TVJ-GOF-035';
 document.getElementById('quickTimeFlight').textContent=flight;
 const unverified=TVJ_REGIONS[tab]?.provisional===true;
 document.getElementById('quickTimeSub').textContent=unverified?'⚠ TRƯỜNG CHỜ ĐỐI CHIẾU · '+rows.length+' ô':'KHUNG '+(tab+1)+' / 13 · '+title;
 const buttonLabels=['◀ KHU TRƯỚC','CHỌN KHU','KHU TIẾP ▶'];
 buttonLabels.forEach((text,i)=>{
  const btn=document.getElementById('qteTab'+i);if(!btn)return;
  btn.hidden=false;btn.textContent=text;
  btn.disabled=(i===0&&tab===0)||(i===2&&tab===total-1);
  btn.classList.toggle('active',i===1);
 });
 const choices=sections.map((list,i)=>'<option value="'+i+'" '+(i===tab?'selected':'')+'>'+(TVJ_REGIONS[i]?.provisional?'⚠ ĐỐI CHIẾU':'KHUNG '+(i+1)+' / 13')+' · '+E(regionLabels[i])+' ('+list.length+' ô)</option>').join('');
 body.innerHTML='<label class="vz632RegionHelp" for="vz632RegionSelect">13 khu theo biểu mẫu giấy · 1 mục chờ đối chiếu FOD / thông tin xác nhận</label>'+
  '<select class="vz632RegionSelect" id="vz632RegionSelect" aria-label="Chọn khu vực TVJ" onchange="vz632JumpGroup(this.value)">'+choices+'</select>'+
  (unverified?'<p class="vz632RegionReview" role="note">⚠ Các trường FOD và NAME / STAFF ID chưa xác nhận được khung in do phần biểu mẫu gốc không khớp hoặc bị che. Giữ các trường này riêng, không tự gán vào Equipment hoặc Ground Services.</p>':'')+
  '<div class="quickTimePageTitle">'+E(title)+'<span class="vz632Count"> ('+rows.length+' ô)</span></div>'+
  '<div class="quickTimeRows">'+rows.map(f=>'<div class="quickTimeRow single '+(f.type==='textarea'?'vz632Wide':'')+'"><div class="quickTimeLabel">'+E(f.label)+'</div>'+cell(f)+'</div>').join('')+'</div>';
 const nil=document.getElementById('quickTimeNaBtn');if(nil){nil.style.display='';nil.textContent='NIL Ô TRỐNG';nil.setAttribute('aria-label','Điền NIL cho ô trống TVJ');nil.onclick=()=>vz632FillNIL()}
 const bbbt=document.getElementById('quickTimeClearBtn');if(bbbt){bbbt.style.display='';bbbt.textContent='BBBT';bbbt.onclick=()=>vz632BBBT()}
}
window.vz632Input=e=>{const k=S(e.dataset.vzk),t=S(e.dataset.vzt),raw=String(e.value??'');let v=window.SAGSBusinessText?.upper(raw)??raw.toLocaleUpperCase("vi-VN");const mark=/^(?:N|NI|NIL|NA|N\/A|\/)$/i.test(v.trim());if(t==='time'&&!mark)v=v.replace(/[^0-9:]/g,'').slice(0,5);if(t==='number'&&!mark)v=v.replace(/[^0-9.]/g,'');if(isNil(v)||v==='NA')v=NIL;draft[k]=v;if(raw!==v){const caret=e.selectionStart;e.value=v;if(caret!=null)try{e.setSelectionRange(Math.min(caret,v.length),Math.min(caret,v.length))}catch(_){}}};
window.vz632FillNIL=()=>{if(!confirm('Điền NIL cho toàn bộ ô trống của TVJ-GOF-035?\n\nDữ liệu đã nhập và checkbox được giữ nguyên. NAME / STAFF ID vẫn lấy từ tài khoản đăng nhập.'))return;seedAccountIdentity(false);let n=0;for(const f of sections.flat()){if(f.type==='check'||f.key.toUpperCase()==='NAME'||f.key.toUpperCase()==='STAFF_ID')continue;const cur=S(draft[f.k]??state?.[f.k]);if(!cur){draft[f.k]=NIL;state[f.k]=NIL;n++}}seedAccountIdentity(false);try{persist()}catch(_){}try{draw()}catch(_){}render();const st=document.getElementById('quickTimeSaveStatus');if(st)st.textContent=n?'ĐÃ LƯU NIL '+n+' Ô TRỐNG':'KHÔNG CÓ Ô TRỐNG';try{if(n&&typeof showToast==='function')showToast('Đã điền và lưu NIL cho '+n+' ô trống')}catch(_){}};
// Legacy internal shortcut stays compatible, but the TVJ UI always writes NIL.
window.vz632FillNA=()=>window.vz632FillNIL();
window.vz632Toggle=e=>{const k=S(e.dataset.vzk);if(k===X+'damageFound'){draft[k]=e.dataset.choice==='nil'?NIL:true;for(const btn of document.querySelectorAll?.('.vz632Toggle[data-vzk]')||[]){if(S(btn.dataset.vzk)!==k)continue;const on=btn.dataset.choice==='nil'?isNil(draft[k]):draft[k]===true;btn.classList.toggle('on',on);btn.setAttribute?.('aria-pressed',String(on))}return}if(k===X+'notocYes'||k===X+'notocNo'){draft[X+'notocYes']=k===X+'notocYes';draft[X+'notocNo']=k===X+'notocNo';for(const btn of document.querySelectorAll?.('.vz632Toggle[data-vzk]')||[]){const key=S(btn.dataset.vzk);if(key===X+'notocYes'||key===X+'notocNo'){btn.classList.toggle('on',!!draft[key]);btn.textContent=draft[key]?'✓ ĐÃ CHỌN':'— CHƯA CHỌN'}}return}draft[k]=!draft[k];e.classList.toggle('on',!!draft[k]);e.textContent=draft[k]?'✓ ĐÃ CHỌN':'— CHƯA CHỌN'};
window.sagsTvjDamageChoice=()=>{const page=document.getElementById('page15');if(!active()&&(!page||page.classList?.contains('hide')||page.style.display==='none'))return false;ensureStyle();document.getElementById('vz632DamageChoiceModal')?.remove();const overlay=document.createElement('div');overlay.id='vz632DamageChoiceModal';overlay.className='vz632DamageOverlay';const current=state?.[DAMAGE_KEY];overlay.innerHTML='<section class="vz632DamageDialog" role="dialog" aria-modal="true" aria-labelledby="vz632DamageTitle"><h3 id="vz632DamageTitle">Damaged found / unreadable placard</h3><p>Chọn kết quả để ghi vào ô CHECKED của biểu mẫu TVJ.</p><div class="vz632DamageActions"><button type="button" data-choice="check" class="'+(current===true?'on':'')+'">✓ TÍCH</button><button type="button" data-choice="nil" class="'+(isNil(current)?'on':'')+'">NIL</button></div><button type="button" class="vz632DamageCancel">ĐÓNG</button></section>';const cancel=()=>{overlay.remove();document.removeEventListener('keydown',onEscape)};const onEscape=e=>{if(e.key==='Escape')cancel()};overlay.addEventListener('click',e=>{if(e.target===overlay)cancel()});overlay.querySelector('.vz632DamageCancel').addEventListener('click',cancel);for(const btn of overlay.querySelectorAll('[data-choice]'))btn.addEventListener('click',()=>{const previous=state[DAMAGE_KEY],next=btn.dataset.choice==='nil'?NIL:true;if(!Object.is(previous,next)){state[DAMAGE_KEY]=next;const timeKey=X+'damageFoundTime',previousTime=state[timeKey];if(next===true&&!S(previousTime))state[timeKey]=now();try{persist();draw()}catch(err){state[DAMAGE_KEY]=previous;if(previousTime===undefined)delete state[timeKey];else state[timeKey]=previousTime;alert('Không lưu được lựa chọn TVJ. Hãy thử lại.');return}}cancel()});document.body.appendChild(overlay);document.addEventListener('keydown',onEscape);overlay.querySelector('[data-choice]')?.focus?.();return true};
 window.vz632Now=e=>{const k=S(e.dataset.vzk);draft[k]=now();const input=e.parentElement?.querySelector('.quickTimeInput');if(input)input.value=draft[k]};
function save(){let changed=seedAccountIdentity(false);defaultNotocNo(draft);const bad=[];const assign=(k,v)=>{if(v===undefined){if(Object.prototype.hasOwnProperty.call(state,k)){delete state[k];changed=true}}else if(!Object.is(state[k],v)){state[k]=v;changed=true}};for(const f of sections.flat()){let v=draft[f.k];if(f.type==='check'){assign(f.k,f.k===DAMAGE_KEY&&isNil(v)?NIL:!!v);continue}v=S(v);const isMarker=isNil(v)||isSlash(v);if(f.type==='time'&&!isMarker){v=norm(v);if(v===null){bad.push(f.label);continue}}if(f.type==='number'&&!isMarker)v=S(v).replace(/[^0-9.]/g,'');if(isNil(v))v=NIL;if(v==='')assign(f.k,undefined);else assign(f.k,v)}if(bad.length){alert('Giờ chưa hợp lệ: '+[...new Set(bad)].join(', '));return false}if(seedAccountIdentity(false))changed=true;if(changed)try{persist();draw()}catch(_){}const st=document.getElementById('quickTimeSaveStatus');if(st)st.textContent='ĐÃ CẬP NHẬT';return true}
async function open(){await ensure();seedAccountIdentity(true);tab=0;init();render();const m=document.getElementById('quickTimeModal');if(m)m.style.display='flex';document.body.classList.add('sags-quicktime-open')}
window.vz632BBBT=()=>{save();try{closeQuickTimePanel()}catch(_){}setTimeout(()=>{try{selectFormGroup('bbbt')}catch(_){}},30)};
const o=window.openQuickTimePanel,g=window.qteGoPage,s=window.qteSaveCompact,v=window.quickTimeRefreshVisibility;
window.openQuickTimePanel=function(){if(active())return open();return o?.apply(this,arguments)};function moveRegion(next,autoFocus=false){
 next=Math.max(0,Math.min(sections.length-1,next));
 if(next===tab)return false;
 if(next>tab)defaultSlashOnNext(lastFocusedKey);
 lastFocusedKey='';tab=next;render();
 if(autoFocus)requestAnimationFrame(()=>document.querySelector('#quickTimeBody .quickTimeRows .quickTimeInput,#quickTimeBody .quickTimeRows .vz632Toggle')?.focus?.());
 return true;
}
window.vz632JumpGroup=value=>{if(!active())return;moveRegion(Number(value))};
window.qteGoPage=function(n){
 if(!active())return g?.apply(this,arguments);
 if(Number(n)===1){document.getElementById('vz632RegionSelect')?.focus?.();return}
 return moveRegion(tab+(Number(n)===0?-1:1));
};window.qteSaveCompact=function(){if(active())return save();return s?.apply(this,arguments)};window.quickTimeRefreshVisibility=function(){const r=v?.apply(this,arguments);toolbar();return r};
try{openQuickTimePanel=window.openQuickTimePanel;qteGoPage=window.qteGoPage;qteSaveCompact=window.qteSaveCompact}catch(_){}
const sf=window.showFormGroup;if(typeof sf==='function')window.showFormGroup=showFormGroup=function(){const r=sf.apply(this,arguments);setTimeout(()=>{toolbar();if(active())ensure()},0);return r};const ar=window.applyRoleUI;if(typeof ar==='function')window.applyRoleUI=applyRoleUI=function(){const r=ar.apply(this,arguments);setTimeout(toolbar,0);return r};
setTimeout(()=>{void ensure();toolbar()},450);
// Revalidate on actual form navigation/resume only; never poll/draw every 1.8s.
window.addEventListener('pageshow',()=>{if(active())void ensure()},{passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&active())void ensure()},{passive:true});
})();

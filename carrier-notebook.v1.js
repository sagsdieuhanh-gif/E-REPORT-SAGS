/* ===== CARRIER SERVICE NOTEBOOK · V4.8.10 · MOBILE COMPACT + LOCAL FIRST + AD EXCEL MANAGER ===== */
(function(root){'use strict';
const DATA_URL='./carrier-service-guide.json', VERSION_URL='./carrier-guide-version.json';
const IDB_NAME='sags-carrier-guide-v1', IDB_STORE='kv', SHEETJS_URL='https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
let db=null, meta=null, selected='', lastActive='', refreshTimer=0, remoteChecked=false, managerDraft=null, managerDraftMeta=null;
const $=id=>document.getElementById(id), S=v=>String(v??'').trim(), U=v=>S(v).toUpperCase();
const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normFlight=v=>U(v).replace(/[^A-Z0-9]/g,'');
function role(){try{const x=root.__sagsGetSession?.()||{},p=x.profile||root.currentUserProfile||{};return U(x.role||p.role||p.roleCode||root.currentRole||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/[^A-Z0-9]/g,'')}catch(_){return U(root.currentRole||'')}}
function isAdmin(){return ['AD','ADMIN','ROLEADMIN'].includes(role())}
function popup(type,title,message){try{if(typeof root.sagsActionPopup==='function')return root.sagsActionPopup({type,title,message})}catch(_){}alert(title+'\n\n'+message)}
function ensureStyle(){if($('csgStyle'))return;const st=document.createElement('style');st.id='csgStyle';st.textContent=`
#csgBtn{position:fixed;left:12px;bottom:94px;right:auto;z-index:9988;border:1px solid #0f4c81;background:#fff;color:#123b5d;border-radius:999px;padding:8px 11px;font:700 12px Arial;box-shadow:0 5px 18px #0f2d4a38;cursor:grab;max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;touch-action:none;user-select:none;-webkit-user-select:none}#csgBtn.csgDragging{cursor:grabbing;box-shadow:0 8px 20px #0f2d4a55}#csgBtn .csgGrip{display:inline-block;margin-right:4px;color:#64748b;font-weight:900}
#csgBtn.has-guide{background:#fff7ed;color:#9a3412;border-color:#f97316;box-shadow:0 0 0 3px #fed7aa88,0 5px 18px #0f2d4a38}#csgBtn .csgBang{display:none;background:#dc2626;color:#fff;border-radius:999px;min-width:18px;height:18px;line-height:18px;text-align:center;margin-right:5px;font-weight:900}#csgBtn.has-guide .csgBang{display:inline-block}
#csgModal,#csgMgr{position:fixed;inset:0;z-index:2147482500;background:#0f172ab8;display:none;align-items:center;justify-content:center;padding:14px;font-family:Arial,sans-serif}#csgModal.open,#csgMgr.open{display:flex}
#csgPanel{width:min(980px,96vw);height:min(790px,92vh);background:#f8fafc;border-radius:18px;box-shadow:0 22px 70px #0007;display:flex;flex-direction:column;overflow:hidden}
#csgHead{display:flex;gap:10px;align-items:center;padding:13px 15px;background:#123b5d;color:#fff}#csgHead b{font-size:16px;flex:1}.csgHeadBtn{border:0;background:#ffffff1f;color:#fff;border-radius:9px;padding:8px 12px;font-weight:800;cursor:pointer}#csgManage{background:#fef3c7;color:#92400e;display:none}.csgAdmin #csgManage{display:inline-block}
#csgTools{padding:10px 12px;background:#fff;border-bottom:1px solid #dbe5ee;display:grid;grid-template-columns:1fr auto;gap:8px}#csgSearch{min-width:0;border:1px solid #b8c7d4;border-radius:10px;padding:9px 11px;font-size:14px}#csgCurrent{border:1px solid #2563eb;background:#eff6ff;color:#1d4ed8;border-radius:10px;padding:8px 10px;font-weight:800;cursor:pointer}
#csgBody{min-height:0;flex:1;display:grid;grid-template-columns:220px 1fr}.csgList{overflow:auto;border-right:1px solid #dbe5ee;background:#fff;padding:8px}.csgCarrier{width:100%;text-align:left;border:1px solid transparent;background:transparent;border-radius:9px;padding:8px 9px;margin-bottom:4px;cursor:pointer;color:#1e293b}.csgCarrier:hover{background:#f1f5f9}.csgCarrier.sel{background:#e0f2fe;border-color:#7dd3fc}.csgCarrier b{font-size:14px}.csgCarrier small{display:block;color:#64748b;margin-top:2px}
#csgDetail{overflow:auto;padding:13px}.csgHero{border:1px solid #bae6fd;background:#f0f9ff;border-radius:13px;padding:11px 12px;margin-bottom:10px}.csgHero h3{margin:0 0 5px;color:#0c4a6e}.csgMeta{color:#475569;font-size:12px;line-height:1.45}.csgActive{display:inline-block;background:#dc2626;color:white;border-radius:999px;padding:2px 7px;font-size:11px;font-weight:900;margin-left:5px}.csgLocal{display:inline-block;background:#0f766e;color:#fff;border-radius:999px;padding:2px 7px;font-size:10px;font-weight:900;margin-left:5px}
.csgSection{background:#fff;border:1px solid #dbe5ee;border-radius:13px;margin:9px 0;overflow:hidden}.csgSection h4{margin:0;padding:8px 10px;background:#f1f5f9;color:#334155;font-size:13px}.csgNote{padding:9px 11px;border-top:1px dashed #e2e8f0;white-space:pre-wrap;line-height:1.42;color:#1f2937;font-size:13px}.csgNote:first-of-type{border-top:0}.csgNil{color:#94a3b8;font-style:italic}.csgFoot{font-size:11px;color:#64748b;padding:9px 2px 18px}.csgEmpty{padding:18px;color:#64748b;text-align:center}
#csgMgrCard{width:min(920px,96vw);max-height:92vh;overflow:auto;background:#f8fafc;border-radius:18px;box-shadow:0 22px 70px #0007;padding:0 0 18px}.csgMgrHead{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:8px;background:#7c2d12;color:#fff;padding:12px 14px}.csgMgrHead b{flex:1}.csgMgrHead button{border:0;border-radius:8px;padding:7px 10px;font-weight:800;cursor:pointer}.csgMgrBody{padding:13px}.csgMgrInfo{border:1px solid #fdba74;background:#fff7ed;border-radius:12px;padding:10px 12px;line-height:1.45;color:#7c2d12;font-size:13px;margin-bottom:10px}.csgMgrGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.csgMgrBlock{background:#fff;border:1px solid #dbe5ee;border-radius:12px;padding:11px}.csgMgrBlock h4{margin:0 0 7px;color:#334155}.csgMgrActions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.csgMgrBtn{border:1px solid #94a3b8;background:#fff;color:#334155;border-radius:9px;padding:8px 10px;font-weight:800;cursor:pointer}.csgMgrBtn.primary{background:#0f4c81;color:#fff;border-color:#0f4c81}.csgMgrBtn.good{background:#047857;color:#fff;border-color:#047857}.csgMgrBtn.warn{background:#b45309;color:#fff;border-color:#b45309}.csgMgrBtn:disabled{opacity:.45;cursor:not-allowed}.csgMgrStatus{white-space:pre-wrap;background:#0f172a;color:#e2e8f0;border-radius:9px;padding:9px;min-height:46px;font:12px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace}.csgMgrDiff{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px}.csgMgrKpi{text-align:center;background:#f8fafc;border:1px solid #e2e8f0;border-radius:9px;padding:7px}.csgMgrKpi b{display:block;font-size:18px;color:#0f4c81}.csgMgrSmall{font-size:11px;color:#64748b;line-height:1.4}.csgMgrPreview{max-height:240px;overflow:auto;border:1px solid #e2e8f0;border-radius:9px;margin-top:8px}.csgMgrPreview table{width:100%;border-collapse:collapse;font-size:11px}.csgMgrPreview th,.csgMgrPreview td{border-bottom:1px solid #e2e8f0;padding:5px 6px;vertical-align:top;text-align:left}.csgMgrPreview th{position:sticky;top:0;background:#f1f5f9}
@media(max-width:720px){#csgBtn{left:9px;right:auto;bottom:92px;padding:7px 9px;font-size:11px}#csgBody{grid-template-columns:1fr;grid-template-rows:145px 1fr}.csgList{border-right:0;border-bottom:1px solid #dbe5ee;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}.csgCarrier{margin:0;padding:6px}.csgCarrier small{display:none}#csgTools{grid-template-columns:1fr}#csgPanel{height:94vh}.csgMgrGrid{grid-template-columns:1fr}.csgMgrDiff{grid-template-columns:repeat(2,1fr)}}
`;document.head.appendChild(st)}
function ensurePolishV489(){if($('csgPolishV489'))return;const st=document.createElement('style');st.id='csgPolishV489';st.textContent=`
#csgPanel{border-radius:16px}.csgSection{border-radius:12px}.csgSection>summary{list-style:none;cursor:pointer;margin:0;padding:9px 11px;background:#f1f5f9;color:#334155;font-size:13px;font-weight:900;display:flex;align-items:center;gap:6px}.csgSection>summary::-webkit-details-marker{display:none}.csgSection>summary:after{content:'▾';margin-left:auto;color:#64748b}.csgSection:not([open])>summary:after{content:'▸'}.csgSection[open]>summary{border-bottom:1px solid #e2e8f0}.csgSection .csgNote:first-of-type{border-top:0}.csgSection h4{display:none}.csgHero{position:sticky;top:0;z-index:3;box-shadow:0 1px 0 rgba(15,23,42,.05)}
@media(max-width:720px){#csgModal,#csgMgr{padding:0;align-items:stretch}#csgPanel{width:100vw;height:100dvh;max-height:none;border-radius:0;box-shadow:none}#csgHead{padding:8px 9px;gap:6px;min-height:44px;box-sizing:border-box}#csgHead b{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.csgHeadBtn{padding:7px 8px;font-size:10px;min-height:32px}#csgManage{max-width:112px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#csgTools{padding:6px 7px;grid-template-columns:minmax(0,1fr) auto;gap:6px}#csgSearch{padding:8px 9px;font-size:13px}#csgCurrent{padding:7px 8px;font-size:10px;white-space:nowrap}#csgBody{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr);overflow:hidden}.csgList{display:flex;gap:5px;overflow-x:auto;overflow-y:hidden;border-right:0;border-bottom:1px solid #dbe5ee;padding:6px 7px;background:#fff;scrollbar-width:none}.csgList::-webkit-scrollbar{display:none}.csgCarrier{flex:0 0 auto;width:auto;min-width:76px;max-width:138px;margin:0;padding:6px 8px;border:1px solid #e2e8f0;border-radius:999px;text-align:center}.csgCarrier b{font-size:11px}.csgCarrier small{display:none}.csgCarrier.sel{background:#0b67b2;color:#fff;border-color:#0b67b2}.csgCarrier.sel b{color:#fff}#csgDetail{min-height:0;overflow:auto;padding:7px 8px 18px;overscroll-behavior:contain}.csgHero{position:sticky;top:-7px;margin:-1px 0 7px;padding:8px 9px;border-radius:10px;z-index:4}.csgHero h3{font-size:14px;margin-bottom:3px}.csgMeta{font-size:10.5px;line-height:1.35}.csgActive,.csgLocal{font-size:9px;padding:2px 5px}.csgSection{margin:6px 0}.csgSection>summary{padding:9px 10px;font-size:11px}.csgNote{padding:8px 10px;font-size:12px;line-height:1.4}.csgFoot{font-size:9.5px;padding:7px 2px 10px}#csgMgrCard{width:100vw;max-height:none;height:100dvh;border-radius:0;box-shadow:none;padding-bottom:8px}.csgMgrHead{padding:9px 10px}.csgMgrHead b{font-size:13px}.csgMgrBody{padding:8px}.csgMgrInfo{padding:8px 9px;font-size:11px;margin-bottom:7px}.csgMgrGrid{grid-template-columns:1fr;gap:7px}.csgMgrBlock{padding:9px}.csgMgrBlock h4{font-size:12px}.csgMgrActions{display:grid;grid-template-columns:1fr;gap:6px}.csgMgrBtn{width:100%;min-height:40px}.csgMgrStatus{font-size:10px;min-height:38px}.csgMgrDiff{grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}.csgMgrKpi{padding:5px 2px;font-size:9px}.csgMgrKpi b{font-size:15px}.csgMgrPreview{max-height:180px}.csgMgrPreview table{font-size:10px}}
@media(max-width:390px){#csgHead b{max-width:145px}#csgManage{max-width:84px}#csgTools{grid-template-columns:1fr auto}#csgCurrent{max-width:96px;overflow:hidden;text-overflow:ellipsis}.csgMgrDiff{grid-template-columns:repeat(2,1fr)}}
`;document.head.appendChild(st)}
function idbOpen(){return new Promise((res,rej)=>{const q=indexedDB.open(IDB_NAME,1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(IDB_STORE))q.result.createObjectStore(IDB_STORE)};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
async function idbGet(k){try{const d=await idbOpen();return await new Promise((res,rej)=>{const t=d.transaction(IDB_STORE,'readonly'),q=t.objectStore(IDB_STORE).get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}catch(_){return null}}
async function idbPut(k,v){try{const d=await idbOpen();await new Promise((res,rej)=>{const t=d.transaction(IDB_STORE,'readwrite');t.objectStore(IDB_STORE).put(v,k);t.oncomplete=()=>res();t.onerror=()=>rej(t.error)});return true}catch(e){console.warn('carrier guide idb put',e);return false}}
async function idbDel(k){try{const d=await idbOpen();await new Promise((res,rej)=>{const t=d.transaction(IDB_STORE,'readwrite');t.objectStore(IDB_STORE).delete(k);t.oncomplete=()=>res();t.onerror=()=>rej(t.error)});return true}catch(_){return false}}
async function sha256Text(txt){try{const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(txt));return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')}catch(_){return ''}}
async function fetchMeta(){const r=await fetch(VERSION_URL+'?t='+Date.now(),{cache:'no-store',headers:{'Cache-Control':'no-cache'}});if(!r.ok)throw Error('version HTTP '+r.status);return r.json()}
async function fetchGuide(ver){const q=encodeURIComponent(S(ver?.hash||ver?.version||Date.now()));const r=await fetch(DATA_URL+'?csgv='+q,{cache:'no-store',headers:{'Cache-Control':'no-cache'}});if(!r.ok)throw Error('guide HTTP '+r.status);const text=await r.text(),x=JSON.parse(text),hash=await sha256Text(text);if(ver?.hash&&hash&&U(hash)!==U(ver.hash))throw Error('hash carrier-service-guide.json không khớp file version');return {guide:x,text,hash:hash||S(ver?.hash)}}
async function seedLocal(){let g=await idbGet('guide'),m=await idbGet('meta');if(g?.carriers?.length){db=g;meta=m||null;return true}try{let rm=null;try{rm=await fetchMeta()}catch(_){}let pack;if(rm)pack=await fetchGuide(rm);else{const r=await fetch(DATA_URL,{cache:'default'});const text=await r.text();pack={guide:JSON.parse(text),text,hash:await sha256Text(text)}};db=pack.guide;meta=rm||{schema:1,revision:1,version:'1',hash:pack.hash,bytes:pack.text.length,updatedAt:db.generatedAt,source:db.source,carriers:db.carriers?.length||0};await idbPut('guide',db);await idbPut('meta',meta);return true}catch(e){console.warn('Carrier service guide seed',e);db={carriers:[]};return false}}
async function checkRemote(){if(remoteChecked)return;remoteChecked=true;try{const rm=await fetchMeta();const lm=meta||await idbGet('meta');if(!db?.carriers?.length)await seedLocal();if(rm?.hash&&lm?.hash&&U(rm.hash)===U(lm.hash))return;const pack=await fetchGuide(rm);db=pack.guide;meta=rm;await idbPut('guide',db);await idbPut('meta',meta);selected=db.carriers?.[0]?.carrier||selected;renderList();renderDetail(db.carriers?.find(x=>x.carrier===selected));refresh()}catch(e){console.info('Carrier guide dùng bản local:',e?.message||e)}}
async function load(){if(db?.carriers?.length){if(!remoteChecked)setTimeout(checkRemote,0);return db}await seedLocal();if(!remoteChecked)setTimeout(checkRemote,0);return db}
// The RAMP app declares `const state` and `let activeFlightSessionId` in a
// classic inline script. These are global *lexical bindings*, not window
// properties; window.state/window.activeFlightSessionId are normally absent.
function activeState(){
  let sid='',meta0=null,st=null;
  try{sid=S(typeof activeFlightSessionId!=='undefined'?activeFlightSessionId:root.activeFlightSessionId)}catch(_){sid=S(root.activeFlightSessionId)}
  try{meta0=(typeof currentFlightSessionMeta==='function'?currentFlightSessionMeta():root.currentFlightSessionMeta?.())||null}catch(_){try{meta0=root.currentFlightSessionMeta?.()||null}catch(__){}}
  try{st=(typeof state!=='undefined'&&state&&typeof state==='object')?state:null}catch(_){}
  // Older integrations may explicitly export the active state to window.
  if(!st&&root.state&&typeof root.state==='object')st=root.state;
  if(sid&&(!st||!Object.keys(st).length))try{const env=root.readFlightSessionEnvelope?.(sid)||{};st=env.state||st}catch(_){}
  return {st:st||{},meta:meta0,sid};
}
function pick(st,...keys){for(const k of keys){const v=S(st?.[k]);if(v&&U(v)!=='N/A')return v}return ''}
// Only parse flight-shaped tokens in the *active session's* name/metadata.
// Example: "RAMP VU1271/VU1270" -> ["VU1271", "VU1270"].
function flightTokens(value){
  const text=U(value),result=[];
  const re=/(?:^|[^A-Z0-9])([A-Z0-9]{2,3}\s*[- ]?\s*\d{1,5}[A-Z]?)(?=$|[^A-Z0-9])/g;
  let m;while((m=re.exec(text))!==null){const f=normFlight(m[1]);if(f&&!result.includes(f))result.push(f)}
  return result;
}
function currentCtx(){
  const {st,meta:meta0,sid}=activeState();
  if(!sid&&!meta0)return {sid:'',meta:null,st:{},flights:[],reg:'',fleetAir:'',label:'CHƯA MỞ CHUYẾN'};
  const keys=['fltAfter','f421_fltAfter','f551_fltAfter','f09_fltAfter','fltBefore','f421_fltBefore','f551_fltBefore','f09_fltBefore'];
  const flights=[];
  for(const key of keys)for(const f of flightTokens(st[key]))if(!flights.includes(f))flights.push(f);
  // Session titles and roster metadata also identify the flight before a user
  // has entered either flight-number field; do not read other saved sessions.
  for(const key of ['depFlight','departureFlight','arrFlight','arrivalFlight','flightRaw','flightName','name'])
    for(const f of flightTokens(meta0?.[key]))if(!flights.includes(f))flights.push(f);
  const reg=pick(st,'regn','f421_regn','f551_regn','f09_regn','acReg');
  let fleetAir='';try{if(reg)fleetAir=S(root.fleetInfo?.(reg)?.airline)}catch(_){}
  return {sid,meta:meta0,st,flights,reg,fleetAir,label:flights.join(' / ')||S(meta0?.name)||'CHƯA CÓ SỐ CHUYẾN'};
}
function matchCarrier(ctx){
  if(!db?.carriers||!ctx||(!ctx.sid&&!ctx.meta))return null;
  const all=[];
  for(const c of db.carriers)for(const a of (c.aliases||[c.carrier]))all.push({a:U(a).replace(/[^A-Z0-9]/g,''),c});
  all.sort((x,y)=>y.a.length-x.a.length);
  for(const f of ctx.flights)for(const x of all)if(x.a&&f.startsWith(x.a)&&/^\d/.test(f.slice(x.a.length)))return x.c;
  // Registration is a fallback only when flight numbers are genuinely absent.
  // Do not show another carrier's guidance for an unrecognized flight number.
  if(ctx.flights.length)return null;
  const air=U(ctx.fleetAir).replace(/[^A-Z0-9]/g,'');
  if(air)for(const x of all)if(x.a===air)return x.c;
  return null;
}
function notesPresent(c){if(!c)return false;return Object.values(c.sections||{}).flat().some(x=>{const t=U(x);return t&&t!=='NIL'&&t!=='NO'})}
/* Notebook launcher: user-positioned locally; never mask the FSAGS 55.1 check-all control. */
const CSG_BUTTON_POS_KEY='sags_carrier_guide_btn_pos_v1';
let csgDrag=null,csgPreferred=null,csgBackdropArmed=false;
function csgClamp(left,top,b){
  const margin=6,w=b.offsetWidth||1,h=b.offsetHeight||1;
  return {left:Math.min(Math.max(margin,left),Math.max(margin,innerWidth-w-margin)),
          top:Math.min(Math.max(margin,top),Math.max(margin,innerHeight-h-margin))};
}
function csgPlace(left,top,remember=false){
  const b=$('csgBtn');if(!b)return;
  const p=csgClamp(left,top,b);
  b.style.left=p.left+'px';b.style.top=p.top+'px';b.style.right='auto';b.style.bottom='auto';
  if(remember){csgPreferred=p;try{localStorage.setItem(CSG_BUTTON_POS_KEY,JSON.stringify(p))}catch(_){}}
}
function csgOverlap(a,b,gap=8){return a.left<b.right+gap&&a.right>b.left-gap&&a.top<b.bottom+gap&&a.bottom>b.top-gap}
function csgAvoidCheckAll(){
  const b=$('csgBtn'),other=$('checkAll551Page1Btn');
  if(!b||!other||getComputedStyle(other).display==='none'||!other.getClientRects().length)return;
  const a=b.getBoundingClientRect(),r=other.getBoundingClientRect();
  if(!csgOverlap(a,r))return;
  const w=a.width,h=a.height,gap=10;
  // Try positions adjacent to the fixed/dragged check-all button. On narrow
  // screens, above/below are more likely to fit than left/right.
  const candidates=[
    {left:a.left,top:r.top-h-gap}, {left:a.left,top:r.bottom+gap},
    {left:r.left-w-gap,top:a.top}, {left:r.right+gap,top:a.top},
    {left:6,top:r.top-h-gap}, {left:6,top:r.bottom+gap},
    {left:innerWidth-w-6,top:r.top-h-gap}
  ];
  let best=null;
  for(const q of candidates){
    const p=csgClamp(q.left,q.top,b),box={left:p.left,top:p.top,right:p.left+w,bottom:p.top+h};
    if(csgOverlap(box,r))continue;
    const cost=Math.abs(p.left-a.left)+Math.abs(p.top-a.top);
    if(!best||cost<best.cost)best={...p,cost};
  }
  if(best)csgPlace(best.left,best.top,false);
  // check-all always has the higher z-index even on very small screens.
}
function csgRestore(){
  const b=$('csgBtn');if(!b)return;
  let p=null;try{p=JSON.parse(localStorage.getItem(CSG_BUTTON_POS_KEY)||'null')}catch(_){}
  if(p&&Number.isFinite(Number(p.left))&&Number.isFinite(Number(p.top)))csgPreferred={left:Number(p.left),top:Number(p.top)};
  if(csgPreferred)csgPlace(csgPreferred.left,csgPreferred.top,false);
  requestAnimationFrame(csgAvoidCheckAll);
}
function csgInitDrag(){
  const b=$('csgBtn');if(!b||b.dataset.dragReady==='1')return;
  b.dataset.dragReady='1';
  b.title='Bấm để mở Sổ tay; kéo để đổi vị trí trên máy này';
  b.setAttribute('aria-label','Mở Sổ tay hãng. Kéo để chuyển vị trí nút.');
  csgRestore();
  b.addEventListener('pointerdown',e=>{
    if(e.button!==undefined&&e.button!==0)return;
    const r=b.getBoundingClientRect();
    csgDrag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top,moved:false};
    try{b.setPointerCapture(e.pointerId)}catch(_){}
    e.preventDefault();
  },{passive:false});
  b.addEventListener('pointermove',e=>{
    const d=csgDrag;if(!d||d.id!==e.pointerId)return;
    const dx=e.clientX-d.x,dy=e.clientY-d.y;
    if(!d.moved&&Math.hypot(dx,dy)>=6)d.moved=true;
    if(d.moved){b.classList.add('csgDragging');csgPlace(d.left+dx,d.top+dy,false)}
    e.preventDefault();
  },{passive:false});
  b.addEventListener('pointerup',e=>{
    const d=csgDrag;if(!d||d.id!==e.pointerId)return;
    try{b.releasePointerCapture(e.pointerId)}catch(_){}
    b.classList.remove('csgDragging');csgDrag=null;
    if(d.moved){const r=b.getBoundingClientRect();csgPlace(r.left,r.top,true);csgAvoidCheckAll()}
    else open();
    e.preventDefault();
  },{passive:false});
  b.addEventListener('pointercancel',e=>{
    if(csgDrag?.id!==e.pointerId)return;
    b.classList.remove('csgDragging');csgDrag=null;
    if(csgPreferred)csgPlace(csgPreferred.left,csgPreferred.top,false);
    csgAvoidCheckAll();
  });
  // Pointer clicks are handled on pointerup; synthesized keyboard clicks have detail=0.
  b.addEventListener('click',e=>{if(e.detail===0)open();e.preventDefault()});
  window.addEventListener('resize',()=>{
    const r=b.getBoundingClientRect();csgPlace(r.left,r.top,false);requestAnimationFrame(csgAvoidCheckAll);
  });
}
root.sagsCarrierGuideAvoidControls=csgAvoidCheckAll;
function ensureUi(){ensureStyle();ensurePolishV489();document.documentElement.classList.toggle('csgAdmin',isAdmin());if(!$('csgBtn')){const b=document.createElement('button');b.id='csgBtn';b.type='button';b.innerHTML='<span class="csgGrip" aria-hidden="true">⠿</span><span class="csgBang">!</span><span class="csgLabel">📓 SỔ TAY HÃNG</span>';document.body.appendChild(b);csgInitDrag()}if(!$('csgModal')){const m=document.createElement('div');m.id='csgModal';m.innerHTML=`<div id="csgPanel" role="dialog" aria-modal="true" aria-label="Sổ tay phục vụ hãng"><div id="csgHead"><b>📓 SỔ TAY PHỤC VỤ HÃNG</b><button id="csgManage" class="csgHeadBtn">⚙ QUẢN LÝ DỮ LIỆU</button><button id="csgClose" class="csgHeadBtn">ĐÓNG</button></div><div id="csgTools"><input id="csgSearch" placeholder="Tìm hãng / loại tàu / nội dung lưu ý…"><button id="csgCurrent">! CHUYẾN ĐANG MỞ</button></div><div id="csgBody"><div class="csgList" id="csgList"></div><div id="csgDetail"></div></div></div>`;document.body.appendChild(m);$('csgClose').onclick=close;$('csgManage').onclick=openManager;$('csgModal').addEventListener('pointerdown',e=>{csgBackdropArmed=e.target===$('csgModal')});$('csgModal').addEventListener('click',e=>{if(e.target===$('csgModal')&&csgBackdropArmed)close();csgBackdropArmed=false});$('csgSearch').addEventListener('input',renderList);$('csgCurrent').onclick=()=>{const c=matchCarrier(currentCtx());if(c){selected=c.carrier;renderList();renderDetail(c)}else{const ctx=currentCtx();alert(ctx.flights.length?'Chưa tìm thấy hướng dẫn cho chuyến '+ctx.label+' trong Sổ tay. Bạn có thể tìm hãng bằng ô tra cứu.':'Chưa đọc được số hiệu chuyến đang mở. Hãy kiểm tra số hiệu chuyến trên RAMP hoặc tra cứu hãng bằng ô tìm kiếm.')}};document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('csgMgr')?.classList.remove('open');if(!$('csgMgr')?.classList.contains('open'))close()}})}ensureManagerUi()}
function ensureManagerUi(){ensurePolishV489();if($('csgMgr'))return;const m=document.createElement('div');m.id='csgMgr';m.innerHTML=`<div id="csgMgrCard"><div class="csgMgrHead"><b>⚙ AD · QUẢN LÝ SỔ TAY HÃNG</b><button id="csgMgrClose">ĐÓNG</button></div><div class="csgMgrBody"><div class="csgMgrInfo"><b>LOCAL-FIRST:</b> người dùng lưu database trên máy. App chỉ kiểm tra <code>carrier-guide-version.json</code> rất nhỏ; chỉ khi hash đổi mới tải lại <code>carrier-service-guide.json</code>.</div><div class="csgMgrGrid"><div class="csgMgrBlock"><h4>1 · IMPORT EXCEL</h4><div class="csgMgrSmall">Chấp nhận bảng có header SERIAL / CARRIER / TYPE / ROUTE / NOTE và các cột Coor / Loading / Tài liệu / Flightplan như file hiện tại.</div><input id="csgExcel" type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" hidden><div class="csgMgrActions"><button id="csgPickExcel" class="csgMgrBtn primary">📥 CHỌN FILE EXCEL</button></div><div id="csgMgrStatus" class="csgMgrStatus">Chưa chọn file.</div></div><div class="csgMgrBlock"><h4>2 · SO SÁNH / XEM TRƯỚC</h4><div id="csgMgrDiff" class="csgMgrDiff"><div class="csgMgrKpi"><b id="csgKTotal">0</b>Tổng hãng</div><div class="csgMgrKpi"><b id="csgKAdd">0</b>Thêm</div><div class="csgMgrKpi"><b id="csgKChange">0</b>Thay đổi</div><div class="csgMgrKpi"><b id="csgKRemove">0</b>Xóa</div></div><div id="csgMgrPreview" class="csgMgrPreview"></div></div><div class="csgMgrBlock"><h4>3 · TEST TRÊN MÁY AD</h4><div class="csgMgrSmall">Áp dụng bản import vào IndexedDB của máy này để kiểm tra Sổ tay trước khi phát hành. Không gửi Firebase.</div><div class="csgMgrActions"><button id="csgApplyLocal" class="csgMgrBtn good" disabled>✓ DÙNG BẢN IMPORT TRÊN MÁY NÀY</button><button id="csgRestoreRemote" class="csgMgrBtn">↶ KHÔI PHỤC BẢN GITHUB</button></div></div><div class="csgMgrBlock"><h4>4 · XUẤT FILE ĐỂ UP GITHUB</h4><div class="csgMgrSmall">Xuất đúng 2 file. Upload đè chúng vào root GitHub. Không cần sửa code/app version chỉ để thay lưu ý hãng.</div><div class="csgMgrActions"><button id="csgExportPair" class="csgMgrBtn warn" disabled>⬇ XUẤT 2 FILE CẬP NHẬT</button></div><div id="csgExportInfo" class="csgMgrSmall"></div></div></div></div></div>`;document.body.appendChild(m);$('csgMgrClose').onclick=()=>m.classList.remove('open');$('csgPickExcel').onclick=()=>$('csgExcel').click();$('csgExcel').onchange=e=>importExcel(e.target.files?.[0]);$('csgApplyLocal').onclick=applyDraftLocal;$('csgRestoreRemote').onclick=restoreRemote;$('csgExportPair').onclick=exportPair;m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')})}
function carrierHay(c){return U([c.carrier,c.aircraftTypeRaw,c.routeType,...Object.values(c.sections||{}).flat()].join(' '))}
function renderList(){if(!db||!$('csgList'))return;const q=U($('csgSearch')?.value),arr=db.carriers.filter(c=>!q||carrierHay(c).includes(q));$('csgList').innerHTML=arr.length?arr.map(c=>`<button class="csgCarrier ${c.carrier===selected?'sel':''}" data-c="${esc(c.carrier)}"><b>${esc(c.carrier)}</b><small>${esc(c.aircraftTypeRaw||'')} · ${esc(c.routeType||'')}</small></button>`).join(''):'<div class="csgEmpty">Không tìm thấy.</div>';document.querySelectorAll('#csgList [data-c]').forEach(b=>b.onclick=()=>{selected=b.dataset.c;renderList();renderDetail(db.carriers.find(c=>c.carrier===selected))})}
function section(title,arr){arr=(arr||[]).filter(x=>S(x));if(!arr.length)return `<details class="csgSection"><summary>${esc(title)}</summary><div class="csgNote csgNil">Không có nội dung trong bảng nguồn.</div></details>`;return `<details class="csgSection" open><summary>${esc(title)}</summary>${arr.map(x=>{const nil=['NIL','NO'].includes(U(x));return `<div class="csgNote ${nil?'csgNil':''}">${esc(x)}</div>`}).join('')}</details>`}
function renderDetail(c){if(!$('csgDetail'))return;if(!c){$('csgDetail').innerHTML='<div class="csgEmpty">Chọn một hãng để xem lưu ý phục vụ.</div>';return}const active=matchCarrier(currentCtx()),isActive=active?.carrier===c.carrier,detail=$('csgDetail');detail.innerHTML=`<div class="csgHero"><h3>${esc(c.carrier)}${isActive?'<span class="csgActive">CHUYẾN ĐANG MỞ</span>':''}<span class="csgLocal">LOCAL</span></h3><div class="csgMeta"><b>Loại tàu:</b> ${esc(c.aircraftTypeRaw||'—')} &nbsp; · &nbsp; <b>Phạm vi:</b> ${esc(c.routeType||'—')} &nbsp; · &nbsp; <b>DB:</b> r${esc(meta?.revision||db?.version||'—')}</div></div>${section('COOR · PHỐI HỢP PHỤC VỤ',c.sections?.coor)}${section('LOADING · CHẤT XẾP / HÀNH LÝ',c.sections?.loading)}${section('TÀI LIỆU / LOAD CONTROL',c.sections?.documents)}${section('FLIGHTPLAN',c.sections?.flightplan)}<div class="csgFoot">Nguồn: ${esc(db.source||'Bảng lưu ý phục vụ hãng')} · ${db.carriers.length} hãng · dữ liệu đọc từ bộ nhớ máy. GitHub chỉ được tải lại khi version/hash thay đổi.</div>`;try{detail.scrollTop=0;const ds=[...detail.querySelectorAll('details.csgSection')];if(matchMedia('(max-width:720px)').matches){ds.forEach((d,i)=>d.open=i===0);ds.forEach(d=>d.addEventListener('toggle',()=>{if(!d.open)return;ds.forEach(o=>{if(o!==d)o.open=false})}))}}catch(_){}}
async function open(){ensureUi();await load();const c=matchCarrier(currentCtx());if(c)selected=c.carrier;else if(!selected)selected=db.carriers?.[0]?.carrier||'';$('csgModal').classList.add('open');$('csgSearch').value='';renderList();renderDetail(db.carriers.find(x=>x.carrier===selected))}
function close(){$('csgModal')?.classList.remove('open')}
async function refresh(){ensureUi();document.documentElement.classList.toggle('csgAdmin',isAdmin());await load();const ctx=currentCtx(),c=matchCarrier(ctx),b=$('csgBtn'),lab=b?.querySelector('.csgLabel');if(!b||!lab)return;const has=notesPresent(c);b.classList.toggle('has-guide',!!has);lab.textContent=has?`${c.carrier} · LƯU Ý PHỤC VỤ`:'📓 SỔ TAY HÃNG';b.title=has?`Chuyến ${ctx.label} có lưu ý phục vụ ${c.carrier}. Bấm để xem; kéo để đổi vị trí.`:'Tra cứu hãng; kéo để đổi vị trí.';csgAvoidCheckAll();const key=ctx.sid+'|'+(c?.carrier||'');if(has&&key!==lastActive){lastActive=key;b.animate?.([{transform:'scale(1)'},{transform:'scale(1.06)'},{transform:'scale(1)'}],{duration:700,iterations:2})}}
function openManager(){if(!isAdmin())return popup('warning','KHÔNG CÓ QUYỀN','Chỉ tài khoản AD được import/phát hành dữ liệu Sổ tay hãng.');ensureManagerUi();managerDraft=null;managerDraftMeta=null;$('csgExcel').value='';$('csgMgrStatus').textContent=`Bản đang dùng trên máy: ${db?.carriers?.length||0} hãng · revision ${meta?.revision||'—'}\nNguồn: ${db?.source||'—'}`;$('csgApplyLocal').disabled=true;$('csgExportPair').disabled=true;$('csgMgrPreview').innerHTML='';['csgKTotal','csgKAdd','csgKChange','csgKRemove'].forEach(x=>$(x).textContent='0');$('csgMgr').classList.add('open')}
function loadSheetJs(){if(root.XLSX)return Promise.resolve(root.XLSX);return new Promise((res,rej)=>{const old=document.querySelector('script[data-csg-xlsx]');if(old){old.addEventListener('load',()=>res(root.XLSX),{once:true});old.addEventListener('error',()=>rej(Error('Không tải được Excel engine')),{once:true});return}const sc=document.createElement('script');sc.src=SHEETJS_URL;sc.async=true;sc.dataset.csgXlsx='1';sc.onload=()=>root.XLSX?res(root.XLSX):rej(Error('Excel engine không khởi tạo'));sc.onerror=()=>rej(Error('Không tải được Excel engine. Kiểm tra Internet của máy AD.'));document.head.appendChild(sc)})}
function findHeader(rows){for(let i=0;i<Math.min(rows.length,20);i++){const r=(rows[i]||[]).map(U);if(r.includes('SERIAL')&&r.includes('CARRIER')&&r.includes('TYPE')&&r.includes('ROUTE'))return i}return -1}
function findCol(row,names,fallback=-1){const a=(row||[]).map(U);for(const n of names){const i=a.findIndex(x=>x===n||x.includes(n));if(i>=0)return i}return fallback}
function addCell(arr,v){v=S(v);if(v)arr.push(v)}
function parseRows(rows,fileName){const h=findHeader(rows);if(h<0)throw Error('Không tìm thấy hàng tiêu đề SERIAL / CARRIER / TYPE / ROUTE.');const hr=rows[h]||[],sub=rows[h+1]||[];const cSerial=findCol(hr,['SERIAL'],0),cCarrier=findCol(hr,['CARRIER'],1),cType=findCol(hr,['TYPE'],3),cRoute=findCol(hr,['ROUTE'],4),cReq=findCol(hr,['REQUEST'],5),cNote=findCol(hr,['NOTE'],6);const cCoor=findCol(sub,['COOR'],cNote),cLoad=findCol(sub,['LOADING'],cNote+1),cDoc=findCol(sub,['TÀI LIỆU','TAI LIEU'],cNote+2),cFpl=findCol(sub,['FLIGHPLAN','FLIGHTPLAN','FLIGH'],cNote+3);const carriers=[];let cur=null;const finish=()=>{if(cur){cur.aircraftTypes=S(cur.aircraftTypeRaw).split(/[\/\n,;]+/).map(S).filter(Boolean);cur.aliases=S(cur.carrier).split(/[\/,;&]+/).map(U).filter(Boolean);if(!cur.aliases.length)cur.aliases=[cur.carrier];carriers.push(cur);cur=null}};for(let i=h+2;i<rows.length;i++){const r=rows[i]||[],code=S(r[cCarrier]),hasAny=[cCoor,cLoad,cDoc,cFpl].some(c=>S(r[c]));if(code){finish();cur={serial:Number(r[cSerial])||S(r[cSerial])||carriers.length+1,carrier:U(code),aliases:[],aircraftTypes:[],aircraftTypeRaw:S(r[cType]),routeType:S(r[cRoute]),request:S(r[cReq]),sections:{coor:[],loading:[],documents:[],flightplan:[]}}}else if(!cur){continue}if(cur&&hasAny){addCell(cur.sections.coor,r[cCoor]);addCell(cur.sections.loading,r[cLoad]);addCell(cur.sections.documents,r[cDoc]);addCell(cur.sections.flightplan,r[cFpl])}}finish();if(!carriers.length)throw Error('Không đọc được hãng nào từ Excel.');const station=(()=>{for(let i=0;i<Math.min(h,5);i++){const t=S((rows[i]||[]).join(' ')),m=t.match(/SAGS\s*[-–]\s*([A-Z]{3})/i);if(m)return U(m[1])}return 'CXR'})();return {schema:1,version:'DRAFT',source:fileName||'Carrier service guide.xlsx',station,generatedAt:new Date().toISOString(),carriers}}
function diffGuides(oldG,newG){const om=new Map((oldG?.carriers||[]).map(c=>[U(c.carrier),c])),nm=new Map((newG?.carriers||[]).map(c=>[U(c.carrier),c]));const added=[],removed=[],changed=[];for(const [k,c] of nm){if(!om.has(k))added.push(k);else{const a=JSON.stringify(om.get(k)),b=JSON.stringify(c);if(a!==b)changed.push(k)}}for(const k of om.keys())if(!nm.has(k))removed.push(k);return {added,removed,changed,total:nm.size}}
function renderDraftPreview(draft,diff){$('csgKTotal').textContent=diff.total;$('csgKAdd').textContent=diff.added.length;$('csgKChange').textContent=diff.changed.length;$('csgKRemove').textContent=diff.removed.length;const rows=(draft.carriers||[]).slice(0,60).map(c=>`<tr><td><b>${esc(c.carrier)}</b></td><td>${esc(c.aircraftTypeRaw)}</td><td>${esc(c.routeType)}</td><td>${(c.sections?.coor?.length||0)+(c.sections?.loading?.length||0)+(c.sections?.documents?.length||0)+(c.sections?.flightplan?.length||0)}</td></tr>`).join('');$('csgMgrPreview').innerHTML=`<table><thead><tr><th>Hãng</th><th>Loại tàu</th><th>Route</th><th>Khối ghi chú</th></tr></thead><tbody>${rows}</tbody></table>`}
async function prepareDraftMeta(draft){const prev=Math.max(Number(meta?.revision||0),Number((await idbGet('meta'))?.revision||0));const revision=prev+1;draft.version=String(revision);draft.generatedAt=new Date().toISOString();const text=JSON.stringify(draft,null,2)+'\n',hash=await sha256Text(text);return {text,meta:{schema:1,revision,version:String(revision),hash,bytes:new TextEncoder().encode(text).byteLength,updatedAt:draft.generatedAt,source:draft.source,station:draft.station||'CXR',carriers:draft.carriers?.length||0}}}
async function importExcel(file){if(!file)return;if(!isAdmin())return;const st=$('csgMgrStatus');st.textContent='Đang tải Excel engine và đọc file…';try{const XLSX=await loadSheetJs(),buf=await file.arrayBuffer(),wb=XLSX.read(buf,{type:'array',cellDates:false}),sheet=wb.Sheets['FPL']||wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:false,blankrows:true}),draft=parseRows(rows,file.name),diff=diffGuides(db,draft),pack=await prepareDraftMeta(draft);managerDraft=draft;managerDraftMeta=pack.meta;managerDraft.__exportText=pack.text;renderDraftPreview(draft,diff);st.textContent=`✓ Đã đọc ${draft.carriers.length} hãng từ ${file.name}\nThêm: ${diff.added.join(', ')||'0'}\nThay đổi: ${diff.changed.join(', ')||'0'}\nXóa: ${diff.removed.join(', ')||'0'}\nRevision dự kiến: ${pack.meta.revision}`;$('csgApplyLocal').disabled=false;$('csgExportPair').disabled=false;$('csgExportInfo').textContent=`Sẽ xuất carrier-service-guide.json (${Math.round(pack.meta.bytes/1024)} KB) + carrier-guide-version.json (~1 KB).`}catch(e){console.error(e);st.textContent='✗ '+(e?.message||e);popup('error','KHÔNG ĐỌC ĐƯỢC EXCEL',e?.message||String(e))}}
async function applyDraftLocal(){if(!managerDraft||!managerDraftMeta)return;const clean=JSON.parse(managerDraft.__exportText||JSON.stringify(managerDraft));delete clean.__exportText;db=clean;meta=managerDraftMeta;await idbPut('guide',db);await idbPut('meta',meta);selected=db.carriers?.[0]?.carrier||'';renderList();renderDetail(db.carriers?.[0]);refresh();popup('success','ĐÃ ÁP DỤNG TRÊN MÁY AD',`Đang dùng bản import revision ${meta.revision} từ IndexedDB. Chưa ảnh hưởng máy khác cho tới khi upload 2 file lên GitHub.`)}
function downloadText(name,text){const blob=new Blob([text],{type:'application/json;charset=utf-8'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(u)},1200)}
async function exportPair(){if(!managerDraft||!managerDraftMeta)return;const clean=JSON.parse(managerDraft.__exportText||JSON.stringify(managerDraft));delete clean.__exportText;const text=JSON.stringify(clean,null,2)+'\n',hash=await sha256Text(text),m={...managerDraftMeta,hash,bytes:new TextEncoder().encode(text).byteLength};downloadText('carrier-service-guide.json',text);setTimeout(()=>downloadText('carrier-guide-version.json',JSON.stringify(m,null,2)+'\n'),350);$('csgExportInfo').textContent=`✓ Đã tải 2 file revision ${m.revision}. Upload ĐÈ cả 2 file vào root GitHub. Máy khác chỉ tải database khi thấy hash mới.`;popup('success','ĐÃ XUẤT 2 FILE',`1) carrier-service-guide.json\n2) carrier-guide-version.json\n\nUpload đè cả hai file lên GitHub. Không cần đổi version E-Report.`)}
async function restoreRemote(){if(!confirm('Khôi phục bản Sổ tay đang phát hành trên GitHub cho máy AD này?'))return;try{const rm=await fetchMeta(),pack=await fetchGuide(rm);db=pack.guide;meta=rm;await idbPut('guide',db);await idbPut('meta',meta);managerDraft=null;managerDraftMeta=null;selected=db.carriers?.[0]?.carrier||'';renderList();renderDetail(db.carriers?.[0]);$('csgMgrStatus').textContent=`✓ Đã khôi phục bản GitHub revision ${meta.revision} · ${db.carriers.length} hãng.`;$('csgApplyLocal').disabled=true;$('csgExportPair').disabled=true;popup('success','ĐÃ KHÔI PHỤC','Máy AD đang dùng lại database phát hành trên GitHub.')}catch(e){popup('error','KHÔNG KHÔI PHỤC ĐƯỢC',e?.message||String(e))}}
function init(){ensureUi();load().then(refresh);refreshTimer=setInterval(refresh,2500);window.addEventListener('pageshow',()=>{refresh();if(!remoteChecked)checkRemote()});document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()})}
root.sagsCarrierGuideOpen=open;root.sagsCarrierGuideRefresh=refresh;root.sagsCarrierGuideManager=openManager;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else setTimeout(init,0);
})(window);

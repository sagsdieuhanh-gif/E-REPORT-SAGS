/* V6.3.38 · clean merged header fields + slash-free visual background */
(function grndLsNativeV6326(root){
'use strict';
if(root.__SAGS_GRND_LS_NATIVE_V6326)return;
const BUILD='V6.3.38-20260926-GRNDLS-CLEAN-HEADER-ASSET-01';
root.__SAGS_GRND_LS_NATIVE_V6326=BUILD;

const BASE_W=1241,BASE_H=1755;
const SPECS={
  fsags54:{formId:'FSAGS54',page:16,w:1360,h:1760,prefix:'FSAGS54_',title:'FSAGS54',tri:true,publicGroup:'FSAGS54'},
  clc_checklist:{formId:'fsags94_clc',legacyFormIds:[],page:17,w:1360,h:1760,prefix:'clc94_',title:'FSAGS94 · CLC/CAPTAIN LOADSHEET CHECKLIST',tri:false,publicGroup:'clc_checklist'}
};
const S=v=>String(v==null?'':v).trim();
const L=v=>S(v).toLowerCase();
const canonicalGroup=v=>{const g=L(v).replace(/[\s-]+/g,'_');return g==='fsags94'||g==='fsags94_clc'?'clc_checklist':g};
const publicGroup=v=>canonicalGroup(v)==='fsags54'?'FSAGS54':canonicalGroup(v);
const canonicalFieldKey=(group,key)=>S(key);
const isGroup=g=>!!SPECS[canonicalGroup(g)];
const stateRef=()=>{try{return state}catch(_){return root.state||{}}};
const activeId=()=>{try{return S(activeFlightSessionId)}catch(_){return S(root.activeFlightSessionId)}};
const metaRef=()=>{try{return typeof currentFlightSessionMeta==='function'?currentFlightSessionMeta():null}catch(_){return null}};
const envRef=(id=activeId())=>{try{return id&&typeof readFlightSessionEnvelope==='function'?(readFlightSessionEnvelope(id)||{}):{}}catch(_){return {}}};
const profile=()=>{try{return root.__sagsGetSession?.()?.profile||root.currentUserProfile||{}}catch(_){return root.currentUserProfile||{}}};
let registry=null,forms={},bootPromise=null,registered=new Set(),debug=false;

function getGlobal(name){
  try{return root[name]||eval(name)}catch(_){return root[name]}
}
async function loadRegistry(force=false){
  if(registry&&!force)return registry;
  try{
    const r=await fetch('./forms.registry.json?__grndls_native='+Date.now(),{cache:'no-store',headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}});
    if(r.ok){registry=await r.json();return registry}
  }catch(_){}
  try{registry=root.sagsV450GetFormRegistry?.()||registry}catch(_){}
  if(!registry)throw new Error('Không tải được forms.registry.json.');
  return registry;
}
function findForms(){
  const arr=registry?.forms||[];
  forms={};
  for(const [g,spec] of Object.entries(SPECS)){
    const f=arr.find(x=>S(x?.id)===spec.formId);
    if(!f)throw new Error('Thiếu '+spec.formId+' trong Form Manager registry.');
    const p=f.pages?.[0];
    if(!p||Number(p.runtimePage)!==spec.page||Number(p.width)!==spec.w||Number(p.height)!==spec.h)
      throw new Error(spec.formId+' chưa có runtimePage/geometry chuẩn.');
    forms[g]=f;
  }
}
function ensureStyle(){
  if(document.getElementById('grndLsNative6326Style'))return;
  const st=document.createElement('style');st.id='grndLsNative6326Style';
  st.textContent=
    '#page16,#page17{position:relative;background:#fff;overflow:visible}'+
    '#page16>img,#page17>img{position:absolute;inset:0;width:100%;height:100%;display:block;object-fit:fill;user-select:none;-webkit-user-drag:none;pointer-events:none}'+
    '#page16>svg,#page17>svg{position:absolute;inset:0;width:100%;height:100%;z-index:2;overflow:visible;pointer-events:none}'+
    '#page16>svg .hit,#page17>svg .hit{pointer-events:all}'+
    '#page16>svg image,#page17>svg image{pointer-events:none}'+
    '#page16[data-grndls-debug="1"] .hit,#page17[data-grndls-debug="1"] .hit{stroke:#e11d48!important;stroke-width:1!important;fill:rgba(225,29,72,.06)!important}'+
    '.grndls6326-debug-center{fill:#e11d48;stroke:none;pointer-events:none}';
  document.head.appendChild(st);
}
function ensurePage(group){
  const spec=SPECS[group],form=forms[group],pg=form.pages[0],id='page'+spec.page,svgId='svg'+spec.page;
  let page=document.getElementById(id);
  if(!page){
    page=document.createElement('div');page.id=id;page.className='sheet scroll-sheet hide';page.dataset.formGroup=publicGroup(group);
    const img=document.createElement('img');img.alt=spec.title;img.draggable=false;img.id='grndLsBg'+spec.page;page.appendChild(img);
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.id=svgId;svg.setAttribute('viewBox','0 0 '+BASE_W+' '+BASE_H);svg.setAttribute('preserveAspectRatio','none');page.appendChild(svg);
    const anchor=document.getElementById('page'+(spec.page-1))||document.getElementById('page15')||document.getElementById('page13');
    if(anchor?.parentNode)anchor.insertAdjacentElement('afterend',page);else document.body.appendChild(page);
  }
  const img=page.querySelector('img');if(img){const src=S(pg.image);if(img.getAttribute('src')!==src)img.setAttribute('src',src)}
  page.style.aspectRatio=spec.w+'/'+spec.h;
  return page;
}
function runtimeType(group,rf){
  const t=L(rf?.type||'text');
  if(group==='fsags54'&&/^FSAGS54_check_\d+$/i.test(S(rf?.bind||rf?.key)))return 'check';
  if(t==='checkbox')return 'check';
  if(t==='signature')return 'signature';
  if(t==='time')return 'timeNow';
  if(t==='date')return 'dateAuto';
  if(t==='number')return 'number';
  return 'text';
}
function registerForm(group){
  const spec=SPECS[group],form=forms[group];
  if(registered.has(group))return;
  if(typeof add!=='function'||!Array.isArray(fields))throw new Error('Core field engine chưa sẵn sàng.');
  const existing=new Set(fields.filter(f=>Number(f.page)===spec.page).map(f=>S(f.key)));
  for(const rf of form.fields||[]){
    const key=canonicalFieldKey(group,rf.bind||rf.key);if(!key||existing.has(key))continue;
    const type=runtimeType(group,rf),x=Number(rf.x||0)*BASE_W,y=Number(rf.y||0)*BASE_H,w=Math.max(2,Number(rf.w||.01)*BASE_W),h=Math.max(2,Number(rf.h||.01)*BASE_H);
    const opts={
      vx:x,vy:y,vw:w,vh:h,
      tickX:Number.isFinite(Number(rf.tickX))?Number(rf.tickX)*BASE_W:x+w/2,
      tickY:Number.isFinite(Number(rf.tickY))?Number(rf.tickY)*BASE_H:y+h/2,
      hitPadX:(Number(rf.hitPadX||0)*BASE_W)||((type==='check')?9:0),
      hitPadY:(Number(rf.hitPadY||0)*BASE_H)||((type==='check')?8:0),
      font:Number(rf.fontSize||16),align:S(rf.align||'center'),valign:S(rf.valign||'middle'),
      multiline:L(rf.type)==='textarea'||Number(rf.rowCount||1)>1,
      autoFitLines:Number(rf.rowCount||0),
      inputMode:type==='number'||type==='timeNow'?'numeric':'text',
      filter:type==='number'?'number':type==='timeNow'?'time':null,
      leftValue:L(rf.align)==='left'
    };
    add(spec.page,key,x,y,w,h,type,S(rf.label||rf.key||key),opts);
    const f=fields[fields.length-1];
    f.font=Number(rf.fontSize||f.font||16);f.fmFontSize=f.font;f.fmFontFamily=S(rf.fontFamily||'Times New Roman');
    f.fmFontWeight=S(rf.fontWeight||'700');f.fmFontStyle=S(rf.fontStyle||'normal');f.fmUnderline=!!rf.underline;
    f.fmLineHeight=Number(rf.lineHeight||1.05);f.fmTextColor=S(rf.textColor||'#003b8e');f.fmRowCount=Math.max(1,Number(rf.rowCount||1));
    f.fmRowFit=!!rf.rowFit;f.fmWrapMode=S(rf.wrapMode||'single');f.__formManagerExactTextV490=true;f.__formManagerCustomV463=true;f.__formManagerFieldKey=S(rf.key||key);
    f.__grndLsNativeV6326=group;f.__grndLsDirectCheck=type==='check';f.__grndLsTriState=group==='fsags54'&&type==='check';
    existing.add(key);
  }
  registered.add(group);
}
function seedValues(group){
  const spec=SPECS[group],st=stateRef(),id=activeId(),env=envRef(id),rs=env.rosterSeed||{},m=metaRef()||{},p=profile();
  const pick=(...xs)=>xs.map(S).find(Boolean)||'';
  const arr=pick(rs.arrFlight,rs.arr,rs.fltBefore,st.arrFlight,st.fltBefore);
  const dep=pick(rs.depFlight,rs.dep,rs.fltAfter,st.depFlight,st.fltAfter);
  const flight=dep||arr||pick(rs.flight,rs.flightRaw,rs.flightName,m.name);
  const date=pick(rs.date,st.date,m.rosterOpDate,env.rosterOpDate);
  const r1=pick(rs.route1,st.route1),r2=pick(rs.route2,st.route2,'CXR'),r3=pick(rs.route3,st.route3);
  const sector=dep?[r2,r3].filter(Boolean).join('-'):[r1,r2].filter(Boolean).join('-');
  const acType=pick(rs.acType,rs.type,rs.ACType,st.acType),acReg=pick(rs.acReg,rs.reg,rs.ACRegNo,st.regn,st.acReg);
  const name=pick(p.name,p.fullName,p.displayName,p.username);
  const flightDate=[flight,date].filter(Boolean).join(' / ');
  const all=group==='fsags54'
    ?{FSAGS54_flightDate:flightDate,FSAGS54_sector:sector,FSAGS54_acType:acType,FSAGS54_acReg:acReg,FSAGS54_name1:name}
    :{clc94_flightDate:flightDate,clc94_sector:sector,clc94_acType:acType,clc94_acReg:acReg,clc94_checkedBy:name};
  const old=env.grndLsNativeSeed?.[publicGroup(group)]||{},next={...old};let changed=false;
  for(const [k,v] of Object.entries(all)){
    if(!S(v))continue;
    const cur=S(st[k]),prev=S(old[k]);
    if(!cur||(prev&&cur===prev)){if(cur!==S(v)){st[k]=v;changed=true}next[k]=v}
  }
  // Backward compatibility from V6.3.23/24 boolean /54 ticks.
  if(group==='fsags54'){
    for(const rf of forms[group]?.fields||[]){const k=canonicalFieldKey(group,rf.bind||rf.key);if(/^FSAGS54_check_\d+$/i.test(k)&&st[k]===true){st[k]='OK';changed=true}}
  }
  try{
    if(id&&typeof flightSessionStorageKey==='function'){
      const fresh=envRef(id);fresh.state=JSON.parse(JSON.stringify(st));fresh.mainForm=publicGroup(group);fresh.activeFormGroup=publicGroup(group);fresh.currentPage=spec.page;fresh.scrollY=0;
      fresh.grndLsNativeSeed={...(fresh.grndLsNativeSeed||{}),[publicGroup(group)]:next};
      localStorage.setItem(flightSessionStorageKey(id),JSON.stringify(fresh));
    }
  }catch(e){console.warn('GRND_LS seed envelope',e?.message||e)}
  if(changed){try{if(typeof persist==='function')persist()}catch(_){}}
}
function triMark(v){
  if(v===true)return '✓';
  const u=S(v).toUpperCase();
  if(['OK','YES','TRUE','1','✓','V'].includes(u))return '✓';
  if(u==='X')return 'X';
  if(u==='NA'||u==='N/A')return 'NA';
  return '';
}
function triNext(v){
  const m=triMark(v);return m==='✓'?'X':m==='X'?'NA':m==='NA'?'':'OK';
}
function paintTriStateSvg(){
  const spec=SPECS.fsags54,svg=document.getElementById('svg'+spec.page);
  if(!svg||!forms.fsags54)return;
  svg.querySelectorAll('text.tick').forEach(n=>n.remove());
  const st=stateRef();
  for(const rf of forms.fsags54.fields||[]){
    const key=canonicalFieldKey('fsags54',rf.bind||rf.key);if(!/^FSAGS54_check_\d+$/i.test(key))continue;
    const mark=triMark(st[key]);if(!mark)continue;
    const tx=(Number.isFinite(Number(rf.tickX))?Number(rf.tickX):Number(rf.x)+Number(rf.w)/2)*BASE_W;
    const ty=(Number.isFinite(Number(rf.tickY))?Number(rf.tickY):Number(rf.y)+Number(rf.h)/2)*BASE_H;
    const t=document.createElementNS('http://www.w3.org/2000/svg','text');t.setAttribute('class','tick');t.setAttribute('x',String(tx));t.setAttribute('y',String(ty));
    t.setAttribute('text-anchor','middle');t.setAttribute('dominant-baseline','middle');t.setAttribute('font-family','Arial');t.setAttribute('font-weight','900');
    t.setAttribute('font-size',mark==='NA'?'9.5':mark==='X'?'12':'14');t.setAttribute('fill','#0057b8');t.textContent=mark;svg.appendChild(t);
  }
  if(debug)paintDebugCenters();
}
function clcChecked(v){
  if(v===true)return true;
  const u=S(v).toUpperCase();
  return ['1','TRUE','YES','OK','✓','V'].includes(u);
}
function paintClc94Svg(){
  const spec=SPECS.clc_checklist,svg=document.getElementById('svg'+spec.page);
  if(!svg||!forms.clc_checklist)return;
  // Page 17 belongs exclusively to FSAGS94. Repaint checkbox marks from state so
  // Quick Entry and direct taps use the same visible source of truth.
  svg.querySelectorAll('text.tick').forEach(n=>n.remove());
  const st=stateRef();
  for(const rf of forms.clc_checklist.fields||[]){
    const key=canonicalFieldKey('clc_checklist',rf.bind||rf.key);
    if(!/^clc94_check_\d+$/i.test(key)||!clcChecked(st[key]))continue;
    const tx=(Number.isFinite(Number(rf.tickX))?Number(rf.tickX):Number(rf.x)+Number(rf.w)/2)*BASE_W;
    const ty=(Number.isFinite(Number(rf.tickY))?Number(rf.tickY):Number(rf.y)+Number(rf.h)/2)*BASE_H;
    const t=document.createElementNS('http://www.w3.org/2000/svg','text');
    t.setAttribute('class','tick grndls94-tick');t.setAttribute('data-field-key',key);
    t.setAttribute('x',String(tx));t.setAttribute('y',String(ty));
    t.setAttribute('text-anchor','middle');t.setAttribute('dominant-baseline','middle');
    t.setAttribute('font-family','Arial');t.setAttribute('font-weight','900');t.setAttribute('font-size','14');t.setAttribute('fill','#0057b8');
    t.textContent='✓';svg.appendChild(t);
  }
}
function paintHeaderCleanupSvg(){
  // Original raster backgrounds print "/" separators inside the writing line.
  // Header fields are now continuous, so mask only those obsolete separators.
  // The mask stays below entered values and is carried into the exact PDF overlay.
  const masks={fsags54:[[317,270,18,50],[579,270,21,50]],clc_checklist:[[257,317,21,50],[432,317,18,50]]};
  for(const [group,rows] of Object.entries(masks)){
    const spec=SPECS[group],svg=document.getElementById('svg'+spec.page);if(!svg)continue;
    for(const [x,y,w,h] of rows){
      const r=document.createElementNS('http://www.w3.org/2000/svg','rect');
      r.setAttribute('class','grndls-header-cleanup');r.setAttribute('x',String(x));r.setAttribute('y',String(y));
      r.setAttribute('width',String(w));r.setAttribute('height',String(h));r.setAttribute('fill','#fff');r.setAttribute('pointer-events','none');
      svg.appendChild(r);
    }
  }
}
function paintDebugCenters(){
  for(const [g,spec] of Object.entries(SPECS)){
    const svg=document.getElementById('svg'+spec.page);if(!svg||!forms[g])continue;
    svg.querySelectorAll('.grndls6326-debug-center').forEach(n=>n.remove());
    for(const rf of forms[g].fields||[]){if(L(rf.type)!=='checkbox')continue;
      const cx=(Number(rf.tickX)||Number(rf.x)+Number(rf.w)/2)*BASE_W,cy=(Number(rf.tickY)||Number(rf.y)+Number(rf.h)/2)*BASE_H;
      const q=document.createElementNS('http://www.w3.org/2000/svg','circle');q.setAttribute('class','grndls6326-debug-center');q.setAttribute('cx',String(cx));q.setAttribute('cy',String(cy));q.setAttribute('r','2.2');svg.appendChild(q);
    }
  }
}

const QUICK_LABELS={
  fsags54:[
    'Flight no, sector, A/C Type/Reg, ETA/ETD, bay.',
    'General declaration',
    'Arrival messages, flight plan (if any)',
    'W&B checklist',
    'PNL/ ADL and PAX load',
    'Fuel docket (if any)',
    'Cargo/Mail/EIC, special load/dangerous goods',
    'Load/Trimsheet and LIR form (if any)',
    'Aircraft data (AHM, GOM, DOW/DOI, ...) (if any)',
    'Working tools/Devices, PPE',
    'Distribute PAX in each cabin zone (if any)',
    'Check trial trim within prescribed limits',
    'Estimate Bag/ULD (if any)',
    'Remark special load/DG on LIR (if any)',
    'Select appropriate loading version/Distribution',
    'Issue Loading Instruction Report (if any)',
    'Distribute deadload at positions on LIR',
    'Brief LIR with Load master/Co-ordinator',
    'Input fuel figures (if any)',
    'Sign on LIR and deliver LIR to Load Master/Co-ordinator',
    'Monitor PAX distribution on system',
    'Verify actual Cargo/Mail/EIC load',
    'Monitor baggage quantity (pc/wgt; ULDs)',
    'Check under load before LMC (if any)',
    'Check aircraft actual trim within the prescribed limits (if any)',
    'Match CGO weight/ULD (Transit/Joining) against the Final Cargo Load',
    'Confirm closed out figures (Transit/Joining) with Check-in Supervisor via walkie-talkie, OTT / check-in system',
    'Verify Actual Baggage with Bag Handling Section via walkie-talkie, BMS',
    'Confirm actual loading/loading report with Load master/Co-ordinator then complete Load/Trim sheet',
    'Crosscheck LIR with Load master/Co-ordinator and confirm PAX figures with Coordinator at aircraft side',
    'Present/Transmit Load/Trim sheet/LIR to Captain for inspection/signature (if any)',
    'Adjust last minute change (if any) and hand over flight docs to Purser/Captain/Rep (if any)',
    'Verify all special information on LIR and compose LDP messages (if any)',
    'Send departure messages and release/finalize flight to downline stations (if any)',
    'Distribute flight docs to all concerned Depts./Section, save files and upload data to FDS',
    'Input final figures of BAG/CGO/MAIL in SMIS (output statistic) & clean working area'
  ],
  clc_checklist:[
    'Flight No., Pax booking, ETA/ETD, Parking bay',
    'GenDec/ Check list, LIR, Fuel Docket (if any)',
    'Cargo/Mail/EIC, Special Load/Dangerous Goods',
    'Working Tools/Devices',
    'Aircraft defect, holds INOP',
    'Estimate Bag/ULD and issue LIR (if any)',
    'Briefing with Co-ordinator/ Load Master',
    'Trial trim and balance of aircraft (if any)',
    'Monitor Passenger by zone (if any) and checked baggage',
    'Check trim and balance of aircraft within prescribed limits (if any)',
    'Confirm Closed Out Figures with Check-in Supervisor via walkie-talkie, OTT / check-in system',
    'Confirm Closed Out Figures with Bag handling Supervisor via walkie-talkie, BMS',
    'Confirm Final LIR with Load Master/Co-ordinator via walkie-talkie / OTT',
    'Verify Dead Load/LIR and Fuel figures/Fuel density (if any) with Airlines CLC/Captain/Co-ordinator/Load Master',
    'Confirm Final Pax/bag figures with Co-ordinator via walkie-talkie / OTT / SAGS CLC',
    'Present/Transmit Final Load/LIR/Load/Trim Sheet to Captain/Co-ordinator',
    'Verify Pax, Dead Load on ACARS Loadsheet/Captain’s Loadsheet',
    'Hand over Flight Docs to Purser/Captain/Rep. and do LMC (if any)',
    'Verify all special information on LIR and compose LDP messages (if any)',
    'Send Departure messages (if any) and input final figures of Dead Load into SMIS',
    'Save files and upload data to FDS'
  ]
};
const QUICK_SECTIONS={
  fsags54:[[1,10,'A. PRE-FLIGHT CHECK AND PREPARATION'],[11,20,'B. LOAD PLANNING'],[21,24,'C. FLIGHT MONITORING'],[25,32,'D. LOADSHEET/TRIMSHEET COMPLETION'],[33,36,'E. POST FLIGHT']],
  clc_checklist:[[1,8,'A. PREPARATION'],[9,10,'B. FLIGHT MONITORING'],[11,18,'C. COMPLETION'],[19,21,'D. POST FLIGHT']]
};
let quickDraft={},quickGroup='',quickOpen=false;

function activeGroupRef(){
  try{return canonicalGroup(activeFormGroup)}catch(_){return canonicalGroup(root.activeFormGroup)}
}
function esc(v){return S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function toggleChecklistCheck(f){
  if(!f||!f.__grndLsDirectCheck)return false;
  const p=Number(f.page);if(p!==SPECS.fsags54.page&&p!==SPECS.clc_checklist.page)return false;
  const st=stateRef();
  if(f.__grndLsTriState)st[f.key]=triNext(st[f.key]);
  else{const v=st[f.key],on=v===true||S(v)==='1'||L(v)==='true';st[f.key]=!on}
  try{activeKey=null}catch(_){}
  try{if(typeof persist==='function')persist()}catch(_){}
  try{if(typeof draw==='function')draw()}catch(_){}
  return true;
}
function activateNativeField(f){
  if(!f)return false;
  if(toggleChecklistCheck(f))return true;
  const fn=getGlobal('activate');
  if(typeof fn==='function'){fn(f);return true}
  return false;
}
function fieldAtPoint(group,event){
  const spec=SPECS[group],page=document.getElementById('page'+spec.page);if(!page||!Array.isArray(fields))return null;
  const r=page.getBoundingClientRect();if(!r.width||!r.height)return null;
  // Core add() stores x/y/w/h and hit padding as normalized ratios (0..1).
  const nx=(event.clientX-r.left)/r.width,ny=(event.clientY-r.top)/r.height;
  const choices=fields.filter(f=>Number(f.page)===spec.page&&f.type!=='display'&&f.type!=='displayCheck').filter(f=>{
    const hx=Number(f.hitPadX||0),hy=Number(f.hitPadY||0),x=Number(f.x||0)-hx,y=Number(f.y||0)-hy,w=Number(f.w||0)+hx*2,h=Number(f.h||0)+hy*2;
    return nx>=x&&nx<=x+w&&ny>=y&&ny<=y+h;
  });
  choices.sort((a,b)=>(Number(a.w||0)*Number(a.h||0))-(Number(b.w||0)*Number(b.h||0)));
  return choices[0]||null;
}
function canInteractGroup(group){
  group=canonicalGroup(group);if(!isGroup(group))return false;
  const role=(()=>{try{return S(root.__sagsGetSession?.()?.role||root.currentRole||root.currentUserProfile?.role).toUpperCase()}catch(_){return ''}})();
  if(role==='AD')return true;
  try{
    if(activeGroupRef()!==group)return false;
    const meta=metaRef(),env=envRef();
    if(!S(meta?.rosterAssignmentId||env?.rosterAssignmentId))return false;
    if(typeof root.v1134QuickTimeAllowed==='function'&&root.v1134QuickTimeAllowed()===false)return false;
    return true;
  }catch(_){return false}
}
function bindPageInteraction(group){
  const spec=SPECS[group],page=document.getElementById('page'+spec.page);if(!page||page.dataset.grndLs6326Input===BUILD)return;
  page.dataset.grndLs6326Input=BUILD;
  const pts=new Map();
  page.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    const f=fieldAtPoint(group,e);
    if(!f)return; // Empty paper remains normal scroll/pan.
    if(!canInteractGroup(group)){
      e.preventDefault();e.stopImmediatePropagation();
      try{root.roleDenied?.('Tài khoản không có quyền chỉnh biểu mẫu này.')}catch(_){}
      return;
    }
    // V6.3.36: page 16/17 use one direct pointer path for EVERY editable field.
    // Do not depend on SVG child hit-testing: Safari/iOS may ignore child .hit nodes
    // when the SVG paper layer itself has pointer-events:none. A short tap opens the
    // canonical activate() editor; a drag/multi-touch remains scrolling/zooming.
    pts.set(e.pointerId,{x:e.clientX,y:e.clientY,key:S(f.key),multi:pts.size>0});
    if(pts.size>1)for(const p of pts.values())p.multi=true;
    e.stopImmediatePropagation();
  },true);
  page.addEventListener('pointermove',e=>{
    const p=pts.get(e.pointerId);if(!p)return;
    if(Math.hypot(e.clientX-p.x,e.clientY-p.y)>12)p.moved=true;
  },true);
  const finish=(e,cancel)=>{
    const p=pts.get(e.pointerId);pts.delete(e.pointerId);if(!p)return;
    e.stopImmediatePropagation();
    if(cancel||p.multi||p.moved)return;
    const f=Array.isArray(fields)?fields.find(x=>Number(x.page)===spec.page&&S(x.key)===p.key):null;
    if(!f)return;
    e.preventDefault();
    activateNativeField(f);
  };
  page.addEventListener('pointerup',e=>finish(e,false),true);
  page.addEventListener('pointercancel',e=>finish(e,true),true);
}
function ensureQuickStyle(){
  if(document.getElementById('grndLsQuick6326Style'))return;
  const st=document.createElement('style');st.id='grndLsQuick6326Style';st.textContent=
  '#grndLsQuick6326{display:none;position:fixed;inset:0;z-index:2147483300;background:rgba(5,22,40,.72);padding:10px;box-sizing:border-box;align-items:center;justify-content:center;font-family:Arial,sans-serif}'+
  '#grndLsQuick6326.show{display:flex}#grndLsQuick6326 .gqCard{width:min(96vw,820px);max-height:94vh;background:#f7fafc;border-radius:18px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 60px #0008}'+
  '#grndLsQuick6326 .gqHead{background:#0b315f;color:#fff;padding:12px 14px;display:flex;gap:9px;align-items:center}#grndLsQuick6326 .gqHead b{flex:1;font:900 15px/1.25 Arial}'+
  '#grndLsQuick6326 .gqHead button{border:0;border-radius:10px;background:#dce7f2;color:#163d67;padding:9px 12px;font:900 12px Arial}'+
  '#grndLsQuick6326 .gqBody{overflow:auto;-webkit-overflow-scrolling:touch;padding:12px}#grndLsQuick6326 .gqInfo{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:12px}'+
  '#grndLsQuick6326 label{display:block;color:#29475f;font:900 11px/1.2 Arial}#grndLsQuick6326 input,#grndLsQuick6326 textarea{width:100%;box-sizing:border-box;margin-top:4px;border:1px solid #bccbd8;border-radius:9px;background:#fff;padding:9px;color:#133b65;font:800 14px Arial}'+
  '#grndLsQuick6326 .gqBulk{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:4px 0 10px}#grndLsQuick6326 .gqBulk button{min-height:40px;border:1px solid #aac4d8;border-radius:9px;background:#fff;color:#174c78;font:900 11px Arial}#grndLsQuick6326 .gqBulk button.primary{background:#0b5cab;color:#fff;border-color:#0b5cab}'+
  '#grndLsQuick6326 .gqSection{margin:11px 0 6px;padding:7px 8px;border-radius:9px;background:#dfeaf4;color:#153d65;font:900 12px Arial;display:flex;align-items:center;gap:7px}#grndLsQuick6326 .gqSection>span:first-child{flex:1;min-width:0}#grndLsQuick6326 .gqSectionBtns{display:flex;gap:4px;flex:0 0 auto}#grndLsQuick6326 .gqSectionBtns button{min-height:30px;border:1px solid #aac2d5;border-radius:7px;background:#fff;color:#174c78;padding:0 7px;font:900 9px Arial}#grndLsQuick6326 .gqSectionBtns button.primary{background:#1768ad;color:#fff;border-color:#1768ad}'+
  '#grndLsQuick6326 .gqRow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;align-items:center;padding:8px 5px;border-bottom:1px solid #dce4eb}#grndLsQuick6326 .gqLabel{font:700 12px/1.35 Arial;color:#213e57}#grndLsQuick6326 .gqNo{display:inline-block;min-width:25px;color:#0b5cab;font-weight:900}'+
  '#grndLsQuick6326 .gqStates{display:flex;gap:4px;flex-wrap:nowrap}#grndLsQuick6326 .gqStates button{min-width:38px;height:34px;border:1px solid #b9c9d8;border-radius:8px;background:#fff;color:#31516d;font:900 12px Arial;padding:0 7px}#grndLsQuick6326 .gqStates button.on{background:#0b5cab;color:#fff;border-color:#0b5cab}'+
  '#grndLsQuick6326 .gqFoot{padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:#fff;border-top:1px solid #d7e0e8;display:grid;grid-template-columns:1fr 1.4fr;gap:8px}#grndLsQuick6326 .gqFoot button{min-height:44px;border:0;border-radius:11px;font:900 13px Arial}#grndLsQuick6326 .gqCancel{background:#e7edf2;color:#29465f}#grndLsQuick6326 .gqSave{background:#285ca8;color:#fff}'+
  '#grndLsQuick6326 .gqNote{margin:10px 0 2px;padding:8px 10px;border-radius:9px;background:#fff8dd;color:#705514;font:800 11px/1.35 Arial}'+
  '@media(max-width:620px){#grndLsQuick6326{padding:0;align-items:stretch}#grndLsQuick6326 .gqCard{width:100%;max-height:100dvh;height:100dvh;border-radius:0}#grndLsQuick6326 .gqInfo{grid-template-columns:1fr}#grndLsQuick6326 .gqRow{grid-template-columns:1fr}#grndLsQuick6326 .gqStates{justify-content:flex-end}}';
  document.head.appendChild(st);
}
function ensureQuickUi(){
  ensureQuickStyle();let m=document.getElementById('grndLsQuick6326');if(m)return m;
  m=document.createElement('div');m.id='grndLsQuick6326';m.innerHTML='<div class="gqCard"><div class="gqHead"><b id="grndLsQuickTitle">NHẬP NHANH</b><button id="grndLsQuickClose" type="button">ĐÓNG</button></div><div id="grndLsQuickBody" class="gqBody"></div><div class="gqFoot"><button class="gqCancel" id="grndLsQuickCancel" type="button">HỦY</button><button class="gqSave" id="grndLsQuickSave" type="button">CẬP NHẬT BIỂU MẪU</button></div></div>';
  document.body.appendChild(m);m.onclick=e=>{if(e.target===m)closeQuick()};
  document.getElementById('grndLsQuickClose').onclick=closeQuick;document.getElementById('grndLsQuickCancel').onclick=closeQuick;document.getElementById('grndLsQuickSave').onclick=saveQuick;
  return m;
}
function quickHeaderKeys(group){
  return group==='fsags54'
   ?['FSAGS54_flightDate','FSAGS54_sector','FSAGS54_acType','FSAGS54_acReg','FSAGS54_name1','FSAGS54_name2']
   :['clc94_flightDate','clc94_sector','clc94_acType','clc94_acReg','clc94_checkedBy'];
}
function quickFieldLabel(group,key){
  const rf=(forms[group]?.fields||[]).find(x=>S(x.bind||x.key)===key);return S(rf?.label||key);
}
function semanticTri(v){const m=triMark(v);return m==='✓'?'OK':m==='X'?'X':m==='NA'?'NA':''}
function quickSetRange(group,a,b,on){
  group=canonicalGroup(group);const tri=SPECS[group]?.tri===true,prefix=tri?'FSAGS54_check_':'clc94_check_';
  a=Math.max(1,Number(a)||1);b=Math.max(a,Number(b)||a);
  for(let n=a;n<=b;n++){const k=prefix+String(n).padStart(2,'0');quickDraft[k]=on?(tri?'OK':true):(tri?'':false)}
  renderQuick();
}
function renderQuick(){
  const group=quickGroup,body=document.getElementById('grndLsQuickBody');if(!body||!isGroup(group))return;
  const tri=SPECS[group].tri,labels=QUICK_LABELS[group]||[],sections=QUICK_SECTIONS[group]||[];
  let html='<div class="gqInfo">';
  for(const key of quickHeaderKeys(group))html+='<label>'+esc(quickFieldLabel(group,key))+'<input data-gq-input="'+esc(key)+'" value="'+esc(quickDraft[key]??'')+'"></label>';
  html+='</div>';
  const allEnd=sections.reduce((m,x)=>Math.max(m,Number(x[1])||0),0);
  html+='<div class="gqBulk"><button type="button" class="primary" data-gq-range="1:'+allEnd+'" data-gq-set="1">✓ TÍCH TẤT CẢ</button><button type="button" data-gq-range="1:'+allEnd+'" data-gq-set="0">□ BỎ TẤT CẢ</button></div>';
  for(const [a,b,title] of sections){
    html+='<div class="gqSection"><span>'+esc(title)+'</span><span class="gqSectionBtns"><button type="button" class="primary" data-gq-range="'+a+':'+b+'" data-gq-set="1">✓ TÍCH VÙNG</button><button type="button" data-gq-range="'+a+':'+b+'" data-gq-set="0">BỎ VÙNG</button></span></div>';
    for(let n=a;n<=b;n++){
      const key=(tri?'FSAGS54_check_':'clc94_check_')+String(n).padStart(2,'0'),val=tri?semanticTri(quickDraft[key]):!!quickDraft[key];
      html+='<div class="gqRow"><div class="gqLabel"><span class="gqNo">'+String(n).padStart(2,'0')+'</span>'+esc(labels[n-1]||quickFieldLabel(group,key))+'</div><div class="gqStates">';
      if(tri){
        for(const [v,t] of [['','—'],['OK','✓'],['X','X'],['NA','NA']])html+='<button type="button" data-gq-state="'+esc(key)+'" data-gq-value="'+v+'" class="'+(val===v?'on':'')+'">'+t+'</button>';
      }else{
        html+='<button type="button" data-gq-toggle="'+esc(key)+'" class="'+(val?'on':'')+'">'+(val?'✓ ĐÃ TÍCH':'□ CHƯA TÍCH')+'</button>';
      }
      html+='</div></div>';
    }
  }
  if(group==='clc_checklist')html+='<label style="margin-top:12px">Remarks<textarea rows="5" data-gq-input="clc94_remarks">'+esc(quickDraft.clc94_remarks??'')+'</textarea></label>';
  else html+='<div class="gqNote">Chữ ký Load Planner / Supervisor thực hiện trực tiếp trên biểu mẫu để giữ đúng vùng chữ ký gốc.</div>';
  body.innerHTML=html;
  body.querySelectorAll('[data-gq-input]').forEach(el=>el.addEventListener('input',()=>{quickDraft[el.dataset.gqInput]=el.value}));
  body.querySelectorAll('[data-gq-range]').forEach(btn=>btn.onclick=()=>{const [a,b]=S(btn.dataset.gqRange).split(':').map(Number);quickSetRange(group,a,b,btn.dataset.gqSet==='1')});
  body.querySelectorAll('[data-gq-state]').forEach(btn=>btn.onclick=()=>{quickDraft[btn.dataset.gqState]=btn.dataset.gqValue;renderQuick()});
  body.querySelectorAll('[data-gq-toggle]').forEach(btn=>btn.onclick=()=>{const k=btn.dataset.gqToggle;quickDraft[k]=!quickDraft[k];renderQuick()});
}
async function openQuick(group=activeGroupRef()){
  group=canonicalGroup(group);if(!isGroup(group))return false;
  if(!canInteractGroup(group)){try{root.roleDenied?.('Tài khoản không có quyền NHẬP NHANH biểu mẫu này.')}catch(_){}return false}
  if(!forms[group])await boot();
  seedValues(group);const st=stateRef();quickGroup=group;quickDraft={};
  for(const rf of forms[group]?.fields||[]){const k=canonicalFieldKey(group,rf.bind||rf.key);if(k)quickDraft[k]=st[k]}
  if(group==='fsags54')for(let i=1;i<=36;i++){const k='FSAGS54_check_'+String(i).padStart(2,'0');quickDraft[k]=semanticTri(quickDraft[k])}
  ensureQuickUi();document.getElementById('grndLsQuickTitle').textContent='⏱ NHẬP NHANH · '+SPECS[group].title;renderQuick();document.getElementById('grndLsQuick6326').classList.add('show');quickOpen=true;return true;
}
function closeQuick(){document.getElementById('grndLsQuick6326')?.classList.remove('show');quickOpen=false;quickGroup='';quickDraft={}}
function syncQuickEnvelope(group){
  group=canonicalGroup(group);const id=activeId(),spec=SPECS[group];if(!id||!spec)return false;
  try{
    if(typeof flightSessionStorageKey!=='function')return false;
    const fresh=envRef(id),st=stateRef();
    fresh.state=JSON.parse(JSON.stringify(st));
    fresh.mainForm=publicGroup(group);fresh.activeFormGroup=publicGroup(group);fresh.currentPage=spec.page;fresh.scrollY=0;
    localStorage.setItem(flightSessionStorageKey(id),JSON.stringify(fresh));
    return true;
  }catch(e){console.warn('GRND_LS quick envelope',e?.message||e);return false}
}
function saveQuick(){
  const group=quickGroup;if(!isGroup(group))return closeQuick();const st=stateRef();
  for(const rf of forms[group]?.fields||[]){const k=canonicalFieldKey(group,rf.bind||rf.key);if(k&&Object.prototype.hasOwnProperty.call(quickDraft,k))st[k]=quickDraft[k]}
  try{if(typeof persist==='function')persist()}catch(e){return alert('Chưa lưu được NHẬP NHANH: '+S(e?.message||e))}
  syncQuickEnvelope(group);
  try{root.sagsV22SaveNow?.('grnd-ls-quick-'+group)}catch(e){console.warn('GRND_LS quick checkpoint',e?.message||e)}
  try{activeKey=null}catch(_){}
  try{if(typeof draw==='function')draw()}catch(_){}
  if(group==='clc_checklist')paintClc94Svg();else if(group==='fsags54')paintTriStateSvg();
  closeQuick();
  try{showNative(group,false)}catch(_){}
  try{root.showAutoUpdateToast?.('✓ Đã cập nhật biểu mẫu')}catch(_){}
}
function syncQuickButton(group=activeGroupRef()){
  group=canonicalGroup(group);const on=isGroup(group),allowed=on&&canInteractGroup(group);
  const b=document.getElementById('v1134QuickTimeBtn');
  if(b){
    const display=allowed?'inline-flex':'none',priority=allowed?'important':'';
    if(b.style.getPropertyValue('display')!==display||b.style.getPropertyPriority('display')!==priority)b.style.setProperty('display',display,priority);
    if(allowed){
      if(b.textContent!=='⏱ NHẬP NHANH')b.textContent='⏱ NHẬP NHANH';
      const title='Nhập nhanh '+SPECS[group].title;if(b.title!==title)b.title=title;
      b.onclick=()=>openQuick(group);
    }
  }
  let fb=document.getElementById('grndLsQuickFallback6326');
  if(!b&&allowed){
    const host=document.getElementById('v324FormActions')||document.querySelector('.toolbar-row.main-actions')||document.querySelector('.toolbar.compact-main-toolbar')||document.querySelector('.toolbar');
    if(host){if(!fb){fb=document.createElement('button');fb.id='grndLsQuickFallback6326';fb.type='button';fb.textContent='⏱ NHẬP NHANH';fb.className='v324FormAction';host.appendChild(fb)}fb.style.display='inline-flex';fb.onclick=()=>openQuick(group)}
  }else if(fb)fb.style.display=allowed?'inline-flex':'none';
}

function hideNativePages(){
  for(const spec of Object.values(SPECS)){const p=document.getElementById('page'+spec.page);if(p){p.classList.add('hide');p.style.display='none'}}
}
function showNative(group,scrollTop=true){
  group=canonicalGroup(group);const spec=SPECS[group];if(!spec)return false;
  if(!forms[group]){boot().then(()=>showNative(group,scrollTop)).catch(e=>alert('Không mở được biểu mẫu: '+S(e?.message||e)));return true}
  ensurePage(group);registerForm(group);bindPageInteraction(group);
  document.querySelectorAll('.sheet[id^="page"]').forEach(p=>{p.classList.add('hide');p.style.display='none'});
  const page=document.getElementById('page'+spec.page);page.classList.remove('hide');page.style.display='block';
  try{activeFormGroup=publicGroup(group)}catch(_){root.activeFormGroup=publicGroup(group)}
  try{currentPage=spec.page}catch(_){}
  try{if(typeof sagsOwnedKey==='function'&&typeof FORM_GROUP_STORAGE_KEY!=='undefined')localStorage.setItem(sagsOwnedKey(FORM_GROUP_STORAGE_KEY),publicGroup(group))}catch(_){}
  seedValues(group);
  try{if(typeof draw==='function')draw()}catch(e){console.warn('GRND_LS draw',e)}
  syncQuickButton(group);[80,260,700].forEach(ms=>setTimeout(()=>syncQuickButton(group),ms));
  if(scrollTop)requestAnimationFrame(()=>root.scrollTo?.({top:0,left:0,behavior:'auto'}));
  return true;
}
function wrapFn(name,make,flag){
  try{
    const base=getGlobal(name);if(typeof base!=='function'||base[flag])return false;
    const wrapped=make(base);wrapped[flag]=true;wrapped[flag+'Base']=base;root[name]=wrapped;
    try{eval(name+'=wrapped')}catch(_){}
    return true;
  }catch(e){console.warn('GRND_LS wrap '+name,e?.message||e);return false}
}
function installRouting(){
  // FSAGS54 + FSAGS94 are first-class native forms. Intercept the legacy chooser
  // gate before the old permission table can reject either canonical checklist.
  // Editing remains protected by canInteractGroup() inside bindPageInteraction().
  wrapFn('selectFormGroup',base=>function(group){
    const g=canonicalGroup(group);
    if(isGroup(g))return showNative(g,true);
    return base.apply(this,arguments);
  },'__grndLs6329SelectHotfix');
  wrapFn('flightMainGroupForChooser',base=>function(env,meta){const g=canonicalGroup(meta?.initialGroup||env?.mainForm||env?.activeFormGroup);return isGroup(g)?publicGroup(g):base.apply(this,arguments)},'__grndLs6326');
  wrapFn('flightStartPageForGroup',base=>function(group){const s=SPECS[canonicalGroup(group)];return s?s.page:base.apply(this,arguments)},'__grndLs6326');
  wrapFn('getActiveFlightMainForm',base=>function(){try{const g=canonicalGroup(typeof activeFormGroup!=='undefined'?activeFormGroup:root.activeFormGroup);if(isGroup(g))return publicGroup(g);const e=envRef(),m=metaRef(),x=canonicalGroup(m?.initialGroup||e?.mainForm);if(isGroup(x))return publicGroup(x)}catch(_){}return base.apply(this,arguments)},'__grndLs6326');
  wrapFn('showFormGroup',base=>function(group,scrollTop=true){const g=canonicalGroup(group);if(isGroup(g))return showNative(g,scrollTop);hideNativePages();syncQuickButton('');return base.apply(this,arguments)},'__grndLs6326');
  wrapFn('activityFormLabel',base=>function(group){const g=canonicalGroup(group);return g==='fsags54'?'FSAGS54':g==='clc_checklist'?'FSAGS94':base.apply(this,arguments)},'__grndLs6326');
}
function installDraw(){
  wrapFn('draw',base=>function(){
    for(const spec of Object.values(SPECS)){const s=document.getElementById('svg'+spec.page);if(s)s.innerHTML=''}
    paintHeaderCleanupSvg();
    const out=base.apply(this,arguments);paintTriStateSvg();paintClc94Svg();if(debug)paintDebugCenters();return out;
  },'__grndLs6326Draw');
}
function installActivate(){
  wrapFn('activate',base=>function(f){
    if(toggleChecklistCheck(f))return;
    return base.apply(this,arguments);
  },'__grndLs6326Activate');
}
function installPdfBridge(){
  const base=root.sagsV495PaintCanonicalPage;
  if(typeof base!=='function'||base.__grndLs6326)return false;
  const wrapped=function(ctx,pageNo){
    const p=Number(pageNo);
    if(p!==SPECS.fsags54.page)return base.apply(this,arguments);
    const st=stateRef(),saved={},keys=[];
    for(const rf of forms.fsags54?.fields||[]){const k=canonicalFieldKey('fsags54',rf.bind||rf.key);if(/^FSAGS54_check_\d+$/i.test(k)){keys.push(k);saved[k]=st[k];st[k]=false}}
    let out;try{out=base.apply(this,arguments)}finally{for(const k of keys)st[k]=saved[k]}
    if(ctx&&forms.fsags54){
      const sx=ctx.canvas.width/SPECS.fsags54.w,sy=ctx.canvas.height/SPECS.fsags54.h;
      ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#0057b8';
      for(const rf of forms.fsags54.fields||[]){const k=canonicalFieldKey('fsags54',rf.bind||rf.key);if(!/^FSAGS54_check_\d+$/i.test(k))continue;const mark=triMark(saved[k]);if(!mark)continue;
        const x=(Number(rf.tickX)||Number(rf.x)+Number(rf.w)/2)*SPECS.fsags54.w*sx;
        const y=(Number(rf.tickY)||Number(rf.y)+Number(rf.h)/2)*SPECS.fsags54.h*sy;
        const fs=(mark==='NA'?9.5:mark==='X'?12:14)*((sx+sy)/2);ctx.font='900 '+Math.max(7,fs)+'px Arial';ctx.fillText(mark,x,y);
      }
      ctx.restore();
    }
    return out;
  };
  wrapped.__grndLs6326=true;wrapped.__grndLs6326Base=base;root.sagsV495PaintCanonicalPage=wrapped;return true;
}
function install(){
  installRouting();installDraw();installActivate();installPdfBridge();
}
async function boot(){
  if(bootPromise)return bootPromise;
  bootPromise=(async()=>{
    ensureStyle();await loadRegistry(true);findForms();
    for(const g of Object.keys(SPECS)){ensurePage(g);registerForm(g);bindPageInteraction(g)}
    install();
    try{if(typeof draw==='function')draw()}catch(_){}
    const e=envRef(),m=metaRef(),g=canonicalGroup(m?.initialGroup||e?.mainForm||e?.activeFormGroup);
    if(isGroup(g))setTimeout(()=>showNative(g,false),30);else hideNativePages();
    return true;
  })().catch(e=>{bootPromise=null;console.warn('GRND_LS native boot',e);throw e});
  return bootPromise;
}
root.sagsGrndLsNativeInfo=()=>({
  build:BUILD,ready:!!registry,debug,
  forms:Object.fromEntries(Object.entries(SPECS).map(([g,s])=>[g,{formId:s.formId,page:s.page,image:forms[g]?.pages?.[0]?.image||'',fields:forms[g]?.fields?.length||0,checks:(forms[g]?.fields||[]).filter(x=>L(x.type)==='checkbox').length,hits:document.querySelectorAll('#svg'+s.page+' .hit').length}])),
  activeGroup:(()=>{try{return S(activeFormGroup)}catch(_){return S(root.activeFormGroup)}})(),
  legacyModalPresent:!!document.getElementById('v6323ChecklistModal')
});
root.sagsGrndLsDebug=function(on){debug=!!on;for(const spec of Object.values(SPECS)){const p=document.getElementById('page'+spec.page);if(p)p.dataset.grndlsDebug=debug?'1':'0'}try{draw()}catch(_){}return root.sagsGrndLsNativeInfo()};
root.sagsOpenGrndLs54=()=>showNative('FSAGS54',true);
root.sagsOpenGrndLs94=()=>showNative('clc_checklist',true);
root.sagsOpenGrndLsQuick=group=>openQuick(group||activeGroupRef());
let quickActionObserver=null,quickActionQueued=false;
function installQuickActionObserver(){
  if(quickActionObserver||typeof MutationObserver==='undefined')return;
  quickActionObserver=new MutationObserver(()=>{
    const g=activeGroupRef();if(quickActionQueued||!isGroup(g))return;
    quickActionQueued=true;requestAnimationFrame(()=>{quickActionQueued=false;syncQuickButton(g)});
  });
  quickActionObserver.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{installQuickActionObserver();boot().catch(()=>{})},120),{once:true});else setTimeout(()=>{installQuickActionObserver();boot().catch(()=>{})},120);
[420,900,1800,3200].forEach(ms=>setTimeout(()=>boot().catch(()=>{}),ms));
root.addEventListener('pageshow',()=>setTimeout(()=>{install();boot().catch(()=>{});syncQuickButton()},180),{passive:true});
[500,1200,2800].forEach(ms=>setTimeout(()=>{install();syncQuickButton()},ms));
})(typeof window!=='undefined'?window:globalThis);

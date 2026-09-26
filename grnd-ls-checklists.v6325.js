/* V6.3.25 · Grnd_Ls F/SAGS-CXR/54 + /94 native TVJ/Form Manager runtime */
(function grndLsNativeV6325(root){
'use strict';
if(root.__SAGS_GRND_LS_NATIVE_V6325)return;
const BUILD='V6.3.25-20260925-GRNDLS-NATIVE-TVJ-03';
root.__SAGS_GRND_LS_NATIVE_V6325=BUILD;

const BASE_W=1241,BASE_H=1755;
const SPECS={
  loadcontrol_checklist:{formId:'fsags54_load_control',page:16,w:1360,h:1760,prefix:'lc54_',title:'F/SAGS-CXR/54 · LOAD CONTROL CHECKLIST',tri:true},
  clc_checklist:{formId:'fsags94_clc',page:17,w:1360,h:1760,prefix:'clc94_',title:'F/SAGS-CXR/94 · CLC/CAPTAIN LOADSHEET CHECKLIST',tri:false}
};
const S=v=>String(v==null?'':v).trim();
const L=v=>S(v).toLowerCase();
const isGroup=g=>!!SPECS[L(g)];
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
  if(document.getElementById('grndLsNative6325Style'))return;
  const st=document.createElement('style');st.id='grndLsNative6325Style';
  st.textContent=
    '#page16,#page17{position:relative;background:#fff;overflow:visible}'+
    '#page16>img,#page17>img{position:absolute;inset:0;width:100%;height:100%;display:block;object-fit:fill;user-select:none;-webkit-user-drag:none;pointer-events:none}'+
    '#page16>svg,#page17>svg{position:absolute;inset:0;width:100%;height:100%;z-index:2;overflow:visible}'+
    '#page16[data-grndls-debug="1"] .hit,#page17[data-grndls-debug="1"] .hit{stroke:#e11d48!important;stroke-width:1!important;fill:rgba(225,29,72,.06)!important}'+
    '.grndls6325-debug-center{fill:#e11d48;stroke:none;pointer-events:none}';
  document.head.appendChild(st);
}
function ensurePage(group){
  const spec=SPECS[group],form=forms[group],pg=form.pages[0],id='page'+spec.page,svgId='svg'+spec.page;
  let page=document.getElementById(id);
  if(!page){
    page=document.createElement('div');page.id=id;page.className='sheet scroll-sheet hide';page.dataset.formGroup=group;
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
  if(group==='loadcontrol_checklist'&&/^lc54_check_\d+$/i.test(S(rf?.bind||rf?.key)))return 'check';
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
    const key=S(rf.bind||rf.key);if(!key||existing.has(key))continue;
    const type=runtimeType(group,rf),x=Number(rf.x||0)*BASE_W,y=Number(rf.y||0)*BASE_H,w=Math.max(2,Number(rf.w||.01)*BASE_W),h=Math.max(2,Number(rf.h||.01)*BASE_H);
    const opts={
      vx:x,vy:y,vw:w,vh:h,
      tickX:Number.isFinite(Number(rf.tickX))?Number(rf.tickX)*BASE_W:x+w/2,
      tickY:Number.isFinite(Number(rf.tickY))?Number(rf.tickY)*BASE_H:y+h/2,
      hitPadX:Number(rf.hitPadX||0)*BASE_W,
      hitPadY:Number(rf.hitPadY||0)*BASE_H,
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
    f.__grndLsNativeV6325=group;f.__grndLsTriState=group==='loadcontrol_checklist'&&type==='check';
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
  const all=group==='loadcontrol_checklist'
    ?{lc54_flightDate:flightDate,lc54_sector:sector,lc54_acType:acType,lc54_acReg:acReg,lc54_name1:name}
    :{clc94_flightDate:flightDate,clc94_sector:sector,clc94_acType:acType,clc94_acReg:acReg,clc94_checkedBy:name};
  const old=env.grndLsNativeSeed?.[group]||{},next={...old};let changed=false;
  for(const [k,v] of Object.entries(all)){
    if(!S(v))continue;
    const cur=S(st[k]),prev=S(old[k]);
    if(!cur||(prev&&cur===prev)){if(cur!==S(v)){st[k]=v;changed=true}next[k]=v}
  }
  // Backward compatibility from V6.3.23/24 boolean /54 ticks.
  if(group==='loadcontrol_checklist'){
    for(const rf of forms[group]?.fields||[]){const k=S(rf.bind||rf.key);if(/^lc54_check_\d+$/i.test(k)&&st[k]===true){st[k]='OK';changed=true}}
  }
  try{
    if(id&&typeof flightSessionStorageKey==='function'){
      const fresh=envRef(id);fresh.state=JSON.parse(JSON.stringify(st));fresh.mainForm=group;fresh.activeFormGroup=group;fresh.currentPage=spec.page;fresh.scrollY=0;
      fresh.grndLsNativeSeed={...(fresh.grndLsNativeSeed||{}),[group]:next};
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
  const spec=SPECS.loadcontrol_checklist,svg=document.getElementById('svg'+spec.page);
  if(!svg||!forms.loadcontrol_checklist)return;
  svg.querySelectorAll('text.tick').forEach(n=>n.remove());
  const st=stateRef();
  for(const rf of forms.loadcontrol_checklist.fields||[]){
    const key=S(rf.bind||rf.key);if(!/^lc54_check_\d+$/i.test(key))continue;
    const mark=triMark(st[key]);if(!mark)continue;
    const tx=(Number.isFinite(Number(rf.tickX))?Number(rf.tickX):Number(rf.x)+Number(rf.w)/2)*BASE_W;
    const ty=(Number.isFinite(Number(rf.tickY))?Number(rf.tickY):Number(rf.y)+Number(rf.h)/2)*BASE_H;
    const t=document.createElementNS('http://www.w3.org/2000/svg','text');t.setAttribute('class','tick');t.setAttribute('x',String(tx));t.setAttribute('y',String(ty));
    t.setAttribute('text-anchor','middle');t.setAttribute('dominant-baseline','middle');t.setAttribute('font-family','Arial');t.setAttribute('font-weight','900');
    t.setAttribute('font-size',mark==='NA'?'9.5':mark==='X'?'12':'14');t.setAttribute('fill','#0057b8');t.textContent=mark;svg.appendChild(t);
  }
  if(debug)paintDebugCenters();
}
function paintDebugCenters(){
  for(const [g,spec] of Object.entries(SPECS)){
    const svg=document.getElementById('svg'+spec.page);if(!svg||!forms[g])continue;
    svg.querySelectorAll('.grndls6325-debug-center').forEach(n=>n.remove());
    for(const rf of forms[g].fields||[]){if(L(rf.type)!=='checkbox')continue;
      const cx=(Number(rf.tickX)||Number(rf.x)+Number(rf.w)/2)*BASE_W,cy=(Number(rf.tickY)||Number(rf.y)+Number(rf.h)/2)*BASE_H;
      const q=document.createElementNS('http://www.w3.org/2000/svg','circle');q.setAttribute('class','grndls6325-debug-center');q.setAttribute('cx',String(cx));q.setAttribute('cy',String(cy));q.setAttribute('r','2.2');svg.appendChild(q);
    }
  }
}
function hideNativePages(){
  for(const spec of Object.values(SPECS)){const p=document.getElementById('page'+spec.page);if(p){p.classList.add('hide');p.style.display='none'}}
}
function showNative(group,scrollTop=true){
  group=L(group);const spec=SPECS[group];if(!spec)return false;
  if(!forms[group]){boot().then(()=>showNative(group,scrollTop)).catch(e=>alert('Không mở được biểu mẫu: '+S(e?.message||e)));return true}
  ensurePage(group);registerForm(group);
  document.querySelectorAll('.sheet[id^="page"]').forEach(p=>{p.classList.add('hide');p.style.display='none'});
  const page=document.getElementById('page'+spec.page);page.classList.remove('hide');page.style.display='block';
  try{activeFormGroup=group}catch(_){root.activeFormGroup=group}
  try{currentPage=spec.page}catch(_){}
  try{if(typeof sagsOwnedKey==='function'&&typeof FORM_GROUP_STORAGE_KEY!=='undefined')localStorage.setItem(sagsOwnedKey(FORM_GROUP_STORAGE_KEY),group)}catch(_){}
  seedValues(group);
  try{if(typeof draw==='function')draw()}catch(e){console.warn('GRND_LS draw',e)}
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
  wrapFn('flightMainGroupForChooser',base=>function(env,meta){const g=L(meta?.initialGroup||env?.mainForm||env?.activeFormGroup);return isGroup(g)?g:base.apply(this,arguments)},'__grndLs6325');
  wrapFn('flightStartPageForGroup',base=>function(group){const s=SPECS[L(group)];return s?s.page:base.apply(this,arguments)},'__grndLs6325');
  wrapFn('getActiveFlightMainForm',base=>function(){try{const g=L(typeof activeFormGroup!=='undefined'?activeFormGroup:root.activeFormGroup);if(isGroup(g))return g;const e=envRef(),m=metaRef(),x=L(m?.initialGroup||e?.mainForm);if(isGroup(x))return x}catch(_){}return base.apply(this,arguments)},'__grndLs6325');
  wrapFn('showFormGroup',base=>function(group,scrollTop=true){const g=L(group);if(isGroup(g))return showNative(g,scrollTop);hideNativePages();return base.apply(this,arguments)},'__grndLs6325');
  wrapFn('activityFormLabel',base=>function(group){const g=L(group);return g==='loadcontrol_checklist'?'F/SAGS-CXR/54':g==='clc_checklist'?'F/SAGS-CXR/94':base.apply(this,arguments)},'__grndLs6325');
}
function installDraw(){
  wrapFn('draw',base=>function(){
    for(const spec of Object.values(SPECS)){const s=document.getElementById('svg'+spec.page);if(s)s.innerHTML=''}
    const out=base.apply(this,arguments);paintTriStateSvg();if(debug)paintDebugCenters();return out;
  },'__grndLs6325Draw');
}
function installActivate(){
  wrapFn('activate',base=>function(f){
    if(f&&Number(f.page)===SPECS.loadcontrol_checklist.page&&f.__grndLsTriState){
      const st=stateRef();st[f.key]=triNext(st[f.key]);try{activeKey=null}catch(_){}
      try{if(typeof persist==='function')persist()}catch(_){}try{if(typeof draw==='function')draw()}catch(_){}return;
    }
    return base.apply(this,arguments);
  },'__grndLs6325Activate');
}
function installPdfBridge(){
  const base=root.sagsV495PaintCanonicalPage;
  if(typeof base!=='function'||base.__grndLs6325)return false;
  const wrapped=function(ctx,pageNo){
    const p=Number(pageNo);
    if(p!==SPECS.loadcontrol_checklist.page)return base.apply(this,arguments);
    const st=stateRef(),saved={},keys=[];
    for(const rf of forms.loadcontrol_checklist?.fields||[]){const k=S(rf.bind||rf.key);if(/^lc54_check_\d+$/i.test(k)){keys.push(k);saved[k]=st[k];st[k]=false}}
    let out;try{out=base.apply(this,arguments)}finally{for(const k of keys)st[k]=saved[k]}
    if(ctx&&forms.loadcontrol_checklist){
      const sx=ctx.canvas.width/SPECS.loadcontrol_checklist.w,sy=ctx.canvas.height/SPECS.loadcontrol_checklist.h;
      ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#0057b8';
      for(const rf of forms.loadcontrol_checklist.fields||[]){const k=S(rf.bind||rf.key);if(!/^lc54_check_\d+$/i.test(k))continue;const mark=triMark(saved[k]);if(!mark)continue;
        const x=(Number(rf.tickX)||Number(rf.x)+Number(rf.w)/2)*SPECS.loadcontrol_checklist.w*sx;
        const y=(Number(rf.tickY)||Number(rf.y)+Number(rf.h)/2)*SPECS.loadcontrol_checklist.h*sy;
        const fs=(mark==='NA'?9.5:mark==='X'?12:14)*((sx+sy)/2);ctx.font='900 '+Math.max(7,fs)+'px Arial';ctx.fillText(mark,x,y);
      }
      ctx.restore();
    }
    return out;
  };
  wrapped.__grndLs6325=true;wrapped.__grndLs6325Base=base;root.sagsV495PaintCanonicalPage=wrapped;return true;
}
function install(){
  installRouting();installDraw();installActivate();installPdfBridge();
}
async function boot(){
  if(bootPromise)return bootPromise;
  bootPromise=(async()=>{
    ensureStyle();await loadRegistry(true);findForms();
    for(const g of Object.keys(SPECS)){ensurePage(g);registerForm(g)}
    install();
    try{if(typeof draw==='function')draw()}catch(_){}
    const e=envRef(),m=metaRef(),g=L(m?.initialGroup||e?.mainForm||e?.activeFormGroup);
    if(isGroup(g))setTimeout(()=>showNative(g,false),30);else hideNativePages();
    return true;
  })().catch(e=>{bootPromise=null;console.warn('GRND_LS native boot',e);throw e});
  return bootPromise;
}
root.sagsGrndLsNativeInfo=()=>({
  build:BUILD,ready:!!registry,debug,
  forms:Object.fromEntries(Object.entries(SPECS).map(([g,s])=>[g,{formId:s.formId,page:s.page,image:forms[g]?.pages?.[0]?.image||'',fields:forms[g]?.fields?.length||0,checks:(forms[g]?.fields||[]).filter(x=>L(x.type)==='checkbox').length}])),
  activeGroup:(()=>{try{return S(activeFormGroup)}catch(_){return S(root.activeFormGroup)}})(),
  legacyModalPresent:!!document.getElementById('v6323ChecklistModal')
});
root.sagsGrndLsDebug=function(on){debug=!!on;for(const spec of Object.values(SPECS)){const p=document.getElementById('page'+spec.page);if(p)p.dataset.grndlsDebug=debug?'1':'0'}try{draw()}catch(_){}return root.sagsGrndLsNativeInfo()};
root.sagsOpenGrndLs54=()=>showNative('loadcontrol_checklist',true);
root.sagsOpenGrndLs94=()=>showNative('clc_checklist',true);

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>boot().catch(()=>{}),160),{once:true});else setTimeout(()=>boot().catch(()=>{}),160);
root.addEventListener('pageshow',()=>setTimeout(()=>{install();boot().catch(()=>{})},220),{passive:true});
[700,1800,3500].forEach(ms=>setTimeout(install,ms));
})(typeof window!=='undefined'?window:globalThis);

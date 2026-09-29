(function FSAGS5494Module(root){
  'use strict';
  const BUILD='V6.4.25-20260929-FSAGS54-94-DIRECT-EDITOR-01';
  if(root.__SAGS_FSAGS5494_V622===BUILD)return;
  root.__SAGS_FSAGS5494_V622=BUILD;

  const DEF={
    fsags54:{
      page:16,code:'F/SAGS-CXR/54',title:'LOAD CONTROL CHECKLIST',tri:true,
      fields:[
        ['FSAGS54_flightDate','Flight No. / Date','text'],
        ['FSAGS54_sector','Sector','text'],
        ['FSAGS54_acType','A/C Type','text'],
        ['FSAGS54_acReg','A/C Registration','text'],
        ['FSAGS54_name1','Load Planner Name','text'],
        ['FSAGS54_name2','Supervisor / Load Planner 2 Name','text']
      ],
      checks:[
        'Flight no, sector, A/C Type/Reg, ETA/ETD, bay.',
        'General declaration',
        'Arrival messages, flight plan (if any)',
        'W&B checklist',
        'PNL/ADL and PAX load',
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
        'Confirm closed out figures with Check-in Supervisor via walkie-talkie / OTT / system',
        'Verify Actual Baggage with Bag Handling Section via walkie-talkie / BMS',
        'Confirm actual loading/loading report with Load master/Co-ordinator then complete Load/Trim sheet',
        'Crosscheck LIR with Load master/Co-ordinator and confirm PAX figures with Coordinator at aircraft side',
        'Present/Transmit load/Trim sheet/LIR to Captain for inspection/signature (if any)',
        'Adjust last minute change (if any) and hand over flight docs to Purser/Captain/Rep (if any)',
        'Verify all special information on LIR and compose LDP messages (if any)',
        'Send departure messages and release/finalize flight to downline stations (if any)',
        'Distribute flight docs to all concerned Depts./Section, save files and upload data to FDS',
        'Input final figures of BAG/CGO/MAIL in SMIS (output statistic) & clean working area'
      ]
    },
    clc_checklist:{
      page:17,code:'F/SAGS-CXR/94',title:'AIRLINES CLC/CAPTAIN PRODUCE LOADSHEET CHECKLIST',tri:false,
      fields:[
        ['clc94_flightDate','Flight No. / Date','text'],
        ['clc94_sector','Sector','text'],
        ['clc94_acType','A/C Type','text'],
        ['clc94_acReg','A/C Registration','text'],
        ['clc94_checkedBy','Checked by','text'],
        ['clc94_remarks','Remarks','textarea']
      ],
      checks:[
        'Flight No., Pax booking, ETA/ETD, Parking bay',
        'GenDec/Check list, LIR, Fuel Docket (if any)',
        'Cargo/Mail/EIC, Special Load/Dangerous Goods',
        'Working Tools/Devices',
        'Aircraft defect, holds INOP',
        'Estimate Bag/ULD and issue LIR (if any)',
        'Briefing with Co-ordinator/Load Master',
        'Trial trim and balance of aircraft (if any)',
        'Monitor Passenger by zone (if any) and checked baggage',
        'Check trim and balance of aircraft within prescribed limits (if any)',
        'Confirm Closed Out Figures with Check-in Supervisor via walkie-talkie, OTT / check in system',
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
    }
  };

  const S=v=>String(v??'').trim();
  const U=v=>S(v).toUpperCase();
  const normUser=v=>U(v).replace(/\s+/g,'');
  function canon(v){
    const g=S(v).toLowerCase().replace(/[\s-]+/g,'_');
    if(g==='fsags54'||g==='f/sags/cxr/54'||g==='f_sags_cxr_54')return'fsags54';
    if(g==='clc_checklist'||g==='fsags94'||g==='fsags94_clc'||g==='f/sags/cxr/94'||g==='f_sags_cxr_94')return'clc_checklist';
    return g;
  }
  function session(){try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}}
  function role(){const x=session();return U(x.role||x.profile?.role||root.currentRole).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/\s+/g,'')}
  function me(){const x=session();return normUser(x.profile?.username||root.currentUserProfile?.username||'')}
  function meta(){try{return root.currentFlightSessionMeta?.()||null}catch(_){return null}}
  function env(){
    try{
      const id=S(root.activeFlightSessionId||((typeof activeFlightSessionId!=='undefined')?activeFlightSessionId:''));
      return id&&typeof root.readFlightSessionEnvelope==='function'?(root.readFlightSessionEnvelope(id)||{}):{};
    }catch(_){return{}}
  }
  function activeGroup(){
    let g='';
    try{g=canon((typeof activeFormGroup!=='undefined')?activeFormGroup:root.activeFormGroup)}catch(_){g=canon(root.activeFormGroup)}
    if(DEF[g])return g;
    const e=env(),m=meta();
    return canon(e.activeFormGroup||e.mainForm||m?.initialGroup||'');
  }
  function stateObj(){try{return (typeof state!=='undefined'&&state)||root.state||{}}catch(_){return root.state||{}}}
  function canUse(group){
    const g=canon(group||activeGroup());
    if(!DEF[g])return false;
    if(role()==='AD')return true;
    const m=meta()||{},e=env(),u=me();
    const aid=S(m.rosterAssignmentId||e.rosterAssignmentId);
    const owner=normUser(m.rosterOwner||e.rosterOwner||'');
    const mg=canon(m.initialGroup||e.activeFormGroup||e.mainForm||g);
    if(!aid||mg!==g||!u)return false;
    if(owner)return owner===u;
    return role()==='CBTT';
  }
  root.sags5494CanUse=canUse;

  function deny(g,action){
    const code=DEF[canon(g)]?.code||'F/SAGS-CXR/54/94';
    const msg=`Tài khoản hiện tại không được phân công ${code} trong MY FLIGHT nên không thể ${action||'thực hiện thao tác này'}.`;
    try{root.roleDenied?.(msg)}catch(_){alert(msg)}
    return false;
  }

  function ensureQuickUi(){
    if(document.getElementById('sags5494Quick'))return;
    const st=document.createElement('style');
    st.id='sags5494QuickStyle';
    st.textContent=`
#sags5494Quick{position:fixed;inset:0;z-index:2147483200;display:none;background:rgba(8,27,39,.68);padding:10px;box-sizing:border-box;font:500 14px/1.42 system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#173b4c}
#sags5494Quick.open{display:flex;align-items:flex-end;justify-content:center}
#sags5494Quick .q-card{width:min(100%,680px);max-height:calc(100dvh - 20px);overflow:auto;background:#fff;border-radius:20px;box-shadow:0 20px 60px #00182466}
#sags5494Quick .q-head{position:sticky;top:0;z-index:3;background:#fff;border-bottom:1px solid #dbe6eb;padding:14px 16px}
#sags5494Quick .q-title{font-size:20px;font-weight:900;color:#0c5f76}
#sags5494Quick .q-sub{font-size:12px;color:#5d7785;margin-top:3px}
#sags5494Quick .q-body{padding:12px 14px 18px}
#sags5494Quick .q-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
#sags5494Quick label{font-size:12px;font-weight:800;color:#44616f;display:block}
#sags5494Quick input,#sags5494Quick textarea,#sags5494Quick select{width:100%;box-sizing:border-box;margin-top:4px;border:1.5px solid #9eb5c0;border-radius:10px;background:#f9fcfd;padding:10px 11px;font:700 15px system-ui;color:#173b4c}
#sags5494Quick textarea{min-height:86px;resize:vertical}
#sags5494Quick .q-tools{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
#sags5494Quick button{border:0;border-radius:10px;padding:10px 13px;font-weight:850;cursor:pointer}
#sags5494Quick .q-primary{background:#0b6f86;color:#fff}
#sags5494Quick .q-soft{background:#e8f4f7;color:#125b6c}
#sags5494Quick .q-close{background:#edf1f3;color:#445d68}
#sags5494Quick .q-row{display:grid;grid-template-columns:minmax(0,1fr) 112px;gap:9px;align-items:center;padding:8px 0;border-top:1px solid #edf2f4}
#sags5494Quick .q-label{font-size:13px;font-weight:650;color:#294b5a}
#sags5494Quick .q-actions{position:sticky;bottom:0;background:#fff;border-top:1px solid #dbe6eb;padding:12px 14px;display:grid;grid-template-columns:1fr 1fr;gap:9px}
@media(max-width:540px){#sags5494Quick .q-grid{grid-template-columns:1fr}#sags5494Quick .q-row{grid-template-columns:minmax(0,1fr) 98px}}
`;
    document.head.appendChild(st);
    const m=document.createElement('div');
    m.id='sags5494Quick';
    m.innerHTML='<div class="q-card"><div class="q-head"><div class="q-title" id="sags5494QuickTitle"></div><div class="q-sub" id="sags5494QuickSub"></div></div><div class="q-body" id="sags5494QuickBody"></div><div class="q-actions"><button class="q-close" id="sags5494QuickClose">ĐÓNG</button><button class="q-primary" id="sags5494QuickSave">CẬP NHẬT BIỂU MẪU</button></div></div>';
    document.body.appendChild(m);
    document.getElementById('sags5494QuickClose').onclick=()=>m.classList.remove('open');
    m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')});
  }

  function esc(v){return S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function checkKey(g,i){return g==='fsags54'?'FSAGS54_check_'+String(i+1).padStart(2,'0'):'clc94_check_'+String(i+1).padStart(2,'0')}
  function triValue(v){
    if(v===true)return'OK';
    const x=U(v);
    if(['OK','YES','TRUE','1','✓','V'].includes(x))return'OK';
    if(x==='X')return'X';
    if(x==='NA'||x==='N/A')return'NA';
    return'';
  }
  function openQuick(group){
    const g=canon(group||activeGroup()),d=DEF[g];
    if(!d)return false;
    if(!canUse(g))return deny(g,'NHẬP NHANH');
    ensureQuickUi();
    const s=stateObj(),body=document.getElementById('sags5494QuickBody');
    document.getElementById('sags5494QuickTitle').textContent='NHẬP NHANH · '+d.code;
    document.getElementById('sags5494QuickSub').textContent=d.title;
    const fields=d.fields.map(([k,label,type])=>{
      const val=esc(s[k]??'');
      if(type==='textarea')return `<label style="grid-column:1/-1">${esc(label)}<textarea data-q-field="${esc(k)}">${val}</textarea></label>`;
      return `<label>${esc(label)}<input data-q-field="${esc(k)}" value="${val}" autocomplete="off"></label>`;
    }).join('');
    const checks=d.checks.map((label,i)=>{
      const k=checkKey(g,i),cur=d.tri?triValue(s[k]):(s[k]?'1':'');
      const ctl=d.tri
        ?`<select data-q-check="${k}"><option value="" ${cur===''?'selected':''}>—</option><option value="OK" ${cur==='OK'?'selected':''}>√</option><option value="X" ${cur==='X'?'selected':''}>X</option><option value="NA" ${cur==='NA'?'selected':''}>NA</option></select>`
        :`<select data-q-check="${k}"><option value="" ${cur===''?'selected':''}>—</option><option value="1" ${cur==='1'?'selected':''}>✓</option></select>`;
      return `<div class="q-row"><div class="q-label">${String(i+1).padStart(2,'0')}. ${esc(label)}</div><div>${ctl}</div></div>`;
    }).join('');
    body.innerHTML=`<div class="q-grid">${fields}</div><div class="q-tools"><button type="button" class="q-soft" id="sags5494AllOk">${d.tri?'TẤT CẢ √':'TÍCH TẤT CẢ'}</button><button type="button" class="q-soft" id="sags5494Clear">XÓA TOÀN BỘ DẤU</button></div>${checks}`;
    document.getElementById('sags5494AllOk').onclick=()=>body.querySelectorAll('[data-q-check]').forEach(x=>x.value=d.tri?'OK':'1');
    document.getElementById('sags5494Clear').onclick=()=>body.querySelectorAll('[data-q-check]').forEach(x=>x.value='');
    document.getElementById('sags5494QuickSave').onclick=()=>{
      const st=stateObj();
      body.querySelectorAll('[data-q-field]').forEach(el=>{st[el.dataset.qField]=el.value});
      body.querySelectorAll('[data-q-check]').forEach(el=>{st[el.dataset.qCheck]=d.tri?el.value:(el.value==='1')});
      try{root.persist?.()}catch(_){try{persist?.()}catch(__){}}
      try{root.draw?.()}catch(_){try{draw?.()}catch(__){}}
      document.getElementById('sags5494Quick').classList.remove('open');
      try{root.showToast?.('Đã cập nhật '+d.code)}catch(_){}
    };
    document.getElementById('sags5494Quick').classList.add('open');
    return true;
  }
  root.sags5494OpenQuickEntry=openQuick;

  function waitImg(img){
    if(img?.complete&&img.naturalWidth>0)return Promise.resolve(img);
    return new Promise((resolve,reject)=>{
      if(!img)return reject(new Error('Thiếu nền biểu mẫu.'));
      const ok=()=>{cleanup();resolve(img)},bad=()=>{cleanup();reject(new Error('Không tải được nền biểu mẫu.'))};
      const cleanup=()=>{img.removeEventListener('load',ok);img.removeEventListener('error',bad)};
      img.addEventListener('load',ok,{once:true});img.addEventListener('error',bad,{once:true});
      setTimeout(()=>{if(img.complete&&img.naturalWidth>0)ok();else bad()},6000);
    });
  }
  async function svgImage(svg){
    const clone=svg.cloneNode(true);
    clone.querySelectorAll('.hit,.selected-region').forEach(x=>x.remove());
    clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
    clone.setAttribute('width','1241');clone.setAttribute('height','1755');
    clone.setAttribute('preserveAspectRatio','none');
    const xml=new XMLSerializer().serializeToString(clone);
    const blob=new Blob([xml],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),img=new Image();
    try{
      await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('Không dựng được lớp dữ liệu biểu mẫu.'));img.src=url});
      return img;
    }finally{setTimeout(()=>URL.revokeObjectURL(url),0)}
  }
  async function renderCanvas(g){
    const d=DEF[g],page=document.getElementById('page'+d.page),bg=page?.querySelector('img'),svg=document.getElementById('svg'+d.page)||page?.querySelector('svg');
    if(!page||!bg||!svg)throw new Error('Biểu mẫu '+d.code+' chưa sẵn sàng.');
    try{root.draw?.()}catch(_){try{draw?.()}catch(__){}}
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    await waitImg(bg);
    const c=document.createElement('canvas');c.width=1241;c.height=1755;c.__sagsPageNo=d.page;
    const ctx=c.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(bg,0,0,c.width,c.height);
    const ov=await svgImage(svg);ctx.drawImage(ov,0,0,c.width,c.height);
    return c;
  }
  function safe(v){return S(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9._-]+/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'')||'REPORT'}
  async function exportPdf(group){
    const g=canon(group||activeGroup()),d=DEF[g];
    if(!d)return false;
    if(!canUse(g))return deny(g,'XUẤT PDF');
    try{
      document.activeElement?.blur?.();
      try{root.persist?.()}catch(_){try{persist?.()}catch(__){}}
      await new Promise(r=>setTimeout(r,60));
      const s=stateObj(),canvas=await renderCanvas(g);
      if(typeof root.canvasesToPdfFile!=='function'&&typeof canvasesToPdfFile!=='function')throw new Error('Engine PDF chưa sẵn sàng.');
      const flight=S(s.FSAGS54_flightDate||s.clc94_flightDate||meta()?.name||'').split('/')[0].trim()||'FLIGHT';
      const name=`${safe(d.code)}_${safe(flight)}.pdf`;
      const make=root.canvasesToPdfFile||(typeof canvasesToPdfFile==='function'?canvasesToPdfFile:null);
      const file=await make([canvas],name);
      try{if(typeof v479ReleasePreparedUrl==='function')v479ReleasePreparedUrl()}catch(_){}
      try{preparedPdfFile=file;preparedPdfName=name}catch(_){}
      root.preparedPdfFile=file;root.preparedPdfName=name;
      if(typeof root.openExportModal==='function'||typeof openExportModal==='function'){
        const fn=root.openExportModal||(typeof openExportModal==='function'?openExportModal:null);
        fn('PDF '+d.code+' đã sẵn sàng. Chọn GỬI PDF / MỞ PDF / LƯU PDF.');
        try{root.v479ShowPreparedButtons?.()}catch(_){try{v479ShowPreparedButtons?.()}catch(__){}}
      }else{
        const u=URL.createObjectURL(file),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),5000);
      }
      try{root.showToast?.('Đã tạo PDF '+d.code)}catch(_){}
      return true;
    }catch(e){
      console.error('FSAGS54/94 PDF',e);
      alert('Không xuất được PDF '+d.code+': '+S(e?.message||e));
      return false;
    }
  }
  root.sags5494ExportCurrentPdf=exportPdf;

  function patchExport(){
    const base=root.openExportChoiceMenu;
    if(typeof base!=='function')return false;
    if(base.__sags5494V622)return true;
    const w=function(){
      const g=activeGroup();
      if(DEF[g])return exportPdf(g);
      return base.apply(this,arguments);
    };
    w.__sags5494V622=true;w.__sags5494Base=base;w.__v225SignatureExport=true;w.__v225Base=base;
    root.openExportChoiceMenu=w;try{openExportChoiceMenu=w}catch(_){}
    return true;
  }
  function patchQuickButton(){
    const b=document.getElementById('v1134QuickTimeBtn'),g=activeGroup();
    if(!b||!DEF[g])return;
    b.style.display=canUse(g)?'inline-flex':'none';
    b.title='Nhập nhanh '+DEF[g].code;
    b.onclick=()=>root.sags5494OpenQuickEntry?.(g);
  }
  function sync(){
    patchExport();
    patchQuickButton();
  }
  const mo=new MutationObserver(()=>setTimeout(sync,0));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{mo.observe(document.documentElement,{subtree:true,childList:true});sync()},{once:true});
  else{mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});sync()}
  [120,450,1000,2200,4200].forEach(ms=>setTimeout(sync,ms));
  root.addEventListener('pageshow',()=>setTimeout(sync,80),{passive:true});
})(window);


/* V6.4.20: direct-on-form editing for F/SAGS-CXR/54 + 94 and configurable Quick Entry visibility.
   Geometry is read from the published Form Manager registry first, so live hit areas follow the same
   coordinates used by canonical live rendering and PDF export. */
(function FSAGS5494V6420(root){
'use strict';
const BUILD='V6.4.20-20260929-FSAGS54-94-DIRECT-QUICK-HARDREFRESH-01';
if(root.__SAGS_FSAGS5494_V6420===BUILD)return;
root.__SAGS_FSAGS5494_V6420=BUILD;
const GROUPS={fsags54:{id:'fsags54',page:16,tri:true,code:'F/SAGS-CXR/54'},clc_checklist:{id:'fsags94',page:17,tri:false,code:'F/SAGS-CXR/94'}};
const S=v=>String(v??'').trim();
const N=v=>S(v).toLowerCase().replace(/[\s./-]+/g,'_').replace(/^_+|_+$/g,'');
function canon(v){const g=N(v);if(g==='fsags54'||g==='f_sags_cxr_54')return'fsags54';if(['clc_checklist','fsags94','fsags94_clc','f_sags_cxr_94'].includes(g))return'clc_checklist';return g}
function G(name){try{if(root[name]!==undefined)return root[name];return eval(name)}catch(_){return undefined}}
function activeGroup(){return canon(G('activeFormGroup')||'')}
function st(){const x=G('state');return x&&typeof x==='object'?x:{}}
function canUse(g){try{return typeof root.sags5494CanUse==='function'?root.sags5494CanUse(g):true}catch(_){return false}}
function deny(g){const d=GROUPS[g];try{G('roleDenied')?.('Tài khoản hiện tại không được phân công '+(d?.code||'biểu mẫu')+' trong MY FLIGHT.')}catch(_){alert('Bạn không có quyền sửa biểu mẫu này.')}return false}
function saveDraw(){try{G('persist')?.()}catch(_){}try{G('draw')?.()}catch(_){}setTimeout(syncDirectHits,0)}
function runtimeFields(){const a=G('fields');return Array.isArray(a)?a:[]}
function registry(){try{return root.sagsV450GetFormRegistry?.()||null}catch(_){return null}}
function regForm(g){const id=GROUPS[g]?.id;return registry()?.forms?.find(f=>N(f?.id)===id)||null}
function frac(v,den){const n=Number(v);if(!Number.isFinite(n))return 0;return Math.abs(n)>1.5?n/den:n}
function normalizeField(raw,g,fromRegistry){const d=GROUPS[g],key=S(raw?.bind||raw?.key),type=N(raw?.type||raw?.sourceType||'text');if(!key||!d)return null;let x=frac(raw?.x,1241),y=frac(raw?.y,1755),w=frac(raw?.w,1241),h=frac(raw?.h,1755);if(!fromRegistry){x=frac(raw?.x??raw?.vx,1241);y=frac(raw?.y??raw?.vy,1755);w=frac(raw?.w??raw?.vw,1241);h=frac(raw?.h??raw?.vh,1755)}if(!(w>0&&h>0))return null;return{key,label:S(raw?.label||key),type,x,y,w,h,page:d.page,multiline:type==='textarea'||raw?.multiline===true,raw}}
function directFields(g){const d=GROUPS[g],f=regForm(g);if(f?.fields?.length)return f.fields.map(x=>normalizeField(x,g,true)).filter(Boolean);return runtimeFields().filter(x=>Number(x?.page)===d.page).map(x=>normalizeField(x,g,false)).filter(Boolean)}
function triValue(v){if(v===true)return'OK';const x=S(v).toUpperCase();if(['OK','YES','TRUE','1','✓','V'].includes(x))return'OK';if(x==='X')return'X';if(x==='NA'||x==='N/A')return'NA';return''}
function nextTri(v){const x=triValue(v);return x==='OK'?'X':x==='X'?'NA':x==='NA'?'':'OK'}
function fallbackEdit(f){const s=st(),old=S(s[f.key]),v=root.prompt?.(f.label||'Nhập dữ liệu',old);if(v===null||v===undefined)return false;s[f.key]=String(v).toUpperCase();saveDraw();return true}
function directActivate(g,f){if(!GROUPS[g]||!f)return false;if(!canUse(g))return deny(g);const s=st(),t=N(f.type);if(t==='check'||t==='checkbox'){s[f.key]=GROUPS[g].tri?nextTri(s[f.key]):!s[f.key];saveDraw();return true}if(t==='signature')return false;const live=runtimeFields().find(x=>S(x?.key)===f.key&&Number(x?.page)===GROUPS[g].page);const synthetic=live||{key:f.key,label:f.label,page:GROUPS[g].page,type:(t==='textarea'?'text':(t==='number'?'text':t||'text')),multiline:f.multiline||t==='textarea',inputMode:t==='number'?'decimal':'text'};if(t==='textarea')synthetic.multiline=true;const nativeEditor=G('sagsOpenNativeFieldEditor');if(typeof nativeEditor==='function')return nativeEditor(synthetic);const activateFn=G('activate');if(typeof activateFn==='function'){activateFn(synthetic);return true}return fallbackEdit(synthetic)}
function installCss(){if(document.getElementById('sags5494V6420Css'))return;const e=document.createElement('style');e.id='sags5494V6420Css';e.textContent=[
'.sags5494DirectHit{position:absolute;z-index:6;border:0;background:transparent;padding:0;margin:0;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:rgba(0,103,197,.14)}',
'.sags5494DirectHit:focus-visible{outline:2px solid #0875c9;outline-offset:-2px;background:rgba(8,117,201,.05)}',
'#sags5494Quick .q-field-config{display:none;margin:10px 0 4px;border:1px solid #c8d9e2;border-radius:12px;background:#f7fbfd;padding:10px}',
'#sags5494Quick .q-field-config.open{display:block}',
'#sags5494Quick .q-field-config-title{font:900 13px/1.25 system-ui;color:#174d61;margin-bottom:8px}',
'#sags5494Quick .q-field-config-row{display:grid;grid-template-columns:24px minmax(0,1fr);gap:7px;align-items:center;padding:6px 2px;border-top:1px solid #e4eef2;font:700 12px/1.25 system-ui;color:#294d5c}',
'#sags5494Quick .q-field-config-row input{width:18px;height:18px;margin:0;padding:0}',
'#sags5494Quick .q-field-config-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}',
'#sags5494Quick .q-field-config-actions button{padding:8px 10px;font-size:11px}'
].join('\n');document.head.appendChild(e)}
function clearDirect(){document.querySelectorAll('.sags5494DirectHit').forEach(x=>x.remove())}
function syncDirectHits(){installCss();const g=activeGroup(),d=GROUPS[g];clearDirect();if(!d)return false;const page=document.getElementById('page'+d.page);if(!page||page.classList.contains('hide')||getComputedStyle(page).display==='none')return false;const seen=new Set();for(const f of directFields(g)){if(seen.has(f.key))continue;seen.add(f.key);const t=N(f.type);if(['signature','display','displaycheck'].includes(t))continue;let x=f.x,y=f.y,w=f.w,h=f.h;if(t==='check'||t==='checkbox'){const px=.0045,py=.0035;x=Math.max(0,x-px);y=Math.max(0,y-py);w=Math.min(1-x,w+px*2);h=Math.min(1-y,h+py*2)}const b=document.createElement('button');b.type='button';b.className='sags5494DirectHit';b.dataset.fieldKey=f.key;b.setAttribute('aria-label',(f.label||f.key)+' · chạm để nhập trực tiếp');b.style.left=(x*100)+'%';b.style.top=(y*100)+'%';b.style.width=(w*100)+'%';b.style.height=(h*100)+'%';b.onclick=e=>{e.preventDefault();e.stopPropagation();directActivate(g,f)};page.appendChild(b)}return true}
function prefKey(g){const raw='sags5494QuickVisibleV6420:'+g;try{const fn=G('sagsOwnedKey');return typeof fn==='function'?fn(raw):raw}catch(_){return raw}}
function loadHidden(g){try{const a=JSON.parse(localStorage.getItem(prefKey(g))||'[]');return new Set(Array.isArray(a)?a.map(S).filter(Boolean):[])}catch(_){return new Set()}}
function saveHidden(g,set){try{localStorage.setItem(prefKey(g),JSON.stringify([...set]))}catch(_){}}
function itemRows(body){const out=[];body.querySelectorAll('.q-grid > label').forEach(el=>{const c=el.querySelector('[data-q-field]'),key=S(c?.dataset?.qField);if(key)out.push({key,label:S(el.childNodes?.[0]?.textContent||c?.getAttribute('placeholder')||key),el})});body.querySelectorAll('.q-row').forEach(el=>{const c=el.querySelector('[data-q-check]'),key=S(c?.dataset?.qCheck),label=S(el.querySelector('.q-label')?.textContent||key);if(key)out.push({key,label,el})});return out}
function applyQuickVisibility(g,body){const hidden=loadHidden(g);for(const item of itemRows(body))item.el.style.display=hidden.has(item.key)?'none':'';const title=body.querySelector('.q-field-config-title');if(title){const rows=itemRows(body),shown=rows.filter(x=>!hidden.has(x.key)).length;title.textContent='TRƯỜNG HIỂN THỊ TRONG NHẬP NHANH · '+shown+'/'+rows.length}}
function decorateQuick(g){g=canon(g||activeGroup());if(!GROUPS[g])return;installCss();const body=document.getElementById('sags5494QuickBody');if(!body)return;const tools=body.querySelector('.q-tools');if(!tools)return;let btn=tools.querySelector('.q-field-config-toggle');if(!btn){btn=document.createElement('button');btn.type='button';btn.className='q-soft q-field-config-toggle';btn.textContent='⚙ TRƯỜNG HIỂN THỊ';tools.appendChild(btn)}let box=body.querySelector('.q-field-config');if(!box){box=document.createElement('div');box.className='q-field-config';tools.insertAdjacentElement('afterend',box)}const rows=itemRows(body),hidden=loadHidden(g);box.innerHTML='<div class="q-field-config-title"></div>'+rows.map(item=>'<label class="q-field-config-row"><input type="checkbox" data-v6420-visible="'+item.key.replace(/"/g,'&quot;')+'" '+(hidden.has(item.key)?'':'checked')+'><span>'+item.label.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))+'</span></label>').join('')+'<div class="q-field-config-actions"><button type="button" class="q-soft" data-v6420-all>HIỆN TẤT CẢ</button><button type="button" class="q-soft" data-v6420-reset>MẶC ĐỊNH</button></div>';box.querySelectorAll('[data-v6420-visible]').forEach(c=>c.onchange=()=>{const set=loadHidden(g),k=S(c.dataset.v6420Visible);if(c.checked)set.delete(k);else set.add(k);saveHidden(g,set);applyQuickVisibility(g,body)});box.querySelector('[data-v6420-all]').onclick=()=>{saveHidden(g,new Set());decorateQuick(g);body.querySelector('.q-field-config')?.classList.add('open')};box.querySelector('[data-v6420-reset]').onclick=()=>{try{localStorage.removeItem(prefKey(g))}catch(_){}decorateQuick(g);body.querySelector('.q-field-config')?.classList.add('open')};btn.onclick=()=>box.classList.toggle('open');applyQuickVisibility(g,body)}
const baseQuick=root.sags5494OpenQuickEntry;if(typeof baseQuick==='function'&&!baseQuick.__sagsV6420){const q=function(group){const g=canon(group||activeGroup()),r=baseQuick.apply(this,arguments);setTimeout(()=>decorateQuick(g),0);return r};q.__sagsV6420=true;q.__sagsV6420Base=baseQuick;root.sags5494OpenQuickEntry=q}
function patchQuickPanel(){const base=G('openQuickTimePanel');if(typeof base!=='function'||base.__sags5494V6420)return;const w=function(){const g=activeGroup();if(GROUPS[g])return root.sags5494OpenQuickEntry?.(g);return base.apply(this,arguments)};w.__sags5494V6420=true;w.__sags5494V6420Base=base;root.openQuickTimePanel=w;try{eval('openQuickTimePanel=w')}catch(_){}}
function patchShow(){const base=G('showFormGroup');if(typeof base!=='function'||base.__sags5494DirectV6420)return;const w=function(){const r=base.apply(this,arguments);setTimeout(syncDirectHits,0);setTimeout(syncDirectHits,180);return r};w.__sags5494DirectV6420=true;w.__sags5494DirectV6420Base=base;root.showFormGroup=w;try{eval('showFormGroup=w')}catch(_){}}
let queued=false;function queueSync(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;syncDirectHits();patchQuickPanel();patchShow()})}
function boot(){installCss();patchQuickPanel();patchShow();queueSync();[150,500,1100,2200,4500].forEach(ms=>setTimeout(queueSync,ms))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
const mo=new MutationObserver(m=>{const ownOnly=m.length>0&&m.every(x=>[...x.addedNodes,...x.removedNodes].every(n=>!n?.classList||n.classList.contains('sags5494DirectHit')));if(ownOnly)return;queueSync()});
if(document.documentElement)mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
root.addEventListener('pageshow',()=>setTimeout(queueSync,100),{passive:true});
root.addEventListener('resize',()=>setTimeout(queueSync,80),{passive:true});
})(window);



/* V6.4.21: capture-phase direct interaction for F/SAGS-CXR/54 + 94.
   Mobile WebView can cancel synthetic button click events while the form is scrollable.
   This dispatcher resolves the tapped Form Manager field from page coordinates on pointerup,
   before canvas/SVG/legacy gesture handlers can swallow the event. */
(function FSAGS5494V6421(root){
'use strict';
const BUILD='V6.4.25-20260929-FSAGS54-94-DIRECT-EDITOR-01';
if(root.__SAGS_FSAGS5494_V6421===BUILD)return;
root.__SAGS_FSAGS5494_V6421=BUILD;
const GROUPS={fsags54:{id:'fsags54',page:16,tri:true,code:'F/SAGS-CXR/54'},clc_checklist:{id:'fsags94',page:17,tri:false,code:'F/SAGS-CXR/94'}};
const S=v=>String(v??'').trim();
const N=v=>S(v).toLowerCase().replace(/[\s./-]+/g,'_').replace(/^_+|_+$/g,'');
function canon(v){const g=N(v);if(g==='fsags54'||g==='f_sags_cxr_54')return'fsags54';if(['clc_checklist','fsags94','fsags94_clc','f_sags_cxr_94'].includes(g))return'clc_checklist';return g}
function G(name){try{if(root[name]!==undefined)return root[name];return eval(name)}catch(_){return undefined}}
function activeGroup(){
  let g=canon(G('activeFormGroup')||'');if(GROUPS[g])return g;
  try{
    const sid=S(G('activeFlightSessionId')),env=sid&&typeof G('readFlightSessionEnvelope')==='function'?(G('readFlightSessionEnvelope')(sid)||{}):{},m=G('currentFlightSessionMeta')?.()||{};
    g=canon(env.activeFormGroup||env.mainForm||m.initialGroup||'');if(GROUPS[g])return g
  }catch(_){}
  return''
}
function st(){const s=G('state');return s&&typeof s==='object'?s:{}}
function canUse(g){try{return typeof root.sags5494CanUse==='function'?root.sags5494CanUse(g):true}catch(_){return false}}
function deny(g){try{G('roleDenied')?.('Tài khoản hiện tại không được phân công '+(GROUPS[g]?.code||'biểu mẫu')+' trong MY FLIGHT.')}catch(_){alert('Bạn không có quyền sửa biểu mẫu này.')}return false}
function registry(){try{return root.sagsV450GetFormRegistry?.()||null}catch(_){return null}}
function regForm(g){const id=GROUPS[g]?.id;return registry()?.forms?.find(f=>N(f?.id)===id)||null}
function runtimeFields(){const a=G('fields');return Array.isArray(a)?a:[]}
function frac(v,den){const n=Number(v);if(!Number.isFinite(n))return 0;return Math.abs(n)>1.5?n/den:n}
function normField(raw,g,reg){
  const d=GROUPS[g],key=S(raw?.bind||raw?.key),type=N(raw?.type||raw?.sourceType||'text');if(!d||!key)return null;
  let x=frac(raw?.x,1241),y=frac(raw?.y,1755),w=frac(raw?.w,1241),h=frac(raw?.h,1755);
  if(!reg){x=frac(raw?.x??raw?.vx,1241);y=frac(raw?.y??raw?.vy,1755);w=frac(raw?.w??raw?.vw,1241);h=frac(raw?.h??raw?.vh,1755)}
  if(!(w>0&&h>0))return null;
  return{key,label:S(raw?.label||key),type,x,y,w,h,page:d.page,multiline:type==='textarea'||raw?.multiline===true}
}
function fieldsFor(g){
  const f=regForm(g);if(f?.fields?.length)return f.fields.map(x=>normField(x,g,true)).filter(Boolean);
  const d=GROUPS[g];return runtimeFields().filter(x=>Number(x?.page)===d.page).map(x=>normField(x,g,false)).filter(Boolean)
}
function triValue(v){if(v===true)return'OK';const x=S(v).toUpperCase();if(['OK','YES','TRUE','1','✓','V'].includes(x))return'OK';if(x==='X')return'X';if(x==='NA'||x==='N/A')return'NA';return''}
function nextTri(v){const x=triValue(v);return x==='OK'?'X':x==='X'?'NA':x==='NA'?'':'OK'}
function saveDraw(){try{G('persist')?.()}catch(_){}try{G('draw')?.()}catch(_){}}
function ensureDirectEditor(){
  let m=document.getElementById('sags5494FieldEditor');if(m)return m;
  const css=document.createElement('style');css.id='sags5494FieldEditorCss';css.textContent=[
    '#sags5494FieldEditor{position:fixed;inset:0;z-index:2147483300;display:none;align-items:flex-end;justify-content:center;background:rgba(6,27,40,.64);padding:12px;box-sizing:border-box;font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif}',
    '#sags5494FieldEditor.show{display:flex}',
    '#sags5494FieldEditor .fe-card{width:min(100%,620px);background:#fff;border-radius:18px;box-shadow:0 20px 60px #00182466;padding:16px;box-sizing:border-box}',
    '#sags5494FieldEditor .fe-title{font-size:18px;font-weight:900;color:#0c5f76;margin-bottom:4px}',
    '#sags5494FieldEditor .fe-sub{font-size:12px;font-weight:700;color:#647b86;margin-bottom:12px}',
    '#sags5494FieldEditor input,#sags5494FieldEditor textarea{width:100%;box-sizing:border-box;border:2px solid #1680a0;border-radius:12px;background:#f9fcfd;color:#173b4c;padding:12px 13px;font:750 18px/1.35 system-ui,-apple-system,Segoe UI,Arial,sans-serif;outline:none}',
    '#sags5494FieldEditor textarea{min-height:128px;resize:vertical}',
    '#sags5494FieldEditor .fe-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}',
    '#sags5494FieldEditor button{min-height:44px;border:0;border-radius:11px;font-weight:850;font-size:14px}',
    '#sags5494FieldEditor .fe-cancel{background:#edf1f3;color:#445d68}',
    '#sags5494FieldEditor .fe-save{background:#0b6f86;color:#fff}',
    '@media(min-width:700px){#sags5494FieldEditor{align-items:center}}'
  ].join('\n');document.head.appendChild(css);
  m=document.createElement('div');m.id='sags5494FieldEditor';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');
  m.innerHTML='<div class="fe-card"><div class="fe-title" id="sags5494FieldEditorTitle">NHẬP DỮ LIỆU</div><div class="fe-sub" id="sags5494FieldEditorSub"></div><div id="sags5494FieldEditorControl"></div><div class="fe-actions"><button type="button" class="fe-cancel" id="sags5494FieldEditorCancel">ĐÓNG</button><button type="button" class="fe-save" id="sags5494FieldEditorSave">LƯU</button></div></div>';
  document.body.appendChild(m);
  const close=()=>m.classList.remove('show');
  document.getElementById('sags5494FieldEditorCancel').onclick=close;
  m.addEventListener('click',e=>{if(e.target===m)close()});
  return m
}
function openDirectEditor(g,f,synthetic){
  const m=ensureDirectEditor(),s=st(),t=N(f.type),multiline=!!(f.multiline||synthetic?.multiline||t==='textarea');
  const title=document.getElementById('sags5494FieldEditorTitle'),sub=document.getElementById('sags5494FieldEditorSub'),host=document.getElementById('sags5494FieldEditorControl');
  title.textContent=f.label||f.key||'NHẬP DỮ LIỆU';sub.textContent=GROUPS[g]?.code||'';
  const el=document.createElement(multiline?'textarea':'input');el.id='sags5494FieldEditorInput';el.value=S(s[f.key]);
  if(!multiline){el.type='text';el.inputMode=t==='number'?'decimal':(synthetic?.inputMode||'text');el.autocomplete='off';el.enterKeyHint='done'}
  host.replaceChildren(el);
  const commit=()=>{s[f.key]=String(el.value??'').toUpperCase();saveDraw();m.classList.remove('show')};
  document.getElementById('sags5494FieldEditorSave').onclick=commit;
  el.onkeydown=e=>{if(e.key==='Escape'){m.classList.remove('show');return}if(e.key==='Enter'&&!multiline){e.preventDefault();commit()}};
  m.classList.add('show');
  try{el.focus({preventScroll:true});el.setSelectionRange?.(el.value.length,el.value.length)}catch(_){try{el.focus()}catch(__){}}
  setTimeout(()=>{try{if(document.activeElement!==el)el.focus({preventScroll:true})}catch(_){}},40);
  return true
}
function activateField(g,f){
  if(!canUse(g))return deny(g);
  const s=st(),t=N(f.type);
  if(t==='check'||t==='checkbox'){s[f.key]=GROUPS[g].tri?nextTri(s[f.key]):!s[f.key];saveDraw();return true}
  if(t==='signature'||t==='display'||t==='displaycheck')return false;
  const live=runtimeFields().find(x=>S(x?.key)===f.key&&Number(x?.page)===GROUPS[g].page);
  const synthetic=live||{key:f.key,label:f.label,page:GROUPS[g].page,type:(t==='textarea'||t==='number')?'text':(t||'text'),multiline:f.multiline||t==='textarea',inputMode:t==='number'?'decimal':'text'};
  if(t==='textarea')synthetic.multiline=true;
  const nativeEditor=G('sagsOpenNativeFieldEditor');
  if(typeof nativeEditor==='function'){try{const opened=!!nativeEditor(synthetic);if(opened)return true}catch(e){console.warn('V6.4.25 native editor failed; using direct fallback',g,f.key,e)}}
  const fn=G('activate');if(typeof fn==='function'){try{fn(synthetic);const entry=document.getElementById('entry');if(entry&&!entry.classList.contains('hide')&&getComputedStyle(entry).display!=='none')return true}catch(e){console.warn('V6.4.25 core activate failed; using direct fallback',g,f.key,e)}}
  return openDirectEditor(g,f,synthetic)
}
function blockedTarget(target){
  if(!target?.closest)return false;
  return !!target.closest('.toolbar,#entry,#signModal,#templateModal,#sags5494Quick,#sags5494FieldEditor,#sagsV6419SignModal,#appUpdateModal,#exportModal,#exportChoiceModal,#formMenuModal,#flightSessionModal,[role="dialog"]')
}
function hitAt(g,clientX,clientY){
  const d=GROUPS[g],page=document.getElementById('page'+d.page);if(!page||page.classList.contains('hide'))return null;
  const cs=getComputedStyle(page);if(cs.display==='none'||cs.visibility==='hidden')return null;
  const r=page.getBoundingClientRect();if(!(r.width>0&&r.height>0)||clientX<r.left||clientX>r.right||clientY<r.top||clientY>r.bottom)return null;
  const px=(clientX-r.left)/r.width,py=(clientY-r.top)/r.height,candidates=[];
  for(const f of fieldsFor(g)){
    const t=N(f.type);if(['signature','display','displaycheck'].includes(t))continue;
    let x=f.x,y=f.y,w=f.w,h=f.h;
    if(t==='check'||t==='checkbox'){const ex=.009,ey=.007;x-=ex;y-=ey;w+=ex*2;h+=ey*2}
    if(px>=x&&px<=x+w&&py>=y&&py<=y+h)candidates.push({f,area:Math.max(.0000001,w*h)})
  }
  if(!candidates.length)return null;candidates.sort((a,b)=>a.area-b.area);return candidates[0].f
}
let pending=null,lastFire=0;
function down(e){
  if(e.isPrimary===false||blockedTarget(e.target))return;
  const g=activeGroup();if(!GROUPS[g])return;
  const f=hitAt(g,e.clientX,e.clientY);if(!f)return;
  pending={id:e.pointerId,g,f,x:e.clientX,y:e.clientY,t:Date.now()}
}
function move(e){if(!pending||pending.id!==e.pointerId)return;if(Math.hypot(e.clientX-pending.x,e.clientY-pending.y)>18)pending=null}
function cancel(e){if(pending&&pending.id===e.pointerId)pending=null}
function up(e){
  const p=pending;if(!p||p.id!==e.pointerId){pending=null;return}
  pending=null;if(blockedTarget(e.target))return;
  if(Math.hypot(e.clientX-p.x,e.clientY-p.y)>18)return;
  const g=activeGroup();if(g!==p.g)return;
  const end=hitAt(g,e.clientX,e.clientY);if(!end||end.key!==p.f.key)return;
  const now=Date.now();if(now-lastFire<180)return;lastFire=now;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  activateField(g,p.f)
}
function install(){
  if(document.documentElement.dataset.sags5494DirectCapture==='v6421')return;
  document.documentElement.dataset.sags5494DirectCapture='v6421';
  const stl=document.createElement('style');stl.id='sags5494V6421Css';stl.textContent='.sags5494DirectHit{pointer-events:none!important}.sags5494DirectHit:focus{outline:none!important}';document.head.appendChild(stl);
  document.addEventListener('pointerdown',down,true);
  document.addEventListener('pointermove',move,true);
  document.addEventListener('pointerup',up,true);
  document.addEventListener('pointercancel',cancel,true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
root.addEventListener('pageshow',()=>{pending=null;install()},{passive:true});
})(window);


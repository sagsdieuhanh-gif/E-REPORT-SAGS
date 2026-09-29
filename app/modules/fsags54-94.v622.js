(function FSAGS5494Module(root){
  'use strict';
  const BUILD='V6.2.4-20260927-FORM-54-94-1241-01';
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
    b.onclick=()=>openQuick(g);
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

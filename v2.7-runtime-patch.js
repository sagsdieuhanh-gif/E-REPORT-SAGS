/* E-REPORT/SAGS V2.7 · COMPLETED-ONLY STATS + PDF GATE + STANDARD PDF NAME
 * BUILD: V2.7-COMPLETED-PDF-CONTROL
 *
 * 1) Chỉ tính 1 chuyến/người khi toàn bộ assignment hiện còn thuộc người đó
 *    trên Flight Workspace đã thực sự HOÀN TẤT (taskClaims.completedAtMs).
 * 2) E-FORM F/SAGS chưa HOÀN TẤT thì khóa XUẤT PDF/CHIA SẺ PDF.
 * 3) Sau HOÀN TẤT, PDF F/SAGS dùng tên: Fsags <FLIGHT> DD-MM-YYYY.pdf
 *    cho native Share và fallback download.
 * 4) MỞ LẠI chỉnh sửa làm trạng thái quay về IN_PROGRESS => PDF bị khóa lại
 *    cho tới khi HOÀN TẤT revision mới.
 */
(function(root){
  'use strict';
  const BUILD='V2.7-COMPLETED-PDF-CONTROL';
  if(root.__SAGS_V27_COMPLETED_PDF_CONTROL===BUILD)return;
  root.__SAGS_V27_COMPLETED_PDF_CONTROL=BUILD;

  const S=v=>String(v??'').trim();
  const U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const normUser=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}};

  function session(){try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}}
  function profile(){return session().profile||root.currentUserProfile||{}}
  function role(){return U(session().role||profile().role||root.currentRole)}
  function me(){return normUser(profile().username||profile().userName||profile().code||(role()==='AD'?'AD':''))}
  function isAdmin(){return ['AD','ADMIN'].includes(role())}
  function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function db(path=''){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase chưa sẵn sàng.');return root.sagsV470Ref(path)}
  async function once(path){return (await db(path).once('value')).val()}
  function activeMeta(){try{return root.currentFlightSessionMeta?.()||null}catch(_){return null}}
  function opDate(){const m=activeMeta();return S(m?.rosterOpDate)||S(document.getElementById('fwcDate')?.value)||S(sessionStorage.getItem('sagsV36FwcDate'))||today()}
  async function manifest(date){return (await once(`roster_manifests/${safe(date)}`).catch(()=>null))||{}}
  function itemsOf(man){return Array.isArray(man?.items)?man.items.filter(Boolean):Object.values(man?.items||{}).filter(Boolean)}

  function isFsagsItem(item){
    const f=U(item?.formGroup||item?.mainForm||item?.activeFormGroup||'');
    return f==='FSAGS'||f.startsWith('FSAGS')||f==='LOADING208';
  }
  function stateDone(st){
    const c=U(st?.claimStatus),w=U(st?.workPartStatus),t=U(st?.taskStatusV333||st?.taskStatus);
    return ['PART_COMPLETED','COMPLETED','HANDED_OVER'].includes(c)||w==='COMPLETED'||t==='COMPLETED';
  }
  function strongCompleted(st,user,allowAny=false){
    if(!st||!stateDone(st))return false;
    if(!st.completionEnvelope)return false;
    if(!(Number(st.completedAtMs||st.completionEnvelopeAtMs||0)>0))return false;
    if(allowAny)return true;
    const by=normUser(st.completedBy),u=normUser(user);
    if(by)return by===u;
    return normUser(st.ownerUser)===u;
  }
  function claimCompleted(claim){
    if(!claim)return false;
    const s=U(claim.taskStatus||claim.status);
    return Number(claim.completedAtMs||0)>0&&(s==='COMPLETED'||s==='PART_COMPLETED'||s==='HANDED_OVER');
  }

  async function activeRosterContext(){
    const meta=activeMeta(),aid=S(meta?.rosterAssignmentId);if(!aid)return null;
    const date=S(meta?.rosterOpDate)||opDate(),man=await manifest(date),item=itemsOf(man).find(x=>S(x?.assignmentId)===aid)||null;
    if(!item)return null;
    const st=(await once(`roster_sessions/${safe(aid)}`).catch(()=>null))||{};
    return {date,aid,item,st,meta};
  }

  function parseDate(v){
    let s=S(v);if(!s)return null;
    let m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s);if(m)return {y:m[1],mo:m[2],d:m[3]};
    m=/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/.exec(s);if(m)return {y:m[3],mo:m[2],d:m[1]};
    const digits=s.replace(/\D/g,'');
    if(/^\d{8}$/.test(digits)){
      if(Number(digits.slice(0,4))>=2000)return {y:digits.slice(0,4),mo:digits.slice(4,6),d:digits.slice(6,8)};
      return {y:digits.slice(4,8),mo:digits.slice(2,4),d:digits.slice(0,2)};
    }
    return null;
  }
  function dayFile(v){const p=parseDate(v)||parseDate(today());return `${p.d}-${p.mo}-${p.y}`}
  function flightToken(item){
    const leg=U(item?.assignmentLeg),choices=[];
    if(leg==='ARR')choices.push(item?.arrFlight,item?.assignmentFlight,item?.flightRaw,item?.flightName,item?.depFlight);
    else if(leg==='DEP')choices.push(item?.depFlight,item?.assignmentFlight,item?.flightRaw,item?.flightName,item?.arrFlight);
    else choices.push(item?.depFlight,item?.arrFlight,item?.assignmentFlight,item?.flightRaw,item?.flightName);
    for(const raw of choices){
      const s=U(raw);if(!s)continue;
      const matches=s.match(/[A-Z0-9]{2,3}\s*\d{1,4}[A-Z]?/g)||[];
      if(matches.length){
        const token=matches[0].replace(/\s+/g,'');if(token)return token;
      }
    }
    return 'FLIGHT';
  }
  function standardPdfName(ctx){return `Fsags ${flightToken(ctx?.item)} ${dayFile(ctx?.date||ctx?.item?.opDate||ctx?.item?.date)}.pdf`}
  function setPdfContext(ctx){
    if(!ctx||!isFsagsItem(ctx.item)){root.__SAGS_V27_PDF_CTX=null;return null}
    const x={date:ctx.date,aid:ctx.aid,item:ctx.item,name:standardPdfName(ctx),setAtMs:Date.now(),expiresAtMs:Date.now()+15*60*1000};
    root.__SAGS_V27_PDF_CTX=x;return x;
  }
  function pdfCtx(){const c=root.__SAGS_V27_PDF_CTX;if(!c||Number(c.expiresAtMs||0)<Date.now())return null;const m=activeMeta();if(S(m?.rosterAssignmentId)&&S(m.rosterAssignmentId)!==S(c.aid))return null;return c}
  function knownNonFsagsName(name){return /(?:^|[_ -])(EREPORT|FINAL|CROSSCHECK|KET.?SO|AUDIT|ARCHIVE|REPORT)(?:[_ .-]|$)/i.test(S(name))}
  function shouldForceName(original){const c=pdfCtx();return !!c&&!knownNonFsagsName(original)}
  function renamePdf(file,name){
    if(!file||!name)return file;
    try{if(typeof File!=='undefined'&&file instanceof File&&file.name===name)return file}catch(_){}
    try{return new File([file],name,{type:file.type||'application/pdf',lastModified:Date.now()})}catch(_){return file}
  }

  async function assertExportAllowed(ctx){
    if(!ctx||!isFsagsItem(ctx.item))return true;
    if(!strongCompleted(ctx.st,me(),isAdmin())){
      throw new Error('CHƯA HOÀN TẤT. Hãy bấm ✓ HOÀN TẤT trước; sau khi hệ thống ghi nhận COMPLETED mới được xuất/chia sẻ PDF.');
    }
    setPdfContext(ctx);return true;
  }

  /* ---------- PDF gate ---------- */
  function patchExportMenu(){
    const base=root.openExportChoiceMenu;if(typeof base!=='function'||base.__v27PdfGate)return false;
    const wrapped=async function(){
      try{const ctx=await activeRosterContext();if(ctx)await assertExportAllowed(ctx);return await base.apply(this,arguments)}
      catch(e){alert(S(e?.message||e));return false}
    };
    wrapped.__v27PdfGate=1;root.openExportChoiceMenu=wrapped;try{openExportChoiceMenu=wrapped}catch(_){};return true;
  }
  function patchAssignmentExport(){
    const base=root.v310ExportAssignment;if(typeof base!=='function'||base.__v27PdfGate)return false;
    const wrapped=async function(aid){
      try{
        const date=S(document.getElementById('fwcDate')?.value)||opDate(),man=await manifest(date),item=itemsOf(man).find(x=>S(x?.assignmentId)===S(aid))||null;
        if(item&&isFsagsItem(item)){
          const st=(await once(`roster_sessions/${safe(aid)}`).catch(()=>null))||{};
          const ctx={date,aid:S(aid),item,st,meta:null};await assertExportAllowed(ctx);
        }
        return await base.apply(this,arguments);
      }catch(e){alert('Không mở được XUẤT / CHIA SẺ: '+S(e?.message||e));return false}
    };
    wrapped.__v27PdfGate=1;root.v310ExportAssignment=wrapped;try{v310ExportAssignment=wrapped}catch(_){};return true;
  }
  function patchSendReport(){
    const base=root.sendReport;if(typeof base!=='function'||base.__v27PdfGate)return false;
    const wrapped=async function(){
      try{const ctx=await activeRosterContext();if(ctx)await assertExportAllowed(ctx);return await base.apply(this,arguments)}
      catch(e){if(e?.name!=='AbortError')alert(S(e?.message||e));return false}
    };
    wrapped.__v27PdfGate=1;root.sendReport=wrapped;try{sendReport=wrapped}catch(_){};return true;
  }

  /* ---------- Standard PDF name ---------- */
  function patchPdfBuilder(key){
    const base=root[key];if(typeof base!=='function'||base.__v27PdfName)return false;
    const wrapped=async function(canvases,fileName){
      const c=pdfCtx(),desired=(c&&shouldForceName(fileName))?c.name:'';
      const out=await base.call(this,canvases,desired||fileName);
      if(desired){root.__SAGS_V27_LAST_PDF_NAME=desired;return renamePdf(out,desired)}
      return out;
    };
    wrapped.__v27PdfName=1;root[key]=wrapped;try{if(key==='canvasesToPdfFile')canvasesToPdfFile=wrapped;else if(key==='canvasesToLandscapePdfFile')canvasesToLandscapePdfFile=wrapped}catch(_){};return true;
  }
  document.addEventListener('click',e=>{
    try{
      const a=e.target?.closest?.('a[download]');if(!a)return;
      const c=pdfCtx();if(!c||!shouldForceName(a.download))return;
      if(/\.pdf(?:$|[?#])/i.test(S(a.download))||String(a.href||'').startsWith('blob:'))a.download=c.name;
    }catch(_){}
  },true);

  /* ---------- Visual lock on in-form XUẤT ---------- */
  async function refreshExportLock(){
    const b=document.getElementById('v324ExportBtn');if(!b)return;
    let ctx=null;try{ctx=await activeRosterContext()}catch(_){}
    if(!ctx||!isFsagsItem(ctx.item)){
      b.disabled=false;b.removeAttribute('aria-disabled');b.style.opacity='';b.style.filter='';b.title='Xuất / Chia sẻ';return;
    }
    const ok=strongCompleted(ctx.st,me(),isAdmin());
    b.disabled=!ok;b.setAttribute('aria-disabled',ok?'false':'true');b.style.opacity=ok?'':'.42';b.style.filter=ok?'':'grayscale(.35)';
    b.title=ok?`Xuất / Chia sẻ · ${standardPdfName(ctx)}`:'Chỉ xuất PDF sau khi bấm HOÀN TẤT';
  }
  function patchComplete(){
    const base=root.v324ConfirmRosterHandover;if(typeof base!=='function'||base.__v27PdfRefresh)return false;
    const wrapped=async function(){const r=await base.apply(this,arguments);setTimeout(refreshExportLock,120);setTimeout(refreshExportLock,500);return r};
    wrapped.__v27PdfRefresh=1;root.v324ConfirmRosterHandover=wrapped;try{v324ConfirmRosterHandover=wrapped}catch(_){};return true;
  }
  function patchSwitch(){
    const base=root.switchFlightSession;if(typeof base!=='function'||base.__v27PdfRefresh)return false;
    const wrapped=function(){const r=base.apply(this,arguments);setTimeout(refreshExportLock,100);setTimeout(refreshExportLock,350);return r};
    wrapped.__v27PdfRefresh=1;root.switchFlightSession=wrapped;try{switchFlightSession=wrapped}catch(_){};return true;
  }

  /* ---------- Completed-only daily statistics ---------- */
  async function userCatalog(){try{return typeof root.v466GetUserCatalog==='function'?await root.v466GetUserCatalog(true):[]}catch(_){return []}}
  function assignmentClaim(rec,user,aid){
    const claims=rec?.taskClaims||{},u=normUser(user);
    for(const [k,v] of Object.entries(claims))if(normUser(k)===u)return v?.[aid]||v?.[safe(aid)]||null;
    return null;
  }
  function historyCompleted(rec,user,aid){
    const u=normUser(user),a=S(aid);
    return Object.values(rec?.workPartHistory||{}).some(ev=>ev&&S(ev.assignmentId)===a&&normUser(ev.fromUser||ev.completedBy)===u&&U(ev.type)==='WORK_PART_COMPLETED'&&U(ev.status)==='COMPLETED');
  }
  function assignmentReallyCompleted(rec,user,aid){return claimCompleted(assignmentClaim(rec,user,aid))||historyCompleted(rec,user,aid)}
  async function completedDailyStats(date){
    date=S(date)||today();
    const [manRaw,flightsRaw,catalog]=await Promise.all([
      once(`roster_manifests/${safe(date)}`).catch(()=>null),
      once(`flight_records/${safe(date)}`).catch(()=>null),
      userCatalog()
    ]);
    const man=manRaw||{},flights=flightsRaw||{},names=new Map(),groups=new Map();
    for(const p of Array.isArray(catalog)?catalog:[]){const u=normUser(p?.username||p?.userName||p?.code);if(u)names.set(u,S(p?.name||p?.fullName||p?.displayName||p?.username||u))}
    for(const item of itemsOf(man)){
      if(!item||item.active===false)continue;
      const u=normUser(item.user||item.targetUser),fid=S(item.flightId);if(!u||!fid)continue;
      const key=u+'\u0000'+fid;if(!groups.has(key))groups.set(key,{user:u,fid,aids:new Set()});groups.get(key).aids.add(S(item.assignmentId));
      const n=S(item.name||item.userName||item.targetName);if(n&&!names.has(u))names.set(u,n);
    }
    const doneByUser=new Map();
    for(const g of groups.values()){
      const rec=flights[g.fid]||flights[safe(g.fid)]||{};
      const aids=[...g.aids].filter(Boolean);if(!aids.length)continue;
      const allDone=aids.every(aid=>assignmentReallyCompleted(rec,g.user,aid));
      if(!allDone)continue;
      if(!doneByUser.has(g.user))doneByUser.set(g.user,new Set());doneByUser.get(g.user).add(g.fid);
    }
    const rows=[...doneByUser.entries()].map(([username,set])=>({date,username,name:S(names.get(username)||username),count:set.size})).filter(x=>x.count>0).sort((a,b)=>b.count-a.count||a.username.localeCompare(b.username,'vi'));
    return {date,rows,totalAccounts:rows.length,totalUserFlights:rows.reduce((n,x)=>n+x.count,0),completedOnly:true,build:BUILD};
  }
  function patchStatsEngine(){
    if(typeof root.sagsV23BuildDailyStats!=='function')return false;
    if(root.sagsV23BuildDailyStats.__v27CompletedOnly)return true;
    const wrapped=date=>completedDailyStats(S(date)||today());wrapped.__v27CompletedOnly=1;root.sagsV23BuildDailyStats=wrapped;return true;
  }
  function patchStatsText(){
    try{
      const card=document.getElementById('v25StatsCard');if(card){const t=card.querySelector('.v25StatsTitle'),s=card.querySelector('.v25StatsSub');if(t)t.textContent='THỐNG KÊ CHUYẾN ĐÃ LÀM';if(s)s.textContent='Chỉ tính chuyến đã HOÀN TẤT · chọn ngày + đơn vị · xuất Excel'}
      const modal=document.getElementById('v25StatsModal');if(modal){const h=modal.querySelector('.v25Head h3'),sub=modal.querySelector('.v25Sub');if(h)h.textContent='📊 THỐNG KÊ CHUYẾN ĐÃ HOÀN TẤT';if(sub)sub.textContent='Chỉ tính khi toàn bộ phần việc hiện thuộc tài khoản trên Flight Workspace đã HOÀN TẤT. Chuyến chỉ được phân/chưa hoàn tất không được tính.'}
      const sum=document.querySelector('#v25StatsBody .v25Summary');if(sum&&!/ĐÃ HOÀN TẤT/i.test(sum.textContent))sum.textContent=sum.textContent.replace(/lượt chuyến-người\s*$/i,'lượt chuyến-người ĐÃ HOÀN TẤT');
      const th=[...document.querySelectorAll('#v25StatsBody .v25Table th')].find(x=>U(x.textContent)==='SỐ CHUYẾN');if(th)th.textContent='Số chuyến hoàn tất';
      const empty=document.querySelector('#v25StatsBody .v25Empty');if(empty&&empty.textContent.includes('chưa có tài khoản nào được xác định có chuyến'))empty.textContent=empty.textContent.replace('chưa có tài khoản nào được xác định có chuyến','chưa có tài khoản nào hoàn tất chuyến');
    }catch(_){}
  }

  function patchAll(){
    patchExportMenu();patchAssignmentExport();patchSendReport();patchPdfBuilder('canvasesToPdfFile');patchPdfBuilder('canvasesToLandscapePdfFile');patchComplete();patchSwitch();patchStatsEngine();patchStatsText();refreshExportLock();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(patchAll,160),{once:true});else setTimeout(patchAll,160);
  let tries=0;const timer=setInterval(()=>{patchAll();if(++tries>30)clearInterval(timer)},500);
  const mo=new MutationObserver(()=>{clearTimeout(root.__v27UiTimer);root.__v27UiTimer=setTimeout(()=>{patchStatsText();refreshExportLock()},100)});
  const startObserver=()=>{try{mo.observe(document.body,{childList:true,subtree:true})}catch(_){}};if(document.body)startObserver();else document.addEventListener('DOMContentLoaded',startObserver,{once:true});
  window.addEventListener('pageshow',()=>setTimeout(patchAll,100),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(patchAll,100)},{passive:true});

  root.sagsV27BuildCompletedStats=date=>completedDailyStats(S(date)||today());
  root.sagsV27StandardPdfName=ctx=>standardPdfName(ctx||{});

  root.sagsV27Diagnostics=()=>({
    build:BUILD,
    role:role(),
    statsCompletedOnly:!!root.sagsV23BuildDailyStats?.__v27CompletedOnly,
    exportMenuGated:!!root.openExportChoiceMenu?.__v27PdfGate,
    assignmentExportGated:!!root.v310ExportAssignment?.__v27PdfGate,
    sendReportGated:!!root.sendReport?.__v27PdfGate,
    pdfBuilderNamed:!!root.canvasesToPdfFile?.__v27PdfName,
    currentPdfName:pdfCtx()?.name||'',
    lastPdfName:S(root.__SAGS_V27_LAST_PDF_NAME||'')
  });
})(typeof window!=='undefined'?window:globalThis);

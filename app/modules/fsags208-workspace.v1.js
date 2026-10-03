/* E-REPORT SAGS V6.4.80 · FSAGS 208 WORKSPACE
 * Airline policy decides whether the flight needs FSAGS 208.
 * No Cargo column is required in Daily Roster.
 * Cargo handling is sequential: last receiver owns editing, immutable receive/send history is retained.
 * Send publishes the form into the existing Flight Workspace; no Flight/Date/REG re-matching.
 */
(function(root){
'use strict';
const BUILD='V6.4.80-20261003-UNIFIED-FLIGHT-WORKSPACE-REPAIR-01';
const FLIGHTS='flight_records';
const MODULE='FSAGS208';
const FORM='loading208';
const S=v=>String(v??'').trim();
const U=v=>S(v).toUpperCase();
const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(_){return v}};
const norm=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}};
function session(){try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return{role:root.currentRole||'',profile:root.currentUserProfile||{}}}}
function role(){return U(session().role||session().profile?.role||root.currentRole)}
function profile(){return session().profile||root.currentUserProfile||{}}
function me(){const p=profile();return norm(p.username||p.userName||(role()==='AD'?'AD':''))}
function myName(){const p=profile();return S(p.name||p.fullName||p.displayName||p.username||me())}
function actor(){return{username:me(),name:myName(),role:role()}}
function db(path){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase RTDB chưa sẵn sàng.');return root.sagsV470Ref(path)}
function today(){try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}catch(_){return new Date().toISOString().slice(0,10)}}
function currentDate(){return S(document.getElementById('kh208WorkspaceDate')?.value||document.getElementById('fwcDate')?.value||sessionStorage.getItem('sagsV36FwcDate'))||today()}
function fmt(ms){if(!ms)return'';try{return new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(Number(ms)))}catch(_){return new Date(Number(ms)).toLocaleString('vi-VN')}}
function esc(v){return S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function hash(s){let h=2166136261>>>0;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return h.toString(36).toUpperCase()}
function flightName(rec){return S(rec?.flightName||rec?.flightRaw||[rec?.arrFlight,rec?.depFlight].filter(Boolean).join(' / ')||rec?.flightId||'CHUYẾN')}
function flightNo(rec){return S(rec?.depFlight||rec?.arrFlight||rec?.flightRaw||rec?.flightName).split(/[\/\s]+/).filter(Boolean).pop()||flightName(rec)}
function isHandlerRole(){return role()==='AD'||['KH','CARGO'].includes(role())||root.__SAGS_CARGO_ALL_FLIGHTS?.isCargo?.()===true}
function canReadFlight(){const p=profile();return !!me()&&!!role()&&!['GUEST','ANONYMOUS'].includes(role())&&p.active!==false;}
function published208(mod){if(mod?.published?.state&&Number(mod.published.revisionNo)>0)return clone(mod.published);if(mod?.status==='SENT'&&Number(mod.revisionNo)>0&&mod.state)return{state:clone(mod.state),revisionNo:Number(mod.revisionNo),sentAtMs:Number(mod.lastSentAtMs||0),sentBy:clone(mod.lastSentBy||{})};return null;}
function publishedSummary(date,fid,rec,mod,pub=published208(mod)){if(!pub)return null;const revisionNo=Number(pub.revisionNo||mod?.revisionNo||0);if(!revisionNo)return null;return {code:'FSAGS208',label:'FSAGS 208',status:'AVAILABLE',revisionNo,sentAtMs:Number(pub.sentAtMs||mod?.lastSentAtMs||0),sentBy:clone(pub.sentBy||mod?.lastSentBy||{}),opDate:S(date),flightId:S(fid),flightName:flightName(rec),updatedAtMs:Date.now()}}
async function syncPublishedSummary(date,fid,rec,mod,pub=published208(mod)){const summary=publishedSummary(date,fid,rec,mod,pub);if(!summary)return false;await db(FLIGHTS+'/'+safe(date)+'/'+safe(fid)+'/documents/FSAGS208').set(summary);try{const patch={};for(const [aid0,a0]of Object.entries(rec?.assignments||{})){const a=a0||{},aid=S(a.assignmentId||aid0),user=norm(a.user||a.targetUser||a.ownerUser);if(!aid||a.active===false)continue;patch['roster_manifests/'+safe(date)+'/items/'+safe(aid)+'/flightDocuments/FSAGS208']=summary;if(user)patch['roster_mail/'+safe(user)+'/items/'+safe(aid)+'/flightDocuments/FSAGS208']=summary}if(Object.keys(patch).length)await db('').update(patch)}catch(e){console.info('FSAGS208 mailbox document summary',e?.message||e)}return true}
function preservePublished(mod){if(!mod.published){const pub=published208(mod);if(pub)mod.published=pub;}return mod;}
root.sags208CanViewPayload=p=>canReadFlight()&&p?.workspaceReadOnly===true&&!!p.workspaceBinding?.opDate&&!!p.workspaceBinding?.flightId&&Number(p.revisionNo)>0;
function participants(rec){const set=new Set();const add=v=>{v=norm(v);if(v)set.add(v)};Object.values(rec?.unitAssignments||{}).forEach(a=>add(a?.username||a?.user));Object.values(rec?.assignments||{}).forEach(a=>{if(a?.active!==false)add(a?.user||a?.targetUser||a?.ownerUser)});return[...set]}
function isParticipant(rec,user=me()){return role()==='AD'||participants(rec).includes(norm(user))}
function activeState(){try{return typeof state!=='undefined'&&state?state:(root.state||{})}catch(_){return root.state||{}}}
function activeId(){try{return typeof activeFlightSessionId!=='undefined'?S(activeFlightSessionId):S(root.activeFlightSessionId)}catch(_){return S(root.activeFlightSessionId)}}
function readOnlyFlag(){try{return typeof kh208ReadOnly!=='undefined'&&kh208ReadOnly===true}catch(_){return false}}
function setReadOnly(v,label=''){try{if(typeof kh208ReadOnly!=='undefined')kh208ReadOnly=!!v}catch(_){}const b=document.getElementById('kh208ReadOnlyBadge');if(b&&v){b.style.display='block';b.textContent=label||'CHỈ XEM'}try{root.updateKH208PageControls?.()}catch(_){}}
function sheetKey(id){try{return root.kh208SheetKey?.(id)||kh208SheetKey(id)}catch(_){return''}}
function readList(){try{return root.kh208ReadList?.()||kh208ReadList()||[]}catch(_){return[]}}
function writeList(x){try{if(root.kh208WriteList)return root.kh208WriteList(x);return kh208WriteList(x)}catch(_){}}
function bindingFor(id=activeId()){const key=sheetKey(id);if(!key)return null;try{return JSON.parse(localStorage.getItem(key)||'{}')?.workspaceBinding||null}catch(_){return null}}
// All forms, including FSAGS 208, use the published repository configuration.
async function policy(force=false){if(!root.sagsAirlineFormPolicy)throw Error('Cấu hình biểu mẫu chưa sẵn sàng.');return await root.sagsAirlineFormPolicy.ready(force)}
function eligible(rec,p){return p?.forms?.loading208?.enabled!==false&&root.sagsAirlineFormPolicy.allowed(rec,'loading208')!==false}
function unavailableMessage(rec,p,mod,handler){
 if(p?.forms?.loading208?.enabled===false)return '📦 FSAGS 208 đang tắt trong cấu hình đã deploy.';
 if(!eligible(rec,p))return '📦 FSAGS 208 không thuộc phạm vi hãng/loại tàu của chuyến này trong cấu hình đã deploy.';
 if(rec.rosterActive===false||U(rec.rosterStatus)==='ROSTER_REMOVED')return '📦 Chuyến đã bị gỡ khỏi lịch khai thác; không khởi tạo FSAGS 208 mới.';
 if(handler)return '📦 FSAGS 208 đã áp dụng cho chuyến này nhưng chưa khởi tạo được nghiệp vụ trên Firebase. Tải lại danh sách; nếu vẫn lỗi, AD kiểm tra quyền ghi dữ liệu chuyến.';
 return '📦 FSAGS 208 đã áp dụng cho chuyến này · Chờ Kho hàng hoặc AD mở chuyến để khởi tạo/nhận xử lý. Tài khoản này xem biểu mẫu sau khi Kho hàng gửi.';
}
const reconcileBusy=new Map(),reconcileCompleted=new Map();
function reconcileDate(date=currentDate(),force=false){
 date=S(date)||today();if(!isHandlerRole())return Promise.resolve(true);
 if(reconcileBusy.has(date))return reconcileBusy.get(date);
 if(!force&&Date.now()-(reconcileCompleted.get(date)||0)<15000)return Promise.resolve(true);
 const job=(async()=>{const p=await policy(force),snap=await db(FLIGHTS+'/'+safe(date)).once('value'),flights=snap.val()||{},patch={},now=Date.now();
 for(const [key,r0] of Object.entries(flights)){const rec=r0||{},fid=S(rec.flightId||key);if(!fid||rec.rosterActive===false||U(rec.rosterStatus)==='ROSTER_REMOVED')continue;const ok=eligible(rec,p),mod=rec.modules?.[MODULE],base=FLIGHTS+'/'+safe(date)+'/'+safe(fid)+'/modules/'+MODULE;let changed=false;const existingPub=published208(mod),existingSummary=publishedSummary(date,fid,rec,mod,existingPub);if(existingSummary)patch[FLIGHTS+'/'+safe(date)+'/'+safe(fid)+'/documents/FSAGS208']=existingSummary;
 const put=(key,value)=>{if(mod?.[key]!==value){patch[base+'/'+key]=value;changed=true}};
 if(ok){const desired={schema:1,formGroup:FORM,formCode:'FSAGS208',policyEnabled:true,dispatchMode:'DEPARTMENT_QUEUE',opDate:date,flightId:fid,flightName:flightName(rec),carrier:S(root.sagsAirlineFormPolicy?.carrier?.(rec)),policyRevision:Number(p?.revision||0)};for(const [k,v]of Object.entries(desired))put(k,v);if(!mod){put('status','WAITING_RECEIVER');put('createdAtMs',now);put('receiveCount',0);put('revisionNo',0)}}
 else if(mod){put('policyEnabled',false);put('policyRevision',Number(p?.revision||0));if(mod.policyEnabled!==false)put('policyDisabledAtMs',now)}
 if(changed)patch[base+'/updatedAtMs']=now;
 }
 if(Object.keys(patch).length)await db('').update(patch);reconcileCompleted.set(date,Date.now());return true;
 })();reconcileBusy.set(date,job);return job.finally(()=>{if(reconcileBusy.get(date)===job)reconcileBusy.delete(date)});
}
root.sags208ReconcileDate=reconcileDate;
async function getFlight(date,fid){const s=await db(FLIGHTS+'/'+safe(date)+'/'+safe(fid)).once('value');return s.val()||null}
function historyValues(x){return Object.values(x&&typeof x==='object'?x:{}).sort((a,b)=>Number(a?.seq||a?.revisionNo||0)-Number(b?.seq||b?.revisionNo||0)||Number(a?.atMs||0)-Number(b?.atMs||0))}
function historyHtml(mod){const rh=historyValues(mod?.receiveHistory),sh=historyValues(mod?.sendHistory);let out='';if(rh.length)out+='<div class="s208Hist"><b>LỊCH SỬ TIẾP NHẬN</b>'+rh.map(x=>'<div>Lần '+esc(x.seq)+' · '+esc(x.name||x.username)+' · '+esc(fmt(x.atMs))+(x.fromUsername?' · từ '+esc(x.fromName||x.fromUsername):'')+'</div>').join('')+'</div>';if(sh.length)out+='<div class="s208Hist"><b>LỊCH SỬ GỬI</b>'+sh.map(x=>'<div>Revision '+esc(x.revisionNo)+' · '+esc(x.name||x.username)+' · '+esc(fmt(x.atMs))+'</div>').join('')+'</div>';return out}
function statusText(mod){if(!mod)return'CHƯA TẠO';if(mod.policyEnabled===false)return'ĐÃ TẮT THEO HÃNG';if(Number(mod.revisionNo||0)>0&&mod.status==='SENT')return'ĐÃ GỬI · R'+Number(mod.revisionNo||0);if(mod.currentHandler?.username)return'ĐANG XỬ LÝ';return'CHỜ KHO HÀNG NHẬN'}
function ensureManagerDate(){
 const st=document.getElementById('kh208ManagerStatus');if(!st||document.getElementById('kh208WorkspaceDateWrap'))return;
 const w=document.createElement('div');w.id='kh208WorkspaceDateWrap';w.style.cssText='display:flex;gap:8px;align-items:center;margin:0 0 10px;padding:9px;border:1px solid #d7dee7;border-radius:10px;background:#f7f9fb';
 w.innerHTML='<b style="font-size:12px;color:#345">NGÀY KHAI THÁC</b><input id="kh208WorkspaceDate" type="date" style="flex:1;min-width:140px;height:38px;border:1px solid #aab5c0;border-radius:8px;padding:0 8px">';
 st.parentNode.insertBefore(w,st);const i=w.querySelector('input');i.value=S(document.getElementById('fwcDate')?.value)||today();i.onchange=()=>root.renderKH208Manager?.();
}
function cardFor(date,fid,rec,mod){
 const div=document.createElement('div');div.style.cssText='border:1px solid #cfd8e3;border-radius:11px;padding:10px;background:#fff;margin-bottom:8px';
 const cur=mod?.currentHandler||{},mine=norm(cur.username)===me(),canHandle=isHandlerRole()&&mod?.policyEnabled!==false;
 div.innerHTML='<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><b>'+esc(flightName(rec))+' · '+esc(date)+'</b><br><small style="color:#657">'+esc(statusText(mod))+(cur.username?' · phụ trách: '+esc(cur.name||cur.username)+' · lần '+esc(cur.receiveNo||mod.receiveCount||1):'')+'</small></div><span style="font:900 11px Arial;color:#0b4f91">FSAGS 208</span></div><div class="s208Actions" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"></div>'+historyHtml(mod);
 const a=div.querySelector('.s208Actions');
 const btn=(label,fn,bg='#0b6aa9')=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='border:0;border-radius:8px;padding:8px 10px;background:'+bg+';color:#fff;font-weight:900';b.onclick=fn;a.appendChild(b);};
 if(canHandle){if(mine)btn('MỞ FSAGS 208',()=>takeoverOpen(date,fid), '#167947');else btn(cur.username?'NHẬN LẠI XỬ LÝ':'NHẬN XỬ LÝ',()=>takeoverOpen(date,fid),'#b45309');if(published208(mod))btn('XEM BẢN ĐÃ GỬI',()=>openView(date,fid),'#566');}
 else if(published208(mod)&&canReadFlight())btn('XEM FSAGS 208 · R'+Number(mod.revisionNo||0),()=>openView(date,fid),'#0b6aa9');
 return div;
}
async function renderManager(){
 const host=document.getElementById('kh208ManagerList');if(!host)return;ensureManagerDate();const create=document.getElementById('kh208CreateBox');if(create)create.style.display='none';
 const date=currentDate();host.innerHTML='<div style="padding:12px;color:#667">Đang tải Flight Workspace…</div>';
 try{await reconcileDate(date,false);const snap=await db(FLIGHTS+'/'+safe(date)).once('value'),flights=snap.val()||{},rows=[];
   for(const [key,r0] of Object.entries(flights)){const rec=r0||{},fid=S(rec.flightId||key),mod=rec.modules?.[MODULE];if(!mod)continue;const active=mod.policyEnabled!==false||Number(mod.receiveCount||0)>0||Number(mod.revisionNo||0)>0;if(!active)continue;
     if(isHandlerRole()){if(role()!=='AD'&&mod.policyEnabled===false)continue;}
     else {if(!canReadFlight()||!published208(mod))continue;}
     rows.push({fid,rec,mod});
   }
   rows.sort((a,b)=>S(a.rec.std||a.rec.sta).localeCompare(S(b.rec.std||b.rec.sta))||flightName(a.rec).localeCompare(flightName(b.rec)));
   host.innerHTML='';for(const x of rows)host.appendChild(cardFor(date,x.fid,x.rec,x.mod));
   if(!rows.length)host.innerHTML='<div style="padding:14px;color:#667;text-align:center">Không có FSAGS 208 áp dụng cho ngày này.</div>';
   try{root.kh208SetStatus?.((isHandlerRole()?'FSAGS 208 theo Flight Workspace':'FSAGS 208 đã gửi')+' · '+rows.length+' chuyến.')}catch(_){}
 }catch(e){host.innerHTML='<div style="padding:12px;color:#a21">Không tải được FSAGS 208: '+esc(e?.message||e)+'</div>';}
}
const legacyRender=root.renderKH208Manager||(typeof renderKH208Manager==='function'?renderKH208Manager:null);
root.renderKH208Manager=renderManager;try{renderKH208Manager=renderManager}catch(_){}
function localId(date,fid){return'kh208-ws-'+hash(date+'|'+fid)}
async function openLocal(date,fid){
 const previous=bindingFor();
 if(previous&&!readOnlyFlag()&&(S(previous.opDate)!==S(date)||S(previous.flightId)!==S(fid))){
   if(root.saveKH208Local?.()===false)throw new Error('Chưa lưu được nháp chuyến đang làm; chưa chuyển sang chuyến khác.');
   const deadline=Date.now()+5000;
   while(draftBusy&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,50));
   if(draftBusy)throw new Error('Nháp chuyến đang đồng bộ; chờ một chút rồi mở chuyến khác.');
   await syncActiveDraft(true);
 }
 const rec=await getFlight(date,fid),mod=rec?.modules?.[MODULE];if(!rec||!mod)throw new Error('Không tìm thấy FSAGS 208 của chuyến.');
 const id=localId(date,fid),list=readList(),now=Date.now();let row=list.find(x=>x.id===id);
 if(!row){row={id,flight:flightNo(rec),date,acRegn:S(rec.acReg||rec.acRegn),createdAt:now,updatedAt:now,sentAtMs:Number(mod.lastSentAtMs||0),revisionNo:Number(mod.revisionNo||0),workspaceDate:date,workspaceFlightId:fid};list.push(row)}
 else{row.flight=flightNo(rec);row.date=date;row.acRegn=S(rec.acReg||rec.acRegn||row.acRegn);row.updatedAt=now;row.workspaceDate=date;row.workspaceFlightId=fid;row.sentAtMs=Number(mod.lastSentAtMs||row.sentAtMs||0);row.revisionNo=Number(mod.revisionNo||row.revisionNo||0)}
 writeList(list);const key=sheetKey(id);let old={};try{old=JSON.parse(localStorage.getItem(key)||'{}')||{}}catch(_){}
 const incoming=mod.state&&typeof mod.state==='object'?clone(mod.state):null,state0=incoming&&Object.keys(incoming).length?incoming:(old.state||{});
 if(!S(state0.f208_flightNo))state0.f208_flightNo=flightNo(rec);if(!S(state0.f208_date))state0.f208_date=date;
 localStorage.setItem(key,JSON.stringify({...old,state:state0,acRegn:S(rec.acReg||rec.acRegn||old.acRegn),mainForm:FORM,activeFormGroup:FORM,currentPage:13,workspaceBinding:{opDate:date,flightId:fid}}));
 setReadOnly(false);const open=root.openKH208Local||(typeof openKH208Local==='function'?openKH208Local:null);if(typeof open!=='function')throw new Error('Màn hình FSAGS 208 chưa sẵn sàng.');dismissWorkspaces();await open(id);if(activeId()!==id)throw new Error('Chưa mở được FSAGS 208 của chuyến đã chọn.');finishFormOpen(rec,date);watchOwner(date,fid);
}
function dismissWorkspaces(){
 root.flightWorkspaceClose?.();root.closeKH208Manager?.();
 for(const id of ['fwcModal','kh208ManagerModal']){
   const e=document.getElementById(id);if(!e)continue;
   e.classList.remove('show','open','active');e.style.display='none';e.hidden=true;
 }
 document.body?.classList.remove('v157-drawer-open');
 root.sagsOverlayLayout?.refresh();
}
function finishFormOpen(rec,date){
 dismissWorkspaces();
 root.showToast?.('Đã mở FSAGS 208 · '+flightName(rec)+' · '+date);
}
function wrapWorkspaceVisibility(){
 for(const [name,id]of [['flightWorkspaceOpenList','fwcModal'],['flightWorkspaceOpenFlight','fwcModal'],['openKH208Manager','kh208ManagerModal']]){
  const base=root[name];if(typeof base!=='function'||base.__sags208Visibility)continue;
  const wrapped=function(){const e=document.getElementById(id);if(e?.hidden){e.hidden=false;e.style.removeProperty('display');}return base.apply(this,arguments)};
  wrapped.__sags208Visibility=true;root[name]=wrapped;
  if(base.__sags208Workspace)wrapped.__sags208Workspace=1;
 }
}
let ownerWatch=null;
function stopWatch(){if(ownerWatch){try{ownerWatch.ref.off('value',ownerWatch.cb)}catch(_){}ownerWatch=null}}
function watchOwner(date,fid){stopWatch();try{const ref=db(FLIGHTS+'/'+safe(date)+'/'+safe(fid)+'/modules/'+MODULE),cb=s=>{const m=s.val()||{},u=norm(m.currentHandler?.username);if(u&&u!==me()){setReadOnly(true,'CHỈ XEM · ĐÃ CHUYỂN CHO '+S(m.currentHandler?.name||m.currentHandler?.username));try{root.showToast?.('FSAGS 208 đã được '+S(m.currentHandler?.name||m.currentHandler?.username)+' tiếp nhận.')}catch(_){}}};ref.on('value',cb);ownerWatch={ref,cb}}catch(_){}}
let receiving=false;
async function takeoverOpen(date,fid){
 if(!isHandlerRole())return alert("Tài khoản không thuộc Kho hàng/AD.");
 if(receiving)return alert('Đang mở FSAGS 208. Chờ hoàn tất rồi chọn chuyến khác.');
 receiving=true;
 try{await reconcileDate(date,true);const rec=await getFlight(date,fid);if(!rec)throw new Error('Không tìm thấy Flight Workspace.');const published=await policy(false);if(!eligible(rec,published))throw new Error(unavailableMessage(rec,published,rec.modules?.[MODULE],true));const baseline=rec.modules?.[MODULE];if(!baseline||baseline.policyEnabled===false||baseline.dispatchMode!=='DEPARTMENT_QUEUE')throw new Error(unavailableMessage(rec,published,baseline,true));const ref=db(FLIGHTS+'/'+safe(date)+'/'+safe(fid)+'/modules/'+MODULE),who=actor(),now=Date.now();
   // RTDB may first call the transaction updater with null from its empty local cache.
   // Seed that optimistic invocation from the verified flight module; server retries remain authoritative.
   const tx=await ref.transaction(cur=>{cur=cur||clone(baseline);preservePublished(cur);if(cur.policyEnabled===false||cur.dispatchMode!=='DEPARTMENT_QUEUE')return;const old=cur.currentHandler||{},same=norm(old.username)===who.username;if(!same){const seq=Number(cur.receiveCount||0)+1,key='R'+String(seq).padStart(4,'0')+'_'+now;cur.receiveCount=seq;cur.receiveHistory=cur.receiveHistory||{};cur.receiveHistory[key]={seq,username:who.username,name:who.name,role:who.role,atMs:now,fromUsername:norm(old.username),fromName:S(old.name||old.username),action:'RECEIVE'};cur.currentHandler={username:who.username,name:who.name,role:who.role,receivedAtMs:now,receiveNo:seq};cur.lastReceiveAtMs=now;cur.status='IN_PROGRESS';}cur.updatedAtMs=now;return cur});
   if(tx?.committed===false)throw new Error('Không nhận được nghiệp vụ do trạng thái 208 đã thay đổi trên Firebase. Tải lại chuyến để kiểm tra; cấu hình hãng không được suy ra từ việc giao dịch bị hủy.');await openLocal(date,fid);
 }catch(e){alert('Không nhận được FSAGS 208: '+S(e?.message||e))}finally{receiving=false}
}
root.sags208TakeoverAndOpen=takeoverOpen;
async function openView(date,fid){try{
 if(!canReadFlight())throw new Error('Cần đăng nhập tài khoản đang hoạt động để xem hồ sơ chuyến.');
 const rec=await getFlight(date,fid),pub=published208(rec?.modules?.[MODULE]);if(!rec||!pub)throw new Error('Chưa có bản FSAGS 208 đã gửi để xem. Kho hàng cần gửi lại nếu hồ sơ cũ chưa lưu bản chính thức.');
 if(bindingFor()&&!readOnlyFlag()){if(root.saveKH208Local?.()===false)throw new Error('Chưa lưu được nháp đang mở.');await syncActiveDraft(true);}
 if(activeId()&&!bindingFor()&&!readOnlyFlag())await Promise.resolve(root.persist?.());
 root.__sags208ActiveWorkspace={opDate:S(date),flightId:S(fid)};
 const open=root.openKH208Remote||(typeof openKH208Remote==='function'?openKH208Remote:null);if(typeof open!=='function')throw new Error('Màn hình FSAGS 208 chưa sẵn sàng.');
 stopWatch();root.sagsFlightDossierClose?.();await open({state:clone(pub.state),flight:flightNo(rec),date,acRegn:S(rec.acReg||rec.acRegn),sentBy:pub.sentBy,revisionNo:pub.revisionNo,workspaceReadOnly:true,workspaceBinding:{opDate:date,flightId:fid}});setReadOnly(true,'CHỈ XEM · FSAGS 208 ĐÃ GỬI R'+pub.revisionNo);finishFormOpen(rec,date);const row=document.getElementById('v324FormActions');if(row)root.sags208SyncFormActions?.(row);return true;
 }catch(e){alert('Không mở được FSAGS 208: '+S(e?.message||e));return false}}
root.sags208OpenView=openView;
let syncTimer=0,draftBusy=false;const draftSignatures=new Map();
async function syncActiveDraft(force=false){const b=bindingFor();if(!b||readOnlyFlag()||draftBusy)return false;const date=S(b.opDate),fid=S(b.flightId);if(!date||!fid)return false;const st={},src=activeState();for(const[k,v]of Object.entries(src||{}))if(k.startsWith('f208_'))st[k]=clone(v);const signature=JSON.stringify(st),key=date+'|'+fid;if(!force&&draftSignatures.get(key)===signature)return true;draftBusy=true;try{const ref=db(FLIGHTS+'/'+safe(date)+'/'+safe(fid)+'/modules/'+MODULE),who=actor();const tx=await ref.transaction(mod=>{if(!mod||norm(mod.currentHandler?.username)!==who.username)return;if(JSON.stringify(mod.state||{})===signature)return;return{...preservePublished(mod),state:st,lastEditedAtMs:Date.now(),lastEditedBy:who,updatedAtMs:Date.now(),status:mod.status==='SENT'?'IN_PROGRESS':(mod.status||'IN_PROGRESS')}});if(tx?.committed!==false)draftSignatures.set(key,signature);return tx?.committed!==false}finally{draftBusy=false}}
function scheduleSync(){clearTimeout(syncTimer);syncTimer=setTimeout(()=>syncActiveDraft().catch(e=>console.info('FSAGS208 workspace draft',e?.message||e)),650)}
async function completeDraft(){return await sendWorkspace();}
root.sags208CompleteDraft=completeDraft;
root.sags208SyncFormActions=function(row){
 const send=document.getElementById('kh208SendBtn'),sign=document.getElementById('v163SignBtn');
 let group='';try{group=typeof activeFormGroup!=='undefined'?activeFormGroup:root.activeFormGroup||''}catch(_){}
 if(group!==FORM){if(send)send.style.display='none';if(sign&&sign.__sags208PreviousDisplay!==undefined){if(sign.style.display==='none')sign.style.display=sign.__sags208PreviousDisplay;delete sign.__sags208PreviousDisplay;}return false;}
 const editable=isHandlerRole()&&!readOnlyFlag()&&!!bindingFor(),done=document.getElementById('v324HandoverBtn');
 if(send){if(send.parentElement!==row)row.appendChild(send);send.classList.add('v324FormAction');send.style.display='none';send.onclick=sendWorkspace;}
 if(sign){if(readOnlyFlag()){if(sign.__sags208PreviousDisplay===undefined)sign.__sags208PreviousDisplay=sign.style.display||'';sign.style.display='none';}else if(sign.__sags208PreviousDisplay!==undefined){if(sign.style.display==='none')sign.style.display=sign.__sags208PreviousDisplay;delete sign.__sags208PreviousDisplay;}}
 if(done){done.style.display=editable?'inline-flex':'none';done.textContent='✓ HOÀN TẤT & GỬI HỒ SƠ';done.title='Hoàn tất FSAGS 208 và đưa ngay bản chính thức vào HỒ SƠ CHUYẾN';done.onclick=sendWorkspace;}
 row.classList.remove('show','one','two','three');row.classList.add('show',editable?'two':'one');return true;
};
const legacySave=root.saveKH208Local||(typeof saveKH208Local==='function'?saveKH208Local:null);
if(typeof legacySave==='function'){const patched=function(){const ok=legacySave.apply(this,arguments);if(ok)scheduleSync();return ok};root.saveKH208Local=patched;try{saveKH208Local=patched}catch(_){}}
const legacySend=root.sendKH208Sheet||(typeof sendKH208Sheet==='function'?sendKH208Sheet:null);
async function sendWorkspace(){
 const b=bindingFor();if(!b)return typeof legacySend==='function'?legacySend.apply(this,arguments):false;
 if(!isHandlerRole()||readOnlyFlag())return alert('Chỉ người đang phụ trách FSAGS 208 mới được gửi.');
 try{clearTimeout(syncTimer);try{root.saveKH208Local?.()}catch(_){}clearTimeout(syncTimer);const date=S(b.opDate),fid=S(b.flightId),rec=await getFlight(date,fid),mod=rec?.modules?.[MODULE];if(!rec||!mod)throw new Error('Không tìm thấy Flight Workspace.');if(norm(mod.currentHandler?.username)!==me())throw new Error('FSAGS 208 đã được người khác tiếp nhận. Hãy mở lại để xem trạng thái mới.');
   const who=actor(),src=activeState(),st={};for(const[k,v]of Object.entries(src||{}))if(k.startsWith('f208_'))st[k]=clone(v);
   const targets=participants(rec),now=Date.now();if(!confirm('Gửi FSAGS 208 vào hồ sơ chung của chuyến?\n\n'+flightName(rec)+' · '+date+'\n\nDữ liệu sẽ được ghi trực tiếp vào Flight Workspace. Người đang làm chuyến mở cùng workspace sẽ thấy bản mới.'))return false;
   let revision=0;const ref=db(FLIGHTS+'/'+safe(date)+'/'+safe(fid)+'/modules/'+MODULE);
   clearTimeout(syncTimer);const tx=await ref.transaction(cur=>{cur=cur||clone(mod);if(norm(cur.currentHandler?.username)!==who.username)return;revision=Number(cur.revisionNo||0)+1;const key='S'+String(revision).padStart(4,'0')+'_'+now;cur.revisionNo=revision;cur.state=st;cur.published={state:clone(st),revisionNo:revision,sentAtMs:now,sentBy:clone(who)};cur.status='SENT';cur.lastSentAtMs=now;cur.lastSentBy=who;cur.lastRecipientSnapshot=targets;cur.sendHistory=cur.sendHistory||{};cur.sendHistory[key]={revisionNo:revision,seq:revision,username:who.username,name:who.name,role:who.role,atMs:now,recipientSnapshot:targets,action:'SEND_TO_WORKSPACE'};cur.updatedAtMs=now;return cur});
   if(tx?.committed===false||!revision)throw new Error('Quyền xử lý đã thay đổi trước khi gửi.');
   clearTimeout(syncTimer);draftSignatures.set(date+'|'+fid,JSON.stringify(st));const list=readList(),row=list.find(x=>x.id===activeId());if(row){row.sentAtMs=now;row.revisionNo=revision;row.updatedAt=now;writeList(list)}
   const pub={state:clone(st),revisionNo:revision,sentAtMs:now,sentBy:clone(who)};await syncPublishedSummary(date,fid,rec,{...mod,state:st,status:'SENT',revisionNo:revision,lastSentAtMs:now,lastSentBy:who,published:pub},pub);
   try{root.writeUserActivity?.('ĐÃ HOÀN TẤT FSAGS 208',flightName(rec)+' · '+date+' · R'+revision)}catch(_){}
   try{root.dispatchEvent(new CustomEvent('sags:flight-document-published',{detail:{opDate:date,flightId:fid,code:'FSAGS208',revisionNo:revision}}))}catch(_){}
   alert('✓ FSAGS 208 đã HOÀN TẤT và được đưa vào HỒ SƠ CHUYẾN · R'+revision+'.');setTimeout(()=>injectWorkspace(date,fid),80);return true;
 }catch(e){alert('Không gửi được FSAGS 208: '+S(e?.message||e));return false}
}
root.sendKH208Sheet=sendWorkspace;try{sendKH208Sheet=sendWorkspace}catch(_){}
function ensureWorkspaceStyle(){if(document.getElementById('sags208WorkspaceStyle'))return;const s=document.createElement('style');s.id='sags208WorkspaceStyle';s.textContent='#sags208WorkspaceCard{margin:0 0 10px;border:2px solid #b45309;border-radius:12px;padding:10px;background:#fff8ed;color:#3b2b18;font:12px/1.45 Arial}#sags208WorkspaceCard .s208Top{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}#sags208WorkspaceCard .s208Title{font-weight:900;color:#8a4b08;font-size:14px}#sags208WorkspaceCard .s208Btns{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}#sags208WorkspaceCard button{border:0;border-radius:8px;padding:8px 10px;color:#fff;font-weight:900}.s208Hist{margin-top:7px;padding-top:6px;border-top:1px dashed #d9c6af;font-size:11px;color:#5d4d3d}.s208Hist b{display:block;color:#6f4b22;margin-bottom:3px}';document.head.appendChild(s)}
let workspacePaint=0;
async function injectWorkspace(date,fid){const paint=++workspacePaint;root.__sags208ActiveWorkspace={opDate:date,flightId:fid};ensureWorkspaceStyle();const body=document.getElementById('fwcBody'),head=body?.querySelector('.fwcWorkspaceHead');if(!body||!head)return;body.querySelector('#sags208WorkspaceCard')?.remove();const pending=document.createElement('div');pending.id='sags208WorkspaceCard';pending.textContent='📦 FSAGS 208 · Đang mở nghiệp vụ kho hàng…';head.insertAdjacentElement('afterend',pending);try{const handler=isHandlerRole();if(handler)await reconcileDate(date,true);const published=await policy(!handler);const rec=await getFlight(date,fid),mod=rec?.modules?.[MODULE];if(paint!==workspacePaint||!head.isConnected)return;if(!rec)throw new Error('Không tìm thấy dữ liệu chuyến.');if(!mod){pending.textContent=unavailableMessage(rec,published,mod,isHandlerRole());return;}const active=mod.policyEnabled!==false||Number(mod.receiveCount||0)>0||Number(mod.revisionNo||0)>0;if(!active){pending.textContent=unavailableMessage(rec,published,mod,isHandlerRole());return;}if(!canReadFlight())throw new Error('Cần đăng nhập để xem hồ sơ chuyến.');
 const cur=mod.currentHandler||{},mine=norm(cur.username)===me(),card=document.createElement('div');card.id='sags208WorkspaceCard';card.innerHTML='<div class="s208Top"><div><div class="s208Title">📦 FSAGS 208 · KHO HÀNG</div><div>'+esc(statusText(mod))+(cur.username?' · '+esc(cur.name||cur.username)+' · nhận lần '+esc(cur.receiveNo||mod.receiveCount||1):'')+'</div></div><b>R'+Number(mod.revisionNo||0)+'</b></div><div class="s208Btns"></div>'+historyHtml(mod);const a=card.querySelector('.s208Btns'),mk=(label,fn,bg)=>{const b=document.createElement('button');b.textContent=label;b.style.background=bg;b.onclick=fn;a.appendChild(b)};
 if(isHandlerRole()&&mod.policyEnabled!==false){mk(mine?'MỞ FSAGS 208':(cur.username?'NHẬN LẠI XỬ LÝ':'NHẬN XỬ LÝ'),()=>takeoverOpen(date,fid),mine?'#167947':'#b45309');if(published208(mod))mk('XEM BẢN ĐÃ GỬI',()=>openView(date,fid),'#566');}
 else if(published208(mod))mk('XEM FSAGS 208 · R'+Number(mod.revisionNo||0),()=>openView(date,fid),'#0b6aa9');
 pending.replaceWith(card);
 }catch(e){pending.textContent='Không tải được FSAGS 208: '+S(e?.message||e)+' · Bấm tải lại danh sách để thử lại.';console.info('FSAGS208 workspace card',e?.message||e)}}
root.sags208RenderWorkspace=injectWorkspace;
let wrappedOpen=null;
function wrapWorkspaceOpen(){const fn=root.flightWorkspaceOpenFlight;if(typeof fn!=='function'||fn===wrappedOpen||fn.__sags208Workspace)return;const w=function(fid){const date=S(document.getElementById('fwcDate')?.value)||currentDate();root.__sags208ActiveWorkspace={opDate:date,flightId:S(fid)};const r=fn.apply(this,arguments);Promise.resolve(r).finally(()=>setTimeout(()=>injectWorkspace(date,S(fid)),120));return r};w.__sags208Workspace=1;w.__base=fn;root.flightWorkspaceOpenFlight=w;wrappedOpen=w}
let wrappedPublish=null;
function wrapRosterPublish(){const fn=root.dailyRosterPublish;if(typeof fn!=='function'||fn===wrappedPublish||fn.__sags208Workspace)return;const w=async function(){const r=await fn.apply(this,arguments);if(r===true){const date=S(document.getElementById('drManageDate')?.value)||currentDate();try{await reconcileDate(date,true)}catch(e){console.info('FSAGS208 reconcile after roster',e?.message||e)}}return r};w.__sags208Workspace=1;w.__base=fn;root.dailyRosterPublish=w;try{dailyRosterPublish=w}catch(_){}wrappedPublish=w}

let dossierPaint=0,dossierContext=null;
function ensureDossier(){
 let modal=document.getElementById('sagsFlightDossierModal');if(modal)return modal;
 const style=document.createElement('style');style.textContent='#sagsFlightDossierModal{position:fixed;inset:0;z-index:50000;display:none;align-items:center;justify-content:center;padding:16px;padding-bottom:max(16px,env(safe-area-inset-bottom));background:#001b2bb3}#sagsFlightDossierModal[hidden]{display:none!important}#sagsFlightDossierModal .sagsDossierPanel{box-sizing:border-box;width:min(760px,100%);max-height:calc(100vh - 32px);max-height:calc(100dvh - 32px);overflow:auto;padding:20px;border-radius:16px;background:#f5fafc;color:#173b4c;font:14px/1.5 Arial}#sagsFlightDossierModal h2{margin:0;font-size:20px;color:#173b4c}#sagsFlightDossierModal button{min-height:44px;padding:9px 14px;border:0;border-radius:9px;background:#0b7185;color:white;font-weight:800;cursor:pointer}#sagsFlightDossierModal .sagsDossierTop{display:flex;align-items:center;justify-content:space-between;gap:12px}#sagsFlightDossierModal .sagsDossierDoc{margin-top:12px;background:white;border:1px solid #c8dce4;padding:14px;border-radius:12px}#sagsFlightDossierModal .sagsDossierDoc b{color:#173b4c}#sagsFlightDossierModal .sagsDossierDoc small{display:block;color:#465f70;margin:5px 0 10px}@media(max-width:600px){#sagsFlightDossierModal{padding:10px}#sagsFlightDossierModal .sagsDossierPanel{padding:14px;max-height:calc(100dvh - 20px)}}';document.head.appendChild(style);
 modal=document.createElement('div');modal.id='sagsFlightDossierModal';modal.hidden=true;modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','sagsDossierTitle');modal.innerHTML='<section class="sagsDossierPanel"><div class="sagsDossierTop"><h2 id="sagsDossierTitle">HỒ SƠ CHUYẾN BAY</h2><button id="sagsDossierClose" aria-label="Đóng hồ sơ chuyến">ĐÓNG</button></div><p id="sagsDossierFlight"></p><p>Bản đã gửi dùng chung cho các đơn vị. Mở xem không làm thay đổi người phụ trách hoặc dữ liệu nghiệp vụ.</p><h3>NHIỆM VỤ CỦA TÔI</h3><div id="sagsDossierTasks"></div><h3>TÀI LIỆU CÁC ĐƠN VỊ ĐÃ GỬI</h3><div id="sagsDossierDocs"></div><button id="sagsDossierRefresh" style="margin-top:14px">TẢI LẠI HỒ SƠ</button></section>';document.body.appendChild(modal);modal.querySelector('#sagsDossierClose').onclick=closeDossier;modal.querySelector('#sagsDossierRefresh').onclick=()=>dossierContext&&openDossier(dossierContext.date,dossierContext.fid);modal.addEventListener('keydown',e=>{if(e.key==='Escape')closeDossier();if(e.key==='Tab'){const btns=Array.from(modal.querySelectorAll('button:not([disabled])'));const first=btns[0],last=btns[btns.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}});return modal;
}
function closeDossier(){dossierPaint++;const m=document.getElementById('sagsFlightDossierModal');if(m){m.hidden=true;m.style.display='none';m.classList.remove('show');}root.sagsOverlayLayout?.refresh();}
root.sagsFlightDossierClose=closeDossier;
async function openDossier(date,fid){
 if(!canReadFlight())return alert('Cần đăng nhập tài khoản đang hoạt động để xem hồ sơ chuyến.');
 date=S(date);fid=S(fid);if(!date||!fid)return alert('Chọn một chuyến bay trước khi mở hồ sơ.');
 const token=++dossierPaint,modal=ensureDossier();dossierContext={date,fid};root.__sags208ActiveWorkspace={opDate:date,flightId:fid};dismissWorkspaces();modal.hidden=false;modal.style.display='flex';modal.classList.add('show');modal.querySelector('#sagsDossierFlight').textContent='Đang tải hồ sơ chuyến…';const docs=modal.querySelector('#sagsDossierDocs');docs.textContent='Đang tải tài liệu đã gửi…';modal.querySelector('#sagsDossierTasks').textContent='Đang đọc nhiệm vụ của bạn…';root.sagsOverlayLayout?.refresh();modal.querySelector('#sagsDossierClose').focus();
 try{const rec=await getFlight(date,fid);if(token!==dossierPaint)return;if(!rec)throw new Error('Không tìm thấy chuyến bay.');modal.querySelector('#sagsDossierFlight').textContent=flightName(rec)+' · '+date;docs.textContent='';
 const taskHost=modal.querySelector('#sagsDossierTasks');taskHost.textContent='';
 const own=document.createElement('div');taskHost.appendChild(own);
 if(role()!=='AD'&&root.sagsPersonalFlightTasks?.renderInto){try{await root.sagsPersonalFlightTasks.renderInto(own,date,fid)}catch(e){own.textContent='Chưa đọc được nhiệm vụ cá nhân: '+S(e?.message||e);}}else own.textContent=role()==='AD'?'AD quản lý hồ sơ chung của chuyến.':'Phân công cá nhân đang khởi tạo. Bấm tải lại hồ sơ.';
 if(token!==dossierPaint)return;
 const current208=rec.modules?.[MODULE];if(isHandlerRole()&&current208?.policyEnabled!==false&&current208){const task=document.createElement('article');task.className='sagsDossierDoc';const label=document.createElement('b');label.textContent='📦 NHIỆM VỤ KHO HÀNG · FSAGS 208';task.appendChild(label);const info=document.createElement('small');info.textContent=statusText(current208)+(current208.currentHandler?.username?' · '+S(current208.currentHandler.name||current208.currentHandler.username):'');task.appendChild(info);const receive=document.createElement('button');receive.textContent=norm(current208.currentHandler?.username)===me()?'MỞ / TIẾP TỤC FSAGS 208':'NHẬN XỬ LÝ FSAGS 208';receive.onclick=async()=>{closeDossier();await takeoverOpen(date,fid)};task.appendChild(receive);taskHost.appendChild(task);}
 const mod=rec.modules?.[MODULE],pub=published208(mod),card=document.createElement('article');card.className='sagsDossierDoc';const title=document.createElement('b');title.textContent=pub?'✓ ĐÃ CÓ · FSAGS 208 · PHIẾU CHẤT XẾP CHI TIẾT':'📦 FSAGS 208 · PHIẾU CHẤT XẾP CHI TIẾT';card.appendChild(title);const detail=document.createElement('small');detail.textContent=pub?'Bản đã gửi R'+pub.revisionNo+' · '+S(pub.sentBy?.name||pub.sentBy?.username)+' · '+fmt(pub.sentAtMs)+' · Chỉ xem':Number(mod?.revisionNo)>0?'Hồ sơ cũ chưa có bản đã gửi tách khỏi nháp. Kho hàng cần gửi lại để các đơn vị xem đúng bản.':'Chưa có bản gửi. Kho hàng lưu nháp sẽ chưa xuất hiện thành tài liệu đã gửi.';card.appendChild(detail);if(pub){const btn=document.createElement('button');btn.textContent='MỞ XEM FSAGS 208 · R'+pub.revisionNo;btn.onclick=()=>openView(date,fid);card.appendChild(btn);}docs.appendChild(card);
 for(const [code,m] of Object.entries(rec.modules||{})){if(code===MODULE)continue;const row=document.createElement('article');row.className='sagsDossierDoc';row.textContent=code+' · '+S(m?.status||'Đang xử lý');docs.appendChild(row);}
 }catch(e){if(token===dossierPaint)docs.textContent='Không tải được hồ sơ: '+S(e?.message||e);}
}
root.sagsV338OpenDossier=openDossier;
root.sagsV338OpenCurrentDossier=function(){const b=bindingFor();if(b)return openDossier(b.opDate,b.flightId);const m=root.currentFlightSessionMeta?.()||{},active=root.__sags208ActiveWorkspace;const fid=S(m.rosterFlightId||m.flightId),date=S(m.opDate||m.rosterDate||m.date||currentDate());if(fid)return openDossier(date,fid);if(active?.flightId)return openDossier(active.opDate,active.flightId);return root.flightWorkspaceOpenList?.(currentDate());};
function redirectLegacyManager(){const fn=root.openKH208Manager;if(typeof fn==='function'&&!fn.__sags208Unified){const w=function(){try{root.closeKH208Manager?.()}catch(_){}return root.flightWorkspaceOpenList?.(currentDate())};w.__sags208Unified=true;w.__base=fn;root.openKH208Manager=w;try{openKH208Manager=w}catch(_){}}}
function install(){wrapRosterPublish();wrapWorkspaceOpen();redirectLegacyManager();wrapWorkspaceVisibility();ensureWorkspaceStyle();ensureManagerDate()}
install();setTimeout(install,450);setTimeout(install,1400);setTimeout(install,3200);window.addEventListener('pageshow',()=>setTimeout(install,100),{passive:true});window.addEventListener('sags:airline-forms-changed',()=>{reconcileCompleted.clear();const active=root.__sags208ActiveWorkspace;const manager=document.getElementById('kh208ManagerModal');if(active&&document.querySelector('#fwcBody .fwcWorkspaceHead')){injectWorkspace(active.opDate,active.flightId).catch(e=>console.info('FSAGS208 policy refresh',e?.message||e));}else if(manager&&getComputedStyle(manager).display!=='none'){renderManager();}});
root.__SAGS_FSAGS208_WORKSPACE={build:BUILD,reconcileDate,takeoverOpen,openView,syncActiveDraft,published208,syncPublishedSummary,canReadFlight};
})(window);

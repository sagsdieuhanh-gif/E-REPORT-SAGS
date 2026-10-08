/* E-REPORT SAGS · AD read-only all-form dossier viewer.
 * AD can inspect every roster assignment/form in a flight without claiming, editing or writing operator data.
 * Registered forms render on their canonical paper background; unknown/generated forms fall back to a read-only field table.
 */
(function(root){
'use strict';
const BUILD='V2.2-20261008-AD-ALL-FORM-VIEW-01';
if(root.__SAGS_AD_ALL_FORM_VIEWER__===BUILD)return;
root.__SAGS_AD_ALL_FORM_VIEWER__=BUILD;

const S=v=>String(v??'').trim();
const U=v=>S(v).toUpperCase();
const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(_){return v}};
const normKey=v=>U(v).replace(/[^A-Z0-9]/g,'');
let registryCache=null,viewer=null;

function session(){try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return{role:root.currentRole||'',profile:root.currentUserProfile||{}}}}
function role(){return U(session().role||session().profile?.role||root.currentRole)}
function isAdmin(){return role()==='AD'||role()==='ADMIN'}
function db(path){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase RTDB chưa sẵn sàng.');return root.sagsV470Ref(path)}
async function once(path){return (await db(path).once('value')).val()}

function canonGroup(v){
 const k=normKey(v);
 const map={
  FSAGS:'fsags',FSAGS423:'fsags',FSAGS421:'fsags421',FSAGS551:'fsags551',FSAGS09:'fsags09',
  FSAGS208:'loading208',LOADING208:'loading208',BBBT:'bbbt',FSAGS56:'bbbt',
  TVJGOF035:'tvjgof035',VZRAMPCHECKLIST:'tvjgof035',
  FSAGS54:'fsags54',CLCCHECKLIST:'fsags94',FSAGS94:'fsags94',FSAGS94CLC:'fsags94',
  FSAGS67:'fsags67',FINAL:'final',UNITTASK:'unit_task'
 };
 return map[k]||S(v).toLowerCase();
}
function labelFallback(group){
 const g=canonGroup(group);
 return {fsags:'FSAGS 42.3',fsags421:'FSAGS 42.1',fsags551:'FSAGS 55.1',fsags09:'FSAGS 09',loading208:'FSAGS 208',bbbt:'BBBT',tvjgof035:'TVJ-GOF-035',fsags54:'F/SAGS-CXR/54',fsags94:'F/SAGS-CXR/94',fsags67:'FSAGS 67',final:'FINAL'}[g]||S(group||'BIỂU MẪU');
}
async function registry(){
 try{const r=root.sagsV450GetFormRegistry?.();if(r?.forms?.length){registryCache=r;return r}}catch(_){}
 if(registryCache?.forms?.length)return registryCache;
 const res=await fetch('./forms/forms.registry.json',{cache:'no-cache'});if(!res.ok)throw new Error('Không tải được forms registry.');
 registryCache=await res.json();return registryCache;
}
function formFor(reg,group){
 const g=canonGroup(group),needle=normKey(group);
 const aliases=g==='fsags67'?['FSAGS67','FSAGS-67']:g==='fsags94'?['FSAGS94','CLCCHECKLIST']:g==='loading208'?['FSAGS208','LOADING208']:[needle,normKey(g)];
 return (reg?.forms||[]).find(f=>{
  const keys=[f.id,f.group,f.code,f.name].map(normKey);
  return keys.some(k=>aliases.includes(k))||canonGroup(f.group||f.id)===g;
 })||null;
}
function meaningful(v){
 if(v===true)return true;if(v===false||v===null||v===undefined)return false;
 if(Array.isArray(v))return v.length>0;if(typeof v==='object')return Object.keys(v).length>0;
 return S(v)!=='';
}
function stateOf(env){return env?.state&&typeof env.state==='object'?env.state:{}}
function envelopeInfo(st){
 st=st&&typeof st==='object'?st:{};
 const current={env:st.envelope,kind:'ĐANG LÀM',at:Number(st.envelopeUpdatedAtMs||st.updatedAtMs||0)};
 const completed={env:st.completionEnvelope,kind:'BẢN HOÀN TẤT',at:Number(st.completionEnvelopeAtMs||st.completedAtMs||0)};
 const handover={env:st.handoverEnvelope,kind:'BẢN BÀN GIAO',at:Number(st.handoverEnvelopeAtMs||st.handedOverAtMs||0)};
 const completeStatus=[st.taskStatusV333,st.taskStatus,st.claimStatus,st.workPartStatus].map(U).some(x=>['COMPLETED','PART_COMPLETED','HANDED_OVER','DONE','FINISHED'].includes(x));
 const valid=x=>x.env&&typeof x.env==='object'&&Object.values(stateOf(x.env)).some(meaningful);
 if(completeStatus&&valid(completed)&&st.pushbackEditReopened!==true)return completed;
 const best=[current,completed,handover].filter(valid).sort((a,b)=>b.at-a.at)[0];
 return best||{env:current.env||completed.env||handover.env||null,kind:completeStatus?'HOÀN TẤT':'CHƯA CÓ DỮ LIỆU',at:0};
}
function statusText(st){
 const x=U(st?.taskStatusV333||st?.taskStatus||st?.workPartStatus||st?.claimStatus);
 return {COMPLETED:'HOÀN TẤT',PART_COMPLETED:'HOÀN TẤT PHẦN VIỆC',HANDED_OVER:'ĐÃ BÀN GIAO',IN_PROGRESS:'ĐANG LÀM',CLAIMED:'ĐANG LÀM',ACTIVE:'ĐANG LÀM',UNCLAIMED:'CHƯA NHẬN',READY:'CHƯA NHẬN'}[x]||x.replaceAll('_',' ')||'CHƯA CÓ TRẠNG THÁI';
}
function fmt(ms){if(!Number(ms))return'';try{return new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(Number(ms)))}catch(_){return''}}
function fieldValue(field,state){
 const a=S(field?.bind||field?.key),b=S(field?.key);
 if(Object.prototype.hasOwnProperty.call(state,a))return state[a];
 if(b&&Object.prototype.hasOwnProperty.call(state,b))return state[b];
 return '';
}
function formValueCount(form,state){
 let n=0;for(const f of form?.fields||[]){const v=fieldValue(f,state);if(meaningful(v))n++}return n;
}
function checkboxText(v){
 if(v===true)return'✓';if(v===false||v===null||v===undefined||S(v)==='')return'';
 const x=U(v);if(['X','✕'].includes(x))return'X';if(['NA','N/A'].includes(x))return'N/A';
 if(['OK','YES','TRUE','1','V','✓','CHECKED'].includes(x))return'✓';return S(v);
}
function textValue(v){
 if(v===null||v===undefined)return'';if(typeof v==='string'||typeof v==='number')return String(v);if(typeof v==='boolean')return v?'✓':'';
 try{return JSON.stringify(v)}catch(_){return String(v)}
}

function ensureViewer(){
 if(viewer&&document.body.contains(viewer))return viewer;
 if(!document.getElementById('sagsAdminAllFormViewerStyle')){
  const st=document.createElement('style');st.id='sagsAdminAllFormViewerStyle';st.textContent=[
   '#sagsAdminAllFormViewer{position:fixed;inset:0;z-index:2147483450;display:none;flex-direction:column;background:#06131f;color:#eef7fb;font-family:Inter,Arial,sans-serif}',
   '#sagsAdminAllFormViewer.show{display:flex}',
   '#sagsAdminAllFormViewer .av-head{display:flex;align-items:center;gap:10px;padding:calc(10px + env(safe-area-inset-top)) 12px 10px;border-bottom:1px solid #294356;background:#0a1d2b;flex:0 0 auto}',
   '#sagsAdminAllFormViewer .av-title{min-width:0;flex:1}.av-title b{display:block;font-size:15px}.av-title small{display:block;color:#9bb4c4;font-size:10px;margin-top:3px}',
   '#sagsAdminAllFormViewer .av-badge{padding:5px 8px;border:1px solid #3a6b7d;border-radius:999px;color:#8de3ef;font:900 10px Arial;white-space:nowrap}',
   '#sagsAdminAllFormViewer .av-close{min-width:44px;height:44px;border:1px solid #365264;border-radius:10px;background:#102b3d;color:#fff;font-size:20px}',
   '#sagsAdminAllFormViewer .av-body{flex:1;overflow:auto;padding:12px;overscroll-behavior:contain;background:#dce5eb}',
   '#sagsAdminAllFormViewer .av-page{position:relative;container-type:inline-size;width:min(920px,100%);margin:0 auto 14px;background:#fff;box-shadow:0 8px 28px #0003;overflow:hidden}',
   '#sagsAdminAllFormViewer .av-page>img{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;display:block}',
   '#sagsAdminAllFormViewer .av-field{position:absolute;z-index:2;box-sizing:border-box;display:flex;overflow:hidden;white-space:nowrap;text-overflow:clip;pointer-events:none}',
   '#sagsAdminAllFormViewer .av-field.multiline{white-space:pre-wrap;align-items:flex-start}',
   '#sagsAdminAllFormViewer .av-field.signature img{width:100%;height:100%;object-fit:contain}',
   '#sagsAdminAllFormViewer .av-fallback{width:min(900px,100%);margin:auto;background:#fff;color:#17324a;border-radius:12px;padding:14px;box-sizing:border-box}',
   '#sagsAdminAllFormViewer .av-fallback table{width:100%;border-collapse:collapse;font-size:12px}.av-fallback td,.av-fallback th{border-bottom:1px solid #dbe4ea;padding:7px;text-align:left;vertical-align:top}.av-fallback th{color:#557084;width:34%}',
   '#sagsAdminAllFormViewer .av-empty{padding:30px;text-align:center;color:#667d8d}',
   '#sagsAdminAllFormList{margin-top:14px;padding-top:8px;border-top:1px solid #c8dce4}#sagsAdminAllFormList>h3{margin:5px 0;color:#173b4c;font-size:15px}#sagsAdminAllFormList>.ad-note{font-size:11px;color:#5c7483;margin-bottom:8px}',
   '#sagsAdminAllFormList .ad-form-card{margin:8px 0;padding:11px;border:1px solid #c8dce4;border-radius:11px;background:#f8fcfe;color:#173b4c}#sagsAdminAllFormList .ad-form-card b{display:block;color:#173b4c}#sagsAdminAllFormList .ad-form-card small{display:block;color:#526b7b;margin:4px 0 8px}',
   '#sagsAdminAllFormList .ad-form-card button{min-height:40px;padding:8px 12px;border:0;border-radius:9px;background:#0b7185;color:#fff;font-weight:850}#sagsAdminAllFormList .ad-form-card button:disabled{background:#cad5db;color:#687984}',
   '@media(max-width:620px){#sagsAdminAllFormViewer .av-head{padding-left:8px;padding-right:8px}.av-badge{display:none}#sagsAdminAllFormViewer .av-body{padding:6px}.sagsDossierPanel #sagsAdminAllFormList .ad-form-card{padding:9px}}'
  ].join('\n');document.head.appendChild(st);
 }
 viewer=document.createElement('div');viewer.id='sagsAdminAllFormViewer';viewer.setAttribute('role','dialog');viewer.setAttribute('aria-modal','true');
 viewer.innerHTML='<div class="av-head"><div class="av-title"><b id="sagsAdViewTitle">BIỂU MẪU</b><small id="sagsAdViewMeta"></small></div><span class="av-badge">AD · CHỈ XEM</span><button type="button" class="av-close" aria-label="Đóng">×</button></div><div class="av-body" id="sagsAdViewBody"></div>';
 document.body.appendChild(viewer);viewer.querySelector('.av-close').onclick=()=>viewer.classList.remove('show');
 viewer.addEventListener('keydown',e=>{if(e.key==='Escape')viewer.classList.remove('show')});
 return viewer;
}
function renderRegistered(form,state){
 const body=document.getElementById('sagsAdViewBody');body.replaceChildren();
 for(const page of form.pages||[]){
  const w=Math.max(1,Number(page.width)||1241),h=Math.max(1,Number(page.height)||1755);
  const sheet=document.createElement('div');sheet.className='av-page';sheet.style.aspectRatio=w+' / '+h;
  const img=document.createElement('img');img.alt=S(form.code||form.name||'Biểu mẫu');img.src=S(page.image);sheet.appendChild(img);
  for(const f of (form.fields||[]).filter(x=>String(x.pageId)===String(page.id))){
   let value=fieldValue(f,state),type=S(f.type).toLowerCase();if(!meaningful(value))continue;
   const el=document.createElement('div');el.className='av-field'+(type==='textarea'?' multiline':'')+(type==='signature'?' signature':'');
   el.style.left=(Number(f.x)||0)*100+'%';el.style.top=(Number(f.y)||0)*100+'%';el.style.width=(Number(f.w)||0)*100+'%';el.style.height=(Number(f.h)||0)*100+'%';
   el.style.color=S(f.textColor||'#003b8e');el.style.fontFamily=S(f.fontFamily||'Arial');el.style.fontWeight=S(f.fontWeight||'700');el.style.fontStyle=S(f.fontStyle||'normal');
   const fs=Math.max(8,Number(f.fontSize)||15);el.style.fontSize='max(6px,'+(fs/w*100).toFixed(4)+'cqw)';el.style.lineHeight=String(Number(f.lineHeight)||1.08);
   el.style.justifyContent=S(f.align).toLowerCase()==='center'?'center':S(f.align).toLowerCase()==='right'?'flex-end':'flex-start';
   el.style.textAlign=S(f.align||'left');el.style.alignItems=S(f.valign).toLowerCase()==='top'?'flex-start':S(f.valign).toLowerCase()==='bottom'?'flex-end':'center';
   if(f.underline===true)el.style.textDecoration='underline';
   if(type==='checkbox'){el.textContent=checkboxText(value)}
   else if(type==='signature'&&/^(?:data:image\/|blob:|https?:)/i.test(S(value))){const si=document.createElement('img');si.alt='Chữ ký';si.src=S(value);el.appendChild(si)}
   else el.textContent=textValue(value);
   sheet.appendChild(el);
  }
  body.appendChild(sheet);
 }
 if(!body.children.length)body.innerHTML='<div class="av-empty">Biểu mẫu này chưa có trang để hiển thị.</div>';
}
function renderFallback(state){
 const body=document.getElementById('sagsAdViewBody'),rows=Object.entries(state||{}).filter(([,v])=>meaningful(v)).slice(0,500);body.replaceChildren();
 const box=document.createElement('div');box.className='av-fallback';
 if(!rows.length){box.innerHTML='<div class="av-empty">Biểu mẫu chưa có dữ liệu để xem.</div>';body.appendChild(box);return}
 const table=document.createElement('table');
 for(const [k,v] of rows){const tr=document.createElement('tr'),th=document.createElement('th'),td=document.createElement('td');th.textContent=k;if(/signature|image|photo|attachment|base64|canvas/i.test(k)&&S(v).length>160)td.textContent='[DỮ LIỆU ẢNH / CHỮ KÝ]';else td.textContent=textValue(v).slice(0,1500);tr.append(th,td);table.appendChild(tr)}
 box.appendChild(table);body.appendChild(box);
}
function openReadOnly(doc){
 if(!isAdmin())return false;
 const m=ensureViewer(),form=doc.form||null,state=clone(doc.state||{});
 document.getElementById('sagsAdViewTitle').textContent=doc.label||labelFallback(doc.group);
 document.getElementById('sagsAdViewMeta').textContent=[doc.user,doc.status,doc.snapshotKind,doc.at?fmt(doc.at):''].filter(Boolean).join(' · ');
 if(form?.pages?.length)renderRegistered(form,state);else renderFallback(state);
 m.classList.add('show');m.querySelector('.av-close')?.focus();return true;
}
root.sagsAdminOpenReadOnlyForm=openReadOnly;

async function readSession(aid){
 const directP=once('roster_sessions/'+safe(aid)).catch(()=>null);
 const legacyP=typeof root.rosterWorkspaceLegacyRead==='function'?Promise.resolve().then(()=>root.rosterWorkspaceLegacyRead(aid)).catch(()=>null):Promise.resolve(null);
 const [direct,legacy]=await Promise.all([directP,legacyP]);if(!legacy)return direct||{};
 const out={...(legacy||{}),...(direct||{})};for(const k of ['envelope','completionEnvelope','handoverEnvelope','rosterSeed'])if(!out[k]&&legacy?.[k])out[k]=clone(legacy[k]);return out;
}
async function assignmentRows(date,fid){
 const rec=await once('flight_records/'+safe(date)+'/'+safe(fid)).catch(()=>({}))||{},map=new Map();
 for(const [id,a0] of Object.entries(rec.assignments||{})){const a={...(a0||{}),assignmentId:S(a0?.assignmentId||id),flightId:S(a0?.flightId||fid),opDate:S(a0?.opDate||date)};if(a.assignmentId&&a.active!==false)map.set(a.assignmentId,a)}
 try{
  const man=await once('roster_manifests/'+safe(date))||{},items=Array.isArray(man.items)?man.items:Object.values(man.items||{});
  for(const a0 of items){if(!a0||a0.active===false||a0.duplicateInactive===true||S(a0.flightId)!==S(fid))continue;const id=S(a0.assignmentId);if(!id)continue;map.set(id,{...(map.get(id)||{}),...a0,assignmentId:id,flightId:fid,opDate:date})}
 }catch(_){}
 return [...map.values()].filter(x=>canonGroup(x.formGroup)!=='unit_task');
}
function docsFor(item,st,reg){
 const info=envelopeInfo(st),env=info.env||{},state=stateOf(env),group=canonGroup(st?.formGroup||item?.formGroup||env?.mainForm||env?.activeFormGroup);
 if(group==='loading208')return [];
 const primary=formFor(reg,group),docs=[],seen=new Set();
 const add=(form,g,count)=>{
  const id=S(form?.id||g||'raw');if(seen.has(id))return;seen.add(id);
  docs.push({form:form||null,group:g||group,label:S(form?.code||form?.name||labelFallback(g||group)),state,count});
 };
 const primaryCount=primary?formValueCount(primary,state):Object.values(state).filter(meaningful).length;
 if(primary||group==='final'||primaryCount>0)add(primary,group,primaryCount);
 for(const f of reg?.forms||[]){if(primary&&f.id===primary.id)continue;const n=formValueCount(f,state);if(n>=3)add(f,canonGroup(f.group||f.id),n)}
 return docs.map(d=>({...d,user:S(item.user||item.targetUser||item.ownerUser||st.ownerUser||st.completedBy||'—'),status:statusText(st),snapshotKind:info.kind,at:info.at,aid:S(item.assignmentId)}));
}
function openFinalSpecial(item){
 try{
  const list=root.readFinalSheetList?.()||[],fid=S(item.flightId),date=S(item.opDate),token=normKey(item.assignmentFlight||item.flightName||item.flightRaw);
  const rec=list.find(x=>S(x.flightId)===fid||(S(x.opDate||x.date)===date&&token&&normKey(x.flightToken||x.name||x.flightRaw).includes(token)));
  if(rec&&typeof root.openFinalSheetRecord==='function')return root.openFinalSheetRecord(rec.id);
 }catch(_){}
 if(typeof root.openFinalSheetManager==='function')return root.openFinalSheetManager();
 alert('FINAL chưa có viewer sẵn sàng trên thiết bị này.');
}
async function augmentDossier(date,fid){
 if(!isAdmin())return false;date=S(date);fid=S(fid);if(!date||!fid)return false;
 const host=document.getElementById('sagsDossierDocs');if(!host)return false;
 host.querySelector('#sagsAdminAllFormList')?.remove();
 const wrap=document.createElement('section');wrap.id='sagsAdminAllFormList';wrap.innerHTML='<h3>TOÀN BỘ BIỂU MẪU / NGƯỜI THỰC HIỆN</h3><div class="ad-note">AD chỉ xem dữ liệu cloud của từng assignment; thao tác tại đây không nhận việc và không sửa dữ liệu người đang làm.</div><div class="ad-loading">Đang đọc các biểu mẫu…</div>';host.appendChild(wrap);
 try{
  const [reg,items]=await Promise.all([registry(),assignmentRows(date,fid)]);
  const rows=await Promise.all(items.map(async item=>({item,st:await readSession(item.assignmentId)})));
  const docs=[];for(const row of rows){for(const d of docsFor(row.item,row.st,reg))docs.push({item:row.item,st:row.st,...d})}
  wrap.querySelector('.ad-loading')?.remove();
  if(!items.length){const x=document.createElement('div');x.className='ad-note';x.textContent='Chuyến này chưa có assignment biểu mẫu.';wrap.appendChild(x);return true}
  const rendered=new Set();
  for(const {item,st,...doc} of docs){
   const key=doc.aid+'|'+S(doc.form?.id||doc.group);if(rendered.has(key))continue;rendered.add(key);
   const card=document.createElement('article');card.className='ad-form-card';
   const title=document.createElement('b');title.textContent=doc.label;card.appendChild(title);
   const meta=document.createElement('small');meta.textContent=[doc.user,doc.status,doc.snapshotKind,doc.at?fmt(doc.at):'',S(item.assignmentLeg)].filter(Boolean).join(' · ');card.appendChild(meta);
   const btn=document.createElement('button');btn.type='button';
   if(doc.group==='final'&&!doc.form){btn.textContent='MỞ FINAL · CHỈ XEM';btn.onclick=()=>openFinalSpecial(item)}
   else{
    const has=Object.values(doc.state||{}).some(meaningful);btn.disabled=!has;btn.textContent=has?'MỞ XEM BIỂU MẪU':'CHƯA CÓ DỮ LIỆU';
    if(has)btn.onclick=()=>openReadOnly(doc);
   }
   card.appendChild(btn);wrap.appendChild(card);
  }
  const covered=new Set(docs.map(d=>S(d.aid)));
  for(const {item,st} of rows){
   if(covered.has(S(item.assignmentId))||canonGroup(item.formGroup)==='loading208')continue;
   const card=document.createElement('article');card.className='ad-form-card';const title=document.createElement('b');title.textContent=labelFallback(item.formGroup);card.appendChild(title);
   const meta=document.createElement('small');meta.textContent=[S(item.user||item.targetUser||st.ownerUser||'—'),statusText(st),'CHƯA CÓ DỮ LIỆU BIỂU MẪU'].join(' · ');card.appendChild(meta);
   const btn=document.createElement('button');btn.type='button';btn.disabled=true;btn.textContent='CHƯA CÓ DỮ LIỆU';card.appendChild(btn);wrap.appendChild(card);
  }
  if(!rendered.size&&!rows.some(r=>canonGroup(r.item.formGroup)==='loading208')){const x=document.createElement('div');x.className='ad-note';x.textContent='Chưa có dữ liệu biểu mẫu để xem.';wrap.appendChild(x)}
  const refresh=document.getElementById('sagsDossierRefresh');if(refresh)refresh.onclick=()=>root.sagsV338OpenDossier?.(date,fid);
  return true;
 }catch(e){
  const load=wrap.querySelector('.ad-loading');if(load)load.textContent='Không đọc được toàn bộ biểu mẫu: '+S(e?.message||e);return false;
 }
}
root.sagsAdminAugmentFlightDossier=augmentDossier;

function install(){
 const base=root.sagsV338OpenDossier;
 if(typeof base==='function'&&!base.__sagsAdminAllForms){
  const wrapped=async function(date,fid){const out=await base.apply(this,arguments);if(isAdmin())await augmentDossier(date,fid);return out};
  wrapped.__sagsAdminAllForms=true;wrapped.__base=base;root.sagsV338OpenDossier=wrapped;
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0),{once:true});else install();
setTimeout(install,500);
})(window);

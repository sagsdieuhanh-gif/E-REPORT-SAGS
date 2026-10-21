/* E-REPORT V2.5.21 - read-only form change history.
 * Record only verified SAVED differences, never keystrokes or sensitive payloads.
 * Local history is recoverable; remote history depends on existing RTDB permissions.
 * This is operational evidence, NOT a server-enforced immutable audit log. */
(function(root){
'use strict';
if(root.SAGSFormEditHistoryV1)return;
const S=v=>String(v??'').trim(), U=v=>S(v).toUpperCase(), $=id=>document.getElementById(id);
const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&#39;'}[c]));
const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_').slice(0,90);
const EXCLUDE=/signature|sigcanvas|sigimage|signpad|attachment|image|photo|picture|canvas|password|passwd|passcode|pin($|_)|auth|token|secret|private|base64|biometric|face|fingerprint|cookie|api.?key|passport|boardingpass|passenger.?name|pax.?name|pnr|booking|email|phone|mobile.?number|bag.?tag|device.?id|ssn|identification/i;
const INTERNAL=/^(?:v\d+(?:Local|Remote|Last)|roster|createdAt|updatedAt|audit|version|__)/i;
const LONG='[Nội dung dài hoặc tệp đính kèm: không lưu giá trị]';
const MAX_VALUE=140, MAX_CHANGES=80, MAX_ROWS=200;
let dbPromise=null,patching=false,uiOpen=false,lastError='';const batches=new Map();
function user(){
 const sess=root.__sagsGetSession?.()||{},p=sess.profile||root.currentUserProfile||{};
 let uid='';try{uid=S(root.firebase?.auth?.()?.currentUser?.uid)}catch(_){}
 return {username:U(p.username||p.userName||root.currentUserProfile?.username||sess.username),name:S(p.fullName||p.name||p.displayName||p.username),role:U(sess.role||p.role||root.currentRole),uid:uid};
}
function meta(){try{return root.currentFlightSessionMeta?.()||null}catch(_){return null}}
function scopeFor(m){const actor=user();return actor.username&&S(m?.id)?safe(actor.uid||actor.username)+'|'+safe(m.id):''}
function envelope(m){try{return root.readFlightSessionEnvelope?.(m.id)||null}catch(_){return null}}
function primitive(v){
 if(v===null||v===undefined)return '';
 if(typeof v==='boolean')return v?'Có':'Không';
 if(typeof v==='string'||typeof v==='number')return String(v);
 return LONG;
}
function scrub(k,v){
 if(EXCLUDE.test(k))return '[Dữ liệu nhạy cảm – đã ẩn]';
 const x=primitive(v);
 if(x.length>MAX_VALUE||x.startsWith('data:')||x.includes('base64,')||/@[a-z0-9.-]+\.[a-z]{2,}/i.test(x))return LONG;
 return x;
}
function changesOf(a,b){
 const before=a&&typeof a==='object'?a:{},after=b&&typeof b==='object'?b:{},out=[];
 for(const k of new Set([...Object.keys(before),...Object.keys(after)])){
  if(!k||k.length>100||INTERNAL.test(k)||EXCLUDE.test(k))continue;
  const old=before[k],next=after[k];
  if(typeof old==='object'&&old!==null||typeof next==='object'&&next!==null)continue;
  if(primitive(old)===primitive(next))continue;
  out.push({field:k,before:scrub(k,old),after:scrub(k,next)});
  if(out.length===MAX_CHANGES)break;
 }
 return out;
}
function keyOf(){return 'sagsFormHistoryV1';}
function openDB(){
 if(dbPromise)return dbPromise;
 dbPromise=new Promise((resolve,reject)=>{
  if(!root.indexedDB)return reject(Error('IndexedDB không được hỗ trợ'));
  const q=indexedDB.open('sags-form-history-v1',1);
  q.onupgradeneeded=()=>{const d=q.result;if(!d.objectStoreNames.contains('events'))d.createObjectStore('events',{keyPath:'id'})};
  q.onsuccess=()=>{q.result.onversionchange=()=>{q.result.close();dbPromise=null};resolve(q.result)};
  q.onerror=()=>reject(q.error||Error('Không mở được IndexedDB'));
 }).catch(e=>{dbPromise=null;throw e});
 return dbPromise;
}
async function idbPut(item){
 const db=await openDB();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('events','readwrite');tx.objectStore('events').put(item);
  tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
 });
}
async function idbList(){
 const db=await openDB();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('events','readonly'),q=tx.objectStore('events').getAll();
  q.onsuccess=()=>resolve((q.result||[]).sort((a,b)=>Number(b.atMs)-Number(a.atMs)));
  q.onerror=()=>reject(q.error);
 });
}
function fallbackRead(){try{return JSON.parse(localStorage.getItem(keyOf())||'[]')||[]}catch(_){return[]}}
function fallbackWrite(item){
 const list=fallbackRead().filter(e=>e?.id!==item.id);
 list.push(item);list.sort((a,b)=>b.atMs-a.atMs);
 try{localStorage.setItem(keyOf(),JSON.stringify(list.slice(0,80)));return true}catch(e){lastError='Bộ nhớ lưu lịch sử đã đầy';return false}
}
async function saveLocal(item){try{await idbPut(item);return true}catch(_){return fallbackWrite(item)}}
async function localList(){let result=[];try{result=await idbList()}catch(_){}return [...new Map([...result,...fallbackRead()].map(e=>[e.id,e])).values()].sort((a,b)=>b.atMs-a.atMs)}
function cloudRef(aid,id){return root.sagsV470Ref?.('roster_sessions/'+safe(aid)+'/edit_audit_v1'+(id?'/'+safe(id):''))}
async function send(item){
 if(item.synced||!item.assignmentId||!navigator.onLine||!root.sagsV470Ref)return false;
 try{
  const ref=cloudRef(item.assignmentId,item.id);if(!ref?.set)throw Error('Chưa có quyền lưu nhật ký');
  await ref.set({schema:1,id:item.id,atMs:item.atMs,serverAt:root.firebase?.database?.ServerValue?.TIMESTAMP||item.atMs,actor:item.actor,sessionId:item.sessionId,assignmentId:item.assignmentId,flightLabel:item.flightLabel,formGroup:item.formGroup,changes:item.changes});
  item.synced=true;item.syncedAtMs=Date.now();await saveLocal(item);
  return true;
 }catch(e){lastError=S(e?.message||e);return false}
}

async function flushBatch(scope){
 const batch=batches.get(scope);if(!batch)return;
 clearTimeout(batch.timer);batches.delete(scope);
 try{await batch.written;await send(batch.event)}catch(e){lastError=S(e?.message||e)}
}
function capture(m,prev,next,reason){
 if(!m?.id||!scopeFor(m))return;
 const diff=changesOf(prev?.state,next?.state);
 if(!diff.length)return;
 const actor=user(),at=Date.now(),sid=S(m.id),aid=S(m.rosterAssignmentId||next?.rosterAssignmentId),scope=scopeFor(m);
 let batch=batches.get(scope);
 if(batch&&(at-batch.lastAt>1800||batch.event.sessionId!==sid)){void flushBatch(scope);batch=null}
 if(batch){
  const map=new Map(batch.event.changes.map(c=>[c.field,{...c}]));
  for(const c of diff){const old=map.get(c.field);if(old){old.after=c.after;if(old.before===old.after)map.delete(c.field)}else map.set(c.field,c)}
  batch.event.changes=[...map.values()].slice(0,MAX_CHANGES);
  batch.event.atMs=at;batch.lastAt=at;
 }else{
  const id='h'+at.toString(36)+'_'+Math.random().toString(36).slice(2,13);
  const event={schema:1,id,scope,sessionId:sid,assignmentId:aid,flightLabel:S(m.name||m.flightName||m.flightRaw||sid).slice(0,100),formGroup:S(m.initialGroup||next?.mainForm||next?.activeFormGroup).slice(0,40),atMs:at,reason:S(reason||'Lưu biểu mẫu').slice(0,75),actor:{username:actor.username,name:actor.name.slice(0,90),role:actor.role,uid:actor.uid},changes:diff,synced:false};
  batch={event,lastAt:at,timer:null,written:Promise.resolve()};batches.set(scope,batch);
 }
 const curr=batch;
 curr.written=curr.written.then(()=>saveLocal(curr.event));
 clearTimeout(curr.timer);
 curr.timer=setTimeout(()=>{void flushBatch(scope)},1800);
}
function wrap(name){
 const fn=root[name];if(typeof fn!=='function'||fn.__sagsHistoryWrapped)return false;
 const wrapped=function(){
  const m=meta(),before=m?envelope(m):null;
  const r=fn.apply(this,arguments);
  if(r===false||!m?.id)return r;
  // Capture after the verified synchronous persistence, not before the save.
  const after=envelope(m);
  if(after&&before&&S(m.id)===S(meta()?.id))capture(m,before,after,name==='sagsV22SaveNow'?'Lưu biểu mẫu':'Lưu dữ liệu');
  return r;
 };
 wrapped.__sagsHistoryWrapped=true;wrapped.__sagsHistoryBase=fn;
 root[name]=wrapped;
 if(name==='persist')try{persist=wrapped}catch(_){}
 return true;
}
function install(){if(patching)return;patching=true;try{wrap('persist');wrap('sagsV22SaveNow');installButtons()}finally{patching=false}}
async function remoteList(aid){
 if(!aid||!root.sagsV470Ref)return [];
 try{
  const ref=cloudRef(aid);const q=ref?.limitToLast?.(MAX_ROWS)||ref;
  if(!q?.once)return [];
  const snap=await q.once('value'),v=snap.val()||{};
  return Object.values(v).filter(x=>x&&x.schema===1&&x.id&&Array.isArray(x.changes)).map(x=>({...x,synced:true}));
 }catch(e){lastError=S(e?.message||e);return []}
}
async function entriesFor(m){
 const scope=scopeFor(m),local=(await localList()).filter(x=>x.scope===scope).slice(0,MAX_ROWS);
 const remote=await remoteList(m?.rosterAssignmentId);
 const merged=new Map();
 for(const e of remote){if(S(e.sessionId)===S(m.id)&&(U(e.actor?.username)===user().username||['AD','ADMIN'].includes(user().role)))merged.set(e.id,{...e,synced:true})}
 for(const e of local){const old=merged.get(e.id);merged.set(e.id,old||e)}
 return [...merged.values()].sort((a,b)=>b.atMs-a.atMs).slice(0,MAX_ROWS);
}
function paintStyle(){
 if($('sagsHistoryStyle'))return;
 const t=document.createElement('style');t.id='sagsHistoryStyle';
 t.textContent='#sagsHistoryOverlay{position:fixed;inset:0;z-index:29999;background:#091827cc;display:none;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;font-family:system-ui,Arial,sans-serif}#sagsHistoryOverlay.open{display:flex}#sagsHistoryPanel{width:min(100%,780px);max-height:92dvh;overflow:auto;background:#fff;color:#17324d;border-radius:16px;padding:17px;box-shadow:0 12px 42px #0006}#sagsHistoryPanel h3{margin:0;color:#17324d;font-size:18px}#sagsHistoryPanel label,#sagsHistoryPanel small{color:#4b6073;font-size:12px}#sagsHistoryPanel select{width:100%;padding:10px;background:#fff;border:1px solid #9bb1c0;border-radius:8px;color:#17324d;margin:6px 0}#sagsHistoryPanel .hHead{display:flex;justify-content:space-between;gap:10px;align-items:center}#sagsHistoryPanel button{border:1px solid #93b2ca;background:#e9f2fa;color:#17324d;border-radius:9px;font-weight:800;min-height:38px;padding:8px 12px;cursor:pointer}#sagsHistoryPanel .hActions{display:flex;gap:8px;align-items:center;margin:7px 0}#sagsHistoryRows{max-height:58dvh;overflow:auto}#sagsHistoryRows .hEvent{background:#f7fafc;border:1px solid #d4e2eb;border-radius:10px;margin-top:9px;padding:11px}#sagsHistoryRows .hMeta{font-size:12px;color:#40576c;margin-bottom:6px}#sagsHistoryRows .hDiff{display:grid;grid-template-columns:minmax(92px,1fr) minmax(0,1fr) minmax(0,1fr);gap:5px;border-top:1px solid #e1e8ef;padding-top:7px;margin-top:7px;font-size:12px;overflow-wrap:anywhere}#sagsHistoryRows .hOld{color:#903c1e}#sagsHistoryRows .hNew{color:#155c3a}#sagsHistoryPanel .hNote{margin-top:10px;font-size:12px;color:#485e70;line-height:1.5}#sagsHistoryShortcut,#sagsHistoryDossierShortcut,#sagsHistoryFormShortcut{border:1px solid #77a7c6;background:#e5f2ff;color:#153c5e;border-radius:9px;padding:9px;font:800 12px Arial;cursor:pointer;white-space:nowrap}#sagsHistoryShortcut:focus-visible,#sagsHistoryDossierShortcut:focus-visible,#sagsHistoryFormShortcut:focus-visible{outline:2px solid #126b9c}@media(max-width:640px){#sagsHistoryPanel{padding:12px}#sagsHistoryRows .hDiff{grid-template-columns:1fr}#sagsHistoryRows .hDiff>*{display:block}}';
 document.head.appendChild(t);
}
function panel(){
 paintStyle();let div=$('sagsHistoryOverlay');if(div)return div;
 div=document.createElement('div');div.id='sagsHistoryOverlay';div.setAttribute('role','dialog');div.setAttribute('aria-modal','true');div.setAttribute('aria-label','Lịch sử chỉnh sửa biểu mẫu');
 div.innerHTML='<div id="sagsHistoryPanel"><div class="hHead"><h3>🕘 LỊCH SỬ THAY ĐỔI BIỂU MẪU</h3><button id="sagsHistoryClose" type="button">ĐÓNG</button></div><label for="sagsHistorySession">Chọn chuyến / biểu mẫu của tôi</label><select id="sagsHistorySession"></select><div class="hActions"><button id="sagsHistoryReload" type="button">↻ TẢI LẠI</button><small id="sagsHistoryCount"></small></div><div id="sagsHistoryRows" aria-live="polite"></div><div class="hNote">Chỉ ghi các trường thay đổi sau khi lưu. Chữ ký, hình ảnh và dữ liệu nhạy cảm không được lưu vào lịch sử. <b>Trên máy</b> nghĩa là chưa xác nhận đã đồng bộ Firebase; nhật ký hiện tại chưa thay thế audit bất biến được phê duyệt.</div></div>';
 document.body.appendChild(div);
 $('sagsHistoryClose').onclick=()=>{div.classList.remove('open');uiOpen=false};
 div.addEventListener('click',e=>{if(e.target===div)$('sagsHistoryClose').click()});
 $('sagsHistorySession').onchange=()=>void refresh();
 $('sagsHistoryReload').onclick=()=>void refresh(true);
 return div;
}
function available(){
 let list=[];try{list=root.readFlightSessionList?.()||[]}catch(_){}
 const m=meta();if(m?.id&&!list.some(x=>x.id===m.id))list.unshift(m);
 return list.filter(x=>x&&x.id).sort((a,b)=>Number(b.updatedAt||0)-Number(a.updatedAt||0)).slice(0,100);
}
async function refresh(retry=false){
 const sel=$('sagsHistorySession'),box=$('sagsHistoryRows'),label=$('sagsHistoryCount');if(!sel||!box)return;
 const m=available().find(x=>S(x.id)===sel.value);if(!m){box.textContent='Chưa có biểu mẫu để xem.';return}
 box.textContent='Đang tải lịch sử...';
 let rows=await entriesFor(m);
 if(retry){for(const e of rows.filter(x=>!x.synced&&x.assignmentId).slice(0,12))await send(e);rows=await entriesFor(m)}
 if(!uiOpen)return;
 label.textContent=rows.length+' bản ghi';
 if(!rows.length){box.textContent='Chưa ghi nhận lần chỉnh sửa nào sau khi cập nhật chức năng này.';return}
 box.innerHTML=rows.map(e=>{
  const date=new Date(Number(e.atMs)||Date.now()).toLocaleString('vi-VN');
  const who=esc(e.actor?.name||e.actor?.username||'Chưa xác định');
  const status=e.synced?'ĐÃ LƯU FIREBASE':'CHỈ TRÊN MÁY';
  return '<div class="hEvent"><div class="hMeta"><b>'+esc(date)+'</b> · '+who+' ('+esc(e.actor?.username||'')+') · '+esc(e.actor?.role||'')+' · '+status+'</div><small>'+esc(e.reason||'Thay đổi biểu mẫu')+'</small>'+(e.changes||[]).map(c=>'<div class="hDiff"><b>'+esc(c.field)+'</b><span class="hOld">Trước: '+esc(c.before||'—')+'</span><span class="hNew">Sau: '+esc(c.after||'—')+'</span></div>').join('')+'</div>';
 }).join('');
}
function open(sessionId){
 const u=user();if(!u.username)return alert('Vui lòng đăng nhập để xem lịch sử.');
 const el=panel();const select=$('sagsHistorySession'),list=available();
 const sid=S(sessionId||meta()?.id||list[0]?.id);
 select.innerHTML=list.map(m=>'<option value="'+esc(m.id)+'">'+esc(S(m.name||m.flightName||m.id))+' · '+esc(S(m.initialGroup||''))+'</option>').join('');
 if(sid&&list.some(m=>S(m.id)===sid))select.value=sid;
 el.classList.add('open');uiOpen=true;void refresh();
}
function installButtons(){
 paintStyle();
 const targets=[['v157Drawer','sagsHistoryShortcut','🕘 LỊCH SỬ CHỈNH SỬA'],['fwcModal','sagsHistoryDossierShortcut','🕘 LỊCH SỬ'],['v324FormActions','sagsHistoryFormShortcut','🕘 LỊCH SỬ']];
 for(const [parent,id,title] of targets){
  const host=$(parent);if(!host||$(id))continue;
  const btn=document.createElement('button');btn.type='button';btn.id=id;btn.textContent=title;
  btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();open()});
  if(parent==='fwcModal'){const head=host.querySelector('.fwcHead');(head||host).appendChild(btn)}
  else host.appendChild(btn);
 }
}
root.SAGSFormEditHistoryV1={changesOf,scrub,open,refresh,install,capture,flushBatch,entriesFor};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,50),{once:true});
else setTimeout(install,50);
root.addEventListener?.('pageshow',()=>setTimeout(install,100),{passive:true});
document.addEventListener('click',e=>{if(e.target?.closest?.('[data-v157-key="myflight"],#roleBtnFlights,#roleBtnRosterFlights,#v324FormActions,#fwcModal'))setTimeout(installButtons,50)},true);
root.addEventListener?.('online',()=>{if(uiOpen)void refresh(true)},{passive:true});
root.addEventListener?.('pagehide',()=>{for(const scope of [...batches.keys()])void flushBatch(scope)},{passive:true});
})(window);

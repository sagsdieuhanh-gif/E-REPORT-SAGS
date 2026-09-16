/* V4.7.8 · A pinned flight is a tiny ON-DEVICE shortcut, never a form copy.
 * No Firebase reads on bootstrap; revalidate the exact assignment before opening.
 */
(function(root){
'use strict';
const S=v=>String(v??'').trim();
const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
const norm=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):S(v).toUpperCase().replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return S(v).toUpperCase().replace(/\s+/g,'')}};
const session=()=>{try{return root.__sagsGetSession?.()||{role:root.currentRole,profile:root.currentUserProfile}}catch(_){return {role:root.currentRole,profile:root.currentUserProfile}}};
const role=()=>S(session().role||session().profile?.role).toUpperCase();
const me=()=>norm(session().profile?.username||root.currentUserProfile?.username);
const label=v=>({FSAGS:'42.3',FSAGS423:'42.3',FSAGS421:'42.1',FSAGS551:'55.1',FSAGS09:'09',FINAL:'FINAL'}[S(v).toUpperCase()]||S(v)||'Biểu mẫu');
const esc=v=>S(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const dbName='sags-pinned-flight-v478',storeName='pin',fallback=u=>'sags:pinned-flight:v478:'+safe(u);
let dbPromise=null,currentUser='',current=null,openBusy=false;
function idb(){
  if(!root.indexedDB)return Promise.reject(new Error('IndexedDB unavailable'));
  if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open(dbName,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(storeName))req.result.createObjectStore(storeName,{keyPath:'user'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)}).catch(e=>{dbPromise=null;throw e});
  return dbPromise;
}
async function diskGet(u){try{const db=await idb();return await new Promise((resolve,reject)=>{const tx=db.transaction(storeName,'readonly'),r=tx.objectStore(storeName).get(u);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)})}catch(_){try{return JSON.parse(localStorage.getItem(fallback(u))||'null')}catch(_){return null}}}
async function diskSet(u,v){try{const db=await idb();await new Promise((resolve,reject)=>{const tx=db.transaction(storeName,'readwrite');tx.objectStore(storeName).put({...v,user:u});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});return}catch(_){try{localStorage.setItem(fallback(u),JSON.stringify({...v,user:u}))}catch(_){}}}
function minimal(item){return {assignmentId:S(item.assignmentId),flightId:S(item.flightId),formGroup:S(item.formGroup),active:item.active!==false}}
function valid(v,u){return v&&v.user===u&&/^\d{4}-\d{2}-\d{2}$/.test(S(v.date))&&S(v.flightId)&&Array.isArray(v.items)&&v.items.every(x=>S(x.assignmentId)&&S(x.flightId)===S(v.flightId))}
async function load(){const u=me();if(!u||role()==='AD'){currentUser='';current=null;paint();return null}if(currentUser===u)return current;currentUser=u;current=null;const data=await diskGet(u);if(me()!==u)return null;current=valid(data,u)?data:null;paint();return current}
async function save(next){const u=me();if(!u||role()==='AD')return;currentUser=u;current=next?{...next,user:u}:null;await diskSet(u,current||{user:u,date:'',flightId:'',items:[]});paint()}
async function pinItems(items,day){
  const u=me();if(!u||role()==='AD')return false;
  const arr=(items||[]).filter(x=>x&&x.active!==false&&norm(x.targetUser||x.user)===u&&S(x.opDate)===S(day));
  if(!arr.length)return false;
  const fid=S(arr[0].flightId),selected=arr.filter(x=>S(x.flightId)===fid).map(minimal);
  if(!fid||!selected.length)return false;
  const x=arr[0],name=S(x.flightRaw||x.flightName||[x.arrFlight,x.depFlight].filter(Boolean).join(' / ')||fid).slice(0,100);
  await save({user:u,date:S(day),flightId:fid,flightLabel:name,items:selected,atMs:Date.now()});return true;
}
root.sagsV478PinItems=pinItems;
root.sagsV478RecordPinned=async(item,day)=>{
  // Successful explicit opening is also a user selection; include the user's other
  // duties on the SAME flight if the day's tiny mailbox is already on-device.
  let items=[item];try{const m=await root.sagsV478ManifestForWorker?.(day);if(m){const extra=Object.values(m.items||{}).filter(x=>S(x.flightId)===S(item.flightId));if(extra.length)items=extra}}catch(_){}
  await pinItems(items,day);
};
root.sagsV478MailboxUpdated=async(day,items)=>{
  const u=me();if(!u||role()==='AD')return;
  if(currentUser!==u)await load();
  if(!current||S(current.date)!==S(day))return;
  const matches=Object.values(items||{}).filter(x=>S(x.flightId)===S(current.flightId)&&S(x.opDate)===S(day)&&x.active!==false&&x.duplicateInactive!==true);
  if(!matches.length){await save(null);return}
  const keys=matches.map(x=>S(x.assignmentId)).sort().join('|');
  if(keys!==current.items.map(x=>S(x.assignmentId)).sort().join('|'))await pinItems(matches,day);
};
function style(){if(document.getElementById('v478PinStyle'))return;const st=document.createElement('style');st.id='v478PinStyle';st.textContent=`
#v478PinHome{display:block;width:100%;min-height:48px;margin-top:8px;padding:10px;text-align:left;border-radius:12px;border:1px solid #8db7dd;background:#e7f4ff;color:#13436b;font:800 13px/1.45 Arial;white-space:normal}
#v478PinNav{min-height:31px!important;border-radius:9px;border:1px solid #96bce0;background:#eaf5ff;color:#16456f;font:800 9px/1.1 Arial!important;padding:4px 1px!important;white-space:normal;overflow-wrap:anywhere}
#v478PinDialog{position:fixed;inset:0;z-index:2147482000;background:rgba(0,20,48,.62);display:flex;justify-content:center;align-items:center;padding:12px}
#v478PinDialog[hidden]{display:none!important}#v478PinDialog .panel{background:#fff;color:#153b58;border-radius:16px;padding:18px;max-width:520px;width:100%;max-height:85vh;overflow:auto;box-sizing:border-box}
#v478PinDialog button{min-height:44px;border-radius:9px;border:1px solid #9bbadb;background:#eff6ff;color:#154773;font:800 13px Arial;margin:6px 5px 0 0;padding:8px 10px}
#v478PinDialog button.v478Task{display:block;width:100%;text-align:left;background:#e6f2ff}
#v478PinStatus{font:12px/1.5 Arial;min-height:18px;color:#555;margin-top:10px}`;
 document.head.appendChild(st)}
function paint(){
  style();const u=me(),ok=!!(current&&currentUser===u&&u&&role()!=='AD'),txt=ok?`📌 ${current.flightLabel||current.flightId} · ${current.items.length} phần việc`:'📌 CHUYẾN ĐANG LÀM';
  const home=document.getElementById('v157RecentText');
  if(home){let b=document.getElementById('v478PinHome');if(!b){b=document.createElement('button');b.id='v478PinHome';b.type='button';home.appendChild(b)}b.hidden=!ok;b.textContent=txt;b.onclick=showDialog}
  const nav=document.getElementById('v163OperationNav');if(nav){
    let b=document.getElementById('v478PinNav');
    if(!b){b=document.createElement('button');b.id='v478PinNav';b.type='button'}
    // Keep the original order CHUYẾN / TRANG CHỦ / MULTI / KÝ and put PIN last.
    // Exactly five equal columns on one row prevents the higher-z form toolbar
    // from covering HOME on small screens. Restore four columns when not pinned.
    if(b.parentElement!==nav||b!==nav.lastElementChild)nav.appendChild(b);
    if(b.hidden===ok)b.hidden=!ok;
    b.textContent=ok?'📌 GHIM':'';
    b.setAttribute('aria-label','Mở chuyến đang ghim trên máy');
    b.title='Chuyến đang làm';b.onclick=showDialog;
    const columns=ok?'repeat(5,minmax(0,1fr))':'';
    if(nav.style.gridTemplateColumns!==columns)nav.style.gridTemplateColumns=columns;
  }
}
function dialog(){let d=document.getElementById('v478PinDialog');if(d)return d;d=document.createElement('div');d.id='v478PinDialog';d.hidden=true;d.innerHTML='<div class="panel" role="dialog" aria-modal="true" aria-label="Chuyến đã ghim"><h3 id="v478PinHeading"></h3><p style="font:12px/1.5 Arial">Lưu trên máy. Mở từng biểu mẫu theo phân công hiện tại; không tải lại danh sách MY FLIGHT.</p><div id="v478PinTasks"></div><div id="v478PinStatus" role="status"></div><button type="button" id="v478PinUnpin">BỎ GHIM</button><button type="button" id="v478PinClose">ĐÓNG</button></div>';document.body.appendChild(d);d.querySelector('#v478PinClose').onclick=()=>{d.hidden=true};d.querySelector('#v478PinUnpin').onclick=async()=>{await save(null);d.hidden=true};d.addEventListener('click',e=>{if(e.target===d)d.hidden=true});return d}
async function check(item){
  // Never authorize work with stale local metadata or a different login.
  if(!current||currentUser!==me()||role()==='AD')throw new Error('Bạn cần đăng nhập đúng tài khoản đã ghim.');
  if(navigator.onLine===false)throw new Error('Đang ngoại tuyến. Chuyến vẫn lưu trên máy; cần mạng để xác minh phân công trước khi tiếp tục ghi.');
  if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase chưa sẵn sàng.');
  const u=me(),date=S(current.date),fid=S(current.flightId),aid=S(item.assignmentId);
  const ref=root.sagsV470Ref(`roster_mail/${safe(u)}/items/${safe(aid)}`);
  // A bounded fresh read: timeout is an error, NEVER permission to edit using stale pin.
  const snap=await Promise.race([ref.once('value'),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Hết thời gian xác minh phân công; thử lại khi mạng ổn định.')),7500))]);
  const v=snap?.val?.();
  if(!v||v.active===false||v.duplicateInactive===true||norm(v.targetUser||v.user)!==u||S(v.opDate)!==date||S(v.flightId)!==fid||S(v.assignmentId||aid)!==aid)throw new Error('Phân công này đã thay đổi/thu hồi. Mở MY FLIGHT để cập nhật; không mở bản ghim cũ.');
  return v;
}
async function openOne(item,button){if(openBusy)return;openBusy=true;button.disabled=true;const out=document.getElementById('v478PinStatus');if(out)out.textContent='Đang xác minh đúng phân công…';try{
  const latest=await check(item);
  if(out)out.textContent='Đang mở '+label(latest.formGroup)+'…';
  if(typeof root.sagsV478OpenExactAssignment!=='function')throw new Error('Bộ mở biểu mẫu chưa tải xong; hãy bấm UPDATE.');
  const d=document.getElementById('v478PinDialog');if(d)d.hidden=true;
  await root.sagsV478OpenExactAssignment(S(latest.assignmentId||item.assignmentId),S(latest.flightId),S(latest.opDate));
}catch(e){const d=document.getElementById('v478PinDialog');if(d)d.hidden=false;if(out)out.textContent=S(e?.message||e)}finally{openBusy=false;button.disabled=false}}
async function showDialog(){if(currentUser!==me())await load();if(!current)return;const d=dialog();d.hidden=false;d.querySelector('#v478PinHeading').textContent='📌 '+S(current.flightLabel||current.flightId)+' · '+S(current.date);const list=d.querySelector('#v478PinTasks');list.textContent='';for(const item of current.items){const b=document.createElement('button');b.type='button';b.className='v478Task';b.textContent='MỞ '+label(item.formGroup);b.onclick=()=>openOne(item,b);list.appendChild(b)}d.querySelector('#v478PinStatus').textContent=''}
root.sagsV478PinnedStats=()=>({user:currentUser,hasPinned:!!current,date:current?.date||null,assignmentCount:current?.items?.length||0});
function boot(){void load();paint()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
setTimeout(boot,800);setTimeout(boot,2300);
root.addEventListener?.('pageshow',boot,{passive:true});
// The user may sign in after the initial timers have run. Restore the correct
// per-account pin at actual login / account switch without querying Firebase.
for(const evt of ['sags:login','sags:rolechange','sags:profilechange','sags:ui-ready'])root.addEventListener?.(evt,boot,{passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)boot()},{passive:true});
})(typeof window!=='undefined'?window:globalThis);

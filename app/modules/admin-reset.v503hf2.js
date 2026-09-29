/* E-REPORT/SAGS V5.0.3B — AD server-data backup + verified clean start.
 * The browser never deletes before the AD downloads AND re-opens an identical backup.
 * Firebase Auth accounts / users collection / legacy personal-user account docs survive.
 * Browser clients cannot provide a global write barrier against older/offline builds.
 */
(function(root){
'use strict';
if(root.__SAGS_V503_RESET)return;root.__SAGS_V503_RESET=true;
const BUILD='V5.0.3B-HF2-LAYERED-PDF-AD-AUTH-FIX';
const EPOCH_KEY='sagsResetEpochV503';
const ACCOUNT_KIND='sags_personal_user_test_v1';
const ACCOUNT_CATALOG_ID='SYS_USER_CATALOG_V466';
const MAX_BYTES=120*1024*1024;
let backup=null, backupBytes=null, backupHash='', verified=false, busy=false;
const q=id=>document.getElementById(id);
function status(text,bad=false){const e=q('v378ResetStatus');if(e){e.textContent=String(text);e.classList.add('show');e.style.background=bad?'#fff1f0':'#ecfdf3';e.style.color=bad?'#912018':'#067647';}}
function uid(){return (root.firebase?.auth?.()?.currentUser)||null;}
async function requireAdmin(){
  // The app declares `let currentRole` in a classic script: it is NOT window.currentRole.
  // Read its exported authenticated session instead of the undefined window property.
  const session=typeof root.__sagsGetSession==='function'?root.__sagsGetSession():null;
  const role=String(session?.role||session?.profile?.role||'').trim().toUpperCase();
  if(!['AD','ADMIN'].includes(role))throw Error('Chỉ tài khoản AD đã đăng nhập mới được sao lưu/xóa.');
  // Wait for Firebase Auth to finish restoring its persisted session after app startup.
  const user=typeof root.adFirebaseWaitForUser==='function'
    ?await root.adFirebaseWaitForUser(12000):uid();
  if(!user?.uid)throw Error('Phiên Firebase Authentication chưa sẵn sàng. Vui lòng đăng nhập lại AD.');
  const expectedUid=String(session?.profile?.firebaseUid||session?.profile?.uid||'');
  if(expectedUid&&expectedUid!==String(user.uid))throw Error('Phiên AD trên màn hình khác tài khoản Firebase đang đăng nhập. Dừng để bảo vệ dữ liệu.');
  const fs=root.firebase?.firestore?.();if(!fs)throw Error('Firestore chưa sẵn sàng.');
  const profile=await fs.collection('users').doc(user.uid).get({source:'server'});
  const p=profile.data()||{};
  if(!profile.exists||p.active!==true||String(p.role||'').toUpperCase()!=='ADMIN')throw Error('Máy chủ chưa xác nhận tài khoản ADMIN đang hoạt động.');
  if(typeof root.sagsV470Db!=='function')throw Error('Realtime Database chưa sẵn sàng.');
  const rdb=root.sagsV470Db();const conn=(await rdb.ref('.info/connected').once('value')).val();
  if(conn!==true)throw Error('Máy chủ chưa kết nối. Không thể sao lưu/xóa khi offline.');
  return {user,fs,rdb};
}
function accountDoc(d){return d.id===ACCOUNT_CATALOG_ID||d.id.startsWith('USER__')&&d.data?.kind===ACCOUNT_KIND||d.data?.kind===ACCOUNT_KIND||d.data?.kind==='sags_user_catalog_v466';}
function encode(v){
 if(v===null||v===undefined)return v===undefined?null:v;
 if(typeof v!=='object')return v;
 if(v instanceof Date)return {__sagsType:'Date',value:v.toISOString()};
 if(v.toDate&&typeof v.seconds==='number')return {__sagsType:'Timestamp',seconds:v.seconds,nanoseconds:v.nanoseconds||0};
 if(typeof v.latitude==='number'&&typeof v.longitude==='number')return {__sagsType:'GeoPoint',latitude:v.latitude,longitude:v.longitude};
 if(typeof v.path==='string'&&typeof v.id==='string'&&typeof v.get==='function')return {__sagsType:'DocumentReference',path:v.path};
 if(v.toBase64&&typeof v.toBase64==='function')return {__sagsType:'Bytes',base64:v.toBase64()};
 if(Array.isArray(v))return v.map(encode);
 return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,encode(x)]));
}
async function firestoreDocs(fs,name){
 const col=fs.collection(name),field=root.firebase.firestore.FieldPath.documentId(),docs=[];
 let after=null;
 for(let page=0;page<4000;page++){
  let query=col.orderBy(field).limit(250);if(after)query=query.startAfter(after);
  const snap=await query.get({source:'server'});
  if(snap.metadata?.fromCache)throw Error('Firestore trả bản cache, chưa đọc được máy chủ.');
  snap.forEach(d=>docs.push({id:d.id,data:encode(d.data()||{})}));
  if(snap.size<250)return docs;
  after=snap.docs[snap.docs.length-1];
 }
 throw Error('Quá nhiều trang Firestore; dừng để tránh sao lưu thiếu.');
}
async function capture(ctx){
 const v470=(await ctx.rdb.ref('sags_live_v470').once('value')).val();
 const v469=(await ctx.rdb.ref('sags_live_v469').once('value')).val();
 const handovers=await firestoreDocs(ctx.fs,'sags_handovers');
 const users=await firestoreDocs(ctx.fs,'users');
 if((await ctx.rdb.ref('.info/connected').once('value')).val()!==true)throw Error('Mất kết nối trong khi sao lưu.');
 return {rtdb:{sags_live_v470:v470||null,sags_live_v469:v469||null},firestore:{sags_handovers:handovers,users}};
}
const textBytes=x=>new TextEncoder().encode(x);
async function sha(bytes){const buf=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(buf),b=>b.toString(16).padStart(2,'0')).join('');}
async function fingerprint(payload){return sha(textBytes(JSON.stringify(payload)));}
function clearLocal(){
 let count=0;for(const storage of [localStorage,sessionStorage]){
  try{for(let i=storage.length-1;i>=0;i--){const k=storage.key(i)||'';
    if(storage===localStorage&&(/^(?:firebase:|firebaseLocalStorage|sagsPersonalAccountSessionV1$|sagsFixedRoleV3$|sagsResetEpochV503$)/i.test(k)))continue;
    storage.removeItem(k);count++;
  }}catch(e){console.warn('V503 local clean',e)}
 }return count;
}
async function beginBackup(){
 if(busy)return;busy=true;verified=false;backup=null;backupBytes=null;backupHash='';
 const btn=q('v378ResetRecordsBtn');if(btn)btn.disabled=true;
 try{
  status('Đang xác minh quyền AD và tải toàn bộ dữ liệu máy chủ…');
  const ctx=await requireAdmin();const data=await capture(ctx);
  const payload={schema:'E_REPORT_SAGS_BACKUP_V503',build:BUILD,createdAt:new Date().toISOString(),project:'E-REPORT-SAGS',scope:'RTDB sags_live_v470 + sags_live_v469; Firestore sags_handovers + users',notes:'Không bao gồm Firebase Authentication credentials, localStorage của các máy khác, tệp trên dịch vụ bên ngoài hoặc Firestore subcollections không thể liệt kê bằng SDK trình duyệt.',data};
  const bytes=textBytes(JSON.stringify(payload));if(bytes.length>MAX_BYTES)throw Error('Bản sao lưu vượt 120 MB; cần xuất bằng công cụ quản trị máy chủ, không xóa từ trình duyệt.');
  const hash=await sha(bytes);const file=`E-REPORT-SAGS-BACKUP-${new Date().toISOString().replace(/[:.]/g,'-')}-${hash.slice(0,12)}.json`;
  backup=payload;backupBytes=bytes;backupHash=hash;
  const a=document.createElement('a'),url=URL.createObjectURL(new Blob([bytes],{type:'application/json'}));
  a.href=url;a.download=file;a.style.display='none';document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(url);a.remove()},120000);
  status(`Đã tạo file ${file} (${(bytes.length/1024/1024).toFixed(2)} MB). Hãy lưu file, rồi chọn lại chính file đó để KIỂM TRA trước khi xóa.`);
  const input=q('v503BackupVerifyFile');if(input){input.value='';input.style.display='inline-block';}
  if(q('v503ResetExecuteBtn'))q('v503ResetExecuteBtn').disabled=true;
 }catch(e){status('KHÔNG SAO LƯU ĐƯỢC — KHÔNG XÓA: '+String(e?.message||e),true);alert('Chưa có bản sao lưu đầy đủ. Không có dữ liệu nào bị xóa.\n\n'+String(e?.message||e));}
 finally{busy=false;if(btn)btn.disabled=false;}
}
async function verifyFile(event){
 verified=false;const execute=q('v503ResetExecuteBtn');if(execute)execute.disabled=true;
 const file=event?.target?.files?.[0];if(!file||!backupBytes){status('Chưa có bản sao lưu cần kiểm tra.',true);return;}
 try{
  if(file.size!==backupBytes.length)throw Error('Dung lượng file khác bản sao lưu.');
  const bytes=new Uint8Array(await file.arrayBuffer());const h=await sha(bytes);
  if(h!==backupHash)throw Error('SHA-256 không khớp. File tải về chưa đúng hoặc bị lỗi.');
  const parsed=JSON.parse(new TextDecoder().decode(bytes));
  if(parsed.schema!=='E_REPORT_SAGS_BACKUP_V503'||parsed.createdAt!==backup.createdAt)throw Error('Sai loại hoặc sai phiên sao lưu.');
  verified=true;if(execute)execute.disabled=false;
  status('✓ ĐÃ KIỂM TRA FILE SAO LƯU SHA-256: '+h+'. Có thể chọn XÓA SAU KHI SAO LƯU (không tự xóa).');
 }catch(e){status('FILE SAO LƯU KHÔNG HỢP LỆ — KHÔNG XÓA: '+String(e?.message||e),true);}
}
async function reset(){
 if(busy||!backup||!backupBytes||!verified)return alert('Phải tải và chọn lại bản sao lưu hợp lệ trước khi xóa.');
 const phrase='XOA SACH DU LIEU';
 if(!confirm('CHÚ Ý: XÓA DỮ LIỆU CHUYẾN, BIỂU MẪU, FLEET, LỊCH VỆ SINH, LỊCH SỬ VÀ CẤU HÌNH NGHIỆP VỤ TRÊN MÁY CHỦ.\n\nTrong phạm vi RTDB sags_live_v470/v469 và Firestore sags_handovers; giữ Firebase Authentication, users và hồ sơ tài khoản. Dữ liệu chỉ nằm ở máy khác/dịch vụ ngoài KHÔNG thuộc bản sao lưu này.\n\nĐảm bảo tất cả nhân viên đã ngừng nhập liệu, các thiết bị cũ đã đóng ứng dụng và bạn đã cất bản sao lưu nơi an toàn. Tiếp tục?'))return;
 if(String(prompt('Nhập chính xác '+phrase+' để xác nhận lần cuối:','')||'').trim().toUpperCase()!==phrase)return;
 busy=true;root.__SAGS_RESET_IN_PROGRESS__=true;
 const btn=q('v503ResetExecuteBtn');if(btn)btn.disabled=true;
 let deleted=0;
 try{
  status('Đang xác minh quyền AD và đối chiếu máy chủ với file đã sao lưu…');
  const ctx=await requireAdmin();const live=await capture(ctx);
  if(await fingerprint(live)!==await fingerprint(backup.data))throw Error('Dữ liệu máy chủ đã thay đổi sau lúc sao lưu. Hãy tạo và kiểm tra bản sao lưu mới; chưa xóa gì.');
  // Check RTDB root write capability BEFORE the first destructive Firestore batch.
  const probeName='system/reset_probe_v503_'+ctx.user.uid.replace(/[^A-Za-z0-9_-]/g,'_');
  try{
   await ctx.rdb.ref('sags_live_v470').update({[probeName]:{uid:ctx.user.uid,atMs:Date.now()}});
  }finally{
   await ctx.rdb.ref('sags_live_v470').update({[probeName]:null});
  }
  const postProbe=await capture(ctx);
  if(await fingerprint(postProbe)!==await fingerprint(backup.data))throw Error('Máy chủ thay đổi sau kiểm tra quyền ghi; hãy sao lưu lại.');
  // Firestore first: partial failures are reported and preserved in the verified download.
  const victims=backup.data.firestore.sags_handovers.filter(d=>!accountDoc(d));
  const col=ctx.fs.collection('sags_handovers');
  for(let i=0;i<victims.length;i+=250){
   await requireAdmin();
   const batch=ctx.fs.batch();for(const d of victims.slice(i,i+250))batch.delete(col.doc(d.id));
   await batch.commit();deleted+=Math.min(250,victims.length-i);
   status(`Đang dọn Firestore ${deleted}/${victims.length}. GIỮ bản sao lưu đã tải.`);
  }
  const rootRef=ctx.rdb.ref('sags_live_v470');
  const current=(await rootRef.once('value')).val()||{};
  // New operational writes after backup must abort, not be silently erased.
  if(await fingerprint(current)!==await fingerprint(backup.data.rtdb.sags_live_v470||{}))throw Error('RTDB có dữ liệu mới trong lúc dọn Firestore. Dừng để tránh xóa hồ sơ mới.');
  const stamp=Date.now(),marker={schema:1,resetAtMs:stamp,resetByUid:ctx.user.uid,build:BUILD,backupSha256:backupHash};
  const patch={};for(const key of Object.keys(current))if(key!=='account_permissions')patch[key]=null;
  patch.system={clean_start_v503:marker};
  await rootRef.update(patch);
  // Legacy RTDB signals are backed up too; fail visibly if this path cannot be removed.
  await ctx.rdb.ref('sags_live_v469').remove();
  const after=(await rootRef.once('value')).val()||{};
  const remnants=Object.keys(after).filter(k=>k!=='account_permissions'&&k!=='system');
  if(remnants.length)throw Error('RTDB còn dữ liệu: '+remnants.slice(0,8).join(', '));
  const rest=await firestoreDocs(ctx.fs,'sags_handovers');
  if(rest.some(d=>!accountDoc(d)))throw Error('Firestore còn hồ sơ mới/không xóa được; cần AD kiểm tra.');
  try{localStorage.setItem(EPOCH_KEY,String(stamp));}catch(_){}
  const local=clearLocal();backup=null;backupBytes=null;verified=false;backupHash='';
  status(`✓ HOÀN TẤT: Firestore ${deleted} hồ sơ; RTDB đã dọn; bộ nhớ máy AD ${local} mục. Tài khoản được giữ.`);
  alert('Đã xóa các vùng RTDB/Firestore mà bản sao lưu bao phủ; tài khoản được giữ.\n\nCác thiết bị cũ/offline phải mở lại phiên bản mới trước khi nhập liệu. Bản sao lưu đã tải là bản phục hồi.');
  location.reload();
 }catch(e){status(`XÓA CHƯA HOÀN TẤT (Firestore đã dọn ${deleted} hồ sơ). GIỮ FILE SAO LƯU. Lỗi: `+String(e?.message||e),true);alert(`DỪNG: Chưa xác nhận xóa hoàn tất. ${deleted} hồ sơ Firestore có thể đã xóa. Giữ file sao lưu, không tiếp tục nhập liệu trước khi kiểm tra.\n\n`+String(e?.message||e));}
 finally{busy=false;root.__SAGS_RESET_IN_PROGRESS__=false;if(btn)btn.disabled=!verified;}
}
function install(){
 const old=q('v378ResetRecordsBtn');if(old){old.textContent='⬇️ 1. SAO LƯU TRƯỚC KHI XÓA';old.onclick=beginBackup;}
 const verify=q('v503BackupVerifyFile');if(verify)verify.onchange=verifyFile;
 const execute=q('v503ResetExecuteBtn');if(execute){execute.onclick=reset;execute.disabled=true;}
 try{if(typeof root.sagsV470Ref==='function')root.sagsV470Ref('system/clean_start_v503').on('value',s=>{
  const epoch=Number(s.val()?.resetAtMs||0),prior=Number(localStorage.getItem(EPOCH_KEY)||0);
  if(!epoch||epoch<=prior||root.__SAGS_RESET_IN_PROGRESS__)return;
  try{localStorage.setItem(EPOCH_KEY,String(epoch))}catch(_){}
  clearLocal();alert('AD đã khởi tạo dự án mới. Ứng dụng sẽ tải lại; không dùng bản chuyến cũ.');location.reload();
 },e=>console.warn('V503 reset listener unavailable',e));}catch(e){console.warn('V503 reset listener',e)}
}
root.sagsV503Backup=beginBackup;root.sagsV503Verify=verifyFile;root.sagsV503Reset=reset;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})(window);

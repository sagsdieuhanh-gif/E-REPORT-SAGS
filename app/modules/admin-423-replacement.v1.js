/* E-REPORT SAGS: ADMIN-only 42.1 -> 42.3 replacement, preserving the old form. */
(function(root){
"use strict";
if(root.SAGSAdmin423Replacement)return;
const S=x=>String(x==null?"":x).trim(),U=x=>S(x).toUpperCase(),safe=x=>S(x).replace(/[.#$[\]/]/g,"_");
const is421=x=>U(x?.formGroup)==="FSAGS421";
const is423=x=>["FSAGS","FSAGS423"].includes(U(x?.formGroup));
const owner=x=>U(x?.user||x?.targetUser||x?.ownerUser);
const flightCodes=x=>[x?.arrFlight,x?.depFlight,x?.flightRaw,x?.flightName].flatMap(v=>[...U(v).matchAll(/[A-Z0-9]{2,3}\s*\d{1,5}/g)].map(m=>m[0].replace(/\s/g,"")));
function sameFlight(a,b){
 const idA=S(a?.flightId),idB=S(b?.flightId);
 if(idA&&idB)return idA===idB;
 const aSet=new Set(flightCodes(a));return flightCodes(b).some(code=>aSet.has(code));
}
function makeReplacement(old,sourceSession,actor,reason,now){
 if(!old||!is421(old)||old.active===false)throw Error("Phân công 42.1 không còn hiệu lực.");
 const oldAid=S(old.assignmentId),target=owner(old),date=S(old.opDate),fid=S(old.flightId);
 if(!oldAid||!target||!fid||!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error("Hồ sơ 42.1 thiếu dữ liệu định danh.");
 if(!S(reason)||S(reason).length<10)throw Error("Lý do thay thế tối thiểu 10 ký tự.");
 if(!sourceSession||typeof sourceSession!=="object")throw Error("Không đọc được phiên 42.1 gốc.");
 const newAid="AR423_"+oldAid;
 if(!/^[A-Za-z0-9_-]+$/.test(newAid))throw Error("Mã phân công không hợp lệ.");
 const event="AD423_"+S(now)+"_"+safe(oldAid);
 const metadata={oldAssignmentId:oldAid,newAssignmentId:newAid,flightId:fid,opDate:date,targetUser:target,reason:S(reason).slice(0,500),by:actor.username,actorUid:actor.uid,atMs:now};
 const oldItem={...old,active:false,rosterStatus:"ADMIN_REPLACED_BY_423",supersededByAssignmentId:newAid,supersededByFormGroup:"fsags",admin423ReplacementAtMs:now,admin423ReplacementBy:actor.username};
 const nextItem={...old,assignmentId:newAid,formGroup:"fsags",sourceColumn:"Grnd_Cor",roleKey:"COR",user:target,targetUser:target,originalTargetUser:target,originalUser:target,rosterFormFamily:"423",rosterFormFamilyLocked:true,rosterFormFamilyBasis:"ADMIN_REPLACEMENT",rosterAssignmentIdVariant:"ADMIN423_V1",assignmentLeg:"",assignmentFlight:"",assignmentTime:"",assignmentScope:"TURNAROUND",rosterLegSplit:false,workPartOrder:1,workPartTotal:1,workPartSequenceSource:"Grnd_Cor",coAssigneeGroupId:"",coAssigneeMode:"",coAssigneeRank:1,coAssigneeTotal:1,coAssigneeUsers:[target],active:true,manualOverride:false,rosterStatus:"ACTIVE",admin423Replacement:metadata,publishedAtMs:now,publishedBy:actor.username};
 delete nextItem.supersededByAssignmentId;
 delete nextItem.supersededByFormGroup;
 delete nextItem.admin423ReplacementAtMs;
 delete nextItem.admin423ReplacementBy;
 const session={engine:"daily-roster-v2",schema:1,assignmentId:newAid,ownerUser:target,formGroup:"fsags",sourceColumn:"Grnd_Cor",roleKey:"COR",claimStatus:"READY",taskStatusV333:"UNCLAIMED",taskAvailabilityV333:"READY",rosterActive:true,rosterStatus:"ACTIVE",active:true,admin423Replacement:metadata,createdAtMs:now,updatedAtMs:now};
 return {metadata,oldAid,newAid,oldItem,nextItem,session,event};
}
function buildPatch(result,old,oldSession,oldMail){
 const {metadata:ev,oldAid,newAid,oldItem,nextItem,session,event}=result;
 const date=safe(ev.opDate),fid=safe(ev.flightId),user=safe(ev.targetUser),oldKey=safe(oldAid),newKey=safe(newAid),evKey=safe(event);
 const f="flight_records/"+date+"/"+fid,m="roster_manifests/"+date;
 const archive={schema:1,reason:"ADMIN_REPLACE_421_WITH_423",oldAssignmentId:oldAid,replacedBy:newAid,archivedAtMs:ev.atMs,archivedBy:ev.by,item:old,session:oldSession,mail:oldMail||null};
 if(JSON.stringify(archive).length>450000)throw Error("Bản lưu 42.1 quá lớn. Không thay đổi dữ liệu; hãy liên hệ quản trị viên.");
 const patch={};
 patch[m+"/items/"+oldKey]=oldItem;
 patch[m+"/items/"+newKey]=nextItem;
 patch[m+"/rosterArchives/"+oldKey]=archive;
 patch[m+"/admin423Replacements/"+oldKey]=ev;
 patch[m+"/manualUpdatedAtMs"]=ev.atMs;
 patch[m+"/manualUpdatedBy"]=ev.by;
 patch["roster_mail/"+user+"/items/"+oldKey]={...(oldMail||old),active:false,rosterStatus:"ADMIN_REPLACED_BY_423",supersededByAssignmentId:newAid};
 patch["roster_mail/"+user+"/items/"+newKey]={...nextItem,engine:"daily-roster-v2",schema:2,sourceFile:"ADMIN_423_REPLACEMENT",publishedAtMs:ev.atMs,publishedBy:ev.by};
 patch["roster_revocations/"+user+"/items/"+oldKey]={assignmentId:oldAid,reason:"ADMIN_REPLACED_BY_423",atMs:ev.atMs,by:ev.by,toAssignmentId:newAid,preserveEnvelope:true};
 patch["roster_revocations/"+user+"/items/"+newKey]=null;
 patch["roster_sessions/"+oldKey+"/rosterActive"]=false;
 patch["roster_sessions/"+oldKey+"/active"]=false;
 patch["roster_sessions/"+oldKey+"/rosterStatus"]="ADMIN_REPLACED_BY_423";
 patch["roster_sessions/"+oldKey+"/supersededByAssignmentId"]=newAid;
 patch["roster_sessions/"+oldKey+"/supersededByFormGroup"]="fsags";
 patch["roster_sessions/"+oldKey+"/admin423ReplacementAtMs"]=ev.atMs;
 patch["roster_sessions/"+newKey]=session;
 patch[f+"/assignments/"+oldKey+"/active"]=false;
 patch[f+"/assignments/"+oldKey+"/rosterStatus"]="ADMIN_REPLACED_BY_423";
 patch[f+"/assignments/"+oldKey+"/supersededByAssignmentId"]=newAid;
 patch[f+"/assignments/"+newKey]={assignmentId:newAid,user:ev.targetUser,originalUser:ev.targetUser,formGroup:"fsags",sourceColumn:"Grnd_Cor",roleKey:"COR",assignmentScope:"TURNAROUND",workPartOrder:1,workPartTotal:1,active:true,admin423Replacement:ev};
 patch[f+"/taskStatus/"+oldKey+"/replacementStatus"]="ADMIN_REPLACED_BY_423";
 patch[f+"/taskStatus/"+oldKey+"/supersededByAssignmentId"]=newAid;
 patch[f+"/taskStatus/"+newKey]={schema:1,engine:"TASK_STATUS_V333",assignmentId:newAid,flightId:ev.flightId,opDate:ev.opDate,flightName:S(old.flightName||old.flightRaw),ownerUser:ev.targetUser,sourceColumn:"Grnd_Cor",roleKey:"COR",formGroup:"fsags",assignmentScope:"TURNAROUND",workPartOrder:1,workPartTotal:1,status:"UNCLAIMED",statusLabel:"CHƯA NHẬN",availability:"READY",updatedAtMs:ev.atMs};
 patch[f+"/assignmentHistory/"+evKey]={eventId:event,action:"ADMIN_REPLACE_421_WITH_423",...ev,preservedPreviousDraft:true};
 patch[f+"/workPartHistory/"+evKey]={eventId:event,type:"ADMIN_REPLACE_421_WITH_423",status:"PENDING",...ev,preservedPreviousDraft:true};
 patch[f+"/updatedAtMs"]=ev.atMs;
 return patch;
}
const db=path=>{if(typeof root.sagsV470Ref!=="function")throw Error("Chưa có kết nối Realtime Database.");return root.sagsV470Ref(path)};
const read=async path=>(await db(path).once("value")).val();
function isAdminLocal(){const s=root.__sagsGetSession?.()||{};return U(s.role)==="AD" && !!s.profile?.firebaseUid && s.profile.active!==false && s.profile.deleted!==true}
async function verifiedAdmin(){
 if(!isAdminLocal())throw Error("Chỉ ADMIN được tạo biểu mẫu thay thế.");
 const user=root.firebase?.auth?.().currentUser,s=root.__sagsGetSession?.()||{};
 if(!user||S(user.uid)!==S(s.profile.firebaseUid))throw Error("Phiên Firebase không khớp tài khoản ADMIN.");
 const snap=await root.firebase.firestore().collection("users").doc(user.uid).get({source:"server"});
 const p=snap.exists?snap.data()||{}:{};
 if(!["AD","ADMIN"].includes(U(p.role))||p.active!==true||p.deleted===true)throw Error("Firebase không xác nhận quyền ADMIN đang hoạt động.");
 const username=U(p.username||s.profile.username);
 if(!username)throw Error("Thiếu tên tài khoản ADMIN.");
 return {uid:user.uid,username};
}
function label(item){return [S(item.flightName||item.flightRaw),"·",owner(item),"·",U(item.assignmentLeg)==="ARR"?"ĐẾN":U(item.assignmentLeg)==="DEP"?"ĐI":"TOÀN CHUYẾN"].join(" ")}
function nowDate(){const d=new Date;return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")}
let busy=false,rows=[];
const val=id=>S(document.getElementById(id)?.value);
function status(msg,error=false){const e=document.getElementById("sags423Status");if(e){e.textContent=msg;e.style.color=error?"#b91c1c":"#24624d"}}
function initUI(){
 if(document.getElementById("sags423Modal"))return;
 const css=document.createElement("style");css.textContent="#sags423Modal{display:none;position:fixed;inset:0;z-index:18060;background:#07182acb;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;font-family:Arial,sans-serif}#sags423Modal.show{display:flex}#sags423Modal .sags423Card{background:#fff;color:#153650;width:min(94vw,680px);max-height:92vh;overflow:auto;border-radius:16px;padding:18px;box-shadow:0 20px 75px #0006;box-sizing:border-box}#sags423Modal label{display:block;font-weight:800;margin:13px 0 5px;font-size:12px}#sags423Modal input,#sags423Modal select,#sags423Modal textarea{display:block;width:100%;box-sizing:border-box;padding:11px;border:1px solid #b3c5d4;border-radius:9px;background:#fff;color:#193a56;font:14px Arial}#sags423Modal .sags423Actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:15px}#sags423Modal button{border:0;border-radius:9px;padding:11px 13px;background:#0b67b2;color:#fff;font-weight:800;cursor:pointer}#sags423Modal button.secondary{background:#e5ecf3;color:#204563}#sags423Modal .sags423Note{padding:10px;background:#eef6fc;border-radius:9px;font:12px/1.55 Arial;margin-top:12px}#sags423Modal button:disabled{opacity:.55}";
 document.head.appendChild(css);
 const box=document.createElement("div");box.id="sags423Modal";box.innerHTML='<div class="sags423Card" role="dialog" aria-modal="true" aria-label="ADMIN tạo 42.3 thay thế"><h3 style="margin:0;color:#0c5388">ADMIN · TẠO 42.3 THAY THẾ 42.1</h3><div class="sags423Note">Chỉ dành cho 42.1 đã được nhận/nhập. Biểu mẫu 42.1 gốc, chữ ký và dữ liệu đã nhập được giữ trong lịch sử, không sao chép vào 42.3.</div><label>Ngày khai thác</label><input type="date" id="sags423Date"><div class="sags423Actions"><button id="sags423Refresh" type="button">TẢI DANH SÁCH 42.1</button></div><label>Chọn đúng chuyến / nhân viên A</label><select id="sags423Old"><option value="">Chọn chuyến đã có 42.1…</option></select><div id="sags423Preview" class="sags423Note" aria-live="polite">Chưa chọn biểu mẫu.</div><label>Lý do thay thế (bắt buộc, tối thiểu 10 ký tự)</label><textarea id="sags423Reason" rows="3" maxlength="500" placeholder="Ví dụ: Roster điều chỉnh, A đảm nhiệm đầy đủ 42.3 thay cho 42.1"></textarea><div class="sags423Actions"><button id="sags423Create" type="button">XÁC NHẬN TẠO 42.3</button><button class="secondary" id="sags423Close" type="button">ĐÓNG</button></div><p id="sags423Status" role="status" aria-live="polite" style="font:700 12px/1.5 Arial"></p></div>';
 document.body.appendChild(box);
 document.getElementById("sags423Refresh").onclick=load;
 document.getElementById("sags423Create").onclick=create;
 document.getElementById("sags423Close").onclick=close;
 document.getElementById("sags423Old").onchange=preview;
}
function close(){if(!busy)document.getElementById("sags423Modal")?.classList.remove("show")}
function preview(){
 const id=val("sags423Old"),x=rows.find(r=>S(r.assignmentId)===id),el=document.getElementById("sags423Preview");
 if(el)el.textContent=x?"Chuyến: "+S(x.flightName||x.flightRaw)+" | Ngày: "+S(x.opDate)+" | Nhân viên: "+owner(x)+" | Mẫu cũ: 42.1 | Mẫu mới: 42.3 (tạo mới). Mẫu cũ được giữ để tra cứu.":"Chưa chọn biểu mẫu.";
}
async function load(){
 if(!isAdminLocal())return status("Chỉ ADMIN được phép sử dụng.",true);
 const date=val("sags423Date");
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return status("Chọn ngày khai thác hợp lệ.",true);
 status("Đang tải 42.1 từ Firebase...");
 try{
  const man=await read("roster_manifests/"+safe(date));
  rows=Object.values(man?.items||{}).filter(x=>x&&is421(x)&&x.active!==false).sort((a,b)=>label(a).localeCompare(label(b),"vi"));
  const sel=document.getElementById("sags423Old");sel.replaceChildren(new Option("Chọn chuyến đã có 42.1…",""));
  for(const x of rows)sel.add(new Option(label(x),S(x.assignmentId)));
  status(rows.length?"Có "+rows.length+" phân công 42.1 đang hoạt động.":"Không tìm thấy 42.1 còn hoạt động trong ngày đã chọn.");
  preview();
 }catch(e){rows=[];status("Không đọc được danh sách: "+S(e.message||e),true)}
}
async function open(){
 if(!isAdminLocal())return alert("Chỉ ADMIN được tạo biểu mẫu 42.3 thay thế.");
 initUI();const el=document.getElementById("sags423Modal");
 el.classList.add("show");document.getElementById("sags423Date").value=val("drManageDate")||nowDate();
 document.getElementById("sags423Reason").value="";await load();
}
async function create(){
 if(busy)return;busy=true;const button=document.getElementById("sags423Create");if(button)button.disabled=true;
 try{
  const actor=await verifiedAdmin(),date=val("sags423Date"),oldAid=val("sags423Old"),reason=val("sags423Reason");
  if(reason.length<10)throw Error("Nhập lý do thay thế tối thiểu 10 ký tự.");
  if(!oldAid||!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error("Chưa chọn đúng ngày và biểu mẫu 42.1.");
  const prefix="roster_manifests/"+safe(date);
  const manifest=await read(prefix);const old=manifest?.items?.[oldAid];
  if(!old||!is421(old)||old.active===false)throw Error("42.1 đã bị thay đổi hoặc thu hồi. Tải lại danh sách.");
  if(S(old.opDate)!==date)throw Error("Ngày của phân công không khớp.");
  if(manifest?.admin423Replacements?.[oldAid])throw Error("42.1 này đã được tạo 42.3 thay thế. Không thể tạo trùng.");
  const items=Object.values(manifest.items||{}).filter(x=>x&&x.active!==false);
  if(items.some(x=>is423(x)&&sameFlight(x,old)))throw Error("Chuyến đã có biểu mẫu 42.3 hoạt động. Không tạo trùng.");
  if(items.some(x=>U(x.formGroup)==="FSAGS551"&&sameFlight(x,old)))throw Error("Chuyến vẫn có biểu mẫu 55.1 đang hoạt động. Không thể đồng thời tạo 42.3 để tránh trùng công việc. ADMIN cần kiểm tra/xử lý 55.1 trước; dữ liệu 55.1 không bị thay đổi.");
  if(items.some(x=>is421(x)&&sameFlight(x,old)&&owner(x)===owner(old)&&S(x.assignmentId)!==oldAid))throw Error("A có nhiều phân công 42.1 trong cùng chuyến. Cần kiểm tra từng phần việc trước khi chuyển.");
  const fid=S(old.flightId);if(!fid)throw Error("42.1 thiếu flightId.");
  const flight=await read("flight_records/"+safe(date)+"/"+safe(fid));
  if(!flight||!flight.assignments?.[oldAid])throw Error("Không xác minh được chuyến và phân công gốc.");
  const [st,mail]=await Promise.all([read("roster_sessions/"+safe(oldAid)),read("roster_mail/"+safe(owner(old))+"/items/"+safe(oldAid))]);
  if(!st||typeof st!=="object")throw Error("Không xác minh được phiên 42.1 trên Firebase.");
  const result=makeReplacement(old,st,actor,reason,Date.now());
  if((await read("roster_sessions/"+safe(result.newAid)))!=null)throw Error("42.3 thay thế đã tồn tại, không thể ghi đè.");
  if(!root.confirm("ADMIN tạo biểu mẫu 42.3 MỚI cho "+owner(old)+" / "+S(old.flightName||old.flightRaw)+"?\n\n42.1 cũ sẽ ngừng phân công nhưng toàn bộ dữ liệu/chữ ký được giữ nguyên trong lịch sử.\nLý do: "+reason))return;
  // Verify the server state again immediately before the atomic multi-location update.
  const fresh=await read(prefix);
  if(fresh?.admin423Replacements?.[oldAid]||fresh?.items?.[oldAid]?.active===false||Object.values(fresh?.items||{}).some(x=>x&&x.active!==false&&is423(x)&&sameFlight(x,old)))throw Error("Roster vừa được thay đổi. Tải lại để tránh tạo trùng.");
  const patch=buildPatch(result,old,st,mail);
  status("Đang lưu phân công 42.3 và lưu lịch sử 42.1...");
  await db("").update(patch);
  try{root.dailyRosterRestartMailbox?.()}catch(_){}
  try{root.dailyRosterLoadAssignments?.()}catch(_){}
  await load();
  status("✓ Đã tạo 42.3 cho "+owner(old)+". 42.1 và dữ liệu gốc đã được lưu vào lịch sử.");
 }catch(e){status("Không thể tạo 42.3: "+S(e?.message||e),true)}
 finally{busy=false;if(button)button.disabled=false}
}
root.SAGSAdmin423Replacement=Object.freeze({open,close,makeReplacement,buildPatch,sameFlight});
})(typeof window!=="undefined"?window:globalThis);

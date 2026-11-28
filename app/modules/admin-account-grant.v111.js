/* V1.11 E-REPORT · lazy ADMIN feature grant + Firebase realtime permission synchronization. */
(function(root){
'use strict';
let v485PermEditing=null,v485PermRole='',v485PermDefaults={};
async function v485OpenPermissionEditor(id){if(currentRole!=="AD")return roleDenied("Chỉ AD được phân quyền.");try{if(!firebase.auth()?.currentUser)throw Error("Phiên Firebase ADMIN chưa sẵn sàng. Hãy đăng nhập lại.");
const snap=await firebase.firestore().collection("users").doc(id).get({source:"server"});
if(!snap.exists)throw Error("Không tìm thấy tài khoản users/{UID}. Hãy làm mới danh sách.");
const d=snap.data()||{},role=normalizeFirebaseOperationalRole(d.role);
if(d.deleted===true||d.active!==true)throw Error("Tài khoản đã khóa/xóa, không thể thêm quyền.");
if(role==="AD")throw Error("Tài khoản ADMIN đã có đầy đủ quyền quản trị.");
if(role==="RADIO_MANAGER")throw Error("Tài khoản Quản lý bộ đàm đang được cách ly. Không thể thêm quyền chuyến bay bằng mục này.");
const def=v485RoleDefaults(role),eff=v485Effective(d,role);v485PermEditing={id:id,d:d};v485PermRole=role;v485PermDefaults=def;const modal=document.getElementById("v485FeaturePermissionModal"),sub=document.getElementById("v485PermSub"),grid=document.getElementById("v485PermGrid"),st=document.getElementById("v485PermStatus");if(sub)sub.innerHTML=`<b>${escapeHtml(d.name||d.username||"")}</b> · ${escapeHtml(d.username||"")} · ${escapeHtml(v484DepartmentLabel(v484InferSystemDepartment(role,d)))} · ${escapeHtml(v484RoleLabel(role))}`;if(grid)grid.innerHTML=V485_FEATURE_KEYS.map(k=>{const m=SAGS_FEATURES_V485[k],changed=typeof v485Overrides(d)[k]==="boolean";return`<label class="v485PermItem"><input type="checkbox" data-v485-feature="${k}" ${eff[k]?"checked":""}><span><b>${escapeHtml(m.label)}${changed?' · <span style="color:#b36b00">GHI ĐÈ</span>':""}</b><small>${escapeHtml(m.note)} · Mặc định vai trò: <b>${def[k]?"CÓ":"KHÔNG"}</b></small></span></label>`}).join("");if(st)st.textContent="Chọn quyền nghiệp vụ cần cấp hoặc thu hồi, sau đó bấm LƯU QUYỀN.";if(modal){modal.style.display="flex";modal.setAttribute("aria-hidden","false")}}catch(e){alert("Không mở được THÊM QUYỀN: "+(e?.message||e))}}
async function v485SavePermissionEditor(){
 if(currentRole!=="AD"||!v485PermEditing)return;
 const st=document.getElementById("v485PermStatus"),
       btn=document.querySelector("#v485FeaturePermissionModal .v485Save"),
       editing=v485PermEditing;
 try{
  if(btn){btn.disabled=true;btn.textContent="ĐANG LƯU..."}
  if(st)st.textContent="Đang kiểm tra quyền ADMIN và lưu trên Firebase...";
  const auth=firebase.auth(),actor=auth?.currentUser;
  if(!actor?.uid)throw Error("Phiên Firebase ADMIN đã hết hạn. Hãy đăng nhập lại.");
  await actor.getIdToken(true);
  const store=firebase.firestore(),actorSnap=await store.collection("users").doc(actor.uid).get({source:"server"}),
        adminData=actorSnap.exists?actorSnap.data()||{}:{};
  if(adminData.active!==true||adminData.deleted===true||!["AD","ADMIN"].includes(String(adminData.role||"").toUpperCase()))
   throw Error("Firebase không xác nhận quyền quản trị ADMIN.");
  const chosen={};
  document.querySelectorAll("#v485FeaturePermissionModal [data-v485-feature]").forEach(x=>{chosen[x.dataset.v485Feature]=x.disabled?false:!!x.checked});
  if(V485_FEATURE_KEYS.some(k=>typeof chosen[k]!=="boolean"))throw Error("Danh sách quyền chưa tải đầy đủ.");
  const overrides={};V485_FEATURE_KEYS.forEach(k=>{if(chosen[k]!==!!v485PermDefaults[k])overrides[k]=chosen[k]});
  const ref=store.collection("users").doc(editing.id),expectedRole=v485PermRole;
  let rev=0;
  await store.runTransaction(async tx=>{
    const targetSnap=await tx.get(ref);
    if(!targetSnap.exists)throw Error("Không tìm thấy tài khoản Firebase.");
    const data=targetSnap.data()||{},role=normalizeFirebaseOperationalRole(data.role);
    if(data.deleted===true||data.active!==true)throw Error("Tài khoản đã khóa hoặc xóa, không thể cập nhật quyền.");
    if(role!==expectedRole)throw Error("Vai trò đã thay đổi. Hãy mở lại cửa sổ thêm quyền.");
    if(role==="AD"||role==="RADIO_MANAGER")throw Error("Không cấp quyền chuyến bay cho tài khoản đặc quyền/cách ly.");
    rev=Math.max(Date.now(),Number(data.permissionRevV485||0)+1);
    const change=V485_FEATURE_KEYS.filter(k=>!!v485Effective(data,role)[k]!==chosen[k]);
    tx.update(ref,{featureOverridesV485:overrides,permissionRevV485:rev,permissionRoleV485:role,
      permissionLastChangeV485:{byUid:actor.uid,atMs:rev,changedKeys:change},
      updatedAtMs:rev,updatedBy:currentActor()});
  });
  const verify=await ref.get({source:"server"});
  if(!verify.exists)throw Error("Hồ sơ vừa lưu không còn tồn tại.");
  const saved=verify.data()||{},stored=saved.featureOverridesV485&&typeof saved.featureOverridesV485==="object"?saved.featureOverridesV485:{};
  const clean=o=>Object.fromEntries(Object.keys(o||{}).sort().filter(k=>typeof o[k]==="boolean").map(k=>[k,!!o[k]]));
  if(JSON.stringify(clean(stored))!==JSON.stringify(clean(overrides))||Number(saved.permissionRevV485||0)!==rev)
    throw Error("Firebase chưa xác nhận đúng quyền vừa lưu.");
  v485PermEditing.d={...editing.d,...saved};
  const username=normalizePersonalUsername(saved.username||editing.d.username||"");
  let signalOk=false;
  try{
   if(username&&typeof sagsV470Ref==="function"){
    await sagsV470Ref("account_permissions/"+sagsV470Safe(username)).set({rev:rev,updatedAtMs:rev,source:"ADMIN_FEATURE_GRANT_V111"});
    signalOk=true;
   }
  }catch(e){console.warn("V1.11 RTDB permission signal failed; Firestore remains authoritative",e)}
  if(st)st.textContent="✓ ĐÃ LƯU & KIỂM TRA QUYỀN THÀNH CÔNG."+(signalOk?" Thiết bị đang mở sẽ tự cập nhật.":" Nếu thiết bị chưa nhận quyền mới, đăng xuất rồi đăng nhập lại.");
  try{await refreshAccountManager()}catch(e){console.info("V1.11 list refresh failed after successful grant",e)}
  setTimeout(()=>{v485PermEditing=null;root.v485ClosePermissionEditor?.()},1300);
 }catch(e){console.error("V1.11 save permission",e);if(st)st.textContent="KHÔNG LƯU ĐƯỢC: "+(e?.message||e)}
 finally{if(btn){btn.disabled=false;btn.textContent="LƯU QUYỀN"}}
}

let liveUid="",unsubscribe=null;
function stop(){
 try{unsubscribe?.()}catch(e){}
 unsubscribe=null;liveUid="";
 try{root.sagsV485StopPermissionSignal?.()}catch(e){}
}
function ensureListener(){
 const session=root.__sagsGetSession?.(),p=session?.profile,uid=String(p?.firebaseUid||p?.uid||"").trim(),actor=firebase.auth?.().currentUser;
 if(!uid||!actor||actor.uid!==uid){if(unsubscribe)stop();return}
 if(liveUid===uid&&unsubscribe)return;
 stop();liveUid=uid;
 try{root.sagsV485StartPermissionSignal?.()}catch(e){console.info("Permission RTDB start",e?.message||e)}
 try{
  unsubscribe=firebase.firestore().collection("users").doc(uid).onSnapshot(snap=>{
   const live=root.__sagsGetSession?.()?.profile;
   if(!live||String(live.firebaseUid||live.uid||"")!==uid)return;
   const d=snap.exists?snap.data()||{}:{};
   if(!snap.exists||d.deleted===true||d.active!==true){
    alert("Tài khoản đã bị khóa/xóa trên Firebase. Hệ thống sẽ đăng xuất.");
    try{roleLogout()}catch(e){root.roleLogout?.()}return;
   }
   const rev=Number(d.permissionRevV485||0);
   if(!rev||rev<=Number(live.permissionRevV485||0))return;
   Object.assign(live,{
    featureOverridesV485:d.featureOverridesV485&&typeof d.featureOverridesV485==="object"?d.featureOverridesV485:{},
    permissionRevV485:rev,permissionRoleV485:String(d.permissionRoleV485||d.role||""),
    role:normalizeFirebaseOperationalRole(d.role),roleCode:String(d.roleCode||live.roleCode||"")
   });
   currentRole=live.role;
   try{localStorage.setItem(PERSONAL_SESSION_KEY,JSON.stringify(live))}catch(e){}
   applyRoleUI();updateFormMenuForCurrentFlight();
  },e=>{console.warn("V1.11 Firebase live permission listener",e?.message||e)});
 }catch(e){stop();console.warn("V1.11 permission subscription",e?.message||e)}
}
root.SAGSAdminAccountGrantV111=Object.freeze({open:v485OpenPermissionEditor,save:v485SavePermissionEditor,ensureListener,stop});
root.addEventListener("sags:home-shown",ensureListener);
root.addEventListener("beforeunload",stop);

})(window);

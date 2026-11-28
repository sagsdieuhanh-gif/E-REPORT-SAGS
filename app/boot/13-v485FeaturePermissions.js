const SAGS_FEATURES_V485={FLIGHTS:{label:"CHUYẾN / RAMP",note:"Mở danh sách chuyến và vào tờ Ramp"},FSAGS423:{label:"FSAGS 42.3",note:"Mở/nhập biểu mẫu Ramp 42.3"},FSAGS421:{label:"FSAGS 42.1",note:"Mở/nhập biểu mẫu Ramp 42.1"},FSAGS551:{label:"FSAGS 55.1",note:"Mở/nhập biểu mẫu Ramp 55.1"},BBBT:{label:"BBBT",note:"Biên bản bất thường F/SAGS-CXR/56"},FSAGS09:{label:"FSAGS 09",note:"PVHK / Kết sổ"},FSAGS208:{label:"FSAGS 208",note:"Loading Detail Sheet / Kho Hàng"},FINAL:{label:"FINAL",note:"Mở khu vực FINAL theo quyền được AD cấp"},EXPORT_RAMP:{label:"XUẤT RAMP / BBBT",note:"Xuất PDF biểu mẫu được phép sử dụng"},FLEET:{label:"FLEET TÀU BAY",note:"Quản lý Fleet/A-C REG/A-C Type/ZONE"},QUICK_TIME:{label:"NHẬP GIỜ NHANH",note:"Dùng màn ⏱ NHẬP GIỜ trên FSAGS 42.1/42.3"},DAILY_ROSTER:{label:"DAILY ROSTER",note:"Upload roster, tạo/phân công biểu mẫu và chuyển người phụ trách"}};const V485_FEATURE_KEYS=Object.keys(SAGS_FEATURES_V485);function v485Blank(){return Object.fromEntries(V485_FEATURE_KEYS.map(k=>[k,false]))}function v485RoleDefaults(role){const raw=String(role||"").trim().toUpperCase();const r=raw==="ĐH"||raw==="DIEU HANH"||raw==="ĐIỀU HÀNH"||raw==="DIEUHANH"?"DH":raw;const p=v485Blank(),on=(...ks)=>ks.forEach(k=>p[k]=true);if(r==="AD")on(...V485_FEATURE_KEYS);else if(r==="DH")on("FLIGHTS","FSAGS423","FSAGS421","FSAGS551","BBBT","FSAGS208","FINAL","EXPORT_RAMP","QUICK_TIME");else if(r==="CBTT")on("FSAGS208","FINAL");else if(r==="PVHK")on("FSAGS09","FINAL");else if(r==="KH")on("FSAGS208");else if(r==="VIEWER")on("FLIGHTS","FSAGS423","FSAGS421","FSAGS551","BBBT","FSAGS09","FSAGS208","FINAL");return p}function v485Overrides(profile){const x=profile?.featureOverridesV485;return x&&typeof x==="object"?x:{}}function v485Effective(profile=currentUserProfile,role=currentRole){const r=String(role||profile?.role||"").toUpperCase();if(r==="RADIO_MANAGER")return v485Blank();if(r==="AD")return Object.fromEntries(V485_FEATURE_KEYS.map(k=>[k,true]));const p=v485RoleDefaults(r),o=v485Overrides(profile);V485_FEATURE_KEYS.forEach(k=>{if(typeof o[k]==="boolean")p[k]=o[k]});return p}function v485Can(feature,profile=currentUserProfile,role=currentRole){return!!v485Effective(profile,role)[String(feature||"").toUpperCase()]}function v485GroupFeature(group){return{fsags:"FSAGS423",tvjgof035:"FSAGS423",fsags421:"FSAGS421",fsags551:"FSAGS551",bbbt:"BBBT",fsags09:"FSAGS09",loading208:"FSAGS208"}[String(group||"")]||""}window.v485Can=v485Can;window.v485Effective=v485Effective;roleCanForm=function(role,group){const f=v485GroupFeature(group);return f?v485Can(f,currentUserProfile,role):false};roleCanFinal=function(role){return v485Can("FINAL",currentUserProfile,role)};openFlightSessions=function(){if(!v485Can("FLIGHTS"))return roleDenied("Tài khoản chưa được AD cấp quyền CHUYẾN / RAMP.");return _roleOpenFlightSessions()};openFS09SheetManager=function(){if(!v485Can("FSAGS09"))return roleDenied("Tài khoản chưa được AD cấp quyền FSAGS 09.");return _roleOpenFS09SheetManager()};openFinalSheetManager=function(){if(!v485Can("FINAL"))return roleDenied("Tài khoản chưa được AD cấp quyền FINAL.");return _roleOpenFinalSheetManager()};const v485OpenKH208Base=openKH208Manager;openKH208Manager=function(){if(!v485Can("FSAGS208"))return roleDenied("Tài khoản chưa được AD cấp quyền FSAGS 208.");return v485OpenKH208Base()};openExportChoiceMenu=function(){const exporting208=getCurrentExportMainForm()==="loading208";if(!(exporting208?v485Can("FSAGS208"):v485Can("EXPORT_RAMP")))return roleDenied("Tài khoản chưa được AD cấp quyền XUẤT RAMP / BBBT.");const out=_roleOpenExportChoiceMenu();try{const main=getCurrentExportMainForm(),grid=document.getElementById("exportChoiceGrid"),summary=document.getElementById("exportFlightSummary"),meta=currentFlightSessionMeta?.(),flightName=flightSessionDisplayName(meta)||deriveFlightSessionLabel()||"Chưa đặt tên chuyến",allowed=[];if(grid){[...grid.querySelectorAll("button")].forEach(b=>{const txt=(b.textContent||"").toUpperCase();let ok=true;if(txt.includes("BBBT")){ok=v485Can("BBBT");if(ok)allowed.push("BBBT")}else{const f=v485GroupFeature(main);ok=!!f&&v485Can(f);if(ok)allowed.push((b.textContent||"").replace(/^\s*Xuất\s*/i,"").trim())}if(!ok)b.remove()})}if(summary)summary.innerHTML="<strong>"+escapeHtml(flightName)+"</strong>"+escapeHtml(allowed.length?" · "+allowed.join(" + "):"");if(grid&&!grid.children.length){closeExportChoiceMenu();return roleDenied("Không có biểu mẫu nào được phép xuất trong chuyến này.")}}catch(e){console.info("V4.85 export filter",e?.message||e)}return out};sendReport=async function(kind="all"){const exporting208=kind==="loading208"&&getCurrentExportMainForm()==="loading208";if(!(exporting208?v485Can("FSAGS208"):v485Can("EXPORT_RAMP")))return roleDenied("Tài khoản chưa được AD cấp quyền xuất.");const main=getCurrentExportMainForm(),needMain=v485GroupFeature(main);if(kind==="bbbt"&&!v485Can("BBBT"))return roleDenied("Không có quyền xuất BBBT.");if(kind==="all"&&(needMain&&!v485Can(needMain)||!v485Can("BBBT")))return roleDenied("Không đủ quyền xuất bộ biểu mẫu này.");if(kind!=="bbbt"&&kind!=="all"){const f=v485GroupFeature(kind);if(f&&!v485Can(f))return roleDenied("Không có quyền xuất biểu mẫu này.")}const out=await _roleSendReport(kind);writeAuditLog("EXPORT_REPORT",{kind:kind,session:activeFlightSessionId||""});return out};const v485ApplyRoleUiBase=applyRoleUI;applyRoleUI=function(){v485ApplyRoleUiBase();roleSetVisible("roleBtnFlights",v485Can("FLIGHTS"));roleSetVisible("fs09QuickBtn",v485Can("FSAGS09"));roleSetVisible("khQuickBtn",v485Can("FSAGS208"));roleSetVisible("finalFormsQuickBtn",v485Can("FINAL"));roleSetVisible("roleBtnFleet",v138CanManageFleet());try{v485EnsureFirestorePermissionSignal()}catch(e){console.info("V1.11 permission listener",e?.message||e)}};window.applyRoleUI=applyRoleUI;const v485UpdateFormMenuBase=updateFormMenuForCurrentFlight;updateFormMenuForCurrentFlight=function(){v485UpdateFormMenuBase();const map={formMenu423:"FSAGS423",formMenu421:"FSAGS421",formMenu551:"FSAGS551",formMenu09:"FSAGS09",formMenu208:"FSAGS208",formMenuBBBT:"BBBT",formMenuFinal:"FINAL"};Object.entries(map).forEach(([id,f])=>{const el=document.getElementById(id);if(el)el.style.display=v485Can(f)?"":"none"})};window.updateFormMenuForCurrentFlight=updateFormMenuForCurrentFlight;const v485AccountRowBase=accountRowHtml;accountRowHtml=function(d,id){let html=v485AccountRowBase(d,id);const btn=`<button onclick='v485OpenPermissionEditor(${JSON.stringify(id)})'>PHÂN QUYỀN</button>`;html=html.replace("<button onclick='adminResetAccountPassword",btn+"<button onclick='adminResetAccountPassword");return html};window.accountRowHtml=accountRowHtml;let v485PermEditing=null,v485PermRole="",v485PermDefaults={};async function v485OpenPermissionEditor(id){if(currentRole!=="AD")return roleDenied("Chỉ AD được phân quyền.");try{if(!firebase.auth()?.currentUser)throw Error("Phiên Firebase ADMIN chưa sẵn sàng. Hãy đăng nhập lại.");
const snap=await firebase.firestore().collection("users").doc(id).get({source:"server"});
if(!snap.exists)throw Error("Không tìm thấy tài khoản users/{UID}. Hãy làm mới danh sách.");
const d=snap.data()||{},role=normalizeFirebaseOperationalRole(d.role);
if(d.deleted===true||d.active!==true)throw Error("Tài khoản đã khóa/xóa, không thể thêm quyền.");
if(role==="AD")throw Error("Tài khoản ADMIN đã có đầy đủ quyền quản trị.");
if(role==="RADIO_MANAGER")throw Error("Tài khoản Quản lý bộ đàm đang được cách ly. Không thể thêm quyền chuyến bay bằng mục này.");
const def=v485RoleDefaults(role),eff=v485Effective(d,role);v485PermEditing={id:id,d:d};v485PermRole=role;v485PermDefaults=def;const modal=document.getElementById("v485FeaturePermissionModal"),sub=document.getElementById("v485PermSub"),grid=document.getElementById("v485PermGrid"),st=document.getElementById("v485PermStatus");if(sub)sub.innerHTML=`<b>${escapeHtml(d.name||d.username||"")}</b> · ${escapeHtml(d.username||"")} · ${escapeHtml(v484DepartmentLabel(v484InferSystemDepartment(role,d)))} · ${escapeHtml(v484RoleLabel(role))}`;if(grid)grid.innerHTML=V485_FEATURE_KEYS.map(k=>{const m=SAGS_FEATURES_V485[k],changed=typeof v485Overrides(d)[k]==="boolean";return`<label class="v485PermItem"><input type="checkbox" data-v485-feature="${k}" ${eff[k]?"checked":""}><span><b>${escapeHtml(m.label)}${changed?' · <span style="color:#b36b00">GHI ĐÈ</span>':""}</b><small>${escapeHtml(m.note)} · Mặc định vai trò: <b>${def[k]?"CÓ":"KHÔNG"}</b></small></span></label>`}).join("");if(st)st.textContent="Chọn quyền nghiệp vụ cần cấp hoặc thu hồi, sau đó bấm LƯU QUYỀN.";if(modal){modal.style.display="flex";modal.setAttribute("aria-hidden","false")}}catch(e){alert("Không mở được THÊM QUYỀN: "+(e?.message||e))}}window.v485OpenPermissionEditor=v485OpenPermissionEditor;function v485ClosePermissionEditor(){const m=document.getElementById("v485FeaturePermissionModal");if(m){m.style.display="none";m.setAttribute("aria-hidden","true")}v485PermEditing=null}window.v485ClosePermissionEditor=v485ClosePermissionEditor;function v485ResetPermissionEditor(){document.querySelectorAll("[data-v485-feature]").forEach(x=>{x.checked=!!v485PermDefaults[x.dataset.v485Feature]});const st=document.getElementById("v485PermStatus");if(st)st.textContent="Đã đưa lựa chọn về mặc định vai trò. Bấm LƯU QUYỀN để áp dụng."}window.v485ResetPermissionEditor=v485ResetPermissionEditor;async function v485SavePermissionEditor(){
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
  setTimeout(v485ClosePermissionEditor,1300);
 }catch(e){console.error("V1.11 save permission",e);if(st)st.textContent="KHÔNG LƯU ĐƯỢC: "+(e?.message||e)}
 finally{if(btn){btn.disabled=false;btn.textContent="LƯU QUYỀN"}}
}window.v485SavePermissionEditor=v485SavePermissionEditor;let v485PermRef=null,v485PermCb=null;function v485StopPermissionSignal(){try{if(v485PermRef&&v485PermCb)v485PermRef.off("value",v485PermCb)}catch(e){}v485PermRef=null;v485PermCb=null}function v485StartPermissionSignal(){v485StopPermissionSignal();const u=normalizePersonalUsername(currentUserProfile?.username||"");if(!u)return;try{v485PermRef=sagsV470Ref("account_permissions/"+sagsV470Safe(u));v485PermCb=async s=>{const rev=Number(s.val()?.rev||0);if(!rev||rev<=Number(currentUserProfile?.permissionRevV485||0))return;try{const uid=String(currentUserProfile?.firebaseUid||currentUserProfile?.uid||currentUserProfile?.docId||"");if(!uid)throw new Error("firebase-profile-uid-missing");const snap=await firebase.firestore().collection("users").doc(uid).get();if(!snap.exists||snap.data()?.active===false){alert("Tài khoản đã bị khóa hoặc không còn tồn tại.");roleLogout();return}const d=snap.data()||{};currentUserProfile={...currentUserProfile,role:String(d.role||currentRole).toUpperCase(),roleCode:String(d.roleCode||currentUserProfile?.roleCode||""),departmentCode:String(d.departmentCode||d.systemDepartment||currentUserProfile?.departmentCode||""),groupCode:String(d.groupCode||currentUserProfile?.groupCode||""),positionCode:String(d.positionCode||currentUserProfile?.positionCode||""),jobTitle:String(d.jobTitle||currentUserProfile?.jobTitle||""),unit:String(d.unit||d.workUnit||currentUserProfile?.unit||""),workUnit:String(d.workUnit||d.unit||currentUserProfile?.workUnit||""),featureOverridesV485:d.featureOverridesV485&&typeof d.featureOverridesV485==="object"?d.featureOverridesV485:{},permissionRevV485:Number(d.permissionRevV485||rev),systemDepartment:String(d.systemDepartment||d.departmentCode||v484InferSystemDepartment(d.role,d)||"")};currentRole=currentUserProfile.role;localStorage.setItem(PERSONAL_SESSION_KEY,JSON.stringify(currentUserProfile));applyRoleUI();updateFormMenuForCurrentFlight()}catch(e){console.info("V4.85 permission refresh",e?.message||e)}};v485PermRef.on("value",v485PermCb)}catch(e){console.info("V4.85 permission signal start",e?.message||e)}}let v485FsPermissionUnsub=null,v485FsPermissionUid="";
function v485StopFirestorePermissionSignal(){
 try{v485FsPermissionUnsub?.()}catch(e){}
 v485FsPermissionUnsub=null;v485FsPermissionUid="";
}
function v485EnsureFirestorePermissionSignal(){
 const uid=String(currentUserProfile?.firebaseUid||currentUserProfile?.uid||"").trim(),
       actor=firebase.auth?.().currentUser;
 if(!uid||!actor||actor.uid!==uid){if(v485FsPermissionUnsub)v485StopFirestorePermissionSignal();return}
 if(v485FsPermissionUid===uid&&v485FsPermissionUnsub)return;
 v485StopFirestorePermissionSignal();
 v485FsPermissionUid=uid;
 // Initialize the existing RTDB signal AFTER Firebase login, not only at initial page boot.
 try{v485StartPermissionSignal()}catch(e){console.info("V1.11 RTDB signal fallback",e?.message||e)}
 try{
  v485FsPermissionUnsub=firebase.firestore().collection("users").doc(uid).onSnapshot(snap=>{
   if(!currentUserProfile||String(currentUserProfile.firebaseUid||currentUserProfile.uid||"")!==uid)return;
   const d=snap.exists?snap.data()||{}:{};
   if(!snap.exists||d.deleted===true||d.active!==true){
    alert("Tài khoản đã bị khóa/xóa hoặc không còn trên Firebase. Hệ thống sẽ đăng xuất.");
    roleLogout();return;
   }
   const rev=Number(d.permissionRevV485||0);
   if(!rev||rev<=Number(currentUserProfile?.permissionRevV485||0))return;
   currentUserProfile={
    ...currentUserProfile,role:normalizeFirebaseOperationalRole(d.role),
    roleCode:String(d.roleCode||currentUserProfile.roleCode||""),
    featureOverridesV485:d.featureOverridesV485&&typeof d.featureOverridesV485==="object"?d.featureOverridesV485:{},
    permissionRevV485:rev,permissionRoleV485:String(d.permissionRoleV485||d.role||"")
   };
   currentRole=currentUserProfile.role;
   try{localStorage.setItem(PERSONAL_SESSION_KEY,JSON.stringify(currentUserProfile))}catch(e){}
   applyRoleUI();updateFormMenuForCurrentFlight();
  },e=>{console.warn("V1.11 Firestore permission realtime unavailable",e?.message||e)});
 }catch(e){v485StopFirestorePermissionSignal();console.info("V1.11 permission subscribe",e?.message||e)}
}
window.addEventListener("beforeunload",()=>{v485StopPermissionSignal();v485StopFirestorePermissionSignal()});
try{firebase.auth().onAuthStateChanged(user=>{
 if(!user){v485StopPermissionSignal();v485StopFirestorePermissionSignal();return}
 setTimeout(()=>{try{v485EnsureFirestorePermissionSignal()}catch(e){}},600)
})}catch(e){}
setTimeout(()=>{try{applyRoleUI();updateFormMenuForCurrentFlight();v485EnsureFirestorePermissionSignal()}catch(e){console.info("V1.11 permission init",e?.message||e)}},180);

let v116AccountManagerItems=[];function v116NormPersonName(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/Đ/g,"D").replace(/đ/g,"d").toUpperCase().replace(/[^A-Z0-9 ]/g," ").replace(/\s+/g," ").trim()}function v116AccountFixedRow(){return'<div class="sagsUserRow" style="border-color:#9dbce0;background:#f5f9ff"><div class="sagsUserMain"><b>AD · FIREBASE AUTH</b><div class="sagsUserMeta">TK: AD · <span class="v18CodePill">ADMIN</span><span class="v18CodePill">ADMIN</span><span class="v18CodePill">AD</span> · Chức danh: <b>Quản trị hệ thống</b> <span class="v18CodePill">QUAN_TRI_HE_THONG</span> · Xác thực: <b>Firebase Authentication</b></div></div><div class="sagsUserMeta">Toàn quyền · không xóa. AD vẫn có thể tạo thêm tài khoản cá nhân role AD đầy đủ Phòng/Nhóm/Vai trò/Chức danh.</div></div>'}function v116RenderAccountManagerList(){const list=document.getElementById("accountManagerList"),input=document.getElementById("v116AccountNameSearch"),note=document.getElementById("v116AccountSearchResult");if(!list)return;const raw=String(input?.value||"").trim(),tokens=v116NormPersonName(raw).split(" ").filter(Boolean);let arr=v116AccountManagerItems.slice();if(tokens.length)arr=arr.filter(x=>{const name=v116NormPersonName(x?.name||"");return tokens.every(t=>name.includes(t))});list.innerHTML=v116AccountFixedRow()+(arr.length?arr.map(x=>accountRowHtml(x,x.id)).join(""):tokens.length?"<div class='sagsUserMeta'>Không tìm thấy nhân viên có họ tên phù hợp.</div>":"<div class='sagsUserMeta'>Chưa có tài khoản cá nhân.</div>");if(note)note.textContent=tokens.length?`Tìm thấy ${arr.length}/${v116AccountManagerItems.length} tài khoản theo họ tên “${raw}”.`:`Có ${v116AccountManagerItems.length} tài khoản cá nhân. Gõ họ tên để lọc nhanh.`}function v116FilterAccountManager(){v116RenderAccountManagerList()}window.v116FilterAccountManager=v116FilterAccountManager;refreshAccountManager=async function(){
 if(currentRole!=="AD")return;
 const list=document.getElementById("accountManagerList");if(list)list.innerHTML="Đang tải tài khoản Firebase...";
 try{
  const snap=await firebase.firestore().collection("users").get(),arr=[];
  snap.forEach(doc=>{
   const d=doc.data()||{},username=normalizePersonalUsername(d.username||"");
   if(username==="AD"||d.deleted===true)return;
   arr.push({id:doc.id,uid:doc.id,...d,role:normalizeFirebaseOperationalRole(d.role)});
  });
  const visible=arr.filter(x=>["PĐH","ADMIN","PVHK"].includes(v18LegacyDept(x,x.role)));
  const ord={ADMIN:0,"PĐH":1,PVHK:2};
  visible.sort((a,b)=>(ord[v18LegacyDept(a,a.role)]??9)-(ord[v18LegacyDept(b,b.role)]??9)||String(a.name||a.username||"").localeCompare(String(b.name||b.username||""),"vi"));
  v116AccountManagerItems=visible;
  void v466PublishUserCatalogFromItems(visible);
  v116RenderAccountManagerList();
 }catch(e){if(list)list.textContent="Không tải được danh sách Firebase users: "+(e?.message||e)}
};window.refreshAccountManager=refreshAccountManager;

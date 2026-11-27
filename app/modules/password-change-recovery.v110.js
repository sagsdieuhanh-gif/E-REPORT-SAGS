/* SAGS V1.10 password confirmation and recovery; loaded on demand only.
 * Uses the live, verified Firebase personal session from 06-legacy.js.
 */
(function(root){
'use strict';
async function sagsSavePasswordChangeConfirmation(u){
await firebase.firestore().collection("users").doc(u.uid).set({mustChangePassword:false,passwordChangedAtMs:Date.now()},{merge:true});
currentUserProfile={...currentUserProfile,mustChangePassword:false,verifiedAtMs:Date.now()};
localStorage.setItem(PERSONAL_SESSION_KEY,JSON.stringify(currentUserProfile));
forcePasswordChangeOpen=false;
["ownCurrentPassword","ownNewPassword","ownConfirmPassword"].forEach(id=>{const e=document.getElementById(id);if(e)e.value=""});
setChangePasswordStatus("✓ Mật khẩu Firebase đã được đổi và hồ sơ đã xác nhận thành công.");
setTimeout(closeChangePasswordModal,850);
}
function sagsPasswordError(e){
const code=String(e?.code||"").toLowerCase(),msg=String(e?.message||e||"");
if(code.includes("wrong-password")||code.includes("invalid-credential"))return "Mật khẩu hiện tại không đúng. Nếu trước đó đã đổi nhưng hồ sơ chưa cập nhật, hãy nhập MẬT KHẨU MỚI vào ô hiện tại và chọn XÁC NHẬN ĐÃ ĐỔI.";
if(code.includes("weak-password"))return "Mật khẩu mới quá yếu theo Firebase. Vui lòng chọn mật khẩu khác mạnh hơn.";
if(code.includes("too-many-requests"))return "Firebase tạm khóa vì thử nhiều lần. Hãy thử lại sau.";
if(code.includes("requires-recent-login"))return "Phiên đăng nhập cần xác thực lại. Đăng xuất rồi đăng nhập bằng mật khẩu hiện tại.";
if(code.includes("permission-denied"))return "Firebase Firestore từ chối cập nhật hồ sơ (permission-denied). AD cần Publish Firebase Rules V1.10.";
if(code.includes("network-request-failed")||code.includes("unavailable"))return "Không có kết nối ổn định với Firebase. Kiểm tra mạng và thử lại.";
return "Firebase báo lỗi "+(code||"unknown")+": "+msg;
}
async function v110ChangeOwnPassword(){
if(!currentUserProfile?.firebaseUid)return setChangePasswordStatus("Không xác định được phiên Firebase.",true);
const current=String(document.getElementById("ownCurrentPassword")?.value||""),
 next=String(document.getElementById("ownNewPassword")?.value||""),
 confirmPass=String(document.getElementById("ownConfirmPassword")?.value||"");
if(!current)return setChangePasswordStatus("Nhập mật khẩu hiện tại.",true);
if(next.length<6)return setChangePasswordStatus("Mật khẩu mới tối thiểu 6 ký tự.",true);
if(next==="123456")return setChangePasswordStatus("Không được dùng mật khẩu khởi tạo làm mật khẩu mới.",true);
if(next!==confirmPass)return setChangePasswordStatus("Hai lần nhập mật khẩu mới chưa giống nhau.",true);
if(next===current)return setChangePasswordStatus("Mật khẩu mới phải khác mật khẩu hiện tại.",true);
let firebaseChanged=false;
try{
 const auth=adFirebaseGetAuth(),u=auth?.currentUser;
 if(!u||String(u.uid)!==String(currentUserProfile.firebaseUid))throw new Error("firebase-session-missing");
 setChangePasswordStatus("Đang xác thực mật khẩu hiện tại...");
 const cred=firebase.auth.EmailAuthProvider.credential(String(u.email||currentUserProfile.firebaseEmail||""),current);
 await u.reauthenticateWithCredential(cred);
 await u.updatePassword(next);
 firebaseChanged=true;
 setChangePasswordStatus("✓ Mật khẩu Firebase đã đổi. Đang xác nhận hồ sơ...");
 await sagsSavePasswordChangeConfirmation(u);
}catch(e){
 if(firebaseChanged){
  document.getElementById("ownCurrentPassword").value="";
  document.getElementById("ownNewPassword").value="";
  document.getElementById("ownConfirmPassword").value="";
  setChangePasswordStatus("✓ MẬT KHẨU FIREBASE ĐÃ ĐỔI THÀNH CÔNG. Tuy nhiên hồ sơ chưa được xác nhận: "+sagsPasswordError(e)+" Nhập mật khẩu MỚI vào ô 'Mật khẩu hiện tại' và bấm 'XÁC NHẬN ĐÃ ĐỔI' sau khi Firebase Rules được cập nhật.",true);
 }else setChangePasswordStatus("Không đổi được mật khẩu Firebase: "+sagsPasswordError(e),true);
}
}
async function v110ConfirmOwnChangedPassword(){
if(!currentUserProfile?.firebaseUid)return setChangePasswordStatus("Không xác định được tài khoản Firebase.",true);
const current=String(document.getElementById("ownCurrentPassword")?.value||"");
if(!current)return setChangePasswordStatus("Nhập mật khẩu ĐANG CÓ HIỆU LỰC vào ô 'Mật khẩu hiện tại' để xác nhận.",true);
if(current==="123456")return setChangePasswordStatus("Đây vẫn là mật khẩu khởi tạo. Hãy đặt mật khẩu mới trước, không thể đánh dấu đã đổi.",true);
try{
 const auth=adFirebaseGetAuth(),u=auth?.currentUser;
 if(!u||String(u.uid)!==String(currentUserProfile.firebaseUid))throw new Error("firebase-session-missing");
 setChangePasswordStatus("Đang xác minh mật khẩu Firebase đang có hiệu lực...");
 const cred=firebase.auth.EmailAuthProvider.credential(String(u.email||currentUserProfile.firebaseEmail||""),current);
 await u.reauthenticateWithCredential(cred);
 setChangePasswordStatus("Đã xác minh Firebase. Đang đồng bộ xác nhận hồ sơ...");
 await sagsSavePasswordChangeConfirmation(u);
}catch(e){setChangePasswordStatus("Chưa đồng bộ được hồ sơ: "+sagsPasswordError(e),true)}
}
root.SAGSPasswordChangeV110=Object.freeze({change:v110ChangeOwnPassword,confirm:v110ConfirmOwnChangedPassword});
})(window);

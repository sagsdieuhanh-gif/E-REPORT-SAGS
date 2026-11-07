/*
 * Reset only the reusable personal signature template. Immutable reports,
 * radio custody photos and signed flight records must never be modified.
 * Lazy-loaded from Signature Sample on a genuine user click.
 */
let resetBusy=false;
function signatureText(id,value){
 const node=document.getElementById(id);
 if(node)node.textContent=value;
}
function clearImagePreview(){
 const preview=document.getElementById('signatureTemplatePreview');
 if(preview){preview.removeAttribute('src');preview.style.display='none'}
 const file=document.getElementById('signatureImageInput');
 if(file)file.value='';
 const full=document.getElementById('signatureFullNameInput');
 if(full)full.value='';
}
export async function clearSavedSignatureTemplate(){
 if(resetBusy)return false;
 const key=sagsOwnedKey(SIGN_TEMPLATE_KEY);
 const template=getSavedTemplate();
 if(!template?.signature){
  alert('Tài khoản này chưa có mẫu chữ ký đã lưu. Bấm Lấy mẫu để tạo chữ ký mới.');
  return false;
 }
 const account=(typeof currentUserProfile!=='undefined'&&currentUserProfile)||{};
 const cloudId=String(account.docId||'').trim();
 const authUid=window.firebase?.auth?.()?.currentUser?.uid||'';
 if(!confirm('XÓA MẪU CHỮ KÝ ĐÃ LƯU CỦA TÀI KHOẢN NÀY?\n\nMẫu trên thiết bị và mẫu trên Firebase (nếu có) sẽ bị xóa, không thể khôi phục từ màn hình này.\n\nChữ ký đã gắn trong các report/biểu mẫu đã ký và lịch sử ký nhận bộ đàm sẽ KHÔNG bị xóa.'))return false;
 const control=document.getElementById('sagsClearSavedSignature');
 resetBusy=true;if(control)control.disabled=true;
 signatureText('signatureSampleStatus','Đang xóa mẫu chữ ký đã lưu…');
 try{
  // Never report a complete deletion if a previously uploaded cloud copy
  // remains. This is an explicit user action, not background cleanup.
  if(cloudId){
   if(navigator.onLine===false)throw Error('Đang ngoại tuyến. Cần kết nối mạng để xóa cả mẫu chữ ký trên Firebase; chưa xóa dữ liệu cục bộ.');
   if(!authUid)throw Error('Phiên đăng nhập Firebase chưa được xác minh. Vui lòng đăng nhập lại trước khi xóa chữ ký.');
   const db=initHandoverFirebase();
   const ref=db.collection(HANDOVER_COLLECTION).doc(cloudId);
   const FieldValue=window.firebase?.firestore?.FieldValue;
   if(FieldValue?.delete){
    await ref.set({
     signatureTemplateData:FieldValue.delete(),
     signatureTemplateFullName:FieldValue.delete(),
     signatureTemplateUpdatedAtMs:Date.now()
    },{merge:true});
   }else{
    // SDK fallback still clears the image bytes, avoiding a stale template.
    await ref.set({signatureTemplateData:'',signatureTemplateFullName:'',signatureTemplateUpdatedAtMs:Date.now()},{merge:true});
   }
   const confirmed=await ref.get({source:'server'});
   const remote=confirmed.data()||{};
   if(confirmed.metadata?.fromCache||remote.signatureTemplateData||remote.signatureTemplateFullName)
    throw Error('Firebase chưa xác nhận xóa toàn bộ mẫu chữ ký. Hãy kiểm tra mạng và thử lại.');
  }
  if(sagsOwnedKey(SIGN_TEMPLATE_KEY)!==key||
     (cloudId&&window.firebase?.auth?.()?.currentUser?.uid!==authUid))
   throw Error('Tài khoản đã thay đổi trong lúc xóa. Dữ liệu trên thiết bị chưa bị xóa.');
  localStorage.removeItem(key);
  if(localStorage.getItem(key)!==null)throw Error('Trình duyệt chưa xóa được mẫu chữ ký cục bộ.');
  pendingSignatureImage='';
  clearImagePreview();
  updateTemplateStatus();
  const panel=document.getElementById('templateModal');
  if(panel)panel.style.display='none';
  // Re-enter sample editor blank, making the next step immediately clear.
  openSignatureSampleEditor();
  signatureText('signatureSampleStatus','✓ Đã xóa mẫu chữ ký đã lưu của tài khoản này. Chọn ảnh chữ ký mới rồi bấm Lưu chữ kí. Các báo cáo đã ký vẫn giữ nguyên.');
  return true;
 }catch(error){
  const message=String(error?.message||error);
  signatureText('signatureSampleStatus','Không xóa được mẫu chữ ký: '+message);
  alert('KHÔNG XÓA ĐƯỢC MẪU CHỮ KÝ: '+message);
  return false;
 }finally{
  resetBusy=false;if(control)control.disabled=false;
 }
}

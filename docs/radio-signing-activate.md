# Kích hoạt Ký nhận bộ đàm (chưa dùng email)

**Chỉ cần Firestore Rules của dự án e-report-sags để nhân viên ký nhận. Không cần SMTP hoặc Firebase Admin service account.**

## Đã kiểm thử trong Firebase Emulator
- AD tạo danh mục 12 máy DH01–DH11 và TBDH02.
- Nhận/trả/đổi máy an toàn, giao dịch đổi hai máy nguyên tử; không cấp trùng.
- Người dùng ký WebP (Chrome/Android), JPEG (Safari/iOS sau khi cập nhật Rules) hoặc PNG (tương thích Rules cũ). Ảnh camera, giờ và nét ký được ghép chung; ghi giờ máy chủ, trạng thái pin và mã người ký.
- Không cho sửa/xóa lịch sử, nhân viên chỉ xem lịch sử do mình thực hiện.
- Máy pin yếu được cách ly; chỉ AD được xác nhận mở lại.

## Một thao tác còn phải thực hiện trên Firebase Production
1. Đăng nhập Firebase Console → project **e-report-sags** → **Firestore Database → Rules** bằng tài khoản quản trị:
   https://console.firebase.google.com/project/e-report-sags/firestore/rules
2. **Sao lưu nguyên văn bộ Rules hiện hành**. Không thay toàn bộ bằng file trên GitHub nếu các Rules hiện hành có thay đổi mới.
3. Mở file **firebase/radio-custody.rules.snippet** trong cùng repository; sao chép các hàm radio* và 3 match sags_radio_* vào bên trong match /databases/{database}/documents **trước match /{document=**} cuối cùng**. Không xóa quyền ứng dụng khác.
4. Giữ nguyên các hàm activeUser() và isAdmin() của ứng dụng hiện hành; nếu thiếu hoặc quyền khác, dừng và đối chiếu trước khi Publish.
5. Chọn **Publish** trên Firebase Console. Không nhập mật khẩu/khóa Firebase service account vào GitHub source hay trình duyệt E-REPORT.
6. Đăng nhập E-REPORT bằng AD, vào menu Ký nhận bộ đàm → Khởi tạo danh mục máy. Sau đó dùng tài khoản nhân viên ký nhận/trả máy thực tế, đối chiếu lịch sử và ca làm.
7. Với 2 tài khoản, thử nhận cùng mã máy; chỉ một người được nhận. Nếu chưa có Rules, màn hình phải báo chưa được cấp quyền và không ghi thành công.

## Lưu ý
- Lịch gửi email bị vô hiệu hóa, không cần và không sử dụng để ký nhận.
- Không xóa IndexedDB/cache nháp chuyến bay; không xóa lịch sử ký nhận bộ đàm.
- Commit GitHub và bài kiểm thử Emulator **không tự triển khai Firestore Rules lên Firebase Production**.

## Chất lượng ảnh iOS · bản cập nhật 09
- iOS Safari ưu tiên JPEG thay cho PNG giảm bảng màu khiến ảnh bị bệt; Android vẫn ưu tiên WebP.
- Phải cập nhật **Firestore Production Rules** để bật JPEG. Đã chuẩn bị thay đổi trong cả `firebase/firestore.rules` và `firebase/radio-custody.rules.snippet`, chỉ mở thêm `data:image/jpeg` và không thay giới hạn 45.000 ký tự, phân quyền, dấu thời gian, hoặc tính bất biến.
- Cập nhật mã trên GitHub Pages **không tự triển khai** Firestore Production Rules; xác nhận trong Firebase Console trước khi kết luận chất lượng ảnh đã được nâng cấp.
- Khi JPEG bị từ chối `permission-denied` bởi Rules cũ, ứng dụng thử lại **một lần** với PNG ký xác nhận thực tế để nhân viên không bị kẹt; PNG tương thích cũ có thể mờ hơn. Không bao giờ ghi nhận thành công khi Firebase từ chối cả hai định dạng.

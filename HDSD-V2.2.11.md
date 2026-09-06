# HDSD V2.2.11 — AI LIMIT & LỊCH VỆ SINH TÀU BAY

## 1. Nội dung cập nhật

V2.2.11 kế thừa toàn bộ chức năng V2.2.10 và bổ sung một luồng upload ảnh chung dành cho AD:

- Chọn đồng thời nhiều ảnh A/C LIMITS và lịch vệ sinh tàu bay.
- AI tự phân loại từng ảnh.
- Dòng đọc chắc chắn được tự lưu và gán cảnh báo ngay.
- Dòng thiếu dữ liệu, không rõ hoặc có độ tin cậy thấp được đưa vào `CẦN AD XÁC NHẬN`; hệ thống không tự đoán.
- Lịch vệ sinh tự phân biệt đơn vị `SAGS` hoặc `VIETSKY` theo nội dung ảnh/email.

## 2. Upload ảnh

1. Đăng nhập tài khoản AD.
2. Mở **A/C LIMITS**.
3. Bấm **UP ẢNH LIMIT + LỊCH VỆ SINH**.
4. Bấm **CHỌN NHIỀU ẢNH** và chọn cùng lúc các ảnh cần nhập.
5. Bấm **AI ĐỌC & GÁN CẢNH BÁO**.
6. Chờ thông báo tổng hợp số dòng LIMIT, số dòng lịch vệ sinh và số dòng cần AD xác nhận.

Mỗi ảnh tối đa 10 MB; một lượt tối đa 12 ảnh. AI lấy đúng dữ liệu đọc được trên ảnh, không suy đoán mã chuyến, đăng bạ hoặc ngày không xuất hiện.

## 3. A/C LIMITS

- AI nhận dạng APU INOP, HOLD INOP/ISSUES, SEAT INOP và OTHERS.
- LIMIT đủ độ tin cậy được ghi vào danh mục A/C LIMITS hiện hành.
- LIMIT chung vẫn cảnh báo tại STA−10 phút.
- Nội dung liên quan ASU vẫn cảnh báo ETD−10 phút; chưa có ETD thì dùng STD−10 phút.
- Dòng CLEAR hoặc dòng AI không chắc chắn không được tự xóa/thay đổi LIMIT cũ.

## 4. Lịch vệ sinh tàu bay

AI đọc các trường chính:

- Ngày khai thác
- Chuyến đến/chuyến đi
- Route qua CXR
- A/C Reg
- A/C Type
- Đơn vị vệ sinh: SAGS hoặc VIETSKY

Hệ thống ghép lịch theo ngày và ưu tiên Flight No; A/C Reg được dùng để đối chiếu bổ sung trong cùng flight workspace.

## 5. Popup cho ĐH

Chỉ tài khoản vai trò ĐH nhận popup vệ sinh:

- Lần 1: STA−10 phút.
- Lần 2: ngay khi nhập CHOCK ON.

Nội dung chính:

- `SAGS DỌN VỆ SINH TÀU BAY`
- `VIETSKY DỌN VỆ SINH TÀU BAY`

Mỗi mốc chỉ hiện một lần trên thiết bị. Khi lịch được cập nhật, bản mới thay bản cũ và được cảnh báo theo revision mới. Popup tuân thủ nguyên tắc tuần tự; tại một thời điểm chỉ hiển thị một popup nghiệp vụ.

## 6. Kiểm tra sau cập nhật

1. AD chọn chung ít nhất 01 ảnh LIMIT và 02 ảnh lịch vệ sinh SAGS/VIETSKY.
2. Kiểm tra AI tự phân loại đúng và báo số dòng đã lưu.
3. Mở chuyến có lịch vệ sinh bằng tài khoản ĐH.
4. Đưa thời gian hệ thống qua STA−10 để kiểm tra popup lần 1.
5. Nhập CHOCK ON để kiểm tra popup lần 2.
6. Xác nhận mỗi popup chỉ xuất hiện một lần sau khi bấm **ĐÃ BIẾT**.

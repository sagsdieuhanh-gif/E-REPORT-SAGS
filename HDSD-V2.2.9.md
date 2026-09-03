# HDSD V2.2.9 — PDF ĐÃ XUẤT NHƯNG MÀN HÌNH CÒN ĐỨNG

## Hiện tượng thực tế
- Bấm **XUẤT**.
- PDF thực tế đã được tạo/lưu.
- Popup vẫn hiện **Đang hoàn tất PDF...**.
- Bấm XUẤT lần hai thì Share Sheet mới hiện.

## Nguyên nhân
Web Share API trên điện thoại yêu cầu thao tác chia sẻ xảy ra khi trình duyệt còn **user activation/user gesture**.

Trong E‑REPORT:
1. Người dùng bấm XUẤT.
2. Ứng dụng dựng PDF bất đồng bộ.
3. Đến lúc PDF hoàn thành, user gesture ban đầu có thể đã hết hạn.
4. Một số trình duyệt trả lỗi ngay; một số máy để Promise `navigator.share()` ở trạng thái pending.
5. Caller tiếp tục chờ Promise nên giao diện đứng ở “Đang hoàn tất PDF...” dù file đã xong.
6. Lần bấm thứ hai tạo user gesture mới nên Share Sheet có thể mở.

## V2.2.9 xử lý
- Nếu trình duyệt xác nhận user gesture đã hết: **không gọi Share API treo**.
- Giữ lại File PDF vừa tạo.
- Cho export caller kết thúc để giao diện không đứng mãi.
- Hiện một thanh nhỏ:
  **PDF ĐÃ TẠO XONG → CHIA SẺ / LƯU PDF**
- Người dùng bấm nút đó; đây là user gesture mới nên Share Sheet mở ổn định hơn.
- Nếu Share Promise bị treo >3,2 giây trong khi trang vẫn còn visible/focused, hệ thống giải phóng caller và chuyển sang nút chia sẻ lại.
- Nếu Share Sheet thực sự đã mở (app mất focus/visibility), watchdog **không** cắt ngang.
- Dòng `Đang hoàn tất PDF...` được chuyển thành `PDF đã tạo xong.` và nút ĐÓNG được mở lại.

## Không thay đổi
- Nội dung PDF
- Tên file
- Chữ ký
- Dữ liệu biểu mẫu
- FINAL / CROSSCHECK / KẾT SỔ
- MY FLIGHT / ARR→DEP
- Firebase

## Test bắt buộc
1. Bấm XUẤT trên biểu mẫu không ký.
2. Bấm XUẤT trên biểu mẫu đã ký.
3. Chờ PDF dựng xong.
4. Không được đứng vô hạn tại `Đang hoàn tất PDF...`.
5. Nếu Share Sheet chưa tự mở, phải thấy nút **CHIA SẺ / LƯU PDF**.
6. Bấm nút này → Share Sheet phải mở.
7. Hủy Share → không báo lỗi.
8. Bấm lại → vẫn có thể chia sẻ.
9. Kiểm tra file PDF giữ đúng tên do E‑REPORT sinh ra.

## Chẩn đoán
Console:
```js
sagsV229PdfExportDiagnostics()
```

# E-REPORT SAGS V2.5.21 – Lịch sử chỉnh sửa biểu mẫu

## Tra cứu
- Đăng nhập với tài khoản cá nhân, mở **MY FLIGHT** hoặc màn hình biểu mẫu, chọn **🕘 LỊCH SỬ**. Trong menu bên trái cũng có **LỊCH SỬ CHỈNH SỬA**.
- Chọn chuyến có trong danh sách công việc; xem trường thay đổi, dữ liệu TRƯỚC/SAU, thời gian lưu, người thực hiện và trạng thái **ĐÃ LƯU FIREBASE** hoặc **CHỈ TRÊN MÁY**.
- Khi có mạng, nút **↻ TẢI LẠI** thử đồng bộ các bản ghi chưa có xác nhận trong phạm vi chuyến đang xem.

## Cơ chế
- Ghi thay đổi dữ liệu giữa trạng thái đã lưu **trước/sau** khi hoàn thành lệnh lưu `persist` / `sagsV22SaveNow` trên biểu mẫu; không ghi mỗi lần gõ.
- Lưu cục bộ bằng IndexedDB, có phương án localStorage dự phòng. Khi roster assignment tồn tại, thử tạo bản ghi dưới `roster_sessions/{assignmentId}/edit_audit_v1/{eventId}`. Trạng thái chỉ đổi sang **ĐÃ LƯU FIREBASE** nếu máy chủ chấp nhận.
- Không ghi mật khẩu, mã xác thực, PIN, ảnh, chữ ký, tệp đính kèm, dữ liệu nhạy cảm hoặc chuỗi dài. Không âm thầm áp dụng sửa dữ liệu từ lịch sử và không xóa bản lưu biểu mẫu cũ.
- Tài khoản chỉ xem các phiên biểu mẫu của mình được thiết bị hiện tại liệt kê. Quyền đọc cloud phụ thuộc quy tắc Firebase đang triển khai. Các bản ghi cũ trước ngày bật tính năng **không thể tái dựng một cách tin cậy**.
- Đây là lịch sử thao tác hỗ trợ tra cứu, **KHÔNG phải nhật ký audit bất biến/chống sửa trên máy chủ**. Chưa có bằng chứng RTDB rules của môi trường production hạn chế thao tác cập nhật/xóa riêng các event này. Do đó không được coi là đã đáp ứng điều kiện nghiệm thu pháp lý về kiểm soát hiệu đính.

## Bước cần bổ sung trước khi nghiệm thu báo cáo
1. Thẩm định và triển khai Firebase RTDB rules để chỉ cho append-only sự kiện lịch sử; người dùng chỉ được xem hồ sơ theo phân công, AD theo quyền được duyệt, không tự sửa/xóa event. Nên xác thực actor từ `auth.uid` ở backend thay vì tin hoàn toàn vào thông tin do browser gửi.
2. Với biểu mẫu **đã hoàn tất**, trước khi cho hiệu đính yêu cầu lý do bắt buộc, phân quyền người sửa, tạo phiên bản/bản hiệu đính mới và sự chấp thuận của đơn vị quản lý.
3. Kiểm tra bằng hai thiết bị đã xác thực: save 42.3/54/94, xem lịch sử đồng bộ, mất mạng, hết bộ nhớ, mở lại chuyến, đổi người phân công và đối chiếu file PDF.
4. Xác định thời hạn lưu audit độc lập thời hạn dữ liệu chuyến 24 giờ. Hiện lịch sử cloud nằm trong `roster_sessions`, nên có thể bị dọn cùng dữ liệu chuyến.
5. Đo hiệu năng PWA/iOS/desktop và xác minh giao diện trên dữ liệu nghiệp vụ thật trước khi phê duyệt chính thức.

Không dùng mật khẩu chung trong bài kiểm thử và không ghi hồ sơ giả vào các chuyến bay đang khai thác.

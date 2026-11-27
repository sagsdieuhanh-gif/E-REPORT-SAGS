# V1.10 – ADMIN tạo 42.3 thay thế 42.1 đã nhận/nhập

## Điểm vào
Đăng nhập tài khoản **AD** → **DAILY ROSTER** → **ADMIN · 42.3 THAY 42.1** → chọn ngày/chuyến/người đang có 42.1 → nhập lý do (từ 10 ký tự) → xác nhận.

## Nguyên tắc dữ liệu
- Không tái sử dụng assignmentId của 42.1. 42.3 sử dụng mã mới cố định \`AR423_{oldAssignmentId}\`.
- 42.1 cũ **không bị xóa**: item còn trong roster manifest với \`active=false\`, session \`roster_sessions/{oldAid}\` giữ nguyên envelope, chữ ký, nội dung, lịch sử và trạng thái claim/completion; chỉ thêm metadata "đã thay thế".
- Sao lưu nguyên record/session/mail của 42.1 vào \`roster_manifests/{date}/rosterArchives/{oldAid}\`; lưu lý do, thời điểm, người và Firebase Auth UID duyệt trong \`admin423Replacements/{oldAid}\` và \`flight_records/.../assignmentHistory\`.
- Phiên 42.3 mới bắt đầu chưa nhận (READY), chưa có envelope, không tự copy nội dung từ 42.1. Cùng ngày/flightId/nhân viên đã phân công.
- Các đường dẫn RTDB được cập nhật bằng **một multi-location update**; khi lỗi, không được báo thành công. Từ chối nếu không xác minh được Firebase profile AD đang hoạt động, chuyến/phiên cũ, đã có 42.3, đã thay thế, có nhiều 42.1 trong cùng chuyến hoặc bản sao quá lớn.
- Lần import Roster sau ưu tiên ID 42.3 do AD tạo, giữ phiên đã nhập và **không xóa lịch sử 42.1**. Nếu roster mới đổi người/phần việc làm mất tính duy nhất, ngừng publish và yêu cầu AD kiểm tra, không tự ghi đè.

## Giới hạn
- Không thay thế 55.1. Nếu chuyến có 55.1 đang hoạt động, thao tác tạo 42.3 **bị chặn** để tránh trùng nghiệp vụ. AD cần xử lý phân công 55.1 trước; hồ sơ cũ không bị tự thu hồi.
- Nếu nhiều phần việc 42.1 cùng người trong một chuyến, chức năng từ chối để tránh mất bất kỳ phần việc nào.
- Không mở quyền CBTT/FINAL, không sửa bảng tải, không di chuyển chữ ký từ 42.1 sang 42.3.
- Do việc ghi roster nằm trong RTDB, ứng dụng dựa trên cùng rào quyền RTDB hiện có như thao tác ADMIN Daily Roster; cần kiểm chứng quyền trên môi trường production bằng một chuyến thử.

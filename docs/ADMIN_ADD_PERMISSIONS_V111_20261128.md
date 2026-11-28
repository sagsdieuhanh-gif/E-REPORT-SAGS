# V1.11 – ADMIN thêm/sửa quyền chức năng của tài khoản

- ADMIN → Quản lý tài khoản → **＋ THÊM / SỬA QUYỀN** → bật/tắt quyền chức năng → **LƯU QUYỀN**.
- Nguồn danh sách và thao tác phải cùng Firebase Firestore users/{UID}; hồ sơ sags_handovers cũ không được dùng làm tài khoản để gán quyền.
- Trước khi lưu, làm mới ID token và xác minh ADMIN đang hoạt động trên server. Giao dịch Firestore kiểm tra tài khoản đích chưa khóa/xóa, vai trò chưa thay đổi; chỉ lưu featureOverridesV485 và mốc revision với lịch sử thay đổi tối thiểu.
- Sau khi ghi phải đọc từ server để kiểm tra permissionRevV485 và featureOverridesV485; nếu thất bại không báo thành công.
- Đồng bộ thiết bị đang sử dụng qua RTDB account_permissions (nếu có quyền) và Firestore onSnapshot cài sau khi Firebase Auth đăng nhập, không chỉ khi khởi động trang.
- **Không cấp thêm vai trò/đơn vị mới (roles[]) và không tự cấp ADMIN hoặc quyền công việc của RADIO_MANAGER.** Nền tảng một UID nhiều vai trò nằm ở PR #174 riêng, chưa thể kích hoạt nếu server rules, duty-scoped forms, roster & audit chưa kiểm thử xong.
- Giữ nguyên mọi chức năng của V1.10, bao gồm ADMIN tạo 42.3 thay thế 42.1 đã có dữ liệu.

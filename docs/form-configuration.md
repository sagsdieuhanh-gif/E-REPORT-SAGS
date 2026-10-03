# Cấu hình áp dụng biểu mẫu

Nguồn chung: `data/form-configuration.json`. Giao diện không ghi cấu hình này vào Firebase.

1. AD mở Quản lý biểu mẫu, chọn biểu mẫu và chỉnh thứ tự, hãng, loại tàu.
2. Bấm XUẤT CẤU HÌNH JSON.
3. Thay file `data/form-configuration.json` trong repo bằng file vừa xuất.
4. Commit lên main để Vercel deploy; người dùng mở lại danh sách chuyến nhận cấu hình mới.

Tất cả biểu mẫu, kể cả FSAGS 208, áp dụng theo cấu hình hãng và loại tàu. Bản cấu hình ban đầu bật mọi hãng và mọi loại tàu; AD có thể thu hẹp phạm vi bằng file cấu hình. Quyền nhận, sửa, gửi vẫn theo tài khoản và phân quyền nghiệp vụ.

`forms/forms.registry.json` quản lý ảnh nền và vị trí field; đây là file riêng với cấu hình áp dụng. Dữ liệu nghiệp vụ và lịch sử chuyến tiếp tục lưu Firebase. Cache thiết bị giữ bản cấu hình đã đọc để tránh tải lặp lại, không thay thế file chung trong repo. File xuất chưa làm thay đổi cấu hình của người dùng khác cho tới khi được deploy.

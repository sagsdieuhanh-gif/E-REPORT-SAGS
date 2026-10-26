# Sự cố đăng nhập V1.8 — khôi phục V1.7

- Ngày: 2026-10-26.
- Người dùng báo màn hình đăng nhập bị lỗi sau V1.8.
- Mã ứng dụng trên `main` được khôi phục nguyên trạng về commit V1.7 `877b3978558634e0dc8f07e3064d124cb80547f0` trước khi tạo tài liệu sự cố này.
- Commit này bổ sung **chỉ tài liệu**, không thay đổi nguồn ứng dụng, biểu mẫu, Firebase, dữ liệu nháp hoặc bất kỳ tài nguyên PWA nào.
- Mục đích commit là kích hoạt lại luồng tự động triển khai của Vercel cho mã ứng dụng V1.7 và tránh triển khai nhầm V1.8.
- Chỉ mở lại sửa giao diện khi đã có kiểm thử màn hình đăng nhập và xác nhận trực quan.

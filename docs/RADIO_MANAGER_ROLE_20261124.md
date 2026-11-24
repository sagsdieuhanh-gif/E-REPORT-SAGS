# Quản lý bộ đàm (RADIO_MANAGER) — phân quyền tách biệt AD

**Ngày chuẩn bị:** 24/11/2026. **Trạng thái:** mã nguồn thử nghiệm, chưa kích hoạt cho nhân viên trong production.

## Nhận diện và lựa chọn trong AD

- Tên hiển thị / nhóm / chức danh: **Quản lý bộ đàm**.
- Role Firestore: `RADIO_MANAGER` (không phải `ADMIN`).
- Mã nhóm: `QLBD`; mã chức danh: `QUAN_LY_BO_DAM`; bộ phận: Phòng Điều Hành.
- AD tạo tài khoản theo luồng Firebase Authentication hiện có; mật khẩu ngẫu nhiên, bắt buộc đổi lần đăng nhập đầu.

## Giới hạn quyền

- **Được phép:** xem toàn bộ danh sách bộ đàm và người giữ, lịch sử/ảnh/chữ ký của radio, đối soát ngày/ca, báo cáo PDF có hoặc không có ảnh; nhân viên thuộc vai trò này vẫn có thể nhận/trả **máy do chính họ giữ** theo quy tắc chung.
- **Không được phép:** mọi danh sách/hồ sơ/biểu mẫu chuyến bay, roster quản trị, quản lý tài khoản, cấp quyền, chỉnh Firebase, xóa dữ liệu, khởi tạo hoặc xác nhận xử lý lỗi bộ đàm, ký trả hộ và thay đổi ký nhận lịch sử.
- Có dashboard PC/mobile chuyên biệt; menu chỉ gồm Trang chủ, Bộ đàm và Đăng xuất.
- Ca bộ đàm: sáng 08:30–19:00; tối 19:01–08:29 hôm sau. Máy ghi lỗi tiếp tục được sử dụng trừ khi mất thiết bị.

## Security Rules — không chỉ ẩn UI

Mã `firebase/firestore.rules` chặn `RADIO_MANAGER` khỏi `activeUser()` dùng ở các collection nghiệp vụ, chỉ cho vào các collection radio qua `radioMember()` / `radioMonitor()`. Các thao tác `INIT`, `RELEASE`, xóa ký nhận và quyền AD vẫn không đổi.

**Lưu ý cần kiểm tra trước triển khai:** chính sách Firebase Realtime Database production cũng phải được đối chiếu. Chỉ thay đổi Firestore Rules không tự động hạn chế được mọi nhánh RTDB. Không dùng điều này để tuyên bố phân quyền toàn hệ thống đã bảo mật đầy đủ khi thiếu kiểm tra thực tế.

## Quy trình nghiệm thu

1. Chạy `npm run release` để kiểm tra phần website, cùng bộ unit tests.
2. Chạy Firestore Rules emulator độc lập từ `.github/workflows/radio-rules-emulator.yml`: kiểm tra vai trò `RADIO_MANAGER` thấy bộ đàm/lịch sử/ảnh, không thấy users khác hoặc `sags_handovers`, không ký hộ/tạo thiết bị, và được ký nhận cho chính mình.
3. Đối chiếu `firebase/firestore.rules` với **rules thực đang chạy trên Firebase production**. Soát thêm RTDB Security Rules trước khi cho tài khoản mới đăng nhập.
4. Triển khai rules đã duyệt bằng danh tính quản trị Firebase thích hợp; chỉ sau đó phát hành client và tạo tài khoản vai trò mới.
5. Kiểm tra trực quan trên PC, iOS Safari và Android Chrome; xác minh PDF kèm ảnh và không ảnh, đổi ca và ảnh chụp.
6. Kiểm thử âm tính thao tác trực tiếp bằng Firebase SDK với vai trò bị hạn chế. Không cấp ADMIN cho tài khoản này dưới bất kỳ hình thức nào.

**Triển khai GitHub Pages không tự deploy Firebase Rules.** Không công bố hoàn tất sản phẩm khi thiếu thao tác này. Giữ `main` V1.4 nếu phần backend chưa sẵn sàng.

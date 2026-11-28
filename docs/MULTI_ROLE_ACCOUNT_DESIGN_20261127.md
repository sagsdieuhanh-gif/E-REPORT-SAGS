# E-REPORT SAGS – một nhân viên, nhiều vai trò và chức danh (đề xuất V1.8)

**Trạng thái:** Giai đoạn thiết kế/kiểm thử chính sách, **chưa kích hoạt**, không làm thay đổi quyền production V1.7. Mã trong `app/modules/multi-role-policy.v18.js` mới là hàm thuần và chưa được nạp trong ứng dụng.

## Nghiệp vụ chốt

- Mỗi người chỉ có **1 Firebase Auth UID**, **1 mã nhân viên**, **1 username**.
- Có **một vai trò chính** trong `users/{uid}.role` (tương thích các khách hàng/biểu mẫu cũ) và danh sách **các vai trò được giao** trong `roles[]`.
- Có một chức danh chính `jobTitle` và danh sách `jobTitles[]`. **Chức danh không tự cấp quyền**: "Ca trưởng", "Đội trưởng" chỉ là vị trí công việc, còn quyền nghiệp vụ do vai trò và cấp phép chức năng quyết định.
- Ví dụ: KIENNT có `role='DH'`, `roles=['DH','CBTT','RADIO_MANAGER']`, `jobTitle='Nhân viên'`, `jobTitles=['Nhân viên','Ca trưởng']`. Khi vào hệ thống, nhân viên chọn **Chế độ làm việc: ĐH / CBTT / Quản lý bộ đàm**; chữ ký và nhật ký ghi chính UID + vai trò đang sử dụng.
- Màn hình AD: chọn nhiều vai trò và chức danh, chọn vai trò/chức danh chính, kiểm tra thay đổi, lưu và ghi audit bất biến; có thể thu hồi một vai trò mà không khóa người dùng.
- Các quyền chức năng V485 có thể bật/tắt **theo từng vai trò**, không sao chép máy móc quyền của vai trò khác. Không dùng chức danh như quyền.
- **Không tự gộp mọi chức năng lên một màn hình**: từng phiên làm việc có một chế độ đang chọn. Chuyển vai trò chỉ thực hiện ở trang chủ khi không đang chỉnh sửa chuyến/biểu mẫu; yêu cầu xác minh server và làm mới trạng thái, tránh mất nháp.
- Một nhân viên nhiều vai trò nhưng **phân công roster phải theo cả UID, vai trò, chuyến và loại biểu mẫu**. Chỉ vai trò được phân công mới được ký/lưu đúng nhóm trong chuyến đó. Không có chuyện có CBTT là tự động làm bất kỳ FINAL nào.
- Không cho gắn **AD/ADMIN** như một quyền bổ sung. AD chỉ được quản trị bằng tài khoản AD xác thực. VIEWER chỉ đứng một mình, không ghép với quyền ghi.
- **RADIO_MANAGER** có thể là vai trò bổ sung cho nhân viên ĐH/CBTT; quyền quản lý kho chỉ có hiệu lực khi Firestore Rules đọc `roles[]` từ hồ sơ đã được AD cấp.

## Cần làm trong giai đoạn phát hành kế tiếp

1. Cập nhật UI AD hồ sơ/tạo tài khoản, quy trình ghi `users/{uid}` với `roles[]` và `jobTitles[]`, tăng `permissionRevV485`, lưu nhật ký người duyệt và ai cấp/thu hồi.
2. Cập nhật đăng nhập và phục hồi phiên từ Firebase profile. **Không tin danh sách role trong localStorage** để cấp quyền; `activeRole` chỉ là lựa chọn hiển thị và phải thuộc tập roles đã xác thực.
3. Nâng Firestore Rules (các hàm `activeUser`, `radioMonitor`, `sharedSectionWriter`, `pdhTemplateAllowed`, `pdhAssigned`, các nghiệp vụ FINAL/crosscheck/roster) theo vai trò được cấp, nhưng quyền AD vẫn xác định bằng `role` chính. Bổ sung test emulator cho thu hồi quyền khi phiên đang mở, tạo/đọc/ghi từng biểu mẫu và không leo thang quyền.
4. Cập nhật giao diện chọn vai trò cho PC/mobile; đảm bảo mỗi thao tác nghiệp vụ có `actorUid` + `activeRole` được kiểm chứng, báo cáo xuất PDF không nhầm người/chức danh.
5. Sao lưu và triển khai đúng Firebase Rules production, xác minh bằng tài khoản thử; kiểm thử 3 lớp nháp, chữ ký, roster, bộ đàm, FINAL và quyền cũ; chỉ khi đạt mới merge/deploy bắt buộc V1.8.

## Tương thích

Tài khoản cũ thiếu `roles` và `jobTitles` tự hiểu là `[role]` và `[jobTitle]`. Không tự cấp thêm quyền, không sửa hàng loạt dữ liệu lịch sử. Không lưu `roles` của UID này vào UID khác.

## Ví dụ không cho phép

- Tài khoản DH tự chỉnh request để có ADMIN: phải từ chối tại server.
- Một ROLE_MANAGER được cấp trên client nhưng chưa có `roles` thật trong users/{UID}: không được sửa kho.
- CBTT được cấp quyền chung nhưng không có roster/grant tương ứng: không được tự ký biểu mẫu của người khác.
- Chức danh "Ca trưởng" không được phép tự động mở chức năng AD.

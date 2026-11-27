# E-REPORT SAGS – Quản lý xuất/cất kho bộ đàm (V1.7, staged)

## Mục tiêu
AD hoặc RADIO_MANAGER có tab **Kho bộ đàm** với toàn bộ danh mục, số lượng, trạng thái, bộ lọc theo mã/trạng thái và nút điều chuyển. Chỉ cần chọn máy và ghi lý do, xác nhận để giao dịch được lưu atomically cùng một lịch sử bất biến và giờ server Firebase.

## Mô hình dữ liệu

- `stockStatus=IN_SERVICE`: máy đã xuất kho để sử dụng; nếu chưa có ai giữ và không thất lạc thì nhân viên có thể ký nhận.
- `stockStatus=IN_STORE`: đang cất kho, không xuất hiện trong danh sách ký nhận; lệnh ISSUE/SWAP_IN phải bị từ chối bởi Firebase Rules dù dùng client cũ.
- Thiết bị cũ **không có** trường `stockStatus` được hiểu là `IN_SERVICE`, không cập nhật hàng loạt hoặc tự động thay đổi sổ máy hiện có.
- Trạng thái máy `status` (READY/OUT/FAULT/CHARGING/LOST) tách rời khỏi vị trí kho. Lỗi là cảnh báo, **không cách ly** thiết bị.
- Mỗi thao tác `STORE` và `DEPLOY` tăng `version`, cập nhật `lastEventId` cùng một sự kiện `sags_radio_events_v1` không thể sửa/xóa. Lưu tên và UID người quản lý, lý do và giờ server.

## Quyền và chốt chặn

- Chỉ `AD/ADMIN` và `RADIO_MANAGER` được điều chuyển. Manager vẫn không được tạo tài khoản/khởi tạo máy, ký trả hộ, giải phóng cảnh báo hoặc xem dữ liệu chuyến bay.
- Không cất kho/ xuất kho khi máy `OUT` hoặc có `holderUid`; phải ký trả trước.
- Máy LOST hoặc báo LOST phải được AD xác nhận thu hồi theo quy trình hiện có trước khi điều chuyển.
- Mọi thay đổi stock đều được kiểm tra tại server trong Firestore Rules; client chỉ hiển thị kết quả khi transaction đã được xác nhận.

## Trình tự phát hành bắt buộc

1. Chạy hồi quy website và Firestore Emulator `radio-rules-emulator.yml` cho rules mới, đặc biệt thử tài khoản nhân viên bị từ chối chuyển kho/nhận máy IN_STORE.
2. Sao lưu/kiểm tra bản rules Firebase đang chạy, triển khai `firebase/firestore.rules` sang **đúng Firebase production project** qua quyền quản trị; xác nhận RULES production đúng bản mới.
3. Kiểm tra trực tiếp quyền AD và RADIO_MANAGER, trạng thái máy cũ và an toàn ký trả trên production; kiểm tra Firestore/RTDB quy tắc RADIO_MANAGER theo hồ sơ phân quyền cũ.
4. Chỉ khi các bước trên đạt mới merge nhánh giao diện và cập nhật GitHub Pages bắt buộc V1.7.
5. Thử thực tế trên PC, Safari iOS và Chrome Android. Không ảnh hưởng báo cáo theo ca/ảnh/ký nhận/PDF.

**Lưu ý:** GitHub Pages không tự triển khai Firebase Rules. Không công bố tính năng chạy production khi chưa hoàn tất bước 2–3.

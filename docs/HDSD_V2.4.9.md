# V2.4.9 — Xuất PDF ổn định hơn

Bản cập nhật tiếp theo V2.4.8, ngày 09/10/2026.

## Cách sử dụng

Mở chuyến và biểu mẫu cần xuất, bấm XUẤT rồi chọn biểu mẫu. Hộp trạng thái hiện trước khi dựng PDF. Bấm lặp trong lúc đang tạo không khởi động thêm một lượt xuất hoặc cấp thêm số BBBT từ cùng tác vụ. Khi lỗi, đọc thông báo và thử lại. Các nút tải/chia sẻ vẫn theo thiết bị.

## Nội dung sửa

- Bộ theo dõi giao diện không vẽ lại mọi biểu mẫu vì thay đổi chữ trạng thái PDF, liên kết tải hoặc đồ họa không liên quan.
- Lớp SVG 54 chỉ được ẩn khi trạng thái thay đổi, chặn vòng lặp theo dõi style/vẽ canvas.
- Hộp xuất chỉ ghi style khi giá trị hoặc mức ưu tiên thay đổi; không sửa hộp đang đóng.
- Bộ theo dõi nút nhập nhanh 54/94 bỏ qua biến động toàn trang và gom cập nhật vào một frame.
- Một tác vụ xuất báo cáo tại một thời điểm. Canvas đã thu thập được giải phóng cả khi lỗi; cờ batch luôn được khôi phục.
- Cache ảnh chữ ký của bộ xuất 54/94 giới hạn 24 mục, xóa mục lỗi để cho phép thử lại.
- Giữ các sửa lỗi phân công/My Flight, dữ liệu biểu mẫu và quyền sử dụng hiện có.

## Kiểm tra và giới hạn

Chạy `npm run release` để kiểm tra toàn bộ regression, cú pháp, nguồn/generated và checksum PWA. Các kiểm tra mới bao gồm lọc DOM, style idempotent, ngăn xuất trùng và thử lại sau lỗi.

Chưa xác nhận trên điện thoại thực tế hoặc phiên Firebase đã đăng nhập. Cần thử xuất 42.1/42.3/55.1/09/208/BBBT/54/94, kiểm tra nội dung PDF, số BBBT và thao tác chia sẻ trên iOS/Android trước khi khẳng định hiệu năng thực tế. Không có số đo thời gian xuất trước/sau từ thiết bị thật.

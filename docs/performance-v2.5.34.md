# V2.5.34 — Giảm tải nhập FINAL trên máy yếu

Baseline: `79f3a27837540401d8713f20cd305e5c6a1371e6` (V2.5.33).

## Vấn đề và sửa đổi

- Lớp phân quyền `ffSaveField` chỉ truyền ba tham số. Tham số thứ tư chứa bộ dữ liệu đã tính bị bỏ, gây đọc lại store và không ghi kết quả công thức vừa tính. Chuyển sang chuyển tiếp toàn bộ arguments, giữ nguyên quyền CBTT/AD. Bộ kiểm tra cũ chỉ chạy handler với hàm lưu gốc nên không phát hiện lỗi tích hợp này; nay chạy qua cả lớp quyền và wrapper đồng bộ danh tính thực tế.
- Các nhánh cập nhật công thức và hành khách có thể lên lịch chỉnh chữ toàn FINAL nhiều lần trong cùng frame. Gộp thành một lượt/frame. Không trì hoãn việc ghi dữ liệu, kiểm tra zone hoặc tính toán.
- Trước đây mỗi ô được đo rồi ghi style ngay, khiến phép đo ô tiếp theo phải xử lý bố cục vừa bị thay đổi. Hai lượt chỉnh toàn bộ phần hiển thị/input nay đo tất cả ô trước, sau đó mới ghi style. Kích thước/font/công thức đo giữ nguyên; lời gọi đơn lẻ và lời gọi trực tiếp trước xuất vẫn chạy đồng bộ.

## Kiểm chứng

- Kiểm tra handler qua wrapper quyền và danh tính: một lần đọc/một lần ghi, lưu kết quả phụ thuộc; quyền bị từ chối, lỗi quota, zone sai và dữ liệu chuyến khác được giữ.
- Kiểm tra thứ tự mọi phép đo trước style write; cùng font đầu ra giữa chế độ trực tiếp và gom lượt; 30 yêu cầu chỉnh liên tiếp chỉ tạo một callback, frame kế tiếp vẫn chạy được.
- Chạy toàn bộ `npm run release` và xác minh manifest trước phát hành.

## Giới hạn

Đây là sửa lỗi và giảm tải đường FINAL, không chứng minh mọi biểu mẫu đều mượt trên mọi thiết bị cũ. Chưa có đo INP/CPU hoặc PDF trên điện thoại thật. Kiến trúc nhiều script khởi động, dựng toàn bộ SVG và bộ nhớ ảnh PDF vẫn là các hướng cần đo thêm. Không giảm chất lượng PDF hay sửa cơ chế lưu nháp để đổi lấy tốc độ. Cần model thiết bị, phiên bản trình duyệt và thao tác cụ thể còn chậm để tái hiện đúng điều kiện.

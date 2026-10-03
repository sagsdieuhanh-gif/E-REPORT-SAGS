# Tối ưu khởi động V6.4.61

## Kết quả đo từ các script trong HTML

| Chỉ số | Trước | Sau |
|---|---:|---:|
| Tổng byte JavaScript theo số lần gọi script | 5954302 | 2514247 |
| Byte JavaScript theo URL duy nhất | 2567017 | 2514247 |
| Số thẻ script nội bộ | 56 | 56 |

Tổng byte theo số lần gọi giảm khoảng 58%, chủ yếu nhờ bỏ việc chạy file lõi nguyên khối sáu lần. Đây là số đo cấu trúc tải, không phải cam kết thời gian mở trang giảm 58%. Dung lượng JavaScript theo URL duy nhất giảm khoảng 2%; chưa tính SDK Firebase AI bên ngoài không còn tải khi đăng nhập.

## Thay đổi

- Lõi được biên dịch theo sáu giai đoạn. Tám đoạn dùng chung nằm trong một file; các lời gọi vẫn giữ thứ tự và ngữ cảnh currentScript như trước.
- Runtime chia thành năm file, lớn nhất khoảng 180KB. Hai file boot nghiệp vụ lớn còn khoảng 294KB và 397KB.
- Năm nhóm boot chỉ gom các script không khai báo biến/hàm toàn cục và không dùng currentScript. Giữ ID script để các lớp cũ vẫn tìm được chúng.
- AI và Sổ tay hãng chỉ tải khi cần. AI có cơ chế gom tải đồng thời và thử lại sau lỗi.
- Gom các đọc Firebase đồng thời theo tài khoản và đường dẫn. Không giữ kết quả đã đọc xong; không thay đổi quyền truy cập hoặc callback Firebase.
- Listener reset chỉ gắn sau khi xác thực; tháo khi đổi tài khoản hoặc đăng xuất.
- Quét overlay mobile bỏ qua thay đổi chữ và đồ họa; vẫn xử lý thêm/đóng/ẩn/hiện dialog.
- PWA dùng danh sách asset mới và checksum; lỗi staging giữ bản trước, không kích hoạt asset sai. Cấu hình biểu mẫu vẫn đọc bản mới độc lập.

## Bảo trì

Nguồn nghiệp vụ giữ tại app/core và app/boot. Không chỉnh tay app/generated. Chạy npm ci, npm run build:runtime, node tools/build-runtime.cjs --check rồi npm test sau khi sửa nguồn. Build Vercel chạy toàn bộ test trước khi tạo gói deploy.

## Kiểm tra và giới hạn

Test bao phủ cấu hình/JSON tất cả biểu mẫu, nhận-mở-sửa-gửi-bàn giao 208, tải AI, đọc Firebase, vòng đời xác thực, overlay, thứ tự startup và staging PWA. Dữ liệu nghiệp vụ trong các test là fixture, không ghi lên Firebase thật.

Trang đăng nhập được kiểm tra trên trình duyệt ở 390×844 và không tràn ngang. Chưa có benchmark Safari/Cốc Cốc trên thiết bị thật hoặc thử tải 40–50 người dùng thật. Việc tách hoàn toàn trình chỉnh form để tải trễ cần tách riêng phần nó dùng chung với live/PDF trước.

Bản V6.4.61 sửa xác minh checkpoint sau khi bộ nhớ rút gọn rồi dựng lại JSON: chấp nhận metadata bổ sung, vẫn từ chối dữ liệu thiếu, sai hoặc revision cũ. Kiểm tra thực tế trên Vercel đã khôi phục phiên đăng nhập và mở My Flight; không nhận/gửi dữ liệu chuyến thật trong quá trình kiểm tra.

Bộ lọc số hiệu chuyến được gắn ở lớp danh sách chung, áp dụng lại khi thẻ chuyến cập nhật; observer chỉ xử lý thay đổi danh sách, không phản ứng thay đổi chữ/đồ họa toàn trang.

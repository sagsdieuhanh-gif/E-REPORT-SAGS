# V2.5.44 — Giảm vẽ lại biểu mẫu và sao chép dữ liệu khi rảnh

## Các điểm đã sửa

1. `draw()` trước đây tạo lại tất cả phần tử SVG của mọi trang. Nay giữ lại từng trường theo trang/khóa, giá trị, trạng thái chọn và bố cục đã giải quyết. Các trường không đổi giữ nguyên nút DOM; trường đổi được dựng trong fragment rồi thay đúng vị trí. Comment làm mốc cho cả trường rỗng, không thêm nhóm hay thay đổi quan hệ cha/con của phần tử hiển thị. Đổi thứ tự/trang/chuyến, kích thước gốc, ngôn ngữ, trạng thái font hoặc nút bị lớp khác xóa sẽ dựng lại trang khi cần. Schema và geometry được kiểm tra cả khi sửa tại chỗ; trường được thay bằng object tương đương vẫn cập nhật tham chiếu cho xử lý chạm.

2. Lớp canvas Form Manager trước đây xóa và vẽ toàn trang sau mọi yêu cầu. Nay kiểm tra dữ liệu đầu vào đúng theo trang của painter: schema, bind/key, giá trị đã chuẩn hóa, phần ghi chú 42.1 cũ được ghép vào trang 7, kích thước canvas và font. Chỉ bỏ vẽ nếu bản trước vẽ thành công. Canvas mới sau giải phóng trang ẩn luôn được vẽ lại. Bộ đệm WeakMap gắn với canvas; không áp dụng cho canvas xuất PDF. Kiểu giá trị không hỗ trợ hoặc lỗi tạo đầu vào thì vẽ như trước.

3. `persistChangedCore()` giữ chu kỳ 2 giây khi trang hiện và không mở editor như V2.5.43, nhưng tránh stringify toàn bộ state không đổi. Snapshot duyệt cả object/mảng lồng nhau, giữ tham chiếu chuỗi thay vì tạo lại bản sao JSON của ảnh base64. Tối đa 8.192 giá trị và sâu 16 cấp. Getter, Date, toJSON, mảng thưa, prototype khác, dữ liệu quá giới hạn và kiểu đặc biệt quay về JSON như trước. Khi có thay đổi vẫn gọi persist và đọc bản lưu để xác minh; chỉ cập nhật snapshot sau thành công. Snapshot theo phạm vi tài khoản/chuyến; không ghi vào vùng lưu mới, không chuyển đổi dữ liệu cũ.

## Bằng chứng kiểm thử

- So sánh cây SVG với đường vẽ toàn trang trên 10 biểu mẫu / 1.178 trường: khớp sau sửa giá trị, đổi ô đang chọn, xóa giá trị, chỉnh tọa độ/font, đảo thứ tự/xóa trường, đổi chuyến/font và xóa nút từ bên ngoài.
- Trang 1.000 trường có giá trị: sửa một ô tạo 2 nút SVG thay vì dựng lại 2.000; vẽ lại khi không đổi không tạo/xóa/chèn nút.
- Canvas: 21 yêu cầu không đổi chỉ vẽ một lần; sửa dữ liệu trang khác không vẽ lại trang này. Kiểm tra bind, schema, kích thước, font, ghi chú 42.1 cũ, tạo lại canvas và lỗi vẽ.
- State 900 trường và 8 chuỗi ảnh khoảng 4 MB: 20 chu kỳ không đổi không stringify state, không gọi persist và không đọc envelope. Đo mẫu Node trong môi trường kiểm thử: JSON khoảng 150 ms, so sánh snapshot khoảng 14 ms cho 20 lượt; đây là mẫu tổng hợp, không phải số đo thiết bị cũ.
- Sửa object/mảng tại chỗ, thêm/xóa/đảo phần tử, đổi tài khoản/chuyến, lỗi ghi và lỗi read-back đều được kiểm tra; đường JSON dự phòng được kiểm tra với Date, toJSON, getter, mảng thưa, dữ liệu quá lớn/quá sâu và vòng tham chiếu.

## Giới hạn

Chưa đo INP, FPS, mức RAM hoặc thử trực tiếp trên điện thoại/CPU cũ. Kiểm thử SVG dùng DOM mô phỏng hành vi fragment/move/remove, không thay thế kiểm tra hình ảnh trên Safari/Chrome thật. Các tối ưu giảm lượng công việc đã xác định; không cam kết hết lag trên mọi thiết bị. Một lần lưu thay đổi vẫn phải ghi và xác minh envelope đầy đủ; ảnh đính kèm vẫn nằm trong state. Dữ liệu nằm ngoài khả năng snapshot vẫn dùng JSON. Vẽ SVG vẫn duyệt schema để phát hiện chỉnh bố cục tại chỗ, và canvas vẫn vẽ cả trang khi nội dung trang đó thay đổi.

Bản này ghép trên main V2.5.43 (c75ddd9), giữ đầy đủ các sửa TVJ, NEXT, NHẬN TIẾP, bàn giao chưa hoàn tất và tối ưu nhập mobile.

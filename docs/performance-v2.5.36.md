# V2.5.36 — Giảm công việc lặp khi nhập liệu

Chuẩn hóa văn bản ở ranh giới persist/draw trước đây chuyển chữ hoa lại mọi trường đã đăng ký. Nay dùng WeakMap theo đối tượng state, chỉ bỏ qua khi giá trị hiện tại bằng chính chuỗi đã chuẩn hóa. Chính sách trường vẫn được kiểm tra trước; chữ ký/ảnh và dữ liệu lồng nhau giữ nguyên. Mỗi state tối đa 1.024 mục, mỗi chuỗi tối đa 128 ký tự; vượt ngưỡng xóa bộ đệm, chuỗi dài không giữ. State hết sử dụng có thể được thu gom cùng bộ đệm.

Lưu nháp trước đây ghi JSON và timestamp mới cho cả sự kiện lặp cùng nội dung. Nay giữ tối đa một bản đã xác minh, không quá 65.536 ký tự JSON. Chỉ bỏ ghi khi đúng khóa (tài khoản/chuyến/trường/phần), đúng giá trị và đọc localStorage ngay lúc đó vẫn khớp từng byte. So sánh với bản chính thức vẫn chạy trước. Dữ liệu thay đổi vẫn được ghi ngay và đọc xác minh; không tăng thời gian chờ lưu. Cloud wrapper và snapshot khi ẩn/đóng trang giữ nguyên.

Kiểm thử hành vi: 900 trường qua 20 lượt không đổi tránh 18.000 lần chuyển chữ hoa; 21 lần ghi nháp giống nhau chỉ ghi localStorage một lần. Kiểm tra thêm sửa/xóa/tạo lại giá trị, Unicode, chuyển chính sách sang chữ ký, chuỗi dài, đổi tài khoản/chuyến/phần, bản lưu bị xóa/hỏng, lỗi đọc/ghi và ghi không thành công, xóa nháp sau lưu chính thức.

Đây là số thao tác trong kiểm thử mã, không phải số đo độ trễ trên điện thoại thật. Chưa có benchmark INP/FPS/RAM trên thiết bị cũ. JSON toàn state, dựng SVG và các công việc khác vẫn có thể gây chậm với báo cáo lớn; bản này chỉ giảm công việc lặp đã xác định, không cam kết mọi thiết bị đều mượt.

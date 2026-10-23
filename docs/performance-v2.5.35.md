# V2.5.35 — Giảm tải CPU và RAM

Baseline: `73fe9d3419ff827bcde11df3bc414f9d96736867` (V2.5.34).
Build: `V2.5.35-20261023-LOW-MEMORY-RUNTIME-01`.

## Điểm nghẽn và thay đổi

1. **Dựng SVG:** mỗi vùng nhập tạo bốn closure/listener mỗi lần draw. Chuyển sang bốn listener dùng chung trên mỗi SVG, vùng nhập giữ tham chiếu trường hiện hành. Giữ thứ tự xử lý chuột, touch, kéo cuộn, ký và pointer capture; các hook document theo dõi pinch/ra ngoài ô vẫn tồn tại.
2. **Đo chữ lặp:** 14 vị trí đo width ở bộ dựng biểu mẫu dùng bộ đệm tối đa 256 mục, mỗi nội dung tối đa 512 ký tự. Khóa chứa font, direction, language và các thuộc tính shaping. Trong lúc font tải thì không cache; khi font tải xong/lỗi thì xóa cache. Không giữ node DOM trong cache.
3. **Ảnh nền:** 10/11 ảnh nền biểu mẫu trong HTML dùng native lazy loading và decoding async; trang 42.3 đầu tiên eager. Kích thước CSS của trang đã cố định. Đường PDF legacy/iOS kích hoạt eager trước chờ nền; mở FINAL cũng kích hoạt eager. Đây là gợi ý cho browser, không bảo đảm số MB RAM browser giải phóng.
4. **Xuất PDF:** điều phối report mã hóa từng trang trước khi dựng trang kế, bao gồm trang ảnh. Canvas được thu về 1×1 trong finally ngay sau encode. BBBT vẫn nhận CXR No. rồi mới mã hóa; thứ tự trang và luồng đặt tên/chia sẻ giữ nguyên. Nếu encoder mới chưa khả dụng, đường canvasesToPdfFile cũ vẫn hoạt động.
5. **42.1 lossless:** đọc RGBA theo dải 64 hàng, giữ chính xác phép trộn alpha lên nền trắng, vẫn xuất RGB lossless/deflate; giữa các dải nhường event loop. Bộ đệm RGBA lớn nhất 317.696 byte thay vì 8.711.820 byte ở 1241×1755 (giảm khoảng 96,35%). Đây chỉ là bộ đệm RGBA tạm; tổng RAM còn gồm canvas, RGB, ảnh và trình duyệt.
6. **Ghép PDF:** tham chiếu image bytes trong Blob parts, tránh copy mỗi ảnh vào object buffer và copy toàn PDF vào một Uint8Array cuối. Kiểm tra byte offset xref, FlateDecode, Multiply và thứ tự trang.
7. **Cache ảnh PDF:** giới hạn cache ảnh giải mã còn 8 mục, cache byte nền 8 mục; dọn hai cache khi tác vụ report kết thúc. Cache font có giới hạn riêng.
8. **Trạng thái nền:** không ghi text/class-level/title/hidden của badge nếu giống giá trị hiện hành; bỏ cập nhật giao diện badge khi tab ẩn. Timer kiểm chứng lưu, snapshot ra đa nhiệm và ghi nháp tức thời vẫn chạy như trước.

## Bằng chứng kiểm tra

- Dựng 1.000 trường ở hai SVG: 8 listener thay vì 4.000; redraw không gắn thêm listener. Chuột thường, ô mở ngay, touch move/up/cancel và khác SVG root đều được kiểm tra.
- 100 lần đo cùng chữ/font: 1 phép measureText; thay font và đang tải font không dùng kết quả sai; cache bị chặn ở 256 mục.
- 42.1: so sánh mọi byte RGB với phép tính tham chiếu cho alpha 0/128/255, cả deflate giải nén và raw fallback; 27 lần nhường event loop/trang.
- Chạy hàm điều phối export thật với renderer giả lập cho 10 loại: FSAGS42.3, 42.1, 55.1, 09, 208, TVJ, 54, 94, BBBT và all. Số canvas trang cùng tồn tại tối đa một; thử lỗi encode và xác minh giải phóng/khả năng thử lại. Đây không phải RAM tổng của browser.
- Ghép PDF bằng mã production với JPEG thật và RGB deflate; kiểm tra mọi entry xref trỏ đúng object, hai trang, Multiply và FlateDecode.
- Kiểm tra DOM badge lặp 20 lần không phát sinh write mới; tab ẩn không cập nhật badge và tab hiện phục hồi trạng thái.
- Chạy `npm run release`, kiểm tra cú pháp và manifest/PWA trước phát hành; kiểm tra lại trên CI.

## Giới hạn

Không có phép đo INP, FPS hoặc heap trên điện thoại đời cũ thực tế. Thử cài Chrome Headless để chạy browser bị lỗi tải gói từ CDN; không coi mô phỏng Node là browser benchmark. Không công bố tỷ lệ tăng tốc tổng thể.

Bản này vẫn dựng lại node SVG, và vẫn giữ cấu trúc/thứ tự nhiều script khởi động để tránh phá phụ thuộc. Các cải thiện đo ở đây tập trung vào giảm listener/canvas/bản sao byte/ảnh khởi động và tránh công việc lặp. Số MB tổng còn tùy dữ liệu, ảnh đính kèm, browser và thiết bị. Giữ độ phân giải/chất lượng PDF hiện có; không xóa dữ liệu chuyến hoặc giảm bảo vệ nháp.

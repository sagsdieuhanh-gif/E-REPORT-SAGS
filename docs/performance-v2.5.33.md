# V2.5.33 — Nhập liệu, lưu nháp và PDF

Baseline: `1430d2767cd84e0c8943d4b0574bb7809d1b1897` (V2.5.32).
Build: `V2.5.33-20261022-INPUT-PDF-PERFORMANCE-01`.

## Thay đổi

- FINAL tính toán vào cùng bản dữ liệu và ghi một lần thay vì 2–3 lần/sự kiện. Kiểm tra zone, lưu tức thời, lỗi quota và hook đồng bộ danh tính vẫn được giữ.
- Ghi bản nháp ngay; hoãn riêng việc cập nhật huy hiệu 120 ms. Khi rà nhiều ô nháp, dùng một lần đọc hồ sơ chuyến cho cả lượt rà. Không cache hồ sơ giữa các lượt rà/tài khoản/chuyến.
- Bản nén có raw bytes khớp cache kiểm chứng không bị giải nén lại khi ghi. Raw bytes khác từ tab khác hoặc bản hỏng vẫn phải qua checksum. Bản mới vẫn được round-trip và read-back như trước.
- Autosave chung chỉ nghe điều khiển trong vùng nhập biểu mẫu; không lưu hồ sơ ramp vì gõ FINAL, đăng nhập hay cài đặt. Tác vụ nền chờ 600 ms; bản nháp theo ô vẫn ghi ngay.
- Sao lưu IndexedDB sau ghi danh sách chỉ đọc các chuyến có metadata thay đổi và chuyến đang mở; lần khởi động/kiểm tra định kỳ vẫn rà toàn bộ. Lưu đến trong khi mirror đang chạy được xếp lượt kế tiếp. Chuyển tài khoản giữa lúc chạy không đọc dữ liệu tài khoản mới vào scope cũ.
- Dựng SVG qua fragment, thay nội dung mỗi trang một lần. Không bỏ trang khỏi export hoặc thay tọa độ trường.
- Không ghi lại class/chiều cao dock và các style autofit đã trùng giá trị, giảm kích hoạt observer dư thừa.
- PDF gộp các yêu cầu registry đang chạy, dùng lại kiểm tra thành công tối đa 30 giây (không áp dụng khi Form Manager đang mở). Timeout 5 giây; nếu tải lỗi chỉ dùng registry hợp lệ đã có, nếu không có vẫn chặn xuất. Lần tải lỗi không được đánh dấu là bản mới để tiếp tục thử lại.
- PDF dùng JPEG nền có sẵn khi đúng đường dẫn/kích thước chuẩn. Nền tùy chỉnh/blob luôn đi qua ảnh canonical tùy chỉnh. Đường dự phòng PNG khớp cây thư mục hiện tại. 42.1 giữ kích thước và encoder lossless. Báo tiến độ xuất trước bước chờ registry.

## Kiểm chứng

- Mô phỏng trực tiếp mã lưu nháp với 40 ô nháp: baseline một lần record đọc hồ sơ 42 lần và rà 41 key; bản mới ghi tức thời với một lần đọc, không rà key trong sự kiện nhập. Khi gọi `pending()` cho 41 ô, hồ sơ cũng chỉ đọc một lần.
- Mô phỏng handler FINAL: `flight` từ 2 lần đọc/2 lần ghi thành 1/1; `adultq` từ 2 lần đọc/3 lần ghi thành 1/1. Giá trị tính toán và dữ liệu FINAL khác được giữ; quota/zone sai không được chấp nhận.
- Kiểm tra queue mirror, dữ liệu các chuyến khác, đổi tài khoản trong tác vụ; cache nén, dữ liệu hỏng, Unicode/ảnh/chữ ký; cache/timeout/retry registry; ảnh nền mặc định/tùy chỉnh; đường lossless 42.1; SVG batch; dock không lặp ghi.
- Chạy `npm run release` trước khi đẩy. Kết quả kiểm tra được báo trong commit/PR; thời gian mô phỏng không phải số đo INP hoặc thời gian PDF thực tế trên điện thoại.

## Giới hạn

Không thay chính sách lưu trữ, phân quyền, xác nhận FINAL, các công thức nghiệp vụ hoặc quy trình cập nhật PWA. Không xóa cache, localStorage hay Firebase của người dùng. Giữ cấu trúc thứ tự khởi động hiện hành; chưa tách lại 71 script vì cần kiểm thử riêng toàn bộ phụ thuộc. Các phép đo trình duyệt/điện thoại và Firebase thật vẫn cần để xác định độ trễ còn lại; chưa tuyên bố hết lag trên mọi thiết bị.

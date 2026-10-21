# HDSD · E-Report V2.5.19 · SỔ TAY HÃNG (21/10/2026)

## 1. Tra cứu nhanh
- Mở **SỔ TAY HÃNG**, chọn mã hãng hoặc tìm theo tên/mã hãng, thợ máy, xăng dầu hay nội dung lưu ý.
- Thông tin **DOOR** và **KÝ TẢI** hiển thị trên hai thẻ lớn; **THỢ MÁY, XĂNG DẦU, SUẤT ĂN, ĐẠI DIỆN** ngay phía dưới.
- LƯU Ý TRỌNG TÂM ưu tiên hiện ngay; khi có nhiều lưu ý bấm **Xem thêm**.
- Các nội dung COOR, chất xếp, tài liệu, flightplan cũ nằm trong **HƯỚNG DẪN KHAI THÁC CHI TIẾT**, bấm mở khi cần.
- Nếu thông tin chưa có nguồn, ô hiển thị **Chưa cập nhật**. Dữ liệu có mâu thuẫn được đánh dấu **CẦN XÁC MINH**, không tự kết luận.

## 2. Cập nhật Excel dành cho AD
- Tải mẫu Excel Sổ tay hãng với bốn sheet: **HANG**, **LUU_Y**, **BO_SUNG**, **HUONG_DAN**.
- **HANG**: một hàng/hãng; MA_HANG là khóa duy nhất. Có thể thêm hãng mới bằng dòng mới. Các trường cố định gồm DOOR, KY_TAI, DAI_DIEN, THO_MAY, XANG_DAU, SUAT_AN, LUU_Y_NGAN, ...
- **LUU_Y**: mỗi lưu ý thêm một hàng, chỉ định MA_HANG, NHOM (CHUNG/COOR/LOADING/TAI_LIEU/FLIGHTPLAN), NOI_DUNG, MUC_DO (QUAN_TRONG/THONG_THUONG), THU_TU.
- **BO_SUNG**: khi phát sinh mục mới, thêm một hàng với MA_HANG, TEN_TRUONG, GIA_TRI và THU_TU; app tự hiển thị ở **THÔNG TIN BỔ SUNG**, không cần cập nhật mã nguồn.
- Để trống một ô dữ liệu: giữ giá trị cũ; nhập dấu - để xóa giá trị cũ. Khi có dòng LUU_Y cho một hãng, tập lưu ý thêm của hãng đó được thay bằng các dòng trong file. Nhập - tại NOI_DUNG để xóa toàn bộ lưu ý thêm của hãng đó.
- Trong E-Report đăng nhập AD: **Sổ tay hãng → QUẢN LÝ DỮ LIỆU → CHỌN FILE EXCEL**. Kiểm tra đối chiếu Thêm/Thay đổi/Xóa, **TEST TRÊN MÁY AD**, sau đó **XUẤT 2 FILE CẬP NHẬT**. Upload đúng tên lên thư mục data/ tại GitHub: carrier-service-guide.json và carrier-guide-version.json để các máy nhận revision mới.
- Import cập nhật theo mã hãng và **không tự xóa hãng khác** hay hướng dẫn nghiệp vụ từ file Excel nguồn trước. Vẫn đọc được định dạng Excel FPL/SERIAL/CARRIER cũ.

## 3. Lưu ý vận hành và độ trễ
- Dữ liệu Sổ tay lưu cache local (IndexedDB), chỉ tải lại khi revision/hash thay đổi; màn hình quản lý AD chỉ khởi tạo khi cần.
- Cơ chế làm mới giảm xuống hoạt động nền nhẹ trong lúc không mở Sổ tay. Điều này **không thay thế kiểm tra hiệu năng toàn ứng dụng**: nếu vẫn lag, ghi máy/OS/trình duyệt, thao tác, thời gian chờ và log mạng/Performance để phân tích.
- Các phần nghiệp vụ chuyến bay, FINAL và crosscheck không bị thay đổi bởi cập nhật Sổ tay này.

# E-REPORT-SAGS · V1.5 · Bảng kiểm Sáng/Tối theo từng click

**Trạng thái:** Mã nguồn đã có bộ kiểm tra tĩnh và chẩn đoán từng click. **Chưa được đánh dấu nghiệm thu trực quan theo tất cả tài khoản**, vì hiện không có phiên đăng nhập kiểm thử hợp lệ cho từng vai trò.

## Nguyên tắc nghiệm thu

- Mỗi màn hình bên dưới phải kiểm tra tại 4 cấu hình: **PC Sáng, PC Tối, Mobile Sáng, Mobile Tối**.
- Kiểm tra tuần tự các chuyển trạng thái: mở, vào tab, bấm tiếp, sửa dữ liệu, quay lại, đóng, mở lại. Nhân viên chỉ thao tác bằng **dữ liệu kiểm thử** trong môi trường xem trước.
- Kiểm tra nền + chữ + placeholder + checkbox/radio + trạng thái đang chọn/disabled + thông báo + thanh cuối màn hình; không chỉ kiểm tra nền ngoài.
- Không được đổi màu bản scan, logo hãng/SAGS, giấy biểu mẫu, tọa độ chữ, PDF và vùng chữ ký.
- Mọi thay đổi CSS phải ưu tiên sửa tại **nguồn quy tắc cũ**; không bổ sung lớp cố định thiếu điều kiện theme.
- Cấm bật chế độ quét màu liên tục cho người dùng production; chạy chỉ khi URL có `?sags_theme_audit=1`.

## Danh sách hành trình cần nghiệm thu

| Hành trình thao tác | Màn hình / trạng thái cần kiểm | Vai trò |
| --- | --- | --- |
| Mở app → chọn Sáng/Tối → nhập tài khoản | Đăng nhập, placeholder, lỗi đăng nhập, phiên bản | Tất cả |
| Đăng nhập → mở/đóng menu → chuyển nhóm chức năng | Dashboard, drawer, menu active, bottom bar, PC sidebar | Tất cả |
| Menu → MY FLIGHT → chọn ngày → tìm chuyến | Ngày, danh sách chuyến, chip trạng thái, tìm kiếm, skeleton/empty | Tất cả |
| MY FLIGHT → mở chuyến → mở hồ sơ → nhận việc | Dossier, thẻ biểu mẫu, xác nhận nhận, trạng thái đang làm | ĐH, CBTT, KH, PVHK, AD |
| Hồ sơ → mở 42.1/42.3/55.1 → nhập nhanh → Next | Tab, ô số/chữ, NA/NIL, thông báo kiểm tra dữ liệu | ĐH, CBTT |
| Biểu mẫu → Lưu → Ký → Hoàn tất → Xuất | Thanh công cụ PC/mobile, popup xác nhận, xem PDF; giữ nguyên giấy | Tất cả được cấp quyền |
| Chuyến bay → FSAGS 09 → Nhập giờ nhanh | 3 tab, trường thời gian, lưu/đổi tab, cảnh báo | Vai trò được cấp quyền |
| Biểu mẫu hãng → TVJ, FSAGS54/94, 208 | Bảng dữ liệu, popup nhập nhanh, field editor; không tác động PDF | Vai trò được cấp quyền |
| Menu → Daily Roster → lọc ngày → tìm → phân công | Danh sách, bảng, ô tìm, thẻ, nút lưu/xuất/phân công | AD/ĐH được cấp quyền |
| Menu → A/C LIMITS → tra cứu → sửa → thêm/xóa | Danh sách, tabs, bộ lọc, thẻ, cảnh báo nguy hiểm, xác nhận | Vai trò được cấp quyền |
| Menu → Sổ tay hãng → chọn hãng → chi tiết | List, công cụ lọc, quản lý, tab chi tiết | Vai trò được cấp quyền |
| Menu → Cài đặt → đổi giao diện → chuyển từng tab | Profile, biểu mẫu cài đặt, Sáng/Tối, thông báo phiên bản | Tất cả |
| AD → Quản lý tài khoản → tạo/sửa/khóa | Form tài khoản, danh sách, popup xác nhận, cảnh báo | AD |
| AD → Phân quyền → mở từng chức năng | Bảng quyền, toggle, tab, nút lưu, trạng thái xử lý | AD |
| AD → Kho biểu mẫu / Data Hub / giám sát | Các thẻ, bộ lọc, bảng biểu, xem và quản lý | AD |
| Nghiệp vụ → quản lý đội tàu / bố trí mặt sàn | Danh sách, toolbar layout, ô nhập, bảng nghiệp vụ | AD/ĐH được cấp quyền |
| Nghiệp vụ → biểu mẫu cuối, KH208 → thông báo | Bảng quản lý, popup, trạng thái đồng bộ | Vai trò được cấp quyền |
| Xử lý phiên → mất mạng → tải lại → cập nhật | Thông báo mất mạng, kiểm tra bản mới, nút cập nhật | Tất cả |
| Mọi màn hình → mở overlay → đổi Sáng/Tối → đóng | Cập nhật màu ngay khi đổi theme, không nhấp nháy/tràn viền | Tất cả |

## Bộ chẩn đoán theo mỗi click (chỉ QA)

Mở URL bản **Preview**, thêm `?sags_theme_audit=1`. Đăng nhập bằng tài khoản kiểm thử đã được phân quyền; đi qua các màn hình theo bảng; đổi Sáng/Tối để thực hiện hai lượt. Sau khi thao tác, trong DevTools có thể xem:

```js
sagsThemeJourneyAudit.summary()
sagsThemeJourneyAudit.report()
```

Báo cáo chỉ gồm tên ID màn hình, ID nút bấm, theme và mức tương phản ước tính của từng phần tử. **Không lưu tên người dùng, số chuyến bay, nội dung biểu mẫu, mật khẩu hay dữ liệu nghiệp vụ**. Bộ đo bỏ qua giấy biểu mẫu, ảnh PDF và canvas chữ ký. Đây là tín hiệu kỹ thuật cần đối chiếu ảnh trực quan, không thể thay thế kiểm thử mắt.

## Tiêu chí xuất bản

1. CI: toàn bộ hồi quy đạt và manifest 204 tài nguyên thống nhất.
2. Trước khi đổi production, phải đi được ít nhất một hành trình thực tế của từng vai trò dùng thử được, PC/mobile và Sáng/Tối. **Chưa đạt nếu chưa có môi trường đăng nhập.**
3. Không còn lỗi chữ chìm cùng nền, sai trạng thái chọn, nút tràn màn hình hoặc mất quyền thao tác.
4. Không phát sinh lỗi roster bàn giao biểu mẫu, mất nháp, chữ ký hoặc PDF.

# HDSD V2.5.16 — Sửa hiển thị ô tìm kiếm trên thanh công cụ

Ngày: 19/10/2026. Bản nền: V2.5.15.

## Thay đổi
- Ô **TÌM CHUYẾN BAY, SỐ HIỆU, SÂN BAY…** ở đầu giao diện máy tính nay hiển thị trong một khung liền mạch.
- Bỏ nền, viền và bo góc *native* riêng của `<input type="search">`, chỉ giữ một khung ngoài. Biểu tượng kính lúp, gợi ý và thao tác nhấn Enter giữ nguyên.
- Không thay đổi cỡ thanh, vị trí các nút, các mẫu giấy/PDF, lưu nháp, dữ liệu, phân quyền hay xử lý chuyến bay.

## Cập nhật
Khi nhận thông báo V2.5.16, hoàn tất thao tác đang làm và chọn **CẬP NHẬT**. Không ép tải lại giữa chừng. Ở PC, kiểm tra thanh tìm kiếm trên trang Điều hành sau đăng nhập.

## Kiểm thử
Bổ sung kiểm tra riêng cho selector `#v6494Search`; xác nhận không thêm file CSS và không sửa mã xử lý tìm kiếm. Cần đối chiếu thêm trên trình duyệt sau đăng nhập và trên thiết bị thực tế.

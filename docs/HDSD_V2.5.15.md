# HDSD V2.5.15 — Cải thiện độ rõ chữ, không đổi giao diện

Phát hành: 19/10/2026. Nền: V2.5.13 được khôi phục sau khi V2.5.14 làm lệch giao diện.

## Những gì thay đổi
- Tăng **nhẹ** cỡ chữ phụ vốn quá nhỏ ở trang Điều hành, bảng menu và thẻ MY FLIGHT: khoảng 6,5–9 px trước đây lên khoảng 8–10 px tùy vị trí.
- Chữ phụ được tăng độ tương phản so với nền xanh tối, bớt giãn chữ; một số nhãn nhỏ dùng nét chữ đậm hơn.
- Giữ nguyên font hệ thống và fallback hiện có, **không tải phông chữ bên ngoài**.

## Những gì không đổi
- Không thay đổi width/height, min-height, gap, padding, margin, grid, flex, vị trí, màu nền hay cấu trúc HTML.
- Không điều chỉnh chữ trong mẫu giấy chính thức, ô nhập theo tọa độ, PDF/in, chữ ký hoặc các thao tác nghiệp vụ.
- Không thay đổi dữ liệu, tài khoản, phân quyền, Firebase, đồng bộ và lưu nháp.

## Cập nhật
Khi E-REPORT hiển thị bản V2.5.15, hoàn tất thao tác đang mở và chọn **CẬP NHẬT**. Không ép tải lại trang khi đang thao tác.

## Lưu ý kiểm tra
Đã bổ sung kiểm thử so sánh toàn bộ CSS gốc sau khi loại trừ bốn thuộc tính chỉ liên quan đến chữ: màu, cỡ, độ đậm, giãn chữ. Việc hiển thị thực tế trên Safari/iPhone và giao diện sau đăng nhập cần được kiểm tra bằng thiết bị/tài khoản thật.

# E-REPORT SAGS V2.2.14

## Giao diện quản lý mới

Trong cửa sổ quản lý có thanh chức năng cố định:

- **LIMIT**: nhập và quản lý A/C LIMITS.
- **LỊCH VỆ SINH**: xem danh sách lịch vệ sinh.
- **AI ẢNH**: chọn chung nhiều ảnh để AI đọc.

Lịch vệ sinh mặc định chỉ hiển thị danh sách. Bấm **＋ THÊM LỊCH** để mở biểu mẫu; bấm **SỬA** trên một dòng để chỉnh sửa. Sau khi lưu, biểu mẫu tự thu gọn.

## STA và STD

- Mỗi lịch có thêm giờ **STA** và **STD**.
- Nếu ảnh nguồn có giờ, AI tự đọc và điền.
- Nếu ảnh không có giờ, AD có thể nhập hoặc sửa thủ công.
- Danh sách hiển thị: `STA 12:30 · STD 14:05` ngay trên dòng chuyến.

## Cài bằng Termux

```bash
cd /sdcard/Download/E_REPORT_SAGS_V2.2.14_COMPACT_LIMIT_CLEANING_UI
bash deploy-v2.2.14.sh
```

```bash
bash verify-v2.2.14.sh
```

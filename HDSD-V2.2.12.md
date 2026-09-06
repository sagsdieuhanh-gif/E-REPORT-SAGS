# E-REPORT SAGS V2.2.12

## Nội dung sửa lỗi

- Sửa `AI IMPORT THẤT BẠI: appCheckMod.getAppCheck is not a function`.
- Sửa MY FLIGHT nhấp nháy liên tục trên máy tính.
- MY FLIGHT chỉ chạy một lượt tải khi mở; các lệnh mở đồng thời được gộp lại.
- Danh sách công việc không bị xóa/vẽ lại nếu nội dung không thay đổi.
- Giữ nguyên upload chung nhiều ảnh LIMIT + LỊCH VỆ SINH và hai mốc nhắc STA-10/CHOCK ON.

## Cài bằng Termux

Giải nén gói vào thư mục Download rồi chạy:

```bash
cd /sdcard/Download/E_REPORT_SAGS_V2.2.12_AI_APP_CHECK_PC_MYFLIGHT_FIX
bash deploy-v2.2.12.sh
```

Kiểm tra sau khi GitHub Pages cập nhật:

```bash
bash verify-v2.2.12.sh
```

Sau khi ứng dụng báo cập nhật, bấm UPDATE rồi đóng và mở lại E-REPORT. Trên PC nên nhấn Ctrl+F5 một lần nếu tab cũ vẫn đang mở.
